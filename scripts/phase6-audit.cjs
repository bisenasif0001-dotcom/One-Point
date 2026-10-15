const fs = require('fs');
const path = require('path');
const http = require('http');

const root = process.cwd();
const out = path.join(root, 'artifacts/phase6');
fs.mkdirSync(out, { recursive: true });

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (req.method !== 'GET' || !file.startsWith(root + path.sep) || !(file.includes(path.sep + 'assets' + path.sep) || file.endsWith('.html'))) {
    res.writeHead(404);
    return res.end();
  }
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

const routes = [
  'index.html',
  'services.html',
  'service-pan-card.html',
  'business-solutions.html',
  'online-services.html',
  'edupoint.html',
  'edupoint-competitive-exams.html',
  'contact.html',
  'checkout.html?service=new-pan',
  'track-application.html',
  'login.html'
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
  const cdp = await page.createCDPSession();
  const results = [];
  const blocked = [];
  let pageErrors = [];

  page.on('pageerror', e => pageErrors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = new URL(r.url());
    if (r.method() !== 'GET') {
      blocked.push({ path: u.pathname, method: r.method() });
      return r.abort();
    }
    if (u.origin === base && u.pathname.startsWith('/api/payments/status/')) {
      return r.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payment: { status: 'failed', paymentId: 'fixture-reference', gateway: 'razorpay' },
          order: { orderId: 'fixture-order', total: 199, createdAt: '2026-10-14T08:00:00Z' }
        })
      });
    }
    if (u.origin === base && u.pathname.startsWith('/api/applications/track/')) {
      return r.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          order: { orderId: 'FIXTURE-12345', total: 199 },
          application: { displayStatus: 'Intake review', stageIndex: 0 }
        })
      });
    }
    if (u.origin === base || u.protocol === 'data:' || ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(u.hostname)) {
      r.continue();
    } else {
      r.abort();
    }
  });

  try {
    for (const route of routes) {
      for (const width of widths) {
        pageErrors = [];
        await page.setViewport({
          width,
          height: width < 768 ? 640 : 900,
          isMobile: width < 768,
          hasTouch: width < 768
        });
        await page.goto(base + '/' + route, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.fonts.ready);
        await new Promise(r => setTimeout(r, 350));

        const data = await page.evaluate(() => {
          const visible = e => {
            const r = e.getBoundingClientRect(), s = getComputedStyle(e);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[inert]');
          };
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = window.innerWidth;
          const hasOverflow = scrollWidth > clientWidth + 1;

          // Hero inspection
          const hero = document.querySelector('.hero, .page-hero, .hero-v3, .public-hero-home-system');
          const heroTitle = hero?.querySelector('h1, .hero-v3-title, .page-hero-title, .hero-title');
          const heroSubtitle = hero?.querySelector('.hero-v3-subtitle, .page-hero-copy > p, .hero-subtitle');

          // Controls check
          const controls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]')].filter(visible);
          const unnamedControls = controls.filter(e => !e.textContent.trim() && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.labels?.length && !e.querySelector('img[alt]') && !e.value);

          return {
            width: clientWidth,
            scrollWidth,
            hasOverflow,
            unnamedControlsCount: unnamedControls.length,
            heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
            heroTitleFs: heroTitle ? getComputedStyle(heroTitle).fontSize : null,
            heroTitleLh: heroTitle ? getComputedStyle(heroTitle).lineHeight : null,
            heroSubtitleVisible: heroSubtitle ? visible(heroSubtitle) : null,
            heroSubtitleFs: heroSubtitle ? getComputedStyle(heroSubtitle).fontSize : null
          };
        });

        // Capture key screenshots for report evidence
        if ([320, 390, 768, 1440].includes(width)) {
          const routeName = route.split('?')[0].replace('.html', '');
          await page.screenshot({ path: path.join(out, `final-${routeName}-${width}.png`), fullPage: false });
        }

        results.push({
          route,
          width,
          ...data,
          errors: [...pageErrors]
        });
      }
    }

    fs.writeFileSync(path.join(out, 'final-audit.json'), JSON.stringify({ results, blocked }, null, 2));
    console.log(`Phase 6 Audit Complete: ${results.length} states checked!`);
  } finally {
    await browser.close();
    server.close();
  }
})();
