PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_uuid TEXT NOT NULL UNIQUE,
  department_code TEXT NOT NULL UNIQUE,
  department_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_departments_uuid_immutable
BEFORE UPDATE OF department_uuid ON departments
FOR EACH ROW
WHEN OLD.department_uuid <> NEW.department_uuid
BEGIN
  SELECT RAISE(ABORT, 'department_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS branch_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_uuid TEXT NOT NULL UNIQUE,
  branch_type TEXT NOT NULL
    CHECK(branch_type IN ('Branch', 'Franchise')),
  branch_name TEXT NOT NULL,
  owner_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  location_text TEXT,
  parent_branch_uuid TEXT,
  operational_status TEXT NOT NULL DEFAULT 'Active'
    CHECK(operational_status IN ('Active', 'Inactive', 'Archived')),
  tier TEXT,
  commission_rate REAL NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(parent_branch_uuid) REFERENCES branch_registry(branch_uuid)
);

CREATE INDEX IF NOT EXISTS idx_branch_registry_type_status
  ON branch_registry(branch_type, operational_status, branch_name);

CREATE INDEX IF NOT EXISTS idx_branch_registry_parent
  ON branch_registry(parent_branch_uuid);

CREATE TRIGGER IF NOT EXISTS trg_branch_registry_uuid_immutable
BEFORE UPDATE OF branch_uuid ON branch_registry
FOR EACH ROW
WHEN OLD.branch_uuid <> NEW.branch_uuid
BEGIN
  SELECT RAISE(ABORT, 'branch_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS workforce_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workforce_uuid TEXT NOT NULL UNIQUE,
  staff_id INTEGER UNIQUE,
  display_name TEXT NOT NULL,
  role_title TEXT,
  workforce_type TEXT NOT NULL DEFAULT 'Human'
    CHECK(workforce_type IN ('Human', 'AI Employee', 'Hybrid', 'System')),
  branch_uuid TEXT,
  primary_department_uuid TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Active'
    CHECK(lifecycle_status IN ('Draft', 'Active', 'Suspended', 'Inactive', 'Archived')),
  experience_level TEXT,
  availability_status TEXT,
  capability_json TEXT NOT NULL DEFAULT '{}',
  additional_departments_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(staff_id) REFERENCES staff(id),
  FOREIGN KEY(branch_uuid) REFERENCES branch_registry(branch_uuid),
  FOREIGN KEY(primary_department_uuid) REFERENCES departments(department_uuid)
);

CREATE INDEX IF NOT EXISTS idx_workforce_registry_department_status
  ON workforce_registry(primary_department_uuid, lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_workforce_registry_branch_status
  ON workforce_registry(branch_uuid, lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_workforce_registry_type_status
  ON workforce_registry(workforce_type, lifecycle_status);

CREATE TRIGGER IF NOT EXISTS trg_workforce_registry_uuid_immutable
BEFORE UPDATE OF workforce_uuid ON workforce_registry
FOR EACH ROW
WHEN OLD.workforce_uuid <> NEW.workforce_uuid
BEGIN
  SELECT RAISE(ABORT, 'workforce_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS workforce_lifecycle_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workforce_uuid TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  reason TEXT,
  previous_lifecycle_status TEXT,
  new_lifecycle_status TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(workforce_uuid) REFERENCES workforce_registry(workforce_uuid)
);

CREATE INDEX IF NOT EXISTS idx_workforce_lifecycle_events_uuid
  ON workforce_lifecycle_events(workforce_uuid, occurred_at DESC);

CREATE TABLE IF NOT EXISTS executive_kpi_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_uuid TEXT NOT NULL UNIQUE,
  snapshot_version INTEGER NOT NULL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  summary_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_executive_kpi_snapshots_generated
  ON executive_kpi_snapshots(generated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_executive_kpi_snapshots_uuid_immutable
BEFORE UPDATE OF snapshot_uuid ON executive_kpi_snapshots
FOR EACH ROW
WHEN OLD.snapshot_uuid <> NEW.snapshot_uuid
BEGIN
  SELECT RAISE(ABORT, 'snapshot_uuid is immutable');
END;
