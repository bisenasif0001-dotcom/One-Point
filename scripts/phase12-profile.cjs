const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8120;
const OUT_DIR = path.join(ROOT_DIR, 'artifacts', 'phase12');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Parse mode from args: --mode=baseline (default) or --mode=final
const modeArg = process.argv.find(a => a.startsWith('--mode='));
const MODE = modeArg ? modeArg.split('=')[1] : 'baseline';
const PREFIX = MODE === 'final' ? 'final' : 'baseline';

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
  };
  return map[ext] || 'application/octet-stream';
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const rawPath = req.url.split('?')[0].split('#')[0];
        let filePath = path.join(ROOT_DIR, rawPath === '/' ? 'index.html' : rawPath);
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found: ' + rawPath);
          return;
        }
        if (fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': getContentType(filePath),
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.message);
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

// 10 Representative Target Pages as mandated by Section 2
const TARGET_PAGES = [
  { id: 'home', name: 'Homepage', path: 'index.html' },
  { id: 'services', name: 'Services Directory', path: 'services.html' },
  { id: 'online-services', name: 'Online Services Hub', path: 'online-services.html' },
  { id: 'business', name: 'Business Solutions', path: 'business-solutions.html' },
  { id: 'pan', name: 'Service Detail (PAN Card)', path: 'service-pan-card.html' },
  { id: 'checkout', name: 'Checkout Page', path: 'checkout.html?service=new-pan&service_name=New+PAN+Card+Application' },
  { id: 'service-request', name: 'Service Request Console', path: 'service-request.html?service=passport-fresh&service_name=Fresh+Passport+Application' },
  { id: 'order-documents', name: 'Order Documents Console', path: 'order-documents.html?order=ORD-TEST-9921' },
  { id: 'education', name: 'Education Service (EduPoint)', path: 'edupoint.html' },
  { id: 'voter', name: 'Detailed Citizen Service (Voter ID)', path: 'service-voter-id.html' }
];

async function measurePagePerformance(browser, pageInfo) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const networkStats = {
    totalRequests: 0,
    totalBytes: 0,
    breakdown: {
      document: { count: 0, bytes: 0 },
      stylesheet: { count: 0, bytes: 0 },
      script: { count: 0, bytes: 0 },
      image: { count: 0, bytes: 0 },
      font: { count: 0, bytes: 0 },
      other: { count: 0, bytes: 0 }
    }
  };

  page.on('response', response => {
    try {
      const req = response.request();
      const type = req.resourceType();
      const headers = response.headers();
      const contentLength = headers['content-length'] ? parseInt(headers['content-length'], 10) : 0;
      
      networkStats.totalRequests++;
      networkStats.totalBytes += contentLength;

      const bucket = networkStats.breakdown[type] ? type : 'other';
      networkStats.breakdown[bucket].count++;
      networkStats.breakdown[bucket].bytes += contentLength;
    } catch (_) {}
  });

  // Inject performance observer before navigation
  await page.evaluateOnNewDocument(() => {
    window.__perfMetrics = {
      lcp: 0,
      cls: 0,
      tbt: 0,
      longTasks: 0
    };

    // LCP
    try {
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          window.__perfMetrics.lcp = entries[entries.length - 1].startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}

    // CLS
    try {
      new PerformanceObserver(entryList => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__perfMetrics.cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}

    // TBT approximation via Long Tasks (> 50ms)
    try {
      new PerformanceObserver(entryList => {
        for (const entry of entryList.getEntries()) {
          window.__perfMetrics.longTasks++;
          if (entry.duration > 50) {
            window.__perfMetrics.tbt += (entry.duration - 50);
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch (_) {}
  });

  const url = `http://127.0.0.1:${PORT}/${pageInfo.path}`;
  const startNav = Date.now();
  await page.goto(url, { waitUntil: 'networkidle0' });
  const navDuration = Date.now() - startNav;

  // Settle time for layout shifts & metrics
  await new Promise(r => setTimeout(r, 600));

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    const domNodes = document.getElementsByTagName('*').length;

    // Detect render blocking resources
    const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const renderBlockingCss = linkTags.filter(l => !l.media || l.media === 'all' || l.media === 'screen').length;
    const scriptTags = Array.from(document.querySelectorAll('head script[src]'));
    const renderBlockingJs = scriptTags.filter(s => !s.async && !s.defer && s.type !== 'module').length;

    // Image audit
    const imgs = Array.from(document.querySelectorAll('img'));
    const imgsWithoutDimensions = imgs.filter(i => !i.hasAttribute('width') || !i.hasAttribute('height')).length;
    const lazyImages = imgs.filter(i => i.loading === 'lazy').length;

    return {
      fcp: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
      lcp: Math.round(window.__perfMetrics.lcp || (fcpEntry ? fcpEntry.startTime : 0)),
      cls: Number((window.__perfMetrics.cls || 0).toFixed(4)),
      tbt: Math.round(window.__perfMetrics.tbt || 0),
      longTasksCount: window.__perfMetrics.longTasks,
      domNodes,
      domContentLoaded: nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : 0,
      loadEvent: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
      renderBlockingCss,
      renderBlockingJs,
      totalImages: imgs.length,
      imgsWithoutDimensions,
      lazyImages
    };
  });

  await page.close();

  return {
    ...pageInfo,
    url,
    navDuration,
    metrics,
    network: networkStats
  };
}

async function captureRepresentativeScreenshots(browser) {
  console.log(`\nCapturing Visual Regression Evidence (${MODE} mode)...`);
  const page = await browser.newPage();

  // Helper
  async function shoot(urlPath, viewport, filename) {
    await page.setViewport(viewport);
    await page.goto(`http://127.0.0.1:${PORT}/${urlPath}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    const dest = path.join(OUT_DIR, `${PREFIX}-${filename}.png`);
    await page.screenshot({ path: dest });
    console.log(`  ✓ Saved ${PREFIX}-${filename}.png (${viewport.width}x${viewport.height})`);
  }

  // 1. Homepage (320, 390, 1440)
  await shoot('index.html', { width: 320, height: 640 }, 'home-320');
  await shoot('index.html', { width: 390, height: 844 }, 'home-390');
  await shoot('index.html', { width: 1440, height: 900 }, 'home-1440');

  // 2. Services Directory (320, 390, 1440)
  await shoot('services.html', { width: 320, height: 640 }, 'services-320');
  await shoot('services.html', { width: 390, height: 844 }, 'services-390');
  await shoot('services.html', { width: 1440, height: 900 }, 'services-1440');

  // 3. Checkout (320, 390, 1440)
  await shoot('checkout.html?service=new-pan&service_name=New+PAN+Card+Application', { width: 320, height: 640 }, 'checkout-320');
  await shoot('checkout.html?service=new-pan&service_name=New+PAN+Card+Application', { width: 390, height: 844 }, 'checkout-390');
  await shoot('checkout.html?service=new-pan&service_name=New+PAN+Card+Application', { width: 1440, height: 900 }, 'checkout-1440');

  // 4. Service Request (320, 1440)
  await shoot('service-request.html?service=passport-fresh&service_name=Fresh+Passport+Application', { width: 320, height: 640 }, 'service-request-320');
  await shoot('service-request.html?service=passport-fresh&service_name=Fresh+Passport+Application', { width: 1440, height: 900 }, 'service-request-1440');

  // 5. Order Documents (320, 1440)
  await shoot('order-documents.html?order=ORD-TEST-9921', { width: 320, height: 640 }, 'order-documents-320');
  await shoot('order-documents.html?order=ORD-TEST-9921', { width: 1440, height: 900 }, 'order-documents-1440');

  // 6. Cart Drawer (320, 1440)
  for (const vp of [{ width: 320, height: 640, name: '320' }, { width: 1440, height: 900, name: '1440' }]) {
    await page.setViewport(vp);
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const cartToggle = await page.$('[data-cart-toggle]');
    if (cartToggle) {
      await cartToggle.click();
      await new Promise(r => setTimeout(r, 500));
    }
    const dest = path.join(OUT_DIR, `${PREFIX}-cart-drawer-${vp.name}.png`);
    await page.screenshot({ path: dest });
    console.log(`  ✓ Saved ${PREFIX}-cart-drawer-${vp.name}.png`);
  }

  // 7. Comparison Table (mobile 390 & desktop 1440)
  await shoot('online-services.html', { width: 390, height: 844 }, 'comparison-390');
  await shoot('online-services.html', { width: 1440, height: 900 }, 'comparison-1440');

  // 8. PAN Service Selection State (1440)
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/service-pan-card.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  // Scroll to comparison/pricing section
  await page.evaluate(() => {
    const el = document.querySelector('.pan-pricing-section, .edc-transparent-pricing-grid, #pricing, .pricing-table') || document.body;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 500));
  const panDest = path.join(OUT_DIR, `${PREFIX}-pan-selection-1440.png`);
  await page.screenshot({ path: panDest });
  console.log(`  ✓ Saved ${PREFIX}-pan-selection-1440.png`);

  await page.close();
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`PHASE 12 PERFORMANCE PROFILER [MODE: ${MODE.toUpperCase()}]`);
  console.log(`======================================================`);
  console.log(`Starting static server on port ${PORT}...`);
  const server = await startStaticServer();

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const runResults = {
    timestamp: new Date().toISOString(),
    mode: MODE,
    environment: {
      browser: 'Headless Chrome (Puppeteer)',
      os: 'Windows 11 Local',
      port: PORT,
      viewportLab: '1440x900 default for core vitals profiling'
    },
    pages: []
  };

  try {
    for (const pageInfo of TARGET_PAGES) {
      console.log(`\nProfiling ${pageInfo.name} (${pageInfo.path})...`);
      const res = await measurePagePerformance(browser, pageInfo);
      runResults.pages.push(res);
      console.log(`  FCP: ${res.metrics.fcp}ms | LCP: ${res.metrics.lcp}ms | CLS: ${res.metrics.cls} | TBT: ${res.metrics.tbt}ms`);
      console.log(`  Requests: ${res.network.totalRequests} | Total Bytes: ${(res.network.totalBytes / 1024).toFixed(1)} KB | DOM Nodes: ${res.metrics.domNodes}`);
      console.log(`  Render-blocking CSS: ${res.metrics.renderBlockingCss} | Render-blocking JS: ${res.metrics.renderBlockingJs}`);
      console.log(`  Images without dimensions: ${res.metrics.imgsWithoutDimensions}/${res.metrics.totalImages}`);
    }

    // Capture visual regression screenshots
    await captureRepresentativeScreenshots(browser);

    const reportFile = path.join(OUT_DIR, `${MODE}-metrics.json`);
    fs.writeFileSync(reportFile, JSON.stringify(runResults, null, 2), 'utf8');
    console.log(`\n✓ ${MODE.toUpperCase()} metrics and screenshots saved to: ${reportFile}`);

  } catch (err) {
    console.error('Profiling error:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

run();
