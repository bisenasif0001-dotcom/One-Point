(function () {
  "use strict";

  let allDocuments = [];
  let activeCategoryFilter = "all";
  let activeGrouping = "all";
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

  // ==================== 1. CATEGORY FILTERS ====================
  const CATEGORY_FILTERS = [
    { key: "all", label: "All Documents", icon: "folder" },
    { key: "attention", label: "Needs Attention", icon: "alert-triangle" },
    { key: "identity", label: "Identity Proof", icon: "user-check" },
    { key: "address", label: "Address Proof", icon: "map-pin" },
    { key: "academic", label: "Education / Academic", icon: "graduation-cap" },
    { key: "output", label: "Provided by One Point", icon: "check-circle-2" }
  ];

  function renderCategoryFilters() {
    const row = byId("acc-vault-category-filters");
    if (!row) return;
    row.innerHTML = CATEGORY_FILTERS.map((f) => `
      <button type="button" class="acc-filter-chip ${f.key === activeCategoryFilter ? 'active' : ''}" data-cat="${f.key}">
        <i data-lucide="${f.icon}"></i>
        <span>${f.label}</span>
      </button>
    `).join("");

    row.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategoryFilter = btn.getAttribute("data-cat");
        renderCategoryFilters();
        renderVault();
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }

  // ==================== 2. SUMMARY METRICS ====================
  function renderMetrics(docs) {
    let total = docs.length;
    let attention = 0;
    let verified = 0;
    let removals = 0;

    docs.forEach((d) => {
      if (d.status === "needs_replacement") attention++;
      if (d.status === "accepted") verified++;
      if (d.status === "removal_requested") removals++;
    });

    const cTotal = byId("vault-count-total");
    const cAttn = byId("vault-count-attention");
    const cVer = byId("vault-count-verified");
    const cRem = byId("vault-count-removals");

    if (cTotal) cTotal.textContent = total;
    if (cAttn) cAttn.textContent = attention;
    if (cVer) cVer.textContent = verified;
    if (cRem) cRem.textContent = removals;

    const attnCard = byId("vault-stat-attention-card");
    if (attnCard) {
      attnCard.onclick = () => {
        activeCategoryFilter = "attention";
        renderCategoryFilters();
        renderVault();
      };
    }
  }

  function getStatusBadge(status) {
    if (status === "accepted") {
      return `<span class="acc-status-badge acc-status-completed"><i data-lucide="check" style="width:11px; height:11px;"></i> Accepted</span>`;
    }
    if (status === "needs_replacement") {
      return `<span class="acc-status-badge acc-status-action" style="background:#fef3c7; color:#b45309; border-color:#fde68a;"><i data-lucide="alert-triangle" style="width:11px; height:11px;"></i> Needs Replacement</span>`;
    }
    if (status === "under_review") {
      return `<span class="acc-status-badge acc-status-pending"><i data-lucide="clock" style="width:11px; height:11px;"></i> Under Review</span>`;
    }
    if (status === "removal_requested") {
      return `<span class="acc-status-badge" style="background:#fee2e2; color:#b91c1c; border-color:#fca5a5;"><i data-lucide="trash-2" style="width:11px; height:11px;"></i> Removal Requested</span>`;
    }
    return `<span class="acc-status-badge acc-status-pending">Uploaded</span>`;
  }

  // ==================== 3. RENDER VAULT (GRID & GROUPED) ====================
  function renderVault() {
    const container = byId("acc-vault-container");
    if (!container) return;

    const term = searchTerm.trim().toLowerCase();

    const filtered = allDocuments.filter((doc) => {
      if (activeCategoryFilter === "attention" && doc.status !== "needs_replacement") return false;
      if (activeCategoryFilter === "identity" && doc.category !== "Identity") return false;
      if (activeCategoryFilter === "address" && doc.category !== "Address") return false;
      if (activeCategoryFilter === "academic" && doc.category !== "Academic") return false;
      if (activeCategoryFilter === "output" && doc.source !== "One Point") return false;

      if (term) {
        const name = String(doc.name || "").toLowerCase();
        const cat = String(doc.category || "").toLowerCase();
        const req = String(doc.orderId || "").toLowerCase();
        const sName = String(doc.serviceName || "").toLowerCase();
        if (!name.includes(term) && !cat.includes(term) && !req.includes(term) && !sName.includes(term)) {
          return false;
        }
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="acc-empty-state acc-empty-state-rich">
          <span><i data-lucide="folder-search"></i></span>
          <strong>No matching documents</strong>
          <p>Files uploaded or provided by One Point for your requests will appear here.</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    if (activeGrouping === "group_request") {
      // Group by Request ID
      const grouped = {};
      filtered.forEach((d) => {
        const key = d.serviceName ? `${d.serviceName} (${d.orderId})` : "General Profile Documents";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(d);
      });

      container.innerHTML = Object.entries(grouped).map(([groupTitle, docs]) => `
        <div style="margin-bottom: 20px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #e2e8f0;">
            <i data-lucide="folder" style="width:16px; height:16px; color:#075aa8;"></i>
            <strong style="font-size:.95rem; color:#071426;">${escapeHtml(groupTitle)}</strong>
            <span class="cpf-tab-count-badge" style="background:#475569;">${docs.length}</span>
          </div>
          <div class="acc-vault-grid">
            ${docs.map(renderDocCardHtml).join("")}
          </div>
        </div>
      `).join("");
    } else {
      // Flat Grid View
      container.innerHTML = `<div class="acc-vault-grid">${filtered.map(renderDocCardHtml).join("")}</div>`;
    }

    // Attach actions
    document.querySelectorAll("[data-doc-view]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.docView;
        const doc = allDocuments.find((d) => d.id === id);
        if (doc) openDocPreviewModal(doc);
      };
    });

    document.querySelectorAll("[data-doc-replace]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.docReplace;
        const doc = allDocuments.find((d) => d.id === id);
        if (doc) openUploadModal(doc);
      };
    });

    document.querySelectorAll("[data-doc-remove]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.docRemove;
        const doc = allDocuments.find((d) => d.id === id);
        if (doc) openRemovalModal(doc);
      };
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function renderDocCardHtml(doc) {
    const isAttn = doc.status === "needs_replacement";
    const isOnePointProvided = doc.source === "One Point";
    const formattedDate = new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    return `
      <article class="acc-vault-card ${isAttn ? 'acc-vault-card-attention' : ''}">
        <!-- Top Row: Icon + Category/Source on left, Status Badge on right -->
        <div class="acc-vault-header-row">
          <div class="acc-vault-header-left">
            <div class="acc-vault-icon ${isAttn ? 'warn' : isOnePointProvided ? 'ok' : ''}">
              <i data-lucide="${isAttn ? 'alert-triangle' : isOnePointProvided ? 'file-check' : 'file-text'}"></i>
            </div>
            <div class="acc-vault-tag-wrap">
              <span class="acc-category-badge">${escapeHtml(doc.category)}</span>
              <span class="acc-source-tag">${isOnePointProvided ? 'Provided by One Point' : 'Uploaded by You'}</span>
            </div>
          </div>
          <div class="acc-vault-badge-wrap">
            ${getStatusBadge(doc.status)}
          </div>
        </div>

        <!-- Body: Document Title + Request Link -->
        <div class="acc-vault-body">
          <h4 class="acc-vault-title" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</h4>
          <p class="acc-vault-req-link">
            <span>Linked Request:</span>
            <a href="customer-account-order-detail.html?id=${encodeURIComponent(doc.orderId)}">${escapeHtml(doc.orderId)}</a>
          </p>
        </div>

        <!-- Warning Banner if Action Required -->
        ${isAttn ? `
          <div class="acc-vault-alert-box">
            <i data-lucide="alert-circle" class="acc-vault-alert-icon"></i>
            <div class="acc-vault-alert-copy">
              <strong>Action Required: ${escapeHtml(doc.reason || "Replacement Needed")}</strong>
              <p>Please upload a clear, high-resolution file to avoid government portal rejection.</p>
            </div>
          </div>
        ` : ''}

        <!-- Footer Meta: Size & Upload Date -->
        <div class="acc-vault-meta-row">
          <span>Size: <strong>${escapeHtml(doc.size || "1.2 MB")}</strong></span>
          <span>Uploaded: <strong>${formattedDate}</strong></span>
        </div>

        <!-- Actions: View Preview, Replace, Remove -->
        <div class="acc-vault-actions">
          <button type="button" class="eds-btn ${isAttn ? 'eds-btn-primary' : 'eds-btn-secondary'} acc-vault-view-btn" data-doc-view="${escapeHtml(doc.id)}">
            <i data-lucide="eye"></i> View Preview
          </button>
          ${!isOnePointProvided ? `
            <button type="button" class="eds-btn eds-btn-secondary acc-vault-replace-btn" data-doc-replace="${escapeHtml(doc.id)}" title="Upload Replacement">
              <i data-lucide="upload"></i> ${isAttn ? 'Upload New' : 'Replace'}
            </button>
            <button type="button" class="acc-vault-del-btn" data-doc-remove="${escapeHtml(doc.id)}" title="Request Removal" aria-label="Delete">
              <i data-lucide="trash-2"></i>
            </button>
          ` : `
            <button type="button" class="eds-btn eds-btn-secondary" onclick="alert('Downloading verified document from One Point secure storage.')">
              <i data-lucide="download"></i> Download
            </button>
          `}
        </div>
      </article>
    `;
  }

  // ==================== 4. PREVIEW MODAL ====================
  function openDocPreviewModal(doc) {
    const formattedDate = new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const isOnePointProvided = doc.source === "One Point";

    const modalHtml = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:12px; border-bottom:1px solid #e2e8f0;">
          <div>
            <span class="acc-eyebrow" style="font-size:.7rem;">${escapeHtml(doc.category)}</span>
            <h3 style="margin:2px 0 0; font-size:1.15rem; color:#071426;">${escapeHtml(doc.name)}</h3>
          </div>
          <div>${getStatusBadge(doc.status)}</div>
        </div>

        <!-- Masked Secure Preview Box -->
        <div style="background:#f1f5f9; border:2px dashed #cbd5e1; border-radius:12px; padding:30px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:180px;">
          <i data-lucide="file-check-2" style="width:48px; height:48px; color:#075aa8; margin-bottom:8px;"></i>
          <strong style="color:#071426; font-size:.95rem;">${escapeHtml(doc.name)}</strong>
          <small style="color:#64748b; margin-top:2px;">Format: PDF / JPEG &middot; Size: ${escapeHtml(doc.size || '1.4 MB')}</small>
          <span style="display:inline-flex; align-items:center; gap:4px; font-size:.74rem; font-weight:700; color:#15803d; background:#dcfce7; padding:2px 8px; border-radius:999px; margin-top:10px;">
            <i data-lucide="lock" style="width:11px; height:11px;"></i> Encrypted 256-Bit Storage
          </span>
        </div>

        <div class="cpf-view-grid" style="grid-template-columns:1fr 1fr; gap:10px; padding:12px;">
          <div class="cpf-view-row"><small>Associated Request</small><a href="customer-account-order-detail.html?id=${encodeURIComponent(doc.orderId)}" style="color:#075aa8; font-weight:700;">${escapeHtml(doc.orderId)}</a></div>
          <div class="cpf-view-row"><small>Service Domain</small><strong>${escapeHtml(doc.serviceName || "Government E-Service")}</strong></div>
          <div class="cpf-view-row"><small>Uploaded At</small><strong>${formattedDate}</strong></div>
          <div class="cpf-view-row"><small>Document Source</small><strong>${isOnePointProvided ? 'One Point Kendra Desk' : 'Citizen Upload'}</strong></div>
        </div>

        <div class="cpf-form-actions" style="margin-top:4px; justify-content:space-between; flex-wrap:wrap;">
          <div>
            ${!isOnePointProvided ? `
              <button type="button" class="eds-btn eds-btn-ghost" id="m-preview-remove-btn" style="color:#b91c1c; font-size:.8rem;">
                <i data-lucide="trash-2"></i> Request Removal
              </button>
            ` : ''}
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="eds-btn eds-btn-primary" onclick="alert('Downloading authenticated document copy...')">
              <i data-lucide="download"></i> Download Original
            </button>
            <button type="button" class="eds-btn eds-btn-secondary" onclick="closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;

    openModalShell(`Document Preview &mdash; ${doc.name}`, modalHtml);

    const removeBtn = byId("m-preview-remove-btn");
    if (removeBtn) {
      removeBtn.onclick = () => {
        closeModal();
        openRemovalModal(doc);
      };
    }
  }

  // ==================== 5. UPLOAD & REPLACEMENT MODAL ====================
  function openUploadModal(existingDoc) {
    const isReplace = Boolean(existingDoc);
    const title = isReplace ? `Replace ${existingDoc.name}` : "Upload Document to Vault";

    const modalHtml = `
      <form id="m-upload-doc-form" class="cpf-form-grid" style="gap:14px;">
        <div class="cpf-field span-2">
          <label for="m-up-request">Associate with Active Request</label>
          <select class="eds-input" id="m-up-request" name="orderId">
            <option value="OPDS-260824-00123" ${isReplace && existingDoc.orderId === 'OPDS-260824-00123' ? 'selected' : ''}>PAN Card Assistance (OPDS-260824-00123)</option>
            <option value="OPDS-260822-00045" ${isReplace && existingDoc.orderId === 'OPDS-260822-00045' ? 'selected' : ''}>UPSSSC Exam Form (OPDS-260822-00045)</option>
            <option value="OPDS-260820-00012">Voter ID Printing (OPDS-260820-00012)</option>
            <option value="profile">General Profile / Future Requests</option>
          </select>
        </div>

        <div class="cpf-field span-2">
          <label for="m-up-category">Document Purpose / Type</label>
          <select class="eds-input" id="m-up-category" name="category">
            <option value="Identity" ${isReplace && existingDoc.category === 'Identity' ? 'selected' : ''}>Identity Proof (Aadhaar / Voter ID / Passport)</option>
            <option value="Address" ${isReplace && existingDoc.category === 'Address' ? 'selected' : ''}>Address Proof (Electricity Bill / Ration Card)</option>
            <option value="Academic" ${isReplace && existingDoc.category === 'Academic' ? 'selected' : ''}>Educational Marksheet / Certificate</option>
            <option value="Photograph" ${isReplace && existingDoc.name.includes('Photo') ? 'selected' : ''}>Passport Photograph / Signature Scan</option>
            <option value="Business">Business / GST / MSME Registration</option>
          </select>
        </div>

        <!-- Drag & Drop Upload Component -->
        <div class="cpf-field span-2">
          <label>Select File (Max 10 MB)</label>
          <div id="m-drop-zone" style="border:2px dashed #075aa8; border-radius:12px; background:#f8fafc; padding:24px; text-align:center; cursor:pointer; transition:all .15s;">
            <i data-lucide="upload-cloud" style="width:36px; height:36px; color:#075aa8; margin-bottom:6px;"></i>
            <strong style="display:block; font-size:.92rem; color:#071426;">Drop your file here or click to browse</strong>
            <small style="color:#64748b; font-size:.76rem; display:block; margin-top:2px;">Supported: PDF, JPG, JPEG, PNG (Max 10MB)</small>
            <input type="file" id="m-file-input" style="display:none;" accept=".pdf,.jpg,.jpeg,.png,.ai,.svg">
          </div>
          <div id="m-file-selected-name" style="font-size:.82rem; font-weight:700; color:#15803d; margin-top:4px;" hidden></div>
        </div>

        <div class="cpf-form-actions span-2" style="margin-top:6px;">
          <button type="submit" class="eds-btn eds-btn-primary" id="m-submit-upload-btn">
            <i data-lucide="upload"></i> ${isReplace ? 'Upload Replacement' : 'Upload to Vault'}
          </button>
          <button type="button" class="eds-btn eds-btn-secondary" onclick="closeModal()">Cancel</button>
        </div>
      </form>
    `;

    openModalShell(title, modalHtml);

    const dropZone = byId("m-drop-zone");
    const fileInput = byId("m-file-input");
    const selectedName = byId("m-file-selected-name");

    dropZone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          alert("File exceeds maximum allowed size of 10 MB.");
          fileInput.value = "";
          return;
        }
        selectedName.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        selectedName.hidden = false;
      }
    };

    const form = byId("m-upload-doc-form");
    form.onsubmit = (e) => {
      e.preventDefault();
      const submitBtn = byId("m-submit-upload-btn");
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="acc-pulse-dot-green"></span> Encrypting &amp; Uploading...`;

      setTimeout(() => {
        if (isReplace) {
          existingDoc.status = "under_review";
          existingDoc.uploadedAt = new Date().toISOString();
          existingDoc.reason = "";
        } else {
          allDocuments.unshift({
            id: `doc-${Date.now()}`,
            name: selectedName.textContent ? selectedName.textContent.replace("Selected: ", "").split(" (")[0] : "New Identity Document.pdf",
            category: byId("m-up-category").value,
            orderId: byId("m-up-request").value,
            serviceName: "Citizen Request",
            source: "Customer",
            size: "1.8 MB",
            uploadedAt: new Date().toISOString(),
            status: "under_review"
          });
        }
        localStorage.setItem("opds_customer_vault", JSON.stringify(allDocuments));
        closeModal();
        showToast(isReplace ? "✓ Replacement uploaded and sent for operator review." : "✓ Document securely uploaded to vault.");
        renderMetrics(allDocuments);
        renderVault();
      }, 700);
    };
  }

  // ==================== 6. REMOVAL WORKFLOW ====================
  function openRemovalModal(doc) {
    const modalHtml = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <p class="cpf-muted" style="margin:0; font-size:.88rem;">
          You are requesting removal for <strong>${escapeHtml(doc.name)}</strong> (Linked to ${escapeHtml(doc.orderId)}).
        </p>

        <div class="cpf-field">
          <label for="m-rem-reason">Reason for removal <span>(Optional)</span></label>
          <select class="eds-input" id="m-rem-reason">
            <option value="Incorrect document uploaded">Incorrect document uploaded</option>
            <option value="Privacy preference">Privacy preference / outdated scan</option>
            <option value="Service request completed">Service request completed</option>
            <option value="Other">Other reason</option>
          </select>
        </div>

        <p class="cpf-retention-note" style="font-size:.78rem;">
          <i data-lucide="info"></i>
          The document will be removed from your customer view immediately upon approval. Minimum transaction audit records are retained where required for statutory compliance.
        </p>

        <div class="cpf-form-actions" style="margin-top:6px;">
          <button type="button" class="eds-btn eds-btn-primary" id="m-submit-rem-btn" style="background:#b91c1c; border-color:#b91c1c;">
            Submit Removal Request
          </button>
          <button type="button" class="eds-btn eds-btn-secondary" onclick="closeModal()">Cancel</button>
        </div>
      </div>
    `;

    openModalShell(`Request Document Removal &mdash; ${doc.name}`, modalHtml);

    const submitBtn = byId("m-submit-rem-btn");
    if (submitBtn) {
      submitBtn.onclick = () => {
        doc.status = "removal_requested";
        localStorage.setItem("opds_customer_vault", JSON.stringify(allDocuments));
        closeModal();
        showToast("✓ Removal Request DR-260824-102 submitted to Kendra Privacy Officer.");
        renderMetrics(allDocuments);
        renderVault();
      };
    }
  }

  // ==================== 7. INITIALIZE DOCUMENT VAULT ====================
  window.OPDSAccount.ready.then((data) => {
    if (!data) return;

    allDocuments = [
      {
        id: "doc-1",
        name: "Passport Size Photograph (Recent)",
        category: "Identity",
        orderId: "OPDS-260824-00123",
        serviceName: "PAN Card Assistance",
        source: "Customer",
        size: "420 KB",
        uploadedAt: "2026-08-24T10:42:00.000Z",
        status: "needs_replacement",
        reason: "The image is blurred and has high glare. Please upload a clear photo."
      },
      {
        id: "doc-2",
        name: "Aadhaar Card (Front & Reverse)",
        category: "Identity",
        orderId: "OPDS-260824-00123",
        serviceName: "PAN Card Assistance",
        source: "Customer",
        size: "1.4 MB",
        uploadedAt: "2026-08-24T10:40:00.000Z",
        status: "accepted"
      },
      {
        id: "doc-3",
        name: "High School (10th) Marksheet Scan",
        category: "Academic",
        orderId: "OPDS-260822-00045",
        serviceName: "UPSSSC Exam Form",
        source: "Customer",
        size: "2.1 MB",
        uploadedAt: "2026-08-22T09:16:00.000Z",
        status: "accepted"
      },
      {
        id: "doc-4",
        name: "Electricity Bill (LDA Colony Proof)",
        category: "Address",
        orderId: "OPDS-260820-00012",
        serviceName: "Voter ID Printing",
        source: "Customer",
        size: "980 KB",
        uploadedAt: "2026-08-20T14:02:00.000Z",
        status: "accepted"
      },
      {
        id: "doc-5",
        name: "Official UPSSSC Confirmation Slip.pdf",
        category: "Output",
        orderId: "OPDS-260822-00045",
        serviceName: "UPSSSC Exam Form",
        source: "One Point",
        size: "540 KB",
        uploadedAt: "2026-08-22T09:25:00.000Z",
        status: "accepted"
      },
      {
        id: "doc-6",
        name: "Older Domicile Certificate Scan",
        category: "Address",
        orderId: "OPDS-260818-00008",
        serviceName: "Domicile Certificate",
        source: "Customer",
        size: "1.1 MB",
        uploadedAt: "2026-08-18T11:00:00.000Z",
        status: "removal_requested"
      }
    ];

    renderMetrics(allDocuments);
    renderCategoryFilters();
    renderVault();

    const uploadBtn = byId("acc-vault-upload-btn");
    if (uploadBtn) uploadBtn.onclick = () => openUploadModal(null);

    const searchInput = byId("acc-vault-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        renderVault();
      });
    }

    const groupSelect = byId("acc-vault-group-select");
    if (groupSelect) {
      groupSelect.addEventListener("change", (e) => {
        activeGrouping = e.target.value;
        renderVault();
      });
    }

    if (window.lucide) window.lucide.createIcons();
  }).catch((error) => {
    console.error("[customer-account-vault]", error);
  });
})();
