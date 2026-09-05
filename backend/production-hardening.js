/**
 * EROS Production Hardening & Disaster Recovery
 * Phase 11.6 Implementation Core
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { erosRuntime } = require('./eros-runtime');

// 1. Redis Cache Mock/Adapter with In-Memory fallback
class RedisCacheAdapter {
  constructor() {
    this.redisClient = null;
    this.fallbackCache = new Map();
    this.redisConnected = false;
  }

  async connect() {
    // Graceful check: try to load optional redis dependency
    try {
      const Redis = require('ioredis'); // Simulate dynamic require
      this.redisClient = new Redis();
      this.redisConnected = true;
      erosRuntime.publish("CACHE_REDIS_CONNECTED", { provider: "Redis" });
    } catch {
      this.redisConnected = false;
      erosRuntime.publish("CACHE_FALLBACK_ACTIVE", { provider: "MemoryMap" });
    }
  }

  async get(key) {
    if (this.redisConnected && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch {
        return this.fallbackCache.get(key) || null;
      }
    }
    return this.fallbackCache.get(key) || null;
  }

  async set(key, value, ttlSeconds = 60) {
    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        // Fallback
      }
    }
    this.fallbackCache.set(key, value);
    setTimeout(() => this.fallbackCache.delete(key), ttlSeconds * 1000);
  }
}

// 2. Backup Manager
class BackupManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.backupDir = path.join(path.dirname(dbPath), 'backups');
  }

  executeBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const targetPath = path.join(this.backupDir, `opds-payments-backup-${timestamp}.sqlite`);

    try {
      // Safe execution: execute vacuum into target backup file
      const db = new DatabaseSync(this.dbPath);
      db.exec(`VACUUM INTO '${targetPath.replace(/\\/g, '/')}'`);
      erosRuntime.publish("DATABASE_BACKUP_COMPLETED", { targetPath });
      return { success: true, path: targetPath };
    } catch (err) {
      erosRuntime.publish("DATABASE_BACKUP_FAILED", { error: err.message });
      return { success: false, error: err.message };
    }
  }
}

// 3. Deployment & Rollout Manager (Blue-Green traffic controller)
class RolloutManager {
  constructor() {
    this.activeColor = "blue"; // blue vs green
    this.rolloutPercentage = 100; // 0 to 100
  }

  setTrafficRoute(color, percent = 100) {
    this.activeColor = color;
    this.rolloutPercentage = percent;
    erosRuntime.publish("TRAFFIC_ROUTE_CHANGED", { activeColor: color, rolloutPercentage: percent });
  }

  routeRequest(req) {
    // Simple deterministic hash based on client IP for canary routing
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "127.0.0.1";
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = ip.charCodeAt(i) + ((hash << 5) - hash);
    }
    const bucket = Math.abs(hash) % 100;

    if (bucket < this.rolloutPercentage) {
      return this.activeColor;
    }
    return this.activeColor === "blue" ? "green" : "blue";
  }
}

const cacheAdapter = new RedisCacheAdapter();
const backupManager = new BackupManager(path.join(__dirname, 'data', 'opds-payments.sqlite'));
const rolloutManager = new RolloutManager();

module.exports = {
  cacheAdapter,
  backupManager,
  rolloutManager
};
