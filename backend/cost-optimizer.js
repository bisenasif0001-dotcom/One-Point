/**
 * EROS Enterprise Cost Optimizer
 * Phase 18.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class CostOptimizer {
  constructor() {
    this.name = "CostOptimizer";
  }

  verifyAccess(req, branchId, permission = "services:read") {
    // Relies on enableCloudControlPlane flag for cloud metrics
    const flagEnabled = erosRuntime.isFeatureEnabled("enableCloudControlPlane", branchId);
    if (!flagEnabled) {
      throw new Error(`Cost Optimizer capabilities are disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async calculateSavings(req, branchId, infrastructureMetrics) {
    this.verifyAccess(req, branchId, "services:read");

    const recommendations = [];
    let projectedSavingsUSD = 0.0;

    // Cache sizing optimization
    if (infrastructureMetrics.cacheHitRatePercent > 95) {
      recommendations.push("Reduce Redis standby nodes sizing to save compute allocations.");
      projectedSavingsUSD += 120.00;
    }

    // Storage tier optimization
    if (infrastructureMetrics.unusedStorageBytes > 50000000000) {
      recommendations.push("Transition log storage buckets to archive storage class.");
      projectedSavingsUSD += 80.00;
    }

    const optimization = {
      branchId,
      recommendations,
      projectedSavingsUSD,
      timestamp: Date.now()
    };

    erosRuntime.publish("COST_OPTIMIZATION_CREATED", { branchId, projectedSavingsUSD });
    return optimization;
  }
}

module.exports = new CostOptimizer();
