"use strict";

const DEFAULT_ADMIN_API_TOKEN = "bisenasif0001_Graphix@123";
const DEFAULT_ADMIN_USER_ID = "bisenasif0001";
const DEVELOPMENT_ADMIN_SIGNING_SECRET = "dev-jwt-secret";
const DEVELOPMENT_DOCUMENT_SIGNING_SECRET = "default-secret";

const DEFAULT_ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_ADMIN_CHANGE_TOKEN_TTL_MS = 5 * 60 * 1000;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function boolFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return !["0", "false", "no", "off"].includes(String(raw).trim().toLowerCase());
}

function boundedNumberFromEnv(name, fallback, min, max) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function isDefaultAdminApiToken(token) {
  return String(token || "") === DEFAULT_ADMIN_API_TOKEN;
}

function validateSecurityEnvironment(config) {
  const warnings = [];
  const production = isProduction();

  if (!process.env.ADMIN_API_TOKEN) {
    if (production) {
      throw new Error("CRITICAL: ADMIN_API_TOKEN environment variable must be set in production mode!");
    }
    warnings.push("ADMIN_API_TOKEN not set - legacy development fallback is active");
  } else if (isDefaultAdminApiToken(process.env.ADMIN_API_TOKEN) && production) {
    throw new Error("CRITICAL: Default ADMIN_API_TOKEN must not be used in production mode!");
  }

  if (!process.env.JWT_SECRET) {
    if (production) {
      throw new Error("CRITICAL: JWT_SECRET environment variable must be set in production mode!");
    }
    warnings.push("JWT_SECRET not set - development signing fallback is active");
  }

  if (!process.env.ADMIN_PASSWORD) {
    warnings.push("ADMIN_PASSWORD not set - admin password login will not succeed until configured");
  }

  if (config && isDefaultAdminApiToken(config.adminApiToken) && !production) {
    warnings.push("Default ADMIN_API_TOKEN is active for local development only");
  }

  return warnings;
}

function getSigningSecret(config, purpose = "admin-session") {
  if (config && config.jwtSecret) return config.jwtSecret;
  if (isProduction()) {
    throw new Error(`CRITICAL: JWT_SECRET is required for ${purpose} signing in production mode.`);
  }
  return purpose === "customer-document"
    ? DEVELOPMENT_DOCUMENT_SIGNING_SECRET
    : DEVELOPMENT_ADMIN_SIGNING_SECRET;
}

function getAdminSessionTtlMs() {
  return boundedNumberFromEnv("ADMIN_SESSION_TTL_HOURS", 8, 1, 24 * 30) * 60 * 60 * 1000;
}

function getAdminChangeTokenTtlMs() {
  return boundedNumberFromEnv("ADMIN_CHANGE_TOKEN_TTL_MINUTES", 5, 1, 60) * 60 * 1000;
}

function isLegacyAdminTokenAllowed() {
  return boolFromEnv("OPDS_ALLOW_LEGACY_ADMIN_TOKEN", true);
}

function isSecurityAuditConsoleEnabled() {
  return boolFromEnv("OPDS_SECURITY_AUDIT_CONSOLE", false);
}

function getCustomerOtpHashSalt(config) {
  return (config && config.adminApiToken) || DEFAULT_ADMIN_API_TOKEN;
}

module.exports = {
  DEFAULT_ADMIN_API_TOKEN,
  DEFAULT_ADMIN_USER_ID,
  DEFAULT_ADMIN_SESSION_TTL_MS,
  DEFAULT_ADMIN_CHANGE_TOKEN_TTL_MS,
  validateSecurityEnvironment,
  getSigningSecret,
  getAdminSessionTtlMs,
  getAdminChangeTokenTtlMs,
  getCustomerOtpHashSalt,
  isDefaultAdminApiToken,
  isLegacyAdminTokenAllowed,
  isSecurityAuditConsoleEnabled
};
