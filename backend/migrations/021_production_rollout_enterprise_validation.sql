-- Phase 4 - Milestone 4.5 Production Rollout and Enterprise Validation
-- DDL Migration 021 - Production Governance Metadata Registries
-- Additive only. Atomic. Rollback-safe. Idempotent. UUID governed. Backward compatible.

-- ───────────────────────────────────────────────────────────────────
-- 1. Production Readiness Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_production_readiness (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  readiness_uuid TEXT NOT NULL UNIQUE,
  readiness_key TEXT NOT NULL UNIQUE,
  environment_name TEXT NOT NULL DEFAULT 'production',
  readiness_status TEXT NOT NULL DEFAULT 'Pending',
  migration_verified INTEGER NOT NULL DEFAULT 0,
  schema_verified INTEGER NOT NULL DEFAULT 0,
  seed_verified INTEGER NOT NULL DEFAULT 0,
  health_verified INTEGER NOT NULL DEFAULT 0,
  security_verified INTEGER NOT NULL DEFAULT 0,
  rollback_verified INTEGER NOT NULL DEFAULT 0,
  overall_score REAL DEFAULT 0.0,
  assessed_by TEXT,
  assessed_at TEXT,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prod_readiness_key ON enterprise_production_readiness(readiness_key);
CREATE INDEX IF NOT EXISTS idx_prod_readiness_env ON enterprise_production_readiness(environment_name);
CREATE INDEX IF NOT EXISTS idx_prod_readiness_status ON enterprise_production_readiness(readiness_status);

CREATE TRIGGER IF NOT EXISTS trg_prod_readiness_uuid_immutable
BEFORE UPDATE OF readiness_uuid ON enterprise_production_readiness
BEGIN
  SELECT RAISE(ABORT, 'readiness_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 2. Deployment Policy Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_deployment_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  policy_name TEXT NOT NULL,
  environment_name TEXT NOT NULL DEFAULT 'production',
  deployment_strategy TEXT NOT NULL DEFAULT 'Rolling',
  requires_approval INTEGER NOT NULL DEFAULT 1,
  requires_backup INTEGER NOT NULL DEFAULT 1,
  requires_health_check INTEGER NOT NULL DEFAULT 1,
  max_rollout_duration_minutes INTEGER DEFAULT 60,
  rollback_timeout_minutes INTEGER DEFAULT 15,
  approval_chain TEXT,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deploy_policy_key ON enterprise_deployment_policies(policy_key);
CREATE INDEX IF NOT EXISTS idx_deploy_policy_env ON enterprise_deployment_policies(environment_name);

CREATE TRIGGER IF NOT EXISTS trg_deploy_policy_uuid_immutable
BEFORE UPDATE OF policy_uuid ON enterprise_deployment_policies
BEGIN
  SELECT RAISE(ABORT, 'policy_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 3. Rollback Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_rollback_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rollback_uuid TEXT NOT NULL UNIQUE,
  rollback_key TEXT NOT NULL UNIQUE,
  target_migration TEXT NOT NULL,
  rollback_script_path TEXT NOT NULL,
  rollback_type TEXT NOT NULL DEFAULT 'Migration',
  rollback_status TEXT NOT NULL DEFAULT 'Ready',
  tested_at TEXT,
  tested_by TEXT,
  estimated_duration_seconds INTEGER DEFAULT 30,
  requires_downtime INTEGER NOT NULL DEFAULT 0,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rollback_key ON enterprise_rollback_registry(rollback_key);
CREATE INDEX IF NOT EXISTS idx_rollback_target ON enterprise_rollback_registry(target_migration);
CREATE INDEX IF NOT EXISTS idx_rollback_status ON enterprise_rollback_registry(rollback_status);

CREATE TRIGGER IF NOT EXISTS trg_rollback_uuid_immutable
BEFORE UPDATE OF rollback_uuid ON enterprise_rollback_registry
BEGIN
  SELECT RAISE(ABORT, 'rollback_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 4. Kill Switch Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_kill_switches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  switch_uuid TEXT NOT NULL UNIQUE,
  switch_key TEXT NOT NULL UNIQUE,
  switch_name TEXT NOT NULL,
  target_system TEXT NOT NULL,
  switch_state TEXT NOT NULL DEFAULT 'Armed',
  activated_at TEXT,
  activated_by TEXT,
  deactivated_at TEXT,
  deactivated_by TEXT,
  cooldown_seconds INTEGER DEFAULT 300,
  auto_rearm INTEGER NOT NULL DEFAULT 0,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kill_switch_key ON enterprise_kill_switches(switch_key);
CREATE INDEX IF NOT EXISTS idx_kill_switch_target ON enterprise_kill_switches(target_system);
CREATE INDEX IF NOT EXISTS idx_kill_switch_state ON enterprise_kill_switches(switch_state);

CREATE TRIGGER IF NOT EXISTS trg_kill_switch_uuid_immutable
BEFORE UPDATE OF switch_uuid ON enterprise_kill_switches
BEGIN
  SELECT RAISE(ABORT, 'switch_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 5. Environment Validation Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_environment_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_uuid TEXT NOT NULL UNIQUE,
  validation_key TEXT NOT NULL UNIQUE,
  environment_name TEXT NOT NULL,
  validation_type TEXT NOT NULL DEFAULT 'PreDeployment',
  check_name TEXT NOT NULL,
  check_result TEXT NOT NULL DEFAULT 'Pending',
  check_details TEXT,
  executed_at TEXT,
  executed_by TEXT,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_env_validation_key ON enterprise_environment_validations(validation_key);
CREATE INDEX IF NOT EXISTS idx_env_validation_env ON enterprise_environment_validations(environment_name);
CREATE INDEX IF NOT EXISTS idx_env_validation_type ON enterprise_environment_validations(validation_type);

CREATE TRIGGER IF NOT EXISTS trg_env_validation_uuid_immutable
BEFORE UPDATE OF validation_uuid ON enterprise_environment_validations
BEGIN
  SELECT RAISE(ABORT, 'validation_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 6. Health Check Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_uuid TEXT NOT NULL UNIQUE,
  check_key TEXT NOT NULL UNIQUE,
  check_name TEXT NOT NULL,
  check_category TEXT NOT NULL DEFAULT 'System',
  endpoint_path TEXT,
  expected_status TEXT NOT NULL DEFAULT 'Healthy',
  actual_status TEXT DEFAULT 'Unknown',
  response_time_ms INTEGER,
  last_checked_at TEXT,
  check_interval_seconds INTEGER DEFAULT 60,
  failure_threshold INTEGER DEFAULT 3,
  consecutive_failures INTEGER DEFAULT 0,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_check_key ON enterprise_health_checks(check_key);
CREATE INDEX IF NOT EXISTS idx_health_check_category ON enterprise_health_checks(check_category);
CREATE INDEX IF NOT EXISTS idx_health_check_status ON enterprise_health_checks(actual_status);

CREATE TRIGGER IF NOT EXISTS trg_health_check_uuid_immutable
BEFORE UPDATE OF check_uuid ON enterprise_health_checks
BEGIN
  SELECT RAISE(ABORT, 'check_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 7. Rollout Validation Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_rollout_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_uuid TEXT NOT NULL UNIQUE,
  validation_key TEXT NOT NULL UNIQUE,
  rollout_phase TEXT NOT NULL DEFAULT 'PreDeployment',
  validation_name TEXT NOT NULL,
  validation_type TEXT NOT NULL DEFAULT 'Automated',
  validation_result TEXT NOT NULL DEFAULT 'Pending',
  validation_details TEXT,
  executed_at TEXT,
  executed_by TEXT,
  deployment_policy_key TEXT,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rollout_validation_key ON enterprise_rollout_validations(validation_key);
CREATE INDEX IF NOT EXISTS idx_rollout_validation_phase ON enterprise_rollout_validations(rollout_phase);
CREATE INDEX IF NOT EXISTS idx_rollout_validation_result ON enterprise_rollout_validations(validation_result);

CREATE TRIGGER IF NOT EXISTS trg_rollout_validation_uuid_immutable
BEFORE UPDATE OF validation_uuid ON enterprise_rollout_validations
BEGIN
  SELECT RAISE(ABORT, 'validation_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 8. Release Validation Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_release_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_uuid TEXT NOT NULL UNIQUE,
  validation_key TEXT NOT NULL UNIQUE,
  release_version TEXT NOT NULL,
  validation_name TEXT NOT NULL,
  validation_category TEXT NOT NULL DEFAULT 'Regression',
  validation_result TEXT NOT NULL DEFAULT 'Pending',
  validation_details TEXT,
  executed_at TEXT,
  executed_by TEXT,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_release_validation_key ON enterprise_release_validations(validation_key);
CREATE INDEX IF NOT EXISTS idx_release_validation_version ON enterprise_release_validations(release_version);
CREATE INDEX IF NOT EXISTS idx_release_validation_category ON enterprise_release_validations(validation_category);

CREATE TRIGGER IF NOT EXISTS trg_release_validation_uuid_immutable
BEFORE UPDATE OF validation_uuid ON enterprise_release_validations
BEGIN
  SELECT RAISE(ABORT, 'validation_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 9. Production Audit Registry (Append-only)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_production_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_uuid TEXT NOT NULL UNIQUE,
  audit_type TEXT NOT NULL,
  audit_action TEXT NOT NULL,
  actor TEXT,
  target_system TEXT,
  target_resource TEXT,
  audit_details TEXT,
  environment_name TEXT NOT NULL DEFAULT 'production',
  severity TEXT NOT NULL DEFAULT 'Info',
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prod_audit_type ON enterprise_production_audit_log(audit_type);
CREATE INDEX IF NOT EXISTS idx_prod_audit_action ON enterprise_production_audit_log(audit_action);
CREATE INDEX IF NOT EXISTS idx_prod_audit_env ON enterprise_production_audit_log(environment_name);
CREATE INDEX IF NOT EXISTS idx_prod_audit_severity ON enterprise_production_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_prod_audit_created ON enterprise_production_audit_log(created_at);

CREATE TRIGGER IF NOT EXISTS trg_prod_audit_uuid_immutable
BEFORE UPDATE OF audit_uuid ON enterprise_production_audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_prod_audit_append_only_update
BEFORE UPDATE ON enterprise_production_audit_log
BEGIN
  SELECT RAISE(ABORT, 'enterprise_production_audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_prod_audit_append_only_delete
BEFORE DELETE ON enterprise_production_audit_log
BEGIN
  SELECT RAISE(ABORT, 'enterprise_production_audit_log is append-only');
END;

-- ───────────────────────────────────────────────────────────────────
-- 10. Validation Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_validation_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_uuid TEXT NOT NULL UNIQUE,
  validation_key TEXT NOT NULL UNIQUE,
  validation_name TEXT NOT NULL,
  validation_scope TEXT NOT NULL DEFAULT 'System',
  validation_type TEXT NOT NULL DEFAULT 'Schema',
  target_table TEXT,
  expected_result TEXT,
  actual_result TEXT,
  validation_status TEXT NOT NULL DEFAULT 'Pending',
  last_run_at TEXT,
  run_count INTEGER DEFAULT 0,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_validation_reg_key ON enterprise_validation_registry(validation_key);
CREATE INDEX IF NOT EXISTS idx_validation_reg_scope ON enterprise_validation_registry(validation_scope);
CREATE INDEX IF NOT EXISTS idx_validation_reg_status ON enterprise_validation_registry(validation_status);

CREATE TRIGGER IF NOT EXISTS trg_validation_reg_uuid_immutable
BEFORE UPDATE OF validation_uuid ON enterprise_validation_registry
BEGIN
  SELECT RAISE(ABORT, 'validation_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 11. Configuration Governance Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_configuration_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_uuid TEXT NOT NULL UNIQUE,
  config_key TEXT NOT NULL UNIQUE,
  config_name TEXT NOT NULL,
  config_category TEXT NOT NULL DEFAULT 'System',
  config_value TEXT,
  config_type TEXT NOT NULL DEFAULT 'String',
  environment_name TEXT NOT NULL DEFAULT 'production',
  is_sensitive INTEGER NOT NULL DEFAULT 0,
  requires_restart INTEGER NOT NULL DEFAULT 0,
  last_verified_at TEXT,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_config_gov_key ON enterprise_configuration_governance(config_key);
CREATE INDEX IF NOT EXISTS idx_config_gov_category ON enterprise_configuration_governance(config_category);
CREATE INDEX IF NOT EXISTS idx_config_gov_env ON enterprise_configuration_governance(environment_name);

CREATE TRIGGER IF NOT EXISTS trg_config_gov_uuid_immutable
BEFORE UPDATE OF config_uuid ON enterprise_configuration_governance
BEGIN
  SELECT RAISE(ABORT, 'config_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 12. Release Governance Registry
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_release_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_uuid TEXT NOT NULL UNIQUE,
  release_key TEXT NOT NULL UNIQUE,
  release_version TEXT NOT NULL,
  release_name TEXT NOT NULL,
  release_status TEXT NOT NULL DEFAULT 'Planned',
  release_type TEXT NOT NULL DEFAULT 'Minor',
  environment_name TEXT NOT NULL DEFAULT 'production',
  approved_by TEXT,
  approved_at TEXT,
  deployed_at TEXT,
  deployed_by TEXT,
  rollback_available INTEGER NOT NULL DEFAULT 1,
  release_notes TEXT,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_release_gov_key ON enterprise_release_governance(release_key);
CREATE INDEX IF NOT EXISTS idx_release_gov_version ON enterprise_release_governance(release_version);
CREATE INDEX IF NOT EXISTS idx_release_gov_status ON enterprise_release_governance(release_status);

CREATE TRIGGER IF NOT EXISTS trg_release_gov_uuid_immutable
BEFORE UPDATE OF release_uuid ON enterprise_release_governance
BEGIN
  SELECT RAISE(ABORT, 'release_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- 13. Deployment Audit Log (Append-only)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_deployment_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_uuid TEXT NOT NULL UNIQUE,
  deployment_key TEXT NOT NULL,
  deployment_action TEXT NOT NULL,
  environment_name TEXT NOT NULL DEFAULT 'production',
  actor TEXT,
  action_details TEXT,
  result TEXT NOT NULL DEFAULT 'Pending',
  duration_ms INTEGER,
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deploy_audit_key ON enterprise_deployment_audit_log(deployment_key);
CREATE INDEX IF NOT EXISTS idx_deploy_audit_action ON enterprise_deployment_audit_log(deployment_action);
CREATE INDEX IF NOT EXISTS idx_deploy_audit_created ON enterprise_deployment_audit_log(created_at);

CREATE TRIGGER IF NOT EXISTS trg_deploy_audit_uuid_immutable
BEFORE UPDATE OF audit_uuid ON enterprise_deployment_audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_deploy_audit_append_only_update
BEFORE UPDATE ON enterprise_deployment_audit_log
BEGIN
  SELECT RAISE(ABORT, 'enterprise_deployment_audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_deploy_audit_append_only_delete
BEFORE DELETE ON enterprise_deployment_audit_log
BEGIN
  SELECT RAISE(ABORT, 'enterprise_deployment_audit_log is append-only');
END;

-- ───────────────────────────────────────────────────────────────────
-- 14. Health Monitoring Metrics (Append-only)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_health_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_uuid TEXT NOT NULL UNIQUE,
  check_key TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL,
  metric_unit TEXT DEFAULT 'ms',
  environment_name TEXT NOT NULL DEFAULT 'production',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_check ON enterprise_health_metrics(check_key);
CREATE INDEX IF NOT EXISTS idx_health_metrics_name ON enterprise_health_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded ON enterprise_health_metrics(recorded_at);

CREATE TRIGGER IF NOT EXISTS trg_health_metrics_uuid_immutable
BEFORE UPDATE OF metric_uuid ON enterprise_health_metrics
BEGIN
  SELECT RAISE(ABORT, 'metric_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_health_metrics_append_only_update
BEFORE UPDATE ON enterprise_health_metrics
BEGIN
  SELECT RAISE(ABORT, 'enterprise_health_metrics is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_health_metrics_append_only_delete
BEFORE DELETE ON enterprise_health_metrics
BEGIN
  SELECT RAISE(ABORT, 'enterprise_health_metrics is append-only');
END;

-- ───────────────────────────────────────────────────────────────────
-- 15. System Panel Governance
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enterprise_system_panels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  panel_uuid TEXT NOT NULL UNIQUE,
  panel_key TEXT NOT NULL UNIQUE,
  panel_name TEXT NOT NULL,
  panel_category TEXT NOT NULL DEFAULT 'Health',
  display_order INTEGER DEFAULT 0,
  data_source TEXT,
  refresh_interval_seconds INTEGER DEFAULT 30,
  visibility TEXT NOT NULL DEFAULT 'Admin',
  tenant_scope TEXT NOT NULL DEFAULT 'global_tenant',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_system_panel_key ON enterprise_system_panels(panel_key);
CREATE INDEX IF NOT EXISTS idx_system_panel_category ON enterprise_system_panels(panel_category);

CREATE TRIGGER IF NOT EXISTS trg_system_panel_uuid_immutable
BEFORE UPDATE OF panel_uuid ON enterprise_system_panels
BEGIN
  SELECT RAISE(ABORT, 'panel_uuid is immutable');
END;

-- ───────────────────────────────────────────────────────────────────
-- Migration Registry Entry
-- ───────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO enterprise_migration_registry (
  migration_registry_uuid, migration_key, migration_name, schema_key, target_schema_version_number, migration_status, applied_at
) VALUES (
  'migration-021-uuid', '021_production_rollout_enterprise_validation', 'Production Rollout and Enterprise Validation', 'one_point_enterprise_schema', 21, 'applied', datetime('now')
);
