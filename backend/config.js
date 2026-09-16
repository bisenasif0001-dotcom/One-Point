"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DEFAULT_ADMIN_API_TOKEN } = require("./security/security-policy");

const rootDir = path.join(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) process.env[key] = value;
  }
}

loadLocalEnv();

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 4173}`).replace(/\/$/, "");

const rawAllowedHosts = process.env.ALLOWED_HOSTS || "";
const allowedHosts = rawAllowedHosts
  ? rawAllowedHosts.split(",").map(h => h.trim().toLowerCase()).filter(Boolean)
  : [];

const config = {
  rootDir,
  port: Number(process.env.PORT || 4173),
  siteUrl,
  allowedHosts,
  databaseUrl: process.env.DATABASE_URL || path.join(rootDir, "backend", "data", "opds-payments.sqlite"),
  jwtSecret: process.env.JWT_SECRET || "",
  adminApiToken: process.env.ADMIN_API_TOKEN || DEFAULT_ADMIN_API_TOKEN,
  security: {
    allowLegacyAdminToken: process.env.OPDS_ALLOW_LEGACY_ADMIN_TOKEN !== "false"
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "",
    baseUrl: process.env.RAZORPAY_BASE_URL || "https://api.razorpay.com/v1"
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${siteUrl}/api/auth/google/callback`
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    tenant: process.env.MICROSOFT_TENANT_ID || "common",
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${siteUrl}/api/auth/microsoft/callback`
  },
  phonepe: {
    merchantId: process.env.PHONEPE_MERCHANT_ID || "",
    saltKey: process.env.PHONEPE_SALT_KEY || "",
    saltIndex: process.env.PHONEPE_SALT_INDEX || "1",
    baseUrl: process.env.PHONEPE_BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox",
    pathPrefix: process.env.PHONEPE_PATH_PREFIX || "/pg/v1"
  },
  notifications: {
    emailWebhookUrl: process.env.EMAIL_NOTIFICATION_WEBHOOK_URL || "",
    smsWebhookUrl: process.env.SMS_NOTIFICATION_WEBHOOK_URL || "",
    whatsappWebhookUrl: process.env.WHATSAPP_NOTIFICATION_WEBHOOK_URL || ""
  },
  business: {
    name: "One Point Digital Services",
    email: "support@bisenonepoint.com",
    phone: "+91 9473946181",
    address: "One Point Digital Services Center",
    websiteUrl: siteUrl,
    gstNumber: process.env.BUSINESS_GST_NUMBER || "",
    kycRequired: [
      "Aadhaar",
      "PAN",
      "MSME/Udyam",
      "GST (optional until available)",
      "Bank account details",
      "Business address",
      "Website URL",
      "Email",
      "Phone number"
    ]
  }
};

function isGatewayConfigured(gateway) {
  if (gateway === "razorpay") return Boolean(config.razorpay.keyId && config.razorpay.keySecret);
  if (gateway === "phonepe") return Boolean(config.phonepe.merchantId && config.phonepe.saltKey && config.phonepe.saltIndex);
  return false;
}

function paymentReturnUrl(pathname, params = {}) {
  const url = new URL(pathname, `${config.siteUrl}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

module.exports = {
  config,
  isGatewayConfigured,
  paymentReturnUrl
};
