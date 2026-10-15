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

  const culprits = await page.evaluate(() => {
    const main = document.querySelector('.ration-overview-main');
    if (!main) return [];
    return [...main.children].map(child => {
      const r = child.getBoundingClientRect();
      return {
        tag: child.tagName,
        cls: child.className,
        width: Math.round(r.width),
        scrollWidth: child.scrollWidth,
        htmlSnippet: child.outerHTML.slice(0, 80)
      };
    });
  });

  console.log(JSON.stringify(culprits, null, 2));
  await browser.close();
})();
