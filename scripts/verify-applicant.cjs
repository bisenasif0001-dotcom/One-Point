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
    const values = () => page.evaluate(() => Object.fromEntries(['name', 'mobile', 'email', 'address'].map(k => [k, document.getElementById('checkout-' + k).value])));
    async function fill(name, mobile, email) {
      await page.evaluate(v => { Object.entries(v).forEach(([key, value]) => { const el = document.getElementById('checkout-' + key); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }); }, { name, mobile, email });
    }
    await page.goto(base + '/checkout.html?service=pan-correction', { waitUntil: 'networkidle0' });
    for (const width of widths) {
      await page.setViewport({ width, height: 844, isMobile: width < 768, hasTouch: width < 768 });
      assert.equal(await page.$eval('#checkout-optional-details', el => el.open), false, 'Optional details closed at width ' + width);
      assert.equal(await page.$eval('#checkout-email', el => el.required), true);
      assert.equal(await page.$eval('#checkout-address', el => el.required), false);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Checkout overflow ${width}`);
      await page.locator('#checkout-optional-details > summary').click();
      if (width === 390) { await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/applicant-390.png'), fullPage: true }); await new Promise(resolve => setTimeout(resolve, 300)); }
      await page.evaluate(() => toggleProfileType('business'));
      await fill('Guest QA', '9999999998', 'guest@example.com');
      assert.equal(await page.evaluate(() => validateStep1Form()), true, 'Blank optional invoice GSTIN and address must pass');
      await page.$eval('#checkout-optional-details', el => { el.open = false; });
    }
    await page.evaluate(() => { localStorage.removeItem('opds_checkout_draft'); localStorage.removeItem('opds_checkout_applicant_mode'); });
    signedIn = true;
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal((await values()).name, identity.name);
    assert.equal(await page.$eval('#checkout-customer-editor', el => el.hidden), true);
    await page.evaluate(() => editCheckoutApplicant(false));
    assert.equal(await page.$eval('#checkout-customer-editor', el => el.hidden), false, 'Edit must reveal saved details');
    await page.evaluate(() => editCheckoutApplicant(true));
    assert.deepEqual(await values(), { name: '', mobile: '', email: '', address: '' }, 'Other applicant must start clear');
    await fill('Other Applicant QA', '9999999997', 'other@example.com');
    await page.evaluate(() => { toggleProfileType('business'); document.getElementById('checkout-gst').value = '07AAAAA1111A1Z1'; });
    assert.equal(await page.evaluate(() => validateStep1Form()), true);
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal((await values()).name, 'Other Applicant QA', 'Profile must not overwrite another applicant draft');
    assert.equal(await page.$eval('#checkout-gst', el => el.value), '07AAAAA1111A1Z1');
    await page.evaluate(() => useSavedCustomerDetails());
    assert.equal((await values()).name, identity.name);
    await page.evaluate(() => editCheckoutApplicant(true));
    assert.equal((await values()).name, 'Other Applicant QA', 'Switching back should retain the other applicant during this visit');
    assert.equal(await page.$eval('input[name="profileType"][value="business"]', el => el.checked), true);
    await page.evaluate(() => { localStorage.removeItem('opds_checkout_draft'); localStorage.removeItem('opds_checkout_applicant_mode'); });
    profileDelay = 1500;
    await page.goto(base + '/checkout.html?service=pan-correction', { waitUntil: 'domcontentloaded' });
    await fill('Typed Before Profile', '9999999996', 'typed@example.com');
    await page.waitForNetworkIdle({ idleTime: 1700 });
    assert.equal((await values()).name, 'Typed Before Profile', 'Late profile response must not overwrite typing');
    profileDelay = 0;
    await page.goto(base + '/checkout.html?service=pan-correction&for_other=1&name=Linked%20Applicant&email=linked%40example.com&phone=9999999995', { waitUntil: 'networkidle0' });
    assert.equal((await values()).name, 'Linked Applicant');
    await fill('Edited Linked Applicant', '9999999995', 'linked@example.com');
    await page.evaluate(() => window.dispatchEvent(new Event('opds:catalog-ready')));
    assert.equal((await values()).name, 'Edited Linked Applicant', 'Catalog refresh must not replay old query values');
    await page.evaluate(() => { document.getElementById('checkout-gst').value = 'BAD'; toggleProfileType('business'); document.getElementById('checkout-optional-details').open = false; });
    assert.equal(await page.evaluate(() => validateStep1Form()), false);
    assert.equal(await page.$eval('#checkout-optional-details', el => el.open), true, 'Invalid optional entry must reveal its field');
    assert.deepEqual(errors, []);
    signedIn = false;
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto(base + '/checkout.html?service=pan-correction', { waitUntil: 'networkidle0' });
    await fill('Partial Draft', '', '');
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal((await values()).name, 'Partial Draft', 'Incomplete applicant details recover');
    await page.evaluate(() => { const draft = JSON.parse(localStorage.getItem('opds_checkout_draft')); draft.savedAt = Date.now() - 25 * 3600000; localStorage.setItem('opds_checkout_draft', JSON.stringify(draft)); });
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal((await values()).name, '', 'Expired draft is removed');
    await fill('Clear Draft', '', '');
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Clear saved applicant details').click());
    assert.equal((await values()).name, '', 'Clear saved details resets fields');
    assert.equal(await page.evaluate(() => localStorage.getItem('opds_checkout_draft')), null);
    await page.goto(base + '/payment-success.html?order_id=unverified', { waitUntil: 'networkidle0' });
    assert(!(await page.evaluate(() => document.body.innerText)).includes('✓ Confirmed'), 'Unavailable API cannot claim confirmed payment');
    fs.writeFileSync(path.join(root, 'artifacts/applicant-test.json'), JSON.stringify({ result: 'PASS', widths, checks: ['guest three required fields', 'optional address and invoice GSTIN', 'saved profile edit', 'other applicant starts clear', 'other applicant draft reload', 'switch applicant recovery', 'late profile preserves typing', 'query and catalog refresh preserve edits', 'invalid optional invoice reveals field'], realGatewayTested: false }, null, 2));
    console.log('PASS applicant flow at 11 widths and saved/other applicant recovery');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });

