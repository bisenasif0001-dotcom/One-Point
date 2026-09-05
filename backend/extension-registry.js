/**
 * EROS Extension Registry
 * Phase 17.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class ExtensionRegistry {
  constructor() {
    this.registry = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enablePluginRuntime", branchId);
    if (!flagEnabled) {
      throw new Error(`Extension Registry is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async registerExtension(req, branchId, extensionMeta) {
    this.verifyAccess(req, branchId, "config:read");

    const { id, version, dependencies = {}, signature } = extensionMeta;

    // Digital signature validation simulation
    if (!signature || !signature.startsWith("SIG-")) {
      throw new Error(`Invalid signature: extension ${id} is not digitally signed by EROS certified issuer`);
    }

    // Dependency check
    for (const [depId, depVer] of Object.entries(dependencies)) {
      const activeDep = this.registry.get(depId);
      if (!activeDep || activeDep.version !== depVer) {
        throw new Error(`Dependency unmet: requires ${depId}@${depVer}`);
      }
    }

    const extensionRecord = {
      id,
      version,
      dependencies,
      signature,
      registeredAt: Date.now()
    };

    this.registry.set(id, extensionRecord);
    return extensionRecord;
  }

  getExtension(req, branchId, extensionId) {
    this.verifyAccess(req, branchId, "services:read");
    return this.registry.get(extensionId) || null;
  }
}

module.exports = new ExtensionRegistry();
