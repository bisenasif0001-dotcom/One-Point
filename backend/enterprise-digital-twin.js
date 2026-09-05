/**
 * EROS Enterprise Digital Twin
 * Phase 16.3 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class EnterpriseDigitalTwin {
  constructor() {
    this.name = "EnterpriseDigitalTwin";
    this.branchesTwinState = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableDigitalTwin", branchId);
    if (!flagEnabled) {
      throw new Error(`Enterprise Digital Twin capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async updateState(req, branchId, operationalMetrics) {
    this.verifyAccess(req, branchId, "services:read");

    const {
      activeOperatorsCount = 1,
      queuedTasksCount = 0,
      completedTodayCount = 0,
      revenueToday = 0,
      slaViolationsCount = 0
    } = operationalMetrics;

    const workforceUtilization = Math.min(1.0, queuedTasksCount / (activeOperatorsCount * 5 || 1));
    const capacityStatus = queuedTasksCount > 50 ? "Overloaded" : (queuedTasksCount > 20 ? "High" : "Normal");
    const healthScore = Math.max(0, 100 - (slaViolationsCount * 20) - (workforceUtilization > 0.9 ? 10 : 0));

    const twinState = {
      branchId,
      workforceUtilization,
      capacityStatus,
      healthScore,
      simulatedQueueWaitMinutes: queuedTasksCount * 3,
      revenueToday,
      slaViolationsCount,
      updatedAt: Date.now()
    };

    this.branchesTwinState.set(branchId, twinState);
    erosRuntime.publish("DIGITAL_TWIN_UPDATED", { branchId, healthScore });
    return twinState;
  }

  async getState(req, branchId) {
    this.verifyAccess(req, branchId, "services:read");
    return this.branchesTwinState.get(branchId) || null;
  }
}

module.exports = new EnterpriseDigitalTwin();
