"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MIGRATION_KEY = "phase-3-milestone-3.5-enterprise-api-identity-permission-standardization";
const SCHEMA_KEY = "one_point_enterprise_schema";

function nowIso() {
  return new Date().toISOString();
}

function json(value, fallback) {
  return JSON.stringify(value === undefined ? fallback : value);
}

function writeJson(filePath, value) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function isSuccessfulMigrationReport(report) {
  if (!report || typeof report !== "object") return false;
  const totals = report.totals || {};
  return Boolean(report.finishedAt) && Number(totals.failures || 0) === 0;
}

function historyFilePath(filePath, startedAt = nowIso()) {
  const stamp = String(startedAt).replace(/[:.]/g, "-");
  return path.join(path.dirname(filePath), "history", `${MIGRATION_KEY}-${stamp}.json`);
}

function writeMigrationEvidence(options, report) {
  if (!options.reportPath) return;

  const canonicalPath = options.reportPath;
  const runHistoryPath = historyFilePath(canonicalPath, report.startedAt);
  writeJson(runHistoryPath, report);

  const canonicalReport = readJsonIfExists(canonicalPath);
  if (isSuccessfulMigrationReport(canonicalReport)) return;

  if (isSuccessfulMigrationReport(report)) {
    writeJson(canonicalPath, report);
    return;
  }

  const fallbackReport = readJsonIfExists(options.canonicalFallbackPath);
  if (isSuccessfulMigrationReport(fallbackReport)) {
    writeJson(canonicalPath, fallbackReport);
  }
}

function createMigrationReport() {
  return {
    milestone: "Phase 3 - Milestone 3.5",
    name: "Enterprise API, Identity & Permission Standardization",
    startedAt: nowIso(),
    finishedAt: null,
    totals: { created: 0, updated: 0, skipped: 0, failures: 0 },
    tables: {},
    failures: []
  };
}

function createFailedMigrationReport(error) {
  const report = createMigrationReport();
  addFailure(report, "enterprise_api_identity_permission_standardization", MIGRATION_KEY, error);
  report.finishedAt = nowIso();
  return report;
}

function createValidationReport(kind) {
  return {
    milestone: "Phase 3 - Milestone 3.5",
    name: "Enterprise API, Identity & Permission Standardization Validation",
    kind,
    startedAt: nowIso(),
    finishedAt: null,
    validations: {},
    failures: []
  };
}

function bump(report, table, kind) {
  if (!report.tables[table]) report.tables[table] = { created: 0, updated: 0, skipped: 0 };
  report.tables[table][kind] += 1;
  report.totals[kind] += 1;
}

function addFailure(report, table, key, error) {
  report.totals.failures += 1;
  report.failures.push({
    table,
    key,
    message: error && error.message ? error.message : String(error)
  });
}

const columnCache = new Map();

function clearColumnCache() {
  columnCache.clear();
}

function getTableColumns(dbConn, table) {
  if (!columnCache.has(table)) {
    const rows = dbConn.prepare(`PRAGMA table_info(${table})`).all();
    columnCache.set(table, new Set(rows.map((row) => row.name)));
  }
  return columnCache.get(table);
}

function hasColumn(dbConn, table, column) {
  return getTableColumns(dbConn, table).has(column);
}

function addColumnIfMissing(dbConn, table, columnDefinition) {
  const column = columnDefinition.trim().split(/\s+/)[0];
  if (hasColumn(dbConn, table, column)) return;
  dbConn.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDefinition};`);
  clearColumnCache();
}

function ensureCorrectiveSchema(dbConn) {
  clearColumnCache();
  addColumnIfMissing(dbConn, "enterprise_api_consumers", "enterprise_identity_uuid TEXT");
  addColumnIfMissing(dbConn, "enterprise_machine_identities", "enterprise_identity_uuid TEXT");

  dbConn.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_api_consumers_identity_uuid
      ON enterprise_api_consumers(enterprise_identity_uuid)
      WHERE enterprise_identity_uuid IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_machine_identities_identity_uuid
      ON enterprise_machine_identities(enterprise_identity_uuid)
      WHERE enterprise_identity_uuid IS NOT NULL;

    CREATE TABLE IF NOT EXISTS enterprise_service_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_dependency_uuid TEXT NOT NULL UNIQUE,
      source_service_key TEXT NOT NULL,
      target_service_key TEXT NOT NULL,
      dependency_type TEXT NOT NULL,
      dependency_status TEXT NOT NULL DEFAULT 'Active',
      lifecycle_status TEXT NOT NULL DEFAULT 'Active',
      asset_version INTEGER NOT NULL DEFAULT 1,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_service_key, target_service_key, dependency_type),
      FOREIGN KEY(source_service_key) REFERENCES enterprise_service_contracts(service_key),
      FOREIGN KEY(target_service_key) REFERENCES enterprise_service_contracts(service_key)
    );

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_service_dependencies_uuid_immutable
    BEFORE UPDATE OF service_dependency_uuid ON enterprise_service_dependencies
    FOR EACH ROW
    WHEN OLD.service_dependency_uuid <> NEW.service_dependency_uuid
    BEGIN
      SELECT RAISE(ABORT, 'service_dependency_uuid is immutable');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_consumers_identity_reference_insert
    BEFORE INSERT ON enterprise_api_consumers
    FOR EACH ROW
    WHEN NEW.enterprise_identity_uuid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_identities
        WHERE enterprise_identity_uuid = NEW.enterprise_identity_uuid
      )
    BEGIN
      SELECT RAISE(ABORT, 'api consumer enterprise identity reference is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_consumers_identity_reference_update
    BEFORE UPDATE OF enterprise_identity_uuid ON enterprise_api_consumers
    FOR EACH ROW
    WHEN NEW.enterprise_identity_uuid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_identities
        WHERE enterprise_identity_uuid = NEW.enterprise_identity_uuid
      )
    BEGIN
      SELECT RAISE(ABORT, 'api consumer enterprise identity reference is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_machine_identities_identity_reference_insert
    BEFORE INSERT ON enterprise_machine_identities
    FOR EACH ROW
    WHEN NEW.enterprise_identity_uuid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_identities
        WHERE enterprise_identity_uuid = NEW.enterprise_identity_uuid
      )
    BEGIN
      SELECT RAISE(ABORT, 'machine identity enterprise identity reference is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_machine_identities_identity_reference_update
    BEFORE UPDATE OF enterprise_identity_uuid ON enterprise_machine_identities
    FOR EACH ROW
    WHEN NEW.enterprise_identity_uuid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_identities
        WHERE enterprise_identity_uuid = NEW.enterprise_identity_uuid
      )
    BEGIN
      SELECT RAISE(ABORT, 'machine identity enterprise identity reference is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_versions_response_contract_reference_insert
    BEFORE INSERT ON enterprise_api_versions
    FOR EACH ROW
    WHEN NEW.response_contract_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_response_contracts
        WHERE contract_key = NEW.response_contract_key
      )
    BEGIN
      SELECT RAISE(ABORT, 'api version response contract is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_versions_response_contract_reference_update
    BEFORE UPDATE OF response_contract_key ON enterprise_api_versions
    FOR EACH ROW
    WHEN NEW.response_contract_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_response_contracts
        WHERE contract_key = NEW.response_contract_key
      )
    BEGIN
      SELECT RAISE(ABORT, 'api version response contract is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_versions_error_contract_reference_insert
    BEFORE INSERT ON enterprise_api_versions
    FOR EACH ROW
    WHEN NEW.error_contract_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_error_contracts
        WHERE contract_key = NEW.error_contract_key
      )
    BEGIN
      SELECT RAISE(ABORT, 'api version error contract is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_versions_error_contract_reference_update
    BEFORE UPDATE OF error_contract_key ON enterprise_api_versions
    FOR EACH ROW
    WHEN NEW.error_contract_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_error_contracts
        WHERE contract_key = NEW.error_contract_key
      )
    BEGIN
      SELECT RAISE(ABORT, 'api version error contract is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_compatibility_consumer_reference_insert
    BEFORE INSERT ON enterprise_api_compatibility_profiles
    FOR EACH ROW
    WHEN NEW.consumer_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_api_consumers
        WHERE consumer_key = NEW.consumer_key
      )
    BEGIN
      SELECT RAISE(ABORT, 'api compatibility consumer is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_api_compatibility_consumer_reference_update
    BEFORE UPDATE OF consumer_key ON enterprise_api_compatibility_profiles
    FOR EACH ROW
    WHEN NEW.consumer_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM enterprise_api_consumers
        WHERE consumer_key = NEW.consumer_key
      )
    BEGIN
      SELECT RAISE(ABORT, 'api compatibility consumer is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_federation_identity_reference_insert
    BEFORE INSERT ON enterprise_federation_mappings
    FOR EACH ROW
    WHEN NOT EXISTS (
      SELECT 1 FROM enterprise_identities
      WHERE identity_key = NEW.federation_identity_reference
    )
    BEGIN
      SELECT RAISE(ABORT, 'federation identity reference is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_federation_identity_reference_update
    BEFORE UPDATE OF federation_identity_reference ON enterprise_federation_mappings
    FOR EACH ROW
    WHEN NOT EXISTS (
      SELECT 1 FROM enterprise_identities
      WHERE identity_key = NEW.federation_identity_reference
    )
    BEGIN
      SELECT RAISE(ABORT, 'federation identity reference is not governed');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_migration_dependency_reference_insert
    BEFORE INSERT ON enterprise_migration_dependencies
    FOR EACH ROW
    WHEN NOT EXISTS (
      SELECT 1 FROM enterprise_migration_registry
      WHERE migration_key = NEW.depends_on_migration_key
    )
    BEGIN
      SELECT RAISE(ABORT, 'migration dependency target is not registered');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_enterprise_migration_dependency_reference_update
    BEFORE UPDATE OF depends_on_migration_key ON enterprise_migration_dependencies
    FOR EACH ROW
    WHEN NOT EXISTS (
      SELECT 1 FROM enterprise_migration_registry
      WHERE migration_key = NEW.depends_on_migration_key
    )
    BEGIN
      SELECT RAISE(ABORT, 'migration dependency target is not registered');
    END;
  `);
  clearColumnCache();
}

function getSeedUuid(dbConn, table, keyColumn, keyValue, uuidColumn) {
  const existing = dbConn.prepare(`SELECT ${uuidColumn} AS uuid FROM ${table} WHERE ${keyColumn} = ?`).get(keyValue);
  return existing?.uuid || crypto.randomUUID();
}

function ensureEnterpriseIdentity(dbConn, report, config) {
  return upsertSeed(dbConn, report, {
    table: "enterprise_identities",
    keyColumn: "identity_key",
    keyValue: config.identityKey,
    uuidColumn: "enterprise_identity_uuid",
    values: {
      enterprise_identity_uuid: config.enterpriseIdentityUuid,
      identity_type: config.identityType,
      identity_name: config.identityName,
      identity_owner: config.identityOwner,
      source_object_type: config.sourceObjectType,
      source_object_uuid: config.sourceObjectUuid,
      source_table: config.sourceTable || null,
      source_pk: config.sourcePk || null,
      identity_status: config.identityStatus || "Active",
      identity_lifecycle: config.identityLifecycle || "Active",
      identity_created_at: "2026-07-04T00:00:00.000Z",
      identity_activated_at: (config.identityStatus || "Active") === "Active" ? "2026-07-04T00:00:00.000Z" : null,
      identity_suspended_at: null,
      identity_disabled_at: null,
      identity_retired_at: null,
      identity_recovery_policy: "owner_approved_only",
      identity_merge_policy: "merge_forbidden",
      identity_transfer_policy: "transfer_forbidden",
      identity_deletion_policy: "retire_only_no_hard_delete",
      lifecycle_status: config.lifecycleStatus || "Approved",
      asset_version: 1,
      metadata_json: json({
        immutableUuidGovernance: true,
        canonicalEnterpriseIdentity: true,
        childRegistry: config.childRegistry
      }, {})
    }
  });
}

function upsertSeed(dbConn, report, config) {
  const { table, keyColumn, keyValue, uuidColumn, values } = config;
  const tableColumns = getTableColumns(dbConn, table);
  const existing = dbConn.prepare(`SELECT * FROM ${table} WHERE ${keyColumn} = ?`).get(keyValue);
  const payload = { ...values, [keyColumn]: keyValue };
  if (!payload[uuidColumn]) payload[uuidColumn] = existing?.[uuidColumn] || crypto.randomUUID();
  if (tableColumns.has("lifecycle_status") && payload.lifecycle_status === undefined) {
    payload.lifecycle_status = existing?.lifecycle_status || "Active";
  }
  if (tableColumns.has("asset_version") && payload.asset_version === undefined) {
    payload.asset_version = existing?.asset_version || 1;
  }

  if (existing) {
    const hasAssetVersion = tableColumns.has("asset_version");
    const canUpgrade = hasAssetVersion
      && Number.isFinite(Number(payload.asset_version))
      && Number.isFinite(Number(existing.asset_version))
      && Number(payload.asset_version) > Number(existing.asset_version);
    if (!canUpgrade) {
      bump(report, table, "skipped");
      return payload[uuidColumn];
    }
    const entries = Object.entries(payload).filter(([column]) => column !== uuidColumn && column !== keyColumn);
    const setSql = entries.map(([column]) => `${column} = ?`).join(", ");
    dbConn.prepare(`
      UPDATE ${table}
      SET ${setSql},
          updated_at = CURRENT_TIMESTAMP
      WHERE ${keyColumn} = ?
    `).run(...entries.map(([, value]) => value), keyValue);
    bump(report, table, "updated");
    return payload[uuidColumn];
  }

  const columns = Object.keys(payload);
  const placeholders = columns.map(() => "?").join(", ");
  dbConn.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`)
    .run(...columns.map((column) => payload[column]));
  bump(report, table, "created");
  return payload[uuidColumn];
}

function ensurePolicyLookups(dbConn) {
  dbConn.exec(`
    CREATE TABLE IF NOT EXISTS enterprise_governed_authorization_models (
      evaluation_model TEXT PRIMARY KEY
    );
    INSERT OR IGNORE INTO enterprise_governed_authorization_models (evaluation_model) VALUES
      ('RBAC'),
      ('ABAC'),
      ('Hybrid'),
      ('Reserved');
  `);
}

function seedSchemaAndCompatibility(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_schema_versions",
    keyColumn: "schema_key",
    keyValue: SCHEMA_KEY,
    uuidColumn: "schema_version_uuid",
    values: {
      schema_version_number: 13,
      compatibility_version: "phase-3-milestone-3.5",
      lifecycle_status: "Approved",
      asset_version: 2,
      metadata_json: json({
        implementationScope: "api_identity_permission_governance_only",
        preservedMilestones: ["phase-3.2", "phase-3.3", "phase-3.4"],
        repositoryRuntimeStandardization: false
      }, {})
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_compatibility_registry",
    keyColumn: "registry_key",
    keyValue: "phase-3-milestone-3.5-baseline",
    uuidColumn: "compatibility_registry_uuid",
    values: {
      schema_key: SCHEMA_KEY,
      minimum_schema_version_number: 1,
      current_schema_version_number: 13,
      backward_compatible: 1,
      api_compatibility_required: 1,
      dashboard_compatibility_required: 1,
      website_compatibility_required: 1,
      authentication_compatibility_required: 1,
      lifecycle_status: "Approved",
      asset_version: 1,
      metadata_json: json({
        sessionCompatibilityRequired: true,
        csrfCompatibilityRequired: true,
        customerWorkflowCompatibilityRequired: true,
        adminWorkflowCompatibilityRequired: true
      }, {})
    }
  });
}

function seedApiGovernance(dbConn, report) {
  const responseContracts = [
    ["json_single_resource_v1", "Single Resource Response", "single_resource", { errorContractKey: "standard_error_v1", pagination: false, filtering: false, search: false }],
    ["json_list_v1", "List Response", "list_resource", { errorContractKey: "standard_error_v1", pagination: true, filtering: true, search: true }],
    ["json_action_status_v1", "Action Status Response", "action_status", { errorContractKey: "standard_error_v1", pagination: false, filtering: false, search: false }]
  ];
  for (const [contractKey, contractName, envelopeType, metadata] of responseContracts) {
    upsertSeed(dbConn, report, {
      table: "enterprise_response_contracts",
      keyColumn: "contract_key",
      keyValue: contractKey,
      uuidColumn: "response_contract_uuid",
      values: {
        contract_name: contractName,
        response_envelope_type: envelopeType,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json(metadata, {})
      }
    });
  }

  const errorContracts = [
    ["standard_error_v1", "Standard Error Contract", "standard_error"],
    ["auth_error_v1", "Authentication Error Contract", "auth_error"],
    ["validation_error_v1", "Validation Error Contract", "validation_error"]
  ];
  for (const [contractKey, contractName, errorShape] of errorContracts) {
    upsertSeed(dbConn, report, {
      table: "enterprise_error_contracts",
      keyColumn: "contract_key",
      keyValue: contractKey,
      uuidColumn: "error_contract_uuid",
      values: {
        contract_name: contractName,
        error_shape: errorShape,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const apiVersions = [
    ["public_v1", "Public API V1", "public", "backward_compatible", "json_list_v1", "standard_error_v1"],
    ["customer_v1", "Customer API V1", "customer", "backward_compatible", "json_single_resource_v1", "auth_error_v1"],
    ["admin_v1", "Admin API V1", "admin", "backward_compatible", "json_list_v1", "auth_error_v1"],
    ["webhooks_v1", "Webhook API V1", "webhook", "backward_compatible", "json_action_status_v1", "validation_error_v1"],
    ["internal_v1", "Internal API V1", "internal", "backward_compatible", "json_action_status_v1", "standard_error_v1"]
  ];
  for (const [versionKey, versionName, surface, compatibilityLevel, responseContractKey, errorContractKey] of apiVersions) {
    upsertSeed(dbConn, report, {
      table: "enterprise_api_versions",
      keyColumn: "version_key",
      keyValue: versionKey,
      uuidColumn: "api_version_uuid",
      values: {
        version_name: versionName,
        api_surface: surface,
        compatibility_level: compatibilityLevel,
        response_contract_key: responseContractKey,
        error_contract_key: errorContractKey,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          paginationContract: surface === "public" || surface === "admin" ? "offset_limit_v1" : null,
          filterContract: surface === "public" || surface === "admin" ? "field_filter_v1" : null,
          searchContract: surface === "public" || surface === "admin" ? "query_search_v1" : null,
          validationContract: "request_validation_v1",
          deprecationPolicy: "owner_approved_only"
        }, {})
      }
    });
  }

  const consumers = [
    ["website_public", "Website", "platform", "public_catalog", "backward_compatible", ["public_v1"], "public_tokenless", "public_read_only"],
    ["dashboard_admin", "Dashboard", "operations", "admin_console", "backward_compatible", ["admin_v1"], "admin_session_token", "admin_policy_governed"],
    ["customer_portal", "Customer Portal", "customer_success", "customer_dashboard", "backward_compatible", ["customer_v1"], "customer_session_token", "customer_policy_governed"],
    ["internal_service", "Internal Service", "platform", "internal_backend", "backward_compatible", ["internal_v1"], "service_internal", "service_internal_policy"],
    ["partner_api", "Partner API", "platform", "external_integration", "reserved", ["public_v1"], "partner_credential", "partner_policy_governed"],
    ["future_ai_service", "Future AI Service", "ai_office", "future_ai_consumer", "reserved", ["internal_v1"], "machine_identity", "future_ai_policy_governed"]
  ];
  for (const [consumerKey, consumerType, owner, scope, compatibilityLevel, supportedVersions, authenticationProfile, authorizationProfile] of consumers) {
    const apiConsumerUuid = getSeedUuid(dbConn, "enterprise_api_consumers", "consumer_key", consumerKey, "api_consumer_uuid");
    const enterpriseIdentityUuid = ensureEnterpriseIdentity(dbConn, report, {
      identityKey: `api_consumer_${consumerKey}`,
      enterpriseIdentityUuid: apiConsumerUuid,
      identityType: "API Consumer",
      identityName: `${consumerType} API Consumer`,
      identityOwner: owner,
      sourceObjectType: "api_consumer",
      sourceObjectUuid: apiConsumerUuid,
      identityStatus: consumerKey.startsWith("future_") || consumerKey === "partner_api" ? "Draft" : "Active",
      identityLifecycle: consumerKey.startsWith("future_") || consumerKey === "partner_api" ? "Draft" : "Active",
      lifecycleStatus: consumerKey.startsWith("future_") || consumerKey === "partner_api" ? "Reserved" : "Approved",
      childRegistry: "enterprise_api_consumers"
    });
    upsertSeed(dbConn, report, {
      table: "enterprise_api_consumers",
      keyColumn: "consumer_key",
      keyValue: consumerKey,
      uuidColumn: "api_consumer_uuid",
      values: {
        api_consumer_uuid: apiConsumerUuid,
        enterprise_identity_uuid: enterpriseIdentityUuid,
        consumer_type: consumerType,
        consumer_owner: owner,
        consumer_scope: scope,
        compatibility_level: compatibilityLevel,
        supported_versions: json(supportedVersions, []),
        deprecated_after: null,
        authentication_profile: authenticationProfile,
        authorization_profile: authorizationProfile,
        lifecycle_status: consumerKey.startsWith("future_") || consumerKey === "partner_api" ? "Reserved" : "Approved",
        asset_version: 2,
        metadata_json: json({
          dashboardConsumerOnly: consumerKey === "dashboard_admin",
          sourceOfTruthBoundaryPreserved: true,
          canonicalEnterpriseIdentityUuid: enterpriseIdentityUuid
        }, {})
      }
    });
  }

  const compatibilityProfiles = [
    ["public_v1_website", "public_v1", "website_public", { dashboard: 0, website: 1, auth: 1, session: 0, csrf: 0 }],
    ["customer_v1_customer_portal", "customer_v1", "customer_portal", { dashboard: 0, website: 1, auth: 1, session: 1, csrf: 1 }],
    ["admin_v1_dashboard", "admin_v1", "dashboard_admin", { dashboard: 1, website: 0, auth: 1, session: 1, csrf: 1 }],
    ["webhooks_v1_internal", "webhooks_v1", "internal_service", { dashboard: 0, website: 0, auth: 1, session: 0, csrf: 0 }],
    ["internal_v1_internal", "internal_v1", "internal_service", { dashboard: 0, website: 0, auth: 1, session: 0, csrf: 0 }]
  ];
  for (const [compatibilityKey, versionKey, consumerKey, flags] of compatibilityProfiles) {
    upsertSeed(dbConn, report, {
      table: "enterprise_api_compatibility_profiles",
      keyColumn: "compatibility_key",
      keyValue: compatibilityKey,
      uuidColumn: "api_compatibility_uuid",
      values: {
        version_key: versionKey,
        consumer_key: consumerKey,
        backward_compatible: 1,
        authentication_compatibility_required: flags.auth,
        session_compatibility_required: flags.session,
        csrf_compatibility_required: flags.csrf,
        dashboard_compatibility_required: flags.dashboard,
        website_compatibility_required: flags.website,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({ adminWorkflowCompatibilityRequired: true, customerWorkflowCompatibilityRequired: true }, {})
      }
    });
  }

  upsertSeed(dbConn, report, {
    table: "enterprise_api_contract_changes",
    keyColumn: "change_key",
    keyValue: "additive_contract_evolution_baseline",
    uuidColumn: "contract_change_uuid",
    values: {
      contract_reference: "all_api_contracts_v1",
      change_type: "additive",
      breaking_change: 0,
      compatibility_window: "per_release_review",
      migration_strategy: "additive_contract_only",
      approval_reference: "owner_approved_only",
      deprecation_reference: "governed_deprecation_required",
      lifecycle_status: "Approved",
      asset_version: 1,
      metadata_json: json({
        breakingChangeBypassForbidden: true,
        compatibilityRegistryRequired: true
      }, {})
    }
  });

  const rateLimitPolicies = [
    ["public_api_default", "public_standard", "progressive_throttle", "daily_quota", "abuse_detection_required", "retry_after_header", "short_burst_allowed"],
    ["admin_api_default", "admin_standard", "strict_throttle", "admin_quota", "audit_and_abuse_detection", "retry_after_header", "small_burst_allowed"],
    ["webhook_ingestion_default", "webhook_standard", "provider_throttle", "event_quota", "signature_before_processing", "provider_retry_compatible", "provider_burst_allowed"]
  ];
  for (const [policyKey, rateLimitPolicy, throttlingPolicy, quotaPolicy, abusePolicy, retryPolicy, burstPolicy] of rateLimitPolicies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_api_rate_limit_policies",
      keyColumn: "policy_key",
      keyValue: policyKey,
      uuidColumn: "rate_limit_policy_uuid",
      values: {
        rate_limit_policy: rateLimitPolicy,
        throttling_policy: throttlingPolicy,
        quota_policy: quotaPolicy,
        abuse_policy: abusePolicy,
        retry_policy: retryPolicy,
        burst_policy: burstPolicy,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({ runtimePolicyOnly: true }, {})
      }
    });
  }

  const observabilityProfiles = [
    ["public_api_trace", "trace_and_metrics", "basic_metrics", "public_request", "public_response", "standard", "low"],
    ["customer_api_trace", "trace_and_metrics", "customer_metrics", "customer_request", "customer_response", "standard", "medium"],
    ["admin_api_trace", "trace_and_metrics", "admin_metrics", "admin_request", "admin_response", "priority", "high"],
    ["webhook_trace", "trace_and_audit", "webhook_metrics", "webhook_request", "webhook_response", "priority", "high"]
  ];
  for (const [profileKey, tracePolicy, metricsPolicy, requestClassification, responseClassification, latencyClass, auditTraceClass] of observabilityProfiles) {
    upsertSeed(dbConn, report, {
      table: "enterprise_api_observability_profiles",
      keyColumn: "profile_key",
      keyValue: profileKey,
      uuidColumn: "observability_uuid",
      values: {
        trace_policy: tracePolicy,
        metrics_policy: metricsPolicy,
        request_classification: requestClassification,
        response_classification: responseClassification,
        latency_class: latencyClass,
        audit_trace_class: auditTraceClass,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({ businessLogicDependsOnTracing: false }, {})
      }
    });
  }
}

function seedIdentityAndPermissionGovernance(dbConn, report) {
  const identities = [
    ["customer_identity_boundary", "Customer", "Customer Identity Boundary", "customer_success", "user_profile", null, "users", null, "Active", "Active", "merge_policy_governed", "transfer_forbidden"],
    ["staff_identity_boundary", "Staff", "Staff Identity Boundary", "operations", "workforce_profile", null, "staff", null, "Active", "Active", "merge_policy_governed", "transfer_policy_governed"],
    ["admin_identity_boundary", "Human", "Admin Identity Boundary", "platform", "admin_profile", null, null, null, "Active", "Active", "merge_policy_governed", "transfer_policy_governed"],
    ["executive_identity_boundary", "Executive", "Executive Identity Boundary", "leadership", "executive_profile", null, null, null, "Active", "Active", "merge_policy_governed", "transfer_policy_governed"],
    ["system_runtime_identity", "System", "System Runtime Identity", "platform", "system_runtime", null, null, null, "Active", "Active", "merge_forbidden", "transfer_forbidden"],
    ["service_identity_boundary", "Service", "Service Identity Boundary", "platform", "service_contract", null, null, null, "Active", "Active", "merge_policy_governed", "transfer_forbidden"],
    ["future_ai_employee_identity", "AI Employee", "Future AI Employee Identity", "ai_office", "future_ai_identity", null, null, null, "Draft", "Draft", "merge_policy_governed", "transfer_policy_governed"],
    ["dashboard_consumer_identity", "API Consumer", "Dashboard Consumer Identity", "operations", "dashboard_consumer", null, null, null, "Active", "Active", "merge_forbidden", "transfer_forbidden"]
  ];
  for (const [identityKey, identityType, identityName, owner, sourceObjectType, sourceObjectUuid, sourceTable, sourcePk, identityStatus, identityLifecycle, mergePolicy, transferPolicy] of identities) {
    upsertSeed(dbConn, report, {
      table: "enterprise_identities",
      keyColumn: "identity_key",
      keyValue: identityKey,
      uuidColumn: "enterprise_identity_uuid",
      values: {
        identity_type: identityType,
        identity_name: identityName,
        identity_owner: owner,
        source_object_type: sourceObjectType,
        source_object_uuid: sourceObjectUuid,
        source_table: sourceTable,
        source_pk: sourcePk,
        identity_status: identityStatus,
        identity_lifecycle: identityLifecycle,
        identity_created_at: "2026-07-04T00:00:00.000Z",
        identity_activated_at: identityStatus === "Active" ? "2026-07-04T00:00:00.000Z" : null,
        identity_suspended_at: null,
        identity_disabled_at: null,
        identity_retired_at: null,
        identity_recovery_policy: "owner_approved_only",
        identity_merge_policy: mergePolicy,
        identity_transfer_policy: transferPolicy,
        identity_deletion_policy: "retire_only_no_hard_delete",
        lifecycle_status: identityStatus === "Draft" ? "Reserved" : "Approved",
        asset_version: 1,
        metadata_json: json({
          immutableUuidGovernance: true,
          businessOwnershipPreserved: true
        }, {})
      }
    });
  }

  upsertSeed(dbConn, report, {
    table: "enterprise_identity_delegations",
    keyColumn: "delegation_key",
    keyValue: "admin_delegate_operations_review",
    uuidColumn: "delegation_uuid",
    values: {
      delegator_identity_key: "admin_identity_boundary",
      delegate_identity_key: "staff_identity_boundary",
      delegation_scope: "operations_review",
      delegation_reason: "governed_example",
      delegation_created_at: "2026-07-04T00:00:00.000Z",
      delegation_expiry: null,
      delegation_status: "Reserved",
      revocation_policy: "explicit_owner_revocation",
      approval_reference: "MANUAL_APPROVAL",
      lifecycle_status: "Reserved",
      asset_version: 1,
      metadata_json: json({
        traceable: true,
        replacesOwnership: false
      }, {})
    }
  });

  for (const [auditKey, identityKey, auditClass] of [
    ["customer_identity_audit", "customer_identity_boundary", "customer_auth_audit"],
    ["staff_identity_audit", "staff_identity_boundary", "staff_auth_audit"],
    ["admin_identity_audit", "admin_identity_boundary", "admin_auth_audit"]
  ]) {
    upsertSeed(dbConn, report, {
      table: "enterprise_identity_audit_profiles",
      keyColumn: "audit_key",
      keyValue: auditKey,
      uuidColumn: "identity_audit_uuid",
      values: {
        identity_key: identityKey,
        last_authentication: null,
        last_authorization: null,
        last_permission_change: null,
        identity_audit_class: auditClass,
        authentication_history_reference: "audit_stream_reserved",
        authorization_history_reference: "audit_stream_reserved",
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          businessLogicDependsOnAuditHistory: false
        }, {})
      }
    });
  }

  const roles = [
    ["public_visitor", "Public Visitor", "RBAC", { displayBoundary: "public" }],
    ["customer", "Customer", "RBAC", { displayBoundary: "customer" }],
    ["staff_agent", "Staff Agent", "RBAC", { displayBoundary: "staff" }],
    ["admin", "Admin", "RBAC", { displayBoundary: "admin" }],
    ["executive", "Executive", "RBAC", { displayBoundary: "executive" }],
    ["system", "System", "Reserved", { displayBoundary: "internal" }],
    ["machine", "Machine", "Reserved", { displayBoundary: "integration" }]
  ];
  for (const [roleKey, roleName, roleType, metadata] of roles) {
    upsertSeed(dbConn, report, {
      table: "enterprise_roles",
      keyColumn: "role_key",
      keyValue: roleKey,
      uuidColumn: "role_uuid",
      values: {
        role_name: roleName,
        role_type: roleType,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json(metadata, {})
      }
    });
  }

  const scopes = [
    ["public.catalog.read", "Public Catalog Read", "platform"],
    ["customer.profile.read", "Customer Profile Read", "customer_success"],
    ["customer.profile.write", "Customer Profile Write", "customer_success"],
    ["customer.orders.read", "Customer Orders Read", "operations"],
    ["customer.documents.read", "Customer Documents Read", "operations"],
    ["customer.conversations.read", "Customer Conversations Read", "customer_success"],
    ["admin.dashboard.read", "Admin Dashboard Read", "operations"],
    ["admin.orders.manage", "Admin Orders Manage", "operations"],
    ["admin.customers.read", "Admin Customers Read", "customer_success"],
    ["admin.staff.manage", "Admin Staff Manage", "operations"],
    ["admin.settings.manage", "Admin Settings Manage", "platform"],
    ["admin.executive.read", "Admin Executive Read", "leadership"],
    ["system.integration.invoke", "System Integration Invoke", "platform"],
    ["webhook.payment.receive", "Webhook Payment Receive", "finance"]
  ];
  for (const [scopeKey, scopeName, scopeOwner] of scopes) {
    upsertSeed(dbConn, report, {
      table: "enterprise_scopes",
      keyColumn: "scope_key",
      keyValue: scopeKey,
      uuidColumn: "scope_uuid",
      values: {
        scope_name: scopeName,
        scope_owner: scopeOwner,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const permissions = [
    ["public_catalog_read", "Public Catalog Read", "public.catalog.read", "read", "AUTO"],
    ["customer_profile_read", "Customer Profile Read", "customer.profile.read", "read", "AUTO"],
    ["customer_profile_write", "Customer Profile Write", "customer.profile.write", "write", "MANUAL_APPROVAL"],
    ["customer_orders_read", "Customer Orders Read", "customer.orders.read", "read", "AUTO"],
    ["customer_documents_read", "Customer Documents Read", "customer.documents.read", "read", "AUTO"],
    ["customer_conversations_read", "Customer Conversations Read", "customer.conversations.read", "read", "AUTO"],
    ["admin_dashboard_read", "Admin Dashboard Read", "admin.dashboard.read", "read", "ADMIN_ONLY"],
    ["admin_orders_manage", "Admin Orders Manage", "admin.orders.manage", "manage", "ADMIN_ONLY"],
    ["admin_customers_read", "Admin Customers Read", "admin.customers.read", "read", "ADMIN_ONLY"],
    ["admin_staff_manage", "Admin Staff Manage", "admin.staff.manage", "manage", "ADMIN_ONLY"],
    ["admin_settings_manage", "Admin Settings Manage", "admin.settings.manage", "manage", "OWNER_ONLY"],
    ["admin_executive_read", "Admin Executive Read", "admin.executive.read", "read", "ADMIN_ONLY"],
    ["system_integration_invoke", "System Integration Invoke", "system.integration.invoke", "invoke", "AUTO"],
    ["webhook_payment_receive", "Webhook Payment Receive", "webhook.payment.receive", "receive", "AUTO"]
  ];
  for (const [permissionKey, permissionName, scopeKey, actionBoundary, approvalBoundary] of permissions) {
    upsertSeed(dbConn, report, {
      table: "enterprise_permissions",
      keyColumn: "permission_key",
      keyValue: permissionKey,
      uuidColumn: "permission_uuid",
      values: {
        permission_name: permissionName,
        scope_key: scopeKey,
        action_boundary: actionBoundary,
        approval_boundary: approvalBoundary,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const rolePermissions = [
    ["public_visitor", "public_catalog_read"],
    ["customer", "customer_profile_read"],
    ["customer", "customer_profile_write"],
    ["customer", "customer_orders_read"],
    ["customer", "customer_documents_read"],
    ["customer", "customer_conversations_read"],
    ["staff_agent", "admin_dashboard_read"],
    ["admin", "admin_dashboard_read"],
    ["admin", "admin_orders_manage"],
    ["admin", "admin_customers_read"],
    ["admin", "admin_staff_manage"],
    ["admin", "admin_settings_manage"],
    ["executive", "admin_executive_read"],
    ["system", "system_integration_invoke"],
    ["machine", "webhook_payment_receive"]
  ];
  for (const [roleKey, permissionKey] of rolePermissions) {
    const existing = dbConn.prepare(`
      SELECT role_permission_uuid
      FROM enterprise_role_permissions
      WHERE role_key = ? AND permission_key = ?
    `).get(roleKey, permissionKey);
    upsertSeed(dbConn, report, {
      table: "enterprise_role_permissions",
      keyColumn: "role_permission_uuid",
      keyValue: existing?.role_permission_uuid || crypto.randomUUID(),
      uuidColumn: "role_permission_uuid",
      values: {
        role_key: roleKey,
        permission_key: permissionKey,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const authPolicies = [
    ["rbac_baseline", "RBAC Baseline", "RBAC", "ADMIN_ONLY", 1, 0],
    ["abac_reserved", "ABAC Reserved", "ABAC", "MANUAL_APPROVAL", 1, 1],
    ["least_privilege_baseline", "Least Privilege Baseline", "Hybrid", "ADMIN_ONLY", 1, 1],
    ["admin_session_boundary", "Admin Session Boundary", "RBAC", "ADMIN_ONLY", 1, 1],
    ["customer_session_boundary", "Customer Session Boundary", "RBAC", "AUTO", 1, 0],
    ["machine_identity_boundary", "Machine Identity Boundary", "Reserved", "MANUAL_APPROVAL", 1, 1]
  ];
  for (const [policyKey, policyName, evaluationModel, approvalClass, leastPrivilegeRequired, separationOfDutiesRequired] of authPolicies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_authorization_policies",
      keyColumn: "policy_key",
      keyValue: policyKey,
      uuidColumn: "authorization_policy_uuid",
      values: {
        policy_name: policyName,
        evaluation_model: evaluationModel,
        approval_class: approvalClass,
        least_privilege_required: leastPrivilegeRequired,
        separation_of_duties_required: separationOfDutiesRequired,
        lifecycle_status: evaluationModel === "Reserved" ? "Reserved" : "Approved",
        asset_version: 1,
        metadata_json: json({
          dashboardConsumerBoundaryPreserved: true,
          repositoryRuntimeStandardizationImplemented: false
        }, {})
      }
    });
  }
}

function seedServiceAndSecurityGovernance(dbConn, report) {
  const serviceContracts = [
    ["public_api_service", "Public API Service Contract", "public_v1", "json_list_v1", "backward_compatible", "Active"],
    ["customer_api_service", "Customer API Service Contract", "customer_v1", "json_single_resource_v1", "backward_compatible", "Active"],
    ["admin_api_service", "Admin API Service Contract", "admin_v1", "json_list_v1", "backward_compatible", "Active"],
    ["auth_service", "Authentication Service Contract", "internal_v1", "json_action_status_v1", "backward_compatible", "Active"],
    ["webhook_ingestion_service", "Webhook Ingestion Service Contract", "webhooks_v1", "json_action_status_v1", "backward_compatible", "Active"],
    ["notification_service", "Notification Service Contract", "internal_v1", "json_action_status_v1", "backward_compatible", "Active"]
  ];
  for (const [serviceKey, contractName, apiVersionKey, responseContractKey, compatibilityLevel, serviceLifecycle] of serviceContracts) {
    upsertSeed(dbConn, report, {
      table: "enterprise_service_contracts",
      keyColumn: "service_key",
      keyValue: serviceKey,
      uuidColumn: "service_contract_uuid",
      values: {
        contract_name: contractName,
        api_version_key: apiVersionKey,
        response_contract_key: responseContractKey,
        compatibility_level: compatibilityLevel,
        service_lifecycle: serviceLifecycle,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          repositoryRuntimeStandardizationImplemented: false
        }, {})
      }
    });
  }

  const ownership = [
    ["public_api_service", "platform", "platform", "platform"],
    ["customer_api_service", "customer_success", "customer_success", "platform"],
    ["admin_api_service", "operations", "operations", "platform"],
    ["auth_service", "platform", "platform", "platform"],
    ["webhook_ingestion_service", "finance", "finance", "platform"],
    ["notification_service", "operations", "operations", "platform"]
  ];
  for (const [serviceKey, serviceOwner, ownerDepartment, dependencyOwner] of ownership) {
    upsertSeed(dbConn, report, {
      table: "enterprise_service_ownership",
      keyColumn: "service_key",
      keyValue: serviceKey,
      uuidColumn: "service_ownership_uuid",
      values: {
        service_owner: serviceOwner,
        owner_department: ownerDepartment,
        dependency_owner: dependencyOwner,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const discovery = [
    ["public_api_service", "/api", "http", "local_monolith", "startup_and_health", "dependency_health_required", "owner_before_registration", "single_node_baseline"],
    ["customer_api_service", "/api/customer", "http", "local_monolith", "startup_and_health", "dependency_health_required", "owner_before_registration", "single_node_baseline"],
    ["admin_api_service", "/api/admin", "http", "local_monolith", "startup_and_health", "dependency_health_required", "owner_before_registration", "single_node_baseline"],
    ["auth_service", "/api/auth", "http", "local_monolith", "startup_and_health", "dependency_health_required", "owner_before_registration", "single_node_baseline"],
    ["webhook_ingestion_service", "/api/webhooks", "http", "local_monolith", "signature_and_health", "dependency_health_required", "owner_before_registration", "single_node_baseline"],
    ["notification_service", "internal_notification_dispatch", "internal", "local_monolith", "provider_health_policy", "dependency_health_required", "owner_before_registration", "single_node_baseline"]
  ];
  for (const [serviceKey, serviceEndpoint, serviceProtocol, discoveryScope, serviceHealthPolicy, dependencyHealth, registrationPolicy, availabilityPolicy] of discovery) {
    upsertSeed(dbConn, report, {
      table: "enterprise_service_discovery",
      keyColumn: "service_key",
      keyValue: serviceKey,
      uuidColumn: "service_discovery_uuid",
      values: {
        service_endpoint: serviceEndpoint,
        service_protocol: serviceProtocol,
        discovery_scope: discoveryScope,
        service_health_policy: serviceHealthPolicy,
        dependency_health: dependencyHealth,
        registration_policy: registrationPolicy,
        availability_policy: availabilityPolicy,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const serviceSlas = [
    ["public_api_service", "public_standard", "99.0", "4h", "scheduled_window", "medium", "public_outage"],
    ["customer_api_service", "customer_standard", "99.5", "2h", "scheduled_window", "high", "customer_outage"],
    ["admin_api_service", "admin_standard", "99.5", "2h", "scheduled_window", "high", "admin_outage"],
    ["auth_service", "auth_critical", "99.9", "1h", "restricted_window", "critical", "auth_outage"],
    ["webhook_ingestion_service", "webhook_standard", "99.5", "2h", "scheduled_window", "high", "integration_outage"],
    ["notification_service", "notification_standard", "99.0", "4h", "scheduled_window", "medium", "provider_outage"]
  ];
  for (const [serviceKey, serviceSla, availabilityTarget, recoveryTarget, maintenancePolicy, servicePriority, outageClassification] of serviceSlas) {
    upsertSeed(dbConn, report, {
      table: "enterprise_service_sla_policies",
      keyColumn: "service_key",
      keyValue: serviceKey,
      uuidColumn: "service_sla_uuid",
      values: {
        service_sla: serviceSla,
        availability_target: availabilityTarget,
        recovery_target: recoveryTarget,
        maintenance_policy: maintenancePolicy,
        service_priority: servicePriority,
        outage_classification: outageClassification,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const serviceDependencies = [
    ["customer_api_service", "auth_service", "requires_auth_boundary"],
    ["admin_api_service", "auth_service", "requires_admin_auth_boundary"],
    ["webhook_ingestion_service", "auth_service", "requires_signature_boundary"],
    ["notification_service", "customer_api_service", "uses_customer_contact_context"],
    ["notification_service", "admin_api_service", "uses_admin_notification_context"]
  ];
  for (const [sourceServiceKey, targetServiceKey, dependencyType] of serviceDependencies) {
    const existing = dbConn.prepare(`
      SELECT service_dependency_uuid
      FROM enterprise_service_dependencies
      WHERE source_service_key = ? AND target_service_key = ? AND dependency_type = ?
    `).get(sourceServiceKey, targetServiceKey, dependencyType);
    upsertSeed(dbConn, report, {
      table: "enterprise_service_dependencies",
      keyColumn: "service_dependency_uuid",
      keyValue: existing?.service_dependency_uuid || crypto.randomUUID(),
      uuidColumn: "service_dependency_uuid",
      values: {
        source_service_key: sourceServiceKey,
        target_service_key: targetServiceKey,
        dependency_type: dependencyType,
        dependency_status: "Active",
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          runtimeDependencyEngineImplemented: false
        }, {})
      }
    });
  }

  const machineIdentities = [
    ["internal_server_runtime", "Application Runtime", "platform", "internal_runtime", "Active", "Active", "owner_rotation_policy", "owner_revocation_policy", "service_internal", "backward_compatible"],
    ["razorpay_gateway_machine", "Payment Gateway", "finance", "external_payment_gateway", "Active", "Active", "provider_rotation_policy", "provider_revocation_policy", "provider_signature", "backward_compatible"],
    ["phonepe_gateway_machine", "Payment Gateway", "finance", "external_payment_gateway", "Active", "Active", "provider_rotation_policy", "provider_revocation_policy", "provider_signature", "backward_compatible"],
    ["notification_dispatch_machine", "Notification Dispatch", "operations", "notification_provider", "Active", "Active", "owner_rotation_policy", "owner_revocation_policy", "webhook_provider", "backward_compatible"]
  ];
  for (const [machineIdentityKey, machineIdentityType, machineIdentityOwner, machineIdentityScope, machineIdentityStatus, machineIdentityLifecycle, rotationPolicy, revocationPolicy, authProfile, compatibilityClass] of machineIdentities) {
    const machineIdentityUuid = getSeedUuid(dbConn, "enterprise_machine_identities", "machine_identity_key", machineIdentityKey, "machine_identity_uuid");
    const enterpriseIdentityUuid = ensureEnterpriseIdentity(dbConn, report, {
      identityKey: `machine_${machineIdentityKey}`,
      enterpriseIdentityUuid: machineIdentityUuid,
      identityType: "Machine",
      identityName: `${machineIdentityType} Machine Identity`,
      identityOwner: machineIdentityOwner,
      sourceObjectType: "machine_identity",
      sourceObjectUuid: machineIdentityUuid,
      identityStatus: machineIdentityStatus,
      identityLifecycle: machineIdentityLifecycle,
      lifecycleStatus: "Approved",
      childRegistry: "enterprise_machine_identities"
    });
    upsertSeed(dbConn, report, {
      table: "enterprise_machine_identities",
      keyColumn: "machine_identity_key",
      keyValue: machineIdentityKey,
      uuidColumn: "machine_identity_uuid",
      values: {
        machine_identity_uuid: machineIdentityUuid,
        enterprise_identity_uuid: enterpriseIdentityUuid,
        machine_identity_type: machineIdentityType,
        machine_identity_owner: machineIdentityOwner,
        machine_identity_scope: machineIdentityScope,
        machine_identity_status: machineIdentityStatus,
        machine_identity_lifecycle: machineIdentityLifecycle,
        machine_identity_rotation_policy: rotationPolicy,
        machine_identity_revocation_policy: revocationPolicy,
        machine_identity_auth_profile: authProfile,
        machine_identity_compatibility_class: compatibilityClass,
        lifecycle_status: "Approved",
        asset_version: 2,
        metadata_json: json({
          noSecretStored: true,
          canonicalEnterpriseIdentityUuid: enterpriseIdentityUuid
        }, {})
      }
    });
  }

  const apiKeys = [
    ["razorpay_public_api_key", "razorpay_gateway_machine", "finance", "payment_api", "Active", "provider_rotation_policy", "provider_expiry_policy", "provider_revocation_policy", "backend_only", "payment_gateway_usage", "payment_audit"],
    ["phonepe_gateway_key", "phonepe_gateway_machine", "finance", "payment_api", "Active", "provider_rotation_policy", "provider_expiry_policy", "provider_revocation_policy", "backend_only", "payment_gateway_usage", "payment_audit"],
    ["notification_webhook_key", "notification_dispatch_machine", "operations", "notification_webhook", "Active", "owner_rotation_policy", "owner_expiry_policy", "owner_revocation_policy", "backend_only", "notification_usage", "notification_audit"],
    ["internal_service_key", "internal_server_runtime", "platform", "internal_runtime", "Active", "owner_rotation_policy", "owner_expiry_policy", "owner_revocation_policy", "backend_only", "internal_usage", "internal_audit"]
  ];
  for (const [apiKeyKey, machineIdentityKey, apiKeyOwner, apiKeyScope, apiKeyStatus, rotationPolicy, expiryPolicy, revocationPolicy, storagePolicy, usagePolicy, auditClass] of apiKeys) {
    upsertSeed(dbConn, report, {
      table: "enterprise_api_keys",
      keyColumn: "api_key_key",
      keyValue: apiKeyKey,
      uuidColumn: "api_key_uuid",
      values: {
        machine_identity_key: machineIdentityKey,
        api_key_owner: apiKeyOwner,
        api_key_scope: apiKeyScope,
        api_key_status: apiKeyStatus,
        api_key_rotation_policy: rotationPolicy,
        api_key_expiry_policy: expiryPolicy,
        api_key_revocation_policy: revocationPolicy,
        api_key_storage_policy: storagePolicy,
        api_key_usage_policy: usagePolicy,
        api_key_audit_class: auditClass,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          secretMaterialStored: false
        }, {})
      }
    });
  }

  const credentials = [
    ["admin_session_signing_secret", "signing_secret", "platform", "rotation_per_release", "no_expiry_without_rotation", "owner_revocation_policy", "backend_secret_store", "admin_auth_boundary"],
    ["customer_otp_hash_salt", "hash_salt", "platform", "rotation_per_release", "no_expiry_without_rotation", "owner_revocation_policy", "backend_secret_store", "customer_auth_boundary"],
    ["razorpay_webhook_secret", "provider_secret", "finance", "provider_rotation_policy", "provider_expiry_policy", "provider_revocation_policy", "backend_secret_store", "webhook_signature_boundary"],
    ["smtp_account_credential", "provider_credential", "operations", "owner_rotation_policy", "owner_expiry_policy", "owner_revocation_policy", "backend_secret_store", "notification_boundary"],
    ["notification_webhook_credential", "provider_credential", "operations", "owner_rotation_policy", "owner_expiry_policy", "owner_revocation_policy", "backend_secret_store", "notification_boundary"]
  ];
  for (const [credentialKey, credentialClass, secretOwner, rotationPolicy, expiryPolicy, revocationPolicy, storagePolicy, accessBoundary] of credentials) {
    upsertSeed(dbConn, report, {
      table: "enterprise_credentials",
      keyColumn: "credential_key",
      keyValue: credentialKey,
      uuidColumn: "credential_uuid",
      values: {
        credential_class: credentialClass,
        secret_owner: secretOwner,
        rotation_policy: rotationPolicy,
        expiry_policy: expiryPolicy,
        revocation_policy: revocationPolicy,
        storage_policy: storagePolicy,
        access_boundary: accessBoundary,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          secretMaterialStored: false,
          frontendAuthority: false
        }, {})
      }
    });
  }

  const webhooks = [
    ["razorpay_payment_webhook", "finance", "payment_gateway", "payment.captured", "hmac_signature_required", "provider_retry_policy", "at_least_once", "provider_ordering", "signature_before_processing", "Active", "deprecate_by_provider_contract"],
    ["phonepe_payment_webhook", "finance", "payment_gateway", "payment.status", "checksum_signature_required", "provider_retry_policy", "at_least_once", "provider_ordering", "signature_before_processing", "Active", "deprecate_by_provider_contract"],
    ["notification_sms_webhook", "operations", "notification_provider", "notification.sms", "provider_signature_optional", "provider_retry_policy", "best_effort", "provider_ordering", "provider_contract_validation", "Reserved", "deprecate_by_provider_contract"],
    ["notification_whatsapp_webhook", "operations", "notification_provider", "notification.whatsapp", "provider_signature_optional", "provider_retry_policy", "best_effort", "provider_ordering", "provider_contract_validation", "Reserved", "deprecate_by_provider_contract"]
  ];
  for (const [webhookKey, webhookOwner, webhookScope, webhookEventReference, webhookSignaturePolicy, webhookRetryPolicy, webhookDeliveryPolicy, webhookOrderingPolicy, webhookVerificationPolicy, webhookLifecycle, webhookDeprecationPolicy] of webhooks) {
    upsertSeed(dbConn, report, {
      table: "enterprise_webhooks",
      keyColumn: "webhook_key",
      keyValue: webhookKey,
      uuidColumn: "webhook_uuid",
      values: {
        webhook_owner: webhookOwner,
        webhook_scope: webhookScope,
        webhook_event_reference: webhookEventReference,
        webhook_signature_policy: webhookSignaturePolicy,
        webhook_retry_policy: webhookRetryPolicy,
        webhook_delivery_policy: webhookDeliveryPolicy,
        webhook_ordering_policy: webhookOrderingPolicy,
        webhook_verification_policy: webhookVerificationPolicy,
        webhook_lifecycle: webhookLifecycle,
        webhook_deprecation_policy: webhookDeprecationPolicy,
        lifecycle_status: webhookLifecycle === "Reserved" ? "Reserved" : "Approved",
        asset_version: 1,
        metadata_json: json({
          backendGovernedOnly: true
        }, {})
      }
    });
  }

  const federations = [
    ["gmail_customer_federation", "customer_identity_boundary", "gmail_account_reference", "Google", "verified_email_plus_otp", "phone_link_required", "Active"],
    ["admin_email_otp_federation", "admin_identity_boundary", "admin_email_reference", "Email OTP", "owner_controlled", "manual_verification", "Active"],
    ["partner_api_federation_reserved", "service_identity_boundary", "partner_identity_reference", "Partner", "reserved", "contractual_mapping", "Reserved"]
  ];
  for (const [federationKey, federationIdentityReference, externalIdentityReference, federationProvider, federationTrustLevel, federationMappingPolicy, federationLifecycle] of federations) {
    upsertSeed(dbConn, report, {
      table: "enterprise_federation_mappings",
      keyColumn: "federation_key",
      keyValue: federationKey,
      uuidColumn: "federation_uuid",
      values: {
        federation_identity_reference: federationIdentityReference,
        external_identity_reference: externalIdentityReference,
        federation_provider: federationProvider,
        federation_trust_level: federationTrustLevel,
        federation_mapping_policy: federationMappingPolicy,
        federation_lifecycle: federationLifecycle,
        lifecycle_status: federationLifecycle === "Reserved" ? "Reserved" : "Approved",
        asset_version: 1,
        metadata_json: json({
          enterpriseIdentityRemainsAuthoritative: true
        }, {})
      }
    });
  }
}

function seedConsentPrivacyPolicyGovernance(dbConn, report) {
  const privacyClasses = [
    ["public", "Public", "public", "public_display_only", 1],
    ["customer_safe", "Customer Safe", "customer_safe", "customer_projection_boundary", 1],
    ["admin_internal", "Admin Internal", "internal_admin", "admin_only_projection", 0],
    ["sensitive_identity", "Sensitive Identity", "regulated_identity", "explicit_policy_required", 0],
    ["regulated_data", "Regulated Data", "regulated_data", "explicit_policy_required", 0]
  ];
  for (const [privacyKey, displayName, privacyClassification, dataExposurePolicy, customerSafeProjectionRequired] of privacyClasses) {
    upsertSeed(dbConn, report, {
      table: "enterprise_privacy_classes",
      keyColumn: "privacy_key",
      keyValue: privacyKey,
      uuidColumn: "privacy_class_uuid",
      values: {
        display_name: displayName,
        privacy_classification: privacyClassification,
        data_exposure_policy: dataExposurePolicy,
        customer_safe_projection_required: customerSafeProjectionRequired,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const consentPolicies = [
    ["customer_marketing_consent_v1", "customer_success", "customer_marketing", "1.0", "Active", null, "customer_safe", "explicit_opt_in", "marketing_messages", "customer_consent_timeline"],
    ["customer_service_updates_consent_v1", "operations", "service_updates", "1.0", "Active", null, "customer_safe", "service_notification_opt_in", "service_notifications", "customer_consent_timeline"],
    ["customer_data_processing_consent_v1", "platform", "data_processing", "1.0", "Active", null, "regulated_data", "policy_required", "core_service_processing", "customer_consent_timeline"]
  ];
  for (const [consentKey, consentOwner, consentScope, consentVersion, consentStatus, consentExpiry, privacyClassification, dataExposurePolicy, dataProcessingScope, consentAuditPolicy] of consentPolicies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_consent_policies",
      keyColumn: "consent_key",
      keyValue: consentKey,
      uuidColumn: "consent_policy_uuid",
      values: {
        consent_owner: consentOwner,
        consent_scope: consentScope,
        consent_version: consentVersion,
        consent_status: consentStatus,
        consent_expiry: consentExpiry,
        privacy_classification: privacyClassification,
        data_exposure_policy: dataExposurePolicy,
        data_processing_scope: dataProcessingScope,
        consent_audit_policy: consentAuditPolicy,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          consentDoesNotReplacePermission: true
        }, {})
      }
    });
  }

  const zeroTrustPolicies = [
    ["public_web_boundary", "public_web", "public_caller", "public_device", "public_network", "challenge_on_escalation", "per_request_boundary", "low", "public_read_only", "external_public_access"],
    ["customer_session_boundary", "customer_session", "customer_session_caller", "known_device_optional", "internet_network", "step_up_on_sensitive_action", "session_and_csrf_boundary", "medium", "customer_authorized_access", "external_customer_access"],
    ["admin_session_boundary", "admin_session", "admin_session_caller", "trusted_admin_device", "trusted_network_preferred", "strong_auth_required", "continuous_admin_validation", "high", "admin_authorized_access", "external_admin_access"],
    ["internal_service_boundary", "internal_service", "internal_service_caller", "managed_device", "internal_network", "service_policy_auth", "continuous_service_validation", "medium", "internal_service_access", "external_access_forbidden"],
    ["webhook_ingestion_boundary", "provider_webhook", "provider_webhook_caller", "provider_device", "internet_network", "signature_required", "per_request_signature_validation", "medium", "backend_processing_only", "external_provider_access"]
  ];
  for (const [policyKey, trustBoundary, callerTrustClass, deviceTrustClass, networkTrustClass, adaptiveAuthPolicy, continuousVerificationPolicy, riskScoreClass, internalAccessPolicy, externalAccessPolicy] of zeroTrustPolicies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_zero_trust_policies",
      keyColumn: "policy_key",
      keyValue: policyKey,
      uuidColumn: "zero_trust_policy_uuid",
      values: {
        trust_boundary: trustBoundary,
        caller_trust_class: callerTrustClass,
        device_trust_class: deviceTrustClass,
        network_trust_class: networkTrustClass,
        adaptive_auth_policy: adaptiveAuthPolicy,
        continuous_verification_policy: continuousVerificationPolicy,
        risk_score_class: riskScoreClass,
        internal_access_policy: internalAccessPolicy,
        external_access_policy: externalAccessPolicy,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          replacesAuthorization: false
        }, {})
      }
    });
  }

  const policies = [
    ["api_policy", "API Governance Policy", "platform", "api_governance", "api", "Approved", "Published"],
    ["identity_policy", "Identity Governance Policy", "platform", "identity_governance", "identity", "Approved", "Published"],
    ["permission_policy", "Permission Governance Policy", "platform", "permission_governance", "permission", "Approved", "Published"],
    ["credential_policy", "Credential Governance Policy", "platform", "credential_governance", "credential", "Approved", "Published"],
    ["webhook_policy", "Webhook Governance Policy", "platform", "webhook_governance", "webhook", "Approved", "Published"],
    ["privacy_policy", "Privacy Governance Policy", "platform", "privacy_governance", "privacy", "Approved", "Published"],
    ["federation_policy", "Federation Governance Policy", "platform", "federation_governance", "federation", "Approved", "Published"],
    ["service_policy", "Service Governance Policy", "platform", "service_governance", "service", "Approved", "Published"],
    ["zero_trust_policy", "Zero Trust Governance Policy", "platform", "zero_trust_governance", "security", "Approved", "Published"],
    ["consumer_compatibility_policy", "Consumer Compatibility Policy", "platform", "consumer_governance", "consumer", "Approved", "Published"]
  ];
  const policyUuidByKey = new Map();
  for (const [policyKey, policyName, policyOwner, policyScope, policyType, policyStatus, policyLifecycle] of policies) {
    policyUuidByKey.set(policyKey, upsertSeed(dbConn, report, {
      table: "enterprise_policy_registry",
      keyColumn: "policy_key",
      keyValue: policyKey,
      uuidColumn: "policy_uuid",
      values: {
        policy_name: policyName,
        policy_owner: policyOwner,
        policy_scope: policyScope,
        policy_type: policyType,
        current_version_number: 1,
        policy_status: policyStatus,
        policy_lifecycle: policyLifecycle,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          crossDomainConsistencyRequired: true
        }, {})
      }
    }));
  }

  for (const [policyKey, content] of [
    ["api_policy", { apiVersionRegistryRequired: true, compatibilityRegistryRequired: true }],
    ["identity_policy", { immutableUuidGovernance: true, lifecycleSeparateFromBusinessLifecycle: true }],
    ["permission_policy", { leastPrivilege: true, separationOfDuties: true }],
    ["credential_policy", { frontendAuthorityForbidden: true }],
    ["webhook_policy", { signatureVerificationRequired: true }],
    ["privacy_policy", { customerSafeProjectionRequired: true }],
    ["federation_policy", { enterpriseIdentityRemainsAuthoritative: true }],
    ["service_policy", { ownerBeforeRegistration: true }],
    ["zero_trust_policy", { authorizationReplacementForbidden: true }],
    ["consumer_compatibility_policy", { governedConsumerRegistryRequired: true }]
  ]) {
    upsertSeed(dbConn, report, {
      table: "enterprise_policy_versions",
      keyColumn: "policy_version_uuid",
      keyValue: dbConn.prepare(
        "SELECT policy_version_uuid FROM enterprise_policy_versions WHERE policy_uuid = ? AND version_number = 1"
      ).get(policyUuidByKey.get(policyKey))?.policy_version_uuid || crypto.randomUUID(),
      uuidColumn: "policy_version_uuid",
      values: {
        policy_uuid: policyUuidByKey.get(policyKey),
        version_number: 1,
        version_status: "Published",
        policy_content_json: json(content, {}),
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const policyDependencies = [
    ["api_policy", "identity_policy", "requires"],
    ["permission_policy", "identity_policy", "requires"],
    ["credential_policy", "zero_trust_policy", "requires"],
    ["webhook_policy", "credential_policy", "requires"],
    ["privacy_policy", "identity_policy", "requires"],
    ["federation_policy", "identity_policy", "requires"],
    ["service_policy", "api_policy", "requires"],
    ["consumer_compatibility_policy", "api_policy", "requires"]
  ];
  for (const [sourceKey, targetKey, dependencyType] of policyDependencies) {
    const existing = dbConn.prepare(`
      SELECT policy_dependency_uuid
      FROM enterprise_policy_dependencies
      WHERE source_policy_uuid = ? AND target_policy_uuid = ? AND dependency_type = ?
    `).get(policyUuidByKey.get(sourceKey), policyUuidByKey.get(targetKey), dependencyType);
    upsertSeed(dbConn, report, {
      table: "enterprise_policy_dependencies",
      keyColumn: "policy_dependency_uuid",
      keyValue: existing?.policy_dependency_uuid || crypto.randomUUID(),
      uuidColumn: "policy_dependency_uuid",
      values: {
        source_policy_uuid: policyUuidByKey.get(sourceKey),
        target_policy_uuid: policyUuidByKey.get(targetKey),
        dependency_type: dependencyType,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }
}

function seedPersistenceDomains(dbConn, report) {
  const rows = [
    ["enterprise_api_governance", "Enterprise API Governance", "registry_store", "platform", "platform", "governed_business_domain", "owner_approved_only", "per_release_review", { primaryTables: ["enterprise_api_versions", "enterprise_api_compatibility_profiles", "enterprise_api_consumers", "enterprise_response_contracts", "enterprise_error_contracts", "enterprise_api_contract_changes", "enterprise_api_rate_limit_policies", "enterprise_api_observability_profiles"] }],
    ["enterprise_identity_governance", "Enterprise Identity Governance", "registry_store", "platform", "platform", "governed_business_domain", "owner_approved_only", "per_release_review", { primaryTables: ["enterprise_identities", "enterprise_identity_delegations", "enterprise_identity_audit_profiles", "enterprise_machine_identities", "enterprise_api_keys", "enterprise_credentials", "enterprise_federation_mappings"] }],
    ["enterprise_permission_governance", "Enterprise Permission Governance", "registry_store", "platform", "platform", "governed_business_domain", "owner_approved_only", "per_release_review", { primaryTables: ["enterprise_roles", "enterprise_scopes", "enterprise_permissions", "enterprise_role_permissions", "enterprise_authorization_policies"] }],
    ["enterprise_service_governance", "Enterprise Service Governance", "registry_store", "platform", "platform", "governed_business_domain", "owner_approved_only", "per_release_review", { primaryTables: ["enterprise_service_contracts", "enterprise_service_ownership", "enterprise_service_discovery", "enterprise_service_sla_policies", "enterprise_service_dependencies"] }],
    ["enterprise_security_governance", "Enterprise Security Governance", "registry_store", "platform", "platform", "governed_business_domain", "owner_approved_only", "per_release_review", { primaryTables: ["enterprise_consent_policies", "enterprise_privacy_classes", "enterprise_zero_trust_policies"] }],
    ["enterprise_policy_governance", "Enterprise Policy Governance", "registry_store", "platform", "platform", "governed_business_domain", "owner_approved_only", "per_release_review", { primaryTables: ["enterprise_policy_registry", "enterprise_policy_versions", "enterprise_policy_dependencies"] }]
  ];
  for (const [domainKey, domainName, storeKey, dataOwner, domainOwner, stewardshipClass, transferPolicy, reviewPolicy, metadata] of rows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_persistence_domains",
      keyColumn: "domain_key",
      keyValue: domainKey,
      uuidColumn: "persistence_domain_uuid",
      values: {
        domain_name: domainName,
        store_key: storeKey,
        data_owner: dataOwner,
        domain_owner: domainOwner,
        stewardship_class: stewardshipClass,
        ownership_transfer_policy: transferPolicy,
        ownership_review_policy: reviewPolicy,
        active_state: "active",
        archived_state: "archived",
        retained_state: "retained",
        deprecated_state: "deprecated",
        purge_eligibility: "policy_governed",
        legal_hold_status: "not_on_hold",
        transaction_policy_key: "registry_write_policy",
        integrity_policy_key: "registry_foreign_key_policy",
        partition_policy_key: "single_node_baseline",
        repository_boundary_key: "registry_repository_boundary",
        adapter_boundary_key: "sqlite_primary_adapter",
        lifecycle_independent_from_business: 1,
        asset_version: domainKey === "enterprise_service_governance" ? 2 : 1,
        lifecycle_status: "Approved",
        metadata_json: json(metadata, {})
      }
    });
  }
}

function seedDomainDependencies(dbConn, report) {
  const rows = [
    ["enterprise_api_governance", "enterprise_identity_governance", "requires"],
    ["enterprise_permission_governance", "enterprise_identity_governance", "requires"],
    ["enterprise_service_governance", "enterprise_api_governance", "requires"],
    ["enterprise_security_governance", "enterprise_permission_governance", "requires"],
    ["enterprise_policy_governance", "enterprise_security_governance", "requires"],
    ["dashboard_registry", "enterprise_api_governance", "governed_api_consumer_reference"]
  ];
  for (const [sourceDomainKey, targetDomainKey, dependencyType] of rows) {
    const existing = dbConn.prepare(`
      SELECT dependency_uuid
      FROM enterprise_persistence_domain_dependencies
      WHERE source_domain_key = ? AND target_domain_key = ? AND dependency_type = ?
    `).get(sourceDomainKey, targetDomainKey, dependencyType);
    upsertSeed(dbConn, report, {
      table: "enterprise_persistence_domain_dependencies",
      keyColumn: "dependency_uuid",
      keyValue: existing?.dependency_uuid || crypto.randomUUID(),
      uuidColumn: "dependency_uuid",
      values: {
        source_domain_key: sourceDomainKey,
        target_domain_key: targetDomainKey,
        dependency_type: dependencyType,
        dependency_strength: "required",
        dependency_direction: "forward",
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }
}

function seedMigrationRegistry(dbConn, report, options) {
  const checksum = crypto.createHash("sha256")
    .update(fs.readFileSync(options.migrationPath, "utf8"), "utf8")
    .digest("hex")
    .toUpperCase();

  const dependencyMigrations = [
    ["phase-2-milestone-2.1-universal-business-object-and-domain-foundation", "Universal Business Object and Domain Foundation", 3],
    ["phase-2-milestone-2.2-customer-digital-genome-baseline", "Customer Digital Genome Baseline", 4],
    ["phase-2-milestone-2.3-universal-service-engine-baseline", "Universal Service Engine Baseline", 5],
    ["phase-2-milestone-2.4-order-orchestration-baseline", "Order Orchestration Baseline", 6],
    ["phase-2-milestone-2.5-document-intelligence-foundation", "Document Intelligence Foundation", 7],
    ["phase-2-milestone-2.6-customer-experience-and-omnichannel-foundation", "Customer Experience and Omnichannel Foundation", 8],
    ["phase-2-milestone-2.7-workforce-branch-franchise-executive", "Workforce, Branch, Franchise and Executive Layer", 9],
    ["phase-3-milestone-3.2-enterprise-intelligence-core", "Enterprise Intelligence Core Foundation", 10],
    ["phase-3-milestone-3.4-enterprise-database-evolution", "Enterprise Database Evolution", 12]
  ];
  for (const [migrationKey, migrationName, targetSchemaVersion] of dependencyMigrations) {
    upsertSeed(dbConn, report, {
      table: "enterprise_migration_registry",
      keyColumn: "migration_key",
      keyValue: migrationKey,
      uuidColumn: "migration_registry_uuid",
      values: {
        migration_name: migrationName,
        schema_key: SCHEMA_KEY,
        target_schema_version_number: targetSchemaVersion,
        report_path: null,
        checksum_sha256: null,
        migration_status: "applied",
        additive_only: 1,
        rollback_required: 1,
        lifecycle_status: "Applied",
        asset_version: 1,
        metadata_json: json({
          lineageReferenceOnly: true,
          frozenMilestoneDependency: true
        }, {}),
        applied_at: "2026-07-04T00:00:00.000Z"
      }
    });
  }

  upsertSeed(dbConn, report, {
    table: "enterprise_migration_registry",
    keyColumn: "migration_key",
    keyValue: MIGRATION_KEY,
    uuidColumn: "migration_registry_uuid",
    values: {
      migration_name: "Enterprise API, Identity & Permission Standardization",
      schema_key: SCHEMA_KEY,
      target_schema_version_number: 13,
      report_path: options.reportPath,
      checksum_sha256: checksum,
      migration_status: "applied",
      additive_only: 1,
      rollback_required: 1,
      lifecycle_status: "Applied",
      asset_version: 1,
      metadata_json: json({
        milestone: "Phase 3 - Milestone 3.5",
        implementationScope: "governed_api_identity_permission_foundation",
        repositoryRuntimeStandardizationImplemented: false,
        dashboardConsumerBoundaryPreserved: true
      }, {}),
      applied_at: nowIso()
    }
  });

  const dependencies = [
    "phase-2-milestone-2.1-universal-business-object-and-domain-foundation",
    "phase-2-milestone-2.2-customer-digital-genome-baseline",
    "phase-2-milestone-2.5-document-intelligence-foundation",
    "phase-2-milestone-2.6-customer-experience-and-omnichannel-foundation",
    "phase-2-milestone-2.7-workforce-branch-franchise-executive",
    "phase-3-milestone-3.2-enterprise-intelligence-core",
    "phase-3-milestone-3.4-enterprise-database-evolution"
  ];
  for (const dependencyKey of dependencies) {
    const existing = dbConn.prepare(`
      SELECT dependency_uuid
      FROM enterprise_migration_dependencies
      WHERE migration_key = ? AND depends_on_migration_key = ?
    `).get(MIGRATION_KEY, dependencyKey);
    upsertSeed(dbConn, report, {
      table: "enterprise_migration_dependencies",
      keyColumn: "dependency_uuid",
      keyValue: existing?.dependency_uuid || crypto.randomUUID(),
      uuidColumn: "dependency_uuid",
      values: {
        migration_key: MIGRATION_KEY,
        depends_on_migration_key: dependencyKey,
        dependency_type: "requires",
        lifecycle_status: "Active",
        asset_version: 1,
        metadata_json: json({
          roadmapDependencies: ["phase-3.1", "phase-3.3"]
        }, {})
      }
    });
  }
}

function syncEnterpriseApiIdentityPermissionFoundation(options = {}) {
  const dbConn = options.dbConn;
  if (!dbConn) throw new Error("syncEnterpriseApiIdentityPermissionFoundation requires dbConn.");
  const report = createMigrationReport();
  try {
    ensureCorrectiveSchema(dbConn);
    ensurePolicyLookups(dbConn);
    seedSchemaAndCompatibility(dbConn, report);
    seedApiGovernance(dbConn, report);
    seedIdentityAndPermissionGovernance(dbConn, report);
    seedServiceAndSecurityGovernance(dbConn, report);
    seedConsentPrivacyPolicyGovernance(dbConn, report);
    seedPersistenceDomains(dbConn, report);
    seedDomainDependencies(dbConn, report);
    seedMigrationRegistry(dbConn, report, options);
    report.finishedAt = nowIso();
    if (options.writeEvidence !== false) writeMigrationEvidence(options, report);
    return report;
  } catch (error) {
    addFailure(report, "enterprise_api_identity_permission_standardization", MIGRATION_KEY, error);
    report.finishedAt = nowIso();
    if (options.writeEvidence !== false) writeMigrationEvidence(options, report);
    error.migrationReport = report;
    throw error;
  }
}

function addValidation(report, key, ok, details) {
  report.validations[key] = { ok, details };
  if (!ok) report.failures.push({ key, details });
}

function validateUuidTable(dbConn, table, uuidColumn) {
  const total = dbConn.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  const withUuid = dbConn.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${uuidColumn} IS NOT NULL AND ${uuidColumn} <> ''`).get().count;
  const distinct = dbConn.prepare(`SELECT COUNT(DISTINCT ${uuidColumn}) AS count FROM ${table}`).get().count;
  return { total, withUuid, distinct, ok: total === withUuid && total === distinct };
}

function validateEnterpriseApiIdentityPermissionFoundation(options = {}) {
  const dbConn = options.dbConn;
  if (!dbConn) throw new Error("validateEnterpriseApiIdentityPermissionFoundation requires dbConn.");
  const report = createValidationReport(options.kind || "project_database");

  const compatibilityRow = dbConn.prepare(`
    SELECT backward_compatible, authentication_compatibility_required, dashboard_compatibility_required,
           website_compatibility_required
    FROM enterprise_compatibility_registry
    WHERE registry_key = 'phase-3-milestone-3.5-baseline'
  `).get();
  addValidation(report, "api_compatibility_validation", Boolean(
    compatibilityRow
      && Number(compatibilityRow.backward_compatible) === 1
      && Number(compatibilityRow.authentication_compatibility_required) === 1
      && Number(compatibilityRow.dashboard_compatibility_required) === 1
      && Number(compatibilityRow.website_compatibility_required) === 1
  ), compatibilityRow || null);

  const authCompatibility = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_api_compatibility_profiles
    WHERE authentication_compatibility_required = 1
  `).get();
  addValidation(report, "identity_compatibility_validation", Number(authCompatibility.count) >= 3, { profilesRequiringAuthCompatibility: authCompatibility.count });

  const permissionCounts = {
    roles: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_roles").get().count,
    scopes: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_scopes").get().count,
    permissions: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_permissions").get().count,
    rolePermissions: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_role_permissions").get().count,
    authPolicies: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_authorization_policies").get().count
  };
  addValidation(report, "permission_compatibility_validation", (
    permissionCounts.roles >= 6
    && permissionCounts.scopes >= 10
    && permissionCounts.permissions >= 10
    && permissionCounts.rolePermissions >= 10
    && permissionCounts.authPolicies >= 5
  ), permissionCounts);

  const sessionRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_api_compatibility_profiles
    WHERE session_compatibility_required = 1
  `).get();
  addValidation(report, "session_compatibility_validation", Number(sessionRow.count) >= 2, { profilesRequiringSessionCompatibility: sessionRow.count });

  const csrfRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_api_compatibility_profiles
    WHERE csrf_compatibility_required = 1
  `).get();
  addValidation(report, "csrf_compatibility_validation", Number(csrfRow.count) >= 2, { profilesRequiringCsrfCompatibility: csrfRow.count });

  const dashboardCompatibility = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_api_compatibility_profiles
    WHERE dashboard_compatibility_required = 1
  `).get();
  addValidation(report, "dashboard_compatibility_validation", Number(dashboardCompatibility.count) >= 1, { profilesRequiringDashboardCompatibility: dashboardCompatibility.count });

  const websiteCompatibility = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_api_compatibility_profiles
    WHERE website_compatibility_required = 1
  `).get();
  addValidation(report, "website_compatibility_validation", Number(websiteCompatibility.count) >= 2, { profilesRequiringWebsiteCompatibility: websiteCompatibility.count });

  const machineIdentityRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_machine_identities
    WHERE machine_identity_uuid IS NOT NULL
      AND machine_identity_status IS NOT NULL
      AND machine_identity_rotation_policy IS NOT NULL
  `).get();
  addValidation(report, "machine_identity_validation", Number(machineIdentityRow.count) >= 3, { governedMachineIdentities: machineIdentityRow.count });

  const machineIdentityLinkage = dbConn.prepare(`
    SELECT COUNT(*) AS invalid
    FROM enterprise_machine_identities machine
    LEFT JOIN enterprise_identities identity
      ON identity.enterprise_identity_uuid = machine.enterprise_identity_uuid
     AND identity.identity_type = 'Machine'
    WHERE machine.enterprise_identity_uuid IS NULL
       OR identity.enterprise_identity_uuid IS NULL
  `).get();
  addValidation(report, "machine_identity_linkage_validation", Number(machineIdentityLinkage.invalid) === 0, {
    invalidMachineIdentityLinks: machineIdentityLinkage.invalid
  });

  const apiConsumerLinkage = dbConn.prepare(`
    SELECT COUNT(*) AS invalid
    FROM enterprise_api_consumers consumer
    LEFT JOIN enterprise_identities identity
      ON identity.enterprise_identity_uuid = consumer.enterprise_identity_uuid
     AND identity.identity_type = 'API Consumer'
    WHERE consumer.enterprise_identity_uuid IS NULL
       OR identity.enterprise_identity_uuid IS NULL
  `).get();
  addValidation(report, "api_consumer_linkage_validation", Number(apiConsumerLinkage.invalid) === 0, {
    invalidApiConsumerLinks: apiConsumerLinkage.invalid
  });

  const apiKeyRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_api_keys
    WHERE api_key_storage_policy = 'backend_only'
      AND api_key_uuid IS NOT NULL
  `).get();
  addValidation(report, "api_key_validation", Number(apiKeyRow.count) >= 3, { governedApiKeys: apiKeyRow.count });

  const webhookRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_webhooks
    WHERE webhook_signature_policy IS NOT NULL
      AND webhook_verification_policy IS NOT NULL
  `).get();
  addValidation(report, "webhook_governance_validation", Number(webhookRow.count) >= 2, { governedWebhooks: webhookRow.count });

  const credentialRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_credentials
    WHERE storage_policy = 'backend_secret_store'
      AND credential_uuid IS NOT NULL
  `).get();
  addValidation(report, "credential_governance_validation", Number(credentialRow.count) >= 4, { governedCredentials: credentialRow.count });

  const privacyRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_privacy_classes
    WHERE privacy_key = 'customer_safe' OR customer_safe_projection_required = 1
  `).get();
  addValidation(report, "privacy_validation", Number(privacyRow.count) >= 2, { customerSafePrivacyClasses: privacyRow.count });

  const consentRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_consent_policies
    WHERE consent_version IS NOT NULL
      AND privacy_classification IS NOT NULL
  `).get();
  addValidation(report, "consent_validation", Number(consentRow.count) >= 3, { governedConsentPolicies: consentRow.count });

  const zeroTrustRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_zero_trust_policies
    WHERE trust_boundary IS NOT NULL
      AND continuous_verification_policy IS NOT NULL
  `).get();
  addValidation(report, "zero_trust_validation", Number(zeroTrustRow.count) >= 4, { governedZeroTrustPolicies: zeroTrustRow.count });

  const federationRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_federation_mappings
    WHERE federation_provider IS NOT NULL
      AND federation_mapping_policy IS NOT NULL
  `).get();
  addValidation(report, "federation_validation", Number(federationRow.count) >= 2, { governedFederationMappings: federationRow.count });

  const serviceDiscoveryRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_service_discovery
    WHERE service_endpoint IS NOT NULL
      AND registration_policy IS NOT NULL
  `).get();
  addValidation(report, "service_discovery_validation", Number(serviceDiscoveryRow.count) >= 4, { governedServiceDiscoveryProfiles: serviceDiscoveryRow.count });

  const serviceDependencyIntegrity = dbConn.prepare(`
    SELECT COUNT(*) AS invalid
    FROM enterprise_service_dependencies dependency
    LEFT JOIN enterprise_service_contracts source ON source.service_key = dependency.source_service_key
    LEFT JOIN enterprise_service_contracts target ON target.service_key = dependency.target_service_key
    WHERE source.service_key IS NULL OR target.service_key IS NULL
  `).get();
  addValidation(report, "service_dependency_integrity_validation", Number(serviceDependencyIntegrity.invalid) === 0, {
    invalidServiceDependencies: serviceDependencyIntegrity.invalid
  });

  const slaRow = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_service_sla_policies
    WHERE availability_target IS NOT NULL
      AND recovery_target IS NOT NULL
  `).get();
  addValidation(report, "sla_governance_validation", Number(slaRow.count) >= 4, { governedSlaPolicies: slaRow.count });

  const policyConsistency = dbConn.prepare(`
    SELECT COUNT(*) AS invalid
    FROM enterprise_policy_dependencies dependency
    LEFT JOIN enterprise_policy_registry source ON source.policy_uuid = dependency.source_policy_uuid
    LEFT JOIN enterprise_policy_registry target ON target.policy_uuid = dependency.target_policy_uuid
    WHERE source.policy_uuid IS NULL OR target.policy_uuid IS NULL
  `).get();
  addValidation(report, "cross_domain_policy_consistency_validation", Number(policyConsistency.invalid) === 0, { invalidDependencies: policyConsistency.invalid });

  const persistenceDomains = dbConn.prepare(`
    SELECT domain_key, store_key, repository_boundary_key, adapter_boundary_key
    FROM enterprise_persistence_domains
    WHERE domain_key IN (
      'enterprise_api_governance',
      'enterprise_identity_governance',
      'enterprise_permission_governance',
      'enterprise_service_governance',
      'enterprise_security_governance',
      'enterprise_policy_governance'
    )
  `).all();
  addValidation(report, "source_of_truth_boundary_validation", (
    persistenceDomains.length === 6
    && persistenceDomains.every((row) => row.store_key === "registry_store"
      && row.repository_boundary_key === "registry_repository_boundary"
      && row.adapter_boundary_key === "sqlite_primary_adapter")
  ), persistenceDomains);

  const dashboardDependency = dbConn.prepare(`
    SELECT dependency_type
    FROM enterprise_persistence_domain_dependencies
    WHERE source_domain_key = 'dashboard_registry' AND target_domain_key = 'enterprise_api_governance'
  `).get();
  addValidation(report, "dashboard_consumer_boundary_validation", Boolean(
    dashboardDependency && dashboardDependency.dependency_type === "governed_api_consumer_reference"
  ), dashboardDependency || null);

  const governedReferences = {
    apiVersionContracts: dbConn.prepare(`
      SELECT COUNT(*) AS invalid
      FROM enterprise_api_versions version
      LEFT JOIN enterprise_response_contracts response ON response.contract_key = version.response_contract_key
      LEFT JOIN enterprise_error_contracts error ON error.contract_key = version.error_contract_key
      WHERE response.contract_key IS NULL OR error.contract_key IS NULL
    `).get().invalid,
    apiCompatibilityConsumers: dbConn.prepare(`
      SELECT COUNT(*) AS invalid
      FROM enterprise_api_compatibility_profiles profile
      LEFT JOIN enterprise_api_consumers consumer ON consumer.consumer_key = profile.consumer_key
      WHERE profile.consumer_key IS NOT NULL AND consumer.consumer_key IS NULL
    `).get().invalid,
    federationIdentities: dbConn.prepare(`
      SELECT COUNT(*) AS invalid
      FROM enterprise_federation_mappings federation
      LEFT JOIN enterprise_identities identity ON identity.identity_key = federation.federation_identity_reference
      WHERE identity.identity_key IS NULL
    `).get().invalid
  };
  addValidation(report, "governed_relationship_integrity_validation", Object.values(governedReferences).every((value) => Number(value) === 0), governedReferences);

  const migrationRow = dbConn.prepare(`
    SELECT migration_status, target_schema_version_number, additive_only, rollback_required
    FROM enterprise_migration_registry
    WHERE migration_key = ?
  `).get(MIGRATION_KEY);
  addValidation(report, "migration_registry_validation", Boolean(
    migrationRow
      && migrationRow.migration_status === "applied"
      && Number(migrationRow.target_schema_version_number) === 13
      && Number(migrationRow.additive_only) === 1
      && Number(migrationRow.rollback_required) === 1
  ), migrationRow || null);

  const dependencyLineage = dbConn.prepare(`
    SELECT COUNT(*) AS invalid
    FROM enterprise_migration_dependencies dependency
    LEFT JOIN enterprise_migration_registry source ON source.migration_key = dependency.migration_key
    LEFT JOIN enterprise_migration_registry target ON target.migration_key = dependency.depends_on_migration_key
    WHERE source.migration_key IS NULL OR target.migration_key IS NULL
  `).get();
  addValidation(report, "migration_dependency_lineage_validation", Number(dependencyLineage.invalid) === 0, {
    invalidMigrationDependencies: dependencyLineage.invalid
  });

  if (options.migrationReportPath) {
    const migrationReport = readJsonIfExists(options.migrationReportPath);
    addValidation(report, "canonical_migration_evidence_validation", isSuccessfulMigrationReport(migrationReport), {
      reportPath: options.migrationReportPath,
      canonicalFailures: migrationReport?.totals?.failures ?? null,
      canonicalFinishedAt: migrationReport?.finishedAt || null
    });
  }

  const foreignKeyIssues = dbConn.prepare("PRAGMA foreign_key_check").all();
  addValidation(report, "backward_compatibility_validation", foreignKeyIssues.length === 0, { foreignKeyIssues });

  const uuidTables = [
    ["enterprise_api_versions", "api_version_uuid"],
    ["enterprise_response_contracts", "response_contract_uuid"],
    ["enterprise_error_contracts", "error_contract_uuid"],
    ["enterprise_api_contract_changes", "contract_change_uuid"],
    ["enterprise_api_compatibility_profiles", "api_compatibility_uuid"],
    ["enterprise_api_consumers", "api_consumer_uuid"],
    ["enterprise_api_rate_limit_policies", "rate_limit_policy_uuid"],
    ["enterprise_api_observability_profiles", "observability_uuid"],
    ["enterprise_identities", "enterprise_identity_uuid"],
    ["enterprise_identity_delegations", "delegation_uuid"],
    ["enterprise_identity_audit_profiles", "identity_audit_uuid"],
    ["enterprise_roles", "role_uuid"],
    ["enterprise_scopes", "scope_uuid"],
    ["enterprise_permissions", "permission_uuid"],
    ["enterprise_role_permissions", "role_permission_uuid"],
    ["enterprise_authorization_policies", "authorization_policy_uuid"],
    ["enterprise_service_contracts", "service_contract_uuid"],
    ["enterprise_service_ownership", "service_ownership_uuid"],
    ["enterprise_service_discovery", "service_discovery_uuid"],
    ["enterprise_service_sla_policies", "service_sla_uuid"],
    ["enterprise_service_dependencies", "service_dependency_uuid"],
    ["enterprise_machine_identities", "machine_identity_uuid"],
    ["enterprise_api_keys", "api_key_uuid"],
    ["enterprise_credentials", "credential_uuid"],
    ["enterprise_webhooks", "webhook_uuid"],
    ["enterprise_federation_mappings", "federation_uuid"],
    ["enterprise_consent_policies", "consent_policy_uuid"],
    ["enterprise_privacy_classes", "privacy_class_uuid"],
    ["enterprise_zero_trust_policies", "zero_trust_policy_uuid"],
    ["enterprise_policy_registry", "policy_uuid"],
    ["enterprise_policy_versions", "policy_version_uuid"],
    ["enterprise_policy_dependencies", "policy_dependency_uuid"]
  ];
  const uuidChecks = uuidTables.map(([table, column]) => ({ table, column, ...validateUuidTable(dbConn, table, column) }));
  addValidation(report, "uuid_preservation_validation", uuidChecks.every((row) => row.ok), uuidChecks);

  report.finishedAt = nowIso();
  writeJson(options.reportPath, report);
  return report;
}

module.exports = {
  MIGRATION_KEY,
  SCHEMA_KEY,
  createFailedMigrationReport,
  syncEnterpriseApiIdentityPermissionFoundation,
  validateEnterpriseApiIdentityPermissionFoundation,
  writeMigrationEvidence
};
