/**
 * scripts/phase15-capture.cjs
 * OnePoint Suvidha Kendra - Phase 15 Final Visual Screenshot Quality Gate
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8108;
const ROOT = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(ROOT, reqPath);

      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('Not Found');
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        fs.createReadStream(filePath).pipe(res);
      });
    });

    server.listen(PORT, (err) => {
      if (err) return reject(err);
      console.log(`Phase 15 Capture Server running on port ${PORT}...`);
      resolve(server);
    });
  });
}

const VIEWPORTS = [
  // Mobile
  { category: 'mobile', name: '320', width: 320, height: 640, isMobile: true },
  { category: 'mobile', name: '390', width: 390, height: 844, isMobile: true },
  { category: 'mobile', name: '430', width: 430, height: 932, isMobile: true },
  // Tablet
  { category: 'tablet', name: '768', width: 768, height: 1024, isMobile: true },
  { category: 'tablet', name: '1024', width: 1024, height: 768, isMobile: false },
  // Desktop
  { category: 'desktop', name: '1440', width: 1440, height: 900, isMobile: false },
  { category: 'desktop', name: '1920', width: 1920, height: 1080, isMobile: false }
];

const PAGES = [
  { id: 'home', title: 'Homepage', url: `http://localhost:${PORT}/index.html` },
  { id: 'services', title: 'Services Directory', url: `http://localhost:${PORT}/services.html` },
  { id: 'online-services', title: 'Online Services', url: `http://localhost:${PORT}/online-services.html` },
  { id: 'business-solutions', title: 'Business Solutions', url: `http://localhost:${PORT}/business-solutions.html` },
  { id: 'education-services', title: 'Education Services', url: `http://localhost:${PORT}/edupoint-student-digital-services.html` },
  { id: 'pan-detail', title: 'PAN Service Detail', url: `http://localhost:${PORT}/service-pan-card.html` },
  { id: 'voter-detail', title: 'Voter Service Detail', url: `http://localhost:${PORT}/service-voter-id.html` },
  { id: 'service-request', title: 'Service Request', url: `http://localhost:${PORT}/service-request.html?service=ration-card-assistance` },
  { id: 'checkout', title: 'Checkout Page', url: `http://localhost:${PORT}/checkout.html?service=new-pan` },
  { id: 'order-documents', title: 'Order Documents', url: `http://localhost:${PORT}/order-documents.html?service=new-pan` },
  { id: 'login', title: 'Login Page', url: `http://localhost:${PORT}/login.html` },
  { id: 'track-application', title: 'Application Tracking', url: `http://localhost:${PORT}/track-application.html` },
  { id: 'contact', title: 'Contact Support', url: `http://localhost:${PORT}/contact.html` }
];

async function capture() {
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  let totalCaptured = 0;

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Capturing Category: ${vp.category.toUpperCase()} (${vp.name}px - ${vp.width}x${vp.height}) ---`);
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile
      });

      for (const p of PAGES) {
        try {
          await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          // brief settle
          await new Promise(r => setTimeout(r, 200));

          const filename = `${p.id}-${vp.name}.png`;
          const outPath = path.join(ROOT, 'artifacts/phase15/screenshots', vp.category, filename);
          await page.screenshot({ path: outPath, fullPage: false });
          totalCaptured++;
          process.stdout.write(`  ✓ ${filename}\n`);
        } catch (e) {
          console.error(`  ✗ Error capturing ${p.id} at ${vp.name}:`, e.message);
        }
      }

      // Capture special components: Cart Drawer and Footer
      try {
        await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        // Cart drawer
        await page.evaluate(() => {
          if (window.CartDrawer && typeof window.CartDrawer.open === 'function') {
            window.CartDrawer.open();
          } else {
            const btn = document.querySelector('[data-cart-toggle]') || document.querySelector('#cart-toggle-btn');
            if (btn) btn.click();
          }
        });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(ROOT, 'artifacts/phase15/screenshots', vp.category, `cart-drawer-${vp.name}.png`),
          fullPage: false
        });
        totalCaptured++;
        process.stdout.write(`  ✓ cart-drawer-${vp.name}.png\n`);

        // Footer element
        const footerElem = await page.$('footer') || await page.$('[data-site-footer]');
        if (footerElem) {
          await footerElem.scrollIntoView();
          await new Promise(r => setTimeout(r, 200));
          await page.screenshot({
            path: path.join(ROOT, 'artifacts/phase15/screenshots', vp.category, `footer-${vp.name}.png`),
            fullPage: false
          });
          totalCaptured++;
          process.stdout.write(`  ✓ footer-${vp.name}.png\n`);
        }
      } catch (e) {
        console.error(`  ✗ Error capturing cart/footer at ${vp.name}:`, e.message);
      }
    }

    console.log(`\n======================================================`);
    console.log(`Phase 15 Visual Screenshot Capture Complete!`);
    console.log(`Total Screenshots Captured: ${totalCaptured}`);
    console.log(`======================================================\n`);
  } finally {
    await page.close();
    await browser.close();
    server.close();
  }
}

capture().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
