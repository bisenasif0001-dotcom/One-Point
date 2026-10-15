const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8093;

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

  const testResults = {
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    errors: [],
    overflowAudit: [],
    touchTargetAudit: [],
    comparisonStackingAudit: [],
    trustAudit: [],
    serviceSelectionAudit: []
  };

  function assert(condition, message) {
    if (condition) {
      testResults.testsPassed++;
      console.log('  [PASS] ' + message);
    } else {
      testResults.testsFailed++;
      testResults.errors.push(message);
      console.error('  [FAIL] ' + message);
    }
  }

  const page = await browser.newPage();

  // Test 1: Trust Strip Verification in services.html
  console.log('\n--- 1. Auditing Trust Strip in services.html ---');
  await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'domcontentloaded' });
  const servicesHtml = await page.content();
  assert(!servicesHtml.includes('4.8★ Rating'), 'services.html does not contain fake 4.8★ star rating');
  assert(!servicesHtml.includes('1,200+ verified client reviews'), 'services.html does not contain fake review count');
  assert(!servicesHtml.includes('12,000+ Service Requests'), 'services.html does not contain unverified request count');
  assert(servicesHtml.includes('Transparent Fees'), 'services.html contains verified "Transparent Fees"');
  assert(servicesHtml.includes('Physical &amp; Remote') || servicesHtml.includes('Physical & Remote'), 'services.html contains verified "Physical & Remote"');

  // Test 2: Trust & Policy Claims in business-solutions.html
  console.log('\n--- 2. Auditing Trust & Policy Claims in business-solutions.html ---');
  await page.goto(`http://127.0.0.1:${PORT}/business-solutions.html`, { waitUntil: 'domcontentloaded' });
  const bizHtml = await page.content();
  assert(!bizHtml.includes('Zero-Rejection Guarantee'), 'business-solutions.html does not contain "Zero-Rejection Guarantee"');
  assert(!bizHtml.includes('Guaranteed Priority SLA Dispatch'), 'business-solutions.html does not contain "Guaranteed Priority SLA Dispatch"');
  assert(bizHtml.includes('Pre-Filing Document Audit'), 'business-solutions.html contains "Pre-Filing Document Audit"');
  assert(bizHtml.includes('Priority SLA Dispatch Desk'), 'business-solutions.html contains "Priority SLA Dispatch Desk"');
  assert(bizHtml.includes('100% Pre-Filing Refund Policy'), 'business-solutions.html contains "100% Pre-Filing Refund Policy"');

  // Test 3: PAN Service Selection Distinction in service-pan-card.html
  console.log('\n--- 3. Auditing PAN Selection Distinction in service-pan-card.html ---');
  await page.goto(`http://127.0.0.1:${PORT}/service-pan-card.html`, { waitUntil: 'domcontentloaded' });
  const panData = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.voter-service-card'));
    const linkCard = cards.find(c => c.getAttribute('data-service') === 'PAN Link');
    const surrenderCard = cards.find(c => c.getAttribute('data-service') === 'Duplicate PAN');
    return {
      link: linkCard ? {
        service: linkCard.getAttribute('data-service'),
        price: linkCard.getAttribute('data-price'),
        href: linkCard.querySelector('.btn-service-select')?.getAttribute('href')
      } : null,
      surrender: surrenderCard ? {
        service: surrenderCard.getAttribute('data-service'),
        price: surrenderCard.getAttribute('data-price'),
        href: surrenderCard.querySelector('.btn-service-select')?.getAttribute('href')
      } : null
    };
  });
  assert(panData.link && panData.link.service === 'PAN Link', 'PAN Link card present');
  assert(panData.surrender && panData.surrender.service === 'Duplicate PAN', 'Duplicate PAN Surrender card present');
  assert(panData.link && panData.link.href && panData.link.href.includes('service=pan-aadhaar-link'), 'PAN Link routes to pan-aadhaar-link');
  assert(panData.surrender && panData.surrender.href && panData.surrender.href.includes('service=duplicate-pan-surrender'), 'Duplicate PAN routes to duplicate-pan-surrender');
  assert(panData.link.href !== panData.surrender.href, 'PAN Link and Duplicate PAN have distinct destinations');
  assert(panData.link.price !== panData.surrender.price, 'PAN Link and Duplicate PAN have distinct prices');

  // Test 4: Comparison Stacking at 390px (Mobile) vs 1440px (Desktop)
  console.log('\n--- 4. Auditing Responsive Comparison Stacking ---');

  // 4a. Corporate setup entity comparison matrix
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:${PORT}/service-business-registration-corporate-setup.html`, { waitUntil: 'domcontentloaded' });
  const corpMobile = await page.evaluate(() => {
    const thead = document.querySelector('.biz-matrix-table thead');
    const theadDisplay = thead ? window.getComputedStyle(thead).display : null;
    const firstRow = document.querySelector('.biz-matrix-table tbody tr');
    const rowDisplay = firstRow ? window.getComputedStyle(firstRow).display : null;
    const btn = document.querySelector('.biz-matrix-table td:last-child .biz-table-btn');
    const btnHeight = btn ? btn.getBoundingClientRect().height : 0;
    return { theadDisplay, rowDisplay, btnHeight };
  });
  assert(corpMobile.theadDisplay === 'none', 'Corporate matrix thead hidden on mobile (<= 860px)');
  assert(corpMobile.rowDisplay === 'flex', 'Corporate matrix rows stack as flex cards on mobile');
  assert(corpMobile.btnHeight >= 44, `Corporate matrix CTA button meets 44px touch target (got ${corpMobile.btnHeight}px)`);

  // 4b. Business solutions role transparency comparison table
  await page.goto(`http://127.0.0.1:${PORT}/business-solutions.html`, { waitUntil: 'domcontentloaded' });
  const bizMobile = await page.evaluate(() => {
    const sepMid = document.querySelector('.biz-cmp-sep-mid');
    const sepMidDisplay = sepMid ? window.getComputedStyle(sepMid).display : null;
    const cellMid = document.querySelector('.biz-cmp-cell-mid');
    const cellMidDisplay = cellMid ? window.getComputedStyle(cellMid).display : null;
    return { sepMidDisplay, cellMidDisplay };
  });
  assert(bizMobile.sepMidDisplay === 'none', 'Business solutions comparison mid-separator hidden on mobile (<= 860px)');
  assert(bizMobile.cellMidDisplay === 'none', 'Business solutions comparison cell-mid divider hidden on mobile (<= 860px)');

  // 4c. Online services scope clarity table
  await page.goto(`http://127.0.0.1:${PORT}/online-services.html`, { waitUntil: 'domcontentloaded' });
  const onlineMobile = await page.evaluate(() => {
    const row = document.querySelector('.ghub-cmp-row');
    const rowCols = row ? window.getComputedStyle(row).gridTemplateColumns : null;
    const sepMid = document.querySelector('.ghub-cmp-sep-mid');
    const sepMidDisplay = sepMid ? window.getComputedStyle(sepMid).display : null;
    return { rowCols, sepMidDisplay };
  });
  assert(onlineMobile.sepMidDisplay === 'none', 'Online services comparison mid-separator hidden on mobile');

  // Test 5: CTA Labels and Request-Only Integrity
  console.log('\n--- 5. Auditing Request-Only vs Confirmed CTAs ---');
  await page.goto(`http://127.0.0.1:${PORT}/service-ration-card-assistance.html`, { waitUntil: 'domcontentloaded' });
  const rationCtas = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.ration-services-grid .btn-service-select'));
    const allRequest = cards.every(b => b.getAttribute('href').includes('service-request.html'));
    const allLabels = cards.every(b => b.textContent.includes('Request'));
    const preFooter = document.querySelector('.pfcta-right .btn-premium-gold');
    const preFooterLabel = preFooter ? preFooter.textContent.trim() : '';
    const preFooterHref = preFooter ? preFooter.getAttribute('onclick') : '';
    return {
      allRequest,
      allLabels,
      preFooterLabel,
      preFooterIsRequest: preFooterHref.includes('service-request.html')
    };
  });
  assert(rationCtas.allRequest, 'All ration card service cards point to service-request.html');
  assert(rationCtas.allLabels, 'All ration card service card CTAs use "Request" label');
  assert(rationCtas.preFooterLabel.includes('Request Assistance'), 'Ration card pre-footer CTA says "Request Assistance"');
  assert(rationCtas.preFooterIsRequest, 'Ration card pre-footer CTA routes to service-request.html');

  // Test 6: Horizontal Overflow Across All 15 Requested Viewports
  console.log('\n--- 6. Auditing Horizontal Overflow Across 15 Viewports ---');
  const viewports = [
    320, 360, 375, 390, 412, 414, 430, 480, 600, 768, 860, 1024, 1180, 1280, 1440
  ];

  const pagesToAudit = [
    'services.html',
    'online-services.html',
    'business-solutions.html',
    'service-business-registration-corporate-setup.html',
    'service-gst-registration.html',
    'service-income-tax-assistance.html',
    'service-pan-card.html',
    'service-ration-card-assistance.html',
    'service-transport-rto-facilitation.html',
    'business-online-setup-services.html'
  ];

  for (const pageName of pagesToAudit) {
    for (const width of viewports) {
      await page.setViewport({ width, height: 800 });
      await page.goto(`http://127.0.0.1:${PORT}/${pageName}`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 100));

      const overflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        const scrollW = docEl.scrollWidth;
        const clientW = docEl.clientWidth;
        let offender = null;
        if (scrollW > clientW) {
          const allEls = document.querySelectorAll('*');
          for (const el of allEls) {
            const rect = el.getBoundingClientRect();
            if (rect.right > clientW + 1) {
              offender = {
                tag: el.tagName,
                className: el.className,
                id: el.id,
                right: rect.right
              };
              break;
            }
          }
        }
        return {
          scrollWidth: scrollW,
          clientWidth: clientW,
          pass: scrollW <= clientW,
          offender
        };
      });

      testResults.overflowAudit.push({
        page: pageName,
        viewport: width,
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        pass: overflow.pass,
        offender: overflow.offender
      });

      if (!overflow.pass) {
        testResults.testsFailed++;
        testResults.errors.push(`Overflow on ${pageName} at ${width}px (scroll: ${overflow.scrollWidth}, client: ${overflow.clientWidth})`);
        console.error(`  [FAIL] Overflow on ${pageName} at ${width}px! Offender: ${JSON.stringify(overflow.offender)}`);
      } else {
        testResults.testsPassed++;
      }
    }
  }

  // Test 7: Capture Final Screenshots
  console.log('\n--- 7. Capturing Final Screenshots for Phase 9 ---');
  const captureTasks = [
    {
      pagePath: 'services.html',
      selector: '.shub-trust-section',
      prefix: 'final-services-trust'
    },
    {
      pagePath: 'online-services.html',
      selector: '.ghub-cmp-table',
      prefix: 'final-online-cmp'
    },
    {
      pagePath: 'business-solutions.html',
      selector: '.biz-cmp-table',
      prefix: 'final-biz-matrix'
    },
    {
      pagePath: 'service-business-registration-corporate-setup.html',
      selector: '.biz-matrix-shell',
      prefix: 'final-corp-matrix'
    },
    {
      pagePath: 'service-pan-card.html',
      selector: '.voter-services-grid',
      prefix: 'final-pan-cards'
    },
    {
      pagePath: 'service-ration-card-assistance.html',
      selector: '.ration-services-grid',
      prefix: 'final-ration-cards'
    }
  ];

  const captureVps = [
    { width: 320, height: 640, name: '320' },
    { width: 390, height: 844, name: '390' },
    { width: 768, height: 1024, name: '768' },
    { width: 1440, height: 900, name: '1440' }
  ];

  for (const vp of captureVps) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (const task of captureTasks) {
      await page.goto(`http://127.0.0.1:${PORT}/${task.pagePath}`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 400));
      const el = await page.$(task.selector);
      if (el) {
        const outPath = path.join(outDir, `${task.prefix}-${vp.name}.png`);
        await el.screenshot({ path: outPath });
        console.log(`Saved element capture: ${task.prefix}-${vp.name}.png`);
      }
    }
  }

  // Save verification results
  fs.writeFileSync(
    path.join(outDir, 'verification-results.json'),
    JSON.stringify(testResults, null, 2),
    'utf-8'
  );

  console.log('\n========================================');
  console.log('VERIFICATION COMPLETE:');
  console.log('Tests Passed:', testResults.testsPassed);
  console.log('Tests Failed:', testResults.testsFailed);
  console.log('Errors:', testResults.errors.length);
  console.log('========================================\n');

  await page.close();
  await browser.close();
  server.close();

  if (testResults.testsFailed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
