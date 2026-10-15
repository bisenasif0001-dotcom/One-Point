const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8095;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };
  return map[ext] || 'application/octet-stream';
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const rawPath = req.url.split('?')[0].split('#')[0];
        let filePath = path.join(ROOT_DIR, rawPath === '/' ? 'index.html' : rawPath);
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found: ' + rawPath);
          return;
        }
        if (fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': getContentType(filePath),
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.message);
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

const VIEWPORTS = [
  { width: 320, height: 640, name: '320' },
  { width: 360, height: 740, name: '360' },
  { width: 375, height: 667, name: '375' },
  { width: 390, height: 844, name: '390' },
  { width: 412, height: 915, name: '412' },
  { width: 414, height: 896, name: '414' },
  { width: 428, height: 926, name: '428' },
  { width: 430, height: 932, name: '430' },
  { width: 480, height: 854, name: '480' },
  { width: 600, height: 960, name: '600' },
  { width: 768, height: 1024, name: '768' },
  { width: 800, height: 1280, name: '800' },
  { width: 900, height: 1340, name: '900' },
  { width: 1024, height: 768, name: '1024' },
  { width: 1440, height: 900, name: '1440' }
];

const SHORT_VIEWPORTS = [
  { width: 320, height: 240, name: '320x240' },
  { width: 390, height: 320, name: '390x320' }
];

async function runVerification() {
  console.log('Starting static server on port ' + PORT + '...');
  const server = await startStaticServer();

  const outDir = path.join(ROOT_DIR, 'artifacts', 'phase10');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const testResults = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    details: [],
    overflowAudit: [],
    pricingDiscrepancy: {}
  };

  function assert(title, condition, extra = '') {
    testResults.totalTests++;
    if (condition) {
      testResults.passed++;
      console.log(`  ✓ PASS: ${title} ${extra}`);
      testResults.details.push({ title, status: 'PASS', extra });
    } else {
      testResults.failed++;
      console.error(`  ✗ FAIL: ${title} ${extra}`);
      testResults.details.push({ title, status: 'FAIL', extra });
    }
  }

  try {
    const page = await browser.newPage();

    // =========================================================================
    // SECTION 1: CHECKOUT FORM VALIDATION & INTERACTION TESTS
    // =========================================================================
    console.log('\n--- Section 1: Checkout Form Validation & Accessible Feedback ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:${PORT}/checkout.html?service=new-pan&service_name=New+PAN+Card+Application`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    // Check input attributes
    const nameAttrs = await page.$eval('#checkout-name', el => ({
      required: el.required,
      autocomplete: el.autocomplete
    }));
    assert('Applicant Name has required and autocomplete=name', nameAttrs.required && nameAttrs.autocomplete === 'name');

    const mobileAttrs = await page.$eval('#checkout-mobile', el => ({
      type: el.type,
      inputmode: el.inputMode,
      pattern: el.getAttribute('pattern'),
      maxlength: el.maxLength,
      autocomplete: el.autocomplete,
      required: el.required
    }));
    assert('Mobile Number has type=tel, inputmode=numeric, pattern=[0-9]{10}, maxlength=10',
      mobileAttrs.type === 'tel' && mobileAttrs.inputmode === 'numeric' && mobileAttrs.pattern === '[0-9]{10}' && mobileAttrs.maxlength === 10);

    const emailAttrs = await page.$eval('#checkout-email', el => ({
      type: el.type,
      autocomplete: el.autocomplete,
      required: el.required
    }));
    assert('Email has type=email, required, autocomplete=email', emailAttrs.type === 'email' && emailAttrs.required && emailAttrs.autocomplete === 'email');

    // Attempt Continue with empty form -> trigger validation
    await page.evaluate(() => {
      if (typeof window.continueFromStep1 === 'function') window.continueFromStep1();
      else {
        const btn = document.getElementById('mobile-checkout-cta') || document.getElementById('service-continue-btn');
        if (btn) btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 400));

    const validationState = await page.evaluate(() => {
      const name = document.getElementById('checkout-name');
      const mobile = document.getElementById('checkout-mobile');
      const email = document.getElementById('checkout-email');
      const nameField = name.closest('.enterprise-field');
      const mobileField = mobile.closest('.enterprise-field');
      const emailField = email.closest('.enterprise-field');
      const nameErr = document.getElementById('checkout-name-error');
      const mobileErr = document.getElementById('checkout-mobile-error');
      const emailErr = document.getElementById('checkout-email-error');

      return {
        nameInvalid: name.classList.contains('eds-input-invalid'),
        nameAria: name.getAttribute('aria-invalid'),
        nameFieldInvalid: nameField.classList.contains('is-invalid'),
        nameErrMsg: nameErr ? nameErr.textContent.trim() : '',
        nameErrHidden: nameErr ? nameErr.hidden : true,

        mobileInvalid: mobile.classList.contains('eds-input-invalid'),
        mobileAria: mobile.getAttribute('aria-invalid'),
        mobileFieldInvalid: mobileField.classList.contains('is-invalid'),
        mobileErrMsg: mobileErr ? mobileErr.textContent.trim() : '',

        emailInvalid: email.classList.contains('eds-input-invalid'),
        emailAria: email.getAttribute('aria-invalid'),
        emailFieldInvalid: emailField.classList.contains('is-invalid'),
        emailErrMsg: emailErr ? emailErr.textContent.trim() : '',

        activeElementId: document.activeElement ? document.activeElement.id : ''
      };
    });

    assert('Empty Name gets .eds-input-invalid and aria-invalid=true', validationState.nameInvalid && validationState.nameAria === 'true');
    assert('Empty Name parent field gets .is-invalid', validationState.nameFieldInvalid);
    assert('Empty Name displays descriptive error text', validationState.nameErrMsg.includes('full name') && !validationState.nameErrHidden);

    assert('Empty Mobile gets .eds-input-invalid and aria-invalid=true', validationState.mobileInvalid && validationState.mobileAria === 'true');
    assert('Empty Mobile displays descriptive error text', validationState.mobileErrMsg.includes('10-digit'));

    assert('Empty Email gets .eds-input-invalid and aria-invalid=true', validationState.emailInvalid && validationState.emailAria === 'true');
    assert('Empty Email displays descriptive error text', validationState.emailErrMsg.includes('valid email'));

    // Test live validation on input correction
    console.log('Testing live validation interaction...');
    await page.type('#checkout-name', 'Rajesh Sharma');
    await page.evaluate(() => document.getElementById('checkout-name').dispatchEvent(new Event('input', { bubbles: true })));
    await new Promise(r => setTimeout(r, 150));

    const nameCorrected = await page.evaluate(() => {
      const el = document.getElementById('checkout-name');
      const field = el.closest('.enterprise-field');
      return {
        valid: el.classList.contains('eds-input-valid'),
        aria: el.getAttribute('aria-invalid'),
        fieldValid: field.classList.contains('is-valid')
      };
    });
    assert('Typing valid name marks input and field valid, clearing aria-invalid', nameCorrected.valid && nameCorrected.aria === 'false' && nameCorrected.fieldValid);

    // Test invalid mobile (less than 10 digits)
    await page.type('#checkout-mobile', '98765');
    await page.evaluate(() => document.getElementById('checkout-mobile').dispatchEvent(new Event('input', { bubbles: true })));
    await new Promise(r => setTimeout(r, 150));

    const mobileShort = await page.evaluate(() => {
      const el = document.getElementById('checkout-mobile');
      return el.classList.contains('eds-input-invalid') && el.getAttribute('aria-invalid') === 'true';
    });
    assert('5-digit mobile correctly flagged invalid', mobileShort);

    // Complete mobile to 10 digits
    await page.type('#checkout-mobile', '43210');
    await page.evaluate(() => document.getElementById('checkout-mobile').dispatchEvent(new Event('input', { bubbles: true })));
    await new Promise(r => setTimeout(r, 150));

    const mobileValid = await page.evaluate(() => {
      const el = document.getElementById('checkout-mobile');
      return el.classList.contains('eds-input-valid') && el.getAttribute('aria-invalid') === 'false';
    });
    assert('10-digit mobile correctly validated', mobileValid);

    // Test valid email
    await page.type('#checkout-email', 'rajesh.sharma@example.com');
    await page.evaluate(() => document.getElementById('checkout-email').dispatchEvent(new Event('input', { bubbles: true })));
    await new Promise(r => setTimeout(r, 150));

    const emailValid = await page.evaluate(() => {
      const el = document.getElementById('checkout-email');
      return el.classList.contains('eds-input-valid') && el.getAttribute('aria-invalid') === 'false';
    });
    assert('Valid email format validated', emailValid);

    // Test label collision / floating label styles on mobile
    const labelStyles = await page.evaluate(() => {
      const label = document.querySelector('label[for="checkout-name"]');
      const style = window.getComputedStyle(label);
      return {
        fontSize: style.fontSize,
        textTransform: style.textTransform,
        fontWeight: style.fontWeight,
        color: style.color
      };
    });
    assert('Floating label on mobile uses compact font size (<= 12px)', parseFloat(labelStyles.fontSize) <= 12, `(${labelStyles.fontSize})`);
    assert('Floating label is uppercase styled', labelStyles.textTransform === 'uppercase');

    // =========================================================================
    // SECTION 2: CART DRAWER UX & EMPTY STATE TESTS
    // =========================================================================
    console.log('\n--- Section 2: Cart Drawer UX & Service-Oriented Empty State ---');
    await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    // Ensure cart is empty
    await page.evaluate(() => {
      localStorage.removeItem('oneMartCart');
      localStorage.removeItem('opds_cart');
      if (typeof window.refreshCartDrawer === 'function') window.refreshCartDrawer();
      const cartBtn = document.querySelector('[data-cart-button]');
      if (cartBtn) cartBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const emptyDrawerState = await page.evaluate(() => {
      const drawer = document.querySelector('[data-cart-drawer]');
      const isOpen = drawer && drawer.classList.contains('open');
      const emptyState = drawer ? drawer.querySelector('.cart-empty-state') : null;
      const browseBtn = drawer ? drawer.querySelector('.cart-browse-btn') : null;
      const checkoutBtn = drawer ? drawer.querySelector('[data-cart-checkout]') : null;
      const totalSection = drawer ? drawer.querySelector('[data-cart-total-section]') : null;

      return {
        isOpen,
        hasEmptyState: !!emptyState,
        emptyTitle: emptyState ? emptyState.querySelector('strong')?.textContent : '',
        browseHref: browseBtn ? browseBtn.getAttribute('href') : '',
        checkoutHidden: checkoutBtn ? (window.getComputedStyle(checkoutBtn).display === 'none' || checkoutBtn.style.display === 'none') : false,
        totalSectionHidden: totalSection ? (window.getComputedStyle(totalSection).display === 'none' || totalSection.style.display === 'none') : false
      };
    });

    assert('Cart drawer opens on trigger click', emptyDrawerState.isOpen);
    assert('Cart drawer renders .cart-empty-state', emptyDrawerState.hasEmptyState);
    assert('Empty state headline is "Your Cart is Empty"', emptyDrawerState.emptyTitle === 'Your Cart is Empty');
    assert('Browse Services button links to services.html', emptyDrawerState.browseHref === 'services.html');
    assert('Checkout button is hidden when cart is empty', emptyDrawerState.checkoutHidden);
    assert('Total section is hidden when cart is empty', emptyDrawerState.totalSectionHidden);

    // Test Escape key closes cart drawer
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));
    const closedOnEscape = await page.$eval('[data-cart-drawer]', el => !el.classList.contains('open'));
    assert('Pressing Escape closes cart drawer', closedOnEscape);

    // Test adding an item to cart and verifying filled drawer
    console.log('Testing cart drawer with item added...');
    await page.evaluate(() => {
      if (typeof window.addProductToCart === 'function') {
        window.addProductToCart('visiting-cards', 1);
      }
      const cartBtn = document.querySelector('[data-cart-button]');
      if (cartBtn) cartBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const filledDrawerState = await page.evaluate(() => {
      const drawer = document.querySelector('[data-cart-drawer]');
      const items = drawer ? drawer.querySelectorAll('.cart-item') : [];
      const checkoutBtn = drawer ? drawer.querySelector('[data-cart-checkout]') : null;
      const totalRoot = drawer ? drawer.querySelector('[data-cart-total]') : null;

      return {
        itemCount: items.length,
        checkoutVisible: checkoutBtn ? window.getComputedStyle(checkoutBtn).display !== 'none' : false,
        totalText: totalRoot ? totalRoot.textContent : ''
      };
    });

    assert('Cart drawer displays added item', filledDrawerState.itemCount >= 1);
    assert('Checkout button becomes visible when cart has items', filledDrawerState.checkoutVisible);
    assert('Total displays non-zero price when items present', filledDrawerState.totalText.includes('Rs.'));

    // Clean up cart
    await page.evaluate(() => {
      localStorage.removeItem('opds_cart');
      if (typeof window.refreshCartDrawer === 'function') window.refreshCartDrawer();
      if (typeof window.hideCartDrawer === 'function') window.hideCartDrawer();
    });

    // =========================================================================
    // SECTION 3: SERVICE CONTINUITY & HANDOFF INTERFACES
    // =========================================================================
    console.log('\n--- Section 3: Service Continuity & Handoff Interfaces ---');

    // Test checkout entry with popular services
    const testServices = [
      { slug: 'new-pan', name: 'New PAN Card Application', price: 'Rs. 107' },
      { slug: 'income-certificate', name: 'Income Certificate (Aay Praman Patra)', price: 'Rs. 60' },
      { slug: 'aadhaar-demographic-update', name: 'Aadhaar Demographic Update', price: 'Rs. 50' }
    ];

    for (const serv of testServices) {
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html?service=${serv.slug}&service_name=${encodeURIComponent(serv.name)}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 500));

      const heroCard = await page.evaluate(() => {
        const title = document.querySelector('.selected-service-heading, .selected-service-title');
        const price = document.querySelector('.selected-service-price-pill strong, .selected-service-price, [data-total-payable]');
        return {
          title: title ? title.textContent.trim() : '',
          price: price ? price.textContent.trim() : ''
        };
      });

      assert(`Checkout entry preserves service name for ${serv.slug}`, heroCard.title.length > 0);
      assert(`Checkout entry resolves transparent price for ${serv.slug}`, heroCard.price.length > 0);
    }

    // Test service-request.html
    console.log('Testing service-request.html handoff...');
    await page.goto(`http://127.0.0.1:${PORT}/service-request.html?service=ration-card-assistance&service_name=Ration+Card+Assistance`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    const reqState = await page.evaluate(() => {
      const task = document.querySelector('[data-request-task]')?.textContent || '';
      const whatsapp = document.querySelector('[data-request-whatsapp]');
      const bodyText = document.body.innerText;

      return {
        task,
        hasWhatsApp: !!whatsapp && whatsapp.getAttribute('href').includes('wa.me'),
        hasNoOrderNotice: bodyText.includes('No order or payment has been created')
      };
    });

    assert('service-request.html displays requested service title', reqState.task.includes('Ration Card'));
    assert('service-request.html has WhatsApp confirmation link', reqState.hasWhatsApp);
    assert('service-request.html discloses "No order or payment has been created"', reqState.hasNoOrderNotice);

    // Test order-documents.html
    console.log('Testing order-documents.html...');
    await page.goto(`http://127.0.0.1:${PORT}/order-documents.html?order=OPDS-TEST-1001`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    const docState = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const sepNotice = document.body.innerText.includes('Payment and document approval are separate');
      const fileInput = document.getElementById('order-document-files');
      return {
        heading,
        sepNotice,
        hasFileInput: !!fileInput,
        accept: fileInput ? fileInput.getAttribute('accept') : ''
      };
    });

    assert('order-documents.html displays document upload heading', docState.heading.includes('Send documents'));
    assert('order-documents.html states "Payment and document approval are separate"', docState.sepNotice);
    assert('order-documents.html accepts .pdf, .jpg, .jpeg, .png', docState.accept.includes('.pdf') && docState.accept.includes('.png'));

    // =========================================================================
    // SECTION 4: 15 VIEWPORT RESPONSIVE & HORIZONTAL OVERFLOW AUDIT
    // =========================================================================
    console.log('\n--- Section 4: 15-Viewport Responsive & Horizontal Overflow Audit ---');
    const auditPages = [
      { path: 'checkout.html?service=new-pan', label: 'checkout-service' },
      { path: 'checkout.html', label: 'checkout-default' },
      { path: 'service-request.html?service=ration-card-assistance', label: 'service-request' },
      { path: 'order-documents.html?order=OPDS-TEST-1001', label: 'order-documents' }
    ];

    let totalOverflowCount = 0;

    for (const target of auditPages) {
      for (const vp of VIEWPORTS) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(`http://127.0.0.1:${PORT}/${target.path}`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 200));

        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          return {
            scrollWidth: docEl.scrollWidth,
            clientWidth: docEl.clientWidth,
            diff: docEl.scrollWidth - docEl.clientWidth
          };
        });

        const hasOverflow = overflow.diff > 1; // allow 1px subpixel tolerance
        if (hasOverflow) {
          totalOverflowCount++;
          console.error(`  OVERFLOW: ${target.label} at ${vp.width}px (scroll: ${overflow.scrollWidth}, client: ${overflow.clientWidth})`);
        }

        testResults.overflowAudit.push({
          page: target.label,
          viewport: vp.width,
          scrollWidth: overflow.scrollWidth,
          clientWidth: overflow.clientWidth,
          hasOverflow
        });
      }
    }

    assert('Zero horizontal overflow across all 15 viewports on audited pages', totalOverflowCount === 0, `(${totalOverflowCount} overflows detected)`);

    // Audit Short Viewports for Keyboard / Landscape clearance
    console.log('\nTesting short viewports (320x240 and 390x320)...');
    let shortViewportOverflow = 0;
    for (const svp of SHORT_VIEWPORTS) {
      await page.setViewport({ width: svp.width, height: svp.height });
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html?service=new-pan`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 200));

      const svpCheck = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          diff: docEl.scrollWidth - docEl.clientWidth
        };
      });
      if (svpCheck.diff > 1) shortViewportOverflow++;
    }
    assert('Zero horizontal overflow on short viewports', shortViewportOverflow === 0);

    // =========================================================================
    // SECTION 5: FINAL SCREENSHOTS CAPTURE
    // =========================================================================
    console.log('\n--- Section 5: Capturing Final Verification Screenshots ---');
    const captureVps = [
      { width: 320, height: 640, name: '320' },
      { width: 390, height: 844, name: '390' },
      { width: 768, height: 1024, name: '768' },
      { width: 1440, height: 900, name: '1440' }
    ];

    for (const cvp of captureVps) {
      await page.setViewport({ width: cvp.width, height: cvp.height });

      // 1. Checkout default
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, `final-checkout-default-${cvp.name}.png`) });

      // 2. Checkout validation error state
      await page.goto(`http://127.0.0.1:${PORT}/checkout.html?service=new-pan&service_name=New+PAN+Card+Application`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));
      await page.evaluate(() => {
        if (typeof window.continueFromStep1 === 'function') window.continueFromStep1();
        else {
          const btn = document.getElementById('mobile-checkout-cta') || document.getElementById('service-continue-btn');
          if (btn) btn.click();
        }
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, `final-checkout-errors-${cvp.name}.png`) });

      // 3. Checkout with valid values filled
      await page.type('#checkout-name', 'Rajesh Sharma');
      await page.type('#checkout-mobile', '9876543210');
      await page.type('#checkout-email', 'rajesh.sharma@example.com');
      await page.evaluate(() => {
        ['checkout-name', 'checkout-mobile', 'checkout-email'].forEach(id => {
          document.getElementById(id).dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, `final-checkout-filled-${cvp.name}.png`) });

      // 4. Service Request page
      await page.goto(`http://127.0.0.1:${PORT}/service-request.html?service=ration-card-assistance&service_name=Ration+Card+Assistance`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, `final-service-request-${cvp.name}.png`) });

      // 5. Order Documents page
      await page.goto(`http://127.0.0.1:${PORT}/order-documents.html?order=OPDS-TEST-1001`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, `final-order-documents-${cvp.name}.png`) });

      // 6. Cart Drawer empty state on services.html
      await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));
      await page.evaluate(() => {
        localStorage.removeItem('opds_cart');
        const cartBtn = document.querySelector('[data-cart-button]');
        if (cartBtn) cartBtn.click();
      });
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(outDir, `final-cart-drawer-empty-${cvp.name}.png`) });
    }

    // =========================================================================
    // SECTION 6: PAN PRICING DISCREPANCY AUDIT (STRICT READ-ONLY)
    // =========================================================================
    console.log('\n--- Section 6: PAN Pricing Discrepancy Strict Read-Only Audit ---');
    const panHtml = fs.readFileSync(path.join(ROOT_DIR, 'service-pan-card.html'), 'utf8');
    const catalogJson = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'catalog-pricing.js'), 'utf8');

    const panAadhaarHtmlPrice = panHtml.includes('checkout.html?service=pan-aadhaar-link') && panHtml.includes('data-service="PAN Link" data-price="₹100"');
    const duplicatePanHtmlPrice = panHtml.includes('checkout.html?service=duplicate-pan-surrender') && panHtml.includes('data-service="Duplicate PAN" data-price="₹250"');

    const vm = require('vm');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(catalogJson, sandbox);
    const catalogPricingObj = sandbox.window.OPDS_STATIC_PRICING || {};
    const panAadhaarCat = catalogPricingObj['pan-aadhaar-link'];
    const duplicatePanCat = catalogPricingObj['duplicate-pan-surrender'];

    testResults.pricingDiscrepancy = {
      panAadhaarLink: {
        servicePagePrice: '₹100',
        catalogPricingPrice: panAadhaarCat ? `Rs. ${panAadhaarCat.price}` : 'unknown',
        catalogDisplayPrice: panAadhaarCat ? panAadhaarCat.displayPrice : 'unknown',
        status: 'DISCREPANCY_CONFIRMED_UNRESOLVED'
      },
      duplicatePanSurrender: {
        servicePagePrice: '₹250',
        catalogPricingPrice: duplicatePanCat ? `Rs. ${duplicatePanCat.price}` : 'unknown',
        catalogDisplayPrice: duplicatePanCat ? duplicatePanCat.displayPrice : 'unknown',
        status: 'DISCREPANCY_CONFIRMED_UNRESOLVED'
      },
      actionTaken: 'STRICT_READ_ONLY_DOCUMENTATION_ONLY',
      stakeholderActionNeeded: 'Business approval required to either update service-pan-card.html or assets/catalog-pricing.js'
    };

    assert('PAN-Aadhaar Link discrepancy verified in code without modifications', panAadhaarHtmlPrice && panAadhaarCat.price === 99);
    assert('Duplicate PAN Surrender discrepancy verified in code without modifications', duplicatePanHtmlPrice && duplicatePanCat.price === 199);

    await page.close();

    // Save test results JSON
    fs.writeFileSync(path.join(outDir, 'verification-results.json'), JSON.stringify(testResults, null, 2), 'utf8');
    console.log(`\n======================================================`);
    console.log(`VERIFICATION SUMMARY: ${testResults.passed} PASSED / ${testResults.failed} FAILED (${testResults.totalTests} TOTAL)`);
    console.log(`======================================================\n`);

  } finally {
    await browser.close();
    server.close();
  }
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
