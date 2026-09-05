PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS domain_departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  mission TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  health_status TEXT NOT NULL DEFAULT 'unknown',
  health_score INTEGER,
  kpis_json TEXT NOT NULL DEFAULT '[]',
  owner_type TEXT NOT NULL DEFAULT 'human',
  owner_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domain_departments_category ON domain_departments(category);
CREATE INDEX IF NOT EXISTS idx_domain_departments_status ON domain_departments(status);

CREATE TABLE IF NOT EXISTS domain_object_types (
  object_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  domain_key TEXT NOT NULL,
  source_table TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domain_object_types_domain ON domain_object_types(domain_key);
CREATE INDEX IF NOT EXISTS idx_domain_object_types_source ON domain_object_types(source_table);
CREATE INDEX IF NOT EXISTS idx_domain_object_types_status ON domain_object_types(status);

CREATE TABLE IF NOT EXISTS universal_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  universal_uuid TEXT NOT NULL UNIQUE,
  object_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_pk TEXT NOT NULL,
  human_readable_id TEXT,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  current_status TEXT NOT NULL DEFAULT 'active',
  lifecycle_stage TEXT NOT NULL DEFAULT 'active',
  owner_type TEXT NOT NULL DEFAULT 'system',
  owner_id TEXT,
  department TEXT NOT NULL DEFAULT 'operations',
  created_by_type TEXT NOT NULL DEFAULT 'system',
  created_by_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  risk_level TEXT NOT NULL DEFAULT 'normal',
  visibility TEXT NOT NULL DEFAULT 'internal',
  permissions_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  tags_json TEXT NOT NULL DEFAULT '[]',
  health_score INTEGER,
  ai_context_enabled INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  source_created_at TEXT,
  source_updated_at TEXT,
  last_activity_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(object_type) REFERENCES domain_object_types(object_type)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_universal_objects_source ON universal_objects(source_table, source_pk);
CREATE INDEX IF NOT EXISTS idx_universal_objects_type ON universal_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_universal_objects_human_id ON universal_objects(human_readable_id);
CREATE INDEX IF NOT EXISTS idx_universal_objects_department ON universal_objects(department);
CREATE INDEX IF NOT EXISTS idx_universal_objects_status_stage ON universal_objects(current_status, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_universal_objects_activity ON universal_objects(last_activity_at);

CREATE TRIGGER IF NOT EXISTS trg_universal_objects_uuid_immutable
BEFORE UPDATE OF universal_uuid ON universal_objects
FOR EACH ROW
WHEN OLD.universal_uuid <> NEW.universal_uuid
BEGIN
  SELECT RAISE(ABORT, 'universal_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS universal_object_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_object_uuid TEXT NOT NULL,
  to_object_uuid TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  relationship_label TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL DEFAULT 'forward',
  strength REAL NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by_type TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(from_object_uuid) REFERENCES universal_objects(universal_uuid),
  FOREIGN KEY(to_object_uuid) REFERENCES universal_objects(universal_uuid)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_universal_relationship_unique
  ON universal_object_relationships(from_object_uuid, to_object_uuid, relationship_type);
CREATE INDEX IF NOT EXISTS idx_universal_relationship_from ON universal_object_relationships(from_object_uuid);
CREATE INDEX IF NOT EXISTS idx_universal_relationship_to ON universal_object_relationships(to_object_uuid);
CREATE INDEX IF NOT EXISTS idx_universal_relationship_type ON universal_object_relationships(relationship_type);

CREATE TABLE IF NOT EXISTS universal_object_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_uuid TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  source_table TEXT,
  source_pk TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(object_uuid) REFERENCES universal_objects(universal_uuid)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_universal_timeline_baseline
  ON universal_object_timeline(object_uuid, action, source_table, source_pk);
CREATE INDEX IF NOT EXISTS idx_universal_timeline_object ON universal_object_timeline(object_uuid, occurred_at);
CREATE INDEX IF NOT EXISTS idx_universal_timeline_action ON universal_object_timeline(action);

INSERT OR IGNORE INTO domain_departments
  (department_key, display_name, category, mission, status, health_status, health_score, kpis_json, owner_type, owner_id, metadata_json)
VALUES
  ('executive_office', 'Executive Office', 'enterprise_intelligence', 'Owner and executive governance for the enterprise operating system.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('operations', 'Operations', 'business_operations', 'Order execution, service processing, assignment, and delivery coordination.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('customer_success', 'Customer Success', 'customer_experience', 'Customer communication, support, service assurance, and relationship continuity.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('government_services', 'Government Services', 'business_operations', 'Government-service application handling, documentation, and fulfillment support.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('printing', 'Printing', 'business_operations', 'Printing, scanning, lamination, and document-production service execution.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('onemart', 'OneMart', 'business_operations', 'Marketplace and product-order operations.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('finance', 'Finance', 'internal_operations', 'Payments, invoices, refunds, reconciliations, and financial control.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('knowledge', 'Knowledge', 'business_intelligence', 'Enterprise knowledge, service rules, documentation, and future knowledge operations.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('compliance', 'Compliance', 'internal_operations', 'Policy, compliance, trust, audit-readiness, and human authority enforcement.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('hr', 'Human Resources', 'internal_operations', 'Human workforce records, roles, skills, and staff operations.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('sales', 'Sales', 'customer_experience', 'Lead conversion, customer acquisition, and revenue support.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('marketing', 'Marketing', 'customer_experience', 'Campaigns, outreach, and service-market visibility.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('analytics', 'Analytics', 'business_intelligence', 'Business pulse, reporting, insight, and measurement foundations.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('innovation', 'Innovation', 'enterprise_intelligence', 'Future enterprise capability evolution and experimentation governance.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('infrastructure', 'Infrastructure', 'internal_operations', 'Platform, system, and operational infrastructure ownership.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('branch_operations', 'Branch Operations', 'business_operations', 'Branch-level service execution and local operating coordination.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}'),
  ('franchise_operations', 'Franchise Operations', 'business_operations', 'Franchise operating model and partner execution support.', 'active', 'baseline', 70, '[]', 'human', 'owner', '{}');

INSERT OR IGNORE INTO domain_object_types
  (object_type, display_name, domain_key, source_table, status, metadata_json)
VALUES
  ('customer', 'Customer', 'customer', 'users', 'active', '{}'),
  ('service', 'Service', 'service', 'services', 'active', '{}'),
  ('service_variant', 'Service Variant', 'service', 'service_pricing_variants', 'active', '{}'),
  ('product', 'Product', 'marketplace', 'products', 'active', '{}'),
  ('order', 'Order', 'order', 'orders', 'active', '{}'),
  ('order_item', 'Order Item', 'order', 'order_items', 'active', '{}'),
  ('payment', 'Payment', 'finance', 'payments', 'active', '{}'),
  ('transaction', 'Transaction', 'finance', 'transactions', 'active', '{}'),
  ('invoice', 'Invoice', 'finance', 'invoices', 'active', '{}'),
  ('refund', 'Refund', 'finance', 'refunds', 'active', '{}'),
  ('payment_log', 'Payment Log', 'finance', 'payment_logs', 'active', '{}'),
  ('webhook_log', 'Webhook Log', 'infrastructure', 'webhook_logs', 'active', '{}'),
  ('notification', 'Notification', 'notification', 'notifications', 'active', '{}'),
  ('human_staff', 'Human Staff', 'human_workforce', 'staff', 'active', '{}'),
  ('task_assignment', 'Task Assignment', 'task', 'task_assignments', 'active', '{}'),
  ('document', 'Document', 'document', 'order_documents', 'active', '{}'),
  ('automation_check', 'Automation Check', 'workflow', 'bot_checks', 'active', '{}'),
  ('automation_rule', 'Automation Rule', 'workflow', 'automation_rules', 'active', '{}'),
  ('support_ticket', 'Support Ticket', 'customer_success', 'support_tickets', 'active', '{}'),
  ('department', 'Department', 'enterprise', 'domain_departments', 'active', '{}');
