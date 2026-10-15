const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync('assets/app.js', 'utf8');
const match = appJs.match(/const\s+searchIndex\s*=\s*(\[[\s\S]*?\]);/);

if (!match) {
  console.error('Could not find searchIndex in app.js');
  process.exit(1);
}

const fn = new Function(`return ${match[1]};`);
const searchIndex = fn();

console.log('Total searchIndex items:', searchIndex.length);

const results = searchIndex.map(item => {
  const [filePath, hash] = item.href.split('#');
  const [cleanFile, query] = filePath.split('?');
  const exists = fs.existsSync(cleanFile);
  let isRedirect = false;
  let redirectTo = null;

  if (exists && cleanFile.endsWith('.html')) {
    const content = fs.readFileSync(cleanFile, 'utf8');
    const rMatch = content.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i);
    if (rMatch) {
      isRedirect = true;
      redirectTo = rMatch[1];
    }
  }

  return {
    title: item.title,
    href: item.href,
    file: cleanFile,
    exists,
    isRedirect,
    redirectTo
  };
});

const missing = results.filter(r => !r.exists);
const redirects = results.filter(r => r.isRedirect);

console.log('Missing destinations:', missing.length);
if (missing.length) console.log(missing);

console.log('Redirect destinations:', redirects.length);
if (redirects.length) console.log(redirects);

fs.writeFileSync('artifacts/phase8/search-index-audit.json', JSON.stringify({ total: searchIndex.length, results, missing, redirects }, null, 2));
