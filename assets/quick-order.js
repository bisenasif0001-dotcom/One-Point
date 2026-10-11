(function () {
  "use strict";

  // Use the existing checkout identities; a broad PAN card must not silently
  // become a new-PAN order. Prices remain in the authoritative checkout.
  const variants = [
    ["new-pan", "New PAN Card Application", "Apply for a new PAN card"],
    ["pan-correction", "PAN Card Correction & Update Support", "Change or correct PAN details"],
    ["card-reprint", "PAN Card Reprint Assistance", "Request a physical card reprint"],
    ["e-pan-download", "Instant e-PAN Download Guidance", "Get help downloading an e-PAN"],
    ["pan-aadhaar-link", "PAN–Aadhaar Linking & Status Support", "Link PAN and Aadhaar or check status"],
    ["duplicate-pan-surrender", "Duplicate PAN Surrender Guidance", "Get help surrendering a duplicate PAN"]
  ];
  let dialog;
  let opener;
  function markSelection() {
    let selected;
    try { selected = sessionStorage.getItem('opds_pan_selection'); } catch {}
    dialog?.querySelectorAll('[data-variant]').forEach(link => {
      if (link.dataset.variant === selected) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function checkoutHref(slug, name) {
    if (window.OPDSLaunch?.isWhatsAppMode()) {
      return window.OPDSLaunch.buildServiceWhatsAppUrl(name, "government");
    }
    const params = new URLSearchParams({ service: slug, service_name: name });
    return `checkout.html?${params}`;
  }

  function createDialog() {
    const element = document.createElement("dialog");
    element.className = "quick-order-dialog";
    element.setAttribute("aria-labelledby", "quick-order-title");
    element.setAttribute("aria-describedby", "quick-order-description");
    element.innerHTML = `
      <div class="quick-order-head">
        <div><span class="quick-order-kicker">PAN Card Assistance</span>
          <h2 id="quick-order-title">Which service do you need?</h2></div>
        <button type="button" class="quick-order-close" aria-label="Close service selection" autofocus>&times;</button>
      </div>
      <p id="quick-order-description">Choose your task to go straight to checkout. Review the price and requirements before payment.</p>
      <div class="quick-order-options"></div>
      <a class="quick-order-details" href="service-pan-card.html">Read service details and requirements</a>
    `;
    const options = element.querySelector(".quick-order-options");
    for (const [slug, name, description] of variants) {
      const link = document.createElement("a");
      link.className = "quick-order-option";
      link.href = checkoutHref(slug, name);
      link.dataset.variant = slug;
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = name;
      const detail = document.createElement("small");
      detail.textContent = description;
      copy.append(title, detail);
      const arrow = document.createElement("span");
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      link.append(copy, arrow);
      options.append(link);
    }
    element.querySelector(".quick-order-close").addEventListener("click", () => element.close());
    element.addEventListener("click", event => {
      const rect = element.getBoundingClientRect();
      if (event.target === element && (event.clientX < rect.left || event.clientX > rect.right
        || event.clientY < rect.top || event.clientY > rect.bottom)) element.close();
    });
    element.addEventListener("close", () => {
      if (element.open) return;
      document.documentElement.classList.remove("quick-order-open");
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      if (history.state?.opdsQuickOrder === 'pan') {
        const state = { ...history.state }; delete state.opdsQuickOrder;
        history.replaceState(state, '', location.href);
      }
    });
    element.addEventListener('click', event => {
      const link = event.target.closest('[data-variant]');
      if (link) { try { sessionStorage.setItem('opds_pan_selection', link.dataset.variant); } catch {} }
    });
    document.body.append(element);
    return element;
  }

  document.addEventListener("click", event => {
    // Respect new-tab gestures and secondary detail links.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const trigger = event.target.closest('a[data-quick-order="pan"], [data-ai-suggestions] a[data-suggestion-idx]');
    if (!trigger || trigger.target === "_blank") return;
    const url = new URL(trigger.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.endsWith("/service-pan-card.html")) return;
    // Older browsers keep the original detail-page route as a usable fallback.
    if (typeof HTMLDialogElement === "undefined" || typeof HTMLDialogElement.prototype.showModal !== "function") return;
    event.preventDefault();
    opener = trigger;
    if (!dialog) dialog = createDialog();
    for (const [slug, name] of variants) {
      dialog.querySelector(`[data-variant="${slug}"]`).href = checkoutHref(slug, name);
    }
    if (!dialog.open) dialog.showModal();
    markSelection();
    if (history.state?.opdsQuickOrder !== 'pan') history.pushState({ ...history.state, opdsQuickOrder: 'pan' }, '', location.href);
    document.documentElement.classList.add("quick-order-open");
  }, true);
  function syncHistory() {
    if (history.state?.opdsQuickOrder === 'pan') {
      if (!dialog) dialog = createDialog();
      markSelection();
      if (!dialog.open) dialog.showModal();
      document.documentElement.classList.add('quick-order-open');
    } else if (dialog?.open) dialog.close();
  }
  window.addEventListener('popstate', syncHistory);
  window.addEventListener('pageshow', syncHistory);
})();
