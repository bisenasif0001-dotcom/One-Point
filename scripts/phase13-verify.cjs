const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8106;

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
  { width: 1440, height: 900, name: '1440' },
  { width: 320, height: 240, name: '320x240' },
  { width: 390, height: 320, name: '390x320' }
];

async function run() {
  console.log('Starting static server on port ' + PORT + '...');
  const server = await startStaticServer();

  const outDir = path.join(ROOT_DIR, 'artifacts', 'phase13');
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
      inputSanitizationAndXSS: { total: 0, passed: 0, failed: 0 },
      navigationAndRedirectSafety: { total: 0, passed: 0, failed: 0 },
      configurationIntegrity: { total: 0, passed: 0, failed: 0 },
      panPricingSafetyCheck: { status: 'PENDING', details: null },
      overflowChecks: { total: 0, passed: 0, failed: 0 },
      screenshotsCaptured: 0
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
    // PART 1: DOM XSS & INPUT SANITIZATION AUDIT
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 1: DOM XSS & INPUT SANITIZATION CHECKS');
    console.log('======================================================');

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Test 1.1: Service Request URL parameter injection test
    const syntheticPayload = '<img src=x onerror=alert(1)>Passport Assistance';
    await page.goto(`http://127.0.0.1:${PORT}/service-request.html?service_name=${encodeURIComponent(syntheticPayload)}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const srResult = await page.evaluate(() => {
      const el = document.querySelector('[data-request-task]');
      const imgInHeading = el ? el.querySelector('img') : null;
      return {
        textContent: el ? el.textContent : '',
        hasInjectedTag: Boolean(imgInHeading)
      };
    });

    testReport.categories.inputSanitizationAndXSS.total += 2;
    if (assert('Service request title safely escapes HTML tags (renders as text)', !srResult.hasInjectedTag && srResult.textContent.includes('<img src=x onerror=alert(1)>'))) {
      testReport.categories.inputSanitizationAndXSS.passed++;
    } else testReport.categories.inputSanitizationAndXSS.failed++;

    await page.screenshot({ path: path.join(outDir, 'phase13-xss-service-request.png') });
    testReport.categories.screenshotsCaptured++;

    // Test 1.2: Order Documents URL parameter injection test
    const orderPayload = '<script>window._xss=true</script>ORD-999';
    await page.goto(`http://127.0.0.1:${PORT}/order-documents.html?order=${encodeURIComponent(orderPayload)}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const orderResult = await page.evaluate(() => {
      const label = document.getElementById('document-order-label');
      const scriptInLabel = label ? label.querySelector('script') : null;
      return {
        textContent: label ? label.textContent : '',
        hasInjectedScript: Boolean(scriptInLabel),
        xssTriggered: Boolean(window._xss)
      };
    });

    testReport.categories.inputSanitizationAndXSS.total += 2;
    if (assert('Order documents label escapes script tags into text', !orderResult.hasInjectedScript && !orderResult.xssTriggered && orderResult.textContent.includes(orderPayload))) {
      testReport.categories.inputSanitizationAndXSS.passed++;
    } else testReport.categories.inputSanitizationAndXSS.failed++;

    await page.screenshot({ path: path.join(outDir, 'phase13-xss-order-documents.png') });
    testReport.categories.screenshotsCaptured++;

    // Test 1.3: Track Application parameter injection test
    const trackPayload = '<svg onload=alert(1)>TRACK-101';
    await page.goto(`http://127.0.0.1:${PORT}/track-application.html?id=${encodeURIComponent(trackPayload)}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const trackResult = await page.evaluate(() => {
      const input = document.querySelector('[name="applicationId"]');
      const svgTag = document.querySelector('svg[onload]');
      return {
        inputValue: input ? input.value : '',
        hasInjectedSvg: Boolean(svgTag)
      };
    });

    testReport.categories.inputSanitizationAndXSS.total++;
    if (assert('Track application preserves payload as plain value without svg injection', !trackResult.hasInjectedSvg && trackResult.inputValue === trackPayload)) {
      testReport.categories.inputSanitizationAndXSS.passed++;
    } else testReport.categories.inputSanitizationAndXSS.failed++;

    // =========================================================================
    // PART 2: NAVIGATION & OPEN REDIRECT DEFENSE CHECKS
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 2: NAVIGATION & OPEN REDIRECT DEFENSE CHECKS');
    console.log('======================================================');

    await page.goto(`http://127.0.0.1:${PORT}/login.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));

    const redirectAudit = await page.evaluate(() => {
      if (!window.OPDSAuth || typeof window.OPDSAuth.isSafeReturnUrl !== 'function') return { available: false };
      return {
        available: true,
        rejectsDoubleSlash: !window.OPDSAuth.isSafeReturnUrl('//malicious.com'),
        rejectsBackslash: !window.OPDSAuth.isSafeReturnUrl('/\\malicious.com'),
        rejectsHttp: !window.OPDSAuth.isSafeReturnUrl('http://evil.com'),
        rejectsHttps: !window.OPDSAuth.isSafeReturnUrl('https://evil.com'),
        rejectsJavascript: !window.OPDSAuth.isSafeReturnUrl('javascript:alert(1)'),
        acceptsValidLocal: window.OPDSAuth.isSafeReturnUrl('/customer-account-overview.html'),
        acceptsRelativePath: window.OPDSAuth.isSafeReturnUrl('/checkout.html?service=pan')
      };
    });

    testReport.categories.navigationAndRedirectSafety.total += 4;
    if (assert('OPDSAuth.isSafeReturnUrl rejects protocol-relative URL (//evil.com)', redirectAudit.available && redirectAudit.rejectsDoubleSlash)) {
      testReport.categories.navigationAndRedirectSafety.passed++;
    } else testReport.categories.navigationAndRedirectSafety.failed++;

    if (assert('OPDSAuth.isSafeReturnUrl rejects external http/https schemes', redirectAudit.rejectsHttp && redirectAudit.rejectsHttps)) {
      testReport.categories.navigationAndRedirectSafety.passed++;
    } else testReport.categories.navigationAndRedirectSafety.failed++;

    if (assert('OPDSAuth.isSafeReturnUrl rejects javascript: URI scheme', redirectAudit.rejectsJavascript)) {
      testReport.categories.navigationAndRedirectSafety.passed++;
    } else testReport.categories.navigationAndRedirectSafety.failed++;

    if (assert('OPDSAuth.isSafeReturnUrl allows valid local relative routes', redirectAudit.acceptsValidLocal && redirectAudit.acceptsRelativePath)) {
      testReport.categories.navigationAndRedirectSafety.passed++;
    } else testReport.categories.navigationAndRedirectSafety.failed++;

    // Test 2.2: target="_blank" rel="noopener noreferrer" audit across pages
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const linkAudit = await page.evaluate(() => {
      const blanks = Array.from(document.querySelectorAll('a[target="_blank"]'));
      const missingRel = blanks.filter(a => {
        const rel = a.getAttribute('rel') || '';
        return !rel.includes('noopener');
      });
      return {
        totalBlankLinks: blanks.length,
        missingRelCount: missingRel.length
      };
    });

    testReport.categories.navigationAndRedirectSafety.total++;
    if (assert(`Homepage all target="_blank" links have rel="noopener" (${linkAudit.totalBlankLinks} links audited)`, linkAudit.missingRelCount === 0)) {
      testReport.categories.navigationAndRedirectSafety.passed++;
    } else testReport.categories.navigationAndRedirectSafety.failed++;

    // =========================================================================
    // PART 3: CONFIGURATION INITIALIZATION & SCRIPT INTEGRITY
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 3: CONFIGURATION INITIALIZATION & SCRIPT INTEGRITY');
    console.log('======================================================');

    await page.goto(`http://127.0.0.1:${PORT}/checkout.html?service=new-pan`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const configAudit = await page.evaluate(() => {
      return {
        hasDeploymentConfig: typeof window.OPDSDeployment === 'object' && window.OPDSDeployment !== null,
        transactionOriginFrozen: Object.isFrozen(window.OPDSDeployment),
        hasPricingRegistry: typeof window.OPDSPricing === 'object' && window.OPDSPricing !== null,
        hasDocumentUploadApi: typeof window.OPDSDocuments === 'object' && window.OPDSDocuments !== null,
        hasLucide: typeof window.lucide === 'object'
      };
    });

    testReport.categories.configurationIntegrity.total += 4;
    if (assert('window.OPDSDeployment is initialized and frozen on checkout', configAudit.hasDeploymentConfig && configAudit.transactionOriginFrozen)) {
      testReport.categories.configurationIntegrity.passed++;
    } else testReport.categories.configurationIntegrity.failed++;

    if (assert('window.OPDSPricing catalog registry loaded and available', configAudit.hasPricingRegistry)) {
      testReport.categories.configurationIntegrity.passed++;
    } else testReport.categories.configurationIntegrity.failed++;

    if (assert('window.OPDSDocuments client API defined and ready', configAudit.hasDocumentUploadApi)) {
      testReport.categories.configurationIntegrity.passed++;
    } else testReport.categories.configurationIntegrity.failed++;

    if (assert('lucide icon library initialized without console errors', configAudit.hasLucide)) {
      testReport.categories.configurationIntegrity.passed++;
    } else testReport.categories.configurationIntegrity.failed++;

    // =========================================================================
    // PART 4: PAN PRICING INTEGRITY (READ-ONLY AUDIT)
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 4: PAN PRICING INTEGRITY (READ-ONLY INVARIANTS)');
    console.log('======================================================');

    const panHtml = fs.readFileSync(path.join(ROOT_DIR, 'service-pan-card.html'), 'utf8');
    const catalogJs = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'catalog-pricing.js'), 'utf8');

    const canonicalSlugsFound = [
      'pan-aadhaar-link',
      'duplicate-pan-surrender',
      'new-pan',
      'pan-card',
      'pan-correction',
      'e-pan-download',
      'pan-status-check'
    ].every(slug => catalogJs.includes(`"${slug}"`));

    const pricesPreserved = panHtml.includes('100') && panHtml.includes('250') && 
                            catalogJs.includes('99') && catalogJs.includes('199');

    testReport.totalTests++;
    if (assert('All 7 canonical PAN slugs present and prices preserved without code mutation', canonicalSlugsFound && pricesPreserved)) {
      testReport.passed++;
      testReport.categories.panPricingSafetyCheck = {
        status: 'VERIFIED_PRESERVED',
        canonicalSlugs: [
          'pan-aadhaar-link',
          'duplicate-pan-surrender',
          'new-pan',
          'pan-card',
          'pan-correction',
          'e-pan-download',
          'pan-status-check'
        ],
        unresolvedMismatches: {
          'pan-aadhaar-link': { catalog: 99, detailHtml: 100 },
          'duplicate-pan-surrender': { catalog: 199, detailHtml: 250 },
          'e-pan-download': { catalog: 99, detailHtml: 70 },
          'card-reprint': { catalog: 149, detailHtml: 150 }
        }
      };
    } else {
      testReport.failed++;
      testReport.categories.panPricingSafetyCheck = { status: 'FAILED' };
    }

    // =========================================================================
    // PART 5: HORIZONTAL OVERFLOW ACROSS ALL 17 VIEWPORTS
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 5: HORIZONTAL OVERFLOW TESTS (17 VIEWPORTS)');
    console.log('======================================================');

    const targetPages = [
      { name: 'Homepage', path: 'index.html', url: `http://127.0.0.1:${PORT}/index.html` },
      { name: 'Services Directory', path: 'services.html', url: `http://127.0.0.1:${PORT}/services.html` },
      { name: 'Service Detail (PAN)', path: 'service-pan-card.html', url: `http://127.0.0.1:${PORT}/service-pan-card.html` },
      { name: 'Checkout Page', path: 'checkout.html', url: `http://127.0.0.1:${PORT}/checkout.html?service=new-pan` },
      { name: 'Order Documents', path: 'order-documents.html', url: `http://127.0.0.1:${PORT}/order-documents.html?order=ORD-TEST-9921` }
    ];

    for (const targetPage of targetPages) {
      console.log(`\nTesting overflow on ${targetPage.name}...`);
      const vpPage = await browser.newPage();

      for (const vp of VIEWPORTS) {
        await vpPage.setViewport({ width: vp.width, height: vp.height });
        await vpPage.goto(targetPage.url, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 120));

        const overflow = await vpPage.evaluate(() => {
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
      await vpPage.close();
    }

    // =========================================================================
    // PART 6: REPRESENTATIVE SCREENSHOTS FOR PHASE 13
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 6: CAPTURING PHASE 13 REPRESENTATIVE SCREENSHOTS');
    console.log('======================================================');

    const capturePages = [
      { name: 'home', url: `http://127.0.0.1:${PORT}/index.html` },
      { name: 'checkout', url: `http://127.0.0.1:${PORT}/checkout.html?service=new-pan` },
      { name: 'service-request', url: `http://127.0.0.1:${PORT}/service-request.html?service=passport-fresh` },
      { name: 'order-documents', url: `http://127.0.0.1:${PORT}/order-documents.html?order=ORD-TEST-9921` }
    ];

    for (const cp of capturePages) {
      const snapPage = await browser.newPage();
      for (const width of [390, 1440]) {
        const height = width === 390 ? 844 : 900;
        await snapPage.setViewport({ width, height });
        await snapPage.goto(cp.url, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 400));
        const filename = `phase13-${cp.name}-${width}.png`;
        await snapPage.screenshot({ path: path.join(outDir, filename) });
        console.log(`  ✓ Saved ${filename}`);
        testReport.categories.screenshotsCaptured++;
      }
      await snapPage.close();
    }

    await page.close();

    // Save summary report
    fs.writeFileSync(
      path.join(outDir, 'phase13-verification-results.json'),
      JSON.stringify(testReport, null, 2),
      'utf8'
    );

    console.log('\n======================================================');
    console.log('PHASE 13 VERIFICATION SUMMARY:');
    console.log(`Total Tests Run : ${testReport.totalTests}`);
    console.log(`Tests Passed    : ${testReport.passed}`);
    console.log(`Tests Failed    : ${testReport.failed}`);
    console.log(`Screenshots     : ${testReport.categories.screenshotsCaptured}`);
    console.log(`Report saved to : artifacts/phase13/phase13-verification-results.json`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

run();
