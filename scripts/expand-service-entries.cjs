const fs = require('node:fs');
const path = require('node:path');
const rules = require('../assets/service-policy');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/catalog.json')));
const report = { source: 'local catalog snapshot; live checkout remains authoritative', changedLinks: [], pages: [], liveReady: false };
for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
  let html = fs.readFileSync(path.join(root, file), 'utf8');
  let count = 0;
  html = html.replace(/(<a\b[^>]*\bhref=["'])(checkout\.html\?[^"'<>\s]+)(["'][^>]*>)([\s\S]*?)(<\/a>)/g, (whole, before, href, after, label, close) => {
    const url = new URL(href.replace(/&amp;/g, '&'), 'http://local/');
    const slug = url.searchParams.get('service');
    if (!slug) return whole;
    const type = url.searchParams.get('type') === 'product' ? 'product' : 'service';
    const item = rules.resolve(catalog, slug, type);
    const reason = !item ? 'missing exact catalog task' : item.policy.purchase.mode === 'scope_review' ? 'scope confirmation required' : null;
    if (!reason) return whole;
    const query = new URLSearchParams({ service: slug, service_name: url.searchParams.get('service_name') || item?.name || slug });
    report.changedLinks.push({ file, slug, reason }); count++;
    // Keep icon markup and replace only the action wording.
    const icons = [...label.matchAll(/<(?:i|svg)\b[\s\S]*?<\/(?:i|svg)>/g)].map(m => m[0]).join('');
    return before + 'service-request.html?' + query + after + icons + ' Request service' + close;
  });
  if (count || /^(edupoint-|business-online-setup)/.test(file)) {
    if (!html.includes('assets/service-expansion.css')) html = html.replace('</head>', '  <link rel="stylesheet" href="assets/service-expansion.css?v=108">\n</head>');
    if (!html.includes('service-family-expanded')) html = html.replace(/<body class="([^"]*)"/, '<body class="$1 service-family-expanded"');
    report.pages.push(file);
    fs.writeFileSync(path.join(root, file), html);
  }
}
fs.writeFileSync(path.join(root, 'artifacts/service-expansion.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Updated ${report.changedLinks.length} entry links across ${report.pages.length} family pages without inventing prices.`);
