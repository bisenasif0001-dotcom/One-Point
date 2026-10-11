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
    let baseline = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', async req => {
      if (baseline && /assets\/mobile-services\.(css|js)/.test(req.url())) { await req.respond({ status: 200, contentType: req.url().includes('.css') ? 'text/css' : 'application/javascript', body: '' }); }
      else if (req.url() === base + '/api/customer/profile') {
        if (profileDelay) await new Promise(resolve => setTimeout(resolve, profileDelay));
        await req.respond({ status: signedIn ? 200 : 401, contentType: 'application/json', body: JSON.stringify(signedIn ? { customer: { identity } } : {}) });
      } else if (req.url().startsWith(base) || req.url().startsWith('data:')) await req.continue();
      else await req.abort();
    });
    const widths = [320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280, 1440];
    const pages = ['services.html', 'service-pan-card.html', 'service-msme-registration.html', 'service-gst-registration.html'];
    for (const width of widths) {
      await page.setViewport({ width, height: 720, isMobile: width < 768, hasTouch: width < 768 });
      for (const file of pages) {
        await page.goto(base + '/' + file, { waitUntil: 'networkidle0' });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), file + ' overflow ' + width);
        if (await page.$('#advisory-modal.show')) await page.$eval('#advisory-ok-btn', el => el.click());
        await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/' + file.replace('.html','') + '-mobile-' + width + '.png') });
        if (file === 'services.html') {
          if (width <= 720) {
            assert(await page.$eval('#shub-search-input', el => el.getBoundingClientRect().bottom < 440), 'Directory search appears early ' + width);
            assert.equal(await page.$eval('.shub-toolbar-filters', el => el.closest('details').open), false);
            await page.$eval('.shub-toolbar-filters', el => el.closest('details').querySelector('summary').click());
            await page.select('#shub-cat-select', 'business');
            assert.match(await page.$eval('.shub-toolbar-filters', el => el.closest('details').querySelector('summary').textContent), /1 active/);
            await page.select('#shub-cat-select', 'all');
          }
          await page.type('#shub-search-input', 'PAN');
          await page.waitForSelector('#shub-search-grid [data-quick-order="pan"]');
          await page.$eval('#shub-search-grid [data-quick-order="pan"]', el => el.click());
          await page.waitForFunction(() => document.querySelector('.quick-order-dialog').open);
          await page.keyboard.press('Escape');
        } else {
          await page.waitForSelector('.enterprise-detail-command');
          if (width <= 720) {
            assert(await page.$eval(await page.$('.mobile-native-action') ? '.mobile-native-action' : '.edc-primary-action', el => { const r = el.getBoundingClientRect(); return r.height >= 44 && r.bottom < 680; }), 'Early booking action ' + file + ' ' + width);
            const disclosure = await page.$('.voter-overview-main .mobile-service-disclosure');
            if (disclosure) {
              assert.equal(await disclosure.evaluate(el => el.open), false);
              await disclosure.evaluate(el => el.querySelector('summary').click());
              assert.equal(await disclosure.evaluate(el => el.open), true);
            }
            if (await page.$('.mobile-service-disclosure .edc-eligibility-docs-card')) {
            assert.equal(await page.$eval('.edc-eligibility-docs-card', el => el.closest('details').open), false);
            await page.$eval('.edc-eligibility-docs-card', el => el.closest('details').querySelector('summary').click());
            assert.equal(await page.$eval('.edc-eligibility-docs-card', el => el.closest('details').open), true);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Expanded docs overflow');
            }
          }
          if (file === 'service-pan-card.html' && width <= 720) {
            await page.$eval('.mobile-native-action', el => el.click());
            await page.waitForFunction(() => document.querySelector('.quick-order-dialog').open);
            assert.equal(await page.$$eval('.quick-order-option', els => els.length), 6);
            await page.keyboard.press('Escape');
          }
        }
      }
    }
    await page.setViewport({ width: 390, height: 720, isMobile: true, hasTouch: true });
    const extraPages = ['service-aadhaar-services-assistance.html', 'service-passport-assistance.html', 'service-income-certificate.html', 'service-voter-id.html', 'service-photocopy-printing.html'];
    for (const file of extraPages) {
      await page.goto(base + '/' + file, { waitUntil: 'networkidle0' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Additional detail overflow ' + file);
      await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/' + file.replace('.html','') + '-390.png') });
    }
    baseline = true;
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
    for (const file of ['services.html', 'service-pan-card.html', 'service-gst-registration.html']) {
      await page.goto(base + '/' + file, { waitUntil: 'networkidle0' });
      if (await page.$('#advisory-modal.show')) await page.$eval('#advisory-ok-btn', el => el.click());
      await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/' + file.replace('.html','') + '-desktop-before.png') });
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    fs.writeFileSync(path.join(root, 'artifacts/mobile-services-test.json'), JSON.stringify({ result: 'PASS', widths, pages, checks: ['no overflow', 'search and filters', 'document disclosures', 'early booking actions', 'PAN exact task selector'], physicalDevicesTested: false }, null, 2));
    console.log('PASS mobile directory and service details');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });

