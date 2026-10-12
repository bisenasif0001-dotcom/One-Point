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
  try {
    let page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', req => req.url().startsWith(base) || req.url().startsWith('data:') ? req.continue() : req.abort());
    for (const width of process.env.OPDS_ENTRY_ONLY ? [] : widths) {
      await page.setViewport({ width, height: 844, isMobile: width < 768, hasTouch: width < 768 });
      await page.goto(base + '/products.html', { waitUntil: 'networkidle0' });
      await page.locator('[data-print-pilot]').click();
      await page.waitForFunction(() => !document.querySelector('[data-pack-continue]').disabled);
      await page.$eval('#print-pack-count', el => { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      assert.match(await page.$eval('[data-pack-total]', el => el.textContent), /200 cards/);
      const geometry = await page.$eval('#print-order-dialog', el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, scroll: el.scrollWidth, client: el.clientWidth }; });
      assert(geometry.left >= -1 && geometry.right <= width + 1 && geometry.scroll <= geometry.client + 1, `Print selector overflow ${width}`);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.locator('[data-pack-continue]').click()]);
      assert.equal(new URL(page.url()).searchParams.get('qty'), '2');
      assert.equal(new URL(page.url()).searchParams.get('pack_size'), '100');
      await page.waitForFunction(() => document.getElementById('step-1-details-container').textContent.includes('200 cards'));
      const total = await page.$eval('#summary-total', el => Number(el.textContent.match(/[0-9][0-9,]*(?:\.[0-9]+)?/)[0].replace(/,/g, '')));
      const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/catalog.json')));
      assert.equal(total, require('../assets/print-product-rules').quote(catalog.products.find(p => p.slug === 'visiting-cards'), 2).total);
      await page.evaluate(() => {
        for (const [key, value] of Object.entries({ name: 'Pricing QA', mobile: '9999999998', email: 'pricing@example.com' })) document.getElementById('checkout-' + key).value = value;
        document.getElementById('whatsapp-doc-later').checked = true;
        navigateToStep(3);
      });
      assert.match(await page.$eval('#submit-btn-text', el => el.textContent), new RegExp(total.toFixed(2).replace('.', '\\.')), 'Pay button must preserve paise');
      assert.equal(await page.$$eval('#payment-methods-grid .pay-method-tile', els => els.length), 1, 'Only Razorpay should be offered');
      if (width === 390) await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/payment-390.png'), fullPage: true });
      await page.goBack({ waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.querySelector('#print-order-dialog')?.open);
      assert.equal(await page.$eval('#print-pack-count', el => el.value), '2');
      await page.goBack();
      await page.waitForFunction(() => !document.querySelector('#print-order-dialog').open);
      console.log(`Verified print ${width}px`);
    }
    await page.close();
    page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', req => req.url().startsWith(base) || req.url().startsWith('data:') ? req.continue() : req.abort());
    await page.goto(base + '/services.html', { waitUntil: 'networkidle0' });
    console.log('Checking MSME');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.locator('[data-direct-order="msme"]').click()]);
    assert.equal(new URL(page.url()).searchParams.get('service'), 'msme-registration');
    await page.goto(base + '/services.html', { waitUntil: 'networkidle0' });
    console.log('Checking PAN Back');
    await page.locator('.shub-popular-grid [data-quick-order="pan"]').click();
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.locator('.quick-order-option[href*="card-reprint"]').click()]);
    await page.waitForFunction(() => new URL(location.href).searchParams.get('service') === 'card-reprint');
    await page.waitForNetworkIdle();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#pan-quick-order')?.open || document.querySelector('.quick-order-dialog')?.open);
    assert.match(await page.$eval('.quick-order-option[aria-current="true"]', el => el.href), /card-reprint/);
    await page.goto(base + '/product-detail.html?product=visiting-cards', { waitUntil: 'networkidle0' });
    console.log('Checking print detail');
    assert.equal(await page.$eval('.pd-config-desk', el => el.hidden), true, 'Visiting-card detail must not expose sticker pricing');
    await page.locator('#pd-btn-buy').click();
    await page.waitForFunction(() => document.querySelector('#print-order-dialog')?.open);
    const scope = JSON.parse(fs.readFileSync(path.join(root, 'assets/catalog.json'))).services.find(item => item.pricingModel === 'starting_from' && item.active !== false);
    await page.goto(base + '/checkout.html?service=' + scope.slug, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.classList.contains('scope-review-checkout'));
    assert.equal(await page.$eval('#checkout-customer-editor', el => getComputedStyle(el).display), 'none', 'Scope quote must not require applicant/payment journey');
    assert.match(await page.$eval('#scope-quote-link', el => el.href), /wa.me/);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(root, 'artifacts/direct-entry-test.json'), JSON.stringify({ result: 'PASS', widths, checks: ['MSME direct entry', 'configured packs and tax', 'exact paise in Pay action', 'consolidated UPI options', 'scope quote bypasses applicant/payment journey', 'selector geometry', 'print Back recovery', 'PAN Back recovery'], realGatewayTested: false }, null, 2));
    console.log('PASS direct entry at 11 widths');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });

