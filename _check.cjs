const puppeteer = require('puppeteer');
const urls = ['index','services','online-services'];
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  for (const slug of urls) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(`http://localhost:4173/${slug}.html`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')));
    await new Promise(r => setTimeout(r, 300));
    const r = await page.evaluate(() => {
      const inViewport = (el) => { const r = el.getBoundingClientRect(); return r.width>0 && r.height>0; };
      // inputs under 16px
      const badInputs = [];
      document.querySelectorAll('input, select, textarea').forEach(el => { if(!inViewport(el)) return; const fs=parseFloat(getComputedStyle(el).fontSize); if(fs<16 && el.type!=='hidden' && el.type!=='checkbox' && el.type!=='radio') badInputs.push({t:el.type||el.tagName, fs:+fs.toFixed(1)}); });
      // interactive < 44 (excluding top-bar secondary + badges)
      const small = []; const seen=new Set();
      document.querySelectorAll('a.btn, button, .icon-button, .nav-link, .category-filters .btn, .featured-product-tabs a').forEach(el => { if(!inViewport(el)) return; const b=el.getBoundingClientRect(); if((b.height<44||b.width<44)){ const k=(el.textContent||el.tagName).trim().slice(0,16)+Math.round(b.h); if(!seen.has(k)){seen.add(k); small.push({t:(el.textContent||el.tagName).trim().slice(0,16), w:Math.round(b.width), h:Math.round(b.height)});} } });
      return { badInputs, smallTargets: small.slice(0,12), smallCount: small.length };
    });
    console.log(`\n## ${slug}: inputs<16=${r.badInputs.length} smallTargets=${r.smallCount}`);
    if (r.badInputs.length) console.log('  badInputs:', JSON.stringify(r.badInputs));
    if (r.smallTargets.length) console.log('  small:', JSON.stringify(r.smallTargets));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
