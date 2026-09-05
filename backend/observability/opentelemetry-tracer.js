/**
 * EROS OpenTelemetry Distributed Tracer Engine
 */

const crypto = require('crypto');

class OpenTelemetryTracer {
  constructor() {
    this.spans = [];
  }

  generateId(bytes = 8) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  startSpan(name, parentContext = {}) {
    const traceId = parentContext.traceId || this.generateId(16);
    const spanId = this.generateId(8);
    
    // Stable tenant identifier hashing for Grafana privacy
    const tenantHash = parentContext.tenantId 
      ? crypto.createHash('sha256').update(parentContext.tenantId).digest('hex').substring(0, 12)
      : 'anonymous';

    const span = {
      name,
      traceId,
      spanId,
      parentId: parentContext.spanId || null,
      tenantId: parentContext.tenantId || null,
      tenantHash,
      branchId: parentContext.branchId || null,
      requestId: parentContext.requestId || this.generateId(6),
      module: parentContext.module || 'default',
      startTime: Date.now(),
      status: 'UNRESOLVED',
      attributes: {}
    };

    this.spans.push(span);
    return span;
  }

  endSpan(spanId, status = 'OK') {
    const span = this.spans.find(s => s.spanId === spanId);
    if (span) {
      span.status = status;
      span.endTime = Date.now();
      span.durationMs = span.endTime - span.startTime;
    }
    return span;
  }

  // Generate HTTP carrier inject context headers
  injectCarrier(span) {
    return {
      'x-trace-id': span.traceId,
      'x-span-id': span.spanId,
      'x-tenant-id': span.tenantId || '',
      'x-branch-id': span.branchId || '',
      'x-request-id': span.requestId || ''
    };
  }

  extractCarrier(headers = {}) {
    return {
      traceId: headers['x-trace-id'] || null,
      spanId: headers['x-span-id'] || null,
      tenantId: headers['x-tenant-id'] || null,
      branchId: headers['x-branch-id'] || null,
      requestId: headers['x-request-id'] || null
    };
  }
}

module.exports = new OpenTelemetryTracer();
