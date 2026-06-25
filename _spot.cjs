const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')));
  await new Promise(r => setTimeout(r, 400));
  // section boundary: trending services
  const y = await page.evaluate(() => { const el = document.querySelector('#trending-services'); return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : 1800; });
  await page.evaluate((yy) => window.scrollTo(0, yy - 120), y);
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: '_spot_section.png' });
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
