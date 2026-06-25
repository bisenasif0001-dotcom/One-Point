-- Migration 002: Workflow Engine Tables
-- Staff management, document tracking, bot checks, auto-assignment

PRAGMA foreign_keys = ON;

-- Staff / Agents table
CREATE TABLE IF NOT EXISTS staff (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  phone       TEXT    NOT NULL UNIQUE,
  email       TEXT,
  role        TEXT    NOT NULL DEFAULT 'agent' CHECK(role IN ('admin','agent','verifier','support')),
  skills      TEXT    NOT NULL DEFAULT '[]',  -- JSON array of service slugs/categories
  is_active   INTEGER NOT NULL DEFAULT 1,
  max_tasks   INTEGER NOT NULL DEFAULT 10,
  created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active, role);

-- Task Assignments: link orders to staff
CREATE TABLE IF NOT EXISTS task_assignments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id),
  staff_id        INTEGER NOT NULL REFERENCES staff(id),
  assigned_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at     TEXT,
  completed_at    TEXT,
  status          TEXT    NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','accepted','working','done','cancelled')),
  priority        TEXT    NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','critical')),
  notes           TEXT,
  admin_notes     TEXT,
  updated_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_order     ON task_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_assignments_staff     ON task_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status    ON task_assignments(status);

-- Order Documents: uploaded files per order
CREATE TABLE IF NOT EXISTS order_documents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id),
  doc_type        TEXT    NOT NULL,  -- 'aadhaar','pan','photo','birth_cert', etc.
  file_name       TEXT    NOT NULL,
  file_path       TEXT,              -- local storage path
  file_url        TEXT,              -- external/CDN URL
  mime_type       TEXT,
  file_size_bytes INTEGER,
  uploaded_by     TEXT    NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  verified        INTEGER NOT NULL DEFAULT 0,
  verified_by     INTEGER REFERENCES staff(id),
  verified_at     TEXT,
  created_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_docs_order    ON order_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_docs_type     ON order_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_docs_verified ON order_documents(verified);

-- Bot Check Logs: track automated verification results
CREATE TABLE IF NOT EXISTS bot_checks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id),
  check_type      TEXT    NOT NULL, -- 'initial','reminder','manual'
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','passed','failed','needs_docs','needs_payment')),
  payment_ok      INTEGER NOT NULL DEFAULT 0,
  docs_ok         INTEGER NOT NULL DEFAULT 0,
  fields_ok       INTEGER NOT NULL DEFAULT 0,
  missing_items   TEXT    NOT NULL DEFAULT '[]', -- JSON array of missing items
  reminder_sent   INTEGER NOT NULL DEFAULT 0,
  auto_assigned   INTEGER NOT NULL DEFAULT 0,
  checked_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_checks_order  ON bot_checks(order_id);
CREATE INDEX IF NOT EXISTS idx_bot_checks_status ON bot_checks(status);

-- Automation Rules: persistent workflow rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  trigger     TEXT    NOT NULL, -- 'order.created','payment.captured','doc.uploaded', etc.
  conditions  TEXT    NOT NULL DEFAULT '{}', -- JSON conditions
  actions     TEXT    NOT NULL DEFAULT '[]', -- JSON action list
  is_active   INTEGER NOT NULL DEFAULT 1,
  run_count   INTEGER NOT NULL DEFAULT 0,
  last_run_at TEXT,
  created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default automation rules
INSERT OR IGNORE INTO automation_rules (name, trigger, conditions, actions) VALUES
  ('Auto reply on order created',  'order.created',    '{}', '[{"type":"notify","channels":["sms","whatsapp"],"template":"order_created"}]'),
  ('Auto reply on payment success', 'payment.captured', '{}', '[{"type":"notify","channels":["sms","whatsapp"],"template":"payment_success"},{"type":"bot_check"}]'),
  ('Reminder for missing docs',    'doc.missing',       '{}', '[{"type":"notify","channels":["whatsapp"],"template":"docs_reminder"}]'),
  ('Notify admin on assignment',   'order.assigned',    '{}', '[{"type":"notify_staff","channels":["whatsapp","sms"]}]'),
  ('Customer complete notify',     'order.completed',   '{}', '[{"type":"notify","channels":["whatsapp","sms"],"template":"order_completed"}]');

-- Add bot_check_status column to orders (safe migration)
ALTER TABLE orders ADD COLUMN bot_check_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN assigned_to      INTEGER REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN assignment_priority TEXT NOT NULL DEFAULT 'normal';
