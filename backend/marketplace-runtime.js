/**
 * EROS Marketplace Runtime
 * Phase 17.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class MarketplaceRuntime {
  constructor() {
    this.catalog = new Map();
    this.installedExtensions = new Set();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableMarketplace", branchId);
    if (!flagEnabled) {
      throw new Error(`Marketplace Runtime is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async publishToCatalog(req, branchId, pluginMeta) {
    this.verifyAccess(req, branchId, "config:read");
    this.catalog.set(pluginMeta.id, {
      ...pluginMeta,
      rating: 5.0,
      installCount: 0
    });
    return pluginMeta;
  }

  async installPlugin(req, branchId, pluginId, licenseKey) {
    this.verifyAccess(req, branchId, "config:read");

    const plugin = this.catalog.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found in catalog`);
    }

    // License key validation check
    if (!licenseKey || !licenseKey.startsWith("LIC-")) {
      throw new Error(`Invalid License Key for plugin ${pluginId}`);
    }

    // Approval check flag
    if (plugin.requiresApproval && !plugin.approvedByGov) {
      throw new Error(`Approval Required: Plugin ${pluginId} requires EROS governance approval`);
    }

    plugin.installCount += 1;
    this.installedExtensions.add(pluginId);

    erosRuntime.publish("MARKETPLACE_INSTALL", { pluginId, branchId });
    return { success: true, pluginId, version: plugin.version };
  }

  getInstalled(req, branchId) {
    this.verifyAccess(req, branchId, "services:read");
    return Array.from(this.installedExtensions).map(id => this.catalog.get(id));
  }
}

module.exports = new MarketplaceRuntime();
