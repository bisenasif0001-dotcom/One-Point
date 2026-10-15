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

  // Find all details on page
  const summaries = await page.$$('details summary');
  console.log('Total summaries found:', summaries.length);

  for (let i = 0; i < summaries.length; i++) {
    const text = await page.evaluate(el => el.textContent, summaries[i]);
    console.log(`Summary ${i}: "${text}"`);
    if (text.includes('Categories')) {
      console.log('Clicking summary:', text);
      await summaries[i].click();
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const check = await page.evaluate(() => {
    const grid = document.getElementById('shub-cat-grid');
    const firstCard = grid ? grid.querySelector('.shub-cat-card') : null;
    return {
      gridWidth: grid ? Math.round(grid.getBoundingClientRect().width) : null,
      cardWidth: firstCard ? Math.round(firstCard.getBoundingClientRect().width) : null,
      cardHeight: firstCard ? Math.round(firstCard.getBoundingClientRect().height) : null
    };
  });

  console.log('After opening Categories disclosure at 320px:', check);
  await browser.close();
})();
