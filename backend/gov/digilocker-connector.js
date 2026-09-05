/**
 * EROS DigiLocker Connector
 */

const GovConnector = require('./gov-connector');

class DigiLockerConnector extends GovConnector {
  constructor(config = {}) {
    super('DigiLocker');
    this.clientId = config.clientId || 'dummy_client';
    this.clientSecret = config.clientSecret || 'dummy_secret';
    // Dynamic callback URL resolution recommendation
    this.siteUrl = config.siteUrl || 'http://localhost:3000';
  }

  getAuthorizationUrl(state) {
    const callbackUrl = this.siteUrl + '/api/v1/auth/digilocker/callback';
    return `https://digilocker.merit.gov.in/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&state=${state}`;
  }

  async authenticate(authCode) {
    if (!authCode) {
      throw new Error('Authorization code required for authentication.');
    }
    return {
      accessToken: 'token_' + Math.random().toString(36).substring(7),
      tokenType: 'Bearer',
      expiresIn: 3600
    };
  }

  async verify(identityPayload) {
    return {
      status: 'authenticated',
      digilockerId: identityPayload.digilockerId || 'DL-8839210'
    };
  }

  async fetchData(queryPayload) {
    return {
      issuedDocuments: [
        { id: 'DOC-01', name: 'Aadhaar Card', type: 'ADHAR' },
        { id: 'DOC-02', name: 'Driving License', type: 'DRVLC' }
      ]
    };
  }

  async downloadDocument(documentId) {
    return {
      documentId,
      mimeType: 'application/pdf',
      data: Buffer.from('DigiLocker PDF Issued Doc').toString('base64')
    };
  }
}

module.exports = DigiLockerConnector;
