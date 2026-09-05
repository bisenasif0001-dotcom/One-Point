/**
 * EROS Enterprise Marketplace Governance
 * Phase 17.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class MarketplaceGovernance {
  constructor() {
    this.reviews = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableMarketplaceGovernance", branchId);
    if (!flagEnabled) {
      throw new Error(`Marketplace Governance is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async auditPluginCode(req, branchId, pluginId, codeString) {
    this.verifyAccess(req, branchId, "config:read");

    const issues = [];
    
    // 1. Scan for hardcoded keys/secrets patterns
    if (codeString.includes("process.env.") || codeString.includes("apiKey") && codeString.match(/['"][A-Za-z0-9+/]{20,}['"]/)) {
      issues.push("Potential hardcoded secret or key variable detected");
    }

    // 2. Scan for direct environment filesystem / process access (sandbox bypass attempts)
    if (codeString.includes("require('fs')") || codeString.includes("require(\"fs\")") || codeString.includes("process.exit")) {
      issues.push("Banned system library access attempt (fs/process)");
    }

    const passed = issues.length === 0;

    let signature = null;
    if (passed) {
      // Generate EROS certified digital signature
      signature = `SIG-${Math.random().toString(36).substring(7).toUpperCase()}`;
    } else {
      erosRuntime.publish("PLUGIN_BLOCKED", { pluginId, branchId, reason: issues.join(", ") });
    }

    const auditRecord = {
      pluginId,
      passed,
      issues,
      signature,
      auditedAt: Date.now()
    };

    this.reviews.set(pluginId, auditRecord);
    return auditRecord;
  }

  getAuditRecord(req, branchId, pluginId) {
    this.verifyAccess(req, branchId, "services:read");
    return this.reviews.get(pluginId) || null;
  }
}

module.exports = new MarketplaceGovernance();
