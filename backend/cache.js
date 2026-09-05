/**
 * EROS Redis Cache & Session Integration
 * Phase 18.0 / v2.0 Implementation
 */

const redis = require('redis');

class CacheIntegration {
  constructor() {
    this.localStore = new Map();
    this.redisClient = null;
    this.connected = false;

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = redis.createClient({ url: redisUrl });
      this.redisClient.on('error', (err) => {
        // Fall back gracefully to localStore
        this.connected = false;
      });
      this.redisClient.connect().then(() => {
        this.connected = true;
      }).catch(() => {
        this.connected = false;
      });
    } catch (e) {
      this.connected = false;
    }
  }

  async get(key) {
    if (this.connected && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch (err) {
        return this.localStore.get(key);
      }
    }
    return this.localStore.get(key);
  }

  async set(key, value, expirySeconds = null) {
    if (this.connected && this.redisClient) {
      try {
        if (expirySeconds) {
          await this.redisClient.set(key, value, { EX: expirySeconds });
        } else {
          await this.redisClient.set(key, value);
        }
        return true;
      } catch (err) {
        this.localStore.set(key, value);
        return true;
      }
    }
    this.localStore.set(key, value);
    return true;
  }

  async delete(key) {
    if (this.connected && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return true;
      } catch (err) {
        this.localStore.delete(key);
        return true;
      }
    }
    this.localStore.delete(key);
    return true;
  }
}

module.exports = new CacheIntegration();
