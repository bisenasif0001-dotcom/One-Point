/**
 * EROS PAN Verification Connector
 */

const GovConnector = require('./gov-connector');

class PanConnector extends GovConnector {
  constructor() {
    super('PAN');
  }

  async verify(identityPayload) {
    const panNumber = identityPayload.pan;
    if (!panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      return { status: 'invalid', message: 'Invalid PAN format.' };
    }
    // Sandbox verification response mock
    return {
      status: 'verified',
      pan: panNumber,
      fullName: identityPayload.fullName || 'Aditya Vardhan',
      category: 'Individual',
      lastUpdated: new Date().toISOString()
    };
  }

  async fetchData(queryPayload) {
    return this.verify(queryPayload);
  }

  async downloadDocument(documentId) {
    return {
      documentId,
      mimeType: 'application/pdf',
      data: Buffer.from('PAN Verified PDF Stub').toString('base64')
    };
  }
}

module.exports = PanConnector;
