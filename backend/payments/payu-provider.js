/**
 * EROS PayU Payment Provider Adapter
 */

const PaymentProvider = require('./payment-provider');
const crypto = require('crypto');

class PayUProvider extends PaymentProvider {
  constructor(config = {}) {
    super('PayU');
    this.merchantKey = config.merchantKey || 'dummy_key';
    this.merchantSalt = config.merchantSalt || 'dummy_salt';
  }

  async createOrder(orderData) {
    const txnid = 'PAYU' + Date.now();
    // hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    const hashString = `${this.merchantKey}|${txnid}|${orderData.amount}|services|opds|support@opds.com|||||||||||${this.merchantSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    return {
      id: txnid,
      amount: orderData.amount,
      hash,
      status: 'created',
      provider: 'PayU'
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
    // PayU response hash verification
    const hashString = `${this.merchantSalt}|${payload.status}|||||||||||services|opds|support@opds.com|${payload.amount}|${payload.txnid}|${this.merchantKey}`;
    const expected = crypto.createHash('sha512').update(hashString).digest('hex');
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
      status: 'success'
    };
  }

  async validateWebhook(body, headers) {
    const signature = headers['signature'] || headers['x-payu-signature'];
    if (!signature) return false;
    const hashString = `${body.key}|${body.txnid}|${body.amount}|${body.productinfo}|${body.firstname}|${body.email}|||||||||||${this.merchantSalt}`;
    const expected = crypto.createHash('sha512').update(hashString).digest('hex');
    return expected === signature;
  }

  async healthCheck() {
    return { status: 'healthy', provider: 'PayU' };
  }
}

module.exports = PayUProvider;
