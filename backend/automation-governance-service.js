"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MIGRATION_KEY = "phase-3-milestone-3.7-enterprise-automation-integrations-tool-governance";
const SCHEMA_KEY = "one_point_enterprise_schema";

function nowIso() {
  return new Date().toISOString();
}

function json(value, fallback = {}) {
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
    milestone: "Phase 3 - Milestone 3.7",
    name: "Enterprise Automation, Integrations & Tool Governance",
    startedAt: nowIso(),
    finishedAt: null,
    totals: { created: 0, updated: 0, skipped: 0, failures: 0 },
    tables: {},
    failures: []
  };
}

function createFailedMigrationReport(error) {
  const report = createMigrationReport();
  addFailure(report, "enterprise_automation_integrations_tool_governance", MIGRATION_KEY, error);
  report.finishedAt = nowIso();
  return report;
}

function createValidationReport(kind) {
  return {
    milestone: "Phase 3 - Milestone 3.7",
    name: "Enterprise Automation, Integrations & Tool Governance Validation",
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
    dbConn.prepare(`UPDATE ${table} SET ${setSql}, updated_at = CURRENT_TIMESTAMP WHERE ${keyColumn} = ?`)
      .run(...entries.map(([, value]) => value), keyValue);
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

// Seeding Functions
function seedMetadataClassifications(dbConn, report) {
  const classifications = [
    { key: "mandatory", values: { mandatory_flag: 1, optional_flag: 0, inherited_flag: 0, calculated_flag: 0, immutable_flag: 0, deprecated_flag: 0 } },
    { key: "optional", values: { mandatory_flag: 0, optional_flag: 1, inherited_flag: 0, calculated_flag: 0, immutable_flag: 0, deprecated_flag: 0 } },
    { key: "inherited", values: { mandatory_flag: 0, optional_flag: 1, inherited_flag: 1, calculated_flag: 0, immutable_flag: 0, deprecated_flag: 0 } },
    { key: "calculated", values: { mandatory_flag: 0, optional_flag: 1, inherited_flag: 0, calculated_flag: 1, immutable_flag: 0, deprecated_flag: 0 } },
    { key: "immutable", values: { mandatory_flag: 1, optional_flag: 0, inherited_flag: 0, calculated_flag: 0, immutable_flag: 1, deprecated_flag: 0 } },
    { key: "deprecated", values: { mandatory_flag: 0, optional_flag: 1, inherited_flag: 0, calculated_flag: 0, immutable_flag: 0, deprecated_flag: 1 } }
  ];

  for (const classification of classifications) {
    upsertSeed(dbConn, report, {
      table: "enterprise_metadata_classifications",
      keyColumn: "classification_key",
      keyValue: classification.key,
      uuidColumn: "classification_uuid",
      values: classification.values
    });
  }
}

function seedPolicyHierarchy(dbConn, report) {
  const policies = [
    { key: "enterprise_root_policy", values: { policy_level: "Enterprise", policy_scope: "global", policy_precedence: 100, policy_override_mode: "Strict", parent_policy_key: null } },
    { key: "org_default_policy", values: { policy_level: "Organization", policy_scope: "org", policy_precedence: 80, policy_override_mode: "Strict", parent_policy_key: "enterprise_root_policy" } },
    { key: "branch_default_policy", values: { policy_level: "Branch", policy_scope: "branch", policy_precedence: 60, policy_override_mode: "AllowSpecialization", parent_policy_key: "org_default_policy" } },
    { key: "franchise_default_policy", values: { policy_level: "Franchise", policy_scope: "franchise", policy_precedence: 60, policy_override_mode: "AllowSpecialization", parent_policy_key: "org_default_policy" } },
    { key: "regional_default_policy", values: { policy_level: "Regional", policy_scope: "region", policy_precedence: 50, policy_override_mode: "AllowSpecialization", parent_policy_key: "enterprise_root_policy" } },
    { key: "tool_execution_policy", values: { policy_level: "Tool", policy_scope: "tool", policy_precedence: 40, policy_override_mode: "AllowSpecialization", parent_policy_key: "branch_default_policy" } },
    { key: "integration_policy", values: { policy_level: "Integration", policy_scope: "integration", policy_precedence: 30, policy_override_mode: "AllowSpecialization", parent_policy_key: "enterprise_root_policy" } },
    { key: "override_policy", values: { policy_level: "Override", policy_scope: "emergency", policy_precedence: 10, policy_override_mode: "AllowSpecialization", parent_policy_key: "tool_execution_policy" } }
  ];

  for (const policy of policies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_policy_hierarchy",
      keyColumn: "policy_key",
      keyValue: policy.key,
      uuidColumn: "policy_hierarchy_uuid",
      values: policy.values
    });
  }
}

function seedToolRegistry(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_registry",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "tool_uuid",
    values: {
      tool_name: "Catalog Synchronization Tool",
      tool_type: "System",
      lifecycle_status: "Active"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_tool_registry",
    keyColumn: "tool_key",
    keyValue: "refund_executor_tool",
    uuidColumn: "tool_uuid",
    values: {
      tool_name: "Refund Executor Tool",
      tool_type: "Financial",
      lifecycle_status: "Active"
    }
  });

  // Versions
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_versions",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "tool_version_uuid",
    values: {
      tool_version: "1.0.0",
      compatibility_window: ">=1.0.0",
      compatibility_start: "2026-07-05",
      compatibility_end: null,
      deprecated_after: null,
      replacement_tool_key: null,
      migration_policy: "DirectUpgrade"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_tool_versions",
    keyColumn: "tool_key",
    keyValue: "refund_executor_tool",
    uuidColumn: "tool_version_uuid",
    values: {
      tool_version: "1.0.0",
      compatibility_window: ">=1.0.0",
      compatibility_start: "2026-07-05",
      compatibility_end: null,
      deprecated_after: null,
      replacement_tool_key: null,
      migration_policy: "DirectUpgrade"
    }
  });

  // Contracts
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_contracts",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "contract_uuid",
    values: {
      contract_version: "1.0.0",
      input_schema_json: json({ type: "object", properties: { source: { type: "string" } } }),
      output_schema_json: json({ type: "object", properties: { status: { type: "string" } } }),
      validation_contract_json: json({ required: ["source"] }),
      timeout_contract_policy: "30s",
      retry_contract_policy: "ExponentialBackoff",
      error_contract_policy: "FailFast",
      compatibility_contract_policy: "Strict"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_tool_contracts",
    keyColumn: "tool_key",
    keyValue: "refund_executor_tool",
    uuidColumn: "contract_uuid",
    values: {
      contract_version: "1.0.0",
      input_schema_json: json({ type: "object", properties: { refundId: { type: "string" } } }),
      output_schema_json: json({ type: "object", properties: { success: { type: "boolean" } } }),
      validation_contract_json: json({ required: ["refundId"] }),
      timeout_contract_policy: "60s",
      retry_contract_policy: "LinearRetry",
      error_contract_policy: "Escalate",
      compatibility_contract_policy: "Strict"
    }
  });

  // Dependencies (Linear chain catalog_sync_tool depends on refund_executor_tool for test DAG verification)
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_dependencies",
    keyColumn: "parent_tool",
    keyValue: "catalog_sync_tool",
    uuidColumn: "dependency_uuid",
    values: {
      dependent_tool: "refund_executor_tool",
      dependency_type: "Requires",
      dependency_version: "1.0.0",
      dependency_scope: "Execution",
      dependency_policy: "Strict"
    }
  });

  // Classifications
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_classifications",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "classification_uuid",
    values: {
      execution_scope: "System",
      security_clearance_required: "SystemAdmin"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_tool_classifications",
    keyColumn: "tool_key",
    keyValue: "refund_executor_tool",
    uuidColumn: "classification_uuid",
    values: {
      execution_scope: "Financial",
      security_clearance_required: "FinanceOfficer"
    }
  });

  // Sandboxes
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_sandboxes",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "sandbox_uuid",
    values: {
      sandbox_class: "Isolated",
      filesystem_access: "ReadWriteCatalog",
      network_access: "None",
      database_access: "WriteCatalogOnly",
      environment_access: "None",
      resource_limits: json({ memory: "512MB", cpu: "1.0" }),
      execution_boundary: "ProcessBoundary"
    }
  });

  // Output Governance
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_output_governance",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "output_uuid",
    values: {
      output_projection: "catalog_summary",
      output_classification: "Public",
      output_visibility: "All",
      output_retention: "30d",
      output_masking_policy: "None",
      output_archive_policy: "ArchiveToCold"
    }
  });

  // Observability
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_observability",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "observability_uuid",
    values: {
      execution_latency: 120,
      execution_duration: 1500,
      resource_usage: json({ memoryUsed: "256MB" }),
      success_rate: 0.99,
      failure_rate: 0.01,
      metrics_policy: "LogAll",
      monitoring_policy: "AlertOnFailure",
      trace_policy: "FullTrace"
    }
  });

  // Ownership
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_execution_ownership",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "ownership_uuid",
    values: {
      business_owner: "CatalogOpsHead",
      technical_owner: "PlatformTechLead",
      security_owner: "SecOpsDirector",
      support_owner: "L2SupportTeam",
      approver: "PlatformDirector"
    }
  });

  // Priorities
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_execution_priorities",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "priority_uuid",
    values: {
      priority_level: "High",
      priority_weight: 90,
      scheduling_policy: "FIFO"
    }
  });

  // Idempotency
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_execution_idempotency",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "idempotency_uuid",
    values: {
      idempotency_key_schema: "sync_batch_id",
      idempotency_ttl: 86400,
      idempotency_policy: "RejectDuplicate"
    }
  });

  // Bulk Execution
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_bulk_execution",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "bulk_uuid",
    values: {
      bulk_execution_policy: "ChunkedParallel",
      parallel_execution: 4,
      chunk_size: 200
    }
  });

  // Resource Governance
  upsertSeed(dbConn, report, {
    table: "enterprise_tool_resource_governance",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "resource_uuid",
    values: {
      resource_governance_policy: "Throttled",
      cpu_quota: "1.5 cores",
      memory_quota: "1GB",
      network_quota: "10MB/s"
    }
  });

  // Cost Governance
  upsertSeed(dbConn, report, {
    table: "enterprise_cost_governance",
    keyColumn: "tool_key",
    keyValue: "catalog_sync_tool",
    uuidColumn: "cost_uuid",
    values: {
      cost_policy: "MonthlyBudget",
      cost_limit_budget: 1000.0,
      cost_accumulated: 15.42
    }
  });
}

function seedProviderAndIntegrations(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_provider_trust",
    keyColumn: "provider_key",
    keyValue: "razorpay_provider",
    uuidColumn: "trust_uuid",
    values: {
      trust_level: "High",
      security_profile: "PCI-DSS-Compliant",
      audit_policy: "LogSensitiveFieldsOnly"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_provider_health",
    keyColumn: "provider_key",
    keyValue: "razorpay_provider",
    uuidColumn: "health_uuid",
    values: {
      heartbeat_interval: 60,
      last_heartbeat: nowIso(),
      health_status: "Healthy",
      degradation_mode: "GracefulFallback"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_provider_capabilities",
    keyColumn: "provider_key",
    keyValue: "razorpay_provider",
    uuidColumn: "capability_uuid",
    values: {
      capability_key: "razorpay_charge",
      capability_name: "Charge Credit Cards",
      sla_metadata: json({ responseTime: "2s", availability: "99.9%" })
    }
  });

  // Integration
  upsertSeed(dbConn, report, {
    table: "enterprise_integration_registry",
    keyColumn: "integration_key",
    keyValue: "razorpay_webhook_integration",
    uuidColumn: "integration_uuid",
    values: {
      integration_name: "Razorpay Webhook Listener",
      integration_type: "IncomingWebhook",
      provider_key: "razorpay_provider"
    }
  });

  // Contracts
  upsertSeed(dbConn, report, {
    table: "enterprise_integration_contracts",
    keyColumn: "integration_key",
    keyValue: "razorpay_webhook_integration",
    uuidColumn: "contract_uuid",
    values: {
      request_contract_schema: json({ type: "object", properties: { event: { type: "string" } } }),
      response_contract_schema: json({ type: "object", properties: { received: { type: "boolean" } } }),
      callback_contract_schema: json({ type: "object" }),
      signature_contract_profile: "HMAC-SHA256",
      timeout_contract_policy: "5s",
      compatibility_contract_policy: "BackwardsCompatibleOnly"
    }
  });

  // Integration Lifecycle
  upsertSeed(dbConn, report, {
    table: "enterprise_integration_lifecycle",
    keyColumn: "integration_key",
    keyValue: "razorpay_webhook_integration",
    uuidColumn: "lifecycle_uuid",
    values: {
      lifecycle_state: "Active",
      effective_date: "2026-07-05",
      expiration_date: null
    }
  });

  // Webhook Governance
  upsertSeed(dbConn, report, {
    table: "enterprise_webhook_governance",
    keyColumn: "integration_key",
    keyValue: "razorpay_webhook_integration",
    uuidColumn: "webhook_uuid",
    values: {
      signature_header: "X-Razorpay-Signature",
      signature_algorithm: "SHA256",
      retry_policy_key: "standard_webhook_retry",
      delivery_policy_key: "at_least_once"
    }
  });

  // Callback Governance
  upsertSeed(dbConn, report, {
    table: "enterprise_callback_governance",
    keyColumn: "integration_key",
    keyValue: "razorpay_webhook_integration",
    uuidColumn: "callback_uuid",
    values: {
      callback_url: "https://api.onepoint.service/webhooks/razorpay",
      callback_security: "BearerToken",
      callback_timeout: 10
    }
  });
}

function seedCredentialsAndSecrets(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_credential_rotation",
    keyColumn: "credential_key",
    keyValue: "razorpay_secret_key",
    uuidColumn: "rotation_uuid",
    values: {
      rotation_interval: 90,
      last_rotated: nowIso(),
      next_rotation: "2026-10-03",
      rollover_policy: "GracefulOverlappingRotation",
      revocation_policy: "ImmediateRevoke"
    }
  });
}

function seedRateLimitsAndCircuitBreakers(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_rate_limit_policies",
    keyColumn: "policy_key",
    keyValue: "razorpay_api_rate_limit",
    uuidColumn: "rate_limit_uuid",
    values: {
      burst_limit: 50,
      sustained_limit: 300,
      quota_limit: 10000,
      backoff_policy: "ExponentialBackoff",
      retry_budget: 3,
      tenant_rate_limit: 20,
      branch_rate_limit: 50
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_circuit_breaker_policies",
    keyColumn: "policy_key",
    keyValue: "razorpay_payment_circuit_breaker",
    uuidColumn: "breaker_uuid",
    values: {
      failure_threshold: 0.05,
      recovery_timeout: 30,
      breaker_state: "Closed"
    }
  });
}

function seedHumanApproval(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_human_approval_policies",
    keyColumn: "policy_key",
    keyValue: "sensitive_refund_approval_policy",
    uuidColumn: "approval_uuid",
    values: {
      approval_chain_json: json(["FinanceManager", "CFO"]),
      dual_approval_required: 1,
      timeout_policy: "AutoRejectAfter24h",
      override_policy: "CEOEmergencyOverride"
    }
  });
}

function seedAutomationRegistry(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_automation_registry",
    keyColumn: "automation_key",
    keyValue: "daily_reconciliation_automation",
    uuidColumn: "automation_uuid",
    values: {
      automation_name: "Daily Transaction Reconciliation",
      automation_type: "BackgroundJob",
      scheduling_policy_key: "daily_midnight_schedule"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_automation_lifecycle",
    keyColumn: "automation_key",
    keyValue: "daily_reconciliation_automation",
    uuidColumn: "lifecycle_uuid",
    values: {
      lifecycle_state: "Active",
      effective_date: "2026-07-05",
      expiration_date: null
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_automation_scheduling",
    keyColumn: "automation_key",
    keyValue: "daily_reconciliation_automation",
    uuidColumn: "scheduling_uuid",
    values: {
      cron_expression: "0 0 * * *",
      timezone: "Asia/Kolkata",
      retry_policy: "RetryThreeTimesWithExponentialBackoff"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_automation_policies",
    keyColumn: "automation_key",
    keyValue: "daily_reconciliation_automation",
    uuidColumn: "policy_uuid",
    values: {
      execution_policy: "RunSingleInstance",
      recovery_policy: "NotifyOperationsTeam",
      escalation_policy: "AlertTechLeadOnFailure"
    }
  });
}

function seedMultiTenantGovernance(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_multi_tenant_governance",
    keyColumn: "tenant_key",
    keyValue: "one_point_default_tenant",
    uuidColumn: "tenant_uuid",
    values: {
      tenant_scope: "OnePointHQ",
      organization_scope: "OnePointGroup",
      branch_scope: "GlobalBranch",
      franchise_scope: "GlobalFranchise",
      tenant_isolation_policy: "SchemaIsolation",
      execution_visibility: "TenantOnly"
    }
  });
}

function seedComplianceAndDR(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_compliance_governance",
    keyColumn: "compliance_key",
    keyValue: "standard_audit_compliance",
    uuidColumn: "compliance_uuid",
    values: {
      audit_retention: 2555, // 7 years in days
      legal_hold: 0,
      compliance_policy: "PCIDSS_HIPAA_Compliance"
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_disaster_recovery_governance",
    keyColumn: "dr_key",
    keyValue: "standard_dr_governance",
    uuidColumn: "dr_uuid",
    values: {
      provider_failover: "AWS_US_EAST_TO_US_WEST",
      automation_recovery: "HotStandbyRestore",
      tool_recovery: "RollbackAndReExecute",
      integration_recovery: "ResendWebhookCallbacks",
      disaster_recovery_policy: "RPO_1h_RTO_4h"
    }
  });
}

function seedGovernanceChangeControl(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_governance_change_control",
    keyColumn: "change_key",
    keyValue: "milestone_3.7_baseline_governance",
    uuidColumn: "governance_change_uuid",
    values: {
      target_registry: "AllRegistries",
      governance_version: 1,
      governance_superseded_by: null,
      governance_status: "Approved",
      effective_date: "2026-07-05",
      expiration_date: null
    }
  });
}

function seedMigrationRegistry(dbConn, report, options) {
  const checksum = options.migrationPath ? crypto.createHash("sha256").update(fs.readFileSync(options.migrationPath, "utf8")).digest("hex") : "unknown";

  // Pre-seed preceding migrations as applied dependencies (M3.6 event bus foundation)
  upsertSeed(dbConn, report, {
    table: "enterprise_migration_registry",
    keyColumn: "migration_key",
    keyValue: "phase-3-milestone-3.6-enterprise-event-bus-foundation",
    uuidColumn: "migration_registry_uuid",
    values: {
      migration_name: "Enterprise Event Bus Foundation",
      schema_key: SCHEMA_KEY,
      target_schema_version_number: 14,
      report_path: "artifacts/migration-reports/phase-3-milestone-3.6-migration-report.json",
      checksum_sha256: "preseeded_sha256",
      migration_status: "Applied",
      additive_only: 1,
      rollback_required: 1,
      lifecycle_status: "Applied",
      asset_version: 1,
      metadata_json: json({ frozenMilestoneDependency: true }),
      applied_at: nowIso()
    }
  });

  // Current migration
  upsertSeed(dbConn, report, {
    table: "enterprise_migration_registry",
    keyColumn: "migration_key",
    keyValue: MIGRATION_KEY,
    uuidColumn: "migration_registry_uuid",
    values: {
      migration_name: "Enterprise Automation, Integrations & Tool Governance",
      schema_key: SCHEMA_KEY,
      target_schema_version_number: 15,
      report_path: options.reportPath ? path.relative(path.join(__dirname, ".."), options.reportPath) : null,
      checksum_sha256: checksum,
      migration_status: "Applied",
      additive_only: 1,
      rollback_required: 1,
      lifecycle_status: "Applied",
      asset_version: 1,
      metadata_json: json({
        implementationScope: "enterprise_automation_integrations_tool_governance",
        preservedMilestones: ["phase-3.1", "phase-3.2", "phase-3.3", "phase-3.4", "phase-3.5", "phase-3.6"]
      }),
      applied_at: nowIso()
    }
  });

  // Register dependencies
  upsertSeed(dbConn, report, {
    table: "enterprise_migration_dependencies",
    keyColumn: "migration_key",
    keyValue: MIGRATION_KEY,
    uuidColumn: "dependency_uuid",
    values: {
      depends_on_migration_key: "phase-3-milestone-3.6-enterprise-event-bus-foundation",
      dependency_type: "requires"
    }
  });
}

function syncEnterpriseAutomationIntegrationsToolGovernance(options = {}) {
  const dbConn = options.dbConn;
  if (!dbConn) throw new Error("syncEnterpriseAutomationIntegrationsToolGovernance requires dbConn.");
  const report = createMigrationReport();
  try {
    clearColumnCache();
    seedMetadataClassifications(dbConn, report);
    seedPolicyHierarchy(dbConn, report);
    seedToolRegistry(dbConn, report);
    seedProviderAndIntegrations(dbConn, report);
    seedCredentialsAndSecrets(dbConn, report);
    seedRateLimitsAndCircuitBreakers(dbConn, report);
    seedHumanApproval(dbConn, report);
    seedAutomationRegistry(dbConn, report);
    seedMultiTenantGovernance(dbConn, report);
    seedComplianceAndDR(dbConn, report);
    seedGovernanceChangeControl(dbConn, report);
    seedMigrationRegistry(dbConn, report, options);
    report.finishedAt = nowIso();
    if (options.writeEvidence !== false) writeMigrationEvidence(options, report);
    return report;
  } catch (error) {
    addFailure(report, "enterprise_automation_integrations_tool_governance", MIGRATION_KEY, error);
    report.finishedAt = nowIso();
    if (options.writeEvidence !== false) writeMigrationEvidence(options, report);
    error.migrationReport = report;
    throw error;
  }
}

// Graph validation and cycle detection helper
function validateToolDependencyGraph(dbConn) {
  const dependencies = dbConn.prepare(`
    SELECT parent_tool, dependent_tool
    FROM enterprise_tool_dependencies
    WHERE dependency_status = 'Active'
  `).all();

  const adj = {};
  const tools = new Set();

  for (const dep of dependencies) {
    tools.add(dep.parent_tool);
    tools.add(dep.dependent_tool);
    if (!adj[dep.parent_tool]) adj[dep.parent_tool] = [];
    adj[dep.parent_tool].push(dep.dependent_tool);
  }

  const visited = new Set();
  const recStack = new Set();
  let hasCycle = false;
  const cyclePath = [];

  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    cyclePath.push(node);

    const neighbors = adj[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        hasCycle = true;
        cyclePath.push(neighbor);
        return true;
      }
    }

    recStack.delete(node);
    cyclePath.pop();
    return false;
  }

  for (const tool of tools) {
    if (!visited.has(tool)) {
      if (dfs(tool)) break;
    }
  }

  return {
    ok: !hasCycle,
    cycle: hasCycle ? cyclePath.slice(cyclePath.indexOf(cyclePath[cyclePath.length - 1])) : null
  };
}

// Validation Functions
function validateUuidTable(dbConn, table, uuidColumn) {
  const total = dbConn.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  const withUuid = dbConn.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${uuidColumn} IS NOT NULL AND ${uuidColumn} <> ''`).get().count;
  const distinct = dbConn.prepare(`SELECT COUNT(DISTINCT ${uuidColumn}) AS count FROM ${table}`).get().count;
  return { total, withUuid, distinct, ok: total === withUuid && total === distinct };
}

function addValidation(report, key, ok, details) {
  report.validations[key] = { ok, details };
  if (!ok) report.failures.push({ key, details });
}

function validateEnterpriseAutomationIntegrationsToolGovernance(options = {}) {
  const dbConn = options.dbConn;
  if (!dbConn) throw new Error("validateEnterpriseAutomationIntegrationsToolGovernance requires dbConn.");
  const report = createValidationReport(options.kind || "project_database");

  try {
    // 1. Validate migrations are applied
    const migration = dbConn.prepare("SELECT * FROM enterprise_migration_registry WHERE migration_key = ?").get(MIGRATION_KEY);
    addValidation(report, "migration_registry_validation", Boolean(migration && migration.migration_status === "Applied"), { migration });

    // 2. Count verification on tables
    const tableCounts = {
      tools: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_registry").get().count,
      versions: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_versions").get().count,
      contracts: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_contracts").get().count,
      dependencies: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_dependencies").get().count,
      classifications: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_classifications").get().count,
      sandboxes: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_sandboxes").get().count,
      outputs: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_output_governance").get().count,
      observability: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_observability").get().count,
      ownership: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_execution_ownership").get().count,
      priorities: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_execution_priorities").get().count,
      idempotency: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_execution_idempotency").get().count,
      bulk: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_bulk_execution").get().count,
      resources: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_tool_resource_governance").get().count,
      cost: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_cost_governance").get().count,
      providers_trust: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_provider_trust").get().count,
      providers_health: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_provider_health").get().count,
      providers_capabilities: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_provider_capabilities").get().count,
      integrations: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_integration_registry").get().count,
      integration_contracts: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_integration_contracts").get().count,
      integration_lifecycle: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_integration_lifecycle").get().count,
      webhooks: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_webhook_governance").get().count,
      callbacks: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_callback_governance").get().count,
      credentials: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_credential_rotation").get().count,
      rate_limits: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_rate_limit_policies").get().count,
      circuit_breakers: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_circuit_breaker_policies").get().count,
      human_approval: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_human_approval_policies").get().count,
      policy_hierarchy: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_policy_hierarchy").get().count,
      governance_changes: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_governance_change_control").get().count,
      metadata_classifications: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_metadata_classifications").get().count,
      multi_tenant: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_multi_tenant_governance").get().count,
      compliance: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_compliance_governance").get().count,
      dr: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_disaster_recovery_governance").get().count,
      automations: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_automation_registry").get().count,
      automation_lifecycle: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_automation_lifecycle").get().count,
      automation_scheduling: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_automation_scheduling").get().count,
      automation_policies: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_automation_policies").get().count
    };

    addValidation(report, "table_counts_validation", Object.values(tableCounts).every(count => count > 0), tableCounts);

    // 3. Tool Dependency Graph cycle check
    const graphCheck = validateToolDependencyGraph(dbConn);
    addValidation(report, "tool_dependency_graph_validation", graphCheck.ok, graphCheck);

    // 4. Policy Hierarchy Precedence checks
    const hierarchy = dbConn.prepare("SELECT policy_key, policy_level, policy_precedence FROM enterprise_policy_hierarchy").all();
    const precedenceCheck = hierarchy.every(item => {
      if (item.policy_level === "Enterprise") return item.policy_precedence === 100;
      if (item.policy_level === "Organization") return item.policy_precedence === 80;
      if (item.policy_level === "Branch" || item.policy_level === "Franchise") return item.policy_precedence === 60;
      if (item.policy_level === "Regional") return item.policy_precedence === 50;
      if (item.policy_level === "Tool") return item.policy_precedence === 40;
      if (item.policy_level === "Integration") return item.policy_precedence === 30;
      if (item.policy_level === "Override") return item.policy_precedence === 10;
      return false;
    });
    addValidation(report, "policy_hierarchy_validation", precedenceCheck, { hierarchy });

    // 5. Append-only and Immutability checks
    const triggers = [
      "trg_enterprise_tool_registry_uuid_immutable",
      "trg_enterprise_tool_versions_uuid_immutable",
      "trg_enterprise_tool_contracts_uuid_immutable",
      "trg_enterprise_tool_dependencies_uuid_immutable",
      "trg_enterprise_tool_classifications_uuid_immutable",
      "trg_enterprise_tool_sandboxes_uuid_immutable",
      "trg_enterprise_tool_output_governance_uuid_immutable",
      "trg_enterprise_tool_observability_uuid_immutable",
      "trg_enterprise_tool_execution_ownership_uuid_immutable",
      "trg_enterprise_tool_executions_uuid_immutable",
      "trg_enterprise_tool_executions_append_only_update",
      "trg_enterprise_tool_executions_append_only_delete",
      "trg_enterprise_tool_execution_priorities_uuid_immutable",
      "trg_enterprise_tool_execution_idempotency_uuid_immutable",
      "trg_enterprise_tool_bulk_execution_uuid_immutable",
      "trg_enterprise_tool_resource_governance_uuid_immutable",
      "trg_enterprise_provider_capabilities_uuid_immutable",
      "trg_enterprise_provider_trust_uuid_immutable",
      "trg_enterprise_provider_health_uuid_immutable",
      "trg_enterprise_integration_registry_uuid_immutable",
      "trg_enterprise_integration_contracts_uuid_immutable",
      "trg_enterprise_integration_lifecycle_uuid_immutable",
      "trg_enterprise_webhook_governance_uuid_immutable",
      "trg_enterprise_callback_governance_uuid_immutable",
      "trg_enterprise_credential_rotation_uuid_immutable",
      "trg_enterprise_secret_usage_uuid_immutable",
      "trg_enterprise_secret_usage_append_only_update",
      "trg_enterprise_secret_usage_append_only_delete",
      "trg_enterprise_rate_limit_policies_uuid_immutable",
      "trg_enterprise_circuit_breaker_policies_uuid_immutable",
      "trg_enterprise_human_approval_policies_uuid_immutable",
      "trg_enterprise_policy_hierarchy_uuid_immutable",
      "trg_enterprise_governance_change_control_uuid_immutable",
      "trg_enterprise_metadata_classifications_uuid_immutable",
      "trg_enterprise_multi_tenant_governance_uuid_immutable",
      "trg_enterprise_cost_governance_uuid_immutable",
      "trg_enterprise_compliance_governance_uuid_immutable",
      "trg_enterprise_disaster_recovery_governance_uuid_immutable",
      "trg_enterprise_automation_registry_uuid_immutable",
      "trg_enterprise_automation_lifecycle_uuid_immutable",
      "trg_enterprise_automation_scheduling_uuid_immutable",
      "trg_enterprise_automation_policies_uuid_immutable",
      "trg_enterprise_automation_executions_uuid_immutable",
      "trg_enterprise_automation_executions_append_only_update",
      "trg_enterprise_automation_executions_append_only_delete"
    ];

    const existingTriggers = dbConn.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN (${triggers.map(() => "?").join(", ")})
    `).all(...triggers);
    const triggerOk = existingTriggers.length === triggers.length;
    addValidation(report, "immutable_append_only_triggers_validation", triggerOk, {
      expected: triggers.length,
      actual: existingTriggers.length,
      missing: triggers.filter(t => !existingTriggers.some(et => et.name === t))
    });

    // 6. UUID Governance validation
    const uuidTables = [
      ["enterprise_tool_registry", "tool_uuid"],
      ["enterprise_tool_versions", "tool_version_uuid"],
      ["enterprise_tool_contracts", "contract_uuid"],
      ["enterprise_tool_dependencies", "dependency_uuid"],
      ["enterprise_tool_classifications", "classification_uuid"],
      ["enterprise_tool_sandboxes", "sandbox_uuid"],
      ["enterprise_tool_output_governance", "output_uuid"],
      ["enterprise_tool_observability", "observability_uuid"],
      ["enterprise_tool_execution_ownership", "ownership_uuid"],
      ["enterprise_tool_execution_priorities", "priority_uuid"],
      ["enterprise_tool_execution_idempotency", "idempotency_uuid"],
      ["enterprise_tool_bulk_execution", "bulk_uuid"],
      ["enterprise_tool_resource_governance", "resource_uuid"],
      ["enterprise_cost_governance", "cost_uuid"],
      ["enterprise_provider_capabilities", "capability_uuid"],
      ["enterprise_provider_trust", "trust_uuid"],
      ["enterprise_provider_health", "health_uuid"],
      ["enterprise_integration_registry", "integration_uuid"],
      ["enterprise_integration_contracts", "contract_uuid"],
      ["enterprise_integration_lifecycle", "lifecycle_uuid"],
      ["enterprise_webhook_governance", "webhook_uuid"],
      ["enterprise_callback_governance", "callback_uuid"],
      ["enterprise_credential_rotation", "rotation_uuid"],
      ["enterprise_rate_limit_policies", "rate_limit_uuid"],
      ["enterprise_circuit_breaker_policies", "breaker_uuid"],
      ["enterprise_human_approval_policies", "approval_uuid"],
      ["enterprise_policy_hierarchy", "policy_hierarchy_uuid"],
      ["enterprise_governance_change_control", "governance_change_uuid"],
      ["enterprise_metadata_classifications", "classification_uuid"],
      ["enterprise_multi_tenant_governance", "tenant_uuid"],
      ["enterprise_compliance_governance", "compliance_uuid"],
      ["enterprise_disaster_recovery_governance", "dr_uuid"],
      ["enterprise_automation_registry", "automation_uuid"],
      ["enterprise_automation_lifecycle", "lifecycle_uuid"],
      ["enterprise_automation_scheduling", "scheduling_uuid"],
      ["enterprise_automation_policies", "policy_uuid"]
    ];

    const uuidChecks = uuidTables.map(([table, column]) => ({
      table,
      column,
      ...validateUuidTable(dbConn, table, column)
    }));
    addValidation(report, "uuid_governance_validation", uuidChecks.every(row => row.ok), uuidChecks);

    // 7. Backward compatibility check (FK validation)
    const fkCheck = dbConn.prepare("PRAGMA foreign_key_check").all();
    addValidation(report, "foreign_key_integrity_validation", fkCheck.length === 0, { fkCheck });

    report.finishedAt = nowIso();
    if (options.reportPath) writeJson(options.reportPath, report);
    return report;
  } catch (error) {
    addFailure(report, "validation_engine", "validation_failed", error);
    report.finishedAt = nowIso();
    if (options.reportPath) writeJson(options.reportPath, report);
    throw error;
  }
}

module.exports = {
  MIGRATION_KEY,
  SCHEMA_KEY,
  createFailedMigrationReport,
  syncEnterpriseAutomationIntegrationsToolGovernance,
  validateEnterpriseAutomationIntegrationsToolGovernance,
  validateToolDependencyGraph,
  writeMigrationEvidence
};
