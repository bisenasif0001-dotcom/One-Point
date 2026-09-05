/**
 * EROS Distributed Event Mesh
 * Phase 18.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class DistributedEventMesh {
  constructor() {
    this.eventBuffer = [];
    this.deadLetterQueue = [];
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableDistributedEventMesh", branchId);
    if (!flagEnabled) {
      throw new Error(`Distributed Event Mesh is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async publishCrossRegion(req, branchId, eventPayload, targetRegion) {
    this.verifyAccess(req, branchId, "services:read");

    const messageId = "MSG-" + Math.random().toString(36).substring(7).toUpperCase();
    const meshEvent = {
      messageId,
      originBranch: branchId,
      targetRegion,
      payload: eventPayload,
      timestamp: Date.now(),
      status: "delivered",
      attempts: 1
    };

    this.eventBuffer.push(meshEvent);
    return meshEvent;
  }

  async replayEvents(req, branchId, sinceTimestamp) {
    this.verifyAccess(req, branchId, "services:read");
    return this.eventBuffer.filter(e => e.timestamp >= sinceTimestamp);
  }

  async routeToDLQ(req, branchId, messageId, errorMsg) {
    this.verifyAccess(req, branchId, "services:read");
    const meshEvent = this.eventBuffer.find(e => e.messageId === messageId);
    if (meshEvent) {
      meshEvent.status = "dlq";
      this.deadLetterQueue.push({
        ...meshEvent,
        error: errorMsg,
        movedToDLQAt: Date.now()
      });
    }
    return { success: true, messageId };
  }
}

module.exports = new DistributedEventMesh();
