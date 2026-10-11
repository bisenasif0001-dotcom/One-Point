(function () {
  'use strict';
  let busy = false;
  let gatewayScript;
  const headers = () => ({ 'Content-Type': 'application/json', 'X-Session-Token': localStorage.getItem('opds_customer_session') || '' });
  async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try { const response = await fetch(url, { ...options, signal: controller.signal }); return { response, data: await response.json() }; }
    finally { clearTimeout(timer); }
  }
  async function post(url, body) {
    const { response: csrfResponse, data: csrf } = await request('/api/csrf', { credentials: 'same-origin' });
    if (!csrfResponse.ok) throw new Error('Payment session unavailable. Please retry.');
    const { response, data } = await request(url, { method: 'POST', credentials: 'same-origin', headers: { ...headers(), 'X-CSRF-Token': csrf.csrfToken }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(data.message || 'Payment could not be resumed. Sign in to the account that owns this order.');
    return data;
  }
  function loadGateway() {
    if (window.Razorpay) return Promise.resolve();
    if (!gatewayScript) gatewayScript = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      const fail = () => { clearTimeout(timer); script.remove(); gatewayScript = null; reject(new Error('Payment gateway could not load. Check your connection and retry.')); };
      const timer = setTimeout(fail, 20000);
      script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = fail;
      document.head.append(script);
    });
    return gatewayScript;
  }
  async function retry(paymentId, gateway, button) {
    if (busy) return;
    if (!paymentId) throw new Error('Payment reference missing. Open your order or contact support before paying.');
    busy = true; if (button) button.disabled = true;
    const release = () => { busy = false; if (button) button.disabled = false; };
    try {
      const data = await post('/api/payments/retry', { paymentId, gateway });
      const payment = data.payment;
      if (!payment?.orderId) throw new Error('Order reference unavailable. Check your existing order before paying.');
      const statusUrl = type => type + '.html?order_id=' + encodeURIComponent(payment.orderId) + '&payment_id=' + encodeURIComponent(payment.paymentId);
      if (payment.sessionType === 'redirect' && payment.session?.redirectUrl) { location.href = payment.session.redirectUrl; return; }
      if (payment.sessionType !== 'razorpay_checkout') { location.href = statusUrl('payment-pending'); return; }
      await loadGateway();
      if (!window.Razorpay) throw new Error('Payment gateway unavailable. Please retry.');
      new window.Razorpay({ ...payment.session, modal: { ondismiss: release }, handler: async result => {
        try { await post('/api/payments/verify', { gateway: 'razorpay', ...result }); location.href = statusUrl('payment-success'); }
        catch { location.href = statusUrl('payment-pending'); }
        finally { release(); }
      } }).open();
    } catch (error) { release(); if (error.name === 'AbortError') throw new Error('Payment request timed out. Check the existing order status before retrying.'); throw error; }
  }
  window.OPDSPaymentRecovery = { retry };
})();
