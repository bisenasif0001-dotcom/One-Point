/**
 * EROS PhonePe Payment Provider Adapter
 */

const PaymentProvider = require('./payment-provider');
const crypto = require('crypto');

class PhonePeProvider extends PaymentProvider {
  constructor(config = {}) {
    super('PhonePe');
    this.merchantId = config.merchantId || 'dummy_merchant';
    this.saltKey = config.saltKey || 'dummy_salt';
    this.saltIndex = config.saltIndex || '1';
  }

  async createOrder(orderData) {
    const transactionId = 'TXN' + Date.now();
    return {
      id: transactionId,
      amount: orderData.amount,
      currency: 'INR',
      status: 'pending',
      redirectUrl: `https://api.phonepe.com/pay?txn=${transactionId}`,
      provider: 'PhonePe'
    };
  }

  async capturePayment(paymentId, amount) {
    return {
      status: 'captured',
      id: paymentId,
      amount
    };
  }

  async verifyPayment(payload, signature) {
    // PhonePe payload signature validation
    const expected = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload) + this.saltKey)
      .digest('hex') + '###' + this.saltIndex;
    return expected === signature;
  }

  async refundPayment(transactionId, amount) {
    return {
      status: 'refunded',
      id: 'ref_' + Math.random().toString(36).substring(7).toUpperCase(),
      originalTransaction: transactionId,
      amount
    };
  }

  async getPaymentStatus(transactionId) {
    return {
      id: transactionId,
      status: 'SUCCESS'
    };
  }

  async validateWebhook(body, headers) {
    const signature = headers['x-verify'];
    if (!signature) return false;
    const base64Body = Buffer.from(JSON.stringify(body)).toString('base64');
    const expected = crypto
      .createHash('sha256')
      .update(base64Body + this.saltKey)
      .digest('hex') + '###' + this.saltIndex;
    return expected === signature;
  }

  async healthCheck() {
    return { status: 'healthy', provider: 'PhonePe' };
  }
}

module.exports = PhonePeProvider;
