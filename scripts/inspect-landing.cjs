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

const pages = [
  'business-solutions.html',
  'online-services.html',
  'edupoint.html',
  'contact.html'
];

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();

  for (const pName of pages) {
    for (const width of [320, 390]) {
      await page.setViewport({ width, height: 800, isMobile: true, hasTouch: true });
      await page.goto(`${base}/${pName}`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 300));
      const info = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const hero = document.querySelector('.hero, .page-hero, header + section, main > section:first-of-type');
        const p = hero ? hero.querySelector('p') : null;
        const ctas = hero ? Array.from(hero.querySelectorAll('a.btn, a.eds-btn, .hero-actions a')).map(a => ({
          text: a.innerText.trim(),
          w: Math.round(a.getBoundingClientRect().width),
          h: Math.round(a.getBoundingClientRect().height)
        })) : [];
        return {
          h1Text: h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : null,
          h1Fs: h1 ? getComputedStyle(h1).fontSize : null,
          pText: p ? p.innerText.replace(/\s+/g, ' ').slice(0, 80) : null,
          ctas,
          overflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });
      console.log(`${pName} @ ${width}px:`, JSON.stringify(info));
    }
  }

  await browser.close();
  server.close();
})();
