"use strict";

const crypto = require("node:crypto");
const { safePhone, safeString } = require("./utils");

const BRANCH_TYPES = new Set(["Branch", "Franchise"]);
const BRANCH_STATUSES = new Set(["Active", "Inactive", "Archived"]);

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

function normalizeBranchType(value) {
  const candidate = safeString(value || "Branch", 40);
  if (!BRANCH_TYPES.has(candidate)) {
    throw new Error("branchType must be a governed value.");
  }
  return candidate;
}

function normalizeBranchStatus(value, active) {
  const fallback = active === false ? "Inactive" : "Active";
  const candidate = safeString(value || fallback, 40);
  if (!BRANCH_STATUSES.has(candidate)) {
    throw new Error("operationalStatus must be a governed value.");
  }
  return candidate;
}

function getBranchRowByUuid(dbConn, branchUuid) {
  return dbConn.prepare("SELECT * FROM branch_registry WHERE branch_uuid = ?").get(safeString(branchUuid, 80)) || null;
}

function validateParentBranch(dbConn, branchUuid, parentBranchUuid) {
  if (!parentBranchUuid) return null;
  const parent = getBranchRowByUuid(dbConn, parentBranchUuid);
  if (!parent) throw new Error("parentBranchUuid was not found.");

  if (branchUuid && safeString(branchUuid, 80) === parentBranchUuid) {
    throw new Error("parentBranchUuid cannot reference the same branch.");
  }

  if (!branchUuid) return parent;

  const currentBranchUuid = safeString(branchUuid, 80);
  const visited = new Set([parentBranchUuid]);
  let cursor = parent;
  while (cursor?.parent_branch_uuid) {
    const nextParentUuid = safeString(cursor.parent_branch_uuid, 80);
    if (nextParentUuid === currentBranchUuid || visited.has(nextParentUuid)) {
      throw new Error("parentBranchUuid creates a hierarchy cycle.");
    }
    visited.add(nextParentUuid);
    cursor = getBranchRowByUuid(dbConn, nextParentUuid);
  }

  return parent;
}

function mapBranchRow(row) {
  if (!row) return null;
  const metadata = parseJson(row.metadata_json, {});
  return {
    branchUuid: row.branch_uuid,
    branchType: row.branch_type,
    branchName: row.branch_name,
    ownerName: row.owner_name || "",
    contactPhone: row.contact_phone || "",
    contactEmail: row.contact_email || "",
    locationText: row.location_text || "",
    parentBranchUuid: row.parent_branch_uuid || null,
    operationalStatus: row.operational_status,
    active: row.operational_status === "Active",
    tier: row.tier || metadata.tier || "",
    commissionRate: Number(row.commission_rate || 0),
    joinedAt: row.created_at,
    updatedAt: row.updated_at,
    metadata
  };
}

function listBranches(options = {}, dbConn = getDb()) {
  const branchType = options.branchType ? normalizeBranchType(options.branchType) : null;
  const rows = branchType
    ? dbConn.prepare(`
        SELECT * FROM branch_registry
        WHERE branch_type = ?
        ORDER BY branch_name ASC
      `).all(branchType)
    : dbConn.prepare("SELECT * FROM branch_registry ORDER BY branch_type ASC, branch_name ASC").all();
  return rows.map(mapBranchRow);
}

function saveBranch(input = {}, options = {}) {
  const dbConn = getDb(options.dbConn);
  const branchType = normalizeBranchType(input.branchType);
  const branchName = safeString(input.branchName, 180);
  if (!branchName) throw new Error("branchName is required.");

  const parentBranchUuid = input.parentBranchUuid ? safeString(input.parentBranchUuid, 80) : null;
  validateParentBranch(dbConn, input.branchUuid, parentBranchUuid);

  const operationalStatus = normalizeBranchStatus(input.operationalStatus, input.active);
  const payload = {
    ownerName: safeString(input.ownerName, 180),
    contactPhone: safePhone(input.contactPhone),
    contactEmail: safeString(input.contactEmail, 180).toLowerCase(),
    locationText: safeString(input.locationText, 240),
    tier: safeString(input.tier, 80),
    commissionRate: Number(input.commissionRate || 0),
    metadata: {
      source: options.source || "branch_admin_api",
      walletEngine: "not_implemented",
      franchiseAutomation: "not_implemented",
      hierarchyMode: "metadata_only",
      branchHierarchyEnabled: true
    }
  };

  if (input.branchUuid) {
    const existing = getBranchRowByUuid(dbConn, input.branchUuid);
    if (!existing) throw new Error("branchUuid was not found.");
    dbConn.prepare(`
      UPDATE branch_registry
      SET branch_type = ?,
          branch_name = ?,
          owner_name = ?,
          contact_phone = ?,
          contact_email = ?,
          location_text = ?,
          parent_branch_uuid = ?,
          operational_status = ?,
          tier = ?,
          commission_rate = ?,
          metadata_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE branch_uuid = ?
    `).run(
      branchType,
      branchName,
      payload.ownerName || null,
      payload.contactPhone || null,
      payload.contactEmail || null,
      payload.locationText || null,
      parentBranchUuid,
      operationalStatus,
      payload.tier || null,
      payload.commissionRate,
      json({ ...parseJson(existing.metadata_json, {}), ...payload.metadata }),
      existing.branch_uuid
    );
    return mapBranchRow(getBranchRowByUuid(dbConn, existing.branch_uuid));
  }

  const branchUuid = crypto.randomUUID();
  dbConn.prepare(`
    INSERT INTO branch_registry
      (branch_uuid, branch_type, branch_name, owner_name, contact_phone, contact_email,
       location_text, parent_branch_uuid, operational_status, tier, commission_rate, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    branchUuid,
    branchType,
    branchName,
    payload.ownerName || null,
    payload.contactPhone || null,
    payload.contactEmail || null,
    payload.locationText || null,
    parentBranchUuid,
    operationalStatus,
    payload.tier || null,
    payload.commissionRate,
    json(payload.metadata)
  );
  return mapBranchRow(getBranchRowByUuid(dbConn, branchUuid));
}

module.exports = {
  BRANCH_TYPES,
  BRANCH_STATUSES,
  listBranches,
  saveBranch
};
