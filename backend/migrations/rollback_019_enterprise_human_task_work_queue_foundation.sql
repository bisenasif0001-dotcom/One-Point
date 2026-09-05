-- DDL Rollback: rollback_019_enterprise_human_task_work_queue_foundation.sql
-- Phase 4 - Milestone 4.3
-- Date: 2026-07-05
-- Scope: Rollback Human Task, Work Queue & Assignment Foundation Metadata Registries

DROP TABLE IF EXISTS enterprise_human_task_exports;
DROP TABLE IF EXISTS enterprise_human_task_report_profiles;
DROP TABLE IF EXISTS enterprise_human_task_queue_forecasts;
DROP TABLE IF EXISTS enterprise_human_task_notification_profiles;
DROP TABLE IF EXISTS enterprise_human_task_assignment_snapshots;
DROP TABLE IF EXISTS enterprise_human_task_queue_aging_policies;
DROP TABLE IF EXISTS enterprise_human_task_presence;
DROP TABLE IF EXISTS enterprise_human_task_capacity_profiles;
DROP TABLE IF EXISTS enterprise_human_task_queue_skills;
DROP TABLE IF EXISTS enterprise_working_hours_profiles;
DROP TABLE IF EXISTS enterprise_business_holiday_exceptions;
DROP TABLE IF EXISTS enterprise_human_task_sla_pauses;
DROP TABLE IF EXISTS enterprise_business_calendars;
DROP TABLE IF EXISTS enterprise_human_task_checklists;
DROP TABLE IF EXISTS enterprise_human_task_watchers;
DROP TABLE IF EXISTS enterprise_human_task_queue_analytics;
DROP TABLE IF EXISTS enterprise_human_task_queue_access;
DROP TABLE IF EXISTS enterprise_human_task_queue_capacity;
DROP TABLE IF EXISTS enterprise_human_task_queue_routing;
DROP TABLE IF EXISTS enterprise_human_task_bulk_operations;
DROP TABLE IF EXISTS enterprise_human_task_reassignments;
DROP TABLE IF EXISTS enterprise_human_task_approvals;
DROP TABLE IF EXISTS enterprise_human_task_dependencies;
DROP TABLE IF EXISTS enterprise_human_task_tag_assignments;
DROP TABLE IF EXISTS enterprise_human_task_tags;
DROP TABLE IF EXISTS enterprise_human_task_categories;
DROP TABLE IF EXISTS enterprise_human_task_metrics;
DROP TABLE IF EXISTS enterprise_human_task_audit_log;
DROP TABLE IF EXISTS enterprise_human_task_activity_timeline;
DROP TABLE IF EXISTS enterprise_human_task_comments;
DROP TABLE IF EXISTS enterprise_human_task_attachments;
DROP TABLE IF EXISTS enterprise_human_task_notifications;
DROP TABLE IF EXISTS enterprise_human_task_escalations;
DROP TABLE IF EXISTS enterprise_human_task_sla_policies;
DROP TABLE IF EXISTS enterprise_human_task_priorities;
DROP TABLE IF EXISTS enterprise_human_task_queues;
DROP TABLE IF EXISTS enterprise_human_task_delegations;
DROP TABLE IF EXISTS enterprise_human_task_ownership;
DROP TABLE IF EXISTS enterprise_human_task_assignments;
DROP TABLE IF EXISTS enterprise_human_task_instances;
DROP TABLE IF EXISTS enterprise_human_task_templates;
DROP TABLE IF EXISTS enterprise_human_task_registry;
