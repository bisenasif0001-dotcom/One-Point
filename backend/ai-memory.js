/**
 * EROS Shared AI Memory Service
 * Phase 16.2 Implementation
 */

const crypto = require('crypto');
const { erosRuntime } = require('./eros-runtime');
const { permissionMiddleware } = require('./security-runtime');

class AIMemoryService {
  constructor() {
    this.memoryStore = new Map(); // Key: branch:key -> value
    this.encryptionKey = crypto.createHash('sha256').update('eros-memory-password').digest();
    this.iv = crypto.randomBytes(16);
  }

  // Encryption helper
  encrypt(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, this.iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // Decryption helper
  decrypt(encryptedText) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, this.iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Enforce flag and RBAC
  verifyAccess(req, branchId, permission = "services:read") {
    const flagEnabled = erosRuntime.isFeatureEnabled("enableAIMemory", branchId);
    if (!flagEnabled) {
      throw new Error(`AI Memory capabilities are disabled for branch ${branchId}`);
    }

    const auth = permissionMiddleware(req, permission);
    if (!auth.authorized) {
      throw new Error(`Access Denied: Role ${auth.user.role} lacks permission ${permission}`);
    }
    return auth.user;
  }

  // Write Memory
  async write(req, branchId, key, value, ttlMs = 3600000) {
    const user = this.verifyAccess(req, branchId, "services:read");
    const storeKey = `${branchId}:${key}`;
    const serializedValue = JSON.stringify(value);
    const encrypted = this.encrypt(serializedValue);

    const existing = this.memoryStore.get(storeKey);
    const version = existing ? existing.version + 1 : 1;

    const record = {
      encrypted,
      version,
      expiresAt: Date.now() + ttlMs,
      writtenBy: user.id
    };

    this.memoryStore.set(storeKey, record);
    erosRuntime.publish("AI_MEMORY_WRITE", { key, version, branchId });
    return { success: true, version };
  }

  // Read Memory
  async read(req, branchId, key) {
    this.verifyAccess(req, branchId, "services:read");
    const storeKey = `${branchId}:${key}`;
    const record = this.memoryStore.get(storeKey);

    if (!record) {
      return null;
    }

    if (Date.now() > record.expiresAt) {
      this.memoryStore.delete(storeKey);
      return null;
    }

    const decrypted = this.decrypt(record.encrypted);
    const value = JSON.parse(decrypted);

    erosRuntime.publish("AI_MEMORY_READ", { key, version: record.version, branchId });
    return {
      value,
      version: record.version,
      writtenBy: record.writtenBy
    };
  }

  // Expiration Sweep
  sweepExpired() {
    const now = Date.now();
    for (const [storeKey, record] of this.memoryStore.entries()) {
      if (now > record.expiresAt) {
        this.memoryStore.delete(storeKey);
      }
    }
  }

  // Memory Summarization
  async summarize(req, branchId, key) {
    const data = await this.read(req, branchId, key);
    if (!data) return "No active context found.";
    
    // Mock summarizer
    return `Summary of context for key '${key}' (Version: ${data.version}): ${JSON.stringify(data.value).substring(0, 100)}...`;
  }
}

module.exports = new AIMemoryService();
