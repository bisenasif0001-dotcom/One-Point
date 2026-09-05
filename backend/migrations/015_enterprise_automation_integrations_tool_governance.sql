PRAGMA foreign_keys = ON;

-- 1. enterprise_tool_registry
CREATE TABLE IF NOT EXISTS enterprise_tool_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  tool_name TEXT NOT NULL,
  tool_type TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_registry_uuid_immutable
BEFORE UPDATE OF tool_uuid ON enterprise_tool_registry
FOR EACH ROW
WHEN OLD.tool_uuid <> NEW.tool_uuid
BEGIN
  SELECT RAISE(ABORT, 'tool_uuid is immutable');
END;

-- 2. enterprise_tool_versions
CREATE TABLE IF NOT EXISTS enterprise_tool_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_version_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL,
  tool_version TEXT NOT NULL,
  compatibility_window TEXT NOT NULL,
  compatibility_start TEXT,
  compatibility_end TEXT,
  deprecated_after TEXT,
  replacement_tool_key TEXT,
  migration_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tool_key, tool_version),
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_versions_uuid_immutable
BEFORE UPDATE OF tool_version_uuid ON enterprise_tool_versions
FOR EACH ROW
WHEN OLD.tool_version_uuid <> NEW.tool_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'tool_version_uuid is immutable');
END;

-- 3. enterprise_tool_contracts
CREATE TABLE IF NOT EXISTS enterprise_tool_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  input_schema_json TEXT NOT NULL,
  output_schema_json TEXT NOT NULL,
  validation_contract_json TEXT NOT NULL,
  timeout_contract_policy TEXT NOT NULL,
  retry_contract_policy TEXT NOT NULL,
  error_contract_policy TEXT NOT NULL,
  compatibility_contract_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tool_key, contract_version),
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_contracts_uuid_immutable
BEFORE UPDATE OF contract_uuid ON enterprise_tool_contracts
FOR EACH ROW
WHEN OLD.contract_uuid <> NEW.contract_uuid
BEGIN
  SELECT RAISE(ABORT, 'contract_uuid is immutable');
END;

-- 4. enterprise_tool_dependencies
CREATE TABLE IF NOT EXISTS enterprise_tool_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dependency_uuid TEXT NOT NULL UNIQUE,
  parent_tool TEXT NOT NULL,
  dependent_tool TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  dependency_version TEXT NOT NULL,
  dependency_scope TEXT NOT NULL,
  dependency_policy TEXT NOT NULL,
  dependency_status TEXT NOT NULL DEFAULT 'Active',
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_tool, dependent_tool),
  FOREIGN KEY(parent_tool) REFERENCES enterprise_tool_registry(tool_key),
  FOREIGN KEY(dependent_tool) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_dependencies_uuid_immutable
BEFORE UPDATE OF dependency_uuid ON enterprise_tool_dependencies
FOR EACH ROW
WHEN OLD.dependency_uuid <> NEW.dependency_uuid
BEGIN
  SELECT RAISE(ABORT, 'dependency_uuid is immutable');
END;

-- 5. enterprise_tool_classifications
CREATE TABLE IF NOT EXISTS enterprise_tool_classifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classification_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  execution_scope TEXT NOT NULL CHECK (execution_scope IN ('Safe', 'Privileged', 'Dangerous', 'Financial', 'Legal', 'Identity', 'System', 'AI-only', 'Admin-only', 'Public')),
  security_clearance_required TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_classifications_uuid_immutable
BEFORE UPDATE OF classification_uuid ON enterprise_tool_classifications
FOR EACH ROW
WHEN OLD.classification_uuid <> NEW.classification_uuid
BEGIN
  SELECT RAISE(ABORT, 'classification_uuid is immutable');
END;

-- 6. enterprise_tool_sandboxes
CREATE TABLE IF NOT EXISTS enterprise_tool_sandboxes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sandbox_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  sandbox_class TEXT NOT NULL,
  filesystem_access TEXT NOT NULL,
  network_access TEXT NOT NULL,
  database_access TEXT NOT NULL,
  environment_access TEXT NOT NULL,
  resource_limits TEXT NOT NULL,
  execution_boundary TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_sandboxes_uuid_immutable
BEFORE UPDATE OF sandbox_uuid ON enterprise_tool_sandboxes
FOR EACH ROW
WHEN OLD.sandbox_uuid <> NEW.sandbox_uuid
BEGIN
  SELECT RAISE(ABORT, 'sandbox_uuid is immutable');
END;

-- 7. enterprise_tool_output_governance
CREATE TABLE IF NOT EXISTS enterprise_tool_output_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  output_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  output_projection TEXT NOT NULL,
  output_classification TEXT NOT NULL,
  output_visibility TEXT NOT NULL,
  output_retention TEXT NOT NULL,
  output_masking_policy TEXT NOT NULL,
  output_archive_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_output_governance_uuid_immutable
BEFORE UPDATE OF output_uuid ON enterprise_tool_output_governance
FOR EACH ROW
WHEN OLD.output_uuid <> NEW.output_uuid
BEGIN
  SELECT RAISE(ABORT, 'output_uuid is immutable');
END;

-- 8. enterprise_tool_observability
CREATE TABLE IF NOT EXISTS enterprise_tool_observability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observability_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  execution_latency INTEGER NOT NULL DEFAULT 0,
  execution_duration INTEGER NOT NULL DEFAULT 0,
  resource_usage TEXT NOT NULL DEFAULT '{}',
  success_rate REAL NOT NULL DEFAULT 1.0,
  failure_rate REAL NOT NULL DEFAULT 0.0,
  metrics_policy TEXT NOT NULL,
  monitoring_policy TEXT NOT NULL,
  trace_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_observability_uuid_immutable
BEFORE UPDATE OF observability_uuid ON enterprise_tool_observability
FOR EACH ROW
WHEN OLD.observability_uuid <> NEW.observability_uuid
BEGIN
  SELECT RAISE(ABORT, 'observability_uuid is immutable');
END;

-- 9. enterprise_tool_execution_ownership
CREATE TABLE IF NOT EXISTS enterprise_tool_execution_ownership (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ownership_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  business_owner TEXT NOT NULL,
  technical_owner TEXT NOT NULL,
  security_owner TEXT NOT NULL,
  support_owner TEXT NOT NULL,
  approver TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_execution_ownership_uuid_immutable
BEFORE UPDATE OF ownership_uuid ON enterprise_tool_execution_ownership
FOR EACH ROW
WHEN OLD.ownership_uuid <> NEW.ownership_uuid
BEGIN
  SELECT RAISE(ABORT, 'ownership_uuid is immutable');
END;

-- 10. enterprise_tool_executions (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS enterprise_tool_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL,
  execution_state TEXT NOT NULL CHECK (execution_state IN ('Pending', 'Queued', 'Running', 'Completed', 'Failed', 'Cancelled', 'RolledBack', 'TimedOut', 'PartiallyCompleted')),
  caller_identity TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_executions_uuid_immutable
BEFORE UPDATE OF execution_uuid ON enterprise_tool_executions
FOR EACH ROW
WHEN OLD.execution_uuid <> NEW.execution_uuid
BEGIN
  SELECT RAISE(ABORT, 'execution_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_executions_append_only_update
BEFORE UPDATE ON enterprise_tool_executions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_tool_executions table is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_executions_append_only_delete
BEFORE DELETE ON enterprise_tool_executions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_tool_executions table is append-only');
END;

-- 11. enterprise_tool_execution_priorities
CREATE TABLE IF NOT EXISTS enterprise_tool_execution_priorities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  priority_level TEXT NOT NULL,
  priority_weight INTEGER NOT NULL,
  scheduling_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_execution_priorities_uuid_immutable
BEFORE UPDATE OF priority_uuid ON enterprise_tool_execution_priorities
FOR EACH ROW
WHEN OLD.priority_uuid <> NEW.priority_uuid
BEGIN
  SELECT RAISE(ABORT, 'priority_uuid is immutable');
END;

-- 12. enterprise_tool_execution_idempotency
CREATE TABLE IF NOT EXISTS enterprise_tool_execution_idempotency (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  idempotency_key_schema TEXT NOT NULL,
  idempotency_ttl INTEGER NOT NULL,
  idempotency_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_execution_idempotency_uuid_immutable
BEFORE UPDATE OF idempotency_uuid ON enterprise_tool_execution_idempotency
FOR EACH ROW
WHEN OLD.idempotency_uuid <> NEW.idempotency_uuid
BEGIN
  SELECT RAISE(ABORT, 'idempotency_uuid is immutable');
END;

-- 13. enterprise_tool_bulk_execution
CREATE TABLE IF NOT EXISTS enterprise_tool_bulk_execution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bulk_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  bulk_execution_policy TEXT NOT NULL,
  parallel_execution INTEGER NOT NULL DEFAULT 1,
  chunk_size INTEGER NOT NULL DEFAULT 100,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_bulk_execution_uuid_immutable
BEFORE UPDATE OF bulk_uuid ON enterprise_tool_bulk_execution
FOR EACH ROW
WHEN OLD.bulk_uuid <> NEW.bulk_uuid
BEGIN
  SELECT RAISE(ABORT, 'bulk_uuid is immutable');
END;

-- 14. enterprise_tool_resource_governance
CREATE TABLE IF NOT EXISTS enterprise_tool_resource_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  resource_governance_policy TEXT NOT NULL,
  cpu_quota TEXT NOT NULL,
  memory_quota TEXT NOT NULL,
  network_quota TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tool_resource_governance_uuid_immutable
BEFORE UPDATE OF resource_uuid ON enterprise_tool_resource_governance
FOR EACH ROW
WHEN OLD.resource_uuid <> NEW.resource_uuid
BEGIN
  SELECT RAISE(ABORT, 'resource_uuid is immutable');
END;

-- 15. enterprise_provider_capabilities
CREATE TABLE IF NOT EXISTS enterprise_provider_capabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capability_uuid TEXT NOT NULL UNIQUE,
  provider_key TEXT NOT NULL,
  capability_key TEXT NOT NULL,
  capability_name TEXT NOT NULL,
  sla_metadata TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_key, capability_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_provider_capabilities_uuid_immutable
BEFORE UPDATE OF capability_uuid ON enterprise_provider_capabilities
FOR EACH ROW
WHEN OLD.capability_uuid <> NEW.capability_uuid
BEGIN
  SELECT RAISE(ABORT, 'capability_uuid is immutable');
END;

-- 16. enterprise_provider_trust
CREATE TABLE IF NOT EXISTS enterprise_provider_trust (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trust_uuid TEXT NOT NULL UNIQUE,
  provider_key TEXT NOT NULL UNIQUE,
  trust_level TEXT NOT NULL,
  security_profile TEXT NOT NULL,
  audit_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_provider_trust_uuid_immutable
BEFORE UPDATE OF trust_uuid ON enterprise_provider_trust
FOR EACH ROW
WHEN OLD.trust_uuid <> NEW.trust_uuid
BEGIN
  SELECT RAISE(ABORT, 'trust_uuid is immutable');
END;

-- 17. enterprise_provider_health
CREATE TABLE IF NOT EXISTS enterprise_provider_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  health_uuid TEXT NOT NULL UNIQUE,
  provider_key TEXT NOT NULL UNIQUE,
  heartbeat_interval INTEGER NOT NULL,
  last_heartbeat TEXT,
  health_status TEXT NOT NULL,
  degradation_mode TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_provider_health_uuid_immutable
BEFORE UPDATE OF health_uuid ON enterprise_provider_health
FOR EACH ROW
WHEN OLD.health_uuid <> NEW.health_uuid
BEGIN
  SELECT RAISE(ABORT, 'health_uuid is immutable');
END;

-- 18. enterprise_integration_registry
CREATE TABLE IF NOT EXISTS enterprise_integration_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  integration_uuid TEXT NOT NULL UNIQUE,
  integration_key TEXT NOT NULL UNIQUE,
  integration_name TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_integration_registry_uuid_immutable
BEFORE UPDATE OF integration_uuid ON enterprise_integration_registry
FOR EACH ROW
WHEN OLD.integration_uuid <> NEW.integration_uuid
BEGIN
  SELECT RAISE(ABORT, 'integration_uuid is immutable');
END;

-- 19. enterprise_integration_contracts
CREATE TABLE IF NOT EXISTS enterprise_integration_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_uuid TEXT NOT NULL UNIQUE,
  integration_key TEXT NOT NULL UNIQUE,
  request_contract_schema TEXT NOT NULL,
  response_contract_schema TEXT NOT NULL,
  callback_contract_schema TEXT NOT NULL,
  signature_contract_profile TEXT NOT NULL,
  timeout_contract_policy TEXT NOT NULL,
  compatibility_contract_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(integration_key) REFERENCES enterprise_integration_registry(integration_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_integration_contracts_uuid_immutable
BEFORE UPDATE OF contract_uuid ON enterprise_integration_contracts
FOR EACH ROW
WHEN OLD.contract_uuid <> NEW.contract_uuid
BEGIN
  SELECT RAISE(ABORT, 'contract_uuid is immutable');
END;

-- 20. enterprise_integration_lifecycle
CREATE TABLE IF NOT EXISTS enterprise_integration_lifecycle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lifecycle_uuid TEXT NOT NULL UNIQUE,
  integration_key TEXT NOT NULL UNIQUE,
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('Draft', 'Active', 'Deprecated', 'Retired', 'EmergencyDisabled')),
  effective_date TEXT,
  expiration_date TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(integration_key) REFERENCES enterprise_integration_registry(integration_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_integration_lifecycle_uuid_immutable
BEFORE UPDATE OF lifecycle_uuid ON enterprise_integration_lifecycle
FOR EACH ROW
WHEN OLD.lifecycle_uuid <> NEW.lifecycle_uuid
BEGIN
  SELECT RAISE(ABORT, 'lifecycle_uuid is immutable');
END;

-- 21. enterprise_webhook_governance
CREATE TABLE IF NOT EXISTS enterprise_webhook_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_uuid TEXT NOT NULL UNIQUE,
  integration_key TEXT NOT NULL UNIQUE,
  signature_header TEXT NOT NULL,
  signature_algorithm TEXT NOT NULL,
  retry_policy_key TEXT NOT NULL,
  delivery_policy_key TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(integration_key) REFERENCES enterprise_integration_registry(integration_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_webhook_governance_uuid_immutable
BEFORE UPDATE OF webhook_uuid ON enterprise_webhook_governance
FOR EACH ROW
WHEN OLD.webhook_uuid <> NEW.webhook_uuid
BEGIN
  SELECT RAISE(ABORT, 'webhook_uuid is immutable');
END;

-- 22. enterprise_callback_governance
CREATE TABLE IF NOT EXISTS enterprise_callback_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  callback_uuid TEXT NOT NULL UNIQUE,
  integration_key TEXT NOT NULL UNIQUE,
  callback_url TEXT NOT NULL,
  callback_security TEXT NOT NULL,
  callback_timeout INTEGER NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(integration_key) REFERENCES enterprise_integration_registry(integration_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_callback_governance_uuid_immutable
BEFORE UPDATE OF callback_uuid ON enterprise_callback_governance
FOR EACH ROW
WHEN OLD.callback_uuid <> NEW.callback_uuid
BEGIN
  SELECT RAISE(ABORT, 'callback_uuid is immutable');
END;

-- 23. enterprise_credential_rotation
CREATE TABLE IF NOT EXISTS enterprise_credential_rotation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rotation_uuid TEXT NOT NULL UNIQUE,
  credential_key TEXT NOT NULL UNIQUE,
  rotation_interval INTEGER NOT NULL,
  last_rotated TEXT,
  next_rotation TEXT,
  rollover_policy TEXT NOT NULL,
  revocation_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_credential_rotation_uuid_immutable
BEFORE UPDATE OF rotation_uuid ON enterprise_credential_rotation
FOR EACH ROW
WHEN OLD.rotation_uuid <> NEW.rotation_uuid
BEGIN
  SELECT RAISE(ABORT, 'rotation_uuid is immutable');
END;

-- 24. enterprise_secret_usage (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS enterprise_secret_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  secret_usage_uuid TEXT NOT NULL UNIQUE,
  secret_key TEXT NOT NULL,
  caller_identity TEXT NOT NULL,
  access_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  access_purpose TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_secret_usage_uuid_immutable
BEFORE UPDATE OF secret_usage_uuid ON enterprise_secret_usage
FOR EACH ROW
WHEN OLD.secret_usage_uuid <> NEW.secret_usage_uuid
BEGIN
  SELECT RAISE(ABORT, 'secret_usage_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_secret_usage_append_only_update
BEFORE UPDATE ON enterprise_secret_usage
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_secret_usage table is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_secret_usage_append_only_delete
BEFORE DELETE ON enterprise_secret_usage
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_secret_usage table is append-only');
END;

-- 25. enterprise_rate_limit_policies
CREATE TABLE IF NOT EXISTS enterprise_rate_limit_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rate_limit_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  burst_limit INTEGER NOT NULL,
  sustained_limit INTEGER NOT NULL,
  quota_limit INTEGER NOT NULL,
  backoff_policy TEXT NOT NULL,
  retry_budget INTEGER NOT NULL,
  tenant_rate_limit INTEGER,
  branch_rate_limit INTEGER,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_rate_limit_policies_uuid_immutable
BEFORE UPDATE OF rate_limit_uuid ON enterprise_rate_limit_policies
FOR EACH ROW
WHEN OLD.rate_limit_uuid <> NEW.rate_limit_uuid
BEGIN
  SELECT RAISE(ABORT, 'rate_limit_uuid is immutable');
END;

-- 26. enterprise_circuit_breaker_policies
CREATE TABLE IF NOT EXISTS enterprise_circuit_breaker_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  breaker_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  failure_threshold REAL NOT NULL,
  recovery_timeout INTEGER NOT NULL,
  breaker_state TEXT NOT NULL CHECK (breaker_state IN ('Closed', 'Open', 'HalfOpen')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_circuit_breaker_policies_uuid_immutable
BEFORE UPDATE OF breaker_uuid ON enterprise_circuit_breaker_policies
FOR EACH ROW
WHEN OLD.breaker_uuid <> NEW.breaker_uuid
BEGIN
  SELECT RAISE(ABORT, 'breaker_uuid is immutable');
END;

-- 27. enterprise_human_approval_policies
CREATE TABLE IF NOT EXISTS enterprise_human_approval_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  approval_chain_json TEXT NOT NULL,
  dual_approval_required INTEGER NOT NULL DEFAULT 0,
  timeout_policy TEXT NOT NULL,
  override_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_human_approval_policies_uuid_immutable
BEFORE UPDATE OF approval_uuid ON enterprise_human_approval_policies
FOR EACH ROW
WHEN OLD.approval_uuid <> NEW.approval_uuid
BEGIN
  SELECT RAISE(ABORT, 'approval_uuid is immutable');
END;

-- 28. enterprise_policy_hierarchy
CREATE TABLE IF NOT EXISTS enterprise_policy_hierarchy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_hierarchy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  parent_policy_key TEXT,
  policy_level TEXT NOT NULL CHECK (policy_level IN ('Enterprise', 'Organization', 'Branch', 'Franchise', 'Regional', 'Tool', 'Integration', 'Override')),
  policy_scope TEXT NOT NULL,
  policy_precedence INTEGER NOT NULL,
  policy_override_mode TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_policy_hierarchy_uuid_immutable
BEFORE UPDATE OF policy_hierarchy_uuid ON enterprise_policy_hierarchy
FOR EACH ROW
WHEN OLD.policy_hierarchy_uuid <> NEW.policy_hierarchy_uuid
BEGIN
  SELECT RAISE(ABORT, 'policy_hierarchy_uuid is immutable');
END;

-- 29. enterprise_governance_change_control
CREATE TABLE IF NOT EXISTS enterprise_governance_change_control (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  governance_change_uuid TEXT NOT NULL UNIQUE,
  change_key TEXT NOT NULL UNIQUE,
  target_registry TEXT NOT NULL,
  governance_version INTEGER NOT NULL,
  governance_superseded_by TEXT,
  governance_status TEXT NOT NULL CHECK (governance_status IN ('Pending', 'Approved', 'Superseded', 'EmergencyRetired')),
  effective_date TEXT,
  expiration_date TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_governance_change_control_uuid_immutable
BEFORE UPDATE OF governance_change_uuid ON enterprise_governance_change_control
FOR EACH ROW
WHEN OLD.governance_change_uuid <> NEW.governance_change_uuid
BEGIN
  SELECT RAISE(ABORT, 'governance_change_uuid is immutable');
END;

-- 30. enterprise_metadata_classifications
CREATE TABLE IF NOT EXISTS enterprise_metadata_classifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classification_uuid TEXT NOT NULL UNIQUE,
  classification_key TEXT NOT NULL UNIQUE,
  mandatory_flag INTEGER NOT NULL DEFAULT 0 CHECK (mandatory_flag IN (0,1)),
  optional_flag INTEGER NOT NULL DEFAULT 1 CHECK (optional_flag IN (0,1)),
  inherited_flag INTEGER NOT NULL DEFAULT 0 CHECK (inherited_flag IN (0,1)),
  calculated_flag INTEGER NOT NULL DEFAULT 0 CHECK (calculated_flag IN (0,1)),
  immutable_flag INTEGER NOT NULL DEFAULT 0 CHECK (immutable_flag IN (0,1)),
  deprecated_flag INTEGER NOT NULL DEFAULT 0 CHECK (deprecated_flag IN (0,1)),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_metadata_classifications_uuid_immutable
BEFORE UPDATE OF classification_uuid ON enterprise_metadata_classifications
FOR EACH ROW
WHEN OLD.classification_uuid <> NEW.classification_uuid
BEGIN
  SELECT RAISE(ABORT, 'classification_uuid is immutable');
END;

-- 31. enterprise_multi_tenant_governance
CREATE TABLE IF NOT EXISTS enterprise_multi_tenant_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_uuid TEXT NOT NULL UNIQUE,
  tenant_key TEXT NOT NULL UNIQUE,
  tenant_scope TEXT NOT NULL,
  organization_scope TEXT NOT NULL,
  branch_scope TEXT NOT NULL,
  franchise_scope TEXT NOT NULL,
  tenant_isolation_policy TEXT NOT NULL,
  execution_visibility TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_multi_tenant_governance_uuid_immutable
BEFORE UPDATE OF tenant_uuid ON enterprise_multi_tenant_governance
FOR EACH ROW
WHEN OLD.tenant_uuid <> NEW.tenant_uuid
BEGIN
  SELECT RAISE(ABORT, 'tenant_uuid is immutable');
END;

-- 32. enterprise_cost_governance
CREATE TABLE IF NOT EXISTS enterprise_cost_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  cost_policy TEXT NOT NULL,
  cost_limit_budget REAL NOT NULL,
  cost_accumulated REAL NOT NULL DEFAULT 0.0,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tool_key) REFERENCES enterprise_tool_registry(tool_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_cost_governance_uuid_immutable
BEFORE UPDATE OF cost_uuid ON enterprise_cost_governance
FOR EACH ROW
WHEN OLD.cost_uuid <> NEW.cost_uuid
BEGIN
  SELECT RAISE(ABORT, 'cost_uuid is immutable');
END;

-- 33. enterprise_compliance_governance
CREATE TABLE IF NOT EXISTS enterprise_compliance_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compliance_uuid TEXT NOT NULL UNIQUE,
  compliance_key TEXT NOT NULL UNIQUE,
  audit_retention INTEGER NOT NULL,
  legal_hold INTEGER NOT NULL DEFAULT 0 CHECK (legal_hold IN (0,1)),
  compliance_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_compliance_governance_uuid_immutable
BEFORE UPDATE OF compliance_uuid ON enterprise_compliance_governance
FOR EACH ROW
WHEN OLD.compliance_uuid <> NEW.compliance_uuid
BEGIN
  SELECT RAISE(ABORT, 'compliance_uuid is immutable');
END;

-- 34. enterprise_disaster_recovery_governance
CREATE TABLE IF NOT EXISTS enterprise_disaster_recovery_governance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dr_uuid TEXT NOT NULL UNIQUE,
  dr_key TEXT NOT NULL UNIQUE,
  provider_failover TEXT NOT NULL,
  automation_recovery TEXT NOT NULL,
  tool_recovery TEXT NOT NULL,
  integration_recovery TEXT NOT NULL,
  disaster_recovery_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_disaster_recovery_governance_uuid_immutable
BEFORE UPDATE OF dr_uuid ON enterprise_disaster_recovery_governance
FOR EACH ROW
WHEN OLD.dr_uuid <> NEW.dr_uuid
BEGIN
  SELECT RAISE(ABORT, 'dr_uuid is immutable');
END;

-- 35. enterprise_automation_registry
CREATE TABLE IF NOT EXISTS enterprise_automation_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation_uuid TEXT NOT NULL UNIQUE,
  automation_key TEXT NOT NULL UNIQUE,
  automation_name TEXT NOT NULL,
  automation_type TEXT NOT NULL,
  scheduling_policy_key TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_automation_registry_uuid_immutable
BEFORE UPDATE OF automation_uuid ON enterprise_automation_registry
FOR EACH ROW
WHEN OLD.automation_uuid <> NEW.automation_uuid
BEGIN
  SELECT RAISE(ABORT, 'automation_uuid is immutable');
END;

-- 36. enterprise_automation_lifecycle
CREATE TABLE IF NOT EXISTS enterprise_automation_lifecycle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lifecycle_uuid TEXT NOT NULL UNIQUE,
  automation_key TEXT NOT NULL UNIQUE,
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('Draft', 'PendingApproval', 'Active', 'Suspended', 'Deprecated', 'Retired', 'EmergencyDisabled')),
  effective_date TEXT,
  expiration_date TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(automation_key) REFERENCES enterprise_automation_registry(automation_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_automation_lifecycle_uuid_immutable
BEFORE UPDATE OF lifecycle_uuid ON enterprise_automation_lifecycle
FOR EACH ROW
WHEN OLD.lifecycle_uuid <> NEW.lifecycle_uuid
BEGIN
  SELECT RAISE(ABORT, 'lifecycle_uuid is immutable');
END;

-- 37. enterprise_automation_scheduling
CREATE TABLE IF NOT EXISTS enterprise_automation_scheduling (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduling_uuid TEXT NOT NULL UNIQUE,
  automation_key TEXT NOT NULL UNIQUE,
  cron_expression TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  retry_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(automation_key) REFERENCES enterprise_automation_registry(automation_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_automation_scheduling_uuid_immutable
BEFORE UPDATE OF scheduling_uuid ON enterprise_automation_scheduling
FOR EACH ROW
WHEN OLD.scheduling_uuid <> NEW.scheduling_uuid
BEGIN
  SELECT RAISE(ABORT, 'scheduling_uuid is immutable');
END;

-- 38. enterprise_automation_policies
CREATE TABLE IF NOT EXISTS enterprise_automation_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_uuid TEXT NOT NULL UNIQUE,
  automation_key TEXT NOT NULL UNIQUE,
  execution_policy TEXT NOT NULL,
  recovery_policy TEXT NOT NULL,
  escalation_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(automation_key) REFERENCES enterprise_automation_registry(automation_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_automation_policies_uuid_immutable
BEFORE UPDATE OF policy_uuid ON enterprise_automation_policies
FOR EACH ROW
WHEN OLD.policy_uuid <> NEW.policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'policy_uuid is immutable');
END;

-- 39. enterprise_automation_executions (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS enterprise_automation_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_uuid TEXT NOT NULL UNIQUE,
  automation_key TEXT NOT NULL,
  execution_status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(automation_key) REFERENCES enterprise_automation_registry(automation_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_automation_executions_uuid_immutable
BEFORE UPDATE OF execution_uuid ON enterprise_automation_executions
FOR EACH ROW
WHEN OLD.execution_uuid <> NEW.execution_uuid
BEGIN
  SELECT RAISE(ABORT, 'execution_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_automation_executions_append_only_update
BEFORE UPDATE ON enterprise_automation_executions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_automation_executions table is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_automation_executions_append_only_delete
BEFORE DELETE ON enterprise_automation_executions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'enterprise_automation_executions table is append-only');
END;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_enterprise_tool_versions_key ON enterprise_tool_versions(tool_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_tool_contracts_key ON enterprise_tool_contracts(tool_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_tool_dependencies_parent ON enterprise_tool_dependencies(parent_tool);
CREATE INDEX IF NOT EXISTS idx_enterprise_tool_dependencies_dep ON enterprise_tool_dependencies(dependent_tool);
CREATE INDEX IF NOT EXISTS idx_enterprise_tool_executions_key ON enterprise_tool_executions(tool_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_tool_executions_created ON enterprise_tool_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_enterprise_automation_executions_key ON enterprise_automation_executions(automation_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_automation_executions_created ON enterprise_automation_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_enterprise_integration_contracts_key ON enterprise_integration_contracts(integration_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_webhook_governance_key ON enterprise_webhook_governance(integration_key);
CREATE INDEX IF NOT EXISTS idx_enterprise_callback_governance_key ON enterprise_callback_governance(integration_key);
