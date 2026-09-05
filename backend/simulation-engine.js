/**
 * EROS Executive Simulation Engine
 * Phase 16.3 Implementation
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class SimulationEngine {
  constructor() {
    this.name = "SimulationEngine";
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableSimulationEngine", branchId);
    if (!flagEnabled) {
      throw new Error(`Simulation Engine capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  async runSimulation(req, branchId, scenarioKey, params = {}) {
    this.verifyAccess(req, branchId, "services:read");
    const simulationId = Math.random().toString(36).substring(7);

    erosRuntime.publish("SIMULATION_STARTED", { simulationId, scenarioKey, branchId });

    let predictedHealthScore = 98;
    let predictedSLAHours = 2.0;
    let impactBrief = "No major impact forecast.";

    switch (scenarioKey) {
      case "increase_workload_200":
        predictedHealthScore = 72;
        predictedSLAHours = 12.0;
        impactBrief = "Workload spike exceeds capacity limits, causing queue delays.";
        break;
      case "staff_shortage":
        predictedHealthScore = 80;
        predictedSLAHours = 6.0;
        impactBrief = "Workforce capacity reduction increases average queue wait times.";
        break;
      case "gov_api_outage":
        predictedHealthScore = 30;
        predictedSLAHours = 48.0;
        impactBrief = "Primary identity API outages block document validations entirely.";
        break;
      case "disable_payment_gateway":
        predictedHealthScore = 45;
        impactBrief = "Checkout processing blocked; refunds and collections halted.";
        break;
      case "price_change":
        impactBrief = "Simulation forecasts zero transaction drops on a 5% pricing correction.";
        break;
    }

    const simulationResult = {
      simulationId,
      scenarioKey,
      predictedHealthScore,
      predictedSLAHours,
      impactBrief,
      simulatedAt: Date.now()
    };

    erosRuntime.publish("SIMULATION_COMPLETED", { simulationId, scenarioKey, branchId });
    return simulationResult;
  }
}

module.exports = new SimulationEngine();
