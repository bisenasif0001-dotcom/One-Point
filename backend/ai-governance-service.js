"use strict";

const fs = require("node:fs");
const path = require("node:path");

function syncAiCommandCenterGovernance({ dbConn, reportPath }) {
  const startedAt = new Date().toISOString();
  let created = 0;
  let skipped = 0;
  const failures = [];

  // Helper helper to upsert
  const runUpsert = (checkSql, insertSql, params, label) => {
    try {
      const existing = dbConn.prepare(checkSql).get(params[0]);
      if (!existing) {
        dbConn.prepare(insertSql).run(...params);
        created++;
      } else {
        skipped++;
      }
    } catch (err) {
      failures.push({ label, error: err.message });
    }
  };

  // Seeding 1. Default Models
  const models = [
    ["gemini-uuid", "gemini-1.5-pro", "Gemini 1.5 Pro", "Gemini", "https://api.google.com/gemini", 1],
    ["anthropic-uuid", "claude-3-opus", "Claude 3 Opus", "Anthropic", "https://api.anthropic.com/claude", 1],
    ["openai-uuid", "gpt-4o", "GPT-4o", "OpenAI", "https://api.openai.com/v1", 1],
    ["mock-uuid", "mock-model", "Mock Model", "Mock", "http://127.0.0.1/mock", 1]
  ];
  for (const m of models) {
    runUpsert(
      "SELECT id FROM enterprise_ai_models WHERE model_key = ?",
      "INSERT INTO enterprise_ai_models (model_uuid, model_key, model_name, provider_name, endpoint_url, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      m,
      `Model: ${m[1]}`
    );
  }

  // Seeding 2. Default Policies
  runUpsert(
    "SELECT id FROM enterprise_ai_policies WHERE policy_key = ?",
    "INSERT INTO enterprise_ai_policies (policy_uuid, policy_key, policy_pack_key, policy_priority, max_token_budget, tenant_scope, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["default-policy-uuid", "default_token_policy", "security_pack", 100, 4096, "global_tenant", 1],
    "Policy: default_token_policy"
  );

  // Seeding 3. Default Guardrails
  runUpsert(
    "SELECT id FROM enterprise_ai_guardrails WHERE pattern_key = ?",
    "INSERT INTO enterprise_ai_guardrails (guardrail_uuid, pattern_key, regex_pattern, block_direction, is_active) VALUES (?, ?, ?, ?, ?)",
    ["sql-guardrail-uuid", "sql_injection_guardrail", "UNION SELECT|DROP TABLE", "Bidirectional", 1],
    "Guardrail: sql_injection_guardrail"
  );

  // Seeding 4. Default Safety thresholds
  const safetySpecs = [
    ["safety-tox-uuid", "Toxicity", 0.20],
    ["safety-harass-uuid", "Harassment", 0.20],
    ["safety-sex-uuid", "Sexual", 0.30]
  ];
  for (const s of safetySpecs) {
    runUpsert(
      "SELECT id FROM enterprise_ai_safety WHERE category = ?",
      "INSERT INTO enterprise_ai_safety (safety_uuid, category, max_threshold) VALUES (?, ?, ?)",
      s,
      `Safety: ${s[1]}`
    );
  }

  // Seeding 5. Default Model Routing Mappings
  runUpsert(
    "SELECT id FROM enterprise_ai_model_routing WHERE model_key = ?",
    "INSERT INTO enterprise_ai_model_routing (routing_uuid, model_key, fallback_model_key, provider_priority, routing_strategy, aggregation_policy, provider_latency, provider_cost, health_status, availability_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["routing-uuid-1", "gpt-4o", "mock-model", 1, "Cost", "Single", 150, 0.015, "Healthy", "Online"],
    "Routing: gpt-4o"
  );

  // Seeding 6. Default Budget Caps
  runUpsert(
    "SELECT id FROM enterprise_ai_token_budgets WHERE tenant_scope = ?",
    "INSERT INTO enterprise_ai_token_budgets (budget_uuid, cost_uuid, tenant_scope, branch_scope, department_key, employee_key, daily_budget, monthly_budget, remaining_budget, cost_per_token, provider_cost, forecast_cost, budget_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["budget-uuid-1", "cost-uuid-1", "global_tenant", "default_branch", "engineering", "admin", 100.0, 3000.0, 3000.0, 0.0001, 0.0, 0.0, "Active"],
    "Budget: global_tenant"
  );

  // Seeding 7. Default Channels
  const channels = [
    ["chan-wa-uuid", "WhatsApp", "WhatsApp", 1],
    ["chan-em-uuid", "Email", "Email", 1],
    ["chan-sms-uuid", "SMS", "SMS", 1],
    ["chan-voice-uuid", "Voice", "Voice", 1],
    ["chan-chat-uuid", "LiveChat", "LiveChat", 1],
    ["chan-int-uuid", "Internal", "Internal", 1]
  ];
  for (const c of channels) {
    runUpsert(
      "SELECT id FROM enterprise_ai_channels WHERE channel_key = ?",
      "INSERT INTO enterprise_ai_channels (channel_uuid, channel_key, channel_type, is_enabled) VALUES (?, ?, ?, ?)",
      c,
      `Channel: ${c[1]}`
    );
  }

  // Seeding 8. Default Dashboard Command Center Configurations
  runUpsert(
    "SELECT id FROM enterprise_ai_command_center_config WHERE card_key = ?",
    "INSERT INTO enterprise_ai_command_center_config (config_uuid, card_key, widget_type, dashboard_layout_json) VALUES (?, ?, ?, ?)",
    ["cc-config-uuid", "summary_card", "Card", '{"grid":"2x2","slots":["left","right"]}'],
    "CommandCenter: summary_card"
  );

  // Seeding 9. Default Feature Flags
  runUpsert(
    "SELECT id FROM enterprise_ai_features WHERE feature_key = ?",
    "INSERT INTO enterprise_ai_features (feature_uuid, feature_key, feature_category, feature_lifecycle_state, is_enabled) VALUES (?, ?, ?, ?, ?)",
    ["feature-flag-uuid", "core_assistant", "Core", "Stable", 1],
    "Feature: core_assistant"
  );

  // Seeding 10. Default Connectors
  runUpsert(
    "SELECT id FROM enterprise_ai_connectors WHERE connector_key = ?",
    "INSERT INTO enterprise_ai_connectors (connector_uuid, connector_key, connector_version, is_active) VALUES (?, ?, ?, ?)",
    ["conn-uuid-1", "salesforce_connector", "1.0.0", 1],
    "Connector: salesforce_connector"
  );

  const report = {
    migrationKey: "020_enterprise_ai_command_center_decision_intelligence",
    startedAt,
    finishedAt: new Date().toISOString(),
    created,
    updated: 0,
    skipped,
    failures
  };

  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  }

  return report;
}

function validateAiCommandCenter({ dbConn }) {
  const failures = [];

  // Verify schemas
  const tables = [
    "enterprise_ai_commands", "enterprise_ai_agents", "enterprise_ai_capabilities", "enterprise_ai_models",
    "enterprise_ai_prompts", "enterprise_ai_conversations", "enterprise_ai_sessions", "enterprise_ai_contexts",
    "enterprise_ai_memories", "enterprise_ai_knowledge", "enterprise_ai_decisions", "enterprise_ai_recommendations",
    "enterprise_ai_reasoning", "enterprise_ai_confidence", "enterprise_ai_approvals", "enterprise_ai_feedback",
    "enterprise_ai_learning", "enterprise_ai_evaluations", "enterprise_ai_policies", "enterprise_ai_guardrails",
    "enterprise_ai_safety", "enterprise_ai_communications", "enterprise_ai_notifications", "enterprise_ai_channels",
    "enterprise_ai_conversation_routing", "enterprise_ai_intents", "enterprise_ai_actions", "enterprise_ai_tools",
    "enterprise_ai_tool_permissions", "enterprise_ai_tool_invocations", "enterprise_ai_outputs", "enterprise_ai_explanations",
    "enterprise_ai_audit_log", "enterprise_ai_metrics", "enterprise_ai_observability", "enterprise_ai_versions",
    "enterprise_ai_lifecycles", "enterprise_ai_model_routing", "enterprise_ai_token_budgets", "enterprise_ai_prompt_experiments",
    "enterprise_ai_knowledge_versions", "enterprise_ai_human_overrides", "enterprise_ai_hallucinations", "enterprise_ai_feedback_analytics",
    "enterprise_ai_provider_health", "enterprise_ai_conversation_analytics", "enterprise_ai_memory_lifecycle", "enterprise_ai_knowledge_sync",
    "enterprise_ai_skills", "enterprise_ai_roles", "enterprise_ai_departments", "enterprise_ai_teams",
    "enterprise_ai_collaboration", "enterprise_ai_delegations", "enterprise_ai_supervisors", "enterprise_ai_escalations",
    "enterprise_ai_compliance", "enterprise_ai_regulatory", "enterprise_ai_consent", "enterprise_ai_data_residency",
    "enterprise_ai_explainability_compliance", "enterprise_ai_risk_classification", "enterprise_ai_incidents", "enterprise_ai_recovery",
    "enterprise_ai_rollbacks", "enterprise_ai_certifications", "enterprise_ai_analytics_kpis", "enterprise_ai_command_center_config",
    "enterprise_ai_policy_versions", "enterprise_ai_policy_evaluations", "enterprise_ai_rules", "enterprise_ai_rule_versions",
    "enterprise_ai_rule_dependencies", "enterprise_ai_decision_escalations", "enterprise_ai_quality_metrics", "enterprise_ai_benchmarks",
    "enterprise_ai_features", "enterprise_ai_marketplace", "enterprise_ai_plugins", "enterprise_ai_connectors"
  ];

  for (const tbl of tables) {
    const row = dbConn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tbl);
    if (!row) {
      failures.push({ type: "schema", message: `Table ${tbl} does not exist.` });
    }
  }

  // Circular supervisor check
  try {
    const supervisorLinks = dbConn.prepare("SELECT supervisor_agent_key, supervised_agent_key FROM enterprise_ai_supervisors").all();
    const supervisorGraph = new Map();
    for (const link of supervisorLinks) {
      if (!supervisorGraph.has(link.supervisor_agent_key)) supervisorGraph.set(link.supervisor_agent_key, []);
      supervisorGraph.get(link.supervisor_agent_key).push(link.supervised_agent_key);
    }
    const visited = new Set();
    const recStack = new Set();

    function detectSupervisorCycle(node) {
      if (recStack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      recStack.add(node);
      const neighbors = supervisorGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (detectSupervisorCycle(neighbor)) return true;
      }
      recStack.delete(node);
      return false;
    }

    for (const node of supervisorGraph.keys()) {
      if (detectSupervisorCycle(node)) {
        failures.push({ type: "circular_supervisor", message: "Circular AI supervisor loop detected." });
        break;
      }
    }
  } catch (err) {
    failures.push({ type: "circular_supervisor_check", message: err.message });
  }

  // Circular rule dependency check
  try {
    const ruleLinks = dbConn.prepare("SELECT rule_key, depends_on_rule_key FROM enterprise_ai_rule_dependencies").all();
    const ruleGraph = new Map();
    for (const link of ruleLinks) {
      if (!ruleGraph.has(link.rule_key)) ruleGraph.set(link.rule_key, []);
      ruleGraph.get(link.rule_key).push(link.depends_on_rule_key);
    }
    const visited = new Set();
    const recStack = new Set();

    function detectRuleCycle(node) {
      if (recStack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      recStack.add(node);
      const neighbors = ruleGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (detectRuleCycle(neighbor)) return true;
      }
      recStack.delete(node);
      return false;
    }

    for (const node of ruleGraph.keys()) {
      if (detectRuleCycle(node)) {
        failures.push({ type: "circular_rules", message: "Circular AI rule dependencies detected." });
        break;
      }
    }
  } catch (err) {
    failures.push({ type: "circular_rules_check", message: err.message });
  }

  return {
    status: failures.length === 0 ? "Success" : "Failed",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    failures
  };
}

function writeMigrationEvidence(options, report) {
  try {
    if (options.reportPath) {
      fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
      fs.writeFileSync(options.reportPath, JSON.stringify(report, null, 2), "utf8");
    }
    if (options.canonicalFallbackPath) {
      fs.mkdirSync(path.dirname(options.canonicalFallbackPath), { recursive: true });
      fs.writeFileSync(options.canonicalFallbackPath, JSON.stringify(report, null, 2), "utf8");
    }
  } catch {
    // Ignore
  }
}

function createFailedMigrationReport(error) {
  return {
    migrationKey: "020_enterprise_ai_command_center_decision_intelligence",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    created: 0,
    updated: 0,
    skipped: 0,
    failures: [{ label: "fatal", error: error.message }]
  };
}

module.exports = {
  syncAiCommandCenterGovernance,
  validateAiCommandCenter,
  writeMigrationEvidence,
  createFailedMigrationReport
};
