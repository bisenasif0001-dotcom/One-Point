/**
 * EROS Razorpay Payment Provider Adapter
 */

const PaymentProvider = require('./payment-provider');
const crypto = require('crypto');

class RazorpayProvider extends PaymentProvider {
  constructor(config = {}) {
    super('Razorpay');
    this.keyId = config.keyId || 'dummy_key';
    this.keySecret = config.keySecret || 'dummy_secret';
    this.webhookSecret = config.webhookSecret || 'dummy_webhook';
  }

  async createOrder(orderData) {
    // Generate a sandbox order response
    return {
      id: 'order_' + Math.random().toString(36).substring(7).toUpperCase(),
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      status: 'created',
      provider: 'Razorpay'
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
    // Verify signature hash
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload.orderId + '|' + payload.paymentId)
      .digest('hex');
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
      status: 'paid'
    };
  }

  async validateWebhook(body, headers) {
    const signature = headers['x-razorpay-signature'];
    if (!signature) return false;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');
    return expected === signature;
  }

  async healthCheck() {
    return { status: 'healthy', provider: 'Razorpay' };
  }
}

module.exports = RazorpayProvider;
