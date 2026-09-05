/**
 * EROS Autonomous Operations Engine
 * Phase 16.3 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');
const approvalRuntime = require('./approval-runtime');

class AutonomousOperations {
  constructor() {
    this.name = "AutonomousOperations";
  }

  verifyAccess(req, branchId, permission = "services:read") {
    // Check EROS enableAISuggestions flag
    const flagEnabled = erosRuntime.isFeatureEnabled("enableAISuggestions", branchId);
    if (!flagEnabled) {
      throw new Error(`Autonomous Operations capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async analyzeAndOptimize(req, branchId, twinState) {
    this.verifyAccess(req, branchId, "services:read");

    let actionPlan = "proceed";
    let slaRiskForecast = "Low";

    // 1. Detect bottlenecks and SLA risks
    if (twinState.healthScore < 80 || twinState.capacityStatus === "Overloaded") {
      slaRiskForecast = "High";
      actionPlan = "reallocate_staffing_capacity";
    }

    return {
      branchId,
      slaRiskForecast,
      actionPlan,
      recommendedStaffingMinCount: twinState.capacityStatus === "Overloaded" ? 3 : 1
    };
  }

  // Enforces human oversight: No direct config edits allowed without Approval Gateway checks
  async executeConfigurationChange(req, branchId, changeDetails) {
    const user = this.verifyAccess(req, branchId, "config:read");
    const actionId = Math.random().toString(36).substring(7);

    // Block direct modification
    erosRuntime.publish("AUTONOMOUS_ACTION_BLOCKED", { actionId, changeDetails, branchId });

    // Request human approval through EROS Approval Gateway
    const approvalTicket = await approvalRuntime.requestApproval(req, branchId, "config_update", changeDetails);
    
    return {
      actionId,
      status: "blocked_pending_approval",
      approvalTicketId: approvalTicket.approvalId,
      brief: "Autonomous configuration modifications must be authorized by managers through the Approval Runtime."
    };
  }
}

module.exports = new AutonomousOperations();
