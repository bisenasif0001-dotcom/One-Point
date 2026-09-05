/**
 * EROS Predictive Intelligence Engine
 * Phase 16.3 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class PredictiveIntelligenceEngine {
  constructor() {
    this.name = "PredictiveIntelligenceEngine";
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enablePredictiveEngine", branchId);
    if (!flagEnabled) {
      throw new Error(`Predictive Intelligence capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async generateForecast(req, branchId, historicalContext = {}) {
    this.verifyAccess(req, branchId, "services:read");

    const peakHours = ["11:00 AM - 1:00 PM", "3:00 PM - 5:00 PM"];
    const demandMultiplier = historicalContext.isHolidaySeason ? 1.5 : 1.1;
    
    const forecastedTransactions = Math.round((historicalContext.averageDailyCount || 100) * demandMultiplier);
    const forecastedRevenue = forecastedTransactions * (historicalContext.averageRevenuePerTransaction || 15);
    const workforceUtilizationPrediction = historicalContext.staffShortage ? 0.95 : 0.65;
    const failurePredictionPercentage = historicalContext.outageTriggered ? 0.40 : 0.02;

    const forecast = {
      branchId,
      forecastedTransactions,
      forecastedRevenue,
      peakHours,
      workforceUtilizationPrediction,
      failurePredictionPercentage,
      generatedAt: Date.now()
    };

    erosRuntime.publish("FORECAST_GENERATED", { branchId, forecastedTransactions });
    return forecast;
  }
}

module.exports = new PredictiveIntelligenceEngine();
