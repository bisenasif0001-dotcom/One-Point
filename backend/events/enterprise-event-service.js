"use strict";

const crypto = require("node:crypto");

function dbModule() {
  return require("../db");
}

function json(value, fallback = {}) {
  return JSON.stringify(value === undefined ? fallback : value);
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function cleanText(value, max = 255) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

function safeMetadata(payload) {
  if (!payload || typeof payload !== "object") return {};
  try {
    JSON.stringify(payload);
    return payload;
  } catch {
    return { serialization: "fallback" };
  }
}

function getEventDefinition(dbConn, eventKey) {
  return dbConn.prepare(`
    SELECT
      registry.event_key,
      registry.publisher_key,
      registry.version_key,
      registry.category_key,
      registry.compatibility_key,
      registry.event_status,
      registry.workflow_boundary,
      registry.integration_boundary,
      registry.ai_consumer_boundary,
      payload.payload_projection_class,
      payload.payload_visibility,
      payload.payload_redaction_policy,
      payload.payload_minimization_policy,
      payload.payload_classification,
      payload.sensitive_field_policy,
      payload.pii_policy,
      payload.secret_exposure_policy,
      immutability.immutable_event,
      immutability.append_only_class,
      immutability.replay_mutation_policy,
      immutability.replay_scope,
      immutability.replay_authority,
      locality.tenant_scope,
      locality.organization_scope,
      locality.branch_scope,
      locality.franchise_scope,
      locality.regional_scope,
      locality.partition_scope,
      locality.locality_class
    FROM enterprise_event_registry registry
    JOIN enterprise_event_policies payload ON payload.policy_key = registry.payload_policy_key
    JOIN enterprise_event_policies immutability ON immutability.policy_key = registry.immutability_policy_key
    JOIN enterprise_event_policies locality ON locality.policy_key = registry.locality_policy_key
    WHERE registry.event_key = ?
  `).get(eventKey);
}

function getSubscriptions(dbConn, eventKey) {
  return dbConn.prepare(`
    SELECT
      subscription.subscriber_key,
      subscription.acknowledgement_policy,
      subscription.acknowledgement_mode,
      subscription.checkpoint_strategy,
      subscription.delivery_semantics
    FROM enterprise_event_subscriptions subscription
    JOIN enterprise_event_subscribers subscriber
      ON subscriber.subscriber_key = subscription.subscriber_key
    WHERE subscription.event_key = ?
      AND subscription.subscription_status = 'Active'
      AND subscription.lifecycle_status IN ('Active', 'Approved')
      AND subscriber.lifecycle_status IN ('Active', 'Approved')
  `).all(eventKey);
}

function resolveProcessContext(dbConn, processContextKey) {
  if (!processContextKey) return null;
  return dbConn.prepare(`
    SELECT process_context_uuid, process_context_key, orchestration_context,
           workflow_chain_reference, orchestration_status
    FROM enterprise_event_process_contexts
    WHERE process_context_key = ?
  `).get(processContextKey) || null;
}

function publishEventWithDb(dbConn, input = {}) {
  const eventKey = cleanText(input.eventKey, 160);
  if (!eventKey) throw new Error("eventKey is required for governed event publication.");
  const definition = getEventDefinition(dbConn, eventKey);
  if (!definition) throw new Error(`Governed event definition not found for ${eventKey}.`);
  if (definition.event_status !== "Active") {
    throw new Error(`Governed event ${eventKey} is not active.`);
  }

  const publisherKey = cleanText(input.publisherKey, 160) || definition.publisher_key;
  if (publisherKey !== definition.publisher_key) {
    throw new Error(`Publisher ${publisherKey} is not authorized for governed event ${eventKey}.`);
  }

  const processContext = resolveProcessContext(dbConn, cleanText(input.processContextKey, 160));
  const eventMessageUuid = cleanText(input.eventMessageUuid, 120) || crypto.randomUUID();
  const linkedObjectType = cleanText(input.linkedObjectType, 100);
  const linkedObjectUuid = cleanText(input.linkedObjectUuid, 180);
  const correlationId = cleanText(input.correlationId, 180)
    || linkedObjectUuid
    || `${eventKey}:${cleanText(input.sourcePk, 80) || Date.now()}`;
  const payload = safeMetadata(input.payload || {});
  const metadata = safeMetadata({
    sourceOfTruthBoundary: "business_foundations_preserved",
    dashboardConsumerOnly: true,
    enterpriseIntelligenceBoundary: "metadata_only",
    workflowBoundary: definition.workflow_boundary,
    integrationBoundary: definition.integration_boundary,
    aiConsumerBoundary: definition.ai_consumer_boundary,
    ...safeMetadata(input.metadata || {})
  });

  dbConn.prepare(`
    INSERT INTO enterprise_event_store (
      event_message_uuid, event_key, publisher_key, version_key, category_key, compatibility_key,
      linked_object_type, linked_object_uuid, source_table, source_pk, correlation_id, causation_event_uuid,
      process_context_uuid, saga_uuid, parent_process_reference, workflow_chain_reference,
      orchestration_context, orchestration_status, tenant_scope, organization_scope, branch_scope,
      franchise_scope, regional_scope, partition_scope, locality_class, payload_json,
      payload_projection_class, payload_visibility, payload_redaction_policy, payload_minimization_policy,
      payload_classification, sensitive_field_policy, pii_policy, secret_exposure_policy,
      immutable_event, append_only_class, replay_mutation_policy, replay_scope, replay_authority,
      lifecycle_status, metadata_json, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Published', ?, COALESCE(?, CURRENT_TIMESTAMP))
  `).run(
    eventMessageUuid,
    eventKey,
    publisherKey,
    definition.version_key,
    definition.category_key,
    definition.compatibility_key,
    linkedObjectType,
    linkedObjectUuid,
    cleanText(input.sourceTable, 120),
    cleanText(input.sourcePk, 120),
    correlationId,
    cleanText(input.causationEventUuid, 120),
    processContext?.process_context_uuid || null,
    cleanText(input.sagaUuid, 120),
    cleanText(input.parentProcessReference, 180),
    cleanText(input.workflowChainReference, 180) || processContext?.workflow_chain_reference || null,
    cleanText(input.orchestrationContext, 180) || processContext?.orchestration_context || null,
    cleanText(input.orchestrationStatus, 120) || processContext?.orchestration_status || null,
    cleanText(input.tenantScope, 120) || definition.tenant_scope || null,
    cleanText(input.organizationScope, 120) || definition.organization_scope || null,
    cleanText(input.branchScope, 120) || definition.branch_scope || null,
    cleanText(input.franchiseScope, 120) || definition.franchise_scope || null,
    cleanText(input.regionalScope, 120) || definition.regional_scope || null,
    cleanText(input.partitionScope, 120) || definition.partition_scope || null,
    cleanText(input.localityClass, 120) || definition.locality_class || null,
    json(payload, {}),
    definition.payload_projection_class,
    definition.payload_visibility,
    definition.payload_redaction_policy,
    definition.payload_minimization_policy,
    definition.payload_classification,
    definition.sensitive_field_policy,
    definition.pii_policy,
    definition.secret_exposure_policy,
    Number(definition.immutable_event) === 1 ? 1 : 0,
    definition.append_only_class,
    definition.replay_mutation_policy,
    definition.replay_scope || null,
    definition.replay_authority || null,
    json(metadata, {}),
    cleanText(input.occurredAt, 80)
  );

  dbConn.prepare(`
    INSERT INTO enterprise_event_audit_log (
      event_audit_uuid, event_message_uuid, audit_action, actor_type, actor_id, metadata_json
    ) VALUES (?, ?, 'published', ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    eventMessageUuid,
    cleanText(input.actorType, 80) || "system",
    cleanText(input.actorId, 180),
    json({
      eventKey,
      publisherKey,
      linkedObjectType,
      linkedObjectUuid
    }, {})
  );

  const subscriptions = getSubscriptions(dbConn, eventKey);
  for (const subscription of subscriptions) {
    dbConn.prepare(`
      INSERT INTO enterprise_event_delivery_state (
        delivery_state_uuid, event_message_uuid, subscriber_key, event_key, consumer_state,
        delivery_status, acknowledgement_policy, acknowledgement_mode, checkpoint_strategy,
        delivery_semantics, lifecycle_status, asset_version, metadata_json
      ) VALUES (?, ?, ?, ?, 'queued', 'queued', ?, ?, ?, ?, 'Active', 1, ?)
    `).run(
      crypto.randomUUID(),
      eventMessageUuid,
      subscription.subscriber_key,
      eventKey,
      subscription.acknowledgement_policy,
      subscription.acknowledgement_mode,
      subscription.checkpoint_strategy,
      subscription.delivery_semantics,
      json({
        deliveryRuntime: "metadata_only",
        checkpointRuntime: "not_implemented",
        replayRuntime: "not_implemented"
      }, {})
    );
  }

  if (subscriptions.length) {
    dbConn.prepare(`
      INSERT INTO enterprise_event_audit_log (
        event_audit_uuid, event_message_uuid, audit_action, actor_type, actor_id, metadata_json
      ) VALUES (?, ?, 'delivery_state_initialized', 'system', 'enterprise-event-service', ?)
    `).run(
      crypto.randomUUID(),
      eventMessageUuid,
      json({
        eventKey,
        subscriberCount: subscriptions.length,
        subscribers: subscriptions.map((item) => item.subscriber_key)
      }, {})
    );
  }

  return {
    eventMessageUuid,
    eventKey,
    publisherKey,
    deliveryCount: subscriptions.length
  };
}

function publishEvent(input = {}) {
  const strict = input.strict === true;
  try {
    const db = dbModule();
    return db.withTransaction((dbConn) => publishEventWithDb(dbConn, input));
  } catch (error) {
    if (/cannot start a transaction within a transaction/i.test(error.message || "")) {
      const db = dbModule();
      return publishEventWithDb(db.getDb(), input);
    }
    if (strict) throw error;
    console.warn("[enterprise-event-service] publish skipped:", error.message);
    return null;
  }
}

function listEventsForObject(linkedObjectType, linkedObjectUuid, options = {}) {
  if (!linkedObjectType || !linkedObjectUuid) return [];
  const db = dbModule();
  return db.all(`
    SELECT event_message_uuid, event_key, publisher_key, occurred_at, payload_json, metadata_json
    FROM enterprise_event_store
    WHERE linked_object_type = ? AND linked_object_uuid = ?
    ORDER BY occurred_at DESC
    LIMIT ?
  `, [linkedObjectType, linkedObjectUuid, Number(options.limit || 100)]).map((row) => ({
    eventMessageUuid: row.event_message_uuid,
    eventKey: row.event_key,
    publisherKey: row.publisher_key,
    occurredAt: row.occurred_at,
    payload: parseJson(row.payload_json, {}),
    metadata: parseJson(row.metadata_json, {})
  }));
}

module.exports = {
  publishEvent,
  publishEventWithDb,
  listEventsForObject
};
