const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 360, height: 740 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
  { width: 480, height: 854 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 }
];

const PAGES = [
  { key: 'pan-card', file: 'service-pan-card.html' },
  { key: 'voter-id', file: 'service-voter-id.html' },
  { key: 'ration-card', file: 'service-ration-card-assistance.html' },
  { key: 'transport-rto', file: 'service-transport-rto-facilitation.html' },
  { key: 'pension-welfare', file: 'service-pension-welfare-schemes-assistance.html' },
  { key: 'checkout-pan', file: 'checkout.html?service=new-pan&service_name=New+PAN+Card+Application' },
  { key: 'service-request', file: 'service-request.html?service=new-ration-card-application-assistance&service_name=New+Ration+Card+Application+Assistance' },
  { key: 'order-documents', file: 'order-documents.html?order=OPDS-TEST-2026' }
];

const SCREENSHOT_VIEWPORTS = [320, 390, 768, 1440];
const OUT_DIR = path.resolve('artifacts/phase7');

(async () => {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const matrixResults = [];
  let totalErrors = 0;
  let totalOverflows = 0;

  for (const pInfo of PAGES) {
    const isParam = pInfo.file.includes('?');
    const baseName = isParam ? pInfo.file.split('?')[0] : pInfo.file;
    const query = isParam ? '?' + pInfo.file.split('?')[1] : '';
    const fileUrl = 'file:///' + path.resolve(baseName).replace(/\\/g, '/') + query;

    for (const vp of VIEWPORTS) {
      await page.setViewport(vp);
      const consoleErrors = [];
      const onConsole = msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      };
      page.on('console', onConsole);

      try {
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
        await new Promise(r => setTimeout(r, 250));

        const check = await page.evaluate((vpWidth) => {
          const docEl = document.documentElement;
          const bodyEl = document.body;
          const scrollW = Math.max(docEl.scrollWidth, bodyEl.scrollWidth);
          const clientW = docEl.clientWidth;
          const overflowX = scrollW > clientW;

          // Check wide elements
          const wide = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width > vpWidth + 1) {
              const tag = el.tagName.toLowerCase();
              const cls = (el.className || '').toString().slice(0, 40);
              wide.push({ tag, cls, width: Math.round(r.width) });
            }
          });

          // Check unnamed interactive elements
          const unnamed = [];
          document.querySelectorAll('button, a').forEach(el => {
            const text = (el.innerText || el.textContent || '').trim();
            const aria = el.getAttribute('aria-label') || el.getAttribute('title');
            const hasImg = el.querySelector('img[alt], svg[aria-label]');
            if (!text && !aria && !hasImg && el.offsetParent !== null) {
              unnamed.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className || '').toString().slice(0, 40)
              });
            }
          });

          return { overflowX, scrollW, clientW, wideCount: wide.length, unnamedCount: unnamed.length };
        }, vp.width);

        if (check.overflowX) totalOverflows++;
        if (consoleErrors.length > 0) totalErrors += consoleErrors.length;

        matrixResults.push({
          page: pInfo.key,
          width: vp.width,
          overflowX: check.overflowX,
          scrollW: check.scrollW,
          clientW: check.clientW,
          wideElements: check.wideCount,
          unnamedControls: check.unnamedCount,
          consoleErrors: consoleErrors.length
        });

        // Screenshot capture if in SCREENSHOT_VIEWPORTS
        if (SCREENSHOT_VIEWPORTS.includes(vp.width)) {
          const shotPath = path.join(OUT_DIR, `final-${pInfo.key}-${vp.width}.png`);
          await page.screenshot({ path: shotPath, fullPage: false });
        }
      } catch (err) {
        matrixResults.push({
          page: pInfo.key,
          width: vp.width,
          error: err.message
        });
      } finally {
        page.off('console', onConsole);
      }
    }
  }

  await browser.close();

  const report = {
    timestamp: new Date().toISOString(),
    totalPages: PAGES.length,
    totalViewports: VIEWPORTS.length,
    totalTests: matrixResults.length,
    totalOverflows,
    totalErrors,
    results: matrixResults
  };

  fs.writeFileSync(path.join(OUT_DIR, 'verification-results.json'), JSON.stringify(report, null, 2));
  console.log('Verification completed:');
  console.log(`- Total Tests Run: ${matrixResults.length}`);
  console.log(`- Horizontal Overflows: ${totalOverflows}`);
  console.log(`- Console Errors: ${totalErrors}`);
  console.log(`- Evidence Screenshots Saved: ${PAGES.length * SCREENSHOT_VIEWPORTS.length}`);
})();
