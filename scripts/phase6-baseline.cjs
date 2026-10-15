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
      '.png': 'image/png',
      '.jpg': 'image/jpeg'
    }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.end(data);
  });
});

const pagesToInspect = [
  { route: 'index.html', name: 'index' },
  { route: 'services.html', name: 'services' },
  { route: 'service-pan-card.html', name: 'service-pan-card' },
  { route: 'business-solutions.html', name: 'business-solutions' },
  { route: 'online-services.html', name: 'online-services' },
  { route: 'edupoint.html', name: 'edupoint' },
  { route: 'contact.html', name: 'contact' }
];

const widths = [320, 360, 375, 390, 414, 430, 600, 768, 1024, 1180, 1280, 1440];

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  const baselineMetrics = {};

  try {
    for (const { route, name } of pagesToInspect) {
      baselineMetrics[name] = {};
      for (const width of widths) {
        await page.setViewport({
          width,
          height: 800,
          isMobile: width < 768,
          hasTouch: width < 768
        });
        await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.fonts.ready);
        await new Promise(r => setTimeout(r, 350));

        // Evaluate layout metrics
        const metrics = await page.evaluate(() => {
          const body = document.body;
          const html = document.documentElement;
          const scrollWidth = html.scrollWidth;
          const clientWidth = html.clientWidth;
          const hasOverflow = scrollWidth > clientWidth;

          // Hero / Leading section inspection
          const hero = document.querySelector('.hero, .page-hero, .hero-v3, .public-hero-home-system');
          const heroTitle = hero?.querySelector('h1, .hero-v3-title, .page-hero-title, .hero-title');
          const heroSubtitle = hero?.querySelector('.hero-v3-subtitle, .page-hero-copy > p, .hero-subtitle, .hero-desc');
          const heroCtas = hero ? Array.from(hero.querySelectorAll('a.eds-btn, a.btn, .hero-actions a, .hero-actions-v3 a')).filter(el => {
            const s = getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden';
          }).map(btn => ({
            text: btn.innerText.replace(/\s+/g, ' ').trim(),
            width: Math.round(btn.getBoundingClientRect().width),
            height: Math.round(btn.getBoundingClientRect().height),
            top: Math.round(btn.getBoundingClientRect().top),
            left: Math.round(btn.getBoundingClientRect().left),
            fontSize: getComputedStyle(btn).fontSize,
            display: getComputedStyle(btn).display
          })) : [];

          return {
            windowWidth: window.innerWidth,
            scrollWidth,
            hasOverflow,
            heroRect: hero ? {
              width: Math.round(hero.getBoundingClientRect().width),
              height: Math.round(hero.getBoundingClientRect().height),
              top: Math.round(hero.getBoundingClientRect().top),
              bottom: Math.round(hero.getBoundingClientRect().bottom)
            } : null,
            heroTitleRect: heroTitle ? {
              width: Math.round(heroTitle.getBoundingClientRect().width),
              height: Math.round(heroTitle.getBoundingClientRect().height),
              fontSize: getComputedStyle(heroTitle).fontSize,
              lineHeight: getComputedStyle(heroTitle).lineHeight,
              text: heroTitle.innerText.replace(/\s+/g, ' ').trim()
            } : null,
            heroSubtitleRect: heroSubtitle ? {
              width: Math.round(heroSubtitle.getBoundingClientRect().width),
              height: Math.round(heroSubtitle.getBoundingClientRect().height),
              fontSize: getComputedStyle(heroSubtitle).fontSize,
              lineHeight: getComputedStyle(heroSubtitle).lineHeight,
              display: getComputedStyle(heroSubtitle).display,
              text: heroSubtitle.innerText.replace(/\s+/g, ' ').trim()
            } : null,
            heroCtas
          };
        });

        baselineMetrics[name][width] = metrics;

        // Take screenshots for critical widths
        if ([320, 390, 768, 1440].includes(width)) {
          const screenshotPath = path.join(out, `before-${name}-${width}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });
        }
      }
    }

    fs.writeFileSync(
      path.join(out, 'baseline-metrics.json'),
      JSON.stringify(baselineMetrics, null, 2)
    );
    console.log('Baseline metrics & screenshots captured successfully!');
  } finally {
    await browser.close();
    server.close();
  }
})();
