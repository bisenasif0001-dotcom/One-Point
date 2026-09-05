PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS enterprise_event_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_category_uuid TEXT NOT NULL UNIQUE,
  category_key TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  category_family TEXT NOT NULL CHECK (category_family IN ('business', 'domain', 'system', 'integration', 'workflow', 'audit', 'security', 'notification', 'analytics', 'ai')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_categories_uuid_immutable
BEFORE UPDATE OF event_category_uuid ON enterprise_event_categories
FOR EACH ROW
WHEN OLD.event_category_uuid <> NEW.event_category_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_category_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_schemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_schema_uuid TEXT NOT NULL UNIQUE,
  schema_key TEXT NOT NULL UNIQUE,
  schema_name TEXT NOT NULL,
  schema_format TEXT NOT NULL CHECK (schema_format IN ('json', 'json_schema', 'metadata_only')),
  schema_version INTEGER NOT NULL DEFAULT 1,
  schema_definition_json TEXT NOT NULL DEFAULT '{}',
  payload_projection_class TEXT NOT NULL,
  payload_visibility TEXT NOT NULL,
  payload_redaction_policy TEXT NOT NULL,
  payload_minimization_policy TEXT NOT NULL,
  payload_classification TEXT NOT NULL,
  sensitive_field_policy TEXT NOT NULL,
  pii_policy TEXT NOT NULL,
  secret_exposure_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_schemas_uuid_immutable
BEFORE UPDATE OF event_schema_uuid ON enterprise_event_schemas
FOR EACH ROW
WHEN OLD.event_schema_uuid <> NEW.event_schema_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_schema_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_version_uuid TEXT NOT NULL UNIQUE,
  version_key TEXT NOT NULL UNIQUE,
  version_number INTEGER NOT NULL,
  compatibility_window TEXT NOT NULL,
  compatibility_start TEXT,
  compatibility_end TEXT,
  deprecation_window TEXT,
  replacement_event_key TEXT,
  migration_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_versions_uuid_immutable
BEFORE UPDATE OF event_version_uuid ON enterprise_event_versions
FOR EACH ROW
WHEN OLD.event_version_uuid <> NEW.event_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_version_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_compatibility_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_compatibility_uuid TEXT NOT NULL UNIQUE,
  compatibility_key TEXT NOT NULL UNIQUE,
  compatibility_class TEXT NOT NULL,
  compatibility_window TEXT NOT NULL,
  compatibility_start TEXT,
  compatibility_end TEXT,
  deprecation_window TEXT,
  replacement_event_key TEXT,
  migration_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_compatibility_profiles_uuid_immutable
BEFORE UPDATE OF event_compatibility_uuid ON enterprise_event_compatibility_profiles
FOR EACH ROW
WHEN OLD.event_compatibility_uuid <> NEW.event_compatibility_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_compatibility_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_publishers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_publisher_uuid TEXT NOT NULL UNIQUE,
  publisher_key TEXT NOT NULL UNIQUE,
  publisher_name TEXT NOT NULL,
  publisher_type TEXT NOT NULL CHECK (publisher_type IN ('service', 'workflow', 'notification', 'document', 'customer', 'payment', 'assignment', 'dashboard', 'integration', 'ai')),
  service_key TEXT,
  authentication_profile TEXT NOT NULL,
  authorization_profile TEXT NOT NULL,
  trust_boundary TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(service_key) REFERENCES enterprise_service_contracts(service_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_publishers_uuid_immutable
BEFORE UPDATE OF event_publisher_uuid ON enterprise_event_publishers
FOR EACH ROW
WHEN OLD.event_publisher_uuid <> NEW.event_publisher_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_publisher_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_subscriber_uuid TEXT NOT NULL UNIQUE,
  subscriber_key TEXT NOT NULL UNIQUE,
  subscriber_name TEXT NOT NULL,
  subscriber_type TEXT NOT NULL CHECK (subscriber_type IN ('service', 'dashboard', 'workflow', 'analytics', 'integration', 'search', 'ai')),
  subscriber_reference TEXT NOT NULL,
  ordering_policy TEXT NOT NULL,
  filtering_policy TEXT NOT NULL,
  replay_policy TEXT NOT NULL,
  retry_policy TEXT NOT NULL,
  acknowledgement_policy TEXT NOT NULL,
  acknowledgement_mode TEXT NOT NULL,
  delivery_semantics TEXT NOT NULL,
  checkpoint_strategy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_subscribers_uuid_immutable
BEFORE UPDATE OF event_subscriber_uuid ON enterprise_event_subscribers
FOR EACH ROW
WHEN OLD.event_subscriber_uuid <> NEW.event_subscriber_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_subscriber_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('routing', 'filtering', 'replay', 'dead_letter', 'metrics', 'audit', 'security', 'payload', 'projection', 'lifecycle', 'delivery', 'locality', 'immutability', 'compatibility', 'privacy', 'consent')),
  policy_name TEXT NOT NULL,
  policy_scope TEXT NOT NULL,
  policy_status TEXT NOT NULL,
  immutable_event INTEGER NOT NULL DEFAULT 1 CHECK (immutable_event IN (0, 1)),
  append_only_class TEXT NOT NULL,
  replay_mutation_policy TEXT NOT NULL,
  replay_scope TEXT,
  replay_authority TEXT,
  payload_projection_class TEXT,
  payload_visibility TEXT,
  payload_redaction_policy TEXT,
  payload_minimization_policy TEXT,
  payload_classification TEXT,
  sensitive_field_policy TEXT,
  pii_policy TEXT,
  secret_exposure_policy TEXT,
  security_class TEXT,
  privacy_key TEXT,
  consent_key TEXT,
  metric_class TEXT,
  metrics_policy TEXT,
  monitoring_policy TEXT,
  health_class TEXT,
  throughput_class TEXT,
  acknowledgement_policy TEXT,
  acknowledgement_mode TEXT,
  checkpoint_strategy TEXT,
  delivery_semantics TEXT,
  tenant_scope TEXT,
  organization_scope TEXT,
  branch_scope TEXT,
  franchise_scope TEXT,
  regional_scope TEXT,
  partition_scope TEXT,
  locality_class TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(privacy_key) REFERENCES enterprise_privacy_classes(privacy_key),
  FOREIGN KEY(consent_key) REFERENCES enterprise_consent_policies(consent_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_policies_uuid_immutable
BEFORE UPDATE OF event_policy_uuid ON enterprise_event_policies
FOR EACH ROW
WHEN OLD.event_policy_uuid <> NEW.event_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_process_contexts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_context_uuid TEXT NOT NULL UNIQUE,
  process_context_key TEXT NOT NULL UNIQUE,
  orchestration_context TEXT NOT NULL,
  workflow_chain_reference TEXT,
  orchestration_status TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_process_contexts_uuid_immutable
BEFORE UPDATE OF process_context_uuid ON enterprise_event_process_contexts
FOR EACH ROW
WHEN OLD.process_context_uuid <> NEW.process_context_uuid
BEGIN
  SELECT RAISE(ABORT, 'process_context_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_registry_uuid TEXT NOT NULL UNIQUE,
  event_key TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  category_key TEXT NOT NULL,
  schema_key TEXT NOT NULL,
  version_key TEXT NOT NULL,
  compatibility_key TEXT NOT NULL,
  publisher_key TEXT NOT NULL,
  security_policy_key TEXT NOT NULL,
  payload_policy_key TEXT NOT NULL,
  projection_policy_key TEXT NOT NULL,
  routing_policy_key TEXT NOT NULL,
  filtering_policy_key TEXT NOT NULL,
  replay_policy_key TEXT NOT NULL,
  dead_letter_policy_key TEXT NOT NULL,
  audit_policy_key TEXT NOT NULL,
  metrics_policy_key TEXT NOT NULL,
  lifecycle_policy_key TEXT NOT NULL,
  delivery_policy_key TEXT NOT NULL,
  locality_policy_key TEXT NOT NULL,
  privacy_policy_key TEXT NOT NULL,
  consent_policy_key TEXT NOT NULL,
  immutability_policy_key TEXT NOT NULL,
  event_status TEXT NOT NULL,
  event_owner TEXT NOT NULL,
  workflow_boundary TEXT NOT NULL,
  integration_boundary TEXT NOT NULL,
  ai_consumer_boundary TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_key) REFERENCES enterprise_event_categories(category_key),
  FOREIGN KEY(schema_key) REFERENCES enterprise_event_schemas(schema_key),
  FOREIGN KEY(version_key) REFERENCES enterprise_event_versions(version_key),
  FOREIGN KEY(compatibility_key) REFERENCES enterprise_event_compatibility_profiles(compatibility_key),
  FOREIGN KEY(publisher_key) REFERENCES enterprise_event_publishers(publisher_key),
  FOREIGN KEY(security_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(payload_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(projection_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(routing_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(filtering_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(replay_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(dead_letter_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(audit_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(metrics_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(lifecycle_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(delivery_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(locality_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(privacy_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(consent_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(immutability_policy_key) REFERENCES enterprise_event_policies(policy_key)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_event_registry_category
  ON enterprise_event_registry(category_key, event_status);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_registry_uuid_immutable
BEFORE UPDATE OF event_registry_uuid ON enterprise_event_registry
FOR EACH ROW
WHEN OLD.event_registry_uuid <> NEW.event_registry_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_registry_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_subscription_uuid TEXT NOT NULL UNIQUE,
  event_key TEXT NOT NULL,
  subscriber_key TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  compatibility_key TEXT NOT NULL,
  routing_policy_key TEXT NOT NULL,
  filtering_policy_key TEXT NOT NULL,
  replay_policy_key TEXT NOT NULL,
  delivery_policy_key TEXT NOT NULL,
  dead_letter_policy_key TEXT NOT NULL,
  acknowledgement_policy TEXT NOT NULL,
  acknowledgement_mode TEXT NOT NULL,
  checkpoint_strategy TEXT NOT NULL,
  delivery_semantics TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_key, subscriber_key),
  FOREIGN KEY(event_key) REFERENCES enterprise_event_registry(event_key),
  FOREIGN KEY(subscriber_key) REFERENCES enterprise_event_subscribers(subscriber_key),
  FOREIGN KEY(compatibility_key) REFERENCES enterprise_event_compatibility_profiles(compatibility_key),
  FOREIGN KEY(routing_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(filtering_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(replay_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(delivery_policy_key) REFERENCES enterprise_event_policies(policy_key),
  FOREIGN KEY(dead_letter_policy_key) REFERENCES enterprise_event_policies(policy_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_subscriptions_uuid_immutable
BEFORE UPDATE OF event_subscription_uuid ON enterprise_event_subscriptions
FOR EACH ROW
WHEN OLD.event_subscription_uuid <> NEW.event_subscription_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_subscription_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_store (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_message_uuid TEXT NOT NULL UNIQUE,
  event_key TEXT NOT NULL,
  publisher_key TEXT NOT NULL,
  version_key TEXT NOT NULL,
  category_key TEXT NOT NULL,
  compatibility_key TEXT NOT NULL,
  linked_object_type TEXT,
  linked_object_uuid TEXT,
  source_table TEXT,
  source_pk TEXT,
  correlation_id TEXT,
  causation_event_uuid TEXT,
  process_context_uuid TEXT,
  saga_uuid TEXT,
  parent_process_reference TEXT,
  workflow_chain_reference TEXT,
  orchestration_context TEXT,
  orchestration_status TEXT,
  tenant_scope TEXT,
  organization_scope TEXT,
  branch_scope TEXT,
  franchise_scope TEXT,
  regional_scope TEXT,
  partition_scope TEXT,
  locality_class TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  payload_projection_class TEXT NOT NULL,
  payload_visibility TEXT NOT NULL,
  payload_redaction_policy TEXT NOT NULL,
  payload_minimization_policy TEXT NOT NULL,
  payload_classification TEXT NOT NULL,
  sensitive_field_policy TEXT NOT NULL,
  pii_policy TEXT NOT NULL,
  secret_exposure_policy TEXT NOT NULL,
  immutable_event INTEGER NOT NULL DEFAULT 1 CHECK (immutable_event IN (0, 1)),
  append_only_class TEXT NOT NULL,
  replay_mutation_policy TEXT NOT NULL,
  replay_scope TEXT,
  replay_authority TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_key) REFERENCES enterprise_event_registry(event_key),
  FOREIGN KEY(publisher_key) REFERENCES enterprise_event_publishers(publisher_key),
  FOREIGN KEY(version_key) REFERENCES enterprise_event_versions(version_key),
  FOREIGN KEY(category_key) REFERENCES enterprise_event_categories(category_key),
  FOREIGN KEY(compatibility_key) REFERENCES enterprise_event_compatibility_profiles(compatibility_key),
  FOREIGN KEY(causation_event_uuid) REFERENCES enterprise_event_store(event_message_uuid),
  FOREIGN KEY(process_context_uuid) REFERENCES enterprise_event_process_contexts(process_context_uuid)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_event_store_event
  ON enterprise_event_store(event_key, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_event_store_linked_object
  ON enterprise_event_store(linked_object_type, linked_object_uuid, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_event_store_correlation
  ON enterprise_event_store(correlation_id, saga_uuid, occurred_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_store_uuid_immutable
BEFORE UPDATE OF event_message_uuid ON enterprise_event_store
FOR EACH ROW
WHEN OLD.event_message_uuid <> NEW.event_message_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_message_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_store_append_only_update
BEFORE UPDATE ON enterprise_event_store
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_event_store is append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_store_append_only_delete
BEFORE DELETE ON enterprise_event_store
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_event_store is append_only');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_delivery_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_state_uuid TEXT NOT NULL UNIQUE,
  event_message_uuid TEXT NOT NULL,
  subscriber_key TEXT NOT NULL,
  event_key TEXT NOT NULL,
  subscriber_checkpoint TEXT,
  replay_position TEXT,
  retry_checkpoint TEXT,
  consumer_state TEXT NOT NULL DEFAULT 'queued',
  delivery_status TEXT NOT NULL DEFAULT 'queued',
  acknowledgement_policy TEXT NOT NULL,
  acknowledgement_mode TEXT NOT NULL,
  checkpoint_strategy TEXT NOT NULL,
  delivery_semantics TEXT NOT NULL,
  last_attempted_at TEXT,
  acknowledged_at TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_message_uuid, subscriber_key),
  FOREIGN KEY(event_message_uuid) REFERENCES enterprise_event_store(event_message_uuid),
  FOREIGN KEY(subscriber_key) REFERENCES enterprise_event_subscribers(subscriber_key),
  FOREIGN KEY(event_key) REFERENCES enterprise_event_registry(event_key)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_event_delivery_state_status
  ON enterprise_event_delivery_state(subscriber_key, delivery_status, created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_delivery_state_uuid_immutable
BEFORE UPDATE OF delivery_state_uuid ON enterprise_event_delivery_state
FOR EACH ROW
WHEN OLD.delivery_state_uuid <> NEW.delivery_state_uuid
BEGIN
  SELECT RAISE(ABORT, 'delivery_state_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_dead_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dead_letter_uuid TEXT NOT NULL UNIQUE,
  event_message_uuid TEXT NOT NULL,
  subscriber_key TEXT NOT NULL,
  dead_letter_policy_key TEXT NOT NULL,
  failure_reason TEXT NOT NULL,
  dead_letter_status TEXT NOT NULL DEFAULT 'retained',
  retry_after TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_message_uuid) REFERENCES enterprise_event_store(event_message_uuid),
  FOREIGN KEY(subscriber_key) REFERENCES enterprise_event_subscribers(subscriber_key),
  FOREIGN KEY(dead_letter_policy_key) REFERENCES enterprise_event_policies(policy_key)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_event_dead_letters_lookup
  ON enterprise_event_dead_letters(subscriber_key, occurred_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_dead_letters_uuid_immutable
BEFORE UPDATE OF dead_letter_uuid ON enterprise_event_dead_letters
FOR EACH ROW
WHEN OLD.dead_letter_uuid <> NEW.dead_letter_uuid
BEGIN
  SELECT RAISE(ABORT, 'dead_letter_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_dead_letters_append_only_update
BEFORE UPDATE ON enterprise_event_dead_letters
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_event_dead_letters is append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_dead_letters_append_only_delete
BEFORE DELETE ON enterprise_event_dead_letters
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_event_dead_letters is append_only');
END;

CREATE TABLE IF NOT EXISTS enterprise_event_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_audit_uuid TEXT NOT NULL UNIQUE,
  event_message_uuid TEXT,
  audit_action TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_message_uuid) REFERENCES enterprise_event_store(event_message_uuid)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_event_audit_log_event
  ON enterprise_event_audit_log(event_message_uuid, occurred_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_audit_log_uuid_immutable
BEFORE UPDATE OF event_audit_uuid ON enterprise_event_audit_log
FOR EACH ROW
WHEN OLD.event_audit_uuid <> NEW.event_audit_uuid
BEGIN
  SELECT RAISE(ABORT, 'event_audit_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_audit_log_append_only_update
BEFORE UPDATE ON enterprise_event_audit_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_event_audit_log is append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_event_audit_log_append_only_delete
BEFORE DELETE ON enterprise_event_audit_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_event_audit_log is append_only');
END;
