PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS document_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_uuid TEXT NOT NULL UNIQUE,
  customer_user_id INTEGER,
  customer_object_uuid TEXT,
  document_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  operational_status TEXT NOT NULL DEFAULT 'Active'
    CHECK(operational_status IN ('Active', 'In Use', 'Locked', 'Suspended', 'Expired')),
  canonical_content_hash TEXT,
  content_hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
  hash_status TEXT NOT NULL DEFAULT 'Pending Content'
    CHECK(hash_status IN ('Available', 'Pending Content', 'Unavailable')),
  retention_policy TEXT,
  retention_category TEXT,
  retention_until TEXT,
  reuse_eligible INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_document_registry_customer
  ON document_registry(customer_user_id, operational_status);

CREATE INDEX IF NOT EXISTS idx_document_registry_hash
  ON document_registry(canonical_content_hash);

CREATE TRIGGER IF NOT EXISTS trg_document_registry_uuid_immutable
BEFORE UPDATE OF document_uuid ON document_registry
FOR EACH ROW
WHEN OLD.document_uuid <> NEW.document_uuid
BEGIN
  SELECT RAISE(ABORT, 'document_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Draft'
    CHECK(lifecycle_status IN ('Draft', 'Uploaded', 'Pending Verification', 'Verified', 'Rejected', 'Expired', 'Archived')),
  verification_status TEXT NOT NULL DEFAULT 'Not Verified'
    CHECK(verification_status IN ('Not Verified', 'Pending Human Verification', 'Human Verified', 'Rejected')),
  active INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  content_hash TEXT,
  content_hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
  issue_date TEXT,
  expiry_date TEXT,
  replacement_reason TEXT,
  created_by_type TEXT NOT NULL DEFAULT 'system',
  created_by_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(document_id) REFERENCES document_registry(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_number
  ON document_versions(document_id, version_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_one_active
  ON document_versions(document_id)
  WHERE active = 1;

CREATE INDEX IF NOT EXISTS idx_document_versions_lifecycle
  ON document_versions(lifecycle_status, verification_status, active);

CREATE TRIGGER IF NOT EXISTS trg_document_versions_historical_immutable
BEFORE UPDATE ON document_versions
FOR EACH ROW
WHEN OLD.active = 0
BEGIN
  SELECT RAISE(ABORT, 'historical document versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_document_versions_lifecycle_transition
BEFORE UPDATE OF lifecycle_status ON document_versions
FOR EACH ROW
WHEN NOT (
  OLD.lifecycle_status = NEW.lifecycle_status OR
  (OLD.lifecycle_status = 'Draft' AND NEW.lifecycle_status = 'Uploaded') OR
  (OLD.lifecycle_status = 'Uploaded' AND NEW.lifecycle_status = 'Pending Verification') OR
  (OLD.lifecycle_status = 'Pending Verification' AND NEW.lifecycle_status IN ('Verified', 'Rejected')) OR
  (OLD.lifecycle_status = 'Verified' AND NEW.lifecycle_status IN ('Expired', 'Archived')) OR
  (OLD.lifecycle_status = 'Rejected' AND NEW.lifecycle_status = 'Archived') OR
  (OLD.lifecycle_status = 'Expired' AND NEW.lifecycle_status = 'Archived')
)
BEGIN
  SELECT RAISE(ABORT, 'illegal document lifecycle transition');
END;

CREATE TABLE IF NOT EXISTS document_verification_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  document_version_id INTEGER NOT NULL,
  verification_type TEXT NOT NULL
    CHECK(verification_type IN ('Human Verified', 'AI Verified', 'Government Verified')),
  verification_status TEXT NOT NULL
    CHECK(verification_status IN ('Verified', 'Rejected')),
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  policy_version TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(document_id) REFERENCES document_registry(id),
  FOREIGN KEY(document_version_id) REFERENCES document_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_document_verification_version
  ON document_verification_records(document_version_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS document_lifecycle_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  document_version_id INTEGER,
  action TEXT NOT NULL
    CHECK(action IN ('Upload', 'Verification', 'Rejection', 'Replacement', 'Reuse', 'Expiry', 'Archive', 'Download', 'View')),
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  previous_lifecycle_status TEXT,
  new_lifecycle_status TEXT,
  previous_operational_status TEXT,
  new_operational_status TEXT,
  linked_object_type TEXT,
  linked_object_uuid TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(document_id) REFERENCES document_registry(id),
  FOREIGN KEY(document_version_id) REFERENCES document_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_document_lifecycle_events_document
  ON document_lifecycle_events(document_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_lifecycle_events_action
  ON document_lifecycle_events(action, occurred_at DESC);

CREATE TABLE IF NOT EXISTS document_usage_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  document_version_id INTEGER,
  linked_object_type TEXT NOT NULL,
  linked_object_uuid TEXT NOT NULL,
  usage_context TEXT NOT NULL DEFAULT 'attachment',
  reuse_eligible INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unlinked_at TEXT,
  FOREIGN KEY(document_id) REFERENCES document_registry(id),
  FOREIGN KEY(document_version_id) REFERENCES document_versions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_usage_links_unique_active
  ON document_usage_links(document_id, linked_object_type, linked_object_uuid, usage_context)
  WHERE active = 1;

CREATE INDEX IF NOT EXISTS idx_document_usage_links_object
  ON document_usage_links(linked_object_type, linked_object_uuid, active);
