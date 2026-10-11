// Local lab only: external fonts/icons/media and transactional APIs excluded equally.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const phase = process.argv.includes('--baseline') ? 'before' : 'after';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const relative = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !(relative.startsWith('assets/') || /^[\w-]+\.html$/.test(relative))) { res.writeHead(404).end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await (await import('puppeteer')).default.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results = [];
  try {
    for (const route of ['index.html', 'services.html', 'checkout.html?service=new-pan&category=e-services']) {
      for (let run = 0; run < 3; run++) {
        const page = await browser.newPage();
        await page.setViewport({ width: 390, height: 640, isMobile: true, hasTouch: true });
        await page.setCacheEnabled(false);
        await page.setRequestInterception(true);
        page.on('request', request => request.url().startsWith(base) && !request.url().includes('/api/') ? request.continue() : request.abort());
        const cdp = await page.createCDPSession();
        await cdp.send('Performance.enable');
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.evaluateOnNewDocument(() => {
          window.lab = { lcp: 0, cls: 0, longTasks: 0, longTaskMs: 0 };
          new PerformanceObserver(list => list.getEntries().forEach(e => window.lab.lcp = e.startTime)).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.lab.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver(list => list.getEntries().forEach(e => { window.lab.longTasks++; window.lab.longTaskMs += e.duration; })).observe({ type: 'longtask', buffered: true });
        });
        await page.goto(base + '/' + route, { waitUntil: 'load' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
        const result = await page.evaluate(() => ({ ...window.lab, localResourceBytes: performance.getEntriesByType('resource').filter(r => r.name.startsWith(location.origin)).reduce((sum, r) => sum + r.encodedBodySize, 0), customerImageRequested: performance.getEntriesByType('resource').some(r => r.name.includes('happy_indian_customer')), overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
        results.push({ route, run: run + 1, ...result, taskMs: metrics.TaskDuration * 1000, scriptMs: metrics.ScriptDuration * 1000 });
        assert(!result.overflow, 'Overflow: ' + route);
        await page.close();
      }
    }
    fs.writeFileSync(path.join(root, `artifacts/performance-${phase}.json`), JSON.stringify({ phase, environment: 'Chrome headless; 390x640; CPU 4x; uncached localhost; no network throttle; external resources and APIs blocked; 3 seconds after load; three runs. CLS is observation-window total, not full session window algorithm. Not field Core Web Vitals or INP.', results }, null, 2));
    if (phase === 'after' && fs.existsSync(path.join(root, 'artifacts/performance-before.json'))) {
      const before = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/performance-before.json'), 'utf8')).results;
      const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const summary = [...new Set(results.map(r => r.route))].map(route => ({ route, before: Object.fromEntries(['lcp', 'cls', 'localResourceBytes', 'taskMs', 'longTaskMs'].map(key => [key, median(before.filter(r => r.route === route).map(r => r[key]))])), after: Object.fromEntries(['lcp', 'cls', 'localResourceBytes', 'taskMs', 'longTaskMs'].map(key => [key, median(results.filter(r => r.route === route).map(r => r[key]))])) }));
      fs.writeFileSync(path.join(root, 'artifacts/performance-summary.json'), JSON.stringify({ units: 'milliseconds except bytes and unitless layout shift; lab only', summary }, null, 2));
    }
    console.log(JSON.stringify(results));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
