PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS service_dna_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_object_uuid TEXT,
  service_id INTEGER,
  service_slug TEXT NOT NULL,
  service_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  short_name TEXT,
  category TEXT,
  sub_category TEXT,
  description TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT 'operations',
  government_department TEXT,
  processing_type TEXT NOT NULL DEFAULT 'assisted',
  delivery_mode TEXT NOT NULL DEFAULT 'digital_assisted',
  lifecycle_status TEXT NOT NULL DEFAULT 'Draft'
    CHECK(lifecycle_status IN ('Draft', 'Review', 'Published', 'Deprecated')),
  active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0, 1)),
  version INTEGER NOT NULL DEFAULT 1,
  owner_ai TEXT,
  human_owner TEXT NOT NULL DEFAULT 'owner',
  published_at TEXT,
  deprecated_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(service_id) REFERENCES services(id),
  FOREIGN KEY(service_object_uuid) REFERENCES universal_objects(universal_uuid),
  UNIQUE(service_slug, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_dna_one_active_published
  ON service_dna_profiles(service_slug)
  WHERE active = 1 AND lifecycle_status = 'Published';
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_dna_one_active_version
  ON service_dna_profiles(service_slug)
  WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_service_dna_profiles_slug ON service_dna_profiles(service_slug);
CREATE INDEX IF NOT EXISTS idx_service_dna_profiles_object ON service_dna_profiles(service_object_uuid);
CREATE INDEX IF NOT EXISTS idx_service_dna_profiles_lifecycle ON service_dna_profiles(lifecycle_status, active);

CREATE TABLE IF NOT EXISTS service_dna_layers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  layer_key TEXT NOT NULL CHECK(layer_key IN (
    'identity',
    'pricing',
    'eligibility',
    'documents',
    'workflow',
    'government_rules',
    'ai_behaviour',
    'customer_experience',
    'automation',
    'notifications',
    'analytics',
    'learning'
  )),
  layer_version INTEGER NOT NULL DEFAULT 1,
  lifecycle_status TEXT NOT NULL DEFAULT 'Draft'
    CHECK(lifecycle_status IN ('Draft', 'Review', 'Published', 'Deprecated')),
  active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0, 1)),
  config_json TEXT NOT NULL DEFAULT '{}',
  effective_from TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(profile_id) REFERENCES service_dna_profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, layer_key, layer_version)
);

CREATE INDEX IF NOT EXISTS idx_service_dna_layers_profile ON service_dna_layers(profile_id);
CREATE INDEX IF NOT EXISTS idx_service_dna_layers_key ON service_dna_layers(layer_key, lifecycle_status, active);

CREATE TABLE IF NOT EXISTS service_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'service',
  description TEXT NOT NULL DEFAULT '',
  config_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_templates_category ON service_templates(category, active);

CREATE TABLE IF NOT EXISTS service_dna_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_slug TEXT NOT NULL,
  service_object_uuid TEXT,
  profile_id INTEGER,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(profile_id) REFERENCES service_dna_profiles(id),
  FOREIGN KEY(service_object_uuid) REFERENCES universal_objects(universal_uuid)
);

CREATE INDEX IF NOT EXISTS idx_service_dna_audit_slug ON service_dna_audit_events(service_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_service_dna_audit_profile ON service_dna_audit_events(profile_id, created_at);
