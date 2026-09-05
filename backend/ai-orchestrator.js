/**
 * EROS AI Workforce Orchestration Layer
 * Phase 16.1 Implementation Core
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

// Require agent modules
const customerAgent = require('./customer-agent');
const documentAgent = require('./document-agent');
const workflowAgent = require('./workflow-agent');
const operationsAgent = require('./operations-agent');
const executiveAgent = require('./executive-agent');
const knowledgeAgent = require('./knowledge-agent');

class AIOrchestrator {
  constructor() {
    this.agents = {
      customer: { agent: customerAgent, flag: "enableCustomerAgent", permission: "services:read" },
      document: { agent: documentAgent, flag: "enableDocumentAgent", permission: "services:read" },
      workflow: { agent: workflowAgent, flag: "enableWorkflowAgent", permission: "services:read" },
      operations: { agent: operationsAgent, flag: "enableAISuggestions", permission: "workflows:read" },
      executive: { agent: executiveAgent, flag: "enableExecutiveAgent", permission: "workflows:write" },
      knowledge: { agent: knowledgeAgent, flag: "enableKnowledgeAgent", permission: "services:read" }
    };
  }

  // 1. Prompt Sanitizer (prevents injection and blocks secrets)
  sanitizePrompt(text) {
    if (typeof text !== "string") return text;
    // Strip common prompt injection patterns
    let clean = text.replace(/ignore previous instructions|system prompt|override security/gi, "[REDACTED_INJECTION_PATTERN]");
    // Strip common secret patterns
    clean = clean.replace(/key-[a-zA-Z0-9]{16,}/g, "[REDACTED_SECRET]");
    return clean;
  }

  // 2. Main Routing Orchestrator
  async dispatch(req, branchId, agentKey, action, payload, options = {}) {
    const correlationId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    // Publish request arrival
    erosRuntime.publish("AI_REQUEST", { correlationId, branchId, agentKey, action });

    try {
      // A. Look up agent metadata
      const target = this.agents[agentKey];
      if (!target) {
        throw new Error(`Invalid agent key: ${agentKey}`);
      }

      // B. Enforce Feature Flag
      const flagEnabled = erosRuntime.isFeatureEnabled(target.flag, branchId);
      if (!flagEnabled) {
        throw new Error(`AI Agent ${agentKey} is disabled for branch ${branchId}`);
      }

      // C. Enforce RBAC Permissions
      const auth = permissionMiddleware(req, target.permission);
      if (!auth.authorized) {
        erosRuntime.publish("AI_PERMISSION_DENIED", { correlationId, user: auth.user, permission: target.permission });
        throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${target.permission}`);
      }

      erosRuntime.publish("AI_AGENT_SELECTED", { correlationId, agentKey });

      // D. Sanitize inputs
      let sanitizedPayload = payload;
      if (payload && typeof payload === "string") {
        sanitizedPayload = this.sanitizePrompt(payload);
      } else if (payload && typeof payload === "object") {
        sanitizedPayload = JSON.parse(JSON.stringify(payload));
        if (sanitizedPayload.query) sanitizedPayload.query = this.sanitizePrompt(sanitizedPayload.query);
      }

      // E. Execute call with timeout handling
      const timeoutMs = options.timeoutMs || 2000; // 2 seconds default timeout
      
      const executionPromise = (async () => {
        if (agentKey === "customer") {
          return await target.agent.handleQuery(sanitizedPayload);
        } else if (agentKey === "document") {
          return await target.agent.verifyDocument(sanitizedPayload, options.documentHistory || []);
        } else if (agentKey === "workflow") {
          return await target.agent.analyzeWorkflow(sanitizedPayload);
        } else if (agentKey === "operations") {
          return await target.agent.balanceWorkload(sanitizedPayload, options.operators || []);
        } else if (agentKey === "executive") {
          return await target.agent.getExecutiveBrief(sanitizedPayload);
        } else if (agentKey === "knowledge") {
          return await target.agent.retrieveDocumentation(sanitizedPayload.query);
        }
      })();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
      );

      const response = await Promise.race([executionPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      erosRuntime.publish("AI_RESPONSE", { correlationId, duration });
      erosRuntime.publish("AI_COMPLETED", { correlationId, duration });

      return {
        success: true,
        correlationId,
        durationMs: duration,
        response
      };

    } catch (err) {
      const duration = Date.now() - startTime;
      if (err.message === "AI_TIMEOUT") {
        erosRuntime.publish("AI_TIMEOUT", { correlationId, duration });
      } else {
        erosRuntime.publish("AI_ERROR", { correlationId, message: err.message });
      }
      return {
        success: false,
        correlationId,
        durationMs: duration,
        error: err.message
      };
    }
  }
}

module.exports = new AIOrchestrator();
