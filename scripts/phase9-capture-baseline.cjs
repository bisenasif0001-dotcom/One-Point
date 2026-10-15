const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8092;

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
    '.ico': 'image/x-icon'
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
        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
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

async function run() {
  console.log('Starting static server on port ' + PORT + '...');
  const server = await startStaticServer();

  const outDir = path.join(ROOT_DIR, 'artifacts', 'phase9');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { width: 320, height: 640, name: '320' },
    { width: 390, height: 844, name: '390' },
    { width: 768, height: 1024, name: '768' },
    { width: 1440, height: 900, name: '1440' }
  ];

  const captureTasks = [
    {
      pagePath: 'services.html',
      selector: '.shub-trust-section',
      prefix: 'before-services-trust'
    },
    {
      pagePath: 'online-services.html',
      selector: '.ghub-cmp-table',
      prefix: 'before-online-cmp'
    },
    {
      pagePath: 'business-solutions.html',
      selector: '.biz-cmp-table',
      prefix: 'before-biz-matrix'
    },
    {
      pagePath: 'service-business-registration-corporate-setup.html',
      selector: '.biz-matrix-shell',
      prefix: 'before-corp-matrix'
    },
    {
      pagePath: 'service-pan-card.html',
      selector: '.voter-services-grid',
      prefix: 'before-pan-cards'
    },
    {
      pagePath: 'service-ration-card-assistance.html',
      selector: '.ration-services-grid',
      prefix: 'before-ration-cards'
    }
  ];

  console.log('Capturing baseline screenshots for Phase 9...');

  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const task of captureTasks) {
      const url = `http://127.0.0.1:${PORT}/${task.pagePath}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 600));

      const el = await page.$(task.selector);
      if (el) {
        const outPath = path.join(outDir, `${task.prefix}-${vp.name}.png`);
        await el.screenshot({ path: outPath });
        console.log(`Saved element capture: ${task.prefix}-${vp.name}.png`);
      } else {
        const outPath = path.join(outDir, `${task.prefix}-${vp.name}.png`);
        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`Saved viewport capture (selector missing): ${task.prefix}-${vp.name}.png`);
      }
    }
    await page.close();
  }

  // Record baseline metrics
  const baselineMetrics = {
    timestamp: new Date().toISOString(),
    pagesInspected: [
      'services.html',
      'online-services.html',
      'business-solutions.html',
      'service-business-registration-corporate-setup.html',
      'service-pan-card.html',
      'service-ration-card-assistance.html'
    ],
    findings: {
      fakeRatingsFound: [
        {
          file: 'services.html',
          element: '.shub-trust-card (4.8★ Rating, 1,200+ reviews)',
          status: 'UNVERIFIED'
        },
        {
          file: 'services.html',
          element: '.shub-trust-card (12,000+ Service Requests)',
          status: 'UNVERIFIED'
        }
      ],
      unsupportedGuaranteesFound: [
        {
          file: 'business-solutions.html',
          text: 'Zero-Rejection Guarantee (line 4121)',
          status: 'UNVERIFIED_GUARANTEE'
        },
        {
          file: 'business-solutions.html',
          text: 'Guaranteed Priority SLA Dispatch (line 4906)',
          status: 'UNVERIFIED_GUARANTEE'
        },
        {
          file: 'business-solutions.html',
          text: '100% Assistance Refund Guarantee (line 4866)',
          status: 'MISALIGNED_POLICY_TERM'
        },
        {
          file: 'business-solutions.html',
          text: '100% Assisted Error-Free Guarantee (line 4287)',
          status: 'UNVERIFIED_GUARANTEE'
        }
      ],
      comparisonMobileClipping: [
        {
          file: 'service-business-registration-corporate-setup.html',
          element: '.biz-matrix-table (min-width: 720px)',
          issue: 'Requires horizontal side-scrolling on screens <= 768px'
        },
        {
          file: 'business-solutions.html',
          element: '.biz-matrix-table (min-width: 620px)',
          issue: 'Requires horizontal side-scrolling on screens <= 680px'
        },
        {
          file: 'service-gst-registration.html',
          element: '.tax-fee-table (5 columns)',
          issue: 'Requires horizontal side-scrolling on mobile'
        },
        {
          file: 'service-income-tax-assistance.html',
          element: '.tax-fee-table (4 columns)',
          issue: 'Requires horizontal side-scrolling on mobile'
        }
      ],
      panServiceDistinction: {
        panAadhaarLink: {
          file: 'service-pan-card.html',
          displayPrice: '₹100',
          catalogPrice: 99,
          destination: 'checkout.html?service=pan-aadhaar-link&service_name=PAN%E2%80%93Aadhaar+Linking+%26+Status+Support'
        },
        duplicatePanSurrender: {
          file: 'service-pan-card.html',
          displayPrice: '₹250',
          catalogPrice: 199,
          destination: 'checkout.html?service=duplicate-pan-surrender&service_name=Duplicate+PAN+Surrender+Guidance'
        },
        status: 'DISTINCT_SELECTION_AND_ROUTING'
      }
    }
  };

  fs.writeFileSync(
    path.join(outDir, 'baseline-metrics.json'),
    JSON.stringify(baselineMetrics, null, 2),
    'utf-8'
  );
  console.log('Saved artifacts/phase9/baseline-metrics.json');

  await browser.close();
  server.close();
  console.log('Baseline capture complete.');
}

run().catch(err => {
  console.error('Baseline capture error:', err);
  process.exit(1);
});
