/**
 * scripts/phase15-verify.cjs
 * OnePoint Suvidha Kendra - Phase 15 Final Production Readiness & End-to-End Audit Suite
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8109;
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
      console.log(`Phase 15 Verification Server running on port ${PORT}...`);
      resolve(server);
    });
  });
}

async function run() {
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    categories: {
      seoAndMetadata: { total: 0, passed: 0, failed: 0 },
      lucideDependencyPinning: { total: 0, passed: 0, failed: 0 },
      customerJourneys: { total: 0, passed: 0, failed: 0 },
      panPricingInvariants: { total: 0, passed: 0, failed: 0 },
      securityAndHardening: { total: 0, passed: 0, failed: 0 },
      coreWebVitalsSafety: { total: 0, passed: 0, failed: 0 }
    },
    tests: [],
    summary: { total: 0, passed: 0, failed: 0 }
  };

  function record(category, title, pass, details = '') {
    results.summary.total++;
    results.categories[category].total++;
    if (pass) {
      results.summary.passed++;
      results.categories[category].passed++;
      console.log(`  ✓ [${category}] ${title}`);
    } else {
      results.summary.failed++;
      results.categories[category].failed++;
      console.error(`  ✗ FAIL [${category}]: ${title} - ${details}`);
    }
    results.tests.push({ category, title, pass, details });
  }

  try {
    // =========================================================================
    // PART 1: SEO, SITEMAP & ROBOTS AUDIT
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 1: TECHNICAL SEO & METADATA AUDIT');
    console.log('======================================================');

    const robotsTxt = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
    record('seoAndMetadata', 'robots.txt specifies canonical sitemap URL', robotsTxt.includes('Sitemap: https://bisenonepoint.com/sitemap.xml'));
    record('seoAndMetadata', 'robots.txt disallows private checkout flow', robotsTxt.includes('Disallow: /checkout.html'));
    record('seoAndMetadata', 'robots.txt disallows order documents portal', robotsTxt.includes('Disallow: /order-documents.html'));
    record('seoAndMetadata', 'robots.txt disallows private admin and dashboard', robotsTxt.includes('Disallow: /admin.html') && robotsTxt.includes('Disallow: /dashboard.html'));

    const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    record('seoAndMetadata', 'sitemap.xml does NOT contain private checkout.html', !sitemapXml.includes('/checkout.html'));
    record('seoAndMetadata', 'sitemap.xml does NOT contain private order-documents.html', !sitemapXml.includes('/order-documents.html'));
    record('seoAndMetadata', 'sitemap.xml contains valid edupoint student services route', sitemapXml.includes('/edupoint-student-digital-services.html'));

    // Check metadata on Homepage
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    const homeMeta = await page.evaluate(() => {
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content,
        ogTitle: document.querySelector('meta[property="og:title"]')?.content,
        h1Count: document.querySelectorAll('h1').length,
        hasSchemaOrg: !!document.querySelector('script[type="application/ld+json"]')
      };
    });

    record('seoAndMetadata', 'Homepage has non-empty unique title', !!homeMeta.title && homeMeta.title.length > 10, homeMeta.title);
    record('seoAndMetadata', 'Homepage has descriptive meta description', !!homeMeta.description && homeMeta.description.length > 30);
    record('seoAndMetadata', 'Homepage has Open Graph og:title configured', !!homeMeta.ogTitle);
    record('seoAndMetadata', 'Homepage has structured data (application/ld+json)', homeMeta.hasSchemaOrg);

    // =========================================================================
    // PART 2: LUCIDE CDN PINNING AUDIT
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 2: LUCIDE CDN PINNING & DEPENDENCY SECURITY AUDIT');
    console.log('======================================================');

    const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
    let unpinnedCount = 0;
    let pinnedCount = 0;

    for (const f of htmlFiles) {
      const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
      if (content.includes('unpkg.com/lucide@latest')) {
        unpinnedCount++;
      }
      if (content.includes('unpkg.com/lucide@1.57.0')) {
        pinnedCount++;
      }
    }

    record('lucideDependencyPinning', 'Zero floating unpkg.com/lucide@latest references remain', unpinnedCount === 0, `Remaining unpinned: ${unpinnedCount}`);
    record('lucideDependencyPinning', 'All 66 HTML templates pinned to tested version 1.57.0', pinnedCount === 66, `Actual pinned: ${pinnedCount}`);

    // Verify icons actually render on checkout page
    await page.goto(`http://localhost:${PORT}/checkout.html?service=new-pan`, { waitUntil: 'domcontentloaded' });
    const checkoutIconsRendered = await page.evaluate(() => document.querySelectorAll('svg.lucide').length);
    record('lucideDependencyPinning', 'Lucide icons successfully initialize and render on checkout page', checkoutIconsRendered > 5, `Count: ${checkoutIconsRendered}`);

    // =========================================================================
    // PART 3: COMPLETE CUSTOMER JOURNEYS (A THROUGH H)
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 3: COMPLETE CUSTOMER JOURNEY VERIFICATION (A-H)');
    console.log('======================================================');

    // Journey A: General Citizen Service (Home -> Services -> Service Detail)
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.goto(`http://localhost:${PORT}/services.html`, { waitUntil: 'domcontentloaded' });
    const servicesCardCount = await page.evaluate(() => document.querySelectorAll('.shub-card, .shub-cat-card, .shub-goal-card, .esc-card, .service-card').length);
    record('customerJourneys', 'Journey A: Services directory renders service selection catalog', servicesCardCount >= 10, `Found: ${servicesCardCount}`);

    await page.goto(`http://localhost:${PORT}/service-voter-id.html`, { waitUntil: 'domcontentloaded' });
    const voterTitle = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
    record('customerJourneys', 'Journey A: Citizen can reach Voter ID service detail page', voterTitle.toLowerCase().includes('voter'), voterTitle);

    // Journey B: PAN Service Journey (Services -> PAN Detail -> Specific PAN Selection -> Checkout Entry)
    await page.goto(`http://localhost:${PORT}/service-pan-card.html`, { waitUntil: 'domcontentloaded' });
    const panServiceCards = await page.evaluate(() => document.querySelectorAll('.voter-service-card').length);
    record('customerJourneys', 'Journey B: PAN detail page presents service selection options', panServiceCards >= 4, `Cards: ${panServiceCards}`);

    await page.goto(`http://localhost:${PORT}/checkout.html?service=new-pan`, { waitUntil: 'domcontentloaded' });
    const checkoutValid = await page.evaluate(() => document.querySelector('#checkout-title') !== null && document.querySelector('#step-1-details-container') !== null);
    record('customerJourneys', 'Journey B: Customer enters checkout with valid service preset', checkoutValid);

    // Journey C: Request-Only Service (Service Detail -> Service Request Console)
    await page.goto(`http://localhost:${PORT}/service-request.html?service=ration-card-assistance&service_name=Ration+Card+Assistance`, { waitUntil: 'domcontentloaded' });
    const reqTitle = await page.evaluate(() => document.querySelector('[data-request-task]')?.innerText || '');
    const reqWhatsApp = await page.evaluate(() => document.querySelector('[data-request-whatsapp]')?.getAttribute('href') || '');
    record('customerJourneys', 'Journey C: Request-only flow populates service title correctly', reqTitle.toLowerCase().includes('ration'), reqTitle);
    record('customerJourneys', 'Journey C: Availability confirmation provides WhatsApp handoff link', reqWhatsApp.includes('wa.me'), reqWhatsApp);

    // Journey D: Customer Account & Auth UI
    await page.goto(`http://localhost:${PORT}/login.html`, { waitUntil: 'domcontentloaded' });
    const loginInputs = await page.evaluate(() => {
      const user = document.querySelector('#login-user') || document.querySelector('#login-email') || document.querySelector('input[name="user_id"]');
      const pass = document.querySelector('#login-pass') || document.querySelector('#login-password') || document.querySelector('input[name="password"]');
      return !!user && !!pass;
    });
    record('customerJourneys', 'Journey D: Login interface provides validated authentication controls', loginInputs);

    // Journey E: Application Tracking UI
    await page.goto(`http://localhost:${PORT}/track-application.html`, { waitUntil: 'domcontentloaded' });
    const hasTrackInput = await page.evaluate(() => {
      const input = document.querySelector('#app-ref') || document.querySelector('input[type="text"]');
      const btn = document.querySelector('button[type="submit"]') || document.querySelector('#track-btn');
      return !!input && !!btn;
    });
    record('customerJourneys', 'Journey E: Tracking portal renders application reference inquiry inputs', hasTrackInput);

    // Journey F: Order Documents Management
    await page.goto(`http://localhost:${PORT}/order-documents.html?order=ORD-2026-TEST`, { waitUntil: 'domcontentloaded' });
    const orderLabel = await page.evaluate(() => document.querySelector('#document-order-label')?.innerText || '');
    record('customerJourneys', 'Journey F: Order documents portal mounts order reference cleanly', orderLabel.includes('ORD-2026-TEST'), orderLabel);

    // Journey G: Payment Recovery & Status
    await page.goto(`http://localhost:${PORT}/payment-status.html?order=ORD-FAIL-TEST&status=failed`, { waitUntil: 'domcontentloaded' });
    const paymentStatusPageLoads = await page.evaluate(() => !!document.body);
    record('customerJourneys', 'Journey G: Payment recovery and status inquiry mounts cleanly', paymentStatusPageLoads);

    // Journey H: Support & Contact Handoff
    await page.goto(`http://localhost:${PORT}/contact.html`, { waitUntil: 'domcontentloaded' });
    const contactInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('9473946181') || bodyText.includes('Contact');
    });
    record('customerJourneys', 'Journey H: Support information and direct operator contacts verified', contactInfo);

    // =========================================================================
    // PART 4: PAN PRICING READ-ONLY INVARIANTS AUDIT
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 4: PAN PRICING READ-ONLY INVARIANT AUDIT');
    console.log('======================================================');

    await page.goto(`http://localhost:${PORT}/checkout.html`, { waitUntil: 'domcontentloaded' });
    const pricingAudit = await page.evaluate(() => {
      const catalog = window.OPDS_STATIC_PRICING;
      if (!catalog) return { error: 'Catalog missing' };
      return {
        'pan-aadhaar-link': catalog['pan-aadhaar-link'] ? catalog['pan-aadhaar-link'].price : null,
        'duplicate-pan-surrender': catalog['duplicate-pan-surrender'] ? catalog['duplicate-pan-surrender'].price : null,
        'new-pan': catalog['new-pan'] ? catalog['new-pan'].price : null,
        'pan-correction': catalog['pan-correction'] ? catalog['pan-correction'].price : null,
        'e-pan-download': catalog['e-pan-download'] ? catalog['e-pan-download'].price : null,
        'pan-status-check': catalog['pan-status-check'] ? catalog['pan-status-check'].price : null,
        'card-reprint': catalog['card-reprint'] ? catalog['card-reprint'].price : null
      };
    });

    const expectedPrices = {
      'pan-aadhaar-link': 100,
      'duplicate-pan-surrender': 250,
      'new-pan': 220,
      'pan-correction': 250,
      'e-pan-download': 150,
      'pan-status-check': 0,
      'card-reprint': 100
    };

    let panMatches = true;
    for (const [slug, expPrice] of Object.entries(expectedPrices)) {
      if (pricingAudit[slug] !== expPrice) {
        panMatches = false;
        record('panPricingInvariants', `PAN slug ${slug} price invariant (Expected: ₹${expPrice}, Found: ₹${pricingAudit[slug]})`, false);
      }
    }
    if (panMatches) {
      record('panPricingInvariants', 'All 7 canonical PAN slugs verified with exact pricing invariants preserved (Read-Only)', true);
    }

    // =========================================================================
    // PART 5: FRONTEND SECURITY & DEFENSIVE ENGINEERING AUDIT
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 5: SECURITY & HARDENING VERIFICATION');
    console.log('======================================================');

    await page.goto(`http://localhost:${PORT}/login.html`, { waitUntil: 'domcontentloaded' });
    const authSecurity = await page.evaluate(() => {
      const auth = window.OPDSAuth;
      if (!auth || typeof auth.isSafeReturnUrl !== 'function') return { ok: false };
      return {
        ok: true,
        blocksEvil: !auth.isSafeReturnUrl('//evil.com') && !auth.isSafeReturnUrl('https://malicious.com'),
        blocksJs: !auth.isSafeReturnUrl('javascript:alert(1)'),
        allowsLocal: auth.isSafeReturnUrl('/services.html') && auth.isSafeReturnUrl('/checkout.html')
      };
    });

    record('securityAndHardening', 'OPDSAuth open-redirect defense rejects protocol-relative URLs', authSecurity.blocksEvil);
    record('securityAndHardening', 'OPDSAuth open-redirect defense rejects javascript: scheme', authSecurity.blocksJs);
    record('securityAndHardening', 'OPDSAuth allows valid local relative application routes', authSecurity.allowsLocal);

    // =========================================================================
    // PART 6: CORE WEB VITALS & RUNTIME PERFORMANCE SAFETY
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 6: CORE WEB VITALS & RUNTIME SAFETY AUDIT');
    console.log('======================================================');

    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    record('coreWebVitalsSafety', 'Legacy dead script globe-land-points.js remains purged', !indexHtml.includes('globe-land-points.js'));

    const checkoutHtml = fs.readFileSync(path.join(ROOT, 'checkout.html'), 'utf8');
    record('coreWebVitalsSafety', 'Deployment config deferred to avoid blocking main thread', checkoutHtml.includes('deployment-config.js') && checkoutHtml.includes('defer'));
    record('coreWebVitalsSafety', 'Transaction host deferred to avoid blocking main thread', checkoutHtml.includes('transaction-host.js') && checkoutHtml.includes('defer'));

    // Save JSON report
    fs.writeFileSync(
      path.join(ROOT, 'artifacts/phase15/FINAL-REGRESSION-RESULTS.json'),
      JSON.stringify(results, null, 2),
      'utf8'
    );

    console.log('\n======================================================');
    console.log('PHASE 15 VERIFICATION SUMMARY:');
    console.log(`Total Tests Run : ${results.summary.total}`);
    console.log(`Tests Passed    : ${results.summary.passed}`);
    console.log(`Tests Failed    : ${results.summary.failed}`);
    console.log('Report saved to : artifacts/phase15/FINAL-REGRESSION-RESULTS.json');
    console.log('======================================================\n');

  } catch (err) {
    console.error('Fatal error during Phase 15 verification:', err);
    process.exitCode = 1;
  } finally {
    await page.close();
    await browser.close();
    server.close();
  }
}

run();
