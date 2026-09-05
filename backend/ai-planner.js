/**
 * EROS AI Planner Service
 * Phase 16.2 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class AIPlanner {
  constructor() {
    this.name = "AIPlanner";
  }

  // Enforce flag and RBAC
  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableAIPlanning", branchId);
    if (!flagEnabled) {
      throw new Error(`AI Planning capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async generatePlan(req, branchId, goalDescription, context = {}) {
    const user = this.verifyAccess(req, branchId, "services:read");
    const planId = Math.random().toString(36).substring(7);

    // 1. Break goal into tasks
    const tasks = [
      { id: `${planId}-1`, title: "Verify customer document OCR fields", status: "pending", dependencies: [] },
      { id: `${planId}-2`, title: "Run image quality blur assessment", status: "pending", dependencies: [`${planId}-1`] },
      { id: `${planId}-3`, title: "Process checkout gateway callback", status: "pending", dependencies: [`${planId}-2`] }
    ];

    // 2. Identify blockers and recommend escalations
    let blocker = null;
    let recommendation = "proceed";
    if (context.hasCorruptedFiles) {
      blocker = "Corrupted pdf document file upload";
      recommendation = "recommend_manual_operator_escalation";
    }

    // 3. Estimate completion time (in minutes)
    const estimatedMinutes = context.riskProfile === "high" ? 45 : 15;

    const plan = {
      planId,
      goal: goalDescription,
      tasks,
      blocker,
      recommendation,
      estimatedMinutes,
      createdBy: user.id
    };

    erosRuntime.publish("AI_PLAN_CREATED", { planId, goal: goalDescription, branchId });
    return plan;
  }

  async completePlan(req, branchId, planId) {
    this.verifyAccess(req, branchId, "services:read");
    erosRuntime.publish("AI_PLAN_COMPLETED", { planId, branchId });
    return { success: true, planId };
  }
}

module.exports = new AIPlanner();
