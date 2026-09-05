"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { departmentForCategory, OBJECT_TYPE_DEFINITIONS } = require("../domain/object-types");
const { compactUniversalObject, normalizePayload, safeJson } = require("../domain/universal-object");

const REGISTRATION_ACTOR = "phase-2-milestone-2.1";

function nowIso() {
  return new Date().toISOString();
}

function createReport() {
  return {
    milestone: "Phase 2 - Milestone 2.1",
    name: "Universal Business Object Foundation Migration",
    startedAt: nowIso(),
    finishedAt: null,
    totals: {
      sources: 0,
      records: 0,
      registered: 0,
      updated: 0,
      relationships: 0,
      timeline: 0,
      failures: 0,
      warnings: 0
    },
    warnings: [],
    failures: []
  };
}

function addWarning(report, sourceTable, message) {
  report.totals.warnings += 1;
  report.warnings.push({ sourceTable, message });
}

function addFailure(report, sourceTable, sourcePk, error) {
  report.totals.failures += 1;
  report.failures.push({
    sourceTable,
    sourcePk: sourcePk === undefined || sourcePk === null ? null : String(sourcePk),
    message: error && error.message ? error.message : String(error)
  });
}

function writeReport(report, reportPath) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function tableExists(dbConn, tableName) {
  const row = dbConn
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return Boolean(row);
}

function getUniversalObject(dbConn, sourceTable, sourcePk) {
  if (!sourceTable || sourcePk === undefined || sourcePk === null) return null;
  return dbConn
    .prepare("SELECT * FROM universal_objects WHERE source_table = ? AND source_pk = ? LIMIT 1")
    .get(String(sourceTable), String(sourcePk));
}

function getUniversalObjectPayload(dbConn, sourceTable, sourcePk) {
  return compactUniversalObject(getUniversalObject(dbConn, sourceTable, sourcePk));
}

function booleanText(value) {
  return value ? "true" : "false";
}

function statusFromActive(active) {
  return Number(active) === 1 ? "active" : "inactive";
}

function lifecycleFromStatus(status, fallback = "active") {
  const clean = String(status || fallback).toLowerCase();
  if (["completed", "delivered", "issued", "sent", "done", "captured"].includes(clean)) return "completed";
  if (["cancelled", "canceled", "failed", "refunded"].includes(clean)) return "closed";
  if (["created", "pending", "logged", "queued", "assigned", "accepted", "working"].includes(clean)) return "active";
  return clean || fallback;
}

function objectDefinition(sourceTable) {
  const definition = OBJECT_TYPE_DEFINITIONS[sourceTable];
  if (!definition) throw new Error(`No universal object definition found for ${sourceTable}.`);
  return definition;
}

function sourcePayload(sourceTable, row) {
  const definition = objectDefinition(sourceTable);
  const base = {
    objectType: definition.objectType,
    sourceTable,
    sourcePk: row.id,
    department: definition.defaultDepartment,
    visibility: definition.visibility,
    aiContextEnabled: definition.aiContextEnabled,
    createdByType: "migration",
    createdById: REGISTRATION_ACTOR,
    sourceCreatedAt: row.created_at || row.issued_at || row.processed_at || row.assigned_at || row.checked_at || null,
    sourceUpdatedAt: row.updated_at || row.sent_at || row.created_at || row.issued_at || row.processed_at || row.assigned_at || row.checked_at || null
  };

  switch (sourceTable) {
    case "users":
      return {
        ...base,
        humanReadableId: `CUST-${row.id}`,
        displayName: row.name || `Customer ${row.id}`,
        currentStatus: row.account_status || "active",
        lifecycleStage: lifecycleFromStatus(row.account_status, "active"),
        ownerType: "customer",
        ownerId: row.id,
        department: "customer_success",
        metadata: {
          phoneLast4: String(row.phone || "").slice(-4),
          emailPresent: Boolean(row.email),
          authProvider: row.auth_provider || "checkout",
          phoneVerified: Boolean(row.phone_verified),
          emailVerified: Boolean(row.email_verified)
        },
        tags: ["customer"]
      };
    case "services":
      return {
        ...base,
        humanReadableId: row.slug,
        displayName: row.name || row.slug,
        currentStatus: statusFromActive(row.active),
        lifecycleStage: statusFromActive(row.active),
        ownerType: "department",
        ownerId: departmentForCategory(row.category, definition.defaultDepartment),
        department: departmentForCategory(row.category, definition.defaultDepartment),
        visibility: "public",
        metadata: {
          slug: row.slug,
          category: row.category || "",
          subCategory: row.sub_category || "",
          pricingModel: row.pricing_model || "all_inclusive",
          active: Boolean(row.active)
        },
        tags: ["service", row.category || "service"]
      };
    case "service_pricing_variants":
      return {
        ...base,
        humanReadableId: row.variant_slug,
        displayName: row.variant_name || row.service_name || row.variant_slug,
        currentStatus: row.status || statusFromActive(row.active),
        lifecycleStage: lifecycleFromStatus(row.status || statusFromActive(row.active)),
        ownerType: "service",
        ownerId: row.parent_slug,
        department: departmentForCategory(row.category, definition.defaultDepartment),
        visibility: "public",
        metadata: {
          parentSlug: row.parent_slug,
          variantSlug: row.variant_slug,
          serviceName: row.service_name,
          category: row.category || "",
          subCategory: row.sub_category || "",
          active: Boolean(row.active)
        },
        tags: ["service_variant", row.parent_slug || "service"]
      };
    case "products":
      return {
        ...base,
        humanReadableId: row.slug,
        displayName: row.name || row.slug,
        currentStatus: statusFromActive(row.active),
        lifecycleStage: statusFromActive(row.active),
        ownerType: "department",
        ownerId: "onemart",
        department: "onemart",
        visibility: "public",
        metadata: {
          slug: row.slug,
          category: row.category || "",
          active: Boolean(row.active)
        },
        tags: ["product", row.category || "product"]
      };
    case "orders":
      return {
        ...base,
        humanReadableId: row.order_id,
        displayName: `Order ${row.order_id}`,
        currentStatus: row.status || "created",
        lifecycleStage: lifecycleFromStatus(row.status, "created"),
        ownerType: "customer",
        ownerId: row.user_id,
        department: "operations",
        priority: row.assignment_priority || "normal",
        metadata: {
          orderType: row.order_type,
          sourceChannel: row.source_channel,
          currency: row.currency || "INR",
          botCheckStatus: row.bot_check_status || "pending"
        },
        tags: ["order", row.order_type || "order"]
      };
    case "order_items":
      return {
        ...base,
        humanReadableId: `${row.item_type}-${row.id}`,
        displayName: row.item_name || `Order Item ${row.id}`,
        currentStatus: "created",
        lifecycleStage: "active",
        ownerType: "order",
        ownerId: row.order_id,
        department: "operations",
        metadata: {
          itemType: row.item_type,
          itemSlug: row.item_slug,
          quantity: Number(row.quantity || 1)
        },
        tags: ["order_item", row.item_type || "item"]
      };
    case "payments":
      return {
        ...base,
        humanReadableId: row.payment_id,
        displayName: `Payment ${row.payment_id}`,
        currentStatus: row.status || "created",
        lifecycleStage: lifecycleFromStatus(row.status, "created"),
        ownerType: "order",
        ownerId: row.order_id,
        department: "finance",
        visibility: "restricted",
        metadata: {
          gateway: row.gateway,
          method: row.method,
          amountPaise: Number(row.amount_paise || 0),
          currency: row.currency || "INR",
          hasGatewayOrder: Boolean(row.gateway_order_id),
          hasGatewayPayment: Boolean(row.gateway_payment_id)
        },
        tags: ["payment", row.gateway || "gateway"]
      };
    case "transactions":
      return {
        ...base,
        humanReadableId: row.transaction_id,
        displayName: `Transaction ${row.transaction_id}`,
        currentStatus: row.status || "created",
        lifecycleStage: lifecycleFromStatus(row.status, "created"),
        ownerType: "payment",
        ownerId: row.payment_id,
        department: "finance",
        visibility: "restricted",
        metadata: {
          gateway: row.gateway,
          method: row.method,
          amountPaise: Number(row.amount_paise || 0),
          currency: row.currency || "INR",
          hasGatewayReference: Boolean(row.gateway_reference)
        },
        tags: ["transaction", row.gateway || "gateway"]
      };
    case "invoices":
      return {
        ...base,
        humanReadableId: row.invoice_no,
        displayName: `Invoice ${row.invoice_no}`,
        currentStatus: row.status || "issued",
        lifecycleStage: lifecycleFromStatus(row.status, "issued"),
        ownerType: "order",
        ownerId: row.order_id,
        department: "finance",
        visibility: "restricted",
        metadata: {
          orderId: row.order_id,
          transactionId: row.transaction_id || null,
          hasPdf: Boolean(row.pdf_path)
        },
        tags: ["invoice"]
      };
    case "refunds":
      return {
        ...base,
        humanReadableId: row.refund_id,
        displayName: `Refund ${row.refund_id}`,
        currentStatus: row.status || "requested",
        lifecycleStage: lifecycleFromStatus(row.status, "requested"),
        ownerType: "payment",
        ownerId: row.payment_id,
        department: "finance",
        visibility: "restricted",
        metadata: {
          orderId: row.order_id,
          paymentId: row.payment_id,
          refundType: row.refund_type,
          amountPaise: Number(row.amount_paise || 0),
          gateway: row.gateway
        },
        tags: ["refund", row.gateway || "gateway"]
      };
    case "payment_logs":
      return {
        ...base,
        humanReadableId: `PAYLOG-${row.id}`,
        displayName: row.event || `Payment Log ${row.id}`,
        currentStatus: row.level || "info",
        lifecycleStage: "recorded",
        ownerType: "payment",
        ownerId: row.payment_id || row.order_id || null,
        department: "finance",
        visibility: "restricted",
        aiContextEnabled: false,
        metadata: {
          event: row.event,
          level: row.level || "info",
          gateway: row.gateway || "",
          hasPayload: Boolean(row.payload_json)
        },
        tags: ["payment_log"]
      };
    case "webhook_logs":
      return {
        ...base,
        humanReadableId: `WEBHOOK-${row.id}`,
        displayName: row.event || `Webhook ${row.id}`,
        currentStatus: row.status || "logged",
        lifecycleStage: "recorded",
        ownerType: "system",
        ownerId: row.gateway,
        department: "infrastructure",
        visibility: "restricted",
        aiContextEnabled: false,
        metadata: {
          gateway: row.gateway,
          event: row.event || "",
          transactionIdPresent: Boolean(row.transaction_id),
          signatureValid: Boolean(row.signature_valid)
        },
        tags: ["webhook_log", row.gateway || "gateway"]
      };
    case "notifications":
      return {
        ...base,
        humanReadableId: `NOTIF-${row.id}`,
        displayName: `${row.channel || "notification"} ${row.event || row.id}`,
        currentStatus: row.status || "logged",
        lifecycleStage: lifecycleFromStatus(row.status, "logged"),
        ownerType: "customer",
        ownerId: row.recipient || null,
        department: "customer_success",
        metadata: {
          event: row.event,
          channel: row.channel,
          recipientLast4: String(row.recipient || "").slice(-4),
          hasProviderResponse: Boolean(row.provider_response_json)
        },
        tags: ["notification", row.channel || "channel"]
      };
    case "staff":
      return {
        ...base,
        humanReadableId: `STAFF-${row.id}`,
        displayName: row.name || `Staff ${row.id}`,
        currentStatus: Number(row.is_active) === 1 ? "active" : "inactive",
        lifecycleStage: Number(row.is_active) === 1 ? "active" : "inactive",
        ownerType: "human_staff",
        ownerId: row.id,
        department: "hr",
        metadata: {
          role: row.role,
          phoneLast4: String(row.phone || "").slice(-4),
          emailPresent: Boolean(row.email),
          maxTasks: Number(row.max_tasks || 0),
          skillCount: safeArrayCount(row.skills)
        },
        tags: ["human_staff", row.role || "staff"]
      };
    case "task_assignments":
      return {
        ...base,
        humanReadableId: `TASK-${row.id}`,
        displayName: `Assignment ${row.id}`,
        currentStatus: row.status || "assigned",
        lifecycleStage: lifecycleFromStatus(row.status, "assigned"),
        ownerType: "human_staff",
        ownerId: row.staff_id,
        department: "operations",
        priority: row.priority || "normal",
        metadata: {
          orderId: row.order_id,
          staffId: row.staff_id,
          hasAdminNotes: Boolean(row.admin_notes),
          accepted: Boolean(row.accepted_at),
          completed: Boolean(row.completed_at)
        },
        tags: ["task_assignment"]
      };
    case "order_documents":
      return {
        ...base,
        humanReadableId: `DOC-${row.id}`,
        displayName: row.doc_type || row.file_name || `Document ${row.id}`,
        currentStatus: Number(row.verified) === 1 ? "verified" : "pending",
        lifecycleStage: Number(row.verified) === 1 ? "completed" : "active",
        ownerType: "order",
        ownerId: row.order_id,
        department: "operations",
        visibility: "restricted",
        metadata: {
          docType: row.doc_type,
          fileNamePresent: Boolean(row.file_name),
          mimeType: row.mime_type || "",
          uploadedBy: row.uploaded_by || "customer",
          verified: Boolean(row.verified)
        },
        tags: ["document", row.doc_type || "document"]
      };
    case "bot_checks":
      return {
        ...base,
        humanReadableId: `CHECK-${row.id}`,
        displayName: `${row.check_type || "initial"} check ${row.id}`,
        currentStatus: row.status || "pending",
        lifecycleStage: lifecycleFromStatus(row.status, "pending"),
        ownerType: "order",
        ownerId: row.order_id,
        department: "operations",
        metadata: {
          checkType: row.check_type || "initial",
          paymentOk: Boolean(row.payment_ok),
          docsOk: Boolean(row.docs_ok),
          fieldsOk: Boolean(row.fields_ok),
          reminderSent: Boolean(row.reminder_sent),
          autoAssigned: Boolean(row.auto_assigned)
        },
        tags: ["automation_check"]
      };
    case "automation_rules":
      return {
        ...base,
        humanReadableId: `RULE-${row.id}`,
        displayName: row.name || `Automation Rule ${row.id}`,
        currentStatus: Number(row.is_active) === 1 ? "active" : "inactive",
        lifecycleStage: Number(row.is_active) === 1 ? "active" : "inactive",
        ownerType: "department",
        ownerId: "operations",
        department: "operations",
        metadata: {
          trigger: row.trigger,
          runCount: Number(row.run_count || 0),
          active: Boolean(row.is_active)
        },
        tags: ["automation_rule"]
      };
    case "support_tickets":
      return {
        ...base,
        humanReadableId: row.ticket_id,
        displayName: row.subject || `Support Ticket ${row.id}`,
        currentStatus: row.status || "open",
        lifecycleStage: lifecycleFromStatus(row.status, "open"),
        ownerType: "customer",
        ownerId: row.customer_phone || null,
        department: "customer_success",
        metadata: {
          customerPhoneLast4: String(row.customer_phone || "").slice(-4),
          orderReference: row.order_id || "",
          assignedTo: row.assigned_to || "",
          hasReply: Boolean(row.reply)
        },
        tags: ["support_ticket"]
      };
    case "domain_departments":
      return {
        ...base,
        sourcePk: row.id,
        humanReadableId: row.department_key,
        displayName: row.display_name || row.department_key,
        currentStatus: row.status || "active",
        lifecycleStage: row.status || "active",
        ownerType: row.owner_type || "human",
        ownerId: row.owner_id || "owner",
        department: row.department_key,
        metadata: {
          category: row.category,
          mission: row.mission,
          healthStatus: row.health_status,
          healthScore: row.health_score
        },
        tags: ["department", row.category || "enterprise"]
      };
    default:
      throw new Error(`Unsupported source table: ${sourceTable}.`);
  }
}

function safeArrayCount(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

const SOURCE_SELECTS = Object.freeze({
  users: "SELECT id, name, phone, email, address, auth_provider, phone_verified, email_verified, account_status, created_at, updated_at FROM users",
  services: "SELECT id, slug, name, category, active, sub_category, pricing_model, created_at, last_updated AS updated_at FROM services",
  service_pricing_variants: "SELECT id, parent_slug, variant_slug, service_name, variant_name, category, sub_category, status, active, created_at, last_updated AS updated_at FROM service_pricing_variants",
  products: "SELECT id, slug, name, category, active, created_at, created_at AS updated_at FROM products",
  orders: "SELECT id, order_id, user_id, order_type, source_channel, status, currency, bot_check_status, assignment_priority, assigned_to, created_at, updated_at FROM orders",
  order_items: "SELECT id, order_id, item_type, item_slug, item_name, quantity, created_at, created_at AS updated_at FROM order_items",
  payments: "SELECT id, payment_id, order_id, gateway, method, status, amount_paise, currency, gateway_order_id, gateway_payment_id, created_at, updated_at FROM payments",
  transactions: "SELECT id, transaction_id, order_id, payment_id, gateway, method, status, amount_paise, currency, gateway_reference, created_at, created_at AS updated_at FROM transactions",
  invoices: "SELECT id, invoice_no, order_id, transaction_id, pdf_path, status, issued_at, issued_at AS created_at, issued_at AS updated_at FROM invoices",
  refunds: "SELECT id, refund_id, order_id, payment_id, transaction_id, gateway, refund_type, amount_paise, status, created_at, updated_at FROM refunds",
  payment_logs: "SELECT id, order_id, payment_id, gateway, level, event, payload_json, created_at, created_at AS updated_at FROM payment_logs",
  webhook_logs: "SELECT id, gateway, event, transaction_id, status, signature_valid, processed_at, processed_at AS created_at, processed_at AS updated_at FROM webhook_logs",
  notifications: "SELECT id, event, channel, recipient, status, provider_response_json, created_at, sent_at AS updated_at FROM notifications",
  staff: "SELECT id, name, phone, email, role, skills, is_active, max_tasks, created_at, updated_at FROM staff",
  task_assignments: "SELECT id, order_id, staff_id, assigned_at, accepted_at, completed_at, status, priority, admin_notes, assigned_at AS created_at, updated_at FROM task_assignments",
  order_documents: "SELECT id, order_id, doc_type, file_name, mime_type, uploaded_by, verified, created_at, verified_at AS updated_at FROM order_documents",
  bot_checks: "SELECT id, order_id, check_type, status, payment_ok, docs_ok, fields_ok, reminder_sent, auto_assigned, checked_at, checked_at AS created_at, checked_at AS updated_at FROM bot_checks",
  automation_rules: "SELECT id, name, trigger, is_active, run_count, last_run_at, created_at, updated_at FROM automation_rules",
  support_tickets: "SELECT id, ticket_id, customer_phone, customer_name, subject, order_id, status, assigned_to, reply, created_at, updated_at FROM support_tickets",
  domain_departments: "SELECT id, department_key, display_name, category, mission, status, health_status, health_score, owner_type, owner_id, created_at, updated_at FROM domain_departments"
});

const REGISTRATION_SQL = `
  INSERT INTO universal_objects (
    universal_uuid, object_type, source_table, source_pk, human_readable_id, display_name, description,
    current_status, lifecycle_stage, owner_type, owner_id, department, created_by_type, created_by_id,
    priority, risk_level, visibility, permissions_json, metadata_json, tags_json, health_score,
    ai_context_enabled, version, source_created_at, source_updated_at, last_activity_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_table, source_pk) DO UPDATE SET
    object_type = excluded.object_type,
    human_readable_id = excluded.human_readable_id,
    display_name = excluded.display_name,
    description = excluded.description,
    current_status = excluded.current_status,
    lifecycle_stage = excluded.lifecycle_stage,
    owner_type = excluded.owner_type,
    owner_id = excluded.owner_id,
    department = excluded.department,
    priority = excluded.priority,
    risk_level = excluded.risk_level,
    visibility = excluded.visibility,
    permissions_json = excluded.permissions_json,
    metadata_json = excluded.metadata_json,
    tags_json = excluded.tags_json,
    health_score = excluded.health_score,
    ai_context_enabled = excluded.ai_context_enabled,
    source_created_at = excluded.source_created_at,
    source_updated_at = excluded.source_updated_at,
    last_activity_at = excluded.last_activity_at,
    updated_at = CURRENT_TIMESTAMP
`;

function registerPayload(dbConn, payloadInput) {
  const payload = normalizePayload(payloadInput);
  const before = getUniversalObject(dbConn, payload.sourceTable, payload.sourcePk);
  dbConn.prepare(REGISTRATION_SQL).run(
    payload.universalUuid,
    payload.objectType,
    payload.sourceTable,
    payload.sourcePk,
    payload.humanReadableId,
    payload.displayName,
    payload.description,
    payload.currentStatus,
    payload.lifecycleStage,
    payload.ownerType,
    payload.ownerId,
    payload.department,
    payload.createdByType,
    payload.createdById,
    payload.priority,
    payload.riskLevel,
    payload.visibility,
    payload.permissionsJson,
    payload.metadataJson,
    payload.tagsJson,
    payload.healthScore,
    payload.aiContextEnabled,
    payload.version,
    payload.sourceCreatedAt,
    payload.sourceUpdatedAt,
    payload.lastActivityAt
  );
  return before ? "updated" : "registered";
}

function registerSourceRow(dbConn, sourceTable, row) {
  return registerPayload(dbConn, sourcePayload(sourceTable, row));
}

function registerSourceRecord(dbConn, sourceTable, sourcePk) {
  if (!SOURCE_SELECTS[sourceTable]) throw new Error(`Unsupported source table: ${sourceTable}.`);
  if (!tableExists(dbConn, sourceTable)) return null;
  const row = dbConn.prepare(`${SOURCE_SELECTS[sourceTable]} WHERE id = ? LIMIT 1`).get(sourcePk);
  if (!row) return null;
  registerSourceRow(dbConn, sourceTable, row);
  return getUniversalObjectPayload(dbConn, sourceTable, sourcePk);
}

function processSource(dbConn, sourceTable, report) {
  report.totals.sources += 1;
  if (!tableExists(dbConn, sourceTable)) {
    addWarning(report, sourceTable, "Source table does not exist; registration skipped.");
    return;
  }

  let rows;
  try {
    rows = dbConn.prepare(SOURCE_SELECTS[sourceTable]).all();
  } catch (error) {
    addFailure(report, sourceTable, null, error);
    return;
  }

  for (const row of rows) {
    report.totals.records += 1;
    try {
      const result = registerSourceRow(dbConn, sourceTable, row);
      if (result === "registered") report.totals.registered += 1;
      if (result === "updated") report.totals.updated += 1;
    } catch (error) {
      addFailure(report, sourceTable, row.id, error);
    }
  }
}

function uuidFor(dbConn, sourceTable, sourcePk) {
  const row = getUniversalObject(dbConn, sourceTable, sourcePk);
  return row ? row.universal_uuid : null;
}

function insertRelationship(dbConn, report, fromTable, fromPk, toTable, toPk, relationshipType, relationshipLabel, metadata = {}) {
  try {
    const fromUuid = uuidFor(dbConn, fromTable, fromPk);
    const toUuid = uuidFor(dbConn, toTable, toPk);
    if (!fromUuid || !toUuid) {
      addWarning(report, `${fromTable}:${toTable}`, `Relationship skipped because object identity is missing for ${fromPk} -> ${toPk}.`);
      return;
    }
    const result = dbConn.prepare(`
      INSERT OR IGNORE INTO universal_object_relationships (
        from_object_uuid, to_object_uuid, relationship_type, relationship_label, direction,
        strength, metadata_json, created_by_type
      )
      VALUES (?, ?, ?, ?, 'forward', 1, ?, 'migration')
    `).run(fromUuid, toUuid, relationshipType, relationshipLabel, safeJson(metadata, {}));
    if (Number(result.changes || 0) > 0) report.totals.relationships += 1;
  } catch (error) {
    addFailure(report, `${fromTable}:${toTable}`, `${fromPk}:${toPk}`, error);
  }
}

function processRelationshipQuery(dbConn, report, options) {
  const { fromTable, toTable, relationshipType, relationshipLabel, sql } = options;
  if (!tableExists(dbConn, fromTable) || !tableExists(dbConn, toTable)) return;
  let rows;
  try {
    rows = dbConn.prepare(sql).all();
  } catch (error) {
    addFailure(report, `${fromTable}:${toTable}`, null, error);
    return;
  }
  for (const row of rows) {
    insertRelationship(
      dbConn,
      report,
      fromTable,
      row.from_pk,
      toTable,
      row.to_pk,
      relationshipType,
      relationshipLabel,
      row.metadata || {}
    );
  }
}

function createBaselineRelationships(dbConn, report) {
  const relationships = [
    {
      fromTable: "users",
      toTable: "orders",
      relationshipType: "customer_has_order",
      relationshipLabel: "Customer has order",
      sql: "SELECT user_id AS from_pk, id AS to_pk FROM orders"
    },
    {
      fromTable: "orders",
      toTable: "order_items",
      relationshipType: "order_has_item",
      relationshipLabel: "Order has item",
      sql: "SELECT order_id AS from_pk, id AS to_pk FROM order_items"
    },
    {
      fromTable: "orders",
      toTable: "payments",
      relationshipType: "order_has_payment",
      relationshipLabel: "Order has payment",
      sql: "SELECT order_id AS from_pk, id AS to_pk FROM payments"
    },
    {
      fromTable: "orders",
      toTable: "order_documents",
      relationshipType: "order_has_document",
      relationshipLabel: "Order has document",
      sql: "SELECT order_id AS from_pk, id AS to_pk FROM order_documents"
    },
    {
      fromTable: "orders",
      toTable: "task_assignments",
      relationshipType: "order_has_assignment",
      relationshipLabel: "Order has assignment",
      sql: "SELECT order_id AS from_pk, id AS to_pk FROM task_assignments"
    },
    {
      fromTable: "orders",
      toTable: "invoices",
      relationshipType: "order_has_invoice",
      relationshipLabel: "Order has invoice",
      sql: "SELECT order_id AS from_pk, id AS to_pk FROM invoices"
    },
    {
      fromTable: "payments",
      toTable: "refunds",
      relationshipType: "payment_has_refund",
      relationshipLabel: "Payment has refund",
      sql: "SELECT payment_id AS from_pk, id AS to_pk FROM refunds"
    }
  ];

  for (const relationship of relationships) {
    processRelationshipQuery(dbConn, report, relationship);
  }
}

function createBaselineTimeline(dbConn, report) {
  const rows = dbConn.prepare(`
    SELECT universal_uuid, source_table, source_pk, display_name, source_created_at, created_at
    FROM universal_objects
  `).all();

  for (const row of rows) {
    try {
      const result = dbConn.prepare(`
        INSERT OR IGNORE INTO universal_object_timeline (
          object_uuid, action, title, summary, actor_type, actor_id, source_table, source_pk,
          metadata_json, occurred_at
        )
        VALUES (?, 'registered', 'Universal object registered', ?, 'migration', ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      `).run(
        row.universal_uuid,
        `Existing ${row.source_table} record registered for the Universal Business Object Foundation.`,
        REGISTRATION_ACTOR,
        row.source_table,
        row.source_pk,
        safeJson({ displayName: row.display_name }, {}),
        row.source_created_at || row.created_at
      );
      if (Number(result.changes || 0) > 0) report.totals.timeline += 1;
    } catch (error) {
      addFailure(report, "universal_object_timeline", row.source_pk, error);
    }
  }
}

function syncUniversalObjects(dbConn, { reportPath = null } = {}) {
  const report = createReport();
  for (const sourceTable of Object.keys(SOURCE_SELECTS)) {
    processSource(dbConn, sourceTable, report);
  }
  createBaselineRelationships(dbConn, report);
  createBaselineTimeline(dbConn, report);
  report.finishedAt = nowIso();
  writeReport(report, reportPath);
  return report;
}

module.exports = {
  syncUniversalObjects,
  registerSourceRecord,
  getUniversalObject,
  getUniversalObjectPayload
};
