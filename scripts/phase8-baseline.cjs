const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 }
];

const OUT_DIR = path.resolve('artifacts/phase8');

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
  const metrics = {};

  // 1. services.html default state
  for (const vp of VIEWPORTS) {
    await page.setViewport(vp);
    const url = 'file:///' + path.resolve('services.html').replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
    await new Promise(r => setTimeout(r, 300));

    // Capture screenshot
    await page.screenshot({
      path: path.join(OUT_DIR, `before-services-default-${vp.name}.png`),
      fullPage: false
    });

    // Check dimensions
    const data = await page.evaluate(() => {
      const docEl = document.documentElement;
      const bodyEl = document.body;
      const scrollW = Math.max(docEl.scrollWidth, bodyEl.scrollWidth);
      const clientW = docEl.clientWidth;
      const overflowX = scrollW > clientW;

      // Card dimensions
      const cards = [...document.querySelectorAll('.shub-card, .shub-cat-card')].map(c => {
        const r = c.getBoundingClientRect();
        return {
          cls: c.className,
          w: Math.round(r.width),
          h: Math.round(r.height)
        };
      });

      // Filter chips
      const chips = [...document.querySelectorAll('.shub-chip')].map(ch => ({
        text: ch.textContent.trim(),
        w: Math.round(ch.getBoundingClientRect().width),
        h: Math.round(ch.getBoundingClientRect().height)
      }));

      return { overflowX, scrollW, clientW, cardCount: cards.length, sampleCards: cards.slice(0, 4), chips };
    });

    metrics[`services-default-${vp.name}`] = data;
  }

  // 2. services.html active search state ("pan")
  for (const vp of VIEWPORTS) {
    await page.setViewport(vp);
    const url = 'file:///' + path.resolve('services.html').replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
    await new Promise(r => setTimeout(r, 200));

    // Type "pan" into search input
    await page.type('#shub-search-input', 'pan');
    await new Promise(r => setTimeout(r, 200));

    await page.screenshot({
      path: path.join(OUT_DIR, `before-services-search-${vp.name}.png`),
      fullPage: false
    });
  }

  // 3. services.html empty search state ("xyznomatch")
  for (const vp of VIEWPORTS) {
    await page.setViewport(vp);
    const url = 'file:///' + path.resolve('services.html').replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
    await new Promise(r => setTimeout(r, 200));

    // Type query with no results
    await page.type('#shub-search-input', 'xyznomatch123');
    await new Promise(r => setTimeout(r, 200));

    await page.screenshot({
      path: path.join(OUT_DIR, `before-services-empty-${vp.name}.png`),
      fullPage: false
    });
  }

  // 4. index.html discovery / search combobox
  for (const vp of VIEWPORTS) {
    await page.setViewport(vp);
    const url = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
    await new Promise(r => setTimeout(r, 200));

    // Focus search input on index.html to trigger suggestions
    const searchInput = await page.$('[data-ai-search]');
    if (searchInput) {
      await searchInput.click();
      await page.type('[data-ai-search]', 'pan');
      await new Promise(r => setTimeout(r, 200));
    }

    await page.screenshot({
      path: path.join(OUT_DIR, `before-index-search-${vp.name}.png`),
      fullPage: false
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'baseline-metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('Phase 8 Baseline capture completed successfully. 16 screenshots saved.');
  await browser.close();
})();
