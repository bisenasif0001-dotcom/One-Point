/**
 * EROS Government Connector Integration Manager
 */

const PanConnector = require('./pan-connector');
const GstConnector = require('./gst-connector');
const DigiLockerConnector = require('./digilocker-connector');

class GovManager {
  constructor() {
    this.connectors = new Map();
    
    // Register default connectors
    this.registerConnector('PAN', new PanConnector());
    this.registerConnector('GST', new GstConnector());
    this.registerConnector('DigiLocker', new DigiLockerConnector());
  }

  registerConnector(name, connectorInstance) {
    this.connectors.set(name, connectorInstance);
  }

  getConnector(name) {
    const connector = this.connectors.get(name);
    if (!connector) {
      throw new Error(`Government connector [${name}] is not registered.`);
    }
    return connector;
  }

  async verify(connectorName, identityPayload) {
    const connector = this.getConnector(connectorName);
    return await connector.verify(identityPayload);
  }

  async fetchData(connectorName, queryPayload) {
    const connector = this.getConnector(connectorName);
    return await connector.fetchData(queryPayload);
  }

  async downloadDocument(connectorName, documentId) {
    const connector = this.getConnector(connectorName);
    return await connector.downloadDocument(documentId);
  }
}

module.exports = new GovManager();
