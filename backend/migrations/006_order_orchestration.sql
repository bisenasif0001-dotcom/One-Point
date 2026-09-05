PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  definition_key TEXT NOT NULL UNIQUE,
  definition_type TEXT NOT NULL CHECK(definition_type IN ('Service DNA Workflow', 'Product Workflow Template')),
  source_kind TEXT NOT NULL CHECK(source_kind IN ('service_dna', 'product_template')),
  service_dna_profile_id INTEGER,
  service_dna_workflow_layer_id INTEGER,
  product_workflow_template_key TEXT,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published' CHECK(lifecycle_status IN ('Draft', 'Review', 'Published', 'Deprecated')),
  active INTEGER NOT NULL DEFAULT 1,
  owner_department TEXT NOT NULL DEFAULT 'operations',
  owner_queue TEXT NOT NULL DEFAULT 'normal',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(service_dna_profile_id) REFERENCES service_dna_profiles(id),
  FOREIGN KEY(service_dna_workflow_layer_id) REFERENCES service_dna_layers(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_definitions_active_key
  ON workflow_definitions(definition_key)
  WHERE active = 1;

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_type
  ON workflow_definitions(definition_type, lifecycle_status, active);

CREATE TABLE IF NOT EXISTS order_workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL UNIQUE,
  order_object_uuid TEXT,
  workflow_definition_id INTEGER NOT NULL,
  workflow_definition_type TEXT NOT NULL,
  workflow_definition_version INTEGER NOT NULL DEFAULT 1,
  current_state TEXT NOT NULL DEFAULT 'created',
  current_stage TEXT NOT NULL DEFAULT 'Created',
  status_label TEXT NOT NULL DEFAULT 'Created',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'critical')),
  owner_department TEXT NOT NULL DEFAULT 'operations',
  owner_queue TEXT NOT NULL DEFAULT 'normal',
  assigned_human_id INTEGER,
  assigned_ai_id TEXT,
  sla_due_at TEXT,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT 'placeholder' CHECK(health_status IN ('placeholder', 'healthy', 'delayed', 'blocked', 'risky', 'critical')),
  health_score_metadata_json TEXT NOT NULL DEFAULT '{"status":"placeholder","calculation":"not_implemented"}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(workflow_definition_id) REFERENCES workflow_definitions(id),
  FOREIGN KEY(assigned_human_id) REFERENCES staff(id)
);

CREATE INDEX IF NOT EXISTS idx_order_workflows_state ON order_workflows(current_state, owner_queue);
CREATE INDEX IF NOT EXISTS idx_order_workflows_definition ON order_workflows(workflow_definition_id);

CREATE TABLE IF NOT EXISTS order_workflow_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  step_key TEXT NOT NULL,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  owner_department TEXT NOT NULL,
  owner_queue TEXT NOT NULL,
  execution_mode TEXT NOT NULL DEFAULT 'sequential' CHECK(execution_mode IN ('sequential', 'parallel', 'optional', 'conditional')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed', 'skipped', 'blocked', 'failed')),
  expected_duration_minutes INTEGER,
  sla_timer_minutes INTEGER,
  escalation_threshold_minutes INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(workflow_id) REFERENCES order_workflows(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_workflow_steps_unique
  ON order_workflow_steps(workflow_id, step_key);

CREATE TABLE IF NOT EXISTS order_workflow_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  step_id INTEGER,
  task_assignment_id INTEGER,
  task_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'accepted', 'working', 'done', 'cancelled', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'critical')),
  owner_type TEXT NOT NULL DEFAULT 'queue' CHECK(owner_type IN ('queue', 'human', 'ai', 'department', 'system')),
  owner_id TEXT,
  owner_department TEXT NOT NULL DEFAULT 'operations',
  owner_queue TEXT NOT NULL DEFAULT 'normal',
  execution_mode TEXT NOT NULL DEFAULT 'sequential' CHECK(execution_mode IN ('sequential', 'parallel', 'optional', 'conditional')),
  due_at TEXT,
  completed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(workflow_id) REFERENCES order_workflows(id),
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(step_id) REFERENCES order_workflow_steps(id),
  FOREIGN KEY(task_assignment_id) REFERENCES task_assignments(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_workflow_tasks_assignment
  ON order_workflow_tasks(task_assignment_id)
  WHERE task_assignment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_workflow_tasks_order_status
  ON order_workflow_tasks(order_id, status);

CREATE TABLE IF NOT EXISTS order_timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  workflow_id INTEGER,
  event_type TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  stage TEXT,
  status TEXT,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  override_reason TEXT,
  source_table TEXT,
  source_pk TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(workflow_id) REFERENCES order_workflows(id)
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_events_order
  ON order_timeline_events(order_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS order_escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  escalation_type TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved', 'cancelled')),
  owner_department TEXT NOT NULL DEFAULT 'operations',
  owner_queue TEXT NOT NULL DEFAULT 'normal',
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  triggered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(workflow_id) REFERENCES order_workflows(id),
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_order_escalations_order_status
  ON order_escalations(order_id, status);
