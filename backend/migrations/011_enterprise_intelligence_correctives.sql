CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_prompt_versions_profile_version_null_template
ON enterprise_prompt_versions(prompt_profile_uuid, version_number)
WHERE prompt_template_uuid IS NULL;

DELETE FROM enterprise_knowledge_relationships
WHERE relationship_type = 'governs'
  AND from_knowledge_article_uuid = to_knowledge_article_uuid
  AND EXISTS (
    SELECT 1
    FROM enterprise_knowledge_articles article
    WHERE article.knowledge_article_uuid = enterprise_knowledge_relationships.from_knowledge_article_uuid
      AND article.article_key = 'enterprise-intelligence-governance-baseline'
  );

CREATE TABLE IF NOT EXISTS enterprise_governed_lifecycle_statuses (
  lifecycle_status TEXT PRIMARY KEY
);

INSERT OR IGNORE INTO enterprise_governed_lifecycle_statuses (lifecycle_status) VALUES
  ('Draft'),
  ('Review'),
  ('Published'),
  ('Deprecated'),
  ('Archived'),
  ('Active'),
  ('Inactive'),
  ('Suspended'),
  ('Resolved'),
  ('Closed'),
  ('Rejected'),
  ('Expired');

CREATE TABLE IF NOT EXISTS enterprise_governed_approval_classes (
  approval_class TEXT PRIMARY KEY
);

INSERT OR IGNORE INTO enterprise_governed_approval_classes (approval_class) VALUES
  ('AUTO'),
  ('AUTO_WITH_NOTIFICATION'),
  ('MANUAL_APPROVAL'),
  ('DUAL_APPROVAL'),
  ('OWNER_ONLY'),
  ('ADMIN_ONLY');

CREATE TABLE IF NOT EXISTS enterprise_governed_confidence_classes (
  confidence_class TEXT PRIMARY KEY
);

INSERT OR IGNORE INTO enterprise_governed_confidence_classes (confidence_class) VALUES
  ('Very High'),
  ('High'),
  ('Medium'),
  ('Low'),
  ('Unknown');

CREATE TABLE IF NOT EXISTS enterprise_governed_action_types (
  action_type TEXT PRIMARY KEY
);

INSERT OR IGNORE INTO enterprise_governed_action_types (action_type) VALUES
  ('Customer Communication'),
  ('Payment Preparation'),
  ('Government Submission Preparation'),
  ('Document Verification Recommendation'),
  ('Human Handoff Request'),
  ('Reply Generation'),
  ('Website Navigation'),
  ('Government Portal Interaction'),
  ('Form Filling'),
  ('Browser Automation'),
  ('Knowledge Retrieval'),
  ('Tool Execution'),
  ('Workflow Execution'),
  ('Human Approval Request');

CREATE TABLE IF NOT EXISTS enterprise_governed_persona_types (
  persona_type TEXT PRIMARY KEY
);

INSERT OR IGNORE INTO enterprise_governed_persona_types (persona_type) VALUES
  ('Reception AI'),
  ('Customer Support AI'),
  ('Document AI'),
  ('Verification AI'),
  ('Operator AI'),
  ('Executive AI'),
  ('Voice AI'),
  ('WhatsApp AI'),
  ('Email AI'),
  ('Analytics AI');

CREATE TABLE IF NOT EXISTS enterprise_governed_safety_classes (
  safety_class_name TEXT PRIMARY KEY
);

INSERT OR IGNORE INTO enterprise_governed_safety_classes (safety_class_name) VALUES
  ('Human Approval'),
  ('Financial'),
  ('Identity'),
  ('Legal'),
  ('Government'),
  ('Sensitive'),
  ('Never Auto'),
  ('External Communication'),
  ('Irreversible Action'),
  ('Bulk Operation'),
  ('Regulated Data'),
  ('Reputation Risk');

CREATE TRIGGER IF NOT EXISTS trg_enterprise_approval_policies_approval_class_insert
BEFORE INSERT ON enterprise_approval_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_approval_classes WHERE approval_class = NEW.approval_class)
BEGIN
  SELECT RAISE(ABORT, 'Invalid approval_class');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_approval_policies_approval_class_update
BEFORE UPDATE OF approval_class ON enterprise_approval_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_approval_classes WHERE approval_class = NEW.approval_class)
BEGIN
  SELECT RAISE(ABORT, 'Invalid approval_class');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_decisions_approval_class_insert
BEFORE INSERT ON enterprise_decisions
FOR EACH ROW
WHEN NEW.approval_class IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM enterprise_governed_approval_classes WHERE approval_class = NEW.approval_class)
BEGIN
  SELECT RAISE(ABORT, 'Invalid approval_class');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_decisions_approval_class_update
BEFORE UPDATE OF approval_class ON enterprise_decisions
FOR EACH ROW
WHEN NEW.approval_class IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM enterprise_governed_approval_classes WHERE approval_class = NEW.approval_class)
BEGIN
  SELECT RAISE(ABORT, 'Invalid approval_class');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_action_policies_required_approval_class_insert
BEFORE INSERT ON enterprise_action_policies
FOR EACH ROW
WHEN NEW.required_approval_class IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM enterprise_governed_approval_classes WHERE approval_class = NEW.required_approval_class)
BEGIN
  SELECT RAISE(ABORT, 'Invalid required_approval_class');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_action_policies_required_approval_class_update
BEFORE UPDATE OF required_approval_class ON enterprise_action_policies
FOR EACH ROW
WHEN NEW.required_approval_class IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM enterprise_governed_approval_classes WHERE approval_class = NEW.required_approval_class)
BEGIN
  SELECT RAISE(ABORT, 'Invalid required_approval_class');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_confidence_policies_confidence_class_insert
BEFORE INSERT ON enterprise_confidence_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_confidence_classes WHERE confidence_class = NEW.confidence_class)
BEGIN
  SELECT RAISE(ABORT, 'Invalid confidence_class');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_confidence_policies_confidence_class_update
BEFORE UPDATE OF confidence_class ON enterprise_confidence_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_confidence_classes WHERE confidence_class = NEW.confidence_class)
BEGIN
  SELECT RAISE(ABORT, 'Invalid confidence_class');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_action_policies_action_type_insert
BEFORE INSERT ON enterprise_action_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_action_types WHERE action_type = NEW.action_type)
BEGIN
  SELECT RAISE(ABORT, 'Invalid action_type');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_action_policies_action_type_update
BEFORE UPDATE OF action_type ON enterprise_action_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_action_types WHERE action_type = NEW.action_type)
BEGIN
  SELECT RAISE(ABORT, 'Invalid action_type');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_personas_persona_type_insert
BEFORE INSERT ON enterprise_personas
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_persona_types WHERE persona_type = NEW.persona_type)
BEGIN
  SELECT RAISE(ABORT, 'Invalid persona_type');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_personas_persona_type_update
BEFORE UPDATE OF persona_type ON enterprise_personas
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_persona_types WHERE persona_type = NEW.persona_type)
BEGIN
  SELECT RAISE(ABORT, 'Invalid persona_type');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_safety_policies_safety_class_insert
BEFORE INSERT ON enterprise_safety_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_safety_classes WHERE safety_class_name = NEW.safety_class_name)
BEGIN
  SELECT RAISE(ABORT, 'Invalid safety_class_name');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_safety_policies_safety_class_update
BEFORE UPDATE OF safety_class_name ON enterprise_safety_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_safety_classes WHERE safety_class_name = NEW.safety_class_name)
BEGIN
  SELECT RAISE(ABORT, 'Invalid safety_class_name');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_domains_lifecycle_insert
BEFORE INSERT ON enterprise_knowledge_domains
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_domains_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_knowledge_domains
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_sources_lifecycle_insert
BEFORE INSERT ON enterprise_knowledge_sources
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_sources_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_knowledge_sources
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_articles_lifecycle_insert
BEFORE INSERT ON enterprise_knowledge_articles
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_articles_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_knowledge_articles
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_tags_lifecycle_insert
BEFORE INSERT ON enterprise_knowledge_tags
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_knowledge_tags_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_knowledge_tags
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

DROP TRIGGER IF EXISTS trg_enterprise_prompt_profiles_lifecycle_insert;
CREATE TRIGGER IF NOT EXISTS trg_enterprise_prompt_profiles_lifecycle_insert
BEFORE INSERT ON enterprise_prompt_profiles
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.prompt_lifecycle)
BEGIN
  SELECT RAISE(ABORT, 'Invalid prompt_lifecycle');
END;

DROP TRIGGER IF EXISTS trg_enterprise_prompt_profiles_lifecycle_update;
CREATE TRIGGER IF NOT EXISTS trg_enterprise_prompt_profiles_lifecycle_update
BEFORE UPDATE OF prompt_lifecycle ON enterprise_prompt_profiles
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.prompt_lifecycle)
BEGIN
  SELECT RAISE(ABORT, 'Invalid prompt_lifecycle');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_prompt_templates_lifecycle_insert
BEFORE INSERT ON enterprise_prompt_templates
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_prompt_templates_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_prompt_templates
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_personas_lifecycle_insert
BEFORE INSERT ON enterprise_personas
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_personas_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_personas
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_persona_versions_lifecycle_insert
BEFORE INSERT ON enterprise_persona_versions
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_persona_versions_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_persona_versions
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_memory_classes_lifecycle_insert
BEFORE INSERT ON enterprise_memory_classes
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_memory_classes_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_memory_classes
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_capabilities_lifecycle_insert
BEFORE INSERT ON enterprise_capabilities
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_capabilities_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_capabilities
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tools_lifecycle_insert
BEFORE INSERT ON enterprise_tools
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_tools_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_tools
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_approval_policies_lifecycle_insert
BEFORE INSERT ON enterprise_approval_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_approval_policies_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_approval_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_context_profiles_lifecycle_insert
BEFORE INSERT ON enterprise_context_profiles
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_context_profiles_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_context_profiles
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_confidence_policies_lifecycle_insert
BEFORE INSERT ON enterprise_confidence_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_confidence_policies_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_confidence_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_action_policies_lifecycle_insert
BEFORE INSERT ON enterprise_action_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_action_policies_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_action_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_safety_policies_lifecycle_insert
BEFORE INSERT ON enterprise_safety_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_safety_policies_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_safety_policies
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_source_hierarchy_lifecycle_insert
BEFORE INSERT ON enterprise_source_hierarchy
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_source_hierarchy_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_source_hierarchy
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_multi_agent_profiles_lifecycle_insert
BEFORE INSERT ON enterprise_multi_agent_profiles
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_multi_agent_profiles_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_multi_agent_profiles
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_intelligence_contracts_lifecycle_insert
BEFORE INSERT ON enterprise_intelligence_contracts
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_intelligence_contracts_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_intelligence_contracts
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_decisions_lifecycle_insert
BEFORE INSERT ON enterprise_decisions
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_decisions_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_decisions
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_observations_lifecycle_insert
BEFORE INSERT ON enterprise_observations
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;

CREATE TRIGGER IF NOT EXISTS trg_enterprise_observations_lifecycle_update
BEFORE UPDATE OF lifecycle_status ON enterprise_observations
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM enterprise_governed_lifecycle_statuses WHERE lifecycle_status = NEW.lifecycle_status)
BEGIN
  SELECT RAISE(ABORT, 'Invalid lifecycle_status');
END;
