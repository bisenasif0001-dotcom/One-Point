const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 640 });
  const url = 'file:///' + path.resolve('services.html').replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));

  const hierarchy = await page.evaluate(() => {
    let el = document.getElementById('shub-cat-grid');
    const chain = [];
    while (el && el !== document.body) {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      chain.push({
        tag: el.tagName,
        id: el.id,
        cls: el.className,
        width: Math.round(r.width),
        padding: s.padding,
        display: s.display,
        gridTemplateColumns: s.gridTemplateColumns,
        flex: s.flex
      });
      el = el.parentElement;
    }
    return chain;
  });

  console.log('Hierarchy of #shub-cat-grid:', JSON.stringify(hierarchy, null, 2));
  await browser.close();
})();
