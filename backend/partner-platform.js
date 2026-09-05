/**
 * EROS Partner Management Platform
 * Phase 18.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class PartnerPlatform {
  constructor() {
    this.partners = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enablePartnerPlatform", branchId);
    if (!flagEnabled) {
      throw new Error(`Partner Management Platform is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async onboardPartner(req, branchId, partnerId, details = {}) {
    this.verifyAccess(req, branchId, "config:read");

    const partner = {
      partnerId,
      name: details.name || "Franchise Partner",
      revenueSharePercentage: details.revenueSharePercentage || 20.0,
      certified: details.certified || false,
      complianceStatus: "compliant",
      registeredAt: Date.now()
    };

    this.partners.set(partnerId, partner);
    erosRuntime.publish("PARTNER_REGISTERED", { partnerId, branchId });
    return partner;
  }

  async getRevenueSettlement(req, branchId, partnerId, transactionVolumeUSD) {
    this.verifyAccess(req, branchId, "services:read");

    const partner = this.partners.get(partnerId);
    if (!partner) throw new Error(`Partner ${partnerId} not found`);

    const settlementUSD = transactionVolumeUSD * (partner.revenueSharePercentage / 100);
    return {
      partnerId,
      transactionVolumeUSD,
      revenueSharePercentage: partner.revenueSharePercentage,
      settlementUSD: Math.round(settlementUSD * 100) / 100
    };
  }
}

module.exports = new PartnerPlatform();
