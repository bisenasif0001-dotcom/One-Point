const fs = require('fs');
const path = require('path');

const inventory = JSON.parse(fs.readFileSync('artifacts/phase7/service-pages-inventory.json', 'utf8'));

// Check redirect files in inventory
const inventoryAnalysis = inventory.map(item => {
  const content = fs.readFileSync(item.file, 'utf8');
  const redirectMatch = content.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i) ||
                        content.match(/window\.location\.replace\(["']([^"']+)["']/i);
  const isRedirect = Boolean(redirectMatch);
  const redirectTo = redirectMatch ? redirectMatch[1] : null;
  return {
    file: item.file,
    title: item.title,
    isRedirect,
    redirectTo,
    lines: content.split('\n').length
  };
});

// Now inspect services.html SERVICES_CATALOG
const servicesHtml = fs.readFileSync('services.html', 'utf8');
const catalogMatch = servicesHtml.match(/const\s+SERVICES_CATALOG\s*=\s*(\[[\s\S]*?\]);/);
let catalogItems = [];
if (catalogMatch) {
  try {
    // Evaluate or parse catalog
    const fn = new Function(`return ${catalogMatch[1]};`);
    catalogItems = fn();
  } catch (e) {
    console.error('Error evaluating SERVICES_CATALOG:', e.message);
  }
}

// Check destinations in catalogItems
const catalogAnalysis = catalogItems.map(item => {
  const filePath = item.url.split('?')[0].split('#')[0];
  const exists = fs.existsSync(filePath);
  let isRedirect = false;
  let redirectTo = null;
  if (exists) {
    const c = fs.readFileSync(filePath, 'utf8');
    const rMatch = c.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i);
    if (rMatch) {
      isRedirect = true;
      redirectTo = rMatch[1];
    }
  }
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    catName: item.catName,
    url: item.url,
    exists,
    isRedirect,
    redirectTo,
    popular: Boolean(item.popular)
  };
});

const result = {
  inventoryTotal: inventory.length,
  inventoryAnalysis,
  catalogTotal: catalogItems.length,
  catalogAnalysis
};

fs.mkdirSync('artifacts/phase8', { recursive: true });
fs.writeFileSync('artifacts/phase8/discovery-catalog-audit.json', JSON.stringify(result, null, 2));
console.log('Catalog audit complete:');
console.log(`- 27 Service Pages: ${inventoryAnalysis.filter(x => !x.isRedirect).length} full templates, ${inventoryAnalysis.filter(x => x.isRedirect).length} redirects`);
console.log(`- services.html catalog items: ${catalogItems.length}`);
const brokenInCatalog = catalogAnalysis.filter(x => !x.exists);
console.log(`- Missing destination files in catalog: ${brokenInCatalog.length}`);
if (brokenInCatalog.length) console.log(brokenInCatalog);
const redirectsInCatalog = catalogAnalysis.filter(x => x.isRedirect);
console.log(`- Redirect destination files in catalog: ${redirectsInCatalog.length}`);
if (redirectsInCatalog.length) console.log(redirectsInCatalog);
