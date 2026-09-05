/**
 * EROS Human Approval Gateway
 * Phase 16.2 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class ApprovalGateway {
  constructor() {
    this.name = "ApprovalGateway";
    this.approvalsStore = new Map(); // Key: approvalId -> approvalRecord
  }

  // Enforce flag and RBAC
  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableApprovalGateway", branchId);
    if (!flagEnabled) {
      throw new Error(`Human Approval Gateway capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async requestApproval(req, branchId, actionCategory, actionDetails, ttlMs = 1800000) {
    const user = this.verifyAccess(req, branchId, "services:read");
    const approvalId = Math.random().toString(36).substring(7);

    const approval = {
      approvalId,
      actionCategory, // "financial", "policy", "workflow_override", "config_update", "security"
      actionDetails,
      status: "pending",
      expiresAt: Date.now() + ttlMs,
      requestedBy: user.id,
      resolvedBy: null
    };

    this.approvalsStore.set(approvalId, approval);
    erosRuntime.publish("AI_APPROVAL_REQUIRED", { approvalId, actionCategory, branchId });
    return approval;
  }

  async resolveApproval(req, branchId, approvalId, decision) {
    // Only branch-managers or super-admins can resolve approvals
    const user = this.verifyAccess(req, branchId, "config:read");
    const record = this.approvalsStore.get(approvalId);

    if (!record) {
      throw new Error(`Approval ticket ${approvalId} not found`);
    }

    if (Date.now() > record.expiresAt) {
      record.status = "expired";
      return record;
    }

    if (decision === "approve") {
      record.status = "approved";
      record.resolvedBy = user.id;
      erosRuntime.publish("AI_APPROVAL_GRANTED", { approvalId, actionCategory: record.actionCategory, branchId });
    } else if (decision === "reject") {
      record.status = "rejected";
      record.resolvedBy = user.id;
      erosRuntime.publish("AI_APPROVAL_DENIED", { approvalId, actionCategory: record.actionCategory, branchId });
    }

    return record;
  }

  async cancelApproval(req, branchId, approvalId) {
    const user = this.verifyAccess(req, branchId, "services:read");
    const record = this.approvalsStore.get(approvalId);

    if (!record) {
      throw new Error(`Approval ticket ${approvalId} not found`);
    }

    if (record.requestedBy !== user.id && user.role !== "super-admin") {
      throw new Error("Access Denied: Only requesting user or super-admin can cancel approvals");
    }

    record.status = "cancelled";
    return record;
  }
}

module.exports = new ApprovalGateway();
