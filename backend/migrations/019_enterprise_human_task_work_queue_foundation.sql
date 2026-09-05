-- DDL Migration: 019_enterprise_human_task_work_queue_foundation.sql
-- Phase 4 - Milestone 4.3
-- Date: 2026-07-05
-- Scope: Additive Human Task, Work Queue & Assignment Foundation Metadata Registries

-- 1. Human Task Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_uuid TEXT NOT NULL UNIQUE,
  task_key TEXT NOT NULL UNIQUE,
  task_name TEXT NOT NULL,
  task_description TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL CHECK (task_type IN ('Manual', 'Review', 'Approval', 'Data_Entry', 'Verification', 'Acknowledgement')),
  task_status TEXT NOT NULL DEFAULT 'Active' CHECK (task_status IN ('Active', 'Suspended', 'Retired')),
  owning_domain_key TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Task Template Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_uuid TEXT NOT NULL UNIQUE,
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  default_priority TEXT NOT NULL DEFAULT 'Medium' CHECK (default_priority IN ('Critical', 'High', 'Medium', 'Low', 'Informational')),
  default_sla_minutes INTEGER NOT NULL DEFAULT 1440,
  default_category_key TEXT NOT NULL DEFAULT 'general',
  form_schema_json TEXT NOT NULL DEFAULT '{}',
  template_version INTEGER NOT NULL DEFAULT 1,
  template_lifecycle_status TEXT NOT NULL DEFAULT 'Active' CHECK (template_lifecycle_status IN ('Draft', 'Active', 'Deprecated', 'Retired')),
  parent_template_uuid TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 3. Task Instance Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_instance_uuid TEXT NOT NULL UNIQUE,
  task_key TEXT NOT NULL,
  template_key TEXT,
  workflow_instance_uuid TEXT,
  step_runtime_uuid TEXT,
  queue_key TEXT,
  task_status TEXT NOT NULL DEFAULT 'Created' CHECK (task_status IN ('Created', 'Queued', 'Assigned', 'In_Progress', 'On_Hold', 'Completed', 'Cancelled', 'Failed', 'Escalated')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Critical', 'High', 'Medium', 'Low', 'Informational')),
  category_key TEXT NOT NULL DEFAULT 'general',
  sla_due_at TEXT,
  sla_warning_at TEXT,
  tenant_scope_key TEXT NOT NULL,
  branch_scope_key TEXT NOT NULL,
  search_vector TEXT NOT NULL DEFAULT '',
  search_version INTEGER NOT NULL DEFAULT 0,
  indexed_at TEXT,
  completed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (task_key) REFERENCES enterprise_human_task_registry(task_key)
);

-- 4. Task Assignment Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  assignee_type TEXT NOT NULL CHECK (assignee_type IN ('User', 'Role', 'Team', 'Queue')),
  assignee_key TEXT NOT NULL,
  assigned_by_key TEXT NOT NULL,
  assignment_status TEXT NOT NULL DEFAULT 'Active' CHECK (assignment_status IN ('Active', 'Completed', 'Reassigned', 'Revoked')),
  assigned_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 5. Task Ownership Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_ownership (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ownership_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('User', 'Team', 'Department', 'System')),
  owner_key TEXT NOT NULL,
  ownership_status TEXT NOT NULL DEFAULT 'Active' CHECK (ownership_status IN ('Active', 'Transferred', 'Archived')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 6. Task Delegation Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_delegations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delegation_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  delegator_key TEXT NOT NULL,
  delegate_key TEXT NOT NULL,
  delegation_reason TEXT NOT NULL DEFAULT '',
  delegation_status TEXT NOT NULL DEFAULT 'Active' CHECK (delegation_status IN ('Active', 'Completed', 'Revoked', 'Expired')),
  expires_at TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 7. Task Queue Governance Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_uuid TEXT NOT NULL UNIQUE,
  queue_key TEXT NOT NULL UNIQUE,
  queue_name TEXT NOT NULL,
  queue_type TEXT NOT NULL DEFAULT 'Standard' CHECK (queue_type IN ('Standard', 'Priority', 'Round_Robin', 'Skill_Based', 'Escalation')),
  queue_status TEXT NOT NULL DEFAULT 'Active' CHECK (queue_status IN ('Active', 'Paused', 'Retired')),
  owning_domain_key TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 1000,
  current_depth INTEGER NOT NULL DEFAULT 0,
  queue_version INTEGER NOT NULL DEFAULT 1,
  queue_generation INTEGER NOT NULL DEFAULT 1,
  baseline_queue_key TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 8. Task Priority Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_priorities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority_uuid TEXT NOT NULL UNIQUE,
  priority_key TEXT NOT NULL UNIQUE,
  priority_name TEXT NOT NULL,
  priority_weight INTEGER NOT NULL,
  sla_multiplier REAL NOT NULL DEFAULT 1.0,
  escalation_threshold_minutes INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 9. Task SLA Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_sla_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sla_uuid TEXT NOT NULL UNIQUE,
  sla_key TEXT NOT NULL UNIQUE,
  sla_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  priority_key TEXT NOT NULL,
  target_duration_minutes INTEGER NOT NULL,
  warning_threshold_minutes INTEGER NOT NULL,
  breach_action TEXT NOT NULL DEFAULT 'Escalate' CHECK (breach_action IN ('Escalate', 'Notify', 'Log_Only')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (priority_key) REFERENCES enterprise_human_task_priorities(priority_key)
);

-- 10. Task Escalation Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  escalation_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  escalation_reason TEXT NOT NULL,
  escalated_from_key TEXT NOT NULL,
  escalated_to_key TEXT NOT NULL,
  escalation_status TEXT NOT NULL DEFAULT 'Active' CHECK (escalation_status IN ('Active', 'Resolved', 'Expired')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 11. Task Notification Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('Assignment', 'Reminder', 'SLA_Warning', 'SLA_Breach', 'Escalation', 'Completion', 'Comment', 'Status_Change')),
  recipient_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'InApp' CHECK (channel IN ('InApp', 'Email', 'SMS', 'Webhook')),
  delivery_status TEXT NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Delivered', 'Failed', 'Suppressed')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  delivered_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 12. Task Attachment Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attachment_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  attachment_name TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  storage_reference TEXT NOT NULL,
  uploaded_by_key TEXT NOT NULL,
  attachment_version INTEGER NOT NULL DEFAULT 1,
  parent_attachment_uuid TEXT,
  checksum TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 13. Task Comment Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  author_key TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'Note' CHECK (comment_type IN ('Note', 'Question', 'Answer', 'System', 'Resolution')),
  parent_comment_uuid TEXT,
  mentioned_users_json TEXT NOT NULL DEFAULT '[]',
  mention_type TEXT NOT NULL DEFAULT 'None' CHECK (mention_type IN ('None', 'Direct', 'Team', 'Role')),
  mention_resolved INTEGER NOT NULL DEFAULT 0 CHECK (mention_resolved IN (0, 1)),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 14. Task Activity Timeline (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_activity_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  actor_key TEXT NOT NULL,
  activity_payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 15. Task Audit Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  audit_action TEXT NOT NULL,
  audit_actor_key TEXT NOT NULL,
  audit_details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 16. Task Metrics Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metric_unit TEXT NOT NULL DEFAULT 'seconds',
  recorded_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 17. Task Categories
CREATE TABLE IF NOT EXISTS enterprise_human_task_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_uuid TEXT NOT NULL UNIQUE,
  category_key TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  parent_category_key TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 18. Task Tags
CREATE TABLE IF NOT EXISTS enterprise_human_task_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_uuid TEXT NOT NULL UNIQUE,
  tag_key TEXT NOT NULL UNIQUE,
  tag_name TEXT NOT NULL,
  tag_color TEXT NOT NULL DEFAULT '#808080',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 19. Task-Tag Junction Table
CREATE TABLE IF NOT EXISTS enterprise_human_task_tag_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_instance_uuid TEXT NOT NULL,
  tag_key TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (task_instance_uuid, tag_key),
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 20. Task Dependency Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dependency_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  depends_on_task_uuid TEXT NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'Finish_To_Start' CHECK (dependency_type IN ('Finish_To_Start', 'Start_To_Start', 'Finish_To_Finish', 'Soft')),
  blocking_status TEXT NOT NULL DEFAULT 'Blocking' CHECK (blocking_status IN ('Blocking', 'Resolved', 'Overridden')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid),
  FOREIGN KEY (depends_on_task_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 21. Task Approval Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  approver_key TEXT NOT NULL,
  approval_decision TEXT NOT NULL CHECK (approval_decision IN ('Approved', 'Rejected', 'Returned', 'Abstained')),
  approval_comment TEXT NOT NULL DEFAULT '',
  decided_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 22. Task Reassignment Log (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_reassignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reassignment_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  from_assignee_key TEXT NOT NULL,
  to_assignee_key TEXT NOT NULL,
  reassignment_reason TEXT NOT NULL DEFAULT '',
  reassigned_by_key TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 23. Task Bulk Operation Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_bulk_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bulk_op_uuid TEXT NOT NULL UNIQUE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('Bulk_Assign', 'Bulk_Close', 'Bulk_Escalate', 'Bulk_Reassign', 'Bulk_Cancel')),
  initiated_by_key TEXT NOT NULL,
  affected_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  operation_status TEXT NOT NULL DEFAULT 'Pending' CHECK (operation_status IN ('Pending', 'In_Progress', 'Completed', 'Failed', 'Partial')),
  rollback_reference TEXT NOT NULL DEFAULT '',
  rollback_possible INTEGER NOT NULL DEFAULT 1 CHECK (rollback_possible IN (0, 1)),
  rollback_status TEXT NOT NULL DEFAULT 'Not_Initiated' CHECK (rollback_status IN ('Not_Initiated', 'In_Progress', 'Completed', 'Failed', 'Not_Available')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 24. Queue Routing Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_queue_routing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routing_uuid TEXT NOT NULL UNIQUE,
  routing_key TEXT NOT NULL UNIQUE,
  routing_name TEXT NOT NULL,
  source_task_type TEXT NOT NULL,
  source_priority_key TEXT,
  source_category_key TEXT,
  source_tenant_scope_key TEXT,
  target_queue_key TEXT NOT NULL,
  routing_priority INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (target_queue_key) REFERENCES enterprise_human_task_queues(queue_key)
);

-- 25. Queue Capacity & Fairness Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_queue_capacity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capacity_uuid TEXT NOT NULL UNIQUE,
  queue_key TEXT NOT NULL,
  max_concurrent_tasks INTEGER NOT NULL DEFAULT 100,
  overflow_policy TEXT NOT NULL DEFAULT 'Reject' CHECK (overflow_policy IN ('Reject', 'Redirect', 'Buffer')),
  fairness_algorithm TEXT NOT NULL DEFAULT 'Round_Robin' CHECK (fairness_algorithm IN ('Round_Robin', 'Weighted', 'Priority_First', 'FIFO')),
  load_balance_weight INTEGER NOT NULL DEFAULT 1,
  overflow_queue_key TEXT,
  overflow_priority INTEGER NOT NULL DEFAULT 999,
  overflow_condition TEXT NOT NULL DEFAULT 'Capacity_Exceeded' CHECK (overflow_condition IN ('Capacity_Exceeded', 'SLA_Breach', 'Skill_Mismatch', 'Manual')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (queue_key) REFERENCES enterprise_human_task_queues(queue_key)
);

-- 26. Queue Ownership & Visibility Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_queue_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_access_uuid TEXT NOT NULL UNIQUE,
  queue_key TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('Owner', 'Viewer', 'Manager', 'Restricted')),
  grantee_type TEXT NOT NULL CHECK (grantee_type IN ('User', 'Role', 'Team', 'Department')),
  grantee_key TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (queue_key) REFERENCES enterprise_human_task_queues(queue_key)
);

-- 27. Queue Analytics Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_queue_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analytics_uuid TEXT NOT NULL UNIQUE,
  queue_key TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metric_period TEXT NOT NULL,
  current_wait_count INTEGER NOT NULL DEFAULT 0,
  average_wait_seconds REAL NOT NULL DEFAULT 0.0,
  peak_wait_seconds REAL NOT NULL DEFAULT 0.0,
  longest_wait_seconds REAL NOT NULL DEFAULT 0.0,
  recorded_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (queue_key) REFERENCES enterprise_human_task_queues(queue_key)
);

-- 28. Task Watcher Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_watchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  watcher_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  watcher_type TEXT NOT NULL CHECK (watcher_type IN ('User', 'Role', 'Team')),
  watcher_key TEXT NOT NULL,
  notification_preferences TEXT NOT NULL DEFAULT 'All' CHECK (notification_preferences IN ('All', 'Status_Only', 'Escalation_Only', 'Completion_Only', 'None')),
  watcher_status TEXT NOT NULL DEFAULT 'Active' CHECK (watcher_status IN ('Active', 'Disabled')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE (task_instance_uuid, watcher_type, watcher_key),
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 29. Task Checklist Registry (Append-only status transitions)
CREATE TABLE IF NOT EXISTS enterprise_human_task_checklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  checklist_title TEXT NOT NULL,
  checklist_status TEXT NOT NULL DEFAULT 'Pending' CHECK (checklist_status IN ('Pending', 'Completed')),
  checklist_order INTEGER NOT NULL DEFAULT 0,
  completed_by TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 30. Business Calendar Registry
CREATE TABLE IF NOT EXISTS enterprise_business_calendars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calendar_uuid TEXT NOT NULL UNIQUE,
  calendar_key TEXT NOT NULL UNIQUE,
  calendar_name TEXT NOT NULL,
  working_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
  business_hours_start TEXT NOT NULL DEFAULT '09:00',
  business_hours_end TEXT NOT NULL DEFAULT '17:00',
  holiday_profile_json TEXT NOT NULL DEFAULT '[]',
  timezone_profile TEXT NOT NULL DEFAULT 'UTC',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 31. SLA Pause Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_sla_pauses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sla_pause_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  pause_started_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  pause_ended_at TEXT,
  accumulated_pause_seconds INTEGER NOT NULL DEFAULT 0,
  pause_reason TEXT NOT NULL DEFAULT '',
  pause_policy TEXT NOT NULL DEFAULT 'Standard' CHECK (pause_policy IN ('Standard', 'Emergency', 'Escalation_Hold', 'Customer_Request')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 32. Holiday Exception Registry
CREATE TABLE IF NOT EXISTS enterprise_business_holiday_exceptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_uuid TEXT NOT NULL UNIQUE,
  calendar_key TEXT NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_date TEXT NOT NULL,
  holiday_type TEXT NOT NULL DEFAULT 'Public' CHECK (holiday_type IN ('Public', 'Regional', 'Company', 'Custom')),
  recurring_flag INTEGER NOT NULL DEFAULT 0 CHECK (recurring_flag IN (0, 1)),
  holiday_scope TEXT NOT NULL DEFAULT 'Global',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (calendar_key) REFERENCES enterprise_business_calendars(calendar_key)
);

-- 33. Working Hours Profile Registry
CREATE TABLE IF NOT EXISTS enterprise_working_hours_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  working_profile_uuid TEXT NOT NULL UNIQUE,
  profile_key TEXT NOT NULL UNIQUE,
  shift_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '17:00',
  applicable_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
  owning_department_key TEXT NOT NULL DEFAULT 'default',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 34. Queue Skill Matrix Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_queue_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_uuid TEXT NOT NULL UNIQUE,
  queue_key TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_level TEXT NOT NULL DEFAULT 'Basic' CHECK (skill_level IN ('Basic', 'Intermediate', 'Advanced', 'Expert')),
  certification_required INTEGER NOT NULL DEFAULT 0 CHECK (certification_required IN (0, 1)),
  minimum_rating REAL NOT NULL DEFAULT 0.0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (queue_key) REFERENCES enterprise_human_task_queues(queue_key)
);

-- 35. Human Capacity Profile Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_capacity_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capacity_uuid TEXT NOT NULL UNIQUE,
  assignee_key TEXT NOT NULL UNIQUE,
  max_daily_tasks INTEGER NOT NULL DEFAULT 50,
  active_task_limit INTEGER NOT NULL DEFAULT 20,
  concurrent_limit INTEGER NOT NULL DEFAULT 5,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 36. Presence Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_presence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  presence_uuid TEXT NOT NULL UNIQUE,
  operator_key TEXT NOT NULL UNIQUE,
  presence_status TEXT NOT NULL DEFAULT 'Offline' CHECK (presence_status IN ('Online', 'Away', 'Busy', 'Do_Not_Disturb', 'Offline')),
  last_seen TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  availability_score REAL NOT NULL DEFAULT 0.0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 37. Queue Aging Policy Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_queue_aging_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aging_uuid TEXT NOT NULL UNIQUE,
  queue_key TEXT NOT NULL,
  aging_bucket TEXT NOT NULL,
  aging_threshold_minutes INTEGER NOT NULL,
  aging_score_increment REAL NOT NULL DEFAULT 1.0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (queue_key) REFERENCES enterprise_human_task_queues(queue_key)
);

-- 38. Assignment Snapshot Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_assignment_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_snapshot_uuid TEXT NOT NULL UNIQUE,
  task_instance_uuid TEXT NOT NULL,
  snapshot_time TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (task_instance_uuid) REFERENCES enterprise_human_task_instances(task_instance_uuid)
);

-- 39. Notification Preference Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_notification_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_profile_uuid TEXT NOT NULL UNIQUE,
  user_key TEXT NOT NULL UNIQUE,
  email_enabled INTEGER NOT NULL DEFAULT 1 CHECK (email_enabled IN (0, 1)),
  sms_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sms_enabled IN (0, 1)),
  push_enabled INTEGER NOT NULL DEFAULT 0 CHECK (push_enabled IN (0, 1)),
  inapp_enabled INTEGER NOT NULL DEFAULT 1 CHECK (inapp_enabled IN (0, 1)),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 40. Queue Forecast Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_queue_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  forecast_uuid TEXT NOT NULL UNIQUE,
  queue_key TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  forecast_depth INTEGER NOT NULL DEFAULT 0,
  forecast_wait_seconds REAL NOT NULL DEFAULT 0.0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (queue_key) REFERENCES enterprise_human_task_queues(queue_key)
);

-- 41. Report Profile Registry
CREATE TABLE IF NOT EXISTS enterprise_human_task_report_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_uuid TEXT NOT NULL UNIQUE,
  report_key TEXT NOT NULL UNIQUE,
  report_profile TEXT NOT NULL,
  report_scope TEXT NOT NULL DEFAULT 'Tenant' CHECK (report_scope IN ('Global', 'Tenant', 'Department', 'Queue', 'Individual')),
  aggregation_window TEXT NOT NULL DEFAULT 'Daily' CHECK (aggregation_window IN ('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 42. Export Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_human_task_exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  export_uuid TEXT NOT NULL UNIQUE,
  export_reason TEXT NOT NULL,
  export_scope TEXT NOT NULL DEFAULT 'Tenant' CHECK (export_scope IN ('Global', 'Tenant', 'Queue', 'Individual')),
  generated_by TEXT NOT NULL,
  export_status TEXT NOT NULL DEFAULT 'Pending' CHECK (export_status IN ('Pending', 'Completed', 'Failed')),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON enterprise_human_task_instances(task_status);
CREATE INDEX IF NOT EXISTS idx_task_instances_priority ON enterprise_human_task_instances(priority);
CREATE INDEX IF NOT EXISTS idx_task_instances_queue ON enterprise_human_task_instances(queue_key);
CREATE INDEX IF NOT EXISTS idx_task_instances_tenant ON enterprise_human_task_instances(tenant_scope_key);
CREATE INDEX IF NOT EXISTS idx_task_instances_sla_due ON enterprise_human_task_instances(sla_due_at);
CREATE INDEX IF NOT EXISTS idx_assignments_assignee ON enterprise_human_task_assignments(assignee_key);
CREATE INDEX IF NOT EXISTS idx_queue_routing_target ON enterprise_human_task_queue_routing(target_queue_key);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_task ON enterprise_human_task_activity_timeline(task_instance_uuid);
CREATE INDEX IF NOT EXISTS idx_watchers_task ON enterprise_human_task_watchers(task_instance_uuid);
CREATE INDEX IF NOT EXISTS idx_checklists_task ON enterprise_human_task_checklists(task_instance_uuid);

-- UUID Immutability Triggers
CREATE TRIGGER IF NOT EXISTS trg_human_task_registry_uuid_immutable BEFORE UPDATE OF task_uuid ON enterprise_human_task_registry FOR EACH ROW WHEN OLD.task_uuid <> NEW.task_uuid BEGIN SELECT RAISE(ABORT, 'task_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_templates_uuid_immutable BEFORE UPDATE OF template_uuid ON enterprise_human_task_templates FOR EACH ROW WHEN OLD.template_uuid <> NEW.template_uuid BEGIN SELECT RAISE(ABORT, 'template_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_instances_uuid_immutable BEFORE UPDATE OF task_instance_uuid ON enterprise_human_task_instances FOR EACH ROW WHEN OLD.task_instance_uuid <> NEW.task_instance_uuid BEGIN SELECT RAISE(ABORT, 'task_instance_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_assignments_uuid_immutable BEFORE UPDATE OF assignment_uuid ON enterprise_human_task_assignments FOR EACH ROW WHEN OLD.assignment_uuid <> NEW.assignment_uuid BEGIN SELECT RAISE(ABORT, 'assignment_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_ownership_uuid_immutable BEFORE UPDATE OF ownership_uuid ON enterprise_human_task_ownership FOR EACH ROW WHEN OLD.ownership_uuid <> NEW.ownership_uuid BEGIN SELECT RAISE(ABORT, 'ownership_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_delegations_uuid_immutable BEFORE UPDATE OF delegation_uuid ON enterprise_human_task_delegations FOR EACH ROW WHEN OLD.delegation_uuid <> NEW.delegation_uuid BEGIN SELECT RAISE(ABORT, 'delegation_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queues_uuid_immutable BEFORE UPDATE OF queue_uuid ON enterprise_human_task_queues FOR EACH ROW WHEN OLD.queue_uuid <> NEW.queue_uuid BEGIN SELECT RAISE(ABORT, 'queue_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_priorities_uuid_immutable BEFORE UPDATE OF priority_uuid ON enterprise_human_task_priorities FOR EACH ROW WHEN OLD.priority_uuid <> NEW.priority_uuid BEGIN SELECT RAISE(ABORT, 'priority_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_sla_policies_uuid_immutable BEFORE UPDATE OF sla_uuid ON enterprise_human_task_sla_policies FOR EACH ROW WHEN OLD.sla_uuid <> NEW.sla_uuid BEGIN SELECT RAISE(ABORT, 'sla_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_escalations_uuid_immutable BEFORE UPDATE OF escalation_uuid ON enterprise_human_task_escalations FOR EACH ROW WHEN OLD.escalation_uuid <> NEW.escalation_uuid BEGIN SELECT RAISE(ABORT, 'escalation_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_notifications_uuid_immutable BEFORE UPDATE OF notification_uuid ON enterprise_human_task_notifications FOR EACH ROW WHEN OLD.notification_uuid <> NEW.notification_uuid BEGIN SELECT RAISE(ABORT, 'notification_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_attachments_uuid_immutable BEFORE UPDATE OF attachment_uuid ON enterprise_human_task_attachments FOR EACH ROW WHEN OLD.attachment_uuid <> NEW.attachment_uuid BEGIN SELECT RAISE(ABORT, 'attachment_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_comments_uuid_immutable BEFORE UPDATE OF comment_uuid ON enterprise_human_task_comments FOR EACH ROW WHEN OLD.comment_uuid <> NEW.comment_uuid BEGIN SELECT RAISE(ABORT, 'comment_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_activity_timeline_uuid_immutable BEFORE UPDATE OF activity_uuid ON enterprise_human_task_activity_timeline FOR EACH ROW WHEN OLD.activity_uuid <> NEW.activity_uuid BEGIN SELECT RAISE(ABORT, 'activity_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_audit_log_uuid_immutable BEFORE UPDATE OF audit_uuid ON enterprise_human_task_audit_log FOR EACH ROW WHEN OLD.audit_uuid <> NEW.audit_uuid BEGIN SELECT RAISE(ABORT, 'audit_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_metrics_uuid_immutable BEFORE UPDATE OF metric_uuid ON enterprise_human_task_metrics FOR EACH ROW WHEN OLD.metric_uuid <> NEW.metric_uuid BEGIN SELECT RAISE(ABORT, 'metric_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_categories_uuid_immutable BEFORE UPDATE OF category_uuid ON enterprise_human_task_categories FOR EACH ROW WHEN OLD.category_uuid <> NEW.category_uuid BEGIN SELECT RAISE(ABORT, 'category_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_tags_uuid_immutable BEFORE UPDATE OF tag_uuid ON enterprise_human_task_tags FOR EACH ROW WHEN OLD.tag_uuid <> NEW.tag_uuid BEGIN SELECT RAISE(ABORT, 'tag_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_dependencies_uuid_immutable BEFORE UPDATE OF dependency_uuid ON enterprise_human_task_dependencies FOR EACH ROW WHEN OLD.dependency_uuid <> NEW.dependency_uuid BEGIN SELECT RAISE(ABORT, 'dependency_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_approvals_uuid_immutable BEFORE UPDATE OF approval_uuid ON enterprise_human_task_approvals FOR EACH ROW WHEN OLD.approval_uuid <> NEW.approval_uuid BEGIN SELECT RAISE(ABORT, 'approval_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_reassignments_uuid_immutable BEFORE UPDATE OF reassignment_uuid ON enterprise_human_task_reassignments FOR EACH ROW WHEN OLD.reassignment_uuid <> NEW.reassignment_uuid BEGIN SELECT RAISE(ABORT, 'reassignment_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_bulk_operations_uuid_immutable BEFORE UPDATE OF bulk_op_uuid ON enterprise_human_task_bulk_operations FOR EACH ROW WHEN OLD.bulk_op_uuid <> NEW.bulk_op_uuid BEGIN SELECT RAISE(ABORT, 'bulk_op_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_routing_uuid_immutable BEFORE UPDATE OF routing_uuid ON enterprise_human_task_queue_routing FOR EACH ROW WHEN OLD.routing_uuid <> NEW.routing_uuid BEGIN SELECT RAISE(ABORT, 'routing_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_capacity_uuid_immutable BEFORE UPDATE OF capacity_uuid ON enterprise_human_task_queue_capacity FOR EACH ROW WHEN OLD.capacity_uuid <> NEW.capacity_uuid BEGIN SELECT RAISE(ABORT, 'capacity_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_access_uuid_immutable BEFORE UPDATE OF queue_access_uuid ON enterprise_human_task_queue_access FOR EACH ROW WHEN OLD.queue_access_uuid <> NEW.queue_access_uuid BEGIN SELECT RAISE(ABORT, 'queue_access_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_analytics_uuid_immutable BEFORE UPDATE OF analytics_uuid ON enterprise_human_task_queue_analytics FOR EACH ROW WHEN OLD.analytics_uuid <> NEW.analytics_uuid BEGIN SELECT RAISE(ABORT, 'analytics_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_watchers_uuid_immutable BEFORE UPDATE OF watcher_uuid ON enterprise_human_task_watchers FOR EACH ROW WHEN OLD.watcher_uuid <> NEW.watcher_uuid BEGIN SELECT RAISE(ABORT, 'watcher_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_checklists_uuid_immutable BEFORE UPDATE OF checklist_uuid ON enterprise_human_task_checklists FOR EACH ROW WHEN OLD.checklist_uuid <> NEW.checklist_uuid BEGIN SELECT RAISE(ABORT, 'checklist_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_business_calendars_uuid_immutable BEFORE UPDATE OF calendar_uuid ON enterprise_business_calendars FOR EACH ROW WHEN OLD.calendar_uuid <> NEW.calendar_uuid BEGIN SELECT RAISE(ABORT, 'calendar_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_sla_pauses_uuid_immutable BEFORE UPDATE OF sla_pause_uuid ON enterprise_human_task_sla_pauses FOR EACH ROW WHEN OLD.sla_pause_uuid <> NEW.sla_pause_uuid BEGIN SELECT RAISE(ABORT, 'sla_pause_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_business_holiday_exceptions_uuid_immutable BEFORE UPDATE OF holiday_uuid ON enterprise_business_holiday_exceptions FOR EACH ROW WHEN OLD.holiday_uuid <> NEW.holiday_uuid BEGIN SELECT RAISE(ABORT, 'holiday_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_working_hours_profiles_uuid_immutable BEFORE UPDATE OF working_profile_uuid ON enterprise_working_hours_profiles FOR EACH ROW WHEN OLD.working_profile_uuid <> NEW.working_profile_uuid BEGIN SELECT RAISE(ABORT, 'working_profile_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_skills_uuid_immutable BEFORE UPDATE OF skill_uuid ON enterprise_human_task_queue_skills FOR EACH ROW WHEN OLD.skill_uuid <> NEW.skill_uuid BEGIN SELECT RAISE(ABORT, 'skill_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_capacity_profiles_uuid_immutable BEFORE UPDATE OF capacity_uuid ON enterprise_human_task_capacity_profiles FOR EACH ROW WHEN OLD.capacity_uuid <> NEW.capacity_uuid BEGIN SELECT RAISE(ABORT, 'capacity_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_presence_uuid_immutable BEFORE UPDATE OF presence_uuid ON enterprise_human_task_presence FOR EACH ROW WHEN OLD.presence_uuid <> NEW.presence_uuid BEGIN SELECT RAISE(ABORT, 'presence_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_aging_policies_uuid_immutable BEFORE UPDATE OF aging_uuid ON enterprise_human_task_queue_aging_policies FOR EACH ROW WHEN OLD.aging_uuid <> NEW.aging_uuid BEGIN SELECT RAISE(ABORT, 'aging_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_assignment_snapshots_uuid_immutable BEFORE UPDATE OF assignment_snapshot_uuid ON enterprise_human_task_assignment_snapshots FOR EACH ROW WHEN OLD.assignment_snapshot_uuid <> NEW.assignment_snapshot_uuid BEGIN SELECT RAISE(ABORT, 'assignment_snapshot_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_notification_profiles_uuid_immutable BEFORE UPDATE OF notification_profile_uuid ON enterprise_human_task_notification_profiles FOR EACH ROW WHEN OLD.notification_profile_uuid <> NEW.notification_profile_uuid BEGIN SELECT RAISE(ABORT, 'notification_profile_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_forecasts_uuid_immutable BEFORE UPDATE OF forecast_uuid ON enterprise_human_task_queue_forecasts FOR EACH ROW WHEN OLD.forecast_uuid <> NEW.forecast_uuid BEGIN SELECT RAISE(ABORT, 'forecast_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_report_profiles_uuid_immutable BEFORE UPDATE OF report_uuid ON enterprise_human_task_report_profiles FOR EACH ROW WHEN OLD.report_uuid <> NEW.report_uuid BEGIN SELECT RAISE(ABORT, 'report_uuid is immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_exports_uuid_immutable BEFORE UPDATE OF export_uuid ON enterprise_human_task_exports FOR EACH ROW WHEN OLD.export_uuid <> NEW.export_uuid BEGIN SELECT RAISE(ABORT, 'export_uuid is immutable'); END;

-- Append-Only Triggers
CREATE TRIGGER IF NOT EXISTS trg_human_task_delegations_append_only_update BEFORE UPDATE ON enterprise_human_task_delegations FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_delegations is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_delegations_append_only_delete BEFORE DELETE ON enterprise_human_task_delegations FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_delegations is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_escalations_append_only_update BEFORE UPDATE ON enterprise_human_task_escalations FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_escalations is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_escalations_append_only_delete BEFORE DELETE ON enterprise_human_task_escalations FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_escalations is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_notifications_append_only_update BEFORE UPDATE ON enterprise_human_task_notifications FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_notifications is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_notifications_append_only_delete BEFORE DELETE ON enterprise_human_task_notifications FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_notifications is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_comments_append_only_update BEFORE UPDATE ON enterprise_human_task_comments FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_comments is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_comments_append_only_delete BEFORE DELETE ON enterprise_human_task_comments FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_comments is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_activity_timeline_append_only_update BEFORE UPDATE ON enterprise_human_task_activity_timeline FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_activity_timeline is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_activity_timeline_append_only_delete BEFORE DELETE ON enterprise_human_task_activity_timeline FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_activity_timeline is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_audit_log_append_only_update BEFORE UPDATE ON enterprise_human_task_audit_log FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_audit_log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_audit_log_append_only_delete BEFORE DELETE ON enterprise_human_task_audit_log FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_audit_log is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_metrics_append_only_update BEFORE UPDATE ON enterprise_human_task_metrics FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_metrics is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_metrics_append_only_delete BEFORE DELETE ON enterprise_human_task_metrics FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_metrics is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_approvals_append_only_update BEFORE UPDATE ON enterprise_human_task_approvals FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_approvals is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_approvals_append_only_delete BEFORE DELETE ON enterprise_human_task_approvals FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_approvals is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_reassignments_append_only_update BEFORE UPDATE ON enterprise_human_task_reassignments FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_reassignments is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_reassignments_append_only_delete BEFORE DELETE ON enterprise_human_task_reassignments FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_reassignments is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_analytics_append_only_update BEFORE UPDATE ON enterprise_human_task_queue_analytics FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_queue_analytics is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_analytics_append_only_delete BEFORE DELETE ON enterprise_human_task_queue_analytics FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_queue_analytics is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_checklists_append_only_update BEFORE UPDATE ON enterprise_human_task_checklists FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_checklists is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_checklists_append_only_delete BEFORE DELETE ON enterprise_human_task_checklists FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_checklists is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_assignment_snapshots_append_only_update BEFORE UPDATE ON enterprise_human_task_assignment_snapshots FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_assignment_snapshots is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_assignment_snapshots_append_only_delete BEFORE DELETE ON enterprise_human_task_assignment_snapshots FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_assignment_snapshots is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_forecasts_append_only_update BEFORE UPDATE ON enterprise_human_task_queue_forecasts FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_queue_forecasts is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_queue_forecasts_append_only_delete BEFORE DELETE ON enterprise_human_task_queue_forecasts FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_queue_forecasts is append-only'); END;

CREATE TRIGGER IF NOT EXISTS trg_human_task_exports_append_only_update BEFORE UPDATE ON enterprise_human_task_exports FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_exports is append-only'); END;
CREATE TRIGGER IF NOT EXISTS trg_human_task_exports_append_only_delete BEFORE DELETE ON enterprise_human_task_exports FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_human_task_exports is append-only'); END;
