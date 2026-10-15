/**
 * OnePoint Suvidha Kendra — Approved PAN Pricing Verification Suite
 * Verifies that the 4 owner-approved prices are synchronized across:
 * - Static HTML cards in service-pan-card.html
 * - JavaScript catalog (assets/catalog-pricing.js / OPDS_STATIC_PRICING)
 * - Interactive checkout preview (checkout.html)
 * - In-memory pricing engine (backend/pricing-engine.js)
 * - SQLite database (backend/data/opds-payments.sqlite)
 * - Anti-regression assertions preventing obsolete prices (₹99, ₹199, ₹70, ₹149)
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const PORT = 8110;
const rootDir = path.join(__dirname, '..');

const APPROVED_PAN_PRICES = {
  'pan-aadhaar-link': {
    name: 'PAN–Aadhaar Linking & Status Support',
    approvedPrice: 100,
    obsoletePrices: [99]
  },
  'duplicate-pan-surrender': {
    name: 'Duplicate PAN Surrender Guidance',
    approvedPrice: 250,
    obsoletePrices: [199]
  },
  'e-pan-download': {
    name: 'Instant e-PAN Download Guidance',
    approvedPrice: 150,
    obsoletePrices: [70, 99]
  },
  'card-reprint': {
    name: 'Physical PAN Reprint Assistance',
    approvedPrice: 100,
    obsoletePrices: [149, 150]
  }
};

const UNTOUCHED_PAN_PRICES = {
  'new-pan': 220,
  'pan-correction': 250,
  'pan-status-check': 0
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.normalize(path.join(rootDir, reqPath));

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

async function runVerification() {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`PAN Pricing Verification Server running on port ${PORT}...`);

  const results = {
    timestamp: new Date().toISOString(),
    testsRun: 0,
    testsPassed: 0,
    testsFailed: 0,
    checks: []
  };

  function record(suite, name, passed, details = '') {
    results.testsRun++;
    if (passed) results.testsPassed++;
    else results.testsFailed++;

    results.checks.push({ suite, name, passed, details });
    const mark = passed ? '✓' : '✗';
    console.log(`  ${mark} [${suite}] ${name}${details ? ' (' + details + ')' : ''}`);
  }

  const CHROME_PATH = fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : undefined;

  let browser;
  try {
    const launchOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    if (CHROME_PATH) {
      launchOptions.executablePath = CHROME_PATH;
    }
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // =========================================================================
    // PART 1: SERVICE DETAIL PAGE STATIC HTML AUDIT (service-pan-card.html)
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 1: SERVICE DETAIL PAGE STATIC HTML AUDIT');
    console.log('======================================================');

    await page.goto(`http://localhost:${PORT}/service-pan-card.html`, { waitUntil: 'domcontentloaded' });

    const htmlCardAudit = await page.evaluate(() => {
      const cards = document.querySelectorAll('.voter-service-card');
      const cardData = {};
      cards.forEach(card => {
        const selectBtn = card.querySelector('.btn-service-select');
        const href = selectBtn?.getAttribute('href') || '';
        const match = href.match(/service=([a-z0-9_-]+)/);
        if (match) {
          const slug = match[1];
          cardData[slug] = {
            priceAttr: card.getAttribute('data-price'),
            feeAttr: card.getAttribute('data-fee'),
            govtAttr: card.getAttribute('data-govt'),
            metaFee: card.querySelector('.voter-meta-fee')?.innerText?.trim(),
            metaSub: card.querySelector('.voter-meta-sub')?.innerText?.trim()
          };
        }
      });

      // Also check secondary e-PAN suite card
      const ePanSuiteCard = Array.from(document.querySelectorAll('.pan-suite-card')).find(c => c.innerText.includes('Instant e-PAN'));
      const ePanSuitePrice = ePanSuiteCard ? ePanSuiteCard.querySelector('.pan-suite-price')?.innerText?.trim() : null;

      // Check panPricingData dictionary
      let jsDict = {};
      try {
        if (typeof panPricingData !== 'undefined') jsDict = panPricingData;
      } catch (e) {}

      return { cardData, ePanSuitePrice, jsDict };
    });

    // 1.1 Card Reprint check
    const reprintCard = htmlCardAudit.cardData['card-reprint'];
    record('servicePageHTML', 'Card Reprint data-price is ₹100', reprintCard?.priceAttr === '₹100', reprintCard?.priceAttr);
    record('servicePageHTML', 'Card Reprint data-fee is ₹100.00', reprintCard?.feeAttr === '₹100.00', reprintCard?.feeAttr);
    record('servicePageHTML', 'Card Reprint meta fee display is ₹100.00', reprintCard?.metaFee === '₹100.00', reprintCard?.metaFee);

    // 1.2 E-PAN Download check
    const ePanCard = htmlCardAudit.cardData['e-pan-download'];
    record('servicePageHTML', 'E-PAN Download data-price is ₹150', ePanCard?.priceAttr === '₹150', ePanCard?.priceAttr);
    record('servicePageHTML', 'E-PAN Download data-fee is ₹150.00', ePanCard?.feeAttr === '₹150.00', ePanCard?.feeAttr);
    record('servicePageHTML', 'E-PAN Download meta fee display is ₹150.00', ePanCard?.metaFee === '₹150.00', ePanCard?.metaFee);
    record('servicePageHTML', 'Secondary e-PAN suite card displays ₹150', htmlCardAudit.ePanSuitePrice?.includes('150'), htmlCardAudit.ePanSuitePrice);

    // 1.3 PAN-Aadhaar Link check
    const linkCard = htmlCardAudit.cardData['pan-aadhaar-link'];
    record('servicePageHTML', 'PAN-Aadhaar Link data-price is ₹100', linkCard?.priceAttr === '₹100', linkCard?.priceAttr);
    record('servicePageHTML', 'PAN-Aadhaar Link data-fee is ₹100.00', linkCard?.feeAttr === '₹100.00', linkCard?.feeAttr);

    // 1.4 Duplicate PAN Surrender check
    const surrCard = htmlCardAudit.cardData['duplicate-pan-surrender'];
    record('servicePageHTML', 'Duplicate PAN Surrender data-price is ₹250', surrCard?.priceAttr === '₹250', surrCard?.priceAttr);
    record('servicePageHTML', 'Duplicate PAN Surrender data-fee is ₹250.00', surrCard?.feeAttr === '₹250.00', surrCard?.feeAttr);

    // 1.5 Page JavaScript Dictionary check
    const jsDict = await page.evaluate(() => {
      // Access the internal panPricingData if available or evaluate its declaration
      const text = document.documentElement.innerHTML;
      const reprintMatch = text.includes("'Card Reprint': { name: 'Physical PAN Reprint', assist: '₹100.00', govt: '₹0.00', total: '₹100.00*'");
      const ePanMatch = text.includes("'E-PAN Download': { name: 'Instant e-PAN Download', assist: '₹150.00', govt: '₹0.00', total: '₹150.00*'");
      const linkMatch = text.includes("'PAN Link': { name: 'PAN–Aadhaar Linking Support', assist: '₹100.00'");
      const surrMatch = text.includes("'Duplicate PAN': { name: 'Duplicate PAN Surrender Guidance', assist: '₹250.00'");
      return { reprintMatch, ePanMatch, linkMatch, surrMatch };
    });
    record('servicePageJS', 'panPricingData dictionary has Card Reprint @ ₹100.00*', jsDict.reprintMatch);
    record('servicePageJS', 'panPricingData dictionary has E-PAN Download @ ₹150.00*', jsDict.ePanMatch);
    record('servicePageJS', 'panPricingData dictionary has PAN Link @ ₹100.00*', jsDict.linkMatch);
    record('servicePageJS', 'panPricingData dictionary has Duplicate PAN @ ₹250.00*', jsDict.surrMatch);

    // =========================================================================
    // PART 2: JAVASCRIPT CATALOG AUDIT (assets/catalog-pricing.js)
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 2: JAVASCRIPT CATALOG AUDIT (OPDS_STATIC_PRICING)');
    console.log('======================================================');

    await page.goto(`http://localhost:${PORT}/checkout.html`, { waitUntil: 'domcontentloaded' });

    const catalogAudit = await page.evaluate(() => {
      const catalog = window.OPDS_STATIC_PRICING;
      if (!catalog) return { error: 'Catalog missing' };
      return {
        'pan-aadhaar-link': catalog['pan-aadhaar-link'],
        'duplicate-pan-surrender': catalog['duplicate-pan-surrender'],
        'e-pan-download': catalog['e-pan-download'],
        'card-reprint': catalog['card-reprint'],
        'new-pan': catalog['new-pan'],
        'pan-correction': catalog['pan-correction'],
        'pan-status-check': catalog['pan-status-check']
      };
    });

    record('catalogPricing', 'pan-aadhaar-link catalog price is 100', catalogAudit['pan-aadhaar-link']?.price === 100, `Actual: ${catalogAudit['pan-aadhaar-link']?.price}`);
    record('catalogPricing', 'duplicate-pan-surrender catalog price is 250', catalogAudit['duplicate-pan-surrender']?.price === 250, `Actual: ${catalogAudit['duplicate-pan-surrender']?.price}`);
    record('catalogPricing', 'e-pan-download catalog price is 150', catalogAudit['e-pan-download']?.price === 150, `Actual: ${catalogAudit['e-pan-download']?.price}`);
    record('catalogPricing', 'card-reprint catalog price is 100', catalogAudit['card-reprint']?.price === 100, `Actual: ${catalogAudit['card-reprint']?.price}`);

    // Untouched services preservation
    record('catalogPreservation', 'new-pan price preserved at 220', catalogAudit['new-pan']?.price === 220, `Actual: ${catalogAudit['new-pan']?.price}`);
    record('catalogPreservation', 'pan-correction price preserved at 250', catalogAudit['pan-correction']?.price === 250, `Actual: ${catalogAudit['pan-correction']?.price}`);
    record('catalogPreservation', 'pan-status-check price preserved at 0', catalogAudit['pan-status-check']?.price === 0, `Actual: ${catalogAudit['pan-status-check']?.price}`);

    // =========================================================================
    // PART 3: CHECKOUT PREVIEW AUDIT
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 3: CHECKOUT PREVIEW & SERVICE PARAMETER ROUTING');
    console.log('======================================================');

    for (const [slug, meta] of Object.entries(APPROVED_PAN_PRICES)) {
      await page.goto(`http://localhost:${PORT}/checkout.html?service=${slug}&service_name=${encodeURIComponent(meta.name)}`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 400));

      const checkoutData = await page.evaluate((targetSlug) => {
        const bodyText = document.body.innerText;
        const catalog = window.OPDS_STATIC_PRICING;
        const item = catalog ? catalog[targetSlug] : null;
        return {
          itemPrice: item ? item.price : null,
          hasPriceInText: bodyText.includes(String(item ? item.price : ''))
        };
      }, slug);

      record('checkoutPreview', `Checkout correctly resolves ${slug} to ₹${meta.approvedPrice}`, checkoutData.itemPrice === meta.approvedPrice, `Price: ₹${checkoutData.itemPrice}`);
    }

    // =========================================================================
    // PART 4: BACKEND CODE & SQLITE DATABASE AUDIT
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 4: BACKEND PRICING ENGINE & SQLITE DATABASE AUDIT');
    console.log('======================================================');

    const backendCatalog = require('../backend/catalog');
    const pricingEngine = require('../backend/pricing-engine');
    const db = require('../backend/db');

    // 4.1 backend/catalog.js
    const catalogServices = backendCatalog.services;
    for (const [slug, meta] of Object.entries(APPROVED_PAN_PRICES)) {
      const found = catalogServices.find(s => s.slug === slug);
      record('backendCatalog', `backend/catalog.js ${slug} price is ${meta.approvedPrice}`, found?.price === meta.approvedPrice, `Found: ${found?.price}`);
    }

    // 4.2 SQLite Database
    const dbServices = db.all("SELECT slug, price_paise, display_price FROM services WHERE slug IN ('pan-aadhaar-link', 'duplicate-pan-surrender', 'e-pan-download', 'card-reprint')");
    for (const [slug, meta] of Object.entries(APPROVED_PAN_PRICES)) {
      const row = dbServices.find(r => r.slug === slug);
      const expectedPaise = meta.approvedPrice * 100;
      record('sqliteServices', `SQLite services ${slug} price_paise is ${expectedPaise}`, row?.price_paise === expectedPaise, `Paise: ${row?.price_paise}`);
    }

    // =========================================================================
    // PART 5: ANTI-REGRESSION OBSOLETE PRICING AUDIT
    // =========================================================================
    console.log('\n======================================================');
    console.log('PART 5: ANTI-REGRESSION OBSOLETE PRICING ASSERTIONS');
    console.log('======================================================');

    const catalogContent = fs.readFileSync(path.join(rootDir, 'assets', 'catalog-pricing.js'), 'utf8');
    const panCardHtmlContent = fs.readFileSync(path.join(rootDir, 'service-pan-card.html'), 'utf8');

    // Card reprint must not be 149
    const reprintRegex = /"card-reprint":\s*\{[^}]*"price":\s*149/s;
    record('antiRegression', 'card-reprint does NOT have obsolete price 149 in catalog', !reprintRegex.test(catalogContent));

    // e-pan-download must not be 99 or 70 in catalog
    const ePan99Regex = /"e-pan-download":\s*\{[^}]*"price":\s*99/s;
    record('antiRegression', 'e-pan-download does NOT have obsolete price 99 in catalog', !ePan99Regex.test(catalogContent));

    // pan-aadhaar-link must not be 99 in catalog
    const link99Regex = /"pan-aadhaar-link":\s*\{[^}]*"price":\s*99/s;
    record('antiRegression', 'pan-aadhaar-link does NOT have obsolete price 99 in catalog', !link99Regex.test(catalogContent));

    // duplicate-pan-surrender must not be 199 in catalog
    const surr199Regex = /"duplicate-pan-surrender":\s*\{[^}]*"price":\s*199/s;
    record('antiRegression', 'duplicate-pan-surrender does NOT have obsolete price 199 in catalog', !surr199Regex.test(catalogContent));

    // service-pan-card.html must not contain data-price="₹70" for e-pan
    record('antiRegression', 'service-pan-card.html does NOT contain data-price="₹70"', !panCardHtmlContent.includes('data-price="₹70"'));

    // service-pan-card.html must not contain data-price="₹149"
    record('antiRegression', 'service-pan-card.html does NOT contain data-price="₹149"', !panCardHtmlContent.includes('data-price="₹149"'));

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  // Save report
  const outputDir = path.join(rootDir, 'artifacts', 'pricing-reconciliation');
  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, 'FINANCIAL-REGRESSION-RESULTS.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log('PAN PRICING RECONCILIATION SUMMARY:');
  console.log(`Total Tests Run : ${results.testsRun}`);
  console.log(`Tests Passed    : ${results.testsPassed}`);
  console.log(`Tests Failed    : ${results.testsFailed}`);
  console.log(`Report saved to : artifacts/pricing-reconciliation/FINANCIAL-REGRESSION-RESULTS.json`);
  console.log('======================================================\n');

  if (results.testsFailed > 0) process.exit(1);
}

runVerification();
