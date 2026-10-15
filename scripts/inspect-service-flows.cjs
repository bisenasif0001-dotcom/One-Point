const fs = require('fs');

const files = [
  'service-pan-card.html',
  'service-voter-id.html',
  'service-ration-card-assistance.html',
  'service-transport-rto-facilitation.html'
];

const report = {};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Title & H1
  const title = (content.match(/<title>([^<]+)<\/title>/i) || [])[1] || '';
  const h1Matches = [...content.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  
  // Sections
  const sectionTags = [...content.matchAll(/<section([^>]*)>/gi)].map(m => {
    const raw = m[1];
    const id = (raw.match(/id=["']([^"']+)["']/i) || [])[1] || '';
    const cls = (raw.match(/class=["']([^"']+)["']/i) || [])[1] || '';
    return { id, cls };
  });

  // Action links / buttons
  const linkMatches = [...content.matchAll(/<(?:a|button)([^>]*)>([\s\S]*?)<\/(?:a|button)>/gi)].map(m => {
    const raw = m[1];
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const href = (raw.match(/href=["']([^"']+)["']/i) || [])[1] || '';
    const id = (raw.match(/id=["']([^"']+)["']/i) || [])[1] || '';
    const cls = (raw.match(/class=["']([^"']+)["']/i) || [])[1] || '';
    const target = (raw.match(/target=["']([^"']+)["']/i) || [])[1] || '';
    const isCTA = cls.includes('btn') || cls.includes('cta') || href.includes('checkout') || href.includes('service-request') || href.includes('wa.me');
    return isCTA ? { text: text.slice(0, 50), href, id, cls, target } : null;
  }).filter(Boolean);

  // Tabs
  const tabButtons = [...content.matchAll(/<button[^>]*class=["'][^"']*(?:tab-btn|voter-tab|pan-tab)[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi)].map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

  // Documents checklist
  const docItems = [...content.matchAll(/class=["'][^"']*(?:doc-item|ration-need-item|req-item|document-item|doc-box)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|article)>/gi)].map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 10);

  // Forms
  const forms = [...content.matchAll(/<form([^>]*)>([\s\S]*?)<\/form>/gi)].map(m => {
    const raw = m[1];
    const action = (raw.match(/action=["']([^"']+)["']/i) || [])[1] || '';
    const inputs = [...m[2].matchAll(/<input([^>]*)>/gi)].map(im => {
      const type = (im[1].match(/type=["']([^"']+)["']/i) || [])[1] || 'text';
      const name = (im[1].match(/name=["']([^"']+)["']/i) || [])[1] || '';
      return { type, name };
    });
    return { action, inputs };
  });

  report[file] = {
    title,
    h1s: h1Matches,
    sectionCount: sectionTags.length,
    sections: sectionTags,
    ctaCount: linkMatches.length,
    sampleCtas: linkMatches.slice(0, 15),
    tabs: tabButtons,
    docItemCount: docItems.length,
    sampleDocs: docItems,
    forms
  };
});

fs.writeFileSync('artifacts/phase7/service-flows-audit.json', JSON.stringify(report, null, 2));
console.log('Successfully audited service flows for representative pages.');
