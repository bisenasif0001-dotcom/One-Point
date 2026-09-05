PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_uuid TEXT NOT NULL UNIQUE,
  operational_status TEXT NOT NULL DEFAULT 'Open'
    CHECK(operational_status IN ('Open', 'Waiting for Customer', 'Waiting for Staff', 'Resolved', 'Closed', 'Archived')),
  subject TEXT,
  owner_type TEXT NOT NULL DEFAULT 'System'
    CHECK(owner_type IN ('Customer', 'Staff', 'AI Employee', 'Department', 'System')),
  owner_id TEXT NOT NULL DEFAULT 'system',
  linked_object_type TEXT,
  linked_object_uuid TEXT,
  created_by_type TEXT NOT NULL DEFAULT 'System',
  created_by_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversations_status_updated
  ON conversations(operational_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_linked_object
  ON conversations(linked_object_type, linked_object_uuid);

CREATE INDEX IF NOT EXISTS idx_conversations_owner
  ON conversations(owner_type, owner_id, updated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_conversations_uuid_immutable
BEFORE UPDATE OF conversation_uuid ON conversations
FOR EACH ROW
WHEN OLD.conversation_uuid <> NEW.conversation_uuid
BEGIN
  SELECT RAISE(ABORT, 'conversation_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS conversation_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  participant_type TEXT NOT NULL
    CHECK(participant_type IN ('Customer', 'Staff', 'AI Employee', 'Department', 'System', 'Vendor')),
  participant_id TEXT NOT NULL,
  display_name TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TEXT,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_participants_unique
  ON conversation_participants(conversation_id, participant_type, participant_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_identity
  ON conversation_participants(participant_type, participant_id, active, conversation_id);

CREATE TRIGGER IF NOT EXISTS trg_conversation_participants_keep_one
BEFORE DELETE ON conversation_participants
FOR EACH ROW
WHEN (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = OLD.conversation_id) <= 1
BEGIN
  SELECT RAISE(ABORT, 'a conversation must contain at least one participant');
END;

CREATE TABLE IF NOT EXISTS conversation_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  channel_type TEXT NOT NULL
    CHECK(channel_type IN ('Website Chat', 'WhatsApp', 'SMS', 'Email', 'Phone', 'Future Channel')),
  channel_reference TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  first_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_channels_unique
  ON conversation_channels(conversation_id, channel_type, IFNULL(channel_reference, ''));

CREATE INDEX IF NOT EXISTS idx_conversation_channels_type
  ON conversation_channels(channel_type, active, last_used_at DESC);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_uuid TEXT NOT NULL UNIQUE,
  conversation_id INTEGER NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'Text'
    CHECK(message_type IN ('Text', 'Image', 'Document', 'System', 'Workflow Update', 'Notification', 'Payment', 'Voice Placeholder', 'Video Placeholder')),
  lifecycle_status TEXT NOT NULL DEFAULT 'Queued'
    CHECK(lifecycle_status IN ('Queued', 'Sending', 'Sent', 'Delivered', 'Read', 'Failed', 'Archived')),
  direction TEXT NOT NULL DEFAULT 'System'
    CHECK(direction IN ('Inbound', 'Outbound', 'System')),
  channel_type TEXT NOT NULL DEFAULT 'Website Chat'
    CHECK(channel_type IN ('Website Chat', 'WhatsApp', 'SMS', 'Email', 'Phone', 'Future Channel')),
  sender_participant_id INTEGER,
  owner_type TEXT NOT NULL DEFAULT 'System'
    CHECK(owner_type IN ('Customer', 'Staff', 'AI Employee', 'Department', 'System')),
  owner_id TEXT NOT NULL DEFAULT 'system',
  content TEXT,
  linked_object_type TEXT,
  linked_object_uuid TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id),
  FOREIGN KEY(sender_participant_id) REFERENCES conversation_participants(id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation
  ON conversation_messages(conversation_id, occurred_at ASC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_channel_status
  ON conversation_messages(channel_type, lifecycle_status, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_linked_object
  ON conversation_messages(linked_object_type, linked_object_uuid);

CREATE TRIGGER IF NOT EXISTS trg_conversation_messages_uuid_immutable
BEFORE UPDATE OF message_uuid ON conversation_messages
FOR EACH ROW
WHEN OLD.message_uuid <> NEW.message_uuid
BEGIN
  SELECT RAISE(ABORT, 'message_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS communication_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_uuid TEXT NOT NULL,
  template_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Draft'
    CHECK(lifecycle_status IN ('Draft', 'Review', 'Published', 'Deprecated')),
  channel_applicability_json TEXT NOT NULL DEFAULT '[]',
  subject_template TEXT,
  content_template TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by_type TEXT NOT NULL DEFAULT 'System',
  created_by_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_templates_version
  ON communication_templates(template_key, version);

CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_templates_uuid
  ON communication_templates(template_uuid, version);

CREATE INDEX IF NOT EXISTS idx_communication_templates_lifecycle
  ON communication_templates(lifecycle_status, template_key);

CREATE TRIGGER IF NOT EXISTS trg_communication_templates_uuid_immutable
BEFORE UPDATE OF template_uuid ON communication_templates
FOR EACH ROW
WHEN OLD.template_uuid <> NEW.template_uuid
BEGIN
  SELECT RAISE(ABORT, 'template_uuid is immutable');
END;
