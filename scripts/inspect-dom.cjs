const fs = require('fs');
const path = require('path');
const http = require('http');

const root = process.cwd();
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
  await page.setViewport({ width: 320, height: 600, isMobile: true, hasTouch: true });
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));

  const details = await page.evaluate(() => {
    const subtitle = document.querySelector('.hero-v3-subtitle');
    const copy = document.querySelector('.hero-v3-copy');
    const children = copy ? Array.from(copy.children).map(c => ({
      tag: c.tagName,
      className: c.className,
      display: getComputedStyle(c).display,
      order: getComputedStyle(c).order,
      text: c.innerText ? c.innerText.slice(0, 40) : '',
      rect: c.getBoundingClientRect()
    })) : [];
    
    return {
      subtitleParent: subtitle ? subtitle.parentElement.className : null,
      subtitleClasses: subtitle ? subtitle.className : null,
      subtitleDisplay: subtitle ? getComputedStyle(subtitle).display : null,
      subtitleText: subtitle ? subtitle.textContent : null,
      copyDisplay: copy ? getComputedStyle(copy).display : null,
      copyFlexDirection: copy ? getComputedStyle(copy).flexDirection : null,
      copyChildren: children
    };
  });

  console.log(JSON.stringify(details, null, 2));

  await browser.close();
  server.close();
})();
