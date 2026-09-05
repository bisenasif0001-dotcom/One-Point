-- Rollback DDL: rollback_018_enterprise_workflow_runtime_governance.sql
-- Phase 4 - Milestone 4.2
-- Date: 2026-07-05

BEGIN IMMEDIATE;

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_workflow_runtimes_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_instances_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_contexts_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_step_runtimes_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_action_runtimes_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_decision_runtimes_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_locks_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_concurrencies_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_instance_lineage_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_instance_snapshots_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_instance_history_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_instance_archive_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_resource_quotas_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_node_registry_uuid_immutable;

DROP TRIGGER IF EXISTS trg_workflow_snapshots_append_only_update;
DROP TRIGGER IF EXISTS trg_workflow_snapshots_append_only_delete;
DROP TRIGGER IF EXISTS trg_workflow_history_append_only_update;
DROP TRIGGER IF EXISTS trg_workflow_history_append_only_delete;

-- Drop Indexes
DROP INDEX IF EXISTS idx_workflow_instances_key;
DROP INDEX IF EXISTS idx_workflow_instances_tenant;
DROP INDEX IF EXISTS idx_workflow_contexts_instance;
DROP INDEX IF EXISTS idx_workflow_step_runtimes_instance;
DROP INDEX IF EXISTS idx_workflow_locks_key;
DROP INDEX IF EXISTS idx_workflow_snapshots_instance;

-- Drop Tables
DROP TABLE IF EXISTS enterprise_workflow_node_registry;
DROP TABLE IF EXISTS enterprise_workflow_resource_quotas;
DROP TABLE IF EXISTS enterprise_workflow_instance_archive;
DROP TABLE IF EXISTS enterprise_workflow_instance_history;
DROP TABLE IF EXISTS enterprise_workflow_instance_snapshots;
DROP TABLE IF EXISTS enterprise_workflow_instance_lineage;
DROP TABLE IF EXISTS enterprise_workflow_concurrencies;
DROP TABLE IF EXISTS enterprise_workflow_locks;
DROP TABLE IF EXISTS enterprise_workflow_decision_runtimes;
DROP TABLE IF EXISTS enterprise_workflow_action_runtimes;
DROP TABLE IF EXISTS enterprise_workflow_step_runtimes;
DROP TABLE IF EXISTS enterprise_workflow_contexts;
DROP TABLE IF EXISTS enterprise_workflow_instances;
DROP TABLE IF EXISTS enterprise_workflow_runtimes;

COMMIT;
