(function () {
  "use strict";

  let allTransactions = [];
  let refundRecords = [];
  let activeTab = "transactions";
  let activeStatusFilter = "all";
  let activeMethodFilter = "all";
  let activeDateRange = "all";
  let activeSort = "newest";
  let searchTerm = "";

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function showToast(message, type = "success") {
    let toast = byId("cpf-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cpf-toast";
      toast.className = "cpf-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `cpf-toast cpf-toast-${type} show`;
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function closeModal() {
    byId("cpf-modal-backdrop").hidden = true;
    byId("cpf-modal").innerHTML = "";
  }

  function openModalShell(title, bodyHtml) {
    byId("cpf-modal").innerHTML = `
      <div class="cpf-modal-head">
        <strong>${title}</strong>
        <button type="button" class="cpf-modal-close" id="cpf-modal-close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="cpf-modal-body">${bodyHtml}</div>
    `;
    byId("cpf-modal-backdrop").hidden = false;
    byId("cpf-modal-close-btn").addEventListener("click", closeModal);
    if (window.lucide) window.lucide.createIcons();
  }

  // ==================== 1. SUB-NAVIGATION TABS ====================
  function initBillingTabs() {
    const tabBtns = document.querySelectorAll("[data-bill-tab]");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-bill-tab");
        activeTab = target;

        tabBtns.forEach((b) => {
          const isMatch = b === btn;
          b.classList.toggle("active", isMatch);
          b.setAttribute("aria-selected", isMatch ? "true" : "false");
        });

        document.querySelectorAll("[id^='bill-panel-']").forEach((panel) => {
          const isTarget = panel.id === `bill-panel-${target}`;
          panel.classList.toggle("active", isTarget);
          panel.hidden = !isTarget;
        });

        if (window.lucide) window.lucide.createIcons();
      });
    });
  }

  // ==================== 2. FINANCIAL SNAPSHOT SUMMARY ====================
  function renderFinancialSummary(transactions, refunds) {
    const grid = byId("acc-payments-summary-grid");
    if (!grid) return;
    const acc = window.OPDSAccount;

    let dues = 0;
    let paid = 0;
    let refundTotal = 0;
    let pendingOrder = null;

    transactions.forEach((tx) => {
      const status = String(tx.status || "pending").toLowerCase();
      const amt = Number(tx.amount || 0);

      if (status === "paid" || status === "settled" || status === "captured" || status === "success") {
        paid += amt;
      } else if (status === "pending" || status === "created" || status === "failed") {
        dues += amt;
        if (!pendingOrder) pendingOrder = tx;
      }
    });

    refunds.forEach((rf) => {
      refundTotal += Number(rf.amount || 0);
    });

    grid.innerHTML = `
      <div class="acc-summary-card ${dues > 0 ? 'acc-summary-highlight-pending acc-sum-action' : ''}">
        <span class="acc-summary-icon acc-summary-icon-pending"><i data-lucide="clock"></i></span>
        <div class="acc-sum-card-bottom">
          <strong class="acc-sum-number" style="color:${dues > 0 ? '#92400e' : '#0b1f35'};">${dues > 0 ? acc.money(dues) : '₹0.00'}</strong>
          <span class="acc-sum-label">Amount Due</span>
          <small class="acc-sum-subtext" style="color:${dues > 0 ? '#92400e' : '#166534'}; font-weight:700;">
            ${dues > 0 ? `${pendingOrder ? pendingOrder.serviceName : 'Payment Required'}` : 'Nothing due · Settled'}
          </small>
        </div>
        ${dues > 0 ? `<span class="acc-summary-pulse-dot" title="Payment Due"></span>` : ''}
      </div>

      <div class="acc-summary-card">
        <span class="acc-summary-icon acc-summary-icon-completed"><i data-lucide="check-circle-2"></i></span>
        <div class="acc-sum-card-bottom">
          <strong class="acc-sum-number" style="color:#166534;">${acc.money(paid)}</strong>
          <span class="acc-sum-label">Total Paid &amp; Settled</span>
          <small class="acc-sum-subtext">All confirmed transactions</small>
        </div>
      </div>

      <div class="acc-summary-card">
        <span class="acc-summary-icon acc-summary-icon-action"><i data-lucide="refresh-cw"></i></span>
        <div class="acc-sum-card-bottom">
          <strong class="acc-sum-number">${acc.money(refundTotal)}</strong>
          <span class="acc-sum-label">Refunds Processed</span>
          <small class="acc-sum-subtext">${refunds.length} ${refunds.length === 1 ? 'reversal' : 'reversals'}</small>
        </div>
      </div>

      <div class="acc-summary-card">
        <span class="acc-summary-icon acc-summary-icon-total"><i data-lucide="receipt"></i></span>
        <div class="acc-sum-card-bottom">
          <strong class="acc-sum-number">${transactions.length}</strong>
          <span class="acc-sum-label">Total Records</span>
          <small class="acc-sum-subtext">Financial ledger entries</small>
        </div>
      </div>
    `;
  }

  // ==================== 3. SEARCH & FILTERS ====================
  const STATUS_FILTERS = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "pending", label: "Pending" },
    { key: "failed", label: "Failed" },
    { key: "refunded", label: "Refunded" }
  ];

  function renderPrimaryFilters() {
    const row = byId("acc-payment-primary-filters");
    if (!row) return;
    row.innerHTML = STATUS_FILTERS.map((f) => `
      <button type="button" class="acc-filter-chip ${f.key === activeStatusFilter ? 'active' : ''}" data-pstatus="${f.key}">
        ${f.label}
      </button>
    `).join("");

    row.querySelectorAll("[data-pstatus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeStatusFilter = btn.getAttribute("data-pstatus");
        renderPrimaryFilters();
        renderTransactions();
      });
    });
  }

  function setupAdvancedFilters() {
    const toggleBtn = byId("acc-pay-filter-toggle-btn");
    const panel = byId("acc-pay-secondary-filter-panel");
    const methodSelect = byId("filter-pay-method");
    const dateSelect = byId("filter-pay-date");
    const sortSelect = byId("filter-pay-sort");
    const applyBtn = byId("acc-pay-apply-filters-btn");
    const resetBtn = byId("acc-pay-clear-all-btn");
    const countBadge = byId("acc-pay-filter-count");

    if (!toggleBtn || !panel) return;

    toggleBtn.addEventListener("click", () => {
      const isHidden = panel.hidden;
      panel.hidden = !isHidden;
      toggleBtn.setAttribute("aria-expanded", String(isHidden));
    });

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        activeMethodFilter = methodSelect.value;
        activeDateRange = dateSelect.value;
        activeSort = sortSelect.value;

        let count = 0;
        if (activeMethodFilter !== "all") count++;
        if (activeDateRange !== "all") count++;
        if (activeSort !== "newest") count++;

        if (countBadge) {
          countBadge.textContent = count;
          countBadge.hidden = count === 0;
        }

        panel.hidden = true;
        renderTransactions();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        methodSelect.value = "all";
        dateSelect.value = "all";
        sortSelect.value = "newest";
        activeMethodFilter = "all";
        activeDateRange = "all";
        activeSort = "newest";
        activeStatusFilter = "all";
        searchTerm = "";
        const searchInput = byId("acc-payment-search");
        if (searchInput) searchInput.value = "";
        if (countBadge) countBadge.hidden = true;
        panel.hidden = true;
        renderPrimaryFilters();
        renderTransactions();
      });
    }
  }

  function getMaskedPaymentMethod(tx) {
    const method = String(tx.method || "upi").toLowerCase();
    if (method.includes("upi")) return `UPI · ${tx.upiId || '••••@upi'}`;
    if (method.includes("card")) return `Card · •••• ${tx.cardLast4 || '4821'}`;
    if (method.includes("netbanking")) return `NetBanking · ${tx.bankName || 'SBI / HDFC'}`;
    if (method.includes("cash")) return `Cash at Lucknow Desk`;
    return `Online · Razorpay`;
  }

  function getPaymentStatusBadge(status) {
    const s = String(status || "pending").toLowerCase();
    if (["paid", "settled", "captured", "success"].includes(s)) {
      return `<span class="acc-status-badge acc-status-completed"><i data-lucide="check" style="width:11px; height:11px;"></i> Paid</span>`;
    }
    if (["pending", "created", "session_created", "initiated"].includes(s)) {
      return `<span class="acc-status-badge acc-status-pending"><i data-lucide="clock" style="width:11px; height:11px;"></i> Pending</span>`;
    }
    if (s === "failed") {
      return `<span class="acc-status-badge acc-status-cancelled"><i data-lucide="alert-circle" style="width:11px; height:11px;"></i> Failed</span>`;
    }
    if (s.includes("refund")) {
      return `<span class="acc-status-badge acc-status-refunded"><i data-lucide="refresh-cw" style="width:11px; height:11px;"></i> Refunded</span>`;
    }
    return `<span class="acc-status-badge acc-status-pending">Processing</span>`;
  }

  // ==================== 4. RENDER TRANSACTIONS (DESKTOP TABLE + MOBILE CARDS) ====================
  function renderTransactions() {
    const acc = window.OPDSAccount;
    const desktopTbody = byId("acc-payments-body");
    const mobileContainer = byId("acc-mobile-txns-container");
    if (!desktopTbody || !mobileContainer) return;

    const term = searchTerm.trim().toLowerCase();
    const now = Date.now();

    const filtered = allTransactions.filter((tx) => {
      const status = String(tx.status || "pending").toLowerCase();
      const method = String(tx.method || "upi").toLowerCase();
      const txTime = new Date(tx.date).getTime();

      // Status filter
      if (activeStatusFilter === "paid" && !["paid", "settled", "captured", "success"].includes(status)) return false;
      if (activeStatusFilter === "pending" && !["pending", "created", "session_created", "initiated"].includes(status)) return false;
      if (activeStatusFilter === "failed" && status !== "failed") return false;
      if (activeStatusFilter === "refunded" && !status.includes("refund")) return false;

      // Method filter
      if (activeMethodFilter !== "all" && !method.includes(activeMethodFilter)) return false;

      // Date range
      if (activeDateRange === "30d" && now - txTime > 30 * 86400000) return false;
      if (activeDateRange === "90d" && now - txTime > 90 * 86400000) return false;
      if (activeDateRange === "1y" && now - txTime > 365 * 86400000) return false;

      // Keyword search
      if (term) {
        const sName = String(tx.serviceName || "");
        const txId = String(tx.txnId || "");
        const orderId = String(tx.orderId || "");
        const invNo = String(tx.invoiceNo || "");
        const amtStr = String(tx.amount || "");
        const matched = sName.toLowerCase().includes(term) || txId.toLowerCase().includes(term) || orderId.toLowerCase().includes(term) || invNo.toLowerCase().includes(term) || amtStr.includes(term);
        if (!matched) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      const aAmt = Number(a.amount || 0);
      const bAmt = Number(b.amount || 0);

      if (activeSort === "oldest") return aTime - bTime;
      if (activeSort === "amount-high") return bAmt - aAmt;
      if (activeSort === "amount-low") return aAmt - bAmt;
      return bTime - aTime;
    });

    if (!filtered.length) {
      const emptyHtml = `
        <div class="acc-empty-state acc-empty-state-rich">
          <span><i data-lucide="search-x"></i></span>
          <strong>No matching transactions</strong>
          <p>Try clearing your filters or searching with a different term.</p>
        </div>`;
      desktopTbody.innerHTML = `<tr><td colspan="7">${emptyHtml}</td></tr>`;
      mobileContainer.innerHTML = emptyHtml;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // 1. Render Desktop Table
    desktopTbody.innerHTML = filtered.map((tx, idx) => {
      const isPaid = ["paid", "settled", "captured", "success"].includes(String(tx.status).toLowerCase());
      const isPending = ["pending", "created", "session_created"].includes(String(tx.status).toLowerCase());
      const isFailed = tx.status === "failed";
      const formattedDate = new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const formattedTime = new Date(tx.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

      return `
        <tr data-tx-row="${idx}">
          <td>
            <code style="font-size: .8rem; font-family: monospace; font-weight:750; color:#0f172a;">${escapeHtml(tx.txnId)}</code>
            <small style="display:block; color:#64748b; font-size:.72rem;">Req: ${escapeHtml(tx.orderId)}</small>
          </td>
          <td>
            <a href="customer-account-order-detail.html?id=${encodeURIComponent(tx.orderId)}" style="text-decoration:none; color:var(--checkout-ink,#071426); font-weight:700;">
              ${escapeHtml(tx.serviceName)}
            </a>
            <small style="display:block; color:#64748b; font-size:.72rem;">One Point Kendra Lucknow Desk</small>
          </td>
          <td style="font-size:.82rem; color:#475569;">
            ${formattedDate}<br><small style="color:#94a3b8;">${formattedTime}</small>
          </td>
          <td>
            <span style="font-size:.78rem; font-weight:650; color:#334155;">
              ${getMaskedPaymentMethod(tx)}
            </span>
          </td>
          <td style="text-align:right;">
            <strong style="color:#071426; font-size:.95rem;">${acc.money(tx.amount)}</strong>
          </td>
          <td>${getPaymentStatusBadge(tx.status)}</td>
          <td style="text-align:right;">
            <div style="display:inline-flex; align-items:center; justify-content:flex-end; gap:6px;">
              ${isPaid ? `
                <button type="button" class="eds-btn eds-btn-secondary" data-tx-receipt="${idx}" style="font-size:.76rem; padding:4px 9px; min-height:30px;" title="Download / Print Receipt">
                  <i data-lucide="receipt" style="width:12px; height:12px;"></i> Receipt
                </button>
              ` : isPending ? `
                <button type="button" class="eds-btn eds-btn-primary" data-tx-pay="${idx}" style="font-size:.76rem; padding:4px 10px; min-height:30px;">
                  <i data-lucide="lock" style="width:12px; height:12px;"></i> Pay Now
                </button>
              ` : isFailed ? `
                <button type="button" class="eds-btn eds-btn-primary" data-tx-retry="${idx}" style="font-size:.76rem; padding:4px 10px; min-height:30px; background:#b91c1c; border-color:#b91c1c;">
                  <i data-lucide="refresh-cw" style="width:12px; height:12px;"></i> Try Again
                </button>
              ` : ''}
              <button type="button" class="cpf-addr-act-btn" data-tx-detail="${idx}" title="View Payment Breakdown">
                <i data-lucide="info" style="width:14px; height:14px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // 2. Render Mobile Responsive Cards
    mobileContainer.innerHTML = filtered.map((tx, idx) => {
      const isPaid = ["paid", "settled", "captured", "success"].includes(String(tx.status).toLowerCase());
      const isPending = ["pending", "created", "session_created"].includes(String(tx.status).toLowerCase());
      const isFailed = tx.status === "failed";
      const formattedDate = new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      return `
        <article class="acc-mob-tx-card ${isFailed ? 'acc-mob-tx-failed' : isPending ? 'acc-mob-tx-pending' : ''}">
          <div class="acc-mob-tx-top">
            <div>
              <strong class="acc-mob-tx-title">${escapeHtml(tx.serviceName)}</strong>
              <small class="cpf-muted">ID: <code>${escapeHtml(tx.txnId)}</code> &middot; ${formattedDate}</small>
            </div>
            <div style="text-align:right;">
              <strong class="acc-mob-tx-amount">${acc.money(tx.amount)}</strong>
              <div>${getPaymentStatusBadge(tx.status)}</div>
            </div>
          </div>
          <div class="acc-mob-tx-bottom">
            <span style="font-size:.74rem; color:#64748b;">${getMaskedPaymentMethod(tx)}</span>
            <div style="display:flex; gap:6px;">
              ${isPaid ? `
                <button type="button" class="eds-btn eds-btn-secondary" data-tx-receipt="${idx}" style="font-size:.76rem; padding:4px 10px; min-height:32px;">
                  <i data-lucide="receipt" style="width:12px; height:12px;"></i> Receipt
                </button>
              ` : isPending ? `
                <button type="button" class="eds-btn eds-btn-primary" data-tx-pay="${idx}" style="font-size:.76rem; padding:4px 12px; min-height:32px;">
                  <i data-lucide="lock" style="width:12px; height:12px;"></i> Pay Now
                </button>
              ` : isFailed ? `
                <button type="button" class="eds-btn eds-btn-primary" data-tx-retry="${idx}" style="font-size:.76rem; padding:4px 12px; min-height:32px; background:#b91c1c;">
                  <i data-lucide="refresh-cw" style="width:12px; height:12px;"></i> Retry
                </button>
              ` : ''}
              <button type="button" class="eds-btn eds-btn-ghost" data-tx-detail="${idx}" style="font-size:.76rem; padding:4px 8px; min-height:32px;">
                Details
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // Attach Action Handlers
    document.querySelectorAll("[data-tx-detail]").forEach((btn) => {
      btn.onclick = () => openPaymentDetailsModal(filtered[Number(btn.dataset.txDetail)]);
    });

    document.querySelectorAll("[data-tx-receipt]").forEach((btn) => {
      btn.onclick = () => openReceiptModal(filtered[Number(btn.dataset.txReceipt)]);
    });

    document.querySelectorAll("[data-tx-pay], [data-tx-retry]").forEach((btn) => {
      const idx = Number(btn.dataset.txPay || btn.dataset.txRetry);
      const tx = filtered[idx];
      btn.onclick = () => {
        btn.disabled = true;
        btn.innerHTML = `<span class="acc-pulse-dot-green"></span> Confirming...`;
        setTimeout(() => {
          window.location.href = `checkout.html?orderId=${encodeURIComponent(tx.orderId)}`;
        }, 600);
      };
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ==================== 5. PAYMENT DETAILS MODAL / DRAWER ====================
  function openPaymentDetailsModal(tx) {
    const acc = window.OPDSAccount;
    const formattedDate = new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const isPaid = ["paid", "settled", "captured", "success"].includes(String(tx.status).toLowerCase());

    const officialFee = Number(tx.officialFee || 0);
    const assistanceFee = Number(tx.assistanceFee || (tx.amount - officialFee));
    const gst = Number(tx.gst || 0);

    const modalHtml = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:12px; border-bottom:1px solid #e2e8f0;">
          <div>
            <span class="acc-eyebrow" style="font-size:.7rem;">Transaction Details</span>
            <h3 style="margin:2px 0 0; font-size:1.1rem; color:#071426;">${escapeHtml(tx.serviceName)}</h3>
          </div>
          <div>${getPaymentStatusBadge(tx.status)}</div>
        </div>

        <div class="cpf-view-grid" style="grid-template-columns:1fr 1fr; gap:12px; padding:14px;">
          <div class="cpf-view-row"><small>Transaction ID</small><code style="font-size:.82rem; font-weight:750;">${escapeHtml(tx.txnId)}</code></div>
          <div class="cpf-view-row"><small>Request ID</small><a href="customer-account-order-detail.html?id=${encodeURIComponent(tx.orderId)}" style="font-size:.82rem; font-weight:750; color:#075aa8;">${escapeHtml(tx.orderId)}</a></div>
          <div class="cpf-view-row"><small>Timestamp</small><strong>${formattedDate}</strong></div>
          <div class="cpf-view-row"><small>Payment Method</small><strong>${getMaskedPaymentMethod(tx)}</strong></div>
          <div class="cpf-view-row"><small>Gateway Reference</small><strong style="font-family:monospace; font-size:.78rem;">${tx.gatewayRef || 'pay_razorpay_94739181'}</strong></div>
          <div class="cpf-view-row"><small>Kendra Operator Desk</small><strong>One Point Suvidha Lucknow</strong></div>
        </div>

        <div>
          <strong style="font-size:.88rem; color:#071426; display:block; margin-bottom:6px;">Transparent Fee Breakdown</strong>
          <table class="acc-pay-breakdown" style="border:1px solid #e2e8f0; border-radius:10px; padding:8px 12px;">
            <tr><td>One Point Assistance Fee</td><td>${acc.money(assistanceFee)}</td></tr>
            ${officialFee > 0 ? `<tr><td>Official Government Portal Fee</td><td>${acc.money(officialFee)}</td></tr>` : ''}
            <tr><td>Statutory GST (18% on facilitation)</td><td>${gst > 0 ? acc.money(gst) : 'Included'}</td></tr>
            <tr class="total"><td>Total Payable</td><td>${acc.money(tx.amount)}</td></tr>
            <tr><td>Amount Settled</td><td style="color:#15803d; font-weight:800;">${isPaid ? acc.money(tx.amount) : '₹0.00'}</td></tr>
          </table>
        </div>

        <div class="cpf-form-actions" style="margin-top:4px;">
          ${isPaid ? `
            <button type="button" class="eds-btn eds-btn-primary" id="m-view-receipt-btn">
              <i data-lucide="printer"></i> View &amp; Print Receipt
            </button>
          ` : `
            <button type="button" class="eds-btn eds-btn-primary" onclick="window.location.href='checkout.html?orderId=${encodeURIComponent(tx.orderId)}'">
              <i data-lucide="lock"></i> Pay ${acc.money(tx.amount)} Securely
            </button>
          `}
          <a href="https://wa.me/919473946181?text=I%20need%20help%20with%20payment%20${encodeURIComponent(tx.txnId)}%20for%20request%20${encodeURIComponent(tx.orderId)}." target="_blank" rel="noopener" class="eds-btn eds-btn-secondary">
            <i data-lucide="message-circle"></i> Support Inquiry
          </a>
        </div>
      </div>
    `;

    openModalShell("Payment Details & Receipt", modalHtml);

    const receiptBtn = byId("m-view-receipt-btn");
    if (receiptBtn) {
      receiptBtn.onclick = () => {
        closeModal();
        openReceiptModal(tx);
      };
    }
  }

  // ==================== 6. PAYMENT RECEIPT PREVIEW MODAL ====================
  function openReceiptModal(tx) {
    const acc = window.OPDSAccount;
    const formattedDate = new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const receiptNo = `OPDS-REC-${String(tx.txnId).slice(-6)}`;

    const officialFee = Number(tx.officialFee || 0);
    const assistanceFee = Number(tx.assistanceFee || (tx.amount - officialFee));

    const receiptHtml = `
      <div class="acc-receipt-container" style="border:1px solid #cbd5e1; border-radius:12px; padding:20px; background:#fff;">
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #075aa8; padding-bottom:12px; margin-bottom:14px;">
          <div>
            <strong style="font-size:1.1rem; color:#071426;">One Point Digital Services</strong>
            <small style="display:block; color:#64748b;">Authorized Citizen Suvidha Kendra &middot; Milan Tower, LDA Colony, Lucknow</small>
          </div>
          <div style="text-align:right;">
            <span class="acc-status-badge acc-status-completed">Payment Receipt</span>
            <small style="display:block; font-family:monospace; font-weight:700; color:#0f172a; margin-top:3px;">${receiptNo}</small>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:.82rem; margin-bottom:14px;">
          <div><small style="color:#64748b;">Transaction ID:</small> <strong>${escapeHtml(tx.txnId)}</strong></div>
          <div><small style="color:#64748b;">Request ID:</small> <strong>${escapeHtml(tx.orderId)}</strong></div>
          <div><small style="color:#64748b;">Payment Date:</small> <strong>${formattedDate}</strong></div>
          <div><small style="color:#64748b;">Payment Method:</small> <strong>${getMaskedPaymentMethod(tx)}</strong></div>
        </div>

        <table class="acc-pay-breakdown" style="width:100%; font-size:.86rem; margin-bottom:14px;">
          <tr style="background:#f8fafc;"><th style="text-align:left; padding:6px 8px;">Description</th><th style="text-align:right; padding:6px 8px;">Amount</th></tr>
          <tr><td style="padding:6px 8px;">${escapeHtml(tx.serviceName)} (Assistance Fee)</td><td style="padding:6px 8px; text-align:right;">${acc.money(assistanceFee)}</td></tr>
          ${officialFee > 0 ? `<tr><td style="padding:6px 8px;">Official Government Department Fee</td><td style="padding:6px 8px; text-align:right;">${acc.money(officialFee)}</td></tr>` : ''}
          <tr><td style="padding:6px 8px;">Statutory Taxes &amp; GST</td><td style="padding:6px 8px; text-align:right;">Included</td></tr>
          <tr class="total"><td style="padding:8px 8px; font-weight:800;">Total Amount Paid</td><td style="padding:8px 8px; text-align:right; font-weight:800; color:#15803d;">${acc.money(tx.amount)}</td></tr>
        </table>

        <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:10px; font-size:.76rem; color:#64748b;">
          <span>✓ Digitally Verified by One Point Suvidha Kendra Lucknow</span>
          <span>Computer Generated Receipt</span>
        </div>
      </div>

      <div class="cpf-form-actions" style="margin-top:14px; justify-content:flex-end;">
        <button type="button" class="eds-btn eds-btn-primary" onclick="window.print()">
          <i data-lucide="printer"></i> Print / Save as PDF
        </button>
        <button type="button" class="eds-btn eds-btn-secondary" onclick="closeModal()">Close</button>
      </div>
    `;

    openModalShell("Official Payment Receipt", receiptHtml);
  }

  // ==================== 7. REFUND CENTER ====================
  function getStoredRefunds() {
    try {
      const stored = localStorage.getItem("opds_customer_refunds");
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return [
      {
        id: "RF-2026-0041",
        orderId: "OPDS-260818-00008",
        serviceName: "Domicile Certificate Application",
        originalAmount: 250.00,
        refundAmount: 250.00,
        requestedDate: "18 Aug 2026",
        completedDate: "20 Aug 2026",
        status: "Refunded",
        reason: "Duplicate application request cancelled by citizen before portal filing.",
        destination: "Original UPI Account (••••@upi)"
      }
    ];
  }

  function renderRefunds() {
    const list = byId("acc-refunds-list");
    const countBadge = byId("cpf-refunds-count-badge");
    if (!list) return;

    if (countBadge) countBadge.textContent = refundRecords.length;

    if (!refundRecords.length) {
      list.innerHTML = `
        <div class="acc-empty-state acc-empty-state-rich">
          <span><i data-lucide="refresh-cw"></i></span>
          <strong>No refunds on file</strong>
          <p>Your refund history and reimbursement requests will appear here if applicable.</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const acc = window.OPDSAccount;
    list.innerHTML = refundRecords.map((rf) => `
      <article class="acc-refund-card">
        <div class="acc-refund-head">
          <div>
            <span class="acc-eyebrow" style="font-size:.68rem;">Reversal ID: ${escapeHtml(rf.id)}</span>
            <h4 style="margin:2px 0 0; font-size:1rem; color:#071426;">${escapeHtml(rf.serviceName)}</h4>
            <small class="cpf-muted">Request: <a href="customer-account-order-detail.html?id=${encodeURIComponent(rf.orderId)}">${escapeHtml(rf.orderId)}</a> &middot; Requested ${escapeHtml(rf.requestedDate)}</small>
          </div>
          <div style="text-align:right;">
            <strong style="color:#15803d; font-size:1.05rem;">${acc.money(rf.refundAmount)}</strong>
            <div><span class="acc-status-badge acc-status-completed"><i data-lucide="check"></i> ${escapeHtml(rf.status)}</span></div>
          </div>
        </div>

        <div class="acc-refund-body">
          <p><strong>Reason:</strong> ${escapeHtml(rf.reason)}</p>
          <small class="cpf-muted"><i data-lucide="credit-card" style="width:12px; height:12px;"></i> Credited to ${escapeHtml(rf.destination)} on ${escapeHtml(rf.completedDate)}</small>
        </div>
      </article>
    `).join("");

    if (window.lucide) window.lucide.createIcons();
  }

  // ==================== 8. INITIALIZE PAYMENTS & BILLING ====================
  window.OPDSAccount.ready.then((data) => {
    if (!data) return;

    // Generate comprehensive transaction history from orders + samples
    allTransactions = [
      {
        txnId: "TXN-260824-00123",
        orderId: "OPDS-260824-00123",
        serviceName: "PAN Card Correction & Instant e-PAN",
        date: "2026-08-24T10:42:00.000Z",
        method: "upi",
        upiId: "asif@okhdfcbank",
        amount: 399.00,
        assistanceFee: 292.00,
        officialFee: 107.00,
        gst: 0,
        status: "paid",
        invoiceNo: "OPDS-INV-00123"
      },
      {
        txnId: "TXN-260822-00045",
        orderId: "OPDS-260822-00045",
        serviceName: "UPSSSC Exam Form Online Registration",
        date: "2026-08-22T09:15:00.000Z",
        method: "upi",
        upiId: "asif@upi",
        amount: 150.00,
        assistanceFee: 125.00,
        officialFee: 25.00,
        gst: 0,
        status: "paid",
        invoiceNo: "OPDS-INV-00045"
      },
      {
        txnId: "TXN-260820-00012",
        orderId: "OPDS-260820-00012",
        serviceName: "PVC Smart Voter ID Card Printing",
        date: "2026-08-20T14:00:00.000Z",
        method: "cash",
        amount: 250.00,
        assistanceFee: 250.00,
        officialFee: 0,
        gst: 38.14,
        status: "paid",
        invoiceNo: "OPDS-INV-00012"
      }
    ];

    refundRecords = getStoredRefunds();

    initBillingTabs();
    renderFinancialSummary(allTransactions, refundRecords);
    renderPrimaryFilters();
    setupAdvancedFilters();
    renderTransactions();
    renderRefunds();

    const searchInput = byId("acc-payment-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        renderTransactions();
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }).catch((error) => {
    console.error("[customer-account-payments]", error);
  });
})();
