(function () {
  "use strict";

  let allInvoices = [];
  let selectedInvoiceIds = new Set();
  let activeDocTypeFilter = "all";
  let activeFY = "26-27";
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

  // ==================== 1. DOCUMENT TYPE FILTERS ====================
  const TYPE_FILTERS = [
    { key: "all", label: "All Billing Documents" },
    { key: "tax_invoice", label: "One Point GST Invoices" },
    { key: "govt_challan", label: "Govt Department Challans" }
  ];

  function renderTypeFilters() {
    const row = byId("acc-invoice-type-filters");
    if (!row) return;
    row.innerHTML = TYPE_FILTERS.map((f) => `
      <button type="button" class="acc-filter-chip ${f.key === activeDocTypeFilter ? 'active' : ''}" data-doctype="${f.key}">
        ${f.label}
      </button>
    `).join("");

    row.querySelectorAll("[data-doctype]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeDocTypeFilter = btn.getAttribute("data-doctype");
        renderTypeFilters();
        renderInvoices();
      });
    });
  }

  // ==================== 2. SUMMARY METRICS ====================
  function renderMetrics(invoices) {
    const acc = window.OPDSAccount;
    let taxInvCount = 0;
    let challanCount = 0;
    let totalBilled = 0;
    let fyBilled = 0;

    invoices.forEach((inv) => {
      const amt = Number(inv.amount || 0);
      totalBilled += amt;
      if (inv.fy === "26-27") fyBilled += amt;
      if (inv.docType === "tax_invoice") taxInvCount++;
      if (inv.docType === "govt_challan") challanCount++;
    });

    const cTotal = byId("inv-count-total");
    const cChallans = byId("inv-count-challans");
    const tBilled = byId("inv-total-billed");
    const fvBilled = byId("inv-fy-billed");

    if (cTotal) cTotal.textContent = taxInvCount;
    if (cChallans) cChallans.textContent = challanCount;
    if (tBilled) tBilled.textContent = acc.money(totalBilled);
    if (fvBilled) fvBilled.textContent = acc.money(fyBilled);
  }

  // ==================== 3. RENDER INVOICES (TABLE & MOBILE CARDS) ====================
  function renderInvoices() {
    const acc = window.OPDSAccount;
    const tbody = byId("acc-invoices-body");
    const mobileContainer = byId("acc-mobile-invoices-container");
    if (!tbody || !mobileContainer) return;

    const term = searchTerm.trim().toLowerCase();

    const filtered = allInvoices.filter((inv) => {
      if (activeDocTypeFilter !== "all" && inv.docType !== activeDocTypeFilter) return false;
      if (activeFY !== "all" && inv.fy !== activeFY) return false;

      if (term) {
        const invNo = String(inv.invoiceNo || "").toLowerCase();
        const orderId = String(inv.orderId || "").toLowerCase();
        const sName = String(inv.serviceName || "").toLowerCase();
        const amt = String(inv.amount || "");
        if (!invNo.includes(term) && !orderId.includes(term) && !sName.includes(term) && !amt.includes(term)) {
          return false;
        }
      }
      return true;
    });

    if (!filtered.length) {
      const emptyHtml = `
        <div class="acc-empty-state acc-empty-state-rich">
          <span><i data-lucide="receipt"></i></span>
          <strong>No invoices found</strong>
          <p>No billing documents match your search query or selected financial year.</p>
        </div>`;
      tbody.innerHTML = `<tr><td colspan="7">${emptyHtml}</td></tr>`;
      mobileContainer.innerHTML = emptyHtml;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // 1. Render Desktop Table
    tbody.innerHTML = filtered.map((inv, idx) => {
      const isSelected = selectedInvoiceIds.has(inv.id);
      const isTaxInvoice = inv.docType === "tax_invoice";
      const formattedDate = new Date(inv.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      return `
        <tr data-inv-row="${idx}">
          <td style="text-align:center;">
            <input type="checkbox" class="acc-inv-checkbox" data-select-id="${escapeHtml(inv.id)}" ${isSelected ? 'checked' : ''} style="cursor:pointer; width:15px; height:15px;">
          </td>
          <td>
            <code style="font-size:.84rem; font-weight:750; color:#071426;">${escapeHtml(inv.invoiceNo)}</code>
            <small style="display:block; color:#64748b; font-size:.72rem;">Req: ${escapeHtml(inv.orderId)}</small>
          </td>
          <td>
            <a href="customer-account-order-detail.html?id=${encodeURIComponent(inv.orderId)}" style="text-decoration:none; font-weight:700; color:var(--checkout-ink,#071426);">
              ${escapeHtml(inv.serviceName)}
            </a>
            <small style="display:block; color:#64748b; font-size:.72rem;">${inv.customerName || 'Citizen Account'}</small>
          </td>
          <td style="font-size:.82rem; color:#475569;">
            ${formattedDate}
          </td>
          <td>
            <span class="acc-status-badge ${isTaxInvoice ? 'acc-status-completed' : 'acc-status-pending'}" style="font-size:.72rem;">
              <i data-lucide="${isTaxInvoice ? 'receipt' : 'landmark'}" style="width:11px; height:11px;"></i>
              ${isTaxInvoice ? 'GST Tax Invoice' : 'Govt Dept Challan'}
            </span>
          </td>
          <td style="text-align:right;">
            <strong style="color:#071426; font-size:.95rem;">${acc.money(inv.amount)}</strong>
          </td>
          <td style="text-align:right;">
            <div style="display:inline-flex; align-items:center; justify-content:flex-end; gap:6px;">
              <button type="button" class="eds-btn eds-btn-primary" data-inv-view="${idx}" style="font-size:.76rem; padding:4px 10px; min-height:30px;">
                <i data-lucide="eye" style="width:12px; height:12px;"></i> View
              </button>
              <button type="button" class="eds-btn eds-btn-secondary" data-inv-download="${idx}" style="font-size:.76rem; padding:4px 9px; min-height:30px;" title="Download PDF">
                <i data-lucide="download" style="width:12px; height:12px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // 2. Render Mobile Responsive Cards
    mobileContainer.innerHTML = filtered.map((inv, idx) => {
      const isTaxInvoice = inv.docType === "tax_invoice";
      const formattedDate = new Date(inv.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      return `
        <article class="acc-mob-tx-card">
          <div class="acc-mob-tx-top">
            <div>
              <strong class="acc-mob-tx-title">${escapeHtml(inv.serviceName)}</strong>
              <small class="cpf-muted"><code>${escapeHtml(inv.invoiceNo)}</code> &middot; ${formattedDate}</small>
            </div>
            <div style="text-align:right;">
              <strong class="acc-mob-tx-amount">${acc.money(inv.amount)}</strong>
              <div>
                <span class="acc-status-badge ${isTaxInvoice ? 'acc-status-completed' : 'acc-status-pending'}" style="font-size:.7rem;">
                  ${isTaxInvoice ? 'GST Invoice' : 'Govt Challan'}
                </span>
              </div>
            </div>
          </div>
          <div class="acc-mob-tx-bottom">
            <small class="cpf-muted">Req ID: <strong>${escapeHtml(inv.orderId)}</strong></small>
            <div style="display:flex; gap:6px;">
              <button type="button" class="eds-btn eds-btn-primary" data-inv-view="${idx}" style="font-size:.76rem; padding:4px 12px; min-height:32px;">
                <i data-lucide="eye" style="width:12px; height:12px;"></i> View PDF
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // Attach Checkbox Handlers
    document.querySelectorAll(".acc-inv-checkbox").forEach((cb) => {
      cb.onchange = (e) => {
        const id = cb.dataset.selectId;
        if (e.target.checked) selectedInvoiceIds.add(id);
        else selectedInvoiceIds.delete(id);
        updateBulkBar();
      };
    });

    // Attach View & Download Handlers
    document.querySelectorAll("[data-inv-view]").forEach((btn) => {
      btn.onclick = () => openInvoicePreviewModal(filtered[Number(btn.dataset.invView)]);
    });

    document.querySelectorAll("[data-inv-download]").forEach((btn) => {
      btn.onclick = () => {
        const inv = filtered[Number(btn.dataset.invDownload)];
        showToast(`Preparing download for ${inv.invoiceNo}...`);
        setTimeout(() => openInvoicePreviewModal(inv), 400);
      };
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ==================== 4. BULK ACTION BAR ====================
  function updateBulkBar() {
    const bar = byId("acc-bulk-action-bar");
    const countText = byId("acc-selected-count-text");
    if (!bar) return;

    const count = selectedInvoiceIds.size;
    if (count > 0) {
      bar.hidden = false;
      countText.innerHTML = `<strong>${count}</strong> ${count === 1 ? 'document' : 'documents'} selected`;
    } else {
      bar.hidden = true;
    }
  }

  function setupBulkActions() {
    const selectAllCb = byId("acc-select-all-invoices");
    const clearBtn = byId("acc-clear-selection-btn");
    const downloadSelectedBtn = byId("acc-download-selected-btn");
    const downloadFYBundleBtn = byId("acc-download-fy-bundle-btn");

    if (selectAllCb) {
      selectAllCb.onchange = (e) => {
        if (e.target.checked) {
          allInvoices.forEach((inv) => selectedInvoiceIds.add(inv.id));
        } else {
          selectedInvoiceIds.clear();
        }
        renderInvoices();
        updateBulkBar();
      };
    }

    if (clearBtn) {
      clearBtn.onclick = () => {
        selectedInvoiceIds.clear();
        if (selectAllCb) selectAllCb.checked = false;
        renderInvoices();
        updateBulkBar();
      };
    }

    if (downloadSelectedBtn) {
      downloadSelectedBtn.onclick = () => {
        showToast(`Downloading ZIP bundle of ${selectedInvoiceIds.size} invoices...`);
      };
    }

    if (downloadFYBundleBtn) {
      downloadFYBundleBtn.onclick = () => {
        showToast("Generating comprehensive FY 2026–27 PDF bundle...");
      };
    }
  }

  // ==================== 5. INVOICE PREVIEW MODAL ====================
  function openInvoicePreviewModal(inv) {
    const acc = window.OPDSAccount;
    const formattedDate = new Date(inv.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const isTaxInvoice = inv.docType === "tax_invoice";

    const officialFee = Number(inv.officialFee || 0);
    const assistanceFee = Number(inv.assistanceFee || (inv.amount - officialFee));
    const taxableValue = (assistanceFee / 1.18).toFixed(2);
    const gstVal = (assistanceFee - Number(taxableValue)).toFixed(2);
    const cgst = (Number(gstVal) / 2).toFixed(2);
    const sgst = (Number(gstVal) / 2).toFixed(2);

    const modalHtml = `
      <div class="acc-invoice-preview-wrap" style="border:1px solid #cbd5e1; border-radius:12px; padding:24px; background:#fff; font-family:Inter, sans-serif;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #075aa8; padding-bottom:16px; margin-bottom:16px;">
          <div>
            <h3 style="margin:0; font-size:1.2rem; color:#071426; font-family:Outfit, Inter, sans-serif;">One Point Digital Services</h3>
            <small style="display:block; color:#475569; margin-top:2px;">Authorized Citizen Suvidha Kendra &middot; LDA Colony, Lucknow, UP</small>
            <small style="display:block; color:#64748b; font-family:monospace;">GSTIN: 09AABCO1234F1Z5 &middot; SAC Code: 998313</small>
          </div>
          <div style="text-align:right;">
            <span class="acc-status-badge ${isTaxInvoice ? 'acc-status-completed' : 'acc-status-pending'}" style="font-size:.8rem; padding:4px 10px;">
              ${isTaxInvoice ? 'TAX INVOICE' : 'GOVT CHALLAN'}
            </span>
            <strong style="display:block; font-size:1rem; color:#071426; margin-top:4px; font-family:monospace;">${escapeHtml(inv.invoiceNo)}</strong>
            <small style="color:#64748b;">Issued: ${formattedDate}</small>
          </div>
        </div>

        <!-- Billed To & Request Details Grid -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; font-size:.84rem; margin-bottom:16px; background:#f8fafc; padding:12px 14px; border-radius:10px; border:1px solid #e2e8f0;">
          <div>
            <small style="color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:2px;">Billed To (Applicant):</small>
            <strong style="color:#071426;">${escapeHtml(inv.customerName || "Mohammad Asif Bisen")}</strong><br>
            <span>Milan Tower, Bargawan, LDA Colony, Lucknow, UP 226012</span><br>
            <small style="color:#64748b;">Mobile: +91 9473946181</small>
          </div>
          <div>
            <small style="color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:2px;">Service Request Details:</small>
            <strong>${escapeHtml(inv.serviceName)}</strong><br>
            <span>Request ID: <a href="customer-account-order-detail.html?id=${encodeURIComponent(inv.orderId)}" style="color:#075aa8; font-weight:700;">${escapeHtml(inv.orderId)}</a></span><br>
            <small style="color:#15803d; font-weight:700;">Payment Status: Settled &amp; Paid (UPI)</small>
          </div>
        </div>

        <!-- Line Items Table -->
        <table class="acc-pay-breakdown" style="width:100%; font-size:.86rem; margin-bottom:16px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
          <thead style="background:#f1f5f9;">
            <tr>
              <th style="padding:8px 10px; text-align:left;">Item / Description</th>
              <th style="padding:8px 10px; text-align:center;">SAC/HSN</th>
              <th style="padding:8px 10px; text-align:right;">Taxable Value</th>
              <th style="padding:8px 10px; text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px 10px;">${escapeHtml(inv.serviceName)} (Facilitation Fee)</td>
              <td style="padding:8px 10px; text-align:center; font-family:monospace;">998313</td>
              <td style="padding:8px 10px; text-align:right;">₹${taxableValue}</td>
              <td style="padding:8px 10px; text-align:right;">${acc.money(assistanceFee)}</td>
            </tr>
            ${officialFee > 0 ? `
              <tr>
                <td style="padding:8px 10px;">Official Department Portal Challan Fee (Non-taxable)</td>
                <td style="padding:8px 10px; text-align:center;">-</td>
                <td style="padding:8px 10px; text-align:right;">-</td>
                <td style="padding:8px 10px; text-align:right;">${acc.money(officialFee)}</td>
              </tr>
            ` : ''}
            <tr style="border-top:1px solid #e2e8f0; font-size:.8rem; color:#475569;">
              <td colspan="3" style="padding:6px 10px; text-align:right;">CGST (9%):</td>
              <td style="padding:6px 10px; text-align:right;">₹${cgst}</td>
            </tr>
            <tr style="font-size:.8rem; color:#475569;">
              <td colspan="3" style="padding:6px 10px; text-align:right;">SGST (9%):</td>
              <td style="padding:6px 10px; text-align:right;">₹${sgst}</td>
            </tr>
            <tr class="total" style="border-top:2px solid #cbd5e1; background:#f8fafc;">
              <td colspan="3" style="padding:10px; text-align:right; font-weight:800; font-size:.95rem;">Total Amount Paid:</td>
              <td style="padding:10px; text-align:right; font-weight:800; font-size:1.05rem; color:#15803d;">${acc.money(inv.amount)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Sign-off Footer -->
        <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:10px; font-size:.76rem; color:#64748b;">
          <span>This is a computer-generated tax invoice. No signature required.</span>
          <span>Verified by One Point Suvidha Kendra Lucknow</span>
        </div>
      </div>

      <div class="cpf-form-actions" style="margin-top:16px; justify-content:space-between; flex-wrap:wrap;">
        <a href="support.html?context=InvoiceIssue&id=${encodeURIComponent(inv.invoiceNo)}" class="eds-btn eds-btn-ghost" style="color:#64748b; font-size:.8rem;">
          <i data-lucide="flag"></i> Report Billing Issue
        </a>
        <div style="display:flex; gap:8px;">
          <button type="button" class="eds-btn eds-btn-primary" onclick="window.print()">
            <i data-lucide="printer"></i> Print Invoice
          </button>
          <button type="button" class="eds-btn eds-btn-secondary" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;

    openModalShell(`Invoice &mdash; ${inv.invoiceNo}`, modalHtml);
  }

  // ==================== 6. INITIALIZE INVOICES ARCHIVE ====================
  window.OPDSAccount.ready.then((data) => {
    if (!data) return;

    allInvoices = [
      {
        id: "inv-1",
        invoiceNo: "OPDS-INV-2026-00123",
        orderId: "OPDS-260824-00123",
        serviceName: "PAN Card Correction & Instant e-PAN",
        customerName: "Mohammad Asif Bisen",
        amount: 399.00,
        assistanceFee: 292.00,
        officialFee: 107.00,
        docType: "tax_invoice",
        fy: "26-27",
        issuedAt: "2026-08-24T10:45:00.000Z"
      },
      {
        id: "inv-2",
        invoiceNo: "OPDS-INV-2026-00045",
        orderId: "OPDS-260822-00045",
        serviceName: "UPSSSC Exam Form Online Registration",
        customerName: "Mohammad Asif Bisen",
        amount: 150.00,
        assistanceFee: 125.00,
        officialFee: 25.00,
        docType: "tax_invoice",
        fy: "26-27",
        issuedAt: "2026-08-22T09:20:00.000Z"
      },
      {
        id: "inv-3",
        invoiceNo: "GOVT-CHALLAN-260822-094",
        orderId: "OPDS-260822-00045",
        serviceName: "UPSSSC Exam Portal Official Challan",
        customerName: "Mohammad Asif Bisen",
        amount: 25.00,
        assistanceFee: 0,
        officialFee: 25.00,
        docType: "govt_challan",
        fy: "26-27",
        issuedAt: "2026-08-22T09:22:00.000Z"
      },
      {
        id: "inv-4",
        invoiceNo: "OPDS-INV-2026-00012",
        orderId: "OPDS-260820-00012",
        serviceName: "PVC Smart Voter ID Card Printing",
        customerName: "Mohammad Asif Bisen",
        amount: 250.00,
        assistanceFee: 250.00,
        officialFee: 0,
        docType: "tax_invoice",
        fy: "26-27",
        issuedAt: "2026-08-20T14:05:00.000Z"
      }
    ];

    renderMetrics(allInvoices);
    renderTypeFilters();
    setupBulkActions();
    renderInvoices();

    const searchInput = byId("acc-invoice-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        renderInvoices();
      });
    }

    const fySelect = byId("acc-invoice-fy-select");
    if (fySelect) {
      fySelect.addEventListener("change", (e) => {
        activeFY = e.target.value;
        renderInvoices();
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }).catch((error) => {
    console.error("[customer-account-invoices]", error);
  });
})();
