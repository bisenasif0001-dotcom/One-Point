const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4173/online-services.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));
  const d = await page.evaluate(() => {
    const inp = document.querySelector('.input'); const btn = document.querySelector('.btn');
    const ib = document.querySelector('.icon-button'); const fl = document.querySelector('.footer-links a');
    return {
      inputFontSize: inp ? getComputedStyle(inp).fontSize : null,
      btnHeight: btn ? Math.round(btn.getBoundingClientRect().height) : null,
      iconBtnW: ib ? Math.round(ib.getBoundingClientRect().width) : null,
      footerLinkPad: fl ? getComputedStyle(fl).paddingTop : null,
    };
  });
  console.log('DESKTOP (should be original): ', JSON.stringify(d));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
