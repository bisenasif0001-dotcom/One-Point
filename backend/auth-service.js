"use strict";

const crypto = require("node:crypto");
const db = require("./db");
const customerService = require("./customer-service");
const { config } = require("./config");
const { safePhone, safeString, timingSafeEqualString } = require("./utils");
const { getCustomerOtpHashSalt } = require("./security/security-policy");

const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;
const GOOGLE_FLOW_TTL_MS = 10 * 60 * 1000;
const GOOGLE_HANDOFF_TTL_MS = 2 * 60 * 1000;
const OTP_DEV_MODE = process.env.NODE_ENV !== "production";
const googleAuthStates = new Map();
const googleSessionHandoffs = new Map();
const microsoftAuthStates = new Map();
const microsoftSessionHandoffs = new Map();

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
  const customer360 = safeCustomer360(row.id);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    address: row.address || "",
    authProvider: row.auth_provider || "checkout",
    phoneVerified: Boolean(row.phone_verified),
    emailVerified: Boolean(row.email_verified),
    accountStatus: row.account_status || "active",
    object: db.getUniversalObjectPayload("users", row.id),
    customer360
  };
}

function ensureCustomerProfile(row) {
  if (!row?.id) return;
  try {
    customerService.ensureCustomerProfileForUser(row.id);
  } catch (error) {
    console.warn("[customer-profile] sync skipped:", error.message);
  }
}

function safeCustomer360(userId) {
  try {
    return customerService.customerDashboardProjection(
      customerService.getCustomer360ByUserId(userId, { recordLifecycle: false })
    );
  } catch (error) {
    console.warn("[customer-profile] summary skipped:", error.message);
    return null;
  }
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
    const updated = db.get("SELECT * FROM users WHERE id = ?", [existing.id]);
    ensureCustomerProfile(updated);
    return updated;
  }

  const result = db.run(
    `INSERT INTO users (name, phone, email, address, password_hash, auth_provider, phone_verified, email_verified, account_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [displayName, cleanPhone || "", cleanMail || null, safeString(address, 240) || null, passwordHash, provider, phoneVerified ? 1 : 0, emailVerified ? 1 : 0]
  );
  const created = db.get("SELECT * FROM users WHERE id = ?", [Number(result.lastInsertRowid)]);
  ensureCustomerProfile(created);
  return created;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.run(
    "INSERT INTO auth_sessions (user_id, token_hash, expires_at, last_seen_at) VALUES (?, ?, ?, ?)",
    [userId, hashSecret(token), expiresAt, now]
  );
  db.run("UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
  return { token, expiresAt };
}

function withSession(user) {
  const session = createSession(user.id);
  return { user: publicUser(user), session };
}

function cleanTransientGoogleState() {
  const now = Date.now();
  for (const [key, value] of googleAuthStates) {
    if (!value || value.expiresAt <= now) googleAuthStates.delete(key);
  }
  for (const [key, value] of googleSessionHandoffs) {
    if (!value || value.expiresAt <= now) googleSessionHandoffs.delete(key);
  }
}

function safeReturnPath(value) {
  const target = safeString(value, 500);
  if (!target || !target.startsWith("/") || target.startsWith("//") || /^\/\\/.test(target)) return "";
  return target;
}

function safeAuthEntry(value) {
  return value === "signup" ? "signup" : "login";
}

function cleanTransientMicrosoftState() {
  const now = Date.now();
  for (const [key, value] of microsoftAuthStates) {
    if (!value || value.expiresAt <= now) microsoftAuthStates.delete(key);
  }
  for (const [key, value] of microsoftSessionHandoffs) {
    if (!value || value.expiresAt <= now) microsoftSessionHandoffs.delete(key);
  }
}

function getOAuthEntry(provider, state) {
  const stateKey = safeString(state, 100);
  const record = provider === "microsoft"
    ? microsoftAuthStates.get(stateKey)
    : googleAuthStates.get(stateKey);
  return safeAuthEntry(record?.entry);
}

function googleStatus() {
  return {
    configured: Boolean(config.google.clientId && config.google.clientSecret && config.google.redirectUri),
    provider: "google"
  };
}

function beginGoogleSignIn(payload = {}) {
  if (!googleStatus().configured) {
    throw new Error("Google Sign-In is not configured yet.");
  }
  cleanTransientGoogleState();
  const state = crypto.randomBytes(32).toString("hex");
  googleAuthStates.set(state, {
    expiresAt: Date.now() + GOOGLE_FLOW_TTL_MS,
    returnUrl: safeReturnPath(payload.returnUrl),
    entry: safeAuthEntry(payload.entry)
  });

  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    include_granted_scopes: "true"
  }).toString();
  return { authorizationUrl: authorizationUrl.toString() };
}

async function finishGoogleSignIn(payload = {}) {
  cleanTransientGoogleState();
  const state = safeString(payload.state, 100);
  const code = safeString(payload.code, 4096);
  const stateRecord = googleAuthStates.get(state);
  googleAuthStates.delete(state);
  if (!stateRecord || stateRecord.expiresAt <= Date.now()) {
    throw new Error("Google Sign-In session expired. Please try again.");
  }
  if (!code) throw new Error("Google did not return an authorization code.");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: "authorization_code"
    })
  });
  const tokens = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokens.access_token) {
    throw new Error("Google Sign-In could not be completed. Please try again.");
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) {
    throw new Error("Google account email could not be verified.");
  }

  const user = upsertUser({
    name: profile.name || profile.given_name || "Google Customer",
    email: profile.email,
    provider: "google",
    emailVerified: true
  });
  const result = withSession(user);
  const handoff = crypto.randomBytes(32).toString("hex");
  googleSessionHandoffs.set(handoff, {
    expiresAt: Date.now() + GOOGLE_HANDOFF_TTL_MS,
    result,
    returnUrl: stateRecord.returnUrl || ""
  });
  return { handoff, entry: stateRecord.entry };
}

function completeGoogleHandoff(payload = {}) {
  cleanTransientGoogleState();
  const handoff = safeString(payload.handoff, 100);
  const record = googleSessionHandoffs.get(handoff);
  googleSessionHandoffs.delete(handoff);
  if (!record || record.expiresAt <= Date.now()) {
    throw new Error("Google Sign-In handoff expired. Please start again.");
  }
  return { ...record.result, returnUrl: record.returnUrl };
}

function microsoftStatus() {
  return {
    configured: Boolean(config.microsoft.clientId && config.microsoft.clientSecret && config.microsoft.redirectUri),
    provider: "microsoft"
  };
}

function microsoftTenant() {
  const tenant = safeString(config.microsoft.tenant, 100) || "common";
  if (!/^(?:common|organizations|consumers|[a-z0-9.-]+)$/i.test(tenant)) {
    throw new Error("Microsoft tenant configuration is invalid.");
  }
  return tenant;
}

function beginMicrosoftSignIn(payload = {}) {
  if (!microsoftStatus().configured) {
    throw new Error("Microsoft Sign-In is not configured yet.");
  }
  cleanTransientMicrosoftState();
  const state = crypto.randomBytes(32).toString("hex");
  microsoftAuthStates.set(state, {
    expiresAt: Date.now() + GOOGLE_FLOW_TTL_MS,
    returnUrl: safeReturnPath(payload.returnUrl),
    entry: safeAuthEntry(payload.entry)
  });

  const authorizationUrl = new URL(`https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize`);
  authorizationUrl.search = new URLSearchParams({
    client_id: config.microsoft.clientId,
    redirect_uri: config.microsoft.redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: "openid profile email User.Read",
    state,
    prompt: "select_account"
  }).toString();
  return { authorizationUrl: authorizationUrl.toString() };
}

async function finishMicrosoftSignIn(payload = {}) {
  cleanTransientMicrosoftState();
  const state = safeString(payload.state, 100);
  const code = safeString(payload.code, 4096);
  const stateRecord = microsoftAuthStates.get(state);
  microsoftAuthStates.delete(state);
  if (!stateRecord || stateRecord.expiresAt <= Date.now()) {
    throw new Error("Microsoft Sign-In session expired. Please try again.");
  }
  if (!code) throw new Error("Microsoft did not return an authorization code.");

  const tokenResponse = await fetch(`https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.microsoft.clientId,
      client_secret: config.microsoft.clientSecret,
      redirect_uri: config.microsoft.redirectUri,
      grant_type: "authorization_code",
      scope: "openid profile email User.Read"
    })
  });
  const tokens = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokens.access_token) {
    throw new Error("Microsoft Sign-In could not be completed. Please try again.");
  }

  const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const profile = await profileResponse.json().catch(() => ({}));
  const email = cleanEmail(profile.mail || profile.userPrincipalName || "");
  if (!profileResponse.ok || !profile.id || !email) {
    throw new Error("Microsoft account email could not be verified.");
  }

  const user = upsertUser({
    name: profile.displayName || "Microsoft Customer",
    email,
    provider: "microsoft",
    emailVerified: true
  });
  const result = withSession(user);
  const handoff = crypto.randomBytes(32).toString("hex");
  microsoftSessionHandoffs.set(handoff, {
    expiresAt: Date.now() + GOOGLE_HANDOFF_TTL_MS,
    result,
    returnUrl: stateRecord.returnUrl || ""
  });
  return { handoff, entry: stateRecord.entry };
}

function completeMicrosoftHandoff(payload = {}) {
  cleanTransientMicrosoftState();
  const handoff = safeString(payload.handoff, 100);
  const record = microsoftSessionHandoffs.get(handoff);
  microsoftSessionHandoffs.delete(handoff);
  if (!record || record.expiresAt <= Date.now()) {
    throw new Error("Microsoft Sign-In handoff expired. Please start again.");
  }
  return { ...record.result, returnUrl: record.returnUrl };
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
  // An OTP is commonly requested with only a phone number. Preserve the
  // already verified profile in that case instead of replacing its name with
  // the generic fallback "Customer".
  const existing = findUser({ phone });
  const suppliedName = safeString(payload.name, 120);
  const suppliedEmail = cleanEmail(payload.email);
  const name = suppliedName || existing?.name || "Customer";
  const email = suppliedEmail || existing?.email || "";
  const purpose = safeString(payload.purpose || "login", 40) || "login";
  const user = upsertUser({ name, phone, email, provider: purpose === "gmail_link" ? "gmail" : "otp" });
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const otpHashSalt = getCustomerOtpHashSalt(config);
  db.run(
    "INSERT INTO auth_otps (phone, code_hash, purpose, metadata_json, expires_at) VALUES (?, ?, ?, ?, ?)",
    [phone, hashSecret(`${phone}:${code}:${otpHashSalt}`), purpose, JSON.stringify({ name, email }), expiresAt]
  );
  return {
    ok: true,
    // Preserve the response field without exposing customer data before OTP verification.
    user: null,
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
  const expected = hashSecret(`${phone}:${otp}:${getCustomerOtpHashSalt(config)}`);
  if (!timingSafeEqualString(expected, row.code_hash)) throw new Error("Invalid OTP.");

  let metadata = {};
  try { metadata = JSON.parse(row.metadata_json || "{}"); } catch { metadata = {}; }
  const existing = findUser({ phone });
  const storedName = safeString(metadata.name, 120);
  const suppliedName = storedName && storedName.toLowerCase() !== "customer" ? storedName : "";
  const storedEmail = cleanEmail(metadata.email);
  const user = upsertUser({
    name: suppliedName || existing?.name || "Customer",
    phone,
    email: storedEmail || existing?.email || "",
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
  const expected = hashSecret(`${phone}:${otp}:${getCustomerOtpHashSalt(config)}`);
  if (!timingSafeEqualString(expected, row.code_hash)) throw new Error("Invalid OTP. Please try again.");

  const user = findUser({ phone });
  if (!user) throw new Error("No account found with this mobile number.");

  const passwordHash = hashPassword(password);
  db.run("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [passwordHash, user.id]);
  db.run("UPDATE auth_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [row.id]);

  const updated = db.get("SELECT * FROM users WHERE id = ?", [user.id]);
  return withSession(updated);
}

function logout(token) {
  const tokenHash = hashSecret(token || "");
  db.run("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL", [tokenHash]);
  return { ok: true };
}

function setPassword(userId, payload = {}) {
  const user = db.get("SELECT * FROM users WHERE id = ?", [Number(userId)]);
  if (!user) throw new Error("Customer account not found.");
  const otp = safeString(payload.otp, 8);
  const password = String(payload.password || "");
  if (!otp) throw new Error("OTP is required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const row = db.get(
    `SELECT * FROM auth_otps
     WHERE phone = ? AND consumed_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [user.phone]
  );
  if (!row) throw new Error("OTP not found. Please request a new OTP.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("OTP expired. Please request a new OTP.");
  if (row.attempts >= 5) throw new Error("Too many OTP attempts. Please request a new OTP.");

  db.run("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?", [row.id]);
  const expected = hashSecret(`${user.phone}:${otp}:${getCustomerOtpHashSalt(config)}`);
  if (!timingSafeEqualString(expected, row.code_hash)) throw new Error("Invalid OTP.");

  const passwordHash = hashPassword(password);
  db.run(
    "UPDATE users SET password_hash = ?, account_status = 'active', phone_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [passwordHash, user.id]
  );
  db.run("UPDATE auth_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [row.id]);

  const updated = db.get("SELECT * FROM users WHERE id = ?", [user.id]);
  return withSession(updated);
}

function changePassword(userId, payload = {}) {
  const user = db.get("SELECT * FROM users WHERE id = ?", [Number(userId)]);
  if (!user) throw new Error("Customer account not found.");
  const currentPassword = String(payload.currentPassword || "");
  const newPassword = String(payload.newPassword || "");
  if (!verifyPassword(currentPassword, user.password_hash)) throw new Error("Current password is incorrect.");
  if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");

  const passwordHash = hashPassword(newPassword);
  db.run("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [passwordHash, user.id]);
  return { ok: true };
}

function requestMobileVerification(userId, payload = {}) {
  const user = db.get("SELECT * FROM users WHERE id = ?", [Number(userId)]);
  if (!user) throw new Error("Customer account not found.");
  const targetPhone = safePhone(payload.phone || user.phone);
  if (targetPhone.length < 10) throw new Error("A valid 10-digit mobile number is required.");

  const owner = findUser({ phone: targetPhone });
  if (owner && Number(owner.id) !== Number(user.id)) {
    throw new Error("This mobile number is already registered with another account.");
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const otpHashSalt = getCustomerOtpHashSalt(config);
  db.run(
    "INSERT INTO auth_otps (phone, code_hash, purpose, metadata_json, expires_at) VALUES (?, ?, ?, ?, ?)",
    [targetPhone, hashSecret(`${targetPhone}:${code}:${otpHashSalt}`), "profile_mobile_verify", JSON.stringify({ userId: user.id }), expiresAt]
  );
  return {
    ok: true,
    phone: targetPhone,
    expiresAt,
    devOtp: OTP_DEV_MODE ? code : undefined,
    message: OTP_DEV_MODE ? `Demo OTP: ${code}` : "OTP sent."
  };
}

function confirmMobileVerification(userId, payload = {}) {
  const user = db.get("SELECT * FROM users WHERE id = ?", [Number(userId)]);
  if (!user) throw new Error("Customer account not found.");
  const targetPhone = safePhone(payload.phone || user.phone);
  const otp = safeString(payload.otp, 8);
  if (targetPhone.length < 10 || !otp) throw new Error("Mobile number and OTP are required.");

  const row = db.get(
    `SELECT * FROM auth_otps
     WHERE phone = ? AND purpose = 'profile_mobile_verify' AND consumed_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [targetPhone]
  );
  if (!row) throw new Error("OTP not found. Please request a new OTP.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("OTP expired. Please request a new OTP.");
  if (row.attempts >= 5) throw new Error("Too many OTP attempts. Please request a new OTP.");

  db.run("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?", [row.id]);
  const expected = hashSecret(`${targetPhone}:${otp}:${getCustomerOtpHashSalt(config)}`);
  if (!timingSafeEqualString(expected, row.code_hash)) throw new Error("Invalid OTP.");

  const owner = findUser({ phone: targetPhone });
  if (owner && Number(owner.id) !== Number(user.id)) {
    throw new Error("This mobile number is already registered with another account.");
  }

  db.run("UPDATE users SET phone = ?, phone_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [targetPhone, user.id]);
  db.run("UPDATE auth_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [row.id]);
  ensureCustomerProfile(db.get("SELECT * FROM users WHERE id = ?", [user.id]));

  return { user: publicUser(db.get("SELECT * FROM users WHERE id = ?", [user.id])) };
}

function requestEmailVerification(userId, payload = {}) {
  const user = db.get("SELECT * FROM users WHERE id = ?", [Number(userId)]);
  if (!user) throw new Error("Customer account not found.");
  const targetEmail = cleanEmail(payload.email || user.email);
  if (!targetEmail) throw new Error("A valid email address is required.");

  const owner = findUser({ email: targetEmail });
  if (owner && Number(owner.id) !== Number(user.id)) {
    throw new Error("This email address is already registered with another account.");
  }
  if (!user.phone) throw new Error("A verified mobile number is required before verifying email.");

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const otpHashSalt = getCustomerOtpHashSalt(config);
  db.run(
    "INSERT INTO auth_otps (phone, code_hash, purpose, metadata_json, expires_at) VALUES (?, ?, ?, ?, ?)",
    [user.phone, hashSecret(`${user.phone}:${code}:${otpHashSalt}`), "profile_email_verify", JSON.stringify({ userId: user.id, email: targetEmail }), expiresAt]
  );
  return {
    ok: true,
    email: targetEmail,
    expiresAt,
    devOtp: OTP_DEV_MODE ? code : undefined,
    message: OTP_DEV_MODE ? `Demo verification code: ${code}` : "Verification code sent."
  };
}

function confirmEmailVerification(userId, payload = {}) {
  const user = db.get("SELECT * FROM users WHERE id = ?", [Number(userId)]);
  if (!user) throw new Error("Customer account not found.");
  const otp = safeString(payload.otp, 8);
  if (!otp) throw new Error("Verification code is required.");

  const row = db.get(
    `SELECT * FROM auth_otps
     WHERE phone = ? AND purpose = 'profile_email_verify' AND consumed_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [user.phone]
  );
  if (!row) throw new Error("Verification code not found. Please request a new one.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Verification code expired. Please request a new one.");
  if (row.attempts >= 5) throw new Error("Too many attempts. Please request a new verification code.");

  db.run("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?", [row.id]);
  const expected = hashSecret(`${user.phone}:${otp}:${getCustomerOtpHashSalt(config)}`);
  if (!timingSafeEqualString(expected, row.code_hash)) throw new Error("Invalid verification code.");

  let metadata = {};
  try { metadata = JSON.parse(row.metadata_json || "{}"); } catch { metadata = {}; }
  const targetEmail = cleanEmail(metadata.email || "");
  if (!targetEmail) throw new Error("Verification request is invalid. Please start again.");

  const owner = findUser({ email: targetEmail });
  if (owner && Number(owner.id) !== Number(user.id)) {
    throw new Error("This email address is already registered with another account.");
  }

  db.run("UPDATE users SET email = ?, email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [targetEmail, user.id]);
  db.run("UPDATE auth_otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?", [row.id]);
  ensureCustomerProfile(db.get("SELECT * FROM users WHERE id = ?", [user.id]));

  return { user: publicUser(db.get("SELECT * FROM users WHERE id = ?", [user.id])) };
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
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TTL_MS).toISOString();
  const session = db.get(
    `SELECT s.*, u.*
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > ?
       AND datetime(COALESCE(s.last_seen_at, s.created_at)) > datetime(?)
     LIMIT 1`,
    [tokenHash, now.toISOString(), idleCutoff]
  );
  if (!session) throw new Error("Session expired or invalid.");
  db.run("UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ?", [now.toISOString(), tokenHash]);
  return { user: publicUser(session) };
}

module.exports = {
  signup,
  login,
  issueOtp,
  verifyOtp,
  gmailStart,
  googleStatus,
  beginGoogleSignIn,
  finishGoogleSignIn,
  completeGoogleHandoff,
  microsoftStatus,
  beginMicrosoftSignIn,
  finishMicrosoftSignIn,
  completeMicrosoftHandoff,
  getOAuthEntry,
  resetPassword,
  me,
  createSession,
  logout,
  setPassword,
  changePassword,
  requestMobileVerification,
  confirmMobileVerification,
  requestEmailVerification,
  confirmEmailVerification
};
