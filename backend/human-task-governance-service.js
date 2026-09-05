"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MIGRATION_KEY = "019_enterprise_human_task_work_queue_foundation";
const SCHEMA_KEY = "one_point_enterprise_schema";

function nowIso() {
  return new Date().toISOString();
}

function json(value, fallback = {}) {
  return JSON.stringify(value === undefined ? fallback : value);
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
  } catch {
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

function createMigrationReport() {
  return {
    migrationKey: MIGRATION_KEY,
    startedAt: nowIso(),
    finishedAt: null,
    created: 0,
    updated: 0,
    skipped: 0,
    failures: []
  };
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
    milestone: "Phase 4 - Milestone 4.3",
    name: "Enterprise Human Task, Work Queue & Assignment Foundation Validation",
    kind,
    startedAt: nowIso(),
    finishedAt: null,
    validations: {},
    failures: []
  };
}

function addFailure(report, table, key, error) {
  if (!report.failures) report.failures = [];
  report.failures.push({
    table,
    key,
    message: error && error.message ? error.message : String(error)
  });
}

function bump(report, kind) {
  report[kind] = (report[kind] || 0) + 1;
}

const columnCache = new Map();
function getTableColumns(dbConn, table) {
  if (!columnCache.has(table)) {
    const rows = dbConn.prepare(`PRAGMA table_info(${table})`).all();
    columnCache.set(table, new Set(rows.map((row) => row.name)));
  }
  return columnCache.get(table);
}

function upsertSeed(dbConn, report, config) {
  const { table, keyColumn, keyValue, uuidColumn, values } = config;
  try {
    const tableColumns = getTableColumns(dbConn, table);
    const existing = dbConn.prepare(`SELECT * FROM ${table} WHERE ${keyColumn} = ?`).get(keyValue);
    const payload = { ...values, [keyColumn]: keyValue };
    if (uuidColumn && !payload[uuidColumn]) {
      payload[uuidColumn] = existing?.[uuidColumn] || crypto.randomUUID();
    }

    if (existing) {
      const entries = Object.entries(payload).filter(([column]) => column !== uuidColumn && column !== keyColumn);
      if (entries.length === 0) {
        bump(report, "skipped");
        return payload[uuidColumn];
      }
      const setSql = entries.map(([column]) => `${column} = ?`).join(", ");
      const updateQuery = `UPDATE ${table} SET ${setSql} WHERE ${keyColumn} = ?`;
      dbConn.prepare(updateQuery).run(...entries.map(([, value]) => value), keyValue);
      bump(report, "updated");
      return payload[uuidColumn];
    }

    const columns = Object.keys(payload);
    const placeholders = columns.map(() => "?").join(", ");
    dbConn.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`)
      .run(...columns.map((c) => payload[c]));
    bump(report, "created");
    return payload[uuidColumn];
  } catch (error) {
    addFailure(report, table, keyValue, error);
    throw error;
  }
}

function syncHumanTaskWorkQueueGovernance(options = {}) {
  const { dbConn } = options;
  if (!dbConn) throw new Error("dbConn database connection is required for synchronization.");

  columnCache.clear();
  const report = createMigrationReport();

  try {
    const checksum = options.migrationPath ? crypto.createHash("sha256").update(fs.readFileSync(options.migrationPath, "utf8")).digest("hex") : "unknown";

    // Seed migration registry
    upsertSeed(dbConn, report, {
      table: "enterprise_migration_registry",
      keyColumn: "migration_key",
      keyValue: MIGRATION_KEY,
      uuidColumn: "migration_registry_uuid",
      values: {
        migration_name: "Enterprise Human Task, Work Queue & Assignment Foundation",
        schema_key: SCHEMA_KEY,
        target_schema_version_number: 19,
        report_path: options.reportPath ? path.relative(path.join(__dirname, ".."), options.reportPath) : null,
        checksum_sha256: checksum,
        migration_status: "Applied",
        additive_only: 1,
        rollback_required: 1,
        lifecycle_status: "Applied",
        asset_version: 1,
        metadata_json: json({ frozenMilestone: true }),
        applied_at: nowIso()
      }
    });

    // 1. Seed priorities
    const priorityLevels = [
      { key: "Critical", weight: 100, name: "Critical Priority" },
      { key: "High", weight: 75, name: "High Priority" },
      { key: "Medium", weight: 50, name: "Medium Priority" },
      { key: "Low", weight: 25, name: "Low Priority" },
      { key: "Informational", weight: 10, name: "Informational Priority" }
    ];
    for (const lvl of priorityLevels) {
      upsertSeed(dbConn, report, {
        table: "enterprise_human_task_priorities",
        keyColumn: "priority_key",
        keyValue: lvl.key,
        uuidColumn: "priority_uuid",
        values: {
          priority_name: lvl.name,
          priority_weight: lvl.weight,
          sla_multiplier: 1.0,
          escalation_threshold_minutes: 0,
          metadata_json: json({})
        }
      });
    }

    // 2. Seed default categories
    upsertSeed(dbConn, report, {
      table: "enterprise_human_task_categories",
      keyColumn: "category_key",
      keyValue: "general",
      uuidColumn: "category_uuid",
      values: {
        category_name: "General Category",
        parent_category_key: null,
        metadata_json: json({})
      }
    });

    // 3. Seed default queues
    upsertSeed(dbConn, report, {
      table: "enterprise_human_task_queues",
      keyColumn: "queue_key",
      keyValue: "general-queue",
      uuidColumn: "queue_uuid",
      values: {
        queue_name: "General Operations Queue",
        queue_type: "Standard",
        queue_status: "Active",
        owning_domain_key: "general",
        max_capacity: 1000,
        current_depth: 0,
        queue_version: 1,
        queue_generation: 1,
        baseline_queue_key: null,
        metadata_json: json({})
      }
    });

    // 4. Seed default SLA policies
    for (const lvl of priorityLevels) {
      upsertSeed(dbConn, report, {
        table: "enterprise_human_task_sla_policies",
        keyColumn: "sla_key",
        keyValue: `sla-${lvl.key.toLowerCase()}-default`,
        uuidColumn: "sla_uuid",
        values: {
          sla_name: `Default SLA for ${lvl.key}`,
          task_type: "Manual",
          priority_key: lvl.key,
          target_duration_minutes: lvl.weight === 100 ? 120 : 1440,
          warning_threshold_minutes: lvl.weight === 100 ? 30 : 240,
          breach_action: "Escalate",
          metadata_json: json({})
        }
      });
    }

    // 5. Seed default routing rules
    upsertSeed(dbConn, report, {
      table: "enterprise_human_task_queue_routing",
      keyColumn: "routing_key",
      keyValue: "route-general-default",
      uuidColumn: "routing_uuid",
      values: {
        routing_name: "Default Route for General Tasks",
        source_task_type: "Manual",
        source_priority_key: "Medium",
        source_category_key: "general",
        source_tenant_scope_key: "tenant_default",
        target_queue_key: "general-queue",
        routing_priority: 100,
        is_active: 1,
        metadata_json: json({})
      }
    });

    // 6. Seed default calendars
    upsertSeed(dbConn, report, {
      table: "enterprise_business_calendars",
      keyColumn: "calendar_key",
      keyValue: "default-business-calendar",
      uuidColumn: "calendar_uuid",
      values: {
        calendar_name: "Standard Business Calendar (Mon-Fri)",
        working_days: "Mon,Tue,Wed,Thu,Fri",
        business_hours_start: "09:00",
        business_hours_end: "17:00",
        holiday_profile_json: json([]),
        timezone_profile: "UTC",
        is_active: 1,
        metadata_json: json({})
      }
    });

    // 7. Seed default working hours profiles
    upsertSeed(dbConn, report, {
      table: "enterprise_working_hours_profiles",
      keyColumn: "profile_key",
      keyValue: "default-shift",
      uuidColumn: "working_profile_uuid",
      values: {
        shift_name: "Default Working Hours Shift",
        timezone: "UTC",
        start_time: "09:00",
        end_time: "17:00",
        applicable_days: "Mon,Tue,Wed,Thu,Fri",
        owning_department_key: "default",
        is_active: 1,
        metadata_json: json({})
      }
    });

    // 8. Seed default queue capacity
    upsertSeed(dbConn, report, {
      table: "enterprise_human_task_queue_capacity",
      keyColumn: "capacity_uuid",
      keyValue: "cap-uuid-general-default",
      uuidColumn: "capacity_uuid",
      values: {
        queue_key: "general-queue",
        max_concurrent_tasks: 100,
        overflow_policy: "Reject",
        fairness_algorithm: "Round_Robin",
        load_balance_weight: 1,
        overflow_queue_key: null,
        overflow_priority: 999,
        overflow_condition: "Capacity_Exceeded",
        metadata_json: json({})
      }
    });

    report.finishedAt = nowIso();
  } catch (error) {
    addFailure(report, "enterprise_migration_registry", MIGRATION_KEY, error);
    report.finishedAt = nowIso();
    throw error;
  }

  return report;
}

module.exports = {
  syncHumanTaskWorkQueueGovernance,
  writeMigrationEvidence,
  createFailedMigrationReport,
  createValidationReport
};
