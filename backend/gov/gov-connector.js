/**
 * EROS Government Connector Base Class
 */

class GovConnector {
  constructor(name) {
    this.name = name;
  }

  async authenticate() {
    return { authenticated: true };
  }

  async verify(identityPayload) {
    throw new Error('Not implemented');
  }

  async fetchData(queryPayload) {
    throw new Error('Not implemented');
  }

  async downloadDocument(documentId) {
    throw new Error('Not implemented');
  }

  async healthCheck() {
    return { status: 'healthy', connector: this.name };
  }
}

module.exports = GovConnector;
