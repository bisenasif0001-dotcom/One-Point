const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8101;

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

async function run() {
  console.log('Starting static server on port ' + PORT + '...');
  const server = await startStaticServer();

  const outDir = path.join(ROOT_DIR, 'artifacts', 'phase11');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { width: 320, height: 640, name: '320' },
    { width: 390, height: 844, name: '390' },
    { width: 1440, height: 900, name: '1440' }
  ];

  const auditLog = {
    capturedAt: new Date().toISOString(),
    viewports: viewports.map(v => v.name),
    pagesCaptured: []
  };

  try {
    for (const vp of viewports) {
      console.log(`\n--- Capturing Baseline Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      // 1. Homepage
      console.log('Capturing homepage...');
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `baseline-home-${vp.name}.png`) });

      // 2. Services Directory
      console.log('Capturing services.html...');
      await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `baseline-services-${vp.name}.png`) });

      // 3. Representative Service Detail Page (service-pan-card.html)
      if (vp.name !== '390') {
        console.log('Capturing service-pan-card.html...');
        await page.goto(`http://127.0.0.1:${PORT}/service-pan-card.html`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: path.join(outDir, `baseline-service-detail-${vp.name}.png`) });
      }

      // 4. Checkout Default (Empty)
      console.log('Capturing checkout default...');
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `baseline-checkout-default-${vp.name}.png`) });

      // 5. Checkout with Selected Service
      console.log('Capturing checkout with service...');
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html?service=new-pan&service_name=New+PAN+Card+Application`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `baseline-checkout-service-${vp.name}.png`) });

      // 6. Checkout Validation Error State (at 320 and 390)
      if (vp.name === '320' || vp.name === '390') {
        console.log('Capturing checkout validation errors...');
        await page.evaluate(() => {
          if (typeof window.continueFromStep1 === 'function') window.continueFromStep1();
          else {
            const btn = document.getElementById('mobile-checkout-cta') || document.getElementById('service-continue-btn');
            if (btn) btn.click();
          }
        });
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, `baseline-checkout-errors-${vp.name}.png`) });
      }

      // 7. Cart Drawer on services.html
      if (vp.name === '320' || vp.name === '1440') {
        console.log('Capturing cart drawer...');
        await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 500));
        await page.evaluate(() => {
          localStorage.removeItem('oneMartCart');
          localStorage.removeItem('opds_cart');
          const cartBtn = document.querySelector('[data-cart-button]');
          if (cartBtn) cartBtn.click();
        });
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, `baseline-cart-drawer-${vp.name}.png`) });
      }

      // 8. Service Request Page
      if (vp.name === '320' || vp.name === '1440') {
        console.log('Capturing service-request.html...');
        await page.goto(`http://127.0.0.1:${PORT}/service-request.html?service=ration-card-assistance&service_name=Ration+Card+Assistance`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: path.join(outDir, `baseline-service-request-${vp.name}.png`) });
      }

      // 9. Document Interface (order-documents.html)
      if (vp.name === '320' || vp.name === '1440') {
        console.log('Capturing order-documents.html...');
        await page.goto(`http://127.0.0.1:${PORT}/order-documents.html?order=OPDS-TEST-1001`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: path.join(outDir, `baseline-order-documents-${vp.name}.png`) });
      }

      // 10. Shared Header / Footer
      if (vp.name === '390' || vp.name === '1440') {
        console.log('Capturing footer...');
        await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 500));
        await page.evaluate(() => {
          const footer = document.querySelector('[data-site-footer], footer, .site-footer');
          if (footer) footer.scrollIntoView({ behavior: 'instant', block: 'end' });
        });
        await new Promise(r => setTimeout(r, 400));
        await page.screenshot({ path: path.join(outDir, `baseline-footer-${vp.name}.png`) });
      }

      await page.close();
    }

    auditLog.status = 'baseline_captured';
    fs.writeFileSync(path.join(outDir, 'baseline-visual-audit.json'), JSON.stringify(auditLog, null, 2), 'utf8');
    console.log('\nAll Phase 11 baseline screenshots captured successfully in artifacts/phase11/!');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('Error during Phase 11 baseline capture:', err);
  process.exit(1);
});
