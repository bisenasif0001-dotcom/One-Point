"use strict";

const { config, isGatewayConfigured, paymentReturnUrl } = require("../config");
const { hmacSha256Hex, timingSafeEqualString } = require("../utils");

function authHeader() {
  return `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64")}`;
}

async function createSession({ order, payment, customer }) {
  if (!isGatewayConfigured("razorpay")) {
    throw new Error("Razorpay credentials are not configured.");
  }

  const response = await fetch(`${config.razorpay.baseUrl}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: payment.amount_paise,
      currency: payment.currency || "INR",
      receipt: order.order_id,
      payment_capture: 1,
      notes: {
        opds_order_id: order.order_id,
        opds_payment_id: payment.payment_id,
        customer_phone: customer.phone
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.description || data.message || "Razorpay order creation failed.";
    if (/authentication failed/i.test(message)) {
      throw new Error("Razorpay gateway authentication failed. Verify the test key ID and key secret.");
    }
    throw new Error(message);
  }

  return {
    gateway: "razorpay",
    type: "razorpay_checkout",
    gatewayOrderId: data.id,
    session: {
      key: config.razorpay.keyId,
      amount: data.amount,
      currency: data.currency,
      name: config.business.name,
      description: `Payment for ${order.order_id}`,
      order_id: data.id,
      prefill: {
        name: customer.name,
        email: customer.email || "",
        contact: customer.phone
      },
      notes: data.notes || {},
      callback_url: paymentReturnUrl("payment-pending.html", { order_id: order.order_id, gateway: "razorpay" })
    }
  };
}

function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const expected = hmacSha256Hex(`${razorpayOrderId}|${razorpayPaymentId}`, config.razorpay.keySecret);
  return timingSafeEqualString(expected, razorpaySignature);
}

function verifyWebhookSignature(rawBody, signature) {
  if (!config.razorpay.webhookSecret) return false;
  const expected = hmacSha256Hex(rawBody, config.razorpay.webhookSecret);
  return timingSafeEqualString(expected, signature);
}

async function refund({ payment, amountPaise, notes = {} }) {
  if (!isGatewayConfigured("razorpay")) throw new Error("Razorpay credentials are not configured.");
  if (!payment.gateway_payment_id) throw new Error("Missing Razorpay payment id.");

  const response = await fetch(`${config.razorpay.baseUrl}/payments/${payment.gateway_payment_id}/refund`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: amountPaise,
      speed: "normal",
      notes
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.description || data.message || "Razorpay refund failed.");
  }
  return data;
}

module.exports = {
  createSession,
  verifyPaymentSignature,
  verifyWebhookSignature,
  refund
};
