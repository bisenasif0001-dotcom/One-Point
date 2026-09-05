PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS enterprise_store_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_class_uuid TEXT NOT NULL UNIQUE,
  store_key TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  authority_class TEXT NOT NULL CHECK (authority_class IN ('authoritative', 'derived', 'append_only', 'historical', 'governed_metadata')),
  write_mode TEXT NOT NULL CHECK (write_mode IN ('read_write', 'read_only', 'append_only')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_store_classes_uuid_immutable
BEFORE UPDATE OF store_class_uuid ON enterprise_store_classes
FOR EACH ROW
WHEN OLD.store_class_uuid <> NEW.store_class_uuid
BEGIN
  SELECT RAISE(ABORT, 'store_class_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_schema_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schema_version_uuid TEXT NOT NULL UNIQUE,
  schema_key TEXT NOT NULL UNIQUE,
  schema_version_number INTEGER NOT NULL,
  compatibility_version TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Approved',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_schema_versions_uuid_immutable
BEFORE UPDATE OF schema_version_uuid ON enterprise_schema_versions
FOR EACH ROW
WHEN OLD.schema_version_uuid <> NEW.schema_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'schema_version_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_compatibility_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compatibility_registry_uuid TEXT NOT NULL UNIQUE,
  registry_key TEXT NOT NULL UNIQUE,
  schema_key TEXT NOT NULL,
  minimum_schema_version_number INTEGER NOT NULL,
  current_schema_version_number INTEGER NOT NULL,
  backward_compatible INTEGER NOT NULL DEFAULT 1 CHECK (backward_compatible IN (0, 1)),
  api_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (api_compatibility_required IN (0, 1)),
  dashboard_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (dashboard_compatibility_required IN (0, 1)),
  website_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (website_compatibility_required IN (0, 1)),
  authentication_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (authentication_compatibility_required IN (0, 1)),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(schema_key) REFERENCES enterprise_schema_versions(schema_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_compatibility_registry_uuid_immutable
BEFORE UPDATE OF compatibility_registry_uuid ON enterprise_compatibility_registry
FOR EACH ROW
WHEN OLD.compatibility_registry_uuid <> NEW.compatibility_registry_uuid
BEGIN
  SELECT RAISE(ABORT, 'compatibility_registry_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_transaction_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  transaction_scope TEXT NOT NULL,
  transaction_boundary TEXT NOT NULL,
  transaction_consistency_class TEXT NOT NULL,
  transaction_isolation_class TEXT NOT NULL,
  transaction_recovery_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_transaction_policies_uuid_immutable
BEFORE UPDATE OF transaction_policy_uuid ON enterprise_transaction_policies
FOR EACH ROW
WHEN OLD.transaction_policy_uuid <> NEW.transaction_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'transaction_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_integrity_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  integrity_policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  relationship_integrity TEXT NOT NULL,
  cross_domain_reference_policy TEXT NOT NULL,
  cascade_policy TEXT NOT NULL,
  orphan_policy TEXT NOT NULL,
  consistency_validation_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_integrity_policies_uuid_immutable
BEFORE UPDATE OF integrity_policy_uuid ON enterprise_integrity_policies
FOR EACH ROW
WHEN OLD.integrity_policy_uuid <> NEW.integrity_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'integrity_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_partition_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partition_policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  partition_strategy TEXT NOT NULL,
  partition_scope TEXT NOT NULL,
  branch_partition TEXT NOT NULL,
  franchise_partition TEXT NOT NULL,
  regional_partition TEXT NOT NULL,
  archive_partition TEXT NOT NULL,
  tenant_scope TEXT NOT NULL,
  storage_distribution_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_partition_policies_uuid_immutable
BEFORE UPDATE OF partition_policy_uuid ON enterprise_partition_policies
FOR EACH ROW
WHEN OLD.partition_policy_uuid <> NEW.partition_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'partition_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_repository_boundaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repository_boundary_uuid TEXT NOT NULL UNIQUE,
  boundary_key TEXT NOT NULL UNIQUE,
  boundary_name TEXT NOT NULL,
  dependency_status TEXT NOT NULL,
  write_scope TEXT NOT NULL,
  read_scope TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_repository_boundaries_uuid_immutable
BEFORE UPDATE OF repository_boundary_uuid ON enterprise_repository_boundaries
FOR EACH ROW
WHEN OLD.repository_boundary_uuid <> NEW.repository_boundary_uuid
BEGIN
  SELECT RAISE(ABORT, 'repository_boundary_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_adapter_boundaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adapter_boundary_uuid TEXT NOT NULL UNIQUE,
  boundary_key TEXT NOT NULL UNIQUE,
  boundary_name TEXT NOT NULL,
  dependency_status TEXT NOT NULL,
  adapter_scope TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_adapter_boundaries_uuid_immutable
BEFORE UPDATE OF adapter_boundary_uuid ON enterprise_adapter_boundaries
FOR EACH ROW
WHEN OLD.adapter_boundary_uuid <> NEW.adapter_boundary_uuid
BEGIN
  SELECT RAISE(ABORT, 'adapter_boundary_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_persistence_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persistence_domain_uuid TEXT NOT NULL UNIQUE,
  domain_key TEXT NOT NULL UNIQUE,
  domain_name TEXT NOT NULL,
  store_key TEXT NOT NULL,
  data_owner TEXT NOT NULL,
  domain_owner TEXT NOT NULL,
  stewardship_class TEXT NOT NULL,
  ownership_transfer_policy TEXT NOT NULL,
  ownership_review_policy TEXT NOT NULL,
  active_state TEXT NOT NULL,
  archived_state TEXT NOT NULL,
  retained_state TEXT NOT NULL,
  deprecated_state TEXT NOT NULL,
  purge_eligibility TEXT NOT NULL,
  legal_hold_status TEXT NOT NULL,
  transaction_policy_key TEXT NOT NULL,
  integrity_policy_key TEXT NOT NULL,
  partition_policy_key TEXT NOT NULL,
  repository_boundary_key TEXT NOT NULL,
  adapter_boundary_key TEXT NOT NULL,
  lifecycle_independent_from_business INTEGER NOT NULL DEFAULT 1 CHECK (lifecycle_independent_from_business IN (0, 1)),
  asset_version INTEGER NOT NULL DEFAULT 1,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(store_key) REFERENCES enterprise_store_classes(store_key),
  FOREIGN KEY(transaction_policy_key) REFERENCES enterprise_transaction_policies(policy_key),
  FOREIGN KEY(integrity_policy_key) REFERENCES enterprise_integrity_policies(policy_key),
  FOREIGN KEY(partition_policy_key) REFERENCES enterprise_partition_policies(policy_key),
  FOREIGN KEY(repository_boundary_key) REFERENCES enterprise_repository_boundaries(boundary_key),
  FOREIGN KEY(adapter_boundary_key) REFERENCES enterprise_adapter_boundaries(boundary_key)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_persistence_domains_store
  ON enterprise_persistence_domains(store_key);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_persistence_domains_uuid_immutable
BEFORE UPDATE OF persistence_domain_uuid ON enterprise_persistence_domains
FOR EACH ROW
WHEN OLD.persistence_domain_uuid <> NEW.persistence_domain_uuid
BEGIN
  SELECT RAISE(ABORT, 'persistence_domain_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_persistence_domain_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dependency_uuid TEXT NOT NULL UNIQUE,
  source_domain_key TEXT NOT NULL,
  target_domain_key TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  dependency_strength TEXT NOT NULL DEFAULT 'required',
  dependency_direction TEXT NOT NULL DEFAULT 'forward',
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_domain_key, target_domain_key, dependency_type),
  FOREIGN KEY(source_domain_key) REFERENCES enterprise_persistence_domains(domain_key),
  FOREIGN KEY(target_domain_key) REFERENCES enterprise_persistence_domains(domain_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_persistence_domain_dependencies_uuid_immutable
BEFORE UPDATE OF dependency_uuid ON enterprise_persistence_domain_dependencies
FOR EACH ROW
WHEN OLD.dependency_uuid <> NEW.dependency_uuid
BEGIN
  SELECT RAISE(ABORT, 'dependency_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_migration_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_registry_uuid TEXT NOT NULL UNIQUE,
  migration_key TEXT NOT NULL UNIQUE,
  migration_name TEXT NOT NULL,
  schema_key TEXT NOT NULL,
  target_schema_version_number INTEGER NOT NULL,
  report_path TEXT,
  checksum_sha256 TEXT,
  migration_status TEXT NOT NULL,
  additive_only INTEGER NOT NULL DEFAULT 1 CHECK (additive_only IN (0, 1)),
  rollback_required INTEGER NOT NULL DEFAULT 1 CHECK (rollback_required IN (0, 1)),
  lifecycle_status TEXT NOT NULL DEFAULT 'Applied',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(schema_key) REFERENCES enterprise_schema_versions(schema_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_migration_registry_uuid_immutable
BEFORE UPDATE OF migration_registry_uuid ON enterprise_migration_registry
FOR EACH ROW
WHEN OLD.migration_registry_uuid <> NEW.migration_registry_uuid
BEGIN
  SELECT RAISE(ABORT, 'migration_registry_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_migration_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dependency_uuid TEXT NOT NULL UNIQUE,
  migration_key TEXT NOT NULL,
  depends_on_migration_key TEXT NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'requires',
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(migration_key, depends_on_migration_key),
  FOREIGN KEY(migration_key) REFERENCES enterprise_migration_registry(migration_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_migration_dependencies_uuid_immutable
BEFORE UPDATE OF dependency_uuid ON enterprise_migration_dependencies
FOR EACH ROW
WHEN OLD.dependency_uuid <> NEW.dependency_uuid
BEGIN
  SELECT RAISE(ABORT, 'dependency_uuid is immutable');
END;
