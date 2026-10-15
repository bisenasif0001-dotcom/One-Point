const fs = require('fs');
const path = require('path');
const http = require('http');

const root = process.cwd();
const out = path.join(root, 'artifacts/phase6');
fs.mkdirSync(out, { recursive: true });

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    const ext = path.extname(file);
    const mime = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();

  for (const width of [320, 360, 375, 390, 414, 430, 768, 1440]) {
    await page.setViewport({ width, height: 800, isMobile: width < 768, hasTouch: width < 768 });
    await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(out, `current-index-${width}.png`), fullPage: false });
  }

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewport({ width, height: 800, isMobile: width < 768, hasTouch: width < 768 });
    await page.goto(base + '/services.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(out, `current-services-${width}.png`), fullPage: false });
  }

  await browser.close();
  server.close();
  console.log('Current screenshots captured!');
})();
