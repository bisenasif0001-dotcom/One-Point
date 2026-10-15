const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
  const fileUrl = 'file:///' + path.resolve('service-ration-card-assistance.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 400));

  const details = await page.evaluate(() => {
    const el = document.querySelector('.ration-need-grid');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const p = el.parentElement.getBoundingClientRect();
    const bodyW = document.body.scrollWidth;
    const docW = document.documentElement.scrollWidth;

    // Check all ancestors of .ration-need-grid
    const ancestors = [];
    let cur = el;
    while (cur && cur !== document.body) {
      ancestors.push({
        tag: cur.tagName,
        id: cur.id,
        cls: cur.className,
        width: Math.round(cur.getBoundingClientRect().width),
        scrollWidth: cur.scrollWidth,
        overflow: getComputedStyle(cur).overflow
      });
      cur = cur.parentElement;
    }

    return {
      elWidth: Math.round(r.width),
      parentWidth: Math.round(p.width),
      bodyScrollWidth: bodyW,
      docScrollWidth: docW,
      windowInnerWidth: window.innerWidth,
      ancestors
    };
  });

  console.log(JSON.stringify(details, null, 2));
  await browser.close();
})();
