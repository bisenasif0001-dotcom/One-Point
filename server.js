"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { config } = require("./backend/config");

// ── Startup validation ─────────────────────────────────────────────────────
(function validateEnv() {
  const warnings = [];
  const isProduction = process.env.NODE_ENV === "production";
  if (!process.env.ADMIN_API_TOKEN) {
    if (isProduction) {
      throw new Error("CRITICAL: ADMIN_API_TOKEN environment variable must be set in production mode!");
    }
    warnings.push("ADMIN_API_TOKEN not set — using insecure default");
  } else if (process.env.ADMIN_API_TOKEN === "bisenasif0001_Graphix@123" && isProduction) {
    throw new Error("CRITICAL: Default ADMIN_API_TOKEN must not be used in production mode!");
  }
  if (!process.env.RAZORPAY_KEY_ID)         warnings.push("RAZORPAY_KEY_ID not set — payments will fail");
  if (!process.env.RAZORPAY_KEY_SECRET)     warnings.push("RAZORPAY_KEY_SECRET not set — payments will fail");
  if (!process.env.JWT_SECRET) {
    if (isProduction) {
      throw new Error("CRITICAL: JWT_SECRET environment variable must be set in production mode!");
    }
    warnings.push("JWT_SECRET not set — sessions less secure");
  }
  if (warnings.length > 0) {
    console.warn("\n⚠️  CONFIGURATION WARNINGS:");
    warnings.forEach(w => console.warn("   •", w));
    console.warn("   → Create a .env file (see .env.example)\n");
  }
})();
const db = require("./backend/db");
const catalog = require("./backend/catalog-service");
const payments = require("./backend/payment-service");
const auth = require("./backend/auth-service");
const razorpay = require("./backend/gateways/razorpay");
const phonepe = require("./backend/gateways/phonepe");
const botChecker = require("./backend/bot-checker");
const assignment = require("./backend/assignment-engine");
const {
  jsonResponse,
  notFound,
  badRequest,
  serverError,
  parseJsonBody,
  parseRawBody,
  timingSafeEqualString
} = require("./backend/utils");

const root = __dirname;
const port = config.port;
const dashboardRoot = path.join(root, "Dashboard", "web");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2"
};

const rateBuckets = new Map();

// ── File-upload security constants ─────────────────────────────────────────
const ALLOWED_UPLOAD_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".pdf", ".webp"]);
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".js", ".mjs", ".cjs", ".ts", ".php", ".php3", ".php4", ".php5",
  ".phtml", ".asp", ".aspx", ".jsp", ".jspx", ".bat", ".cmd", ".sh", ".bash",
  ".ps1", ".psm1", ".py", ".rb", ".pl", ".html", ".htm", ".svg", ".xml",
  ".swf", ".htaccess", ".htpasswd", ".env"
]);
const MAX_FILENAME_LENGTH = 200;

function securityHeaders(req) {
  const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || "localhost"}`;
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://unpkg.com https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.razorpay.com https://api-preprod.phonepe.com https://api.phonepe.com",
      "frame-src https://api.razorpay.com https://checkout.razorpay.com https://api-preprod.phonepe.com https://api.phonepe.com https://www.google.com https://maps.google.com",
      `form-action 'self' ${origin} https://api-preprod.phonepe.com https://api.phonepe.com`
    ].join("; ")
  };
}

function writeWithSecurity(req, res, status, headers = {}) {
  res.writeHead(status, { ...securityHeaders(req), ...headers });
}

function publicTrackingHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Vary": "Origin"
  };
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolvePath(url) {
  const requested = decodeURIComponent(url.split("?")[0]);
  const clean = requested === "/" ? "/index.html" : requested;
  const filePath = path.normalize(path.join(root, clean));
  if (!isInside(root, filePath)) return null;
  return filePath;
}

function rateLimit(req, res) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = req.url.startsWith("/api/webhooks") ? 300 : 90;
  const bucket = rateBuckets.get(ip) || { count: 0, reset: now + windowMs };
  if (bucket.reset < now) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  if (bucket.count > limit) {
    jsonResponse(res, 429, { error: "rate_limited", message: "Too many requests. Please retry shortly." });
    return false;
  }
  return true;
}

function getCookie(req, name) {
  const cookie = req.headers.cookie || "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.split("=").slice(1).join("=") || "";
}

function getSessionUser(req) {
  const token = req.headers["x-session-token"] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || "";
  if (!token) return null;
  try {
    const session = auth.me(token);
    return session ? session.user : null;
  } catch (err) {
    return null;
  }
}

function isAdmin(req) {
  const token = req.headers["x-admin-token"] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return Boolean(config.adminApiToken && token === config.adminApiToken);
}

function issueCsrf(req, res) {
  const token = crypto.randomBytes(24).toString("hex");
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https") || process.env.NODE_ENV === "production" ? "; Secure" : "";
  jsonResponse(res, 200, { csrfToken: token }, {
    "Set-Cookie": `opds_csrf=${token}; Path=/; SameSite=Lax; Max-Age=7200${secure}`
  });
}

function requireCsrf(req, res) {
  if (req.method === "GET" || req.url.startsWith("/api/webhooks")) return true;
  const cookieToken = getCookie(req, "opds_csrf");
  const headerToken = req.headers["x-csrf-token"];
  if (!cookieToken || !headerToken || !timingSafeEqualString(cookieToken, headerToken)) {
    jsonResponse(res, 403, { error: "csrf_failed", message: "CSRF token missing or invalid." });
    return false;
  }
  return true;
}

function requireHttps(req, res) {
  const isLocal = (req.headers.host || "").startsWith("localhost") || (req.headers.host || "").startsWith("127.0.0.1");
  const proto = req.headers["x-forwarded-proto"] || "http";
  if (process.env.NODE_ENV === "production" && proto !== "https" && !isLocal) {
    jsonResponse(res, 403, { error: "https_required", message: "HTTPS is required for payment routes." });
    return false;
  }
  return true;
}

function requireAdmin(req, res) {
  const token = req.headers["x-admin-token"] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!config.adminApiToken || token !== config.adminApiToken) {
    jsonResponse(res, 401, { error: "admin_auth_required", message: "Valid admin token required." });
    return false;
  }
  return true;
}

async function handleApi(req, res) {
  if (!rateLimit(req, res) || !requireHttps(req, res) || !requireCsrf(req, res)) return;
  const url = new URL(req.url, config.siteUrl);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      jsonResponse(res, 200, { ok: true, business: config.business.name, time: new Date().toISOString() });
      return;
    }

    if (req.method === "GET" && pathname === "/api/csrf") {
      issueCsrf(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/payment-methods") {
      jsonResponse(res, 200, { title: "Choose Payment Method", methods: payments.paymentMethods });
      return;
    }

    if (req.method === "GET" && pathname === "/api/kyc-requirements") {
      jsonResponse(res, 200, {
        businessName: config.business.name,
        requiredKyc: config.business.kycRequired
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/products") {
      jsonResponse(res, 200, catalog.listCatalog());
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/signup") {
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 201, auth.signup(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.login(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/otp/request") {
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 201, auth.issueOtp(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/otp/verify") {
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.verifyOtp(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/gmail/start") {
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 201, auth.gmailStart(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/admin/change-credentials") {
      const { body } = await parseJsonBody(req);
      const currentUserId = String(body.current_user_id || "");
      const currentPassword = String(body.current_password || "");
      const newUserId = String(body.new_user_id || "").trim();
      const newPassword = String(body.new_password || "");
      const confirmPassword = String(body.confirm_password || "");

      // Verify current credentials
      const expectedUserId = process.env.ADMIN_USER_ID || "bisenasif0001";
      const expectedPassword = process.env.ADMIN_PASSWORD || "";
      const validUser = currentUserId.length > 0 && timingSafeEqualString(currentUserId, expectedUserId);
      const validPass = currentPassword.length > 0 && timingSafeEqualString(currentPassword, expectedPassword);
      if (!validUser || !validPass) {
        jsonResponse(res, 401, { message: "Current User ID or Password is incorrect." });
        return;
      }

      // Strong password rules
      if (newPassword.length < 10) { jsonResponse(res, 400, { message: "New password must be at least 10 characters." }); return; }
      if (!/[A-Z]/.test(newPassword)) { jsonResponse(res, 400, { message: "Password must contain at least one capital letter (A-Z)." }); return; }
      if (!/[0-9]/.test(newPassword)) { jsonResponse(res, 400, { message: "Password must contain at least one number (0-9)." }); return; }
      if (!/[@!#_$%^&*]/.test(newPassword)) { jsonResponse(res, 400, { message: "Password must contain at least one symbol (@ ! # _ $ %)." }); return; }
      if (newPassword !== confirmPassword) { jsonResponse(res, 400, { message: "New password and confirm password do not match." }); return; }

      // Update .env file
      const envPath = path.join(root, ".env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
      function setEnvVar(content, key, value) {
        const regex = new RegExp(`^${key}=.*$`, "m");
        return regex.test(content) ? content.replace(regex, `${key}=${value}`) : `${content}\n${key}=${value}`;
      }
      const finalUserId = newUserId || expectedUserId;
      envContent = setEnvVar(envContent, "ADMIN_USER_ID", finalUserId);
      envContent = setEnvVar(envContent, "ADMIN_PASSWORD", newPassword);
      fs.writeFileSync(envPath, envContent.trimEnd() + "\n", "utf8");

      // Apply immediately (no restart needed)
      process.env.ADMIN_USER_ID = finalUserId;
      process.env.ADMIN_PASSWORD = newPassword;

      jsonResponse(res, 200, { message: "Credentials updated successfully. Changes are live immediately." });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/password/reset") {
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.resetPassword(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/admin/login") {
      const { body } = await parseJsonBody(req);
      const expectedUserId = process.env.ADMIN_USER_ID || "bisenasif0001";
      const expectedPassword = process.env.ADMIN_PASSWORD || "";
      const userId = String(body.user_id || "");
      const password = String(body.password || "");
      const validUser = userId.length > 0 && timingSafeEqualString(userId, expectedUserId);
      const validPass = password.length > 0 && timingSafeEqualString(password, expectedPassword);
      if (!validUser || !validPass) {
        jsonResponse(res, 401, { message: "Invalid admin User ID or Password." });
        return;
      }
      jsonResponse(res, 200, { token: config.adminApiToken });
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/me") {
      const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
      jsonResponse(res, 200, auth.me(token));
      return;
    }

    if (req.method === "POST" && pathname === "/api/orders") {
      const { body } = await parseJsonBody(req);
      const result = await payments.createCheckout(body);
      jsonResponse(res, 201, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/service-bookings") {
      const { body } = await parseJsonBody(req);
      const result = await payments.createCheckout({ ...body, orderType: "service", sourceChannel: "service_booking" });
      jsonResponse(res, 201, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/payments/retry") {
      const { body } = await parseJsonBody(req);
      const result = await payments.retryPayment(body.paymentId, body.gateway);
      jsonResponse(res, 201, { payment: result });
      return;
    }

    if (req.method === "POST" && pathname === "/api/payments/verify") {
      const { body } = await parseJsonBody(req);
      const result = await payments.verifyPayment(body);
      jsonResponse(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/payments/status/")) {
      const orderId = decodeURIComponent(pathname.split("/").pop());
      const result = payments.getOrderStatus(orderId);
      jsonResponse(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/applications/track/")) {
      const trackingNumber = decodeURIComponent(pathname.split("/").pop() || "");
      const result = payments.getPublicTrackingStatus(trackingNumber);
      jsonResponse(res, 200, result, publicTrackingHeaders());
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/invoices/")) {
      const invoiceNo = decodeURIComponent(pathname.split("/").pop()).replace(/\.pdf$/i, "");
      const invoicePath = payments.getInvoicePdfPath(invoiceNo);
      if (!invoicePath || !fs.existsSync(invoicePath)) {
        notFound(res);
        return;
      }
      writeWithSecurity(req, res, 200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${path.basename(invoicePath)}"`,
        "Cache-Control": "private, no-store"
      });
      fs.createReadStream(invoicePath).pipe(res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/webhooks/razorpay") {
      const raw = await parseRawBody(req);
      const signature = req.headers["x-razorpay-signature"] || "";
      const valid = razorpay.verifyWebhookSignature(raw, signature);
      let body = {};
      try { body = JSON.parse(raw); } catch { body = {}; }
      db.insertWebhookLog({ gateway: "razorpay", event: body.event, transactionId: body.payload?.payment?.entity?.id, status: valid ? "received" : "invalid_signature", signatureValid: valid, rawPayload: raw, headers: req.headers });
      if (!valid) {
        jsonResponse(res, 400, { ok: false, error: "invalid_signature" });
        return;
      }
      const result = payments.updatePaymentFromWebhook({ gateway: "razorpay", event: body.event, body });
      jsonResponse(res, 200, { ok: true, result });
      return;
    }

    if (req.method === "POST" && pathname === "/api/webhooks/phonepe") {
      const raw = await parseRawBody(req);
      const signature = req.headers["x-verify"] || "";
      const valid = phonepe.verifyWebhookSignature(raw, signature);
      let body = {};
      try { body = JSON.parse(raw); } catch { body = {}; }
      db.insertWebhookLog({ gateway: "phonepe", event: body.code || body.event, transactionId: body.data?.transactionId, status: valid ? "received" : "invalid_signature", signatureValid: valid, rawPayload: raw, headers: req.headers });
      if (!valid) {
        jsonResponse(res, 400, { ok: false, error: "invalid_signature" });
        return;
      }
      const result = payments.updatePaymentFromWebhook({ gateway: "phonepe", event: body.code || body.event, body });
      jsonResponse(res, 200, { ok: true, result });
      return;
    }

    if (pathname.startsWith("/api/admin/")) {
      if (!requireAdmin(req, res)) return;
      
      if (req.method === "GET" && pathname === "/api/admin/settings") {
        jsonResponse(res, 200, db.getSettings());
        return;
      }
      
      if (req.method === "POST" && pathname === "/api/admin/settings") {
        const { body } = await parseJsonBody(req);
        const updatedSettings = db.saveSettings(body);
        jsonResponse(res, 200, { ok: true, settings: updatedSettings });
        return;
      }

      if (req.method === "GET" && pathname === "/api/admin/catalog") {
        jsonResponse(res, 200, catalog.listCatalog({ includeInactive: true }));
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/catalog") {
        const { body } = await parseJsonBody(req);
        const item = catalog.upsertCatalogItem(body);
        jsonResponse(res, 200, { item, catalog: catalog.listCatalog({ includeInactive: true }) });
        return;
      }
      if (req.method === "DELETE" && pathname === "/api/admin/catalog") {
        const { body } = await parseJsonBody(req);
        const result = catalog.deleteCatalogItem(body);
        jsonResponse(res, 200, { ...result, catalog: catalog.listCatalog({ includeInactive: true }) });
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/refunds") {
        const { body } = await parseJsonBody(req);
        const result = await payments.requestRefund(body);
        jsonResponse(res, 201, result);
        return;
      }
      // ── Force-generate invoice PDF for any order (admin) ────────────────
      if (req.method === "GET" && pathname.startsWith("/api/admin/invoices/")) {
        const rawId = decodeURIComponent(pathname.split("/").pop().replace(/\.pdf$/i, ""));
        // Whitelist: only alphanumeric, dash, underscore (prevent path traversal)
        const orderId = /^[A-Za-z0-9\-_]+$/.test(rawId) ? rawId : null;
        if (!orderId) { badRequest(res, "Invalid order ID format."); return; }
        const order = db.get("SELECT * FROM orders WHERE order_id = ? OR id = ?", [orderId, Number(orderId) || 0]);
        if (!order) { notFound(res); return; }

        // Ensure invoice record exists (create a stub if needed for admin download)
        let invoice = db.get("SELECT * FROM invoices WHERE order_id = ?", [order.id]);
        if (!invoice) {
          const invoiceNo = `INV-${order.order_id}`;
          db.run(
            `INSERT OR IGNORE INTO invoices (invoice_no, order_id, subtotal_paise, gst_paise, discount_paise, delivery_paise, total_paise)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [invoiceNo, order.id, order.subtotal_paise, order.gst_paise, order.discount_paise, order.delivery_paise, order.total_paise]
          );
          invoice = db.get("SELECT * FROM invoices WHERE order_id = ?", [order.id]);
        }

        const { saveInvoicePdf, generateInvoicePdf } = require("./backend/invoice");
        const customer  = db.get("SELECT * FROM users WHERE id = ?", [order.user_id]);
        const items     = db.all("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
        const transaction = db.get("SELECT * FROM transactions WHERE order_id = ? ORDER BY id DESC LIMIT 1", [order.id]);

        let pdfPath = invoice.pdf_path;
        const fsLocal = require("node:fs");
        if (!pdfPath || !fsLocal.existsSync(pdfPath)) {
          pdfPath = saveInvoicePdf({ invoice, order, transaction, customer, items });
          db.run("UPDATE invoices SET pdf_path = ? WHERE id = ?", [pdfPath, invoice.id]);
        }

        writeWithSecurity(req, res, 200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Invoice-${order.order_id}.pdf"`,
          "Cache-Control": "private, no-store"
        });
        fsLocal.createReadStream(pdfPath).pipe(res);
        return;
      }

      // ── Admin: All uploaded documents ────────────────────────────────────
      if (req.method === "GET" && pathname === "/api/admin/documents") {
        const docs = db.all(
          `SELECT od.*, o.order_id, u.name AS customer_name, u.phone AS customer_phone
           FROM order_documents od
           JOIN orders o ON o.id = od.order_id
           JOIN users  u ON u.id = o.user_id
           ORDER BY od.created_at DESC LIMIT 100`,
          []
        );
        jsonResponse(res, 200, { documents: docs });
        return;
      }

      if (req.method === "PATCH" && pathname.startsWith("/api/admin/documents/")) {
        const docId  = Number(pathname.split("/").pop());
        const { body } = await parseJsonBody(req);
        if (body.verified !== undefined) {
          db.run("UPDATE order_documents SET verified=?, verified_at=CURRENT_TIMESTAMP WHERE id=?", [body.verified ? 1 : 0, docId]);
        }
        jsonResponse(res, 200, { ok: true });
        return;
      }

      // ── Admin: Support Tickets ────────────────────────────────────────────
      if (req.method === "GET" && pathname === "/api/admin/tickets") {
        const tickets = db.all(
          `SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100`,
          []
        ).catch ? [] : db.all("SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100", []);
        jsonResponse(res, 200, { tickets });
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/tickets") {
        const { body } = await parseJsonBody(req);
        try {
          db.run(
            `INSERT INTO support_tickets (ticket_id, customer_phone, customer_name, subject, message, order_id, status)
             VALUES (?, ?, ?, ?, ?, ?, 'open')`,
            [`TKT-${Date.now().toString().slice(-6)}`, body.phone || '', body.name || 'Customer', body.subject || 'Support', body.message || '', body.orderId || null]
          );
        } catch { /* table may not exist yet — that's OK */ }
        jsonResponse(res, 201, { ok: true });
        return;
      }
      if (req.method === "PATCH" && pathname.startsWith("/api/admin/tickets/")) {
        const ticketId = pathname.split("/").pop();
        const { body } = await parseJsonBody(req);
        try {
          db.run("UPDATE support_tickets SET status=?, updated_at=CURRENT_TIMESTAMP WHERE ticket_id=?", [body.status || 'open', ticketId]);
        } catch { /* ignore */ }
        jsonResponse(res, 200, { ok: true });
        return;
      }

      // ── Automation rules CRUD ─────────────────────────────────────────────
      if (req.method === "GET" && pathname === "/api/admin/automation-rules") {
        const rules = db.all("SELECT * FROM automation_rules ORDER BY id ASC", []);
        jsonResponse(res, 200, { rules: rules.map(r => ({ ...r, conditions: JSON.parse(r.conditions || "{}"), actions: JSON.parse(r.actions || "[]") })) });
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/automation-rules") {
        const { body } = await parseJsonBody(req);
        if (body.id) {
          db.run(
            "UPDATE automation_rules SET name=?, trigger=?, conditions=?, actions=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            [body.name, body.trigger, JSON.stringify(body.conditions || {}), JSON.stringify(body.actions || []), body.is_active ? 1 : 0, body.id]
          );
        } else {
          db.run(
            "INSERT INTO automation_rules (name, trigger, conditions, actions, is_active) VALUES (?, ?, ?, ?, ?)",
            [body.name || "New Rule", body.trigger || "order.created", JSON.stringify(body.conditions || {}), JSON.stringify(body.actions || []), 1]
          );
        }
        const rules = db.all("SELECT * FROM automation_rules ORDER BY id ASC", []);
        jsonResponse(res, 200, { rules });
        return;
      }
      if (req.method === "PATCH" && pathname.startsWith("/api/admin/automation-rules/")) {
        const ruleId = Number(pathname.split("/").pop());
        const { body } = await parseJsonBody(req);
        if (body.is_active !== undefined) db.run("UPDATE automation_rules SET is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [body.is_active ? 1 : 0, ruleId]);
        const rule = db.get("SELECT * FROM automation_rules WHERE id=?", [ruleId]);
        jsonResponse(res, 200, { rule });
        return;
      }

      // ── Notification logs ─────────────────────────────────────────────────
      if (req.method === "GET" && pathname === "/api/admin/notifications") {
        const limit  = Number(url.searchParams.get("limit") || 50);
        const channel = url.searchParams.get("channel") || null;
        let sql = "SELECT * FROM notifications";
        const params = [];
        if (channel) { sql += " WHERE channel = ?"; params.push(channel); }
        sql += " ORDER BY created_at DESC LIMIT ?"; params.push(limit);
        const logs = db.all(sql, params);
        jsonResponse(res, 200, { logs });
        return;
      }

      // ── Send notification manually (admin broadcast) ──────────────────────
      if (req.method === "POST" && pathname === "/api/admin/notifications/send") {
        const { body } = await parseJsonBody(req);
        const notifs = require("./backend/notifications");
        const recipientPhones = [];
        // Collect phones based on audience selection
        if (body.audience === "all" || !body.audience) {
          const users = db.all("SELECT phone FROM users LIMIT 200", []);
          users.forEach((u) => recipientPhones.push(u.phone));
        } else if (body.audience === "pending_payment") {
          const orders = db.all("SELECT DISTINCT u.phone FROM orders o JOIN users u ON u.id = o.user_id WHERE o.status IN ('created','payment_failed') LIMIT 200", []);
          orders.forEach((u) => recipientPhones.push(u.phone));
        } else if (body.phones && Array.isArray(body.phones)) {
          body.phones.forEach((p) => recipientPhones.push(p));
        }

        let sent = 0;
        for (const phone of recipientPhones) {
          notifs.notifyEvent(body.event || "broadcast", {
            customer: { phone, name: "Customer", email: "" },
            order: {},
            message: body.message || body.content || ""
          });
          sent++;
        }
        jsonResponse(res, 200, { ok: true, sent, recipients: recipientPhones.length });
        return;
      }

      if (req.method === "GET" && pathname === "/api/admin/analytics") {
        jsonResponse(res, 200, payments.getAnalytics());
        return;
      }
      if (req.method === "GET" && pathname === "/api/admin/orders") {
        jsonResponse(res, 200, payments.getAdminOrders());
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/orders/status") {
        const { body } = await parseJsonBody(req);
        const result = payments.updateOrderStatus(body);
        jsonResponse(res, 200, result);
        return;
      }
    }

    if (req.method === "GET" && pathname === "/api/customer/dashboard") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const rawPhone = String(url.searchParams.get("phone") || "").trim();
      if (!rawPhone) {
        badRequest(res, "Phone number is required.");
        return;
      }
      if (user.phone !== rawPhone) {
        jsonResponse(res, 403, { error: "forbidden", message: "Access denied: session phone does not match requested phone." });
        return;
      }
      const result = payments.getCustomerDashboard(rawPhone);
      jsonResponse(res, 200, result);
      return;
    }

    if (pathname === "/api/customer/tickets") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      if (req.method === "GET") {
        const tickets = db.all(
          `SELECT * FROM support_tickets WHERE customer_phone = ? ORDER BY created_at DESC LIMIT 100`,
          [user.phone]
        );
        jsonResponse(res, 200, { tickets });
        return;
      }
      if (req.method === "POST") {
        const { body } = await parseJsonBody(req);
        if (!body.subject || !body.message) {
          badRequest(res, "subject and message are required.");
          return;
        }
        const ticketId = `TKT-${Date.now().toString().slice(-6)}`;
        db.run(
          `INSERT INTO support_tickets (ticket_id, customer_phone, customer_name, subject, message, order_id, status)
           VALUES (?, ?, ?, ?, ?, ?, 'open')`,
          [ticketId, user.phone, user.name, body.subject, body.message, body.orderId || null]
        );
        jsonResponse(res, 201, { ok: true, ticketId });
        return;
      }
    }

    if (req.method === "GET" && pathname === "/api/customer/documents/sign") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const docId = Number(url.searchParams.get("docId") || 0);
      if (!docId) {
        badRequest(res, "docId is required.");
        return;
      }
      const doc = db.get(
        `SELECT od.*, o.user_id FROM order_documents od
         JOIN orders o ON o.id = od.order_id
         WHERE od.id = ?`,
        [docId]
      );
      if (!doc || doc.user_id !== user.id) {
        jsonResponse(res, 403, { error: "forbidden", message: "You do not have access to this document." });
        return;
      }
      const expires = Date.now() + 15 * 60 * 1000;
      const signature = crypto.createHmac("sha256", config.jwtSecret || "default-secret")
        .update(`${docId}:${expires}`)
        .digest("hex");
      const downloadUrl = `/api/customer/documents/download?docId=${docId}&expires=${expires}&signature=${signature}`;
      jsonResponse(res, 200, { downloadUrl });
      return;
    }

    if (req.method === "GET" && pathname === "/api/customer/documents/download") {
      const docId = url.searchParams.get("docId");
      const expires = Number(url.searchParams.get("expires") || 0);
      const signature = url.searchParams.get("signature") || "";
      if (!docId || !expires || !signature) {
        badRequest(res, "Missing signature parameters.");
        return;
      }
      if (Date.now() > expires) {
        jsonResponse(res, 403, { error: "expired", message: "Download link has expired." });
        return;
      }
      const expected = crypto.createHmac("sha256", config.jwtSecret || "default-secret")
        .update(`${docId}:${expires}`)
        .digest("hex");
      if (signature !== expected) {
        jsonResponse(res, 403, { error: "forbidden", message: "Invalid signature." });
        return;
      }
      const doc = db.get("SELECT * FROM order_documents WHERE id = ?", [Number(docId)]);
      if (!doc) {
        notFound(res);
        return;
      }
      if (doc.file_path && fs.existsSync(doc.file_path)) {
        writeWithSecurity(req, res, 200, {
          "Content-Type": doc.mime_type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${doc.file_name}"`,
          "Cache-Control": "private, no-store"
        });
        fs.createReadStream(doc.file_path).pipe(res);
        return;
      }
      if (doc.file_url) {
        redirect(req, res, doc.file_url);
        return;
      }
      badRequest(res, "Document file data not available.");
      return;
    }

    // ── Document Upload (customer) — 5MB max ───────────────────────────────
    if (req.method === "POST" && pathname === "/api/orders/documents") {
      const contentLength = Number(req.headers["content-length"] || 0);
      if (contentLength > 5 * 1024 * 1024) { badRequest(res, "File too large. Maximum 5MB allowed."); return; }
      const { body } = await parseJsonBody(req);
      const orderId = String(body.orderId || "").trim();
      const docType = String(body.docType || "").trim();
      const rawFileName = String(body.fileName || "").trim();
      const fileUrl = String(body.fileUrl || "").trim();
      if (!orderId || !docType || !rawFileName) {
        badRequest(res, "orderId, docType, and fileName are required.");
        return;
      }
      // ── Filename sanitisation & length check ────────────────────────────
      if (rawFileName.length > MAX_FILENAME_LENGTH) {
        badRequest(res, "File name is too long. Maximum 200 characters.");
        return;
      }
      // Strip any directory components to prevent path traversal
      const fileName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._\-() ]/g, "_");
      const fileExt = path.extname(fileName).toLowerCase();
      // Block dangerous extensions unconditionally
      if (BLOCKED_EXTENSIONS.has(fileExt)) {
        jsonResponse(res, 422, { error: "invalid_file_type", message: `File type '${fileExt}' is not permitted.` });
        return;
      }
      // Only allow explicitly approved extensions
      if (!ALLOWED_UPLOAD_EXTENSIONS.has(fileExt)) {
        jsonResponse(res, 422, { error: "invalid_file_type", message: "Only JPG, PNG, PDF and WebP documents are accepted." });
        return;
      }
      // ── Ownership check: session user must own this order ───────────────
      const sessionUser = getSessionUser(req);
      const order = db.get("SELECT id, user_id FROM orders WHERE order_id = ?", [orderId]);
      if (!order) { badRequest(res, "Order not found."); return; }
      if (sessionUser && order.user_id && order.user_id !== sessionUser.id) {
        jsonResponse(res, 403, { error: "forbidden", message: "You do not have permission to upload documents to this order." });
        return;
      }
      db.run(
        `INSERT INTO order_documents (order_id, doc_type, file_name, file_url, uploaded_by)
         VALUES (?, ?, ?, ?, 'customer')`,
        [order.id, docType, fileName, fileUrl || null]
      );
      const docs = db.all("SELECT * FROM order_documents WHERE order_id = ?", [order.id]);
      // Re-run bot check after document upload
      setImmediate(() => { botChecker.checkAndAssign(orderId).catch(() => {}); });
      jsonResponse(res, 201, { ok: true, documents: docs });
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/orders/") && pathname.endsWith("/documents")) {
      const parts = pathname.split("/");
      const orderId = decodeURIComponent(parts[3] || "");
      const order = db.get("SELECT id FROM orders WHERE order_id = ?", [orderId]);
      if (!order) { notFound(res); return; }
      const docs = db.all("SELECT * FROM order_documents WHERE order_id = ?", [order.id]);
      jsonResponse(res, 200, { documents: docs });
      return;
    }

    // ── Bot Check (manual trigger) ──────────────────────────────────────────
    if (req.method === "POST" && pathname === "/api/bot/check") {
      const { body } = await parseJsonBody(req);
      const orderId = String(body.orderId || "").trim();
      if (!orderId) { badRequest(res, "orderId is required."); return; }
      const result = await botChecker.checkAndAssign(orderId);
      jsonResponse(res, 200, result);
      return;
    }

    // ── Admin: Staff Management ─────────────────────────────────────────────
    if (pathname.startsWith("/api/admin/staff")) {
      if (!requireAdmin(req, res)) return;

      if (req.method === "GET" && pathname === "/api/admin/staff") {
        jsonResponse(res, 200, { staff: assignment.getStaffList() });
        return;
      }

      if (req.method === "POST" && pathname === "/api/admin/staff") {
        const { body } = await parseJsonBody(req);
        if (!body.name || !body.phone) { badRequest(res, "name and phone are required."); return; }
        const result = db.run(
          `INSERT INTO staff (name, phone, email, role, skills, max_tasks)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(phone) DO UPDATE SET
             name = excluded.name, email = excluded.email,
             role = excluded.role, skills = excluded.skills,
             max_tasks = excluded.max_tasks, updated_at = CURRENT_TIMESTAMP`,
          [
            body.name, body.phone, body.email || null,
            body.role || "agent",
            JSON.stringify(body.skills || []),
            body.maxTasks || 10
          ]
        );
        jsonResponse(res, 201, { staff: assignment.getStaffList() });
        return;
      }

      if (req.method === "PATCH" && pathname.startsWith("/api/admin/staff/")) {
        const staffId = Number(pathname.split("/").pop());
        const { body } = await parseJsonBody(req);
        const updates = [];
        const params = [];
        if (body.name    !== undefined) { updates.push("name = ?");     params.push(body.name); }
        if (body.phone   !== undefined) { updates.push("phone = ?");    params.push(body.phone); }
        if (body.role    !== undefined) { updates.push("role = ?");     params.push(body.role); }
        if (body.skills  !== undefined) { updates.push("skills = ?");   params.push(JSON.stringify(body.skills)); }
        if (body.maxTasks !== undefined) { updates.push("max_tasks = ?"); params.push(body.maxTasks); }
        if (body.isActive !== undefined) { updates.push("is_active = ?"); params.push(body.isActive ? 1 : 0); }
        if (updates.length) {
          updates.push("updated_at = CURRENT_TIMESTAMP");
          params.push(staffId);
          db.run(`UPDATE staff SET ${updates.join(", ")} WHERE id = ?`, params);
        }
        jsonResponse(res, 200, { staff: assignment.getStaffList() });
        return;
      }

      if (req.method === "DELETE" && pathname.startsWith("/api/admin/staff/")) {
        const staffId = Number(pathname.split("/").pop());
        db.run("UPDATE staff SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [staffId]);
        jsonResponse(res, 200, { staff: assignment.getStaffList() });
        return;
      }
    }

    // ── Admin: Assignments ──────────────────────────────────────────────────
    if (pathname.startsWith("/api/admin/assignments")) {
      if (!requireAdmin(req, res)) return;

      if (req.method === "GET" && pathname === "/api/admin/assignments") {
        const status = url.searchParams.get("status") || undefined;
        const staffId = url.searchParams.get("staffId") ? Number(url.searchParams.get("staffId")) : undefined;
        jsonResponse(res, 200, { assignments: assignment.getAssignments({ status, staffId }) });
        return;
      }

      if (req.method === "GET" && pathname === "/api/admin/assignments/queue") {
        jsonResponse(res, 200, { queue: assignment.getUnassignedQueue() });
        return;
      }

      if (req.method === "POST" && pathname === "/api/admin/assignments") {
        const { body } = await parseJsonBody(req);
        const result = assignment.manualAssign(body.orderId, body.staffId, body.notes || "", body.priority || "normal");
        jsonResponse(res, 201, result);
        return;
      }

      if (req.method === "PATCH" && pathname.startsWith("/api/admin/assignments/")) {
        const assignmentId = Number(pathname.split("/").pop());
        const { body } = await parseJsonBody(req);
        const result = assignment.updateAssignmentStatus(assignmentId, body.status, body.notes || "");
        jsonResponse(res, 200, result);
        return;
      }
    }

    notFound(res);
  } catch (error) {
    if (error.message.includes("not configured") || error.message.includes("gateway") || error.message.includes("Gateway")) {
      jsonResponse(res, 503, { error: "gateway_unavailable", message: error.message });
      return;
    }
    if (
      error.message.includes("required") ||
      error.message.includes("not found") ||
      error.message.includes("Invalid") ||
      error.message.includes("Password") ||
      error.message.includes("OTP") ||
      error.message.includes("Mobile") ||
      error.message.includes("Gmail") ||
      error.message.includes("Session") ||
      error.message.includes("active") ||
      error.message.includes("expired") ||
      error.message.includes("attempts")
    ) {
      if (pathname.startsWith("/api/applications/track/")) {
        jsonResponse(res, 400, { error: "bad_request", message: error.message, details: null }, publicTrackingHeaders());
        return;
      }
      badRequest(res, error.message);
    } else {
      serverError(res, error);
    }
  }
}

function redirect(req, res, location) {
  writeWithSecurity(req, res, 302, { Location: location });
  res.end();
}

function serveDashboard(req, res) {
  const pathname = new URL(req.url, config.siteUrl).pathname;

  if (pathname === "/dashboard") {
    redirect(req, res, "/dashboard/");
    return;
  }

  const relativeUrl = decodeURIComponent(pathname.replace(/^\/dashboard\/?/, "")) || "index.html";
  const filePath = path.normalize(path.join(dashboardRoot, relativeUrl));

  if (!isInside(dashboardRoot, filePath)) {
    writeWithSecurity(req, res, 403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    const hasExtension = Boolean(path.extname(filePath));
    const targetPath = !statError && stat.isFile() ? filePath : path.join(dashboardRoot, "index.html");

    if ((statError || !stat.isFile()) && hasExtension) {
      writeWithSecurity(req, res, 404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    fs.readFile(targetPath, (readError, data) => {
      if (readError) {
        writeWithSecurity(req, res, 404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fs.readFileSync(path.join(root, "404.html")));
        return;
      }

      const ext = path.extname(targetPath);
      writeWithSecurity(req, res, 200, { "Content-Type": types[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, config.siteUrl).pathname;

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    serveDashboard(req, res);
    return;
  }

  if (pathname === "/favicon.ico") {
    const faviconPath = path.join(root, "assets", "favicon.svg");
    fs.readFile(faviconPath, (error, data) => {
      if (error) {
        writeWithSecurity(req, res, 404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }
      writeWithSecurity(req, res, 200, { "Content-Type": "image/svg+xml; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  if (pathname === "/dashboard.html") {
    redirect(req, res, "/dashboard/?portal=customer&panel=crm");
    return;
  }

  if (pathname === "/admin" || pathname === "/admin/" || pathname === "/admin.html") {
    redirect(req, res, "/dashboard/?portal=admin&panel=home");
    return;
  }

  const filePath = resolvePath(req.url);
  if (!filePath) {
    writeWithSecurity(req, res, 403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      writeWithSecurity(req, res, 404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(path.join(root, "404.html")));
      return;
    }

    const ext = path.extname(filePath);
    writeWithSecurity(req, res, 200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

db.getDb();

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`One Point Digital Services: http://localhost:${port}`);
  console.log("Payment API ready: /api/health");
});
