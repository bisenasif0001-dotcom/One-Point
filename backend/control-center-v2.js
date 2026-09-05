/**
 * EROS Enterprise Control Center v2
 * Phase 18.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class ControlCenterV2 {
  constructor() {
    this.name = "ControlCenterV2";
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableControlCenterV2", branchId);
    if (!flagEnabled) {
      throw new Error(`Control Center v2 is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async getGlobalMetrics(req, branchId) {
    this.verifyAccess(req, branchId, "services:read");

    erosRuntime.publish("CONTROL_CENTER_REFRESHED", { branchId });

    return {
      activeTenantsCount: 1420,
      totalRegionsCount: 2,
      averageGeoResponseTimeMs: 12.5,
      systemHealthScore: 99.8,
      financialKPIs: {
        totalRevenueTodayUSD: 24500,
        partnerShareTodayUSD: 4900
      },
      aiOperations: {
        dailyEvaluatedPromptsCount: 85400,
        policyViolationsLoggedCount: 3
      }
    };
  }
}

module.exports = new ControlCenterV2();
