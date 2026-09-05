"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Synchronizes production rollout governance seed data.
 * Idempotent: skips rows that already exist, inserts those that do not.
 */
function syncProductionRolloutGovernance({ dbConn, reportPath }) {
  const startedAt = new Date().toISOString();
  let created = 0;
  let skipped = 0;
  const failures = [];

  const runUpsert = (checkSql, insertSql, params, label) => {
    try {
      const existing = dbConn.prepare(checkSql).get(params[1]);
      if (!existing) {
        dbConn.prepare(insertSql).run(...params);
        created++;
      } else {
        skipped++;
      }
    } catch (err) {
      failures.push({ label, error: err.message });
    }
  };

  // Seed 1. Default Deployment Policies
  const policies = [
    ["deploy-policy-production-uuid", "production_rolling_deploy", "Production Rolling Deployment", "production", "Rolling", 1, 1, 1, 60, 15, "owner", 1],
    ["deploy-policy-staging-uuid", "staging_deploy", "Staging Deployment", "staging", "AllAtOnce", 0, 1, 1, 30, 10, "developer", 1]
  ];
  for (const p of policies) {
    runUpsert(
      "SELECT id FROM enterprise_deployment_policies WHERE policy_key = ?",
      "INSERT INTO enterprise_deployment_policies (policy_uuid, policy_key, policy_name, environment_name, deployment_strategy, requires_approval, requires_backup, requires_health_check, max_rollout_duration_minutes, rollback_timeout_minutes, approval_chain, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      p,
      `DeployPolicy: ${p[1]}`
    );
  }

  // Seed 2. Default Kill Switches
  const switches = [
    ["kill-switch-llm-uuid", "llm_connector_kill_switch", "LLM Connector Kill Switch", "AI_LLM_Connectors"],
    ["kill-switch-webhook-uuid", "webhook_kill_switch", "Webhook Delivery Kill Switch", "Webhooks"],
    ["kill-switch-notifications-uuid", "notification_kill_switch", "Notification Delivery Kill Switch", "Notifications"]
  ];
  for (const s of switches) {
    runUpsert(
      "SELECT id FROM enterprise_kill_switches WHERE switch_key = ?",
      "INSERT INTO enterprise_kill_switches (switch_uuid, switch_key, switch_name, target_system) VALUES (?, ?, ?, ?)",
      s,
      `KillSwitch: ${s[1]}`
    );
  }

  // Seed 3. Default Health Checks
  const healthChecks = [
    ["health-db-uuid", "database_integrity", "Database Integrity", "Database", "/api/health", 60],
    ["health-api-uuid", "api_availability", "API Availability", "API", "/api/health", 30],
    ["health-migration-uuid", "migration_consistency", "Migration Consistency", "Database", "/api/health", 300],
    ["health-session-uuid", "session_validity", "Session Validity", "Auth", "/api/admin/session-check", 60],
    ["health-disk-uuid", "disk_space", "Disk Space", "Infrastructure", "/api/health", 120]
  ];
  for (const h of healthChecks) {
    runUpsert(
      "SELECT id FROM enterprise_health_checks WHERE check_key = ?",
      "INSERT INTO enterprise_health_checks (check_uuid, check_key, check_name, check_category, endpoint_path, check_interval_seconds) VALUES (?, ?, ?, ?, ?, ?)",
      h,
      `HealthCheck: ${h[1]}`
    );
  }

  // Seed 4. Default Rollback Entries for all migrations
  const rollbacks = [
    ["rollback-015-uuid", "rollback_015", "015_enterprise_automation_integrations_tool_governance", "rollback_015_enterprise_automation_integrations_tool_governance.sql"],
    ["rollback-016-uuid", "rollback_016", "016_enterprise_infrastructure_backup_monitoring_release", "rollback_016_enterprise_infrastructure_backup_monitoring_release.sql"],
    ["rollback-017-uuid", "rollback_017", "017_enterprise_workflow_engine_foundation", "rollback_017_enterprise_workflow_engine_foundation.sql"],
    ["rollback-018-uuid", "rollback_018", "018_enterprise_workflow_runtime_governance", "rollback_018_enterprise_workflow_runtime_governance.sql"],
    ["rollback-019-uuid", "rollback_019", "019_enterprise_human_task_work_queue_foundation", "rollback_019_enterprise_human_task_work_queue_foundation.sql"],
    ["rollback-020-uuid", "rollback_020", "020_enterprise_ai_command_center_decision_intelligence", "rollback_020_enterprise_ai_command_center_decision_intelligence.sql"],
    ["rollback-021-uuid", "rollback_021", "021_production_rollout_enterprise_validation", "rollback_021_production_rollout_enterprise_validation.sql"]
  ];
  for (const r of rollbacks) {
    runUpsert(
      "SELECT id FROM enterprise_rollback_registry WHERE rollback_key = ?",
      "INSERT INTO enterprise_rollback_registry (rollback_uuid, rollback_key, target_migration, rollback_script_path) VALUES (?, ?, ?, ?)",
      r,
      `Rollback: ${r[1]}`
    );
  }

  // Seed 5. Default System Panels
  const panels = [
    ["panel-health-uuid", "system_health_overview", "System Health Overview", "Health", 1, "/api/health", 30],
    ["panel-db-uuid", "database_status", "Database Status", "Database", 2, "/api/health", 60],
    ["panel-migration-uuid", "migration_status", "Migration Status", "Database", 3, "/api/health", 300],
    ["panel-deploy-uuid", "deployment_status", "Deployment Status", "Deployment", 4, "/api/health", 120]
  ];
  for (const p of panels) {
    runUpsert(
      "SELECT id FROM enterprise_system_panels WHERE panel_key = ?",
      "INSERT INTO enterprise_system_panels (panel_uuid, panel_key, panel_name, panel_category, display_order, data_source, refresh_interval_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)",
      p,
      `SystemPanel: ${p[1]}`
    );
  }

  // Seed 6. Default Configuration Governance Entries
  const configs = [
    ["config-env-uuid", "current_environment", "Current Environment", "System", "production", "String", "production", 0, 0],
    ["config-maintenance-uuid", "maintenance_mode", "Maintenance Mode", "System", "false", "Boolean", "production", 0, 1],
    ["config-max-conn-uuid", "max_connections", "Max Database Connections", "Database", "100", "Integer", "production", 0, 0],
    ["config-log-level-uuid", "log_level", "Log Level", "Logging", "info", "String", "production", 0, 0]
  ];
  for (const c of configs) {
    runUpsert(
      "SELECT id FROM enterprise_configuration_governance WHERE config_key = ?",
      "INSERT INTO enterprise_configuration_governance (config_uuid, config_key, config_name, config_category, config_value, config_type, environment_name, is_sensitive, requires_restart) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      c,
      `Config: ${c[1]}`
    );
  }

  const report = {
    migrationKey: "021_production_rollout_enterprise_validation",
    startedAt,
    finishedAt: new Date().toISOString(),
    created,
    skipped,
    failures
  };

  return report;
}

/**
 * Validates all Milestone 4.5 production governance tables, triggers, and constraints.
 */
function validateProductionRollout({ dbConn }) {
  const failures = [];

  // Schema existence checks
  const requiredTables = [
    "enterprise_production_readiness",
    "enterprise_deployment_policies",
    "enterprise_rollback_registry",
    "enterprise_kill_switches",
    "enterprise_environment_validations",
    "enterprise_health_checks",
    "enterprise_rollout_validations",
    "enterprise_release_validations",
    "enterprise_production_audit_log",
    "enterprise_validation_registry",
    "enterprise_configuration_governance",
    "enterprise_release_governance",
    "enterprise_deployment_audit_log",
    "enterprise_health_metrics",
    "enterprise_system_panels"
  ];

  for (const tbl of requiredTables) {
    const row = dbConn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tbl);
    if (!row) {
      failures.push({ type: "schema", message: `Table ${tbl} does not exist.` });
    }
  }

  // UUID immutability trigger checks
  const uuidTriggers = [
    "trg_prod_readiness_uuid_immutable",
    "trg_deploy_policy_uuid_immutable",
    "trg_rollback_uuid_immutable",
    "trg_kill_switch_uuid_immutable",
    "trg_env_validation_uuid_immutable",
    "trg_health_check_uuid_immutable",
    "trg_rollout_validation_uuid_immutable",
    "trg_release_validation_uuid_immutable",
    "trg_prod_audit_uuid_immutable",
    "trg_validation_reg_uuid_immutable",
    "trg_config_gov_uuid_immutable",
    "trg_release_gov_uuid_immutable",
    "trg_deploy_audit_uuid_immutable",
    "trg_health_metrics_uuid_immutable",
    "trg_system_panel_uuid_immutable"
  ];

  for (const trg of uuidTriggers) {
    const row = dbConn.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name=?").get(trg);
    if (!row) {
      failures.push({ type: "trigger", message: `UUID immutability trigger ${trg} does not exist.` });
    }
  }

  // Append-only trigger checks
  const appendOnlyTriggers = [
    "trg_prod_audit_append_only_update",
    "trg_prod_audit_append_only_delete",
    "trg_deploy_audit_append_only_update",
    "trg_deploy_audit_append_only_delete",
    "trg_health_metrics_append_only_update",
    "trg_health_metrics_append_only_delete"
  ];

  for (const trg of appendOnlyTriggers) {
    const row = dbConn.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name=?").get(trg);
    if (!row) {
      failures.push({ type: "append_only_trigger", message: `Append-only trigger ${trg} does not exist.` });
    }
  }

  // Migration registry check
  try {
    const migRow = dbConn.prepare("SELECT migration_key FROM migration_registry WHERE migration_key = ?").get("021_production_rollout_enterprise_validation");
    if (!migRow) {
      failures.push({ type: "migration_registry", message: "Migration 021 not registered in migration_registry." });
    }
  } catch (err) {
    failures.push({ type: "migration_registry_check", message: err.message });
  }

  return {
    status: failures.length === 0 ? "Success" : "Failed",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    tablesVerified: requiredTables.length,
    uuidTriggersVerified: uuidTriggers.length,
    appendOnlyTriggersVerified: appendOnlyTriggers.length,
    failures
  };
}

function writeMigrationEvidence(options, report) {
  try {
    if (options.reportPath) {
      fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
      fs.writeFileSync(options.reportPath, JSON.stringify(report, null, 2), "utf8");
    }
    if (options.canonicalFallbackPath) {
      fs.mkdirSync(path.dirname(options.canonicalFallbackPath), { recursive: true });
      fs.writeFileSync(options.canonicalFallbackPath, JSON.stringify(report, null, 2), "utf8");
    }
  } catch {
    // Ignore
  }
}

function createFailedMigrationReport(error) {
  return {
    migrationKey: "021_production_rollout_enterprise_validation",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    created: 0,
    updated: 0,
    skipped: 0,
    failures: [{ label: "fatal", error: error.message }]
  };
}

module.exports = {
  syncProductionRolloutGovernance,
  validateProductionRollout,
  writeMigrationEvidence,
  createFailedMigrationReport
};
