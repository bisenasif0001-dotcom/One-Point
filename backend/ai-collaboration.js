/**
 * EROS Agent Collaboration Runtime
 * Phase 16.2 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class AICollaboration {
  constructor() {
    this.name = "AICollaboration";
    this.messageHistory = [];
  }

  // Enforce flag and RBAC
  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableAICollaboration", branchId);
    if (!flagEnabled) {
      throw new Error(`AI Collaboration capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async sendMessage(req, branchId, sender, receiver, messageText, options = {}) {
    const user = this.verifyAccess(req, branchId, "services:read");
    const messageId = Math.random().toString(36).substring(7);

    const msg = {
      messageId,
      sender,
      receiver,
      text: messageText,
      timestamp: Date.now(),
      sentBy: user.id
    };

    this.messageHistory.push(msg);
    erosRuntime.publish("AI_AGENT_MESSAGE", { messageId, sender, receiver, branchId });
    return msg;
  }

  // Delegation
  async delegateTask(req, branchId, fromAgent, toAgent, taskId) {
    this.verifyAccess(req, branchId, "services:read");
    erosRuntime.publish("AI_TASK_ASSIGNED", { taskId, assignedTo: toAgent, assignedBy: fromAgent, branchId });
    return { success: true, fromAgent, toAgent, taskId };
  }

  // Consensus & Conflict resolution
  async resolveConflict(req, branchId, taskContext, votes) {
    this.verifyAccess(req, branchId, "services:read");

    // Simple consensus: majority voting
    const counts = {};
    votes.forEach(v => { counts[v.vote] = (counts[v.vote] || 0) + 1; });

    let consensusDecision = null;
    let maxVotes = 0;
    for (const [decision, count] of Object.entries(counts)) {
      if (count > maxVotes) {
        maxVotes = count;
        consensusDecision = decision;
      }
    }

    // If consensus fails, escalate
    if (maxVotes <= votes.length / 2) {
      erosRuntime.publish("AI_AGENT_ESCALATED", { taskContext, reason: "consensus_failure", branchId });
      return { status: "escalated", consensusDecision: null };
    }

    return { status: "resolved", consensusDecision };
  }
}

module.exports = new AICollaboration();
