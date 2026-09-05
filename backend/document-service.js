"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const db = require("./db");
const enterpriseEventService = require("./events/enterprise-event-service");
const universalObjectRepository = require("./repositories/universal-object-repository");

const LIFECYCLE_TRANSITIONS = Object.freeze({
  Draft: ["Uploaded"],
  Uploaded: ["Pending Verification"],
  "Pending Verification": ["Verified", "Rejected"],
  Verified: ["Expired", "Archived"],
  Rejected: ["Archived"],
  Expired: ["Archived"],
  Archived: []
});

class DocumentLifecycleError extends Error {
  constructor(message) {
    super(message);
    this.name = "DocumentLifecycleError";
    this.code = "DOCUMENT_LIFECYCLE_CONFLICT";
  }
}

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value, fallback = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function json(value, fallback = {}) {
  return JSON.stringify(value === undefined ? fallback : value);
}

function cleanHash(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("contentHash must be a SHA-256 hexadecimal value.");
  }
  return normalized;
}

function fileHash(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeReport(report, reportPath) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function inTransaction(dbConn, callback) {
  dbConn.exec("BEGIN IMMEDIATE");
  try {
    const result = callback(dbConn);
    dbConn.exec("COMMIT");
    return result;
  } catch (error) {
    dbConn.exec("ROLLBACK");
    throw error;
  }
}

function findObjectUuid(dbConn, sourceTable, sourcePk) {
  let object = dbConn.prepare(
    "SELECT universal_uuid FROM universal_objects WHERE source_table = ? AND source_pk = ?"
  ).get(sourceTable, String(sourcePk));
  if (!object) {
    try {
      universalObjectRepository.registerSourceRecord(dbConn, sourceTable, sourcePk);
      object = dbConn.prepare(
        "SELECT universal_uuid FROM universal_objects WHERE source_table = ? AND source_pk = ?"
      ).get(sourceTable, String(sourcePk));
    } catch (error) {
      console.warn(`[document-registry] object link skipped for ${sourceTable}:${sourcePk}:`, error.message);
    }
  }
  return object?.universal_uuid || null;
}

function getOrderContext(dbConn, orderOrId) {
  const value = typeof orderOrId === "object" ? orderOrId.id || orderOrId.order_id : orderOrId;
  const numericId = Number(value) || 0;
  const publicId = String(typeof orderOrId === "object" ? orderOrId.order_id || "" : orderOrId || "").trim();
  const order = dbConn.prepare(`
    SELECT o.*, u.id AS customer_user_id
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = ? OR o.order_id = ?
    LIMIT 1
  `).get(numericId, publicId);
  if (!order) throw new Error("Order not found.");
  return order;
}

function addLifecycleEvent(dbConn, input) {
  dbConn.prepare(`
    INSERT INTO document_lifecycle_events
      (document_id, document_version_id, action, actor_type, actor_id, reason,
       previous_lifecycle_status, new_lifecycle_status,
       previous_operational_status, new_operational_status,
       linked_object_type, linked_object_uuid, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.documentId,
    input.documentVersionId || null,
    input.action,
    input.actorType || "system",
    input.actorId === undefined || input.actorId === null ? null : String(input.actorId),
    input.reason || null,
    input.previousLifecycleStatus || null,
    input.newLifecycleStatus || null,
    input.previousOperationalStatus || null,
    input.newOperationalStatus || null,
    input.linkedObjectType || null,
    input.linkedObjectUuid || null,
    json(input.metadata || {})
  );
  const registry = dbConn.prepare(`
    SELECT document_uuid, operational_status
    FROM document_registry
    WHERE id = ?
  `).get(input.documentId);
  enterpriseEventService.publishEventWithDb(dbConn, {
    eventKey: "document.lifecycle.changed",
    publisherKey: "document_registry_publisher",
    linkedObjectType: "Document",
    linkedObjectUuid: registry?.document_uuid || null,
    sourceTable: "document_registry",
    sourcePk: input.documentId,
    correlationId: registry?.document_uuid || `document:${input.documentId}`,
    processContextKey: "document_lifecycle_context",
    occurredAt: nowIso(),
    actorType: input.actorType || "system",
    actorId: input.actorId === undefined || input.actorId === null ? null : String(input.actorId),
    payload: {
      action: input.action,
      reason: input.reason || null,
      previousLifecycleStatus: input.previousLifecycleStatus || null,
      newLifecycleStatus: input.newLifecycleStatus || null,
      previousOperationalStatus: input.previousOperationalStatus || null,
      newOperationalStatus: input.newOperationalStatus || registry?.operational_status || null,
      linkedObjectType: input.linkedObjectType || null,
      linkedObjectUuid: input.linkedObjectUuid || null,
      metadata: input.metadata || {}
    }
  });
}

function transitionLifecycle(dbConn, version, nextStatus, event) {
  const current = version.lifecycle_status;
  if (current === nextStatus) return version;
  if (!(LIFECYCLE_TRANSITIONS[current] || []).includes(nextStatus)) {
    throw new DocumentLifecycleError(`Illegal document lifecycle transition rejected: ${current} to ${nextStatus}.`);
  }
  dbConn.prepare(`
    UPDATE document_versions
    SET lifecycle_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND active = 1
  `).run(nextStatus, version.id);
  addLifecycleEvent(dbConn, {
    ...event,
    documentId: version.document_id,
    documentVersionId: version.id,
    previousLifecycleStatus: current,
    newLifecycleStatus: nextStatus
  });
  return dbConn.prepare("SELECT * FROM document_versions WHERE id = ?").get(version.id);
}

function createUsageLink(dbConn, input) {
  if (!input.linkedObjectUuid) return;
  const update = dbConn.prepare(`
    UPDATE document_usage_links
    SET document_version_id = ?,
        reuse_eligible = ?,
        metadata_json = ?,
        linked_at = CURRENT_TIMESTAMP
    WHERE document_id = ?
      AND linked_object_type = ?
      AND linked_object_uuid = ?
      AND usage_context = ?
      AND active = 1
  `).run(
    input.documentVersionId || null,
    input.reuseEligible ? 1 : 0,
    json(input.metadata || {}),
    input.documentId,
    input.linkedObjectType,
    input.linkedObjectUuid,
    input.usageContext || "attachment"
  );
  if (update.changes > 0) return;
  dbConn.prepare(`
    INSERT INTO document_usage_links
      (document_id, document_version_id, linked_object_type, linked_object_uuid,
       usage_context, reuse_eligible, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.documentId,
    input.documentVersionId || null,
    input.linkedObjectType,
    input.linkedObjectUuid,
    input.usageContext || "attachment",
    input.reuseEligible ? 1 : 0,
    json(input.metadata || {})
  );
}

function linkCurrentEnterpriseObjects(dbConn, registry, version, order) {
  const orderObjectUuid = findObjectUuid(dbConn, "orders", order.id);
  createUsageLink(dbConn, {
    documentId: registry.id,
    documentVersionId: version.id,
    linkedObjectType: "order",
    linkedObjectUuid: orderObjectUuid,
    metadata: { source: "order_documents_bridge", orderId: order.order_id }
  });

  const customerObjectUuid = findObjectUuid(dbConn, "users", order.user_id);
  createUsageLink(dbConn, {
    documentId: registry.id,
    documentVersionId: version.id,
    linkedObjectType: "customer",
    linkedObjectUuid: customerObjectUuid,
    metadata: { source: "order_owner" }
  });

  const services = dbConn.prepare(`
    SELECT DISTINCT s.id
    FROM order_items oi
    JOIN services s ON s.slug = oi.item_slug
    WHERE oi.order_id = ? AND oi.item_type = 'service'
  `).all(order.id);
  for (const service of services) {
    createUsageLink(dbConn, {
      documentId: registry.id,
      documentVersionId: version.id,
      linkedObjectType: "service",
      linkedObjectUuid: findObjectUuid(dbConn, "services", service.id),
      metadata: { source: "order_service_item", orderId: order.order_id }
    });
  }

  return { orderObjectUuid, customerObjectUuid };
}

function createRegistry(dbConn, input, order, contentHash) {
  const documentUuid = crypto.randomUUID();
  const customerObjectUuid = findObjectUuid(dbConn, "users", order.user_id);
  const result = dbConn.prepare(`
    INSERT INTO document_registry
      (document_uuid, customer_user_id, customer_object_uuid, document_type, display_name,
       operational_status, canonical_content_hash, hash_status,
       retention_policy, retention_category, retention_until, reuse_eligible, metadata_json)
    VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    documentUuid,
    order.user_id,
    customerObjectUuid,
    input.docType,
    input.fileName,
    contentHash,
    contentHash ? "Available" : (input.filePath || input.fileUrl ? "Pending Content" : "Unavailable"),
    input.retentionPolicy || null,
    input.retentionCategory || null,
    input.retentionUntil || null,
    input.reuseEligible ? 1 : 0,
    json({
      source: input.source || "document_upload",
      duplicateDetection: "not_implemented",
      operationalStatusEngine: "not_implemented",
      verificationCapabilities: {
        human: "supported",
        ai: "future_placeholder",
        government: "future_placeholder"
      }
    })
  );
  return dbConn.prepare("SELECT * FROM document_registry WHERE id = ?").get(Number(result.lastInsertRowid));
}

function createVersion(dbConn, registry, input, contentHash) {
  const current = dbConn.prepare(
    "SELECT * FROM document_versions WHERE document_id = ? AND active = 1"
  ).get(registry.id);
  let versionNumber = 1;
  if (current) {
    versionNumber = Number(current.version_number) + 1;
    dbConn.prepare("UPDATE document_versions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(current.id);
  }
  const result = dbConn.prepare(`
    INSERT INTO document_versions
      (document_id, version_number, lifecycle_status, verification_status, active,
       file_name, file_path, file_url, mime_type, file_size_bytes,
       content_hash, issue_date, expiry_date, replacement_reason,
       created_by_type, created_by_id, metadata_json)
    VALUES (?, ?, 'Draft', 'Not Verified', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    registry.id,
    versionNumber,
    input.fileName,
    input.filePath || null,
    input.fileUrl || null,
    input.mimeType || null,
    input.fileSizeBytes || null,
    contentHash,
    input.issueDate || null,
    input.expiryDate || null,
    input.replacementReason || null,
    input.actorType || "system",
    input.actorId === undefined || input.actorId === null ? null : String(input.actorId),
    json({ source: input.source || "document_upload", originalFileProtected: true })
  );
  let version = dbConn.prepare("SELECT * FROM document_versions WHERE id = ?").get(Number(result.lastInsertRowid));
  if (current) {
    addLifecycleEvent(dbConn, {
      documentId: registry.id,
      documentVersionId: version.id,
      action: "Replacement",
      actorType: input.actorType,
      actorId: input.actorId,
      reason: input.replacementReason || "New document version uploaded.",
      previousLifecycleStatus: current.lifecycle_status,
      newLifecycleStatus: "Draft",
      metadata: { previousVersionId: current.id, previousVersionNumber: current.version_number }
    });
  }
  version = transitionLifecycle(dbConn, version, "Uploaded", {
    action: "Upload",
    actorType: input.actorType,
    actorId: input.actorId,
    reason: input.reason || "Document uploaded.",
    metadata: { versionNumber }
  });
  version = transitionLifecycle(dbConn, version, "Pending Verification", {
    action: "Verification",
    actorType: "system",
    actorId: "document-registry",
    reason: "Queued for human verification.",
    metadata: { verificationBoundary: "human_only" }
  });
  dbConn.prepare(`
    UPDATE document_versions
    SET verification_status = 'Pending Human Verification', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(version.id);
  return dbConn.prepare("SELECT * FROM document_versions WHERE id = ?").get(version.id);
}

function bridgeMetadata(input) {
  return {
    source: input.source || "document_upload",
    registrySourceOfTruth: true,
    orderDocumentsRole: "backward_compatible_operational_bridge"
  };
}

function insertOperationalBridge(dbConn, registry, version, order, input) {
  const result = dbConn.prepare(`
    INSERT INTO order_documents
      (order_id, doc_type, file_name, file_path, file_url, mime_type, file_size_bytes,
       uploaded_by, verified, document_uuid, document_version_id,
       lifecycle_status, operational_status, verification_status, content_hash,
       metadata_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    order.id,
    input.docType,
    input.fileName,
    input.filePath || null,
    input.fileUrl || null,
    input.mimeType || null,
    input.fileSizeBytes || null,
    input.uploadedBy || "customer",
    registry.document_uuid,
    version.id,
    version.lifecycle_status,
    registry.operational_status,
    version.verification_status,
    version.content_hash || null,
    json(bridgeMetadata(input))
  );
  const bridgeId = Number(result.lastInsertRowid);
  try {
    universalObjectRepository.registerSourceRecord(dbConn, "order_documents", bridgeId);
  } catch (error) {
    console.warn(`[document-registry] bridge object registration skipped for ${bridgeId}:`, error.message);
  }
  return bridgeId;
}

function updateOperationalBridge(dbConn, bridgeId, registry, version, input) {
  dbConn.prepare(`
    UPDATE order_documents
    SET document_uuid = ?, document_version_id = ?, lifecycle_status = ?,
        operational_status = ?, verification_status = ?, content_hash = ?,
        metadata_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    registry.document_uuid,
    version.id,
    version.lifecycle_status,
    registry.operational_status,
    version.verification_status,
    version.content_hash || null,
    json(bridgeMetadata(input)),
    bridgeId
  );
  try {
    universalObjectRepository.registerSourceRecord(dbConn, "order_documents", bridgeId);
  } catch (error) {
    console.warn(`[document-registry] bridge object registration skipped for ${bridgeId}:`, error.message);
  }
}

function registerUpload(input, options = {}) {
  const dbConn = options.dbConn || db.getDb();
  return inTransaction(dbConn, (tx) => {
    const order = getOrderContext(tx, input.orderId);
    const suppliedHash = cleanHash(input.contentHash);
    const contentHash = suppliedHash || fileHash(input.filePath);
    let registry = null;
    if (input.documentUuid) {
      registry = tx.prepare("SELECT * FROM document_registry WHERE document_uuid = ?")
        .get(String(input.documentUuid));
      if (!registry) throw new Error("Registered document not found.");
      if (registry.customer_user_id && Number(registry.customer_user_id) !== Number(order.user_id)) {
        throw new Error("Registered document does not belong to this customer.");
      }
    }
    if (!registry) registry = createRegistry(tx, input, order, contentHash);
    const version = createVersion(tx, registry, input, contentHash);
    const links = linkCurrentEnterpriseObjects(tx, registry, version, order);
    const bridgeId = insertOperationalBridge(tx, registry, version, order, input);
    return {
      bridgeId,
      documentUuid: registry.document_uuid,
      versionId: version.id,
      versionNumber: version.version_number,
      lifecycleStatus: version.lifecycle_status,
      operationalStatus: registry.operational_status,
      verificationStatus: version.verification_status,
      linkedOrderUuid: links.orderObjectUuid
    };
  });
}

function registerExistingBridge(dbConn, bridge) {
  const order = getOrderContext(dbConn, bridge.order_id);
  const contentHash = cleanHash(bridge.content_hash) || fileHash(bridge.file_path);
  const input = {
    docType: bridge.doc_type,
    fileName: bridge.file_name,
    filePath: bridge.file_path,
    fileUrl: bridge.file_url,
    mimeType: bridge.mime_type,
    fileSizeBytes: bridge.file_size_bytes,
    uploadedBy: bridge.uploaded_by,
    actorType: "migration",
    actorId: "phase-2-milestone-2.5",
    source: "existing_order_document_backfill"
  };
  const registry = createRegistry(dbConn, input, order, contentHash);
  let version = createVersion(dbConn, registry, input, contentHash);
  if (Number(bridge.verified) === 1) {
    version = verifyVersion(dbConn, registry, version, true, {
      actorType: "migration",
      actorId: "phase-2-milestone-2.5",
      reason: "Legacy verified flag preserved during registry backfill.",
      source: "legacy_verified_flag"
    });
  }
  linkCurrentEnterpriseObjects(dbConn, registry, version, order);
  updateOperationalBridge(dbConn, bridge.id, registry, version, input);
  return { registry, version };
}

function ensureRegisteredBridge(dbConn, bridgeId) {
  let bridge = dbConn.prepare("SELECT * FROM order_documents WHERE id = ?").get(Number(bridgeId));
  if (!bridge) throw new Error("Document not found.");
  if (!bridge.document_uuid || !bridge.document_version_id) {
    registerExistingBridge(dbConn, bridge);
    bridge = dbConn.prepare("SELECT * FROM order_documents WHERE id = ?").get(Number(bridgeId));
  }
  const registry = dbConn.prepare("SELECT * FROM document_registry WHERE document_uuid = ?")
    .get(bridge.document_uuid);
  const version = dbConn.prepare("SELECT * FROM document_versions WHERE id = ?")
    .get(bridge.document_version_id);
  if (!registry || !version) throw new Error("Document Registry linkage is incomplete.");
  return { bridge, registry, version };
}

function verifyVersion(dbConn, registry, version, approved, options = {}) {
  const targetLifecycle = approved ? "Verified" : "Rejected";
  const targetVerification = approved ? "Human Verified" : "Rejected";
  const action = approved ? "Verification" : "Rejection";
  const updated = transitionLifecycle(dbConn, version, targetLifecycle, {
    action,
    actorType: options.actorType || "human",
    actorId: options.actorId || "admin",
    reason: options.reason || (approved ? "Human verification approved." : "Human verification rejected."),
    metadata: { verificationType: "Human Verified", source: options.source || "admin_document_review" }
  });
  dbConn.prepare(`
    UPDATE document_versions
    SET verification_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(targetVerification, updated.id);
  dbConn.prepare(`
    INSERT INTO document_verification_records
      (document_id, document_version_id, verification_type, verification_status,
       actor_type, actor_id, reason, metadata_json)
    VALUES (?, ?, 'Human Verified', ?, ?, ?, ?, ?)
  `).run(
    registry.id,
    updated.id,
    approved ? "Verified" : "Rejected",
    options.actorType || "human",
    options.actorId || "admin",
    options.reason || null,
    json({ source: options.source || "admin_document_review", aiVerification: "not_implemented", governmentVerification: "not_implemented" })
  );
  return dbConn.prepare("SELECT * FROM document_versions WHERE id = ?").get(updated.id);
}

function verifyOrderDocument(bridgeId, approved, options = {}) {
  const dbConn = options.dbConn || db.getDb();
  return inTransaction(dbConn, (tx) => {
    const current = ensureRegisteredBridge(tx, bridgeId);
    let version = current.version;
    if ((approved && version.lifecycle_status === "Verified") || (!approved && version.lifecycle_status === "Rejected")) {
      return getDocumentByBridgeId(bridgeId, { dbConn: tx, includeInternal: true });
    }
    version = verifyVersion(tx, current.registry, version, approved, options);
    tx.prepare(`
      UPDATE order_documents
      SET verified = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP,
          lifecycle_status = ?, operational_status = ?, verification_status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      approved ? 1 : 0,
      options.actorId || null,
      version.lifecycle_status,
      current.registry.operational_status,
      version.verification_status,
      Number(bridgeId)
    );
    return getDocumentByBridgeId(bridgeId, { dbConn: tx, includeInternal: true });
  });
}

function documentQuery(whereClause) {
  return `
    SELECT od.*, o.order_id AS public_order_id, o.user_id, u.name AS customer_name, u.phone AS customer_phone,
           dr.id AS registry_id, dr.operational_status AS registry_operational_status,
           dr.retention_policy, dr.retention_category, dr.retention_until,
           dr.reuse_eligible, dr.hash_status,
           dv.version_number, dv.lifecycle_status AS version_lifecycle_status,
           dv.verification_status AS version_verification_status,
           dv.active AS version_active, dv.issue_date, dv.expiry_date,
           od.customer_hidden_at, od.customer_hidden_reason,
           drq.status AS customer_deletion_status, drq.review_due_at AS customer_deletion_review_due_at
    FROM order_documents od
    JOIN orders o ON o.id = od.order_id
    JOIN users u ON u.id = o.user_id
    LEFT JOIN document_registry dr ON dr.document_uuid = od.document_uuid
    LEFT JOIN document_versions dv ON dv.id = od.document_version_id
    LEFT JOIN customer_data_deletion_requests drq ON drq.id = od.customer_delete_request_id
    ${whereClause}
  `;
}

function projectDocument(row, options = {}) {
  if (!row) return null;
  const exposeInternal = options.admin || options.includeInternal;
  const projected = {
    id: row.id,
    order_id: options.admin ? row.public_order_id : row.order_id,
    doc_type: row.doc_type,
    file_name: row.file_name,
    mime_type: row.mime_type,
    file_size_bytes: row.file_size_bytes,
    uploaded_by: row.uploaded_by,
    verified: row.verified,
    verified_at: row.verified_at,
    created_at: row.created_at,
    version_number: row.version_number || 1,
    lifecycle_status: row.version_lifecycle_status || row.lifecycle_status || "Pending Verification",
    operational_status: row.registry_operational_status || row.operational_status || "Active",
    verification_status: row.version_verification_status || row.verification_status || "Pending Human Verification",
    issue_date: row.issue_date || null,
    expiry_date: row.expiry_date || null
  };
  if (exposeInternal) {
    projected.order_db_id = row.order_id;
    projected.file_path = row.file_path;
    projected.file_url = row.file_url;
    projected.verified_by = row.verified_by;
    projected.document_uuid = row.document_uuid;
    projected.document_version_id = row.document_version_id;
    projected.version_active = row.version_active === undefined || row.version_active === null ? 1 : row.version_active;
  }
  if (row.customer_name !== undefined) projected.customer_name = row.customer_name;
  if (row.customer_phone !== undefined) projected.customer_phone = row.customer_phone;
  if (exposeInternal) {
    projected.content_hash = row.content_hash || null;
    projected.hash_status = row.hash_status || "Pending Content";
    projected.retention_policy = row.retention_policy || null;
    projected.retention_category = row.retention_category || null;
    projected.retention_until = row.retention_until || null;
    projected.reuse_eligible = Number(row.reuse_eligible || 0);
    projected.metadata = safeJson(row.metadata_json, {});
    projected.customer_hidden_at = row.customer_hidden_at || null;
    projected.customer_hidden_reason = row.customer_hidden_reason || null;
    projected.customer_deletion_status = row.customer_deletion_status || null;
    projected.customer_deletion_review_due_at = row.customer_deletion_review_due_at || null;
  }
  return projected;
}

function getDocumentByBridgeId(bridgeId, options = {}) {
  const dbConn = options.dbConn || db.getDb();
  const row = dbConn.prepare(`${documentQuery("WHERE od.id = ?")} LIMIT 1`).get(Number(bridgeId));
  return projectDocument(row, options);
}

function listAdminDocuments(options = {}) {
  const dbConn = options.dbConn || db.getDb();
  return dbConn.prepare(`${documentQuery("")} ORDER BY od.created_at DESC LIMIT ?`)
    .all(Number(options.limit || 100))
    .map((row) => projectDocument(row, { includeInternal: true, admin: true }));
}

function listOrderDocuments(orderOrId, options = {}) {
  const dbConn = options.dbConn || db.getDb();
  const order = getOrderContext(dbConn, orderOrId);
  return dbConn.prepare(`${documentQuery("WHERE od.order_id = ?")} ORDER BY od.created_at DESC`)
    .all(order.id)
    .map((row) => projectDocument(row, { includeInternal: options.includeInternal === true }));
}

function recordDocumentAction(bridgeId, action, options = {}) {
  if (!["View", "Download"].includes(action)) throw new Error("Unsupported document access action.");
  const dbConn = options.dbConn || db.getDb();
  return inTransaction(dbConn, (tx) => {
    const current = ensureRegisteredBridge(tx, bridgeId);
    addLifecycleEvent(tx, {
      documentId: current.registry.id,
      documentVersionId: current.version.id,
      action,
      actorType: options.actorType || "customer",
      actorId: options.actorId || current.bridge.user_id || null,
      reason: options.reason || `${action} requested through governed document access.`,
      previousLifecycleStatus: current.version.lifecycle_status,
      newLifecycleStatus: current.version.lifecycle_status,
      previousOperationalStatus: current.registry.operational_status,
      newOperationalStatus: current.registry.operational_status,
      metadata: { source: options.source || "customer_document_api" }
    });
    return true;
  });
}

function backfillExistingDocuments(options = {}) {
  const dbConn = options.dbConn || db.getDb();
  const report = {
    milestone: "Phase 2 - Milestone 2.5",
    name: "Document Registry Foundation Migration",
    startedAt: nowIso(),
    finishedAt: null,
    totals: { documents: 0, registeredOrVerified: 0, alreadyRegistered: 0, failures: 0 },
    failures: []
  };
  const documents = dbConn.prepare("SELECT * FROM order_documents ORDER BY id ASC").all();
  report.totals.documents = documents.length;
  for (const document of documents) {
    try {
      if (document.document_uuid && document.document_version_id) {
        report.totals.alreadyRegistered += 1;
        report.totals.registeredOrVerified += 1;
        continue;
      }
      inTransaction(dbConn, (tx) => registerExistingBridge(tx, document));
      report.totals.registeredOrVerified += 1;
    } catch (error) {
      report.totals.failures += 1;
      report.failures.push({
        orderDocumentId: document.id,
        orderId: document.order_id,
        fileName: document.file_name,
        message: error && error.message ? error.message : String(error)
      });
      console.warn(`[document-registry] backfill failed for order_documents:${document.id}:`, error.message);
    }
  }
  report.finishedAt = nowIso();
  writeReport(report, options.reportPath);
  return report;
}

module.exports = {
  DocumentLifecycleError,
  backfillExistingDocuments,
  getDocumentByBridgeId,
  listAdminDocuments,
  listOrderDocuments,
  recordDocumentAction,
  registerUpload,
  verifyOrderDocument
};
