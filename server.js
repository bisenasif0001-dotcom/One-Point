"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { config } = require("./backend/config");
const {
  validateSecurityEnvironment,
  getSigningSecret,
  getAdminSessionTtlMs,
  getAdminChangeTokenTtlMs,
  isLegacyAdminTokenAllowed
} = require("./backend/security/security-policy");
const { issueSignedPayload, verifySignedPayload } = require("./backend/security/session-tokens");
const { recordSecurityEvent, requestContext } = require("./backend/audit/security-audit");

// ── Startup validation ─────────────────────────────────────────────────────
(function validateEnv() {
  const warnings = [];
  warnings.push(...validateSecurityEnvironment(config));
  if (!process.env.RAZORPAY_KEY_ID)         warnings.push("RAZORPAY_KEY_ID not set — payments will fail");
  if (!process.env.RAZORPAY_KEY_SECRET)     warnings.push("RAZORPAY_KEY_SECRET not set — payments will fail");
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
const customerService = require("./backend/customer-service");
const serviceEngine = require("./backend/service-engine");
const razorpay = require("./backend/gateways/razorpay");
const phonepe = require("./backend/gateways/phonepe");
const botChecker = require("./backend/bot-checker");
const assignment = require("./backend/assignment-engine");
const workflowEngine = require("./backend/workflow-engine");
const { handleEROSDiagnostics } = require("./backend/eros-runtime");
const documentService = require("./backend/document-service");
const customerPrivacyService = require("./backend/customer-privacy-service");
const consentService = require("./backend/consent-service");
const communicationService = require("./backend/communication-service");
const workforceService = require("./backend/workforce-service");
const branchService = require("./backend/branch-franchise-service");
const executiveMetricsService = require("./backend/executive-metrics-service");
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
const dashboardRoot = path.join(root, "dashboard", "web");

try {
  customerService.backfillExistingCustomers({
    reportPath: path.join(root, "artifacts", "migration-reports", "phase-2-milestone-2.2-migration-report.json")
  });
} catch (error) {
  console.warn("[customer-genome] startup backfill skipped:", error.message);
}

try {
  documentService.backfillExistingDocuments({
    reportPath: path.join(root, "artifacts", "migration-reports", "phase-2-milestone-2.5-migration-report.json")
  });
} catch (error) {
  console.warn("[document-registry] startup backfill skipped:", error.message);
}

try {
  communicationService.backfillExistingCommunications({
    reportPath: path.join(root, "artifacts", "migration-reports", "phase-2-milestone-2.6-migration-report.json")
  });
} catch (error) {
  console.warn("[communication] startup backfill skipped:", error.message);
}

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

// ── Admin brute-force lockout ──────────────────────────────────────────────
const adminLoginAttempts = new Map(); // ip → { count, lockedUntil }
const ADMIN_MAX_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS  = 15 * 60 * 1000; // 15 minutes

function checkAdminBruteForce(req, res) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
  const now = Date.now();
  const rec  = adminLoginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil > now) {
    recordSecurityEvent("admin.auth.lockout", { severity: "warning", request: requestContext(req) });
    const mins = Math.ceil((rec.lockedUntil - now) / 60000);
    jsonResponse(res, 429, { message: `Too many failed attempts. Try again in ${mins} minute(s).` });
    return false;
  }
  return true;
}
function recordAdminFailure(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
  const now = Date.now();
  const rec  = adminLoginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= ADMIN_MAX_ATTEMPTS) rec.lockedUntil = now + ADMIN_LOCKOUT_MS;
  adminLoginAttempts.set(ip, rec);
  recordSecurityEvent("admin.auth.failure", { severity: "warning", request: requestContext(req) });
}
function clearAdminFailures(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
  adminLoginAttempts.delete(ip);
}

// ── Admin OTP store ────────────────────────────────────────────────────────
// key = sessionId (random hex), value = { otp, method, exp, used }
const adminOtpStore = new Map();
const ADMIN_OTP_TTL = 10 * 60 * 1000; // 10 minutes

function generateAdminOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

// ── Pluggable delivery hooks ───────────────────────────────────────────────
// Replace these stubs with your actual SMS / Email provider SDK calls.

async function sendSmsOtp(phone, otp) {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.log(`\n📱 [DEV] Admin OTP for ${phone}: ${otp}  (expires in 10 min)\n`);
    return { ok: true, devOtp: otp };
  }

  const authKey    = process.env.MSG91_AUTH_KEY    || '';
  const templateId = process.env.MSG91_TEMPLATE_ID || '';

  if (!authKey || !templateId) {
    throw new Error('SMS_NOT_CONFIGURED: Set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in .env');
  }

  // ── MSG91 SendOTP — uses Node built-in https, no extra package ──
  await new Promise((resolve, reject) => {
    const https = require('node:https');
    const payload = JSON.stringify({ otp, Param1: otp, Param2: 'One Point Admin', Param3: '10' });
    const qs = new URLSearchParams({
      template_id: templateId,
      mobile: `91${phone}`,
      authkey: authKey,
    }).toString();
    const options = {
      hostname: 'control.msg91.com',
      path: `/api/v5/otp?${qs}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.type === 'success') resolve(data);
          else reject(new Error(`MSG91 error: ${data.message || body}`));
        } catch { reject(new Error(`MSG91 parse error: ${body}`)); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  return { ok: true };
}

async function sendEmailOtp(email, otp) {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.log(`\n📧 [DEV] Admin OTP for ${email}: ${otp}  (expires in 10 min)\n`);
    return { ok: true, devOtp: otp };
  }

  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (!smtpUser || !smtpPass) {
    throw new Error('EMAIL_NOT_CONFIGURED: Set SMTP_USER and SMTP_PASS in .env');
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: `One Point Admin <${smtpUser}>`,
    to: email,
    subject: `${otp} — One Point Admin OTP`,
    text: `Your One Point admin credential-change OTP is: ${otp}\n\nValid for 10 minutes. Do not share this with anyone.\n\nIf you did not request this, your password may be compromised — change it immediately.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
        <div style="background:#125696;border-radius:8px;padding:18px 24px;margin-bottom:24px">
          <div style="color:#fff;font-size:18px;font-weight:700">One Point Service OS</div>
          <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:2px">Admin Credential Change</div>
        </div>
        <p style="color:#374151;font-size:15px;margin:0 0 20px">Your one-time password (OTP) for changing admin credentials:</p>
        <div style="background:#fff;border:2px dashed #125696;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
          <div style="font-size:36px;font-weight:800;letter-spacing:0.15em;color:#125696">${otp}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:6px">Valid for 10 minutes · Single use only</div>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0">If you did not request this, your admin password may be compromised — change it immediately.</p>
      </div>
    `,
  });

  return { ok: true };
}

// ── Admin change-token JWT (5-min, single-use) ────────────────────────────
function issueChangeToken(sessionId) {
  const payload = { type: 'admin_change', sid: sessionId, iat: Date.now(), exp: Date.now() + getAdminChangeTokenTtlMs() };
  return issueSignedPayload(payload, getSigningSecret(config, "admin-change"));
}

function verifyChangeToken(token) {
  try {
    return verifySignedPayload(token, getSigningSecret(config, "admin-change"), "admin_change");
  } catch { return null; }
}

// ── Admin session JWT (8-hour expiry) ─────────────────────────────────────
function issueAdminJwt() {
  const payload = { type: "admin", iat: Date.now(), exp: Date.now() + getAdminSessionTtlMs() };
  return issueSignedPayload(payload, getSigningSecret(config, "admin-session"));
}
function verifyAdminJwt(token) {
  try {
    return Boolean(verifySignedPayload(token, getSigningSecret(config, "admin-session"), "admin"));
  } catch { return false; }
}

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

function customerSessionCookie(req, token, expiresAt) {
  const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  return `opds_customer_auth=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${remainingSeconds}${secure}`;
}

function clearCustomerSessionCookie(req) {
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  return `opds_customer_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function customerSessionToken(req) {
  const headerToken = req.headers["x-session-token"] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (headerToken) return headerToken;
  try { return decodeURIComponent(getCookie(req, "opds_customer_auth")); } catch { return ""; }
}

function customerAuthResponse(req, res, statusCode, result) {
  const session = result?.session;
  const headers = session?.token && session?.expiresAt
    ? { "Set-Cookie": customerSessionCookie(req, session.token, session.expiresAt) }
    : {};
  jsonResponse(res, statusCode, result, headers);
}

function getSessionUser(req) {
  const token = customerSessionToken(req);
  if (!token) return null;
  try {
    const session = auth.me(token);
    return session ? session.user : null;
  } catch (err) {
    return null;
  }
}

function requireOwnedOrder(req, res, orderReference, options = {}) {
  const user = getSessionUser(req);
  if (!user) {
    jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
    return null;
  }
  const order = db.get(
    "SELECT id, order_id, user_id FROM orders WHERE id = ? OR order_id = ? LIMIT 1",
    [Number(orderReference) || 0, String(orderReference || "").trim()]
  );
  if (!order) {
    if (options.missingAsBadRequest) badRequest(res, "Order not found.");
    else notFound(res);
    return null;
  }
  if (Number(order.user_id) !== Number(user.id)) {
    jsonResponse(res, 403, { error: "forbidden", message: "You do not have permission to access documents for this order." });
    return null;
  }
  return { user, order };
}

function isAdmin(req) {
  const token = req.headers["x-admin-token"] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  // Accept new expiring JWT
  if (verifyAdminJwt(token)) return true;
  // Fallback: static API token (for legacy scripts/webhooks)
  if (!isLegacyAdminTokenAllowed()) return false;
  return Boolean(config.adminApiToken && timingSafeEqualString(token, config.adminApiToken));
}

function issueCsrf(req, res) {
  const token = crypto.randomBytes(24).toString("hex");
  // Set Secure only when this request actually arrived via HTTPS. Production
  // deployments normally provide x-forwarded-proto; forcing Secure for a
  // plain-http localhost container prevents the browser from returning the
  // CSRF cookie and makes every login fail with a 403.
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  jsonResponse(res, 200, { csrfToken: token }, {
    "Set-Cookie": `opds_csrf=${token}; Path=/; SameSite=Lax; Max-Age=7200${secure}`
  });
}

function requireCsrf(req, res) {
  if (req.method === "GET" || req.url.startsWith("/api/webhooks")) return true;
  const cookieToken = getCookie(req, "opds_csrf");
  const headerToken = req.headers["x-csrf-token"];
  if (!cookieToken || !headerToken || !timingSafeEqualString(cookieToken, headerToken)) {
    recordSecurityEvent("csrf.failure", { severity: "warning", request: requestContext(req) });
    jsonResponse(res, 403, { error: "csrf_failed", message: "CSRF token missing or invalid." });
    return false;
  }
  return true;
}

function requireHttps(req, res) {
  const host = req.headers.host || "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const isIp = /^\d+\.\d+\.\d+\.\d+/.test(host);
  const proto = req.headers["x-forwarded-proto"] || "http";
  if (process.env.NODE_ENV === "production" && proto !== "https" && !isLocal && !isIp) {
    jsonResponse(res, 403, { error: "https_required", message: "HTTPS is required for payment routes." });
    return false;
  }
  return true;
}

function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  recordSecurityEvent("admin.auth.required", { severity: "warning", request: requestContext(req) });
  jsonResponse(res, 401, { error: "admin_auth_required", message: "Valid admin token required." });
  return false;
}

async function handleApi(req, res) {
  if (!rateLimit(req, res) || !requireHttps(req, res) || !requireCsrf(req, res)) return;
  const url = new URL(req.url, config.siteUrl);
  const pathname = url.pathname;

  // Intercept configuration diagnostics queries
  if (handleEROSDiagnostics(req, res, pathname)) return;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      let dbHealth = { ok: true, details: {} };
      try {
        const dbConn = db.getDb();
        
        // 1. Database integrity checks
        const integrityCheck = dbConn.prepare("PRAGMA integrity_check;").get();
        const integrity = integrityCheck ? integrityCheck.integrity_check : "unknown";
        dbHealth.integrity = integrity;
        
        // 2. Transaction log (WAL) & DB file size tracking
        let dbPath = config.databaseUrl || "./backend/data/opds-payments.sqlite";
        if (typeof dbPath === "string" && dbPath.startsWith("file:")) {
          try {
            dbPath = new URL(dbPath).pathname;
          } catch {}
        }
        
        try {
          const dbStat = fs.statSync(dbPath);
          dbHealth.dbSize = dbStat.size;
        } catch {}
        try {
          const walStat = fs.statSync(dbPath + "-wal");
          dbHealth.walSize = walStat.size;
        } catch {}

        // 3. Real-time query stats
        dbHealth.tableStats = {
          orders: dbConn.prepare("SELECT COUNT(*) AS count FROM orders").get().count,
          users: dbConn.prepare("SELECT COUNT(*) AS count FROM users").get().count
        };

        // 4. Queue stats
        try {
          dbHealth.queueStats = {
            activeTasks: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_human_tasks WHERE status NOT IN ('Completed', 'Cancelled', 'Failed')").get().count,
            queuesCount: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_work_queues").get().count
          };
        } catch {}
        
      } catch (err) {
        dbHealth.ok = false;
        dbHealth.error = err.message;
      }

      const mem = process.memoryUsage();
      jsonResponse(res, 200, {
        ok: dbHealth.ok && (dbHealth.integrity === "ok"),
        business: config.business.name,
        time: new Date().toISOString(),
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external
        },
        db: {
          ok: dbHealth.ok,
          integrity: dbHealth.integrity,
          dbSize: dbHealth.dbSize,
          walSize: dbHealth.walSize,
          tableStats: dbHealth.tableStats,
          queueStats: dbHealth.queueStats
        }
      });
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

    if (req.method === "POST" && pathname === "/api/consents/voter-id") {
      const { body } = await parseJsonBody(req);
      const consent = consentService.recordVoterConsent(body, req);
      jsonResponse(res, 201, { ok: true, consent });
      return;
    }

    if (req.method === "GET" && pathname === "/api/products") {
      jsonResponse(res, 200, catalog.listCatalog());
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/signup") {
      const { body } = await parseJsonBody(req);
      customerAuthResponse(req, res, 201, auth.signup(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
      const { body } = await parseJsonBody(req);
      customerAuthResponse(req, res, 200, auth.login(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/otp/request") {
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 201, auth.issueOtp(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/otp/verify") {
      const { body } = await parseJsonBody(req);
      customerAuthResponse(req, res, 200, auth.verifyOtp(body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/gmail/start") {
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 201, auth.gmailStart(body));
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/google/status") {
      jsonResponse(res, 200, auth.googleStatus());
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/google/start") {
      const entry = url.searchParams.get("entry") === "signup" ? "signup" : "login";
      try {
        const result = auth.beginGoogleSignIn({
          returnUrl: url.searchParams.get("returnUrl") || "",
          entry
        });
        redirect(req, res, result.authorizationUrl);
      } catch (error) {
        redirect(req, res, oauthCallbackLocation(entry, "google", { error: error.message }));
      }
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/google/callback") {
      const state = url.searchParams.get("state") || "";
      const entry = auth.getOAuthEntry("google", state);
      try {
        if (url.searchParams.get("error")) throw new Error("Google Sign-In was cancelled.");
        const result = await auth.finishGoogleSignIn({
          code: url.searchParams.get("code") || "",
          state
        });
        redirect(req, res, oauthCallbackLocation(result.entry, "google", { handoff: result.handoff }));
      } catch (error) {
        redirect(req, res, oauthCallbackLocation(entry, "google", { error: error.message }));
      }
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/google/complete") {
      const { body } = await parseJsonBody(req);
      customerAuthResponse(req, res, 200, auth.completeGoogleHandoff(body));
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/microsoft/status") {
      jsonResponse(res, 200, auth.microsoftStatus());
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/microsoft/start") {
      const entry = url.searchParams.get("entry") === "signup" ? "signup" : "login";
      try {
        const result = auth.beginMicrosoftSignIn({
          returnUrl: url.searchParams.get("returnUrl") || "",
          entry
        });
        redirect(req, res, result.authorizationUrl);
      } catch (error) {
        redirect(req, res, oauthCallbackLocation(entry, "microsoft", { error: error.message }));
      }
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/microsoft/callback") {
      const state = url.searchParams.get("state") || "";
      const entry = auth.getOAuthEntry("microsoft", state);
      try {
        if (url.searchParams.get("error")) throw new Error("Microsoft Sign-In was cancelled.");
        const result = await auth.finishMicrosoftSignIn({
          code: url.searchParams.get("code") || "",
          state
        });
        redirect(req, res, oauthCallbackLocation(result.entry, "microsoft", { handoff: result.handoff }));
      } catch (error) {
        redirect(req, res, oauthCallbackLocation(entry, "microsoft", { error: error.message }));
      }
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/microsoft/complete") {
      const { body } = await parseJsonBody(req);
      customerAuthResponse(req, res, 200, auth.completeMicrosoftHandoff(body));
      return;
    }

    // ── Step 1: Verify credentials + send OTP ──────────────────────────────
    if (req.method === "POST" && pathname === "/api/auth/admin/otp/send") {
      if (!checkAdminBruteForce(req, res)) return;
      const { body } = await parseJsonBody(req);
      const expectedUserId = process.env.ADMIN_USER_ID || "bisenasif0001";
      const expectedPassword = process.env.ADMIN_PASSWORD || "";
      const userId   = String(body.user_id   || "");
      const password = String(body.password  || "");
      const method   = String(body.method    || "mobile"); // "mobile" | "email"

      const validUser = userId.length > 0 && timingSafeEqualString(userId, expectedUserId);
      const validPass = password.length > 0 && timingSafeEqualString(password, expectedPassword);
      if (!validUser || !validPass) {
        recordAdminFailure(req);
        await new Promise(r => setTimeout(r, 400 + Math.random() * 200));
        jsonResponse(res, 401, { message: "Invalid User ID or Password." });
        return;
      }
      clearAdminFailures(req);

      const adminPhone = process.env.ADMIN_PHONE || "";
      const adminEmail = process.env.ADMIN_EMAIL || "";
      if (method === "mobile" && !adminPhone) {
        jsonResponse(res, 400, { message: "ADMIN_PHONE not set in .env — cannot send SMS OTP." });
        return;
      }
      if (method === "email" && !adminEmail) {
        jsonResponse(res, 400, { message: "ADMIN_EMAIL not set in .env — cannot send Email OTP." });
        return;
      }

      const otp       = generateAdminOtp();
      const sessionId = crypto.randomBytes(24).toString("hex");
      adminOtpStore.set(sessionId, { otp, method, exp: Date.now() + ADMIN_OTP_TTL, used: false });

      // Cleanup stale sessions
      for (const [k, v] of adminOtpStore) {
        if (v.exp < Date.now()) adminOtpStore.delete(k);
      }

      let devOtp;
      try {
        const result = method === "mobile"
          ? await sendSmsOtp(adminPhone, otp)
          : await sendEmailOtp(adminEmail, otp);
        devOtp = result?.devOtp;
      } catch (err) {
        adminOtpStore.delete(sessionId);
        jsonResponse(res, 503, { message: err.message });
        return;
      }

      // Masked contact for display
      const masked = method === "mobile"
        ? adminPhone.replace(/(\d{2})\d+(\d{3})/, "$1*****$2")
        : adminEmail.replace(/(.{2}).+(@.+)/, "$1***$2");

      const resp = { sessionId, masked, method, message: `OTP sent to ${masked}` };
      if (devOtp) resp.devOtp = devOtp; // only in dev mode
      jsonResponse(res, 200, resp);
      return;
    }

    // ── Step 2: Verify OTP → return change-token ───────────────────────────
    if (req.method === "POST" && pathname === "/api/auth/admin/otp/verify") {
      const { body } = await parseJsonBody(req);
      const sessionId = String(body.session_id || "");
      const otp       = String(body.otp        || "").trim();

      const rec = adminOtpStore.get(sessionId);
      if (!rec) {
        jsonResponse(res, 400, { message: "OTP session not found. Please start again." });
        return;
      }
      if (rec.used) {
        jsonResponse(res, 400, { message: "This OTP has already been used." });
        return;
      }
      if (rec.exp < Date.now()) {
        adminOtpStore.delete(sessionId);
        jsonResponse(res, 400, { message: "OTP has expired. Please request a new one." });
        return;
      }
      if (!timingSafeEqualString(otp, rec.otp)) {
        await new Promise(r => setTimeout(r, 300));
        jsonResponse(res, 401, { message: "Incorrect OTP. Please try again." });
        return;
      }

      // Mark used — cannot be reused
      rec.used = true;
      const changeToken = issueChangeToken(sessionId);
      jsonResponse(res, 200, { changeToken, message: "OTP verified. You may now set your new password." });
      return;
    }

    // ── Step 3: Change credentials (requires valid changeToken) ────────────
    if (req.method === "POST" && pathname === "/api/auth/admin/change-credentials") {
      const { body } = await parseJsonBody(req);
      const changeToken    = String(body.change_token    || "");
      const newUserId      = String(body.new_user_id     || "").trim();
      const newPassword    = String(body.new_password    || "");
      const confirmPassword= String(body.confirm_password|| "");

      // Verify change-token
      const tokenPayload = verifyChangeToken(changeToken);
      if (!tokenPayload) {
        jsonResponse(res, 401, { message: "Invalid or expired change token. Please complete OTP verification again." });
        return;
      }
      // Invalidate the OTP session so token cannot be reused
      adminOtpStore.delete(tokenPayload.sid);

      // Strong password rules
      if (newPassword.length < 10) { jsonResponse(res, 400, { message: "New password must be at least 10 characters." }); return; }
      if (!/[A-Z]/.test(newPassword)) { jsonResponse(res, 400, { message: "Password must contain at least one capital letter (A-Z)." }); return; }
      if (!/[0-9]/.test(newPassword)) { jsonResponse(res, 400, { message: "Password must contain at least one number (0-9)." }); return; }
      if (!/[@!#_$%^&*]/.test(newPassword)) { jsonResponse(res, 400, { message: "Password must contain at least one symbol (@ ! # _ $ %)." }); return; }
      if (newPassword !== confirmPassword) { jsonResponse(res, 400, { message: "Passwords do not match." }); return; }

      // Update .env
      const envPath = path.join(root, ".env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
      function setEnvVar(content, key, value) {
        const regex = new RegExp(`^${key}=.*$`, "m");
        return regex.test(content) ? content.replace(regex, `${key}=${value}`) : `${content}\n${key}=${value}`;
      }
      const expectedUserId = process.env.ADMIN_USER_ID || "bisenasif0001";
      const finalUserId = newUserId || expectedUserId;
      envContent = setEnvVar(envContent, "ADMIN_USER_ID", finalUserId);
      envContent = setEnvVar(envContent, "ADMIN_PASSWORD", newPassword);
      fs.writeFileSync(envPath, envContent.trimEnd() + "\n", "utf8");
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
      if (!checkAdminBruteForce(req, res)) return;
      const { body } = await parseJsonBody(req);
      const expectedUserId = process.env.ADMIN_USER_ID || "bisenasif0001";
      const expectedPassword = process.env.ADMIN_PASSWORD || "";
      const userId = String(body.user_id || "");
      const password = String(body.password || "");
      const validUser = userId.length > 0 && timingSafeEqualString(userId, expectedUserId);
      const validPass = password.length > 0 && timingSafeEqualString(password, expectedPassword);
      if (!validUser || !validPass) {
        recordAdminFailure(req);
        // Uniform delay to prevent timing-based user enumeration
        await new Promise(r => setTimeout(r, 400 + Math.random() * 200));
        jsonResponse(res, 401, { message: "Invalid admin User ID or Password." });
        return;
      }
      clearAdminFailures(req);
      jsonResponse(res, 200, { token: issueAdminJwt() });
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/me") {
      const token = customerSessionToken(req) || url.searchParams.get("token") || "";
      try {
        jsonResponse(res, 200, auth.me(token));
      } catch {
        jsonResponse(res, 401, { error: "session_expired", message: "Your login session has expired. Please sign in again." });
      }
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/logout") {
      const token = customerSessionToken(req);
      jsonResponse(res, 200, auth.logout(token), { "Set-Cookie": clearCustomerSessionCookie(req) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/orders") {
      const { body } = await parseJsonBody(req);
      const sessionUser = getSessionUser(req);
      const result = await payments.createCheckout(body, { sessionUserId: sessionUser?.id });
      jsonResponse(res, 201, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/service-bookings") {
      const { body } = await parseJsonBody(req);
      const sessionUser = getSessionUser(req);
      const result = await payments.createCheckout(
        { ...body, orderType: "service", sourceChannel: "service_booking" },
        { sessionUserId: sessionUser?.id }
      );
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
      const invoiceOwner = db.get(`
        SELECT o.user_id
        FROM invoices i
        JOIN orders o ON o.id = i.order_id
        WHERE i.invoice_no = ?
        LIMIT 1
      `, [invoiceNo]);
      const sessionUser = getSessionUser(req);
      if (!invoiceOwner || (!isAdmin(req) && (!sessionUser || Number(sessionUser.id) !== Number(invoiceOwner.user_id)))) {
        jsonResponse(res, 403, { error: "forbidden", message: "You do not have access to this invoice." });
        return;
      }
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

      if (req.method === "GET" && pathname === "/api/admin/customers") {
        const limit = Number(url.searchParams.get("limit") || 200);
        jsonResponse(res, 200, { customers: customerService.listCustomer360({ limit }) });
        return;
      }

      if (req.method === "GET" && pathname === "/api/admin/catalog") {
        jsonResponse(res, 200, catalog.listCatalog({ includeInactive: true, includeInternal: true }));
        return;
      }
      if (req.method === "GET" && pathname === "/api/admin/services/dna") {
        jsonResponse(res, 200, { services: serviceEngine.listAdminServiceDna() });
        return;
      }
      if (req.method === "GET" && pathname.startsWith("/api/admin/services/dna/")) {
        const slug = decodeURIComponent(pathname.split("/").pop() || "");
        const serviceDna = serviceEngine.adminServiceDna(slug);
        if (!serviceDna) { notFound(res); return; }
        jsonResponse(res, 200, { serviceDna });
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/catalog") {
        const { body } = await parseJsonBody(req);
        const item = catalog.upsertCatalogItem(body);
        jsonResponse(res, 200, { item, catalog: catalog.listCatalog({ includeInactive: true, includeInternal: true }) });
        return;
      }
      if (req.method === "DELETE" && pathname === "/api/admin/catalog") {
        const { body } = await parseJsonBody(req);
        const result = catalog.deleteCatalogItem(body);
        jsonResponse(res, 200, { ...result, catalog: catalog.listCatalog({ includeInactive: true, includeInternal: true }) });
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
        const docs = documentService.listAdminDocuments({ limit: 100 });
        jsonResponse(res, 200, { documents: docs });
        return;
      }

      if (req.method === "GET" && pathname === "/api/admin/deletion-requests") {
        jsonResponse(res, 200, { requests: customerPrivacyService.listAdminDeletionRequests({ limit: Number(url.searchParams.get("limit") || 100) }) });
        return;
      }

      if (req.method === "PATCH" && /^\/api\/admin\/deletion-requests\/\d+$/.test(pathname)) {
        const requestId = Number(pathname.split("/").pop());
        const { body } = await parseJsonBody(req);
        const request = customerPrivacyService.resolveDeletionRequest(requestId, body.action, {
          actor: "admin",
          note: body.note
        });
        jsonResponse(res, 200, { ok: true, request });
        return;
      }

      if (req.method === "PATCH" && pathname.startsWith("/api/admin/documents/")) {
        const docId  = Number(pathname.split("/").pop());
        const { body } = await parseJsonBody(req);
        if (body.verified !== undefined) {
          try {
            const document = documentService.verifyOrderDocument(docId, Boolean(body.verified), {
              actorType: "human",
              actorId: "admin",
              reason: String(body.reason || (body.verified ? "Approved by document reviewer." : "Rejected by document reviewer.")),
              source: "admin_document_api"
            });
            jsonResponse(res, 200, { ok: true, document });
          } catch (error) {
            if (error.code === "DOCUMENT_LIFECYCLE_CONFLICT") {
              jsonResponse(res, 409, { ok: false, error: "document_lifecycle_conflict", message: error.message });
              return;
            }
            throw error;
          }
          return;
        }
        jsonResponse(res, 200, { ok: true });
        return;
      }

      // ── Admin: Support Tickets ────────────────────────────────────────────
      if (req.method === "GET" && pathname === "/api/admin/tickets") {
        const tickets = db.all("SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100", []);
        jsonResponse(res, 200, { tickets });
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/tickets") {
        const { body } = await parseJsonBody(req);
        const ticket = communicationService.createSupportTicket({
          customerPhone: body.phone || "",
          customerName: body.name || "Customer",
          subject: body.subject || "Support",
          message: body.message || "",
          orderId: body.orderId || null,
          ownerType: "Department",
          ownerId: "support",
          createdByType: "Staff",
          createdById: "admin",
          channelType: body.channel || "Website Chat"
        });
        jsonResponse(res, 201, { ok: true, ...ticket });
        return;
      }
      if (req.method === "PATCH" && pathname.startsWith("/api/admin/tickets/")) {
        const ticketId = pathname.split("/").pop();
        const { body } = await parseJsonBody(req);
        try {
          const ticket = communicationService.updateSupportTicket(ticketId, {
            status: body.status || "open",
            reply: body.reply || "",
            actorType: "Staff",
            actorId: "admin",
            channelType: body.channel || "Website Chat"
          });
          jsonResponse(res, 200, { ok: true, ...ticket });
        } catch (error) {
          if (error.code === "COMMUNICATION_NOT_FOUND") {
            jsonResponse(res, 404, { error: "ticket_not_found", message: error.message });
            return;
          }
          throw error;
        }
        return;
      }

      if (req.method === "GET" && pathname === "/api/admin/conversations") {
        const conversations = communicationService.listAdminConversations({
          channelType: url.searchParams.get("channel") || null,
          operationalStatus: url.searchParams.get("status") || null,
          limit: Number(url.searchParams.get("limit") || 50)
        });
        jsonResponse(res, 200, { conversations });
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/conversations") {
        const { body } = await parseJsonBody(req);
        if (!body.content) {
          badRequest(res, "content is required.");
          return;
        }
        const conversation = communicationService.createCustomerConversation({
          customerPhone: body.phone || "",
          customerEmail: body.email || "",
          customerName: body.name || "Customer",
          subject: body.subject || "Customer conversation",
          channelType: body.channelType || body.channel || "Website Chat",
          channelReference: body.channelReference || body.phone || body.email || "",
          messageType: body.messageType || "Text",
          lifecycleStatus: body.lifecycleStatus || "Sent",
          direction: body.direction || "Outbound",
          content: body.content,
          linkedObjectType: body.linkedObjectType || null,
          linkedObjectUuid: body.linkedObjectUuid || null,
          ownerType: "Staff",
          ownerId: "admin",
          createdByType: "Staff",
          createdById: "admin"
        });
        jsonResponse(res, 201, { ok: true, ...conversation });
        return;
      }
      if (req.method === "POST" && /^\/api\/admin\/conversations\/[^/]+\/messages$/.test(pathname)) {
        const conversationUuid = pathname.split("/")[4];
        const { body } = await parseJsonBody(req);
        if (!body.content) {
          badRequest(res, "content is required.");
          return;
        }
        try {
          const message = communicationService.addMessage(conversationUuid, {
            messageType: body.messageType || "Text",
            lifecycleStatus: body.lifecycleStatus || "Sent",
            direction: body.direction || "Outbound",
            channelType: body.channelType || "Website Chat",
            ownerType: body.direction === "Inbound" ? "Customer" : body.direction === "System" ? "System" : "Staff",
            ownerId: body.ownerId || (body.direction === "Inbound" ? "customer" : "admin"),
            content: body.content,
            linkedObjectType: body.linkedObjectType || null,
            linkedObjectUuid: body.linkedObjectUuid || null,
            metadata: { source: "admin_conversation_api" }
          });
          jsonResponse(res, 201, { ok: true, message });
        } catch (error) {
          if (error.code === "COMMUNICATION_NOT_FOUND") {
            jsonResponse(res, 404, { error: "conversation_not_found", message: error.message });
            return;
          }
          if (error.code === "COMMUNICATION_VALIDATION_FAILED") {
            badRequest(res, error.message);
            return;
          }
          throw error;
        }
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
      if (req.method === "GET" && pathname === "/api/admin/orders/workflow") {
        const orderId = url.searchParams.get("orderId") || "";
        if (!orderId) { badRequest(res, "orderId is required."); return; }
        jsonResponse(res, 200, { workflow: workflowEngine.getWorkflowForOrder(orderId, { timelineLimit: 30, taskLimit: 50 }) });
        return;
      }
      if (req.method === "GET" && /^\/api\/admin\/orders\/[^/]+\/workflow$/.test(pathname)) {
        const orderId = decodeURIComponent(pathname.split("/")[4] || "");
        jsonResponse(res, 200, { workflow: workflowEngine.getWorkflowForOrder(orderId, { timelineLimit: 30, taskLimit: 50 }) });
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/orders/workflow/override") {
        const { body } = await parseJsonBody(req);
        if (!body.orderId || !body.newState) { badRequest(res, "orderId and newState are required."); return; }
        if (!body.reason) { badRequest(res, "Manual workflow override requires a reason."); return; }
        const workflow = workflowEngine.transitionOrderWorkflow(body.orderId, body.newState, {
          actorType: "admin",
          actorId: body.actor || body.actorId || "admin",
          override: true,
          reason: body.reason,
          eventType: "workflow.override",
          title: "Manual workflow override",
          summary: body.reason,
          sourceTable: "orders"
        });
        jsonResponse(res, 200, { ok: true, workflow });
        return;
      }
      if (req.method === "POST" && pathname === "/api/admin/orders/status") {
        const { body } = await parseJsonBody(req);
        const result = payments.updateOrderStatus(body);
        jsonResponse(res, 200, result);
        return;
      }
    }

    if (pathname === "/api/customer/profile") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      if (req.method === "GET") {
        jsonResponse(res, 200, { customer: customerService.getCustomer360ByUserId(user.id) });
        return;
      }
      if (req.method === "PATCH") {
        const { body } = await parseJsonBody(req);
        const customer = customerService.updateCustomerProfile(user.id, body, { actorType: "customer", actorId: user.id });
        jsonResponse(res, 200, { ok: true, customer });
        return;
      }
    }

    if (req.method === "PATCH" && pathname === "/api/customer/address") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const { body } = await parseJsonBody(req);
      const customer = customerService.updateCustomerProfile(user.id, body, { actorType: "customer", actorId: user.id });
      jsonResponse(res, 200, { ok: true, customer });
      return;
    }

    if (req.method === "GET" && pathname === "/api/customer/recent-order") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      jsonResponse(res, 200, { order: customerService.getRecentOrderForUser(user.id) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/customer/create-password") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.setPassword(user.id, body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/customer/change-password") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.changePassword(user.id, body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/customer/verify-mobile/request") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.requestMobileVerification(user.id, body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/customer/verify-mobile/confirm") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.confirmMobileVerification(user.id, body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/customer/verify-email/request") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.requestEmailVerification(user.id, body));
      return;
    }

    if (req.method === "POST" && pathname === "/api/customer/verify-email/confirm") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const { body } = await parseJsonBody(req);
      jsonResponse(res, 200, auth.confirmEmailVerification(user.id, body));
      return;
    }

    if (req.method === "GET" && pathname === "/api/customer/orders") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const rawPhone = user.phone || String(url.searchParams.get("phone") || "").trim();
      if (!rawPhone) {
        jsonResponse(res, 200, { orders: [], customer: { name: user.name || "Customer", email: user.email || "" } });
        return;
      }
      try {
        const result = payments.getCustomerDashboard(rawPhone);
        jsonResponse(res, 200, {
          orders: result.orders || [],
          customer: result.customer || { name: user.name || "Customer", phone: user.phone || rawPhone, email: user.email || "" },
          customer360: result.customer360 || null
        });
      } catch (err) {
        jsonResponse(res, 200, { orders: [], customer: { name: user.name || "Customer", phone: user.phone || rawPhone, email: user.email || "" } });
      }
      return;
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
          `SELECT id, ticket_id, customer_phone, customer_name, subject, message, order_id,
                  status, assigned_to, reply, created_at, updated_at,
                  conversation_uuid AS conversationUuid
           FROM support_tickets WHERE customer_phone = ? ORDER BY created_at DESC LIMIT 100`,
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
        const ticket = communicationService.createSupportTicket({
          customerUserId: user.id,
          customerPhone: user.phone,
          customerName: user.name,
          subject: body.subject,
          message: body.message,
          orderId: body.orderId || null,
          createdByType: "Customer",
          createdById: String(user.id),
          channelType: "Website Chat"
        });
        jsonResponse(res, 201, {
          ok: true,
          ticketId: ticket.ticketId,
          conversationUuid: ticket.conversationUuid
        });
        return;
      }
    }

    if (req.method === "GET" && pathname === "/api/customer/conversations") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const conversations = communicationService.listCustomerConversations(user, {
        channelType: url.searchParams.get("channel") || null,
        operationalStatus: url.searchParams.get("status") || null,
        limit: Number(url.searchParams.get("limit") || 50)
      });
      jsonResponse(res, 200, { conversations });
      return;
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
      if (doc.customer_hidden_at) {
        jsonResponse(res, 410, { error: "hidden_by_customer_request", message: "This document is hidden while your deletion request is under review." });
        return;
      }
      const expires = Date.now() + 15 * 60 * 1000;
      const signature = crypto.createHmac("sha256", getSigningSecret(config, "customer-document"))
        .update(`${docId}:${expires}`)
        .digest("hex");
      const downloadUrl = `/api/customer/documents/download?docId=${docId}&expires=${expires}&signature=${signature}`;
      documentService.recordDocumentAction(docId, "View", {
        actorType: "customer",
        actorId: user.id,
        source: "customer_document_sign_api"
      });
      jsonResponse(res, 200, { downloadUrl });
      return;
    }

    if (req.method === "GET" && pathname === "/api/customer/documents") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      jsonResponse(res, 200, {
        documents: customerPrivacyService.listCustomerDocuments(user.id),
        deletionRequests: customerPrivacyService.listCustomerDeletionRequests(user.id)
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/customer/invoices") {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      jsonResponse(res, 200, { invoices: customerPrivacyService.listCustomerInvoices(user.id) });
      return;
    }

    if (req.method === "POST" && /^\/api\/customer\/documents\/\d+\/hide-request$/.test(pathname)) {
      const user = getSessionUser(req);
      if (!user) {
        jsonResponse(res, 401, { error: "unauthorized", message: "Valid login session required." });
        return;
      }
      const documentId = Number(pathname.split("/")[4]);
      const { body } = await parseJsonBody(req);
      try {
        const request = customerPrivacyService.requestDocumentHiding(user.id, documentId, body.reason);
        jsonResponse(res, 201, { ok: true, request, message: "Document hidden from your view. The admin review deadline is 60 days." });
      } catch (error) {
        badRequest(res, error.message);
      }
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
      const expected = crypto.createHmac("sha256", getSigningSecret(config, "customer-document"))
        .update(`${docId}:${expires}`)
        .digest("hex");
      if (signature !== expected) {
        jsonResponse(res, 403, { error: "forbidden", message: "Invalid signature." });
        return;
      }
      const doc = db.get(
        `SELECT od.*, o.user_id
         FROM order_documents od
         JOIN orders o ON o.id = od.order_id
         WHERE od.id = ?`,
        [Number(docId)]
      );
      if (!doc) {
        notFound(res);
        return;
      }
      if (doc.customer_hidden_at) {
        jsonResponse(res, 410, { error: "hidden_by_customer_request", message: "This document is hidden while the deletion request is under review." });
        return;
      }
      documentService.recordDocumentAction(Number(docId), "Download", {
        actorType: "customer",
        actorId: doc.user_id,
        source: "customer_document_download_api"
      });
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
      // ── Order check: session user if authenticated, or valid order by ID for public tracking ──
      const sessionUser = getSessionUser(req);
      let order = null;
      if (sessionUser) {
        const ownership = requireOwnedOrder(req, res, orderId, { missingAsBadRequest: true });
        if (!ownership) return;
        order = ownership.order;
      } else {
        order = db.get(
          "SELECT id, order_id, user_id FROM orders WHERE id = ? OR LOWER(order_id) = LOWER(?) LIMIT 1",
          [Number(orderId) || 0, String(orderId || "").trim()]
        );
        if (!order) {
          badRequest(res, "Order not found.");
          return;
        }
      }
      documentService.registerUpload({
        orderId: order.id,
        docType,
        fileName,
        fileUrl: fileUrl || null,
        mimeType: body.mimeType || null,
        fileSizeBytes: body.fileSizeBytes || null,
        contentHash: body.contentHash || null,
        documentUuid: body.documentUuid || null,
        issueDate: body.issueDate || null,
        expiryDate: body.expiryDate || null,
        retentionPolicy: body.retentionPolicy || null,
        retentionCategory: body.retentionCategory || null,
        retentionUntil: body.retentionUntil || null,
        reuseEligible: Boolean(body.reuseEligible),
        replacementReason: body.replacementReason || null,
        uploadedBy: sessionUser ? "customer" : "guest_tracking",
        actorType: "customer",
        actorId: sessionUser ? sessionUser.id : (order.user_id || 0),
        source: "orders_document_upload_api"
      });
      const docs = documentService.listOrderDocuments(order.id);
      if (sessionUser) {
        docs.forEach((document) => customerPrivacyService.queueGoogleDriveDocumentSync(sessionUser.id, document.id));
      }
      // Re-run bot check after document upload
      setImmediate(() => { botChecker.checkAndAssign(order.order_id || orderId).catch(() => {}); });
      jsonResponse(res, 201, { ok: true, documents: docs });
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/orders/") && pathname.endsWith("/documents")) {
      const parts = pathname.split("/");
      const orderId = decodeURIComponent(parts[3] || "");
      const ownership = requireOwnedOrder(req, res, orderId);
      if (!ownership) return;
      const docs = documentService.listOrderDocuments(ownership.order.id);
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
    if (pathname === "/api/admin/departments") {
      if (!requireAdmin(req, res)) return;
      if (req.method === "GET") {
        jsonResponse(res, 200, { departments: workforceService.listDepartments() });
        return;
      }
    }

    if (pathname.startsWith("/api/admin/branches")) {
      if (!requireAdmin(req, res)) return;

      if (req.method === "GET" && pathname === "/api/admin/branches") {
        const branchType = url.searchParams.get("branchType") || undefined;
        jsonResponse(res, 200, { branches: branchService.listBranches({ branchType }) });
        return;
      }

      if (req.method === "POST" && pathname === "/api/admin/branches") {
        const { body } = await parseJsonBody(req);
        const branch = branchService.saveBranch(body, { source: "admin_branch_api" });
        jsonResponse(res, 201, { branch, branches: branchService.listBranches({ branchType: body.branchType || undefined }) });
        return;
      }

      if (req.method === "PATCH" && pathname.startsWith("/api/admin/branches/")) {
        const branchUuid = decodeURIComponent(pathname.split("/").pop() || "");
        const { body } = await parseJsonBody(req);
        const branch = branchService.saveBranch({ ...body, branchUuid }, { source: "admin_branch_api" });
        jsonResponse(res, 200, { branch, branches: branchService.listBranches({ branchType: body.branchType || undefined }) });
        return;
      }
    }

    if (pathname.startsWith("/api/admin/executive")) {
      if (!requireAdmin(req, res)) return;

      if (req.method === "GET" && pathname === "/api/admin/executive/summary") {
        jsonResponse(res, 200, { summary: executiveMetricsService.buildExecutiveSummary() });
        return;
      }

      if (req.method === "GET" && pathname === "/api/admin/executive/snapshots") {
        const limit = Number(url.searchParams.get("limit") || 10);
        jsonResponse(res, 200, { snapshots: executiveMetricsService.listSnapshots(limit) });
        return;
      }

      if (req.method === "POST" && pathname === "/api/admin/executive/snapshots") {
        jsonResponse(res, 201, { snapshot: executiveMetricsService.createSnapshot({ source: "admin_executive_api" }) });
        return;
      }
    }

    if (pathname.startsWith("/api/admin/staff")) {
      if (!requireAdmin(req, res)) return;

      if (req.method === "GET" && pathname === "/api/admin/staff") {
        jsonResponse(res, 200, { staff: assignment.getStaffList() });
        return;
      }

      if (req.method === "POST" && pathname === "/api/admin/staff") {
        const { body } = await parseJsonBody(req);
        if (!body.name || !body.phone) { badRequest(res, "name and phone are required."); return; }
        db.run(
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
        const staffRecord = db.get("SELECT id FROM staff WHERE phone = ?", [body.phone]);
        if (staffRecord?.id) {
          workforceService.syncStaffGovernance(staffRecord.id, body, {
            actorType: "admin",
            actorId: "admin-api",
            source: "admin_staff_api",
            reason: "Admin created or updated governed staff metadata."
          });
        }
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
        workforceService.syncStaffGovernance(staffId, body, {
          actorType: "admin",
          actorId: "admin-api",
          source: "admin_staff_api",
          reason: "Admin updated governed staff metadata."
        });
        jsonResponse(res, 200, { staff: assignment.getStaffList() });
        return;
      }

      if (req.method === "DELETE" && pathname.startsWith("/api/admin/staff/")) {
        const staffId = Number(pathname.split("/").pop());
        db.run("UPDATE staff SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [staffId]);
        workforceService.syncStaffGovernance(staffId, { lifecycleStatus: "Inactive" }, {
          actorType: "admin",
          actorId: "admin-api",
          source: "admin_staff_api",
          reason: "Admin deactivated staff member."
        });
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
      error.message.includes("attempts") ||
      error.message.includes("Illegal workflow transition")
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

function oauthCallbackLocation(entry, provider, payload = {}) {
  const isSignup = entry === "signup";
  const params = new URLSearchParams();
  if (!isSignup) params.set("tab", "gmail");
  if (payload.handoff) {
    params.set(provider, "success");
    params.set("handoff", payload.handoff);
  }
  if (payload.error) params.set(`${provider}_error`, payload.error);
  return `${isSignup ? "/signup.html" : "/login.html"}?${params.toString()}`;
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
  const requestUrl = new URL(req.url, config.siteUrl);
  const pathname = requestUrl.pathname;

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

  if (pathname === "/service-domicile-certificate.html") {
    redirect(req, res, "/service-transport-rto-facilitation.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/service-caste-certificate.html") {
    redirect(req, res, "/service-ration-card-assistance.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/service-police-verification.html" || pathname === "/service-pension-welfare-schemes.html") {
    redirect(req, res, "/service-pension-welfare-schemes-assistance.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/service-ayushman-card.html") {
    redirect(req, res, "/service-citizen-security-cybercrime-police-help.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/income-tax-assistance.html" || pathname === "/income-tax-assistance") {
    redirect(req, res, "/service-income-tax-assistance.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/dashboard.html") {
    redirect(req, res, "/customer-account-overview.html" + (requestUrl.search || ""));
    return;
  }

  if ((pathname === "/dashboard" || pathname === "/dashboard/" || pathname === "/dashboard/index.html" || pathname === "/dashboard/web" || pathname === "/dashboard/web/" || pathname === "/dashboard/web/index.html") && requestUrl.searchParams.get("portal") === "customer") {
    redirect(req, res, "/customer-account-overview.html");
    return;
  }

  if (pathname === "/customer/profile" || pathname === "/customer/profile/") {
    // Redirect (not a direct serve) so the final URL is the real file's own directory —
    // that keeps every relative assets/... path on customer-profile.html resolving
    // correctly, both through this server and when the file is opened directly.
    redirect(req, res, "/customer-profile.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/customer/account" || pathname === "/customer/account/" || pathname === "/customer/account/overview") {
    redirect(req, res, "/customer-account-overview.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/customer/account/orders" || pathname === "/customer/account/orders/") {
    redirect(req, res, "/customer-account-orders.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname.startsWith("/customer/account/orders/")) {
    const orderId = decodeURIComponent(pathname.replace(/^\/customer\/account\/orders\//, "").replace(/\/$/, ""));
    const params = new URLSearchParams(requestUrl.search || "");
    if (orderId) params.set("id", orderId);
    redirect(req, res, `/customer-account-order-detail.html?${params.toString()}`);
    return;
  }

  if (pathname === "/customer/account/payments" || pathname === "/customer/account/payments/") {
    redirect(req, res, "/customer-account-payments.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/customer/account/invoices" || pathname === "/customer/account/invoices/") {
    redirect(req, res, "/customer-account-invoices.html" + (requestUrl.search || ""));
    return;
  }

  if (pathname === "/customer/account/profile" || pathname === "/customer/account/profile/") {
    redirect(req, res, "/customer-profile.html" + (requestUrl.search || ""));
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
