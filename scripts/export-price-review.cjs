// Read-only review export: never changes catalog prices or live orders.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),catalog=require('../assets/catalog.json'),engine=require('../backend/pricing-engine'),backend=require('../backend/catalog');
const money=n=>'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2});
const sources={pan:'https://www.incometaxindia.gov.in/en/pan',reprint:'https://onlineservices.proteantech.in/paam/ReprintEPan.html',udyam:'https://udyamregistration.gov.in/',gst:'https://gstcouncil.gov.in/node/3879',epan:'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/instant-e-pan',link:'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/link-aadhaar',fssai:'https://foscos.fssai.gov.in/fee/CL',aadhaar:'https://uidai.gov.in/kn/ecosystem-kn/enrolment-ecosystem-kn/aadhaar-seva-kendra-5.html'};
const confirmed={
  'new-pan':[107,'Indian address, paper/physical-document mode with physical PAN; other modes have different fees',sources.pan],
  'card-reprint':[50,'Protean eligible reprint dispatched within India',sources.reprint],
  'msme-registration':[0,'New Udyam registration on official portal; private assistance is separate',sources.udyam],
  'gst-registration':[0,'Fresh GST registration application; excludes tax liabilities and other tasks',sources.gst],
  'gst-new-registration':[0,'Fresh GST registration application only',sources.gst],
  'e-pan-download':[0,'Only eligible Income Tax instant e-PAN generation/download; other provider downloads may differ',sources.epan],
  'pan-aadhaar-link':[1000,'Only where paid PAN–Aadhaar linking applies; status-only/exempt cases differ',sources.link],
  'fssai-basic':[100,'Basic registration per year; selected validity and eligibility must be checked',sources.fssai],
  'fssai-central':[7500,'Central licence per year; selected validity and eligibility must be checked',sources.fssai]
};
const exact=new Map();for(const item of [...catalog.services,...catalog.serviceVariants])if(item.active!==false)exact.set(item.slug,item);
const variants=engine.getServiceVariantSeeds();
const rows=[...exact.values()].map(item=>{
  const seed=variants.find(v=>v.variantSlug===item.slug),main=backend.services.find(s=>s.slug===item.slug);
  const pricing=seed?engine.normalizeVariantPricing(seed):main?engine.normalizeServicePricing(main):null;
  const total=Number(item.pricing?.payableAmount??item.price),model=item.pricingModel;
  const gov=pricing?pricing.governmentFeePaise/100:null;
  const assist=pricing?(pricing.operatorFeePaise+pricing.convenienceFeePaise+pricing.gstPaise)/100:null;
  const proof=confirmed[item.slug];
  const mismatch=pricing&&pricing.pricePaise!==Math.round(total*100);
  const official=proof?money(proof[0])+' — conditional':'Confirmation pending';
  let combined='Final total pending official fee/scope';
  if(proof&&assist!==null&&!mismatch){
    if(model==='starting_from')combined=money(proof[0])+' + '+money(assist)+' = '+money(proof[0]+assist)+' onwards — estimate only; validity/scope pending';
    else if(model==='service_charge_plus_actual'||gov===proof[0])combined=money(proof[0])+' + '+money(assist)+' = '+money(proof[0]+assist)+' (conditions apply)';
    else combined='Official fee differs from configured split; final total needs review';
  }
  return {id:item.slug,name:item.name||item.serviceName,category:item.category,model,checkout:money(total)+(model==='starting_from'?' onwards':model==='service_charge_plus_actual'?' + actual charges':''),configuredGovernment:gov===null?'Split unavailable':money(gov)+' (catalog only)',assistance:assist===null?'Split unavailable':money(assist)+(mismatch?' — config differs from checkout':''),official,combined,note:[proof?.[1],mismatch?'Catalog/seed total conflict — do not use this split as final billing.':null,!proof?'No official amount verified for this exact task; zero in catalog is not proof of a free government service.':null].filter(Boolean).join(' '),source:proof?.[2]||''};
});
rows.sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
const pending=new Map();for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(path.join(root,file),'utf8');for(const match of html.matchAll(/service-request\.html\?[^"'<>\s`]+/g)){const url=new URL(match[0].replace(/&amp;/g,'&'),'http://local');const id=url.searchParams.get('service'),name=url.searchParams.get('service_name');if(!id||!name||id.includes('${')||name.includes('${')||exact.has(id))continue;const key=id+'|'+name;if(!pending.has(key))pending.set(key,{id,name,files:[]});pending.get(key).files.push(file);}}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headings=['Service','Current checkout price','Configured official fee','Configured assistance + convenience/tax','Officially verified fee','Government/official + assistance total','Conditions / review','Official source'];
const values=r=>[r.name+' ('+r.id+')',r.checkout,r.configuredGovernment,r.assistance,r.official,r.combined,r.note,r.source];
const intro=`Price review — 11 October 2026. ${rows.length} unique active catalog services/tasks and ${pending.size} request-only named entries. Products excluded because OneMart is paused. Local snapshot only; live admin pricing may differ. Official/portal fee includes relevant processing or statutory charge, not necessarily a government tax. Confirmed rates are conditional, not universal. Configured splits are separated from independently verified fees. Assistance includes configured convenience/GST so the split reconciles. No prices were changed.`;
const ref='Aadhaar reference: separate demographic update ₹75; biometric update ₹125 subject to category/exemptions. Broad Aadhaar assistance cannot use one universal fee. '+sources.aadhaar+' ; PVC ₹75: https://uidai.gov.in/kn/aadhaar-online-services . Existing broad Aadhaar seed uses ₹50 and needs review. Passport fees depend on age/pages/application type: https://www.passportindia.gov.in/psp/FeeCalculator . FSSAI state licence depends on category; do not quote a single universal fee.';
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts/service-price-list.json'),JSON.stringify({date:'2026-10-11',intro,rows,requestOnly:[...pending.values()],reference:ref},null,2));
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>One Point — service price review</title><style>body{font:15px system-ui;margin:24px;color:#162238}h1{font-size:28px}input{padding:12px;width:min(90%,500px)}table{border-collapse:collapse;width:100%;margin:20px 0}td,th{border:1px solid #d6deea;padding:10px;text-align:left;vertical-align:top}th{background:#eff5fb}a{overflow-wrap:anywhere}.scroll{overflow:auto}@media print{input,button{display:none}body{margin:0;font-size:10px}thead{display:table-header-group}}</style><h1>One Point: service price list</h1><p>${esc(intro)}</p><p>${esc(ref)}</p><input id="search" aria-label="Search services" placeholder="Search service name or ID"><button onclick="window.print()">Print / Save PDF</button><div class="scroll"><table><thead><tr>${headings.map(h=>'<th>'+esc(h)+'</th>').join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+values(r).map((v,i)=>'<td>'+(i===7&&v?'<a href="'+esc(v)+'">Official reference</a>':esc(v))+'</td>').join('')+'</tr>').join('')}</tbody></table></div><h2>Request-only tasks — final prices unconfigured</h2><p>These detailed tasks have no exact payable catalog price. Their parent service price is not a verified price for each task.</p><div class="scroll"><table><thead><tr><th>Task</th><th>ID</th><th>Government fee</th><th>Assistance fee</th><th>Page</th></tr></thead><tbody>${[...pending.values()].map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(r.id)+'</td><td>Pending</td><td>Pending</td><td>'+esc([...new Set(r.files)].join(', '))+'</td></tr>').join('')}</tbody></table></div><script>document.querySelector('#search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q));});</script></html>`;
fs.writeFileSync(path.join(root,'artifacts/service-price-list.html'),html);
fs.writeFileSync(path.join(root,'artifacts/service-price-list.md'),'# One Point service price list\n\n'+intro+'\n\n'+ref+'\n\n| '+headings.join(' | ')+' |\n| '+headings.map(()=>'---').join(' | ')+' |\n'+rows.map(r=>'| '+values(r).map(x=>String(x).replaceAll('|','/')).join(' | ')+' |').join('\n')+'\n\n## Request-only tasks\n\n'+[...pending.values()].map(r=>'- '+r.name+' (`'+r.id+'`): government fee and assistance price pending.').join('\n')+'\n');
console.log(JSON.stringify({catalogTasks:rows.length,requestOnlyTasks:pending.size,confirmedConditionalFees:rows.filter(r=>r.source).length,files:['artifacts/service-price-list.html','artifacts/service-price-list.md','artifacts/service-price-list.json']}));
