"use strict";

const fs = require("node:fs");
const path = require("node:path");
const db = require("./db");
const enterpriseEventService = require("./events/enterprise-event-service");
const { safePhone, safeString } = require("./utils");

const DEFAULT_POLICY_VERSION = "baseline-2026-07-02";
const DEFAULT_CONSENT_VERSION = "v1";
const BACKFILL_ACTOR = "phase-2-milestone-2.2";

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value, fallback = {}) {
  try {
    return JSON.stringify(value === undefined ? fallback : value);
  } catch {
    return JSON.stringify(fallback);
  }
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function cleanEmail(value) {
  const email = safeString(value, 180).toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function cleanLanguage(value) {
  const lang = safeString(value, 24).toLowerCase();
  return lang || "hi";
}

function cleanChannel(value) {
  const channel = safeString(value, 40).toLowerCase();
  return channel || "whatsapp";
}

function customerNumber(userId) {
  return `CUST-${String(userId).padStart(6, "0")}`;
}

function safeCustomerObject(payload) {
  if (!payload) return null;
  return {
    uuid: payload.uuid,
    type: payload.type,
    humanReadableId: payload.humanReadableId || "",
    displayName: payload.displayName || "",
    status: payload.status || "active",
    lifecycleStage: payload.lifecycleStage || "active",
    department: payload.department || "customer_success",
    riskLevel: payload.riskLevel || "normal",
    visibility: payload.visibility || "internal",
    healthScore: payload.healthScore === undefined ? null : payload.healthScore,
    updatedAt: payload.updatedAt || ""
  };
}

function loadUser(userOrId) {
  if (!userOrId) return null;
  if (typeof userOrId === "object" && userOrId.id) return userOrId;
  return db.get("SELECT * FROM users WHERE id = ?", [Number(userOrId)]);
}

function getUserByPhone(rawPhone) {
  const phone = safePhone(rawPhone);
  if (!phone) return null;
  return db.get(
    "SELECT * FROM users WHERE phone = ? OR phone LIKE ? ORDER BY updated_at DESC, id DESC LIMIT 1",
    [phone, `%${phone}`]
  );
}

function getCustomerObject(userId) {
  return db.registerUniversalObjectForSource("users", userId) || db.getUniversalObjectPayload("users", userId);
}

function getProfileByUserId(userId) {
  return db.get("SELECT * FROM customer_profiles WHERE user_id = ?", [Number(userId)]);
}

function getProfileByUuid(customerObjectUuid) {
  return db.get("SELECT * FROM customer_profiles WHERE customer_object_uuid = ?", [customerObjectUuid]);
}

function recordLifecycleEvent(customerObjectUuid, event = {}) {
  if (!customerObjectUuid) return null;
  const result = db.run(
    `INSERT INTO customer_lifecycle_events (
       customer_object_uuid, event_type, title, summary, source_table, source_pk,
       actor_type, actor_id, metadata_json, occurred_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customerObjectUuid,
      safeString(event.eventType || "profile_updated", 80),
      safeString(event.title || "Customer lifecycle event", 180),
      safeString(event.summary || "", 1000),
      event.sourceTable ? safeString(event.sourceTable, 120) : null,
      event.sourcePk === undefined || event.sourcePk === null ? null : safeString(event.sourcePk, 120),
      safeString(event.actorType || "system", 80),
      event.actorId === undefined || event.actorId === null ? null : safeString(event.actorId, 120),
      safeJson(event.metadata || {}, {}),
      event.occurredAt || nowIso()
    ]
  );
  enterpriseEventService.publishEvent({
    eventKey: "customer.lifecycle.changed",
    publisherKey: "customer_governance_publisher",
    linkedObjectType: "Customer",
    linkedObjectUuid: customerObjectUuid,
    sourceTable: event.sourceTable || "customer_profiles",
    sourcePk: event.sourcePk === undefined || event.sourcePk === null ? customerObjectUuid : String(event.sourcePk),
    correlationId: customerObjectUuid,
    processContextKey: "customer_lifecycle_context",
    occurredAt: event.occurredAt || nowIso(),
    actorType: safeString(event.actorType || "system", 80),
    actorId: event.actorId === undefined || event.actorId === null ? null : safeString(event.actorId, 120),
    payload: {
      eventType: safeString(event.eventType || "profile_updated", 80),
      title: safeString(event.title || "Customer lifecycle event", 180),
      summary: safeString(event.summary || "", 1000),
      metadata: event.metadata || {}
    }
  });
  return Number(result.lastInsertRowid || 0);
}

function upsertPreference(customerObjectUuid, key, value, source = "system", metadata = {}) {
  if (!customerObjectUuid || !key) return;
  db.run(
    `INSERT INTO customer_preferences (
       customer_object_uuid, preference_key, preference_value, confidence, source, metadata_json
     )
     VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(customer_object_uuid, preference_key) DO UPDATE SET
       preference_value = excluded.preference_value,
       source = excluded.source,
       metadata_json = excluded.metadata_json,
       updated_at = CURRENT_TIMESTAMP`,
    [
      customerObjectUuid,
      safeString(key, 80),
      safeString(value, 240),
      safeString(source, 80),
      safeJson(metadata, {})
    ]
  );
}

function upsertConsent(customerObjectUuid, consent = {}) {
  if (!customerObjectUuid) return null;
  const consentType = safeString(consent.consentType || consent.consent_type || "communication", 80);
  const consentVersion = safeString(consent.consentVersion || consent.consent_version || DEFAULT_CONSENT_VERSION, 40);
  const policyVersion = safeString(consent.policyVersion || consent.policy_version || DEFAULT_POLICY_VERSION, 80);
  const statusRaw = safeString(consent.status || (consent.accepted === false ? "revoked" : consent.accepted === true ? "accepted" : "unknown"), 40).toLowerCase();
  const status = ["accepted", "revoked", "unknown"].includes(statusRaw) ? statusRaw : "unknown";
  const acceptedAt = consent.acceptedAt || consent.accepted_at || (status === "accepted" ? nowIso() : null);
  const revokedAt = consent.revokedAt || consent.revoked_at || (status === "revoked" ? nowIso() : null);
  const source = safeString(consent.source || "customer_profile", 80);
  const channel = consent.channel ? safeString(consent.channel, 40) : null;

  db.run(
    `INSERT INTO customer_consents (
       customer_object_uuid, consent_type, consent_version, status, accepted_at,
       revoked_at, source, policy_version, channel, metadata_json
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(customer_object_uuid, consent_type, consent_version, policy_version) DO UPDATE SET
       status = excluded.status,
       accepted_at = excluded.accepted_at,
       revoked_at = excluded.revoked_at,
       source = excluded.source,
       channel = excluded.channel,
       metadata_json = excluded.metadata_json,
       updated_at = CURRENT_TIMESTAMP`,
    [
      customerObjectUuid,
      consentType,
      consentVersion,
      status,
      acceptedAt,
      revokedAt,
      source,
      policyVersion,
      channel,
      safeJson(consent.metadata || {}, {})
    ]
  );

  db.run(
    "UPDATE customer_profiles SET consent_status = ?, consent_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE customer_object_uuid = ?",
    [status, customerObjectUuid]
  );

  return {
    consentType,
    consentVersion,
    status,
    acceptedAt,
    revokedAt,
    source,
    policyVersion,
    channel
  };
}

function getMetricsForUser(userId) {
  const orders = db.get(
    `SELECT COUNT(*) AS order_count,
            COALESCE(SUM(total_paise), 0) AS lifetime_value_paise,
            MIN(created_at) AS first_order_at,
            MAX(created_at) AS last_order_at
     FROM orders
     WHERE user_id = ?`,
    [userId]
  ) || {};
  const paid = db.get(
    `SELECT COUNT(DISTINCT o.id) AS paid_order_count
     FROM orders o
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.user_id = ? AND (o.status = 'paid' OR p.status IN ('paid', 'captured'))`,
    [userId]
  ) || {};
  const failed = db.get(
    `SELECT COUNT(*) AS failed_payment_count
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE o.user_id = ? AND p.status = 'failed'`,
    [userId]
  ) || {};
  const docs = db.get(
    `SELECT COUNT(*) AS document_count,
            SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS verified_document_count
     FROM order_documents od
     JOIN orders o ON o.id = od.order_id
     WHERE o.user_id = ?`,
    [userId]
  ) || {};
  const tickets = db.get(
    `SELECT COUNT(*) AS ticket_count,
            SUM(CASE WHEN status IN ('open', 'in_progress') THEN 1 ELSE 0 END) AS open_ticket_count
     FROM support_tickets
     WHERE customer_phone = (SELECT phone FROM users WHERE id = ?)`,
    [userId]
  ) || {};
  return {
    orderCount: Number(orders.order_count || 0),
    lifetimeValuePaise: Number(orders.lifetime_value_paise || 0),
    firstOrderAt: orders.first_order_at || null,
    lastOrderAt: orders.last_order_at || null,
    paidOrderCount: Number(paid.paid_order_count || 0),
    failedPaymentCount: Number(failed.failed_payment_count || 0),
    documentCount: Number(docs.document_count || 0),
    verifiedDocumentCount: Number(docs.verified_document_count || 0),
    ticketCount: Number(tickets.ticket_count || 0),
    openTicketCount: Number(tickets.open_ticket_count || 0)
  };
}

function refreshProfileMetrics(profile, user) {
  const metrics = getMetricsForUser(user.id);
  const changes = [];
  if (Number(profile.lifetime_value_paise || 0) !== metrics.lifetimeValuePaise) changes.push("lifetime_value_paise");

  if (changes.length > 0) {
    db.run(
      `UPDATE customer_profiles
       SET lifetime_value_paise = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [metrics.lifetimeValuePaise, profile.id]
    );
    recordLifecycleEvent(profile.customer_object_uuid, {
      eventType: "profile_metrics_refreshed",
      title: "Customer profile metrics refreshed",
      summary: `Updated customer profile metrics: ${changes.join(", ")}.`,
      sourceTable: "customer_profiles",
      sourcePk: profile.id,
      actorType: "system",
      actorId: BACKFILL_ACTOR,
      metadata: { changedFields: changes }
    });
    return getProfileByUserId(user.id);
  }

  return profile;
}

function ensureCustomerProfileForUser(userOrId, options = {}) {
  const user = loadUser(userOrId);
  if (!user) return null;
  const object = getCustomerObject(user.id);
  if (!object?.uuid) return null;
  const existing = getProfileByUserId(user.id);
  const displayName = safeString(user.name || "Customer", 120) || "Customer";
  const mobile = safePhone(user.phone);
  const email = cleanEmail(user.email);
  const address = safeString(user.address || "", 500);

  if (!existing) {
    db.run(
      `INSERT INTO customer_profiles (
         customer_object_uuid, user_id, customer_number, display_name, mobile, email, address, city,
         identity_status, lifecycle_stage, segment, customer_type, preferred_language, preferred_channel,
         metadata_json
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'general', 'individual', 'hi', 'whatsapp', ?)`,
      [
        object.uuid,
        user.id,
        customerNumber(user.id),
        displayName,
        mobile,
        email || null,
        address || null,
        address || null,
        Number(user.phone_verified || 0) === 1 || Number(user.email_verified || 0) === 1 ? "verified" : "unverified",
        Number(user.phone_verified || 0) === 1 || Number(user.email_verified || 0) === 1 ? "verified" : "registered",
        safeJson({ authProvider: user.auth_provider || "checkout" }, {})
      ]
    );
    const profile = getProfileByUserId(user.id);
    upsertPreference(object.uuid, "language", "hi", "system_default");
    upsertPreference(object.uuid, "communication_channel", "whatsapp", "system_default");
    upsertConsent(object.uuid, {
      consentType: "communication",
      consentVersion: DEFAULT_CONSENT_VERSION,
      status: "unknown",
      source: "profile_baseline",
      policyVersion: DEFAULT_POLICY_VERSION,
      metadata: { reason: "baseline consent readiness" }
    });
    if (options.recordLifecycle !== false) {
      recordLifecycleEvent(object.uuid, {
        eventType: "customer_registered",
        title: "Customer genome baseline created",
        summary: "Customer profile was registered into the Customer Digital Genome baseline.",
        sourceTable: "users",
        sourcePk: user.id,
        actorType: "system",
        actorId: BACKFILL_ACTOR,
        metadata: { customerNumber: customerNumber(user.id) }
      });
    }
    return refreshProfileMetrics(profile, user);
  }

  const syncFields = [];
  if (existing.display_name !== displayName) syncFields.push("display_name");
  if ((existing.mobile || "") !== mobile) syncFields.push("mobile");
  if ((existing.email || "") !== (email || "")) syncFields.push("email");
  if ((existing.address || "") !== address) syncFields.push("address");

  if (syncFields.length > 0) {
    db.run(
      `UPDATE customer_profiles
       SET display_name = ?,
           mobile = ?,
           email = ?,
           address = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [displayName, mobile, email || null, address || null, existing.id]
    );
    if (options.recordLifecycle !== false) {
      recordLifecycleEvent(existing.customer_object_uuid, {
        eventType: "profile_synced",
        title: "Customer profile synchronized",
        summary: `Customer profile synchronized from account data: ${syncFields.join(", ")}.`,
        sourceTable: "users",
        sourcePk: user.id,
        actorType: "system",
        actorId: BACKFILL_ACTOR,
        metadata: { changedFields: syncFields }
      });
    }
  }

  return refreshProfileMetrics(getProfileByUserId(user.id), user);
}

function preferencesFor(customerObjectUuid) {
  const rows = db.all(
    "SELECT preference_key, preference_value, confidence, source, updated_at FROM customer_preferences WHERE customer_object_uuid = ? ORDER BY preference_key",
    [customerObjectUuid]
  );
  return Object.fromEntries(rows.map((row) => [row.preference_key, {
    value: row.preference_value,
    confidence: Number(row.confidence || 0),
    source: row.source || "system",
    updatedAt: row.updated_at || ""
  }]));
}

function consentListFor(customerObjectUuid) {
  return db.all(
    `SELECT consent_type, consent_version, status, accepted_at, revoked_at, source, policy_version, channel, updated_at
     FROM customer_consents
     WHERE customer_object_uuid = ?
     ORDER BY updated_at DESC, id DESC`,
    [customerObjectUuid]
  ).map((row) => ({
    consentType: row.consent_type,
    consentVersion: row.consent_version,
    status: row.status,
    acceptedAt: row.accepted_at || null,
    revokedAt: row.revoked_at || null,
    source: row.source,
    policyVersion: row.policy_version,
    channel: row.channel || "",
    updatedAt: row.updated_at || ""
  }));
}

function timelineFor(customerObjectUuid, limit = 20) {
  return db.all(
    `SELECT event_type, title, summary, source_table, source_pk, actor_type, actor_id, metadata_json, occurred_at
     FROM customer_lifecycle_events
     WHERE customer_object_uuid = ?
     ORDER BY occurred_at DESC, id DESC
     LIMIT ?`,
    [customerObjectUuid, Number(limit || 20)]
  ).map((row) => ({
    eventType: row.event_type,
    title: row.title,
    summary: row.summary,
    sourceTable: row.source_table || "",
    sourcePk: row.source_pk || "",
    actorType: row.actor_type,
    actorId: row.actor_id || "",
    metadata: parseJson(row.metadata_json, {}),
    occurredAt: row.occurred_at
  }));
}

function serviceDnaFor(userId) {
  const rows = db.all(
    `SELECT oi.item_name AS service_name, COUNT(*) AS count, COALESCE(SUM(oi.total_paise), 0) AS value_paise
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = ?
     GROUP BY oi.item_name
     ORDER BY count DESC, value_paise DESC
     LIMIT 8`,
    [userId]
  );
  const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  return rows.map((row) => ({
    service: row.service_name || "Service",
    count: Number(row.count || 0),
    share: total ? Math.round((Number(row.count || 0) / total) * 100) : 0,
    value: Math.round(Number(row.value_paise || 0) / 100)
  }));
}

function getCustomer360ByUserId(userId, options = {}) {
  const user = loadUser(userId);
  if (!user) return null;
  const profile = ensureCustomerProfileForUser(user.id, { recordLifecycle: options.recordLifecycle !== false });
  if (!profile) return null;
  const object = safeCustomerObject(db.getUniversalObjectPayload("users", user.id));
  const metrics = getMetricsForUser(user.id);

  return {
    id: profile.id,
    customerUuid: profile.customer_object_uuid,
    customerNumber: profile.customer_number,
    object,
    identity: {
      userId: user.id,
      name: profile.display_name,
      mobile: profile.mobile,
      email: profile.email || "",
      address: profile.address || "",
      addressLine2: profile.address_line_2 || "",
      landmark: profile.landmark || "",
      city: profile.city || "",
      district: profile.district || "",
      state: profile.state || "",
      pincode: profile.pincode || "",
      country: profile.country || "India",
      identityStatus: profile.identity_status,
      phoneVerified: Boolean(user.phone_verified),
      emailVerified: Boolean(user.email_verified),
      accountStatus: user.account_status || "active",
      hasPassword: Boolean(user.password_hash),
      createdAt: user.created_at || null
    },
    lifecycle: {
      stage: profile.lifecycle_stage,
      segment: profile.segment,
      customerType: profile.customer_type,
      firstOrderAt: metrics.firstOrderAt,
      lastOrderAt: metrics.lastOrderAt
    },
    trust: {
      score: null,
      riskLevel: "not_assessed",
      assessmentStatus: "placeholder",
      happinessScore: profile.happiness_score === null || profile.happiness_score === undefined ? null : Number(profile.happiness_score),
      signals: []
    },
    financial: {
      lifetimeValue: Math.round(Number(profile.lifetime_value_paise || metrics.lifetimeValuePaise) / 100),
      lifetimeValuePaise: Number(profile.lifetime_value_paise || metrics.lifetimeValuePaise),
      orderCount: metrics.orderCount,
      paidOrderCount: metrics.paidOrderCount,
      failedPaymentCount: metrics.failedPaymentCount
    },
    preferences: {
      preferredLanguage: profile.preferred_language || "hi",
      preferredChannel: profile.preferred_channel || "whatsapp",
      details: preferencesFor(profile.customer_object_uuid)
    },
    consent: {
      status: profile.consent_status || "unknown",
      updatedAt: profile.consent_updated_at || "",
      records: consentListFor(profile.customer_object_uuid)
    },
    serviceDna: serviceDnaFor(user.id),
    documentSummary: {
      total: metrics.documentCount,
      verified: metrics.verifiedDocumentCount
    },
    supportSummary: {
      total: metrics.ticketCount,
      open: metrics.openTicketCount
    },
    timeline: timelineFor(profile.customer_object_uuid, options.timelineLimit || 20),
    updatedAt: profile.updated_at
  };
}

function getCustomer360ByPhone(rawPhone) {
  const user = getUserByPhone(rawPhone);
  return user ? getCustomer360ByUserId(user.id) : null;
}

function listCustomer360({ limit = 200 } = {}) {
  const users = db.all(
    "SELECT * FROM users ORDER BY updated_at DESC, id DESC LIMIT ?",
    [Number(limit || 200)]
  );
  return users.map((user) => getCustomer360ByUserId(user.id, { timelineLimit: 8 })).filter(Boolean);
}

function getRecentOrderForUser(userId) {
  const order = db.get(
    `SELECT id, order_id, order_type, status, total_paise, currency, created_at
     FROM orders
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [Number(userId)]
  );
  if (!order) return null;

  const payment = db.get(
    "SELECT status, method, gateway FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1",
    [order.id]
  );
  const firstItem = db.get(
    "SELECT item_name FROM order_items WHERE order_id = ? ORDER BY id ASC LIMIT 1",
    [order.id]
  );
  const itemCount = db.get(
    "SELECT COUNT(*) AS count FROM order_items WHERE order_id = ?",
    [order.id]
  );

  return {
    orderId: order.order_id,
    serviceName: firstItem?.item_name || "Order",
    itemCount: Number(itemCount?.count || 0),
    orderDate: order.created_at,
    orderStatus: order.status,
    paymentStatus: payment?.status || "pending",
    amount: Math.round(Number(order.total_paise || 0) / 100),
    currency: order.currency || "INR"
  };
}

function customerDashboardProjection(genome) {
  if (!genome) return null;
  return {
    customerUuid: genome.customerUuid,
    customerNumber: genome.customerNumber,
    lifecycleStage: genome.lifecycle.stage,
    segment: genome.lifecycle.segment,
    trustScore: genome.trust.score,
    riskLevel: genome.trust.riskLevel,
    preferredLanguage: genome.preferences.preferredLanguage,
    preferredChannel: genome.preferences.preferredChannel,
    consentStatus: genome.consent.status,
    lifetimeValue: genome.financial.lifetimeValue,
    serviceDna: genome.serviceDna,
    timeline: genome.timeline.slice(0, 8),
    object: genome.object
  };
}

function attachGenomeToDashboard(dashboard, userOrPhone) {
  const user = typeof userOrPhone === "object" ? userOrPhone : getUserByPhone(userOrPhone);
  const genome = user ? getCustomer360ByUserId(user.id) : null;
  if (!dashboard || !dashboard.customer || !genome) return dashboard;
  return {
    ...dashboard,
    customer: {
      ...dashboard.customer,
      genome: customerDashboardProjection(genome)
    },
    customer360: customerDashboardProjection(genome)
  };
}

function normalizeProfileUpdate(payload = {}) {
  const hasLanguage = Object.prototype.hasOwnProperty.call(payload, "preferredLanguage")
    || Object.prototype.hasOwnProperty.call(payload, "preferred_language");
  const hasChannel = Object.prototype.hasOwnProperty.call(payload, "preferredChannel")
    || Object.prototype.hasOwnProperty.call(payload, "preferred_channel");
  return {
    name: safeString(payload.name, 120),
    email: cleanEmail(payload.email),
    address: safeString(payload.address || payload.addressLine1 || payload.address_line_1 || payload.city, 500),
    addressLine2: safeString(payload.addressLine2 || payload.address_line_2, 240),
    landmark: safeString(payload.landmark, 180),
    city: safeString(payload.city || payload.address, 180),
    district: safeString(payload.district, 180),
    state: safeString(payload.state, 120),
    pincode: safeString(payload.pincode, 12),
    country: safeString(payload.country, 80),
    preferredLanguage: hasLanguage ? cleanLanguage(payload.preferredLanguage || payload.preferred_language) : undefined,
    preferredChannel: hasChannel ? cleanChannel(payload.preferredChannel || payload.preferred_channel) : undefined,
    consent: payload.consent && typeof payload.consent === "object" ? payload.consent : null
  };
}

function updateCustomerProfile(userId, payload = {}, actor = {}) {
  const user = loadUser(userId);
  if (!user) throw new Error("Customer account not found.");
  const profile = ensureCustomerProfileForUser(user.id);
  if (!profile) throw new Error("Customer profile could not be initialized.");
  const next = normalizeProfileUpdate(payload);
  const changedFields = [];

  const nextName = next.name || profile.display_name;
  const nextEmail = next.email || profile.email || "";
  const nextAddress = next.address || profile.address || "";
  const nextAddressLine2 = next.addressLine2 || profile.address_line_2 || "";
  const nextLandmark = next.landmark || profile.landmark || "";
  const nextCity = next.city || profile.city || "";
  const nextDistrict = next.district || profile.district || "";
  const nextState = next.state || profile.state || "";
  const nextPincode = next.pincode || profile.pincode || "";
  const nextCountry = next.country || profile.country || "India";
  const nextLanguage = next.preferredLanguage === undefined
    ? profile.preferred_language || "hi"
    : next.preferredLanguage;
  const nextChannel = next.preferredChannel === undefined
    ? profile.preferred_channel || "whatsapp"
    : next.preferredChannel;
  const emailChanged = (profile.email || "").toLowerCase() !== String(nextEmail || "").toLowerCase();

  if ((profile.display_name || "") !== nextName) changedFields.push("name");
  if ((profile.email || "") !== nextEmail) changedFields.push("email");
  if ((profile.address || "") !== nextAddress) changedFields.push("address");
  if ((profile.address_line_2 || "") !== nextAddressLine2) changedFields.push("address_line_2");
  if ((profile.landmark || "") !== nextLandmark) changedFields.push("landmark");
  if ((profile.city || "") !== nextCity) changedFields.push("city");
  if ((profile.district || "") !== nextDistrict) changedFields.push("district");
  if ((profile.state || "") !== nextState) changedFields.push("state");
  if ((profile.pincode || "") !== nextPincode) changedFields.push("pincode");
  if ((profile.country || "India") !== nextCountry) changedFields.push("country");
  if ((profile.preferred_language || "hi") !== nextLanguage) changedFields.push("preferred_language");
  if ((profile.preferred_channel || "whatsapp") !== nextChannel) changedFields.push("preferred_channel");

  if (changedFields.length > 0) {
    db.withTransaction(() => {
      db.run(
        `UPDATE users
         SET name = ?,
             email = COALESCE(NULLIF(?, ''), email),
             address = COALESCE(NULLIF(?, ''), address),
             email_verified = CASE WHEN ? THEN 0 ELSE email_verified END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nextName, nextEmail, nextAddress, emailChanged ? 1 : 0, user.id]
      );
      db.run(
        `UPDATE customer_profiles
         SET display_name = ?,
             email = COALESCE(NULLIF(?, ''), email),
             address = COALESCE(NULLIF(?, ''), address),
             address_line_2 = ?,
             landmark = ?,
             city = COALESCE(NULLIF(?, ''), city),
             district = ?,
             state = ?,
             pincode = ?,
             country = ?,
             preferred_language = ?,
             preferred_channel = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nextName, nextEmail, nextAddress, nextAddressLine2, nextLandmark, nextCity, nextDistrict, nextState, nextPincode, nextCountry, nextLanguage, nextChannel, profile.id]
      );
      upsertPreference(profile.customer_object_uuid, "language", nextLanguage, "customer_profile_update");
      upsertPreference(profile.customer_object_uuid, "communication_channel", nextChannel, "customer_profile_update");
      recordLifecycleEvent(profile.customer_object_uuid, {
        eventType: "profile_updated",
        title: "Customer profile updated",
        summary: `Customer profile updated: ${changedFields.join(", ")}.`,
        sourceTable: "customer_profiles",
        sourcePk: profile.id,
        actorType: actor.actorType || "customer",
        actorId: actor.actorId || user.id,
        metadata: { changedFields }
      });
    });
  }

  if (next.consent) {
    const consent = upsertConsent(profile.customer_object_uuid, next.consent);
    recordLifecycleEvent(profile.customer_object_uuid, {
      eventType: "consent_updated",
      title: "Customer consent updated",
      summary: `Consent ${consent.consentType} recorded as ${consent.status}.`,
      sourceTable: "customer_consents",
      sourcePk: consent.consentType,
      actorType: actor.actorType || "customer",
      actorId: actor.actorId || user.id,
      metadata: {
        consentType: consent.consentType,
        consentVersion: consent.consentVersion,
        policyVersion: consent.policyVersion,
        status: consent.status
      }
    });
  }

  return getCustomer360ByUserId(user.id);
}

function createReport() {
  return {
    milestone: "Phase 2 - Milestone 2.2",
    objective: "Customer Digital Genome Baseline",
    startedAt: nowIso(),
    finishedAt: null,
    totals: { users: 0, profilesCreatedOrUpdated: 0, failures: 0 },
    failures: []
  };
}

function writeReport(report, reportPath) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
}

function backfillExistingCustomers({ reportPath = null } = {}) {
  const report = createReport();
  const users = db.all("SELECT * FROM users ORDER BY id");
  for (const user of users) {
    report.totals.users += 1;
    try {
      const profile = ensureCustomerProfileForUser(user, { recordLifecycle: true });
      if (!profile) throw new Error("Customer profile registration returned no profile.");
      report.totals.profilesCreatedOrUpdated += 1;
    } catch (error) {
      report.totals.failures += 1;
      report.failures.push({ userId: user.id, message: error.message });
      console.warn(`[customer-genome] backfill failed for user ${user.id}:`, error.message);
    }
  }
  report.finishedAt = nowIso();
  writeReport(report, reportPath);
  return report;
}

module.exports = {
  DEFAULT_CONSENT_VERSION,
  DEFAULT_POLICY_VERSION,
  attachGenomeToDashboard,
  backfillExistingCustomers,
  customerDashboardProjection,
  ensureCustomerProfileForUser,
  getCustomer360ByPhone,
  getCustomer360ByUserId,
  getRecentOrderForUser,
  listCustomer360,
  recordLifecycleEvent,
  updateCustomerProfile,
  upsertConsent
};
