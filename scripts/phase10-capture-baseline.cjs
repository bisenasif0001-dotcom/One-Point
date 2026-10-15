const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8094;

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

  const outDir = path.join(ROOT_DIR, 'artifacts', 'phase10');
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

  const metrics = {
    capturedAt: new Date().toISOString(),
    viewports: viewports.map(v => v.name),
    pages: {}
  };

  try {
    for (const vp of viewports) {
      console.log(`\n--- Capturing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      // 1. Checkout default empty state
      console.log('Capturing checkout default...');
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({
        path: path.join(outDir, `baseline-checkout-default-${vp.name}.png`),
        fullPage: false
      });

      // 2. Checkout validation error state (click continue on step 1 with a service selected)
      console.log('Capturing checkout validation errors...');
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html?service=new-pan&service_name=New+PAN+Card+Application`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 800));
      // Attempt click continue to trigger validation
      await page.evaluate(() => {
        const btn = document.getElementById('service-continue-btn');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({
        path: path.join(outDir, `baseline-checkout-errors-${vp.name}.png`),
        fullPage: false
      });

      // 3. Service Request page
      console.log('Capturing service-request.html...');
      await page.goto(`http://127.0.0.1:${PORT}/service-request.html?service=ration-card-assistance&service_name=Ration+Card+Assistance`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({
        path: path.join(outDir, `baseline-service-request-${vp.name}.png`),
        fullPage: false
      });

      // 4. Order Documents page
      console.log('Capturing order-documents.html...');
      await page.goto(`http://127.0.0.1:${PORT}/order-documents.html?order=OPDS-TEST-1001`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({
        path: path.join(outDir, `baseline-order-documents-${vp.name}.png`),
        fullPage: false
      });

      // 5. Cart Drawer empty state on services.html
      console.log('Capturing cart drawer empty state on services.html...');
      await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 800));
      await page.evaluate(() => {
        // Clear cart to ensure empty
        localStorage.removeItem('opds_cart');
        const cartBtn = document.querySelector('[data-cart-button]');
        if (cartBtn) cartBtn.click();
      });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({
        path: path.join(outDir, `baseline-cart-drawer-${vp.name}.png`),
        fullPage: false
      });

      // 6. PAN Card selection options on service-pan-card.html
      console.log('Capturing service-pan-card.html...');
      await page.goto(`http://127.0.0.1:${PORT}/service-pan-card.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 800));
      // Scroll to voter-services-grid
      await page.evaluate(() => {
        const grid = document.querySelector('.voter-services-grid');
        if (grid) grid.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({
        path: path.join(outDir, `baseline-pan-pricing-${vp.name}.png`),
        fullPage: false
      });

      await page.close();
    }

    metrics.status = 'baseline_captured';
    fs.writeFileSync(path.join(outDir, 'baseline-metrics.json'), JSON.stringify(metrics, null, 2), 'utf8');
    console.log('\nBaseline capture complete! Saved to artifacts/phase10/');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('Error during baseline capture:', err);
  process.exit(1);
});
