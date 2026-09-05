"use strict";

const crypto = require("node:crypto");

function getDb(dbConn) {
  return dbConn || require("./db").getDb();
}

function parseJson(value, fallback) {
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

function buildExecutiveSummary(options = {}) {
  const dbConn = getDb(options.dbConn);
  const generatedAt = new Date().toISOString();

  const workforceTotals = dbConn.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN lifecycle_status = 'Active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN workforce_type = 'Human' THEN 1 ELSE 0 END) AS human,
      SUM(CASE WHEN workforce_type = 'AI Employee' THEN 1 ELSE 0 END) AS ai_employee,
      SUM(CASE WHEN workforce_type = 'Hybrid' THEN 1 ELSE 0 END) AS hybrid,
      SUM(CASE WHEN workforce_type = 'System' THEN 1 ELSE 0 END) AS system_count
    FROM workforce_registry
  `).get() || {};

  const workforceByDepartment = dbConn.prepare(`
    SELECT
      d.department_uuid,
      d.department_name,
      COUNT(wr.id) AS workforce_count,
      SUM(CASE WHEN wr.lifecycle_status = 'Active' THEN 1 ELSE 0 END) AS active_workforce
    FROM departments d
    LEFT JOIN workforce_registry wr ON wr.primary_department_uuid = d.department_uuid
    GROUP BY d.department_uuid, d.department_name
    ORDER BY d.department_name ASC
  `).all().map((row) => ({
    departmentUuid: row.department_uuid,
    departmentName: row.department_name,
    workforceCount: Number(row.workforce_count || 0),
    activeWorkforce: Number(row.active_workforce || 0)
  }));

  const networkTotals = dbConn.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN branch_type = 'Branch' THEN 1 ELSE 0 END) AS branches,
      SUM(CASE WHEN branch_type = 'Franchise' THEN 1 ELSE 0 END) AS franchises,
      SUM(CASE WHEN operational_status = 'Active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN parent_branch_uuid IS NOT NULL THEN 1 ELSE 0 END) AS linked
    FROM branch_registry
  `).get() || {};

  const orderTotals = dbConn.prepare(`
    SELECT
      COUNT(*) AS total_orders,
      SUM(CASE WHEN status IN ('pending', 'verified', 'processing', 'ready', 'waiting', 'created') THEN 1 ELSE 0 END) AS active_orders,
      SUM(CASE WHEN status IN ('completed', 'delivered') THEN 1 ELSE 0 END) AS completed_orders,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN total_paise ELSE 0 END), 0) AS paid_revenue_paise
    FROM orders
  `).get() || {};

  const paymentTotals = dbConn.prepare(`
    SELECT
      COUNT(*) AS total_payments,
      SUM(CASE WHEN status IN ('paid', 'captured') THEN 1 ELSE 0 END) AS captured_payments
    FROM payments
  `).get() || {};

  const documentTotals = dbConn.prepare("SELECT COUNT(*) AS total_documents FROM document_registry").get() || {};
  const conversationTotals = dbConn.prepare("SELECT COUNT(*) AS total_conversations FROM conversations").get() || {};
  const latestSnapshot = dbConn.prepare(`
    SELECT snapshot_uuid, snapshot_version, generated_at
    FROM executive_kpi_snapshots
    ORDER BY id DESC
    LIMIT 1
  `).get() || null;

  return {
    generatedAt,
    readModel: "governed_executive_projection",
    boundaries: {
      mode: "read_only",
      predictiveAnalytics: "not_implemented",
      scoringEngine: "not_implemented",
      aiRuntime: "not_implemented"
    },
    workforce: {
      total: Number(workforceTotals.total || 0),
      active: Number(workforceTotals.active || 0),
      byType: {
        human: Number(workforceTotals.human || 0),
        aiEmployee: Number(workforceTotals.ai_employee || 0),
        hybrid: Number(workforceTotals.hybrid || 0),
        system: Number(workforceTotals.system_count || 0)
      },
      byDepartment: workforceByDepartment
    },
    network: {
      total: Number(networkTotals.total || 0),
      branches: Number(networkTotals.branches || 0),
      franchises: Number(networkTotals.franchises || 0),
      active: Number(networkTotals.active || 0),
      linkedToParent: Number(networkTotals.linked || 0)
    },
    operations: {
      totalOrders: Number(orderTotals.total_orders || 0),
      activeOrders: Number(orderTotals.active_orders || 0),
      completedOrders: Number(orderTotals.completed_orders || 0),
      paidRevenuePaise: Number(orderTotals.paid_revenue_paise || 0),
      totalPayments: Number(paymentTotals.total_payments || 0),
      capturedPayments: Number(paymentTotals.captured_payments || 0),
      totalDocuments: Number(documentTotals.total_documents || 0),
      totalConversations: Number(conversationTotals.total_conversations || 0)
    },
    latestSnapshot: latestSnapshot ? {
      snapshotUuid: latestSnapshot.snapshot_uuid,
      snapshotVersion: Number(latestSnapshot.snapshot_version || 0),
      generatedAt: latestSnapshot.generated_at
    } : null
  };
}

function createSnapshot(options = {}) {
  const dbConn = getDb(options.dbConn);
  const summary = buildExecutiveSummary({ dbConn });
  const nextVersionRow = dbConn.prepare("SELECT COALESCE(MAX(snapshot_version), 0) AS version FROM executive_kpi_snapshots").get() || {};
  const snapshotVersion = Number(nextVersionRow.version || 0) + 1;
  const snapshotUuid = crypto.randomUUID();
  dbConn.prepare(`
    INSERT INTO executive_kpi_snapshots
      (snapshot_uuid, snapshot_version, generated_at, summary_json, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    snapshotUuid,
    snapshotVersion,
    summary.generatedAt,
    json(summary),
    json({
      source: options.source || "admin_api",
      readBoundary: "governed_read_model_only"
    })
  );
  return {
    snapshotUuid,
    snapshotVersion,
    generatedAt: summary.generatedAt,
    summary
  };
}

function listSnapshots(limit = 10, dbConn = getDb()) {
  return dbConn.prepare(`
    SELECT snapshot_uuid, snapshot_version, generated_at, summary_json, metadata_json
    FROM executive_kpi_snapshots
    ORDER BY id DESC
    LIMIT ?
  `).all(Math.max(1, Math.min(Number(limit || 10), 50))).map((row) => ({
    snapshotUuid: row.snapshot_uuid,
    snapshotVersion: Number(row.snapshot_version || 0),
    generatedAt: row.generated_at,
    summary: parseJson(row.summary_json, {}),
    metadata: parseJson(row.metadata_json, {})
  }));
}

module.exports = {
  buildExecutiveSummary,
  createSnapshot,
  listSnapshots
};
