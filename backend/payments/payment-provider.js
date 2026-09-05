/**
 * EROS Payment Provider Base Class
 */

class PaymentProvider {
  constructor(name) {
    this.name = name;
  }

  async createOrder(orderData) {
    throw new Error('Not implemented');
  }

  async capturePayment(paymentId, amount) {
    throw new Error('Not implemented');
  }

  async verifyPayment(payload, signature) {
    throw new Error('Not implemented');
  }

  async refundPayment(transactionId, amount) {
    throw new Error('Not implemented');
  }

  async getPaymentStatus(transactionId) {
    throw new Error('Not implemented');
  }

  async validateWebhook(body, headers) {
    throw new Error('Not implemented');
  }

  async healthCheck() {
    return { status: 'healthy', provider: this.name };
  }
}

module.exports = PaymentProvider;
