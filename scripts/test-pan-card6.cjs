const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  const fileUrl = 'file:///' + path.resolve('service-pan-card.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 400));

  const cards = await page.$$('.voter-service-card');
  console.log('Total voter service cards found:', cards.length);

  // Click card 5 (index 4) - PAN Link
  await cards[4].click();
  await new Promise(r => setTimeout(r, 100));
  let summary5 = await page.$eval('#psc-summary-title', el => el.textContent);
  let total5 = await page.$eval('#psc-total-fee', el => el.textContent);
  let href5 = await page.$eval('#psc-primary-btn', el => el.href);
  console.log('Card 5 clicked:', { summary5, total5, href5 });

  // Click card 6 (index 5) - Duplicate PAN
  await cards[5].click();
  await new Promise(r => setTimeout(r, 100));
  let summary6 = await page.$eval('#psc-summary-title', el => el.textContent);
  let total6 = await page.$eval('#psc-total-fee', el => el.textContent);
  let href6 = await page.$eval('#psc-primary-btn', el => el.href);
  console.log('Card 6 clicked:', { summary6, total6, href6 });

  await browser.close();
})();
