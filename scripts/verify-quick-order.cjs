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
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith(base) || request.url().startsWith('data:')) request.continue();
      else request.abort();
    });
    const screenshots = path.join(root, 'artifacts', 'ux-pilot');
    fs.mkdirSync(screenshots, { recursive: true });
    const widths = [320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280, 1440];
    for (const width of widths) {
      await page.setViewport({ width, height: width === 1440 ? 1000 : 844, isMobile: width < 768, hasTouch: width < 768 });
      await page.goto(base + '/services.html', { waitUntil: 'networkidle0' });
      await page.locator('.shub-popular-grid [data-quick-order="pan"]').click();
      assert.equal(await page.$eval('.quick-order-dialog', el => el.open), true);
      const geometry = await page.$eval('.quick-order-dialog', el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, scroll: el.scrollWidth, client: el.clientWidth };
      });
      assert(geometry.left >= -1 && geometry.right <= width + 1, `dialog outside ${width}px viewport`);
      assert(geometry.scroll <= geometry.client + 1, `dialog overflow at ${width}px`);
      assert.equal(await page.$$eval('.quick-order-option', els => els.length), 6);
      await page.screenshot({ path: path.join(screenshots, `pan-selector-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval('.quick-order-dialog', el => el.open), false);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.quickOrder), 'pan');
      await page.type('#shub-search-input', 'PAN');
      await page.locator('#shub-search-grid [data-quick-order="pan"]').click();
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.locator('[data-variant="pan-correction"]').click()]);
      await page.waitForFunction(() => new URL(location.href).searchParams.get('service') === 'pan-correction');
      await page.waitForNetworkIdle();
      assert.equal(new URL(page.url()).searchParams.get('service'), 'pan-correction');
      const selected = await page.$eval('#step-1-details-container', el => el.textContent);
      assert(/PAN.*Correction/i.test(selected), 'checkout lost selected task');
      if (width <= 768) {
        assert(await page.$eval('.selected-service-title-group', el => el.getBoundingClientRect().width > 150), 'selected service must remain readable');
      }
      await page.screenshot({ path: path.join(screenshots, `checkout-${width}.png`) });
      await page.evaluate(() => {
        for (const id of ['checkout-name', 'checkout-mobile', 'checkout-email', 'checkout-address']) document.getElementById(id).value = '';
      });
      await page.type('#checkout-name', 'Pilot Customer');
      await page.type('#checkout-mobile', '9999999999');
      assert.equal(await page.evaluate(() => validateStep1Form()), false, 'email must remain required');
      await page.type('#checkout-email', 'pilot@example.com');
      assert.equal(await page.evaluate(() => validateStep1Form()), true, 'blank address should be allowed');
      const mobileAction = await page.$eval('.checkout-mobile-cta', el => getComputedStyle(el).display !== 'none');
      await page.locator(mobileAction ? '#mobile-checkout-cta' : '#service-continue-btn').click();
      assert.equal(await page.$eval('#step-2', el => el.classList.contains('active')), true);
      await page.evaluate(() => { const box = document.querySelector('#whatsapp-doc-later'); box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); nextStep(3); });
      assert.equal(await page.$eval('#step-3', el => el.classList.contains('active')), true);
      await page.evaluate(() => navigateToStep(1));
      await page.evaluate(() => {
        window.__shortcutClicks = 0;
        document.getElementById('details-docs-later-btn').addEventListener('click', () => window.__shortcutClicks++);
        document.getElementById('details-docs-later-btn').scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await page.locator('#details-docs-later-btn').click();
      try {
        await page.waitForFunction(() => document.getElementById('step-3').classList.contains('active'), { timeout: 5000 });
      } catch (error) {
        console.log(JSON.stringify(await page.evaluate(() => ({
          shortcutClicks: window.__shortcutClicks,
          active: document.querySelector('.wizard-step.active')?.id,
          status: document.getElementById('checkout-step-status').textContent,
          invalid: [...document.querySelectorAll('.eds-input-invalid')].map(el => el.id),
          hit: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.outerHTML.slice(0, 300)
        })), null, 2));
        console.log('pageErrors', errors);
        await page.screenshot({ path: path.join(screenshots, 'shortcut-failure.png') });
        throw error;
      }
      assert.equal(await page.$eval('#step-3', el => el.classList.contains('active')), true, 'later-document shortcut must skip upload step');
      if (mobileAction) assert.match(await page.$eval('#mobile-checkout-cta', el => el.textContent), /Pay.*[0-9]|Confirm Booking/);
      await page.goto(base + '/', { waitUntil: 'networkidle0' });
      await page.screenshot({ path: path.join(screenshots, `home-${width}.png`), fullPage: false });
      if (width <= 720) {
        const search = await page.$eval('[data-ai-search]', el => el.getBoundingClientRect().bottom);
        assert(search < 500, 'mobile service search should be available early');
        assert.equal(await page.$$eval('[data-quick-services-grid] > :not([hidden])', els => els.length), 6);
      }
      console.log(`Verified ${width}px`);
      await page.goto(base + '/service-pan-card.html', { waitUntil: 'networkidle0' });
      await page.screenshot({ path: path.join(screenshots, `pan-detail-${width}.png`), fullPage: false });
    }
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(base + '/', { waitUntil: 'networkidle0' });
    await page.locator('[data-quick-services-grid] [data-quick-order="pan"]').click();
    assert.equal(await page.$eval('.quick-order-dialog', el => el.open), true);
    await page.locator('.quick-order-close').click();
    await page.focus('[data-ai-search]');
    await page.type('[data-ai-search]', 'PAN');
    await page.locator('[data-ai-suggestions] a[href="service-pan-card.html"]').click();
    assert.equal(await page.$eval('.quick-order-dialog', el => el.open), true);
    await page.locator('.quick-order-close').click();
    // Optional details remain a normal navigation path.
    await page.locator('[data-quick-services-grid] .voter-view-req[href="service-pan-card.html"]').click();
    await page.waitForFunction(() => location.pathname.endsWith('/service-pan-card.html'));
    assert(new URL(page.url()).pathname.endsWith('/service-pan-card.html'));
    assert.deepEqual(errors, [], 'uncaught page errors');
    console.log(JSON.stringify({ result: 'PASS', widths, checks: ['selector', 'six variants', 'no dialog overflow', 'Escape and focus return', 'directory search', 'checkout selection', 'email required', 'address optional', 'documents later', 'home card', 'home search', 'details fallback'], screenshots }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
