(function () {
  'use strict';
  const configured = window.OPDSDeployment?.transactionOrigin;
  if (!configured) return;
  let destination;
  try {
    destination = new URL(configured);
    if (destination.protocol !== 'https:' || destination.username || destination.password ||
        destination.pathname !== '/' || destination.search || destination.hash) throw new Error('Invalid transaction origin');
  } catch {
    console.error('Configure a trusted HTTPS origin for OPDS transactions.');
    return;
  }
  const current = new URL(window.location.href);
  if (current.hostname === 'localhost' || current.hostname === '127.0.0.1') return;
  const page = current.pathname.split('/').pop();
  const pages = new Set(['order-documents.html', 'checkout.html', 'login.html', 'signup.html', 'otp-login.html',
    'payment-success.html', 'payment-pending.html', 'payment-failed.html', 'track-application.html',
    'customer-profile.html', 'customer-account-overview.html', 'customer-account-orders.html',
    'customer-account-order-detail.html', 'customer-account-invoices.html', 'customer-account-payments.html',
    'customer-account-vault.html', 'customer-account-notifications.html']);
  if (!pages.has(page)) return;
  const cleanCart = items => Array.isArray(items) ? items.slice(0, 30).filter(item =>
    item && typeof item.slug === 'string' && /^[a-z0-9-]{1,120}$/.test(item.slug)).map(item => ({
      slug: item.slug, type: item.type === 'service' ? 'service' : 'product',
      quantity: Math.max(1, Math.min(999, parseInt(item.quantity, 10) || 1))
    })) : [];
  if (current.origin === destination.origin) {
    // Only public item identities cross hosts. Profiles, documents and tokens stay local.
    const fragment = new URLSearchParams(current.hash.slice(1));
    if (page === 'checkout.html' && fragment.has('opds_items')) {
      try {
        const cart = cleanCart(JSON.parse(fragment.get('opds_items')));
        if (cart.length) localStorage.setItem('opds_cart', JSON.stringify(cart));
      } catch { /* Invalid handoff does not overwrite an existing cart. */ }
      fragment.delete('opds_items');
      history.replaceState(null, '', current.pathname + current.search + (fragment.size ? '#' + fragment : ''));
    }
    return;
  }
  const target = new URL('/' + page, destination);
  // Explicit allowlist prevents personal/applicant details or auth tokens entering URLs.
    for (const key of ['service', 'service_name', 'product', 'qty', 'pack_size', 'order', 'order_id', 'payment_id', 'id', 'redirect']) {
    if (current.searchParams.has(key)) target.searchParams.set(key, current.searchParams.get(key));
  }
  if (page === 'checkout.html' && !target.searchParams.has('service') && !target.searchParams.has('product')) {
    try {
      const cart = cleanCart(JSON.parse(localStorage.getItem('opds_cart') || '[]'));
      if (cart.length) target.hash = new URLSearchParams({ opds_items: JSON.stringify(cart) }).toString();
    } catch { /* Customer can select the item again if their saved cart is invalid. */ }
  }
  window.location.replace(target.href);
})();
