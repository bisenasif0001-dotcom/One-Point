/**
 * EROS Prometheus Metrics Exporter
 */

class PrometheusExporter {
  constructor() {
    this.metrics = new Map();
  }

  incrementCounter(name, value = 1, labels = {}) {
    const labelPairs = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    const key = labelPairs ? `${name}{${labelPairs}}` : name;

    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  setGauge(name, value, labels = {}) {
    const labelPairs = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    const key = labelPairs ? `${name}{${labelPairs}}` : name;

    this.metrics.set(key, value);
  }

  getMetricsResponse() {
    let output = "";
    for (const [key, val] of this.metrics.entries()) {
      const metricName = key.split('{')[0];
      output += `# HELP ${metricName} System metrics registry\n`;
      output += `# TYPE ${metricName} counter\n`;
      output += `${key} ${val}\n\n`;
    }
    return output;
  }

  reset() {
    this.metrics.clear();
  }
}

module.exports = new PrometheusExporter();
