/**
 * EROS Integration Hub
 * Phase 17.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class IntegrationHub {
  constructor() {
    this.connectors = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableIntegrationHub", branchId);
    if (!flagEnabled) {
      throw new Error(`Integration Hub is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async configureConnector(req, branchId, type, config) {
    this.verifyAccess(req, branchId, "config:read");

    const supported = ["whatsapp", "email", "sms", "payments", "gov_apis", "crm", "erp", "webhooks"];
    if (!supported.includes(type)) {
      throw new Error(`Unsupported connector type: ${type}`);
    }

    const connector = {
      type,
      config,
      status: "connected",
      configuredAt: Date.now()
    };

    this.connectors.set(type, connector);
    erosRuntime.publish("INTEGRATION_CONNECTED", { type, branchId });
    return connector;
  }

  async triggerWebhook(req, branchId, payload) {
    this.verifyAccess(req, branchId, "services:read");
    const connector = this.connectors.get("webhooks");
    if (!connector) {
      return { success: false, reason: "Webhook connector not configured" };
    }
    return { success: true, url: connector.config.url, payload };
  }

  getConnector(req, branchId, type) {
    this.verifyAccess(req, branchId, "services:read");
    return this.connectors.get(type) || null;
  }
}

module.exports = new IntegrationHub();
