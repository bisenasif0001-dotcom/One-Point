"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { config } = require("./config");
const { products, services } = require("./catalog");

let database;

function ensureDatabase() {
  if (database) return database;

  const databasePath = config.databaseUrl.startsWith("file:")
    ? new URL(config.databaseUrl)
    : config.databaseUrl;
  if (typeof databasePath === "string") fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA journal_mode = WAL;");
  const schema = fs.readFileSync(path.join(__dirname, "migrations", "001_payments_schema.sql"), "utf8")
    .replace(/CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_reference[\s\S]*?;\s*/m, "");
  database.exec(schema);
  ensureRuntimeMigrations(database);
  seedCatalog(database);
  return database;
}

function ensureRuntimeMigrations(db) {
  const orderColumns = db.prepare("PRAGMA table_info(orders)").all();
  if (!orderColumns.some((column) => column.name === "client_reference")) {
    db.exec("ALTER TABLE orders ADD COLUMN client_reference TEXT;");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_reference ON orders(client_reference) WHERE client_reference IS NOT NULL;");

  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasUserColumn = (name) => userColumns.some((column) => column.name === name);
  if (!hasUserColumn("password_hash")) db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
  if (!hasUserColumn("auth_provider")) db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'checkout';");
  if (!hasUserColumn("phone_verified")) db.exec("ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0;");
  if (!hasUserColumn("email_verified")) db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;");
  if (!hasUserColumn("last_login_at")) db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT;");
  if (!hasUserColumn("account_status")) db.exec("ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';");
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'login',
      metadata_json TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_auth_otps_phone_created ON auth_otps(phone, created_at);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, created_at);");

  const serviceColumns = db.prepare("PRAGMA table_info(services)").all();
  const hasServiceColumn = (name) => serviceColumns.some((column) => column.name === name);
  if (!hasServiceColumn("duration")) db.exec("ALTER TABLE services ADD COLUMN duration TEXT;");
  if (!hasServiceColumn("icon")) db.exec("ALTER TABLE services ADD COLUMN icon TEXT;");
  if (!hasServiceColumn("sla")) db.exec("ALTER TABLE services ADD COLUMN sla TEXT;");
  if (!hasServiceColumn("required_docs_json")) db.exec("ALTER TABLE services ADD COLUMN required_docs_json TEXT NOT NULL DEFAULT '[]';");
  if (!hasServiceColumn("automation_count")) db.exec("ALTER TABLE services ADD COLUMN automation_count INTEGER NOT NULL DEFAULT 0;");

  const productColumns = db.prepare("PRAGMA table_info(products)").all();
  const hasProductColumn = (name) => productColumns.some((column) => column.name === name);
  if (!hasProductColumn("duration")) db.exec("ALTER TABLE products ADD COLUMN duration TEXT;");
  if (!hasProductColumn("icon")) db.exec("ALTER TABLE products ADD COLUMN icon TEXT;");
  if (!hasProductColumn("sla")) db.exec("ALTER TABLE products ADD COLUMN sla TEXT;");
  if (!hasProductColumn("required_docs_json")) db.exec("ALTER TABLE products ADD COLUMN required_docs_json TEXT NOT NULL DEFAULT '[]';");
  if (!hasProductColumn("automation_count")) db.exec("ALTER TABLE products ADD COLUMN automation_count INTEGER NOT NULL DEFAULT 0;");

  // Migration 002: Workflow Engine
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      phone       TEXT    NOT NULL UNIQUE,
      email       TEXT,
      role        TEXT    NOT NULL DEFAULT 'agent',
      skills      TEXT    NOT NULL DEFAULT '[]',
      is_active   INTEGER NOT NULL DEFAULT 1,
      max_tasks   INTEGER NOT NULL DEFAULT 10,
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active, role);

    CREATE TABLE IF NOT EXISTS task_assignments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id        INTEGER NOT NULL REFERENCES orders(id),
      staff_id        INTEGER NOT NULL REFERENCES staff(id),
      assigned_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      accepted_at     TEXT,
      completed_at    TEXT,
      status          TEXT    NOT NULL DEFAULT 'assigned',
      priority        TEXT    NOT NULL DEFAULT 'normal',
      notes           TEXT,
      admin_notes     TEXT,
      updated_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_assignments_order  ON task_assignments(order_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_staff  ON task_assignments(staff_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_status ON task_assignments(status);

    CREATE TABLE IF NOT EXISTS order_documents (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id        INTEGER NOT NULL REFERENCES orders(id),
      doc_type        TEXT    NOT NULL,
      file_name       TEXT    NOT NULL,
      file_path       TEXT,
      file_url        TEXT,
      mime_type       TEXT,
      file_size_bytes INTEGER,
      uploaded_by     TEXT    NOT NULL DEFAULT 'customer',
      verified        INTEGER NOT NULL DEFAULT 0,
      verified_by     INTEGER,
      verified_at     TEXT,
      created_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_docs_order    ON order_documents(order_id);
    CREATE INDEX IF NOT EXISTS idx_docs_verified ON order_documents(verified);

    CREATE TABLE IF NOT EXISTS bot_checks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id        INTEGER NOT NULL REFERENCES orders(id),
      check_type      TEXT    NOT NULL DEFAULT 'initial',
      status          TEXT    NOT NULL DEFAULT 'pending',
      payment_ok      INTEGER NOT NULL DEFAULT 0,
      docs_ok         INTEGER NOT NULL DEFAULT 0,
      fields_ok       INTEGER NOT NULL DEFAULT 0,
      missing_items   TEXT    NOT NULL DEFAULT '[]',
      reminder_sent   INTEGER NOT NULL DEFAULT 0,
      auto_assigned   INTEGER NOT NULL DEFAULT 0,
      checked_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_bot_checks_order  ON bot_checks(order_id);
    CREATE INDEX IF NOT EXISTS idx_bot_checks_status ON bot_checks(status);

    CREATE TABLE IF NOT EXISTS automation_rules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      trigger     TEXT    NOT NULL,
      conditions  TEXT    NOT NULL DEFAULT '{}',
      actions     TEXT    NOT NULL DEFAULT '[]',
      is_active   INTEGER NOT NULL DEFAULT 1,
      run_count   INTEGER NOT NULL DEFAULT 0,
      last_run_at TEXT,
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default automation rules (ignore if already exists)
  const ruleCount = db.prepare("SELECT COUNT(*) AS n FROM automation_rules").get();
  if (ruleCount && ruleCount.n === 0) {
    const ruleStmt = db.prepare("INSERT INTO automation_rules (name, trigger, conditions, actions) VALUES (?, ?, ?, ?)");
    ruleStmt.run('Auto reply on order created',   'order.created',    '{}', '[{"type":"notify","channels":["sms","whatsapp"],"template":"order_created"}]');
    ruleStmt.run('Auto reply on payment success', 'payment.captured', '{}', '[{"type":"notify","channels":["sms","whatsapp"],"template":"payment_success"},{"type":"bot_check"}]');
    ruleStmt.run('Reminder for missing docs',     'doc.missing',      '{}', '[{"type":"notify","channels":["whatsapp"],"template":"docs_reminder"}]');
    ruleStmt.run('Notify admin on assignment',    'order.assigned',   '{}', '[{"type":"notify_staff","channels":["whatsapp","sms"]}]');
    ruleStmt.run('Customer complete notify',      'order.completed',  '{}', '[{"type":"notify","channels":["whatsapp","sms"],"template":"order_completed"}]');
  }

  // Seed default staff members
  const staffCount = db.prepare("SELECT COUNT(*) AS n FROM staff").get();
  if (staffCount && staffCount.n === 0) {
    const staffStmt = db.prepare(`
      INSERT INTO staff (name, phone, email, role, skills, max_tasks)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    staffStmt.run("Kabir (EMP-AI-108)", "9999999108", "kabir@bisenonepoint.com", "admin", JSON.stringify(["Pan Card", "Passport", "Aadhaar", "GST Registration"]), 15);
    staffStmt.run("Asif Bisen", "9473946181", "asif@bisenonepoint.com", "admin", JSON.stringify(["Pan Card", "Aadhaar", "GST Registration"]), 10);
    staffStmt.run("Sharma Operator", "9876543210", "sharma@bisenonepoint.com", "agent", JSON.stringify(["Typing", "Scanning", "Printing"]), 8);
  }

  // Support Tickets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id   TEXT    NOT NULL UNIQUE,
      customer_phone TEXT,
      customer_name  TEXT,
      subject     TEXT    NOT NULL,
      message     TEXT,
      order_id    TEXT,
      status      TEXT    NOT NULL DEFAULT 'open',
      assigned_to TEXT,
      reply       TEXT,
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_phone  ON support_tickets(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
  `);

  // Add workflow columns to orders table
  const orderCols = db.prepare("PRAGMA table_info(orders)").all();
  const hasOrderCol = (name) => orderCols.some((c) => c.name === name);
  if (!hasOrderCol("bot_check_status"))      db.exec("ALTER TABLE orders ADD COLUMN bot_check_status TEXT NOT NULL DEFAULT 'pending';");
  if (!hasOrderCol("assigned_to"))           db.exec("ALTER TABLE orders ADD COLUMN assigned_to INTEGER;");
  if (!hasOrderCol("assignment_priority"))   db.exec("ALTER TABLE orders ADD COLUMN assignment_priority TEXT NOT NULL DEFAULT 'normal';");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  loadSettingsIntoConfig(db);
}

function seedCatalog(db = ensureDatabase()) {
  const productStmt = db.prepare(`
    INSERT INTO products (slug, name, category, image_url, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      image_url = excluded.image_url,
      price_paise = excluded.price_paise,
      tax_rate = excluded.tax_rate,
      duration = excluded.duration,
      icon = excluded.icon,
      sla = excluded.sla,
      required_docs_json = excluded.required_docs_json,
      automation_count = excluded.automation_count
  `);
  for (const product of products) {
    productStmt.run(
      product.slug,
      product.name,
      product.category,
      product.image,
      product.price * 100,
      product.taxRate,
      product.duration || "2-4 Days",
      product.icon || "shopping-bag",
      product.sla || "95%",
      JSON.stringify(product.requiredDocs || ["Design reference", "Contact details"]),
      Number(product.automationCount || 1)
    );
  }

  const serviceStmt = db.prepare(`
    INSERT INTO services (slug, name, category, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      price_paise = excluded.price_paise,
      tax_rate = excluded.tax_rate,
      duration = excluded.duration,
      icon = excluded.icon,
      sla = excluded.sla,
      required_docs_json = excluded.required_docs_json,
      automation_count = excluded.automation_count
  `);
  for (const service of services) {
    serviceStmt.run(
      service.slug,
      service.name,
      service.category,
      service.price * 100,
      service.taxRate,
      service.duration || "1-3 Days",
      service.icon || "layers",
      service.sla || "95%",
      JSON.stringify(service.requiredDocs || ["Identity proof", "Mobile number"]),
      Number(service.automationCount || 2)
    );
  }
}

function getDb() {
  return ensureDatabase();
}

function run(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}

function get(sql, params = []) {
  return getDb().prepare(sql).get(...params);
}

function all(sql, params = []) {
  return getDb().prepare(sql).all(...params);
}

function withTransaction(callback) {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = callback(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function logPayment({ orderDbId = null, paymentDbId = null, gateway = null, level = "info", event, message = "", payload = null }) {
  run(
    `INSERT INTO payment_logs (order_id, payment_id, gateway, level, event, message, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [orderDbId, paymentDbId, gateway, level, event, message, payload ? JSON.stringify(payload) : null]
  );
}

function insertWebhookLog({ gateway, event = null, transactionId = null, status, signatureValid = false, rawPayload, headers = {} }) {
  return run(
    `INSERT INTO webhook_logs (gateway, event, transaction_id, status, signature_valid, raw_payload, headers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [gateway, event, transactionId, status, signatureValid ? 1 : 0, rawPayload, JSON.stringify(headers)]
  );
}

function todayOrderDate() {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}`;
}

function nextOrderId(db) {
  const orderDate = todayOrderDate();
  db.prepare(`
    INSERT INTO order_sequences (order_date, last_number)
    VALUES (?, 0)
    ON CONFLICT(order_date) DO NOTHING
  `).run(orderDate);
  db.prepare(`
    UPDATE order_sequences
    SET last_number = last_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE order_date = ?
  `).run(orderDate);
  const row = db.prepare("SELECT last_number FROM order_sequences WHERE order_date = ?").get(orderDate);
  return `OPDS-${orderDate}-${String(row.last_number).padStart(6, "0")}`;
}

function loadSettingsIntoConfig(dbConn) {
  try {
    const rows = dbConn.prepare("SELECT key, value FROM settings").all();
    for (const row of rows) {
      const { key, value } = row;
      if (value === undefined || value === null) continue;
      
      switch (key) {
        case "businessName":
          config.business.name = value;
          process.env.BUSINESS_NAME = value;
          break;
        case "gstin":
          config.business.gstNumber = value;
          process.env.BUSINESS_GST_NUMBER = value;
          break;
        case "address":
          config.business.address = value;
          process.env.BUSINESS_ADDRESS = value;
          break;
        case "phone":
          config.business.phone = value;
          process.env.BUSINESS_PHONE = value;
          break;
        case "email":
          config.business.email = value;
          process.env.BUSINESS_EMAIL = value;
          break;
        case "razorpay":
          config.razorpay.keyId = value;
          process.env.RAZORPAY_KEY_ID = value;
          break;
        case "razorpaySecret":
          config.razorpay.keySecret = value;
          process.env.RAZORPAY_KEY_SECRET = value;
          if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
            config.razorpay.webhookSecret = value;
          }
          break;
        case "whatsappToken":
          config.notifications.whatsappWebhookUrl = value;
          process.env.WHATSAPP_NOTIFICATION_WEBHOOK_URL = value;
          break;
        case "smsWebhook":
          config.notifications.smsWebhookUrl = value;
          process.env.SMS_NOTIFICATION_WEBHOOK_URL = value;
          break;
        case "adminToken":
          config.adminApiToken = value;
          process.env.ADMIN_API_TOKEN = value;
          break;
      }
    }
  } catch (err) {
    console.error("Failed to load settings from DB:", err);
  }
}

function saveSettings(settingsObj) {
  return withTransaction((dbConn) => {
    const stmt = dbConn.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    for (const [key, value] of Object.entries(settingsObj)) {
      stmt.run(key, value !== null && value !== undefined ? String(value) : "");
    }
    loadSettingsIntoConfig(dbConn);
    return getSettings(dbConn);
  });
}

function getSettings(dbConn = getDb()) {
  const rows = dbConn.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  
  const parseBool = (val, def) => {
    if (val === undefined || val === null) return def;
    return val === "true" || val === "1" || val === 1 || val === true;
  };

  return {
    businessName: settings.businessName !== undefined ? settings.businessName : (config.business.name || ""),
    gstin: settings.gstin !== undefined ? settings.gstin : (config.business.gstNumber || ""),
    address: settings.address !== undefined ? settings.address : (config.business.address || ""),
    phone: settings.phone !== undefined ? settings.phone : (config.business.phone || ""),
    email: settings.email !== undefined ? settings.email : (config.business.email || ""),
    razorpay: settings.razorpay !== undefined ? settings.razorpay : (config.razorpay.keyId || ""),
    razorpaySecret: settings.razorpaySecret !== undefined ? settings.razorpaySecret : (config.razorpay.keySecret || ""),
    whatsappToken: settings.whatsappToken !== undefined ? settings.whatsappToken : (config.notifications.whatsappWebhookUrl || ""),
    smsWebhook: settings.smsWebhook !== undefined ? settings.smsWebhook : (config.notifications.smsWebhookUrl || ""),
    adminToken: settings.adminToken !== undefined ? settings.adminToken : (config.adminApiToken || ""),
    twoFA: parseBool(settings.twoFA, true),
    sessionTimeout: settings.sessionTimeout || "30",
    emailAlerts: parseBool(settings.emailAlerts, true),
    whatsappAlerts: parseBool(settings.whatsappAlerts, true),
    smsAlerts: parseBool(settings.smsAlerts, false),
    autoVerify: parseBool(settings.autoVerify, true),
    autoWhatsApp: parseBool(settings.autoWhatsApp, true)
  };
}

module.exports = {
  getDb,
  run,
  get,
  all,
  withTransaction,
  logPayment,
  insertWebhookLog,
  nextOrderId,
  saveSettings,
  getSettings
};
