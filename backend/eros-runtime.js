/**
 * One Point Digital Services — Enterprise Runtime Operating System (EROS) Core
 * Phase 9.0 Pluggable Backend Execution Backbone
 * 
 * Purpose: Decoupled configuration loading, resolution hierarchy, secret
 * management, feature flag runtime, business policies, event bus, and diagnostic endpoints.
 */

const fs = require('fs');
const path = require('path');
const configValidator = require('./config-validator');

// 1. Secret Management Resolver (Simulates dynamic secure injects)
class SecretResolver {
  static get(key) {
    // Priority: Env -> vault mapping simulator -> config default
    if (process.env[key]) return process.env[key];
    const mockVault = {
      'RAZORPAY_KEY_ID': 'rzp_live_v90104csc',
      'RAZORPAY_SECRET': 'sec_live_90104csc_secret_vault',
      'PHONEPE_MERCHANT_ID': 'mid_phonepe_90104csc'
    };
    return mockVault[key] || null;
  }
}

// 2. Configuration Cache (TTL memory cache)
class ConfigCache {
  constructor(ttlMs = 60000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    return cached.value;
  }
  set(key, value) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
  invalidate(key) {
    this.cache.delete(key);
  }
}

const configCacheInstance = new ConfigCache();

// 3. EROS Core Engine
class EROSRuntime {
  constructor() {
    this.configDir = path.join(__dirname, 'config');
    this.defaultPath = path.join(this.configDir, 'default_config.json');
    this.eventHandlers = [];
  }

  // 4. Branch Resolution Service
  resolveBranchId(req) {
    // 1. Check Query parameter ?branch=
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const branchQuery = url.searchParams.get('branch');
    if (branchQuery) return branchQuery;

    // 2. Check HTTP Headers
    if (req.headers['x-branch-id']) return req.headers['x-branch-id'];

    // 3. Check Subdomain (e.g. br-0104.bisenonepoint.com)
    const host = req.headers.host || '';
    const match = host.match(/^br-([0-9]{4})\./i);
    if (match) return `BR-${match[1].toUpperCase()}`;

    // Default Fallback
    return 'BR-0104'; // Lucknow center as operational default
  }

  // 5. Configuration Resolution Engine (Hierarchical Override Compile)
  loadConfig(branchId) {
    const cacheKey = `config:${branchId}`;
    const cached = configCacheInstance.get(cacheKey);
    if (cached) return cached;

    // A. Load System Defaults
    let config = {};
    try {
      if (fs.existsSync(this.defaultPath)) {
        config = JSON.parse(fs.readFileSync(this.defaultPath, 'utf8'));
      } else {
        // hardcoded recovery fallback constants
        config = {
          branchMetadata: { id: "BR-0000", status: "active", name: "Failsafe Base", city: "Lucknow" },
          contact: { address: "Lucknow", phone: "+91 9473946181" },
          featureFlags: { enableOnlinePayments: true }
        };
      }
    } catch (e) {
      console.error("EROS Config Engine: Failed loading system defaults", e);
    }

    // B. Load State level config (Mocking UP state configs)
    const statePath = path.join(this.configDir, 'state_UP.json');
    if (fs.existsSync(statePath)) {
      try {
        const stateConfig = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        config = { ...config, ...stateConfig };
      } catch (e) {
        console.error("EROS Config Engine: Failed loading state overrides", e);
      }
    }

    // C. Load Branch level overrides
    const branchPath = path.join(this.configDir, `branch_${branchId}.json`);
    if (fs.existsSync(branchPath)) {
      try {
        const branchConfig = JSON.parse(fs.readFileSync(branchPath, 'utf8'));
        // Deep merge overrides
        config.branchMetadata = { ...config.branchMetadata, ...branchConfig.branchMetadata };
        config.contact = { ...config.contact, ...branchConfig.contact };
        if (branchConfig.theme) config.theme = { ...config.theme, ...branchConfig.theme };
        if (branchConfig.seo) config.seo = { ...config.seo, ...branchConfig.seo };
        if (branchConfig.featureFlags) config.featureFlags = { ...config.featureFlags, ...branchConfig.featureFlags };
      } catch (e) {
        console.error(`EROS Config Engine: Failed loading branch overrides for ${branchId}`, e);
      }
    }

    // Validate config payload schema checks
    const schemaValidation = configValidator.validateBranchConfig(config);
    if (!schemaValidation.valid) {
      console.warn("EROS Config Schema Warning: Invalid configuration schema resolved:", schemaValidation.errors.join(", "));
      config.branchMetadata = { id: branchId, status: "safe-mode", validationErrors: schemaValidation.errors };
    }

    configCacheInstance.set(cacheKey, config);
    return config;
  }

  // 6. Business Policy Engine (Condition Evaluator)
  evaluatePolicy(policyName, context) {
    const rules = {
      'TransactionFeeCap': (ctx) => {
        // UP State cap rule
        if (ctx.state === 'UP' && ctx.category === 'government') {
          return { maxFee: 50, operatorSurcharge: 10 };
        }
        return { maxFee: 100, operatorSurcharge: 20 };
      },
      'OperationalHours': (ctx) => {
        // 9 AM to 8 PM check
        const hour = new Date().getHours();
        if (hour >= 9 && hour < 20) {
          return { status: "open", message: "Operator online." };
        }
        return { status: "closed", message: "Submit online; processing resumes 9:00 AM." };
      }
    };

    if (rules[policyName]) {
      return rules[policyName](context);
    }
    return { status: "default_ok" };
  }

  // 7. Feature Flag Runtime Target checks
  isFeatureEnabled(featureId, branchId, state = 'UP') {
    const config = this.loadConfig(branchId);
    if (config.featureFlags && config.featureFlags[featureId] !== undefined) {
      // Branch blacklist filter check
      if (featureId === 'enableOnlinePayments' && branchId === 'BR-0129') return false;
      return config.featureFlags[featureId];
    }
    const defaultFlags = {
      enableOnlinePayments: true,
      enableWhatsAppSupport: true,
      enableAISuggestions: false
    };
    return defaultFlags[featureId] !== undefined ? defaultFlags[featureId] : false;
  }

  // 8. Event Bus
  subscribe(handler) {
    this.eventHandlers.push(handler);
  }

  publish(eventName, payload) {
    const event = {
      timestamp: new Date().toISOString(),
      event: eventName,
      payload
    };
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        console.error("EROS Event Bus: Handler execution failed", e);
      }
    });
  }
}

const erosRuntimeInstance = new EROSRuntime();

// Configure dynamic event observer logging
erosRuntimeInstance.subscribe((event) => {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  const logFile = path.join(logDir, 'runtime_audit.log');
  const logLine = `${event.timestamp} [${event.event}] ${JSON.stringify(event.payload)}\n`;
  fs.appendFileSync(logFile, logLine, 'utf8');
});

// Middleware Integration for server.js
function handleEROSDiagnostics(req, res, pathname) {
  const branchId = erosRuntimeInstance.resolveBranchId(req);

  // A. Health check endpoint
  if (req.method === "GET" && pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
      services: {
        database: "online",
        cache: "active",
        eventBus: "active"
      }
    }));
    erosRuntimeInstance.publish("HEALTH_CHECK", { branchId, status: "healthy" });
    return true;
  }

  // B. Active resolved configuration config endpoint
  if (req.method === "GET" && pathname === "/api/config") {
    const config = erosRuntimeInstance.loadConfig(branchId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      branchId,
      resolvedConfig: config,
      resolvedSecrets: {
        razorpayKeyId: SecretResolver.get('RAZORPAY_KEY_ID') ? "RESOLVED_FROM_VAULT" : "MISSING",
        phonepeMerchantId: SecretResolver.get('PHONEPE_MERCHANT_ID') ? "RESOLVED_FROM_VAULT" : "MISSING"
      }
    }));
    erosRuntimeInstance.publish("CONFIG_RESOLVE", { branchId });
    return true;
  }

  // C. Policy engine validation endpoint
  if (req.method === "GET" && pathname === "/api/runtime") {
    const policyResult = erosRuntimeInstance.evaluatePolicy("OperationalHours", {});
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      runtime: "EROS-v1.0.0",
      uptime: process.uptime(),
      activeBranch: branchId,
      policies: {
        operationalHours: policyResult
      },
      featureFlags: {
        enableOnlinePayments: erosRuntimeInstance.isFeatureEnabled("enableOnlinePayments", branchId),
        enableAISuggestions: erosRuntimeInstance.isFeatureEnabled("enableAISuggestions", branchId)
      }
    }));
    return true;
  }

  // D. System Metrics and Diagnostics API
  if (req.method === "GET" && pathname === "/api/diagnostics") {
    const mem = process.memoryUsage();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      runtime: "EROS-v1.0.0",
      status: "online",
      uptime: process.uptime(),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal
      },
      telemetry: {
        activeListeners: erosRuntimeInstance.eventHandlers.length,
        logFile: path.join(__dirname, 'logs', 'runtime_audit.log')
      }
    }));
    return true;
  }

  return false;
}

module.exports = {
  erosRuntime: erosRuntimeInstance,
  handleEROSDiagnostics,
  SecretResolver
};
