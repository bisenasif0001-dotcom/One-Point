-- DDL Migration: 017_enterprise_workflow_engine_foundation.sql
-- Phase 4 - Milestone 4.1
-- Date: 2026-07-05
-- Scope: Additive Workflow Engine Foundation Metadata Registries

-- 1. Workflow Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL UNIQUE,
  workflow_name TEXT NOT NULL,
  workflow_status TEXT NOT NULL DEFAULT 'Active' CHECK (workflow_status IN ('Active', 'Suspended', 'Retired')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workflow Definition Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  definition_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  definition_schema TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key)
);

-- 3. Workflow Version Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  version_tag TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key),
  UNIQUE (workflow_key, version_tag)
);

-- 4. Workflow Category Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_uuid TEXT NOT NULL UNIQUE,
  category_key TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workflow Lifecycle Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_lifecycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lifecycle_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key)
);

-- 6. Workflow State Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state_uuid TEXT NOT NULL UNIQUE,
  state_key TEXT NOT NULL UNIQUE,
  state_name TEXT NOT NULL,
  is_terminal INTEGER NOT NULL DEFAULT 0 CHECK (is_terminal IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Workflow Transition Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transition_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  transition_policy TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key),
  FOREIGN KEY (from_state) REFERENCES enterprise_workflow_states(state_key),
  FOREIGN KEY (to_state) REFERENCES enterprise_workflow_states(state_key)
);

-- 8. Workflow Policy Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_uuid TEXT NOT NULL UNIQUE,
  policy_key TEXT NOT NULL UNIQUE,
  policy_name TEXT NOT NULL,
  policy_rule_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Workflow Ownership Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_ownership (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ownership_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  steward_name TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key)
);

-- 10. Workflow Execution Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  version_tag TEXT NOT NULL,
  current_state TEXT NOT NULL,
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('Sequential', 'Parallel', 'Conditional', 'Fork', 'Join', 'Loop', 'Timer', 'Signal', 'Compensation', 'Manual Step', 'Human Task', 'AI Task', 'Hybrid Task')),
  correlation_id TEXT NOT NULL,
  causation_id TEXT NOT NULL,
  process_context TEXT NOT NULL,
  saga_uuid TEXT NOT NULL,
  partition_scope TEXT NOT NULL,
  locality_scope TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key),
  FOREIGN KEY (current_state) REFERENCES enterprise_workflow_states(state_key)
);

-- 11. Workflow Task Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_uuid TEXT NOT NULL UNIQUE,
  task_key TEXT NOT NULL UNIQUE,
  task_name TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('System', 'Human', 'AI')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Workflow Assignment Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_task_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_uuid TEXT NOT NULL UNIQUE,
  execution_uuid TEXT NOT NULL,
  task_key TEXT NOT NULL,
  assigned_role TEXT NOT NULL,
  assigned_user TEXT,
  assignment_status TEXT NOT NULL DEFAULT 'Assigned' CHECK (assignment_status IN ('Assigned', 'In_Progress', 'Completed', 'Escalated')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_uuid) REFERENCES enterprise_workflow_executions(execution_uuid),
  FOREIGN KEY (task_key) REFERENCES enterprise_workflow_tasks(task_key)
);

-- 13. Workflow Queue Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_uuid TEXT NOT NULL UNIQUE,
  queue_key TEXT NOT NULL UNIQUE,
  queue_name TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Workflow Priority Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_priorities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority_uuid TEXT NOT NULL UNIQUE,
  priority_level INTEGER NOT NULL UNIQUE,
  priority_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. Workflow Deadline Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_deadlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deadline_uuid TEXT NOT NULL UNIQUE,
  execution_uuid TEXT NOT NULL,
  task_key TEXT NOT NULL,
  deadline_timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_uuid) REFERENCES enterprise_workflow_executions(execution_uuid),
  FOREIGN KEY (task_key) REFERENCES enterprise_workflow_tasks(task_key)
);

-- 16. Workflow Timeout Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_timeouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timeout_uuid TEXT NOT NULL UNIQUE,
  execution_uuid TEXT NOT NULL,
  timeout_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_uuid) REFERENCES enterprise_workflow_executions(execution_uuid)
);

-- 17. Workflow Retry Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_retries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  retry_uuid TEXT NOT NULL UNIQUE,
  execution_uuid TEXT NOT NULL,
  max_attempts INTEGER NOT NULL,
  current_attempt INTEGER NOT NULL DEFAULT 0,
  backoff_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_uuid) REFERENCES enterprise_workflow_executions(execution_uuid)
);

-- 18. Workflow Escalation Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  escalation_uuid TEXT NOT NULL UNIQUE,
  execution_uuid TEXT NOT NULL,
  escalation_level INTEGER NOT NULL,
  escalation_policy TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_uuid) REFERENCES enterprise_workflow_executions(execution_uuid)
);

-- 19. Workflow SLA Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_sla (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sla_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  sla_target_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key)
);

-- 20. Workflow Approval Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_uuid TEXT NOT NULL UNIQUE,
  execution_uuid TEXT NOT NULL,
  required_role TEXT NOT NULL,
  approved_by_user TEXT,
  approval_status TEXT NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_uuid) REFERENCES enterprise_workflow_executions(execution_uuid)
);

-- 21. Approval Chain Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_approval_chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  required_role TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key),
  UNIQUE (workflow_key, step_number)
);

-- 22. Approval Matrix Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_approval_matrices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matrix_uuid TEXT NOT NULL UNIQUE,
  role_key TEXT NOT NULL,
  max_auth_amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 23. Delegation Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_delegations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delegation_uuid TEXT NOT NULL UNIQUE,
  delegator_user TEXT NOT NULL,
  delegate_user TEXT NOT NULL,
  start_timestamp TEXT NOT NULL,
  end_timestamp TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 24. Workflow Audit Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_workflow_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_uuid TEXT NOT NULL UNIQUE,
  execution_uuid TEXT NOT NULL,
  action_type TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  actor_identity TEXT NOT NULL,
  action_details TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_uuid) REFERENCES enterprise_workflow_executions(execution_uuid)
);

-- 25. Workflow Metrics Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_workflow_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_uuid TEXT NOT NULL UNIQUE,
  execution_uuid TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value REAL NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_uuid) REFERENCES enterprise_workflow_executions(execution_uuid)
);

-- 26. Workflow Validation Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_uuid TEXT NOT NULL UNIQUE,
  workflow_key TEXT NOT NULL,
  validation_type TEXT NOT NULL,
  is_valid INTEGER NOT NULL CHECK (is_valid IN (0, 1)),
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key)
);

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_workflow_registry_uuid ON enterprise_workflow_registry (workflow_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_uuid ON enterprise_workflow_executions (execution_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_saga ON enterprise_workflow_executions (saga_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_key ON enterprise_workflow_tasks (task_key);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_exec ON enterprise_workflow_task_assignments (execution_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_exec ON enterprise_workflow_approvals (execution_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_exec ON enterprise_workflow_audit_log (execution_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_exec ON enterprise_workflow_metrics (execution_uuid);

-- Triggers for UUID Immutability
CREATE TRIGGER IF NOT EXISTS trg_workflow_registry_uuid_immutable
BEFORE UPDATE OF workflow_uuid ON enterprise_workflow_registry
FOR EACH ROW WHEN OLD.workflow_uuid <> NEW.workflow_uuid
BEGIN
  SELECT RAISE(ABORT, 'workflow_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_definitions_uuid_immutable
BEFORE UPDATE OF definition_uuid ON enterprise_workflow_definitions
FOR EACH ROW WHEN OLD.definition_uuid <> NEW.definition_uuid
BEGIN
  SELECT RAISE(ABORT, 'definition_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_versions_uuid_immutable
BEFORE UPDATE OF version_uuid ON enterprise_workflow_versions
FOR EACH ROW WHEN OLD.version_uuid <> NEW.version_uuid
BEGIN
  SELECT RAISE(ABORT, 'version_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_categories_uuid_immutable
BEFORE UPDATE OF category_uuid ON enterprise_workflow_categories
FOR EACH ROW WHEN OLD.category_uuid <> NEW.category_uuid
BEGIN
  SELECT RAISE(ABORT, 'category_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_lifecycles_uuid_immutable
BEFORE UPDATE OF lifecycle_uuid ON enterprise_workflow_lifecycles
FOR EACH ROW WHEN OLD.lifecycle_uuid <> NEW.lifecycle_uuid
BEGIN
  SELECT RAISE(ABORT, 'lifecycle_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_states_uuid_immutable
BEFORE UPDATE OF state_uuid ON enterprise_workflow_states
FOR EACH ROW WHEN OLD.state_uuid <> NEW.state_uuid
BEGIN
  SELECT RAISE(ABORT, 'state_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_transitions_uuid_immutable
BEFORE UPDATE OF transition_uuid ON enterprise_workflow_transitions
FOR EACH ROW WHEN OLD.transition_uuid <> NEW.transition_uuid
BEGIN
  SELECT RAISE(ABORT, 'transition_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_policies_uuid_immutable
BEFORE UPDATE OF policy_uuid ON enterprise_workflow_policies
FOR EACH ROW WHEN OLD.policy_uuid <> NEW.policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'policy_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_ownership_uuid_immutable
BEFORE UPDATE OF ownership_uuid ON enterprise_workflow_ownership
FOR EACH ROW WHEN OLD.ownership_uuid <> NEW.ownership_uuid
BEGIN
  SELECT RAISE(ABORT, 'ownership_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_executions_uuid_immutable
BEFORE UPDATE OF execution_uuid ON enterprise_workflow_executions
FOR EACH ROW WHEN OLD.execution_uuid <> NEW.execution_uuid
BEGIN
  SELECT RAISE(ABORT, 'execution_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_tasks_uuid_immutable
BEFORE UPDATE OF task_uuid ON enterprise_workflow_tasks
FOR EACH ROW WHEN OLD.task_uuid <> NEW.task_uuid
BEGIN
  SELECT RAISE(ABORT, 'task_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_assignments_uuid_immutable
BEFORE UPDATE OF assignment_uuid ON enterprise_workflow_task_assignments
FOR EACH ROW WHEN OLD.assignment_uuid <> NEW.assignment_uuid
BEGIN
  SELECT RAISE(ABORT, 'assignment_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_queues_uuid_immutable
BEFORE UPDATE OF queue_uuid ON enterprise_workflow_queues
FOR EACH ROW WHEN OLD.queue_uuid <> NEW.queue_uuid
BEGIN
  SELECT RAISE(ABORT, 'queue_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_priorities_uuid_immutable
BEFORE UPDATE OF priority_uuid ON enterprise_workflow_priorities
FOR EACH ROW WHEN OLD.priority_uuid <> NEW.priority_uuid
BEGIN
  SELECT RAISE(ABORT, 'priority_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_deadlines_uuid_immutable
BEFORE UPDATE OF deadline_uuid ON enterprise_workflow_deadlines
FOR EACH ROW WHEN OLD.deadline_uuid <> NEW.deadline_uuid
BEGIN
  SELECT RAISE(ABORT, 'deadline_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_timeouts_uuid_immutable
BEFORE UPDATE OF timeout_uuid ON enterprise_workflow_timeouts
FOR EACH ROW WHEN OLD.timeout_uuid <> NEW.timeout_uuid
BEGIN
  SELECT RAISE(ABORT, 'timeout_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_retries_uuid_immutable
BEFORE UPDATE OF retry_uuid ON enterprise_workflow_retries
FOR EACH ROW WHEN OLD.retry_uuid <> NEW.retry_uuid
BEGIN
  SELECT RAISE(ABORT, 'retry_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_escalations_uuid_immutable
BEFORE UPDATE OF escalation_uuid ON enterprise_workflow_escalations
FOR EACH ROW WHEN OLD.escalation_uuid <> NEW.escalation_uuid
BEGIN
  SELECT RAISE(ABORT, 'escalation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_sla_uuid_immutable
BEFORE UPDATE OF sla_uuid ON enterprise_workflow_sla
FOR EACH ROW WHEN OLD.sla_uuid <> NEW.sla_uuid
BEGIN
  SELECT RAISE(ABORT, 'sla_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_approvals_uuid_immutable
BEFORE UPDATE OF approval_uuid ON enterprise_workflow_approvals
FOR EACH ROW WHEN OLD.approval_uuid <> NEW.approval_uuid
BEGIN
  SELECT RAISE(ABORT, 'approval_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_approval_chains_uuid_immutable
BEFORE UPDATE OF chain_uuid ON enterprise_workflow_approval_chains
FOR EACH ROW WHEN OLD.chain_uuid <> NEW.chain_uuid
BEGIN
  SELECT RAISE(ABORT, 'chain_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_approval_matrices_uuid_immutable
BEFORE UPDATE OF matrix_uuid ON enterprise_workflow_approval_matrices
FOR EACH ROW WHEN OLD.matrix_uuid <> NEW.matrix_uuid
BEGIN
  SELECT RAISE(ABORT, 'matrix_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_delegations_uuid_immutable
BEFORE UPDATE OF delegation_uuid ON enterprise_workflow_delegations
FOR EACH ROW WHEN OLD.delegation_uuid <> NEW.delegation_uuid
BEGIN
  SELECT RAISE(ABORT, 'delegation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_validations_uuid_immutable
BEFORE UPDATE OF validation_uuid ON enterprise_workflow_validations
FOR EACH ROW WHEN OLD.validation_uuid <> NEW.validation_uuid
BEGIN
  SELECT RAISE(ABORT, 'validation_uuid is immutable');
END;

-- Triggers for Append-Only Enforcements on Audit Log & Metrics
CREATE TRIGGER IF NOT EXISTS trg_workflow_audit_log_append_only_update
BEFORE UPDATE ON enterprise_workflow_audit_log
FOR EACH ROW BEGIN
  SELECT RAISE(ABORT, 'enterprise_workflow_audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_audit_log_append_only_delete
BEFORE DELETE ON enterprise_workflow_audit_log
FOR EACH ROW BEGIN
  SELECT RAISE(ABORT, 'enterprise_workflow_audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_metrics_append_only_update
BEFORE UPDATE ON enterprise_workflow_metrics
FOR EACH ROW BEGIN
  SELECT RAISE(ABORT, 'enterprise_workflow_metrics is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_metrics_append_only_delete
BEFORE DELETE ON enterprise_workflow_metrics
FOR EACH ROW BEGIN
  SELECT RAISE(ABORT, 'enterprise_workflow_metrics is append-only');
END;

