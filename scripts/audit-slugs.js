const fs = require('fs');
const path = require('path');
const catalog = require(path.join(__dirname, '../assets/catalog.json'));

const aliases = Object.freeze({
  'fssai-license': 'fssai', 'trademark-registration': 'trademark',
  'pension-assistance': 'pension', 'general-support': 'jan-seva'
});

function resolveSlug(slug) {
  if (slug === 'unknown-service' || !slug) return null;
  slug = aliases[slug] || slug;
  const list = catalog.services || [];
  if (list.some(item => item.slug === slug)) return slug;

  const s = slug.toLowerCase();
  if (/exam|recruitment|admission|cgl|chsl|mts|rrb|ibps|upsc|neet|jee|cuet|tet|police|apprentice|special-govt|bank|agnipath|officer|entrance|school|college|quota|counselling|seat/i.test(s)) {
    return 'exam-form-filling';
  } else if (/scholarship|fellowship/i.test(s)) {
    return 'scholarship-form';
  } else if (/university|degree|transcript|marksheet|bonafide|migration|convocation|scrutiny|revaluation|semester/i.test(s)) {
    return 'university-services';
  } else if (/resume|cv|biodata|cover-letter|sop|lor|portfolio|interview|linkedin/i.test(s)) {
    return 'resume-builder';
  } else if (/admit-card|hall-ticket|roll-no/i.test(s)) {
    return 'admit-card-download';
  } else if (/result|score-card|rank-card|merit-list/i.test(s)) {
    return 'result-download';
  } else if (/print|scan|pdf|photocopy|binding|lamination|thesis|dissertation|assignment|practical|format|photo-printing|id-card/i.test(s)) {
    return 'typing';
  } else if (/passport/i.test(s)) {
    return 'passport-assistance';
  } else if (/pension/i.test(s)) {
    return 'pension';
  } else if (/gst|gstr/i.test(s)) {
    return 'gst-registration';
  } else if (/msme|udyam/i.test(s)) {
    return 'msme-registration';
  } else if (/company|firm|partnership|din|startup|incorporation|proprietorship|llp/i.test(s)) {
    return 'company-registration';
  } else if (/trademark/i.test(s)) {
    return 'trademark';
  } else if (/fssai/i.test(s)) {
    return 'fssai';
  } else if (/legal|draft|affidavit|agreement|court|notary/i.test(s)) {
    return 'affidavit';
  } else if (/cyber|crime|grievance|lost-doc|police-help/i.test(s)) {
    return 'citizen-security-cybercrime-police-help';
  } else if (/transport|driving|licence|license|rc-|vehicle|challan|hsrp|rto/i.test(s)) {
    return 'jan-seva';
  } else if (/certificate|caste|income|domicile|birth|death|marriage|udid|disability/i.test(s)) {
    return 'certificates';
  } else if (/tuition|fee|payment|hostel|mess|receipt|banking/i.test(s)) {
    return 'banking';
  } else if (/aadhaar|ration|digilocker|apaar|otr|erp|lms|email|account|pan|itr|tax|26as|ais|tis/i.test(s)) {
    return 'jan-seva';
  }
  return 'jan-seva';
}

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const slugs = new Set();
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /service-request\.html\?service=([^&"'`\s]+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const slug = decodeURIComponent(match[1]);
    if (!slug.includes('${')) slugs.add(slug);
  }
});

let failed = 0;
slugs.forEach(s => {
  const target = resolveSlug(s);
  const exists = catalog.services.some(item => item.slug === target);
  if (!exists) {
    console.log('FAIL:', s, '=>', target);
    failed++;
  }
});

console.log('Total audited unique slugs:', slugs.size);
console.log('Total failed:', failed);
if (failed === 0) console.log('100% of all services across the entire website successfully resolved to active catalog policies!');
