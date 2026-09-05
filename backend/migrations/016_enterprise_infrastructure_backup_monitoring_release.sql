PRAGMA foreign_keys = ON;

-- 1. enterprise_infrastructure_environments
CREATE TABLE IF NOT EXISTS enterprise_infrastructure_environments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  environment_uuid TEXT NOT NULL UNIQUE,
  environment_key TEXT NOT NULL UNIQUE,
  environment_class TEXT NOT NULL CHECK (environment_class IN ('Dev', 'QA', 'UAT', 'Staging', 'Production', 'DR')),
  environment_owner TEXT NOT NULL,
  environment_status TEXT NOT NULL DEFAULT 'Active',
  environment_policy TEXT NOT NULL,
  environment_version TEXT NOT NULL,
  configuration_profile TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infrastructure_environments_uuid_immutable
BEFORE UPDATE OF environment_uuid ON enterprise_infrastructure_environments
FOR EACH ROW
WHEN OLD.environment_uuid <> NEW.environment_uuid
BEGIN
  SELECT RAISE(ABORT, 'environment_uuid is immutable');
END;

-- 2. enterprise_infrastructure_assets
CREATE TABLE IF NOT EXISTS enterprise_infrastructure_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_uuid TEXT NOT NULL UNIQUE,
  asset_key TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('Server', 'Database', 'Storage', 'Network', 'Certificate', 'DNS')),
  asset_owner TEXT NOT NULL,
  asset_location TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('Primary', 'Replica', 'DR', 'Virtual')),
  asset_status TEXT NOT NULL CHECK (asset_status IN ('Active', 'Maintenance', 'Deprecated')),
  asset_lifecycle TEXT NOT NULL DEFAULT 'Active',
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infrastructure_assets_uuid_immutable
BEFORE UPDATE OF asset_uuid ON enterprise_infrastructure_assets
FOR EACH ROW
WHEN OLD.asset_uuid <> NEW.asset_uuid
BEGIN
  SELECT RAISE(ABORT, 'asset_uuid is immutable');
END;

-- 3. enterprise_infra_relationships
CREATE TABLE IF NOT EXISTS enterprise_infra_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_relationship_uuid TEXT NOT NULL UNIQUE,
  parent_asset_uuid TEXT NOT NULL,
  child_asset_uuid TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('depends_on', 'contained_in', 'routes_to', 'backups_to')),
  relationship_status TEXT NOT NULL DEFAULT 'Active',
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_asset_uuid, child_asset_uuid),
  FOREIGN KEY(parent_asset_uuid) REFERENCES enterprise_infrastructure_assets(asset_uuid),
  FOREIGN KEY(child_asset_uuid) REFERENCES enterprise_infrastructure_assets(asset_uuid)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_relationships_uuid_immutable
BEFORE UPDATE OF asset_relationship_uuid ON enterprise_infra_relationships
FOR EACH ROW
WHEN OLD.asset_relationship_uuid <> NEW.asset_relationship_uuid
BEGIN
  SELECT RAISE(ABORT, 'asset_relationship_uuid is immutable');
END;

-- 4. enterprise_infra_dependencies
CREATE TABLE IF NOT EXISTS enterprise_infra_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dependency_uuid TEXT NOT NULL UNIQUE,
  parent_asset_uuid TEXT NOT NULL,
  child_asset_uuid TEXT NOT NULL,
  dependency_direction TEXT NOT NULL,
  dependency_strength TEXT NOT NULL CHECK (dependency_strength IN ('strict', 'degraded_allowed', 'optional')),
  dependency_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_asset_uuid, child_asset_uuid),
  FOREIGN KEY(parent_asset_uuid) REFERENCES enterprise_infrastructure_assets(asset_uuid),
  FOREIGN KEY(child_asset_uuid) REFERENCES enterprise_infrastructure_assets(asset_uuid)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_dependencies_uuid_immutable
BEFORE UPDATE OF dependency_uuid ON enterprise_infra_dependencies
FOR EACH ROW
WHEN OLD.dependency_uuid <> NEW.dependency_uuid
BEGIN
  SELECT RAISE(ABORT, 'dependency_uuid is immutable');
END;

-- 5. enterprise_infra_topology
CREATE TABLE IF NOT EXISTS enterprise_infra_topology (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topology_uuid TEXT NOT NULL UNIQUE,
  asset_uuid TEXT NOT NULL UNIQUE,
  topology_group TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(asset_uuid) REFERENCES enterprise_infrastructure_assets(asset_uuid)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_topology_uuid_immutable
BEFORE UPDATE OF topology_uuid ON enterprise_infra_topology
FOR EACH ROW
WHEN OLD.topology_uuid <> NEW.topology_uuid
BEGIN
  SELECT RAISE(ABORT, 'topology_uuid is immutable');
END;

-- 6. enterprise_infra_policies
CREATE TABLE IF NOT EXISTS enterprise_infra_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  infrastructure_policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  policy_owner TEXT NOT NULL,
  policy_scope TEXT NOT NULL,
  policy_precedence INTEGER NOT NULL,
  policy_status TEXT NOT NULL DEFAULT 'Active',
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_policies_uuid_immutable
BEFORE UPDATE OF infrastructure_policy_uuid ON enterprise_infra_policies
FOR EACH ROW
WHEN OLD.infrastructure_policy_uuid <> NEW.infrastructure_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'infrastructure_policy_uuid is immutable');
END;

-- 7. enterprise_infra_policy_versions
CREATE TABLE IF NOT EXISTS enterprise_infra_policy_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_version_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  version_policy TEXT NOT NULL,
  version_status TEXT NOT NULL CHECK (version_status IN ('Active', 'Deprecated', 'Retired')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(policy_key, policy_version),
  FOREIGN KEY(policy_key) REFERENCES enterprise_infra_policies(policy_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_policy_versions_uuid_immutable
BEFORE UPDATE OF policy_version_uuid ON enterprise_infra_policy_versions
FOR EACH ROW
WHEN OLD.policy_version_uuid <> NEW.policy_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'policy_version_uuid is immutable');
END;

-- 8. enterprise_infra_policy_compatibility
CREATE TABLE IF NOT EXISTS enterprise_infra_policy_compatibility (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compatibility_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  compatibility_profile TEXT NOT NULL,
  compatibility_window TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(policy_key) REFERENCES enterprise_infra_policies(policy_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_policy_compatibility_uuid_immutable
BEFORE UPDATE OF compatibility_uuid ON enterprise_infra_policy_compatibility
FOR EACH ROW
WHEN OLD.compatibility_uuid <> NEW.compatibility_uuid
BEGIN
  SELECT RAISE(ABORT, 'compatibility_uuid is immutable');
END;

-- 9. enterprise_infra_policy_lifecycle
CREATE TABLE IF NOT EXISTS enterprise_infra_policy_lifecycle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lifecycle_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  policy_lifecycle TEXT NOT NULL CHECK (policy_lifecycle IN ('Draft', 'Active', 'Deprecated', 'Retired')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(policy_key) REFERENCES enterprise_infra_policies(policy_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_policy_lifecycle_uuid_immutable
BEFORE UPDATE OF lifecycle_uuid ON enterprise_infra_policy_lifecycle
FOR EACH ROW
WHEN OLD.lifecycle_uuid <> NEW.lifecycle_uuid
BEGIN
  SELECT RAISE(ABORT, 'lifecycle_uuid is immutable');
END;

-- 10. enterprise_backup_log (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS enterprise_backup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_uuid TEXT NOT NULL UNIQUE,
  backup_key TEXT NOT NULL UNIQUE,
  backup_parent_uuid TEXT,
  backup_generation INTEGER NOT NULL DEFAULT 1,
  backup_lineage TEXT NOT NULL,
  backup_origin TEXT NOT NULL,
  backup_generation_depth INTEGER NOT NULL DEFAULT 0,
  backup_chain_status TEXT NOT NULL CHECK (backup_chain_status IN ('Valid', 'Broken', 'Untested')),
  backup_timestamp TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  backup_checksum TEXT NOT NULL,
  backup_chain TEXT NOT NULL,
  backup_integrity TEXT NOT NULL,
  backup_certificate TEXT NOT NULL,
  backup_verification TEXT NOT NULL,
  backup_rotation_policy TEXT NOT NULL,
  backup_encryption_policy TEXT NOT NULL,
  backup_retention_class TEXT NOT NULL CHECK (backup_retention_class IN ('Daily', 'Weekly', 'Monthly', 'ComplianceHold')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_backup_log_uuid_immutable
BEFORE UPDATE OF backup_uuid ON enterprise_backup_log
FOR EACH ROW
WHEN OLD.backup_uuid <> NEW.backup_uuid
BEGIN
  SELECT RAISE(ABORT, 'backup_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_backup_log_append_only_update
BEFORE UPDATE ON enterprise_backup_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_backup_log table is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_backup_log_append_only_delete
BEFORE DELETE ON enterprise_backup_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_backup_log table is append-only');
END;

-- 11. enterprise_health_probes
CREATE TABLE IF NOT EXISTS enterprise_health_probes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  probe_uuid TEXT NOT NULL UNIQUE,
  probe_key TEXT NOT NULL UNIQUE,
  probe_name TEXT NOT NULL,
  probe_type TEXT NOT NULL CHECK (probe_type IN ('Database', 'Network', 'SMTP', 'Payment', 'SMS', 'DiskSpace')),
  target_endpoint TEXT NOT NULL,
  frequency_seconds INTEGER NOT NULL,
  timeout_seconds INTEGER NOT NULL,
  degradation_threshold INTEGER NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_health_probes_uuid_immutable
BEFORE UPDATE OF probe_uuid ON enterprise_health_probes
FOR EACH ROW
WHEN OLD.probe_uuid <> NEW.probe_uuid
BEGIN
  SELECT RAISE(ABORT, 'probe_uuid is immutable');
END;

-- 12. enterprise_system_alerts (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS enterprise_system_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_uuid TEXT NOT NULL UNIQUE,
  alert_key TEXT NOT NULL UNIQUE,
  probe_key TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Info', 'Warning', 'Critical', 'Fatal')),
  alert_message TEXT NOT NULL,
  alert_state TEXT NOT NULL CHECK (alert_state IN ('Triggered', 'Acknowledged', 'Escalated', 'Resolved')),
  triggered_at TEXT NOT NULL,
  resolved_at TEXT,
  assignee_identity_uuid TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(probe_key) REFERENCES enterprise_health_probes(probe_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_system_alerts_uuid_immutable
BEFORE UPDATE OF alert_uuid ON enterprise_system_alerts
FOR EACH ROW
WHEN OLD.alert_uuid <> NEW.alert_uuid
BEGIN
  SELECT RAISE(ABORT, 'alert_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_system_alerts_append_only_update
BEFORE UPDATE ON enterprise_system_alerts
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_system_alerts table is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_system_alerts_append_only_delete
BEFORE DELETE ON enterprise_system_alerts
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_system_alerts table is append-only');
END;

-- 13. enterprise_infra_change_windows
CREATE TABLE IF NOT EXISTS enterprise_infra_change_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_window_uuid TEXT NOT NULL UNIQUE,
  change_window TEXT NOT NULL,
  maintenance_window TEXT NOT NULL,
  blackout_window TEXT NOT NULL,
  deployment_window TEXT NOT NULL,
  rollback_window TEXT NOT NULL,
  approval_window TEXT NOT NULL,
  change_policy TEXT NOT NULL,
  change_owner TEXT NOT NULL,
  change_status TEXT NOT NULL CHECK (change_status IN ('Active', 'Suspended', 'Completed')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_change_windows_uuid_immutable
BEFORE UPDATE OF change_window_uuid ON enterprise_infra_change_windows
FOR EACH ROW
WHEN OLD.change_window_uuid <> NEW.change_window_uuid
BEGIN
  SELECT RAISE(ABORT, 'change_window_uuid is immutable');
END;

-- 14. enterprise_infra_configurations
CREATE TABLE IF NOT EXISTS enterprise_infra_configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  configuration_uuid TEXT NOT NULL UNIQUE,
  configuration_key TEXT NOT NULL UNIQUE,
  configuration_version TEXT NOT NULL,
  feature_flag TEXT NOT NULL,
  environment_variable TEXT NOT NULL,
  configuration_policy TEXT NOT NULL,
  configuration_class TEXT NOT NULL CHECK (configuration_class IN ('FeatureToggle', 'SystemVariable', 'ProviderCredential', 'OperationalFlag')),
  configuration_status TEXT NOT NULL CHECK (configuration_status IN ('Draft', 'Active', 'Deprecated', 'Retired')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_configurations_uuid_immutable
BEFORE UPDATE OF configuration_uuid ON enterprise_infra_configurations
FOR EACH ROW
WHEN OLD.configuration_uuid <> NEW.configuration_uuid
BEGIN
  SELECT RAISE(ABORT, 'configuration_uuid is immutable');
END;

-- 15. enterprise_infra_releases
CREATE TABLE IF NOT EXISTS enterprise_infra_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_uuid TEXT NOT NULL UNIQUE,
  release_version TEXT NOT NULL UNIQUE,
  release_candidate TEXT NOT NULL,
  deployment_window TEXT NOT NULL,
  rollback_policy TEXT NOT NULL,
  approval_reference TEXT NOT NULL,
  release_status TEXT NOT NULL CHECK (release_status IN ('Draft', 'Staged', 'Released', 'RolledBack')),
  release_certification TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_releases_uuid_immutable
BEFORE UPDATE OF release_uuid ON enterprise_infra_releases
FOR EACH ROW
WHEN OLD.release_uuid <> NEW.release_uuid
BEGIN
  SELECT RAISE(ABORT, 'release_uuid is immutable');
END;

-- 16. enterprise_infra_observability_profiles
CREATE TABLE IF NOT EXISTS enterprise_infra_observability_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observability_uuid TEXT NOT NULL UNIQUE,
  metric_uuid TEXT NOT NULL UNIQUE,
  trace_uuid TEXT NOT NULL UNIQUE,
  log_class TEXT NOT NULL CHECK (log_class IN ('Audit', 'Security', 'Transaction', 'System')),
  incident_uuid TEXT NOT NULL UNIQUE,
  observability_policy TEXT NOT NULL,
  metrics_policy TEXT NOT NULL,
  trace_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_observability_profiles_uuid_immutable
BEFORE UPDATE OF observability_uuid ON enterprise_infra_observability_profiles
FOR EACH ROW
WHEN OLD.observability_uuid <> NEW.observability_uuid
BEGIN
  SELECT RAISE(ABORT, 'observability_uuid is immutable');
END;

-- 17. enterprise_infra_keys
CREATE TABLE IF NOT EXISTS enterprise_infra_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_uuid TEXT NOT NULL UNIQUE,
  key_class TEXT NOT NULL CHECK (key_class IN ('DB_Encryption', 'JWT_Sign', 'API_Secret', 'TLS_Cert')),
  rotation_schedule TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  revocation_policy TEXT NOT NULL,
  certificate_reference TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_keys_uuid_immutable
BEFORE UPDATE OF key_uuid ON enterprise_infra_keys
FOR EACH ROW
WHEN OLD.key_uuid <> NEW.key_uuid
BEGIN
  SELECT RAISE(ABORT, 'key_uuid is immutable');
END;

-- 18. enterprise_infra_sla_slo
CREATE TABLE IF NOT EXISTS enterprise_infra_sla_slo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sla_uuid TEXT NOT NULL UNIQUE,
  sla_target TEXT NOT NULL,
  slo_target TEXT NOT NULL,
  error_budget REAL NOT NULL,
  availability_target REAL NOT NULL,
  latency_target INTEGER NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_sla_slo_uuid_immutable
BEFORE UPDATE OF sla_uuid ON enterprise_infra_sla_slo
FOR EACH ROW
WHEN OLD.sla_uuid <> NEW.sla_uuid
BEGIN
  SELECT RAISE(ABORT, 'sla_uuid is immutable');
END;

-- 19. enterprise_infra_compliance
CREATE TABLE IF NOT EXISTS enterprise_infra_compliance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compliance_uuid TEXT NOT NULL UNIQUE,
  compliance_framework TEXT NOT NULL,
  audit_scope TEXT NOT NULL,
  retention_requirement INTEGER NOT NULL,
  evidence_policy TEXT NOT NULL,
  review_cycle TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_compliance_uuid_immutable
BEFORE UPDATE OF compliance_uuid ON enterprise_infra_compliance
FOR EACH ROW
WHEN OLD.compliance_uuid <> NEW.compliance_uuid
BEGIN
  SELECT RAISE(ABORT, 'compliance_uuid is immutable');
END;

-- 20. enterprise_infra_capacity
CREATE TABLE IF NOT EXISTS enterprise_infra_capacity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  forecast_uuid TEXT NOT NULL UNIQUE,
  capacity_forecast TEXT NOT NULL,
  growth_projection REAL NOT NULL,
  storage_projection INTEGER NOT NULL,
  compute_projection TEXT NOT NULL,
  review_date TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_infra_capacity_uuid_immutable
BEFORE UPDATE OF forecast_uuid ON enterprise_infra_capacity
FOR EACH ROW
WHEN OLD.forecast_uuid <> NEW.forecast_uuid
BEGIN
  SELECT RAISE(ABORT, 'forecast_uuid is immutable');
END;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_enterprise_infra_relationships_parent ON enterprise_infra_relationships(parent_asset_uuid);
CREATE INDEX IF NOT EXISTS idx_enterprise_infra_relationships_child ON enterprise_infra_relationships(child_asset_uuid);
CREATE INDEX IF NOT EXISTS idx_enterprise_infra_dependencies_parent ON enterprise_infra_dependencies(parent_asset_uuid);
CREATE INDEX IF NOT EXISTS idx_enterprise_infra_dependencies_child ON enterprise_infra_dependencies(child_asset_uuid);
CREATE INDEX IF NOT EXISTS idx_enterprise_infra_topology_asset ON enterprise_infra_topology(asset_uuid);
CREATE INDEX IF NOT EXISTS idx_enterprise_infra_policy_versions_key ON enterprise_infra_policy_versions(policy_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_infra_policy_compatibility_key ON enterprise_infra_policy_compatibility(policy_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_infra_policy_lifecycle_key ON enterprise_infra_policy_lifecycle(policy_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_backup_log_parent ON enterprise_backup_log(backup_parent_uuid);
CREATE INDEX IF NOT EXISTS idx_enterprise_system_alerts_probe ON enterprise_system_alerts(probe_key);
