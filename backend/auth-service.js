"use strict";

const crypto = require("node:crypto");
const db = require("./db");
const { config } = require("./config");
const { safePhone, safeString, timingSafeEqualString } = require("./utils");

const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_DEV_MODE = process.env.NODE_ENV !== "production";

function cleanEmail(value) {
  const email = safeString(value, 180).toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeName(value) {
  return safeString(value, 120) || "Customer";
}

function hashSecret(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [method, iterRaw, salt, expected] = String(storedHash).split("$");
  if (method !== "pbkdf2" || !iterRaw || !salt || !expected) return false;
  const hash = crypto.pbkdf2Sync(String(password), salt, Number(iterRaw), 32, "sha256").toString("hex");
  return timingSafeEqualString(hash, expected);
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    address: row.address || "",
    authProvider: row.auth_provider || "checkout",
    phoneVerified: Boolean(row.phone_verified),
    emailVerified: Boolean(row.email_verified),
    accountStatus: row.account_status || "active"
  };
}

function findUser({ phone = "", email = "" }) {
  const phoneNum = safePhone(phone);
  const emailClean = cleanEmail(email);
  if (phoneNum) {
    const byPhone = db.get("SELECT * FROM users WHERE phone = ? ORDER BY updated_at DESC, id DESC LIMIT 1", [phoneNum]);
    if (byPhone) return byPhone;
  }
  if (emailClean) {
    const byEmail = db.get("SELECT * FROM users WHERE lower(IFNULL(email, '')) = ? ORDER BY updated_at DESC, id DESC LIMIT 1", [emailClean]);
    if (byEmail) return byEmail;
  }
  return null;
}

function upsertUser({ name, phone, email, address = "", provider = "manual", password = "", phoneVerified = false, emailVerified = false }) {
  const cleanPhone = safePhone(phone);
  const cleanMail = cleanEmail(email);
  if (!cleanPhone && !cleanMail) throw new Error("Mobile number or email is required.");
  if (cleanPhone && cleanPhone.length < 10) throw new Error("A valid 10-digit mobile number is required.");

  const displayName = normalizeName(name);
  const existing = findUser({ phone: cleanPhone, email: cleanMail });
  const passwordHash = password ? hashPassword(password) : null;

  if (existing) {
    db.run(
      `UPDATE users
       SET name = ?,
           phone = COALESCE(NULLIF(?, ''), phone),
           email = COALESCE(NULLIF(?, ''), email),
           address = COALESCE(NULLIF(?, ''), address),
           password_hash = COALESCE(?, password_hash),
           auth_provider = ?,
           phone_verified = CASE WHEN ? = 1 THEN 1 ELSE phone_verified END,
           email_verified = CASE WHEN ? = 1 THEN 1 ELSE email_verified END,
           account_status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [displayName, cleanPhone, cleanMail, safeString(address, 240), passwordHash, provider, phoneVerified ? 1 : 0, emailVerified ? 1 : 0, existing.id]
    );
    return db.get("SELECT * FROM users WHERE id = ?", [existing.id]);
  }

  const result = db.run(
    `INSERT INTO users (name, phone, email, address, password_hash, auth_provider, phone_verified, email_verified, account_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [displayName, cleanPhone || "", cleanMail || null, safeString(address, 240) || null, passwordHash, provider, phoneVerified ? 1 : 0, emailVerified ? 1 : 0]
  );
  return db.get("SELECT * FROM users WHERE id = ?", [Number(result.lastInsertRowid)]);
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.run(
    "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, hashSecret(token), expiresAt]
  );
  db.run("UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
  return { token, expiresAt };
}

function withSession(user) {
  const session = createSession(user.id);
  return { user: publicUser(user), session };
}

function signup(payload = {}) {
  const name = normalizeName(payload.name);
  const phone = safePhone(payload.phone);
  const email = cleanEmail(payload.email);
  const password = String(payload.password || "");
  if (!name || name.length < 2) throw new Error("Name is required.");
  if (phone.length < 10) throw new Error("A valid 10-digit mobile number is required.");
  if (!email) throw new Error("A valid email address is required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const user = upsertUser({ name, phone, email, password, provider: "manual", phoneVerified: false, emailVerified: false });
  return withSession(user);
}

function login(payload = {}) {
  const identifier = safeString(payload.identifier || payload.user_id || "", 180);
  const password = String(payload.password || "");
  const phone = safePhone(identifier);
  const email = cleanEmail(identifier);
  const user = findUser({ phone, email });
  if (!user || !verifyPassword(password, user.password_hash)) throw new Error("Invalid mobile/email or password.");
  if ((user.account_status || "active") !== "active") throw new Error("Account is not active.");
  return withSession(user);
}

function issueOtp(payload = {}) {
  const phone = safePhone(payload.phone);
  if (phone.length < 10) throw new Error("A valid 10-digit mobile number is required.");
  const name = normalizeName(payload.name);
  const email = cleanEmail(payload.email);
  const purpose = safeString(payload.purpose || "login", 40) || "login";
  const user = upsertUser({ name, phone, email, provider: purpose === "gmail_link" ? "gmail" : "otp" });
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  db.run(
    "INSERT INTO auth_otps (phone, code_hash, purpose, metadata_json, expires_at) VALUES (?, ?, ?, ?, ?)",
    [phone, hashSecret(`${phone}:${code}:${config.adminApiToken}`), purpose, JSON.stringify({ name, email }), expiresAt]
  );
  return {
    ok: true,
    user: publicUser(user),
    phone,
    expiresAt,
    devOtp: OTP_DEV_MODE ? code : undefined,
    message: OTP_DEV_MODE ? `Demo OTP: ${code}` : "OTP sent."
  };
}

function verifyOtp(payload = {}) {
  const phone = safePhone(payload.phone);
  const otp = safeString(payload.otp, 8);
  if (phone.length < 10 || !otp) throw new Error("Mobile number and OTP are required.");
  const row = db.get(
    `SELECT * FROM auth_otps
     WHERE phone = ? AND consumed_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [phone]
  );
  if (!row) throw new Error("OTP not found. Please request a new OTP.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("OTP expired. Please request a new OTP.");
  if (row.attempts >= 5) throw new Error("Too many OTP attempts. Please request a new OTP.");

  db.run("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?", [row.id]);
  const expected = hashSecret(`${phone}:${otp}:${config.adminApiToken}`);
  if (!timingSafeEqualString(expected, row.code_hash)) throw new Error("Invalid OTP.");

  let metadata = {};
  try { metadata = JSON.parse(row.metadata_json || "{}"); } catch { metadata = {}; }
  const user = upsertUser({
    name: metadata.name || "Customer",
    phone,
    email: metadata.email || "",
    provider: row.purpose === "gmail_link" ? "gmail" : "otp",
    phoneVerified: true,
    emailVerified: row.purpose === "gmail_link" && Boolean(metadata.email)
  });
  db.run("UPDATE auth_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [row.id]);
  return withSession(user);
}

function resetPassword(payload = {}) {
  const phone = safePhone(payload.phone);
  const otp = safeString(payload.otp, 8);
  const password = String(payload.password || "");
  if (phone.length < 10 || !otp) throw new Error("Mobile number and OTP are required.");
  if (password.length < 8) throw new Error("New password must be at least 8 characters.");

  const row = db.get(
    `SELECT * FROM auth_otps
     WHERE phone = ? AND consumed_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [phone]
  );
  if (!row) throw new Error("OTP not found. Please request a new OTP.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("OTP expired. Please request a new OTP.");
  if (row.attempts >= 5) throw new Error("Too many attempts. Please request a new OTP.");

  db.run("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?", [row.id]);
  const expected = hashSecret(`${phone}:${otp}:${config.adminApiToken}`);
  if (!timingSafeEqualString(expected, row.code_hash)) throw new Error("Invalid OTP. Please try again.");

  const user = findUser({ phone });
  if (!user) throw new Error("No account found with this mobile number.");

  const passwordHash = hashPassword(password);
  db.run("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [passwordHash, user.id]);
  db.run("UPDATE auth_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [row.id]);

  const updated = db.get("SELECT * FROM users WHERE id = ?", [user.id]);
  return withSession(updated);
}

function gmailStart(payload = {}) {
  const email = cleanEmail(payload.email);
  const phone = safePhone(payload.phone);
  const name = normalizeName(payload.name || email.split("@")[0]);
  const domain = email.split("@").pop() || "";
  if (!email || !["gmail.com", "googlemail.com"].includes(domain)) {
    throw new Error("Please use a valid Gmail address.");
  }
  if (phone.length < 10) throw new Error("Mobile number is required to link existing orders.");
  upsertUser({ name, phone, email, provider: "gmail", emailVerified: true });
  return issueOtp({ name, phone, email, purpose: "gmail_link" });
}

function me(token) {
  const tokenHash = hashSecret(token || "");
  const session = db.get(
    `SELECT s.*, u.*
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
     LIMIT 1`,
    [tokenHash, new Date().toISOString()]
  );
  if (!session) throw new Error("Session expired or invalid.");
  return { user: publicUser(session) };
}

module.exports = {
  signup,
  login,
  issueOtp,
  verifyOtp,
  gmailStart,
  resetPassword,
  me
};
