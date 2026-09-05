"use strict";

const fs = require("node:fs");
const path = require("node:path");

const SERVICE_DNA_STATUSES = Object.freeze(["Draft", "Review", "Published", "Deprecated"]);
const SERVICE_DNA_LAYERS = Object.freeze([
  "identity",
  "pricing",
  "eligibility",
  "documents",
  "workflow",
  "government_rules",
  "ai_behaviour",
  "customer_experience",
  "automation",
  "notifications",
  "analytics",
  "learning"
]);
const DOCUMENT_RULE_TYPES = Object.freeze(["required", "optional", "conditional", "evidenceRequired"]);
const BASELINE_ACTOR = "phase-2-milestone-2.3";

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function writeReport(report, reportPath) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function createReport() {
  return {
    milestone: "Phase 2 - Milestone 2.3",
    name: "Universal Service Engine Baseline Migration",
    startedAt: nowIso(),
    finishedAt: null,
    totals: {
      services: 0,
      profilesCreated: 0,
      profilesUpdated: 0,
      layersCreated: 0,
      layersUpdated: 0,
      templatesSeeded: 0,
      failures: 0
    },
    failures: []
  };
}

function addFailure(report, serviceSlug, error) {
  report.totals.failures += 1;
  report.failures.push({
    serviceSlug: serviceSlug || null,
    message: error && error.message ? error.message : String(error)
  });
}

function docsFromRow(row = {}) {
  const docs = safeJson(row.required_docs_json, []);
  return Array.isArray(docs) ? docs.filter(Boolean) : [];
}

function pricingConfigFromRow(row = {}) {
  return {
    source: "service_dna_active_version",
    pricingModel: row.pricing_model || "all_inclusive",
    governmentFeePaise: Number(row.government_fee_paise || 0),
    operatorFeePaise: Number(row.operator_fee_paise || row.price_paise || 0),
    convenienceFeePaise: Number(row.convenience_fee_paise || 0),
    gstRate: Number(row.gst_rate || row.tax_rate || 0),
    offerPricePaise: row.offer_price_paise === null || row.offer_price_paise === undefined
      ? null
      : Number(row.offer_price_paise),
    pricePaise: Number(row.price_paise || 0),
    displayPrice: row.display_price || "",
    customerPriceNote: row.customer_price_note || "",
    currency: "INR",
    sourceTable: "services",
    sourcePk: row.id
  };
}

function documentConfigFromRow(row = {}) {
  return {
    required: docsFromRow(row),
    optional: [],
    conditional: [],
    evidenceRequired: [],
    evidenceRequiredScope: "metadata_only",
    futureScope: ["ocr_rules", "quality_rules", "ai_verification_rules"]
  };
}

function layerConfig(layerKey, row = {}) {
  switch (layerKey) {
    case "identity":
      return {
        slug: row.slug,
        serviceCode: String(row.slug || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
        displayName: row.name || row.slug,
        shortName: row.variant || row.name || row.slug,
        category: row.category || "",
        subCategory: row.sub_category || "",
        languages: ["en-IN", "hi-IN"],
        status: Number(row.active) === 1 ? "active" : "inactive"
      };
    case "pricing":
      return pricingConfigFromRow(row);
    case "documents":
      return documentConfigFromRow(row);
    case "eligibility":
      return { rules: [], status: "baseline_placeholder", source: "service_dna" };
    case "workflow":
      return { steps: [], status: "baseline_placeholder", futureEngine: "order_orchestration" };
    case "government_rules":
      return { rules: [], status: "baseline_placeholder" };
    case "ai_behaviour":
      return { status: "not_runtime_enabled", futureScope: "governed_ai_service_controller" };
    case "customer_experience":
      return { duration: row.duration || "", sla: row.sla || "", displayPrice: row.display_price || "" };
    case "automation":
      return { configuredCount: Number(row.automation_count || 0), runtimeEnabled: false };
    case "notifications":
      return { templates: [], status: "baseline_placeholder" };
    case "analytics":
      return { metrics: ["orders", "revenue", "completion_time", "complaints"], status: "baseline_placeholder" };
    case "learning":
      return { learningEnabled: false, governance: "future_approved_scope" };
    default:
      return {};
  }
}

function templateDefinitions() {
  return [
    ["government_service", "Government Service", "government", "Baseline template for assisted government services."],
    ["printing", "Printing", "printing", "Baseline template for printing, scanning, and lamination services."],
    ["insurance", "Insurance", "finance", "Baseline template for insurance assistance services."],
    ["travel", "Travel", "travel", "Baseline template for travel booking assistance services."],
    ["design", "Design", "creative", "Baseline template for design and creative services."],
    ["banking", "Banking", "finance", "Baseline template for banking and financial assistance services."],
    ["marketplace", "Marketplace", "commerce", "Baseline template for OneMart marketplace services."],
    ["consultation", "Consultation", "professional", "Baseline template for advisory services."],
    ["subscription", "Subscription", "recurring", "Baseline template for recurring service offerings."]
  ];
}

function tableExists(dbConn, tableName) {
  const row = dbConn
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return Boolean(row);
}

function getActiveProfileBySlug(dbConn, serviceSlug) {
  if (!serviceSlug || !tableExists(dbConn, "service_dna_profiles")) return null;
  return dbConn.prepare(`
    SELECT *
    FROM service_dna_profiles
    WHERE service_slug = ? AND lifecycle_status = 'Published' AND active = 1
    ORDER BY version DESC
    LIMIT 1
  `).get(serviceSlug);
}

function getAnyProfileBySlug(dbConn, serviceSlug) {
  if (!serviceSlug || !tableExists(dbConn, "service_dna_profiles")) return null;
  return dbConn.prepare(`
    SELECT *
    FROM service_dna_profiles
    WHERE service_slug = ?
    ORDER BY active DESC, version DESC
    LIMIT 1
  `).get(serviceSlug);
}

function getPendingProfileBySlug(dbConn, serviceSlug) {
  if (!serviceSlug || !tableExists(dbConn, "service_dna_profiles")) return null;
  return dbConn.prepare(`
    SELECT *
    FROM service_dna_profiles
    WHERE service_slug = ? AND lifecycle_status IN ('Draft', 'Review')
    ORDER BY version DESC
    LIMIT 1
  `).get(serviceSlug);
}

function nextProfileVersion(dbConn, serviceSlug) {
  const row = dbConn.prepare(`
    SELECT COALESCE(MAX(version), 0) + 1 AS version
    FROM service_dna_profiles
    WHERE service_slug = ?
  `).get(serviceSlug);
  return Number(row?.version || 1);
}

function getLayersForProfile(dbConn, profileId) {
  if (!profileId || !tableExists(dbConn, "service_dna_layers")) return [];
  return dbConn.prepare(`
    SELECT *
    FROM service_dna_layers
    WHERE profile_id = ? AND active = 1
    ORDER BY layer_key COLLATE NOCASE
  `).all(profileId);
}

function compactLayer(row) {
  return {
    key: row.layer_key,
    version: row.layer_version,
    lifecycleStatus: row.lifecycle_status,
    active: Boolean(row.active),
    config: safeJson(row.config_json, {})
  };
}

function compactProfile(profile, layers = []) {
  if (!profile) return null;
  const layerMap = {};
  for (const layer of layers.map(compactLayer)) layerMap[layer.key] = layer;
  return {
    id: profile.id,
    serviceObjectUuid: profile.service_object_uuid || null,
    serviceSlug: profile.service_slug,
    serviceCode: profile.service_code,
    displayName: profile.display_name,
    shortName: profile.short_name || "",
    category: profile.category || "",
    subCategory: profile.sub_category || "",
    department: profile.department || "operations",
    governmentDepartment: profile.government_department || "",
    processingType: profile.processing_type || "assisted",
    deliveryMode: profile.delivery_mode || "digital_assisted",
    lifecycleStatus: profile.lifecycle_status,
    active: Boolean(profile.active),
    version: profile.version,
    ownerAi: profile.owner_ai || "",
    humanOwner: profile.human_owner || "owner",
    publishedAt: profile.published_at || null,
    deprecatedAt: profile.deprecated_at || null,
    metadata: safeJson(profile.metadata_json, {}),
    layers: layerMap,
    documentLayer: layerMap.documents?.config || {
      required: [],
      optional: [],
      conditional: [],
      evidenceRequired: []
    }
  };
}

function getActiveServiceDna(dbConn, serviceSlug) {
  const profile = getActiveProfileBySlug(dbConn, serviceSlug);
  if (!profile) return null;
  return compactProfile(profile, getLayersForProfile(dbConn, profile.id));
}

function getServiceObject(dbConn, row) {
  if (!row?.id || !tableExists(dbConn, "universal_objects")) return null;
  return dbConn
    .prepare("SELECT universal_uuid FROM universal_objects WHERE source_table = 'services' AND source_pk = ? LIMIT 1")
    .get(String(row.id));
}

function upsertLayer(dbConn, profileId, layerKey, config, report, { lifecycleStatus = "Published", active = 1 } = {}) {
  const existing = dbConn.prepare(`
    SELECT id
    FROM service_dna_layers
    WHERE profile_id = ? AND layer_key = ? AND layer_version = 1
  `).get(profileId, layerKey);
  if (existing) {
    dbConn.prepare(`
      UPDATE service_dna_layers
      SET lifecycle_status = ?,
          active = ?,
          config_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(lifecycleStatus, active ? 1 : 0, JSON.stringify(config), existing.id);
    if (report) report.totals.layersUpdated += 1;
    return existing.id;
  }
  const result = dbConn.prepare(`
    INSERT INTO service_dna_layers
      (profile_id, layer_key, layer_version, lifecycle_status, active, config_json, effective_from)
    VALUES (?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(profileId, layerKey, lifecycleStatus, active ? 1 : 0, JSON.stringify(config));
  if (report) report.totals.layersCreated += 1;
  return result.lastInsertRowid;
}

function upsertBaselineProfileFromService(dbConn, row, report) {
  const serviceObject = getServiceObject(dbConn, row);
  const existing = getActiveProfileBySlug(dbConn, row.slug);
  const serviceCode = String(row.slug || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const metadata = {
    source: "baseline_backfill",
    sourceTable: "services",
    sourcePk: row.id,
    oneActivePublishedVersion: true,
    noDirectPublication: true
  };

  let profileId;
  if (existing) {
    profileId = existing.id;
    dbConn.prepare(`
      UPDATE service_dna_profiles
      SET service_object_uuid = COALESCE(?, service_object_uuid),
          service_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      serviceObject?.universal_uuid || null,
      row.id,
      profileId
    );
    if (report) report.totals.profilesUpdated += 1;
    const existingLayers = new Set(getLayersForProfile(dbConn, profileId).map((layer) => layer.layer_key));
    for (const layerKey of SERVICE_DNA_LAYERS) {
      if (existingLayers.has(layerKey)) continue;
      upsertLayer(dbConn, profileId, layerKey, layerConfig(layerKey, row), report, {
        lifecycleStatus: "Published",
        active: 1
      });
    }
    return getActiveServiceDna(dbConn, row.slug);
  } else {
    const result = dbConn.prepare(`
      INSERT INTO service_dna_profiles (
        service_object_uuid, service_id, service_slug, service_code, display_name, short_name,
        category, sub_category, department, lifecycle_status, active, version, human_owner,
        published_at, metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Published', 1, 1, 'owner', CURRENT_TIMESTAMP, ?)
    `).run(
      serviceObject?.universal_uuid || null,
      row.id,
      row.slug,
      serviceCode,
      row.name || row.slug,
      row.variant || row.name || row.slug,
      row.category || "",
      row.sub_category || "",
      row.category || "operations",
      JSON.stringify(metadata)
    );
    profileId = result.lastInsertRowid;
    if (report) report.totals.profilesCreated += 1;
  }

  for (const layerKey of SERVICE_DNA_LAYERS) {
    upsertLayer(dbConn, profileId, layerKey, layerConfig(layerKey, row), report, {
      lifecycleStatus: "Published",
      active: 1
    });
  }

  dbConn.prepare(`
    INSERT INTO service_dna_audit_events
      (service_slug, service_object_uuid, profile_id, event_type, actor_type, actor_id, summary, metadata_json)
    VALUES (?, ?, ?, 'baseline_sync', 'system', ?, 'Service DNA baseline synchronized from existing service catalog.', ?)
  `).run(row.slug, serviceObject?.universal_uuid || null, profileId, BASELINE_ACTOR, JSON.stringify(metadata));

  return getActiveServiceDna(dbConn, row.slug);
}

function ensureDraftProfileFromService(dbConn, row) {
  if (!row?.slug) return null;
  const existing = getPendingProfileBySlug(dbConn, row.slug) || getAnyProfileBySlug(dbConn, row.slug);
  const serviceObject = getServiceObject(dbConn, row);
  const serviceCode = String(row.slug || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const metadata = {
    source: "catalog_change_pending_review",
    sourceTable: "services",
    sourcePk: row.id,
    oneActiveVersion: true,
    noDirectPublication: true
  };

  let profileId;
  if (existing && existing.lifecycle_status !== "Published") {
    profileId = existing.id;
    dbConn.prepare(`
      UPDATE service_dna_profiles
      SET service_object_uuid = COALESCE(?, service_object_uuid),
          service_id = ?,
          service_code = ?,
          display_name = ?,
          short_name = ?,
          category = ?,
          sub_category = ?,
          department = ?,
          lifecycle_status = 'Draft',
          active = 0,
          updated_at = CURRENT_TIMESTAMP,
          metadata_json = ?
      WHERE id = ?
    `).run(
      serviceObject?.universal_uuid || null,
      row.id,
      serviceCode,
      row.name || row.slug,
      row.variant || row.name || row.slug,
      row.category || "",
      row.sub_category || "",
      row.category || "operations",
      JSON.stringify(metadata),
      profileId
    );
  } else {
    const result = dbConn.prepare(`
      INSERT INTO service_dna_profiles (
        service_object_uuid, service_id, service_slug, service_code, display_name, short_name,
        category, sub_category, department, lifecycle_status, active, version, human_owner,
        metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', 0, ?, 'owner', ?)
    `).run(
      serviceObject?.universal_uuid || null,
      row.id,
      row.slug,
      serviceCode,
      row.name || row.slug,
      row.variant || row.name || row.slug,
      row.category || "",
      row.sub_category || "",
      row.category || "operations",
      nextProfileVersion(dbConn, row.slug),
      JSON.stringify(metadata)
    );
    profileId = result.lastInsertRowid;
  }

  for (const layerKey of SERVICE_DNA_LAYERS) {
    upsertLayer(dbConn, profileId, layerKey, layerConfig(layerKey, row), null, {
      lifecycleStatus: "Draft",
      active: 0
    });
  }

  dbConn.prepare(`
    INSERT INTO service_dna_audit_events
      (service_slug, service_object_uuid, profile_id, event_type, actor_type, actor_id, summary, metadata_json)
    VALUES (?, ?, ?, 'draft_sync', 'system', ?, 'Service DNA draft synchronized from catalog change; publication requires future review workflow.', ?)
  `).run(row.slug, serviceObject?.universal_uuid || null, profileId, BASELINE_ACTOR, JSON.stringify(metadata));

  return compactProfile(dbConn.prepare("SELECT * FROM service_dna_profiles WHERE id = ?").get(profileId), getLayersForProfile(dbConn, profileId));
}

function seedTemplates(dbConn, report) {
  const stmt = dbConn.prepare(`
    INSERT INTO service_templates (template_code, name, category, description, config_json, active)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(template_code) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      description = excluded.description,
      config_json = excluded.config_json,
      active = excluded.active,
      updated_at = CURRENT_TIMESTAMP
  `);
  for (const [code, name, category, description] of templateDefinitions()) {
    stmt.run(code, name, category, description, JSON.stringify({ dnaLayers: SERVICE_DNA_LAYERS }));
    if (report) report.totals.templatesSeeded += 1;
  }
}

function backfillServiceDna(dbConn, { reportPath = null } = {}) {
  const report = createReport();
  seedTemplates(dbConn, report);
  const services = dbConn.prepare("SELECT * FROM services ORDER BY id").all();
  report.totals.services = services.length;

  for (const service of services) {
    try {
      upsertBaselineProfileFromService(dbConn, service, report);
    } catch (error) {
      addFailure(report, service.slug, error);
      console.warn("[service-dna] baseline registration skipped:", service.slug, error.message);
    }
  }

  report.finishedAt = nowIso();
  writeReport(report, reportPath);
  return report;
}

function listActiveServiceDna(dbConn) {
  if (!tableExists(dbConn, "service_dna_profiles")) return [];
  const profiles = dbConn.prepare(`
    SELECT *
    FROM service_dna_profiles
    WHERE lifecycle_status = 'Published' AND active = 1
    ORDER BY category COLLATE NOCASE, display_name COLLATE NOCASE
  `).all();
  return profiles.map((profile) => compactProfile(profile, getLayersForProfile(dbConn, profile.id)));
}

module.exports = {
  SERVICE_DNA_STATUSES,
  SERVICE_DNA_LAYERS,
  DOCUMENT_RULE_TYPES,
  getActiveServiceDna,
  listActiveServiceDna,
  upsertBaselineProfileFromService,
  ensureDraftProfileFromService,
  backfillServiceDna,
  pricingConfigFromRow,
  documentConfigFromRow
};
