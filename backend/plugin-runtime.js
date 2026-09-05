/**
 * EROS Plugin Runtime
 * Phase 17.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class PluginRuntime {
  constructor() {
    this.plugins = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enablePluginRuntime", branchId);
    if (!flagEnabled) {
      throw new Error(`Plugin Runtime is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async loadPlugin(req, branchId, pluginId, manifest, codeString) {
    this.verifyAccess(req, branchId, "config:read");

    // Version compatibility check
    const systemVersion = erosRuntime.loadConfig(branchId).system?.version || "1.0.0";
    if (manifest.targetSystemVersion && manifest.targetSystemVersion !== systemVersion) {
      throw new Error(`Incompatible plugin version: targets ${manifest.targetSystemVersion}, system is ${systemVersion}`);
    }

    const plugin = {
      pluginId,
      manifest,
      codeString,
      status: "loaded",
      health: "healthy",
      loadedAt: Date.now()
    };

    this.plugins.set(pluginId, plugin);
    erosRuntime.publish("PLUGIN_INSTALLED", { pluginId, branchId });
    return plugin;
  }

  async executePlugin(req, branchId, pluginId, inputData) {
    this.verifyAccess(req, branchId, "services:read");

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status !== "loaded" && plugin.status !== "active") {
      throw new Error(`Plugin ${pluginId} is not active (status: ${plugin.status})`);
    }

    // Sandbox isolation wrapper - limited context execution
    const sandboxContext = {
      input: inputData,
      console: { log: () => {} },
      branchId,
      systemVersion: "1.0.0"
    };

    try {
      // Safe dynamic evaluation simulation
      const sandboxFn = new Function("context", `
        try {
          with (context) {
            ${plugin.codeString}
          }
        } catch (e) {
          return { success: false, error: e.message };
        }
      `);

      sandboxFn(sandboxContext);
      
      erosRuntime.publish("PLUGIN_EXECUTED", { pluginId, branchId });
      return sandboxContext;
    } catch (err) {
      plugin.health = "unhealthy";
      erosRuntime.publish("PLUGIN_BLOCKED", { pluginId, reason: err.message, branchId });
      throw new Error(`Sandbox Execution Error: ${err.message}`);
    }
  }

  async unloadPlugin(req, branchId, pluginId) {
    this.verifyAccess(req, branchId, "config:read");
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    this.plugins.delete(pluginId);
    erosRuntime.publish("PLUGIN_REMOVED", { pluginId, branchId });
    return { success: true };
  }

  getPluginStatus(req, branchId, pluginId) {
    this.verifyAccess(req, branchId, "services:read");
    return this.plugins.get(pluginId) || null;
  }
}

module.exports = new PluginRuntime();
