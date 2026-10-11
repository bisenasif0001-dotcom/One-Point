(function () {
  'use strict';
  const assetUrl = new URL('catalog.json', document.currentScript.src).href;
  let dialog, opener, product;
  const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  async function loadProduct() {
    for (const url of ['/api/products', assetUrl]) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const catalog = await response.json();
        const entry = catalog.products?.find(item => item.slug === 'visiting-cards' && item.active !== false);
        if (entry) return entry;
      } catch {}
    }
    throw new Error('Price could not be loaded. Please try again.');
  }
  function update() {
    const button = dialog.querySelector('[data-pack-continue]');
    try {
      const packs = Number(dialog.querySelector('#print-pack-count').value);
      const quote = window.OPDSPrintProduct.quote(product, packs);
      try { sessionStorage.setItem('opds_print_packs', String(packs)); } catch {}
      dialog.querySelector('[data-pack-total]').textContent = `${quote.cards} cards · ${money(quote.total)} including ${money(quote.tax)} tax`;
      button.textContent = `Continue — ${money(quote.total)}`;
      button.disabled = false;
    } catch (error) {
      dialog.querySelector('[data-pack-total]').textContent = error.message;
      button.disabled = true;
    }
  }
  function create() {
    const element = document.createElement('dialog');
    element.className = 'quick-order-dialog'; element.id = 'print-order-dialog';
    element.setAttribute('aria-labelledby', 'print-order-title');
    element.innerHTML = `<div class="quick-order-head"><div><span class="quick-order-kicker">Visiting Cards</span><h2 id="print-order-title">Choose your pack count</h2></div><button type="button" class="quick-order-close" aria-label="Close product selection" autofocus>&times;</button></div>
      <p>100 cards per catalogue pack. Artwork and finish are reviewed before printing. Custom sizes or materials need a quote.</p>
      <label class="quick-order-details" for="print-pack-count">Number of packs</label>
      <input class="quick-order-input" id="print-pack-count" type="number" inputmode="numeric" min="1" max="10" step="1" value="1">
      <p data-pack-total role="status">Loading price…</p>
      <button class="eds-btn eds-btn-primary" type="button" data-pack-continue disabled>Continue</button>
      <a class="quick-order-details" href="https://wa.me/919473946181?text=Please%20quote%20custom%20visiting%20cards" target="_blank" rel="noopener">Get help with custom specifications</a>`;
    element.querySelector('.quick-order-close').addEventListener('click', () => element.close());
    element.querySelector('#print-pack-count').addEventListener('input', update);
    element.querySelector('[data-pack-continue]').addEventListener('click', () => {
      const quote = window.OPDSPrintProduct.quote(product, Number(element.querySelector('#print-pack-count').value));
      try { sessionStorage.setItem('opds_print_packs', String(quote.configuration.packs)); } catch {}
      const params = new URLSearchParams({ product: 'visiting-cards', qty: String(quote.configuration.packs), pack_size: '100' });
      location.href = 'checkout.html?' + params;
    });
    element.addEventListener('close', () => {
      if (element.open) return;
      document.documentElement.classList.remove('quick-order-open');
      opener?.focus({ preventScroll: true });
      if (history.state?.opdsQuickOrder === 'print') {
        const state = { ...history.state }; delete state.opdsQuickOrder;
        history.replaceState(state, '', location.href);
      }
    });
    element.addEventListener('click', event => {
      const rect = element.getBoundingClientRect();
      if (event.target === element && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) element.close();
    });
    document.body.append(element); return element;
  }
  async function open() {
    if (!dialog) dialog = create();
    try { dialog.querySelector('#print-pack-count').value = sessionStorage.getItem('opds_print_packs') || '1'; } catch {}
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('quick-order-open');
    try { product = product || await loadProduct(); update(); }
    catch (error) { dialog.querySelector('[data-pack-total]').textContent = error.message; }
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank') return;
    const url = new URL(link.href, location.href);
    const detail = url.pathname.endsWith('/product-detail.html') && url.searchParams.get('product') === 'visiting-cards';
    const detailBuy = location.pathname.endsWith('/product-detail.html') && new URL(location.href).searchParams.get('product') === 'visiting-cards' && ['pd-btn-buy', 'pd-floating-buy'].includes(link.id);
    if (url.origin !== location.origin || (!detail && !detailBuy)) return;
    if (window.OPDSLaunch?.isWhatsAppMode() || !window.HTMLDialogElement?.prototype.showModal) return;
    event.preventDefault(); opener = link;
    if (history.state?.opdsQuickOrder !== 'print') history.pushState({ ...history.state, opdsQuickOrder: 'print' }, '', location.href);
    open();
  }, true);
  function syncHistory() {
    if (history.state?.opdsQuickOrder === 'print') open();
    else if (dialog?.open) dialog.close();
  }
  window.addEventListener('popstate', syncHistory);
  window.addEventListener('pageshow', syncHistory);
})();
