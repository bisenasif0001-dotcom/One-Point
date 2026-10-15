const fs = require('fs');
const data = JSON.parse(fs.readFileSync('artifacts/phase6/final-audit.json', 'utf8'));
const total = data.results.length;
const overflows = data.results.filter(r => r.hasOverflow);
const errors = data.results.filter(r => r.errors.length > 0);
const unnamed = data.results.filter(r => r.unnamedControlsCount > 0);
console.log(JSON.stringify({
  totalStates: total,
  overflowCount: overflows.length,
  errorCount: errors.length,
  unnamedCount: unnamed.length,
  blockedMutations: data.blocked.length
}, null, 2));

const heroMetrics = data.results.filter(r => r.route === 'index.html').map(r => ({
  width: r.width,
  heroHeight: r.heroHeight,
  heroTitleFs: r.heroTitleFs,
  subtitleVisible: r.heroSubtitleVisible,
  overflow: r.hasOverflow
}));
console.log('\nHomepage Hero Matrix:');
console.table(heroMetrics);
