const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/service-expansion.json')));
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep) || !(file.endsWith('.html') || file.startsWith(path.join(root, 'assets') + path.sep))) { res.writeHead(404); return res.end(); }
  fs.readFile(file, (error, bytes) => { if (error) { res.writeHead(404); return res.end(); } res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)] || 'application/octet-stream'); res.end(bytes); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await (await import('puppeteer')).default.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const failures = [], checks = [];
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => req.url().startsWith(base) || req.url().startsWith('data:') ? req.continue() : req.abort());
    for (const file of process.env.OPDS_REQUEST_ONLY ? ['service-request.html'] : [...report.pages, 'service-request.html']) {
      await page.goto(base + '/' + file, {waitUntil:'networkidle0'});
      for (const width of [320,360,375,390,414,430,600,768,1024,1280,1440]) {
        await page.setViewport({width,height:844});
        await new Promise(resolve=>setTimeout(resolve,80));
        const geometry = await page.evaluate(() => ({scroll:document.documentElement.scrollWidth, width:innerWidth}));
        if (geometry.scroll > width + 1) failures.push({file,width,scroll:geometry.scroll});
        checks.push({file,width});
      }
    }
    await page.goto(base + '/edupoint-competitive-exams.html', {waitUntil:'networkidle0'});
    const href = await page.$eval('.btn-apply-now', el=>el.getAttribute('href'));
    assert(href.startsWith('service-request.html?'));
    const originalTask = new URL(href,base).searchParams.get('service_name');
    const routes = await page.evaluate(() => ({unknown:serviceApplyHref('Unconfigured exact QA task'), msme:serviceApplyHref('MSME Registration')}));
    assert(routes.unknown.startsWith('service-request.html?'));
    assert(routes.msme.startsWith('checkout.html?service=msme-registration'));
    await page.goto(new URL(href,base).href,{waitUntil:'networkidle0'});
    assert.equal(await page.$eval('[data-request-task]',el=>el.textContent),originalTask);
    assert((await page.$eval('[data-request-whatsapp]',el=>el.href)).includes(encodeURIComponent(originalTask)));
    await page.goto(base+'/service-request.html?service_name='+encodeURIComponent('<img src=x onerror=alert(1)>'),{waitUntil:'networkidle0'});
    assert.equal(await page.$$eval('[data-request-task] img',els=>els.length),0);
    assert.equal(await page.$eval('[data-request-task]',el=>el.textContent),'<img src=x onerror=alert(1)>');
    fs.writeFileSync(path.join(root, process.env.OPDS_REQUEST_ONLY ? 'artifacts/service-request-test.json' : 'artifacts/service-expansion-test.json'),JSON.stringify({result:failures.length?'FAIL':'PASS',checks:checks.length,pages:process.env.OPDS_REQUEST_ONLY ? 1 : report.pages.length+1,failures,externalRequestsBlocked:true,realDevicesVerified:false},null,2));
    assert.deepEqual(failures,[],'Family page overflow');
    console.log('PASS: family widths, exact request identity and safe task rendering');
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
