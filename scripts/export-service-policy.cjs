const fs = require('node:fs');
const path = require('node:path');
const rules = require('../assets/service-policy');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/catalog.json'), 'utf8'));
const entries = [...catalog.services, ...catalog.serviceVariants, ...catalog.products];
const keys = [...new Set(entries.filter(item => item.active !== false).map(item => `${item.type === 'product' ? 'product' : 'service'}:${item.slug}`))];
const policies = keys.map(key => {
  const separator = key.indexOf(':');
  return rules.resolve(catalog, key.slice(separator + 1), key.slice(0, separator)).policy;
});
const conflicts = catalog.serviceVariants.flatMap(variant => {
  const main = catalog.services.find(item => item.slug === variant.slug);
  return main && (main.price !== variant.price || main.pricingModel !== variant.pricingModel)
    ? [{ id: variant.slug, mainPrice: main.price, variantPrice: variant.price,
      mainModel: main.pricingModel, variantModel: variant.pricingModel, resolution: 'exact_variant_matches_backend' }] : [];
});
fs.writeFileSync(path.join(root, 'assets/service-policy-map.json'), JSON.stringify({
  policyVersion: 1, source: 'existing assets/catalog.json snapshot; live catalog is authoritative at checkout',
  sourceUpdatedAt: catalog.updatedAt || null, policies, duplicateIdentityPricingConflicts: conflicts
}, null, 2) + '\n');
const unresolvedLinks = [];
for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/checkout\.html\?[^"'<>\s]+/g)) {
    const url = new URL(match[0].replace(/&amp;/g, '&'), 'http://local/');
    const slug = url.searchParams.get('service');
    if (slug && !rules.resolve(catalog, slug)) unresolvedLinks.push({ file, slug, name: url.searchParams.get('service_name'),
      status: 'missing_exact_catalog_identity; no name-based substitution allowed' });
  }
}
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts/service-entry-audit.json'), JSON.stringify({
  source: 'static checkout links in root HTML; runtime-generated links need their own pilot checks',
  unresolvedLinks
}, null, 2) + '\n');
console.log(`Exported ${policies.length} stable policies; ${conflicts.length} duplicate-ID pricing conflicts recorded.`);
console.log(`Recorded ${unresolvedLinks.length} static links needing catalog/entry mapping review.`);
