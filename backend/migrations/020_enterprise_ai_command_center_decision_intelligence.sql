-- Phase 4 - Milestone 4.4 Enterprise AI Command Center, Communication Hub & Decision Intelligence Foundation
-- DDL Migration Schema

-- 1. AI Command Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_uuid TEXT NOT NULL UNIQUE,
    command_key TEXT NOT NULL UNIQUE,
    command_name TEXT NOT NULL,
    command_category TEXT NOT NULL CHECK (command_category IN ('Query', 'Action', 'Override', 'System')),
    owning_domain_key TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. AI Agent Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_uuid TEXT NOT NULL UNIQUE,
    agent_key TEXT NOT NULL UNIQUE,
    agent_name TEXT NOT NULL,
    role_key TEXT NOT NULL,
    persona_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Inactive' CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Retired')),
    agent_category TEXT NOT NULL DEFAULT 'Assistant' CHECK (agent_category IN ('Assistant', 'Orchestrator', 'Specialist', 'Supervisor')),
    agent_version TEXT NOT NULL DEFAULT '1.0.0',
    owner_key TEXT NOT NULL DEFAULT 'system_admin',
    responsibilities_json TEXT NOT NULL DEFAULT '[]',
    agent_lifecycle_state TEXT NOT NULL DEFAULT 'Draft' CHECK (agent_lifecycle_state IN ('Draft', 'Active', 'Deprecated', 'Retired')),
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 3. AI Capability Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    capability_uuid TEXT NOT NULL UNIQUE,
    capability_key TEXT NOT NULL UNIQUE,
    capability_name TEXT NOT NULL,
    capability_category TEXT NOT NULL CHECK (capability_category IN ('Text', 'Data', 'System_Action', 'Custom')),
    capability_version TEXT NOT NULL DEFAULT '1.0.0',
    owner_key TEXT NOT NULL DEFAULT 'system_admin',
    lifecycle_state TEXT NOT NULL DEFAULT 'Active' CHECK (lifecycle_state IN ('Draft', 'Active', 'Deprecated', 'Retired')),
    dependencies_json TEXT NOT NULL DEFAULT '[]',
    required_permissions_json TEXT NOT NULL DEFAULT '[]',
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 4. AI Model Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_uuid TEXT NOT NULL UNIQUE,
    model_key TEXT NOT NULL UNIQUE,
    model_name TEXT NOT NULL,
    provider_name TEXT NOT NULL CHECK (provider_name IN ('OpenAI', 'Anthropic', 'Gemini', 'Local', 'Mock')),
    endpoint_url TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 5. AI Prompt Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_uuid TEXT NOT NULL UNIQUE,
    prompt_key TEXT NOT NULL,
    version_tag TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(prompt_key, version_tag)
);

-- 6. AI Conversation Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_uuid TEXT NOT NULL UNIQUE,
    session_uuid TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('User', 'Agent', 'System')),
    sender_key TEXT NOT NULL,
    message_content TEXT NOT NULL,
    conversation_category TEXT NOT NULL DEFAULT 'Support' CHECK (conversation_category IN ('Support', 'Operation', 'System', 'Audit')),
    conversation_priority INTEGER NOT NULL DEFAULT 100,
    conversation_lifecycle_state TEXT NOT NULL DEFAULT 'Active' CHECK (conversation_lifecycle_state IN ('Active', 'Archived', 'Purged')),
    archive_reference TEXT,
    conversation_status TEXT NOT NULL DEFAULT 'Open' CHECK (conversation_status IN ('Open', 'Escalated', 'Closed')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 7. AI Session Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_uuid TEXT NOT NULL UNIQUE,
    session_key TEXT NOT NULL UNIQUE,
    user_key TEXT NOT NULL,
    session_status TEXT NOT NULL DEFAULT 'Active' CHECK (session_status IN ('Active', 'Closed', 'Expired')),
    tenant_scope TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 8. AI Context Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context_uuid TEXT NOT NULL UNIQUE,
    session_uuid TEXT NOT NULL,
    context_window_json TEXT NOT NULL DEFAULT '{}',
    max_tokens INTEGER NOT NULL DEFAULT 2048,
    temperature REAL NOT NULL DEFAULT 0.0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 9. AI Memory Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_uuid TEXT NOT NULL UNIQUE,
    user_key TEXT NOT NULL,
    memory_statement TEXT NOT NULL,
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 10. AI Knowledge Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_uuid TEXT NOT NULL UNIQUE,
    knowledge_key TEXT NOT NULL UNIQUE,
    source_url TEXT NOT NULL,
    vector_store_id TEXT NOT NULL,
    hash_checksum TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

-- 11. AI Decision Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_uuid TEXT NOT NULL UNIQUE,
    session_uuid TEXT NOT NULL,
    decision_point TEXT NOT NULL,
    outcome TEXT NOT NULL,
    confidence_class TEXT NOT NULL CHECK (confidence_class IN ('High', 'Medium', 'Low')),
    decision_version INTEGER NOT NULL DEFAULT 1,
    decision_policy_key TEXT NOT NULL DEFAULT 'default_policy',
    decision_category TEXT NOT NULL CHECK (decision_category IN ('Orchestration', 'Tool_Execution', 'Delegation', 'User_Notification')),
    decision_lifecycle_state TEXT NOT NULL DEFAULT 'Active' CHECK (decision_lifecycle_state IN ('Active', 'Superseded', 'Revoked')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 12. AI Recommendation Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_uuid TEXT NOT NULL UNIQUE,
    task_instance_uuid TEXT,
    recommendation_text TEXT NOT NULL,
    predicted_impact TEXT NOT NULL,
    recommendation_category TEXT NOT NULL DEFAULT 'General',
    confidence_score REAL NOT NULL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    acceptance_status TEXT NOT NULL DEFAULT 'Pending' CHECK (acceptance_status IN ('Pending', 'Accepted', 'Rejected', 'Expired')),
    feedback_link_uuid TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 13. AI Reasoning Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_reasoning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reasoning_uuid TEXT NOT NULL UNIQUE,
    decision_uuid TEXT UNIQUE NOT NULL,
    chain_of_thought TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 14. AI Confidence Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_confidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    confidence_uuid TEXT NOT NULL UNIQUE,
    domain_key TEXT UNIQUE NOT NULL,
    low_threshold REAL NOT NULL DEFAULT 0.5,
    high_threshold REAL NOT NULL DEFAULT 0.85,
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('High', 'Medium', 'Low')),
    confidence_band_range TEXT NOT NULL CHECK (confidence_band_range IN ('0.0-0.5', '0.5-0.85', '0.85-1.0')),
    routing_policy_key TEXT NOT NULL DEFAULT 'default_routing',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 15. AI Approval Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    approval_uuid TEXT NOT NULL UNIQUE,
    decision_uuid TEXT NOT NULL,
    approver_key TEXT NOT NULL,
    approval_status TEXT NOT NULL CHECK (approval_status IN ('Approved', 'Rejected', 'Pending')),
    comments TEXT NOT NULL DEFAULT '',
    decided_at TEXT
);

-- 16. AI Feedback Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_uuid TEXT NOT NULL UNIQUE,
    decision_uuid TEXT NOT NULL,
    user_key TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 17. AI Learning Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_learning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    learning_uuid TEXT NOT NULL UNIQUE,
    feedback_uuid TEXT NOT NULL,
    training_status TEXT NOT NULL DEFAULT 'Candidate' CHECK (training_status IN ('Candidate', 'Prepared', 'Exported')),
    learning_source TEXT NOT NULL DEFAULT 'Feedback',
    learning_history_json TEXT NOT NULL DEFAULT '[]',
    validation_result TEXT NOT NULL DEFAULT 'Pending' CHECK (validation_result IN ('Pending', 'Passed', 'Failed')),
    approved_by TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 18. AI Evaluation Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_uuid TEXT NOT NULL UNIQUE,
    prompt_uuid TEXT NOT NULL,
    test_case_key TEXT NOT NULL,
    pass_flag INTEGER NOT NULL CHECK (pass_flag IN (0,1)),
    similarity_score REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 19. AI Policy Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_uuid TEXT NOT NULL UNIQUE,
    policy_key TEXT UNIQUE NOT NULL,
    policy_pack_key TEXT NOT NULL,
    policy_priority INTEGER NOT NULL DEFAULT 100,
    max_token_budget INTEGER NOT NULL DEFAULT 4096,
    tenant_scope TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

-- 20. AI Guardrail Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_guardrails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guardrail_uuid TEXT NOT NULL UNIQUE,
    pattern_key TEXT UNIQUE NOT NULL,
    regex_pattern TEXT NOT NULL,
    block_direction TEXT NOT NULL CHECK (block_direction IN ('Input', 'Output', 'Bidirectional')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

-- 21. AI Safety Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_safety (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    safety_uuid TEXT NOT NULL UNIQUE,
    category TEXT UNIQUE NOT NULL CHECK (category IN ('Toxicity', 'Harassment', 'Sexual', 'Dangerous')),
    max_threshold REAL NOT NULL DEFAULT 0.2 CHECK (max_threshold >= 0.0 AND max_threshold <= 1.0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 22. AI Communication Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comm_uuid TEXT NOT NULL UNIQUE,
    comm_key TEXT UNIQUE NOT NULL,
    template_content TEXT NOT NULL,
    required_placeholders_json TEXT NOT NULL DEFAULT '[]',
    message_direction TEXT NOT NULL CHECK (message_direction IN ('Internal', 'External')),
    channel_policy_key TEXT NOT NULL DEFAULT 'default_policy',
    delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('Immediate', 'Buffered', 'Digest')),
    max_retry_count INTEGER NOT NULL DEFAULT 3,
    retry_policy TEXT NOT NULL DEFAULT 'Exponential_Backoff',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 23. AI Notification Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_uuid TEXT NOT NULL UNIQUE,
    alert_key TEXT UNIQUE NOT NULL,
    alert_level TEXT NOT NULL DEFAULT 'Info' CHECK (alert_level IN ('Critical', 'Warning', 'Info')),
    alert_template TEXT NOT NULL
);

-- 24. AI Channel Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_uuid TEXT NOT NULL UNIQUE,
    channel_key TEXT UNIQUE NOT NULL CHECK (channel_key IN ('WhatsApp', 'Email', 'SMS', 'Voice', 'LiveChat', 'Internal')),
    channel_type TEXT NOT NULL UNIQUE CHECK (channel_type IN ('WhatsApp', 'Email', 'SMS', 'Voice', 'LiveChat', 'Internal')),
    is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0,1))
);

-- 25. AI Conversation Routing Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_conversation_routing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_uuid TEXT NOT NULL UNIQUE,
    intent_key TEXT NOT NULL,
    target_agent_key TEXT NOT NULL,
    routing_priority INTEGER NOT NULL DEFAULT 100
);

-- 26. AI Intent Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_intents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intent_uuid TEXT NOT NULL UNIQUE,
    intent_key TEXT UNIQUE NOT NULL,
    confidence_threshold REAL NOT NULL DEFAULT 0.75,
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 27. AI Action Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_uuid TEXT NOT NULL UNIQUE,
    action_key TEXT UNIQUE NOT NULL,
    requires_human_approval INTEGER NOT NULL DEFAULT 1 CHECK (requires_human_approval IN (0,1)),
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

-- 28. AI Tool Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_uuid TEXT NOT NULL UNIQUE,
    tool_key TEXT UNIQUE NOT NULL,
    function_name TEXT NOT NULL,
    parameter_schema_json TEXT NOT NULL DEFAULT '{}'
);

-- 29. AI Tool Permission Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_tool_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_uuid TEXT NOT NULL UNIQUE,
    agent_key TEXT NOT NULL,
    tool_key TEXT NOT NULL,
    granted_by_key TEXT NOT NULL,
    required_capability_key TEXT,
    permission_inheritance_path TEXT NOT NULL DEFAULT '',
    is_inherited INTEGER NOT NULL DEFAULT 0 CHECK (is_inherited IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(agent_key, tool_key)
);

-- 30. AI Tool Invocation Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_tool_invocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invocation_uuid TEXT NOT NULL UNIQUE,
    agent_key TEXT NOT NULL,
    tool_key TEXT NOT NULL,
    parameter_values_json TEXT NOT NULL,
    output_values_json TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 31. AI Output Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    output_uuid TEXT NOT NULL UNIQUE,
    prompt_uuid TEXT NOT NULL,
    raw_response TEXT NOT NULL,
    safety_verdict TEXT NOT NULL DEFAULT 'Passed' CHECK (safety_verdict IN ('Passed', 'Failed', 'Overridden')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 32. AI Explanation Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_explanations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    explanation_uuid TEXT NOT NULL UNIQUE,
    decision_uuid TEXT UNIQUE NOT NULL,
    explanation_text TEXT NOT NULL,
    explainability_score REAL NOT NULL DEFAULT 1.0 CHECK (explainability_score >= 0.0 AND explainability_score <= 1.0),
    decision_trace TEXT NOT NULL DEFAULT '{}',
    evidence_reference TEXT NOT NULL DEFAULT '',
    reasoning_summary TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 33. AI Audit Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_uuid TEXT NOT NULL UNIQUE,
    action TEXT NOT NULL,
    actor_key TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 34. AI Metrics Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_uuid TEXT NOT NULL UNIQUE,
    model_key TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    tokens_input INTEGER NOT NULL,
    tokens_output INTEGER NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 35. AI Observability Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_observability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    observability_uuid TEXT NOT NULL UNIQUE,
    alert_level TEXT NOT NULL CHECK (alert_level IN ('Critical', 'Warning', 'Info')),
    message TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 36. AI Version Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_uuid TEXT NOT NULL UNIQUE,
    target_version INTEGER NOT NULL UNIQUE,
    change_reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 37. AI Lifecycle Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_lifecycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lifecycle_uuid TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('Agent', 'Prompt', 'Model', 'Policy')),
    entity_key TEXT NOT NULL,
    lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('Draft', 'Active', 'Deprecated', 'Retired')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 38. Model Routing Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_model_routing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routing_uuid TEXT NOT NULL UNIQUE,
    model_key TEXT NOT NULL,
    fallback_model_key TEXT NOT NULL,
    provider_priority INTEGER NOT NULL DEFAULT 1,
    routing_strategy TEXT NOT NULL CHECK (routing_strategy IN ('Cost', 'Latency', 'Region', 'Capability', 'Consensus')),
    aggregation_policy TEXT NOT NULL DEFAULT 'Single' CHECK (aggregation_policy IN ('Single', 'MajorityVote', 'ConsensusMatch', 'ProviderFailover')),
    provider_latency INTEGER NOT NULL DEFAULT 0,
    provider_cost REAL NOT NULL DEFAULT 0.0,
    health_status TEXT NOT NULL DEFAULT 'Healthy' CHECK (health_status IN ('Healthy', 'Degraded', 'Unavailable')),
    availability_status TEXT NOT NULL DEFAULT 'Online' CHECK (availability_status IN ('Online', 'Offline', 'Maintenance')),
    compatibility_profile TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 39. Token Budget Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_token_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_uuid TEXT NOT NULL UNIQUE,
    cost_uuid TEXT NOT NULL,
    tenant_scope TEXT NOT NULL,
    branch_scope TEXT NOT NULL,
    department_key TEXT NOT NULL,
    employee_key TEXT NOT NULL,
    daily_budget REAL NOT NULL CHECK (daily_budget >= 0.0),
    monthly_budget REAL NOT NULL CHECK (monthly_budget >= 0.0),
    remaining_budget REAL NOT NULL CHECK (remaining_budget >= 0.0),
    cost_per_token REAL NOT NULL DEFAULT 0.0 CHECK (cost_per_token >= 0.0),
    provider_cost REAL NOT NULL DEFAULT 0.0 CHECK (provider_cost >= 0.0),
    forecast_cost REAL NOT NULL DEFAULT 0.0,
    optimization_policy TEXT NOT NULL DEFAULT 'None',
    budget_status TEXT NOT NULL DEFAULT 'Active' CHECK (budget_status IN ('Active', 'Exhausted', 'Suspended')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 40. Prompt Experiment Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_prompt_experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_uuid TEXT NOT NULL UNIQUE,
    prompt_key TEXT NOT NULL,
    variant_key TEXT NOT NULL,
    winner_variant TEXT,
    experiment_status TEXT NOT NULL DEFAULT 'Running' CHECK (experiment_status IN ('Running', 'Concluded', 'Cancelled')),
    success_rate REAL NOT NULL DEFAULT 0.0 CHECK (success_rate >= 0.0 AND success_rate <= 1.0),
    failure_rate REAL NOT NULL DEFAULT 0.0 CHECK (failure_rate >= 0.0 AND failure_rate <= 1.0),
    average_latency INTEGER NOT NULL DEFAULT 0,
    average_cost REAL NOT NULL DEFAULT 0.0,
    quality_score REAL NOT NULL DEFAULT 0.0,
    retirement_policy TEXT NOT NULL DEFAULT 'Manual',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(prompt_key, variant_key)
);

-- 41. Knowledge Version Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_knowledge_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_version_uuid TEXT NOT NULL UNIQUE,
    knowledge_key TEXT NOT NULL,
    knowledge_version INTEGER NOT NULL DEFAULT 1,
    approval_status TEXT NOT NULL CHECK (approval_status IN ('Approved', 'Pending', 'Rejected')),
    published_by TEXT NOT NULL,
    diff_checksum TEXT NOT NULL,
    restore_reference TEXT,
    knowledge_state TEXT NOT NULL CHECK (knowledge_state IN ('Draft', 'Active', 'Deprecated', 'Restored')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(knowledge_key, knowledge_version)
);

-- 42. Human Override Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_human_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    override_uuid TEXT NOT NULL UNIQUE,
    decision_uuid TEXT NOT NULL,
    override_reason TEXT NOT NULL,
    approver TEXT NOT NULL,
    override_level TEXT NOT NULL CHECK (override_level IN ('L1', 'L2', 'Executive')),
    escalation_policy TEXT NOT NULL DEFAULT 'None',
    audit_reference TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 43. Hallucination Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_hallucinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hallucination_uuid TEXT NOT NULL UNIQUE,
    output_uuid TEXT NOT NULL,
    fact_match_score REAL NOT NULL CHECK (fact_match_score >= 0.0 AND fact_match_score <= 1.0),
    knowledge_match_score REAL NOT NULL CHECK (knowledge_match_score >= 0.0 AND knowledge_match_score <= 1.0),
    verification_status TEXT NOT NULL CHECK (verification_status IN ('Passed', 'Failed', 'Overridden')),
    override_required INTEGER NOT NULL DEFAULT 0 CHECK (override_required IN (0,1)),
    risk_score REAL NOT NULL DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 44. Feedback Analytics Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_feedback_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analytics_uuid TEXT NOT NULL UNIQUE,
    agent_key TEXT NOT NULL,
    prompt_key TEXT NOT NULL,
    ranking_score REAL NOT NULL CHECK (ranking_score >= 0.0 AND ranking_score <= 10.0),
    agent_score REAL NOT NULL CHECK (agent_score >= 0.0),
    prompt_score REAL NOT NULL CHECK (prompt_score >= 0.0),
    trend_score REAL NOT NULL,
    quality_trend TEXT NOT NULL CHECK (quality_trend IN ('Upward', 'Stable', 'Downward')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 45. Provider Health Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_provider_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_health_uuid TEXT NOT NULL UNIQUE,
    provider_name TEXT NOT NULL,
    availability REAL NOT NULL CHECK (availability >= 0.0 AND availability <= 1.0),
    latency INTEGER NOT NULL DEFAULT 0,
    incident_status TEXT NOT NULL CHECK (incident_status IN ('None', 'Degraded', 'Outage')),
    maintenance_window TEXT,
    provider_status TEXT NOT NULL CHECK (provider_status IN ('Active', 'Suspended', 'Failover_Active')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 46. Conversation Analytics Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_conversation_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_analytics_uuid TEXT NOT NULL UNIQUE,
    session_uuid TEXT NOT NULL UNIQUE,
    average_duration INTEGER NOT NULL DEFAULT 0,
    handoff_rate REAL NOT NULL DEFAULT 0.0,
    resolution_rate REAL NOT NULL DEFAULT 0.0,
    escalation_rate REAL NOT NULL DEFAULT 0.0,
    drop_rate REAL NOT NULL DEFAULT 0.0,
    conversation_score REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 47. Memory Lifecycle Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_memory_lifecycle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_lifecycle_uuid TEXT NOT NULL UNIQUE,
    memory_uuid TEXT NOT NULL,
    owner_key TEXT NOT NULL,
    retention_days INTEGER NOT NULL DEFAULT 365,
    expires_at TEXT NOT NULL,
    archived_at TEXT,
    restore_reference TEXT,
    sync_status TEXT NOT NULL CHECK (sync_status IN ('Synced', 'Pending_Sync', 'Conflict')),
    consistency_checksum TEXT NOT NULL,
    validation_status TEXT NOT NULL CHECK (validation_status IN ('Valid', 'Expired', 'Flagged_For_Review')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 48. Knowledge Sync Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_knowledge_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_uuid TEXT NOT NULL UNIQUE,
    knowledge_uuid TEXT NOT NULL,
    sync_source TEXT NOT NULL,
    replication_state TEXT NOT NULL CHECK (replication_state IN ('Complete', 'Failed', 'In_Progress')),
    conflict_detected INTEGER NOT NULL DEFAULT 0 CHECK (conflict_detected IN (0,1)),
    reconciliation_notes TEXT,
    integrity_checksum TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 49. AI Skill Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_uuid TEXT NOT NULL UNIQUE,
    skill_key TEXT NOT NULL,
    skill_category TEXT NOT NULL CHECK (skill_category IN ('Reasoning', 'Integration', 'Communication', 'Extraction')),
    skill_version TEXT NOT NULL,
    skill_status TEXT NOT NULL CHECK (skill_status IN ('Active', 'Deprecated', 'Retired')),
    owner_key TEXT NOT NULL,
    dependencies_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(skill_key, skill_version)
);

-- 50. AI Role Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_uuid TEXT NOT NULL UNIQUE,
    role_key TEXT UNIQUE NOT NULL,
    parent_role_key TEXT,
    capabilities_json TEXT NOT NULL DEFAULT '[]',
    permissions_json TEXT NOT NULL DEFAULT '[]',
    inheritance_status TEXT NOT NULL CHECK (inheritance_status IN ('Enabled', 'Disabled')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 51. AI Department Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_uuid TEXT NOT NULL UNIQUE,
    department_key TEXT UNIQUE NOT NULL,
    department_name TEXT NOT NULL,
    owner_key TEXT NOT NULL,
    policy_rules_json TEXT NOT NULL DEFAULT '{}',
    parent_department_key TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 52. AI Team Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_uuid TEXT NOT NULL UNIQUE,
    team_key TEXT UNIQUE NOT NULL,
    team_name TEXT NOT NULL,
    members_json TEXT NOT NULL DEFAULT '[]',
    responsibility_scope TEXT NOT NULL,
    collaboration_rules_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 53. AI Collaboration Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_collaboration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collaboration_uuid TEXT NOT NULL UNIQUE,
    session_key TEXT NOT NULL,
    participating_agents_json TEXT NOT NULL DEFAULT '[]',
    shared_context_json TEXT NOT NULL DEFAULT '{}',
    coordination_strategy TEXT NOT NULL CHECK (coordination_strategy IN ('Sequential', 'Consensus', 'Voting')),
    conflict_resolution_notes TEXT,
    collaboration_group_key TEXT NOT NULL DEFAULT 'default-group',
    peer_routing_rules_json TEXT NOT NULL DEFAULT '{}',
    collaboration_priority INTEGER NOT NULL DEFAULT 100,
    collaboration_policy_key TEXT NOT NULL DEFAULT 'default-policy',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 54. AI Task Delegation Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_delegations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delegation_uuid TEXT NOT NULL UNIQUE,
    task_instance_uuid TEXT NOT NULL,
    source_agent_key TEXT NOT NULL,
    target_agent_key TEXT NOT NULL,
    delegation_policy_key TEXT NOT NULL,
    delegation_level INTEGER NOT NULL DEFAULT 1,
    validation_verdict TEXT NOT NULL CHECK (validation_verdict IN ('Approved', 'Rejected')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 55. AI Supervisor Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_supervisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supervisor_uuid TEXT NOT NULL UNIQUE,
    supervisor_agent_key TEXT NOT NULL,
    supervised_agent_key TEXT NOT NULL,
    review_policy_key TEXT NOT NULL,
    escalation_authority_level TEXT NOT NULL CHECK (escalation_authority_level IN ('L1', 'L2', 'Critical')),
    monitoring_scope_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(supervisor_agent_key, supervised_agent_key)
);

-- 56. AI Escalation Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    escalation_uuid TEXT NOT NULL UNIQUE,
    matrix_key TEXT NOT NULL,
    escalation_level INTEGER NOT NULL,
    escalation_path_json TEXT NOT NULL,
    approver_roles_json TEXT NOT NULL,
    owner_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(matrix_key, escalation_level)
);

-- 57. AI Compliance Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_compliance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compliance_uuid TEXT NOT NULL UNIQUE,
    rule_key TEXT UNIQUE NOT NULL,
    policy_scope TEXT NOT NULL,
    validation_expression TEXT NOT NULL,
    lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('Draft', 'Active', 'Suspended', 'Retired')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 58. AI Regulatory Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_regulatory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    regulatory_uuid TEXT NOT NULL UNIQUE,
    standard_key TEXT NOT NULL,
    clause_number TEXT NOT NULL,
    jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('GDPR', 'HIPAA', 'CCPA', 'SOC2', 'Global')),
    regulatory_state TEXT NOT NULL CHECK (regulatory_state IN ('Enforced', 'Proposed', 'Superseded')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(standard_key, clause_number)
);

-- 59. AI Consent Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_consent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consent_uuid TEXT NOT NULL UNIQUE,
    customer_key TEXT NOT NULL,
    consent_scope TEXT NOT NULL,
    is_valid INTEGER NOT NULL DEFAULT 1 CHECK (is_valid IN (0,1)),
    history_notes TEXT,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 60. AI Data Residency Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_data_residency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    residency_uuid TEXT NOT NULL UNIQUE,
    region_code TEXT NOT NULL CHECK (region_code IN ('US-East', 'EU-West', 'IN-South', 'APAC-East')),
    residency_policy TEXT NOT NULL,
    validation_result TEXT NOT NULL CHECK (validation_result IN ('Passed', 'Failed')),
    owner_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 61. AI Explainability Compliance Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_explainability_compliance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compliance_cert_uuid TEXT NOT NULL UNIQUE,
    decision_uuid TEXT UNIQUE NOT NULL,
    regulatory_standard TEXT NOT NULL,
    evidence_reference_url TEXT NOT NULL,
    certified_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 62. AI Risk Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_risk_classification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_uuid TEXT NOT NULL UNIQUE,
    action_key TEXT UNIQUE NOT NULL,
    risk_class TEXT NOT NULL CHECK (risk_class IN ('Negligible', 'Low', 'Medium', 'High', 'Critical')),
    severity_level INTEGER NOT NULL CHECK (severity_level >= 1 AND severity_level <= 5),
    owner_key TEXT NOT NULL,
    lifecycle_gate TEXT NOT NULL CHECK (lifecycle_gate IN ('Assessment', 'Approved', 'Blocked')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 63. AI Incident Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_uuid TEXT NOT NULL UNIQUE,
    observability_uuid TEXT NOT NULL,
    owner_key TEXT NOT NULL,
    lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('Reported', 'Under_Investigation', 'Resolved')),
    resolution_policy_key TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 64. AI Recovery Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_recovery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recovery_uuid TEXT NOT NULL UNIQUE,
    checkpoint_name TEXT NOT NULL,
    validation_hash TEXT NOT NULL,
    lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('Available', 'Restoring', 'Completed')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 65. AI Rollback Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_rollbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rollback_uuid TEXT NOT NULL UNIQUE,
    target_version INTEGER NOT NULL,
    rollback_policy TEXT NOT NULL,
    owner_key TEXT NOT NULL,
    validation_verdict TEXT NOT NULL CHECK (validation_verdict IN ('Pending', 'Valid', 'Invalid')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 66. AI Certification Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certification_uuid TEXT NOT NULL UNIQUE,
    target_uuid TEXT NOT NULL,
    lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('Valid', 'Expired', 'Revoked')),
    approved_by TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 67. AI Analytics KPIs Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_analytics_kpis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kpi_uuid TEXT NOT NULL UNIQUE,
    kpi_key TEXT UNIQUE NOT NULL,
    utilization_rate REAL NOT NULL CHECK (utilization_rate >= 0.0),
    performance_rating REAL NOT NULL CHECK (performance_rating >= 0.0),
    efficiency_score REAL NOT NULL CHECK (efficiency_score >= 0.0),
    quality_score REAL NOT NULL CHECK (quality_score >= 0.0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 68. AI Command Center Config
CREATE TABLE IF NOT EXISTS enterprise_ai_command_center_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_uuid TEXT NOT NULL UNIQUE,
    card_key TEXT UNIQUE NOT NULL,
    widget_type TEXT NOT NULL CHECK (widget_type IN ('Card', 'Chart', 'Table', 'Notification')),
    dashboard_layout_json TEXT NOT NULL,
    view_permissions_json TEXT NOT NULL DEFAULT '[]',
    user_preferences_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 69. Policy Version Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_policy_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_version_uuid TEXT NOT NULL UNIQUE,
    policy_key TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    policy_lifecycle_state TEXT NOT NULL CHECK (policy_lifecycle_state IN ('Draft', 'Active', 'Deprecated', 'Retired')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 70. Policy Evaluation Log (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_policy_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_uuid TEXT NOT NULL UNIQUE,
    policy_uuid TEXT NOT NULL,
    verdict TEXT NOT NULL CHECK (verdict IN ('Passed', 'Failed')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 71. Rule Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_uuid TEXT NOT NULL UNIQUE,
    rule_key TEXT UNIQUE NOT NULL,
    rule_category TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 72. Rule Version Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_rule_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_version_uuid TEXT NOT NULL UNIQUE,
    rule_key TEXT NOT NULL,
    rule_version TEXT NOT NULL,
    rule_condition TEXT NOT NULL,
    rule_expression TEXT NOT NULL,
    rule_priority INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 73. Rule Dependency Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_rule_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_dep_uuid TEXT NOT NULL UNIQUE,
    rule_key TEXT NOT NULL,
    depends_on_rule_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 74. Decision Escalation Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_decision_escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    escalation_uuid TEXT NOT NULL UNIQUE,
    decision_uuid TEXT NOT NULL,
    escalation_threshold REAL NOT NULL DEFAULT 0.5,
    escalation_level INTEGER NOT NULL DEFAULT 1,
    escalation_policy TEXT NOT NULL,
    owner_key TEXT NOT NULL,
    resolution_status TEXT NOT NULL CHECK (resolution_status IN ('Pending', 'Resolved', 'Dismissed')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 75. Quality Metrics Registry (Append-only)
CREATE TABLE IF NOT EXISTS enterprise_ai_quality_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_uuid TEXT NOT NULL UNIQUE,
    target_uuid TEXT NOT NULL,
    accuracy REAL NOT NULL CHECK (accuracy >= 0.0 AND accuracy <= 1.0),
    precision REAL NOT NULL CHECK (precision >= 0.0 AND precision <= 1.0),
    recall REAL NOT NULL CHECK (recall >= 0.0 AND recall <= 1.0),
    hallucination_rate REAL NOT NULL CHECK (hallucination_rate >= 0.0 AND hallucination_rate <= 1.0),
    tool_success_rate REAL NOT NULL CHECK (tool_success_rate >= 0.0 AND tool_success_rate <= 1.0),
    task_success_rate REAL NOT NULL CHECK (task_success_rate >= 0.0 AND task_success_rate <= 1.0),
    completion_rate REAL NOT NULL CHECK (completion_rate >= 0.0 AND completion_rate <= 1.0),
    latency INTEGER NOT NULL DEFAULT 0,
    cost_efficiency REAL NOT NULL DEFAULT 0.0,
    quality_score REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 76. Benchmark Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    benchmark_uuid TEXT NOT NULL UNIQUE,
    benchmark_key TEXT NOT NULL,
    benchmark_version TEXT NOT NULL,
    benchmark_category TEXT NOT NULL CHECK (benchmark_category IN ('Accuracy', 'Safety', 'Performance', 'Latency')),
    baseline_score REAL NOT NULL,
    comparison_result_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(benchmark_key, benchmark_version)
);

-- 77. Feature Flag Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_uuid TEXT NOT NULL UNIQUE,
    feature_key TEXT UNIQUE NOT NULL,
    feature_category TEXT NOT NULL CHECK (feature_category IN ('Core', 'Preview', 'Beta', 'Experimental')),
    feature_lifecycle_state TEXT NOT NULL CHECK (feature_lifecycle_state IN ('Draft', 'Beta', 'Stable', 'Deprecated', 'Retired')),
    is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 78. Marketplace Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_marketplace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marketplace_uuid TEXT NOT NULL UNIQUE,
    marketplace_key TEXT UNIQUE NOT NULL,
    catalog_type TEXT NOT NULL CHECK (catalog_type IN ('Plugin', 'Connector', 'Skill', 'Agent', 'Template')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 79. Plugin Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_uuid TEXT NOT NULL UNIQUE,
    plugin_key TEXT UNIQUE NOT NULL,
    plugin_version TEXT NOT NULL,
    approval_status TEXT NOT NULL CHECK (approval_status IN ('Approved', 'Pending', 'Rejected')),
    certified_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 80. Connector Registry
CREATE TABLE IF NOT EXISTS enterprise_ai_connectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connector_uuid TEXT NOT NULL UNIQUE,
    connector_key TEXT UNIQUE NOT NULL,
    connector_version TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);


-- Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON enterprise_ai_conversations(session_uuid);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_session ON enterprise_ai_decisions(session_uuid);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_task ON enterprise_ai_recommendations(task_instance_uuid);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_decision ON enterprise_ai_reasoning(decision_uuid);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_decision ON enterprise_ai_approvals(decision_uuid);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_decision ON enterprise_ai_feedback(decision_uuid);
CREATE INDEX IF NOT EXISTS idx_ai_learning_feedback ON enterprise_ai_learning(feedback_uuid);
CREATE INDEX IF NOT EXISTS idx_ai_tool_permissions_agent ON enterprise_ai_tool_permissions(agent_key);
CREATE INDEX IF NOT EXISTS idx_ai_tool_invocations_agent ON enterprise_ai_tool_invocations(agent_key);
CREATE INDEX IF NOT EXISTS idx_ai_explanations_decision ON enterprise_ai_explanations(decision_uuid);


-- Immutability Triggers (80 triggers)
-- Note: SQLite triggers will throw an error if the user tries to update the uuid of the rows.

CREATE TRIGGER IF NOT EXISTS tb_ai_commands_uuid_immutable BEFORE UPDATE OF command_uuid ON enterprise_ai_commands
BEGIN
    SELECT RAISE(ABORT, 'command_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_agents_uuid_immutable BEFORE UPDATE OF agent_uuid ON enterprise_ai_agents
BEGIN
    SELECT RAISE(ABORT, 'agent_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_capabilities_uuid_immutable BEFORE UPDATE OF capability_uuid ON enterprise_ai_capabilities
BEGIN
    SELECT RAISE(ABORT, 'capability_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_models_uuid_immutable BEFORE UPDATE OF model_uuid ON enterprise_ai_models
BEGIN
    SELECT RAISE(ABORT, 'model_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_prompts_uuid_immutable BEFORE UPDATE OF prompt_uuid ON enterprise_ai_prompts
BEGIN
    SELECT RAISE(ABORT, 'prompt_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_conversations_uuid_immutable BEFORE UPDATE OF message_uuid ON enterprise_ai_conversations
BEGIN
    SELECT RAISE(ABORT, 'message_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_sessions_uuid_immutable BEFORE UPDATE OF session_uuid ON enterprise_ai_sessions
BEGIN
    SELECT RAISE(ABORT, 'session_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_contexts_uuid_immutable BEFORE UPDATE OF context_uuid ON enterprise_ai_contexts
BEGIN
    SELECT RAISE(ABORT, 'context_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_memories_uuid_immutable BEFORE UPDATE OF memory_uuid ON enterprise_ai_memories
BEGIN
    SELECT RAISE(ABORT, 'memory_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_knowledge_uuid_immutable BEFORE UPDATE OF knowledge_uuid ON enterprise_ai_knowledge
BEGIN
    SELECT RAISE(ABORT, 'knowledge_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_decisions_uuid_immutable BEFORE UPDATE OF decision_uuid ON enterprise_ai_decisions
BEGIN
    SELECT RAISE(ABORT, 'decision_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_recommendations_uuid_immutable BEFORE UPDATE OF recommendation_uuid ON enterprise_ai_recommendations
BEGIN
    SELECT RAISE(ABORT, 'recommendation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_reasoning_uuid_immutable BEFORE UPDATE OF reasoning_uuid ON enterprise_ai_reasoning
BEGIN
    SELECT RAISE(ABORT, 'reasoning_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_confidence_uuid_immutable BEFORE UPDATE OF confidence_uuid ON enterprise_ai_confidence
BEGIN
    SELECT RAISE(ABORT, 'confidence_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_approvals_uuid_immutable BEFORE UPDATE OF approval_uuid ON enterprise_ai_approvals
BEGIN
    SELECT RAISE(ABORT, 'approval_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_feedback_uuid_immutable BEFORE UPDATE OF feedback_uuid ON enterprise_ai_feedback
BEGIN
    SELECT RAISE(ABORT, 'feedback_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_learning_uuid_immutable BEFORE UPDATE OF learning_uuid ON enterprise_ai_learning
BEGIN
    SELECT RAISE(ABORT, 'learning_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_evaluations_uuid_immutable BEFORE UPDATE OF evaluation_uuid ON enterprise_ai_evaluations
BEGIN
    SELECT RAISE(ABORT, 'evaluation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_policies_uuid_immutable BEFORE UPDATE OF policy_uuid ON enterprise_ai_policies
BEGIN
    SELECT RAISE(ABORT, 'policy_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_guardrails_uuid_immutable BEFORE UPDATE OF guardrail_uuid ON enterprise_ai_guardrails
BEGIN
    SELECT RAISE(ABORT, 'guardrail_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_safety_uuid_immutable BEFORE UPDATE OF safety_uuid ON enterprise_ai_safety
BEGIN
    SELECT RAISE(ABORT, 'safety_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_communications_uuid_immutable BEFORE UPDATE OF comm_uuid ON enterprise_ai_communications
BEGIN
    SELECT RAISE(ABORT, 'comm_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_notifications_uuid_immutable BEFORE UPDATE OF alert_uuid ON enterprise_ai_notifications
BEGIN
    SELECT RAISE(ABORT, 'alert_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_channels_uuid_immutable BEFORE UPDATE OF channel_uuid ON enterprise_ai_channels
BEGIN
    SELECT RAISE(ABORT, 'channel_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_conversation_routing_uuid_immutable BEFORE UPDATE OF route_uuid ON enterprise_ai_conversation_routing
BEGIN
    SELECT RAISE(ABORT, 'route_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_intents_uuid_immutable BEFORE UPDATE OF intent_uuid ON enterprise_ai_intents
BEGIN
    SELECT RAISE(ABORT, 'intent_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_actions_uuid_immutable BEFORE UPDATE OF action_uuid ON enterprise_ai_actions
BEGIN
    SELECT RAISE(ABORT, 'action_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_tools_uuid_immutable BEFORE UPDATE OF tool_uuid ON enterprise_ai_tools
BEGIN
    SELECT RAISE(ABORT, 'tool_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_tool_permissions_uuid_immutable BEFORE UPDATE OF permission_uuid ON enterprise_ai_tool_permissions
BEGIN
    SELECT RAISE(ABORT, 'permission_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_tool_invocations_uuid_immutable BEFORE UPDATE OF invocation_uuid ON enterprise_ai_tool_invocations
BEGIN
    SELECT RAISE(ABORT, 'invocation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_outputs_uuid_immutable BEFORE UPDATE OF output_uuid ON enterprise_ai_outputs
BEGIN
    SELECT RAISE(ABORT, 'output_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_explanations_uuid_immutable BEFORE UPDATE OF explanation_uuid ON enterprise_ai_explanations
BEGIN
    SELECT RAISE(ABORT, 'explanation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_audit_log_uuid_immutable BEFORE UPDATE OF audit_uuid ON enterprise_ai_audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_metrics_uuid_immutable BEFORE UPDATE OF metric_uuid ON enterprise_ai_metrics
BEGIN
    SELECT RAISE(ABORT, 'metric_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_observability_uuid_immutable BEFORE UPDATE OF observability_uuid ON enterprise_ai_observability
BEGIN
    SELECT RAISE(ABORT, 'observability_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_versions_uuid_immutable BEFORE UPDATE OF version_uuid ON enterprise_ai_versions
BEGIN
    SELECT RAISE(ABORT, 'version_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_lifecycles_uuid_immutable BEFORE UPDATE OF lifecycle_uuid ON enterprise_ai_lifecycles
BEGIN
    SELECT RAISE(ABORT, 'lifecycle_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_model_routing_uuid_immutable BEFORE UPDATE OF routing_uuid ON enterprise_ai_model_routing
BEGIN
    SELECT RAISE(ABORT, 'routing_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_token_budgets_uuid_immutable BEFORE UPDATE OF budget_uuid ON enterprise_ai_token_budgets
BEGIN
    SELECT RAISE(ABORT, 'budget_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_prompt_experiments_uuid_immutable BEFORE UPDATE OF experiment_uuid ON enterprise_ai_prompt_experiments
BEGIN
    SELECT RAISE(ABORT, 'experiment_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_knowledge_versions_uuid_immutable BEFORE UPDATE OF knowledge_version_uuid ON enterprise_ai_knowledge_versions
BEGIN
    SELECT RAISE(ABORT, 'knowledge_version_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_human_overrides_uuid_immutable BEFORE UPDATE OF override_uuid ON enterprise_ai_human_overrides
BEGIN
    SELECT RAISE(ABORT, 'override_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_hallucinations_uuid_immutable BEFORE UPDATE OF hallucination_uuid ON enterprise_ai_hallucinations
BEGIN
    SELECT RAISE(ABORT, 'hallucination_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_feedback_analytics_uuid_immutable BEFORE UPDATE OF analytics_uuid ON enterprise_ai_feedback_analytics
BEGIN
    SELECT RAISE(ABORT, 'analytics_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_provider_health_uuid_immutable BEFORE UPDATE OF provider_health_uuid ON enterprise_ai_provider_health
BEGIN
    SELECT RAISE(ABORT, 'provider_health_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_conversation_analytics_uuid_immutable BEFORE UPDATE OF conversation_analytics_uuid ON enterprise_ai_conversation_analytics
BEGIN
    SELECT RAISE(ABORT, 'conversation_analytics_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_memory_lifecycle_uuid_immutable BEFORE UPDATE OF memory_lifecycle_uuid ON enterprise_ai_memory_lifecycle
BEGIN
    SELECT RAISE(ABORT, 'memory_lifecycle_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_knowledge_sync_uuid_immutable BEFORE UPDATE OF sync_uuid ON enterprise_ai_knowledge_sync
BEGIN
    SELECT RAISE(ABORT, 'sync_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_skills_uuid_immutable BEFORE UPDATE OF skill_uuid ON enterprise_ai_skills
BEGIN
    SELECT RAISE(ABORT, 'skill_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_roles_uuid_immutable BEFORE UPDATE OF role_uuid ON enterprise_ai_roles
BEGIN
    SELECT RAISE(ABORT, 'role_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_departments_uuid_immutable BEFORE UPDATE OF department_uuid ON enterprise_ai_departments
BEGIN
    SELECT RAISE(ABORT, 'department_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_teams_uuid_immutable BEFORE UPDATE OF team_uuid ON enterprise_ai_teams
BEGIN
    SELECT RAISE(ABORT, 'team_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_collaboration_uuid_immutable BEFORE UPDATE OF collaboration_uuid ON enterprise_ai_collaboration
BEGIN
    SELECT RAISE(ABORT, 'collaboration_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_delegations_uuid_immutable BEFORE UPDATE OF delegation_uuid ON enterprise_ai_delegations
BEGIN
    SELECT RAISE(ABORT, 'delegation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_supervisors_uuid_immutable BEFORE UPDATE OF supervisor_uuid ON enterprise_ai_supervisors
BEGIN
    SELECT RAISE(ABORT, 'supervisor_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_escalations_uuid_immutable BEFORE UPDATE OF escalation_uuid ON enterprise_ai_escalations
BEGIN
    SELECT RAISE(ABORT, 'escalation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_compliance_uuid_immutable BEFORE UPDATE OF compliance_uuid ON enterprise_ai_compliance
BEGIN
    SELECT RAISE(ABORT, 'compliance_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_regulatory_uuid_immutable BEFORE UPDATE OF regulatory_uuid ON enterprise_ai_regulatory
BEGIN
    SELECT RAISE(ABORT, 'regulatory_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_consent_uuid_immutable BEFORE UPDATE OF consent_uuid ON enterprise_ai_consent
BEGIN
    SELECT RAISE(ABORT, 'consent_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_data_residency_uuid_immutable BEFORE UPDATE OF residency_uuid ON enterprise_ai_data_residency
BEGIN
    SELECT RAISE(ABORT, 'residency_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_explainability_compliance_uuid_immutable BEFORE UPDATE OF compliance_cert_uuid ON enterprise_ai_explainability_compliance
BEGIN
    SELECT RAISE(ABORT, 'compliance_cert_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_risk_classification_uuid_immutable BEFORE UPDATE OF risk_uuid ON enterprise_ai_risk_classification
BEGIN
    SELECT RAISE(ABORT, 'risk_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_incidents_uuid_immutable BEFORE UPDATE OF incident_uuid ON enterprise_ai_incidents
BEGIN
    SELECT RAISE(ABORT, 'incident_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_recovery_uuid_immutable BEFORE UPDATE OF recovery_uuid ON enterprise_ai_recovery
BEGIN
    SELECT RAISE(ABORT, 'recovery_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_rollbacks_uuid_immutable BEFORE UPDATE OF rollback_uuid ON enterprise_ai_rollbacks
BEGIN
    SELECT RAISE(ABORT, 'rollback_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_certifications_uuid_immutable BEFORE UPDATE OF certification_uuid ON enterprise_ai_certifications
BEGIN
    SELECT RAISE(ABORT, 'certification_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_analytics_kpis_uuid_immutable BEFORE UPDATE OF kpi_uuid ON enterprise_ai_analytics_kpis
BEGIN
    SELECT RAISE(ABORT, 'kpi_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_command_center_config_uuid_immutable BEFORE UPDATE OF config_uuid ON enterprise_ai_command_center_config
BEGIN
    SELECT RAISE(ABORT, 'config_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_policy_versions_uuid_immutable BEFORE UPDATE OF policy_version_uuid ON enterprise_ai_policy_versions
BEGIN
    SELECT RAISE(ABORT, 'policy_version_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_policy_evaluations_uuid_immutable BEFORE UPDATE OF evaluation_uuid ON enterprise_ai_policy_evaluations
BEGIN
    SELECT RAISE(ABORT, 'evaluation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_rules_uuid_immutable BEFORE UPDATE OF rule_uuid ON enterprise_ai_rules
BEGIN
    SELECT RAISE(ABORT, 'rule_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_rule_versions_uuid_immutable BEFORE UPDATE OF rule_version_uuid ON enterprise_ai_rule_versions
BEGIN
    SELECT RAISE(ABORT, 'rule_version_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_rule_dependencies_uuid_immutable BEFORE UPDATE OF rule_dep_uuid ON enterprise_ai_rule_dependencies
BEGIN
    SELECT RAISE(ABORT, 'rule_dep_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_decision_escalations_uuid_immutable BEFORE UPDATE OF escalation_uuid ON enterprise_ai_decision_escalations
BEGIN
    SELECT RAISE(ABORT, 'escalation_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_quality_metrics_uuid_immutable BEFORE UPDATE OF metric_uuid ON enterprise_ai_quality_metrics
BEGIN
    SELECT RAISE(ABORT, 'metric_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_benchmarks_uuid_immutable BEFORE UPDATE OF benchmark_uuid ON enterprise_ai_benchmarks
BEGIN
    SELECT RAISE(ABORT, 'benchmark_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_features_uuid_immutable BEFORE UPDATE OF feature_uuid ON enterprise_ai_features
BEGIN
    SELECT RAISE(ABORT, 'feature_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_marketplace_uuid_immutable BEFORE UPDATE OF marketplace_uuid ON enterprise_ai_marketplace
BEGIN
    SELECT RAISE(ABORT, 'marketplace_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_plugins_uuid_immutable BEFORE UPDATE OF plugin_uuid ON enterprise_ai_plugins
BEGIN
    SELECT RAISE(ABORT, 'plugin_uuid is immutable');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_connectors_uuid_immutable BEFORE UPDATE OF connector_uuid ON enterprise_ai_connectors
BEGIN
    SELECT RAISE(ABORT, 'connector_uuid is immutable');
END;


-- Append-Only Triggers (22 tables)
-- Blocking UPDATE and DELETE mutations on write-once tables.

CREATE TRIGGER IF NOT EXISTS tb_ai_conversations_append_only_upd BEFORE UPDATE ON enterprise_ai_conversations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_conversations is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_conversations_append_only_del BEFORE DELETE ON enterprise_ai_conversations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_conversations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_memories_append_only_upd BEFORE UPDATE ON enterprise_ai_memories
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_memories is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_memories_append_only_del BEFORE DELETE ON enterprise_ai_memories
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_memories is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_decisions_append_only_upd BEFORE UPDATE ON enterprise_ai_decisions
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_decisions is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_decisions_append_only_del BEFORE DELETE ON enterprise_ai_decisions
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_decisions is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_recommendations_append_only_upd BEFORE UPDATE ON enterprise_ai_recommendations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_recommendations is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_recommendations_append_only_del BEFORE DELETE ON enterprise_ai_recommendations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_recommendations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_reasoning_append_only_upd BEFORE UPDATE ON enterprise_ai_reasoning
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_reasoning is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_reasoning_append_only_del BEFORE DELETE ON enterprise_ai_reasoning
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_reasoning is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_feedback_append_only_upd BEFORE UPDATE ON enterprise_ai_feedback
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_feedback is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_feedback_append_only_del BEFORE DELETE ON enterprise_ai_feedback
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_feedback is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_learning_append_only_upd BEFORE UPDATE ON enterprise_ai_learning
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_learning is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_learning_append_only_del BEFORE DELETE ON enterprise_ai_learning
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_learning is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_evaluations_append_only_upd BEFORE UPDATE ON enterprise_ai_evaluations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_evaluations is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_evaluations_append_only_del BEFORE DELETE ON enterprise_ai_evaluations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_evaluations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_tool_invocations_append_only_upd BEFORE UPDATE ON enterprise_ai_tool_invocations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_tool_invocations is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_tool_invocations_append_only_del BEFORE DELETE ON enterprise_ai_tool_invocations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_tool_invocations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_outputs_append_only_upd BEFORE UPDATE ON enterprise_ai_outputs
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_outputs is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_outputs_append_only_del BEFORE DELETE ON enterprise_ai_outputs
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_outputs is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_explanations_append_only_upd BEFORE UPDATE ON enterprise_ai_explanations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_explanations is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_explanations_append_only_del BEFORE DELETE ON enterprise_ai_explanations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_explanations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_audit_log_append_only_upd BEFORE UPDATE ON enterprise_ai_audit_log
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_audit_log is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_audit_log_append_only_del BEFORE DELETE ON enterprise_ai_audit_log
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_metrics_append_only_upd BEFORE UPDATE ON enterprise_ai_metrics
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_metrics is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_metrics_append_only_del BEFORE DELETE ON enterprise_ai_metrics
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_metrics is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_observability_append_only_upd BEFORE UPDATE ON enterprise_ai_observability
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_observability is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_observability_append_only_del BEFORE DELETE ON enterprise_ai_observability
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_observability is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_hallucinations_append_only_upd BEFORE UPDATE ON enterprise_ai_hallucinations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_hallucinations is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_hallucinations_append_only_del BEFORE DELETE ON enterprise_ai_hallucinations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_hallucinations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_feedback_analytics_append_only_upd BEFORE UPDATE ON enterprise_ai_feedback_analytics
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_feedback_analytics is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_feedback_analytics_append_only_del BEFORE DELETE ON enterprise_ai_feedback_analytics
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_feedback_analytics is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_provider_health_append_only_upd BEFORE UPDATE ON enterprise_ai_provider_health
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_provider_health is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_provider_health_append_only_del BEFORE DELETE ON enterprise_ai_provider_health
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_provider_health is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_conversation_analytics_append_only_upd BEFORE UPDATE ON enterprise_ai_conversation_analytics
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_conversation_analytics is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_conversation_analytics_append_only_del BEFORE DELETE ON enterprise_ai_conversation_analytics
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_conversation_analytics is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_incidents_append_only_upd BEFORE UPDATE ON enterprise_ai_incidents
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_incidents is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_incidents_append_only_del BEFORE DELETE ON enterprise_ai_incidents
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_incidents is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_analytics_kpis_append_only_upd BEFORE UPDATE ON enterprise_ai_analytics_kpis
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_analytics_kpis is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_analytics_kpis_append_only_del BEFORE DELETE ON enterprise_ai_analytics_kpis
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_analytics_kpis is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_policy_evaluations_append_only_upd BEFORE UPDATE ON enterprise_ai_policy_evaluations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_policy_evaluations is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_policy_evaluations_append_only_del BEFORE DELETE ON enterprise_ai_policy_evaluations
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_policy_evaluations is append-only');
END;

CREATE TRIGGER IF NOT EXISTS tb_ai_quality_metrics_append_only_upd BEFORE UPDATE ON enterprise_ai_quality_metrics
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_quality_metrics is append-only');
END;
CREATE TRIGGER IF NOT EXISTS tb_ai_quality_metrics_append_only_del BEFORE DELETE ON enterprise_ai_quality_metrics
BEGIN
    SELECT RAISE(ABORT, 'enterprise_ai_quality_metrics is append-only');
END;
