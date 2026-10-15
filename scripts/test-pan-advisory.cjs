const fs = require('fs');
const path = require('path');
const http = require('http');

const root = process.cwd();
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    const ext = path.extname(file);
    const mime = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();

  console.log('--- Testing PAN Advisory Modal on Desktop (1440px) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '/service-pan-card.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600)); // wait for 400ms timeout

  const modalInfo = await page.evaluate(() => {
    const modal = document.getElementById('advisory-modal');
    const closeBtn = document.getElementById('advisory-close-btn');
    const okBtn = document.getElementById('advisory-ok-btn');
    const activeEl = document.activeElement;
    return {
      modalExists: !!modal,
      hasShowClass: modal?.classList.contains('show'),
      modalDisplay: modal ? getComputedStyle(modal).display : null,
      modalVisibility: modal ? getComputedStyle(modal).visibility : null,
      activeElementTag: activeEl?.tagName,
      activeElementId: activeEl?.id,
      activeElementClass: activeEl?.className,
      isOkBtnFocused: activeEl === okBtn,
      isCloseBtnFocused: activeEl === closeBtn,
      role: modal?.getAttribute('role'),
      ariaModal: modal?.getAttribute('aria-modal'),
      ariaLabelledBy: modal?.getAttribute('aria-labelledby'),
      titleText: document.getElementById('advisory-modal-title')?.textContent
    };
  });
  console.log('Modal Info on Desktop:', JSON.stringify(modalInfo, null, 2));

  // Test Tab key pressing
  console.log('Testing Tab key when modal is shown:');
  await page.keyboard.press('Tab');
  let focusedAfterTab = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    id: document.activeElement?.id,
    class: document.activeElement?.className,
    text: document.activeElement?.textContent?.slice(0, 30),
    isInsideModal: !!document.activeElement?.closest('#advisory-modal')
  }));
  console.log('Active element after 1st Tab:', focusedAfterTab);

  await page.keyboard.press('Tab');
  focusedAfterTab = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    id: document.activeElement?.id,
    class: document.activeElement?.className,
    text: document.activeElement?.textContent?.slice(0, 30),
    isInsideModal: !!document.activeElement?.closest('#advisory-modal')
  }));
  console.log('Active element after 2nd Tab:', focusedAfterTab);

  // Test Escape key
  console.log('Testing Escape key:');
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 100));
  const afterEscape = await page.evaluate(() => {
    const modal = document.getElementById('advisory-modal');
    return {
      hasShowClass: modal?.classList.contains('show'),
      activeElement: document.activeElement?.tagName + '#' + document.activeElement?.id
    };
  });
  console.log('After Escape:', afterEscape);

  // Now check on Mobile (390px)
  console.log('\n--- Testing PAN Advisory Modal on Mobile (390px) ---');
  await page.setViewport({ width: 390, height: 800, isMobile: true, hasTouch: true });
  await page.goto(base + '/service-pan-card.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));

  const mobileModalInfo = await page.evaluate(() => {
    const modal = document.getElementById('advisory-modal');
    const inlineAdvisory = document.querySelector('.mobile-service-advisory');
    return {
      modalExists: !!modal,
      hasShowClass: modal?.classList.contains('show'),
      modalDisplay: modal ? getComputedStyle(modal).display : null,
      inlineAdvisoryExists: !!inlineAdvisory,
      inlineAdvisoryText: inlineAdvisory?.textContent
    };
  });
  console.log('Modal Info on Mobile:', JSON.stringify(mobileModalInfo, null, 2));

  await browser.close();
  server.close();
})();
