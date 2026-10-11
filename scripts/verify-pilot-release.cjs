const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (process.argv[2] === '--worker') {
  global.fetch = async () => { throw new Error('External services disabled in package smoke test'); };
  require(path.join(process.argv[3], 'server.js'));
} else (async () => {
  const build = JSON.parse(fs.readFileSync(path.join(root,'artifacts/pilot-release-build.json')));
  const directory = path.resolve(build.directory);
  assert(directory.startsWith(path.join(root,'release-packages') + path.sep), 'Package must remain in workspace release directory');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory,'manifest.json')));
  const names = new Set(manifest.files.map(file => file.path));
  for (const file of manifest.files) {
    const target = path.resolve(directory,file.path);
    assert(target.startsWith(directory+path.sep), 'Manifest traversal rejected');
    assert(!/(^|\/)(\.env(?:\..*)?|node_modules|data|uploads|invoices|logs|scratch|\.git)(\/|$)/i.test(file.path), 'Runtime/private material excluded: '+file.path);
    assert(!/\.(sqlite(?:-wal|-shm)?|db|pem|key|log)$/i.test(file.path));
    const bytes = fs.readFileSync(target);
    assert.equal(bytes.length,file.bytes,file.path);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);
    if(file.path.startsWith('pages/')) assert(!/^(pages\/backend\/|pages\/server.js$)/.test(file.path));
  }
  for(const name of ['index.html','services.html','checkout.html','order-documents.html','payment-failed.html','track-application.html','assets/pilot-metrics.js','assets/payment-recovery.js','assets/document-upload.js','assets/print-product-rules.js','dashboard/index.html','dashboard/web/index.html']) {
    assert(names.has('pages/'+name) && names.has('transaction/'+name),'Required compatible file: '+name);
    assert(fs.readFileSync(path.join(directory,'pages',name)).equals(fs.readFileSync(path.join(directory,'transaction',name))), 'Frontend parity: '+name);
  }
  assert(names.has('transaction/backend/migrations/004_customer_digital_genome.sql'));
  assert(names.has('runbooks/deployment/pilot-monitoring.csv'));
  // Preserve case-sensitive dashboard paths required by server.js on Linux.
  assert(names.has('transaction/dashboard/web/index.html'));
  const mismatches=[];
  for (const page of ['index.html','services.html','checkout.html','service-pan-card.html','service-msme-registration.html','product-detail.html']) {
    const html=fs.readFileSync(path.join(directory,'pages',page),'utf8');
    for(const match of html.matchAll(/(?:src|href)=["'](assets\/[^"'#?]+)(?:\?[^"']*)?["']/g)) if(!names.has('pages/'+decodeURIComponent(match[1]))) mismatches.push({page,asset:match[1]});
  }
  assert.deepEqual(mismatches,[],'Pilot local asset references');
  fs.mkdirSync(path.join(root,'scratch'),{recursive:true});
  const isolated=fs.mkdtempSync(path.join(root,'scratch/release-smoke-'));
  fs.cpSync(path.join(directory,'transaction/backend'),path.join(isolated,'backend'),{recursive:true});
  fs.copyFileSync(path.join(directory,'transaction/server.js'),path.join(isolated,'server.js'));
  fs.cpSync(path.join(directory,'transaction/assets'),path.join(isolated,'assets'),{recursive:true,filter:file=>fs.statSync(file).isDirectory()||/\.(js|json|css|svg)$/i.test(file)});
  const lease=require('node:net').createServer();
  await new Promise(resolve=>lease.listen(0,'127.0.0.1',resolve));
  const port=lease.address().port, base='http://127.0.0.1:'+port;
  await new Promise(resolve=>lease.close(resolve));
  const child=spawn(process.execPath,[__filename,'--worker',isolated],{cwd:isolated,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,NODE_ENV:'test',OPDS_SKIP_LOCAL_ENV:'true',PORT:String(port),NEXT_PUBLIC_SITE_URL:base,DATABASE_URL:'file:'+path.join(isolated,'test.sqlite'),JWT_SECRET:crypto.randomBytes(32).toString('hex'),ADMIN_API_TOKEN:crypto.randomBytes(32).toString('hex'),ALLOWED_HOSTS:'127.0.0.1,localhost'},stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
  try {
    let ready=false;
    for(let count=0;count<40;count++) { if(child.exitCode!==null) throw new Error('Packaged server did not start');try{ready=(await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)})).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500)); }
    assert(ready,'Packaged server health');
    const response=await fetch(base+'/api/products',{signal:AbortSignal.timeout(10000)});const catalog=await response.json();assert(response.ok);assert(catalog.serviceVariants.some(item=>item.slug==='new-pan'),'Packaged service catalog');
    assert((await fetch(base+'/api/csrf',{signal:AbortSignal.timeout(10000)})).ok,'Packaged CSRF');
    fs.writeFileSync(path.join(root,'artifacts/pilot-release-test.json'),JSON.stringify({result:'PASS',releaseId:manifest.id,directory,filesVerified:manifest.files.length,checks:['file sizes and SHA256','runtime/private file exclusions','Pages/server asset parity','case-sensitive dashboard paths','pilot asset references','packaged backend startup on fresh disposable database','health/catalog/CSRF'],node:process.version,liveReady:false,productionDataTouched:false,realGatewayTested:false},null,2));
    console.log('PASS package integrity and isolated packaged-backend smoke checks');
  } catch(error) {fs.writeFileSync(path.join(isolated,'smoke.log'),logs);throw error;} finally {child.kill();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
