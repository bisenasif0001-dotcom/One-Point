/**
 * EROS Capacity Management Engine
 * Phase 16.4 Implementation
 *
 * CPU utilization monitoring, memory utilization,
 * queue capacity analysis, branch workload balancing,
 * and resource allocation recommendations.
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class CapacityManager {
  constructor() {
    this.name = "CapacityManager";
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableCapacityManager", branchId);
    if (!flagEnabled) {
      throw new Error(`Capacity Manager capabilities are disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  /**
   * Analyze branch capacity and generate resource recommendations.
   * @param {Object} req - Request with session token
   * @param {string} branchId - Target branch
   * @param {Object} metrics - {cpuPercent, memoryPercent, queueDepth, activeWorkers}
   * @returns {Object} Capacity analysis result
   */
  async analyzeCapacity(req, branchId, metrics) {
    this.verifyAccess(req, branchId, "services:read");

    const {
      cpuPercent = 0,
      memoryPercent = 0,
      queueDepth = 0,
      activeWorkers = 1
    } = metrics;

    let capacityStatus = "Normal";
    const warnings = [];
    const recommendations = [];

    // CPU utilization check
    if (cpuPercent > 85) {
      capacityStatus = "Critical";
      warnings.push("CPU utilization exceeds 85% threshold");
      recommendations.push("Scale horizontal workers or defer batch processing");
    } else if (cpuPercent > 70) {
      capacityStatus = "Warning";
      warnings.push("CPU utilization approaching threshold");
    }

    // Memory utilization check
    if (memoryPercent > 90) {
      capacityStatus = "Critical";
      warnings.push("Memory utilization exceeds 90% threshold");
      recommendations.push("Flush expired caches and reduce in-memory session stores");
    }

    // Queue depth check
    const tasksPerWorker = queueDepth / (activeWorkers || 1);
    if (tasksPerWorker > 20) {
      warnings.push("Queue depth per worker exceeds safe limit");
      recommendations.push("Activate standby AI workers or rebalance across branches");
    }

    if (warnings.length > 0) {
      erosRuntime.publish("CAPACITY_WARNING", { branchId, capacityStatus, warnings });
    }

    return {
      branchId,
      capacityStatus,
      cpuPercent,
      memoryPercent,
      queueDepth,
      tasksPerWorker: Math.round(tasksPerWorker * 100) / 100,
      warnings,
      recommendations,
      analyzedAt: Date.now()
    };
  }
}

module.exports = new CapacityManager();
