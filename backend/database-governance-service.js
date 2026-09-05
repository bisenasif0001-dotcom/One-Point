"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MIGRATION_KEY = "phase-3-milestone-3.4-enterprise-database-evolution";
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

function hasInitialApplicationEvidence(report) {
  if (!report || typeof report !== "object") return false;
  const totals = report.totals || {};
  return Number(totals.created || 0) > 0 || Number(totals.updated || 0) > 0;
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
  if (!canonicalReport) {
    writeJson(canonicalPath, report);
    return;
  }

  if (hasInitialApplicationEvidence(canonicalReport)) {
    return;
  }

  const fallbackReport = readJsonIfExists(options.canonicalFallbackPath);
  if (hasInitialApplicationEvidence(fallbackReport)) {
    writeJson(canonicalPath, fallbackReport);
    return;
  }

  if (hasInitialApplicationEvidence(report)) {
    writeJson(canonicalPath, report);
  }
}

function createMigrationReport() {
  return {
    milestone: "Phase 3 - Milestone 3.4",
    name: "Enterprise Database Evolution",
    startedAt: nowIso(),
    finishedAt: null,
    totals: { created: 0, updated: 0, skipped: 0, failures: 0 },
    tables: {},
    failures: []
  };
}

function createValidationReport(kind) {
  return {
    milestone: "Phase 3 - Milestone 3.4",
    name: "Enterprise Database Evolution Validation",
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

function seedStoreClasses(dbConn, report) {
  const rows = [
    ["operational_store", "Operational Store", "authoritative", "read_write", { sourceOfTruth: true }],
    ["registry_store", "Registry Store", "authoritative", "read_write", { sourceOfTruth: true }],
    ["enterprise_intelligence_registry", "Enterprise Intelligence Registry", "authoritative", "read_write", { sourceOfTruth: true }],
    ["dashboard_registry", "Dashboard Registry", "authoritative", "read_write", { sourceOfTruth: true, dashboardMetadataOnly: true, consumerOfEnterpriseIntelligence: true, operationalTruth: false }],
    ["read_models", "Read Models", "derived", "read_only", { derivedOnly: true }],
    ["audit_store", "Audit Store", "append_only", "append_only", { appendOnly: true }],
    ["archive_store", "Archive Store", "historical", "read_only", { historicalOnly: true }],
    ["future_event_store", "Future Event Store", "append_only", "append_only", { reservedOnly: true }],
    ["future_ai_metadata", "Future AI Metadata", "governed_metadata", "read_write", { reservedOnly: true }]
  ];
  for (const [storeKey, storeName, authorityClass, writeMode, metadata] of rows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_store_classes",
      keyColumn: "store_key",
      keyValue: storeKey,
      uuidColumn: "store_class_uuid",
      values: {
        store_name: storeName,
        authority_class: authorityClass,
        write_mode: writeMode,
        lifecycle_status: metadata.derivedOnly ? "Derived" : metadata.historicalOnly ? "Historical" : metadata.reservedOnly ? "Reserved" : "Active",
        asset_version: 1,
        metadata_json: json(metadata, {})
      }
    });
  }
}

function seedSchemaVersion(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_schema_versions",
    keyColumn: "schema_key",
    keyValue: SCHEMA_KEY,
    uuidColumn: "schema_version_uuid",
    values: {
      schema_version_number: 12,
      compatibility_version: "phase-3-milestone-3.4",
      lifecycle_status: "Approved",
      asset_version: 1,
      metadata_json: json({
        implementationScope: "additive_only",
        preservedMilestones: ["phase-2.1", "phase-2.2", "phase-2.3", "phase-2.4", "phase-2.5", "phase-2.6", "phase-2.7", "phase-3.2", "phase-3.3"]
      }, {})
    }
  });
}

function seedCompatibilityRegistry(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_compatibility_registry",
    keyColumn: "registry_key",
    keyValue: "phase-3-milestone-3.4-baseline",
    uuidColumn: "compatibility_registry_uuid",
    values: {
      schema_key: SCHEMA_KEY,
      minimum_schema_version_number: 1,
      current_schema_version_number: 12,
      backward_compatible: 1,
      api_compatibility_required: 1,
      dashboard_compatibility_required: 1,
      website_compatibility_required: 1,
      authentication_compatibility_required: 1,
      lifecycle_status: "Approved",
      asset_version: 1,
      metadata_json: json({
        customerWorkflowCompatibilityRequired: true,
        adminWorkflowCompatibilityRequired: true,
        dashboardConsumerBoundaryPreserved: true,
        enterpriseIntelligenceBoundaryPreserved: true
      }, {})
    }
  });
}

function seedTransactionPolicies(dbConn, report) {
  const rows = [
    ["operational_write_policy", "operational", "single_domain_or_order_payment", "strong", "immediate", "rollback_on_failure"],
    ["registry_write_policy", "governed_registry", "cross_domain_governed", "strong", "immediate", "rollback_on_failure"],
    ["read_model_projection_policy", "read_model", "derived_projection", "eventual", "deferred", "rebuild_from_source"],
    ["archive_append_policy", "archive", "append_and_retention", "durable", "deferred", "restore_from_backup"]
  ];
  for (const [policyKey, scope, boundary, consistencyClass, isolationClass, recoveryPolicy] of rows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_transaction_policies",
      keyColumn: "policy_key",
      keyValue: policyKey,
      uuidColumn: "transaction_policy_uuid",
      values: {
        transaction_scope: scope,
        transaction_boundary: boundary,
        transaction_consistency_class: consistencyClass,
        transaction_isolation_class: isolationClass,
        transaction_recovery_policy: recoveryPolicy,
        lifecycle_status: policyKey === "archive_append_policy" ? "Reserved" : "Approved",
        asset_version: 1,
        metadata_json: json({ runtimeEngineEnabled: false }, {})
      }
    });
  }
}

function seedIntegrityPolicies(dbConn, report) {
  const rows = [
    ["uuid_reference_policy", "immutable_uuid_required", "governed_uuid_only", "forbidden_without_policy", "forbidden", "foreign_keys_and_manual_checks"],
    ["registry_foreign_key_policy", "registry_foreign_keys", "registry_to_operational_governed", "metadata_only", "forbidden", "foreign_keys_and_manual_checks"],
    ["read_model_link_policy", "derived_links_only", "read_model_to_source_reference", "rebuild_only", "allowed_if_derived", "source_rebuild_validation"],
    ["archive_history_policy", "historical_reference_integrity", "archive_to_source_reference", "forbidden", "forbidden", "archive_retention_validation"]
  ];
  for (const [policyKey, relationshipIntegrity, crossDomainReferencePolicy, cascadePolicy, orphanPolicy, validationPolicy] of rows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_integrity_policies",
      keyColumn: "policy_key",
      keyValue: policyKey,
      uuidColumn: "integrity_policy_uuid",
      values: {
        relationship_integrity: relationshipIntegrity,
        cross_domain_reference_policy: crossDomainReferencePolicy,
        cascade_policy: cascadePolicy,
        orphan_policy: orphanPolicy,
        consistency_validation_policy: validationPolicy,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({ uuidGovernancePreserved: true }, {})
      }
    });
  }
}

function seedPartitionPolicies(dbConn, report) {
  const rows = [
    ["single_node_baseline", "single_node_sqlite", "global", "future_branch_split", "future_franchise_split", "future_regional_split", "future_archive_split", "single_tenant", "primary_sqlite_with_governed_future_adapters"],
    ["branch_franchise_future", "future_partition", "branch_and_franchise", "branch_ready", "franchise_ready", "regional_ready", "archive_ready", "single_tenant", "governed_distribution_required"],
    ["archive_future", "archive_partition_only", "archive", "not_applicable", "not_applicable", "regional_ready", "archive_ready", "single_tenant", "historical_storage_extension"]
  ];
  for (const [policyKey, strategy, scope, branchPartition, franchisePartition, regionalPartition, archivePartition, tenantScope, distributionPolicy] of rows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_partition_policies",
      keyColumn: "policy_key",
      keyValue: policyKey,
      uuidColumn: "partition_policy_uuid",
      values: {
        partition_strategy: strategy,
        partition_scope: scope,
        branch_partition: branchPartition,
        franchise_partition: franchisePartition,
        regional_partition: regionalPartition,
        archive_partition: archivePartition,
        tenant_scope: tenantScope,
        storage_distribution_policy: distributionPolicy,
        lifecycle_status: policyKey === "single_node_baseline" ? "Active" : "Reserved",
        asset_version: 1,
        metadata_json: json({ partitioningImplemented: false }, {})
      }
    });
  }
}

function seedBoundaries(dbConn, report) {
  const repositoryBoundaries = [
    ["operational_repository_boundary", "Operational Repository Boundary", "reserved_only", "operational_authoritative_writes", "operational_and_registry_reads"],
    ["registry_repository_boundary", "Governed Registry Boundary", "reserved_only", "governed_registry_writes", "governed_registry_and_consumer_reads"],
    ["read_model_repository_boundary", "Read Model Repository Boundary", "reserved_only", "projection_only", "consumer_reads_only"]
  ];
  for (const [boundaryKey, boundaryName, dependencyStatus, writeScope, readScope] of repositoryBoundaries) {
    upsertSeed(dbConn, report, {
      table: "enterprise_repository_boundaries",
      keyColumn: "boundary_key",
      keyValue: boundaryKey,
      uuidColumn: "repository_boundary_uuid",
      values: {
        boundary_name: boundaryName,
        dependency_status: dependencyStatus,
        write_scope: writeScope,
        read_scope: readScope,
        lifecycle_status: dependencyStatus === "reserved_only" ? "Reserved" : "Active",
        asset_version: 1,
        metadata_json: json({ implemented: false }, {})
      }
    });
  }

  const adapterBoundaries = [
    ["sqlite_primary_adapter", "SQLite Primary Adapter", "active_baseline", "project_database_primary"],
    ["future_storage_adapter", "Future Storage Adapter Boundary", "reserved_only", "future_storage_extension_only"]
  ];
  for (const [boundaryKey, boundaryName, dependencyStatus, adapterScope] of adapterBoundaries) {
    upsertSeed(dbConn, report, {
      table: "enterprise_adapter_boundaries",
      keyColumn: "boundary_key",
      keyValue: boundaryKey,
      uuidColumn: "adapter_boundary_uuid",
      values: {
        boundary_name: boundaryName,
        dependency_status: dependencyStatus,
        adapter_scope: adapterScope,
        lifecycle_status: dependencyStatus === "reserved_only" ? "Reserved" : "Active",
        asset_version: 1,
        metadata_json: json({ implemented: boundaryKey === "sqlite_primary_adapter" }, {})
      }
    });
  }
}

function seedPersistenceDomains(dbConn, report) {
  const rows = [
    ["operational_customers", "Operational Customers", "operational_store", "customer_success", "customer_success", "governed_business_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "operational_write_policy", "uuid_reference_policy", "single_node_baseline", "operational_repository_boundary", "sqlite_primary_adapter", { primaryTables: ["users", "auth_sessions", "auth_otps"] }],
    ["operational_orders_payments", "Operational Orders And Payments", "operational_store", "operations", "finance", "governed_business_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "operational_write_policy", "uuid_reference_policy", "single_node_baseline", "operational_repository_boundary", "sqlite_primary_adapter", { primaryTables: ["orders", "order_items", "payments", "payment_logs", "webhook_logs"] }],
    ["operational_catalog", "Operational Catalog", "operational_store", "operations", "operations", "governed_business_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "operational_write_policy", "uuid_reference_policy", "single_node_baseline", "operational_repository_boundary", "sqlite_primary_adapter", { primaryTables: ["products", "services", "service_pricing_variants"] }],
    ["universal_business_objects", "Universal Business Objects", "registry_store", "operations", "enterprise_platform", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "single_node_baseline", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "governed_registry" }],
    ["customer_genome", "Customer Digital Genome", "registry_store", "customer_success", "customer_success", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "single_node_baseline", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "customer_genome_registry" }],
    ["service_dna", "Service DNA", "registry_store", "operations", "operations", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "single_node_baseline", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "service_dna_registry" }],
    ["order_orchestration", "Order Orchestration", "registry_store", "operations", "operations", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "single_node_baseline", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "workflow_registry" }],
    ["document_registry", "Document Registry", "registry_store", "customer_success", "operations", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "single_node_baseline", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "document_registry" }],
    ["omnichannel_foundation", "Omnichannel Foundation", "registry_store", "customer_success", "customer_success", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "single_node_baseline", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "conversation_registry" }],
    ["workforce_governance", "Workforce Governance", "registry_store", "operations", "operations", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "branch_franchise_future", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "workforce_registry" }],
    ["enterprise_intelligence", "Enterprise Intelligence", "enterprise_intelligence_registry", "knowledge", "knowledge", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "archive_future", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "enterprise_intelligence_registry" }],
    ["dashboard_registry", "Dashboard Registry", "dashboard_registry", "operations", "enterprise_platform", "governed_registry_domain", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "registry_write_policy", "registry_foreign_key_policy", "single_node_baseline", "registry_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "dashboard_registry", consumerOf: ["enterprise_intelligence"], operationalTruth: false, dashboardMetadataOnly: true }],
    ["executive_snapshots", "Executive Snapshots", "read_models", "executive", "executive", "governed_read_model", "owner_approved_only", "per_release_review", "active", "archived", "retained", "deprecated", "policy_governed", "not_on_hold", "read_model_projection_policy", "read_model_link_policy", "archive_future", "read_model_repository_boundary", "sqlite_primary_adapter", { sourceOfTruth: "derived_executive_read_models" }]
  ];

  for (const row of rows) {
    const [
      domainKey,
      domainName,
      storeKey,
      dataOwner,
      domainOwner,
      stewardshipClass,
      transferPolicy,
      reviewPolicy,
      activeState,
      archivedState,
      retainedState,
      deprecatedState,
      purgeEligibility,
      legalHoldStatus,
      transactionPolicyKey,
      integrityPolicyKey,
      partitionPolicyKey,
      repositoryBoundaryKey,
      adapterBoundaryKey,
      metadata
    ] = row;
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
        active_state: activeState,
        archived_state: archivedState,
        retained_state: retainedState,
        deprecated_state: deprecatedState,
        purge_eligibility: purgeEligibility,
        legal_hold_status: legalHoldStatus,
        transaction_policy_key: transactionPolicyKey,
        integrity_policy_key: integrityPolicyKey,
        partition_policy_key: partitionPolicyKey,
        repository_boundary_key: repositoryBoundaryKey,
        adapter_boundary_key: adapterBoundaryKey,
        lifecycle_independent_from_business: 1,
        asset_version: 1,
        lifecycle_status: "Active",
        metadata_json: json(metadata, {})
      }
    });
  }
}

function seedDomainDependencies(dbConn, report) {
  const rows = [
    ["operational_orders_payments", "operational_customers", "customer_reference"],
    ["operational_orders_payments", "operational_catalog", "catalog_reference"],
    ["universal_business_objects", "operational_customers", "registration_source"],
    ["universal_business_objects", "operational_orders_payments", "registration_source"],
    ["universal_business_objects", "operational_catalog", "registration_source"],
    ["customer_genome", "universal_business_objects", "governed_identity"],
    ["service_dna", "universal_business_objects", "governed_identity"],
    ["order_orchestration", "universal_business_objects", "governed_identity"],
    ["document_registry", "universal_business_objects", "governed_identity"],
    ["document_registry", "order_orchestration", "workflow_reference"],
    ["omnichannel_foundation", "universal_business_objects", "governed_identity"],
    ["omnichannel_foundation", "customer_genome", "customer_reference"],
    ["workforce_governance", "universal_business_objects", "governed_identity"],
    ["enterprise_intelligence", "customer_genome", "approved_reasoning_source"],
    ["enterprise_intelligence", "service_dna", "approved_reasoning_source"],
    ["enterprise_intelligence", "order_orchestration", "approved_reasoning_source"],
    ["enterprise_intelligence", "document_registry", "approved_reasoning_source"],
    ["enterprise_intelligence", "omnichannel_foundation", "approved_reasoning_source"],
    ["enterprise_intelligence", "workforce_governance", "approved_reasoning_source"],
    ["dashboard_registry", "enterprise_intelligence", "governed_consumer_reference"],
    ["executive_snapshots", "operational_orders_payments", "derived_read_model"],
    ["executive_snapshots", "workforce_governance", "derived_read_model"]
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
        lifecycle_status: "Active",
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

  upsertSeed(dbConn, report, {
    table: "enterprise_migration_registry",
    keyColumn: "migration_key",
    keyValue: MIGRATION_KEY,
    uuidColumn: "migration_registry_uuid",
    values: {
      migration_name: "Enterprise Database Evolution",
      schema_key: SCHEMA_KEY,
      target_schema_version_number: 12,
      report_path: options.reportPath,
      checksum_sha256: checksum,
      migration_status: "applied",
      additive_only: 1,
      rollback_required: 1,
      lifecycle_status: "Applied",
      asset_version: 1,
      metadata_json: json({
        milestone: "Phase 3 - Milestone 3.4",
        implementationScope: "database_governance_only",
        repositoryImplemented: false
      }, {}),
      applied_at: nowIso()
    }
  });

  const dependencies = [
    "phase-2-milestone-2.1-universal-business-object-and-domain-foundation",
    "phase-2-milestone-2.2-customer-digital-genome-baseline",
    "phase-2-milestone-2.3-universal-service-engine-baseline",
    "phase-2-milestone-2.4-order-orchestration-baseline",
    "phase-2-milestone-2.5-document-intelligence-foundation",
    "phase-2-milestone-2.6-customer-experience-and-omnichannel-foundation",
    "phase-2-milestone-2.7-workforce-branch-franchise-executive",
    "phase-3-milestone-3.2-enterprise-intelligence-core"
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
        metadata_json: json({}, {})
      }
    });
  }
}

function syncEnterpriseDatabaseEvolution(options = {}) {
  const dbConn = options.dbConn;
  if (!dbConn) throw new Error("syncEnterpriseDatabaseEvolution requires dbConn.");
  const report = createMigrationReport();
  try {
    seedStoreClasses(dbConn, report);
    seedSchemaVersion(dbConn, report);
    seedCompatibilityRegistry(dbConn, report);
    seedTransactionPolicies(dbConn, report);
    seedIntegrityPolicies(dbConn, report);
    seedPartitionPolicies(dbConn, report);
    seedBoundaries(dbConn, report);
    seedPersistenceDomains(dbConn, report);
    seedDomainDependencies(dbConn, report);
    seedMigrationRegistry(dbConn, report, options);
    report.finishedAt = nowIso();
    writeMigrationEvidence(options, report);
    return report;
  } catch (error) {
    addFailure(report, "enterprise_database_evolution", MIGRATION_KEY, error);
    report.finishedAt = nowIso();
    writeMigrationEvidence(options, report);
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

function validateEnterpriseDatabaseEvolution(options = {}) {
  const dbConn = options.dbConn;
  if (!dbConn) throw new Error("validateEnterpriseDatabaseEvolution requires dbConn.");
  const report = createValidationReport(options.kind || "project_database");

  const ownershipRow = dbConn.prepare(`
    SELECT COUNT(*) AS missing
    FROM enterprise_persistence_domains
    WHERE data_owner IS NULL OR TRIM(data_owner) = ''
       OR domain_owner IS NULL OR TRIM(domain_owner) = ''
       OR ownership_transfer_policy IS NULL OR TRIM(ownership_transfer_policy) = ''
       OR ownership_review_policy IS NULL OR TRIM(ownership_review_policy) = ''
  `).get();
  addValidation(report, "ownership_consistency", ownershipRow.missing === 0, { missingDomains: ownershipRow.missing });

  const lifecycleRow = dbConn.prepare(`
    SELECT COUNT(*) AS invalid
    FROM enterprise_persistence_domains
    WHERE lifecycle_independent_from_business <> 1
       OR active_state IS NULL OR archived_state IS NULL OR retained_state IS NULL
       OR deprecated_state IS NULL OR purge_eligibility IS NULL OR legal_hold_status IS NULL
  `).get();
  addValidation(report, "lifecycle_validation", lifecycleRow.invalid === 0, { invalidDomains: lifecycleRow.invalid });

  const lifecycleTables = [
    "enterprise_store_classes",
    "enterprise_schema_versions",
    "enterprise_compatibility_registry",
    "enterprise_transaction_policies",
    "enterprise_integrity_policies",
    "enterprise_partition_policies",
    "enterprise_repository_boundaries",
    "enterprise_adapter_boundaries",
    "enterprise_persistence_domains",
    "enterprise_persistence_domain_dependencies",
    "enterprise_migration_registry",
    "enterprise_migration_dependencies"
  ];
  const lifecycleChecks = lifecycleTables.map((table) => {
    const row = dbConn.prepare(`
      SELECT COUNT(*) AS missing
      FROM ${table}
      WHERE lifecycle_status IS NULL OR TRIM(lifecycle_status) = ''
    `).get();
    return { table, missing: row.missing, ok: row.missing === 0 };
  });
  addValidation(report, "lifecycle_metadata_validation", lifecycleChecks.every((row) => row.ok), lifecycleChecks);

  const versioningChecks = lifecycleTables.map((table) => {
    const row = dbConn.prepare(`
      SELECT COUNT(*) AS invalid
      FROM ${table}
      WHERE asset_version IS NULL OR asset_version < 1
    `).get();
    return { table, invalid: row.invalid, ok: row.invalid === 0 };
  });
  addValidation(report, "versioning_validation", versioningChecks.every((row) => row.ok), versioningChecks);

  const archiveStore = dbConn.prepare("SELECT authority_class, write_mode FROM enterprise_store_classes WHERE store_key = 'archive_store'").get();
  const eventStore = dbConn.prepare("SELECT authority_class, write_mode FROM enterprise_store_classes WHERE store_key = 'future_event_store'").get();
  addValidation(report, "archive_validation", Boolean(
    archiveStore && archiveStore.authority_class === "historical" && archiveStore.write_mode === "read_only"
      && eventStore && eventStore.authority_class === "append_only" && eventStore.write_mode === "append_only"
  ), { archiveStore, eventStore });

  const partitionRow = dbConn.prepare(`
    SELECT COUNT(*) AS missing
    FROM enterprise_persistence_domains
    WHERE partition_policy_key IS NULL OR TRIM(partition_policy_key) = ''
  `).get();
  addValidation(report, "partition_compatibility_validation", partitionRow.missing === 0, { missingDomains: partitionRow.missing });

  const transactionRow = dbConn.prepare(`
    SELECT COUNT(*) AS missing
    FROM enterprise_persistence_domains
    WHERE transaction_policy_key IS NULL OR TRIM(transaction_policy_key) = ''
  `).get();
  addValidation(report, "transaction_integrity_validation", transactionRow.missing === 0, { missingDomains: transactionRow.missing });

  const integrityRow = dbConn.prepare(`
    SELECT COUNT(*) AS missing
    FROM enterprise_persistence_domains
    WHERE integrity_policy_key IS NULL OR TRIM(integrity_policy_key) = ''
  `).get();
  const foreignKeyIssues = dbConn.prepare("PRAGMA foreign_key_check").all();
  addValidation(report, "referential_integrity_validation", integrityRow.missing === 0 && foreignKeyIssues.length === 0, {
    missingDomains: integrityRow.missing,
    foreignKeyIssues
  });

  const dependencyRow = dbConn.prepare(`
    SELECT COUNT(*) AS missing
    FROM enterprise_persistence_domain_dependencies dependency
    LEFT JOIN enterprise_persistence_domains source ON source.domain_key = dependency.source_domain_key
    LEFT JOIN enterprise_persistence_domains target ON target.domain_key = dependency.target_domain_key
    WHERE source.domain_key IS NULL OR target.domain_key IS NULL
  `).get();
  addValidation(report, "cross_domain_consistency_validation", dependencyRow.missing === 0, { invalidDependencies: dependencyRow.missing });

  const migrationRow = dbConn.prepare(`
    SELECT migration_status, target_schema_version_number, additive_only, rollback_required
    FROM enterprise_migration_registry
    WHERE migration_key = ?
  `).get(MIGRATION_KEY);
  addValidation(report, "migration_registry_validation", Boolean(
    migrationRow
      && migrationRow.migration_status === "applied"
      && Number(migrationRow.target_schema_version_number) === 12
      && Number(migrationRow.additive_only) === 1
      && Number(migrationRow.rollback_required) === 1
  ), migrationRow || null);

  const compatibilityRow = dbConn.prepare(`
    SELECT backward_compatible, api_compatibility_required, dashboard_compatibility_required,
           website_compatibility_required, authentication_compatibility_required
    FROM enterprise_compatibility_registry
    WHERE registry_key = 'phase-3-milestone-3.4-baseline'
  `).get();
  addValidation(report, "compatibility_registry_validation", Boolean(
    compatibilityRow
      && Number(compatibilityRow.backward_compatible) === 1
      && Number(compatibilityRow.api_compatibility_required) === 1
      && Number(compatibilityRow.dashboard_compatibility_required) === 1
      && Number(compatibilityRow.website_compatibility_required) === 1
      && Number(compatibilityRow.authentication_compatibility_required) === 1
  ), compatibilityRow || null);

  const dashboardStore = dbConn.prepare(`
    SELECT authority_class, write_mode, lifecycle_status
    FROM enterprise_store_classes
    WHERE store_key = 'dashboard_registry'
  `).get();
  const dashboardDomain = dbConn.prepare(`
    SELECT store_key, transaction_policy_key, integrity_policy_key, repository_boundary_key, adapter_boundary_key
    FROM enterprise_persistence_domains
    WHERE domain_key = 'dashboard_registry'
  `).get();
  const dashboardDependency = dbConn.prepare(`
    SELECT dependency_type
    FROM enterprise_persistence_domain_dependencies
    WHERE source_domain_key = 'dashboard_registry' AND target_domain_key = 'enterprise_intelligence'
  `).get();
  addValidation(report, "dashboard_registry_classification_validation", Boolean(
    dashboardStore
      && dashboardStore.authority_class === "authoritative"
      && dashboardStore.write_mode === "read_write"
      && dashboardDomain
      && dashboardDomain.store_key === "dashboard_registry"
      && dashboardDomain.transaction_policy_key === "registry_write_policy"
      && dashboardDomain.integrity_policy_key === "registry_foreign_key_policy"
      && dashboardDomain.repository_boundary_key === "registry_repository_boundary"
      && dashboardDomain.adapter_boundary_key === "sqlite_primary_adapter"
      && dashboardDependency
      && dashboardDependency.dependency_type === "governed_consumer_reference"
  ), { dashboardStore, dashboardDomain, dashboardDependency });

  const uuidTables = [
    ["enterprise_store_classes", "store_class_uuid"],
    ["enterprise_schema_versions", "schema_version_uuid"],
    ["enterprise_compatibility_registry", "compatibility_registry_uuid"],
    ["enterprise_transaction_policies", "transaction_policy_uuid"],
    ["enterprise_integrity_policies", "integrity_policy_uuid"],
    ["enterprise_partition_policies", "partition_policy_uuid"],
    ["enterprise_repository_boundaries", "repository_boundary_uuid"],
    ["enterprise_adapter_boundaries", "adapter_boundary_uuid"],
    ["enterprise_persistence_domains", "persistence_domain_uuid"],
    ["enterprise_persistence_domain_dependencies", "dependency_uuid"],
    ["enterprise_migration_registry", "migration_registry_uuid"],
    ["enterprise_migration_dependencies", "dependency_uuid"]
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
  syncEnterpriseDatabaseEvolution,
  validateEnterpriseDatabaseEvolution
};
