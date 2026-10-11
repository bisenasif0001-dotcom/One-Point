const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../assets/transaction-host.js'), 'utf8');
function run(href, origin, cart = [], hash = '') {
  let redirected, replaced;
  const values = new Map([['opds_cart', JSON.stringify(cart)]]);
  const context = { URL, URLSearchParams, console,
    window: { OPDSDeployment: { transactionOrigin: origin }, location: { href: href + hash, replace: value => { redirected = value; } } },
    localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) },
    history: { replaceState: (_state, _title, value) => { replaced = value; } } };
  vm.runInNewContext(code, context);
  return { redirected, replaced, values };
}
assert.equal(run('http://127.0.0.1:4180/checkout.html?service=new-pan', '').redirected, undefined);
assert.equal(run('http://127.0.0.1:4180/checkout.html?service=new-pan', 'https://orders.example').redirected, undefined);
const selected = run('https://store.example/One-Point/checkout.html?service=pan-correction&email=private@example.com&phone=9999999999', 'https://orders.example');
assert.equal(selected.redirected, 'https://orders.example/checkout.html?service=pan-correction');
assert.equal(run('https://store.example/services.html', 'https://orders.example').redirected, undefined);
assert.equal(run('https://orders.example/checkout.html', 'https://orders.example').redirected, undefined);
assert.equal(run('https://store.example/checkout.html', 'http://orders.example').redirected, undefined);
const cart = [{ slug: 'pan-correction', type: 'service', quantity: 1, price: 1, name: 'private name', email: 'private@example.com' }];
const handed = run('https://store.example/checkout.html', 'https://orders.example', cart);
assert(!handed.redirected.includes('private'), 'Only public cart identities can cross hosts');
const target = new URL(handed.redirected);
const received = run(target.origin + target.pathname, target.origin, [], target.hash);
assert.deepEqual(JSON.parse(received.values.get('opds_cart')), [{ slug: 'pan-correction', type: 'service', quantity: 1 }]);
assert.equal(received.replaced, '/checkout.html');
for (const file of ['checkout', 'login', 'signup', 'otp-login', 'payment-success', 'payment-pending', 'payment-failed',
  'track-application', 'customer-profile', 'customer-account-overview', 'customer-account-orders',
  'customer-account-order-detail', 'customer-account-invoices', 'customer-account-payments', 'customer-account-vault', 'customer-account-notifications']) {
  const html = fs.readFileSync(path.join(__dirname, '..', file + '.html'), 'utf8');
  assert(html.includes('assets/deployment-config.js') && html.includes('assets/transaction-host.js'), file + ' routing missing');
}
console.log('PASS: local mode, trusted host routing, exact variant, public cart handoff and privacy allowlist');
