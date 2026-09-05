"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MIGRATION_KEY = "phase-3-milestone-3.6-enterprise-event-bus-foundation";
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
    milestone: "Phase 3 - Milestone 3.6",
    name: "Enterprise Event Bus Foundation",
    startedAt: nowIso(),
    finishedAt: null,
    totals: { created: 0, updated: 0, skipped: 0, failures: 0 },
    tables: {},
    failures: []
  };
}

function createFailedMigrationReport(error) {
  const report = createMigrationReport();
  addFailure(report, "enterprise_event_bus_foundation", MIGRATION_KEY, error);
  report.finishedAt = nowIso();
  return report;
}

function createValidationReport(kind) {
  return {
    milestone: "Phase 3 - Milestone 3.6",
    name: "Enterprise Event Bus Foundation Validation",
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

function seedSchemaAndCompatibility(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_schema_versions",
    keyColumn: "schema_key",
    keyValue: SCHEMA_KEY,
    uuidColumn: "schema_version_uuid",
    values: {
      schema_version_number: 14,
      compatibility_version: "phase-3-milestone-3.6",
      lifecycle_status: "Approved",
      asset_version: 3,
      metadata_json: json({
        implementationScope: "event_governance_foundation_only",
        preservedMilestones: ["phase-3.1", "phase-3.2", "phase-3.3", "phase-3.4", "phase-3.5"],
        eventRuntimeBroker: false
      }, {})
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_compatibility_registry",
    keyColumn: "registry_key",
    keyValue: "phase-3-milestone-3.6-baseline",
    uuidColumn: "compatibility_registry_uuid",
    values: {
      schema_key: SCHEMA_KEY,
      minimum_schema_version_number: 1,
      current_schema_version_number: 14,
      backward_compatible: 1,
      api_compatibility_required: 1,
      dashboard_compatibility_required: 1,
      website_compatibility_required: 1,
      authentication_compatibility_required: 1,
      lifecycle_status: "Approved",
      asset_version: 1,
      metadata_json: json({
        eventBusOperationalTruth: false,
        dashboardConsumerBoundaryPreserved: true,
        enterpriseIntelligenceBoundaryPreserved: true
      }, {})
    }
  });
}

function upgradeStoreClassification(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_store_classes",
    keyColumn: "store_key",
    keyValue: "future_event_store",
    uuidColumn: "store_class_uuid",
    values: {
      store_name: "Enterprise Event Store",
      authority_class: "append_only",
      write_mode: "append_only",
      lifecycle_status: "Active",
      asset_version: 2,
      metadata_json: json({
        sourceOfTruth: false,
        coordinationOnly: true,
        appendOnly: true,
        immutableEvents: true,
        operationalTruth: false
      }, {})
    }
  });
}

function seedEventCategories(dbConn, report) {
  const rows = [
    ["business_events", "Business Events", "business"],
    ["workflow_events", "Workflow Events", "workflow"],
    ["document_events", "Document Events", "domain"],
    ["notification_events", "Notification Events", "notification"],
    ["audit_events", "Audit Events", "audit"],
    ["analytics_events", "Analytics Events", "analytics"],
    ["future_ai_events", "Future AI Events", "ai"]
  ];
  for (const [categoryKey, categoryName, categoryFamily] of rows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_categories",
      keyColumn: "category_key",
      keyValue: categoryKey,
      uuidColumn: "event_category_uuid",
      values: {
        category_name: categoryName,
        category_family: categoryFamily,
        lifecycle_status: categoryFamily === "ai" ? "Reserved" : "Approved",
        asset_version: 1,
        metadata_json: json({ eventBusRuntime: false }, {})
      }
    });
  }
}

function seedEventPolicies(dbConn, report) {
  const rows = [
    { policyKey: "event_routing_internal_fanout", policyType: "routing", policyName: "Internal Fanout Routing", metadataJson: { routingRuntime: "not_implemented" } },
    { policyKey: "event_filtering_role_visibility", policyType: "filtering", policyName: "Role Visibility Filtering", metadataJson: { dashboardConsumerOnly: true } },
    { policyKey: "event_replay_read_models_only", policyType: "replay", policyName: "Replay Read Models Only", replayMutationPolicy: "rebuild_read_models_only", replayScope: "read_models,analytics,dashboard,search", replayAuthority: "approved_operator_only", metadataJson: { mutatesOperationalTruth: false } },
    { policyKey: "event_dead_letter_retain_and_review", policyType: "dead_letter", policyName: "Retain And Review Dead Letters", securityClass: "internal_event", metadataJson: { runtimeProcessing: "not_implemented" } },
    { policyKey: "event_metrics_governance", policyType: "metrics", policyName: "Enterprise Event Metrics", metricClass: "throughput", metricsPolicy: "governed_event_metrics_only", monitoringPolicy: "governed_monitoring_only", healthClass: "baseline_health", throughputClass: "standard", metadataJson: { businessLogicDependsOnMetrics: false } },
    { policyKey: "event_audit_governance", policyType: "audit", policyName: "Enterprise Event Audit", securityClass: "internal_event", metadataJson: { auditStoreBoundary: true } },
    { policyKey: "event_security_internal", policyType: "security", policyName: "Internal Event Security", securityClass: "internal_event", metadataJson: { zeroTrustProfile: "internal_service_boundary" } },
    { policyKey: "event_payload_minimized", policyType: "payload", policyName: "Minimized Governed Payload", payloadProjectionClass: "customer_safe_projection", payloadVisibility: "governed_internal", payloadRedactionPolicy: "sensitive_fields_redacted", payloadMinimizationPolicy: "minimum_required_fields_only", payloadClassification: "governed_event_payload", sensitiveFieldPolicy: "sensitive_policy_required", piiPolicy: "mask_customer_pii", secretExposurePolicy: "forbidden", metadataJson: { publicExposureForbidden: true } },
    { policyKey: "event_projection_customer_safe", policyType: "projection", policyName: "Customer Safe Projection", payloadProjectionClass: "customer_safe_projection", payloadVisibility: "customer_safe", payloadRedactionPolicy: "projection_redaction_required", payloadMinimizationPolicy: "projection_minimization_required", payloadClassification: "projection_payload", sensitiveFieldPolicy: "projection_sensitive_policy", piiPolicy: "projection_pii_masking", secretExposurePolicy: "forbidden", metadataJson: { customerSafeOnly: true } },
    { policyKey: "event_lifecycle_active", policyType: "lifecycle", policyName: "Active Event Lifecycle", metadataJson: { lifecycleClasses: ["definition", "publisher", "subscriber", "schema", "version"] } },
    { policyKey: "event_delivery_metadata_only", policyType: "delivery", policyName: "Metadata Only Delivery", acknowledgementPolicy: "manual_or_governed_runtime", acknowledgementMode: "manual", checkpointStrategy: "subscriber_checkpoint_governed", deliverySemantics: "at_least_once_metadata_only", metadataJson: { queueRuntime: false } },
    { policyKey: "event_locality_single_node", policyType: "locality", policyName: "Single Node Locality", tenantScope: "single_tenant", organizationScope: "one_point_service_os", branchScope: "all_branches", franchiseScope: "all_franchises", regionalScope: "single_region", partitionScope: "single_node_partition", localityClass: "single_node", metadataJson: { partitionRuntime: false } },
    { policyKey: "event_immutability_append_only", policyType: "immutability", policyName: "Append Only Event Immutability", replayMutationPolicy: "rebuild_read_models_only", replayScope: "read_models,analytics,dashboard,search", replayAuthority: "approved_operator_only", metadataJson: { correctionsCreateNewEvents: true } },
    { policyKey: "event_privacy_customer_safe", policyType: "privacy", policyName: "Customer Safe Event Privacy", privacyKey: "customer_safe", metadataJson: { customerProjectionBoundary: true } },
    { policyKey: "event_consent_service_updates", policyType: "consent", policyName: "Service Update Consent Boundary", consentKey: "customer_service_updates_consent_v1", metadataJson: { consentBoundaryPreserved: true } }
  ];

  for (const row of rows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_policies",
      keyColumn: "policy_key",
      keyValue: row.policyKey,
      uuidColumn: "event_policy_uuid",
      values: {
        policy_type: row.policyType,
        policy_name: row.policyName,
        policy_scope: "event_bus",
        policy_status: "Active",
        immutable_event: 1,
        append_only_class: "append_only",
        replay_mutation_policy: row.replayMutationPolicy || "forbidden",
        replay_scope: row.replayScope || null,
        replay_authority: row.replayAuthority || null,
        payload_projection_class: row.payloadProjectionClass || null,
        payload_visibility: row.payloadVisibility || null,
        payload_redaction_policy: row.payloadRedactionPolicy || null,
        payload_minimization_policy: row.payloadMinimizationPolicy || null,
        payload_classification: row.payloadClassification || null,
        sensitive_field_policy: row.sensitiveFieldPolicy || null,
        pii_policy: row.piiPolicy || null,
        secret_exposure_policy: row.secretExposurePolicy || null,
        security_class: row.securityClass || (row.policyType === "security" ? "internal_governed_event" : null),
        privacy_key: row.privacyKey || null,
        consent_key: row.consentKey || null,
        metric_class: row.metricClass || null,
        metrics_policy: row.metricsPolicy || null,
        monitoring_policy: row.monitoringPolicy || null,
        health_class: row.healthClass || null,
        throughput_class: row.throughputClass || null,
        acknowledgement_policy: row.acknowledgementPolicy || null,
        acknowledgement_mode: row.acknowledgementMode || null,
        checkpoint_strategy: row.checkpointStrategy || null,
        delivery_semantics: row.deliverySemantics || null,
        tenant_scope: row.tenantScope || null,
        organization_scope: row.organizationScope || null,
        branch_scope: row.branchScope || null,
        franchise_scope: row.franchiseScope || null,
        regional_scope: row.regionalScope || null,
        partition_scope: row.partitionScope || null,
        locality_class: row.localityClass || null,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json(row.metadataJson || {}, {})
      }
    });
  }
}

function seedEventSchemasAndVersions(dbConn, report) {
  const schemas = [
    ["customer_lifecycle_event_schema", "Customer Lifecycle Event Schema"],
    ["order_payment_event_schema", "Order And Payment Event Schema"],
    ["workflow_assignment_event_schema", "Workflow And Assignment Event Schema"],
    ["document_lifecycle_event_schema", "Document Lifecycle Event Schema"],
    ["notification_event_schema", "Notification Event Schema"],
    ["communication_event_schema", "Communication Event Schema"]
  ];
  for (const [schemaKey, schemaName] of schemas) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_schemas",
      keyColumn: "schema_key",
      keyValue: schemaKey,
      uuidColumn: "event_schema_uuid",
      values: {
        schema_name: schemaName,
        schema_format: "json",
        schema_version: 1,
        schema_definition_json: json({
          runtimeValidation: false,
          projectionGoverned: true
        }, {}),
        payload_projection_class: "customer_safe_projection",
        payload_visibility: "governed_internal",
        payload_redaction_policy: "sensitive_fields_redacted",
        payload_minimization_policy: "minimum_required_fields_only",
        payload_classification: "governed_event_payload",
        sensitive_field_policy: "sensitive_policy_required",
        pii_policy: "mask_customer_pii",
        secret_exposure_policy: "forbidden",
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const versions = [
    ["customer_lifecycle_v1", 1],
    ["order_payment_v1", 1],
    ["workflow_assignment_v1", 1],
    ["document_lifecycle_v1", 1],
    ["notification_v1", 1],
    ["communication_v1", 1]
  ];
  for (const [versionKey, versionNumber] of versions) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_versions",
      keyColumn: "version_key",
      keyValue: versionKey,
      uuidColumn: "event_version_uuid",
      values: {
        version_number: versionNumber,
        compatibility_window: "phase_3_baseline",
        compatibility_start: "2026-07-04T00:00:00.000Z",
        compatibility_end: null,
        deprecation_window: null,
        replacement_event_key: null,
        migration_policy: "additive_versioning_only",
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({}, {})
      }
    });
  }

  const compat = [
    ["internal_backward_compatible", "backward_compatible", "phase_3_baseline"],
    ["notification_provider_compatible", "provider_compatible", "phase_3_baseline"],
    ["future_ai_consumer_compatible", "future_ai_reserved", "phase_3_baseline"]
  ];
  for (const [compatibilityKey, compatibilityClass, compatibilityWindow] of compat) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_compatibility_profiles",
      keyColumn: "compatibility_key",
      keyValue: compatibilityKey,
      uuidColumn: "event_compatibility_uuid",
      values: {
        compatibility_class: compatibilityClass,
        compatibility_window: compatibilityWindow,
        compatibility_start: "2026-07-04T00:00:00.000Z",
        compatibility_end: null,
        deprecation_window: null,
        replacement_event_key: null,
        migration_policy: "additive_contract_evolution_only",
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          apiGatewayReady: true,
          workflowReady: true,
          microserviceReady: true
        }, {})
      }
    });
  }
}

function seedPublishersAndSubscribers(dbConn, report) {
  const publishers = [
    ["customer_governance_publisher", "Customer Governance Publisher", "customer", null],
    ["payment_service_publisher", "Payment Service Publisher", "payment", null],
    ["workflow_engine_publisher", "Workflow Engine Publisher", "workflow", null],
    ["document_registry_publisher", "Document Registry Publisher", "document", null],
    ["notification_service_publisher", "Notification Service Publisher", "notification", "notification_service"],
    ["assignment_engine_publisher", "Assignment Engine Publisher", "assignment", null],
    ["communication_service_publisher", "Communication Service Publisher", "service", null]
  ];
  for (const [publisherKey, publisherName, publisherType, serviceKey] of publishers) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_publishers",
      keyColumn: "publisher_key",
      keyValue: publisherKey,
      uuidColumn: "event_publisher_uuid",
      values: {
        publisher_name: publisherName,
        publisher_type: publisherType,
        service_key: serviceKey,
        authentication_profile: "existing_auth_boundaries_preserved",
        authorization_profile: "existing_permission_boundaries_preserved",
        trust_boundary: publisherType === "notification" ? "internal_service_boundary" : "admin_session_boundary",
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          queueRuntime: false,
          eventDrivenWorkflowExecution: false
        }, {})
      }
    });
  }

  const subscribers = [
    ["dashboard_timeline_subscriber", "Dashboard Timeline Subscriber", "dashboard", "dashboard_registry", "ordered_dashboard_consumption", "role_governed_visibility", "rebuild_from_event_store", "manual_retry_only", "manual_ack", "manual", "metadata_at_least_once", "governed_checkpoint_only"],
    ["analytics_pulse_subscriber", "Analytics Pulse Subscriber", "analytics", "executive_snapshots", "ordered_analytics_consumption", "analytics_projection_filter", "rebuild_from_event_store", "manual_retry_only", "manual_ack", "manual", "metadata_at_least_once", "governed_checkpoint_only"],
    ["search_projection_subscriber", "Search Projection Subscriber", "search", "dashboard_registry", "ordered_search_projection", "search_projection_filter", "rebuild_from_event_store", "manual_retry_only", "manual_ack", "manual", "metadata_at_least_once", "governed_checkpoint_only"],
    ["future_ai_consumer_subscriber", "Future AI Consumer Subscriber", "ai", "enterprise_intelligence", "ordered_ai_consumption", "ai_safety_filter", "rebuild_from_event_store", "manual_retry_only", "manual_ack", "manual", "metadata_at_least_once", "governed_checkpoint_only"],
    ["workflow_projection_subscriber", "Workflow Projection Subscriber", "workflow", "order_orchestration", "ordered_workflow_consumption", "workflow_projection_filter", "rebuild_from_event_store", "manual_retry_only", "manual_ack", "manual", "metadata_at_least_once", "governed_checkpoint_only"]
  ];
  for (const [subscriberKey, subscriberName, subscriberType, subscriberReference, orderingPolicy, filteringPolicy, replayPolicy, retryPolicy, acknowledgementPolicy, acknowledgementMode, deliverySemantics, checkpointStrategy] of subscribers) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_subscribers",
      keyColumn: "subscriber_key",
      keyValue: subscriberKey,
      uuidColumn: "event_subscriber_uuid",
      values: {
        subscriber_name: subscriberName,
        subscriber_type: subscriberType,
        subscriber_reference: subscriberReference,
        ordering_policy: orderingPolicy,
        filtering_policy: filteringPolicy,
        replay_policy: replayPolicy,
        retry_policy: retryPolicy,
        acknowledgement_policy: acknowledgementPolicy,
        acknowledgement_mode: acknowledgementMode,
        delivery_semantics: deliverySemantics,
        checkpoint_strategy: checkpointStrategy,
        lifecycle_status: subscriberType === "ai" ? "Reserved" : "Approved",
        asset_version: 1,
        metadata_json: json({
          runtimeSubscriber: false
        }, {})
      }
    });
  }
}

function seedProcessContexts(dbConn, report) {
  const rows = [
    ["customer_lifecycle_context", "customer_lifecycle_governance", "customer.profile.lifecycle", "Reserved"],
    ["checkout_payment_context", "checkout_payment_flow", "checkout.payment.capture", "Reserved"],
    ["workflow_assignment_context", "workflow_assignment_governance", "workflow.assignment.lifecycle", "Reserved"],
    ["document_lifecycle_context", "document_lifecycle_governance", "document.lifecycle.chain", "Reserved"],
    ["notification_dispatch_context", "notification_dispatch_governance", "notification.dispatch.chain", "Reserved"],
    ["communication_context", "communication_governance", "communication.message.chain", "Reserved"]
  ];
  for (const [processContextKey, orchestrationContext, workflowChainReference, orchestrationStatus] of rows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_process_contexts",
      keyColumn: "process_context_key",
      keyValue: processContextKey,
      uuidColumn: "process_context_uuid",
      values: {
        orchestration_context: orchestrationContext,
        workflow_chain_reference: workflowChainReference,
        orchestration_status: orchestrationStatus,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          workflowRuntime: false,
          sagaRuntime: false
        }, {})
      }
    });
  }
}

function eventDefinitionRows() {
  return [
    ["customer.lifecycle.changed", "Customer Lifecycle Changed", "customer.lifecycle.changed", "business_events", "customer_lifecycle_event_schema", "customer_lifecycle_v1", "internal_backward_compatible", "customer_governance_publisher"],
    ["order.created", "Order Created", "order.created", "business_events", "order_payment_event_schema", "order_payment_v1", "internal_backward_compatible", "payment_service_publisher"],
    ["payment.session_created", "Payment Session Created", "payment.session_created", "business_events", "order_payment_event_schema", "order_payment_v1", "internal_backward_compatible", "payment_service_publisher"],
    ["payment.captured", "Payment Captured", "payment.captured", "business_events", "order_payment_event_schema", "order_payment_v1", "internal_backward_compatible", "payment_service_publisher"],
    ["payment.failed", "Payment Failed", "payment.failed", "business_events", "order_payment_event_schema", "order_payment_v1", "internal_backward_compatible", "payment_service_publisher"],
    ["payment.refund_requested", "Payment Refund Requested", "payment.refund_requested", "business_events", "order_payment_event_schema", "order_payment_v1", "internal_backward_compatible", "payment_service_publisher"],
    ["workflow.transition", "Workflow Transition", "workflow.transition", "workflow_events", "workflow_assignment_event_schema", "workflow_assignment_v1", "internal_backward_compatible", "workflow_engine_publisher"],
    ["workflow.timeline.event", "Workflow Timeline Event", "workflow.timeline.event", "workflow_events", "workflow_assignment_event_schema", "workflow_assignment_v1", "internal_backward_compatible", "workflow_engine_publisher"],
    ["workflow.assignment.changed", "Workflow Assignment Changed", "workflow.assignment.changed", "workflow_events", "workflow_assignment_event_schema", "workflow_assignment_v1", "internal_backward_compatible", "assignment_engine_publisher"],
    ["document.lifecycle.changed", "Document Lifecycle Changed", "document.lifecycle.changed", "document_events", "document_lifecycle_event_schema", "document_lifecycle_v1", "internal_backward_compatible", "document_registry_publisher"],
    ["notification.logged", "Notification Logged", "notification.logged", "notification_events", "notification_event_schema", "notification_v1", "notification_provider_compatible", "notification_service_publisher"],
    ["notification.dispatched", "Notification Dispatched", "notification.dispatched", "notification_events", "notification_event_schema", "notification_v1", "notification_provider_compatible", "notification_service_publisher"],
    ["notification.failed", "Notification Failed", "notification.failed", "notification_events", "notification_event_schema", "notification_v1", "notification_provider_compatible", "notification_service_publisher"],
    ["communication.message.logged", "Communication Message Logged", "communication.message.logged", "audit_events", "communication_event_schema", "communication_v1", "internal_backward_compatible", "communication_service_publisher"]
  ];
}

function seedEventRegistry(dbConn, report) {
  for (const [eventKey, eventName, eventType, categoryKey, schemaKey, versionKey, compatibilityKey, publisherKey] of eventDefinitionRows()) {
    upsertSeed(dbConn, report, {
      table: "enterprise_event_registry",
      keyColumn: "event_key",
      keyValue: eventKey,
      uuidColumn: "event_registry_uuid",
      values: {
        event_name: eventName,
        event_type: eventType,
        category_key: categoryKey,
        schema_key: schemaKey,
        version_key: versionKey,
        compatibility_key: compatibilityKey,
        publisher_key: publisherKey,
        security_policy_key: "event_security_internal",
        payload_policy_key: "event_payload_minimized",
        projection_policy_key: "event_projection_customer_safe",
        routing_policy_key: "event_routing_internal_fanout",
        filtering_policy_key: "event_filtering_role_visibility",
        replay_policy_key: "event_replay_read_models_only",
        dead_letter_policy_key: "event_dead_letter_retain_and_review",
        audit_policy_key: "event_audit_governance",
        metrics_policy_key: "event_metrics_governance",
        lifecycle_policy_key: "event_lifecycle_active",
        delivery_policy_key: "event_delivery_metadata_only",
        locality_policy_key: "event_locality_single_node",
        privacy_policy_key: "event_privacy_customer_safe",
        consent_policy_key: "event_consent_service_updates",
        immutability_policy_key: "event_immutability_append_only",
        event_status: "Active",
        event_owner: "enterprise_platform",
        workflow_boundary: "coordination_only",
        integration_boundary: "governed_only",
        ai_consumer_boundary: "metadata_only",
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({
          operationalTruth: false,
          businessTruthPreserved: true,
          dashboardMetadataTruthPreserved: true
        }, {})
      }
    });
  }
}

function seedEventSubscriptions(dbConn, report) {
  const standardSubscribers = [
    "dashboard_timeline_subscriber",
    "analytics_pulse_subscriber",
    "search_projection_subscriber",
    "workflow_projection_subscriber"
  ];
  const aiSubscriber = "future_ai_consumer_subscriber";
  for (const [eventKey] of eventDefinitionRows()) {
    for (const subscriberKey of [...standardSubscribers, aiSubscriber]) {
      const isAi = subscriberKey === aiSubscriber;
      upsertSeed(dbConn, report, {
        table: "enterprise_event_subscriptions",
        keyColumn: "event_subscription_uuid",
        keyValue: dbConn.prepare(`
          SELECT event_subscription_uuid
          FROM enterprise_event_subscriptions
          WHERE event_key = ? AND subscriber_key = ?
        `).get(eventKey, subscriberKey)?.event_subscription_uuid || crypto.randomUUID(),
        uuidColumn: "event_subscription_uuid",
        values: {
          event_key: eventKey,
          subscriber_key: subscriberKey,
          subscription_status: isAi ? "Reserved" : "Active",
          compatibility_key: isAi ? "future_ai_consumer_compatible" : "internal_backward_compatible",
          routing_policy_key: "event_routing_internal_fanout",
          filtering_policy_key: "event_filtering_role_visibility",
          replay_policy_key: "event_replay_read_models_only",
          delivery_policy_key: "event_delivery_metadata_only",
          dead_letter_policy_key: "event_dead_letter_retain_and_review",
          acknowledgement_policy: "manual_ack",
          acknowledgement_mode: "manual",
          checkpoint_strategy: "governed_checkpoint_only",
          delivery_semantics: "metadata_at_least_once",
          lifecycle_status: isAi ? "Reserved" : "Approved",
          asset_version: 1,
          metadata_json: json({
            runtimeExecution: false
          }, {})
        }
      });
    }
  }
}

function seedPersistenceDomains(dbConn, report) {
  const rows = [
    ["enterprise_event_bus_registry", "Enterprise Event Bus Registry", "registry_store", "enterprise_platform", "enterprise_platform", "governed_business_domain", "owner_approved_only", "per_release_review", "registry_write_policy", "registry_foreign_key_policy", "branch_franchise_future", "registry_repository_boundary", "sqlite_primary_adapter", { primaryTables: ["enterprise_event_categories", "enterprise_event_schemas", "enterprise_event_versions", "enterprise_event_compatibility_profiles", "enterprise_event_publishers", "enterprise_event_subscribers", "enterprise_event_policies", "enterprise_event_registry", "enterprise_event_subscriptions", "enterprise_event_process_contexts"], sourceOfTruth: "event_registry" }],
    ["enterprise_event_store", "Enterprise Event Store", "future_event_store", "enterprise_platform", "enterprise_platform", "governed_business_domain", "owner_approved_only", "per_release_review", "archive_append_policy", "archive_history_policy", "archive_future", "registry_repository_boundary", "sqlite_primary_adapter", { primaryTables: ["enterprise_event_store"], appendOnly: true, coordinationOnly: true, operationalTruth: false }],
    ["enterprise_event_delivery_state", "Enterprise Event Delivery State", "registry_store", "enterprise_platform", "enterprise_platform", "governed_business_domain", "owner_approved_only", "per_release_review", "registry_write_policy", "registry_foreign_key_policy", "single_node_baseline", "registry_repository_boundary", "sqlite_primary_adapter", { primaryTables: ["enterprise_event_delivery_state"], runtimeExecution: false }],
    ["enterprise_event_dead_letters", "Enterprise Event Dead Letters", "future_event_store", "enterprise_platform", "enterprise_platform", "governed_business_domain", "owner_approved_only", "per_release_review", "archive_append_policy", "archive_history_policy", "archive_future", "registry_repository_boundary", "sqlite_primary_adapter", { primaryTables: ["enterprise_event_dead_letters"], appendOnly: true }],
    ["enterprise_event_audit", "Enterprise Event Audit", "audit_store", "enterprise_platform", "enterprise_platform", "governed_business_domain", "owner_approved_only", "per_release_review", "archive_append_policy", "archive_history_policy", "archive_future", "registry_repository_boundary", "sqlite_primary_adapter", { primaryTables: ["enterprise_event_audit_log"], appendOnly: true }]
  ];

  for (const [domainKey, domainName, storeKey, dataOwner, domainOwner, stewardshipClass, transferPolicy, reviewPolicy, transactionPolicyKey, integrityPolicyKey, partitionPolicyKey, repositoryBoundaryKey, adapterBoundaryKey, metadata] of rows) {
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
        transaction_policy_key: transactionPolicyKey,
        integrity_policy_key: integrityPolicyKey,
        partition_policy_key: partitionPolicyKey,
        repository_boundary_key: repositoryBoundaryKey,
        adapter_boundary_key: adapterBoundaryKey,
        lifecycle_independent_from_business: 1,
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json(metadata, {})
      }
    });
  }
}

function seedDomainDependencies(dbConn, report) {
  const rows = [
    ["enterprise_event_bus_registry", "enterprise_service_governance", "requires"],
    ["enterprise_event_bus_registry", "enterprise_security_governance", "requires"],
    ["enterprise_event_bus_registry", "enterprise_policy_governance", "requires"],
    ["enterprise_event_bus_registry", "universal_business_objects", "governed_identity"],
    ["enterprise_event_store", "enterprise_event_bus_registry", "governed_event_definition"],
    ["enterprise_event_store", "operational_orders_payments", "business_reference"],
    ["enterprise_event_store", "customer_genome", "business_reference"],
    ["enterprise_event_store", "document_registry", "business_reference"],
    ["enterprise_event_store", "omnichannel_foundation", "business_reference"],
    ["enterprise_event_store", "order_orchestration", "workflow_reference"],
    ["enterprise_event_delivery_state", "enterprise_event_bus_registry", "governed_subscriber_state"],
    ["enterprise_event_dead_letters", "enterprise_event_store", "append_only_failure_reference"],
    ["enterprise_event_audit", "enterprise_event_store", "append_only_audit_reference"]
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
    ["phase-2-milestone-2.4-order-orchestration-baseline", "Order Orchestration Baseline", 6],
    ["phase-2-milestone-2.5-document-intelligence-foundation", "Document Intelligence Foundation", 7],
    ["phase-2-milestone-2.6-customer-experience-and-omnichannel-foundation", "Customer Experience and Omnichannel Foundation", 8],
    ["phase-3-milestone-3.4-enterprise-database-evolution", "Enterprise Database Evolution", 12],
    ["phase-3-milestone-3.5-enterprise-api-identity-permission-standardization", "Enterprise API, Identity & Permission Standardization", 13]
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
      migration_name: "Enterprise Event Bus Foundation",
      schema_key: SCHEMA_KEY,
      target_schema_version_number: 14,
      report_path: options.reportPath,
      checksum_sha256: checksum,
      migration_status: "applied",
      additive_only: 1,
      rollback_required: 1,
      lifecycle_status: "Applied",
      asset_version: 1,
      metadata_json: json({
        milestone: "Phase 3 - Milestone 3.6",
        implementationScope: "event_governance_foundation",
        coordinationOnly: true,
        queueRuntimeImplemented: false
      }, {}),
      applied_at: nowIso()
    }
  });

  for (const dependencyKey of dependencyMigrations.map(([key]) => key)) {
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
        lifecycle_status: "Approved",
        asset_version: 1,
        metadata_json: json({ lineage: "phase_3_3_6" }, {})
      }
    });
  }
}

function syncEnterpriseEventBusFoundation(options = {}) {
  const dbConn = options.dbConn;
  if (!dbConn) throw new Error("syncEnterpriseEventBusFoundation requires dbConn.");
  const report = createMigrationReport();
  try {
    clearColumnCache();
    seedSchemaAndCompatibility(dbConn, report);
    upgradeStoreClassification(dbConn, report);
    seedEventCategories(dbConn, report);
    seedEventPolicies(dbConn, report);
    seedEventSchemasAndVersions(dbConn, report);
    seedPublishersAndSubscribers(dbConn, report);
    seedProcessContexts(dbConn, report);
    seedEventRegistry(dbConn, report);
    seedEventSubscriptions(dbConn, report);
    seedPersistenceDomains(dbConn, report);
    seedDomainDependencies(dbConn, report);
    seedMigrationRegistry(dbConn, report, options);
    report.finishedAt = nowIso();
    if (options.writeEvidence !== false) writeMigrationEvidence(options, report);
    return report;
  } catch (error) {
    addFailure(report, "enterprise_event_bus_foundation", MIGRATION_KEY, error);
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

function tableExists(dbConn, table) {
  const row = dbConn.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return Boolean(row);
}

function validateEnterpriseEventBusFoundation(options = {}) {
  const dbConn = options.dbConn;
  if (!dbConn) throw new Error("validateEnterpriseEventBusFoundation requires dbConn.");
  const report = createValidationReport(options.kind || "project_database");

  const counts = {
    categories: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_categories").get().count,
    policies: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_policies").get().count,
    schemas: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_schemas").get().count,
    versions: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_versions").get().count,
    compatibility: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_compatibility_profiles").get().count,
    publishers: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_publishers").get().count,
    subscribers: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_subscribers").get().count,
    registry: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_registry").get().count,
    subscriptions: dbConn.prepare("SELECT COUNT(*) AS count FROM enterprise_event_subscriptions").get().count
  };
  addValidation(report, "event_registry_validation", (
    counts.categories >= 6
    && counts.policies >= 10
    && counts.schemas >= 5
    && counts.publishers >= 6
    && counts.subscribers >= 4
    && counts.registry >= 10
    && counts.subscriptions >= 20
  ), counts);

  const storeClassification = dbConn.prepare(`
    SELECT authority_class, write_mode, lifecycle_status, metadata_json
    FROM enterprise_store_classes
    WHERE store_key = 'future_event_store'
  `).get();
  const registryDomain = dbConn.prepare(`
    SELECT store_key, repository_boundary_key, adapter_boundary_key
    FROM enterprise_persistence_domains
    WHERE domain_key = 'enterprise_event_bus_registry'
  `).get();
  const storeDomain = dbConn.prepare(`
    SELECT store_key, transaction_policy_key, integrity_policy_key, partition_policy_key
    FROM enterprise_persistence_domains
    WHERE domain_key = 'enterprise_event_store'
  `).get();
  addValidation(report, "event_store_classification_validation", Boolean(
    storeClassification
      && storeClassification.authority_class === "append_only"
      && storeClassification.write_mode === "append_only"
      && storeClassification.lifecycle_status === "Active"
      && registryDomain
      && registryDomain.store_key === "registry_store"
      && registryDomain.repository_boundary_key === "registry_repository_boundary"
      && registryDomain.adapter_boundary_key === "sqlite_primary_adapter"
      && storeDomain
      && storeDomain.store_key === "future_event_store"
      && storeDomain.transaction_policy_key === "archive_append_policy"
      && storeDomain.integrity_policy_key === "archive_history_policy"
  ), {
    storeClassification,
    registryDomain,
    storeDomain
  });

  const sourceTruth = {
    businessFoundations: dbConn.prepare("SELECT store_key FROM enterprise_persistence_domains WHERE domain_key = 'operational_orders_payments'").get(),
    enterpriseIntelligence: dbConn.prepare("SELECT store_key FROM enterprise_persistence_domains WHERE domain_key = 'enterprise_intelligence'").get(),
    dashboardRegistry: dbConn.prepare("SELECT store_key FROM enterprise_persistence_domains WHERE domain_key = 'dashboard_registry'").get(),
    eventStore: dbConn.prepare("SELECT store_key FROM enterprise_persistence_domains WHERE domain_key = 'enterprise_event_store'").get()
  };
  addValidation(report, "source_of_truth_boundary_validation", Boolean(
    sourceTruth.businessFoundations?.store_key === "operational_store"
      && sourceTruth.enterpriseIntelligence?.store_key === "enterprise_intelligence_registry"
      && sourceTruth.dashboardRegistry?.store_key === "dashboard_registry"
      && sourceTruth.eventStore?.store_key === "future_event_store"
  ), sourceTruth);

  const appendOnlyTriggers = {
    eventStoreUpdate: dbConn.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'trg_enterprise_event_store_append_only_update'").get(),
    eventStoreDelete: dbConn.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'trg_enterprise_event_store_append_only_delete'").get(),
    deadLetterUpdate: dbConn.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'trg_enterprise_event_dead_letters_append_only_update'").get(),
    auditUpdate: dbConn.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'trg_enterprise_event_audit_log_append_only_update'").get()
  };
  addValidation(report, "append_only_immutability_validation", Object.values(appendOnlyTriggers).every(Boolean), appendOnlyTriggers);

  const payloadPolicies = dbConn.prepare(`
    SELECT policy_key, payload_visibility, payload_redaction_policy, payload_minimization_policy, pii_policy, secret_exposure_policy
    FROM enterprise_event_policies
    WHERE policy_type IN ('payload', 'projection')
  `).all();
  addValidation(report, "payload_governance_validation", payloadPolicies.length >= 2 && payloadPolicies.every((policy) => (
    policy.payload_visibility && policy.payload_redaction_policy && policy.payload_minimization_policy && policy.pii_policy && policy.secret_exposure_policy
  )), payloadPolicies);

  const replayPolicy = dbConn.prepare(`
    SELECT replay_mutation_policy, replay_scope, replay_authority
    FROM enterprise_event_policies
    WHERE policy_key = 'event_replay_read_models_only'
  `).get();
  addValidation(report, "replay_non_mutation_validation", Boolean(
    replayPolicy
      && replayPolicy.replay_mutation_policy === "rebuild_read_models_only"
      && String(replayPolicy.replay_scope || "").includes("read_models")
  ), replayPolicy || null);

  const processContexts = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_event_process_contexts
    WHERE orchestration_context IS NOT NULL
      AND orchestration_status IS NOT NULL
  `).get();
  addValidation(report, "orchestration_context_validation", Number(processContexts.count) >= 5, {
    processContexts: processContexts.count
  });

  const subscriberGovernance = dbConn.prepare(`
    SELECT COUNT(*) AS count
    FROM enterprise_event_subscribers
    WHERE acknowledgement_policy IS NOT NULL
      AND acknowledgement_mode IS NOT NULL
      AND checkpoint_strategy IS NOT NULL
      AND delivery_semantics IS NOT NULL
  `).get();
  addValidation(report, "subscriber_delivery_governance_validation", Number(subscriberGovernance.count) >= 4, {
    governedSubscribers: subscriberGovernance.count
  });

  const localityPolicy = dbConn.prepare(`
    SELECT tenant_scope, organization_scope, branch_scope, franchise_scope, regional_scope, partition_scope, locality_class
    FROM enterprise_event_policies
    WHERE policy_key = 'event_locality_single_node'
  `).get();
  addValidation(report, "locality_partition_governance_validation", Boolean(
    localityPolicy
      && localityPolicy.tenant_scope
      && localityPolicy.organization_scope
      && localityPolicy.partition_scope
      && localityPolicy.locality_class
  ), localityPolicy || null);

  const compatibilityProfiles = dbConn.prepare(`
    SELECT compatibility_key, compatibility_window, migration_policy
    FROM enterprise_event_compatibility_profiles
  `).all();
  addValidation(report, "event_compatibility_validation", compatibilityProfiles.length >= 3 && compatibilityProfiles.every((profile) => (
    profile.compatibility_window && profile.migration_policy
  )), compatibilityProfiles);

  const dashboardSubscriber = dbConn.prepare(`
    SELECT subscriber_type, subscriber_reference
    FROM enterprise_event_subscribers
    WHERE subscriber_key = 'dashboard_timeline_subscriber'
  `).get();
  addValidation(report, "dashboard_consumer_boundary_validation", Boolean(
    dashboardSubscriber
      && dashboardSubscriber.subscriber_type === "dashboard"
      && dashboardSubscriber.subscriber_reference === "dashboard_registry"
  ), dashboardSubscriber || null);

  const aiSubscriber = dbConn.prepare(`
    SELECT lifecycle_status, subscriber_type
    FROM enterprise_event_subscribers
    WHERE subscriber_key = 'future_ai_consumer_subscriber'
  `).get();
  addValidation(report, "ai_consumer_boundary_validation", Boolean(
    aiSubscriber
      && aiSubscriber.subscriber_type === "ai"
      && aiSubscriber.lifecycle_status === "Reserved"
  ), aiSubscriber || null);

  const dependencyIntegrity = dbConn.prepare(`
    SELECT COUNT(*) AS invalid
    FROM enterprise_persistence_domain_dependencies dependency
    LEFT JOIN enterprise_persistence_domains source ON source.domain_key = dependency.source_domain_key
    LEFT JOIN enterprise_persistence_domains target ON target.domain_key = dependency.target_domain_key
    WHERE dependency.source_domain_key LIKE 'enterprise_event%'
      AND (source.domain_key IS NULL OR target.domain_key IS NULL)
  `).get();
  addValidation(report, "persistence_dependency_validation", Number(dependencyIntegrity.invalid) === 0, {
    invalidDependencies: dependencyIntegrity.invalid
  });

  const migrationRow = dbConn.prepare(`
    SELECT migration_status, target_schema_version_number, additive_only, rollback_required
    FROM enterprise_migration_registry
    WHERE migration_key = ?
  `).get(MIGRATION_KEY);
  addValidation(report, "migration_registry_validation", Boolean(
    migrationRow
      && migrationRow.migration_status === "applied"
      && Number(migrationRow.target_schema_version_number) === 14
      && Number(migrationRow.additive_only) === 1
      && Number(migrationRow.rollback_required) === 1
  ), migrationRow || null);

  const dependencyLineage = dbConn.prepare(`
    SELECT COUNT(*) AS invalid
    FROM enterprise_migration_dependencies dependency
    LEFT JOIN enterprise_migration_registry source ON source.migration_key = dependency.migration_key
    LEFT JOIN enterprise_migration_registry target ON target.migration_key = dependency.depends_on_migration_key
    WHERE dependency.migration_key = ?
      AND (source.migration_key IS NULL OR target.migration_key IS NULL)
  `).get(MIGRATION_KEY);
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

  const foundationalTables = [
    "enterprise_event_categories",
    "enterprise_event_schemas",
    "enterprise_event_versions",
    "enterprise_event_compatibility_profiles",
    "enterprise_event_publishers",
    "enterprise_event_subscribers",
    "enterprise_event_policies",
    "enterprise_event_process_contexts",
    "enterprise_event_registry",
    "enterprise_event_subscriptions",
    "enterprise_event_store",
    "enterprise_event_delivery_state",
    "enterprise_event_dead_letters",
    "enterprise_event_audit_log"
  ];
  addValidation(report, "table_presence_validation", foundationalTables.every((table) => tableExists(dbConn, table)), foundationalTables);

  const foreignKeyIssues = dbConn.prepare("PRAGMA foreign_key_check").all();
  addValidation(report, "backward_compatibility_validation", foreignKeyIssues.length === 0, { foreignKeyIssues });

  const uuidTables = [
    ["enterprise_event_categories", "event_category_uuid"],
    ["enterprise_event_schemas", "event_schema_uuid"],
    ["enterprise_event_versions", "event_version_uuid"],
    ["enterprise_event_compatibility_profiles", "event_compatibility_uuid"],
    ["enterprise_event_publishers", "event_publisher_uuid"],
    ["enterprise_event_subscribers", "event_subscriber_uuid"],
    ["enterprise_event_policies", "event_policy_uuid"],
    ["enterprise_event_process_contexts", "process_context_uuid"],
    ["enterprise_event_registry", "event_registry_uuid"],
    ["enterprise_event_subscriptions", "event_subscription_uuid"],
    ["enterprise_event_store", "event_message_uuid"],
    ["enterprise_event_delivery_state", "delivery_state_uuid"],
    ["enterprise_event_dead_letters", "dead_letter_uuid"],
    ["enterprise_event_audit_log", "event_audit_uuid"]
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
  syncEnterpriseEventBusFoundation,
  validateEnterpriseEventBusFoundation,
  writeMigrationEvidence
};
