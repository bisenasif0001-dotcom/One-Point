// Reusable screenshot + audit harness for the mobile polish task.
// Usage: node _shot.cjs <mode> <prefix>
//   mode=base  -> full-page screenshots of protected + key pages at 390px
//   mode=audit <url> -> JSON micro-audit
const puppeteer = require('puppeteer');

const PROTECTED = [
  'service-pan-card','service-voter-id','service-color-printing',
  'service-document-scanning','service-lamination','service-photocopy-printing',
];
const KEY = ['index','services','online-services'];

async function fullShots(prefix) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  for (const slug of [...PROTECTED, ...KEY]) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    try {
      await page.goto(`http://localhost:4173/${slug}.html`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1200));
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')));
      await new Promise(r => setTimeout(r, 300));
      await page.screenshot({ path: `${prefix}_${slug}.png`, fullPage: true });
      console.log('shot', slug);
    } catch (e) { console.log('FAIL', slug, e.message); }
    await page.close();
  }
  await browser.close();
}

(async () => {
  const mode = process.argv[2];
  if (mode === 'base' || mode === 'after') { await fullShots(process.argv[3] || (mode === 'base' ? '_base' : '_after')); }
})().catch(e => { console.error(e); process.exit(1); });
