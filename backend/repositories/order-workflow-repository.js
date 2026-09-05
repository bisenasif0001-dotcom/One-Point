"use strict";

function safeJson(value, fallback = {}) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function json(value) {
  return JSON.stringify(value === undefined ? {} : value);
}

function getWorkflowByOrderId(dbConn, orderId) {
  return dbConn.prepare(`
    SELECT ow.*, wd.definition_key, wd.name AS definition_name, wd.definition_type, wd.source_kind,
           wd.lifecycle_status, wd.active AS definition_active
    FROM order_workflows ow
    JOIN workflow_definitions wd ON wd.id = ow.workflow_definition_id
    WHERE ow.order_id = ?
  `).get(orderId);
}

function getWorkflowDefinition(dbConn, definitionKey) {
  return dbConn.prepare("SELECT * FROM workflow_definitions WHERE definition_key = ? AND active = 1 LIMIT 1").get(definitionKey);
}

function upsertWorkflowDefinition(dbConn, definition) {
  dbConn.prepare(`
    INSERT INTO workflow_definitions (
      definition_key, definition_type, source_kind, service_dna_profile_id,
      service_dna_workflow_layer_id, product_workflow_template_key, name,
      version, lifecycle_status, active, owner_department, owner_queue, metadata_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(definition_key) DO UPDATE SET
      definition_type = excluded.definition_type,
      source_kind = excluded.source_kind,
      service_dna_profile_id = excluded.service_dna_profile_id,
      service_dna_workflow_layer_id = excluded.service_dna_workflow_layer_id,
      product_workflow_template_key = excluded.product_workflow_template_key,
      name = excluded.name,
      version = excluded.version,
      lifecycle_status = excluded.lifecycle_status,
      active = excluded.active,
      owner_department = excluded.owner_department,
      owner_queue = excluded.owner_queue,
      metadata_json = excluded.metadata_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    definition.definitionKey,
    definition.definitionType,
    definition.sourceKind,
    definition.serviceDnaProfileId || null,
    definition.serviceDnaWorkflowLayerId || null,
    definition.productWorkflowTemplateKey || null,
    definition.name,
    Number(definition.version || 1),
    definition.lifecycleStatus || "Published",
    definition.active === false ? 0 : 1,
    definition.ownerDepartment || "operations",
    definition.ownerQueue || "normal",
    json(definition.metadata || {})
  );
  return getWorkflowDefinition(dbConn, definition.definitionKey);
}

function createWorkflow(dbConn, workflow) {
  const result = dbConn.prepare(`
    INSERT INTO order_workflows (
      order_id, order_object_uuid, workflow_definition_id, workflow_definition_type,
      workflow_definition_version, current_state, current_stage, status_label,
      priority, owner_department, owner_queue, health_status, health_score_metadata_json, metadata_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workflow.orderId,
    workflow.orderObjectUuid || null,
    workflow.workflowDefinitionId,
    workflow.workflowDefinitionType,
    Number(workflow.workflowDefinitionVersion || 1),
    workflow.currentState || "created",
    workflow.currentStage || "Created",
    workflow.statusLabel || "Created",
    workflow.priority || "normal",
    workflow.ownerDepartment || "operations",
    workflow.ownerQueue || "normal",
    workflow.healthStatus || "placeholder",
    json(workflow.healthScoreMetadata || { status: "placeholder", calculation: "not_implemented" }),
    json(workflow.metadata || {})
  );
  return getWorkflowByOrderId(dbConn, workflow.orderId) || dbConn.prepare("SELECT * FROM order_workflows WHERE id = ?").get(Number(result.lastInsertRowid));
}

function updateWorkflowState(dbConn, workflowId, update) {
  dbConn.prepare(`
    UPDATE order_workflows
    SET current_state = ?, current_stage = ?, status_label = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(update.currentState, update.currentStage, update.statusLabel, workflowId);
  return dbConn.prepare("SELECT * FROM order_workflows WHERE id = ?").get(workflowId);
}

function upsertStep(dbConn, step) {
  dbConn.prepare(`
    INSERT INTO order_workflow_steps (
      workflow_id, step_key, step_name, step_order, owner_department,
      owner_queue, execution_mode, status, expected_duration_minutes,
      sla_timer_minutes, escalation_threshold_minutes, metadata_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(workflow_id, step_key) DO UPDATE SET
      step_name = excluded.step_name,
      step_order = excluded.step_order,
      owner_department = excluded.owner_department,
      owner_queue = excluded.owner_queue,
      execution_mode = excluded.execution_mode,
      status = excluded.status,
      expected_duration_minutes = excluded.expected_duration_minutes,
      sla_timer_minutes = excluded.sla_timer_minutes,
      escalation_threshold_minutes = excluded.escalation_threshold_minutes,
      metadata_json = excluded.metadata_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    step.workflowId,
    step.stepKey,
    step.stepName,
    Number(step.stepOrder || 0),
    step.ownerDepartment || "operations",
    step.ownerQueue || "normal",
    step.executionMode || "sequential",
    step.status || "pending",
    step.expectedDurationMinutes || null,
    step.slaTimerMinutes || null,
    step.escalationThresholdMinutes || null,
    json(step.metadata || {})
  );
  return dbConn.prepare("SELECT * FROM order_workflow_steps WHERE workflow_id = ? AND step_key = ?").get(step.workflowId, step.stepKey);
}

function upsertAssignmentTask(dbConn, task) {
  dbConn.prepare(`
    INSERT INTO order_workflow_tasks (
      workflow_id, order_id, step_id, task_assignment_id, task_key, title,
      description, status, priority, owner_type, owner_id, owner_department,
      owner_queue, execution_mode, due_at, completed_at, metadata_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_assignment_id) DO UPDATE SET
      step_id = excluded.step_id,
      task_key = excluded.task_key,
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      priority = excluded.priority,
      owner_type = excluded.owner_type,
      owner_id = excluded.owner_id,
      owner_department = excluded.owner_department,
      owner_queue = excluded.owner_queue,
      execution_mode = excluded.execution_mode,
      due_at = excluded.due_at,
      completed_at = excluded.completed_at,
      metadata_json = excluded.metadata_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    task.workflowId,
    task.orderId,
    task.stepId || null,
    task.taskAssignmentId,
    task.taskKey,
    task.title,
    task.description || null,
    task.status || "pending",
    task.priority || "normal",
    task.ownerType || "queue",
    task.ownerId || null,
    task.ownerDepartment || "operations",
    task.ownerQueue || "normal",
    task.executionMode || "sequential",
    task.dueAt || null,
    task.completedAt || null,
    json(task.metadata || {})
  );
  return dbConn.prepare("SELECT * FROM order_workflow_tasks WHERE task_assignment_id = ?").get(task.taskAssignmentId);
}

function addTimelineEvent(dbConn, event) {
  const result = dbConn.prepare(`
    INSERT INTO order_timeline_events (
      order_id, workflow_id, event_type, previous_state, new_state, stage,
      status, actor_type, actor_id, title, summary, override_reason,
      source_table, source_pk, metadata_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.orderId,
    event.workflowId || null,
    event.eventType,
    event.previousState || null,
    event.newState || null,
    event.stage || null,
    event.status || null,
    event.actorType || "system",
    event.actorId || null,
    event.title,
    event.summary || null,
    event.overrideReason || null,
    event.sourceTable || null,
    event.sourcePk === undefined || event.sourcePk === null ? null : String(event.sourcePk),
    json(event.metadata || {})
  );
  return dbConn.prepare("SELECT * FROM order_timeline_events WHERE id = ?").get(Number(result.lastInsertRowid));
}

function getWorkflowProjection(dbConn, orderId, options = {}) {
  const workflow = getWorkflowByOrderId(dbConn, orderId);
  if (!workflow) return null;
  const steps = dbConn.prepare(`
    SELECT * FROM order_workflow_steps
    WHERE workflow_id = ?
    ORDER BY step_order ASC, id ASC
  `).all(workflow.id);
  const tasks = dbConn.prepare(`
    SELECT * FROM order_workflow_tasks
    WHERE workflow_id = ?
    ORDER BY updated_at DESC, id DESC
    LIMIT ?
  `).all(workflow.id, options.taskLimit || 20);
  const timeline = dbConn.prepare(`
    SELECT id, event_type, previous_state, new_state, stage, status, actor_type,
           actor_id, title, summary, override_reason, occurred_at, metadata_json
    FROM order_timeline_events
    WHERE workflow_id = ?
    ORDER BY occurred_at DESC, id DESC
    LIMIT ?
  `).all(workflow.id, options.timelineLimit || 12);
  return { workflow, steps, tasks, timeline };
}

module.exports = {
  safeJson,
  getWorkflowByOrderId,
  getWorkflowDefinition,
  upsertWorkflowDefinition,
  createWorkflow,
  updateWorkflowState,
  upsertStep,
  upsertAssignmentTask,
  addTimelineEvent,
  getWorkflowProjection
};
