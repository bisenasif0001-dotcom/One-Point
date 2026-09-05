/**
 * EROS Multi-Tenant Runtime
 * Phase 18.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class MultiTenantRuntime {
  constructor() {
    this.tenants = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableMultiTenant", branchId);
    if (!flagEnabled) {
      throw new Error(`Multi-Tenant capabilities are disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async provisionTenant(req, branchId, tenantId, companyName, quotaLimits = {}) {
    this.verifyAccess(req, branchId, "config:read");

    const tenant = {
      tenantId,
      companyName,
      status: "active",
      configInherited: true,
      quotas: {
        maxUsers: quotaLimits.maxUsers || 100,
        maxStorageBytes: quotaLimits.maxStorageBytes || 10737418240, // 10 GB
        maxRequestsPerMinute: quotaLimits.maxRequestsPerMinute || 1000
      },
      createdAt: Date.now()
    };

    this.tenants.set(tenantId, tenant);
    erosRuntime.publish("TENANT_CREATED", { tenantId, branchId });
    return tenant;
  }

  async updateTenant(req, branchId, tenantId, updates) {
    this.verifyAccess(req, branchId, "config:read");
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    Object.assign(tenant, updates);
    erosRuntime.publish("TENANT_UPDATED", { tenantId, branchId });
    return tenant;
  }

  async suspendTenant(req, branchId, tenantId) {
    this.verifyAccess(req, branchId, "config:read");
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    tenant.status = "suspended";
    erosRuntime.publish("TENANT_SUSPENDED", { tenantId, branchId });
    return tenant;
  }

  verifyTenantBoundary(req, branchId, requestingTenantId, targetTenantId) {
    this.verifyAccess(req, branchId, "services:read");
    if (requestingTenantId !== targetTenantId) {
      throw new Error(`Cross-Tenant Access Violation: ${requestingTenantId} attempted to access ${targetTenantId}`);
    }
    return true;
  }

  getTenant(req, branchId, tenantId) {
    this.verifyAccess(req, branchId, "services:read");
    return this.tenants.get(tenantId) || null;
  }
}

module.exports = new MultiTenantRuntime();
