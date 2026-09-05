/**
 * EROS Enterprise Resilience Manager
 * Phase 16.4 Implementation
 *
 * Circuit breakers, retry strategies, graceful degradation,
 * regional failover, disaster coordination, and recovery orchestration.
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class ResilienceManager {
  constructor() {
    this.name = "ResilienceManager";
    this.circuitBreakers = new Map(); // serviceKey -> {state, failureCount, lastFailure, resetAt}
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableResilienceManager", branchId);
    if (!flagEnabled) {
      throw new Error(`Resilience Manager capabilities are disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  /**
   * Check or update circuit breaker state for a service.
   * @param {Object} req - Request with session token
   * @param {string} branchId - Target branch
   * @param {string} serviceKey - Service identifier
   * @param {string} outcome - "success" | "failure"
   * @returns {Object} Circuit breaker state
   */
  async evaluateCircuitBreaker(req, branchId, serviceKey, outcome) {
    this.verifyAccess(req, branchId, "services:read");

    let breaker = this.circuitBreakers.get(serviceKey);
    if (!breaker) {
      breaker = { state: "closed", failureCount: 0, lastFailure: null, resetAt: null };
      this.circuitBreakers.set(serviceKey, breaker);
    }

    if (outcome === "failure") {
      breaker.failureCount += 1;
      breaker.lastFailure = Date.now();

      // Open circuit after 3 consecutive failures
      if (breaker.failureCount >= 3) {
        breaker.state = "open";
        breaker.resetAt = Date.now() + 30000; // 30s cooldown

        erosRuntime.publish("RESILIENCE_ACTIVATED", {
          branchId, serviceKey, action: "circuit_opened", failureCount: breaker.failureCount
        });
      }
    } else if (outcome === "success") {
      // Reset on success
      if (breaker.state === "half-open") {
        breaker.state = "closed";
        breaker.failureCount = 0;
      } else if (breaker.state === "closed") {
        breaker.failureCount = 0;
      }
    }

    // Check if cooldown expired (transition to half-open)
    if (breaker.state === "open" && breaker.resetAt && Date.now() > breaker.resetAt) {
      breaker.state = "half-open";
    }

    return { serviceKey, ...breaker };
  }

  /**
   * Determine retry strategy for a failed operation.
   */
  async getRetryStrategy(req, branchId, operationType) {
    this.verifyAccess(req, branchId, "services:read");

    const strategies = {
      "api_call": { maxRetries: 3, backoffMs: 1000, strategy: "exponential" },
      "queue_processing": { maxRetries: 5, backoffMs: 500, strategy: "linear" },
      "database_write": { maxRetries: 2, backoffMs: 2000, strategy: "exponential" },
      "default": { maxRetries: 3, backoffMs: 1000, strategy: "exponential" }
    };

    return strategies[operationType] || strategies["default"];
  }

  /**
   * Determine graceful degradation response for a failing module.
   */
  async degrade(req, branchId, moduleName) {
    this.verifyAccess(req, branchId, "services:read");

    const degradationMap = {
      "ai-workforce": { fallback: "manual_operator_queue", priority: "high" },
      "payment-service": { fallback: "offline_payment_collection", priority: "critical" },
      "predictive-intelligence": { fallback: "static_historical_averages", priority: "low" },
      "default": { fallback: "queue_for_later", priority: "medium" }
    };

    const plan = degradationMap[moduleName] || degradationMap["default"];

    erosRuntime.publish("RESILIENCE_ACTIVATED", {
      branchId, serviceKey: moduleName, action: "graceful_degradation", fallback: plan.fallback
    });

    return { moduleName, ...plan, activatedAt: Date.now() };
  }
}

module.exports = new ResilienceManager();
