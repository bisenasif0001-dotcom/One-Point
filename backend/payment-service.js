"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { config, isGatewayConfigured } = require("./config");
const db = require("./db");
const customerService = require("./customer-service");
const auth = require("./auth-service");
const razorpay = require("./gateways/razorpay");
const phonepe = require("./gateways/phonepe");
const { saveInvoicePdf } = require("./invoice");
const notifications = require("./notifications");
const botChecker = require("./bot-checker");
const pricingEngine = require("./pricing-engine");
const serviceEngine = require("./service-engine");
const workflowEngine = require("./workflow-engine");
const documentService = require("./document-service");
const enterpriseEventService = require("./events/enterprise-event-service");
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

function objectPayload(sourceTable, sourcePk) {
  return sourcePk === undefined || sourcePk === null ? null : db.getUniversalObjectPayload(sourceTable, sourcePk);
}

function ensureCustomerGenome(user) {
  try {
    customerService.ensureCustomerProfileForUser(user?.id || user);
  } catch (error) {
    console.warn("[customer-genome] profile sync skipped:", error.message);
  }
}

function publicOrderWithObject(row) {
  const payload = publicOrder(row);
  if (!payload) return payload;
  payload.object = objectPayload("orders", row.id || row.order_db_id);
  try {
    payload.workflow = workflowEngine.getPublicWorkflowForOrder(row.id || row.order_db_id || row.order_id);
  } catch {
    payload.workflow = null;
  }
  return payload;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

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

function serviceLookupCandidates(item = {}) {
  const rawSlug = safeString(item.slug || item.item_slug, 120);
  const rawName = safeString(item.name || item.item_name || item.serviceName || item.service_name, 160);
  return unique([
    rawSlug,
    pricingEngine.canonicalSlug(rawSlug),
    pricingEngine.slugify(rawName),
    pricingEngine.canonicalSlug(rawName)
  ]);
}

function findServicePricingRow(item = {}) {
  const candidates = serviceLookupCandidates(item);
  const rawName = safeString(item.name || item.item_name || item.serviceName || item.service_name, 160);

  for (const candidate of candidates) {
    const variant = db.get("SELECT * FROM service_pricing_variants WHERE variant_slug = ? AND active = 1", [candidate]);
    if (variant) return { row: variant, source: "variant" };
  }
  if (rawName) {
    const variantByName = db.get(
      "SELECT * FROM service_pricing_variants WHERE LOWER(variant_name) = LOWER(?) AND active = 1",
      [rawName]
    );
    if (variantByName) return { row: variantByName, source: "variant" };
  }

  for (const candidate of candidates) {
    const service = db.get("SELECT * FROM services WHERE slug = ? AND active = 1", [candidate]);
    if (service) return { row: service, source: "service" };
  }
  if (rawName) {
    const serviceByName = db.get("SELECT * FROM services WHERE LOWER(name) = LOWER(?) AND active = 1", [rawName]);
    if (serviceByName) return { row: serviceByName, source: "service" };
  }
  return null;
}

function buildServiceItem(item, quantity) {
  const match = findServicePricingRow(item);
  const requested = safeString(item.slug || item.item_slug || item.name || "service", 160);
  if (!match) throw new Error(`Item not found: ${requested}`);

  const row = serviceEngine.applyActiveServiceDnaToPricingRow(match.row);
  const pricing = pricingEngine.publicPricingPayload(row);
  const actualAmountPaise = Math.max(0, Math.round(Number(item.actualAmount || item.actual_amount || 0) * 100));
  const unit = Number(row.price_paise || 0) + (
    pricing.model === pricingEngine.PRICING_MODELS.SERVICE_PLUS_ACTUAL ? actualAmountPaise : 0
  );
  const taxable = unit * quantity;
  const itemName = match.source === "variant" ? row.variant_name : row.name;
  const slug = match.source === "variant" ? row.variant_slug : row.slug;
  return {
    itemType: "service",
    slug,
    name: itemName,
    image: "",
    quantity,
    unitPricePaise: unit,
    taxRate: 0,
    taxPaise: 0,
    totalPaise: taxable,
    pricing: {
      ...pricing,
      source: match.source,
      parentSlug: row.parent_slug || row.slug,
      actualAmount: fromPaise(actualAmountPaise),
      actualAmountPaise
    }
  };
}

function buildItems(payload) {
  const orderType = safeString(payload.orderType || payload.order_type || "product", 20);
  const inputItems = Array.isArray(payload.items) ? payload.items : [];
  if (!inputItems.length) throw new Error("At least one item is required.");

  return inputItems.map((item) => {
    const slug = safeString(item.slug || item.item_slug, 120);
    const quantity = Math.max(1, Math.min(999, Number(item.quantity || 1)));
    if (orderType === "service" || item.type === "service") {
      return buildServiceItem(item, quantity);
    }
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

function findExistingUserForCheckout(dbConn, customer) {
  const phone = safePhone(customer.phone);
  const email = safeString(customer.email || "", 180).toLowerCase();
  if (phone) {
    const byPhone = dbConn.prepare("SELECT * FROM users WHERE phone = ? ORDER BY updated_at DESC, id DESC LIMIT 1").get(phone);
    if (byPhone) return byPhone;
  }
  if (email) {
    const byEmail = dbConn.prepare("SELECT * FROM users WHERE lower(IFNULL(email, '')) = ? ORDER BY updated_at DESC, id DESC LIMIT 1").get(email);
    if (byEmail) return byEmail;
  }
  return null;
}

function getOrCreateUser(dbConn, customer, sessionUserId) {
  if (sessionUserId) {
    const sessionUser = dbConn.prepare("SELECT * FROM users WHERE id = ?").get(Number(sessionUserId));
    if (sessionUser) {
      dbConn.prepare("UPDATE users SET name = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(customer.name || sessionUser.name, customer.address || sessionUser.address || "", sessionUser.id);
      return { ...sessionUser, name: customer.name || sessionUser.name, address: customer.address || sessionUser.address || "" };
    }
  }

  // Match phone-first-then-email (mirrors auth-service.findUser) so a returning
  // customer who checks out with a different email doesn't get a duplicate account.
  const existing = findExistingUserForCheckout(dbConn, customer);
  if (existing) {
    dbConn.prepare("UPDATE users SET name = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(customer.name, customer.address || existing.address || "", existing.id);
    return { ...existing, name: customer.name, address: customer.address || existing.address || "" };
  }
  const result = dbConn.prepare("INSERT INTO users (name, phone, email, address) VALUES (?, ?, ?, ?)")
    .run(customer.name, customer.phone, customer.email || null, customer.address || null);
  return dbConn.prepare("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid));
}

function createOrderRecords({ customer, items, totals, orderType, metadata, paymentMethod, sourceChannel, clientReference, sessionUserId }) {
  return db.withTransaction((dbConn) => {
    const user = getOrCreateUser(dbConn, customer, sessionUserId);
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
      p.id AS payment_db_id,
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
    order: publicOrderWithObject(row),
    payment: row.payment_id ? {
      gateway: row.gateway,
      sessionType: hasRedirectSession ? "redirect" : (hasRazorpaySession ? "razorpay_checkout" : "pending"),
      paymentId: row.payment_id,
      orderId: row.order_id,
      amount: fromPaise(row.payment_amount_paise || row.total_paise),
      currency: row.payment_currency || row.currency || "INR",
      session,
      object: objectPayload("payments", row.payment_db_id)
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
      workflowEngine.recordOrderEvent(order, "payment.session_created", {
        actorType: "system",
        title: "Payment session created",
        summary: `Payment session created through ${gateway}.`,
        sourceTable: "payments",
        sourcePk: payment.id,
        metadata: { gateway, sessionType: session.type },
        includeInternal: false
      });
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
        session: session.session,
        object: objectPayload("payments", payment.id)
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
  workflowEngine.transitionOrderWorkflow(order, "payment_failed", {
    actorType: "system",
    eventType: "payment.failed",
    title: "Payment failed",
    summary: finalError.message || "Gateway unavailable",
    sourceTable: "payments",
    sourcePk: payment.id,
    includeInternal: false
  });
  throw finalError;
}

function notifyPaymentSuccess(order, payment) {
  try {
    workflowEngine.transitionOrderWorkflow(order, "paid", {
      actorType: "system",
      eventType: "payment.captured",
      title: "Payment captured",
      summary: "Payment captured and invoice workflow metadata updated.",
      sourceTable: "payments",
      sourcePk: payment.id,
      includeInternal: false
    });
  } catch (error) {
    console.warn("[order-workflow] payment success transition skipped:", error.message);
  }
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
  try {
    workflowEngine.transitionOrderWorkflow(order, "payment_failed", {
      actorType: "system",
      eventType: "payment.failed",
      title: "Payment failed",
      summary: reason || "Payment failed.",
      sourceTable: "payments",
      sourcePk: payment.id,
      includeInternal: false
    });
  } catch (error) {
    console.warn("[order-workflow] payment failure transition skipped:", error.message);
  }
  const customer = db.get("SELECT * FROM users WHERE id = ?", [order.user_id]);
  notifications.notifyEvent("payment_failed", {
    customer,
    order: { ...order, status: "payment_failed" },
    payment: { ...payment, status: "failed" },
    message: reason || "Payment failed. Please retry or switch gateway."
  });
}

async function createCheckout(payload = {}, context = {}) {
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
      sessionUserId: context.sessionUserId,
      metadata: {
        notes: safeString(payload.notes, 1000),
        attachments: payload.attachments || {},
        paymentMethod,
        pricing: items
          .filter((item) => item.itemType === "service")
          .map((item) => ({
            slug: item.slug,
            name: item.name,
            model: item.pricing?.model,
            displayPrice: item.pricing?.displayPrice,
            payableAmount: item.pricing?.payableAmount,
            actualAmount: item.pricing?.actualAmount || 0,
            note: item.pricing?.customerPriceNote
          }))
      }
    });
  } catch (error) {
    const duplicate = getExistingCheckout(clientReference);
    if (duplicate) return duplicate;
    throw error;
  }
  ensureCustomerGenome(records.user);
  workflowEngine.ensureWorkflowForOrder(records.order, {
    actorType: "system",
    actorId: "checkout",
    eventType: "order.created"
  });
  const session = await attachGatewaySession({ ...records, preferredGateway: payload.gateway || "razorpay" });

  // Auto-reply: notify customer that order was received
  notifications.notifyEvent("order.created", {
    customer: records.user,
    order: records.order,
    message: `Aapka application #${records.order.order_id} mil gaya! Payment complete karein aur required documents upload karein.`
  });

  // Guest checkout (no existing customer session on the request): if the matched/created
  // account has no password set, it's a true guest — mint a secure session automatically so
  // the browser can land on the Customer Profile page without a silent login into a real,
  // password-protected account that happens to share this phone/email.
  let guestSession = null;
  let finalUser = records.user;
  if (!context.sessionUserId) {
    const freshUser = db.get("SELECT * FROM users WHERE id = ?", [records.user.id]);
    if (freshUser && !freshUser.password_hash) {
      if ((freshUser.account_status || "active") !== "temporary") {
        db.run("UPDATE users SET account_status = 'temporary', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [freshUser.id]);
      }
      finalUser = db.get("SELECT * FROM users WHERE id = ?", [freshUser.id]);
      guestSession = auth.createSession(freshUser.id);
    }
  }

  return {
    order: publicOrderWithObject(records.order),
    payment: session,
    session: guestSession,
    user: publicOrderCustomer(finalUser)
  };
}

function publicOrderCustomer(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email || "",
    accountStatus: user.account_status || "active"
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
    order: publicOrderWithObject(order),
    customer: customer ? {
      ...customer,
      object: objectPayload("users", customer.id)
    } : null,
    items: items.map((item) => ({
      name: item.item_name,
      slug: item.item_slug,
      quantity: item.quantity,
      image: item.image_url,
      unitPrice: fromPaise(item.unit_price_paise),
      tax: fromPaise(item.tax_paise),
      total: fromPaise(item.total_paise),
      object: objectPayload("order_items", item.id)
    })),
    payment: payment ? {
      paymentId: payment.payment_id,
      gateway: payment.gateway,
      method: payment.method,
      status: payment.status,
      amount: fromPaise(payment.amount_paise),
      failureReason: payment.failure_reason,
      object: objectPayload("payments", payment.id)
    } : null,
    transaction: transaction ? {
      transactionId: transaction.transaction_id,
      gatewayReference: transaction.gateway_reference,
      status: transaction.status,
      amount: fromPaise(transaction.amount_paise),
      createdAt: transaction.created_at,
      object: objectPayload("transactions", transaction.id)
    } : null,
    invoice: invoice ? {
      invoiceNo: invoice.invoice_no,
      downloadUrl: `/api/invoices/${encodeURIComponent(invoice.invoice_no)}.pdf`,
      object: objectPayload("invoices", invoice.id)
    } : null,
    workflow: workflowEngine.getPublicWorkflowForOrder(order.id)
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

  if (["approved", "verified", "verification"].includes(orderStatus)) {
    return {
      stageIndex: 2,
      statusKey: orderStatus,
      displayStatus: orderStatus === "verification" ? "Verification" : (orderStatus === "verified" ? "Verified" : "Approved"),
      isIssue: false,
      summary: "Your application has passed verification.",
      nextAction: "Delivery or final department update is next."
    };
  }

  if (["processing", "paid", "ready", "government_submission", "waiting"].includes(orderStatus) || paymentOk) {
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

function detectServiceCategory(order, items) {
  if (String(order.order_type || "").toLowerCase() === "product") return "Printing";
  const primary = items[0] || {};
  const itemName = String(primary.name || "").toLowerCase();
  
  if (/sticker|print|t-shirt|visiting|photo|decal|banner|cup|stamp|uv dtf|flex|poster/i.test(itemName)) {
    return "Printing";
  }
  if (/design|logo|resume|graphics|brand|mockup/i.test(itemName)) {
    return "Design";
  }
  if (/gst|tax|itr|income tax|business|msme|udyam|pf |fssai|company|corporate/i.test(itemName)) {
    return "Business";
  }
  if (/admit|exam|ccc|o level|admission|scholarship|student|board/i.test(itemName)) {
    return "Education";
  }
  if (/passport|visa|railway|flight|travel|ticket/i.test(itemName)) {
    return "Travel";
  }
  return "Government";
}

function buildServiceAwareTimeline(category, stage, order, latestBotCheck, latestAssignment) {
  const checkedAt = latestBotCheck?.checked_at || null;
  const updatedAt = latestAssignment?.updated_at || order.updated_at || null;
  
  const TEMPLATES = {
    Government: [
      {
        key: "submitted",
        label: "Application Submitted",
        description: "Application request received and assigned to verification queue.",
        icon: "clipboard-check"
      },
      {
        key: "verification",
        label: "Document & Identity Check",
        description: "Operator compliance check and supporting document validation.",
        icon: "shield-check"
      },
      {
        key: "processing",
        label: "Authority & Department Review",
        description: "Submitted to government department / official portal for approval.",
        icon: "building-2"
      },
      {
        key: "completed",
        label: "Approved & Issued",
        description: "Official certificate/card generated and dispatched to customer.",
        icon: "badge-check"
      }
    ],
    Printing: [
      {
        key: "submitted",
        label: "Print Order Received",
        description: "Print specifications, material choices and raw artwork logged.",
        icon: "shopping-bag"
      },
      {
        key: "verification",
        label: "Pre-Press & Proofing",
        description: "Artwork resolution check, color proofing and machine setup.",
        icon: "layers"
      },
      {
        key: "processing",
        label: "Printing & Finishing",
        description: "High-definition production run, cutting and quality inspection.",
        icon: "printer"
      },
      {
        key: "completed",
        label: "Dispatched / Ready for Pickup",
        description: "Order packed, ready at Suvidha Kendra counter or dispatched.",
        icon: "package-check"
      }
    ],
    Design: [
      {
        key: "submitted",
        label: "Creative Brief Logged",
        description: "Design brief, reference assets and project requirements received.",
        icon: "palette"
      },
      {
        key: "verification",
        label: "Concept Design & Draft",
        description: "Designer creating initial mockups and creative typography.",
        icon: "sparkles"
      },
      {
        key: "processing",
        label: "Proof Review & Polish",
        description: "Customer review revisions applied & high-res export preparation.",
        icon: "file-check"
      },
      {
        key: "completed",
        label: "Final Assets Delivered",
        description: "Source files, vector assets and print-ready formats delivered.",
        icon: "send"
      }
    ],
    Business: [
      {
        key: "submitted",
        label: "Filing Request Logged",
        description: "Business credentials and filing data securely received.",
        icon: "briefcase"
      },
      {
        key: "verification",
        label: "Compliance & Data Audit",
        description: "Legal/CA executive validating PAN, GSTIN & supporting disclosures.",
        icon: "file-search"
      },
      {
        key: "processing",
        label: "Department Submission",
        description: "Filing submitted to government portal. Awaiting ARN / acknowledgement.",
        icon: "landmark"
      },
      {
        key: "completed",
        label: "Certificate & Receipt Issued",
        description: "Final registration certificate / filing acknowledgement issued.",
        icon: "file-badge"
      }
    ],
    Education: [
      {
        key: "submitted",
        label: "Form Intake Logged",
        description: "Candidate details, exam choices and educational background recorded.",
        icon: "graduation-cap"
      },
      {
        key: "verification",
        label: "Eligibility & Photo Check",
        description: "Checking marksheets, photo dimension and signature eligibility.",
        icon: "user-check"
      },
      {
        key: "processing",
        label: "Board Portal Submission",
        description: "Application successfully submitted to university/examination board.",
        icon: "file-symlink"
      },
      {
        key: "completed",
        label: "Confirmation / Admit Card Ready",
        description: "Official confirmation slip and registration receipt ready.",
        icon: "award"
      }
    ],
    Travel: [
      {
        key: "submitted",
        label: "Travel Request Received",
        description: "Passenger travel itinerary and identity details logged.",
        icon: "plane"
      },
      {
        key: "verification",
        label: "Document Verification",
        description: "Identity, photo and travel requirements validated.",
        icon: "shield-check"
      },
      {
        key: "processing",
        label: "Embassy / Portal Filing",
        description: "Appointment booking / ticket reservation processing underway.",
        icon: "calendar-clock"
      },
      {
        key: "completed",
        label: "Travel Documents Dispatched",
        description: "Confirmed ticket / appointment slip delivered.",
        icon: "check-circle-2"
      }
    ]
  };

  const steps = TEMPLATES[category] || TEMPLATES.Government;

  return steps.map((step, index) => {
    let state = "pending";
    let badge = "Upcoming";
    let stepTime = null;

    if (stage.isIssue && index === stage.stageIndex) {
      state = "attention";
      badge = "Action Required";
      stepTime = updatedAt || order.created_at;
    } else if (index < stage.stageIndex) {
      state = "done";
      badge = "Completed";
      stepTime = index === 0 ? order.created_at : (index === 1 ? (checkedAt || order.created_at) : updatedAt);
    } else if (index === stage.stageIndex) {
      state = "active";
      badge = "Current";
      stepTime = checkedAt || updatedAt || order.created_at;
    }

    return {
      ...step,
      state,
      badge,
      time: stepTime
    };
  });
}

function buildDocumentChecklist(category, orderDbId, stage, latestBotCheck) {
  const uploadedRows = db.all(
    "SELECT id, doc_type, file_name, file_url, verified, verification_status, lifecycle_status, created_at FROM order_documents WHERE order_id = ? ORDER BY created_at DESC",
    [orderDbId]
  );

  const uploadedMap = new Map();
  uploadedRows.forEach((r) => {
    const key = String(r.doc_type || "").toLowerCase().replace(/[\s-]+/g, "_");
    if (!uploadedMap.has(key)) uploadedMap.set(key, r);
  });

  const BASE_DOCS_BY_CAT = {
    Government: [
      { id: "aadhaar", label: "Aadhaar Card", required: true, hint: "Front & back in 1 file" },
      { id: "photo", label: "Passport Photograph", required: true, hint: "Clear photo with white background" },
      { id: "signature", label: "Applicant Signature", required: true, hint: "Signed on clean white paper" },
      { id: "address_proof", label: "Address Proof", required: false, hint: "Electricity bill, Ration card, or Voter ID" },
      { id: "supporting_doc", label: "Supporting Document", required: false, hint: "If applicable for your specific caste/income category" }
    ],
    Printing: [
      { id: "design_file", label: "Artwork / Design File", required: true, hint: "High-resolution PDF, PNG, AI or CDR" },
      { id: "reference_sample", label: "Reference Sample / Photo", required: false, hint: "Sample preview or photo for alignment" },
      { id: "custom_text", label: "Text / Content Details", required: false, hint: "Names, phone numbers or text to print" }
    ],
    Design: [
      { id: "brand_brief", label: "Design Brief & Notes", required: true, hint: "Description, color preferences & text" },
      { id: "logo_assets", label: "Existing Logo / Assets", required: false, hint: "PNG or Vector format if available" },
      { id: "reference_image", label: "Style References", required: false, hint: "Inspirational designs or benchmark samples" }
    ],
    Business: [
      { id: "pan", label: "PAN Card", required: true, hint: "Clear color scan" },
      { id: "aadhaar", label: "Aadhaar Card", required: true, hint: "Linked with mobile for OTP" },
      { id: "business_address", label: "Business Address Proof", required: true, hint: "Electricity bill or rent agreement" },
      { id: "bank_proof", label: "Bank Proof / Cancelled Cheque", required: false, hint: "Bank passbook front page or cancelled cheque" }
    ],
    Education: [
      { id: "photo", label: "Passport Photo", required: true, hint: "Recent passport photograph" },
      { id: "signature", label: "Applicant Signature", required: true, hint: "Dark ink signature" },
      { id: "marksheet", label: "Previous Marksheet", required: true, hint: "10th/12th/Graduation marksheet" },
      { id: "aadhaar", label: "Identity Proof (Aadhaar)", required: true, hint: "Aadhaar or School ID" }
    ],
    Travel: [
      { id: "passport_old", label: "Existing Passport / ID", required: true, hint: "Old passport or Aadhaar Card" },
      { id: "photo", label: "Passport Size Photograph", required: true, hint: "White background 35x45mm" },
      { id: "address_proof", label: "Address Proof", required: true, hint: "Voter card, Aadhaar or Bank passbook" }
    ]
  };

  const list = BASE_DOCS_BY_CAT[category] || BASE_DOCS_BY_CAT.Government;

  return list.map((docDef) => {
    const uploaded = uploadedMap.get(docDef.id);
    let status = "not_uploaded";
    let statusLabel = docDef.required ? "Required" : "Optional";
    let correctionReason = null;

    if (uploaded) {
      if (Number(uploaded.verified) === 1 || String(uploaded.verification_status || "").toLowerCase().includes("verified")) {
        status = "verified";
        statusLabel = "Verified ✓";
      } else if (String(uploaded.verification_status || "").toLowerCase().includes("correction") || String(uploaded.verification_status || "").toLowerCase().includes("reject")) {
        status = "needs_correction";
        statusLabel = "Needs Correction ⚠️";
        correctionReason = "Document is blurry or incomplete. Please upload a clear original copy.";
      } else {
        status = "under_review";
        statusLabel = "Under Review ⏳";
      }
    } else if (stage.stageIndex >= 3) {
      status = "verified";
      statusLabel = "Completed";
    }

    return {
      id: docDef.id,
      label: docDef.label,
      required: docDef.required,
      hint: docDef.hint,
      status,
      statusLabel,
      fileName: uploaded?.file_name || null,
      uploadedAt: uploaded?.created_at || null,
      correctionReason,
      allowedFormats: "PDF, JPG, PNG, WebP (Max 5MB)"
    };
  });
}

function buildWhatHappensNext(stage, category, missingDocs, serviceName) {
  if (stage.isIssue) {
    if (stage.statusKey === "payment_failed") {
      return {
        tone: "warning",
        title: "Payment Pending / Action Required",
        message: "Payment could not be completed for this request. Please complete payment to start operator processing.",
        actionLabel: "Complete Payment",
        actionLink: "checkout.html"
      };
    }
    return {
      tone: "warning",
      title: "Action Required on Your Request",
      message: "Please check your document checklist or contact our support desk to proceed with your application.",
      actionLabel: "Upload Documents",
      actionLink: "#doc-upload-section"
    };
  }

  if (missingDocs.length > 0 && stage.stageIndex < 2) {
    return {
      tone: "warning",
      title: "Action Required: Missing Documents",
      message: `Please upload ${missingDocs.join(", ")} below to avoid processing delays. Bot verification runs automatically after upload.`,
      actionLabel: "Upload Missing Documents",
      actionLink: "#doc-upload-section"
    };
  }

  switch (stage.stageIndex) {
    case 0:
      return {
        tone: "info",
        title: "What Happens Next: Order Intake",
        message: `Your request for ${serviceName} is queued. Our Suvidha Kendra operator is assigned to verify your details and initiate the compliance check.`,
        actionLabel: "Ask Operator on WhatsApp",
        actionLink: "#support-section"
      };
    case 1:
      return {
        tone: "info",
        title: "What Happens Next: Operator Verification",
        message: "Our verification operator is actively reviewing your application and checking document compliance. No action is required from your end right now.",
        actionLabel: "Track Live Updates",
        actionLink: "#status-timeline"
      };
    case 2:
      return {
        tone: "info",
        title: "What Happens Next: Department Review",
        message: "Your application has passed verification and has been submitted to the designated authority/portal. We will notify you as soon as the clearance is granted.",
        actionLabel: "View Submission Details",
        actionLink: "#activity-section"
      };
    case 3:
    default:
      return {
        tone: "success",
        title: "Application Complete & Delivered!",
        message: "Your request has been successfully completed! Your official certificate, receipt, and final deliverables are available for download below.",
        actionLabel: "Download Deliverables",
        actionLink: "#deliverables-section"
      };
  }
}

function buildActivityFeed(order, payment, invoice, documents, latestAssignment, stage) {
  const events = [];

  // 1. Order Created
  if (order.created_at) {
    events.push({
      title: "Request Created & Assigned",
      description: `Application #${order.order_id} initialized with tracking security token.`,
      actor: "System Intake",
      actorRole: "system",
      timestamp: order.created_at,
      status: "done"
    });
  }

  // 2. Payment
  if (payment) {
    const isPaid = ["captured", "paid", "success", "completed"].includes(String(payment.status || "").toLowerCase());
    events.push({
      title: isPaid ? "Payment Verified" : "Payment Session Initialized",
      description: isPaid
        ? `Payment of ₹${fromPaise(order.total_paise || 0)} received via ${payment.gateway || "UPI"}. Tax invoice generated.`
        : `Payment status: ${payment.statusLabel || "Pending"}.`,
      actor: "Payment Gateway",
      actorRole: "finance",
      timestamp: payment.updated_at || order.created_at,
      status: isPaid ? "done" : "pending"
    });
  }

  // 3. Document uploads
  documents.forEach((doc) => {
    events.push({
      title: `Document Uploaded: ${labelize(doc.doc_type, "Document")}`,
      description: `File '${doc.file_name || "Attachment"}' received & queued for auto-check.`,
      actor: "Applicant",
      actorRole: "customer",
      timestamp: doc.created_at || order.created_at,
      status: "done"
    });
    if (Number(doc.verified) === 1) {
      events.push({
        title: `Document Verified: ${labelize(doc.doc_type, "Document")}`,
        description: "Compliance validation passed & approved by operator.",
        actor: "Verification Desk",
        actorRole: "operator",
        timestamp: doc.created_at || order.created_at,
        status: "done"
      });
    }
  });

  // 4. Operator Assignment
  if (latestAssignment) {
    events.push({
      title: `Assigned to ${latestAssignment.staff_name || "Operations Desk"}`,
      description: `Priority set to ${String(latestAssignment.priority || "normal").toUpperCase()}. Processing underway.`,
      actor: "Workforce Manager",
      actorRole: "operator",
      timestamp: latestAssignment.updated_at || order.created_at,
      status: "done"
    });
  }

  // 5. Completion
  if (stage.stageIndex >= 3) {
    events.push({
      title: "Service Completed & Dispatched",
      description: "Official certificate / deliverables dispatched to customer WhatsApp & email.",
      actor: "Suvidha Kendra Desk",
      actorRole: "system",
      timestamp: order.updated_at || order.created_at,
      status: "done"
    });
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}

function buildTrackingTimeline(stage, order, latestBotCheck) {
  return buildServiceAwareTimeline("Government", stage, order, latestBotCheck, null);
}

function getPublicTrackingStatus(trackingNumber) {
  const { clean, order } = findOrderByTrackingNumber(trackingNumber);
  const customer = db.get("SELECT name, phone FROM users WHERE id = ?", [order.user_id]);
  const items = db.all("SELECT item_name, item_type, quantity FROM order_items WHERE order_id = ? ORDER BY id ASC", [order.id]);
  const payment = db.get("SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  const transaction = db.get("SELECT * FROM transactions WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  const invoice = db.get("SELECT * FROM invoices WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);
  const documents = db.all("SELECT id, doc_type, file_name, file_url, verified, verification_status, created_at FROM order_documents WHERE order_id = ? ORDER BY created_at DESC", [order.id]);
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
  const workflow = workflowEngine.getPublicWorkflowForOrder(order.id);
  const category = detectServiceCategory(order, items);
  const primaryItem = items[0] || {};
  const serviceName = primaryItem.name || (order.order_type === "product" ? "Store Product" : "Digital Service");

  const missingDocs = stage.stageIndex >= 3
    ? []
    : parseJsonArray(latestBotCheck?.missing_items)
      .filter((item) => item && !["payment", "payment_pending", "order_not_found"].includes(item))
      .map((item) => labelize(String(item).replace(/^doc:/i, ""), "Document"));

  const timeline = buildServiceAwareTimeline(category, stage, order, latestBotCheck, latestAssignment);
  const documentChecklist = buildDocumentChecklist(category, order.id, stage, latestBotCheck);
  const whatHappensNext = buildWhatHappensNext(stage, category, missingDocs, serviceName);
  const activityFeed = buildActivityFeed(order, payment, invoice, documents, latestAssignment, stage);

  const isCompleted = stage.stageIndex >= 3;
  const isPaid = ["captured", "paid", "success", "completed"].includes(String(payment?.status || "").toLowerCase());

  const deliverables = [
    {
      id: "invoice",
      title: "Tax Invoice & Payment Receipt",
      type: "pdf",
      status: invoice ? "Ready" : (isPaid ? "Generated" : "Payment Pending"),
      available: Boolean(invoice?.invoice_no),
      downloadUrl: invoice ? `/api/invoices/${encodeURIComponent(invoice.invoice_no)}.pdf` : null,
      badge: "Official GST Invoice"
    },
    {
      id: "slip",
      title: "Application Submission Acknowledgement",
      type: "receipt",
      status: "Ready",
      available: true,
      downloadUrl: null,
      action: "print_slip",
      badge: "Intake Slip"
    },
    {
      id: "certificate",
      title: isCompleted ? "Final Certificate / Deliverable Copy" : "Final Certificate / Digital File",
      type: "certificate",
      status: isCompleted ? "Ready to Download" : "Available After Approval",
      available: isCompleted,
      downloadUrl: isCompleted && invoice ? `/api/invoices/${encodeURIComponent(invoice.invoice_no)}.pdf` : null,
      badge: isCompleted ? "Issued & Verified" : "In Processing"
    }
  ];

  const supportQuery = `Hi Bisen One Point team, I am inquiring about my request #${order.order_id} (${serviceName}). Current stage: ${stage.displayStatus}. Please assist.`;
  const supportContext = {
    whatsappUrl: `https://wa.me/919473946181?text=${encodeURIComponent(supportQuery)}`,
    phone: "+91 9473946181",
    email: "support@bisenonepoint.com",
    hours: "9:00 AM - 8:00 PM (Mon - Sat)",
    center: "One Point Suvidha Kendra, Sector-G, LDA Colony, Lucknow"
  };

  return {
    ok: true,
    trackingNumber: clean,
    order: {
      orderId: order.order_id,
      status: order.status,
      statusLabel: labelize(order.status, "Created"),
      orderType: order.order_type,
      category,
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
    workflow,
    timeline,
    documentChecklist,
    whatHappensNext,
    activityFeed,
    deliverables,
    supportContext,
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
  enterpriseEventService.publishEvent({
    eventKey: "payment.refund_requested",
    publisherKey: "payment_service_publisher",
    linkedObjectType: "Order",
    linkedObjectUuid: db.getUniversalObjectPayload("orders", order.id)?.universalUuid || null,
    sourceTable: "refunds",
    sourcePk: refundRow.id,
    correlationId: order.order_id,
    processContextKey: "checkout_payment_context",
    actorType: "system",
    actorId: "payment-service",
    payload: {
      paymentId: payment.payment_id,
      refundId,
      refundType,
      amountPaise,
      gateway: payment.gateway,
      reason
    }
  });
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
    WHERE EXISTS (
      SELECT 1
      FROM payments p
      WHERE p.order_id = orders.id AND p.status = 'captured'
    )
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
    SELECT o.id AS order_db_id, o.order_id, o.status, o.total_paise, o.created_at, o.order_type, o.source_channel, o.metadata_json,
           u.id AS customer_db_id, u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email, u.address AS customer_address,
           p.id AS payment_db_id, p.payment_id, p.gateway, p.status AS payment_status, p.method,
           i.id AS invoice_db_id, i.invoice_no
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
        object: objectPayload("orders", order.order_db_id),
        customer: {
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email || "N/A",
          address: order.customer_address || "N/A",
          object: objectPayload("users", order.customer_db_id)
        },
        payment: {
          paymentId: order.payment_id || "N/A",
          gateway: order.gateway || "razorpay",
          status: order.payment_status || "pending",
          method: order.method || "upi",
          object: objectPayload("payments", order.payment_db_id)
        },
        invoiceNo: order.invoice_no || "N/A",
        invoiceObject: objectPayload("invoices", order.invoice_db_id),
        workflow: workflowEngine.getWorkflowForOrder(order.order_db_id, { timelineLimit: 8, taskLimit: 12 }),
        documents: documentService.listOrderDocuments(order.order_db_id),
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
      SELECT o.order_id AS public_order_id, oi.id AS item_db_id, oi.item_type, oi.item_slug, oi.item_name, oi.quantity, oi.unit_price_paise, oi.total_paise
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
          total: Math.round(item.total_paise / 100),
          object: objectPayload("order_items", item.item_db_id)
        });
      }
    });
  }

  return { orders: Array.from(orderMap.values()) };
}

function updateOrderStatus({ orderId, status, paymentStatus, overrideReason, reason, actor, actorId }) {
  const cleanOrderId = safeString(orderId, 120);
  const cleanStatus = safeString(status, 50);
  const cleanPaymentStatus = safeString(paymentStatus, 50);
  const cleanOverrideReason = safeString(overrideReason || reason, 500) || "Admin status update";
  const cleanActor = safeString(actor || actorId || "admin", 120);

  const order = db.get("SELECT * FROM orders WHERE order_id = ?", [cleanOrderId]);
  if (!order) throw new Error("Order not found.");

  let workflow = null;
  db.withTransaction((dbConn) => {
    if (cleanStatus) {
      workflow = workflowEngine.transitionOrderWorkflow(order, cleanStatus, {
        dbConn,
        actorType: "admin",
        actorId: cleanActor,
        override: Boolean(cleanOverrideReason),
        reason: cleanOverrideReason,
        eventType: cleanOverrideReason ? "workflow.override" : "workflow.admin_status_update",
        title: cleanOverrideReason ? "Manual workflow override" : "Admin status update",
        summary: cleanOverrideReason || `Order status changed to ${cleanStatus}.`,
        sourceTable: "orders",
        sourcePk: order.id
      });
    }
    if (cleanPaymentStatus) {
      dbConn.prepare("UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?").run(cleanPaymentStatus, order.id);
    }
    dbConn.prepare(`
      INSERT INTO payment_logs (order_id, gateway, level, event, message, payload_json)
      VALUES (?, 'admin', 'info', 'status_updated', ?, ?)
    `).run(
      order.id,
      `Status updated to ${cleanStatus} / ${cleanPaymentStatus}`,
      JSON.stringify({
        status: cleanStatus,
        paymentStatus: cleanPaymentStatus,
        workflowState: workflow?.currentState || null,
        overrideReason: cleanOverrideReason || null
      })
    );
  });

  return { ok: true, orderId: cleanOrderId, status: cleanStatus, paymentStatus: cleanPaymentStatus, workflow };
}

function getCustomerDashboard(rawPhone) {
  const cleanPhone = safeString(rawPhone, 50).trim();
  if (!cleanPhone) throw new Error("Phone number is required.");

  let orders = [];
  let customerProfile = null;

  {
    const phoneNum = cleanPhone.replace(/\D/g, "");
    orders = db.all(`
      SELECT o.id AS order_db_id, o.order_id, o.status, o.total_paise, o.created_at, o.order_type, o.source_channel, o.metadata_json,
             o.subtotal_paise, o.gst_paise, o.discount_paise, o.delivery_paise,
             u.id AS customer_db_id, u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email, u.address AS customer_address,
             p.id AS payment_db_id, p.payment_id, p.gateway, p.status AS payment_status, p.method,
             i.id AS invoice_db_id, i.invoice_no,
             t.transaction_id
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN payments p ON p.order_id = o.id
      LEFT JOIN invoices i ON i.order_id = o.id
      LEFT JOIN transactions t ON t.order_id = o.id
      WHERE u.phone = ? OR u.phone LIKE ?
      ORDER BY o.created_at DESC
      LIMIT 200
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
        address: order.customer_address || "N/A",
        object: objectPayload("users", order.customer_db_id)
      };
    }

    if (!orderMap.has(order.order_id)) {
      const paymentStatus = order.payment_status || "pending";
      const isPaid = ["paid", "captured", "success", "settled"].includes(String(paymentStatus).toLowerCase())
        || String(order.status).toLowerCase() === "paid";
      const totalRupees = Math.round(order.total_paise / 100);
      orderMap.set(order.order_id, {
        orderId: order.order_id,
        status: order.status,
        amount: totalRupees,
        breakdown: {
          subtotal: Math.round((order.subtotal_paise || 0) / 100),
          gst: Math.round((order.gst_paise || 0) / 100),
          discount: Math.round((order.discount_paise || 0) / 100),
          delivery: Math.round((order.delivery_paise || 0) / 100),
          total: totalRupees,
          amountPaid: isPaid ? totalRupees : 0,
          amountRemaining: isPaid ? 0 : totalRupees
        },
        createdAt: order.created_at,
        orderType: order.order_type,
        gateway: order.gateway || "razorpay",
        paymentStatus,
        paymentMethod: order.method || "upi",
        invoiceNo: order.invoice_no || "N/A",
        transactionId: order.transaction_id || "",
        paymentId: order.payment_id || "",
        object: objectPayload("orders", order.order_db_id),
        paymentObject: objectPayload("payments", order.payment_db_id),
        invoiceObject: objectPayload("invoices", order.invoice_db_id),
        workflow: workflowEngine.getPublicWorkflowForOrder(order.order_db_id),
        documents: documentService.listOrderDocuments(order.order_db_id),
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
      SELECT o.order_id AS public_order_id, oi.id AS item_db_id, oi.item_type, oi.item_slug, oi.item_name, oi.quantity, oi.unit_price_paise, oi.total_paise
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
          total: Math.round(item.total_paise / 100),
          object: objectPayload("order_items", item.item_db_id)
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

  return customerService.attachGenomeToDashboard(
    { customer: customerProfile, orders: Array.from(orderMap.values()) },
    cleanPhone
  );
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
