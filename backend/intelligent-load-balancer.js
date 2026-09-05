/**
 * EROS Intelligent Load Balancer
 * Phase 16.4 Implementation
 *
 * Branch-aware routing, queue-aware routing, AI workload balancing,
 * predictive load distribution, and regional failover routing.
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class IntelligentLoadBalancer {
  constructor() {
    this.name = "IntelligentLoadBalancer";
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableIntelligentLoadBalancer", branchId);
    if (!flagEnabled) {
      throw new Error(`Intelligent Load Balancer capabilities are disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  /**
   * Determine optimal routing for a request across available branches.
   * @param {Object} req - Request with session token
   * @param {string} branchId - Originating branch
   * @param {Array} branchPool - Available branches [{id, queueDepth, healthScore, region}]
   * @param {Object} requestContext - {taskType, priority, region}
   * @returns {Object} Routing decision
   */
  async routeRequest(req, branchId, branchPool, requestContext = {}) {
    this.verifyAccess(req, branchId, "services:read");

    if (!branchPool || branchPool.length === 0) {
      return { targetBranch: branchId, strategy: "fallback_self", reason: "No branch pool available" };
    }

    // Filter healthy branches
    let candidates = branchPool.filter(b => b.healthScore > 50);

    // Regional preference
    if (requestContext.region) {
      const regional = candidates.filter(b => b.region === requestContext.region);
      if (regional.length > 0) candidates = regional;
    }

    // Sort by least-loaded (lowest queueDepth) then highest health
    candidates.sort((a, b) => {
      if (a.queueDepth !== b.queueDepth) return a.queueDepth - b.queueDepth;
      return b.healthScore - a.healthScore;
    });

    const target = candidates[0];
    const strategy = target.id === branchId ? "local_optimal" : "cross_branch_rebalance";

    erosRuntime.publish("LOAD_BALANCED", {
      branchId,
      targetBranch: target.id,
      strategy,
      queueDepth: target.queueDepth
    });

    return {
      targetBranch: target.id,
      strategy,
      reason: `Routed to ${target.id} (queue: ${target.queueDepth}, health: ${target.healthScore})`,
      candidates: candidates.length
    };
  }

  /**
   * Failover routing when primary branch is degraded.
   */
  async failover(req, branchId, failoverPool) {
    this.verifyAccess(req, branchId, "services:read");

    const healthy = failoverPool.filter(b => b.healthScore > 70 && b.id !== branchId);
    if (healthy.length === 0) {
      return { failoverTarget: null, status: "no_failover_available" };
    }

    healthy.sort((a, b) => b.healthScore - a.healthScore);
    return { failoverTarget: healthy[0].id, status: "failover_ready", healthScore: healthy[0].healthScore };
  }
}

module.exports = new IntelligentLoadBalancer();
