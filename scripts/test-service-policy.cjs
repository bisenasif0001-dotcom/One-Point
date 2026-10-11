const assert = require('node:assert/strict');
const rules = require('../assets/service-policy');
const catalog = require('../assets/catalog.json');
for (const slug of ['new-pan', 'pan-correction', 'card-reprint', 'e-pan-download', 'pan-aadhaar-link', 'duplicate-pan-surrender']) {
  const entry = rules.resolve(catalog, slug);
  assert.equal(entry.policy.id, slug);
  assert(entry.policy.fields.required.includes('email'));
  assert(entry.policy.fields.optional.includes('address'));
  assert(entry.policy.documents.required.length > 0);
}
const correction = rules.resolve(catalog, 'pan-correction');
assert(correction.policy.documents.required.some(label => /correction/i.test(label)), 'Exact correction proof must survive generic variant defaults');
const gst = rules.resolve(catalog, 'gst-registration');
assert(gst.policy.documents.required.some(label => /business address/i.test(label)), 'Optional postal field must not waive GST address proof');
const msme = rules.resolve(catalog, 'msme-registration');
assert(msme.policy.documents.required.some(label => /business/i.test(label)));
assert.equal(rules.resolve(catalog, 'company-registration').policy.purchase.mode, 'scope_review');
assert.equal(rules.resolve(catalog, 'visiting-cards', 'product').policy.purchase.configurationRules, 'unconfirmed');
assert.equal(rules.resolve(catalog, 'unknown-service'), null);
assert.equal(rules.resolve(catalog, 'fssai-license').policy.id, 'fssai');
assert.equal(rules.validateApplicant({ name: 'QA', phone: '9999999999', email: 'qa@example.com', address: '' }).length, 0);
assert(rules.validateApplicant({ name: 'QA', phone: '9999999999', email: '' }).length);
const fixture = { services: [{ slug: 'same-id', name: 'Main', price: 999, pricingModel: 'starting_from', requiredDocs: ['Specific proof'] }],
  serviceVariants: [{ slug: 'same-id', name: 'Variant', parentSlug: 'parent', price: 50, pricingModel: 'all_inclusive', requiredDocs: ['Identity proof'] }], products: [] };
assert.equal(rules.resolve(fixture, 'same-id').policy.pricing.amount, 50);
assert.deepEqual(rules.resolve(fixture, 'same-id').policy.documents.required, ['Identity proof', 'Specific proof']);
assert.equal(rules.resolve({ services: [{ ...fixture.services[0], active: false }], products: [] }, 'same-id'), null);
console.log('PASS: stable PAN IDs, exact proof requirements, mandatory email/optional address, variant pricing precedence and explicit unknown policies');
