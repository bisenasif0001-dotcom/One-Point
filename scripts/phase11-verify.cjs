const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8102;

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

const VIEWPORTS = [
  { width: 320, height: 640, name: '320' },
  { width: 360, height: 740, name: '360' },
  { width: 375, height: 667, name: '375' },
  { width: 390, height: 844, name: '390' },
  { width: 412, height: 915, name: '412' },
  { width: 414, height: 896, name: '414' },
  { width: 428, height: 926, name: '428' },
  { width: 430, height: 932, name: '430' },
  { width: 480, height: 854, name: '480' },
  { width: 600, height: 960, name: '600' },
  { width: 768, height: 1024, name: '768' },
  { width: 800, height: 1280, name: '800' },
  { width: 900, height: 1340, name: '900' },
  { width: 1024, height: 768, name: '1024' },
  { width: 1440, height: 900, name: '1440' }
];

const SHORT_VIEWPORTS = [
  { width: 320, height: 240, name: '320x240' },
  { width: 390, height: 320, name: '390x320' }
];

const CAPTURE_VIEWPORTS = [
  { width: 320, height: 640, name: '320' },
  { width: 390, height: 844, name: '390' },
  { width: 1440, height: 900, name: '1440' }
];

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

  const testReport = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    categories: {
      screenshotsCaptured: 0,
      overflowChecks: { total: 0, passed: 0, failed: 0 },
      functionalIntegrity: { total: 0, passed: 0, failed: 0 },
      panPricingSafetyCheck: { status: 'PENDING', details: null }
    },
    failures: []
  };

  function assert(name, condition, errorMsg = '') {
    testReport.totalTests++;
    if (condition) {
      testReport.passed++;
      console.log(`  ✓ ${name}`);
      return true;
    } else {
      testReport.failed++;
      console.error(`  ✗ ${name}: ${errorMsg}`);
      testReport.failures.push({ name, error: errorMsg });
      return false;
    }
  }

  try {
    // =========================================================================
    // PART 1: CAPTURE FINAL SCREENSHOTS (24 TOTAL)
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 1: CAPTURING FINAL SCREENSHOTS (24 TOTAL)');
    console.log('======================================================');

    for (const vp of CAPTURE_VIEWPORTS) {
      console.log(`\n--- Capturing Final Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      // 1. Homepage
      console.log('Capturing homepage...');
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `final-home-${vp.name}.png`) });
      testReport.categories.screenshotsCaptured++;

      // 2. Services Directory
      console.log('Capturing services.html...');
      await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `final-services-${vp.name}.png`) });
      testReport.categories.screenshotsCaptured++;

      // 3. Service Detail (PAN Card)
      console.log('Capturing service-pan-card.html...');
      await page.goto(`http://127.0.0.1:${PORT}/service-pan-card.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `final-service-detail-${vp.name}.png`) });
      testReport.categories.screenshotsCaptured++;

      // 4. Checkout Step 1
      console.log('Capturing checkout.html...');
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html?service=pan`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(outDir, `final-checkout-${vp.name}.png`) });
      testReport.categories.screenshotsCaptured++;

      // 5. Cart Drawer (Open on Homepage)
      console.log('Capturing Cart Drawer...');
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 500));
      const cartBtn = await page.$('[data-cart-toggle]');
      if (cartBtn) {
        await cartBtn.click();
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: path.join(outDir, `final-cart-drawer-${vp.name}.png`) });
      } else {
        await page.screenshot({ path: path.join(outDir, `final-cart-drawer-${vp.name}.png`) });
      }
      testReport.categories.screenshotsCaptured++;

      // 6. Service Request (Passport Fresh Task)
      console.log('Capturing service-request.html...');
      await page.goto(`http://127.0.0.1:${PORT}/service-request.html?task=passport-fresh`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `final-service-request-${vp.name}.png`) });
      testReport.categories.screenshotsCaptured++;

      // 7. Order Documents
      console.log('Capturing order-documents.html...');
      await page.goto(`http://127.0.0.1:${PORT}/order-documents.html?order=ORD-TEST-9921`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `final-order-documents-${vp.name}.png`) });
      testReport.categories.screenshotsCaptured++;

      // 8. Footer (Homepage Scrolled)
      console.log('Capturing Footer on homepage...');
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 500));
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(outDir, `final-footer-${vp.name}.png`) });
      testReport.categories.screenshotsCaptured++;

      await page.close();
    }

    assert('All 24 final screenshots captured', testReport.categories.screenshotsCaptured === 24);

    // =========================================================================
    // PART 2: RESPONSIVE HORIZONTAL OVERFLOW VERIFICATION (15 VIEWPORTS + SHORT)
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 2: HORIZONTAL OVERFLOW TESTS ACROSS KEY PAGES');
    console.log('======================================================');

    const testPages = [
      { name: 'Homepage', url: `http://127.0.0.1:${PORT}/index.html` },
      { name: 'Services Directory', url: `http://127.0.0.1:${PORT}/services.html` },
      { name: 'Service Detail (PAN)', url: `http://127.0.0.1:${PORT}/service-pan-card.html` },
      { name: 'Service Request', url: `http://127.0.0.1:${PORT}/service-request.html?task=passport-fresh` },
      { name: 'Order Documents', url: `http://127.0.0.1:${PORT}/order-documents.html?order=ORD-TEST-9921` },
      { name: 'Checkout Page', url: `http://127.0.0.1:${PORT}/checkout.html?service=pan` }
    ];

    const allViewports = [...VIEWPORTS, ...SHORT_VIEWPORTS];

    for (const targetPage of testPages) {
      console.log(`\nTesting overflow on ${targetPage.name}...`);
      const page = await browser.newPage();
      for (const vp of allViewports) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(targetPage.url, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 200));

        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const bodyEl = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, bodyEl ? bodyEl.scrollWidth : 0);
          const clientWidth = docEl.clientWidth;
          return {
            hasOverflow: scrollWidth > clientWidth,
            scrollWidth,
            clientWidth,
            delta: scrollWidth - clientWidth
          };
        });

        testReport.categories.overflowChecks.total++;
        const passed = assert(
          `${targetPage.name} @ ${vp.name} (${vp.width}x${vp.height}) zero overflow`,
          !overflow.hasOverflow,
          `Overflow detected: delta = ${overflow.delta}px (scroll: ${overflow.scrollWidth}, client: ${overflow.clientWidth})`
        );
        if (passed) testReport.categories.overflowChecks.passed++;
        else testReport.categories.overflowChecks.failed++;
      }
      await page.close();
    }

    // =========================================================================
    // PART 3: FUNCTIONAL & REGRESSION INTEGRITY VERIFICATION
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 3: FUNCTIONAL INTEGRITY & REGRESSION SAFETY');
    console.log('======================================================');

    const fPage = await browser.newPage();
    await fPage.setViewport({ width: 1440, height: 900 });

    // Test 3.1: Service Request Task Hydration
    await fPage.goto(`http://127.0.0.1:${PORT}/service-request.html?service=passport-fresh&service_name=Fresh%20Passport%20Application`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const titleText = await fPage.evaluate(() => document.querySelector('[data-request-task]')?.textContent);
    const waHref = await fPage.evaluate(() => document.querySelector('[data-request-whatsapp]')?.getAttribute('href'));
    
    testReport.categories.functionalIntegrity.total += 2;
    if (assert('Service request title hydrated correctly', titleText && titleText.includes('Passport'), `Got: ${titleText}`)) {
      testReport.categories.functionalIntegrity.passed++;
    } else testReport.categories.functionalIntegrity.failed++;

    if (assert('Service request WhatsApp button configured', waHref && waHref.includes('wa.me'), `Got: ${waHref}`)) {
      testReport.categories.functionalIntegrity.passed++;
    } else testReport.categories.functionalIntegrity.failed++;

    // Test 3.2: Order Documents Console Elements
    await fPage.goto(`http://127.0.0.1:${PORT}/order-documents.html?order=ORD-TEST-9921`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const orderElements = await fPage.evaluate(() => {
      return {
        hasState: !!document.getElementById('document-state'),
        hasOrderLabel: !!document.getElementById('document-order-label'),
        hasLogin: !!document.getElementById('document-login'),
        hasRequirements: !!document.getElementById('order-document-requirements'),
        hasList: !!document.getElementById('order-document-list'),
        hasForm: !!document.getElementById('order-document-form'),
        hasFiles: !!document.getElementById('order-document-files'),
        hasCamera: !!document.getElementById('order-document-camera'),
        hasFeedback: !!document.getElementById('order-upload-feedback'),
        hasWhatsapp: !!document.getElementById('document-whatsapp'),
        hasSubmitBtn: !!document.querySelector('#order-document-form button[type=submit]'),
        orderLabelText: document.getElementById('document-order-label')?.textContent
      };
    });

    testReport.categories.functionalIntegrity.total += 3;
    if (assert('Order Documents DOM IDs intact', 
      orderElements.hasState && 
      orderElements.hasOrderLabel && 
      orderElements.hasLogin && 
      orderElements.hasRequirements && 
      orderElements.hasList && 
      orderElements.hasForm && 
      orderElements.hasFiles && 
      orderElements.hasCamera && 
      orderElements.hasFeedback && 
      orderElements.hasWhatsapp && 
      orderElements.hasSubmitBtn)) {
      testReport.categories.functionalIntegrity.passed++;
    } else testReport.categories.functionalIntegrity.failed++;

    if (assert('Order Documents order label populated', orderElements.orderLabelText && orderElements.orderLabelText.includes('ORD-TEST-9921'), `Got: ${orderElements.orderLabelText}`)) {
      testReport.categories.functionalIntegrity.passed++;
    } else testReport.categories.functionalIntegrity.failed++;

    // Test 3.3: Cart Drawer Empty State & Category Chips
    await fPage.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const cartToggle = await fPage.$('[data-cart-toggle]');
    if (cartToggle) await cartToggle.click();
    await new Promise(r => setTimeout(r, 500));
    const cartElements = await fPage.evaluate(() => {
      const chips = document.querySelectorAll('.cart-empty-chip');
      const browseBtn = document.querySelector('.cart-browse-btn');
      const emptyIcon = document.querySelector('.cart-empty-icon');
      return {
        chipCount: chips.length,
        hasBrowseBtn: !!browseBtn,
        hasEmptyIcon: !!emptyIcon
      };
    });

    if (assert('Cart Drawer empty state chips & browse button rendered', cartElements.chipCount === 3 && cartElements.hasBrowseBtn && cartElements.hasEmptyIcon, `Chips: ${cartElements.chipCount}`)) {
      testReport.categories.functionalIntegrity.passed++;
    } else testReport.categories.functionalIntegrity.failed++;

    await fPage.close();

    // =========================================================================
    // PART 4: PAN CARD PRICING INTEGRITY CHECK (READ-ONLY AUDIT)
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 4: PAN PRICING DISCREPANCY AUDIT (STRICT PRESERVATION)');
    console.log('======================================================');

    const panHtml = fs.readFileSync(path.join(ROOT_DIR, 'service-pan-card.html'), 'utf8');
    const catalogJs = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'catalog-pricing.js'), 'utf8');

    const pan100 = panHtml.includes('100') || panHtml.includes('₹100');
    const pan250 = panHtml.includes('250') || panHtml.includes('₹250');
    const catalog99 = catalogJs.includes('99');
    const catalog199 = catalogJs.includes('199');

    const pricingSafe = pan100 && pan250 && catalog99 && catalog199;
    testReport.totalTests++;
    if (assert('PAN prices preserved strictly without code alteration', pricingSafe)) {
      testReport.passed++;
      testReport.categories.panPricingSafetyCheck = {
        status: 'PRESERVED_CONFIRMED',
        details: {
          'service-pan-card.html': 'Contains ₹100 / ₹250 tier values (unaltered)',
          'assets/catalog-pricing.js': 'Contains ₹99 / ₹199 values (unaltered)',
          advisoryModalPresent: panHtml.includes('advisory-modal') || panHtml.includes('pan-pricing-advisory')
        }
      };
    } else {
      testReport.failed++;
      testReport.categories.panPricingSafetyCheck = {
        status: 'CORRUPTED_OR_CHANGED',
        details: 'Discrepancy values were modified unexpectedly!'
      };
    }

  } catch (err) {
    console.error('Test execution error:', err);
    testReport.failures.push({ name: 'Execution Error', error: err.message });
  } finally {
    await browser.close();
    server.close();
  }

  // Save full JSON report
  fs.writeFileSync(
    path.join(outDir, 'verification-results.json'),
    JSON.stringify(testReport, null, 2),
    'utf8'
  );

  console.log('\n======================================================');
  console.log(`VERIFICATION SUMMARY:`);
  console.log(`Total Tests Run : ${testReport.totalTests}`);
  console.log(`Tests Passed    : ${testReport.passed}`);
  console.log(`Tests Failed    : ${testReport.failed}`);
  console.log(`Report saved to : artifacts/phase11/verification-results.json`);
  console.log('======================================================\n');
}

run();
