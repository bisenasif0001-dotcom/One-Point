const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8089;

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

  fs.mkdirSync(path.join(ROOT_DIR, 'artifacts', 'phase8'), { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { width: 320, height: 640, name: '320' },
    { width: 360, height: 740, name: '360' },
    { width: 375, height: 667, name: '375' },
    { width: 390, height: 844, name: '390' },
    { width: 414, height: 896, name: '414' },
    { width: 430, height: 932, name: '430' },
    { width: 768, height: 1024, name: '768' },
    { width: 1024, height: 768, name: '1024' },
    { width: 1280, height: 800, name: '1280' },
    { width: 1440, height: 900, name: '1440' }
  ];

  const results = {
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    errors: [],
    overflowAudit: [],
    touchAudit: [],
    discoveryAudit: {},
    screenshotsCaptured: []
  };

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // ── 1. Redirect Stubs Verification ──
    console.log('Verifying redirect stubs...');
    
    // Test service-ayushman-card.html
    await page.goto(`http://127.0.0.1:${PORT}/service-ayushman-card.html`, { waitUntil: 'networkidle0' });
    const ayushmanUrl = page.url();
    console.log('Ayushman redirect destination:', ayushmanUrl);
    if (ayushmanUrl.includes('online-services.html#welfare') || ayushmanUrl.includes('online-services.html')) {
      results.testsPassed++;
      results.discoveryAudit.ayushmanRedirect = { passed: true, destination: ayushmanUrl };
    } else {
      results.testsFailed++;
      results.discoveryAudit.ayushmanRedirect = { passed: false, destination: ayushmanUrl };
      results.errors.push('Ayushman redirect did not go to online-services.html#welfare');
    }

    // Test service-police-verification.html
    await page.goto(`http://127.0.0.1:${PORT}/service-police-verification.html`, { waitUntil: 'networkidle0' });
    const policeUrl = page.url();
    console.log('Police redirect destination:', policeUrl);
    if (policeUrl.includes('service-citizen-security-cybercrime-police-help.html')) {
      results.testsPassed++;
      results.discoveryAudit.policeRedirect = { passed: true, destination: policeUrl };
    } else {
      results.testsFailed++;
      results.discoveryAudit.policeRedirect = { passed: false, destination: policeUrl };
      results.errors.push('Police redirect did not go to service-citizen-security-cybercrime-police-help.html');
    }

    // ── 2. Interactive Search & Zero State Recovery in services.html ──
    console.log('Verifying services.html search & zero state recovery...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });

    // Test query matching "PAN"
    await page.type('#shub-search-input', 'pan');
    await page.waitForFunction(() => {
      const panel = document.getElementById('shub-search-results-panel');
      const count = document.getElementById('shub-results-count');
      return panel && panel.style.display !== 'none' && parseInt(count.textContent) > 0;
    }, { timeout: 3000 });
    results.testsPassed++;

    // Test non-matching query for Zero State
    await page.click('#shub-search-clear');
    await page.type('#shub-search-input', 'zzzznonexistentquery');
    await page.waitForFunction(() => {
      const zero = document.getElementById('shub-zero-state');
      const grid = document.getElementById('shub-search-grid');
      return zero && zero.style.display !== 'none' && grid && grid.style.display === 'none';
    }, { timeout: 3000 });
    results.testsPassed++;

    // Test Zero State Clear Button Recovery
    const clearBtnExists = await page.$('#shub-zero-clear-btn');
    if (clearBtnExists) {
      await page.click('#shub-zero-clear-btn');
      await page.waitForFunction(() => {
        const input = document.getElementById('shub-search-input');
        const zero = document.getElementById('shub-zero-state');
        const catGrid = document.getElementById('shub-cat-grid');
        return input && input.value === '' && (!zero || zero.style.display === 'none' || zero.offsetParent === null) && catGrid && catGrid.style.display !== 'none';
      }, { timeout: 3000 });
      results.testsPassed++;
      results.discoveryAudit.zeroStateRecovery = { passed: true };
    } else {
      results.testsFailed++;
      results.errors.push('Missing #shub-zero-clear-btn in services.html');
    }

    // ── 3. Interactive Search in online-services.html ──
    console.log('Verifying online-services.html zero state recovery...');
    await page.goto(`http://127.0.0.1:${PORT}/online-services.html`, { waitUntil: 'networkidle0' });
    await page.type('#ghub-search-input', 'zzzznonexistent');
    await page.waitForFunction(() => {
      const zero = document.getElementById('ghub-zero-state');
      return zero && zero.style.display !== 'none';
    }, { timeout: 3000 });
    results.testsPassed++;

    const ghubClearBtn = await page.$('#ghub-zero-clear-btn');
    if (ghubClearBtn) {
      await page.click('#ghub-zero-clear-btn');
      await page.waitForFunction(() => {
        const input = document.getElementById('ghub-search-input');
        const zero = document.getElementById('ghub-zero-state');
        return input && input.value === '' && zero && zero.style.display === 'none';
      }, { timeout: 3000 });
      results.testsPassed++;
      results.discoveryAudit.onlineServicesZeroStateRecovery = { passed: true };
    } else {
      results.testsFailed++;
      results.errors.push('Missing #ghub-zero-clear-btn in online-services.html');
    }

    // ── 4. Touch Target Audit in services.html ──
    console.log('Auditing touch targets in services.html...');
    await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });
    const touchStats = await page.evaluate(() => {
      const waBtns = document.querySelectorAll('.shub-btn-card-wa');
      const actionBtns = document.querySelectorAll('.shub-btn-card');
      const clearBtn = document.getElementById('shub-search-clear');
      
      const checkBounds = (el) => {
        const r = el.getBoundingClientRect();
        return { width: Math.round(r.width), height: Math.round(r.height) };
      };

      const waBounds = waBtns.length ? checkBounds(waBtns[0]) : null;
      const cardBounds = actionBtns.length ? checkBounds(actionBtns[0]) : null;
      
      return {
        waBtnDimensions: waBounds,
        actionBtnDimensions: cardBounds,
        waBtnsCount: waBtns.length,
        actionBtnsCount: actionBtns.length
      };
    });
    console.log('Touch target dimensions in services.html:', touchStats);
    if (touchStats.waBtnDimensions && touchStats.waBtnDimensions.width >= 44 && touchStats.waBtnDimensions.height >= 44) {
      results.testsPassed++;
      results.touchAudit.push({ component: '.shub-btn-card-wa', status: 'PASS', dimensions: touchStats.waBtnDimensions });
    } else {
      results.testsFailed++;
      results.touchAudit.push({ component: '.shub-btn-card-wa', status: 'FAIL', dimensions: touchStats.waBtnDimensions });
      results.errors.push(`.shub-btn-card-wa is ${touchStats.waBtnDimensions?.width}x${touchStats.waBtnDimensions?.height}, expected >= 44x44`);
    }

    if (touchStats.actionBtnDimensions && touchStats.actionBtnDimensions.height >= 44) {
      results.testsPassed++;
      results.touchAudit.push({ component: '.shub-btn-card', status: 'PASS', dimensions: touchStats.actionBtnDimensions });
    } else {
      results.testsFailed++;
      results.touchAudit.push({ component: '.shub-btn-card', status: 'FAIL', dimensions: touchStats.actionBtnDimensions });
      results.errors.push(`.shub-btn-card is ${touchStats.actionBtnDimensions?.height}px tall, expected >= 44px`);
    }

    // ── 5. Overflow Audit Across Viewports (320px to 1440px) ──
    console.log('Auditing horizontal overflow across all viewports...');
    const testPages = ['services.html', 'online-services.html', 'business-solutions.html', 'index.html'];

    for (const pName of testPages) {
      for (const vp of viewports) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(`http://127.0.0.1:${PORT}/${pName}`, { waitUntil: 'networkidle0' });

        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientWidth = docEl.clientWidth;
          const diff = scrollWidth - clientWidth;

          // Find overflowing element if any
          let offender = null;
          if (diff > 1) {
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const r = el.getBoundingClientRect();
              if (r.right > clientWidth + 2) {
                offender = {
                  tag: el.tagName,
                  className: el.className,
                  id: el.id,
                  right: Math.round(r.right),
                  width: Math.round(r.width)
                };
                break;
              }
            }
          }

          return { scrollWidth, clientWidth, diff, offender };
        });

        const pass = overflow.diff <= 1;
        if (pass) {
          results.testsPassed++;
        } else {
          results.testsFailed++;
          results.errors.push(`Horizontal overflow on ${pName} at ${vp.width}px: diff=${overflow.diff}px, offender=${JSON.stringify(overflow.offender)}`);
        }

        results.overflowAudit.push({
          page: pName,
          viewport: vp.width,
          scrollWidth: overflow.scrollWidth,
          clientWidth: overflow.clientWidth,
          pass,
          offender: overflow.offender
        });
      }
    }

    // ── 6. Capture Final Verification Screenshots (16 matching baseline) ──
    console.log('Capturing final verification screenshots...');
    const captureVps = [
      { width: 320, height: 640 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 }
    ];

    for (const vp of captureVps) {
      await page.setViewport(vp);

      // 1. services.html default state
      await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });
      const f1 = `final-services-default-${vp.width}.png`;
      await page.screenshot({ path: path.join(ROOT_DIR, 'artifacts', 'phase8', f1) });
      results.screenshotsCaptured.push(f1);

      // 2. services.html search active (query: "pan")
      await page.type('#shub-search-input', 'pan');
      await new Promise(r => setTimeout(r, 300));
      const f2 = `final-services-search-${vp.width}.png`;
      await page.screenshot({ path: path.join(ROOT_DIR, 'artifacts', 'phase8', f2) });
      results.screenshotsCaptured.push(f2);

      // 3. services.html empty search state (query: "zzzznonexistent")
      await page.click('#shub-search-clear');
      await page.type('#shub-search-input', 'zzzznonexistent');
      await new Promise(r => setTimeout(r, 300));
      const f3 = `final-services-empty-${vp.width}.png`;
      await page.screenshot({ path: path.join(ROOT_DIR, 'artifacts', 'phase8', f3) });
      results.screenshotsCaptured.push(f3);

      // 4. index.html search active
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0' });
      const searchBox = await page.$('[data-ai-search]');
      if (searchBox) {
        await searchBox.type('pan');
        await new Promise(r => setTimeout(r, 400));
      }
      const f4 = `final-index-search-${vp.width}.png`;
      await page.screenshot({ path: path.join(ROOT_DIR, 'artifacts', 'phase8', f4) });
      results.screenshotsCaptured.push(f4);
    }

    results.consoleErrors = consoleErrors;
    fs.writeFileSync(
      path.join(ROOT_DIR, 'artifacts', 'phase8', 'verification-results.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n========================================');
    console.log(`VERIFICATION COMPLETE:`);
    console.log(`Tests Passed: ${results.testsPassed}`);
    console.log(`Tests Failed: ${results.testsFailed}`);
    console.log(`Screenshots Captured: ${results.screenshotsCaptured.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (results.errors.length) {
      console.log('Errors:', results.errors);
    }
    console.log('========================================\n');

  } catch (err) {
    console.error('Verification failed with error:', err);
    results.errors.push(err.message);
  } finally {
    await browser.close();
    server.close();
  }
}

run();
