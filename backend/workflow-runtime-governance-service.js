"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MIGRATION_KEY = "018_enterprise_workflow_runtime_governance";

function nowIso() {
  return new Date().toISOString();
}

function generateUuid() {
  return "rt-" + Math.random().toString(36).substring(2, 15) + "-" + Math.random().toString(36).substring(2, 15);
}

function writeJson(filePath, value) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function historyFilePath(filePath, startedAt = nowIso()) {
  const stamp = String(startedAt).replace(/[:.]/g, "-");
  return path.join(path.dirname(filePath), "history", `${MIGRATION_KEY}-${stamp}.json`);
}

function isSuccessfulMigrationReport(report) {
  return report && report.finishedAt && (!report.failures || report.failures.length === 0);
}

function writeMigrationEvidence(options, report) {
  if (!options.reportPath) return;
  const canonicalPath = options.reportPath;
  const runHistoryPath = historyFilePath(canonicalPath, report.startedAt);
  writeJson(runHistoryPath, report);
  const canonicalReport = readJsonIfExists(canonicalPath);
  if (isSuccessfulMigrationReport(canonicalReport)) return;
  if (isSuccessfulMigrationReport(report)) {
    writeJson(canonicalPath, report);
    return;
  }
  if (!canonicalReport) {
    writeJson(canonicalPath, report);
  }
}

function createFailedMigrationReport(error) {
  return {
    migrationKey: MIGRATION_KEY,
    startedAt: nowIso(),
    finishedAt: nowIso(),
    failures: [{
      step: "execution",
      message: error && error.message ? error.message : String(error)
    }]
  };
}

function createValidationReport(kind) {
  return {
    milestone: "Phase 4 - Milestone 4.2",
    name: "Enterprise Workflow Runtime Governance Validation",
    kind,
    startedAt: nowIso(),
    finishedAt: null,
    validations: {},
    failures: []
  };
}

function addFailure(report, table, key, error) {
  if (report.totals) {
    report.totals.failures += 1;
  }
  report.failures.push({
    table,
    key,
    message: error && error.message ? error.message : String(error)
  });
}

function syncWorkflowRuntimeGovernance(options = {}) {
  const { dbConn } = options;
  if (!dbConn) throw new Error("dbConn database connection is required for synchronization.");

  const report = {
    migrationKey: MIGRATION_KEY,
    startedAt: nowIso(),
    finishedAt: null,
    created: 0,
    updated: 0,
    skipped: 0,
    failures: []
  };

  const bump = (rep, kind) => {
    rep[kind] = (rep[kind] || 0) + 1;
  };

  try {
    // 1. Seed Runtimes
    const runtimeUuid = "rt-uuid-default";
    const runtimeKey = "v8_default_runtime";
    const hasRuntime = dbConn.prepare("SELECT id FROM enterprise_workflow_runtimes WHERE runtime_key = ?").get(runtimeKey);
    if (!hasRuntime) {
      dbConn.prepare("INSERT INTO enterprise_workflow_runtimes (runtime_uuid, runtime_key, runtime_name, runtime_status) VALUES (?, ?, ?, ?)").run(
        runtimeUuid, runtimeKey, "Default Enterprise JS V8 Runtime", "Active"
      );
      bump(report, "created");
    } else {
      bump(report, "skipped");
    }

    // 2. Seed Concurrency Quotas
    const concurrencyUuid = "con-uuid-default";
    const tenantScopeKey = "tenant_default";
    const hasConcurrency = dbConn.prepare("SELECT id FROM enterprise_workflow_concurrencies WHERE tenant_scope_key = ?").get(tenantScopeKey);
    if (!hasConcurrency) {
      dbConn.prepare("INSERT INTO enterprise_workflow_concurrencies (concurrency_uuid, tenant_scope_key, concurrency_limit) VALUES (?, ?, ?)").run(
        concurrencyUuid, tenantScopeKey, 50
      );
      bump(report, "created");
    } else {
      bump(report, "skipped");
    }

    // 3. Seed Resource Quotas
    const quotaUuid = "quota-uuid-default";
    const hasQuota = dbConn.prepare("SELECT id FROM enterprise_workflow_resource_quotas WHERE tenant_scope_key = ?").get(tenantScopeKey);
    if (!hasQuota) {
      dbConn.prepare("INSERT INTO enterprise_workflow_resource_quotas (quota_uuid, tenant_scope_key, resource_quota_tokens, execution_cost_units) VALUES (?, ?, ?, ?)").run(
        quotaUuid, tenantScopeKey, 1000, 1.0
      );
      bump(report, "created");
    } else {
      bump(report, "skipped");
    }

    // 4. Seed Node Registry
    const nodeUuid = "node-uuid-default";
    const nodeInstanceId = "node_instance_main_01";
    const hasNode = dbConn.prepare("SELECT id FROM enterprise_workflow_node_registry WHERE node_instance_id = ?").get(nodeInstanceId);
    if (!hasNode) {
      dbConn.prepare("INSERT INTO enterprise_workflow_node_registry (node_uuid, node_instance_id, heartbeat_timestamp, node_status) VALUES (?, ?, ?, ?)").run(
        nodeUuid, nodeInstanceId, nowIso(), "Online"
      );
      bump(report, "created");
    } else {
      bump(report, "skipped");
    }

    report.finishedAt = nowIso();
  } catch (error) {
    report.finishedAt = nowIso();
    report.failures.push({
      step: "seeding",
      message: error.message
    });
    throw error;
  }

  if (options.reportPath) {
    writeMigrationEvidence(options, report);
  }

  return report;
}

function validateWorkflowRuntime(options = {}) {
  const { dbConn } = options;
  if (!dbConn) throw new Error("dbConn database connection is required for validations.");

  const report = createValidationReport("self-validation");

  const runCheck = (name, testFn) => {
    try {
      testFn();
      report.validations[name] = { status: "Pass", error: null };
    } catch (error) {
      report.validations[name] = { status: "Fail", error: error.message };
      addFailure(report, "validation", name, error);
    }
  };

  // 1. Schema Presence Check
  runCheck("schema_presence", () => {
    const requiredTables = [
      "enterprise_workflow_runtimes",
      "enterprise_workflow_instances",
      "enterprise_workflow_contexts",
      "enterprise_workflow_step_runtimes",
      "enterprise_workflow_action_runtimes",
      "enterprise_workflow_decision_runtimes",
      "enterprise_workflow_locks",
      "enterprise_workflow_concurrencies",
      "enterprise_workflow_instance_lineage",
      "enterprise_workflow_instance_snapshots",
      "enterprise_workflow_instance_history",
      "enterprise_workflow_instance_archive",
      "enterprise_workflow_resource_quotas",
      "enterprise_workflow_node_registry"
    ];

    for (const t of requiredTables) {
      const row = dbConn.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
      if (!row) throw new Error(`Required table ${t} does not exist.`);
    }
  });

  // 2. UUID Immutability Check
  runCheck("uuid_immutability", () => {
    dbConn.exec("INSERT INTO enterprise_workflow_runtimes (runtime_uuid, runtime_key, runtime_name, runtime_status) VALUES ('temp-uuid-rt', 'temp-key-rt', 'Temp RT', 'Active')");
    try {
      dbConn.exec("UPDATE enterprise_workflow_runtimes SET runtime_uuid = 'different-uuid-rt' WHERE runtime_key = 'temp-key-rt'");
      throw new Error("UUID trigger allowed mutable update.");
    } catch (error) {
      if (!error.message.includes("immutable")) throw error;
    } finally {
      dbConn.exec("DELETE FROM enterprise_workflow_runtimes WHERE runtime_key = 'temp-key-rt'");
    }
  });

  // 3. Append-Only Snapshots & History Check
  runCheck("append_only_snapshots_and_history", () => {
    // We insert a valid instance reference first to satisfy foreign keys
    dbConn.exec("INSERT INTO enterprise_workflow_instances (instance_uuid, instance_key, workflow_key, version_tag, instance_status, tenant_scope_key, branch_scope_key, region_scope_key, partition_scope_key) VALUES ('inst-uuid-test', 'inst-key-test', 'order_dispatch_workflow', 'v1.0.0', 'Active', 'tenant', 'branch', 'region', 'part')");
    
    // Insert Snapshot
    dbConn.exec("INSERT INTO enterprise_workflow_instance_snapshots (snapshot_uuid, instance_uuid, checkpoint_uuid, snapshot_checksum, snapshot_data_json) VALUES ('snap-uuid-test', 'inst-uuid-test', 'chk-test', 'hash', 'data')");
    
    try {
      dbConn.exec("UPDATE enterprise_workflow_instance_snapshots SET snapshot_checksum = 'newhash' WHERE snapshot_uuid = 'snap-uuid-test'");
      throw new Error("Snapshot allowed update.");
    } catch (error) {
      if (!error.message.includes("append-only")) throw error;
    }

    try {
      dbConn.exec("DELETE FROM enterprise_workflow_instance_snapshots WHERE snapshot_uuid = 'snap-uuid-test'");
      throw new Error("Snapshot allowed delete.");
    } catch (error) {
      if (!error.message.includes("append-only")) throw error;
    } finally {
      dbConn.exec("DROP TRIGGER trg_workflow_snapshots_append_only_delete");
      dbConn.exec("DELETE FROM enterprise_workflow_instance_snapshots WHERE snapshot_uuid = 'snap-uuid-test'");
      dbConn.exec("CREATE TRIGGER trg_workflow_snapshots_append_only_delete BEFORE DELETE ON enterprise_workflow_instance_snapshots FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'enterprise_workflow_instance_snapshots is append-only'); END");
      dbConn.exec("DELETE FROM enterprise_workflow_instances WHERE instance_uuid = 'inst-uuid-test'");
    }
  });

  report.finishedAt = nowIso();
  return report;
}

module.exports = {
  syncWorkflowRuntimeGovernance,
  validateWorkflowRuntime,
  writeMigrationEvidence,
  createFailedMigrationReport
};
