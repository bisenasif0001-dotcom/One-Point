const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) || !(relative.startsWith('assets/') || (!relative.includes('/') && relative.endsWith('.html')))) {
    res.writeHead(404); res.end(); return;
  }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const widths = [320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280, 1440];
  const errors = [];
  let signedIn = false, profileDelay = 0;
  const identity = { name: 'Account Owner QA', mobile: '+919999999999', email: 'owner@example.com' };
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', async req => {
      if (req.url() === base + '/api/customer/profile') {
        if (profileDelay) await new Promise(resolve => setTimeout(resolve, profileDelay));
        await req.respond({ status: signedIn ? 200 : 401, contentType: 'application/json', body: JSON.stringify(signedIn ? { customer: { identity } } : {}) });
      } else if (req.url().startsWith(base) || req.url().startsWith('data:')) await req.continue();
      else await req.abort();
    });
    const widths = [320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280, 1440];
    const baseline = process.argv.includes('--baseline');
    for (const width of widths) {
      await page.setViewport({ width, height: width < 768 ? 640 : 900, isMobile: width < 768, hasTouch: width < 768 });
      await page.goto(base + '/index.html', { waitUntil: 'networkidle0' });
      await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/home-' + (baseline ? 'before-' : 'after-') + width + '.png'), fullPage: false });
      if (baseline) continue;
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Home overflow ' + width);
      if (width <= 720) {
        const taskLayout = await page.$eval('.home-mobile-tasks', el => {
          const links = [...el.querySelectorAll('a')];
          return { gap: parseFloat(getComputedStyle(el).columnGap), font: parseFloat(getComputedStyle(links[0]).fontSize),
            fits: links.every(link => link.scrollWidth <= link.clientWidth + 1),
            separated: links[1].getBoundingClientRect().left > links[0].getBoundingClientRect().right };
        });
        assert(taskLayout.gap >= 8 && taskLayout.font <= 16 && taskLayout.fits && taskLayout.separated, 'Task spacing and text fit ' + width);
        const search = await page.$eval('[data-ai-search]', el => { const r = el.getBoundingClientRect(); return { bottom: r.bottom, height: r.height }; });
        assert(search.bottom < 440 && search.height >= 44, 'Search visible and touchable ' + width);
        assert(await page.$eval('.home-mobile-tasks', el => el.getBoundingClientRect().bottom < 480), 'Direct actions available early ' + width);
        await page.$eval('.home-mobile-tasks [data-quick-order]', el => el.click());
        await page.waitForFunction(() => document.querySelector('.quick-order-dialog').open);
        await page.keyboard.press('Escape');
        await page.type('[data-ai-search]', 'PAN');
        await page.waitForSelector('[data-ai-suggestions] a[href="service-pan-card.html"]');
        await page.evaluate(() => document.querySelector('[data-ai-search]').blur());
        await page.$eval('[data-mobile-toggle]', el => el.click());
        await page.waitForFunction(() => document.body.classList.contains('nav-open'));
        await page.goBack();
        await page.waitForFunction(() => !document.body.classList.contains('nav-open'));
        await page.$eval('[data-mobile-toggle]', el => el.click());
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('[data-mobile-toggle]', el => el.getAttribute('aria-expanded')), 'false');
      }
    }
    if (!baseline) {
      await page.setViewport({ width: 600, height: 360, isMobile: true, hasTouch: true });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.goto(base + '/index.html', { waitUntil: 'networkidle0' });
      if (!await page.$('[data-mobile-toggle]')) throw new Error('Missing mobile navigation: ' + errors.join('; '));
      await page.$eval('[data-mobile-toggle]', el => el.click());
      await page.waitForFunction(() => document.body.classList.contains('nav-open'));
      await page.$eval('[data-mobile-close]', el => el.click());
      assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-mobile-toggle')), true, 'Close restores focus');
      await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/home-landscape-600.png') });

      assert.equal(errors.length, 0, errors.join('\n'));
      fs.writeFileSync(path.join(root, 'artifacts/mobile-home-test.json'), JSON.stringify({ result: 'PASS', widths, checks: ['home no overflow', 'early touchable search', 'PAN search direct entry', 'mobile menu back and escape'], physicalDevicesTested: false }, null, 2));
    }
    console.log(baseline ? 'Home baseline captured' : 'PASS mobile home and navigation');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });

