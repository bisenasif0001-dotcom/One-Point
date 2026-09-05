-- Rollback Migration: rollback_017_enterprise_workflow_engine_foundation.sql
-- Phase 4 - Milestone 4.1
-- Date: 2026-07-05
-- Scope: Rollback Workflow Engine Foundation Metadata Registries

BEGIN IMMEDIATE;

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_workflow_registry_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_definitions_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_versions_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_categories_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_lifecycles_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_states_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_transitions_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_policies_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_ownership_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_executions_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_tasks_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_assignments_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_queues_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_priorities_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_deadlines_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_timeouts_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_retries_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_escalations_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_sla_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_approvals_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_approval_chains_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_approval_matrices_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_delegations_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_validations_uuid_immutable;
DROP TRIGGER IF EXISTS trg_workflow_audit_log_append_only_update;
DROP TRIGGER IF EXISTS trg_workflow_audit_log_append_only_delete;
DROP TRIGGER IF EXISTS trg_workflow_metrics_append_only_update;
DROP TRIGGER IF EXISTS trg_workflow_metrics_append_only_delete;

-- Drop Indexes
DROP INDEX IF EXISTS idx_workflow_registry_uuid;
DROP INDEX IF EXISTS idx_workflow_executions_uuid;
DROP INDEX IF EXISTS idx_workflow_executions_saga;
DROP INDEX IF EXISTS idx_workflow_tasks_key;
DROP INDEX IF EXISTS idx_workflow_assignments_exec;
DROP INDEX IF EXISTS idx_workflow_approvals_exec;
DROP INDEX IF EXISTS idx_workflow_audit_exec;
DROP INDEX IF EXISTS idx_workflow_metrics_exec;

-- Drop Tables
DROP TABLE IF EXISTS enterprise_workflow_validations;
DROP TABLE IF EXISTS enterprise_workflow_metrics;
DROP TABLE IF EXISTS enterprise_workflow_audit_log;
DROP TABLE IF EXISTS enterprise_workflow_delegations;
DROP TABLE IF EXISTS enterprise_workflow_approval_matrices;
DROP TABLE IF EXISTS enterprise_workflow_approval_chains;
DROP TABLE IF EXISTS enterprise_workflow_approvals;
DROP TABLE IF EXISTS enterprise_workflow_sla;
DROP TABLE IF EXISTS enterprise_workflow_escalations;
DROP TABLE IF EXISTS enterprise_workflow_retries;
DROP TABLE IF EXISTS enterprise_workflow_timeouts;
DROP TABLE IF EXISTS enterprise_workflow_deadlines;
DROP TABLE IF EXISTS enterprise_workflow_priorities;
DROP TABLE IF EXISTS enterprise_workflow_queues;
DROP TABLE IF EXISTS enterprise_workflow_task_assignments;
DROP TABLE IF EXISTS enterprise_workflow_tasks;
DROP TABLE IF EXISTS enterprise_workflow_executions;
DROP TABLE IF EXISTS enterprise_workflow_ownership;
DROP TABLE IF EXISTS enterprise_workflow_policies;
DROP TABLE IF EXISTS enterprise_workflow_transitions;
DROP TABLE IF EXISTS enterprise_workflow_states;
DROP TABLE IF EXISTS enterprise_workflow_lifecycles;
DROP TABLE IF EXISTS enterprise_workflow_categories;
DROP TABLE IF EXISTS enterprise_workflow_versions;
DROP TABLE IF EXISTS enterprise_workflow_definitions;
DROP TABLE IF EXISTS enterprise_workflow_registry;

COMMIT;
