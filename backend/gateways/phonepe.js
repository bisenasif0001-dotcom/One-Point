"use strict";

const { config, isGatewayConfigured, paymentReturnUrl } = require("../config");
const { sha256Hex, timingSafeEqualString } = require("../utils");

function xVerify(payloadOrPath, apiPath = "") {
  const source = apiPath ? `${payloadOrPath}${apiPath}${config.phonepe.saltKey}` : `${payloadOrPath}${config.phonepe.saltKey}`;
  return `${sha256Hex(source)}###${config.phonepe.saltIndex}`;
}

function phonePePath(pathname) {
  return `${config.phonepe.pathPrefix}${pathname}`;
}

async function createSession({ order, payment, customer }) {
  if (!isGatewayConfigured("phonepe")) {
    throw new Error("PhonePe credentials are not configured.");
  }

  const merchantTransactionId = payment.payment_id;
  const redirectUrl = paymentReturnUrl("payment-pending.html", {
    order_id: order.order_id,
    payment_id: payment.payment_id,
    gateway: "phonepe"
  });
  const callbackUrl = `${config.siteUrl}/api/webhooks/phonepe`;
  const payload = {
    merchantId: config.phonepe.merchantId,
    merchantTransactionId,
    merchantUserId: `OPDS_USER_${order.user_id}`,
    amount: payment.amount_paise,
    redirectUrl,
    redirectMode: "REDIRECT",
    callbackUrl,
    mobileNumber: customer.phone,
    paymentInstrument: {
      type: "PAY_PAGE"
    }
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const apiPath = phonePePath("/pay");

  const response = await fetch(`${config.phonepe.baseUrl}${apiPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": xVerify(base64Payload, apiPath),
      "X-MERCHANT-ID": config.phonepe.merchantId
    },
    body: JSON.stringify({ request: base64Payload })
  });

  const data = await response.json().catch(() => ({}));
  const redirect = data?.data?.instrumentResponse?.redirectInfo?.url;
  if (!response.ok || !redirect) {
    throw new Error(data.message || "PhonePe payment session creation failed.");
  }

  return {
    gateway: "phonepe",
    type: "redirect",
    gatewayOrderId: merchantTransactionId,
    session: {
      merchantTransactionId,
      redirectUrl: redirect,
      response: data
    }
  };
}

async function fetchStatus(merchantTransactionId) {
  if (!isGatewayConfigured("phonepe")) throw new Error("PhonePe credentials are not configured.");
  const apiPath = phonePePath(`/status/${config.phonepe.merchantId}/${merchantTransactionId}`);
  const response = await fetch(`${config.phonepe.baseUrl}${apiPath}`, {
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": xVerify(apiPath),
      "X-MERCHANT-ID": config.phonepe.merchantId
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "PhonePe status check failed.");
  return data;
}

function verifyWebhookSignature(rawBody, signature) {
  if (!signature || !config.phonepe.saltKey) return false;
  let expected = xVerify(rawBody);
  if (timingSafeEqualString(expected, signature)) return true;

  try {
    const body = JSON.parse(rawBody);
    if (body.response) {
      expected = xVerify(body.response);
      return timingSafeEqualString(expected, signature);
    }
  } catch {
    return false;
  }
  return false;
}

async function refund({ payment, amountPaise, refundId }) {
  if (!isGatewayConfigured("phonepe")) throw new Error("PhonePe credentials are not configured.");
  const merchantTransactionId = payment.payment_id;
  const payload = {
    merchantId: config.phonepe.merchantId,
    merchantUserId: `OPDS_REFUND_${payment.id}`,
    originalTransactionId: merchantTransactionId,
    merchantTransactionId: refundId,
    amount: amountPaise,
    callbackUrl: `${config.siteUrl}/api/webhooks/phonepe`
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const apiPath = phonePePath("/refund");
  const response = await fetch(`${config.phonepe.baseUrl}${apiPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": xVerify(base64Payload, apiPath),
      "X-MERCHANT-ID": config.phonepe.merchantId
    },
    body: JSON.stringify({ request: base64Payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "PhonePe refund failed.");
  return data;
}

module.exports = {
  createSession,
  fetchStatus,
  verifyWebhookSignature,
  refund
};
