PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS enterprise_api_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_version_uuid TEXT NOT NULL UNIQUE,
  version_key TEXT NOT NULL UNIQUE,
  version_name TEXT NOT NULL,
  api_surface TEXT NOT NULL,
  compatibility_level TEXT NOT NULL,
  response_contract_key TEXT,
  error_contract_key TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_versions_uuid_immutable
BEFORE UPDATE OF api_version_uuid ON enterprise_api_versions
FOR EACH ROW
WHEN OLD.api_version_uuid <> NEW.api_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'api_version_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_response_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  response_contract_uuid TEXT NOT NULL UNIQUE,
  contract_key TEXT NOT NULL UNIQUE,
  contract_name TEXT NOT NULL,
  response_envelope_type TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_response_contracts_uuid_immutable
BEFORE UPDATE OF response_contract_uuid ON enterprise_response_contracts
FOR EACH ROW
WHEN OLD.response_contract_uuid <> NEW.response_contract_uuid
BEGIN
  SELECT RAISE(ABORT, 'response_contract_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_error_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_contract_uuid TEXT NOT NULL UNIQUE,
  contract_key TEXT NOT NULL UNIQUE,
  contract_name TEXT NOT NULL,
  error_shape TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_error_contracts_uuid_immutable
BEFORE UPDATE OF error_contract_uuid ON enterprise_error_contracts
FOR EACH ROW
WHEN OLD.error_contract_uuid <> NEW.error_contract_uuid
BEGIN
  SELECT RAISE(ABORT, 'error_contract_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_api_contract_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_change_uuid TEXT NOT NULL UNIQUE,
  change_key TEXT NOT NULL UNIQUE,
  contract_reference TEXT NOT NULL,
  change_type TEXT NOT NULL,
  breaking_change INTEGER NOT NULL DEFAULT 0 CHECK (breaking_change IN (0, 1)),
  compatibility_window TEXT,
  migration_strategy TEXT,
  approval_reference TEXT,
  deprecation_reference TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_contract_changes_uuid_immutable
BEFORE UPDATE OF contract_change_uuid ON enterprise_api_contract_changes
FOR EACH ROW
WHEN OLD.contract_change_uuid <> NEW.contract_change_uuid
BEGIN
  SELECT RAISE(ABORT, 'contract_change_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_api_compatibility_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_compatibility_uuid TEXT NOT NULL UNIQUE,
  compatibility_key TEXT NOT NULL UNIQUE,
  version_key TEXT NOT NULL,
  consumer_key TEXT,
  backward_compatible INTEGER NOT NULL DEFAULT 1 CHECK (backward_compatible IN (0, 1)),
  authentication_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (authentication_compatibility_required IN (0, 1)),
  session_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (session_compatibility_required IN (0, 1)),
  csrf_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (csrf_compatibility_required IN (0, 1)),
  dashboard_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (dashboard_compatibility_required IN (0, 1)),
  website_compatibility_required INTEGER NOT NULL DEFAULT 1 CHECK (website_compatibility_required IN (0, 1)),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(version_key) REFERENCES enterprise_api_versions(version_key)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_api_compatibility_profiles_version
  ON enterprise_api_compatibility_profiles(version_key);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_compatibility_profiles_uuid_immutable
BEFORE UPDATE OF api_compatibility_uuid ON enterprise_api_compatibility_profiles
FOR EACH ROW
WHEN OLD.api_compatibility_uuid <> NEW.api_compatibility_uuid
BEGIN
  SELECT RAISE(ABORT, 'api_compatibility_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_api_consumers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_consumer_uuid TEXT NOT NULL UNIQUE,
  consumer_key TEXT NOT NULL UNIQUE,
  consumer_type TEXT NOT NULL CHECK (consumer_type IN ('Website', 'Dashboard', 'Customer Portal', 'Admin Portal', 'Mobile App', 'Partner API', 'Internal Service', 'System Integration', 'Future AI Service')),
  consumer_owner TEXT NOT NULL,
  consumer_scope TEXT NOT NULL,
  compatibility_level TEXT NOT NULL,
  supported_versions TEXT NOT NULL DEFAULT '[]',
  deprecated_after TEXT,
  authentication_profile TEXT NOT NULL,
  authorization_profile TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_consumers_uuid_immutable
BEFORE UPDATE OF api_consumer_uuid ON enterprise_api_consumers
FOR EACH ROW
WHEN OLD.api_consumer_uuid <> NEW.api_consumer_uuid
BEGIN
  SELECT RAISE(ABORT, 'api_consumer_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_api_rate_limit_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rate_limit_policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  rate_limit_policy TEXT NOT NULL,
  throttling_policy TEXT NOT NULL,
  quota_policy TEXT NOT NULL,
  abuse_policy TEXT NOT NULL,
  retry_policy TEXT NOT NULL,
  burst_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_rate_limit_policies_uuid_immutable
BEFORE UPDATE OF rate_limit_policy_uuid ON enterprise_api_rate_limit_policies
FOR EACH ROW
WHEN OLD.rate_limit_policy_uuid <> NEW.rate_limit_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'rate_limit_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_api_observability_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observability_uuid TEXT NOT NULL UNIQUE,
  profile_key TEXT NOT NULL UNIQUE,
  trace_policy TEXT NOT NULL,
  metrics_policy TEXT NOT NULL,
  request_classification TEXT NOT NULL,
  response_classification TEXT NOT NULL,
  latency_class TEXT NOT NULL,
  audit_trace_class TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_observability_profiles_uuid_immutable
BEFORE UPDATE OF observability_uuid ON enterprise_api_observability_profiles
FOR EACH ROW
WHEN OLD.observability_uuid <> NEW.observability_uuid
BEGIN
  SELECT RAISE(ABORT, 'observability_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enterprise_identity_uuid TEXT NOT NULL UNIQUE,
  identity_key TEXT NOT NULL UNIQUE,
  identity_type TEXT NOT NULL CHECK (identity_type IN ('Human', 'Customer', 'Staff', 'Executive', 'AI Employee', 'Service', 'System', 'Machine', 'API Consumer', 'Device', 'Federation')),
  identity_name TEXT NOT NULL,
  identity_owner TEXT NOT NULL,
  source_object_type TEXT,
  source_object_uuid TEXT,
  source_table TEXT,
  source_pk TEXT,
  identity_status TEXT NOT NULL CHECK (identity_status IN ('Draft', 'Active', 'Suspended', 'Disabled', 'Retired')),
  identity_lifecycle TEXT NOT NULL CHECK (identity_lifecycle IN ('Draft', 'Active', 'Suspended', 'Disabled', 'Retired')),
  identity_created_at TEXT,
  identity_activated_at TEXT,
  identity_suspended_at TEXT,
  identity_disabled_at TEXT,
  identity_retired_at TEXT,
  identity_recovery_policy TEXT NOT NULL,
  identity_merge_policy TEXT NOT NULL,
  identity_transfer_policy TEXT NOT NULL,
  identity_deletion_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_identities_uuid_immutable
BEFORE UPDATE OF enterprise_identity_uuid ON enterprise_identities
FOR EACH ROW
WHEN OLD.enterprise_identity_uuid <> NEW.enterprise_identity_uuid
BEGIN
  SELECT RAISE(ABORT, 'enterprise_identity_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_identity_delegations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delegation_uuid TEXT NOT NULL UNIQUE,
  delegation_key TEXT NOT NULL UNIQUE,
  delegator_identity_key TEXT NOT NULL,
  delegate_identity_key TEXT NOT NULL,
  delegation_scope TEXT NOT NULL,
  delegation_reason TEXT NOT NULL,
  delegation_created_at TEXT NOT NULL,
  delegation_expiry TEXT,
  delegation_status TEXT NOT NULL,
  revocation_policy TEXT NOT NULL,
  approval_reference TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(delegator_identity_key) REFERENCES enterprise_identities(identity_key),
  FOREIGN KEY(delegate_identity_key) REFERENCES enterprise_identities(identity_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_identity_delegations_uuid_immutable
BEFORE UPDATE OF delegation_uuid ON enterprise_identity_delegations
FOR EACH ROW
WHEN OLD.delegation_uuid <> NEW.delegation_uuid
BEGIN
  SELECT RAISE(ABORT, 'delegation_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_identity_audit_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identity_audit_uuid TEXT NOT NULL UNIQUE,
  audit_key TEXT NOT NULL UNIQUE,
  identity_key TEXT NOT NULL,
  last_authentication TEXT,
  last_authorization TEXT,
  last_permission_change TEXT,
  identity_audit_class TEXT NOT NULL,
  authentication_history_reference TEXT,
  authorization_history_reference TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(identity_key) REFERENCES enterprise_identities(identity_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_identity_audit_profiles_uuid_immutable
BEFORE UPDATE OF identity_audit_uuid ON enterprise_identity_audit_profiles
FOR EACH ROW
WHEN OLD.identity_audit_uuid <> NEW.identity_audit_uuid
BEGIN
  SELECT RAISE(ABORT, 'identity_audit_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_uuid TEXT NOT NULL UNIQUE,
  role_key TEXT NOT NULL UNIQUE,
  role_name TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('RBAC', 'ABAC', 'Hybrid', 'Reserved')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_roles_uuid_immutable
BEFORE UPDATE OF role_uuid ON enterprise_roles
FOR EACH ROW
WHEN OLD.role_uuid <> NEW.role_uuid
BEGIN
  SELECT RAISE(ABORT, 'role_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_uuid TEXT NOT NULL UNIQUE,
  scope_key TEXT NOT NULL UNIQUE,
  scope_name TEXT NOT NULL,
  scope_owner TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_scopes_uuid_immutable
BEFORE UPDATE OF scope_uuid ON enterprise_scopes
FOR EACH ROW
WHEN OLD.scope_uuid <> NEW.scope_uuid
BEGIN
  SELECT RAISE(ABORT, 'scope_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  permission_uuid TEXT NOT NULL UNIQUE,
  permission_key TEXT NOT NULL UNIQUE,
  permission_name TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  action_boundary TEXT NOT NULL,
  approval_boundary TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(scope_key) REFERENCES enterprise_scopes(scope_key)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_permissions_scope
  ON enterprise_permissions(scope_key);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_permissions_uuid_immutable
BEFORE UPDATE OF permission_uuid ON enterprise_permissions
FOR EACH ROW
WHEN OLD.permission_uuid <> NEW.permission_uuid
BEGIN
  SELECT RAISE(ABORT, 'permission_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_permission_uuid TEXT NOT NULL UNIQUE,
  role_key TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_key, permission_key),
  FOREIGN KEY(role_key) REFERENCES enterprise_roles(role_key),
  FOREIGN KEY(permission_key) REFERENCES enterprise_permissions(permission_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_role_permissions_uuid_immutable
BEFORE UPDATE OF role_permission_uuid ON enterprise_role_permissions
FOR EACH ROW
WHEN OLD.role_permission_uuid <> NEW.role_permission_uuid
BEGIN
  SELECT RAISE(ABORT, 'role_permission_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_authorization_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  authorization_policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  policy_name TEXT NOT NULL,
  evaluation_model TEXT NOT NULL CHECK (evaluation_model IN ('RBAC', 'ABAC', 'Hybrid', 'Reserved')),
  approval_class TEXT,
  least_privilege_required INTEGER NOT NULL DEFAULT 1 CHECK (least_privilege_required IN (0, 1)),
  separation_of_duties_required INTEGER NOT NULL DEFAULT 0 CHECK (separation_of_duties_required IN (0, 1)),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_authorization_policies_uuid_immutable
BEFORE UPDATE OF authorization_policy_uuid ON enterprise_authorization_policies
FOR EACH ROW
WHEN OLD.authorization_policy_uuid <> NEW.authorization_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'authorization_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_service_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_contract_uuid TEXT NOT NULL UNIQUE,
  service_key TEXT NOT NULL UNIQUE,
  contract_name TEXT NOT NULL,
  api_version_key TEXT,
  response_contract_key TEXT,
  compatibility_level TEXT NOT NULL,
  service_lifecycle TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(api_version_key) REFERENCES enterprise_api_versions(version_key),
  FOREIGN KEY(response_contract_key) REFERENCES enterprise_response_contracts(contract_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_service_contracts_uuid_immutable
BEFORE UPDATE OF service_contract_uuid ON enterprise_service_contracts
FOR EACH ROW
WHEN OLD.service_contract_uuid <> NEW.service_contract_uuid
BEGIN
  SELECT RAISE(ABORT, 'service_contract_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_service_ownership (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_ownership_uuid TEXT NOT NULL UNIQUE,
  service_key TEXT NOT NULL UNIQUE,
  service_owner TEXT NOT NULL,
  owner_department TEXT NOT NULL,
  dependency_owner TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(service_key) REFERENCES enterprise_service_contracts(service_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_service_ownership_uuid_immutable
BEFORE UPDATE OF service_ownership_uuid ON enterprise_service_ownership
FOR EACH ROW
WHEN OLD.service_ownership_uuid <> NEW.service_ownership_uuid
BEGIN
  SELECT RAISE(ABORT, 'service_ownership_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_service_discovery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_discovery_uuid TEXT NOT NULL UNIQUE,
  service_key TEXT NOT NULL UNIQUE,
  service_endpoint TEXT NOT NULL,
  service_protocol TEXT NOT NULL,
  discovery_scope TEXT NOT NULL,
  service_health_policy TEXT NOT NULL,
  dependency_health TEXT NOT NULL,
  registration_policy TEXT NOT NULL,
  availability_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(service_key) REFERENCES enterprise_service_contracts(service_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_service_discovery_uuid_immutable
BEFORE UPDATE OF service_discovery_uuid ON enterprise_service_discovery
FOR EACH ROW
WHEN OLD.service_discovery_uuid <> NEW.service_discovery_uuid
BEGIN
  SELECT RAISE(ABORT, 'service_discovery_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_service_sla_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_sla_uuid TEXT NOT NULL UNIQUE,
  service_key TEXT NOT NULL UNIQUE,
  service_sla TEXT NOT NULL,
  availability_target TEXT NOT NULL,
  recovery_target TEXT NOT NULL,
  maintenance_policy TEXT NOT NULL,
  service_priority TEXT NOT NULL,
  outage_classification TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(service_key) REFERENCES enterprise_service_contracts(service_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_service_sla_policies_uuid_immutable
BEFORE UPDATE OF service_sla_uuid ON enterprise_service_sla_policies
FOR EACH ROW
WHEN OLD.service_sla_uuid <> NEW.service_sla_uuid
BEGIN
  SELECT RAISE(ABORT, 'service_sla_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_machine_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_identity_uuid TEXT NOT NULL UNIQUE,
  machine_identity_key TEXT NOT NULL UNIQUE,
  machine_identity_type TEXT NOT NULL,
  machine_identity_owner TEXT NOT NULL,
  machine_identity_scope TEXT NOT NULL,
  machine_identity_status TEXT NOT NULL,
  machine_identity_lifecycle TEXT NOT NULL,
  machine_identity_rotation_policy TEXT NOT NULL,
  machine_identity_revocation_policy TEXT NOT NULL,
  machine_identity_auth_profile TEXT NOT NULL,
  machine_identity_compatibility_class TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_machine_identities_uuid_immutable
BEFORE UPDATE OF machine_identity_uuid ON enterprise_machine_identities
FOR EACH ROW
WHEN OLD.machine_identity_uuid <> NEW.machine_identity_uuid
BEGIN
  SELECT RAISE(ABORT, 'machine_identity_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_uuid TEXT NOT NULL UNIQUE,
  api_key_key TEXT NOT NULL UNIQUE,
  machine_identity_key TEXT,
  api_key_owner TEXT NOT NULL,
  api_key_scope TEXT NOT NULL,
  api_key_status TEXT NOT NULL,
  api_key_rotation_policy TEXT NOT NULL,
  api_key_expiry_policy TEXT NOT NULL,
  api_key_revocation_policy TEXT NOT NULL,
  api_key_storage_policy TEXT NOT NULL,
  api_key_usage_policy TEXT NOT NULL,
  api_key_audit_class TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(machine_identity_key) REFERENCES enterprise_machine_identities(machine_identity_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_keys_uuid_immutable
BEFORE UPDATE OF api_key_uuid ON enterprise_api_keys
FOR EACH ROW
WHEN OLD.api_key_uuid <> NEW.api_key_uuid
BEGIN
  SELECT RAISE(ABORT, 'api_key_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_uuid TEXT NOT NULL UNIQUE,
  credential_key TEXT NOT NULL UNIQUE,
  credential_class TEXT NOT NULL,
  secret_owner TEXT NOT NULL,
  rotation_policy TEXT NOT NULL,
  expiry_policy TEXT NOT NULL,
  revocation_policy TEXT NOT NULL,
  storage_policy TEXT NOT NULL,
  access_boundary TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_credentials_uuid_immutable
BEFORE UPDATE OF credential_uuid ON enterprise_credentials
FOR EACH ROW
WHEN OLD.credential_uuid <> NEW.credential_uuid
BEGIN
  SELECT RAISE(ABORT, 'credential_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_uuid TEXT NOT NULL UNIQUE,
  webhook_key TEXT NOT NULL UNIQUE,
  webhook_owner TEXT NOT NULL,
  webhook_scope TEXT NOT NULL,
  webhook_event_reference TEXT NOT NULL,
  webhook_signature_policy TEXT NOT NULL,
  webhook_retry_policy TEXT NOT NULL,
  webhook_delivery_policy TEXT NOT NULL,
  webhook_ordering_policy TEXT NOT NULL,
  webhook_verification_policy TEXT NOT NULL,
  webhook_lifecycle TEXT NOT NULL,
  webhook_deprecation_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_webhooks_uuid_immutable
BEFORE UPDATE OF webhook_uuid ON enterprise_webhooks
FOR EACH ROW
WHEN OLD.webhook_uuid <> NEW.webhook_uuid
BEGIN
  SELECT RAISE(ABORT, 'webhook_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_federation_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  federation_uuid TEXT NOT NULL UNIQUE,
  federation_key TEXT NOT NULL UNIQUE,
  federation_identity_reference TEXT NOT NULL,
  external_identity_reference TEXT NOT NULL,
  federation_provider TEXT NOT NULL,
  federation_trust_level TEXT NOT NULL,
  federation_mapping_policy TEXT NOT NULL,
  federation_lifecycle TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_federation_mappings_uuid_immutable
BEFORE UPDATE OF federation_uuid ON enterprise_federation_mappings
FOR EACH ROW
WHEN OLD.federation_uuid <> NEW.federation_uuid
BEGIN
  SELECT RAISE(ABORT, 'federation_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_consent_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consent_policy_uuid TEXT NOT NULL UNIQUE,
  consent_key TEXT NOT NULL UNIQUE,
  consent_owner TEXT NOT NULL,
  consent_scope TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_status TEXT NOT NULL,
  consent_expiry TEXT,
  privacy_classification TEXT NOT NULL,
  data_exposure_policy TEXT NOT NULL,
  data_processing_scope TEXT NOT NULL,
  consent_audit_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_consent_policies_uuid_immutable
BEFORE UPDATE OF consent_policy_uuid ON enterprise_consent_policies
FOR EACH ROW
WHEN OLD.consent_policy_uuid <> NEW.consent_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'consent_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_privacy_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  privacy_class_uuid TEXT NOT NULL UNIQUE,
  privacy_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  privacy_classification TEXT NOT NULL,
  data_exposure_policy TEXT NOT NULL,
  customer_safe_projection_required INTEGER NOT NULL DEFAULT 1 CHECK (customer_safe_projection_required IN (0, 1)),
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_privacy_classes_uuid_immutable
BEFORE UPDATE OF privacy_class_uuid ON enterprise_privacy_classes
FOR EACH ROW
WHEN OLD.privacy_class_uuid <> NEW.privacy_class_uuid
BEGIN
  SELECT RAISE(ABORT, 'privacy_class_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_zero_trust_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zero_trust_policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  trust_boundary TEXT NOT NULL,
  caller_trust_class TEXT NOT NULL,
  device_trust_class TEXT NOT NULL,
  network_trust_class TEXT NOT NULL,
  adaptive_auth_policy TEXT NOT NULL,
  continuous_verification_policy TEXT NOT NULL,
  risk_score_class TEXT NOT NULL,
  internal_access_policy TEXT NOT NULL,
  external_access_policy TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_zero_trust_policies_uuid_immutable
BEFORE UPDATE OF zero_trust_policy_uuid ON enterprise_zero_trust_policies
FOR EACH ROW
WHEN OLD.zero_trust_policy_uuid <> NEW.zero_trust_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'zero_trust_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_policy_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  policy_name TEXT NOT NULL,
  policy_owner TEXT NOT NULL,
  policy_scope TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  current_version_number INTEGER NOT NULL DEFAULT 1,
  policy_status TEXT NOT NULL,
  policy_lifecycle TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_policy_registry_uuid_immutable
BEFORE UPDATE OF policy_uuid ON enterprise_policy_registry
FOR EACH ROW
WHEN OLD.policy_uuid <> NEW.policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_policy_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_version_uuid TEXT NOT NULL UNIQUE,
  policy_uuid TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  version_status TEXT NOT NULL,
  policy_content_json TEXT NOT NULL DEFAULT '{}',
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(policy_uuid, version_number),
  FOREIGN KEY(policy_uuid) REFERENCES enterprise_policy_registry(policy_uuid)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_policy_versions_uuid_immutable
BEFORE UPDATE OF policy_version_uuid ON enterprise_policy_versions
FOR EACH ROW
WHEN OLD.policy_version_uuid <> NEW.policy_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'policy_version_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_policy_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_dependency_uuid TEXT NOT NULL UNIQUE,
  source_policy_uuid TEXT NOT NULL,
  target_policy_uuid TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_policy_uuid, target_policy_uuid, dependency_type),
  FOREIGN KEY(source_policy_uuid) REFERENCES enterprise_policy_registry(policy_uuid),
  FOREIGN KEY(target_policy_uuid) REFERENCES enterprise_policy_registry(policy_uuid)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_policy_dependencies_uuid_immutable
BEFORE UPDATE OF policy_dependency_uuid ON enterprise_policy_dependencies
FOR EACH ROW
WHEN OLD.policy_dependency_uuid <> NEW.policy_dependency_uuid
BEGIN
  SELECT RAISE(ABORT, 'policy_dependency_uuid is immutable');
END;
