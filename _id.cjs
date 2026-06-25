const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  for (const [slug,sz] of [['index','30'],['online-services','36']]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(`http://localhost:4173/${slug}.html`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')));
    const info = await page.evaluate((target) => {
      const out = [];
      document.querySelectorAll('button, a.btn').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width>0 && (Math.abs(b.height-target)<3 || (b.height<44 && b.width<90))) {
          let parent = el.closest('[class]')?.className || '';
          out.push({ tag: el.tagName, cls:(el.className||'').toString().slice(0,40), aria: el.getAttribute('aria-label')||'', parent: parent.toString().slice(0,40), w:Math.round(b.width), h:Math.round(b.height) });
        }
      });
      return out.slice(0,8);
    }, Number(target=sz));
    console.log(`\n## ${slug}:`, JSON.stringify(info, null, 1));
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
