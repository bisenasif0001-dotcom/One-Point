/**
 * EROS Loki Logger with PII / Secrets Masking
 */

class LokiLogger {
  constructor() {
    this.logsBuffer = [];
  }

  maskSensitives(message) {
    if (typeof message !== 'string') return message;
    
    // Mask PAN (e.g. ABCDE1234F -> [MASKED PAN])
    let result = message.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, '[MASKED_PAN]');
    
    // Mask Aadhaar (12 digits -> [MASKED AADHAAR])
    result = result.replace(/\b\d{12}\b/g, '[MASKED_AADHAAR]');
    
    // Mask JWT/API keys/secrets keywords
    result = result.replace(/(jwt|token|password|secret|key)(=|:)\s*[^\s,;]+/gi, '$1$2[MASKED_SECRET]');

    return result;
  }

  log(level, event, payload = {}, context = {}) {
    const message = this.maskSensitives(payload.message || event);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      traceId: context.traceId || null,
      spanId: context.spanId || null,
      tenantId: context.tenantId || null,
      branchId: context.branchId || null,
      module: context.module || 'runtime',
      event,
      message,
      durationMs: payload.durationMs || null
    };

    this.logsBuffer.push(logEntry);
    if (this.logsBuffer.length > 100) {
      this.logsBuffer.shift(); // keep buffer bounded
    }
    return logEntry;
  }

  info(event, payload, context) { return this.log('INFO', event, payload, context); }
  warning(event, payload, context) { return this.log('WARNING', event, payload, context); }
  error(event, payload, context) { return this.log('ERROR', event, payload, context); }
  critical(event, payload, context) { return this.log('CRITICAL', event, payload, context); }

  getBufferedLogs() {
    return this.logsBuffer;
  }
}

module.exports = new LokiLogger();
