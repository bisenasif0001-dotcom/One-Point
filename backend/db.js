"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { config } = require("./config");
const { products, services } = require("./catalog");
const pricingEngine = require("./pricing-engine");
const universalObjectRepository = require("./repositories/universal-object-repository");
const databaseGovernanceService = require("./database-governance-service");
const apiIdentityGovernanceService = require("./api-identity-governance-service");
const eventGovernanceService = require("./event-governance-service");
const automationGovernanceService = require("./automation-governance-service");
const infrastructureGovernanceService = require("./infrastructure-governance-service");
const workflowGovernanceService = require("./workflow-governance-service");
const workflowRuntimeGovernanceService = require("./workflow-runtime-governance-service");
const humanTaskGovernanceService = require("./human-task-governance-service");
const aiGovernanceService = require("./ai-governance-service");
const productionRolloutGovernanceService = require("./production-rollout-governance-service");

let database;
let lastEnterpriseAiCommandCenterReport = null;
let lastProductionRolloutReport = null;
let lastEnterpriseHumanTaskReport = null;
let lastUniversalObjectMigrationReport = null;
let lastServiceDnaMigrationReport = null;
let lastOrderWorkflowMigrationReport = null;
let lastWorkforceExecutiveMigrationReport = null;
let lastEnterpriseIntelligenceMigrationReport = null;
let lastEnterpriseDatabaseEvolutionReport = null;
let lastEnterpriseApiIdentityPermissionReport = null;
let lastEnterpriseEventBusReport = null;
let lastEnterpriseAutomationIntegrationsToolGovernanceReport = null;
let lastEnterpriseInfrastructureReport = null;
let lastEnterpriseWorkflowReport = null;
let lastEnterpriseWorkflowRuntimeReport = null;


const { Pool } = require('pg');

class EROSDatabaseAdapter {
  constructor(sqliteDb, pgPool) {
    this.sqliteDb = sqliteDb;
    this.pgPool = pgPool;
  }
  exec(sql) {
    if (this.pgPool) {
      this.pgPool.query(sql).catch(() => {});
    }
    return this.sqliteDb.exec(sql);
  }
  prepare(sql) {
    return this.sqliteDb.prepare(sql);
  }
}

function ensureDatabase() {
  if (database) return database;

  const isPostgres = config.databaseUrl.startsWith("postgresql://") || config.databaseUrl.startsWith("postgres://");
  let pgPool = null;

  if (isPostgres) {
    try {
      pgPool = new Pool({ connectionString: config.databaseUrl });
    } catch (err) {
      // Fallback silently during unit testing
    }
  }

  // Fallback local SQLite storage for dev and validation
  const localDbUrl = "file:" + path.join(__dirname, "data", "opds-payments.sqlite");
  if (!fs.existsSync(path.join(__dirname, "data"))) {
    fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
  }

  const rawSqlite = new DatabaseSync(path.join(__dirname, "data", "opds-payments.sqlite"));
  rawSqlite.exec("PRAGMA foreign_keys = ON;");
  rawSqlite.exec("PRAGMA journal_mode = WAL;");

  database = new EROSDatabaseAdapter(rawSqlite, pgPool);

  const schema = fs.readFileSync(path.join(__dirname, "migrations", "001_payments_schema.sql"), "utf8")
    .replace(/CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_reference[\s\S]*?;\s*/m, "");
  database.exec(schema);
  ensureRuntimeMigrations(database);
  seedCatalog(rawSqlite);
  applyUniversalBusinessObjectFoundation(rawSqlite);
  applyCustomerDigitalGenomeFoundation(rawSqlite);
  applyUniversalServiceEngineFoundation(rawSqlite);
  applyOrderOrchestrationFoundation(rawSqlite);
  applyDocumentIntelligenceFoundation(rawSqlite);
  applyCustomerPrivacyRetentionFoundation(rawSqlite);
  applyCustomerExperienceOmnichannelFoundation(rawSqlite);
  applyWorkforceBranchExecutiveFoundation(rawSqlite);
  applyEnterpriseIntelligenceFoundation(rawSqlite);
  applyEnterpriseDatabaseEvolutionFoundation(rawSqlite);
  applyEnterpriseApiIdentityPermissionFoundation(rawSqlite);
  applyEnterpriseEventBusFoundation(rawSqlite);
  applyEnterpriseAutomationIntegrationsToolGovernance(rawSqlite);
  applyEnterpriseInfrastructure(rawSqlite);
  applyEnterpriseWorkflowEngineFoundation(rawSqlite);
  applyEnterpriseWorkflowRuntimeGovernance(rawSqlite);
  applyEnterpriseHumanTaskWorkQueueFoundation(rawSqlite);
  applyEnterpriseAiCommandCenter(rawSqlite);
  applyProductionRolloutEnterpriseValidation(rawSqlite);
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
  const authSessionColumns = db.prepare("PRAGMA table_info(auth_sessions)").all();
  const hasAuthSessionColumn = (name) => authSessionColumns.some((column) => column.name === name);
  if (!hasAuthSessionColumn("last_seen_at")) db.exec("ALTER TABLE auth_sessions ADD COLUMN last_seen_at TEXT;");
  db.exec("UPDATE auth_sessions SET last_seen_at = COALESCE(last_seen_at, created_at);");

  const customerProfileColumns = db.prepare("PRAGMA table_info(customer_profiles)").all();
  const hasCustomerProfileColumn = (name) => customerProfileColumns.some((column) => column.name === name);
  if (!hasCustomerProfileColumn("address_line_2")) db.exec("ALTER TABLE customer_profiles ADD COLUMN address_line_2 TEXT;");
  if (!hasCustomerProfileColumn("landmark")) db.exec("ALTER TABLE customer_profiles ADD COLUMN landmark TEXT;");
  if (!hasCustomerProfileColumn("district")) db.exec("ALTER TABLE customer_profiles ADD COLUMN district TEXT;");
  if (!hasCustomerProfileColumn("country")) db.exec("ALTER TABLE customer_profiles ADD COLUMN country TEXT NOT NULL DEFAULT 'India';");

  const serviceColumns = db.prepare("PRAGMA table_info(services)").all();
  const hasServiceColumn = (name) => serviceColumns.some((column) => column.name === name);
  if (!hasServiceColumn("duration")) db.exec("ALTER TABLE services ADD COLUMN duration TEXT;");
  if (!hasServiceColumn("icon")) db.exec("ALTER TABLE services ADD COLUMN icon TEXT;");
  if (!hasServiceColumn("sla")) db.exec("ALTER TABLE services ADD COLUMN sla TEXT;");
  if (!hasServiceColumn("required_docs_json")) db.exec("ALTER TABLE services ADD COLUMN required_docs_json TEXT NOT NULL DEFAULT '[]';");
  if (!hasServiceColumn("automation_count")) db.exec("ALTER TABLE services ADD COLUMN automation_count INTEGER NOT NULL DEFAULT 0;");
  if (!hasServiceColumn("sub_category")) db.exec("ALTER TABLE services ADD COLUMN sub_category TEXT;");
  if (!hasServiceColumn("variant")) db.exec("ALTER TABLE services ADD COLUMN variant TEXT NOT NULL DEFAULT 'Standard';");
  if (!hasServiceColumn("pricing_model")) db.exec("ALTER TABLE services ADD COLUMN pricing_model TEXT NOT NULL DEFAULT 'all_inclusive';");
  if (!hasServiceColumn("government_fee_paise")) db.exec("ALTER TABLE services ADD COLUMN government_fee_paise INTEGER NOT NULL DEFAULT 0;");
  if (!hasServiceColumn("operator_fee_paise")) db.exec("ALTER TABLE services ADD COLUMN operator_fee_paise INTEGER NOT NULL DEFAULT 0;");
  if (!hasServiceColumn("convenience_fee_paise")) db.exec("ALTER TABLE services ADD COLUMN convenience_fee_paise INTEGER NOT NULL DEFAULT 0;");
  if (!hasServiceColumn("gst_rate")) db.exec("ALTER TABLE services ADD COLUMN gst_rate REAL NOT NULL DEFAULT 0;");
  if (!hasServiceColumn("offer_price_paise")) db.exec("ALTER TABLE services ADD COLUMN offer_price_paise INTEGER;");
  if (!hasServiceColumn("display_price")) db.exec("ALTER TABLE services ADD COLUMN display_price TEXT;");
  if (!hasServiceColumn("customer_price_note")) db.exec("ALTER TABLE services ADD COLUMN customer_price_note TEXT;");
  if (!hasServiceColumn("internal_notes")) db.exec("ALTER TABLE services ADD COLUMN internal_notes TEXT;");
  if (!hasServiceColumn("popular")) db.exec("ALTER TABLE services ADD COLUMN popular INTEGER NOT NULL DEFAULT 0;");
  if (!hasServiceColumn("featured")) db.exec("ALTER TABLE services ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;");
  if (!hasServiceColumn("homepage_visibility")) db.exec("ALTER TABLE services ADD COLUMN homepage_visibility INTEGER NOT NULL DEFAULT 0;");
  if (!hasServiceColumn("last_updated")) db.exec("ALTER TABLE services ADD COLUMN last_updated TEXT;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS service_pricing_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_slug TEXT NOT NULL,
      variant_slug TEXT NOT NULL UNIQUE,
      service_name TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      category TEXT,
      sub_category TEXT,
      pricing_model TEXT NOT NULL DEFAULT 'all_inclusive',
      government_fee_paise INTEGER NOT NULL DEFAULT 0,
      operator_fee_paise INTEGER NOT NULL DEFAULT 0,
      convenience_fee_paise INTEGER NOT NULL DEFAULT 0,
      gst_rate REAL NOT NULL DEFAULT 0,
      offer_price_paise INTEGER,
      price_paise INTEGER NOT NULL DEFAULT 0,
      display_price TEXT,
      customer_price_note TEXT,
      duration TEXT,
      required_docs_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      popular INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      homepage_visibility INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      internal_notes TEXT,
      last_updated TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_service_pricing_variants_parent ON service_pricing_variants(parent_slug);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_service_pricing_variants_name ON service_pricing_variants(variant_name);");

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_service_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consent_id TEXT NOT NULL UNIQUE,
      service_slug TEXT NOT NULL,
      service_name TEXT NOT NULL,
      service_option TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      declaration_version TEXT NOT NULL,
      declaration_sha256 TEXT NOT NULL,
      accepted INTEGER NOT NULL CHECK (accepted = 1),
      accepted_at TEXT NOT NULL,
      destination_url TEXT NOT NULL,
      source_page TEXT NOT NULL,
      ip_hash TEXT,
      user_agent_hash TEXT,
      technical_details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_customer_service_consents_service_time
      ON customer_service_consents(service_slug, accepted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_customer_service_consents_phone_time
      ON customer_service_consents(customer_phone, accepted_at DESC);

    CREATE TRIGGER IF NOT EXISTS trg_customer_service_consents_append_only_update
    BEFORE UPDATE ON customer_service_consents
    FOR EACH ROW BEGIN
      SELECT RAISE(ABORT, 'customer_service_consents is append-only');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_customer_service_consents_append_only_delete
    BEFORE DELETE ON customer_service_consents
    FOR EACH ROW BEGIN
      SELECT RAISE(ABORT, 'customer_service_consents is append-only');
    END;
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
    INSERT INTO services (
      slug, name, category, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count,
      sub_category, variant, pricing_model, government_fee_paise, operator_fee_paise, convenience_fee_paise,
      gst_rate, offer_price_paise, display_price, customer_price_note, internal_notes, popular, featured,
      homepage_visibility, last_updated
    )
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      price_paise = excluded.price_paise,
      tax_rate = excluded.tax_rate,
      duration = excluded.duration,
      icon = excluded.icon,
      sla = excluded.sla,
      required_docs_json = excluded.required_docs_json,
      automation_count = excluded.automation_count,
      sub_category = excluded.sub_category,
      variant = excluded.variant,
      pricing_model = excluded.pricing_model,
      government_fee_paise = excluded.government_fee_paise,
      operator_fee_paise = excluded.operator_fee_paise,
      convenience_fee_paise = excluded.convenience_fee_paise,
      gst_rate = excluded.gst_rate,
      offer_price_paise = excluded.offer_price_paise,
      display_price = excluded.display_price,
      customer_price_note = excluded.customer_price_note,
      internal_notes = excluded.internal_notes,
      popular = excluded.popular,
      featured = excluded.featured,
      homepage_visibility = excluded.homepage_visibility,
      last_updated = excluded.last_updated
  `);
  for (const service of services) {
    const pricing = pricingEngine.normalizeServicePricing(service);
    serviceStmt.run(
      service.slug,
      service.name,
      service.category,
      pricing.pricePaise,
      0,
      service.duration || pricing.timeline || "1-3 Days",
      service.icon || "layers",
      service.sla || "95%",
      JSON.stringify(service.requiredDocs || pricing.requiredDocs || ["Identity proof", "Mobile number"]),
      Number(service.automationCount || 2),
      pricing.subCategory,
      pricing.variant || "Standard",
      pricing.pricingModel,
      pricing.governmentFeePaise,
      pricing.operatorFeePaise,
      pricing.convenienceFeePaise,
      pricing.gstRate,
      pricing.offerPricePaise,
      pricing.displayPrice,
      pricing.customerPriceNote,
      pricing.internalNotes,
      pricing.popular ? 1 : 0,
      pricing.featured ? 1 : 0,
      pricing.homepageVisibility ? 1 : 0,
      pricing.lastUpdated
    );
  }

  const variantStmt = db.prepare(`
    INSERT INTO service_pricing_variants (
      parent_slug, variant_slug, service_name, variant_name, category, sub_category, pricing_model,
      government_fee_paise, operator_fee_paise, convenience_fee_paise, gst_rate, offer_price_paise,
      price_paise, display_price, customer_price_note, duration, required_docs_json, status,
      popular, featured, homepage_visibility, description, internal_notes, last_updated, active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(variant_slug) DO UPDATE SET
      parent_slug = excluded.parent_slug,
      service_name = excluded.service_name,
      variant_name = excluded.variant_name,
      category = excluded.category,
      sub_category = excluded.sub_category,
      pricing_model = excluded.pricing_model,
      government_fee_paise = excluded.government_fee_paise,
      operator_fee_paise = excluded.operator_fee_paise,
      convenience_fee_paise = excluded.convenience_fee_paise,
      gst_rate = excluded.gst_rate,
      offer_price_paise = excluded.offer_price_paise,
      price_paise = excluded.price_paise,
      display_price = excluded.display_price,
      customer_price_note = excluded.customer_price_note,
      duration = excluded.duration,
      required_docs_json = excluded.required_docs_json,
      status = excluded.status,
      popular = excluded.popular,
      featured = excluded.featured,
      homepage_visibility = excluded.homepage_visibility,
      description = excluded.description,
      internal_notes = excluded.internal_notes,
      last_updated = excluded.last_updated,
      active = excluded.active
  `);
  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));
  for (const variant of pricingEngine.getServiceVariantSeeds()) {
    const parent = serviceBySlug.get(variant.parentSlug) || {};
    variantStmt.run(
      variant.parentSlug,
      variant.variantSlug,
      variant.serviceName,
      variant.variantName,
      parent.category || variant.category || "",
      variant.subCategory || parent.category || "",
      variant.pricingModel,
      variant.governmentFeePaise,
      variant.operatorFeePaise,
      variant.convenienceFeePaise,
      variant.gstRate,
      variant.offerPricePaise,
      variant.pricePaise,
      variant.displayPrice,
      variant.customerPriceNote,
      variant.timeline || parent.duration || "1-3 Days",
      JSON.stringify(variant.requiredDocs && variant.requiredDocs.length ? variant.requiredDocs : (parent.requiredDocs || ["Identity proof", "Mobile number"])),
      variant.status,
      variant.popular ? 1 : 0,
      variant.featured ? 1 : 0,
      variant.homepageVisibility ? 1 : 0,
      variant.description,
      variant.internalNotes,
      variant.lastUpdated
    );
  }
}

function applyUniversalBusinessObjectFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "003_universal_business_objects.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);
  lastUniversalObjectMigrationReport = universalObjectRepository.syncUniversalObjects(dbConn, {
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-2-milestone-2.1-migration-report.json")
  });
  return lastUniversalObjectMigrationReport;
}

function applyCustomerDigitalGenomeFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "004_customer_digital_genome.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);
}

function applyUniversalServiceEngineFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "005_universal_service_engine.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);
  const serviceEngine = require("./service-engine");
  lastServiceDnaMigrationReport = serviceEngine.backfillExistingServices({
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-2-milestone-2.3-migration-report.json")
  });
  return lastServiceDnaMigrationReport;
}

function applyOrderOrchestrationFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "006_order_orchestration.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);
  const workflowEngine = require("./workflow-engine");
  lastOrderWorkflowMigrationReport = workflowEngine.backfillExistingOrders({
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-2-milestone-2.4-migration-report.json")
  });
  return lastOrderWorkflowMigrationReport;
}

function applyDocumentIntelligenceFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "007_document_intelligence_foundation.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);

  const columns = dbConn.prepare("PRAGMA table_info(order_documents)").all();
  const hasColumn = (name) => columns.some((column) => column.name === name);
  if (!hasColumn("document_uuid")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN document_uuid TEXT;");
  if (!hasColumn("document_version_id")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN document_version_id INTEGER;");
  if (!hasColumn("lifecycle_status")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'Pending Verification';");
  if (!hasColumn("operational_status")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN operational_status TEXT NOT NULL DEFAULT 'Active';");
  if (!hasColumn("verification_status")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'Pending Human Verification';");
  if (!hasColumn("content_hash")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN content_hash TEXT;");
  if (!hasColumn("metadata_json")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';");
  if (!hasColumn("updated_at")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN updated_at TEXT;");

  dbConn.exec("DROP INDEX IF EXISTS idx_order_documents_document_uuid_version;");
  dbConn.exec("CREATE INDEX IF NOT EXISTS idx_order_documents_document_uuid_version ON order_documents(document_uuid, document_version_id) WHERE document_uuid IS NOT NULL AND document_version_id IS NOT NULL;");
  dbConn.exec("CREATE INDEX IF NOT EXISTS idx_order_documents_lifecycle ON order_documents(lifecycle_status, verification_status, operational_status);");
}

function applyCustomerPrivacyRetentionFoundation(dbConn) {
  const documentColumns = dbConn.prepare("PRAGMA table_info(order_documents)").all();
  const hasDocumentColumn = (name) => documentColumns.some((column) => column.name === name);
  if (!hasDocumentColumn("customer_hidden_at")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN customer_hidden_at TEXT;");
  if (!hasDocumentColumn("customer_hidden_reason")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN customer_hidden_reason TEXT;");
  if (!hasDocumentColumn("customer_delete_request_id")) dbConn.exec("ALTER TABLE order_documents ADD COLUMN customer_delete_request_id INTEGER;");

  dbConn.exec(`
    CREATE TABLE IF NOT EXISTS customer_data_deletion_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_uuid TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      order_document_id INTEGER NOT NULL REFERENCES order_documents(id),
      status TEXT NOT NULL DEFAULT 'requested'
        CHECK(status IN ('requested', 'under_review', 'approved_for_purge', 'declined', 'completed', 'legal_hold')),
      customer_hidden_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      review_due_at TEXT NOT NULL,
      requested_reason TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT,
      review_note TEXT,
      completed_at TEXT,
      file_purged_at TEXT,
      retention_basis TEXT NOT NULL DEFAULT 'security_audit_stamp_retained',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_customer_deletion_requests_user_status
      ON customer_data_deletion_requests(user_id, status, requested_at DESC);
    CREATE INDEX IF NOT EXISTS idx_customer_deletion_requests_due
      ON customer_data_deletion_requests(status, review_due_at);

    CREATE TABLE IF NOT EXISTS customer_privacy_audit_stamps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stamp_uuid TEXT NOT NULL UNIQUE,
      request_id INTEGER REFERENCES customer_data_deletion_requests(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      order_document_id INTEGER REFERENCES order_documents(id),
      event_type TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_customer_privacy_audit_request
      ON customer_privacy_audit_stamps(request_id, created_at);
    CREATE TRIGGER IF NOT EXISTS trg_customer_privacy_audit_immutable_update
    BEFORE UPDATE ON customer_privacy_audit_stamps
    BEGIN SELECT RAISE(ABORT, 'customer privacy audit stamps are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS trg_customer_privacy_audit_immutable_delete
    BEFORE DELETE ON customer_privacy_audit_stamps
    BEGIN SELECT RAISE(ABORT, 'customer privacy audit stamps are immutable'); END;

    CREATE TABLE IF NOT EXISTS google_drive_sync_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_document_id INTEGER NOT NULL REFERENCES order_documents(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      customer_folder_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'awaiting_file_transfer'
        CHECK(status IN ('awaiting_file_transfer', 'queued', 'synced', 'failed', 'delete_queued', 'deleted')),
      drive_file_id TEXT,
      drive_folder_id TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_google_drive_sync_jobs_document
      ON google_drive_sync_jobs(order_document_id, status);
  `);
}

function applyCustomerExperienceOmnichannelFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "008_customer_experience_omnichannel.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);

  const notificationColumns = dbConn.prepare("PRAGMA table_info(notifications)").all();
  const hasNotificationColumn = (name) => notificationColumns.some((column) => column.name === name);
  if (!hasNotificationColumn("conversation_uuid")) dbConn.exec("ALTER TABLE notifications ADD COLUMN conversation_uuid TEXT;");
  if (!hasNotificationColumn("message_uuid")) dbConn.exec("ALTER TABLE notifications ADD COLUMN message_uuid TEXT;");
  dbConn.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_message_uuid ON notifications(message_uuid) WHERE message_uuid IS NOT NULL;");
  dbConn.exec("CREATE INDEX IF NOT EXISTS idx_notifications_conversation_uuid ON notifications(conversation_uuid) WHERE conversation_uuid IS NOT NULL;");

  const ticketColumns = dbConn.prepare("PRAGMA table_info(support_tickets)").all();
  const hasTicketColumn = (name) => ticketColumns.some((column) => column.name === name);
  if (!hasTicketColumn("conversation_uuid")) dbConn.exec("ALTER TABLE support_tickets ADD COLUMN conversation_uuid TEXT;");
  if (!hasTicketColumn("initial_message_uuid")) dbConn.exec("ALTER TABLE support_tickets ADD COLUMN initial_message_uuid TEXT;");
  dbConn.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_conversation_uuid ON support_tickets(conversation_uuid) WHERE conversation_uuid IS NOT NULL;");
  dbConn.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_initial_message_uuid ON support_tickets(initial_message_uuid) WHERE initial_message_uuid IS NOT NULL;");
}

function applyWorkforceBranchExecutiveFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "009_workforce_branch_executive_layer.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);
  const workforceService = require("./workforce-service");
  lastWorkforceExecutiveMigrationReport = workforceService.backfillExistingStaff({
    dbConn,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-2-milestone-2.7-migration-report.json")
  });
  return lastWorkforceExecutiveMigrationReport;
}

function applyEnterpriseIntelligenceFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "010_enterprise_intelligence_core.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);
  const correctiveMigrationPath = path.join(__dirname, "migrations", "011_enterprise_intelligence_correctives.sql");
  const correctiveMigration = fs.readFileSync(correctiveMigrationPath, "utf8");
  dbConn.exec(correctiveMigration);
  const enterpriseIntelligenceService = require("./enterprise-intelligence-service");
  lastEnterpriseIntelligenceMigrationReport = enterpriseIntelligenceService.syncEnterpriseIntelligenceFoundation({
    dbConn,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-3-milestone-3.2-migration-report.json")
  });
  return lastEnterpriseIntelligenceMigrationReport;
}

function applyEnterpriseDatabaseEvolutionFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "012_enterprise_database_evolution.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  dbConn.exec(migration);
  lastEnterpriseDatabaseEvolutionReport = databaseGovernanceService.syncEnterpriseDatabaseEvolution({
    dbConn,
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-3-milestone-3.4-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-3-milestone-3.4", "project-migration-report.json")
  });
  return lastEnterpriseDatabaseEvolutionReport;
}

function applyEnterpriseApiIdentityPermissionFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "013_enterprise_api_identity_permission_standardization.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-3-milestone-3.5-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-3-milestone-3.5", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = apiIdentityGovernanceService.syncEnterpriseApiIdentityPermissionFoundation({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    apiIdentityGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    apiIdentityGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || apiIdentityGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastEnterpriseApiIdentityPermissionReport = report;
  return lastEnterpriseApiIdentityPermissionReport;
}

function applyEnterpriseEventBusFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "014_enterprise_event_bus_foundation.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-3-milestone-3.6-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-3-milestone-3.6", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = eventGovernanceService.syncEnterpriseEventBusFoundation({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    eventGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    eventGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || eventGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastEnterpriseEventBusReport = report;
  return lastEnterpriseEventBusReport;
}

function applyEnterpriseAutomationIntegrationsToolGovernance(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "015_enterprise_automation_integrations_tool_governance.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-3-milestone-3.7-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-3-milestone-3.7", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = automationGovernanceService.syncEnterpriseAutomationIntegrationsToolGovernance({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    automationGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    automationGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || automationGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastEnterpriseAutomationIntegrationsToolGovernanceReport = report;
  return lastEnterpriseAutomationIntegrationsToolGovernanceReport;
}

function applyEnterpriseInfrastructure(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "016_enterprise_infrastructure_backup_monitoring_release.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-3-milestone-3.8-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-3-milestone-3.8", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = infrastructureGovernanceService.syncEnterpriseInfrastructure({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    infrastructureGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    infrastructureGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || infrastructureGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastEnterpriseInfrastructureReport = report;
  return lastEnterpriseInfrastructureReport;
}

function applyEnterpriseWorkflowEngineFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "017_enterprise_workflow_engine_foundation.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-4-milestone-4.1-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-4-milestone-4.1", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = workflowGovernanceService.syncEnterpriseWorkflows({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    workflowGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    workflowGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || workflowGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastEnterpriseWorkflowReport = report;
  return lastEnterpriseWorkflowReport;
}

function applyEnterpriseWorkflowRuntimeGovernance(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "018_enterprise_workflow_runtime_governance.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-4-milestone-4.2-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-4-milestone-4.2", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = workflowRuntimeGovernanceService.syncWorkflowRuntimeGovernance({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    workflowRuntimeGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    workflowRuntimeGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || workflowRuntimeGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastEnterpriseWorkflowRuntimeReport = report;
  return lastEnterpriseWorkflowRuntimeReport;
}

function applyEnterpriseHumanTaskWorkQueueFoundation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "019_enterprise_human_task_work_queue_foundation.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-4-milestone-4.3-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-4-milestone-4.3", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = humanTaskGovernanceService.syncHumanTaskWorkQueueGovernance({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    humanTaskGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    humanTaskGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || humanTaskGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastEnterpriseHumanTaskReport = report;
  return lastEnterpriseHumanTaskReport;
}

function applyEnterpriseAiCommandCenter(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "020_enterprise_ai_command_center_decision_intelligence.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-4-milestone-4.4-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-4-milestone-4.4", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = aiGovernanceService.syncAiCommandCenterGovernance({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    aiGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    aiGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || aiGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastEnterpriseAiCommandCenterReport = report;
  return lastEnterpriseAiCommandCenterReport;
}

function applyProductionRolloutEnterpriseValidation(dbConn) {
  const migrationPath = path.join(__dirname, "migrations", "021_production_rollout_enterprise_validation.sql");
  const migration = fs.readFileSync(migrationPath, "utf8");
  const evidenceOptions = {
    migrationPath,
    reportPath: path.join(__dirname, "..", "artifacts", "migration-reports", "phase-4-milestone-4.5-migration-report.json"),
    canonicalFallbackPath: path.join(__dirname, "..", "artifacts", "validation", "phase-4-milestone-4.5", "project-migration-report.json")
  };
  let report = null;
  dbConn.exec("BEGIN IMMEDIATE;");
  try {
    dbConn.exec(migration);
    report = productionRolloutGovernanceService.syncProductionRolloutGovernance({
      dbConn,
      ...evidenceOptions,
      writeEvidence: false
    });
    dbConn.exec("COMMIT;");
    productionRolloutGovernanceService.writeMigrationEvidence(evidenceOptions, report);
  } catch (error) {
    try {
      dbConn.exec("ROLLBACK;");
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    productionRolloutGovernanceService.writeMigrationEvidence(
      evidenceOptions,
      error.migrationReport || productionRolloutGovernanceService.createFailedMigrationReport(error)
    );
    throw error;
  }
  lastProductionRolloutReport = report;
  return lastProductionRolloutReport;
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

function getUniversalObject(sourceTable, sourcePk) {
  return universalObjectRepository.getUniversalObject(getDb(), sourceTable, sourcePk);
}

function getUniversalObjectPayload(sourceTable, sourcePk) {
  const dbConn = getDb();
  let payload = universalObjectRepository.getUniversalObjectPayload(dbConn, sourceTable, sourcePk);
  if (!payload) {
    try {
      payload = universalObjectRepository.registerSourceRecord(dbConn, sourceTable, sourcePk);
    } catch (error) {
      console.warn("[universal-object] on-demand registration skipped:", error.message);
    }
  }
  return payload || null;
}

function registerUniversalObjectForSource(sourceTable, sourcePk) {
  try {
    return universalObjectRepository.registerSourceRecord(getDb(), sourceTable, sourcePk);
  } catch (error) {
    console.warn("[universal-object] source registration failed:", error.message);
    return null;
  }
}

function getUniversalObjectMigrationReport() {
  return lastUniversalObjectMigrationReport;
}

function getServiceDnaMigrationReport() {
  return lastServiceDnaMigrationReport;
}

function getOrderWorkflowMigrationReport() {
  return lastOrderWorkflowMigrationReport;
}

function getWorkforceExecutiveMigrationReport() {
  return lastWorkforceExecutiveMigrationReport;
}

function getEnterpriseIntelligenceMigrationReport() {
  return lastEnterpriseIntelligenceMigrationReport;
}

function getEnterpriseDatabaseEvolutionReport() {
  return lastEnterpriseDatabaseEvolutionReport;
}

function getEnterpriseApiIdentityPermissionReport() {
  return lastEnterpriseApiIdentityPermissionReport;
}

function getEnterpriseEventBusReport() {
  return lastEnterpriseEventBusReport;
}

function getEnterpriseAutomationIntegrationsToolGovernanceReport() {
  return lastEnterpriseAutomationIntegrationsToolGovernanceReport;
}

function getEnterpriseHumanTaskReport() {
  return lastEnterpriseHumanTaskReport;
}

function getEnterpriseAiCommandCenterReport() {
  return lastEnterpriseAiCommandCenterReport;
}

function getProductionRolloutReport() {
  return lastProductionRolloutReport;
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
  getUniversalObject,
  getUniversalObjectPayload,
  registerUniversalObjectForSource,
  getUniversalObjectMigrationReport,
  getServiceDnaMigrationReport,
  getOrderWorkflowMigrationReport,
  getWorkforceExecutiveMigrationReport,
  getEnterpriseIntelligenceMigrationReport,
  getEnterpriseDatabaseEvolutionReport,
  getEnterpriseApiIdentityPermissionReport,
  getEnterpriseEventBusReport,
  getEnterpriseAutomationIntegrationsToolGovernanceReport,
  getEnterpriseHumanTaskReport,
  getEnterpriseAiCommandCenterReport,
  getProductionRolloutReport,
  withTransaction,
  logPayment,
  insertWebhookLog,
  nextOrderId,
  saveSettings,
  getSettings
};
