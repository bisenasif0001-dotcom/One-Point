// Local diagnostic counters only. No external collector, URL, order or applicant data.
(function () {
  'use strict';
  const key = 'opds_pilot_counters_v1';
  const allowed = new Set(['service_selected', 'checkout_started', 'checkout_error', 'upload_error', 'payment_pending', 'payment_verified']);
  const seen = new Set();
  try { localStorage.removeItem('opds_analytics_logs'); } catch {}
  function track(event, options = {}) {
    if (!allowed.has(event)) return;
    if (options.once && seen.has(event)) return;
    if (options.once) seen.add(event);
    try {
      const day = new Date().toISOString().slice(0, 10);
      const device = innerWidth <= 720 ? 'phone' : innerWidth <= 1024 ? 'tablet' : 'desktop';
      let store = {}; try { store = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
      if (!store || typeof store !== 'object' || Array.isArray(store)) store = {};
      const clean = {};
      for (const date of Object.keys(store).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-6)) {
        clean[date] = {};
        for (const name of allowed) for (const size of ['phone', 'tablet', 'desktop']) {
          const countKey = name + ':' + size, count = store[date]?.[countKey];
          if (Number.isSafeInteger(count) && count > 0) clean[date][countKey] = count;
        }
      }
      clean[day] ||= {};
      const countKey = event + ':' + device;
      clean[day][countKey] = Math.min((clean[day][countKey] || 0) + 1, 1000000);
      localStorage.setItem(key, JSON.stringify(clean));
    } catch {} // Disabled/full browser storage must not interrupt booking.
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    try { const url = new URL(link.href, location.href); if (url.origin === location.origin && url.pathname.endsWith('/checkout.html')) track('service_selected'); } catch {}
  });
  window.OPDSPilotMetrics = Object.freeze({ track, reset: () => { try { localStorage.removeItem(key); } catch {} } });
})();
