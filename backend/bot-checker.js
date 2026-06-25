"use strict";

const db = require("./db");
const notifications = require("./notifications");

// Required docs per service category (fallback if service has no required_docs_json)
const CATEGORY_DOCS = {
  "Government":     ["aadhaar", "photo"],
  "Education":      ["aadhaar", "photo"],
  "Business":       ["pan", "aadhaar", "address_proof"],
  "Travel":         ["aadhaar"],
  "Documentation":  [],
  "Bills & Recharge": [],
  "Design Services": [],
};

function getRequiredDocs(orderDbId) {
  const items = db.all(
    `SELECT oi.item_slug, oi.item_type,
            COALESCE(s.required_docs_json, p.required_docs_json, '[]') AS docs_json
     FROM order_items oi
     LEFT JOIN services  s ON oi.item_type = 'service'  AND s.slug = oi.item_slug
     LEFT JOIN products  p ON oi.item_type = 'product'  AND p.slug = oi.item_slug
     WHERE oi.order_id = ?`,
    [orderDbId]
  );

  const required = new Set();
  for (const item of items) {
    try {
      const docs = JSON.parse(item.docs_json || "[]");
      docs.forEach((d) => required.add(String(d).toLowerCase().replace(/\s+/g, "_")));
    } catch { /* ignore */ }
  }
  return [...required];
}

function getUploadedDocs(orderDbId) {
  const rows = db.all(
    "SELECT doc_type FROM order_documents WHERE order_id = ?",
    [orderDbId]
  );
  return rows.map((r) => String(r.doc_type).toLowerCase().replace(/\s+/g, "_"));
}

function determinePriority(order, paymentOk, docsOk) {
  if (paymentOk && docsOk)  return "high";
  if (paymentOk && !docsOk) return "normal";
  return "low";
}

/**
 * Run automated checks on an order.
 * Returns { passed, missing, status, priority }
 */
function checkOrder(orderId) {
  // Fetch by string order_id (public id like OPDS-20240601-000001)
  const row = db.get(
    `SELECT o.*, p.status AS pay_status
     FROM orders o
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.order_id = ? OR o.id = ?
     ORDER BY p.id DESC
     LIMIT 1`,
    [String(orderId), Number(orderId) || 0]
  );

  if (!row) return { passed: false, missing: ["order_not_found"], status: "failed", priority: "low" };

  const payStatuses = ["captured", "paid", "success"];
  const paymentOk   = payStatuses.includes(String(row.pay_status || "").toLowerCase());

  const requiredDocs = getRequiredDocs(row.id);
  const uploadedDocs = getUploadedDocs(row.id);
  const missingDocs  = requiredDocs.filter((d) => !uploadedDocs.includes(d));
  const docsOk       = missingDocs.length === 0;

  const missing = [];
  if (!paymentOk)              missing.push("payment_pending");
  missingDocs.forEach((d) =>  missing.push(`doc:${d}`));

  const passed   = paymentOk && docsOk;
  const status   = passed ? "passed" : (!paymentOk ? "needs_payment" : "needs_docs");
  const priority = determinePriority(row, paymentOk, docsOk);

  // Log bot check
  db.run(
    `INSERT INTO bot_checks (order_id, check_type, status, payment_ok, docs_ok, fields_ok, missing_items)
     VALUES (?, 'initial', ?, ?, ?, 1, ?)`,
    [row.id, status, paymentOk ? 1 : 0, docsOk ? 1 : 0, JSON.stringify(missing)]
  );

  // Update order bot_check_status
  db.run(
    "UPDATE orders SET bot_check_status = ?, assignment_priority = ? WHERE id = ?",
    [status, priority, row.id]
  );

  return { passed, missing, status, priority, order: row };
}

/**
 * Send reminder to customer about missing items.
 */
function sendReminder(order, missing) {
  const customer = db.get("SELECT * FROM users WHERE id = ?", [order.user_id]);
  if (!customer) return;

  const missingDocs = missing.filter((m) => m.startsWith("doc:")).map((m) => m.replace("doc:", "").replace(/_/g, " "));
  const needsPayment = missing.includes("payment_pending");

  let message = `Hi ${customer.name}, your application #${order.order_id} needs attention:\n`;
  if (needsPayment) message += "• Payment is pending. Please complete payment.\n";
  if (missingDocs.length) message += `• Please upload: ${missingDocs.join(", ")}\n`;
  message += `Track your application: ${process.env.SITE_URL || "http://localhost:4173"}/track-application.html?order=${order.order_id}`;

  notifications.notifyEvent("doc.missing", {
    customer,
    order,
    message
  });

  // Mark reminder sent in bot_checks (latest check for this order)
  const latestCheck = db.get("SELECT id FROM bot_checks WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  if (latestCheck) {
    db.run("UPDATE bot_checks SET reminder_sent = 1 WHERE id = ?", [latestCheck.id]);
  }
}

/**
 * Full check + auto-assign flow. Call after order creation or payment event.
 */
async function checkAndAssign(orderId) {
  const result = checkOrder(orderId);
  if (!result.order) return result;

  if (result.passed) {
    // Import assignment engine here to avoid circular deps
    const assignment = require("./assignment-engine");
    await assignment.autoAssign(result.order, result.priority);
    const latestBotCheck = db.get("SELECT id FROM bot_checks WHERE order_id = ? ORDER BY id DESC LIMIT 1", [result.order.id]);
    if (latestBotCheck) {
      db.run("UPDATE bot_checks SET auto_assigned = 1 WHERE id = ?", [latestBotCheck.id]);
    }
  } else {
    sendReminder(result.order, result.missing);
  }

  return result;
}

module.exports = { checkOrder, checkAndAssign, sendReminder };
