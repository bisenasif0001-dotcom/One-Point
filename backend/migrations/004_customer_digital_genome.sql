PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customer_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_object_uuid TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL UNIQUE,
  customer_number TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  mobile TEXT NOT NULL DEFAULT '',
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  photo_url TEXT,
  date_of_birth TEXT,
  gender TEXT,
  identity_status TEXT NOT NULL DEFAULT 'unverified',
  lifecycle_stage TEXT NOT NULL DEFAULT 'registered',
  segment TEXT NOT NULL DEFAULT 'general',
  customer_type TEXT NOT NULL DEFAULT 'individual',
  trust_score INTEGER NOT NULL DEFAULT 50 CHECK(trust_score >= 0 AND trust_score <= 100),
  risk_level TEXT NOT NULL DEFAULT 'normal',
  happiness_score INTEGER CHECK(happiness_score IS NULL OR (happiness_score >= 0 AND happiness_score <= 100)),
  lifetime_value_paise INTEGER NOT NULL DEFAULT 0,
  preferred_language TEXT NOT NULL DEFAULT 'hi',
  preferred_channel TEXT NOT NULL DEFAULT 'whatsapp',
  consent_status TEXT NOT NULL DEFAULT 'unknown',
  consent_updated_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(customer_object_uuid) REFERENCES universal_objects(universal_uuid)
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_mobile ON customer_profiles(mobile);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_lifecycle ON customer_profiles(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_segment ON customer_profiles(segment);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_trust ON customer_profiles(trust_score, risk_level);

CREATE TABLE IF NOT EXISTS customer_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_object_uuid TEXT NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'system',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_object_uuid) REFERENCES universal_objects(universal_uuid)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_preferences_unique
  ON customer_preferences(customer_object_uuid, preference_key);
CREATE INDEX IF NOT EXISTS idx_customer_preferences_customer ON customer_preferences(customer_object_uuid);

CREATE TABLE IF NOT EXISTS customer_lifecycle_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_object_uuid TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source_table TEXT,
  source_pk TEXT,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_object_uuid) REFERENCES universal_objects(universal_uuid)
);

CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_customer
  ON customer_lifecycle_events(customer_object_uuid, occurred_at);
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_type
  ON customer_lifecycle_events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_source
  ON customer_lifecycle_events(source_table, source_pk);

CREATE TABLE IF NOT EXISTS customer_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_object_uuid TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'unknown',
  accepted_at TEXT,
  revoked_at TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  policy_version TEXT NOT NULL DEFAULT 'baseline-2026-07-02',
  channel TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_object_uuid) REFERENCES universal_objects(universal_uuid)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_consents_version
  ON customer_consents(customer_object_uuid, consent_type, consent_version, policy_version);
CREATE INDEX IF NOT EXISTS idx_customer_consents_customer ON customer_consents(customer_object_uuid);
CREATE INDEX IF NOT EXISTS idx_customer_consents_type_status ON customer_consents(consent_type, status);

CREATE TABLE IF NOT EXISTS customer_trust_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_object_uuid TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_value TEXT NOT NULL DEFAULT '',
  score_delta INTEGER NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'info',
  source_table TEXT,
  source_pk TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_object_uuid) REFERENCES universal_objects(universal_uuid)
);

CREATE INDEX IF NOT EXISTS idx_customer_trust_signals_customer
  ON customer_trust_signals(customer_object_uuid, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_trust_signals_type
  ON customer_trust_signals(signal_type, severity);
CREATE INDEX IF NOT EXISTS idx_customer_trust_signals_source
  ON customer_trust_signals(source_table, source_pk);
