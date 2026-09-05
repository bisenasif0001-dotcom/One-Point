/**
 * EROS Alert Manager Router
 */

class AlertManager {
  constructor() {
    this.alertsBuffer = [];
    this.routes = {
      slack: false,
      pagerDuty: false,
      incidentQueue: true
    };
    this.incidents = [];
  }

  async triggerAlert(alertData) {
    const alertEntry = {
      id: 'alert_' + Date.now(),
      name: alertData.name,
      severity: alertData.severity || 'WARNING',
      summary: alertData.summary,
      timestamp: new Date().toISOString(),
      status: 'FIRING'
    };
    
    this.alertsBuffer.push(alertEntry);

    // Multichannel routing
    const routesTaken = [];
    if (this.routes.incidentQueue) {
      this.incidents.push({
        incidentId: 'inc_' + Math.random().toString(36).substring(7).toUpperCase(),
        title: alertData.name,
        details: alertData.summary,
        status: 'open',
        created_at: new Date().toISOString()
      });
      routesTaken.push('incidentQueue');
    }
    if (alertData.severity === 'CRITICAL' || alertData.severity === 'EMERGENCY') {
      routesTaken.push('slack');
      routesTaken.push('pagerDuty');
    }

    return { alert: alertEntry, routesTaken };
  }

  getIncidents() {
    return this.incidents;
  }
}

module.exports = new AlertManager();
