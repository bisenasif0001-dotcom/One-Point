const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.startsWith('service-') && f.endsWith('.html'));
console.log('Total service-*.html files:', files.length);

const summary = files.map(file => {
  const content = fs.readFileSync(file, 'utf8');
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const cleanH1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ') : null;
  const hasTabs = content.includes('pan-tab') || content.includes('voter-tab') || content.includes('role="tab"');
  const hasCheckoutLinks = content.includes('checkout.html');
  const hasRequestLinks = content.includes('service-request.html');
  const hasWhatsApp = content.includes('wa.me');
  const hasDocsSection = content.includes('Required Documents') || content.includes('doc-list') || content.includes('documents');
  const hasStickyActions = content.includes('sticky') || content.includes('mobile-cta') || content.includes('mobile-sticky');
  
  // Extract CSS files
  const cssMatches = [...content.matchAll(/href=["'](assets\/[^"']+\.css[^"']*)["']/g)].map(m => m[1]);
  
  return {
    file,
    title: titleMatch ? titleMatch[1].trim() : null,
    h1: cleanH1,
    hasTabs,
    hasCheckoutLinks,
    hasRequestLinks,
    hasWhatsApp,
    hasDocsSection,
    hasStickyActions,
    css: cssMatches
  };
});

fs.writeFileSync('artifacts/phase7/service-pages-inventory.json', JSON.stringify(summary, null, 2));
console.log('Saved inventory of', summary.length, 'pages to artifacts/phase7/service-pages-inventory.json');
