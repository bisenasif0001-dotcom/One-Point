const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 640 });
  const fileUrl = 'file:///' + path.resolve('service-ration-card-assistance.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);

  const overflowEl = await page.evaluate(() => {
    const sec = document.querySelector('.ration-overview-section');
    return [...sec.children].map(c => {
      const r = c.getBoundingClientRect();
      const style = getComputedStyle(c);
      return {
        tag: c.tagName,
        cls: c.className,
        width: Math.round(r.width),
        scrollWidth: c.scrollWidth,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight
      };
    });
  });

  console.log(JSON.stringify(overflowEl, null, 2));
  await browser.close();
})();
