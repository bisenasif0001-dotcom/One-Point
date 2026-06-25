"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { config, isGatewayConfigured } = require("./config");
const db = require("./db");
const razorpay = require("./gateways/razorpay");
const phonepe = require("./gateways/phonepe");
const { saveInvoicePdf } = require("./invoice");
const notifications = require("./notifications");
const botChecker = require("./bot-checker");
const {
  paymentMethods,
  safeString,
  safePhone,
  randomId,
  fromPaise,
  publicOrder
} = require("./utils");

const gatewayAdapters = { razorpay, phonepe };
const gatewayOrder = ["razorpay", "phonepe"];

function normalizeCustomer(input = {}) {
  const customer = {
    name: safeString(input.name, 120),
    phone: safePhone(input.phone),
    email: safeString(input.email, 160),
    address: safeString(input.address, 500)
  };
  if (!customer.name) throw new Error("Customer name is required.");
  if (customer.phone.length < 10) throw new Error("A valid phone number is required.");
  return customer;
}

function normalizeMethod(method) {
  const value = safeString(method || "upi", 40);
  return paymentMethods.some((item) => item.id === value) ? value : "upi";
}

function buildItems(payload) {
  const orderType = safeString(payload.orderType || payload.order_type || "product", 20);
  const inputItems = Array.isArray(payload.items) ? payload.items : [];
  if (!inputItems.length) throw new Error("At least one item is required.");

  return inputItems.map((item) => {
    const slug = safeString(item.slug || item.item_slug, 120);
    const quantity = Math.max(1, Math.min(999, Number(item.quantity || 1)));
    const table = orderType === "service" || item.type === "service" ? "services" : "products";
    const row = db.get(`SELECT * FROM ${table} WHERE slug = ? AND active = 1`, [slug]);
    if (!row) throw new Error(`Item not found: ${slug}`);
    const unit = Number(row.price_paise);
    const taxRate = Number(row.tax_rate || 0);
    const taxable = unit * quantity;
    const tax = Math.round((taxable * taxRate) / 100);
    return {
      itemType: table === "services" ? "service" : "product",
      slug: row.slug,
      name: row.name,
      image: row.image_url || "",
      quantity,
      unitPricePaise: unit,
      taxRate,
      taxPaise: tax,
      totalPaise: taxable + tax
    };
  });
}

function calculateTotals(items, payload = {}) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0);
  const gst = items.reduce((sum, item) => sum + item.taxPaise, 0);
  const discount = Math.max(0, Math.round(Number(payload.discount || 0) * 100));
  const delivery = Math.max(0, Math.round(Number(payload.deliveryCharge || payload.delivery || 0) * 100));
  return {
    subtotal,
    gst,
    discount,
    delivery,
    total: Math.max(0, subtotal + gst + delivery - discount)
  };
}

function selectGateway(preferredGateway) {
  const requested = safeString(preferredGateway || "razorpay", 20);
  const ordered = requested === "phonepe" ? ["phonepe", "razorpay"] : gatewayOrder;
  return ordered.filter((gateway, index, arr) => arr.indexOf(gateway) === index);
}

function getOrCreateUser(dbConn, customer) {
  const existing = dbConn.prepare("SELECT * FROM users WHERE phone = ? AND IFNULL(email, '') = IFNULL(?, '')").get(customer.phone, customer.email || "");
  if (existing) {
    dbConn.prepare("UPDATE users SET name = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(customer.name, customer.address || existing.address || "", existing.id);
    return { ...existing, name: customer.name, address: customer.address || existing.address || "" };
  }
  const result = dbConn.prepare("INSERT INTO users (name, phone, email, address) VALUES (?, ?, ?, ?)")
    .run(customer.name, customer.phone, customer.email || null, customer.address || null);
  return dbConn.prepare("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid));
}

function createOrderRecords({ customer, items, totals, orderType, metadata, paymentMethod, sourceChannel, clientReference }) {
  return db.withTransaction((dbConn) => {
    const user = getOrCreateUser(dbConn, customer);
    const orderId = db.nextOrderId(dbConn);
    const orderResult = dbConn.prepare(`
      INSERT INTO orders (order_id, user_id, order_type, source_channel, subtotal_paise, gst_paise, discount_paise, delivery_paise, total_paise, metadata_json, client_reference)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      user.id,
      orderType,
      sourceChannel,
      totals.subtotal,
      totals.gst,
      totals.discount,
      totals.delivery,
      totals.total,
      JSON.stringify(metadata || {}),
      clientReference || null
    );
    const orderDbId = Number(orderResult.lastInsertRowid);
    const itemStmt = dbConn.prepare(`
      INSERT INTO order_items (order_id, item_type, item_slug, item_name, image_url, quantity, unit_price_paise, tax_rate, tax_paise, total_paise)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    items.forEach((item) => {
      itemStmt.run(orderDbId, item.itemType, item.slug, item.name, item.image, item.quantity, item.unitPricePaise, item.taxRate, item.taxPaise, item.totalPaise);
    });
    const paymentId = randomId("pay");
    const paymentResult = dbConn.prepare(`
      INSERT INTO payments (payment_id, order_id, gateway, method, amount_paise, currency, status)
      VALUES (?, ?, 'razorpay', ?, ?, 'INR', 'created')
    `).run(paymentId, orderDbId, paymentMethod, totals.total);
    return {
      user,
      order: dbConn.prepare("SELECT * FROM orders WHERE id = ?").get(orderDbId),
      payment: dbConn.prepare("SELECT * FROM payments WHERE id = ?").get(Number(paymentResult.lastInsertRowid))
    };
  });
}

function getExistingCheckout(clientReference) {
  if (!clientReference) return null;
  const row = db.get(`
    SELECT
      o.*,
      p.payment_id,
      p.gateway,
      p.method,
      p.status AS payment_status,
      p.amount_paise AS payment_amount_paise,
      p.currency AS payment_currency,
      p.gateway_session_json
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE o.client_reference = ?
    ORDER BY p.id DESC
    LIMIT 1
  `, [clientReference]);
  if (!row) return null;

  let session = {};
  try {
    session = row.gateway_session_json ? JSON.parse(row.gateway_session_json) : {};
  } catch {
    session = {};
  }

  const hasRazorpaySession = Boolean(session.key && session.order_id);
  const hasRedirectSession = Boolean(session.redirectUrl);
  return {
    order: publicOrder(row),
    payment: row.payment_id ? {
      gateway: row.gateway,
      sessionType: hasRedirectSession ? "redirect" : (hasRazorpaySession ? "razorpay_checkout" : "pending"),
      paymentId: row.payment_id,
      orderId: row.order_id,
      amount: fromPaise(row.payment_amount_paise || row.total_paise),
      currency: row.payment_currency || row.currency || "INR",
      session
    } : null
  };
}

async function attachGatewaySession({ order, payment, user, preferredGateway }) {
  let lastError;
  let preferredGatewayError;
  for (const gateway of selectGateway(preferredGateway)) {
    try {
      if (!isGatewayConfigured(gateway)) throw new Error(`${gateway} is not configured.`);
      db.run("UPDATE payments SET gateway = ?, status = 'created', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [gateway, payment.id]);
      const refreshedPayment = db.get("SELECT * FROM payments WHERE id = ?", [payment.id]);
      const session = await gatewayAdapters[gateway].createSession({ order, payment: refreshedPayment, customer: user });
      db.run(
        `UPDATE payments
         SET gateway = ?, gateway_order_id = ?, gateway_session_json = ?, status = 'session_created', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [gateway, session.gatewayOrderId || null, JSON.stringify(session.session || {}), payment.id]
      );
      db.logPayment({ orderDbId: order.id, paymentDbId: payment.id, gateway, event: "payment_session_created", message: `Payment session created through ${gateway}.`, payload: { sessionType: session.type } });
      const savedPayment = db.get("SELECT * FROM payments WHERE id = ?", [payment.id]);
      notifications.notifyEvent("order_placed", {
        customer: user,
        order,
        payment: savedPayment,
        message: "Order placed. Complete payment to continue processing."
      });
      return {
        gateway,
        sessionType: session.type,
        paymentId: payment.payment_id,
        orderId: order.order_id,
        amount: fromPaise(payment.amount_paise),
        currency: payment.currency,
        session: session.session
      };
    } catch (error) {
      lastError = error;
      if (gateway === preferredGateway && !preferredGatewayError) preferredGatewayError = error;
      db.logPayment({ orderDbId: order.id, paymentDbId: payment.id, gateway, level: "warn", event: "gateway_unavailable", message: error.message });
    }
  }
  const finalError = preferredGatewayError || lastError || new Error("No payment gateway is available.");
  db.run("UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [finalError.message || "Gateway unavailable", payment.id]);
  db.run("UPDATE orders SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);
  throw finalError;
}

function notifyPaymentSuccess(order, payment) {
  const customer = db.get("SELECT * FROM users WHERE id = ?", [order.user_id]);
  const invoice = db.get("SELECT * FROM invoices WHERE order_id = ?", [order.id]);
  notifications.notifyEvent("payment_success", {
    customer,
    order: { ...order, status: "paid" },
    payment: { ...payment, status: "captured" },
    invoice,
    message: `Payment successful for Order #${order.order_id}. Our team will verify your documents and start processing.`
  });
  // Trigger bot check + auto assignment after payment
  setImmediate(() => {
    botChecker.checkAndAssign(order.order_id).catch(() => {});
  });
}

function notifyPaymentFailed(order, payment, reason) {
  const customer = db.get("SELECT * FROM users WHERE id = ?", [order.user_id]);
  notifications.notifyEvent("payment_failed", {
    customer,
    order: { ...order, status: "payment_failed" },
    payment: { ...payment, status: "failed" },
    message: reason || "Payment failed. Please retry or switch gateway."
  });
}

async function createCheckout(payload = {}) {
  const customer = normalizeCustomer(payload.customer || payload);
  const paymentMethod = normalizeMethod(payload.paymentMethod || payload.payment_method);
  const orderType = safeString(payload.orderType || payload.order_type || "product", 20) === "service" ? "service" : "product";
  const sourceChannel = safeString(payload.sourceChannel || payload.channel || "online", 40);
  const clientReference = safeString(payload.idempotencyKey || payload.clientReference, 160);
  const existingCheckout = getExistingCheckout(clientReference);
  if (existingCheckout) return existingCheckout;

  const items = buildItems({ ...payload, orderType });
  const totals = calculateTotals(items, payload);
  if (totals.total <= 0) throw new Error("Total amount must be greater than zero.");

  let records;
  try {
    records = createOrderRecords({
      customer,
      items,
      totals,
      orderType,
      paymentMethod,
      sourceChannel,
      clientReference,
      metadata: {
        notes: safeString(payload.notes, 1000),
        attachments: payload.attachments || {},
        paymentMethod
      }
    });
  } catch (error) {
    const duplicate = getExistingCheckout(clientReference);
    if (duplicate) return duplicate;
    throw error;
  }
  const session = await attachGatewaySession({ ...records, preferredGateway: payload.gateway || "razorpay" });

  // Auto-reply: notify customer that order was received
  notifications.notifyEvent("order.created", {
    customer: records.user,
    order: records.order,
    message: `Aapka application #${records.order.order_id} mil gaya! Payment complete karein aur required documents upload karein.`
  });

  return {
    order: publicOrder(records.order),
    payment: session
  };
}

async function retryPayment(paymentId, preferredGateway) {
  const oldPayment = db.get("SELECT p.*, o.id AS order_db_id, o.order_id AS public_order_id, o.user_id FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.payment_id = ?", [paymentId]);
  if (!oldPayment) throw new Error("Payment not found.");
  if (oldPayment.status === "captured") throw new Error("This payment is already captured.");
  const order = db.get("SELECT * FROM orders WHERE id = ?", [oldPayment.order_db_id]);
  const user = db.get("SELECT * FROM users WHERE id = ?", [order.user_id]);
  const nextGateway = preferredGateway || (oldPayment.gateway === "razorpay" ? "phonepe" : "razorpay");
  const newPaymentId = randomId("pay");
  const result = db.run(
    `INSERT INTO payments (payment_id, order_id, gateway, method, amount_paise, currency, status, retry_of_payment_id)
     VALUES (?, ?, ?, ?, ?, ?, 'created', ?)`,
    [newPaymentId, order.id, nextGateway, oldPayment.method, oldPayment.amount_paise, oldPayment.currency, oldPayment.payment_id]
  );
  const payment = db.get("SELECT * FROM payments WHERE id = ?", [Number(result.lastInsertRowid)]);
  return attachGatewaySession({ order, payment, user, preferredGateway: nextGateway });
}

function createTransactionAndInvoice({ order, payment, status, gatewayReference, method, rawResponse = {} }) {
  return db.withTransaction((dbConn) => {
    const existing = dbConn.prepare("SELECT * FROM transactions WHERE gateway = ? AND gateway_reference = ?").get(payment.gateway, gatewayReference);
    if (existing) return existing;

    const transactionId = randomId("txn");
    const transactionResult = dbConn.prepare(`
      INSERT INTO transactions (transaction_id, order_id, payment_id, gateway, method, status, amount_paise, currency, gateway_reference, raw_response_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(transactionId, order.id, payment.id, payment.gateway, method || payment.method, status, payment.amount_paise, payment.currency, gatewayReference, JSON.stringify(rawResponse));
    const transaction = dbConn.prepare("SELECT * FROM transactions WHERE id = ?").get(Number(transactionResult.lastInsertRowid));

    if (status === "captured" || status === "success") {
      dbConn.prepare("UPDATE payments SET status = 'captured', gateway_payment_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(gatewayReference, payment.id);
      dbConn.prepare("UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);
      const invoiceNo = `INV-${order.order_id}`;
      dbConn.prepare(`
        INSERT INTO invoices (invoice_no, order_id, transaction_id, subtotal_paise, gst_paise, discount_paise, delivery_paise, total_paise)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(invoice_no) DO NOTHING
      `).run(invoiceNo, order.id, transaction.id, order.subtotal_paise, order.gst_paise, order.discount_paise, order.delivery_paise, order.total_paise);
    }
    return transaction;
  });
}

function materializeInvoicePdf(orderId) {
  const invoice = db.get("SELECT * FROM invoices WHERE order_id = ?", [orderId]);
  if (!invoice) return null;
  if (invoice.pdf_path && fs.existsSync(invoice.pdf_path)) return invoice;
  const order = db.get("SELECT * FROM orders WHERE id = ?", [invoice.order_id]);
  const customer = db.get("SELECT * FROM users WHERE id = ?", [order.user_id]);
  const transaction = invoice.transaction_id ? db.get("SELECT * FROM transactions WHERE id = ?", [invoice.transaction_id]) : null;
  const items = db.all("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
  const pdfPath = saveInvoicePdf({ invoice, order, transaction, customer, items });
  db.run("UPDATE invoices SET pdf_path = ? WHERE id = ?", [pdfPath, invoice.id]);
  return { ...invoice, pdf_path: pdfPath };
}

async function verifyPayment(payload = {}) {
  const gateway = safeString(payload.gateway, 20);
  if (gateway === "razorpay") {
    const valid = razorpay.verifyPaymentSignature({
      razorpayOrderId: safeString(payload.razorpay_order_id, 120),
      razorpayPaymentId: safeString(payload.razorpay_payment_id, 120),
      razorpaySignature: safeString(payload.razorpay_signature, 255)
    });
    const payment = db.get("SELECT * FROM payments WHERE gateway_order_id = ?", [payload.razorpay_order_id]);
    if (!payment) throw new Error("Payment record not found.");
    const order = db.get("SELECT * FROM orders WHERE id = ?", [payment.order_id]);
    if (!valid) {
      db.run("UPDATE payments SET status = 'failed', failure_reason = 'Invalid Razorpay signature', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [payment.id]);
      notifyPaymentFailed(order, payment, "Invalid Razorpay signature");
      throw new Error("Invalid Razorpay signature.");
    }
    createTransactionAndInvoice({ order, payment, status: "captured", gatewayReference: payload.razorpay_payment_id, rawResponse: payload });
    materializeInvoicePdf(order.id);
    notifyPaymentSuccess(order, payment);
    return getOrderStatus(order.order_id);
  }

  if (gateway === "phonepe") {
    const paymentId = safeString(payload.payment_id || payload.merchantTransactionId, 120);
    const payment = db.get("SELECT * FROM payments WHERE payment_id = ?", [paymentId]);
    if (!payment) throw new Error("Payment record not found.");
    const order = db.get("SELECT * FROM orders WHERE id = ?", [payment.order_id]);
    const status = await phonepe.fetchStatus(payment.payment_id);
    const code = String(status.code || status.data?.state || "").toUpperCase();
    if (code.includes("PAYMENT_SUCCESS") || code.includes("COMPLETED")) {
      const gatewayReference = status.data?.transactionId || status.data?.merchantTransactionId || payment.payment_id;
      createTransactionAndInvoice({ order, payment, status: "captured", gatewayReference, rawResponse: status });
      materializeInvoicePdf(order.id);
      notifyPaymentSuccess(order, payment);
    } else if (code.includes("FAILED")) {
      db.run("UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status.message || "PhonePe payment failed", payment.id]);
      db.run("UPDATE orders SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);
      notifyPaymentFailed(order, payment, status.message || "PhonePe payment failed");
    }
    return getOrderStatus(order.order_id);
  }

  throw new Error("Unsupported gateway verification.");
}

function getOrderStatus(orderId) {
  const order = db.get("SELECT * FROM orders WHERE order_id = ?", [orderId]);
  if (!order) throw new Error("Order not found.");
  const customer = db.get("SELECT id, name, phone, email, address FROM users WHERE id = ?", [order.user_id]);
  const items = db.all("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
  const payment = db.get("SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  const transaction = db.get("SELECT * FROM transactions WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  const invoice = materializeInvoicePdf(order.id);
  return {
    order: publicOrder(order),
    customer,
    items: items.map((item) => ({
      name: item.item_name,
      slug: item.item_slug,
      quantity: item.quantity,
      image: item.image_url,
      unitPrice: fromPaise(item.unit_price_paise),
      tax: fromPaise(item.tax_paise),
      total: fromPaise(item.total_paise)
    })),
    payment: payment ? {
      paymentId: payment.payment_id,
      gateway: payment.gateway,
      method: payment.method,
      status: payment.status,
      amount: fromPaise(payment.amount_paise),
      failureReason: payment.failure_reason
    } : null,
    transaction: transaction ? {
      transactionId: transaction.transaction_id,
      gatewayReference: transaction.gateway_reference,
      status: transaction.status,
      amount: fromPaise(transaction.amount_paise),
      createdAt: transaction.created_at
    } : null,
    invoice: invoice ? {
      invoiceNo: invoice.invoice_no,
      downloadUrl: `/api/invoices/${encodeURIComponent(invoice.invoice_no)}.pdf`
    } : null
  };
}

function labelize(value, fallback = "Pending") {
  const clean = safeString(value || fallback, 80).replace(/[_-]+/g, " ").trim();
  if (!clean) return fallback;
  return clean.replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseJsonArray(raw) {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function findOrderByTrackingNumber(trackingNumber) {
  const clean = safeString(String(trackingNumber || "").replace(/\.pdf$/i, ""), 160);
  if (!clean) throw new Error("Tracking number is required.");

  let match = db.get(`
    SELECT o.*
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id
    LEFT JOIN transactions t ON t.order_id = o.id
    LEFT JOIN invoices i ON i.order_id = o.id
    WHERE LOWER(o.order_id) = LOWER(?)
       OR LOWER(IFNULL(o.client_reference, '')) = LOWER(?)
       OR LOWER(IFNULL(p.payment_id, '')) = LOWER(?)
       OR LOWER(IFNULL(p.gateway_order_id, '')) = LOWER(?)
       OR LOWER(IFNULL(p.gateway_payment_id, '')) = LOWER(?)
       OR LOWER(IFNULL(t.transaction_id, '')) = LOWER(?)
       OR LOWER(IFNULL(t.gateway_reference, '')) = LOWER(?)
       OR LOWER(IFNULL(i.invoice_no, '')) = LOWER(?)
    ORDER BY o.created_at DESC, o.id DESC
    LIMIT 1
  `, [clean, clean, clean, clean, clean, clean, clean, clean]);

  if (!match) throw new Error("Tracking number not found.");
  return { clean, order: match };
}

function trackingStage(order, payment) {
  const orderStatus = String(order.status || "").toLowerCase();
  const paymentStatus = String(payment?.status || "").toLowerCase();
  const paymentOk = ["captured", "paid", "success", "completed"].includes(paymentStatus);

  if (orderStatus === "cancelled" || orderStatus === "canceled") {
    return {
      stageIndex: 0,
      statusKey: "cancelled",
      displayStatus: "Cancelled",
      isIssue: true,
      summary: "This application has been cancelled.",
      nextAction: "Please contact support if this looks incorrect."
    };
  }

  if (orderStatus === "payment_failed" || paymentStatus === "failed") {
    return {
      stageIndex: 0,
      statusKey: "payment_failed",
      displayStatus: "Payment Failed",
      isIssue: true,
      summary: "Payment could not be completed for this application.",
      nextAction: "Retry payment or contact support with this tracking number."
    };
  }

  if (["completed", "delivered", "out_for_delivery"].includes(orderStatus)) {
    return {
      stageIndex: 3,
      statusKey: orderStatus,
      displayStatus: orderStatus === "out_for_delivery" ? "Out For Delivery" : "Delivered",
      isIssue: false,
      summary: "Your application is in the final delivery stage.",
      nextAction: "Check WhatsApp or support desk for the delivered copy or handover note."
    };
  }

  if (["approved", "verified"].includes(orderStatus)) {
    return {
      stageIndex: 2,
      statusKey: orderStatus,
      displayStatus: orderStatus === "verified" ? "Verified" : "Approved",
      isIssue: false,
      summary: "Your application has passed verification.",
      nextAction: "Delivery or final department update is next."
    };
  }

  if (["processing", "paid"].includes(orderStatus) || paymentOk) {
    return {
      stageIndex: 1,
      statusKey: "processing",
      displayStatus: "Processing",
      isIssue: false,
      summary: "Your application is being checked by the operator.",
      nextAction: "Keep documents ready in case support asks for one more file."
    };
  }

  return {
    stageIndex: 0,
    statusKey: "pending",
    displayStatus: "Pending",
    isIssue: false,
    summary: "Your request has been received and is waiting for the next action.",
    nextAction: paymentStatus && !paymentOk ? "Complete payment to start processing." : "Our team will pick this up shortly."
  };
}

function buildTrackingTimeline(stage, order, latestBotCheck) {
  const checkedAt = latestBotCheck?.checked_at || null;
  const steps = [
    {
      key: "pending",
      label: "Pending",
      description: "Application request received and tracking number generated.",
      time: order.created_at
    },
    {
      key: "processing",
      label: "Processing",
      description: "Operator validation, document review and service processing are underway.",
      time: checkedAt
    },
    {
      key: "approved",
      label: "Approved",
      description: "Application verification is complete and final department update is ready.",
      time: null
    },
    {
      key: "delivered",
      label: "Delivered",
      description: "Receipt, certificate, product or final update dispatched to the customer.",
      time: null
    }
  ];

  return steps.map((step, index) => ({
    ...step,
    state: stage.isIssue
      ? (index === stage.stageIndex ? "attention" : "pending")
      : (index < stage.stageIndex ? "done" : (index === stage.stageIndex ? "active" : "pending"))
  }));
}

function getPublicTrackingStatus(trackingNumber) {
  const { clean, order } = findOrderByTrackingNumber(trackingNumber);
  const customer = db.get("SELECT name, phone FROM users WHERE id = ?", [order.user_id]);
  const items = db.all("SELECT item_name, item_type, quantity FROM order_items WHERE order_id = ? ORDER BY id ASC", [order.id]);
  const payment = db.get("SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  const transaction = db.get("SELECT * FROM transactions WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  const invoice = db.get("SELECT * FROM invoices WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  const documents = db.all("SELECT doc_type, verified, created_at FROM order_documents WHERE order_id = ? ORDER BY created_at DESC", [order.id]);
  const latestBotCheck = db.get("SELECT status, missing_items, checked_at FROM bot_checks WHERE order_id = ? ORDER BY checked_at DESC LIMIT 1", [order.id]);
  const latestAssignment = db.get(`
    SELECT ta.status, ta.priority, ta.updated_at, s.name AS staff_name
    FROM task_assignments ta
    LEFT JOIN staff s ON s.id = ta.staff_id
    WHERE ta.order_id = ?
    ORDER BY ta.updated_at DESC, ta.id DESC
    LIMIT 1
  `, [order.id]);
  const stage = trackingStage(order, payment);
  const missingDocs = stage.stageIndex >= 3
    ? []
    : parseJsonArray(latestBotCheck?.missing_items)
      .filter((item) => item && !["payment", "payment_pending", "order_not_found"].includes(item))
      .map((item) => labelize(String(item).replace(/^doc:/i, ""), "Document"));

  return {
    ok: true,
    trackingNumber: clean,
    order: {
      orderId: order.order_id,
      status: order.status,
      statusLabel: labelize(order.status, "Created"),
      orderType: order.order_type,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      total: fromPaise(order.total_paise),
      currency: order.currency || "INR"
    },
    customer: customer ? {
      name: customer.name,
      phoneLast4: String(customer.phone || "").slice(-4)
    } : null,
    items: items.map((item) => ({
      name: item.item_name,
      type: item.item_type,
      quantity: item.quantity
    })),
    payment: payment ? {
      paymentId: payment.payment_id,
      status: payment.status,
      statusLabel: labelize(payment.status, "Pending"),
      gateway: payment.gateway,
      method: payment.method,
      failureReason: payment.failure_reason || ""
    } : null,
    transaction: transaction ? {
      transactionId: transaction.transaction_id,
      status: transaction.status,
      createdAt: transaction.created_at
    } : null,
    application: stage,
    timeline: buildTrackingTimeline(stage, order, latestBotCheck),
    documents: {
      uploadedCount: documents.length,
      verifiedCount: documents.filter((doc) => Number(doc.verified) === 1).length,
      missing: missingDocs,
      botStatus: latestBotCheck?.status || "pending"
    },
    assignment: latestAssignment ? {
      status: latestAssignment.status,
      priority: latestAssignment.priority,
      staffName: latestAssignment.staff_name || "",
      updatedAt: latestAssignment.updated_at
    } : null,
    invoice: invoice ? {
      invoiceNo: invoice.invoice_no,
      downloadUrl: `/api/invoices/${encodeURIComponent(invoice.invoice_no)}.pdf`
    } : null
  };
}

function updatePaymentFromWebhook({ gateway, event, body }) {
  if (gateway === "razorpay") {
    const entity = body.payload?.payment?.entity || body.payload?.order?.entity || {};
    const gatewayOrderId = entity.order_id || body.payload?.order?.entity?.id;
    const payment = gatewayOrderId ? db.get("SELECT * FROM payments WHERE gateway_order_id = ?", [gatewayOrderId]) : null;
    if (!payment) return { handled: false, reason: "Payment not found" };
    const order = db.get("SELECT * FROM orders WHERE id = ?", [payment.order_id]);
    if (event === "payment.captured" || event === "order.paid") {
      createTransactionAndInvoice({ order, payment, status: "captured", gatewayReference: entity.id || gatewayOrderId, rawResponse: body });
      materializeInvoicePdf(order.id);
      notifyPaymentSuccess(order, payment);
    } else if (event === "payment.failed") {
      db.run("UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [entity.error_description || "Razorpay payment failed", payment.id]);
      db.run("UPDATE orders SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);
      notifyPaymentFailed(order, payment, entity.error_description || "Razorpay payment failed");
    }
    return { handled: true, orderId: order.order_id };
  }

  if (gateway === "phonepe") {
    const decoded = body.response ? JSON.parse(Buffer.from(body.response, "base64").toString("utf8")) : body;
    const merchantTransactionId = decoded.data?.merchantTransactionId || decoded.merchantTransactionId;
    const payment = merchantTransactionId ? db.get("SELECT * FROM payments WHERE payment_id = ?", [merchantTransactionId]) : null;
    if (!payment) return { handled: false, reason: "Payment not found" };
    const order = db.get("SELECT * FROM orders WHERE id = ?", [payment.order_id]);
    const code = String(decoded.code || decoded.data?.state || "").toUpperCase();
    if (code.includes("SUCCESS") || code.includes("COMPLETED")) {
      createTransactionAndInvoice({ order, payment, status: "captured", gatewayReference: decoded.data?.transactionId || merchantTransactionId, rawResponse: decoded });
      materializeInvoicePdf(order.id);
      notifyPaymentSuccess(order, payment);
    } else if (code.includes("FAILED")) {
      db.run("UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [decoded.message || "PhonePe payment failed", payment.id]);
      db.run("UPDATE orders SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);
      notifyPaymentFailed(order, payment, decoded.message || "PhonePe payment failed");
    }
    return { handled: true, orderId: order.order_id };
  }

  return { handled: false, reason: "Unsupported gateway" };
}

async function requestRefund(payload = {}) {
  const paymentId = safeString(payload.paymentId || payload.payment_id, 120);
  const refundType = payload.refundType === "partial" ? "partial" : "full";
  const reason = safeString(payload.reason || "Customer requested refund", 500);
  const payment = db.get("SELECT * FROM payments WHERE payment_id = ?", [paymentId]);
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "captured") throw new Error("Only captured payments can be refunded.");
  const order = db.get("SELECT * FROM orders WHERE id = ?", [payment.order_id]);
  const transaction = db.get("SELECT * FROM transactions WHERE payment_id = ? ORDER BY id DESC LIMIT 1", [payment.id]);
  const amountPaise = refundType === "partial"
    ? Math.max(1, Math.min(payment.amount_paise, Math.round(Number(payload.amount || 0) * 100)))
    : payment.amount_paise;
  const refundId = randomId("rfnd");
  const result = db.run(
    `INSERT INTO refunds (refund_id, order_id, payment_id, transaction_id, gateway, refund_type, amount_paise, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [refundId, order.id, payment.id, transaction?.id || null, payment.gateway, refundType, amountPaise, reason]
  );
  const refundRow = db.get("SELECT * FROM refunds WHERE id = ?", [Number(result.lastInsertRowid)]);
  const response = await gatewayAdapters[payment.gateway].refund({ payment, amountPaise, refundId, notes: { reason, opds_order_id: order.order_id } });
  db.run(
    "UPDATE refunds SET status = 'processing', gateway_refund_id = ?, raw_response_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [response.id || response.data?.transactionId || null, JSON.stringify(response), refundRow.id]
  );
  db.logPayment({ orderDbId: order.id, paymentDbId: payment.id, gateway: payment.gateway, event: "refund_requested", message: reason, payload: { refundId, amountPaise } });
  notifications.notifyEvent("refund_initiated", {
    customer: db.get("SELECT * FROM users WHERE id = ?", [order.user_id]),
    order,
    payment,
    refund: { ...refundRow, status: "processing" },
    message: "Refund initiated"
  });
  return { refundId, status: "processing", amount: fromPaise(amountPaise), gateway: payment.gateway };
}

function getAnalytics() {
  const daily = db.all(`
    SELECT substr(created_at, 1, 10) AS date, SUM(total_paise) / 100.0 AS total, COUNT(*) AS orders
    FROM orders
    WHERE status = 'paid'
    GROUP BY substr(created_at, 1, 10)
    ORDER BY date DESC
    LIMIT 30
  `);
  const paymentStats = db.all(`
    SELECT status, COUNT(*) AS count
    FROM payments
    GROUP BY status
  `);
  const topProducts = db.all(`
    SELECT item_name AS name, SUM(quantity) AS quantity, SUM(total_paise) / 100.0 AS revenue
    FROM order_items
    WHERE item_type = 'product'
    GROUP BY item_slug, item_name
    ORDER BY revenue DESC
    LIMIT 8
  `);
  const topServices = db.all(`
    SELECT item_name AS name, SUM(quantity) AS quantity, SUM(total_paise) / 100.0 AS revenue
    FROM order_items
    WHERE item_type = 'service'
    GROUP BY item_slug, item_name
    ORDER BY revenue DESC
    LIMIT 8
  `);
  return { daily, paymentStats, topProducts, topServices };
}

function getInvoicePdfPath(invoiceNo) {
  const clean = safeString(invoiceNo.replace(/\.pdf$/i, ""), 120);
  const invoice = db.get("SELECT * FROM invoices WHERE invoice_no = ?", [clean]);
  if (!invoice) return null;
  const materialized = materializeInvoicePdf(invoice.order_id);
  return materialized?.pdf_path && path.resolve(materialized.pdf_path);
}

function parseOrderMetadata(raw) {
  try {
    const metadata = JSON.parse(raw || "{}");
    return {
      notes: metadata.notes || "",
      attachments: metadata.attachments || {}
    };
  } catch {
    return { notes: "", attachments: {} };
  }
}

function getAdminOrders() {
  const orders = db.all(`
    SELECT o.order_id, o.status, o.total_paise, o.created_at, o.order_type, o.source_channel, o.metadata_json,
           u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email, u.address AS customer_address,
           p.payment_id, p.gateway, p.status AS payment_status, p.method,
           i.invoice_no
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN payments p ON p.order_id = o.id
    LEFT JOIN invoices i ON i.order_id = o.id
    ORDER BY o.created_at DESC
    LIMIT 100
  `);

  const orderMap = new Map();
  orders.forEach(order => {
    if (!orderMap.has(order.order_id)) {
      const metadata = parseOrderMetadata(order.metadata_json);
      orderMap.set(order.order_id, {
        orderId: order.order_id,
        status: order.status,
        total: Math.round(order.total_paise / 100),
        createdAt: order.created_at,
        orderType: order.order_type,
        sourceChannel: order.source_channel,
        customer: {
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email || "N/A",
          address: order.customer_address || "N/A"
        },
        payment: {
          paymentId: order.payment_id || "N/A",
          gateway: order.gateway || "razorpay",
          status: order.payment_status || "pending",
          method: order.method || "upi"
        },
        invoiceNo: order.invoice_no || "N/A",
        notes: metadata.notes,
        attachments: metadata.attachments,
        items: []
      });
    }
  });

  const allOrderIds = Array.from(orderMap.keys());
  if (allOrderIds.length > 0) {
    const placeholders = allOrderIds.map(() => "?").join(",");
    const items = db.all(`
      SELECT o.order_id AS public_order_id, oi.item_type, oi.item_slug, oi.item_name, oi.quantity, oi.unit_price_paise, oi.total_paise
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.order_id IN (${placeholders})
    `, allOrderIds);

    items.forEach(item => {
      const orderObj = orderMap.get(item.public_order_id);
      if (orderObj) {
        orderObj.items.push({
          type: item.item_type,
          slug: item.item_slug,
          name: item.item_name,
          quantity: item.quantity,
          unitPrice: Math.round(item.unit_price_paise / 100),
          total: Math.round(item.total_paise / 100)
        });
      }
    });
  }

  return { orders: Array.from(orderMap.values()) };
}

function updateOrderStatus({ orderId, status, paymentStatus }) {
  const cleanOrderId = safeString(orderId, 120);
  const cleanStatus = safeString(status, 50);
  const cleanPaymentStatus = safeString(paymentStatus, 50);

  const order = db.get("SELECT * FROM orders WHERE order_id = ?", [cleanOrderId]);
  if (!order) throw new Error("Order not found.");

  db.withTransaction((dbConn) => {
    if (cleanStatus) {
      dbConn.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(cleanStatus, order.id);
    }
    if (cleanPaymentStatus) {
      dbConn.prepare("UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?").run(cleanPaymentStatus, order.id);
    }
    dbConn.prepare(`
      INSERT INTO payment_logs (order_id, gateway, level, event, message, payload_json)
      VALUES (?, 'admin', 'info', 'status_updated', ?, ?)
    `).run(order.id, `Status updated to ${cleanStatus} / ${cleanPaymentStatus}`, JSON.stringify({ status: cleanStatus, paymentStatus: cleanPaymentStatus }));
  });

  return { ok: true, orderId: cleanOrderId, status: cleanStatus, paymentStatus: cleanPaymentStatus };
}

function getCustomerDashboard(rawPhone) {
  const cleanPhone = safeString(rawPhone, 50).trim();
  if (!cleanPhone) throw new Error("Phone number is required.");

  let orders = [];
  let customerProfile = null;

  {
    const phoneNum = cleanPhone.replace(/\D/g, "");
    orders = db.all(`
      SELECT o.order_id, o.status, o.total_paise, o.created_at, o.order_type, o.source_channel, o.metadata_json,
             u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email, u.address AS customer_address,
             p.payment_id, p.gateway, p.status AS payment_status, p.method,
             i.invoice_no
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN payments p ON p.order_id = o.id
      LEFT JOIN invoices i ON i.order_id = o.id
      WHERE u.phone = ? OR u.phone LIKE ?
      ORDER BY o.created_at DESC
      LIMIT 50
    `, [phoneNum, `%${phoneNum}`]);
  }

  const orderMap = new Map();
  orders.forEach(order => {
    const metadata = parseOrderMetadata(order.metadata_json);
    if (!customerProfile) {
      customerProfile = {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email || "N/A",
        address: order.customer_address || "N/A"
      };
    }

    if (!orderMap.has(order.order_id)) {
      orderMap.set(order.order_id, {
        orderId: order.order_id,
        status: order.status,
        amount: Math.round(order.total_paise / 100),
        createdAt: order.created_at,
        orderType: order.order_type,
        gateway: order.gateway || "razorpay",
        paymentStatus: order.payment_status || "pending",
        paymentMethod: order.method || "upi",
        invoiceNo: order.invoice_no || "N/A",
        notes: metadata.notes,
        attachments: metadata.attachments,
        items: []
      });
    }
  });

  const allOrderIds = Array.from(orderMap.keys());
  if (allOrderIds.length > 0) {
    const placeholders = allOrderIds.map(() => "?").join(",");
    const items = db.all(`
      SELECT o.order_id AS public_order_id, oi.item_type, oi.item_slug, oi.item_name, oi.quantity, oi.unit_price_paise, oi.total_paise
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.order_id IN (${placeholders})
    `, allOrderIds);

    items.forEach(item => {
      const orderObj = orderMap.get(item.public_order_id);
      if (orderObj) {
        orderObj.items.push({
          type: item.item_type,
          slug: item.item_slug,
          name: item.item_name,
          quantity: item.quantity,
          price: Math.round(item.unit_price_paise / 100),
          total: Math.round(item.total_paise / 100)
        });
      }
    });
  }

  if (!customerProfile) {
    customerProfile = {
      name: cleanPhone === "bisenasif0001" ? "Asif Bisen (Admin Test)" : "Customer",
      phone: cleanPhone,
      email: "N/A",
      address: "N/A"
    };
  }

  return { customer: customerProfile, orders: Array.from(orderMap.values()) };
}

module.exports = {
  paymentMethods,
  createCheckout,
  retryPayment,
  verifyPayment,
  getOrderStatus,
  getPublicTrackingStatus,
  updatePaymentFromWebhook,
  requestRefund,
  getAnalytics,
  getInvoicePdfPath,
  getAdminOrders,
  updateOrderStatus,
  getCustomerDashboard
};
