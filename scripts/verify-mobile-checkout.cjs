const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) || !(relative.startsWith('assets/') || (!relative.includes('/') && relative.endsWith('.html')))) {
    res.writeHead(404); res.end(); return;
  }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const widths = [320, 360, 375, 390, 414, 430, 600, 768, 1024, 1280, 1440];
  const errors = [];
  let signedIn = false, profileDelay = 0;
  const identity = { name: 'Account Owner QA', mobile: '+919999999999', email: 'owner@example.com' };
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', async req => {
      if (req.url() === base + '/api/customer/profile') {
        if (profileDelay) await new Promise(resolve => setTimeout(resolve, profileDelay));
        await req.respond({ status: signedIn ? 200 : 401, contentType: 'application/json', body: JSON.stringify(signedIn ? { customer: { identity } } : {}) });
      } else if (req.url().startsWith(base) || req.url().startsWith('data:') || req.url().startsWith('blob:')) await req.continue();
      else await req.abort();
    });
    for (const width of widths) {
      await page.setViewport({ width, height: 720, isMobile: width < 768, hasTouch: width < 768 });
      await page.goto(base + '/checkout.html?service=pan-correction', { waitUntil: 'networkidle0' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Checkout overflow ' + width);
      if (width <= 768) {
        await page.$eval('.mobile-cta-price-block', el => el.focus());
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.getElementById('mobile-price-drawer').open);
        assert(await page.$eval('#mobile-price-drawer', el => { const r=el.getBoundingClientRect();return r.left >= -1 && r.right <= innerWidth + 1; }), 'Drawer geometry');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.getElementById('mobile-price-drawer').open);
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('mobile-cta-price-block')), true, 'Drawer focus return');
        await page.$eval('.mobile-cta-price-block', el => el.click());
        await page.goBack();
        await page.waitForFunction(() => !document.getElementById('mobile-price-drawer').open);
      }
      await page.evaluate(() => {
        for (const [id, value] of Object.entries({ 'checkout-name':'Mobile QA', 'checkout-mobile':'9999999998', 'checkout-email':'mobile@example.com' })) {
          const el=document.getElementById(id); el.value=value; el.dispatchEvent(new Event('input',{bubbles:true}));
        }
        return continueFromStep1();
      });
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H2', 'Step heading receives focus');
      await page.evaluate(() => {
        const transfer=new DataTransfer(); transfer.items.add(new File(['%PDF-1.4 QA'], 'a-very-long-document-name-for-mobile-layout-check.pdf', {type:'application/pdf'}));
        handleFileSelect({target:{files:transfer.files,value:''}});
        document.getElementById('file-input').click=()=>{};
      });
      assert.equal(await page.$$eval('.uploaded-file-card', els=>els.length),1);
      assert(await page.$eval('.uploaded-file-actions a', el=>el.href.startsWith('blob:')), 'Local preview');
      await page.evaluate(() => { replaceUploadedFile(0); document.getElementById('file-input').dispatchEvent(new Event('cancel')); });
      assert.equal(await page.$$eval('.uploaded-file-card', els=>els.length),1,'Cancelled replacement retains original');
      await page.evaluate(() => {
        replaceUploadedFile(0); const transfer=new DataTransfer(); transfer.items.add(new File(['invalid'], 'unsupported.txt'));
        handleFileSelect({target:{files:transfer.files,value:''}});
      });
      assert.equal(await page.$$eval('.uploaded-file-card', els=>els.length),1,'Invalid replacement retains original');
      await page.evaluate(() => {
        replaceUploadedFile(0); const transfer=new DataTransfer(); transfer.items.add(new File(['%PDF-1.4 replacement'], 'replacement.pdf',{type:'application/pdf'}));
        handleFileSelect({target:{files:transfer.files,value:''}});
      });
      assert.match(await page.$eval('.uploaded-file-copy strong',el=>el.textContent),/replacement/);
      assert.equal(await page.$$eval('.uploaded-file-card', els=>els.length),1,'Replacement is not appended');
      await page.evaluate(async () => {
        const canvas=document.createElement('canvas');canvas.width=160;canvas.height=120;
        const ctx=canvas.getContext('2d');ctx.fillRect(0,0,160,120);ctx.fillStyle='white';ctx.font='24px sans-serif';ctx.fillText('Local QA',20,65);
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
        const transfer=new DataTransfer();transfer.items.add(new File([blob],'local-preview.png',{type:'image/png'}));handleFileSelect({target:{files:transfer.files,value:''}});
      });
      await page.waitForFunction(()=>document.querySelector('.checkout-file-thumbnail')?.naturalWidth===160);
      await page.evaluate(()=>triggerCamera());
      assert.equal(await page.$eval('#file-input',el=>el.getAttribute('capture')),'environment');
      await page.evaluate(()=>triggerFileInput());
      assert.equal(await page.$eval('#file-input',el=>el.hasAttribute('capture')),false);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Upload overflow ' + width);
      await page.$eval('.uploaded-file-card:last-child',el=>el.scrollIntoView({block:'center'}));
      await (await page.$('#uploaded-files-list')).screenshot({path:path.join(root,'artifacts/ux-pilot/mobile-upload-'+width+'.png')});
      await page.evaluate(()=>navigateToStep(3));
      assert.match(await page.$eval('#mobile-checkout-cta',el=>el.textContent),/Pay/);
      await page.screenshot({path:path.join(root,'artifacts/ux-pilot/mobile-payment-'+width+'.png')});
    }
    await page.setViewport({width:600,height:360,isMobile:true,hasTouch:true});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto(base+'/checkout.html?service=pan-correction',{waitUntil:'networkidle0'});
    await page.$eval('.mobile-cta-price-block',el=>el.click());
    assert(await page.$eval('#mobile-price-drawer',el=>{const r=el.getBoundingClientRect();return r.top>=-1&&r.bottom<=innerHeight+1;}),'Landscape price drawer fits');
    await page.setViewport({width:1024,height:720,isMobile:false,hasTouch:false});
    await page.waitForFunction(()=>!document.getElementById('mobile-price-drawer').open);
    await page.setViewport({width:390,height:720,isMobile:true,hasTouch:true});
    await page.goto(base+'/checkout.html?service=pan-correction',{waitUntil:'networkidle0'});
    await page.focus('#checkout-email');
    await page.evaluate(()=>{ Object.defineProperty(visualViewport,'height',{configurable:true,value:350}); visualViewport.dispatchEvent(new Event('resize')); });
    assert.equal(await page.evaluate(()=>document.body.classList.contains('keyboard-open')),true);
    assert(await page.$eval('#service-continue-btn',el=>el.getBoundingClientRect().height>=44),'Inline Continue available with keyboard');
    await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});
    assert.equal(await page.evaluate(()=>document.body.classList.contains('keyboard-open')),false);
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(root,'artifacts/mobile-checkout-test.json'),JSON.stringify({result:'PASS',widths,checks:['native price drawer keyboard/back/focus','local file preview','cancel and invalid replacement retain original','valid replacement','camera/browse input rules','step heading focus','simulated keyboard inline action','no overflow'],physicalKeyboardTested:false,realGatewayTested:false},null,2));
    console.log('PASS mobile checkout and upload at 11 widths');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });

