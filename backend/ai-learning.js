/**
 * EROS AI Learning Registry
 * Phase 16.2 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class AILearning {
  constructor() {
    this.name = "AILearning";
    this.decisionsStore = [];
    this.playbooksStore = new Map();
  }

  // Enforce flag and RBAC
  verifyAccess(req, branchId, permission = "services:read") {
    // Note: enableAILearning starts as false in featureFlags config
    const flagEnabled = erosRuntime.isFeatureEnabled("enableAILearning", branchId);
    if (!flagEnabled) {
      throw new Error(`AI Learning capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async recordDecision(req, branchId, agentName, decisionDetails, feedback = {}) {
    const user = this.verifyAccess(req, branchId, "services:read");
    const decisionId = Math.random().toString(36).substring(7);

    const record = {
      decisionId,
      agentName,
      decisionDetails,
      feedback,
      recordedBy: user.id,
      timestamp: Date.now()
    };

    this.decisionsStore.push(record);
    erosRuntime.publish("AI_DECISION_RECORDED", { decisionId, agentName, branchId });
    return record;
  }

  async createPlaybook(req, branchId, playbookKey, playbookSteps) {
    this.verifyAccess(req, branchId, "config:read");
    
    // Safety check: Playbooks do NOT modify active production configs/rules on EROS runtime
    const playbook = {
      playbookKey,
      steps: playbookSteps,
      created_at: new Date().toISOString()
    };

    this.playbooksStore.set(playbookKey, playbook);
    return playbook;
  }

  async getAgentEffectiveness(req, branchId, agentName) {
    this.verifyAccess(req, branchId, "services:read");
    const agentRecords = this.decisionsStore.filter(r => r.agentName === agentName);
    
    if (agentRecords.length === 0) {
      return { successRate: 1.0, count: 0 };
    }

    const successful = agentRecords.filter(r => r.feedback.rating >= 4 || r.feedback.success === true);
    return {
      successRate: successful.length / agentRecords.length,
      count: agentRecords.length
    };
  }
}

module.exports = new AILearning();
