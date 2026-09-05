/**
 * EROS v2.0 Resilience Patterns Framework
 * Implements: Circuit Breaker, Exponential Backoff, and Request Idempotency
 */

const crypto = require('crypto');
const cache = require('../cache');

class CircuitBreaker {
  constructor(name, policy = {}) {
    this.name = name;
    this.failureThreshold = policy.failureThreshold || 50; // percentage
    this.minimumRequests = policy.minimumRequests || 5;
    this.resetTimeoutMs = policy.resetTimeoutMs || 5000;
    this.halfOpenRequests = policy.halfOpenRequests || 3;

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.lastStateChange = Date.now();
    this.halfOpenCount = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastStateChange > this.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new Error(`CircuitBreaker [${this.name}] is OPEN. Executions blocked.`);
      }
    }

    this.totalRequests++;
    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.successes++;
        this.halfOpenCount++;
        if (this.halfOpenCount >= this.halfOpenRequests) {
          this.transitionTo('CLOSED');
        }
      }
      return result;
    } catch (err) {
      if (this.state === 'CLOSED') {
        this.failures++;
        const failurePct = (this.failures / this.totalRequests) * 100;
        if (this.totalRequests >= this.minimumRequests && failurePct >= this.failureThreshold) {
          this.transitionTo('OPEN');
        }
      } else if (this.state === 'HALF_OPEN') {
        this.transitionTo('OPEN');
      }
      throw err;
    }
  }

  transitionTo(state) {
    this.state = state;
    this.lastStateChange = Date.now();
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.halfOpenCount = 0;
  }
}

async function retryWithBackoff(fn, retries = 3, delayMs = 100) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      // Exponential backoff with random jitter
      const jitter = Math.random() * 50;
      const backoffDelay = delayMs * Math.pow(2, attempt) + jitter;
      await new Promise(r => setTimeout(r, backoffDelay));
    }
  }
}

class IdempotencyHandler {
  constructor() {
    this.store = new Map();
  }

  hashRequest(payload) {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async verifyAndProcess(key, payload, actionFn) {
    const incomingHash = this.hashRequest(payload);
    const cachedEntry = this.store.get(key);

    if (cachedEntry) {
      if (cachedEntry.hash !== incomingHash) {
        throw new Error("Idempotency conflict: payload mismatch for the same key.");
      }
      return cachedEntry.response;
    }

    const response = await actionFn();
    this.store.set(key, {
      hash: incomingHash,
      response,
      timestamp: Date.now()
    });
    return response;
  }
}

module.exports = {
  CircuitBreaker,
  retryWithBackoff,
  IdempotencyHandler: new IdempotencyHandler()
};
