const puppeteer = require('puppeteer');
const path = require('path');

const files = [
  'service-pan-card.html',
  'service-voter-id.html',
  'service-ration-card-assistance.html',
  'service-transport-rto-facilitation.html'
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 640 });

  const results = {};

  for (const file of files) {
    const fileUrl = 'file:///' + path.resolve(file).replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 300));

    results[file] = await page.evaluate(() => {
      const overviews = [...document.querySelectorAll('[class*="overview-section"], [class*="overview-grid"], [class*="overview-main"], .enterprise-detail-command')];
      return overviews.map(el => ({
        tag: el.tagName,
        cls: el.className,
        width: Math.round(el.getBoundingClientRect().width),
        scrollWidth: el.scrollWidth,
        hasClippedOverflow: el.scrollWidth > Math.round(el.getBoundingClientRect().width) + 1
      }));
    });
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
