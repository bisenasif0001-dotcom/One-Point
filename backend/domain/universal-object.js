"use strict";

const crypto = require("node:crypto");

function stableUuidForSource(sourceTable, sourcePk) {
  const hex = crypto
    .createHash("sha256")
    .update(`opds:${String(sourceTable)}:${String(sourcePk)}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function safeJson(value, fallback) {
  try {
    return JSON.stringify(value === undefined ? fallback : value);
  } catch {
    return JSON.stringify(fallback);
  }
}

function safeText(value, fallback = "", max = 500) {
  const text = String(value ?? fallback).trim();
  return (text || fallback).slice(0, max);
}

function compactUniversalObject(row) {
  if (!row) return null;
  return {
    uuid: row.universal_uuid,
    type: row.object_type,
    sourceTable: row.source_table,
    sourcePk: row.source_pk,
    humanReadableId: row.human_readable_id || "",
    displayName: row.display_name || "",
    status: row.current_status || "active",
    lifecycleStage: row.lifecycle_stage || "active",
    ownerType: row.owner_type || "system",
    ownerId: row.owner_id || "",
    department: row.department || "operations",
    priority: row.priority || "normal",
    riskLevel: row.risk_level || "normal",
    visibility: row.visibility || "internal",
    healthScore: row.health_score === null || row.health_score === undefined ? null : Number(row.health_score),
    aiContextEnabled: Boolean(row.ai_context_enabled),
    version: Number(row.version || 1),
    updatedAt: row.updated_at || ""
  };
}

function normalizePayload(input) {
  const sourceTable = safeText(input.sourceTable, "", 120);
  const sourcePk = safeText(input.sourcePk, "", 120);
  if (!sourceTable || !sourcePk) throw new Error("Universal object source_table and source_pk are required.");

  return {
    universalUuid: input.universalUuid || stableUuidForSource(sourceTable, sourcePk),
    objectType: safeText(input.objectType, "unknown", 80),
    sourceTable,
    sourcePk,
    humanReadableId: safeText(input.humanReadableId, sourcePk, 160),
    displayName: safeText(input.displayName, input.humanReadableId || `${sourceTable} ${sourcePk}`, 255),
    description: safeText(input.description, "", 1000),
    currentStatus: safeText(input.currentStatus, "active", 80),
    lifecycleStage: safeText(input.lifecycleStage, input.currentStatus || "active", 80),
    ownerType: safeText(input.ownerType, "system", 80),
    ownerId: input.ownerId === null || input.ownerId === undefined ? null : safeText(input.ownerId, "", 120),
    department: safeText(input.department, "operations", 120),
    createdByType: safeText(input.createdByType, "migration", 80),
    createdById: input.createdById === null || input.createdById === undefined ? "phase-2-milestone-2.1" : safeText(input.createdById, "", 120),
    priority: safeText(input.priority, "normal", 40),
    riskLevel: safeText(input.riskLevel, "normal", 40),
    visibility: safeText(input.visibility, "internal", 40),
    permissionsJson: safeJson(input.permissions || {}, {}),
    metadataJson: safeJson(input.metadata || {}, {}),
    tagsJson: safeJson(input.tags || [], []),
    healthScore: input.healthScore === undefined ? null : input.healthScore,
    aiContextEnabled: input.aiContextEnabled === false ? 0 : 1,
    version: Math.max(1, Number(input.version || 1)),
    sourceCreatedAt: input.sourceCreatedAt || null,
    sourceUpdatedAt: input.sourceUpdatedAt || null,
    lastActivityAt: input.lastActivityAt || input.sourceUpdatedAt || input.sourceCreatedAt || null
  };
}

module.exports = {
  stableUuidForSource,
  safeJson,
  safeText,
  compactUniversalObject,
  normalizePayload
};
