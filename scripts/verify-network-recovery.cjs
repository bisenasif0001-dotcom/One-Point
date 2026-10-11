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
  const widths = [320,360,375,390,414,430,600,768,1024,1280,1440];
  try {
    const page = await browser.newPage();
    let state = 'session_created', offline = false, retryCalls = 0, failGateway = true, hangRetry = false;
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width: 390, height: 640, isMobile: true, hasTouch: true });
    await (await page.createCDPSession()).send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.setRequestInterception(true);
    page.on('request', async r => {
      if (r.url().includes('/api/payments/status/')) {
        if (offline) { await r.abort(); return; }
        await new Promise(resolve => setTimeout(resolve, 1500));
        await r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ order: { orderId: 'qa-order', total: 250 }, payment: { paymentId: 'qa-payment', status: state, gateway: 'razorpay', method: 'upi' } }) });
      } else if (r.url().endsWith('/api/csrf')) await r.respond({ status: 200, contentType: 'application/json', body: '{"csrfToken":"qa"}' });
      else if (r.url().endsWith('/api/payments/retry')) {
        if (hangRetry) { await new Promise(resolve => setTimeout(resolve, 20000)); await r.respond({ status: 503, contentType: 'application/json', body: '{"message":"Delayed QA response"}' }).catch(() => {}); return; }
        retryCalls++; await new Promise(resolve => setTimeout(resolve, 500));
        await r.respond({ status: 201, contentType: 'application/json', body: JSON.stringify({ payment: { orderId: 'qa-order', paymentId: 'qa-payment', sessionType: 'razorpay_checkout', session: { order_id: 'qa-gateway-order' } } }) });
      } else if (r.url() === 'https://checkout.razorpay.com/v1/checkout.js') {
        if (failGateway) { failGateway = false; await r.abort(); }
        else await r.respond({ status: 200, contentType: 'application/javascript', body: 'window.Razorpay=function(options){this.open=function(){window.qaGatewayOrder=options.order_id;options.modal.ondismiss();};};' });
      } else if (r.url().startsWith(base) && !r.url().includes('/api/')) await r.continue();
      else await r.abort();
    });
    await page.goto(base + '/payment-pending.html?order_id=qa-order', { waitUntil: 'domcontentloaded' });
    assert(!(await page.evaluate(() => document.body.innerText)).includes('✓ Confirmed'), 'Slow status must not confirm prematurely');
    await page.waitForFunction(() => document.body.innerText.includes('Awaiting Confirmation'));
    offline = true;
    await page.click('#manual-refresh-status-btn');
    await page.waitForFunction(() => document.body.innerText.includes('Verification unavailable'));
    offline = false;
    await page.waitForFunction(() => !document.getElementById('manual-refresh-status-btn').disabled);
    await page.click('#manual-refresh-status-btn');
    await page.waitForFunction(() => document.querySelector('.payment-result-card h1').textContent === 'Payment awaiting confirmation');
    state = 'captured';
    await page.waitForFunction(() => !document.getElementById('manual-refresh-status-btn').disabled);
    await page.click('#manual-refresh-status-btn');
    await page.waitForFunction(() => location.pathname === '/payment-success.html');
    await page.waitForFunction(() => document.body.innerText.includes('✓ Confirmed'));
    assert(await page.$('a[href="track-application.html?id=qa-order"]'), 'Tracking keeps order identity');
    state = 'failed';
    await page.goto(base + '/payment-pending.html?order_id=qa-order', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => location.pathname === '/payment-failed.html');
    await page.waitForFunction(() => document.body.innerText.includes('Payment Failed'));
    await page.$eval('.status-actions [data-retry-payment]', b => { b.click(); b.click(); });
    await page.waitForFunction(() => document.querySelector('[role=alert]')?.textContent.includes('could not load'));
    assert.equal(retryCalls, 1, 'Double tap makes one retry request');
    await page.$eval('.status-actions [data-retry-payment]', b => b.click());
    await page.waitForFunction(() => window.qaGatewayOrder === 'qa-gateway-order');
    assert.equal(await page.evaluate(() => location.pathname), '/payment-failed.html', 'Cancelled recovery preserves page');
    assert.equal(retryCalls, 2, 'Failed SDK can be loaded on retry');
    hangRetry = true;
    await page.$eval('.status-actions [data-retry-payment]', b => b.click());
    await page.waitForFunction(() => document.querySelector('[data-payment-status]').textContent.includes('Payment request timed out'), { timeout: 22000 });
    assert.equal(await page.$eval('.status-actions [data-retry-payment]', b => b.disabled), false, 'Timed-out retry releases action');
    hangRetry = false;
    for (const route of ['payment-success.html', 'payment-pending.html', 'payment-failed.html']) {
      state = route.includes('success') ? 'captured' : route.includes('failed') ? 'failed' : 'session_created';
      await page.goto(base + '/' + route + '?order_id=qa-order&amount=1', { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.querySelector('[data-payment-status]').textContent.includes('250.00'));
      for (const width of widths) {
        await page.setViewport({ width, height: width === 600 ? 360 : 800, isMobile: width < 768, hasTouch: width < 768 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ' overflow ' + width);
      }
    }
    offline = true;
    const unsafeReference = '<img src=x onerror="window.qaInjected=true">';
    await page.goto(base + '/payment-success.html?order_id=' + encodeURIComponent(unsafeReference), { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Verification unavailable'));
    assert.equal(await page.evaluate(() => !!window.qaInjected), false, 'Query reference must remain text');
    assert.equal(await page.$('[data-payment-status] img'), null);
    offline = false;
    await page.setViewport({ width: 390, height: 640, isMobile: true, hasTouch: true });
    const network = await page.createCDPSession();
    await network.send('Network.enable');
    await network.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 256 * 1024, uploadThroughput: 128 * 1024 });
    await page.setCacheEnabled(false);
    await page.goto(base + '/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.$eval('.home-mobile-tasks [data-quick-order]', button => button.click());
    await page.waitForFunction(() => document.querySelector('.quick-order-dialog').open);
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(root, 'artifacts/network-recovery-test.json'), JSON.stringify({ result: 'PASS', widths, checks: ['CPU 4x and delayed status', 'interrupted status and restored network', 'pending to verified success', 'pending to failed', 'SDK failure retry', 'double-tap guard', 'same-order gateway cancellation', 'server amount ignores query amount', 'result pages portrait and short landscape', 'query reference rendered as text', 'uncached local home at 150ms latency / 256 KiB per second and PAN selector'], externalGateway: 'simulated', physicalDevicesTested: false }, null, 2));
    console.log('PASS slow/interrupted status, gateway recovery and result pages at 11 widths');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });

