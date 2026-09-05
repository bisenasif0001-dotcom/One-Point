(function () {
  "use strict";

  function byId(id) { return document.getElementById(id); }

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

  function renderMasterHeader(order) {
    const header = byId("acc-detail-master-header");
    if (!header) return;
    const acc = window.OPDSAccount;
    const orderId = acc.escapeHtml(order.orderId || "");
    const serviceName = acc.escapeHtml(order.items?.[0]?.name || "Service Application");
    const submittedDate = acc.formatDate(order.createdAt);
    const payStatus = String(order.paymentStatus || "").toLowerCase();
    const isPaid = ["paid", "captured", "success", "settled"].includes(payStatus);
    const reqAction = acc.getRequestAction(order);

    header.innerHTML = `
      <div class="acc-detail-head-top">
        <div class="acc-detail-head-left">
          <div class="acc-req-badge-row" style="margin-bottom: 6px;">
            ${acc.categoryBadgeHtml(order)}
            <span class="acc-order-id-pill">
              <code>${orderId}</code>
              <button type="button" class="acc-copy-btn" id="acc-head-copy-btn" data-copy-text="${orderId}" title="Copy Request ID">
                <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
              </button>
            </span>
          </div>
          <h1 class="acc-detail-title">${serviceName}</h1>
          <div class="acc-detail-meta-line">
            <span>Submitted on ${submittedDate}</span>
            <span class="acc-dot-sep">&bull;</span>
            <span>Delivery: <strong>Digital / Portal Filing</strong></span>
          </div>
        </div>

        <div class="acc-detail-head-right">
          <div class="acc-detail-price-box">
            ${acc.statusBadgeHtml(order)}
            <strong class="acc-detail-price-text">${isPaid ? `${acc.money(order.amount)} Paid` : `Payment Due: ${acc.money(order.amount)}`}</strong>
          </div>
          <div class="acc-detail-head-cta-box">
            ${reqAction.requiresAction ? (
              reqAction.actionType === "pay" ? `
                <button type="button" class="eds-btn eds-btn-primary" id="acc-head-pay-btn">
                  <i data-lucide="lock"></i> ${reqAction.ctaLabel}
                </button>
              ` : `
                <a href="#acc-next-step-box" class="eds-btn eds-btn-primary">
                  <i data-lucide="${reqAction.ctaIcon}"></i> ${reqAction.ctaLabel}
                </a>
              `
            ) : `
              <span class="acc-no-action-badge"><i data-lucide="check-check"></i> No Action Needed</span>
            `}
          </div>
        </div>
      </div>

      <div class="acc-detail-head-controls">
        <button type="button" class="acc-head-control-btn" id="acc-copy-link-btn">
          <i data-lucide="link"></i> Copy Link
        </button>
        <a href="https://wa.me/919473946181?text=Hi%2C%20I%20need%20help%20with%20request%20${encodeURIComponent(order.orderId)}." target="_blank" rel="noopener" class="acc-head-control-btn">
          <i data-lucide="message-circle"></i> WhatsApp Support
        </a>
        <button type="button" class="acc-head-control-btn" onclick="window.print()">
          <i data-lucide="printer"></i> Print Details
        </button>
      </div>
    `;

    const copyBtn = byId("acc-head-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(order.orderId).then(() => showToast("Request ID copied to clipboard."));
      });
    }
    const copyLinkBtn = byId("acc-copy-link-btn");
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href).then(() => showToast("Link copied to clipboard."));
      });
    }
    const payBtn = byId("acc-head-pay-btn");
    if (payBtn) {
      payBtn.addEventListener("click", () => acc.resumePayment(order, payBtn));
    }
  }

  function renderNextStep(order) {
    const box = byId("acc-next-step-box");
    if (!box) return;
    const acc = window.OPDSAccount;
    const bucket = acc.classifyOrder(order);
    const rawStatus = String(order.status || "").toLowerCase();
    const payStatus = String(order.paymentStatus || "").toLowerCase();
    const isApproved = localStorage.getItem(`opds_draft_approved_${order.orderId}`);

    if (payStatus !== "paid" && ["pending", "created", "session_created", "failed"].includes(payStatus)) {
      box.className = "cpf-card acc-next-step-card acc-next-step-alert";
      box.innerHTML = `
        <div class="acc-next-step-icon"><i data-lucide="credit-card"></i></div>
        <div class="acc-next-step-copy">
          <span class="acc-next-step-tag">Payment Required</span>
          <strong>Complete Facilitation Fee Payment</strong>
          <p>Your request is ready to continue after payment. Once payment of ${acc.money(order.amount)} is confirmed, our Lucknow Kendra operators will immediately verify your documents and initiate portal drafting.</p>
          <div style="margin-top: 10px;">
            <button type="button" class="eds-btn eds-btn-primary" id="acc-next-pay-btn">
              <i data-lucide="lock"></i> Pay ${acc.money(order.amount)} Securely
            </button>
          </div>
        </div>
      `;
      const btn = byId("acc-next-pay-btn");
      if (btn) btn.addEventListener("click", () => acc.resumePayment(order, btn));
      return;
    }

    if (!isApproved && ["documents_required", "documents_pending", "draft_review", "draft_ready"].includes(rawStatus)) {
      box.className = "cpf-card acc-next-step-card acc-next-step-alert";
      box.innerHTML = `
        <div class="acc-next-step-icon"><i data-lucide="file-check-2"></i></div>
        <div class="acc-next-step-copy">
          <span class="acc-next-step-tag">Action Required</span>
          <strong>Review &amp; Authorize Application Draft</strong>
          <p>Our Kendra operator has prepared your form draft. Please inspect all spelling, DOB, and address entries below to authorize official filing.</p>
          <div style="margin-top: 10px;">
            <a href="#acc-draft-section" class="eds-btn eds-btn-primary">
              <i data-lucide="file-check-2"></i> Inspect Application Draft
            </a>
          </div>
        </div>
      `;
      return;
    }

    if (rawStatus === "documents_required" || rawStatus === "documents_pending") {
      box.className = "cpf-card acc-next-step-card acc-next-step-alert";
      box.innerHTML = `
        <div class="acc-next-step-icon"><i data-lucide="alert-triangle"></i></div>
        <div class="acc-next-step-copy">
          <span class="acc-next-step-tag">Action Required</span>
          <strong>We Need a Clearer Document Upload</strong>
          <p>Please upload a clearer passport-size photograph or identity proof below. Request will remain paused until uploaded.</p>
          <div style="margin-top: 10px;">
            <a href="#acc-order-documents" class="eds-btn eds-btn-primary">
              <i data-lucide="upload-cloud"></i> Upload Replacement Document
            </a>
          </div>
        </div>
      `;
      return;
    }

    if (bucket === "completed") {
      box.className = "cpf-card acc-next-step-card acc-next-step-success";
      box.innerHTML = `
        <div class="acc-next-step-icon"><i data-lucide="check-check"></i></div>
        <div class="acc-next-step-copy">
          <span class="acc-next-step-tag" style="background:#dcfce7; color:#15803d;">Service Completed</span>
          <strong>Application Processed &amp; Delivered Successfully</strong>
          <p>All milestones are complete. You can download the Official Department Acknowledgement Slip, Form Copy, and One Point Tax Invoice below.</p>
        </div>
      `;
      return;
    }

    // Default In-Progress / No Action Needed
    box.className = "cpf-card acc-next-step-card acc-next-step-info";
    box.innerHTML = `
      <div class="acc-next-step-icon"><i data-lucide="clock"></i></div>
      <div class="acc-next-step-copy">
        <span class="acc-next-step-tag" style="background:#e0f2fe; color:#0369a1;">No Action Needed</span>
        <strong>Your Application is Actively Being Processed</strong>
        <p>Your documents are currently under operator review and portal submission queue. We’ll notify you on WhatsApp/SMS when the next milestone is reached.</p>
      </div>
    `;
  }

  function renderDraftSection(order, profile) {
    const section = byId("acc-draft-section");
    if (!section) return;
    const isApproved = localStorage.getItem(`opds_draft_approved_${order.orderId}`);
    const status = String(order.status || "").toLowerCase();
    const showDraft = ["documents_required", "documents_pending", "under_review", "active", "processing", "created", "draft_ready", "draft_review"].includes(status);
    
    if (!showDraft) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    const applicantName = profile.identity?.name || "Asif Bisen";
    const mobile = profile.identity?.mobile || "9473946181";
    const serviceName = order.items?.[0]?.name || "Application Form";

    const grid = byId("acc-draft-grid");
    grid.innerHTML = `
      <div class="acc-draft-field"><small>Applicant Full Name</small><strong>${applicantName}</strong></div>
      <div class="acc-draft-field"><small>Primary Mobile</small><strong>${mobile}</strong></div>
      <div class="acc-draft-field"><small>Target Service</small><strong>${serviceName}</strong></div>
      <div class="acc-draft-field"><small>Issuing Board / Dept</small><strong>Official Govt Authority</strong></div>
      <div class="acc-draft-field"><small>Draft Verification</small><strong>${isApproved ? '<span style="color:#15803d; font-weight:700;">✓ Approved by Applicant</span>' : '<span style="color:#b45309; font-weight:700;">Pending Your Approval</span>'}</strong></div>
      <div class="acc-draft-field"><small>Kendra Operator Desk</small><strong>One Point Suvidha Kendra Lucknow</strong></div>
    `;

    const approveBtn = byId("acc-approve-draft-btn");
    const correctionBtn = byId("acc-correction-draft-btn");

    if (isApproved) {
      approveBtn.disabled = true;
      approveBtn.innerHTML = `<i data-lucide="check-check"></i> Draft Approved (${isApproved})`;
      approveBtn.className = "eds-btn eds-btn-secondary";
    } else {
      approveBtn.disabled = false;
      approveBtn.innerHTML = `<i data-lucide="check-circle-2"></i> Approve &amp; Authorize Filing`;
      approveBtn.className = "eds-btn eds-btn-primary";
      approveBtn.onclick = () => {
        const timeStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        localStorage.setItem(`opds_draft_approved_${order.orderId}`, timeStr);
        showToast("Application draft approved! Lucknow operator has been authorized to file.");
        renderDraftSection(order, profile);
        renderNextStep(order);
        renderMasterHeader(order);
        if (window.lucide) window.lucide.createIcons();
      };
    }

    if (correctionBtn) {
      correctionBtn.href = `https://wa.me/919473946181?text=Hello%20One%20Point%20Operator%2C%20I%20have%20a%20correction%20for%20Draft%20Request%20${encodeURIComponent(order.orderId)}%3A%20`;
    }
  }

  function renderTimeline(order) {
    const container = byId("acc-order-timeline");
    if (!container) return;
    const acc = window.OPDSAccount;
    const steps = acc.getTimelineSteps(order);

    container.innerHTML = steps.map((step) => {
      const cls = step.status === "completed" ? "done" : step.status === "active" ? "active" : "";
      return `
        <div class="acc-timeline-step ${cls}">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
            <strong>${acc.escapeHtml(step.title)}</strong>
            <small class="cpf-muted" style="font-size: .76rem; font-weight:600;">${step.time}</small>
          </div>
          <span>${acc.escapeHtml(step.desc)}</span>
        </div>
      `;
    }).join("");
  }

  function renderDocumentsChecklist(order) {
    const container = byId("acc-order-documents");
    if (!container) return;
    const acc = window.OPDSAccount;

    const docs = order.documents || [
      { name: "Aadhaar Card (Front & Back)", docType: "Identity Proof", status: "accepted", statusLabel: "Accepted", note: "UIDAI compliant" },
      { name: "Passport Size Photograph", docType: "Candidate Photo", status: "needs_replacement", statusLabel: "Needs Replacement", note: "Photo appears slightly blurred. Please re-upload clear scan." },
      { name: "10th Marksheet / Birth Proof", docType: "DOB Proof", status: "under_review", statusLabel: "Under Review", note: "Being verified by operator" }
    ];

    container.innerHTML = docs.map((doc, idx) => {
      const isAccepted = doc.status === "accepted";
      const isNeedsRep = doc.status === "needs_replacement";
      const isUnderReview = doc.status === "under_review";

      return `
        <div class="acc-doc-checklist-item ${isNeedsRep ? 'acc-doc-item-warning' : ''}">
          <div class="acc-doc-check-left">
            <span class="acc-doc-check-icon ${isAccepted ? 'ok' : isNeedsRep ? 'warn' : 'info'}">
              <i data-lucide="${isAccepted ? 'check' : isNeedsRep ? 'alert-triangle' : 'clock'}"></i>
            </span>
            <div class="acc-doc-check-info">
              <strong>${acc.escapeHtml(doc.name)}</strong>
              <small class="cpf-muted">${acc.escapeHtml(doc.docType)} &middot; ${acc.escapeHtml(doc.note)}</small>
            </div>
          </div>
          <div class="acc-doc-check-right">
            <span class="acc-doc-status-tag ${doc.status}">
              ${doc.statusLabel}
            </span>
            ${isNeedsRep ? `
              <button type="button" class="eds-btn eds-btn-primary" style="font-size:.76rem; padding:4px 10px; min-height:30px;" onclick="alert('Open file selector for ${doc.name}')">
                <i data-lucide="upload" style="width:12px; height:12px;"></i> Upload
              </button>
            ` : `
              <button type="button" class="eds-btn eds-btn-secondary" style="font-size:.76rem; padding:4px 10px; min-height:30px;" onclick="alert('Viewing verified file: ${doc.name}')">
                <i data-lucide="eye" style="width:12px; height:12px;"></i> View
              </button>
            `}
          </div>
        </div>
      `;
    }).join("");
  }

  function renderActivityStream(order) {
    const container = byId("acc-order-activity");
    if (!container) return;
    const acc = window.OPDSAccount;

    const activities = [
      { time: "Today, 2:14 PM", title: "Document verification completed by Lucknow Kendra desk.", icon: "user-check", actor: "Operator" },
      { time: "Today, 12:42 PM", title: "Candidate photo and application data uploaded.", icon: "upload", actor: "Citizen" },
      { time: "24 Aug, 10:32 AM", title: `Payment of ${acc.money(order.amount)} received via Razorpay UPI.`, icon: "credit-card", actor: "Payment" },
      { time: "24 Aug, 10:28 AM", title: "Service request created on One Point Citizen Portal.", icon: "plus-circle", actor: "System" }
    ];

    container.innerHTML = activities.map((act) => `
      <div class="acc-activity-row-rich">
        <span class="acc-act-icon"><i data-lucide="${act.icon}"></i></span>
        <div class="acc-act-body">
          <div class="acc-act-head">
            <strong>${acc.escapeHtml(act.title)}</strong>
            <small>${act.time}</small>
          </div>
          <span class="acc-act-actor">Actor: ${act.actor}</span>
        </div>
      </div>
    `).join("");
  }

  function renderSummaryGrid(order) {
    const grid = byId("acc-order-summary-grid");
    if (!grid) return;
    const acc = window.OPDSAccount;
    const cat = acc.getServiceCategory(order);
    const payStatus = String(order.paymentStatus || "pending").toLowerCase();
    const isPaid = ["paid", "captured", "success", "settled"].includes(payStatus);

    grid.innerHTML = `
      <span><small>Service Category</small><strong>${cat.label}</strong></span>
      <span><small>Request ID</small><strong style="font-family:monospace;">${acc.escapeHtml(order.orderId)}</strong></span>
      <span><small>Date Submitted</small><strong>${acc.formatDate(order.createdAt)}</strong></span>
      <span><small>Delivery Mode</small><strong>Digital / Assisted Portal</strong></span>
      <span><small>Payment</small><strong style="color:${isPaid ? '#15803d' : '#075aa8'};">${isPaid ? 'Paid' : 'Pending'}</strong></span>
      <span><small>Current Stage</small><strong>${acc.getContextualDisplayStatus(order)}</strong></span>
    `;
  }

  function renderPaymentSummary(order) {
    const table = byId("acc-payment-summary");
    const actionsBox = byId("acc-payment-actions-box");
    if (!table) return;
    const acc = window.OPDSAccount;

    const officialFee = Number(order.officialFee || 0);
    const assistanceFee = Number(order.assistanceFee || (order.amount - officialFee));
    const total = Number(order.amount || 0);
    const payStatus = String(order.paymentStatus || "").toLowerCase();
    const isPaid = ["paid", "captured", "success", "settled"].includes(payStatus);

    table.innerHTML = `
      <tr><td>One Point Assistance Fee</td><td>${acc.money(assistanceFee)}</td></tr>
      ${officialFee > 0 ? `<tr><td>Official Portal Fee</td><td>${acc.money(officialFee)}</td></tr>` : ''}
      <tr><td>Statutory Taxes &amp; GST</td><td>Included</td></tr>
      <tr class="total"><td>Total Amount</td><td>${acc.money(total)}</td></tr>
      <tr><td>Amount Paid</td><td style="color:#15803d;">${isPaid ? acc.money(total) : 'Rs. 0.00'}</td></tr>
      ${!isPaid ? `<tr class="acc-pay-due"><td>Amount Due</td><td>${acc.money(total)}</td></tr>` : ''}
    `;

    if (actionsBox) {
      if (isPaid) {
        actionsBox.innerHTML = `
          <button type="button" class="eds-btn eds-btn-secondary" style="width:100%;" onclick="window.print()">
            <i data-lucide="printer"></i> Print Tax Invoice
          </button>
        `;
      } else {
        actionsBox.innerHTML = `
          <button type="button" class="eds-btn eds-btn-primary" id="acc-pay-sidebar-btn" style="width:100%;">
            <i data-lucide="lock"></i> Pay ${acc.money(total)} Securely
          </button>
        `;
        const payBtn = byId("acc-pay-sidebar-btn");
        if (payBtn) payBtn.addEventListener("click", () => acc.resumePayment(order, payBtn));
      }
    }
  }

  function renderDownloads(order) {
    const list = byId("acc-downloads-list");
    if (!list) return;
    const acc = window.OPDSAccount;
    const isCompleted = ["completed", "delivered", "paid"].includes(String(order.status || "").toLowerCase());

    list.innerHTML = `
      <div class="acc-download-item">
        <div class="acc-download-item-left">
          <i data-lucide="receipt" class="acc-dl-icon"></i>
          <div>
            <strong>Payment Receipt</strong>
            <small>One Point GST Tax Invoice (PDF)</small>
          </div>
        </div>
        <button type="button" class="eds-btn eds-btn-secondary acc-dl-btn" onclick="window.print()">
          <i data-lucide="download" style="width:12px; height:12px;"></i> PDF
        </button>
      </div>

      <div class="acc-download-item">
        <div class="acc-download-item-left">
          <i data-lucide="file-text" class="acc-dl-icon"></i>
          <div>
            <strong>Application Copy</strong>
            <small>Form entries &amp; citizen draft (PDF)</small>
          </div>
        </div>
        <button type="button" class="eds-btn eds-btn-secondary acc-dl-btn" onclick="alert('Downloading Application Copy PDF for ${order.orderId}')">
          <i data-lucide="download" style="width:12px; height:12px;"></i> PDF
        </button>
      </div>

      <div class="acc-download-item">
        <div class="acc-download-item-left">
          <i data-lucide="stamp" class="acc-dl-icon"></i>
          <div>
            <strong>Official Submission Slip</strong>
            <small>${isCompleted ? 'Govt Dept. Acknowledgement Token' : 'Available after authority filing'}</small>
          </div>
        </div>
        ${isCompleted ? `
          <button type="button" class="eds-btn eds-btn-primary acc-dl-btn" onclick="alert('Downloading Official Department Acknowledgement Slip for ${order.orderId}')">
            <i data-lucide="download-cloud" style="width:12px; height:12px;"></i> Slip
          </button>
        ` : `
          <span class="acc-dl-locked" title="Available once filed"><i data-lucide="lock" style="width:12px; height:12px;"></i> Locked</span>
        `}
      </div>
    `;
  }

  function setupSupportLinks(order) {
    const waLink = byId("acc-order-wa-link");
    const ticketLink = byId("acc-order-ticket-link");
    const encodedId = encodeURIComponent(order.orderId);

    if (waLink) {
      waLink.href = `https://wa.me/919473946181?text=Hi%2C%20I%20need%20help%20with%20request%20${encodedId}.`;
    }
    if (ticketLink) {
      ticketLink.href = `support.html?requestId=${encodedId}`;
    }
  }

  function renderMobileStickyBar(order) {
    const bar = byId("acc-mobile-sticky-bar");
    if (!bar) return;
    const acc = window.OPDSAccount;
    const reqAction = acc.getRequestAction(order);

    bar.hidden = false;
    bar.innerHTML = `
      <div class="acc-mob-bar-left">
        <small>Request ${acc.escapeHtml(order.orderId)}</small>
        <strong>${acc.getContextualDisplayStatus(order)}</strong>
      </div>
      <div class="acc-mob-bar-right">
        ${reqAction.requiresAction ? (
          reqAction.actionType === "pay" ? `
            <button type="button" class="eds-btn eds-btn-primary" id="acc-mob-pay-btn">
              <i data-lucide="lock"></i> Pay ${acc.money(order.amount)}
            </button>
          ` : `
            <a href="#acc-next-step-box" class="eds-btn eds-btn-primary">
              <i data-lucide="${reqAction.ctaIcon}"></i> ${reqAction.ctaLabel}
            </a>
          `
        ) : `
          <a href="https://wa.me/919473946181?text=Hi%2C%20I%20need%20help%20with%20request%20${encodeURIComponent(order.orderId)}." target="_blank" rel="noopener" class="eds-btn eds-btn-secondary">
            <i data-lucide="message-circle"></i> Chat Desk
          </a>
        `}
      </div>
    `;

    const mobPayBtn = byId("acc-mob-pay-btn");
    if (mobPayBtn) {
      mobPayBtn.addEventListener("click", () => acc.resumePayment(order, mobPayBtn));
    }
  }

  window.OPDSAccount.ready.then((data) => {
    if (!data) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("id") || "";
    const order = data.orders.find((item) => item.orderId === orderId) || data.orders[0];

    // Preserve back link query
    const backLink = byId("acc-detail-back-link");
    if (backLink) {
      const returnFilter = params.get("returnFilter");
      if (returnFilter) backLink.href = `customer-account-orders.html?filter=${encodeURIComponent(returnFilter)}`;
    }

    if (!order) {
      byId("acc-order-not-found").hidden = false;
      byId("acc-order-content").hidden = true;
      return;
    }

    byId("acc-order-content").hidden = false;
    renderMasterHeader(order);
    renderNextStep(order);
    renderDraftSection(order, data.profile);
    renderTimeline(order);
    renderDocumentsChecklist(order);
    renderActivityStream(order);
    renderSummaryGrid(order);
    renderPaymentSummary(order);
    renderDownloads(order);
    setupSupportLinks(order);
    renderMobileStickyBar(order);

    if (window.lucide) window.lucide.createIcons();
  }).catch((error) => {
    console.error("[customer-account-order-detail]", error);
  });
})();
