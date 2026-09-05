/**
 * EROS GST Verification Connector
 */

const GovConnector = require('./gov-connector');

class GstConnector extends GovConnector {
  constructor() {
    super('GST');
  }

  async verify(identityPayload) {
    const gstin = identityPayload.gstin;
    if (!gstin || gstin.length !== 15) {
      return { status: 'invalid', message: 'GSTIN must be 15 characters.' };
    }
    return {
      status: 'active',
      gstin,
      legalName: 'One Point Digital Services Private Limited',
      tradeName: 'One Point Digital',
      taxpayerType: 'Regular',
      state: 'Uttar Pradesh'
    };
  }

  async fetchData(queryPayload) {
    return this.verify(queryPayload);
  }

  async downloadDocument(documentId) {
    return {
      documentId,
      mimeType: 'application/pdf',
      data: Buffer.from('GST Certificate PDF Stub').toString('base64')
    };
  }
}

module.exports = GstConnector;
