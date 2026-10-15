const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');

const root = process.cwd();
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (req.method !== 'GET' || !file.startsWith(root + path.sep)) {
    res.writeHead(404);
    return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    const ext = path.extname(file);
    const mime = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.json': 'application/json'
    }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();

  // Test checkout form controls at 360px
  await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
  await page.goto(base + '/checkout.html?service=new-pan', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));

  const checkoutControls = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input, select, textarea, button.eds-btn, .progress-node')];
    return inputs.map(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        fontSize: style.fontSize,
        padding: style.padding,
        display: style.display,
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      };
    }).filter(c => c.visible);
  });

  // Test ration card at 320px
  await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
  await page.goto(base + '/service-ration-card-assistance.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));

  const ration320 = await page.evaluate(() => {
    const docGrid = document.querySelector('.ration-need-grid');
    const docItems = [...document.querySelectorAll('.ration-need-item')];
    const actions = document.querySelector('.ration-overview-actions');
    const sticky = document.querySelector('.enterprise-sticky-actions');
    const heroH1 = document.querySelector('.page-hero-title');
    return {
      docGridColumns: docGrid ? getComputedStyle(docGrid).gridTemplateColumns : null,
      docItemWidths: docItems.map(i => Math.round(i.getBoundingClientRect().width)),
      actionButtonsCount: actions ? actions.querySelectorAll('a').length : 0,
      stickyBounds: sticky ? { height: Math.round(sticky.getBoundingClientRect().height), bottom: getComputedStyle(sticky).bottom } : null,
      heroH1Text: heroH1 ? heroH1.textContent.trim().replace(/\s+/g, ' ') : null,
      heroH1Html: heroH1 ? heroH1.innerHTML : null
    };
  });

  // Test PAN card at 320px
  await page.goto(base + '/service-pan-card.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));

  const pan320 = await page.evaluate(() => {
    const tabs = document.querySelector('.pan-tabs-nav');
    const sticky = document.querySelector('.enterprise-sticky-actions');
    const heroH1 = document.querySelector('.page-hero-title');
    return {
      tabsScrollable: tabs ? tabs.scrollWidth > tabs.clientWidth : false,
      stickyHeight: sticky ? Math.round(sticky.getBoundingClientRect().height) : null,
      heroH1Text: heroH1 ? heroH1.textContent.trim().replace(/\s+/g, ' ') : null,
      heroH1Html: heroH1 ? heroH1.innerHTML : null
    };
  });

  console.log('--- CHECKOUT CONTROLS (360px) ---');
  console.log(checkoutControls.slice(0, 15));
  console.log('\n--- RATION CARD (320px) ---');
  console.log(ration320);
  console.log('\n--- PAN CARD (320px) ---');
  console.log(pan320);

  await browser.close();
  server.close();
})();
