const fs = require('fs');
const base = JSON.parse(fs.readFileSync('artifacts/phase12/baseline-metrics.json', 'utf8'));
const final = JSON.parse(fs.readFileSync('artifacts/phase12/final-metrics.json', 'utf8'));

console.log('| Page | FCP (Base -> Final) | LCP (Base -> Final) | TBT (Base -> Final) | CLS (Base -> Final) | Blocking JS (Base -> Final) |');
console.log('|---|---|---|---|---|---|');

base.pages.forEach((bp, idx) => {
  const fp = final.pages[idx];
  const fcpDiff = fp.metrics.fcp - bp.metrics.fcp;
  const lcpDiff = fp.metrics.lcp - bp.metrics.lcp;
  const tbtDiff = fp.metrics.tbt - bp.metrics.tbt;
  const clsDiff = (fp.metrics.cls - bp.metrics.cls).toFixed(4);
  const jsDiff = fp.metrics.renderBlockingJs - bp.metrics.renderBlockingJs;

  console.log(`| **${bp.name}** | ${bp.metrics.fcp}ms -> **${fp.metrics.fcp}ms** (${fcpDiff >= 0 ? '+' : ''}${fcpDiff}ms) | ${bp.metrics.lcp}ms -> **${fp.metrics.lcp}ms** (${lcpDiff >= 0 ? '+' : ''}${lcpDiff}ms) | ${bp.metrics.tbt}ms -> **${fp.metrics.tbt}ms** (${tbtDiff >= 0 ? '+' : ''}${tbtDiff}ms) | ${bp.metrics.cls} -> **${fp.metrics.cls}** | ${bp.metrics.renderBlockingJs} -> **${fp.metrics.renderBlockingJs}** (${jsDiff}) |`);
});
