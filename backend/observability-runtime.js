/**
 * EROS OpenTelemetry and Prometheus Observability Runtime
 * Phase 18.0 / v2.0 Implementation
 */

const { erosRuntime } = require('./eros-runtime');

class ObservabilityRuntime {
  constructor() {
    this.metricsStore = new Map();
    this.traces = [];
  }

  // Record a Prometheus counter / value
  recordMetric(name, value = 1, labels = {}) {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    const metricKey = labelStr ? `${name}{${labelStr}}` : name;
    
    const current = this.metricsStore.get(metricKey) || 0;
    this.metricsStore.set(metricKey, current + value);
  }

  // Start OpenTelemetry span tracer
  startSpan(name, attributes = {}) {
    const spanId = "SPAN-" + Math.random().toString(36).substring(7).toUpperCase();
    const span = {
      spanId,
      name,
      attributes,
      startTime: Date.now(),
      status: "active"
    };
    this.traces.push(span);
    return span;
  }

  endSpan(spanId, status = "ok") {
    const span = this.traces.find(s => s.spanId === spanId);
    if (span) {
      span.status = status;
      span.endTime = Date.now();
      span.durationMs = span.endTime - span.startTime;
      this.recordMetric("span_duration_ms", span.durationMs, { name: span.name, status });
    }
  }

  // Render Prometheus text metrics format
  getPrometheusMetrics() {
    let output = "";
    for (const [key, val] of this.metricsStore.entries()) {
      const metricName = key.split('{')[0];
      output += `# HELP ${metricName} System metric auto generated\n`;
      output += `# TYPE ${metricName} counter\n`;
      output += `${key} ${val}\n\n`;
    }
    return output;
  }
}

module.exports = new ObservabilityRuntime();
