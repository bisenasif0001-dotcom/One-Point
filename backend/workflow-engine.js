"use strict";

const fs = require("node:fs");
const path = require("node:path");
const db = require("./db");
const repository = require("./repositories/order-workflow-repository");
const enterpriseEventService = require("./events/enterprise-event-service");

const STATE_LABELS = Object.freeze({
  draft: "Draft",
  created: "Created",
  documents_pending: "Documents Pending",
  verification: "Verification",
  payment: "Payment",
  ready: "Ready",
  processing: "Processing",
  government_submission: "Government Submission",
  waiting: "Waiting",
  completed: "Completed",
  delivered: "Delivered",
  feedback: "Feedback",
  archived: "Archived",
  cancelled: "Cancelled",
  payment_failed: "Payment Failed"
});

const STATUS_TO_STATE = Object.freeze({
  draft: "draft",
  created: "created",
  pending: "created",
  lead: "created",
  interested: "created",
  documents_pending: "documents_pending",
  docs_pending: "documents_pending",
  verified: "verification",
  approved: "verification",
  payment_pending: "payment",
  paid: "ready",
  captured: "ready",
  ready: "ready",
  processing: "processing",
  government_submission: "government_submission",
  waiting: "waiting",
  completed: "completed",
  delivered: "delivered",
  out_for_delivery: "delivered",
  feedback: "feedback",
  archived: "archived",
  cancelled: "cancelled",
  canceled: "cancelled",
  payment_failed: "payment_failed",
  failed: "payment_failed"
});

const ALLOWED_TRANSITIONS = Object.freeze({
  draft: ["created", "cancelled"],
  created: ["documents_pending", "verification", "payment", "ready", "processing", "cancelled", "payment_failed"],
  documents_pending: ["verification", "payment", "ready", "cancelled"],
  verification: ["documents_pending", "payment", "ready", "processing", "cancelled"],
  payment: ["ready", "payment_failed", "cancelled"],
  ready: ["processing", "completed", "cancelled"],
  processing: ["government_submission", "waiting", "completed", "delivered", "cancelled"],
  government_submission: ["waiting", "completed", "delivered", "cancelled"],
  waiting: ["processing", "completed", "delivered", "cancelled"],
  completed: ["delivered", "feedback", "archived"],
  delivered: ["feedback", "archived"],
  feedback: ["archived"],
  payment_failed: ["payment", "ready", "cancelled"],
  cancelled: ["archived"],
  archived: []
});

const DEFAULT_STEPS = Object.freeze([
  { stepKey: "created", stepName: "Order Intake", stepOrder: 10, ownerDepartment: "operations", ownerQueue: "intake", executionMode: "sequential", expectedDurationMinutes: 30, slaTimerMinutes: 120, escalationThresholdMinutes: 180 },
  { stepKey: "documents_pending", stepName: "Document Collection", stepOrder: 20, ownerDepartment: "customer_support", ownerQueue: "documents", executionMode: "conditional", expectedDurationMinutes: 240, slaTimerMinutes: 1440, escalationThresholdMinutes: 1800 },
  { stepKey: "verification", stepName: "Document Verification", stepOrder: 30, ownerDepartment: "operations", ownerQueue: "verification", executionMode: "parallel", expectedDurationMinutes: 180, slaTimerMinutes: 720, escalationThresholdMinutes: 900 },
  { stepKey: "payment", stepName: "Payment Confirmation", stepOrder: 40, ownerDepartment: "finance", ownerQueue: "payments", executionMode: "conditional", expectedDurationMinutes: 30, slaTimerMinutes: 240, escalationThresholdMinutes: 360 },
  { stepKey: "processing", stepName: "Department Processing", stepOrder: 50, ownerDepartment: "operations", ownerQueue: "processing", executionMode: "sequential", expectedDurationMinutes: 480, slaTimerMinutes: 2880, escalationThresholdMinutes: 3600 },
  { stepKey: "completed", stepName: "Completion Handover", stepOrder: 60, ownerDepartment: "delivery", ownerQueue: "handover", executionMode: "optional", expectedDurationMinutes: 60, slaTimerMinutes: 480, escalationThresholdMinutes: 720 }
]);

function nowIso() {
  return new Date().toISOString();
}

function normalizeState(value) {
  const key = String(value || "created").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS_TO_STATE[key] || key;
}

function stateLabel(state) {
  return STATE_LABELS[normalizeState(state)] || String(state || "Created");
}

function persistedOrderStatusForState(state) {
  return normalizeState(state);
}

function stepStatusForState(stepKey, currentState) {
  const state = normalizeState(currentState);
  const key = String(stepKey || "").trim().toLowerCase();
  const activeStepByState = {
    draft: "created",
    created: "created",
    documents_pending: "documents_pending",
    verification: "verification",
    payment: "payment",
    payment_failed: "payment",
    ready: "payment",
    processing: "processing",
    government_submission: "processing",
    waiting: "processing",
    completed: "completed",
    delivered: "completed",
    feedback: "completed",
    archived: "completed"
  };
  const activeKey = activeStepByState[state];
  if (key === "human_assignment") return key === activeKey ? "active" : "pending";
  return key === activeKey ? "active" : "pending";
}

function isAllowedTransition(previousState, nextState) {
  const previous = normalizeState(previousState);
  const next = normalizeState(nextState);
  if (previous === next) return true;
  return (ALLOWED_TRANSITIONS[previous] || []).includes(next);
}

function assertTransition(previousState, nextState, options = {}) {
  const previous = normalizeState(previousState);
  const next = normalizeState(nextState);
  if (isAllowedTransition(previous, next)) return;
  if (options.override === true && String(options.reason || "").trim()) return;
  throw new Error(`Illegal workflow transition rejected: ${stateLabel(previous)} to ${stateLabel(next)}.`);
}

function safeJson(value, fallback = {}) {
  return repository.safeJson(value, fallback);
}

function eventKeyForWorkflowEvent(eventType = "") {
  const normalized = String(eventType || "").trim();
  if (normalized === "order.created") return "order.created";
  if (normalized === "payment.session_created") return "payment.session_created";
  if (normalized === "payment.captured") return "payment.captured";
  if (normalized === "payment.failed") return "payment.failed";
  if (normalized.startsWith("workflow.assignment.")) return "workflow.assignment.changed";
  if (normalized === "workflow.transition" || normalized === "workflow.override") return "workflow.transition";
  return "workflow.timeline.event";
}

function publisherKeyForWorkflowEvent(eventType = "") {
  const eventKey = eventKeyForWorkflowEvent(eventType);
  if (eventKey === "order.created" || eventKey.startsWith("payment.")) {
    return "payment_service_publisher";
  }
  if (eventKey === "workflow.assignment.changed") {
    return "assignment_engine_publisher";
  }
  return "workflow_engine_publisher";
}

function publishWorkflowGovernedEvent(dbConn, order, eventType, details = {}) {
  const orderObject = (() => {
    try {
      return db.getUniversalObjectPayload("orders", order.id);
    } catch {
      return null;
    }
  })();
  enterpriseEventService.publishEventWithDb(dbConn, {
    eventKey: eventKeyForWorkflowEvent(eventType),
    publisherKey: publisherKeyForWorkflowEvent(eventType),
    linkedObjectType: "Order",
    linkedObjectUuid: orderObject?.universalUuid || null,
    sourceTable: details.sourceTable || "orders",
    sourcePk: details.sourcePk || order.id,
    correlationId: orderObject?.universalUuid || order.order_id,
    processContextKey: eventType.startsWith("workflow.assignment.") ? "workflow_assignment_context" : "checkout_payment_context",
    payload: {
      eventType,
      orderId: order.order_id,
      orderStatus: order.status,
      previousState: details.previousState || null,
      newState: details.newState || null,
      title: details.title || null,
      summary: details.summary || null,
      metadata: details.metadata || {}
    },
    actorType: details.actorType || "system",
    actorId: details.actorId || null,
    metadata: {
      workflowBoundary: "coordination_only",
      timelineEvent: true
    }
  });
}

function writeReport(report, reportPath) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function getOrder(orderOrId, dbConn = db.getDb()) {
  if (orderOrId && typeof orderOrId === "object" && orderOrId.id) return orderOrId;
  const orderId = String(orderOrId || "").trim();
  if (!orderId) throw new Error("Order id is required.");
  const numericId = Number(orderId) || 0;
  const order = dbConn.prepare("SELECT * FROM orders WHERE order_id = ? OR id = ?").get(orderId, numericId);
  if (!order) throw new Error("Order not found.");
  return order;
}

function resolveServiceItem(orderId, dbConn) {
  return dbConn.prepare(`
    SELECT oi.item_slug, oi.item_name, s.id AS service_id, s.slug AS service_slug, s.name AS service_name
    FROM order_items oi
    LEFT JOIN services s ON s.slug = oi.item_slug
    WHERE oi.order_id = ? AND oi.item_type = 'service'
    ORDER BY oi.id ASC
    LIMIT 1
  `).get(orderId);
}

function resolveServiceDnaWorkflow(serviceSlug, dbConn) {
  if (!serviceSlug) return null;
  return dbConn.prepare(`
    SELECT p.id AS profile_id, p.service_slug, p.display_name, p.version,
           l.id AS layer_id, l.config_json
    FROM service_dna_profiles p
    LEFT JOIN service_dna_layers l ON l.profile_id = p.id AND l.layer_key = 'workflow' AND l.active = 1
    WHERE p.service_slug = ? AND p.active = 1
    ORDER BY p.version DESC, p.id DESC
    LIMIT 1
  `).get(serviceSlug);
}

function resolveWorkflowDefinition(order, dbConn = db.getDb()) {
  const serviceItem = resolveServiceItem(order.id, dbConn);
  const serviceSlug = serviceItem?.service_slug || serviceItem?.item_slug || "";
  const serviceDna = resolveServiceDnaWorkflow(serviceSlug, dbConn);
  if (serviceDna) {
    return repository.upsertWorkflowDefinition(dbConn, {
      definitionKey: `service:${serviceDna.service_slug}:workflow:v${serviceDna.version || 1}`,
      definitionType: "Service DNA Workflow",
      sourceKind: "service_dna",
      serviceDnaProfileId: serviceDna.profile_id,
      serviceDnaWorkflowLayerId: serviceDna.layer_id || null,
      name: `${serviceDna.display_name || serviceDna.service_slug} Workflow`,
      version: serviceDna.version || 1,
      lifecycleStatus: "Published",
      ownerDepartment: "operations",
      ownerQueue: "service-workflow",
      metadata: {
        source: "active_service_dna_workflow",
        serviceSlug: serviceDna.service_slug,
        layerConfig: safeJson(serviceDna.config_json, {}),
        executionScope: "metadata_only"
      }
    });
  }
  return repository.upsertWorkflowDefinition(dbConn, {
    definitionKey: "product:default:workflow:v1",
    definitionType: "Product Workflow Template",
    sourceKind: "product_template",
    productWorkflowTemplateKey: "default_product_order_workflow",
    name: "Default Product Order Workflow",
    version: 1,
    lifecycleStatus: "Published",
    ownerDepartment: "operations",
    ownerQueue: "product-workflow",
    metadata: {
      source: "baseline_product_workflow_template",
      executionScope: "metadata_only"
    }
  });
}

function ensureDefaultSteps(workflow, dbConn = db.getDb()) {
  for (const step of DEFAULT_STEPS) {
    repository.upsertStep(dbConn, {
      ...step,
      workflowId: workflow.id,
      status: stepStatusForState(step.stepKey, workflow.current_state),
      metadata: {
        executionScope: "metadata_only",
        healthScoreScope: "placeholder_only"
      }
    });
  }
}

function ensureWorkflowForOrder(orderOrId, options = {}) {
  const dbConn = options.dbConn || db.getDb();
  const order = getOrder(orderOrId, dbConn);
  const existing = repository.getWorkflowByOrderId(dbConn, order.id);
  if (existing) {
    ensureDefaultSteps(existing, dbConn);
    return existing;
  }
  const definition = resolveWorkflowDefinition(order, dbConn);
  const objectPayload = (() => {
    try {
      return db.getUniversalObjectPayload("orders", order.id);
    } catch {
      return null;
    }
  })();
  const workflow = repository.createWorkflow(dbConn, {
    orderId: order.id,
    orderObjectUuid: objectPayload?.universalUuid || null,
    workflowDefinitionId: definition.id,
    workflowDefinitionType: definition.definition_type,
    workflowDefinitionVersion: definition.version,
    currentState: normalizeState(order.status),
    currentStage: stateLabel(order.status),
    statusLabel: stateLabel(order.status),
    priority: order.assignment_priority || "normal",
    ownerDepartment: definition.owner_department || "operations",
    ownerQueue: definition.owner_queue || "normal",
    metadata: {
      initializedBy: options.actorType || "system",
      sourceStatus: order.status || "created",
      stateMachine: "phase-2-milestone-2.4",
      executionScope: "metadata_only"
    }
  });
  ensureDefaultSteps(workflow, dbConn);
  repository.addTimelineEvent(dbConn, {
    orderId: order.id,
    workflowId: workflow.id,
    eventType: options.eventType || "workflow.initialized",
    newState: workflow.current_state,
    stage: workflow.current_stage,
    status: workflow.status_label,
    actorType: options.actorType || "system",
    actorId: options.actorId || "phase-2-milestone-2.4",
    title: "Order workflow initialized",
    summary: "Baseline workflow metadata created for the order.",
    sourceTable: "orders",
    sourcePk: order.id,
    metadata: { workflowDefinitionId: definition.id, workflowDefinitionType: definition.definition_type }
  });
  if (options.eventType) {
    publishWorkflowGovernedEvent(dbConn, order, options.eventType, {
      sourceTable: "orders",
      sourcePk: order.id,
      previousState: null,
      newState: workflow.current_state,
      title: "Order workflow initialized",
      summary: "Baseline workflow metadata created for the order.",
      actorType: options.actorType || "system",
      actorId: options.actorId || "phase-2-milestone-2.4",
      metadata: {
        workflowDefinitionId: definition.id,
        workflowDefinitionType: definition.definition_type
      }
    });
  }
  return repository.getWorkflowByOrderId(dbConn, order.id);
}

function transitionOrderWorkflow(orderOrId, nextStatusOrState, options = {}) {
  const dbConn = options.dbConn || db.getDb();
  const order = getOrder(orderOrId, dbConn);
  const workflow = ensureWorkflowForOrder(order, { ...options, dbConn });
  const previousState = normalizeState(workflow.current_state || order.status);
  const nextState = normalizeState(nextStatusOrState);
  assertTransition(previousState, nextState, options);
  const label = stateLabel(nextState);
  const updated = repository.updateWorkflowState(dbConn, workflow.id, {
    currentState: nextState,
    currentStage: label,
    statusLabel: label
  });
  dbConn.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(persistedOrderStatusForState(nextState), order.id);
  ensureDefaultSteps(updated, dbConn);
  repository.addTimelineEvent(dbConn, {
    orderId: order.id,
    workflowId: workflow.id,
    eventType: options.override === true ? "workflow.override" : (options.eventType || "workflow.transition"),
    previousState,
    newState: nextState,
    stage: label,
    status: label,
    actorType: options.actorType || "system",
    actorId: options.actorId || null,
    title: options.title || (options.override === true ? "Manual workflow override" : "Workflow state changed"),
    summary: options.summary || `${stateLabel(previousState)} to ${label}`,
    overrideReason: options.override === true ? String(options.reason || "").trim() : null,
    sourceTable: options.sourceTable || "orders",
    sourcePk: options.sourcePk || order.id,
    metadata: {
      manualOverride: options.override === true,
      previousState,
      newState: nextState
    }
  });
  const primaryEventType = options.override === true ? "workflow.override" : (options.eventType || "workflow.transition");
  publishWorkflowGovernedEvent(dbConn, order, primaryEventType, {
    sourceTable: options.sourceTable || "orders",
    sourcePk: options.sourcePk || order.id,
    previousState,
    newState: nextState,
    title: options.title || (options.override === true ? "Manual workflow override" : "Workflow state changed"),
    summary: options.summary || `${stateLabel(previousState)} to ${label}`,
    actorType: options.actorType || "system",
    actorId: options.actorId || null,
    metadata: {
      manualOverride: options.override === true,
      previousState,
      newState: nextState
    }
  });
  if (primaryEventType !== "workflow.transition" && primaryEventType !== "workflow.override") {
    publishWorkflowGovernedEvent(dbConn, order, "workflow.transition", {
      sourceTable: options.sourceTable || "orders",
      sourcePk: options.sourcePk || order.id,
      previousState,
      newState: nextState,
      title: "Workflow state changed",
      summary: `${stateLabel(previousState)} to ${label}`,
      actorType: options.actorType || "system",
      actorId: options.actorId || null,
      metadata: {
        sourceEventType: primaryEventType,
        manualOverride: false,
        previousState,
        newState: nextState
      }
    });
  }
  return getWorkflowForOrder(order.id, { dbConn, includeInternal: options.includeInternal !== false });
}

function recordOrderEvent(orderOrId, eventType, options = {}) {
  const dbConn = options.dbConn || db.getDb();
  const order = getOrder(orderOrId, dbConn);
  const workflow = ensureWorkflowForOrder(order, { ...options, dbConn });
  repository.addTimelineEvent(dbConn, {
    orderId: order.id,
    workflowId: workflow.id,
    eventType,
    previousState: options.previousState || null,
    newState: options.newState || null,
    stage: options.stage || workflow.current_stage,
    status: options.status || workflow.status_label,
    actorType: options.actorType || "system",
    actorId: options.actorId || null,
    title: options.title || eventType,
    summary: options.summary || "",
    sourceTable: options.sourceTable || "orders",
    sourcePk: options.sourcePk || order.id,
    metadata: options.metadata || {}
  });
  publishWorkflowGovernedEvent(dbConn, order, eventType, {
    sourceTable: options.sourceTable || "orders",
    sourcePk: options.sourcePk || order.id,
    previousState: options.previousState || null,
    newState: options.newState || null,
    title: options.title || eventType,
    summary: options.summary || "",
    actorType: options.actorType || "system",
    actorId: options.actorId || null,
    metadata: options.metadata || {}
  });
  return getWorkflowForOrder(order.id, { dbConn, includeInternal: options.includeInternal !== false });
}

function syncAssignmentTask(orderOrId, assignment, options = {}) {
  if (!assignment?.id) return null;
  const dbConn = options.dbConn || db.getDb();
  const order = getOrder(orderOrId || assignment.order_id, dbConn);
  const workflow = ensureWorkflowForOrder(order, { ...options, dbConn });
  const step = repository.upsertStep(dbConn, {
    workflowId: workflow.id,
    stepKey: "human_assignment",
    stepName: "Human Assignment",
    stepOrder: 55,
    ownerDepartment: "operations",
    ownerQueue: "assignment",
    executionMode: "sequential",
    status: assignment.status === "done" ? "completed" : "active",
    expectedDurationMinutes: 240,
    slaTimerMinutes: 1440,
    escalationThresholdMinutes: 1800,
    metadata: { source: "task_assignments", executionScope: "metadata_only" }
  });
  const status = normalizeAssignmentStatus(assignment.status);
  const task = repository.upsertAssignmentTask(dbConn, {
    workflowId: workflow.id,
    orderId: order.id,
    stepId: step.id,
    taskAssignmentId: assignment.id,
    taskKey: `assignment:${assignment.id}`,
    title: `Assignment for ${order.order_id}`,
    description: assignment.notes || assignment.admin_notes || "Order assignment task.",
    status,
    priority: assignment.priority || order.assignment_priority || "normal",
    ownerType: assignment.staff_id ? "human" : "queue",
    ownerId: assignment.staff_id ? String(assignment.staff_id) : null,
    ownerDepartment: "operations",
    ownerQueue: "assignment",
    executionMode: "sequential",
    completedAt: assignment.completed_at || null,
    metadata: {
      source: "task_assignments",
      assignmentStatus: assignment.status,
      workflowRuntime: "metadata_only"
    }
  });
  recordOrderEvent(order, options.eventType || "workflow.task.synced", {
    ...options,
    dbConn,
    title: options.title || "Workflow task synchronized",
    summary: `Assignment task ${assignment.id} is ${status}.`,
    sourceTable: "task_assignments",
    sourcePk: assignment.id,
    metadata: { taskId: task.id, assignmentId: assignment.id, status }
  });
  if (["assigned", "accepted", "working"].includes(status) && isAllowedTransition(workflow.current_state, "processing")) {
    transitionOrderWorkflow(order, "processing", {
      ...options,
      dbConn,
      actorType: options.actorType || "system",
      eventType: "workflow.assignment.processing",
      title: "Assignment moved workflow to processing",
      sourceTable: "task_assignments",
      sourcePk: assignment.id
    });
  }
  if (status === "done") {
    const current = repository.getWorkflowByOrderId(dbConn, order.id);
    if (!isAllowedTransition(current.current_state, "completed") && isAllowedTransition(current.current_state, "processing")) {
      transitionOrderWorkflow(order, "processing", {
        ...options,
        dbConn,
        eventType: "workflow.assignment.processing",
        title: "Assignment completion prepared workflow",
        sourceTable: "task_assignments",
        sourcePk: assignment.id
      });
    }
    transitionOrderWorkflow(order, "completed", {
      ...options,
      dbConn,
      eventType: "workflow.assignment.completed",
      title: "Assignment completed workflow",
      sourceTable: "task_assignments",
      sourcePk: assignment.id
    });
  }
  return getWorkflowForOrder(order.id, { dbConn, includeInternal: true });
}

function normalizeAssignmentStatus(status) {
  const clean = String(status || "pending").toLowerCase();
  if (["accepted", "working", "done", "cancelled", "blocked"].includes(clean)) return clean;
  return clean === "assigned" ? "assigned" : "pending";
}

function getWorkflowForOrder(orderOrId, options = {}) {
  const dbConn = options.dbConn || db.getDb();
  const order = getOrder(orderOrId, dbConn);
  const projection = repository.getWorkflowProjection(dbConn, order.id, {
    timelineLimit: options.timelineLimit || 12,
    taskLimit: options.taskLimit || 20
  });
  if (!projection) return null;
  return projectWorkflow(projection, options);
}

function projectWorkflow(projection, options = {}) {
  const { workflow, steps, tasks, timeline } = projection;
  const pendingTasks = tasks.filter((task) => !["done", "cancelled"].includes(task.status)).length;
  const payload = {
    id: workflow.id,
    currentState: workflow.current_state,
    currentStage: workflow.current_stage,
    statusLabel: workflow.status_label,
    priority: workflow.priority,
    ownerDepartment: workflow.owner_department,
    ownerQueue: workflow.owner_queue,
    slaDueAt: workflow.sla_due_at,
    escalationLevel: workflow.escalation_level,
    health: {
      status: workflow.health_status,
      metadata: safeJson(workflow.health_score_metadata_json, { status: "placeholder", calculation: "not_implemented" })
    },
    definition: {
      id: workflow.workflow_definition_id,
      key: workflow.definition_key,
      name: workflow.definition_name,
      type: workflow.definition_type,
      version: workflow.workflow_definition_version,
      lifecycleStatus: workflow.lifecycle_status,
      active: Number(workflow.definition_active) === 1
    },
    tasksSummary: {
      total: tasks.length,
      open: pendingTasks,
      completed: tasks.filter((task) => task.status === "done").length
    },
    steps: steps.map((step) => ({
      key: step.step_key,
      name: step.step_name,
      order: step.step_order,
      ownerDepartment: step.owner_department,
      ownerQueue: step.owner_queue,
      executionMode: step.execution_mode,
      status: step.status,
      expectedDurationMinutes: step.expected_duration_minutes,
      slaTimerMinutes: step.sla_timer_minutes,
      escalationThresholdMinutes: step.escalation_threshold_minutes
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      taskKey: task.task_key,
      title: task.title,
      status: task.status,
      priority: task.priority,
      ownerType: task.owner_type,
      ownerDepartment: task.owner_department,
      ownerQueue: task.owner_queue,
      executionMode: task.execution_mode,
      dueAt: task.due_at,
      completedAt: task.completed_at
    })),
    timeline: timeline.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      previousState: event.previous_state,
      newState: event.new_state,
      stage: event.stage,
      status: event.status,
      actorType: event.actor_type,
      actorId: options.public ? undefined : event.actor_id,
      title: event.title,
      summary: event.summary,
      overrideReason: options.public ? undefined : event.override_reason,
      occurredAt: event.occurred_at
    }))
  };
  return payload;
}

function getPublicWorkflowForOrder(orderOrId) {
  return getWorkflowForOrder(orderOrId, { public: true, timelineLimit: 6, taskLimit: 10 });
}

function backfillExistingOrders(options = {}) {
  const dbConn = options.dbConn || db.getDb();
  const report = {
    milestone: "Phase 2 - Milestone 2.4",
    name: "Order Orchestration Baseline Migration",
    startedAt: nowIso(),
    finishedAt: null,
    totals: {
      orders: 0,
      workflowsCreatedOrVerified: 0,
      failures: 0
    },
    failures: []
  };
  const orders = dbConn.prepare("SELECT * FROM orders ORDER BY id ASC").all();
  report.totals.orders = orders.length;
  for (const order of orders) {
    try {
      ensureWorkflowForOrder(order, { dbConn, actorType: "migration", actorId: "phase-2-milestone-2.4" });
      report.totals.workflowsCreatedOrVerified += 1;
    } catch (error) {
      report.totals.failures += 1;
      report.failures.push({
        orderId: order.order_id,
        orderDbId: order.id,
        message: error && error.message ? error.message : String(error)
      });
    }
  }
  report.finishedAt = nowIso();
  writeReport(report, options.reportPath);
  return report;
}

module.exports = {
  normalizeState,
  stateLabel,
  isAllowedTransition,
  assertTransition,
  ensureWorkflowForOrder,
  transitionOrderWorkflow,
  recordOrderEvent,
  syncAssignmentTask,
  getWorkflowForOrder,
  getPublicWorkflowForOrder,
  backfillExistingOrders
};
