-- DDL Migration: 018_enterprise_workflow_runtime_governance.sql
-- Phase 4 - Milestone 4.2
-- Date: 2026-07-05
-- Scope: Additive Workflow Runtime Governance

-- 1. Workflow Runtime Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_runtimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  runtime_uuid TEXT NOT NULL UNIQUE,
  runtime_key TEXT NOT NULL UNIQUE,
  runtime_name TEXT NOT NULL,
  runtime_status TEXT NOT NULL CHECK (runtime_status IN ('Active', 'Inactive', 'Maintenance')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Workflow Instance Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_uuid TEXT NOT NULL UNIQUE,
  instance_key TEXT NOT NULL,
  workflow_key TEXT NOT NULL,
  version_tag TEXT NOT NULL,
  instance_status TEXT NOT NULL CHECK (instance_status IN ('Active', 'Suspended', 'Completed', 'Terminated', 'Failed', 'Recovery_Pending')),
  tenant_scope_key TEXT NOT NULL,
  branch_scope_key TEXT NOT NULL,
  region_scope_key TEXT NOT NULL,
  partition_scope_key TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (workflow_key) REFERENCES enterprise_workflow_registry(workflow_key)
);

-- 3. Workflow Context Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_contexts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context_uuid TEXT NOT NULL UNIQUE,
  instance_uuid TEXT NOT NULL,
  context_variables_json TEXT NOT NULL,
  tenant_scope_key TEXT NOT NULL,
  branch_scope_key TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid)
);

-- 4. Workflow Step Runtime Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_step_runtimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_runtime_uuid TEXT NOT NULL UNIQUE,
  instance_uuid TEXT NOT NULL,
  step_key TEXT NOT NULL,
  step_status TEXT NOT NULL CHECK (step_status IN ('Pending', 'Running', 'Waiting_On_Signal', 'Waiting_On_Timer', 'Completed', 'Failed')),
  token_uuid TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid)
);

-- 5. Workflow Action Runtime Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_action_runtimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_runtime_uuid TEXT NOT NULL UNIQUE,
  step_runtime_uuid TEXT NOT NULL,
  action_key TEXT NOT NULL,
  action_status TEXT NOT NULL CHECK (action_status IN ('Pending', 'Running', 'Completed', 'Failed')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (step_runtime_uuid) REFERENCES enterprise_workflow_step_runtimes(step_runtime_uuid)
);

-- 6. Workflow Decision Runtime Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_decision_runtimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_uuid TEXT NOT NULL UNIQUE,
  instance_uuid TEXT NOT NULL,
  decision_point_key TEXT NOT NULL,
  chosen_branch_key TEXT NOT NULL,
  decision_payload_json TEXT NOT NULL,
  evaluated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid)
);

-- 7. Workflow Lock Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_locks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lock_uuid TEXT NOT NULL UNIQUE,
  lock_key TEXT NOT NULL UNIQUE,
  instance_uuid TEXT NOT NULL,
  lock_acquired_at TEXT NOT NULL,
  lock_timeout_seconds INTEGER NOT NULL,
  FOREIGN KEY (instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid)
);

-- 8. Workflow Concurrency Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_concurrencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concurrency_uuid TEXT NOT NULL UNIQUE,
  tenant_scope_key TEXT NOT NULL UNIQUE,
  concurrency_limit INTEGER NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 9. Workflow Lineage Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_instance_lineage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lineage_uuid TEXT NOT NULL UNIQUE,
  parent_instance_uuid TEXT NOT NULL,
  child_instance_uuid TEXT NOT NULL UNIQUE,
  nesting_depth INTEGER NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (parent_instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid),
  FOREIGN KEY (child_instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid)
);

-- 10. Workflow Snapshot Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_instance_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_uuid TEXT NOT NULL UNIQUE,
  instance_uuid TEXT NOT NULL,
  checkpoint_uuid TEXT NOT NULL,
  snapshot_checksum TEXT NOT NULL,
  snapshot_data_json TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid)
);

-- 11. Workflow History Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_instance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  history_uuid TEXT NOT NULL UNIQUE,
  instance_uuid TEXT NOT NULL,
  instance_status TEXT NOT NULL,
  tenant_scope_key TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  history_data_json TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid)
);

-- 12. Workflow Archive Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_instance_archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  archive_uuid TEXT NOT NULL UNIQUE,
  instance_uuid TEXT NOT NULL,
  archived_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  retention_days INTEGER NOT NULL,
  purge_status TEXT NOT NULL CHECK (purge_status IN ('Retained', 'Archived', 'Purged')),
  FOREIGN KEY (instance_uuid) REFERENCES enterprise_workflow_instances(instance_uuid)
);

-- 13. Workflow Resource Quota Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_resource_quotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quota_uuid TEXT NOT NULL UNIQUE,
  tenant_scope_key TEXT NOT NULL UNIQUE,
  resource_quota_tokens INTEGER NOT NULL,
  execution_cost_units REAL NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 14. Workflow Node Registry
CREATE TABLE IF NOT EXISTS enterprise_workflow_node_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_uuid TEXT NOT NULL UNIQUE,
  node_instance_id TEXT NOT NULL UNIQUE,
  heartbeat_timestamp TEXT NOT NULL,
  node_status TEXT NOT NULL CHECK (node_status IN ('Online', 'Offline', 'Degraded'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_instances_key ON enterprise_workflow_instances(instance_key);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_tenant ON enterprise_workflow_instances(tenant_scope_key);
CREATE INDEX IF NOT EXISTS idx_workflow_contexts_instance ON enterprise_workflow_contexts(instance_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_step_runtimes_instance ON enterprise_workflow_step_runtimes(instance_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_locks_key ON enterprise_workflow_locks(lock_key);
CREATE INDEX IF NOT EXISTS idx_workflow_snapshots_instance ON enterprise_workflow_instance_snapshots(instance_uuid);

-- UUID Immutability Triggers
CREATE TRIGGER IF NOT EXISTS trg_workflow_runtimes_uuid_immutable
BEFORE UPDATE OF runtime_uuid ON enterprise_workflow_runtimes
FOR EACH ROW WHEN OLD.runtime_uuid <> NEW.runtime_uuid
BEGIN
  SELECT RAISE(ABORT, 'runtime_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_instances_uuid_immutable
BEFORE UPDATE OF instance_uuid ON enterprise_workflow_instances
FOR EACH ROW WHEN OLD.instance_uuid <> NEW.instance_uuid
BEGIN
  SELECT RAISE(ABORT, 'instance_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_contexts_uuid_immutable
BEFORE UPDATE OF context_uuid ON enterprise_workflow_contexts
FOR EACH ROW WHEN OLD.context_uuid <> NEW.context_uuid
BEGIN
  SELECT RAISE(ABORT, 'context_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_step_runtimes_uuid_immutable
BEFORE UPDATE OF step_runtime_uuid ON enterprise_workflow_step_runtimes
FOR EACH ROW WHEN OLD.step_runtime_uuid <> NEW.step_runtime_uuid
BEGIN
  SELECT RAISE(ABORT, 'step_runtime_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_action_runtimes_uuid_immutable
BEFORE UPDATE OF action_runtime_uuid ON enterprise_workflow_action_runtimes
FOR EACH ROW WHEN OLD.action_runtime_uuid <> NEW.action_runtime_uuid
BEGIN
  SELECT RAISE(ABORT, 'action_runtime_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_decision_runtimes_uuid_immutable
BEFORE UPDATE OF decision_uuid ON enterprise_workflow_decision_runtimes
FOR EACH ROW WHEN OLD.decision_uuid <> NEW.decision_uuid
BEGIN
  SELECT RAISE(ABORT, 'decision_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_locks_uuid_immutable
BEFORE UPDATE OF lock_uuid ON enterprise_workflow_locks
FOR EACH ROW WHEN OLD.lock_uuid <> NEW.lock_uuid
BEGIN
  SELECT RAISE(ABORT, 'lock_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_concurrencies_uuid_immutable
BEFORE UPDATE OF concurrency_uuid ON enterprise_workflow_concurrencies
FOR EACH ROW WHEN OLD.concurrency_uuid <> NEW.concurrency_uuid
BEGIN
  SELECT RAISE(ABORT, 'concurrency_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_instance_lineage_uuid_immutable
BEFORE UPDATE OF lineage_uuid ON enterprise_workflow_instance_lineage
FOR EACH ROW WHEN OLD.lineage_uuid <> NEW.lineage_uuid
BEGIN
  SELECT RAISE(ABORT, 'lineage_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_instance_snapshots_uuid_immutable
BEFORE UPDATE OF snapshot_uuid ON enterprise_workflow_instance_snapshots
FOR EACH ROW WHEN OLD.snapshot_uuid <> NEW.snapshot_uuid
BEGIN
  SELECT RAISE(ABORT, 'snapshot_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_instance_history_uuid_immutable
BEFORE UPDATE OF history_uuid ON enterprise_workflow_instance_history
FOR EACH ROW WHEN OLD.history_uuid <> NEW.history_uuid
BEGIN
  SELECT RAISE(ABORT, 'history_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_instance_archive_uuid_immutable
BEFORE UPDATE OF archive_uuid ON enterprise_workflow_instance_archive
FOR EACH ROW WHEN OLD.archive_uuid <> NEW.archive_uuid
BEGIN
  SELECT RAISE(ABORT, 'archive_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_resource_quotas_uuid_immutable
BEFORE UPDATE OF quota_uuid ON enterprise_workflow_resource_quotas
FOR EACH ROW WHEN OLD.quota_uuid <> NEW.quota_uuid
BEGIN
  SELECT RAISE(ABORT, 'quota_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_node_registry_uuid_immutable
BEFORE UPDATE OF node_uuid ON enterprise_workflow_node_registry
FOR EACH ROW WHEN OLD.node_uuid <> NEW.node_uuid
BEGIN
  SELECT RAISE(ABORT, 'node_uuid is immutable');
END;

-- Append-Only Governance Triggers
CREATE TRIGGER IF NOT EXISTS trg_workflow_snapshots_append_only_update
BEFORE UPDATE ON enterprise_workflow_instance_snapshots
FOR EACH ROW BEGIN
  SELECT RAISE(ABORT, 'enterprise_workflow_instance_snapshots is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_snapshots_append_only_delete
BEFORE DELETE ON enterprise_workflow_instance_snapshots
FOR EACH ROW BEGIN
  SELECT RAISE(ABORT, 'enterprise_workflow_instance_snapshots is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_history_append_only_update
BEFORE UPDATE ON enterprise_workflow_instance_history
FOR EACH ROW BEGIN
  SELECT RAISE(ABORT, 'enterprise_workflow_instance_history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_workflow_history_append_only_delete
BEFORE DELETE ON enterprise_workflow_instance_history
FOR EACH ROW BEGIN
  SELECT RAISE(ABORT, 'enterprise_workflow_instance_history is append-only');
END;
