/**
 * EROS Enterprise Incident Manager
 * Phase 16.4 Implementation
 *
 * Detects incidents, classifies severity, performs automatic escalation,
 * tracks recovery, records root causes, and generates incident timelines.
 */

const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class IncidentManager {
  constructor() {
    this.name = "IncidentManager";
    this.incidents = new Map();
  }

  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableIncidentManager", branchId);
    if (!flagEnabled) {
      throw new Error(`Incident Manager capabilities are disabled for branch ${branchId}`);
    }
    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  /**
   * Create and classify a new incident.
   * @param {Object} req - Request with session token
   * @param {string} branchId - Target branch
   * @param {Object} incidentData - {title, description, affectedService, metrics}
   * @returns {Object} Incident record
   */
  async createIncident(req, branchId, incidentData) {
    const user = this.verifyAccess(req, branchId, "services:read");
    const incidentId = "INC-" + Math.random().toString(36).substring(7).toUpperCase();

    // Severity classification based on affected service and metrics
    let severity = "low";
    if (incidentData.affectedService === "payment-service" || incidentData.affectedService === "auth-service") {
      severity = "critical";
    } else if (incidentData.metrics && incidentData.metrics.errorRate > 0.1) {
      severity = "high";
    } else if (incidentData.metrics && incidentData.metrics.errorRate > 0.05) {
      severity = "medium";
    }

    const incident = {
      incidentId,
      branchId,
      title: incidentData.title,
      description: incidentData.description,
      affectedService: incidentData.affectedService,
      severity,
      status: "open",
      rootCause: null,
      timeline: [{ event: "incident_created", timestamp: Date.now(), actor: user.id }],
      createdBy: user.id,
      createdAt: Date.now()
    };

    this.incidents.set(incidentId, incident);
    erosRuntime.publish("INCIDENT_CREATED", { incidentId, branchId, severity });

    // Auto-escalate critical incidents
    if (severity === "critical") {
      incident.timeline.push({ event: "auto_escalated", timestamp: Date.now(), actor: "system" });
      erosRuntime.publish("INCIDENT_ESCALATED", { incidentId, branchId, severity });
    }

    return incident;
  }

  /**
   * Resolve an incident with root cause.
   */
  async resolveIncident(req, branchId, incidentId, rootCause) {
    this.verifyAccess(req, branchId, "services:read");
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    incident.status = "resolved";
    incident.rootCause = rootCause;
    incident.timeline.push({ event: "incident_resolved", timestamp: Date.now(), rootCause });
    return incident;
  }

  /**
   * Get incident timeline for audit.
   */
  async getTimeline(req, branchId, incidentId) {
    this.verifyAccess(req, branchId, "services:read");
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    return incident.timeline;
  }
}

module.exports = new IncidentManager();
