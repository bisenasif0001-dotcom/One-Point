/**
 * EROS Public API Gateway
 * Phase 17.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class PublicAPIGateway {
  constructor() {
    this.rateLimitStore = new Map(); // apiKey -> requestCounts
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enablePublicAPI", branchId);
    if (!flagEnabled) {
      throw new Error(`Public API Gateway is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async handleRequest(req, branchId, apiVersion, apiKey, resourcePath) {
    this.verifyAccess(req, branchId, "services:read");

    // Version validation check
    if (apiVersion !== "v1" && apiVersion !== "v2") {
      throw new Error(`Unsupported API version: ${apiVersion}`);
    }

    // API Key validation
    if (!apiKey || !apiKey.startsWith("KEY-")) {
      throw new Error("Invalid API Key");
    }

    // Rate Limiting check (Simulate max 5 requests per block window)
    const windowStart = Math.floor(Date.now() / 10000) * 10000;
    const rateKey = `${apiKey}:${windowStart}`;
    const requests = this.rateLimitStore.get(rateKey) || 0;

    if (requests >= 5) {
      erosRuntime.publish("API_RATE_LIMITED", { apiKey, branchId, resourcePath });
      throw new Error("Rate limit exceeded. Maximum 5 requests per 10 seconds.");
    }

    this.rateLimitStore.set(rateKey, requests + 1);
    erosRuntime.publish("API_REQUEST", { apiKey, branchId, apiVersion, resourcePath });

    return {
      status: "success",
      apiVersion,
      resourcePath,
      payload: { branchId, centerStatus: "online" }
    };
  }
}

module.exports = new PublicAPIGateway();
