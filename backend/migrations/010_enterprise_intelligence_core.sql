PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_domain_uuid TEXT NOT NULL UNIQUE,
  domain_key TEXT NOT NULL UNIQUE,
  domain_name TEXT NOT NULL,
  owner_department TEXT NOT NULL DEFAULT 'knowledge',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_domains_uuid_immutable
BEFORE UPDATE OF knowledge_domain_uuid ON enterprise_knowledge_domains
FOR EACH ROW
WHEN OLD.knowledge_domain_uuid <> NEW.knowledge_domain_uuid
BEGIN
  SELECT RAISE(ABORT, 'knowledge_domain_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_source_uuid TEXT NOT NULL UNIQUE,
  source_key TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'enterprise',
  source_priority INTEGER NOT NULL DEFAULT 100,
  authority_level INTEGER NOT NULL DEFAULT 0,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_sources_uuid_immutable
BEFORE UPDATE OF knowledge_source_uuid ON enterprise_knowledge_sources
FOR EACH ROW
WHEN OLD.knowledge_source_uuid <> NEW.knowledge_source_uuid
BEGIN
  SELECT RAISE(ABORT, 'knowledge_source_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_article_uuid TEXT NOT NULL UNIQUE,
  domain_uuid TEXT NOT NULL,
  article_key TEXT NOT NULL UNIQUE,
  article_title TEXT NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'department',
  owner_id TEXT NOT NULL DEFAULT 'knowledge',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  current_version_number INTEGER NOT NULL DEFAULT 1,
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(domain_uuid) REFERENCES enterprise_knowledge_domains(knowledge_domain_uuid)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_articles_domain
  ON enterprise_knowledge_articles(domain_uuid, lifecycle_status);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_articles_uuid_immutable
BEFORE UPDATE OF knowledge_article_uuid ON enterprise_knowledge_articles
FOR EACH ROW
WHEN OLD.knowledge_article_uuid <> NEW.knowledge_article_uuid
BEGIN
  SELECT RAISE(ABORT, 'knowledge_article_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_version_uuid TEXT NOT NULL UNIQUE,
  knowledge_article_uuid TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  version_status TEXT NOT NULL DEFAULT 'Published',
  knowledge_source_uuid TEXT,
  knowledge_jurisdiction TEXT,
  knowledge_effective_from TEXT,
  knowledge_effective_to TEXT,
  knowledge_applicability TEXT,
  knowledge_supersedes TEXT,
  knowledge_exception_reference TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(knowledge_article_uuid) REFERENCES enterprise_knowledge_articles(knowledge_article_uuid),
  FOREIGN KEY(knowledge_source_uuid) REFERENCES enterprise_knowledge_sources(knowledge_source_uuid),
  UNIQUE(knowledge_article_uuid, version_number)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_versions_article
  ON enterprise_knowledge_versions(knowledge_article_uuid, version_number DESC);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_versions_uuid_immutable
BEFORE UPDATE OF knowledge_version_uuid ON enterprise_knowledge_versions
FOR EACH ROW
WHEN OLD.knowledge_version_uuid <> NEW.knowledge_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'knowledge_version_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_relationship_uuid TEXT NOT NULL UNIQUE,
  from_knowledge_article_uuid TEXT NOT NULL,
  to_knowledge_article_uuid TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(from_knowledge_article_uuid) REFERENCES enterprise_knowledge_articles(knowledge_article_uuid),
  FOREIGN KEY(to_knowledge_article_uuid) REFERENCES enterprise_knowledge_articles(knowledge_article_uuid),
  UNIQUE(from_knowledge_article_uuid, to_knowledge_article_uuid, relationship_type)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_relationships_uuid_immutable
BEFORE UPDATE OF knowledge_relationship_uuid ON enterprise_knowledge_relationships
FOR EACH ROW
WHEN OLD.knowledge_relationship_uuid <> NEW.knowledge_relationship_uuid
BEGIN
  SELECT RAISE(ABORT, 'knowledge_relationship_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_tag_uuid TEXT NOT NULL UNIQUE,
  tag_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_tags_uuid_immutable
BEFORE UPDATE OF knowledge_tag_uuid ON enterprise_knowledge_tags
FOR EACH ROW
WHEN OLD.knowledge_tag_uuid <> NEW.knowledge_tag_uuid
BEGIN
  SELECT RAISE(ABORT, 'knowledge_tag_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_knowledge_article_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_article_uuid TEXT NOT NULL,
  knowledge_tag_uuid TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(knowledge_article_uuid, knowledge_tag_uuid),
  FOREIGN KEY(knowledge_article_uuid) REFERENCES enterprise_knowledge_articles(knowledge_article_uuid),
  FOREIGN KEY(knowledge_tag_uuid) REFERENCES enterprise_knowledge_tags(knowledge_tag_uuid)
);

CREATE TABLE IF NOT EXISTS enterprise_knowledge_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_audit_uuid TEXT NOT NULL UNIQUE,
  knowledge_article_uuid TEXT NOT NULL,
  knowledge_version_uuid TEXT,
  action TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(knowledge_article_uuid) REFERENCES enterprise_knowledge_articles(knowledge_article_uuid),
  FOREIGN KEY(knowledge_version_uuid) REFERENCES enterprise_knowledge_versions(knowledge_version_uuid)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_knowledge_audit_article
  ON enterprise_knowledge_audit(knowledge_article_uuid, occurred_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_audit_uuid_immutable
BEFORE UPDATE OF knowledge_audit_uuid ON enterprise_knowledge_audit
FOR EACH ROW
WHEN OLD.knowledge_audit_uuid <> NEW.knowledge_audit_uuid
BEGIN
  SELECT RAISE(ABORT, 'knowledge_audit_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_prompt_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_profile_uuid TEXT NOT NULL UNIQUE,
  prompt_key TEXT NOT NULL UNIQUE,
  prompt_name TEXT NOT NULL,
  prompt_scope TEXT NOT NULL,
  prompt_owner_type TEXT NOT NULL DEFAULT 'department',
  prompt_owner_id TEXT NOT NULL DEFAULT 'knowledge',
  prompt_category TEXT,
  prompt_status TEXT NOT NULL DEFAULT 'Published',
  prompt_lifecycle TEXT NOT NULL DEFAULT 'Published',
  current_version_number INTEGER NOT NULL DEFAULT 1,
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_prompt_profiles_uuid_immutable
BEFORE UPDATE OF prompt_profile_uuid ON enterprise_prompt_profiles
FOR EACH ROW
WHEN OLD.prompt_profile_uuid <> NEW.prompt_profile_uuid
BEGIN
  SELECT RAISE(ABORT, 'prompt_profile_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_prompt_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_template_uuid TEXT NOT NULL UNIQUE,
  prompt_profile_uuid TEXT NOT NULL,
  template_key TEXT NOT NULL,
  channel_scope TEXT,
  persona_scope TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(prompt_profile_uuid) REFERENCES enterprise_prompt_profiles(prompt_profile_uuid),
  UNIQUE(prompt_profile_uuid, template_key)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_prompt_templates_uuid_immutable
BEFORE UPDATE OF prompt_template_uuid ON enterprise_prompt_templates
FOR EACH ROW
WHEN OLD.prompt_template_uuid <> NEW.prompt_template_uuid
BEGIN
  SELECT RAISE(ABORT, 'prompt_template_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_prompt_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_version_uuid TEXT NOT NULL UNIQUE,
  prompt_profile_uuid TEXT NOT NULL,
  prompt_template_uuid TEXT,
  version_number INTEGER NOT NULL,
  prompt_status TEXT NOT NULL DEFAULT 'Published',
  prompt_policy_json TEXT NOT NULL DEFAULT '{}',
  prompt_text TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(prompt_profile_uuid) REFERENCES enterprise_prompt_profiles(prompt_profile_uuid),
  FOREIGN KEY(prompt_template_uuid) REFERENCES enterprise_prompt_templates(prompt_template_uuid),
  UNIQUE(prompt_profile_uuid, prompt_template_uuid, version_number)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_prompt_versions_uuid_immutable
BEFORE UPDATE OF prompt_version_uuid ON enterprise_prompt_versions
FOR EACH ROW
WHEN OLD.prompt_version_uuid <> NEW.prompt_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'prompt_version_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_uuid TEXT NOT NULL UNIQUE,
  persona_key TEXT NOT NULL UNIQUE,
  persona_name TEXT NOT NULL,
  persona_type TEXT NOT NULL,
  persona_status TEXT NOT NULL DEFAULT 'Published',
  persona_owner_type TEXT NOT NULL DEFAULT 'department',
  persona_owner_id TEXT NOT NULL DEFAULT 'innovation',
  persona_scope TEXT NOT NULL DEFAULT 'enterprise',
  persona_parent TEXT,
  persona_traits_json TEXT NOT NULL DEFAULT '[]',
  persona_shared_assets_json TEXT NOT NULL DEFAULT '[]',
  persona_supported_domains_json TEXT NOT NULL DEFAULT '[]',
  persona_supported_channels_json TEXT NOT NULL DEFAULT '[]',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  current_version_number INTEGER NOT NULL DEFAULT 1,
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_personas_uuid_immutable
BEFORE UPDATE OF persona_uuid ON enterprise_personas
FOR EACH ROW
WHEN OLD.persona_uuid <> NEW.persona_uuid
BEGIN
  SELECT RAISE(ABORT, 'persona_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_persona_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_version_uuid TEXT NOT NULL UNIQUE,
  persona_uuid TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  persona_capabilities_json TEXT NOT NULL DEFAULT '[]',
  persona_permissions_json TEXT NOT NULL DEFAULT '[]',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(persona_uuid) REFERENCES enterprise_personas(persona_uuid),
  UNIQUE(persona_uuid, version_number)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_persona_versions_uuid_immutable
BEFORE UPDATE OF persona_version_uuid ON enterprise_persona_versions
FOR EACH ROW
WHEN OLD.persona_version_uuid <> NEW.persona_version_uuid
BEGIN
  SELECT RAISE(ABORT, 'persona_version_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_memory_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_class_uuid TEXT NOT NULL UNIQUE,
  memory_class_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mutability_class TEXT NOT NULL DEFAULT 'governed',
  retention_class TEXT NOT NULL DEFAULT 'policy_defined',
  sensitivity_class TEXT NOT NULL DEFAULT 'internal',
  provenance_requirement TEXT NOT NULL DEFAULT 'required',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_memory_classes_uuid_immutable
BEFORE UPDATE OF memory_class_uuid ON enterprise_memory_classes
FOR EACH ROW
WHEN OLD.memory_class_uuid <> NEW.memory_class_uuid
BEGIN
  SELECT RAISE(ABORT, 'memory_class_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_capabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capability_uuid TEXT NOT NULL UNIQUE,
  capability_key TEXT NOT NULL UNIQUE,
  capability_name TEXT NOT NULL,
  capability_type TEXT NOT NULL,
  required_permissions_json TEXT NOT NULL DEFAULT '[]',
  required_modules_json TEXT NOT NULL DEFAULT '[]',
  required_knowledge_json TEXT NOT NULL DEFAULT '[]',
  required_tools_json TEXT NOT NULL DEFAULT '[]',
  capability_preconditions_json TEXT NOT NULL DEFAULT '[]',
  capability_prohibited_conditions_json TEXT NOT NULL DEFAULT '[]',
  capability_expected_outputs_json TEXT NOT NULL DEFAULT '[]',
  capability_required_approval TEXT,
  capability_allowed_personas_json TEXT NOT NULL DEFAULT '[]',
  capability_audit_policy_json TEXT NOT NULL DEFAULT '{}',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_capabilities_uuid_immutable
BEFORE UPDATE OF capability_uuid ON enterprise_capabilities
FOR EACH ROW
WHEN OLD.capability_uuid <> NEW.capability_uuid
BEGIN
  SELECT RAISE(ABORT, 'capability_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_uuid TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  tool_name TEXT NOT NULL,
  tool_type TEXT NOT NULL,
  tool_provider_class TEXT NOT NULL DEFAULT 'generic',
  tool_scope TEXT NOT NULL DEFAULT 'enterprise',
  tool_permissions_json TEXT NOT NULL DEFAULT '[]',
  credential_class TEXT,
  environment_scope TEXT,
  provider_contract_version TEXT,
  data_sensitivity TEXT,
  risk_class TEXT,
  approval_requirement TEXT,
  audit_requirement TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tools_uuid_immutable
BEFORE UPDATE OF tool_uuid ON enterprise_tools
FOR EACH ROW
WHEN OLD.tool_uuid <> NEW.tool_uuid
BEGIN
  SELECT RAISE(ABORT, 'tool_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_approval_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_policy_uuid TEXT NOT NULL UNIQUE,
  approval_policy_key TEXT NOT NULL UNIQUE,
  approval_class TEXT NOT NULL,
  approver_role_class TEXT,
  approval_expiry TEXT,
  override_reason TEXT,
  escalation_path_json TEXT NOT NULL DEFAULT '[]',
  separation_of_duties_class TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_approval_policies_uuid_immutable
BEFORE UPDATE OF approval_policy_uuid ON enterprise_approval_policies
FOR EACH ROW
WHEN OLD.approval_policy_uuid <> NEW.approval_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'approval_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_context_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context_profile_uuid TEXT NOT NULL UNIQUE,
  profile_key TEXT NOT NULL UNIQUE,
  context_scope TEXT NOT NULL,
  context_priority INTEGER NOT NULL DEFAULT 100,
  context_source_reference_json TEXT NOT NULL DEFAULT '[]',
  context_resolution_policy TEXT NOT NULL DEFAULT 'governed_resolution',
  context_privacy_class TEXT NOT NULL DEFAULT 'internal',
  context_freshness TEXT NOT NULL DEFAULT 'policy_defined',
  context_owner TEXT NOT NULL DEFAULT 'knowledge',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_context_profiles_uuid_immutable
BEFORE UPDATE OF context_profile_uuid ON enterprise_context_profiles
FOR EACH ROW
WHEN OLD.context_profile_uuid <> NEW.context_profile_uuid
BEGIN
  SELECT RAISE(ABORT, 'context_profile_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_confidence_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  confidence_policy_uuid TEXT NOT NULL UNIQUE,
  confidence_policy_key TEXT NOT NULL UNIQUE,
  confidence_threshold REAL NOT NULL DEFAULT 0,
  confidence_class TEXT NOT NULL,
  minimum_source_authority INTEGER NOT NULL DEFAULT 0,
  approval_required_below_threshold INTEGER NOT NULL DEFAULT 0,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_confidence_policies_uuid_immutable
BEFORE UPDATE OF confidence_policy_uuid ON enterprise_confidence_policies
FOR EACH ROW
WHEN OLD.confidence_policy_uuid <> NEW.confidence_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'confidence_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_action_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_policy_uuid TEXT NOT NULL UNIQUE,
  action_policy_key TEXT NOT NULL UNIQUE,
  action_type TEXT NOT NULL,
  required_capabilities_json TEXT NOT NULL DEFAULT '[]',
  required_tools_json TEXT NOT NULL DEFAULT '[]',
  required_approval_class TEXT,
  allowed_persona_types_json TEXT NOT NULL DEFAULT '[]',
  preconditions_json TEXT NOT NULL DEFAULT '[]',
  forbidden_conditions_json TEXT NOT NULL DEFAULT '[]',
  reversibility_class TEXT NOT NULL DEFAULT 'human_defined',
  audit_requirement TEXT NOT NULL DEFAULT 'required',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_action_policies_uuid_immutable
BEFORE UPDATE OF action_policy_uuid ON enterprise_action_policies
FOR EACH ROW
WHEN OLD.action_policy_uuid <> NEW.action_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'action_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_safety_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  safety_policy_uuid TEXT NOT NULL UNIQUE,
  safety_policy_key TEXT NOT NULL UNIQUE,
  safety_class_name TEXT NOT NULL,
  human_required INTEGER NOT NULL DEFAULT 0,
  financial_operation_flag INTEGER NOT NULL DEFAULT 0,
  identity_operation_flag INTEGER NOT NULL DEFAULT 0,
  legal_operation_flag INTEGER NOT NULL DEFAULT 0,
  government_operation_flag INTEGER NOT NULL DEFAULT 0,
  sensitive_operation_flag INTEGER NOT NULL DEFAULT 0,
  never_auto_flag INTEGER NOT NULL DEFAULT 0,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_safety_policies_uuid_immutable
BEFORE UPDATE OF safety_policy_uuid ON enterprise_safety_policies
FOR EACH ROW
WHEN OLD.safety_policy_uuid <> NEW.safety_policy_uuid
BEGIN
  SELECT RAISE(ABORT, 'safety_policy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_source_hierarchy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_hierarchy_uuid TEXT NOT NULL UNIQUE,
  source_code TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  priority_rank INTEGER NOT NULL,
  authority_level INTEGER NOT NULL DEFAULT 0,
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enterprise_source_hierarchy_priority
  ON enterprise_source_hierarchy(priority_rank, authority_level DESC);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_source_hierarchy_uuid_immutable
BEFORE UPDATE OF source_hierarchy_uuid ON enterprise_source_hierarchy
FOR EACH ROW
WHEN OLD.source_hierarchy_uuid <> NEW.source_hierarchy_uuid
BEGIN
  SELECT RAISE(ABORT, 'source_hierarchy_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_uuid TEXT NOT NULL UNIQUE,
  decision_type TEXT NOT NULL,
  decision_source TEXT,
  decision_reason TEXT,
  decision_confidence REAL,
  confidence_policy_uuid TEXT,
  knowledge_reference_json TEXT NOT NULL DEFAULT '[]',
  workflow_reference TEXT,
  customer_reference TEXT,
  approval_class TEXT,
  action_policy_uuid TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'Draft',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(confidence_policy_uuid) REFERENCES enterprise_confidence_policies(confidence_policy_uuid),
  FOREIGN KEY(action_policy_uuid) REFERENCES enterprise_action_policies(action_policy_uuid)
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_decisions_uuid_immutable
BEFORE UPDATE OF decision_uuid ON enterprise_decisions
FOR EACH ROW
WHEN OLD.decision_uuid <> NEW.decision_uuid
BEGIN
  SELECT RAISE(ABORT, 'decision_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_uuid TEXT NOT NULL UNIQUE,
  observation_type TEXT NOT NULL,
  observation_source TEXT NOT NULL,
  observation_confidence REAL,
  observation_status TEXT NOT NULL DEFAULT 'Draft',
  observation_promoted_to_knowledge INTEGER NOT NULL DEFAULT 0,
  lifecycle_status TEXT NOT NULL DEFAULT 'Draft',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_observations_uuid_immutable
BEFORE UPDATE OF observation_uuid ON enterprise_observations
FOR EACH ROW
WHEN OLD.observation_uuid <> NEW.observation_uuid
BEGIN
  SELECT RAISE(ABORT, 'observation_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_multi_agent_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coordination_uuid TEXT NOT NULL UNIQUE,
  coordination_key TEXT NOT NULL UNIQUE,
  request_owner_type TEXT NOT NULL DEFAULT 'system',
  agent_roles_json TEXT NOT NULL DEFAULT '[]',
  delegation_policy_json TEXT NOT NULL DEFAULT '{}',
  handoff_policy_json TEXT NOT NULL DEFAULT '{}',
  completion_policy_json TEXT NOT NULL DEFAULT '{}',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_multi_agent_profiles_uuid_immutable
BEFORE UPDATE OF coordination_uuid ON enterprise_multi_agent_profiles
FOR EACH ROW
WHEN OLD.coordination_uuid <> NEW.coordination_uuid
BEGIN
  SELECT RAISE(ABORT, 'coordination_uuid is immutable');
END;

CREATE TABLE IF NOT EXISTS enterprise_intelligence_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_uuid TEXT NOT NULL UNIQUE,
  contract_key TEXT NOT NULL UNIQUE,
  contract_name TEXT NOT NULL,
  contract_scope TEXT NOT NULL DEFAULT 'enterprise',
  lifecycle_status TEXT NOT NULL DEFAULT 'Published',
  asset_version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_enterprise_intelligence_contracts_uuid_immutable
BEFORE UPDATE OF contract_uuid ON enterprise_intelligence_contracts
FOR EACH ROW
WHEN OLD.contract_uuid <> NEW.contract_uuid
BEGIN
  SELECT RAISE(ABORT, 'contract_uuid is immutable');
END;
