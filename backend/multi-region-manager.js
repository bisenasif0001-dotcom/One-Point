/**
 * EROS Multi-Region Deployment Manager
 * Phase 18.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class MultiRegionManager {
  constructor() {
    this.regionsHealth = new Map([
      ["ap-south-1", { status: "healthy", score: 98 }],
      ["ap-southeast-1", { status: "healthy", score: 95 }]
    ]);
  }

  verifyAccess(req, branchId, permission = "services:read") {
    // Rely on enableCloudControlPlane flag for deployment controls
    const flagEnabled = erosRuntime.isFeatureEnabled("enableCloudControlPlane", branchId);
    if (!flagEnabled) {
      throw new Error(`Multi-Region capabilities are disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async steerTraffic(req, branchId, requestLatLong, primaryRegion) {
    this.verifyAccess(req, branchId, "services:read");

    const primaryStatus = this.regionsHealth.get(primaryRegion);
    if (primaryStatus && primaryStatus.status === "healthy") {
      return { targetRegion: primaryRegion, failoverActive: false };
    }

    // Trigger Geo Failover to backup region
    const backupRegion = primaryRegion === "ap-south-1" ? "ap-southeast-1" : "ap-south-1";
    erosRuntime.publish("REGION_FAILOVER", {
      fromRegion: primaryRegion,
      toRegion: backupRegion,
      branchId
    });

    return { targetRegion: backupRegion, failoverActive: true };
  }

  async setRegionHealth(req, branchId, region, status, score) {
    this.verifyAccess(req, branchId, "config:read");
    this.regionsHealth.set(region, { status, score });
    return { region, status, score };
  }
}

module.exports = new MultiRegionManager();
