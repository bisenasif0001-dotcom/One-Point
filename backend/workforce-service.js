"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { safePhone, safeString } = require("./utils");

const WORKFORCE_TYPES = new Set(["Human", "AI Employee", "Hybrid", "System"]);
const WORKFORCE_LIFECYCLES = new Set(["Draft", "Active", "Suspended", "Inactive", "Archived"]);

const DEFAULT_DEPARTMENTS = Object.freeze([
  { code: "executive-office", name: "Executive Office" },
  { code: "operations", name: "Operations" },
  { code: "customer-success", name: "Customer Success" },
  { code: "finance", name: "Finance" },
  { code: "knowledge", name: "Knowledge" },
  { code: "compliance", name: "Compliance" },
  { code: "branch-operations", name: "Branch Operations" },
  { code: "franchise-operations", name: "Franchise Operations" }
]);

const ROLE_DEPARTMENT_CODE = Object.freeze({
  admin: "executive-office",
  verifier: "compliance",
  support: "customer-success",
  agent: "operations"
});

function getDb(dbConn) {
  return dbConn || require("./db").getDb();
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function json(value, fallback = {}) {
  return JSON.stringify(value === undefined ? fallback : value);
}

function writeReport(report, reportPath) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function normalizeWorkforceType(value) {
  const candidate = safeString(value || "Human", 40);
  if (!WORKFORCE_TYPES.has(candidate)) {
    throw new Error("workforceType must be a governed value.");
  }
  return candidate;
}

function normalizeLifecycleStatus(value) {
  const candidate = safeString(value || "Active", 40);
  if (!WORKFORCE_LIFECYCLES.has(candidate)) {
    throw new Error("lifecycleStatus must be a governed value.");
  }
  return candidate;
}

function cleanList(value, maxItems = 24, maxLength = 80) {
  const values = Array.isArray(value)
    ? value
    : String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  return Array.from(new Set(values.map((item) => safeString(item, maxLength)).filter(Boolean))).slice(0, maxItems);
}

function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload || {}, key);
}

function defaultDepartmentCodeForRole(role) {
  return ROLE_DEPARTMENT_CODE[String(role || "").trim().toLowerCase()] || "operations";
}

function seedDepartments(dbConn = getDb()) {
  const stmt = dbConn.prepare(`
    INSERT INTO departments (department_uuid, department_code, department_name, status, metadata_json)
    VALUES (?, ?, ?, 'Active', ?)
    ON CONFLICT(department_code) DO UPDATE SET
      department_name = excluded.department_name,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const department of DEFAULT_DEPARTMENTS) {
    stmt.run(
      crypto.randomUUID(),
      department.code,
      department.name,
      json({
        source: "phase-2-milestone-2.7-seed",
        governanceScope: "business_object_registry"
      })
    );
  }
}

function getDepartmentByUuid(dbConn, departmentUuid) {
  if (!departmentUuid) return null;
  return dbConn.prepare("SELECT * FROM departments WHERE department_uuid = ?").get(safeString(departmentUuid, 80)) || null;
}

function getDepartmentByCode(dbConn, departmentCode) {
  if (!departmentCode) return null;
  return dbConn.prepare("SELECT * FROM departments WHERE department_code = ?").get(safeString(departmentCode, 80)) || null;
}

function resolveDepartment(dbConn, payload, staff) {
  const byUuid = getDepartmentByUuid(dbConn, payload.primaryDepartmentUuid);
  if (payload.primaryDepartmentUuid && !byUuid) {
    throw new Error("primaryDepartmentUuid was not found.");
  }
  if (byUuid) return byUuid;

  const byCode = getDepartmentByCode(dbConn, payload.primaryDepartmentCode);
  if (payload.primaryDepartmentCode && !byCode) {
    throw new Error("primaryDepartmentCode was not found.");
  }
  if (byCode) return byCode;

  return getDepartmentByCode(dbConn, defaultDepartmentCodeForRole(staff.role));
}

function getBranchByUuid(dbConn, branchUuid) {
  if (!branchUuid) return null;
  return dbConn.prepare("SELECT * FROM branch_registry WHERE branch_uuid = ?").get(safeString(branchUuid, 80)) || null;
}

function normalizeCapabilityProfile(payload = {}, staff = {}, existingCapability = {}) {
  const baseSkills = hasOwn(payload, "skills")
    ? payload.skills
    : existingCapability.skills !== undefined
      ? existingCapability.skills
      : parseJson(staff.skills, []);
  const skills = cleanList(baseSkills, 40, 100);
  const certifications = hasOwn(payload, "certifications")
    ? payload.certifications
    : existingCapability.certifications;
  const supportedServices = hasOwn(payload, "supportedServices")
    ? payload.supportedServices
    : hasOwn(payload, "supported_services")
      ? payload.supported_services
      : existingCapability.supported_services;
  const languages = hasOwn(payload, "languages")
    ? payload.languages
    : existingCapability.languages;
  const experienceLevel = hasOwn(payload, "experienceLevel")
    ? payload.experienceLevel
    : hasOwn(payload, "experience_level")
      ? payload.experience_level
      : existingCapability.experience_level;
  const availabilityStatus = hasOwn(payload, "availabilityStatus")
    ? payload.availabilityStatus
    : hasOwn(payload, "availability_status")
      ? payload.availability_status
      : existingCapability.availability_status;
  return {
    skills,
    certifications: cleanList(certifications, 20, 120),
    supported_services: cleanList(supportedServices, 40, 120),
    languages: cleanList(languages, 12, 40),
    experience_level: safeString(experienceLevel, 80) || "Intermediate",
    availability_status: safeString(availabilityStatus, 80) || "Available"
  };
}

function mapWorkforceRow(row) {
  if (!row) return null;
  const capability = parseJson(row.capability_json, {});
  return {
    workforceUuid: row.workforce_uuid,
    staffId: row.staff_id,
    displayName: row.display_name,
    roleTitle: row.role_title || "",
    workforceType: row.workforce_type,
    branchUuid: row.branch_uuid || null,
    primaryDepartmentUuid: row.primary_department_uuid,
    lifecycleStatus: row.lifecycle_status,
    experienceLevel: row.experience_level || capability.experience_level || "Intermediate",
    availabilityStatus: row.availability_status || capability.availability_status || "Available",
    skills: cleanList(capability.skills, 40, 100),
    certifications: cleanList(capability.certifications, 20, 120),
    supportedServices: cleanList(capability.supported_services, 40, 120),
    languages: cleanList(capability.languages, 12, 40),
    additionalDepartments: cleanList(parseJson(row.additional_departments_json, []), 12, 80),
    metadata: parseJson(row.metadata_json, {})
  };
}

function getWorkforceRowByStaffId(dbConn, staffId) {
  return dbConn.prepare("SELECT * FROM workforce_registry WHERE staff_id = ?").get(Number(staffId)) || null;
}

function recordLifecycleEvent(dbConn, workforceUuid, event = {}) {
  dbConn.prepare(`
    INSERT INTO workforce_lifecycle_events
      (workforce_uuid, actor_type, actor_id, action, reason, previous_lifecycle_status, new_lifecycle_status, metadata_json, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workforceUuid,
    safeString(event.actorType || "system", 80),
    event.actorId === undefined || event.actorId === null ? null : safeString(event.actorId, 120),
    safeString(event.action || "Lifecycle Updated", 120),
    event.reason ? safeString(event.reason, 500) : null,
    event.previousLifecycleStatus || null,
    event.newLifecycleStatus || null,
    json(event.metadata || {}),
    event.occurredAt || new Date().toISOString()
  );
}

function syncStaffGovernance(staffId, payload = {}, options = {}) {
  const dbConn = getDb(options.dbConn);
  seedDepartments(dbConn);

  const staff = dbConn.prepare("SELECT * FROM staff WHERE id = ?").get(Number(staffId));
  if (!staff) throw new Error("Staff member not found.");

  const branch = payload.branchUuid ? getBranchByUuid(dbConn, payload.branchUuid) : null;
  if (payload.branchUuid && !branch) {
    throw new Error("branchUuid was not found.");
  }

  const department = resolveDepartment(dbConn, payload, staff);
  if (!department) throw new Error("A governed primary department is required.");

  const workforceType = normalizeWorkforceType(payload.workforceType || "Human");
  const lifecycleStatus = normalizeLifecycleStatus(
    payload.lifecycleStatus || (Number(staff.is_active) === 1 ? "Active" : "Inactive")
  );
  const existing = getWorkforceRowByStaffId(dbConn, staff.id);
  const existingCapability = parseJson(existing?.capability_json, {});
  const capability = normalizeCapabilityProfile(payload, staff, existingCapability);
  const availabilityStatus = safeString(payload.availabilityStatus || capability.availability_status, 80) || "Available";
  const experienceLevel = safeString(payload.experienceLevel || capability.experience_level, 80) || "Intermediate";
  const additionalDepartments = cleanList(payload.additionalDepartmentUuids || payload.additionalDepartments, 12, 80);
  const metadata = {
    source: options.source || "staff_admin_api",
    roleTitle: safeString(payload.roleTitle || staff.role, 120) || "agent",
    aiWorkforceOperationalScope: workforceType === "Human" ? "operational" : "metadata_only",
    routingAutomation: "not_implemented",
    schedulingAutomation: "not_implemented"
  };

  if (!existing) {
    const workforceUuid = crypto.randomUUID();
    dbConn.prepare(`
      INSERT INTO workforce_registry
        (workforce_uuid, staff_id, display_name, role_title, workforce_type, branch_uuid,
         primary_department_uuid, lifecycle_status, experience_level, availability_status,
         capability_json, additional_departments_json, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workforceUuid,
      staff.id,
      safeString(staff.name, 180) || `Staff ${staff.id}`,
      safeString(payload.roleTitle || staff.role, 120) || "agent",
      workforceType,
      branch?.branch_uuid || null,
      department.department_uuid,
      lifecycleStatus,
      experienceLevel,
      availabilityStatus,
      json(capability),
      json(additionalDepartments, []),
      json(metadata)
    );
    recordLifecycleEvent(dbConn, workforceUuid, {
      actorType: options.actorType || "system",
      actorId: options.actorId || "phase-2-milestone-2.7",
      action: "Workforce Created",
      reason: options.reason || "Governed workforce baseline established.",
      newLifecycleStatus: lifecycleStatus,
      metadata: { departmentUuid: department.department_uuid, branchUuid: branch?.branch_uuid || null }
    });
  } else {
    dbConn.prepare(`
      UPDATE workforce_registry
      SET display_name = ?,
          role_title = ?,
          workforce_type = ?,
          branch_uuid = ?,
          primary_department_uuid = ?,
          lifecycle_status = ?,
          experience_level = ?,
          availability_status = ?,
          capability_json = ?,
          additional_departments_json = ?,
          metadata_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE staff_id = ?
    `).run(
      safeString(staff.name, 180) || existing.display_name,
      safeString(payload.roleTitle || staff.role, 120) || existing.role_title || "agent",
      workforceType,
      branch?.branch_uuid || null,
      department.department_uuid,
      lifecycleStatus,
      experienceLevel,
      availabilityStatus,
      json(capability),
      json(additionalDepartments, []),
      json({ ...parseJson(existing.metadata_json, {}), ...metadata }),
      staff.id
    );

    if (existing.lifecycle_status !== lifecycleStatus) {
      recordLifecycleEvent(dbConn, existing.workforce_uuid, {
        actorType: options.actorType || "system",
        actorId: options.actorId || "phase-2-milestone-2.7",
        action: "Lifecycle Updated",
        reason: options.reason || "Governed workforce lifecycle updated.",
        previousLifecycleStatus: existing.lifecycle_status,
        newLifecycleStatus: lifecycleStatus,
        metadata: { departmentUuid: department.department_uuid, branchUuid: branch?.branch_uuid || null }
      });
    }
  }

  return mapWorkforceRow(getWorkforceRowByStaffId(dbConn, staff.id));
}

function listDepartments(dbConn = getDb()) {
  seedDepartments(dbConn);
  return dbConn.prepare(`
    SELECT department_uuid, department_code, department_name, status, metadata_json, created_at, updated_at
    FROM departments
    ORDER BY department_name ASC
  `).all().map((row) => ({
    departmentUuid: row.department_uuid,
    departmentCode: row.department_code,
    departmentName: row.department_name,
    status: row.status,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function listWorkforce(dbConn = getDb()) {
  seedDepartments(dbConn);
  return dbConn.prepare(`
    SELECT wr.*, d.department_name, d.department_code, b.branch_name, b.branch_type
    FROM workforce_registry wr
    JOIN departments d ON d.department_uuid = wr.primary_department_uuid
    LEFT JOIN branch_registry b ON b.branch_uuid = wr.branch_uuid
    ORDER BY wr.display_name ASC
  `).all().map((row) => ({
    ...mapWorkforceRow(row),
    primaryDepartmentName: row.department_name,
    primaryDepartmentCode: row.department_code,
    branchName: row.branch_name || "",
    branchType: row.branch_type || null
  }));
}

function backfillExistingStaff({ dbConn, reportPath } = {}) {
  const connection = getDb(dbConn);
  seedDepartments(connection);
  const staffRows = connection.prepare("SELECT id, name, phone, role, is_active, skills FROM staff ORDER BY id ASC").all();
  const report = {
    milestone: "phase-2-milestone-2.7",
    generatedAt: new Date().toISOString(),
    scanned: staffRows.length,
    registered: 0,
    failed: 0,
    failures: []
  };

  for (const staff of staffRows) {
    try {
      syncStaffGovernance(staff.id, {
        skills: parseJson(staff.skills, []),
        availabilityStatus: Number(staff.is_active) === 1 ? "Available" : "Unavailable"
      }, {
        dbConn: connection,
        actorType: "system",
        actorId: "phase-2-milestone-2.7-backfill",
        source: "phase-2-milestone-2.7-backfill",
        reason: "Existing staff registered into governed workforce baseline."
      });
      report.registered += 1;
    } catch (error) {
      report.failed += 1;
      report.failures.push({
        staffId: staff.id,
        staffName: staff.name,
        phone: safePhone(staff.phone),
        error: error.message
      });
    }
  }

  writeReport(report, reportPath);
  return report;
}

module.exports = {
  WORKFORCE_TYPES,
  WORKFORCE_LIFECYCLES,
  seedDepartments,
  syncStaffGovernance,
  listDepartments,
  listWorkforce,
  backfillExistingStaff
};
