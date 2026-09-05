(function () {
  "use strict";

  let allOrders = [];
  const params = new URLSearchParams(window.location.search);
  let activePrimaryFilter = params.get("filter") || "all";
  let activeCategory = "all";
  let activeSort = "newest";
  let searchTerm = "";

  function byId(id) { return document.getElementById(id); }

  function renderMiniSummary(orders) {
    const acc = window.OPDSAccount;
    const summaryContainer = byId("acc-orders-mini-summary");
    if (!summaryContainer) return;

    let activeCount = 0;
    let actionCount = 0;
    let completedCount = 0;

    orders.forEach((o) => {
      const b = acc.classifyOrder(o);
      if (b === "active") activeCount++;
      else if (b === "action") actionCount++;
      else if (b === "completed") completedCount++;
    });

    summaryContainer.innerHTML = `
      <button type="button" class="acc-summary-pill ${activePrimaryFilter === 'all' ? 'active' : ''}" data-stat-filter="all">
        <strong>${orders.length}</strong> Total
      </button>
      <span class="acc-summary-dot">&middot;</span>
      <button type="button" class="acc-summary-pill ${activePrimaryFilter === 'active' ? 'active' : ''}" data-stat-filter="active">
        <strong>${activeCount}</strong> Active
      </button>
      <span class="acc-summary-dot">&middot;</span>
      <button type="button" class="acc-summary-pill ${activePrimaryFilter === 'action' ? 'active' : ''} ${actionCount > 0 ? 'acc-pill-urgent' : ''}" data-stat-filter="action">
        <strong>${actionCount}</strong> Action Needed
      </button>
      <span class="acc-summary-dot">&middot;</span>
      <button type="button" class="acc-summary-pill ${activePrimaryFilter === 'completed' ? 'active' : ''}" data-stat-filter="completed">
        <strong>${completedCount}</strong> Completed
      </button>
    `;

    summaryContainer.querySelectorAll("[data-stat-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activePrimaryFilter = btn.getAttribute("data-stat-filter");
        const statusSelect = byId("filter-primary-status");
        if (statusSelect) statusSelect.value = activePrimaryFilter;
        updateFilterUrl();
        renderMiniSummary(allOrders);
        renderSpotlight(allOrders);
        renderList();
      });
    });
  }

  function updateFilterUrl() {
    const url = new URL(window.location);
    if (activePrimaryFilter === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", activePrimaryFilter);
    window.history.replaceState({}, "", url);
    updateResetButton();
  }

  function updateResetButton() {
    const resetBtn = byId("acc-clear-all-filters-btn");
    if (!resetBtn) return;
    const isFiltered = activePrimaryFilter !== "all" || activeCategory !== "all" || activeSort !== "newest" || searchTerm.trim() !== "";
    resetBtn.hidden = !isFiltered;
  }

  function getMilestoneStep(order) {
    const status = String(order.status || "").toLowerCase();
    const payStatus = String(order.paymentStatus || "").toLowerCase();
    if (payStatus !== "paid" && ["pending", "created", "session_created", "failed"].includes(payStatus)) {
      return 1; // Payment stage
    }
    if (["documents_required", "documents_pending", "under_review", "draft_ready", "draft_review"].includes(status)) {
      return 2; // Document / Draft review
    }
    if (["processing", "portal_submitted", "submitted", "in_process", "in_progress"].includes(status)) {
      return 3; // Portal filing
    }
    if (["completed", "delivered"].includes(status)) {
      return 4; // Completed / Delivered
    }
    return 2;
  }

  function renderSpotlight(orders) {
    const acc = window.OPDSAccount;
    const spotlightEl = byId("acc-orders-spotlight");
    if (!spotlightEl) return;

    if (activePrimaryFilter === "completed") {
      spotlightEl.hidden = true;
      return;
    }

    const actionOrder = orders.find((o) => acc.classifyOrder(o) === "action");
    if (!actionOrder) {
      spotlightEl.hidden = true;
      return;
    }

    const reqAction = acc.getRequestAction(actionOrder);
    const orderId = acc.escapeHtml(actionOrder.orderId || "");
    const serviceName = acc.escapeHtml(actionOrder.items?.[0]?.name || "Service Application");
    const payStatus = String(actionOrder.paymentStatus || "").toLowerCase();
    const isPaid = ["paid", "captured", "success", "settled"].includes(payStatus);

    spotlightEl.hidden = false;
    spotlightEl.innerHTML = `
      <div class="acc-spotlight-card">
        <div class="acc-spotlight-header">
          <div class="acc-spotlight-badge-row">
            <span class="acc-spotlight-tag">NEEDS YOUR ATTENTION</span>
            <strong class="acc-spotlight-order-id">Request <code>${orderId}</code></strong>
          </div>
          <span class="acc-spotlight-count">1 Action Required</span>
        </div>
        <div class="acc-spotlight-body">
          <div class="acc-spotlight-main">
            <div class="acc-spotlight-title-row">
              ${acc.categoryBadgeHtml(actionOrder)}
              <h3 class="acc-spotlight-title">${serviceName}</h3>
            </div>
            <p class="acc-spotlight-desc">${acc.escapeHtml(reqAction.message)}</p>
            <div class="acc-spotlight-meta">
              <span>Draft Review</span> &middot;
              <span>${isPaid ? `${acc.money(actionOrder.amount)} Paid` : `Payment Due ${acc.money(actionOrder.amount)}`}</span> &middot;
              <span>Updated recently</span>
            </div>
          </div>
          <div class="acc-spotlight-actions">
            ${reqAction.actionType === "pay" ? `
              <button type="button" class="eds-btn eds-btn-primary acc-spotlight-cta" data-spotlight-pay="${actionOrder.orderId}">
                <i data-lucide="credit-card"></i> ${reqAction.ctaLabel}
              </button>
            ` : `
              <a href="customer-account-order-detail.html?id=${encodeURIComponent(actionOrder.orderId)}" class="eds-btn eds-btn-primary acc-spotlight-cta">
                ${reqAction.ctaLabel} <i data-lucide="arrow-right" style="width:14px; height:14px;"></i>
              </a>
            `}
          </div>
        </div>
      </div>
    `;

    const payBtn = spotlightEl.querySelector("[data-spotlight-pay]");
    if (payBtn) {
      payBtn.addEventListener("click", () => acc.resumePayment(actionOrder, payBtn));
    }
  }

  function renderList() {
    const acc = window.OPDSAccount;
    const container = byId("acc-order-list");
    if (!container) return;

    const term = searchTerm.trim().toLowerCase();

    // 1. Zero orders state
    if (!allOrders.length) {
      container.innerHTML = `
        <div class="acc-empty-state acc-empty-state-rich">
          <span><i data-lucide="package-open"></i></span>
          <strong>No requests yet</strong>
          <p>Your applications, print jobs, orders and projects will appear here.</p>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">
            <a class="eds-btn eds-btn-primary" href="services.html"><i data-lucide="plus-circle"></i> Browse Services</a>
            <a class="eds-btn eds-btn-secondary" href="support.html"><i data-lucide="help-circle"></i> Need Help Choosing?</a>
          </div>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // 2. Filter orders
    const filtered = allOrders.filter((order) => {
      const bucket = acc.classifyOrder(order);
      const cat = acc.getServiceCategory(order);

      if (activePrimaryFilter !== "all" && bucket !== activePrimaryFilter) return false;
      if (activeCategory !== "all" && cat.slug !== activeCategory) return false;

      if (term) {
        const sName = String(order.items?.[0]?.name || "");
        const orderId = String(order.orderId || "");
        const catName = cat.label;
        const matched = orderId.toLowerCase().includes(term) || sName.toLowerCase().includes(term) || catName.toLowerCase().includes(term);
        if (!matched) return false;
      }

      return true;
    });

    // 3. Sort orders
    filtered.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      const aUpdate = new Date(a.updatedAt || a.createdAt).getTime();
      const bUpdate = new Date(b.updatedAt || b.createdAt).getTime();

      if (activeSort === "oldest") return aTime - bTime;
      if (activeSort === "updated") return bUpdate - aUpdate;
      return bTime - aTime;
    });

    // 4. Empty filter state
    if (!filtered.length) {
      container.innerHTML = `
        <div class="acc-empty-state acc-empty-state-rich">
          <span><i data-lucide="search-x"></i></span>
          <strong>No matching requests found</strong>
          <p>Try another status or clear your search and filters.</p>
          <button type="button" class="eds-btn eds-btn-secondary" id="acc-clear-filter-btn">
            <i data-lucide="rotate-ccw"></i> Reset Filters
          </button>
        </div>`;
      const clearBtn = byId("acc-clear-filter-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", resetAllFilters);
      }
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // 5. Partition orders into In-Progress and Completed
    const inProgressOrders = [];
    const completedOrders = [];

    filtered.forEach((order) => {
      const bucket = acc.classifyOrder(order);
      if (bucket === "completed" || bucket === "cancelled" || bucket === "refunded") {
        completedOrders.push(order);
      } else {
        inProgressOrders.push(order);
      }
    });

    let html = "";

    // Section 1: In Progress / Active Requests (Visual Journey Rows)
    if (inProgressOrders.length > 0) {
      html += `
        <section class="acc-journey-section">
          <div class="acc-section-head">
            <div>
              <h2><i data-lucide="navigation"></i> Active Service Journeys</h2>
              <p>${inProgressOrders.length} ${inProgressOrders.length === 1 ? 'application actively in progress' : 'applications actively in progress'}</p>
            </div>
          </div>
          <div class="acc-journey-list">
            ${inProgressOrders.map((order) => {
              const step = getMilestoneStep(order);
              const bucket = acc.classifyOrder(order);
              const isActionNeeded = bucket === "action";
              const orderId = acc.escapeHtml(order.orderId || "");
              const serviceName = acc.escapeHtml(order.items?.[0]?.name || "Service Application");
              const isPaid = String(order.paymentStatus || "").toLowerCase() === "paid" || String(order.paymentStatus || "").toLowerCase() === "captured";
              const payLabel = isPaid ? "Paid" : "Payment Due";
              const stageName = step === 1 ? "Payment Required" : (step === 2 ? "Draft Review" : (step === 3 ? "Portal Filing" : "Delivered"));
              const stepProgress = `${step} of 4 stages`;

              return `
                <article class="acc-journey-row ${isActionNeeded ? 'acc-journey-row-urgent' : ''}">
                  <div class="acc-journey-row-top">
                    <!-- Left Service & Meta -->
                    <div class="acc-journey-info">
                      <div class="acc-journey-head">
                        ${acc.categoryBadgeHtml(order)}
                        <a href="customer-account-order-detail.html?id=${encodeURIComponent(order.orderId)}" class="acc-journey-title">
                          <strong>${serviceName}</strong>
                        </a>
                      </div>
                      <div class="acc-journey-subline">
                        <span class="acc-order-id-pill">
                          <code>${orderId}</code>
                          <button type="button" class="acc-copy-btn" data-copy-text="${orderId}" title="Copy Tracking ID">
                            <i data-lucide="copy" style="width: 11px; height: 11px;"></i>
                          </button>
                        </span>
                        <span class="acc-journey-date">&middot; Placed ${acc.formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    <!-- Finance & Action (Flat, no wrapper boxes) -->
                    <div class="acc-journey-finance">
                      <strong class="acc-journey-amount">${acc.money(order.amount)}</strong>
                      <small class="acc-journey-pay-status ${isPaid ? 'paid' : 'due'}">${payLabel}</small>
                    </div>
                    <a href="customer-account-order-detail.html?id=${encodeURIComponent(order.orderId)}" class="acc-btn-journey-view">
                      <span>View Request</span> <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                    </a>
                  </div>

                  <!-- Mini Progress Stepper Track -->
                  <div class="acc-journey-stepper" aria-label="Journey Progress">
                    <div class="journey-step ${step >= 1 ? 'done' : ''} ${step === 1 ? 'current' : ''}">
                      <span class="journey-dot">${step > 1 ? '✓' : (step === 1 ? '●' : '○')}</span>
                      <span class="journey-lbl">Payment</span>
                    </div>
                    <span class="journey-track ${step >= 2 ? 'done' : ''}"></span>
                    <div class="journey-step ${step >= 2 ? 'done' : ''} ${step === 2 ? 'current' : ''}">
                      <span class="journey-dot">${step > 2 ? '✓' : (step === 2 ? '●' : '○')}</span>
                      <span class="journey-lbl">Draft Review</span>
                    </div>
                    <span class="journey-track ${step >= 3 ? 'done' : ''}"></span>
                    <div class="journey-step ${step >= 3 ? 'done' : ''} ${step === 3 ? 'current' : ''}">
                      <span class="journey-dot">${step > 3 ? '✓' : (step === 3 ? '●' : '○')}</span>
                      <span class="journey-lbl">Portal Filing</span>
                    </div>
                    <span class="journey-track ${step >= 4 ? 'done' : ''}"></span>
                    <div class="journey-step ${step >= 4 ? 'done' : ''} ${step === 4 ? 'current' : ''}">
                      <span class="journey-dot">${step === 4 ? '✓' : '○'}</span>
                      <span class="journey-lbl">Delivered</span>
                    </div>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }

    // Section 2: Completed / Service History (Compact History Rows)
    if (completedOrders.length > 0) {
      html += `
        <section class="acc-history-section">
          <div class="acc-section-head">
            <div>
              <h2><i data-lucide="check-circle-2"></i> Completed &amp; Archived History</h2>
              <p>${completedOrders.length} ${completedOrders.length === 1 ? 'delivered request' : 'delivered requests'}</p>
            </div>
          </div>
          <div class="acc-history-list">
            ${completedOrders.map((order) => {
              const orderId = acc.escapeHtml(order.orderId || "");
              const serviceName = acc.escapeHtml(order.items?.[0]?.name || "Service Application");
              const completedDate = acc.formatDate(order.updatedAt || order.createdAt);

              return `
                <article class="acc-history-row">
                  <div class="acc-history-left">
                    <span class="acc-history-icon"><i data-lucide="check-circle-2"></i></span>
                    <div class="acc-history-info">
                      <div class="acc-history-title-row">
                        ${acc.categoryBadgeHtml(order)}
                        <a href="customer-account-order-detail.html?id=${encodeURIComponent(order.orderId)}" class="acc-history-title">
                          <strong>${serviceName}</strong>
                        </a>
                      </div>
                      <div class="acc-history-meta">
                        <span>Completed on ${completedDate}</span> &middot;
                        <code>${orderId}</code>
                      </div>
                    </div>
                  </div>

                  <div class="acc-history-right">
                    <strong class="acc-history-amount">${acc.money(order.amount)} Paid</strong>
                    <div class="acc-history-links">
                      <a href="customer-account-order-detail.html?id=${encodeURIComponent(order.orderId)}" class="acc-history-btn">
                        View Details
                      </a>
                      <a href="customer-account-invoices.html" class="acc-history-btn">
                        Receipt
                      </a>
                      <a href="services.html" class="acc-history-repeat-link" title="Re-order or start another service">
                        Start Similar &rarr;
                      </a>
                    </div>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }

    container.innerHTML = html;

    container.querySelectorAll("[data-copy-text]").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = button.getAttribute("data-copy-text");
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          const orig = button.innerHTML;
          button.innerHTML = `<span style="font-size:9px; color:#15803d; font-weight:700;">Copied</span>`;
          setTimeout(() => { button.innerHTML = orig; if (window.lucide) window.lucide.createIcons(); }, 1600);
        }).catch(() => {});
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function resetAllFilters() {
    activePrimaryFilter = "all";
    activeCategory = "all";
    activeSort = "newest";
    searchTerm = "";

    const statusSelect = byId("filter-primary-status");
    const catSelect = byId("filter-service-type");
    const sortSelect = byId("filter-sort-order");
    const searchInput = byId("acc-order-search");

    if (statusSelect) statusSelect.value = "all";
    if (catSelect) catSelect.value = "all";
    if (sortSelect) sortSelect.value = "newest";
    if (searchInput) searchInput.value = "";

    updateFilterUrl();
    renderMiniSummary(allOrders);
    renderSpotlight(allOrders);
    renderList();
  }

  window.OPDSAccount.ready.then((data) => {
    if (!data) return;
    allOrders = data.orders;

    renderMiniSummary(allOrders);
    renderSpotlight(allOrders);
    renderList();

    // Bind Command Bar Controls
    const searchInput = byId("acc-order-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        updateResetButton();
        renderList();
      });
    }

    const statusSelect = byId("filter-primary-status");
    if (statusSelect) {
      statusSelect.value = activePrimaryFilter;
      statusSelect.addEventListener("change", (e) => {
        activePrimaryFilter = e.target.value;
        updateFilterUrl();
        renderMiniSummary(allOrders);
        renderSpotlight(allOrders);
        renderList();
      });
    }

    const catSelect = byId("filter-service-type");
    if (catSelect) {
      catSelect.addEventListener("change", (e) => {
        activeCategory = e.target.value;
        updateResetButton();
        renderList();
      });
    }

    const sortSelect = byId("filter-sort-order");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        activeSort = e.target.value;
        updateResetButton();
        renderList();
      });
    }

    const resetBtn = byId("acc-clear-all-filters-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetAllFilters);
    }

    if (window.lucide) window.lucide.createIcons();
  }).catch((error) => {
    console.error("[customer-account-orders]", error);
  });
})();
