/**
 * EROS Payment Integration Manager
 */

const RazorpayProvider = require('./razorpay-provider');
const PhonePeProvider = require('./phonepe-provider');
const PayUProvider = require('./payu-provider');

class PaymentManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'Razorpay';
    
    // Register default providers with dummy configs
    this.registerProvider('Razorpay', new RazorpayProvider());
    this.registerProvider('PhonePe', new PhonePeProvider());
    this.registerProvider('PayU', new PayUProvider());
  }

  registerProvider(name, providerInstance) {
    this.providers.set(name, providerInstance);
  }

  getProvider(name) {
    const target = name || this.defaultProvider;
    const provider = this.providers.get(target);
    if (!provider) {
      throw new Error(`Payment provider [${target}] is not registered.`);
    }
    return provider;
  }

  setDefaultProvider(name) {
    if (!this.providers.has(name)) {
      throw new Error(`Cannot set default. Provider [${name}] is not registered.`);
    }
    this.defaultProvider = name;
  }

  async createOrder(providerName, orderData) {
    const provider = this.getProvider(providerName);
    return await provider.createOrder(orderData);
  }

  async verifyPayment(providerName, payload, signature) {
    const provider = this.getProvider(providerName);
    return await provider.verifyPayment(payload, signature);
  }

  async refundPayment(providerName, transactionId, amount) {
    const provider = this.getProvider(providerName);
    return await provider.refundPayment(transactionId, amount);
  }

  async getPaymentStatus(providerName, transactionId) {
    const provider = this.getProvider(providerName);
    return await provider.getPaymentStatus(transactionId);
  }

  async validateWebhook(providerName, body, headers) {
    const provider = this.getProvider(providerName);
    return await provider.validateWebhook(body, headers);
  }
}

module.exports = new PaymentManager();
