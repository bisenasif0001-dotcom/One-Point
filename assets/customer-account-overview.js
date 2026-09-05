(function () {
  "use strict";

  function greetingPrefix() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function renderActionHub(profile, orders) {
    const hub = document.getElementById("acc-action-required-hub");
    if (!hub) return;

    const acc = window.OPDSAccount;
    const identity = profile.identity || {};
    const actions = [];

    // 1. Check Profile / Account actions
    if (!identity.phoneVerified && identity.mobile) {
      actions.push({
        type: "verification",
        icon: "smartphone",
        title: "Mobile Verification Required",
        desc: `Verify your registered phone (+91 ${identity.mobile}) with a quick 6-digit OTP.`,
        ctaLabel: "Verify Phone",
        ctaHref: "customer-profile.html"
      });
    }

    if (!identity.emailVerified && identity.email) {
      actions.push({
        type: "verification",
        icon: "mail",
        title: "Email Confirmation Pending",
        desc: `Confirm your email (${identity.email}) to receive digital certificates & tax receipts.`,
        ctaLabel: "Verify Email",
        ctaHref: "customer-profile.html"
      });
    }

    if (!identity.hasPassword) {
      actions.push({
        type: "security",
        icon: "key-round",
        title: "Set Permanent Password",
        desc: "Secure your account so you can log in with a password anytime.",
        ctaLabel: "Create Password",
        ctaHref: "customer-profile.html"
      });
    }

    // 2. Check Order actions (Pending documents, draft approval, pending payments)
    orders.forEach((order) => {
      const bucket = acc.classifyOrder(order);
      const isDraftApproved = localStorage.getItem(`opds_draft_approved_${order.orderId}`);
      const serviceName = order.items?.[0]?.name || "Service Application";

      if (bucket === "action" || (order.status === "documents_pending" && !isDraftApproved)) {
        actions.push({
          type: "order-action",
          icon: "alert-triangle",
          title: serviceName,
          actionMsg: "Your draft application is ready for citizen confirmation & sign-off.",
          reqId: order.orderId,
          ctaLabel: "Review & Sign-Off",
          ctaHref: `customer-account-order-detail.html?id=${encodeURIComponent(order.orderId)}`
        });
      } else if (bucket === "pending") {
        actions.push({
          type: "payment",
          icon: "credit-card",
          title: serviceName,
          actionMsg: `Payment of ${acc.money(order.amount)} is pending. Complete payment to start official filing.`,
          reqId: order.orderId,
          ctaLabel: `Pay ${acc.money(order.amount)}`,
          orderRef: order
        });
      }
    });

    hub.hidden = false;

    if (!actions.length) {
      hub.innerHTML = `
        <div class="acc-action-all-clear">
          <span class="acc-all-clear-icon"><i data-lucide="check-circle-2"></i></span>
          <div class="acc-all-clear-copy">
            <strong>You're all caught up!</strong>
            <span>No pending actions are required. All your requests are actively progressing with One Point Suvidha Kendra Lucknow.</span>
          </div>
        </div>`;
      return;
    }

    hub.innerHTML = `
      <div class="acc-spotlight-card">
        <div class="acc-spotlight-header">
          <div class="acc-spotlight-badge-row">
            <span class="acc-spotlight-tag">ACTION REQUIRED</span>
            <span class="acc-spotlight-count-pill">${actions.length} ${actions.length === 1 ? 'Pending Action' : 'Pending Actions'}</span>
          </div>
          ${actions[0]?.reqId ? `
            <div class="acc-spotlight-ref">
              <span>Request ID: <code>${acc.escapeHtml(actions[0].reqId)}</code></span>
            </div>
          ` : ''}
        </div>
        <div class="acc-spotlight-items-list">
          ${actions.map((act, i) => `
            <div class="acc-spotlight-row">
              <div class="acc-spotlight-icon-wrap">
                <span class="acc-spotlight-icon acc-action-icon-${act.type}"><i data-lucide="${act.icon}"></i></span>
              </div>
              <div class="acc-spotlight-content">
                <h3 class="acc-spotlight-heading">${acc.escapeHtml(act.title)}</h3>
                <p class="acc-spotlight-desc">${act.actionMsg || act.desc}</p>
                <div class="acc-spotlight-submeta">
                  <span>Draft Review</span> &middot;
                  <span>₹399 Paid</span> &middot;
                  <span>Updated recently</span>
                </div>
              </div>
              <div class="acc-spotlight-action">
                ${act.orderRef ? `
                  <button type="button" class="eds-btn eds-btn-primary acc-spotlight-cta" data-hub-pay="${i}">
                    <i data-lucide="credit-card"></i> ${act.ctaLabel}
                  </button>
                ` : `
                  <a href="${act.ctaHref}" class="eds-btn eds-btn-primary acc-spotlight-cta">
                    ${act.ctaLabel} <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
                  </a>
                `}
              </div>
            </div>
          `).join("")}
        </div>
      </div>`;

    // Attach payment buttons in action hub
    hub.querySelectorAll("[data-hub-pay]").forEach((btn) => {
      const idx = Number(btn.getAttribute("data-hub-pay"));
      const act = actions[idx];
      if (act && act.orderRef) {
        btn.addEventListener("click", () => acc.resumePayment(act.orderRef, btn));
      }
    });
  }

  function renderSummary(orders) {
    const acc = window.OPDSAccount;
    const counts = { total: orders.length, active: 0, action: 0, pending: 0, completed: 0 };
    orders.forEach((order) => {
      const bucket = acc.classifyOrder(order);
      if (bucket === "active") counts.active += 1;
      else if (bucket === "action") counts.action += 1;
      else if (bucket === "pending") counts.pending += 1;
      else if (bucket === "completed") counts.completed += 1;
    });

    const cards = [
      { key: "total", filter: "all", label: "Total Requests", value: counts.total, icon: "package", alertClass: "" },
      { key: "active", filter: "active", label: "Active Requests", value: counts.active, icon: "loader-circle", alertClass: counts.active > 0 ? "acc-sum-active" : "" },
      { key: "action", filter: "action", label: "Action Needed", value: counts.action, icon: "alert-triangle", alertClass: counts.action > 0 ? "acc-sum-action" : "" },
      { key: "pending", filter: "pending", label: "Pending Payment", value: counts.pending, icon: "clock", alertClass: counts.pending > 0 ? "acc-sum-pending" : "" },
      { key: "completed", filter: "completed", label: "Completed", value: counts.completed, icon: "check-circle-2", alertClass: counts.completed > 0 ? "acc-sum-completed" : "" }
    ];

    const grid = document.getElementById("acc-summary-grid");
    if (!grid) return;

    grid.innerHTML = cards.map((card) => `
      <a class="acc-summary-card ${card.alertClass}" href="customer-account-orders.html?filter=${card.filter}" aria-label="${card.label}: ${card.value}. View filtered requests.">
        <span class="acc-summary-icon acc-summary-icon-${card.key}"><i data-lucide="${card.icon}"></i></span>
        <div class="acc-sum-card-bottom">
          <strong class="acc-sum-number">${card.value}</strong>
          <span class="acc-sum-label">${card.label}</span>
        </div>
      </a>
    `).join("");
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

  function renderRecentOrders(orders) {
    const acc = window.OPDSAccount;
    const container = document.getElementById("acc-recent-orders");
    const viewAll = document.getElementById("acc-view-all-orders");
    if (!container) return;
    const recent = orders.slice(0, 5);
    if (!recent.length) {
      if (viewAll) viewAll.hidden = true;
      container.innerHTML = `
        <div class="acc-empty-state acc-empty-state-rich">
          <span><i data-lucide="package-open"></i></span>
          <strong>No active applications</strong>
          <p>Choose any government, student, or utility service to start your assisted filing.</p>
          <a class="eds-btn eds-btn-primary" href="services.html"><i data-lucide="plus-circle"></i> Start New Request</a>
        </div>`;
      return;
    }
    if (viewAll) viewAll.hidden = false;
    container.innerHTML = recent.map((order, index) => {
      const action = acc.paymentAction(order);
      const step = getMilestoneStep(order);
      const orderId = acc.escapeHtml(order.orderId || "");
      const serviceName = acc.escapeHtml(order.items?.[0]?.name || "Service Application");
      const bucket = acc.classifyOrder(order);
      const isActionNeeded = bucket === "action";

      const isPaid = String(order.paymentStatus || "").toLowerCase() === "paid" || String(order.paymentStatus || "").toLowerCase() === "captured";
      const payLabel = isPaid ? "Paid" : "Payment Due";
      const stageName = step === 1 ? "Payment Required" : (step === 2 ? "Draft Review" : (step === 3 ? "Portal Filing" : "Delivered"));
      const stageDesc = isActionNeeded ? "Your draft is ready for confirmation." : (step === 4 ? "Filing completed & delivered." : "Actively in progress with Kendra.");

      return `
        <article class="acc-order-row ${isActionNeeded ? 'acc-order-row-action-needed' : ''}">
          <div class="acc-order-row-top">
            <!-- Left Info Block -->
            <div class="acc-order-info">
              <div class="acc-order-service-head">
                ${acc.categoryBadgeHtml(order)}
                <a href="customer-account-order-detail.html?id=${encodeURIComponent(order.orderId)}" class="acc-order-title-link">
                  <strong>${serviceName}</strong>
                </a>
              </div>
              <div class="acc-order-subline">
                <span class="acc-order-id-pill">
                  <code>${orderId}</code>
                  <button type="button" class="acc-copy-btn" data-copy-text="${orderId}" title="Copy Tracking ID">
                    <i data-lucide="copy" style="width: 11px; height: 11px;"></i>
                  </button>
                </span>
                <span class="acc-order-date">&middot; ${acc.formatDate(order.createdAt)}</span>
              </div>
            </div>

            <!-- Billing & Actions (Flat, no wrapper boxes) -->
            <div class="acc-order-amount-col">
              <strong class="acc-order-amount-val">${acc.money(order.amount)}</strong>
              <small class="acc-order-amount-status ${isPaid ? 'paid' : 'due'}">${payLabel}</small>
            </div>
            ${action ? `
              <button type="button" class="eds-btn eds-btn-primary acc-pay-now" data-payment-index="${index}">
                <i data-lucide="${action.icon}"></i> ${action.label}
              </button>
            ` : `
              <a href="customer-account-order-detail.html?id=${encodeURIComponent(order.orderId)}" class="acc-btn-journey-view" title="View application details">
                <span>View Request</span> <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
              </a>
            `}
          </div>

          <!-- Full Width 4-Stage Stepper -->
          <div class="acc-order-stepper-full" aria-label="Application Progress">
            <div class="stepper-step ${step >= 1 ? 'done' : ''} ${step === 1 ? 'current' : ''}">
              <span class="step-circle">${step > 1 ? '✓' : (step === 1 ? '●' : '○')}</span>
              <span class="step-lbl">Payment</span>
            </div>
            <span class="stepper-bar ${step >= 2 ? 'done' : ''}"></span>
            <div class="stepper-step ${step >= 2 ? 'done' : ''} ${step === 2 ? 'current' : ''}">
              <span class="step-circle">${step > 2 ? '✓' : (step === 2 ? '●' : '○')}</span>
              <span class="step-lbl">Draft Review</span>
            </div>
            <span class="stepper-bar ${step >= 3 ? 'done' : ''}"></span>
            <div class="stepper-step ${step >= 3 ? 'done' : ''} ${step === 3 ? 'current' : ''}">
              <span class="step-circle">${step > 3 ? '✓' : (step === 3 ? '●' : '○')}</span>
              <span class="step-lbl">Portal Filing</span>
            </div>
            <span class="stepper-bar ${step >= 4 ? 'done' : ''}"></span>
            <div class="stepper-step ${step >= 4 ? 'done' : ''} ${step === 4 ? 'current' : ''}">
              <span class="step-circle">${step === 4 ? '✓' : '○'}</span>
              <span class="step-lbl">Delivered</span>
            </div>
          </div>
        </article>`;
    }).join("");

    container.querySelectorAll("[data-payment-index]").forEach((button) => {
      button.addEventListener("click", () => acc.resumePayment(recent[Number(button.dataset.paymentIndex)], button));
    });

    container.querySelectorAll("[data-copy-text]").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = button.getAttribute("data-copy-text");
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          const orig = button.innerHTML;
          button.innerHTML = `<span style="font-size:10px; color:#15803d; font-weight:700;">Copied!</span>`;
          setTimeout(() => { button.innerHTML = orig; if (window.lucide) window.lucide.createIcons(); }, 1600);
        }).catch(() => {});
      });
    });
  }

  window.OPDSAccount.ready.then((data) => {
    if (!data) return;
    const greetingEl = document.getElementById("acc-greeting-text");
    if (greetingEl) greetingEl.textContent = `${greetingPrefix()}, ${data.profile.identity.name || "Customer"}`;
    renderActionHub(data.profile, data.orders);
    renderSummary(data.orders);
    renderRecentOrders(data.orders);
    if (window.lucide) window.lucide.createIcons();
  }).catch((error) => {
    console.error("[customer-account-overview]", error);
  });
})();
