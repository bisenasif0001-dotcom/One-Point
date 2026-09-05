"use strict";

const crypto = require("node:crypto");
const { isSecurityAuditConsoleEnabled } = require("../security/security-policy");

const MAX_SECURITY_EVENTS = 200;
const securityEvents = [];

function requestContext(req) {
  if (!req) return {};
  const url = String(req.url || "");
  return {
    method: req.method || "",
    path: url.split("?")[0] || "",
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "local",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 160)
  };
}

function cleanDetails(details = {}) {
  const blocked = new Set(["token", "password", "secret", "signature", "authorization", "cookie", "headers", "body"]);
  return Object.fromEntries(
    Object.entries(details).filter(([key]) => !blocked.has(String(key).toLowerCase()))
  );
}

function recordSecurityEvent(type, details = {}) {
  const event = {
    id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
    type,
    severity: details.severity || "info",
    timestamp: new Date().toISOString(),
    ...cleanDetails(details)
  };

  securityEvents.unshift(event);
  if (securityEvents.length > MAX_SECURITY_EVENTS) securityEvents.pop();

  if (isSecurityAuditConsoleEnabled()) {
    console.warn(`[security-audit] ${event.type}`, JSON.stringify(event));
  }

  return event;
}

function getRecentSecurityEvents(limit = 50) {
  return securityEvents.slice(0, Math.max(0, Math.min(Number(limit) || 50, MAX_SECURITY_EVENTS)));
}

module.exports = {
  recordSecurityEvent,
  requestContext,
  getRecentSecurityEvents
};
