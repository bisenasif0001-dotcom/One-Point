"use strict";

const crypto = require("node:crypto");

const paymentMethods = [
  { id: "upi", label: "UPI" },
  { id: "debit_card", label: "Debit Card" },
  { id: "credit_card", label: "Credit Card" },
  { id: "net_banking", label: "Net Banking" },
  { id: "wallet", label: "Wallet" },
  { id: "qr", label: "QR Payment" }
];

function sanitizeData(val) {
  if (val === null || val === undefined) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeData);
  }
  if (typeof val === "object") {
    const cleaned = {};
    for (const [key, value] of Object.entries(val)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey === "thought" ||
        lowerKey === "reasoning" ||
        lowerKey === "plan" ||
        lowerKey === "tool_call" ||
        lowerKey === "debug" ||
        lowerKey === "trace"
      ) {
        continue;
      }
      if (lowerKey === "action") {
        if (typeof value === "string") {
          if (/^[a-zA-Z0-9_\-]+$/.test(value)) {
            cleaned[key] = value;
          }
          continue;
        }
        continue;
      }
      cleaned[key] = sanitizeData(value);
    }
    return cleaned;
  }
  if (typeof val === "string") {
    let s = val;
    s = s.replace(/d:[\\/]csc banner_folder[\\/]130626/gi, "[PROJECT_ROOT]");
    s = s.replace(/c:[\\/]users[\\/]advar/gi, "[USER_HOME]");
    s = s.replace(/let's\s+(do|call|run|check)/gi, "[REDACTED]");
    s = s.replace(/view_file/gi, "[REDACTED]");
    s = s.replace(/inspect\s+code/gi, "[REDACTED]");
    s = s.replace(/targetfile/gi, "[REDACTED]");
    return s;
  }
  return val;
}

function jsonResponse(res, statusCode, body, headers = {}) {
  const sanitizedBody = sanitizeData(body);
  const payload = JSON.stringify(sanitizedBody);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(payload);
}

function notFound(res) {
  jsonResponse(res, 404, { error: "not_found", message: "Route not found." });
}

function badRequest(res, message, details = null) {
  jsonResponse(res, 400, { error: "bad_request", message, details });
}

function serverError(res, error) {
  // Always log full details server-side for debugging
  console.error("[SERVER ERROR]", error instanceof Error ? error.stack : error);
  // Never expose internal details (stack traces, file paths, DB errors) to clients
  const isProduction = process.env.NODE_ENV === "production";
  const message = isProduction
    ? "An internal error occurred. Please try again or contact support."
    : (error && error.message ? error.message : "Something went wrong.");
  jsonResponse(res, 500, { error: "server_error", message });
}

function parseJsonBody(req, { limit = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      // Concatenate raw bytes first, then decode once as UTF-8 so multi-byte
      // characters (Hindi text, emoji, arrows) split across TCP chunks survive intact.
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({ raw: "", body: {} });
      try {
        resolve({ raw, body: JSON.parse(raw) });
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function parseRawBody(req, { limit = 2 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeString(value, max = 255) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
}

function safePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 15);
}

function toPaise(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromPaise(value) {
  return Number(value || 0) / 100;
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function hmacSha256Hex(message, secret) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function sha256Hex(message) {
  return crypto.createHash("sha256").update(message).digest("hex");
}

function timingSafeEqualString(a, b) {
  if (!a || !b) return false;
  const first = Buffer.from(String(a));
  const second = Buffer.from(String(b));
  if (first.length !== second.length) return false;
  return crypto.timingSafeEqual(first, second);
}

function publicOrder(row) {
  if (!row) return null;
  return {
    orderId: row.order_id,
    status: row.status,
    orderType: row.order_type,
    subtotal: fromPaise(row.subtotal_paise),
    gst: fromPaise(row.gst_paise),
    discount: fromPaise(row.discount_paise),
    delivery: fromPaise(row.delivery_paise),
    total: fromPaise(row.total_paise),
    currency: row.currency,
    createdAt: row.created_at
  };
}

module.exports = {
  paymentMethods,
  jsonResponse,
  notFound,
  badRequest,
  serverError,
  parseJsonBody,
  parseRawBody,
  safeString,
  safePhone,
  toPaise,
  fromPaise,
  randomId,
  hmacSha256Hex,
  sha256Hex,
  timingSafeEqualString,
  publicOrder,
  sanitizeData
};
