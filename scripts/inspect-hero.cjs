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
  
  for (const width of [320, 360, 375, 390, 414, 430, 768, 1440]) {
    await page.setViewport({ width, height: 800, isMobile: width < 768, hasTouch: width < 768 });
    await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    
    const info = await page.evaluate(() => {
      const hero = document.querySelector('.hero-v3');
      const title = document.querySelector('.hero-v3-title');
      const titleLine = document.querySelector('.hero-v3-title-line');
      const titleAccent = document.querySelector('.hero-v3-title-accent');
      const subtitle = document.querySelector('.hero-v3-subtitle');
      const badge = document.querySelector('.hero-v3-badge');
      const search = document.querySelector('.hos-search');
      const searchInput = document.querySelector('.hos-search-input');
      const tasks = document.querySelector('.home-mobile-tasks');
      const actions = document.querySelector('.hero-actions-v3');
      const primaryBtn = document.querySelector('.hero-cta-primary');
      const secondaryBtn = document.querySelector('.hero-cta-secondary');
      const trustStrip = document.querySelector('.hero-trust-strip');
      const consoleEl = document.querySelector('.hero-os-console');
      
      const isVisible = el => {
        if (!el) return false;
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
      };
      const rect = el => el ? {
        top: Math.round(el.getBoundingClientRect().top),
        bottom: Math.round(el.getBoundingClientRect().bottom),
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height)
      } : null;
      
      return {
        heroRect: rect(hero),
        badgeVisible: isVisible(badge),
        titleRect: rect(title),
        titleFs: title ? getComputedStyle(title).fontSize : null,
        titleLh: title ? getComputedStyle(title).lineHeight : null,
        titleLineText: titleLine ? titleLine.textContent.trim() : null,
        titleAccentText: titleAccent ? titleAccent.textContent.trim() : null,
        subtitleVisible: isVisible(subtitle),
        subtitleRect: rect(subtitle),
        subtitleFs: subtitle ? getComputedStyle(subtitle).fontSize : null,
        searchRect: rect(search),
        searchInputRect: rect(searchInput),
        tasksVisible: isVisible(tasks),
        tasksRect: rect(tasks),
        actionsRect: rect(actions),
        primaryBtnRect: rect(primaryBtn),
        secondaryBtnRect: rect(secondaryBtn),
        primaryBtnText: primaryBtn ? primaryBtn.innerText.replace(/\s+/g, ' ').trim() : null,
        secondaryBtnText: secondaryBtn ? secondaryBtn.innerText.replace(/\s+/g, ' ').trim() : null,
        trustStripVisible: isVisible(trustStrip),
        consoleVisible: isVisible(consoleEl)
      };
    });
    console.log(`\n=== Width: ${width}px ===`);
    console.log(JSON.stringify(info, null, 2));
  }
  
  await browser.close();
  server.close();
})();
