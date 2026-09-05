"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function nowIso() {
  return new Date().toISOString();
}

function json(value, fallback) {
  return JSON.stringify(value === undefined ? fallback : value);
}

function writeReport(report, reportPath) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function createReport() {
  return {
    milestone: "Phase 3 - Milestone 3.2",
    name: "Enterprise Intelligence Core Foundation",
    startedAt: nowIso(),
    finishedAt: null,
    totals: {
      created: 0,
      updated: 0,
      skipped: 0,
      failures: 0
    },
    tables: {},
    failures: []
  };
}

function bump(report, table, kind) {
  if (!report.tables[table]) {
    report.tables[table] = { created: 0, updated: 0, skipped: 0 };
  }
  report.tables[table][kind] += 1;
  report.totals[kind] += 1;
}

const tableColumnCache = new Map();

function getTableColumns(dbConn, table) {
  if (!tableColumnCache.has(table)) {
    const rows = dbConn.prepare(`PRAGMA table_info(${table})`).all();
    tableColumnCache.set(table, new Set(rows.map((row) => row.name)));
  }
  return tableColumnCache.get(table);
}

function addFailure(report, table, key, error) {
  report.totals.failures += 1;
  report.failures.push({
    table,
    key,
    message: error && error.message ? error.message : String(error)
  });
}

function upsertSeed(dbConn, report, config) {
  const {
    table,
    keyColumn,
    keyValue,
    uuidColumn,
    values
  } = config;
  const tableColumns = getTableColumns(dbConn, table);
  const existing = dbConn.prepare(`SELECT * FROM ${table} WHERE ${keyColumn} = ?`).get(keyValue);
  const payload = { ...values };
  if (!payload[uuidColumn]) {
    payload[uuidColumn] = existing?.[uuidColumn] || crypto.randomUUID();
  }
  payload[keyColumn] = keyValue;

  if (existing) {
    const hasAssetVersion = tableColumns.has("asset_version");
    const nextAssetVersion = payload.asset_version;
    const currentAssetVersion = existing.asset_version;
    const canUpgradeExistingAsset = hasAssetVersion
      && Number.isFinite(Number(nextAssetVersion))
      && Number.isFinite(Number(currentAssetVersion))
      && Number(nextAssetVersion) > Number(currentAssetVersion);
    if (!canUpgradeExistingAsset) {
      bump(report, table, "skipped");
      return payload[uuidColumn];
    }
    const entries = Object.entries(payload).filter(([column]) => column !== uuidColumn && column !== keyColumn);
    const setSql = entries.map(([column]) => `${column} = ?`).join(", ");
    dbConn.prepare(`
      UPDATE ${table}
      SET ${setSql},
          updated_at = CURRENT_TIMESTAMP
      WHERE ${keyColumn} = ?
    `).run(...entries.map(([, value]) => value), keyValue);
    bump(report, table, "updated");
    return payload[uuidColumn];
  }

  const insertColumns = Object.keys(payload);
  const placeholders = insertColumns.map(() => "?").join(", ");
  dbConn.prepare(`
    INSERT INTO ${table} (${insertColumns.join(", ")})
    VALUES (${placeholders})
  `).run(...insertColumns.map((column) => payload[column]));
  bump(report, table, "created");
  return payload[uuidColumn];
}

function seedKnowledge(dbConn, report) {
  const domains = [
    ["government_rules", "Government Rules", "compliance"],
    ["company_policies", "Company Policies", "compliance"],
    ["service_dna", "Service DNA", "knowledge"],
    ["knowledge_base", "Knowledge Base", "knowledge"],
    ["customer_records", "Customer Records", "customer_success"],
    ["workflow_records", "Workflow Records", "operations"],
    ["conversation_records", "Conversation Records", "customer_success"],
    ["technical_documentation", "Technical Documentation", "infrastructure"]
  ];
  const domainUuids = new Map();
  for (const [domainKey, domainName, ownerDepartment] of domains) {
    domainUuids.set(
      domainKey,
      upsertSeed(dbConn, report, {
        table: "enterprise_knowledge_domains",
        keyColumn: "domain_key",
        keyValue: domainKey,
        uuidColumn: "knowledge_domain_uuid",
        values: {
          domain_name: domainName,
          owner_department: ownerDepartment,
          lifecycle_status: "Published",
          asset_version: 1,
          metadata_json: json({
            sourceOfTruth: true,
            duplicatePolicy: "forbidden",
            runtimeEnabled: false
          }, {})
        }
      })
    );
  }

  const sources = [
    ["government_rules", "Government Rules", "governance", 10, 100],
    ["company_policies", "Company Policies", "governance", 20, 90],
    ["service_dna", "Service DNA", "business", 30, 85],
    ["knowledge_base", "Knowledge Base", "knowledge", 40, 80],
    ["customer_360", "Customer 360", "business", 50, 75],
    ["order_orchestration", "Order Orchestration", "business", 60, 70],
    ["document_intelligence", "Document Intelligence", "business", 70, 68],
    ["omnichannel", "Omnichannel", "business", 80, 65],
    ["workforce", "Workforce", "business", 90, 60],
    ["executive_layer", "Executive Layer", "read_model", 100, 55],
    ["ai_generated_draft", "AI Generated Draft", "ai_generated", 110, 20],
    ["ai_assumptions", "AI Assumptions", "ai_generated", 120, 5]
  ];
  const sourceUuids = new Map();
  for (const [sourceKey, sourceName, sourceType, sourcePriority, authorityLevel] of sources) {
    sourceUuids.set(
      sourceKey,
      upsertSeed(dbConn, report, {
        table: "enterprise_knowledge_sources",
        keyColumn: "source_key",
        keyValue: sourceKey,
        uuidColumn: "knowledge_source_uuid",
        values: {
          source_name: sourceName,
          source_type: sourceType,
          source_priority: sourcePriority,
          authority_level: authorityLevel,
          lifecycle_status: "Published",
          asset_version: 1,
          metadata_json: json({
            hierarchyReserved: true,
            runtimeEnabled: false
          }, {})
        }
      })
    );
  }

  const tagUuids = new Map();
  for (const [tagKey, displayName] of [
    ["governance", "Governance"],
    ["authority", "Authority"],
    ["ai_foundation", "AI Foundation"]
  ]) {
    tagUuids.set(
      tagKey,
      upsertSeed(dbConn, report, {
        table: "enterprise_knowledge_tags",
        keyColumn: "tag_key",
        keyValue: tagKey,
        uuidColumn: "knowledge_tag_uuid",
        values: {
          display_name: displayName,
          lifecycle_status: "Published",
          asset_version: 1,
          metadata_json: json({}, {})
        }
      })
    );
  }

  const articleUuid = upsertSeed(dbConn, report, {
    table: "enterprise_knowledge_articles",
    keyColumn: "article_key",
    keyValue: "enterprise-intelligence-governance-baseline",
    uuidColumn: "knowledge_article_uuid",
    values: {
      domain_uuid: domainUuids.get("company_policies"),
      article_title: "Enterprise Intelligence Governance Baseline",
      owner_type: "department",
      owner_id: "knowledge",
      lifecycle_status: "Published",
      current_version_number: 1,
      asset_version: 1,
      metadata_json: json({
        singleSourceOfTruth: true,
        runtimeEnabled: false
      }, {})
    }
  });

  const versionUuid = upsertSeed(dbConn, report, {
    table: "enterprise_knowledge_versions",
    keyColumn: "knowledge_version_uuid",
    keyValue: dbConn.prepare(
      "SELECT knowledge_version_uuid FROM enterprise_knowledge_versions WHERE knowledge_article_uuid = ? AND version_number = 1"
    ).get(articleUuid)?.knowledge_version_uuid || crypto.randomUUID(),
    uuidColumn: "knowledge_version_uuid",
    values: {
      knowledge_article_uuid: articleUuid,
      version_number: 1,
      version_status: "Published",
      knowledge_source_uuid: sourceUuids.get("company_policies"),
      knowledge_jurisdiction: "enterprise",
      knowledge_effective_from: "2026-07-03T00:00:00.000Z",
      knowledge_effective_to: null,
      knowledge_applicability: "all_future_ai_employees",
      knowledge_supersedes: null,
      knowledge_exception_reference: null,
      content_json: json({
        title: "Enterprise Intelligence Governance Baseline",
        scope: "metadata_only",
        runtimeEnabled: false
      }, {}),
      metadata_json: json({
        authorityModel: true,
        sourceHierarchyReserved: true
      }, {})
    }
  });

  const promptGovernanceArticleUuid = upsertSeed(dbConn, report, {
    table: "enterprise_knowledge_articles",
    keyColumn: "article_key",
    keyValue: "enterprise-prompt-governance-baseline",
    uuidColumn: "knowledge_article_uuid",
    values: {
      domain_uuid: domainUuids.get("company_policies"),
      article_title: "Enterprise Prompt Governance Baseline",
      owner_type: "department",
      owner_id: "knowledge",
      lifecycle_status: "Published",
      current_version_number: 1,
      asset_version: 1,
      metadata_json: json({
        singleSourceOfTruth: true,
        runtimeEnabled: false,
        governedPromptsOnly: true
      }, {})
    }
  });

  const promptGovernanceVersionUuid = upsertSeed(dbConn, report, {
    table: "enterprise_knowledge_versions",
    keyColumn: "knowledge_version_uuid",
    keyValue: dbConn.prepare(
      "SELECT knowledge_version_uuid FROM enterprise_knowledge_versions WHERE knowledge_article_uuid = ? AND version_number = 1"
    ).get(promptGovernanceArticleUuid)?.knowledge_version_uuid || crypto.randomUUID(),
    uuidColumn: "knowledge_version_uuid",
    values: {
      knowledge_article_uuid: promptGovernanceArticleUuid,
      version_number: 1,
      version_status: "Published",
      knowledge_source_uuid: sourceUuids.get("company_policies"),
      knowledge_jurisdiction: "enterprise",
      knowledge_effective_from: "2026-07-03T00:00:00.000Z",
      knowledge_effective_to: null,
      knowledge_applicability: "all_future_ai_prompt_assets",
      knowledge_supersedes: null,
      knowledge_exception_reference: null,
      content_json: json({
        title: "Enterprise Prompt Governance Baseline",
        scope: "metadata_only",
        runtimeEnabled: false,
        hardcodedPromptsForbidden: true
      }, {}),
      metadata_json: json({
        governedPromptAssets: true,
        sourceHierarchyReserved: true
      }, {})
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_knowledge_relationships",
    keyColumn: "knowledge_relationship_uuid",
    keyValue: dbConn.prepare(
      "SELECT knowledge_relationship_uuid FROM enterprise_knowledge_relationships WHERE from_knowledge_article_uuid = ? AND to_knowledge_article_uuid = ? AND relationship_type = ?"
    ).get(articleUuid, promptGovernanceArticleUuid, "governs")?.knowledge_relationship_uuid || crypto.randomUUID(),
    uuidColumn: "knowledge_relationship_uuid",
    values: {
      from_knowledge_article_uuid: articleUuid,
      to_knowledge_article_uuid: promptGovernanceArticleUuid,
      relationship_type: "governs",
      metadata_json: json({
        baselineExample: "enterprise_prompt_governance",
        runtimeEnabled: false
      }, {})
    }
  });

  dbConn.prepare(`
    INSERT INTO enterprise_knowledge_article_tags (knowledge_article_uuid, knowledge_tag_uuid)
    VALUES (?, ?)
    ON CONFLICT(knowledge_article_uuid, knowledge_tag_uuid) DO NOTHING
  `).run(articleUuid, tagUuids.get("ai_foundation"));
  dbConn.prepare(`
    INSERT INTO enterprise_knowledge_article_tags (knowledge_article_uuid, knowledge_tag_uuid)
    VALUES (?, ?)
    ON CONFLICT(knowledge_article_uuid, knowledge_tag_uuid) DO NOTHING
  `).run(promptGovernanceArticleUuid, tagUuids.get("ai_foundation"));
  dbConn.prepare(`
    INSERT INTO enterprise_knowledge_article_tags (knowledge_article_uuid, knowledge_tag_uuid)
    VALUES (?, ?)
    ON CONFLICT(knowledge_article_uuid, knowledge_tag_uuid) DO NOTHING
  `).run(promptGovernanceArticleUuid, tagUuids.get("governance"));

  upsertSeed(dbConn, report, {
    table: "enterprise_knowledge_audit",
    keyColumn: "knowledge_audit_uuid",
    keyValue: dbConn.prepare(
      "SELECT knowledge_audit_uuid FROM enterprise_knowledge_audit WHERE knowledge_article_uuid = ? AND action = ? LIMIT 1"
    ).get(articleUuid, "seeded")?.knowledge_audit_uuid || crypto.randomUUID(),
    uuidColumn: "knowledge_audit_uuid",
    values: {
      knowledge_article_uuid: articleUuid,
      knowledge_version_uuid: versionUuid,
      action: "seeded",
      actor_type: "migration",
      actor_id: "phase-3-milestone-3.2",
      metadata_json: json({ baseline: true }, {}),
      occurred_at: nowIso()
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_knowledge_audit",
    keyColumn: "knowledge_audit_uuid",
    keyValue: dbConn.prepare(
      "SELECT knowledge_audit_uuid FROM enterprise_knowledge_audit WHERE knowledge_article_uuid = ? AND action = ? LIMIT 1"
    ).get(promptGovernanceArticleUuid, "seeded")?.knowledge_audit_uuid || crypto.randomUUID(),
    uuidColumn: "knowledge_audit_uuid",
    values: {
      knowledge_article_uuid: promptGovernanceArticleUuid,
      knowledge_version_uuid: promptGovernanceVersionUuid,
      action: "seeded",
      actor_type: "migration",
      actor_id: "phase-3-milestone-3.2-corrective",
      metadata_json: json({ baseline: true, promptGovernance: true }, {}),
      occurred_at: nowIso()
    }
  });
}

function seedPromptGovernance(dbConn, report) {
  const profiles = [
    ["reception-ai-customer-response", "Reception AI Customer Response", "customer_communication", "customer_success", "communication"],
    ["document-ai-review-brief", "Document AI Review Brief", "document_review", "operations", "verification"],
    ["executive-ai-briefing", "Executive AI Briefing", "executive_summary", "executive_office", "analytics"]
  ];

  for (const [promptKey, promptName, promptScope, ownerId, promptCategory] of profiles) {
    const profileUuid = upsertSeed(dbConn, report, {
      table: "enterprise_prompt_profiles",
      keyColumn: "prompt_key",
      keyValue: promptKey,
      uuidColumn: "prompt_profile_uuid",
      values: {
        prompt_name: promptName,
        prompt_scope: promptScope,
        prompt_owner_type: "department",
        prompt_owner_id: ownerId,
        prompt_category: promptCategory,
        prompt_status: "Published",
        prompt_lifecycle: "Published",
        current_version_number: 1,
        asset_version: 1,
        metadata_json: json({
          hardcodedPromptAllowed: false,
          runtimeEnabled: false
        }, {})
      }
    });
    const templateUuid = upsertSeed(dbConn, report, {
      table: "enterprise_prompt_templates",
      keyColumn: "prompt_template_uuid",
      keyValue: dbConn.prepare(
        "SELECT prompt_template_uuid FROM enterprise_prompt_templates WHERE prompt_profile_uuid = ? AND template_key = 'default'"
      ).get(profileUuid)?.prompt_template_uuid || crypto.randomUUID(),
      uuidColumn: "prompt_template_uuid",
      values: {
        prompt_profile_uuid: profileUuid,
        template_key: "default",
        channel_scope: "Future Channel",
        persona_scope: "enterprise",
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          metadataOnly: true,
          executionEngine: "not_implemented"
        }, {})
      }
    });
    upsertSeed(dbConn, report, {
      table: "enterprise_prompt_versions",
      keyColumn: "prompt_version_uuid",
      keyValue: dbConn.prepare(
        "SELECT prompt_version_uuid FROM enterprise_prompt_versions WHERE prompt_profile_uuid = ? AND version_number = 1 LIMIT 1"
      ).get(profileUuid)?.prompt_version_uuid || crypto.randomUUID(),
      uuidColumn: "prompt_version_uuid",
      values: {
        prompt_profile_uuid: profileUuid,
        prompt_template_uuid: templateUuid,
        version_number: 1,
        prompt_status: "Published",
        prompt_policy_json: json({
          governedAsset: true,
          freeTextPromptingAllowed: false
        }, {}),
        prompt_text: "",
        metadata_json: json({
          placeholderOnly: true
        }, {})
      }
    });
  }
}

function seedPersonas(dbConn, report) {
  const personas = [
    ["reception-ai", "Reception AI", "Reception AI", "customer_success", ["customer_success"], ["Website Chat", "WhatsApp", "Phone"]],
    ["customer-support-ai", "Customer Support AI", "Customer Support AI", "customer_success", ["customer_success"], ["Website Chat", "WhatsApp", "Email"]],
    ["document-ai", "Document AI", "Document AI", "operations", ["operations"], ["Document"]],
    ["verification-ai", "Verification AI", "Verification AI", "compliance", ["compliance"], ["Document"]],
    ["operator-ai", "Operator AI", "Operator AI", "operations", ["operations"], ["Website Chat"]],
    ["executive-ai", "Executive AI", "Executive AI", "executive_office", ["analytics", "executive_office"], ["System"]],
    ["whatsapp-ai", "WhatsApp AI", "WhatsApp AI", "customer_success", ["customer_success"], ["WhatsApp"]],
    ["email-ai", "Email AI", "Email AI", "customer_success", ["customer_success"], ["Email"]],
    ["voice-ai", "Voice AI", "Voice AI", "customer_success", ["customer_success"], ["Phone"]],
    ["analytics-ai", "Analytics AI", "Analytics AI", "analytics", ["analytics"], ["System"]]
  ];
  for (const [personaKey, personaName, personaType, ownerId, domains, channels] of personas) {
    const personaUuid = upsertSeed(dbConn, report, {
      table: "enterprise_personas",
      keyColumn: "persona_key",
      keyValue: personaKey,
      uuidColumn: "persona_uuid",
      values: {
        persona_name: personaName,
        persona_type: personaType,
        persona_status: "Published",
        persona_owner_type: "department",
        persona_owner_id: ownerId,
        persona_scope: "enterprise",
        persona_parent: "enterprise-ai-baseline",
        persona_traits_json: json(["governed", "explainable", "human_boundary"], []),
        persona_shared_assets_json: json(["knowledge", "prompts", "capabilities", "tools", "safety", "approvals"], []),
        persona_supported_domains_json: json(domains, []),
        persona_supported_channels_json: json(channels, []),
        lifecycle_status: "Published",
        current_version_number: 1,
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false,
          duplicateAssetsForbidden: true
        }, {})
      }
    });
    upsertSeed(dbConn, report, {
      table: "enterprise_persona_versions",
      keyColumn: "persona_version_uuid",
      keyValue: dbConn.prepare(
        "SELECT persona_version_uuid FROM enterprise_persona_versions WHERE persona_uuid = ? AND version_number = 1"
      ).get(personaUuid)?.persona_version_uuid || crypto.randomUUID(),
      uuidColumn: "persona_version_uuid",
      values: {
        persona_uuid: personaUuid,
        version_number: 1,
        persona_capabilities_json: json([], []),
        persona_permissions_json: json([], []),
        lifecycle_status: "Published",
        metadata_json: json({
          placeholderVersion: true
        }, {})
      }
    });
  }
}

function seedMemoryAndCapabilities(dbConn, report) {
  const memoryClasses = [
    ["permanent", "Permanent Memory"],
    ["knowledge", "Knowledge Memory"],
    ["customer", "Customer Memory"],
    ["workflow", "Workflow Memory"],
    ["conversation", "Conversation Memory"],
    ["operational", "Operational Memory"],
    ["temporary", "Temporary Session Memory"],
    ["reference", "Reference Memory"]
  ];
  for (const [memoryClassKey, displayName] of memoryClasses) {
    upsertSeed(dbConn, report, {
      table: "enterprise_memory_classes",
      keyColumn: "memory_class_key",
      keyValue: memoryClassKey,
      uuidColumn: "memory_class_uuid",
      values: {
        display_name: displayName,
        description: `${displayName} governed metadata baseline.`,
        mutability_class: memoryClassKey === "temporary" ? "ephemeral" : "governed",
        retention_class: "policy_defined",
        sensitivity_class: memoryClassKey === "customer" ? "restricted" : "internal",
        provenance_requirement: "required",
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false
        }, {})
      }
    });
  }

  const capabilities = [
    ["document_collection", "Document Collection", "Document Collection"],
    ["form_filling", "Form Filling", "Form Filling"],
    ["verification_review", "Verification", "Verification"],
    ["conversation_response", "Conversation", "Conversation"],
    ["payment_preparation", "Payments", "Payments"],
    ["notification_preparation", "Notifications", "Notifications"],
    ["browser_automation_reserved", "Browser Automation", "Browser Automation"],
    ["government_portal_preparation", "Government Portals", "Government Portals"],
    ["human_handoff", "Human Handoff", "Human Handoff"]
  ];
  for (const [capabilityKey, capabilityName, capabilityType] of capabilities) {
    upsertSeed(dbConn, report, {
      table: "enterprise_capabilities",
      keyColumn: "capability_key",
      keyValue: capabilityKey,
      uuidColumn: "capability_uuid",
      values: {
        capability_name: capabilityName,
        capability_type: capabilityType,
        required_permissions_json: json([], []),
        required_modules_json: json([], []),
        required_knowledge_json: json(["knowledge_base"], []),
        required_tools_json: json([], []),
        capability_preconditions_json: json([], []),
        capability_prohibited_conditions_json: json([], []),
        capability_expected_outputs_json: json([], []),
        capability_required_approval: null,
        capability_allowed_personas_json: json([], []),
        capability_audit_policy_json: json({ required: true }, {}),
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false
        }, {})
      }
    });
  }
}

function seedToolsAndPolicies(dbConn, report) {
  const tools = [
    ["playwright", "Playwright", "browser_automation"],
    ["government-portals", "Government Portals", "portal"],
    ["ocr", "OCR", "document_processing"],
    ["whatsapp", "WhatsApp", "communication"],
    ["sms", "SMS", "communication"],
    ["email", "Email", "communication"],
    ["payment", "Payment", "payment"],
    ["scanner", "Scanner", "device"],
    ["printer", "Printer", "device"],
    ["camera", "Camera", "device"],
    ["browser", "Browser", "browser"]
  ];
  for (const [toolKey, toolName, toolType] of tools) {
    upsertSeed(dbConn, report, {
      table: "enterprise_tools",
      keyColumn: "tool_key",
      keyValue: toolKey,
      uuidColumn: "tool_uuid",
      values: {
        tool_name: toolName,
        tool_type: toolType,
        tool_provider_class: "generic",
        tool_scope: "enterprise",
        tool_permissions_json: json([], []),
        credential_class: "governed",
        environment_scope: "future_runtime",
        provider_contract_version: "v1",
        data_sensitivity: "internal",
        risk_class: toolType === "payment" ? "high" : "medium",
        approval_requirement: toolType === "payment" ? "MANUAL_APPROVAL" : "policy_defined",
        audit_requirement: "required",
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false
        }, {})
      }
    });
  }

  const approvalPolicies = [
    ["auto", "AUTO"],
    ["auto-with-notification", "AUTO_WITH_NOTIFICATION"],
    ["manual-approval", "MANUAL_APPROVAL"],
    ["dual-approval", "DUAL_APPROVAL"],
    ["owner-only", "OWNER_ONLY"],
    ["admin-only", "ADMIN_ONLY"]
  ];
  for (const [approvalKey, approvalClass] of approvalPolicies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_approval_policies",
      keyColumn: "approval_policy_key",
      keyValue: approvalKey,
      uuidColumn: "approval_policy_uuid",
      values: {
        approval_class: approvalClass,
        approver_role_class: approvalClass === "OWNER_ONLY" ? "owner" : approvalClass === "ADMIN_ONLY" ? "admin" : "governed_role",
        approval_expiry: "policy_defined",
        override_reason: approvalClass.includes("APPROVAL") ? "required" : "optional",
        escalation_path_json: json([], []),
        separation_of_duties_class: approvalClass === "DUAL_APPROVAL" ? "dual_control" : "single_control",
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false
        }, {})
      }
    });
  }

  const confidencePolicies = [
    ["informational", 0.25, "Low", 10, 0],
    ["operational", 0.6, "Medium", 50, 1],
    ["sensitive", 0.85, "High", 80, 1]
  ];
  for (const [policyKey, threshold, confidenceClass, minimumSourceAuthority, approvalRequiredBelowThreshold] of confidencePolicies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_confidence_policies",
      keyColumn: "confidence_policy_key",
      keyValue: policyKey,
      uuidColumn: "confidence_policy_uuid",
      values: {
        confidence_threshold: threshold,
        confidence_class: confidenceClass,
        minimum_source_authority: minimumSourceAuthority,
        approval_required_below_threshold: approvalRequiredBelowThreshold,
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false
        }, {})
      }
    });
  }

  const actionPolicies = [
    ["customer-communication-draft", "Customer Communication", "MANUAL_APPROVAL"],
    ["payment-preparation", "Payment Preparation", "MANUAL_APPROVAL"],
    ["government-submission-preparation", "Government Submission Preparation", "DUAL_APPROVAL"],
    ["document-verification-recommendation", "Document Verification Recommendation", "MANUAL_APPROVAL"],
    ["human-handoff-request", "Human Handoff Request", "AUTO_WITH_NOTIFICATION"]
  ];
  for (const [actionPolicyKey, actionType, requiredApprovalClass] of actionPolicies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_action_policies",
      keyColumn: "action_policy_key",
      keyValue: actionPolicyKey,
      uuidColumn: "action_policy_uuid",
      values: {
        action_type: actionType,
        required_capabilities_json: json([], []),
        required_tools_json: json([], []),
        required_approval_class: requiredApprovalClass,
        allowed_persona_types_json: json([], []),
        preconditions_json: json([], []),
        forbidden_conditions_json: json([], []),
        reversibility_class: actionType.includes("Submission") ? "irreversible" : "human_defined",
        audit_requirement: "required",
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false
        }, {})
      }
    });
  }
}

function seedSafetyAndContext(dbConn, report) {
  const safetyPolicies = [
    ["human-required", "Human Approval", 1, 0, 0, 0, 0, 1, 0],
    ["financial-operation", "Financial", 1, 1, 0, 0, 0, 1, 1],
    ["identity-operation", "Identity", 1, 0, 1, 0, 0, 1, 1],
    ["legal-operation", "Legal", 1, 0, 0, 1, 0, 1, 1],
    ["government-operation", "Government", 1, 0, 0, 0, 1, 1, 1],
    ["sensitive-operation", "Sensitive", 1, 0, 0, 0, 0, 1, 1],
    ["never-auto", "Never Auto", 1, 0, 0, 0, 0, 1, 1],
    ["external-communication", "External Communication", 1, 0, 0, 0, 0, 1, 1],
    ["irreversible-action", "Irreversible Action", 1, 0, 0, 0, 0, 1, 1],
    ["bulk-operation", "Bulk Operation", 1, 0, 0, 0, 0, 1, 1],
    ["regulated-data", "Regulated Data", 1, 0, 0, 0, 0, 1, 1],
    ["reputation-risk", "Reputation Risk", 1, 0, 0, 0, 0, 1, 1]
  ];
  for (const [policyKey, safetyClassName, humanRequired, financialFlag, identityFlag, legalFlag, governmentFlag, sensitiveFlag, neverAutoFlag] of safetyPolicies) {
    upsertSeed(dbConn, report, {
      table: "enterprise_safety_policies",
      keyColumn: "safety_policy_key",
      keyValue: policyKey,
      uuidColumn: "safety_policy_uuid",
      values: {
        safety_class_name: safetyClassName,
        human_required: humanRequired,
        financial_operation_flag: financialFlag,
        identity_operation_flag: identityFlag,
        legal_operation_flag: legalFlag,
        government_operation_flag: governmentFlag,
        sensitive_operation_flag: sensitiveFlag,
        never_auto_flag: neverAutoFlag,
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false
        }, {})
      }
    });
  }

  const contextProfiles = [
    ["customer-support-context", "customer_support", 40, ["customer_360", "omnichannel", "knowledge_base"], "restricted"],
    ["document-review-context", "document_review", 30, ["document_intelligence", "service_dna", "knowledge_base"], "restricted"],
    ["operations-context", "operations", 50, ["order_orchestration", "service_dna", "workforce"], "internal"],
    ["executive-context", "executive", 60, ["executive_layer", "workforce", "order_orchestration"], "internal"]
  ];
  for (const [profileKey, contextScope, contextPriority, contextSourceReference, contextPrivacyClass] of contextProfiles) {
    upsertSeed(dbConn, report, {
      table: "enterprise_context_profiles",
      keyColumn: "profile_key",
      keyValue: profileKey,
      uuidColumn: "context_profile_uuid",
      values: {
        context_scope: contextScope,
        context_priority: contextPriority,
        context_source_reference_json: json(contextSourceReference, []),
        context_resolution_policy: "governed_resolution",
        context_privacy_class: contextPrivacyClass,
        context_freshness: "policy_defined",
        context_owner: "knowledge",
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false,
          independentAssemblyAllowed: false
        }, {})
      }
    });
  }
}

function seedSourceHierarchyAndContracts(dbConn, report) {
  const hierarchyRows = [
    ["government_rules", "Government Rules", 10, 100],
    ["company_policies", "Company Policies", 20, 90],
    ["service_dna", "Service DNA", 30, 85],
    ["knowledge_base", "Knowledge Base", 40, 80],
    ["customer_360", "Customer 360", 50, 75],
    ["order_orchestration", "Order Orchestration", 60, 70],
    ["document_intelligence", "Document Intelligence", 70, 68],
    ["omnichannel", "Omnichannel", 80, 65],
    ["workforce", "Workforce", 90, 60],
    ["executive_layer", "Executive Layer", 100, 55],
    ["ai_generated_draft", "AI Generated Draft", 110, 20],
    ["ai_assumptions", "AI Assumptions", 120, 5]
  ];
  for (const [sourceCode, sourceName, priorityRank, authorityLevel] of hierarchyRows) {
    upsertSeed(dbConn, report, {
      table: "enterprise_source_hierarchy",
      keyColumn: "source_code",
      keyValue: sourceCode,
      uuidColumn: "source_hierarchy_uuid",
      values: {
        source_name: sourceName,
        priority_rank: priorityRank,
        authority_level: authorityLevel,
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          reasoningSource: true
        }, {})
      }
    });
  }

  upsertSeed(dbConn, report, {
    table: "enterprise_multi_agent_profiles",
    keyColumn: "coordination_key",
    keyValue: "shared-enterprise-coordination-baseline",
    uuidColumn: "coordination_uuid",
    values: {
      request_owner_type: "system",
      agent_roles_json: json(["request_owner", "specialist", "reviewer"], []),
      delegation_policy_json: json({ runtimeEnabled: false }, {}),
      handoff_policy_json: json({ runtimeEnabled: false }, {}),
      completion_policy_json: json({ runtimeEnabled: false }, {}),
      lifecycle_status: "Published",
      asset_version: 1,
      metadata_json: json({
        runtimeEnabled: false
      }, {})
    }
  });

  const contracts = [
    ["single-source-of-intelligence", "Single Source of Intelligence"],
    ["governed-metadata-immutable-by-default", "Governed Metadata Immutable by Default"],
    ["no-duplicate-prompts", "No Duplicate Prompts"],
    ["no-duplicate-knowledge", "No Duplicate Knowledge"],
    ["no-duplicate-personas", "No Duplicate Personas"],
    ["no-duplicate-capabilities", "No Duplicate Capabilities"],
    ["no-duplicate-tools", "No Duplicate Tools"],
    ["no-duplicate-safety-policies", "No Duplicate Safety Policies"],
    ["no-duplicate-approval-policies", "No Duplicate Approval Policies"],
    ["no-duplicate-context-models", "No Duplicate Context Models"],
    ["shared-ai-office-assets", "Shared AI Office Assets"]
  ];
  for (const [contractKey, contractName] of contracts) {
    upsertSeed(dbConn, report, {
      table: "enterprise_intelligence_contracts",
      keyColumn: "contract_key",
      keyValue: contractKey,
      uuidColumn: "contract_uuid",
      values: {
        contract_name: contractName,
        contract_scope: "enterprise",
        lifecycle_status: "Published",
        asset_version: 1,
        metadata_json: json({
          runtimeEnabled: false
        }, {})
      }
    });
  }
}

function seedDecisionAndObservationPlaceholders(dbConn, report) {
  upsertSeed(dbConn, report, {
    table: "enterprise_decisions",
    keyColumn: "decision_uuid",
    keyValue: dbConn.prepare("SELECT decision_uuid FROM enterprise_decisions WHERE decision_type = 'governance_placeholder' LIMIT 1").get()?.decision_uuid || crypto.randomUUID(),
    uuidColumn: "decision_uuid",
    values: {
      decision_type: "governance_placeholder",
      decision_source: "enterprise_intelligence_contracts",
      decision_reason: "Metadata-only placeholder to reserve explainable enterprise decision records.",
      decision_confidence: null,
      confidence_policy_uuid: null,
      knowledge_reference_json: json(["enterprise-intelligence-governance-baseline"], []),
      workflow_reference: null,
      customer_reference: null,
      approval_class: null,
      action_policy_uuid: null,
      lifecycle_status: "Draft",
      metadata_json: json({ runtimeEnabled: false, placeholder: true }, {})
    }
  });

  upsertSeed(dbConn, report, {
    table: "enterprise_observations",
    keyColumn: "observation_uuid",
    keyValue: dbConn.prepare("SELECT observation_uuid FROM enterprise_observations WHERE observation_type = 'governance_placeholder' LIMIT 1").get()?.observation_uuid || crypto.randomUUID(),
    uuidColumn: "observation_uuid",
    values: {
      observation_type: "governance_placeholder",
      observation_source: "enterprise_intelligence_contracts",
      observation_confidence: null,
      observation_status: "Draft",
      observation_promoted_to_knowledge: 0,
      lifecycle_status: "Draft",
      metadata_json: json({ runtimeEnabled: false, placeholder: true }, {})
    }
  });
}

function syncEnterpriseIntelligenceFoundation(options = {}) {
  const dbConn = options.dbConn || require("./db").getDb();
  const report = createReport();
  try {
    seedKnowledge(dbConn, report);
    seedPromptGovernance(dbConn, report);
    seedPersonas(dbConn, report);
    seedMemoryAndCapabilities(dbConn, report);
    seedToolsAndPolicies(dbConn, report);
    seedSafetyAndContext(dbConn, report);
    seedSourceHierarchyAndContracts(dbConn, report);
    seedDecisionAndObservationPlaceholders(dbConn, report);
    report.finishedAt = nowIso();
    writeReport(report, options.reportPath);
    return report;
  } catch (error) {
    addFailure(report, "enterprise_intelligence_foundation", "foundation", error);
    report.finishedAt = nowIso();
    writeReport(report, options.reportPath);
    throw error;
  }
}

module.exports = {
  syncEnterpriseIntelligenceFoundation
};
