const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const relative = new URL(req.url, 'http://localhost').pathname.slice(1);
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !(relative.startsWith('assets/') || /^[\w-]+\.html$/.test(relative))) { res.writeHead(404).end(); return; }
  fs.readFile(file, (error, bytes) => { if (error) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', ({ '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream'); res.end(bytes); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await (await import('puppeteer')).default.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const widths = [320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280, 1440];
  const checks = [];
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.setRequestInterception(true);
    page.on('request', r => r.url().startsWith(base) && !r.url().includes('/api/') ? r.continue() : r.abort());
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    for (const route of ['index.html', 'services.html', 'checkout.html?service=new-pan&category=e-services']) {
      for (const width of widths) {
        await page.setViewport({ width, height: 800, isMobile: width < 768, hasTouch: width < 768 });
        await page.goto(base + '/' + route, { waitUntil: 'networkidle0' });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ' overflow ' + width);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('opds-skip-link')), true, 'First keyboard stop');
        const style = await page.$eval('.opds-skip-link', el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return { color: s.color, background: s.backgroundColor, top: r.top, bottom: r.bottom }; });
        assert(style.top >= 0 && style.bottom < 800, 'Visible focus link');
        const luminance = color => color.match(/\d+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
        const a = luminance(style.color), b = luminance(style.background);
        assert((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, 'Skip link contrast');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content', 'Skip lands in main');
        const missing = await page.evaluate(() => [...document.querySelectorAll('main input:not([type=hidden]), main select, main textarea')].filter(el => el.getBoundingClientRect().width && !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !['submit', 'button'].includes(el.type)).map(el => el.id || el.name || el.type));
        assert.deepEqual(missing, [], 'Visible form controls need labels: ' + route);
        checks.push({ route, width, keyboard: 'PASS', visibleLabels: 'PASS', skipLinkContrast: 'PASS', overflow: false });
      }
      // Simulate 200% text enlargement independently of device pixel scaling.
      await page.setViewport({ width: 390, height: 800, isMobile: true, hasTouch: true });
      await page.goto(base + '/' + route, { waitUntil: 'networkidle0' });
      await page.evaluate(() => {
        const sizes = [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().width && [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())).map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
        sizes.forEach(([el, size]) => el.style.setProperty('font-size', size * 2 + 'px', 'important'));
      });
      await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/text-200-' + route.split('.')[0] + '.png') });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '200% text overflow: ' + route);
      assert(await page.evaluate(() => [...document.querySelectorAll('main h1, main h1 > span')].every(el => el.scrollWidth <= el.clientWidth + 1)), '200% heading clipping: ' + route);
      checks.push({ route, width: 390, simulatedText200Percent: 'PASS' });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(root, 'artifacts/accessibility-test.json'), JSON.stringify({ result: 'PASS', checks, scope: 'Focused keyboard/label/skip-link contrast/reduced-motion viewport checks; not a full WCAG audit or screen-reader certification.' }, null, 2));
    console.log('PASS focused accessibility checks at 11 widths on three pages');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
