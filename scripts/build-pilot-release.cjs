// Creates a new local package; never deploys or touches runtime data.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const id = 'one-point-pilot-' + new Date().toISOString().replace(/[-:.]/g, '').replace('T', '-').replace('Z', '') + '-' + crypto.randomBytes(2).toString('hex');
const destination = path.join(root, 'release-packages', id);
const originArg = process.argv.find(a => a.startsWith('--transaction-origin='));
const origin = originArg ? originArg.slice('--transaction-origin='.length) : '';
if (origin) { const url = new URL(origin); if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password || url.port || ['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Use a trusted HTTPS origin only, with no path, port, credentials or query.'); }
const safeExtensions = new Set(['.html','.css','.js','.cjs','.mjs','.json','.svg','.png','.jpg','.jpeg','.webp','.gif','.ico','.mp4','.webm','.woff','.woff2','.ttf','.otf','.sql']);
const forbiddenDirectory = /^(node_modules|data|uploads|invoices|logs|scratch|\.git|\.agents|\.codex|\.aws|source)$/i;
function copyTree(source, target, extensions = safeExtensions) {
  if (!fs.existsSync(source)) throw new Error('Required release source missing: ' + path.relative(root, source));
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const input = path.join(source, entry.name), output = path.join(target, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Release source symlink rejected: ' + path.relative(root, input));
    if (entry.isDirectory()) { if (!forbiddenDirectory.test(entry.name)) copyTree(input, output, extensions); }
    else if (!entry.name.startsWith('.') && extensions.has(path.extname(entry.name).toLowerCase()) && !/\.(test|spec)\.[^.]+$/.test(entry.name)) { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.copyFileSync(input, output); }
  }
}
function copy(file, base) { fs.mkdirSync(path.dirname(path.join(base, file)), { recursive: true }); fs.copyFileSync(path.join(root, file), path.join(base, file)); }
fs.mkdirSync(destination, { recursive: true });
for (const name of ['pages', 'transaction']) {
  const base = path.join(destination, name);
  for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) copy(file, base);
  for (const file of ['robots.txt', 'sitemap.xml']) copy(file, base);
  copyTree(path.join(root, 'assets'), path.join(base, 'assets'));
  // The server and existing URLs use lowercase dashboard/ on Linux/Pages.
  copyTree(path.join(root, 'Dashboard/web'), path.join(base, 'dashboard/web'));
  fs.copyFileSync(path.join(root, 'Dashboard/index.html'), path.join(base, 'dashboard/index.html'));
  fs.writeFileSync(path.join(base, 'assets/deployment-config.js'), 'window.OPDSDeployment = Object.freeze(' + JSON.stringify({ transactionOrigin: origin }) + ');\n');
  if (name === 'pages') fs.writeFileSync(path.join(base, '.nojekyll'), '');
}
const transaction = path.join(destination, 'transaction');
copyTree(path.join(root, 'backend'), path.join(transaction, 'backend'), new Set(['.js','.cjs','.json','.sql','.yaml']));
for (const file of ['server.js','package.json','package-lock.json']) copy(file, transaction);
// Production package intentionally has no tests/dev tooling; retain locked dependencies.
const pkg = JSON.parse(fs.readFileSync(path.join(transaction, 'package.json')));
pkg.scripts = { start: 'node server.js' };
fs.writeFileSync(path.join(transaction, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
for (const file of ['deployment/LOCAL-AND-RELEASE.md','deployment/PILOT-RELEASE.md','deployment/ROLLBACK.md','deployment/MONITORING.md','deployment/pilot-monitoring.csv','deployment/transaction-host.env.example','deployment/transaction-host.nginx.conf.example','FULL-VERIFICATION.md','PHYSICAL-DEVICE-CHECKLIST.md','SERVICE-EXPANSION.md']) copy(file, path.join(destination, 'runbooks'));
const files = [];
function inventory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inventory(file);
    else files.push({ path: path.relative(destination, file).replaceAll('\\','/'), bytes: fs.statSync(file).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
  }
}
inventory(destination);
const manifest = { id, createdAt: new Date().toISOString(), transactionOrigin: origin, purpose: origin ? 'configuration supplied; release gates still required' : 'local review package; configure HTTPS origin before live use', liveReady: false, physicalDevicesVerified: false, realGatewayVerified: false, excludes: ['.env','runtime databases','customer uploads','generated invoices','logs','node_modules','user project folders'], files };
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts/pilot-release-build.json'), JSON.stringify({ directory: destination, manifest: path.join(destination,'manifest.json'), id, fileCount: files.length, liveReady: false }, null, 2));
console.log('Local release package: ' + destination);
console.log('Files: ' + files.length + '; live release gates remain pending.');
