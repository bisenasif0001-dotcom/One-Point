// Runs the real HTTP/backend contracts in a disposable copy; gateway is simulated.
// Never reads .env or existing customer databases; never contacts external services.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');

if (process.argv[2] === '--worker') {
  const isolated = process.argv[3];
  global.fetch = async () => { throw new Error('External network disabled in local booking test'); };
  require(path.join(isolated, 'backend/db.js')).getDb();
  const gateway = require(path.join(isolated, 'backend/gateways/razorpay.js'));
  gateway.createSession = async ({ order, payment }) => ({
    gateway: 'razorpay', type: 'razorpay_checkout', gatewayOrderId: 'local_gateway_' + order.order_id,
    session: { key: 'local_test_key', order_id: 'local_gateway_' + order.order_id,
      amount: payment.amount_paise, currency: 'INR' }
  });
  require(path.join(isolated, 'server.js'));
} else {
  (async () => {
    fs.mkdirSync(path.join(root, 'scratch'), { recursive: true });
    const isolated = fs.mkdtempSync(path.join(root, 'scratch/booking-test-'));
    fs.cpSync(path.join(root, 'backend'), path.join(isolated, 'backend'), {
      recursive: true, filter: source => !/[\\/](data|uploads|invoices|logs)([\\/]|$)/.test(source)
    });
    fs.copyFileSync(path.join(root, 'server.js'), path.join(isolated, 'server.js'));
    for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
      fs.copyFileSync(path.join(root, file), path.join(isolated, file));
    }
    fs.cpSync(path.join(root, 'assets'), path.join(isolated, 'assets'), { recursive: true,
      filter: source => fs.statSync(source).isDirectory() || /\.(js|css|json|svg)$/i.test(source) });
    const port = 4191;
    const base = 'http://127.0.0.1:' + port;
    // Construct a clean environment; no inherited service credentials.
    const child = spawn(process.execPath, [__filename, '--worker', isolated], {
      cwd: isolated, env: {
        PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
        NODE_ENV: 'test', OPDS_SKIP_LOCAL_ENV: 'true', PORT: String(port),
        NEXT_PUBLIC_SITE_URL: base, DATABASE_URL: path.join(isolated, 'test.sqlite'),
        JWT_SECRET: crypto.randomBytes(32).toString('hex'), ADMIN_API_TOKEN: crypto.randomBytes(32).toString('hex'),
        RAZORPAY_KEY_ID: 'local_test_key', RAZORPAY_KEY_SECRET: 'local_test_secret',
        ALLOWED_HOSTS: '127.0.0.1,localhost'
      }, stdio: ['ignore', 'pipe', 'pipe']
    });
    let logs = '';
    child.stdout.on('data', chunk => { logs += chunk; });
    child.stderr.on('data', chunk => { logs += chunk; });
    const request = async (url, options = {}) => {
      // Direct contract checks and the browser represent separate QA clients;
      // keep their rapid request bursts separate without changing server limits.
      const response = await fetch(base + url, { ...options, headers: { 'X-Forwarded-For': '198.51.100.200', ...(options.headers || {}) }, signal: AbortSignal.timeout(10000) });
      return { response, data: await response.json() };
    };
    try {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (child.exitCode !== null) throw new Error('Isolated backend exited during startup');
        try { const result = await request('/api/health'); ready = result.response.ok; } catch {}
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      assert(ready, 'Isolated server must start');
      const serviceCatalog = await request('/api/products');
      const correctionPolicy = serviceCatalog.data.serviceVariants.find(item => item.slug === 'pan-correction').policy;
      assert.equal(correctionPolicy.id, 'pan-correction');
      assert(correctionPolicy.documents.required.some(label => /correction/i.test(label)));
      const csrf = await request('/api/csrf');
      const cookie = csrf.response.headers.get('set-cookie').split(';')[0];
      const headers = { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf.data.csrfToken };
      const body = { customer: { name: 'Local QA Customer', phone: '9999999999', email: 'local-qa@example.com', address: '' },
        items: [{ type: 'service', slug: 'pan-correction', name: 'PAN Card Correction & Update Support', quantity: 1, price: 1 }],
        gateway: 'razorpay', paymentMethod: 'upi', idempotencyKey: 'local_smoke_order' };
      const quoted = await request('/api/checkout-quote', { method: 'POST', headers, body: JSON.stringify(body) });
      assert.equal(quoted.response.status, 200, JSON.stringify(quoted.data));
      assert(quoted.data.total > 1, 'Quote must ignore a client price override');
      for (const change of [{ discount: 999 }, { couponCode: 'ONEPOINT10' }, { deliveryCharge: 5 }, { paymentPlan: 'partial' }, { expectedTotalPaise: 1 }]) {
        const rejectedPrice = await request('/api/service-bookings', { method: 'POST', headers, body: JSON.stringify({ ...body, ...change, idempotencyKey: 'rejected_' + Object.keys(change)[0] }) });
        assert(!rejectedPrice.response.ok, 'Unverified adjustment must be rejected: ' + Object.keys(change)[0]);
      }
      const scopeItem = serviceCatalog.data.services.find(item => item.policy?.purchase.mode === 'scope_review');
      assert(scopeItem, 'Catalog must include a scope-review example');
      const scopeQuote = await request('/api/checkout-quote', { method: 'POST', headers, body: JSON.stringify({ items: [{ slug: scopeItem.slug, type: 'service', quantity: 1 }] }) });
      assert(!scopeQuote.response.ok, 'Starting-price service cannot become a fixed-price payment');
      const noCsrf = await request('/api/service-bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      assert.equal(noCsrf.response.status, 403, 'CSRF protection must remain enforced');
      const invalidEmail = await request('/api/service-bookings', { method: 'POST', headers, body: JSON.stringify({ ...body, customer: { ...body.customer, email: '' } }) });
      assert(!invalidEmail.response.ok, 'Email remains mandatory server-side');
      const mismatched = await request('/api/service-bookings', { method: 'POST', headers,
        body: JSON.stringify({ ...body, items: [{ type: 'service', slug: 'not-a-service', name: 'PAN Correction' }] }) });
      assert(!mismatched.response.ok, 'Unknown explicit ID must not silently resolve from a name');
      const booked = await request('/api/service-bookings', { method: 'POST', headers, body: JSON.stringify(body) });
      const changedIntent = await request('/api/service-bookings', { method: 'POST', headers, body: JSON.stringify({ ...body, customer: { ...body.customer, name: 'Different Applicant' } }) });
      assert(!changedIntent.response.ok, 'Same request key cannot change applicant');
      const printProduct = serviceCatalog.data.products.find(item => item.slug === 'visiting-cards');
      const printBody = { ...body, idempotencyKey: 'local_print_pilot', items: [{ type: 'product', slug: 'visiting-cards', quantity: 2, price: 1, configuration: { packSize: 100, packs: 2 } }] };
      const printBooked = await request('/api/orders', { method: 'POST', headers, body: JSON.stringify(printBody) });
      assert.equal(printBooked.response.status, 201, JSON.stringify(printBooked.data));
      const printQuote = require('../assets/print-product-rules').quote(printProduct, 2);
      assert.equal(printBooked.data.order.total, printQuote.total, 'Configured print total must agree with server catalog and tax');
      const invalidPrint = await request('/api/orders', { method: 'POST', headers, body: JSON.stringify({ ...printBody, idempotencyKey: 'local_invalid_print', items: [{ ...printBody.items[0], configuration: { packSize: 200, packs: 2 } }] }) });
      assert(!invalidPrint.response.ok, 'Unpriced custom pack must be rejected');
      assert.equal(booked.response.status, 201, JSON.stringify(booked.data));
      assert(booked.data.order?.orderId, 'Must return a real local order ID');
      const ownerToken = booked.data.session?.token;
      assert(ownerToken, 'Guest booking must return its local account session');
      const ownerHeaders = { ...headers, 'X-Session-Token': ownerToken };
      const ownerBefore = await request('/api/customer/profile', { headers: ownerHeaders });
      const otherCustomer = { name: 'Other Applicant QA', phone: '9999999997', email: 'other-applicant@example.com', address: '', gstin: '' };
      const otherBooked = await request('/api/service-bookings', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ ...body, applicantMode: 'other', customer: otherCustomer, idempotencyKey: 'local_other_applicant' }) });
      assert.equal(otherBooked.response.status, 201, JSON.stringify(otherBooked.data));
      const otherStatus = await request('/api/payments/status/' + otherBooked.data.order.orderId, { headers: ownerHeaders });
      assert.equal(otherStatus.data.customer.name, otherCustomer.name);
      assert.equal(otherStatus.data.customer.phone, otherCustomer.phone);
      assert.equal(otherStatus.data.customer.email, otherCustomer.email);
      assert.equal(otherStatus.data.customer.address, '', 'Optional blank address must not inherit owner address');
      const ownerAfter = await request('/api/customer/profile', { headers: ownerHeaders });
      assert.deepEqual(ownerAfter.data.customer.identity, ownerBefore.data.customer.identity, 'Other applicant checkout must not change account profile');
      const otherGatewayOrder = otherBooked.data.payment.session.order_id;
      const otherSignature = crypto.createHmac('sha256', 'local_test_secret').update(otherGatewayOrder + '|local_other_payment').digest('hex');
      const otherVerified = await request('/api/payments/verify', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ gateway: 'razorpay', razorpay_order_id: otherGatewayOrder, razorpay_payment_id: 'local_other_payment', razorpay_signature: otherSignature }) });
      assert.equal(otherVerified.response.status, 200, JSON.stringify(otherVerified.data));
      const otherPaid = await request('/api/payments/status/' + otherBooked.data.order.orderId, { headers: ownerHeaders });
      const otherInvoice = await fetch(base + otherPaid.data.invoice.downloadUrl, { headers: ownerHeaders });
      assert.equal(otherInvoice.status, 200);
      const invoiceText = Buffer.from(await otherInvoice.arrayBuffer()).toString('latin1');
      assert(invoiceText.includes('Customer: Other Applicant QA'), 'Invoice must use the order applicant snapshot');
      assert(!invoiceText.includes('Customer: Local QA Customer'), 'Invoice must not silently use account owner');
      assert.equal(otherPaid.data.documentSubmission.state, 'awaiting_documents');
      const documentBody = { orderId: otherBooked.data.order.orderId, docType: 'supporting_document', fileName: 'local-qa.pdf', fileData: Buffer.from('%PDF-1.4\nLocal QA document\n%%EOF').toString('base64') };
      const noUploadAuth = await request('/api/orders/document-files', { method: 'POST', headers, body: JSON.stringify(documentBody) });
      assert(!noUploadAuth.response.ok, 'File upload must require an owning customer session');
      const badFile = await request('/api/orders/document-files', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ ...documentBody, fileData: Buffer.from('Not a PDF').toString('base64') }) });
      assert(!badFile.response.ok, 'Renamed invalid file must be rejected');
      const uploaded = await request('/api/orders/document-files', { method: 'POST', headers: ownerHeaders, body: JSON.stringify(documentBody) });
      assert.equal(uploaded.response.status, 201, JSON.stringify(uploaded.data));
      assert.equal(uploaded.data.submission.state, 'awaiting_review', 'Receiving a file does not mark the order ready');
      assert.equal(uploaded.data.submission.count, 1);
      const storedNames = fs.readdirSync(path.join(isolated, 'backend/uploads/customer-documents'));
      assert(storedNames.length > 0, 'Real document bytes must be stored');
      const privateResponse = await fetch(base + '/backend/uploads/customer-documents/' + storedNames[0]);
      assert.equal(privateResponse.status, 403, 'Uploaded document bytes must not be available as a public static file');
      const privateUpper = await fetch(base + '/BACKEND/uploads/customer-documents/' + storedNames[0]);
      assert.equal(privateUpper.status, 403, 'Private storage must also be protected on case-insensitive hosts');
      const missingCsrfUpload = await request('/api/orders/document-files', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-Token': ownerToken }, body: JSON.stringify(documentBody) });
      assert.equal(missingCsrfUpload.response.status, 403);
      const repeatedUpload = await request('/api/orders/document-files', { method: 'POST', headers: ownerHeaders, body: JSON.stringify(documentBody) });
      assert.equal(repeatedUpload.data.duplicate, true, 'Retrying same file must not duplicate it');
      assert.equal(repeatedUpload.data.submission.count, 1);
      const badInvoice = await request('/api/service-bookings', { method: 'POST', headers: ownerHeaders, body: JSON.stringify({ ...body, customer: { ...otherCustomer, gstin: 'BAD' }, idempotencyKey: 'local_bad_invoice' }) });
      assert(!badInvoice.response.ok, 'Invalid optional GSTIN must be rejected by backend');
      assert.equal(booked.data.payment.sessionType, 'razorpay_checkout');
      assert(booked.data.order.total > 1, 'Client price must not override catalog pricing');
      const repeated = await request('/api/service-bookings', { method: 'POST', headers, body: JSON.stringify(body) });
      assert.equal(repeated.data.order.orderId, booked.data.order.orderId, 'Same key must reuse order');
      const pending = await request('/api/payments/status/' + booked.data.order.orderId);
      assert.equal(pending.response.status, 200);
      assert.equal(pending.data.payment.status, 'session_created');
      const unauthorizedRetry = await request('/api/payments/retry', { method: 'POST', headers, body: JSON.stringify({ paymentId: booked.data.payment.paymentId, gateway: 'razorpay' }) });
      assert.equal(unauthorizedRetry.response.status, 401, 'Payment recovery requires owning account');
      const foreignBooking = await request('/api/service-bookings', { method: 'POST', headers, body: JSON.stringify({ ...body, customer: { name: 'Different Account QA', phone: '9999999996', email: 'different-account@example.com' }, idempotencyKey: 'local_foreign_account' }) });
      const wrongRetry = await request('/api/payments/retry', { method: 'POST', headers: { ...headers, 'X-Session-Token': foreignBooking.data.session.token }, body: JSON.stringify({ paymentId: booked.data.payment.paymentId, gateway: 'razorpay' }) });
      assert.equal(wrongRetry.response.status, 403, 'Another customer cannot resume this payment');
      const recoveryBody = { paymentId: booked.data.payment.paymentId, gateway: 'razorpay' };
      const recovered = await request('/api/payments/retry', { method: 'POST', headers: ownerHeaders, body: JSON.stringify(recoveryBody) });
      assert.equal(recovered.response.status, 201, JSON.stringify(recovered.data));
      assert.equal(recovered.data.payment.paymentId, booked.data.payment.paymentId, 'Recovery reuses the pending payment session');
      const recoveredAgain = await request('/api/payments/retry', { method: 'POST', headers: ownerHeaders, body: JSON.stringify(recoveryBody) });
      assert.equal(recoveredAgain.data.payment.paymentId, recovered.data.payment.paymentId);
      const gatewayOrder = booked.data.payment.session.order_id;
      const paymentId = 'local_payment_1';
      const signature = crypto.createHmac('sha256', 'local_test_secret').update(gatewayOrder + '|' + paymentId).digest('hex');
      const verified = await request('/api/payments/verify', { method: 'POST', headers,
        body: JSON.stringify({ gateway: 'razorpay', razorpay_order_id: gatewayOrder,
          razorpay_payment_id: paymentId, razorpay_signature: signature }) });
      assert.equal(verified.response.status, 200, JSON.stringify(verified.data));
      const paid = await request('/api/payments/status/' + booked.data.order.orderId);
      assert.equal(paid.response.status, 200);
      assert.equal(paid.data.payment.status, 'captured');
      assert(paid.data.invoice, 'Verified payment must have an invoice');
      const paidRetry = await request('/api/payments/retry', { method: 'POST', headers: ownerHeaders, body: JSON.stringify(recoveryBody) });
      assert(!paidRetry.response.ok, 'Already paid order cannot create another payment');
      const puppeteer = (await import('puppeteer')).default;
      const browser = await puppeteer.launch({ headless: true,
        executablePath: process.env.OPDS_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        await page.exposeFunction('localQaSignature', order => crypto.createHmac('sha256', 'local_test_secret')
          .update(order + '|local_ui_payment_' + order).digest('hex'));
        await page.setRequestInterception(true);
        let failNextFileUpload = false;
        page.on('request', req => {
          if (req.url().endsWith('/api/orders/document-files') && failNextFileUpload) {
            failNextFileUpload = false; req.abort();
          } else if (req.url() === 'https://checkout.razorpay.com/v1/checkout.js') {
            req.respond({ status: 200, contentType: 'application/javascript', body:
              'window.Razorpay=function(options){this.open=async function(){window.localQaGatewayOpens=Number(sessionStorage.getItem("qaGatewayOpens")||0)+1;sessionStorage.setItem("qaGatewayOpens",window.localQaGatewayOpens);if(window.localQaGatewayOpens===1){options.modal.ondismiss();return;}const signature=await window.localQaSignature(options.order_id);await options.handler({razorpay_order_id:options.order_id,razorpay_payment_id:"local_ui_payment_"+options.order_id,razorpay_signature:signature});};};' });
          } else if (req.url().startsWith(base) || req.url().startsWith('data:')) req.continue();
          else req.abort();
        });
        await page.goto(base + '/checkout.html?service=pan-correction', { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => document.getElementById('service-document-checklist').textContent.toLowerCase().includes('correction'));
        await page.evaluate(() => window.dispatchEvent(new Event('opds:catalog-ready')));
        assert.match(await page.$eval('#service-document-checklist', element => element.textContent), /correction/i,
          'Catalog-ready refresh must preserve the exact document policy');
        await page.evaluate(() => {
          for (const [id, value] of Object.entries({ 'checkout-name': 'Local Browser QA',
            'checkout-mobile': '9999999998', 'checkout-email': 'local-browser@example.com', 'checkout-address': '' })) {
            const input = document.getElementById(id); input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          document.getElementById('whatsapp-doc-later').checked = true;
          navigateToStep(3);
        });
        const bookingResponse = page.waitForResponse(response => response.url().endsWith('/api/service-bookings') && response.request().method() === 'POST');
        await page.evaluate(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['%PDF-1.4\nCheckout QA\n%%EOF'], 'checkout-document.pdf', { type: 'application/pdf' })); document.getElementById('file-input').files = transfer.files; handleFileSelect({ target: document.getElementById('file-input') }); });
        await page.evaluate(() => document.getElementById('checkout-form').requestSubmit());
        const uiBooked = await (await bookingResponse).json();
        assert(uiBooked.order?.orderId, 'Browser checkout must create its own local order');
        await page.waitForFunction(() => document.body.innerText.includes('Payment closed.'));
        assert.equal(await page.evaluate(() => location.pathname), '/checkout.html', 'Cancellation keeps recoverable checkout');
        await page.reload({ waitUntil: 'networkidle0' });
        await page.evaluate(() => { document.getElementById('whatsapp-doc-later').checked = true; navigateToStep(3); });
        const resumedResponse = page.waitForResponse(response => response.url().endsWith('/api/service-bookings') && response.request().method() === 'POST');
        await page.evaluate(() => document.getElementById('checkout-form').requestSubmit());
        const resumed = await (await resumedResponse).json();
        assert.equal(resumed.order.orderId, uiBooked.order.orderId, 'Cancelled payment resumes same order');
        await page.waitForFunction(() => location.pathname.includes('payment-success.html') || location.pathname.includes('customer-account-order-detail.html'), { timeout: 15000 });
        const uiPaid = await request('/api/payments/status/' + uiBooked.order.orderId);
        assert.equal(uiPaid.data.payment.status, 'captured', 'Browser must verify payment before return');
        assert.equal(uiPaid.data.documentSubmission.count, 1, 'Selected checkout file must be uploaded to the newly created order');
        const uiToken = await page.evaluate(() => localStorage.getItem('opds_customer_session'));
        const wrongOwner = await request('/api/orders/document-files', { method: 'POST', headers: { ...headers, 'X-Session-Token': uiToken }, body: JSON.stringify(documentBody) });
        assert.equal(wrongOwner.response.status, 403, 'A different customer must not attach files to this order');
        await page.goto(base + '/order-documents.html?order=' + encodeURIComponent(uiBooked.order.orderId), { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => !document.getElementById('order-document-form').hidden);
        assert.match(await page.$eval('#order-document-requirements', el => el.textContent), /correction/i);
        failNextFileUpload = true;
        await page.evaluate(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['%PDF-1.4\nBrowser QA\n%%EOF'], 'browser-document.pdf', { type: 'application/pdf' })); document.getElementById('order-document-files').files = transfer.files; document.getElementById('order-document-form').requestSubmit(); });
        await page.waitForFunction(() => document.getElementById('order-upload-feedback').textContent.includes('Retry the failed files'));
        await page.evaluate(() => document.getElementById('order-document-form').requestSubmit());
        await page.waitForFunction(() => document.getElementById('order-upload-feedback').textContent.includes('Files received'));
        assert.match(await page.$eval('#document-state', el => el.textContent), /review pending/i);
        for (const width of [320,360,375,390,414,430,600,768,1024,1280,1440]) {
          await page.setViewport({ width, height: 844, isMobile: width < 768, hasTouch: width < 768 });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Order document page overflow ${width}`);
          if (width === 390) await page.screenshot({ path: path.join(root, 'artifacts/ux-pilot/order-documents-390.png'), fullPage: true });
        }
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        await page.goto(base + '/track-application.html?id=' + encodeURIComponent(uiBooked.order.orderId), { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => document.getElementById('snap-id-text').textContent.includes('OPDS'));
        failNextFileUpload = true;
        await page.evaluate(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['%PDF-1.4\nTracker QA\n%%EOF'], 'tracker-document.pdf', { type: 'application/pdf' })); const input = document.getElementById('dropzone-file-input'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); });
        await page.waitForFunction(() => document.getElementById('upload-progress-text').textContent.includes('Document not sent'));
        await page.evaluate(() => document.getElementById('dropzone-file-input').dispatchEvent(new Event('change', { bubbles: true })));
        await page.waitForFunction(() => document.getElementById('upload-progress-text').textContent.includes('Operator review pending')).catch(async error => { throw new Error(error.message + ': ' + await page.$eval('#upload-progress-text', el => el.textContent)); });
        const trackerUploaded = await request('/api/payments/status/' + uiBooked.order.orderId);
        assert.equal(trackerUploaded.response.status, 200, JSON.stringify(trackerUploaded.data));
        assert.equal(trackerUploaded.data.documentSubmission.count, 3, 'Tracking sends actual bytes after interrupted retry');
        for (const width of [320,360,375,390,414,430,600,768,1024,1280,1440]) {
          await page.setViewport({ width, height: 844, isMobile: width < 768, hasTouch: width < 768 });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Tracker overflow ' + width);
        }
        const recoveryOrder = await request('/api/service-bookings', { method: 'POST', headers: { ...headers, 'X-Session-Token': uiToken }, body: JSON.stringify({ ...body, idempotencyKey: 'local_status_recovery' }) });
        assert.equal(recoveryOrder.response.status, 201, JSON.stringify(recoveryOrder.data));
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        await page.goto(base + '/payment-failed.html?order_id=' + encodeURIComponent(recoveryOrder.data.order.orderId) + '&payment_id=' + encodeURIComponent(recoveryOrder.data.payment.paymentId), { waitUntil: 'networkidle0' });
        await page.evaluate(() => { sessionStorage.setItem('qaGatewayOpens', '0'); });
        await page.$eval('.status-actions [data-retry-payment]', button => button.click());
        await page.waitForFunction(() => Number(sessionStorage.getItem('qaGatewayOpens')) === 1);
        assert.equal(await page.evaluate(() => location.pathname), '/payment-failed.html', 'Gateway cancellation stays on the existing recovery page');
        await page.$eval('.status-actions [data-retry-payment]', button => button.click());
        await page.waitForFunction(() => location.pathname === '/payment-success.html');
        const recoveredStatus = await request('/api/payments/status/' + recoveryOrder.data.order.orderId);
        assert.equal(recoveredStatus.data.payment.status, 'captured');
        assert.equal(recoveredStatus.data.payment.paymentId, recoveryOrder.data.payment.paymentId, 'Status retry preserves existing pending payment identity');
        const catalog = await request('/api/products');
        const product = catalog.data.products.find(item => item.price > 0);
        assert(product, 'Catalog must contain a priced product for cart handoff');
        await page.evaluate(slug => {
          localStorage.setItem('opds_cart', JSON.stringify([{ slug, type: 'product', quantity: 2 }]));
          localStorage.removeItem('opds_checkout_draft');
        }, product.slug);
        await page.goto(base + '/checkout.html', { waitUntil: 'networkidle0' });
        await page.waitForFunction(name => document.getElementById('step-1-details-container').textContent.includes(name), {}, product.name);
        const cartTotal = await page.$eval('#summary-total', element => {
          const amount = element.textContent.match(/[0-9][0-9,]*(?:\.[0-9]+)?/);
          return amount ? Number(amount[0].replace(/,/g, '')) : 0;
        });
        assert(cartTotal > 0, 'Cart identities must recover catalog prices');
        await page.goto(base + '/checkout.html?service=unknown-task&service_name=PAN+Correction', { waitUntil: 'networkidle0' });
        await page.evaluate(() => continueFromStep1());
        assert.equal(await page.$eval('#step-1', element => element.classList.contains('active')), true);
        assert.match(await page.$eval('#checkout-step-status', element => element.textContent), /not currently listed/i);
      } finally { await browser.close(); }
      fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
      fs.writeFileSync(path.join(root, 'artifacts/local-booking-test.json'), JSON.stringify({
        checkedAt: new Date().toISOString(), mode: 'isolated backend with simulated gateway',
        tests: ['CSRF rejects missing token', 'email required', 'blank address accepted',
          'service booking returns identifier', 'server price rejects client override', 'idempotency reuses order',
          'pending status', 'signed payment verification', 'status after verification',
          'mobile browser checkout and payment return', 'public product cart reloads catalog price',
          'shared catalog policy', 'unknown explicit identity rejected', 'unknown task stops before details journey',
          'server quote ignores client price', 'unverified discount/coupon/delivery/partial plan rejected', 'changed expected total rejected', 'scope-review service blocked from fixed checkout', 'configured print catalog total and invalid pack rejection', 'other applicant snapshot preserves account profile', 'paid invoice uses applicant snapshot', 'optional invoice GSTIN server validation', 'authenticated real-byte upload', 'cross-owner upload rejected', 'private file storage', 'file signature validation', 'retry deduplication', 'documents pending versus review pending', 'selected checkout bytes uploaded', 'browser order-linked later upload', 'interrupted upload retry', 'document page geometry at 11 widths'],
        step13Checks: ['payment retry requires account ownership', 'wrong account rejected', 'pending payment reused', 'already paid order retry blocked', 'tracking real-byte upload and interrupted retry', 'tracking geometry at 11 widths', 'status-page gateway cancellation and recovery keeps same order/payment'],
        orderId: booked.data.order.orderId, paymentStatus: paid.data.payment.status,
        invoiceCreated: !!paid.data.invoice, realGatewayTested: false
      }, null, 2));
      console.log('PASS: isolated booking, CSRF, required email, optional address, retry identity and simulated payment verification');
    } catch (error) {
      console.error(logs.slice(-5000));
      throw error;
    } finally {
      child.kill();
      fs.writeFileSync(path.join(isolated, 'server-test.log'), logs);
    }
  })().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
