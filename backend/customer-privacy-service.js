"use strict";

const crypto = require("node:crypto");
const db = require("./db");

const REVIEW_WINDOW_DAYS = 60;

function nowIso() { return new Date().toISOString(); }

function reviewDueIso() {
  return new Date(Date.now() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function stamp(dbConn, input) {
  const payload = input.payload || {};
  const payloadJson = JSON.stringify(payload);
  const payloadHash = crypto.createHash("sha256").update(payloadJson).digest("hex");
  dbConn.prepare(`
    INSERT INTO customer_privacy_audit_stamps
      (stamp_uuid, request_id, user_id, order_document_id, event_type, payload_hash, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    input.requestId || null,
    input.userId,
    input.orderDocumentId || null,
    input.eventType,
    payloadHash,
    payloadJson
  );
}

function customerFolderKey(userId) {
  return `CUST-${String(Number(userId)).padStart(6, "0")}`;
}

function documentForCustomer(dbConn, userId, documentId) {
  return dbConn.prepare(`
    SELECT od.*, o.user_id, o.order_id AS public_order_id
    FROM order_documents od
    JOIN orders o ON o.id = od.order_id
    WHERE od.id = ? AND o.user_id = ?
    LIMIT 1
  `).get(Number(documentId), Number(userId));
}

function requestDocumentHiding(userId, documentId, reason = "") {
  return db.withTransaction((dbConn) => {
    const document = documentForCustomer(dbConn, userId, documentId);
    if (!document) throw new Error("Document not found or does not belong to this customer.");
    const existing = dbConn.prepare(`
      SELECT * FROM customer_data_deletion_requests
      WHERE order_document_id = ? AND status IN ('requested', 'under_review', 'approved_for_purge', 'legal_hold')
      ORDER BY id DESC LIMIT 1
    `).get(document.id);
    if (existing) return existing;

    const reviewDueAt = reviewDueIso();
    const result = dbConn.prepare(`
      INSERT INTO customer_data_deletion_requests
        (request_uuid, user_id, order_document_id, review_due_at, requested_reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), Number(userId), document.id, reviewDueAt, String(reason || "").trim().slice(0, 500) || null);
    const requestId = Number(result.lastInsertRowid);
    dbConn.prepare(`
      UPDATE order_documents
      SET customer_hidden_at = CURRENT_TIMESTAMP,
          customer_hidden_reason = ?,
          customer_delete_request_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run("Customer requested removal from their view.", requestId, document.id);
    dbConn.prepare(`
      INSERT INTO google_drive_sync_jobs (order_document_id, user_id, customer_folder_key, status, last_error)
      VALUES (?, ?, ?, 'delete_queued', ?)
    `).run(document.id, Number(userId), customerFolderKey(userId), "Drive deletion will run only after an admin-approved purge and configured Drive connector.");
    stamp(dbConn, {
      requestId,
      userId,
      orderDocumentId: document.id,
      eventType: "customer_document_hidden_request",
      payload: {
        publicOrderId: document.public_order_id,
        documentType: document.doc_type,
        documentNameHash: crypto.createHash("sha256").update(String(document.file_name)).digest("hex"),
        requestedReason: String(reason || "").trim().slice(0, 500) || null,
        reviewDueAt,
        retention: "document access hidden immediately; security audit stamp retained"
      }
    });
    return dbConn.prepare("SELECT * FROM customer_data_deletion_requests WHERE id = ?").get(requestId);
  });
}

function listCustomerDocuments(userId) {
  const dbConn = db.getDb();
  return dbConn.prepare(`
    SELECT od.id, od.doc_type, od.file_name, od.mime_type, od.file_size_bytes, od.uploaded_by,
           od.verified, od.verified_at, od.created_at, od.lifecycle_status, od.verification_status,
           o.order_id AS order_id,
           dr.status AS deletion_status, dr.review_due_at AS deletion_review_due_at
    FROM order_documents od
    JOIN orders o ON o.id = od.order_id
    LEFT JOIN customer_data_deletion_requests dr ON dr.id = od.customer_delete_request_id
    WHERE o.user_id = ? AND od.customer_hidden_at IS NULL
    ORDER BY od.created_at DESC
  `).all(Number(userId));
}

function listCustomerInvoices(userId) {
  const dbConn = db.getDb();
  return dbConn.prepare(`
    SELECT i.invoice_no AS invoiceNo, o.order_id AS orderId, o.created_at AS createdAt,
           o.total_paise AS totalPaise, o.currency, o.payment_status AS paymentStatus
    FROM invoices i
    JOIN orders o ON o.id = i.order_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(Number(userId));
}

function listCustomerDeletionRequests(userId) {
  const dbConn = db.getDb();
  return dbConn.prepare(`
    SELECT r.*, od.file_name, od.doc_type, o.order_id AS order_id
    FROM customer_data_deletion_requests r
    JOIN order_documents od ON od.id = r.order_document_id
    JOIN orders o ON o.id = od.order_id
    WHERE r.user_id = ?
    ORDER BY r.requested_at DESC
  `).all(Number(userId));
}

function queueGoogleDriveDocumentSync(userId, documentId) {
  const dbConn = db.getDb();
  const existing = dbConn.prepare(`
    SELECT * FROM google_drive_sync_jobs
    WHERE order_document_id = ? AND status IN ('awaiting_file_transfer', 'queued', 'synced')
    ORDER BY id DESC LIMIT 1
  `).get(Number(documentId));
  if (existing) return existing;
  const result = dbConn.prepare(`
    INSERT INTO google_drive_sync_jobs (order_document_id, user_id, customer_folder_key, status, last_error)
    VALUES (?, ?, ?, 'awaiting_file_transfer', ?)
  `).run(
    Number(documentId),
    Number(userId),
    customerFolderKey(userId),
    "Secure file transfer and Google Drive service-account configuration are required before sync can start."
  );
  return dbConn.prepare("SELECT * FROM google_drive_sync_jobs WHERE id = ?").get(Number(result.lastInsertRowid));
}

function listAdminDeletionRequests(options = {}) {
  const dbConn = db.getDb();
  const limit = Math.min(500, Math.max(1, Number(options.limit || 100)));
  return dbConn.prepare(`
    SELECT r.*, od.file_name, od.doc_type, od.file_path, od.file_url, o.order_id AS order_id,
           u.name AS customer_name, u.phone AS customer_phone,
           (SELECT COUNT(*) FROM customer_privacy_audit_stamps s WHERE s.request_id = r.id) AS audit_stamp_count
    FROM customer_data_deletion_requests r
    JOIN order_documents od ON od.id = r.order_document_id
    JOIN orders o ON o.id = od.order_id
    JOIN users u ON u.id = r.user_id
    ORDER BY CASE WHEN r.status IN ('requested', 'under_review') THEN 0 ELSE 1 END, r.review_due_at ASC
    LIMIT ?
  `).all(limit);
}

function resolveDeletionRequest(requestId, action, options = {}) {
  const normalizedAction = String(action || "").trim();
  if (!['approve_purge', 'decline', 'legal_hold'].includes(normalizedAction)) throw new Error("Unsupported deletion request action.");
  const actor = String(options.actor || "admin").trim() || "admin";
  const note = String(options.note || "").trim().slice(0, 1000) || null;
  return db.withTransaction((dbConn) => {
    const request = dbConn.prepare(`
      SELECT r.*, od.file_path, od.file_url, od.file_name
      FROM customer_data_deletion_requests r
      JOIN order_documents od ON od.id = r.order_document_id
      WHERE r.id = ?
    `).get(Number(requestId));
    if (!request) throw new Error("Deletion request not found.");
    if (!['requested', 'under_review', 'approved_for_purge', 'legal_hold'].includes(request.status)) {
      throw new Error("This deletion request has already been finalized.");
    }
    if (normalizedAction === 'decline' || normalizedAction === 'legal_hold') {
      const status = normalizedAction === 'decline' ? 'declined' : 'legal_hold';
      dbConn.prepare(`
        UPDATE customer_data_deletion_requests
        SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, review_note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, actor, note, request.id);
      stamp(dbConn, { requestId: request.id, userId: request.user_id, orderDocumentId: request.order_document_id,
        eventType: status === 'declined' ? 'admin_deletion_request_declined' : 'admin_legal_hold_applied',
        payload: { actor, note, status, fileNameHash: crypto.createHash('sha256').update(String(request.file_name)).digest('hex') }
      });
      return dbConn.prepare("SELECT * FROM customer_data_deletion_requests WHERE id = ?").get(request.id);
    }

    // This request path deliberately never unlinks a filesystem path inside a
    // database transaction. The registry is detached immediately, while a
    // managed-storage/Drive purge worker performs the physical deletion after
    // it can write its own auditable completion result.
    dbConn.prepare(`
      UPDATE order_documents
      SET file_path = NULL, file_url = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(request.order_document_id);
    dbConn.prepare(`
      UPDATE customer_data_deletion_requests
      SET status = 'completed', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?, review_note = ?,
          completed_at = CURRENT_TIMESTAMP, file_purged_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(actor, note, request.id);
    dbConn.prepare(`
      UPDATE google_drive_sync_jobs
      SET status = 'delete_queued', updated_at = CURRENT_TIMESTAMP,
          last_error = 'Awaiting configured Google Drive connector and admin-approved remote deletion.'
      WHERE order_document_id = ? AND status != 'deleted'
    `).run(request.order_document_id);
    stamp(dbConn, { requestId: request.id, userId: request.user_id, orderDocumentId: request.order_document_id,
      eventType: 'admin_document_content_purged',
      payload: {
        actor, note,
        contentAction: 'customer access and registry file reference removed; physical managed-storage/Drive purge queued',
        retention: 'immutable request, decision, timestamp and content hash metadata retained'
      }
    });
    return dbConn.prepare("SELECT * FROM customer_data_deletion_requests WHERE id = ?").get(request.id);
  });
}

module.exports = {
  REVIEW_WINDOW_DAYS,
  listAdminDeletionRequests,
  listCustomerDeletionRequests,
  listCustomerDocuments,
  listCustomerInvoices,
  queueGoogleDriveDocumentSync,
  requestDocumentHiding,
  resolveDeletionRequest
};
