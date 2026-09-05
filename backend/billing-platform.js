/**
 * EROS Enterprise Billing Platform
 * Phase 18.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class BillingPlatform {
  constructor() {
    this.invoices = [];
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableBillingPlatform", branchId);
    if (!flagEnabled) {
      throw new Error(`Billing Platform is disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async generateInvoice(req, branchId, tenantId, planKey, usageCount) {
    this.verifyAccess(req, branchId, "services:read");

    const rates = { premium: 0.10, standard: 0.05, free: 0.00 };
    const rate = rates[planKey] !== undefined ? rates[planKey] : 0.05;
    const baseFee = planKey === "premium" ? 50.00 : (planKey === "standard" ? 20.00 : 0.00);

    const calculatedTotalUSD = baseFee + (usageCount * rate);
    const invoiceId = "INV-" + Math.random().toString(36).substring(7).toUpperCase();

    const invoice = {
      invoiceId,
      tenantId,
      planKey,
      usageCount,
      totalUSD: Math.round(calculatedTotalUSD * 100) / 100,
      status: "issued",
      generatedAt: Date.now()
    };

    this.invoices.push(invoice);
    erosRuntime.publish("BILLING_GENERATED", { invoiceId, tenantId, totalUSD: invoice.totalUSD, branchId });
    return invoice;
  }
}

module.exports = new BillingPlatform();
