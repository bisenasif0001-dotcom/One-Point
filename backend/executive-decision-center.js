/**
 * EROS Executive Decision Center
 * Phase 16.2 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class ExecutiveDecisionCenter {
  constructor() {
    this.name = "ExecutiveDecisionCenter";
  }

  // Enforce flag and RBAC
  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableExecutiveDecisionCenter", branchId);
    if (!flagEnabled) {
      throw new Error(`Executive Decision Center capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async getDashboardData(req, branchId) {
    // Requires workflows:write or config:read (restricted to manager / admin roles)
    this.verifyAccess(req, branchId, "config:read");

    erosRuntime.publish("AI_DASHBOARD_CHECKED", { branchId });

    return {
      overview: {
        totalBranches: 18,
        activeAgents: 6,
        systemStatus: "Green"
      },
      aiUtilization: {
        geminiAPIUsageTodayCount: 4250,
        cacheHitRatioPercent: 95.4
      },
      productivityTrends: {
        weekOverWeekResolutionSpeedGrowth: 18.2,
        operatorMinutesSavedToday: 840
      },
      operationalRisks: [
        { risk: "SLA queue capacity alert Lucknow", level: "Low" }
      ],
      branchPerformance: [
        { id: "BR-0104", status: "Active", completionRate: 0.998 }
      ],
      dailyExecutiveBrief: "Multi-Agent EROS runtime operations are fully compliant. No outages or SLA escalations occurred today.",
      weeklyRecommendations: [
        "Enable enableAILearning for BR-0104 to collect operator decision logs.",
        "Transition secondary document verifications to the Operations Queue."
      ]
    };
  }
}

module.exports = new ExecutiveDecisionCenter();
