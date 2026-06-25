"use strict";

const db = require("./db");
const { config } = require("./config");
const { safeString } = require("./utils");

const channelWebhook = {
  email: "emailWebhookUrl",
  sms: "smsWebhookUrl",
  whatsapp: "whatsappWebhookUrl"
};

function recipientsFor(customer = {}) {
  const recipients = [];
  const email = safeString(customer.email, 180);
  const phone = safeString(customer.phone, 30);
  if (email) recipients.push({ channel: "email", recipient: email });
  if (phone) {
    recipients.push({ channel: "sms", recipient: phone });
    recipients.push({ channel: "whatsapp", recipient: phone });
  }
  return recipients;
}

function insertNotification({ event, channel, recipient, payload, status }) {
  const result = db.run(
    `INSERT INTO notifications (event, channel, recipient, status, payload_json)
     VALUES (?, ?, ?, ?, ?)`,
    [event, channel, recipient, status, JSON.stringify(payload)]
  );
  return Number(result.lastInsertRowid);
}

async function dispatchNotification({ id, channel, payload }) {
  const url = config.notifications[channelWebhook[channel]];
  if (!url) return;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const responseText = await response.text();
    db.run(
      "UPDATE notifications SET status = ?, provider_response_json = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?",
      [response.ok ? "sent" : "failed", JSON.stringify({ status: response.status, body: responseText.slice(0, 1000) }), id]
    );
  } catch (error) {
    db.run(
      "UPDATE notifications SET status = 'failed', provider_response_json = ? WHERE id = ?",
      [JSON.stringify({ error: error.message }), id]
    );
  }
}

function notifyEvent(event, { customer = {}, order = {}, payment = null, invoice = null, refund = null, message = "" } = {}) {
  const cleanEvent = safeString(event, 80);
  const payload = {
    event: cleanEvent,
    business: config.business.name,
    message: safeString(message, 500),
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email
    },
    order: {
      orderId: order.order_id,
      status: order.status,
      totalPaise: order.total_paise,
      currency: order.currency
    },
    payment: payment ? {
      paymentId: payment.payment_id,
      gateway: payment.gateway,
      method: payment.method,
      status: payment.status
    } : null,
    invoice: invoice ? {
      invoiceNo: invoice.invoice_no
    } : null,
    refund: refund ? {
      refundId: refund.refund_id,
      amountPaise: refund.amount_paise,
      status: refund.status
    } : null
  };

  for (const item of recipientsFor(customer)) {
    const hasProvider = Boolean(config.notifications[channelWebhook[item.channel]]);
    const id = insertNotification({
      event: cleanEvent,
      channel: item.channel,
      recipient: item.recipient,
      payload,
      status: hasProvider ? "queued" : "logged"
    });
    if (hasProvider) dispatchNotification({ id, channel: item.channel, payload: { ...payload, channel: item.channel, recipient: item.recipient } });
  }
}

module.exports = {
  notifyEvent
};
