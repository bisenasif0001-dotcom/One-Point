const fs = require('fs');
const path = require('path');
const http = require('http');

const root = process.cwd();
const out = path.join(root, 'artifacts/phase7');
fs.mkdirSync(out, { recursive: true });

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (req.method !== 'GET' || !file.startsWith(root + path.sep) || !(file.includes(path.sep + 'assets' + path.sep) || file.endsWith('.html') || file.endsWith('.json') || file.endsWith('.svg') || file.endsWith('.png'))) {
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
      '.jpg': 'image/jpeg',
      '.json': 'application/json'
    }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.end(data);
  });
});

const pages = [
  { name: 'pan-card', route: 'service-pan-card.html' },
  { name: 'voter-id', route: 'service-voter-id.html' },
  { name: 'ration-card', route: 'service-ration-card-assistance.html' },
  { name: 'transport-rto', route: 'service-transport-rto-facilitation.html' },
  { name: 'checkout-pan', route: 'checkout.html?service=new-pan' },
  { name: 'service-request', route: 'service-request.html?service=new-ration-card-application-assistance&service_name=New+Ration+Card+Application+Assistance' },
  { name: 'order-documents', route: 'order-documents.html?order=fixture-order' }
];

const widths = [320, 390, 768, 1440];

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  const baselineMetrics = [];

  try {
    for (const p of pages) {
      for (const width of widths) {
        await page.setViewport({
          width,
          height: width < 768 ? 640 : 900,
          isMobile: width < 768,
          hasTouch: width < 768
        });

        await page.goto(base + '/' + p.route, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.fonts.ready);
        await new Promise(r => setTimeout(r, 400));

        const metrics = await page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = window.innerWidth;
          const hasOverflow = scrollWidth > clientWidth + 1;

          const h1 = document.querySelector('h1, .page-hero-title');
          const stickyBar = document.querySelector('.enterprise-sticky-actions, .checkout-mobile-cta, .bos-sticky-mobile-bar');
          const form = document.querySelector('form:not([hidden])');

          return {
            clientWidth,
            scrollWidth,
            hasOverflow,
            h1Text: h1 ? h1.textContent.trim().replace(/\s+/g, ' ') : null,
            h1Fs: h1 ? getComputedStyle(h1).fontSize : null,
            h1Lh: h1 ? getComputedStyle(h1).lineHeight : null,
            stickyBarVisible: stickyBar ? getComputedStyle(stickyBar).display !== 'none' : false,
            stickyBarHeight: stickyBar ? Math.round(stickyBar.getBoundingClientRect().height) : null,
            hasForm: !!form
          };
        });

        const screenshotPath = path.join(out, `before-${p.name}-${width}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        baselineMetrics.push({
          page: p.name,
          route: p.route,
          width,
          ...metrics,
          screenshot: `before-${p.name}-${width}.png`
        });
      }
    }

    fs.writeFileSync(path.join(out, 'baseline-metrics.json'), JSON.stringify(baselineMetrics, null, 2));
    console.log(`Baseline complete! Captured ${baselineMetrics.length} states in artifacts/phase7/`);
  } finally {
    await browser.close();
    server.close();
  }
})();
