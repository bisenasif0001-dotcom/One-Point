"use strict";

const db = require("./db");
const { config } = require("./config");
const { safeString } = require("./utils");
const communicationService = require("./communication-service");
const enterpriseEventService = require("./events/enterprise-event-service");

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
  const governed = communicationService.insertGovernedNotification({
    event,
    channel,
    recipient,
    payload,
    status
  });
  db.registerUniversalObjectForSource("notifications", governed.notificationId);
  return governed;
}

async function dispatchNotification({ id, channel, payload }) {
  const url = config.notifications[channelWebhook[channel]];
  if (!url) return;
  communicationService.updateNotificationLifecycle(id, "Sending");
  const notificationObject = db.getUniversalObjectPayload("notifications", id);
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
    communicationService.updateNotificationLifecycle(id, response.ok ? "Sent" : "Failed");
    enterpriseEventService.publishEvent({
      eventKey: response.ok ? "notification.dispatched" : "notification.failed",
      publisherKey: "notification_service_publisher",
      linkedObjectType: "Notification",
      linkedObjectUuid: notificationObject?.universalUuid || null,
      sourceTable: "notifications",
      sourcePk: id,
      correlationId: notificationObject?.universalUuid || `notification:${id}`,
      processContextKey: "notification_dispatch_context",
      payload: {
        channel,
        responseStatus: response.status,
        lifecycleStatus: response.ok ? "Sent" : "Failed"
      },
      actorType: "system",
      actorId: "notification-service"
    });
  } catch (error) {
    db.run(
      "UPDATE notifications SET status = 'failed', provider_response_json = ? WHERE id = ?",
      [JSON.stringify({ error: error.message }), id]
    );
    communicationService.updateNotificationLifecycle(id, "Failed");
    enterpriseEventService.publishEvent({
      eventKey: "notification.failed",
      publisherKey: "notification_service_publisher",
      linkedObjectType: "Notification",
      linkedObjectUuid: notificationObject?.universalUuid || null,
      sourceTable: "notifications",
      sourcePk: id,
      correlationId: notificationObject?.universalUuid || `notification:${id}`,
      processContextKey: "notification_dispatch_context",
      payload: {
        channel,
        error: error.message
      },
      actorType: "system",
      actorId: "notification-service"
    });
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
      email: customer.email,
      object: customer.id ? db.getUniversalObjectPayload("users", customer.id) : null
    },
    order: {
      orderId: order.order_id,
      status: order.status,
      totalPaise: order.total_paise,
      currency: order.currency,
      object: order.id ? db.getUniversalObjectPayload("orders", order.id) : null
    },
    payment: payment ? {
      paymentId: payment.payment_id,
      gateway: payment.gateway,
      method: payment.method,
      status: payment.status,
      object: payment.id ? db.getUniversalObjectPayload("payments", payment.id) : null
    } : null,
    invoice: invoice ? {
      invoiceNo: invoice.invoice_no,
      object: invoice.id ? db.getUniversalObjectPayload("invoices", invoice.id) : null
    } : null,
    refund: refund ? {
      refundId: refund.refund_id,
      amountPaise: refund.amount_paise,
      status: refund.status,
      object: refund.id ? db.getUniversalObjectPayload("refunds", refund.id) : null
    } : null
  };

  for (const item of recipientsFor(customer)) {
    const hasProvider = Boolean(config.notifications[channelWebhook[item.channel]]);
    const governed = insertNotification({
      event: cleanEvent,
      channel: item.channel,
      recipient: item.recipient,
      payload,
      status: hasProvider ? "queued" : "logged"
    });
    const notificationObject = db.getUniversalObjectPayload("notifications", governed.notificationId);
    enterpriseEventService.publishEvent({
      eventKey: "notification.logged",
      publisherKey: "notification_service_publisher",
      linkedObjectType: "Notification",
      linkedObjectUuid: notificationObject?.universalUuid || null,
      sourceTable: "notifications",
      sourcePk: governed.notificationId,
      correlationId: notificationObject?.universalUuid || `notification:${governed.notificationId}`,
      processContextKey: "notification_dispatch_context",
      payload: {
        event: cleanEvent,
        channel: item.channel,
        recipient: item.recipient,
        conversationUuid: governed.conversationUuid,
        messageUuid: governed.messageUuid,
        deliveryState: hasProvider ? "queued" : "logged"
      },
      actorType: "system",
      actorId: "notification-service"
    });
    if (hasProvider) {
      dispatchNotification({
        id: governed.notificationId,
        channel: item.channel,
        payload: { ...payload, channel: item.channel, recipient: item.recipient }
      });
    }
  }
}

module.exports = {
  notifyEvent
};
