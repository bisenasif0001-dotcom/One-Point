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

  const info = await page.evaluate(() => {
    const grid = document.getElementById('shub-cat-grid');
    const firstCard = grid ? grid.querySelector('.shub-cat-card') : null;
    const computedGrid = grid ? window.getComputedStyle(grid) : null;
    const computedCard = firstCard ? window.getComputedStyle(firstCard) : null;
    return {
      gridWidth: grid ? grid.getBoundingClientRect().width : null,
      gridColumns: computedGrid ? computedGrid.gridTemplateColumns : null,
      cardWidth: firstCard ? firstCard.getBoundingClientRect().width : null,
      cardHeight: firstCard ? firstCard.getBoundingClientRect().height : null,
      cardPadding: computedCard ? computedCard.padding : null
    };
  });

  console.log('320px Grid info:', info);
  await browser.close();
})();
