/**
 * EROS SDK Runtime
 * Phase 17.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class SDKRuntime {
  constructor() {
    this.name = "SDKRuntime";
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableSDK", branchId);
    if (!flagEnabled) {
      throw new Error(`SDK Runtime is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async initializeSDK(req, branchId, developerKey) {
    this.verifyAccess(req, branchId, "services:read");

    if (!developerKey || !developerKey.startsWith("DEV-")) {
      throw new Error("Invalid Developer Access Key");
    }

    erosRuntime.publish("SDK_INITIALIZED", { branchId, developerKey });

    return {
      sdkVersion: "1.0.0",
      status: "initialized",
      apis: {
        readConfig: async (permKey) => {
          return { status: "success", version: "1.0.0" };
        },
        publishEvent: async (eventName, payload) => {
          erosRuntime.publish(eventName, { ...payload, branchId });
          return { success: true };
        }
      }
    };
  }
}

module.exports = new SDKRuntime();
