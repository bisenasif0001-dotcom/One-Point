(function () {
  "use strict";

  let allNotifications = [];
  let activeTab = "all";

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

  // ==================== 1. TABS & FILTERING ====================
  function initTabs() {
    const tabBtns = document.querySelectorAll("[data-notif-tab]");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.getAttribute("data-notif-tab");
        tabBtns.forEach((b) => {
          const isMatch = b === btn;
          b.classList.toggle("active", isMatch);
          b.setAttribute("aria-selected", String(isMatch));
        });
        renderNotifications();
      });
    });
  }

  function updateBadges() {
    const unreadCount = allNotifications.filter((n) => !n.read).length;
    const actionCount = allNotifications.filter((n) => !n.read && n.severity === "action").length;

    const bAll = byId("notif-count-all");
    const bAct = byId("notif-count-action");

    if (bAll) bAll.textContent = unreadCount;
    if (bAct) bAct.textContent = actionCount;
  }

  // ==================== 2. RENDER NOTIFICATIONS ====================
  function renderNotifications() {
    const stream = byId("acc-notifications-stream");
    if (!stream) return;

    const filtered = allNotifications.filter((n) => {
      if (activeTab === "action" && n.severity !== "action") return false;
      if (activeTab === "requests" && n.category !== "requests") return false;
      if (activeTab === "payments" && n.category !== "payments") return false;
      if (activeTab === "security" && n.category !== "security") return false;
      return true;
    });

    if (!filtered.length) {
      stream.innerHTML = `
        <div class="acc-empty-state acc-empty-state-rich" style="padding:40px 20px;">
          <span><i data-lucide="check-circle-2"></i></span>
          <strong>You're all caught up!</strong>
          <p>No new service notifications or action items in this category.</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    stream.innerHTML = filtered.map((n, idx) => {
      const isUnread = !n.read;
      const isAction = n.severity === "action";
      const isSuccess = n.severity === "success";
      const isSecurity = n.severity === "security";

      return `
        <article class="acc-notif-stream-row ${isUnread ? 'unread' : ''} ${isAction ? 'acc-notif-row-action' : ''}">
          <div class="acc-notif-stream-icon ${isAction ? 'warn' : isSuccess ? 'ok' : isSecurity ? 'sec' : 'info'}">
            <i data-lucide="${isAction ? 'alert-triangle' : isSuccess ? 'check-circle' : isSecurity ? 'shield-alert' : 'bell'}"></i>
          </div>

          <div class="acc-notif-stream-body">
            <div class="acc-notif-stream-head">
              <div class="acc-notif-head-titles">
                <div class="acc-notif-title-row">
                  <strong class="acc-notif-stream-title">${escapeHtml(n.title)}</strong>
                  ${isUnread ? `<span class="acc-notif-unread-pill"><span class="acc-notif-unread-dot"></span> New</span>` : ''}
                </div>
                <div class="acc-notif-meta-tags">
                  <span class="acc-notif-time"><i data-lucide="clock"></i> ${escapeHtml(n.timeAgo)}</span>
                  ${n.entityId ? `<span class="acc-notif-entity"><i data-lucide="tag"></i> ${escapeHtml(n.entityId)}</span>` : ''}
                </div>
              </div>
              <div class="acc-notif-head-actions">
                ${isUnread ? `
                  <button type="button" class="acc-mark-read-btn" data-mark-read="${idx}" title="Mark as read">
                    <i data-lucide="check"></i> <span>Mark Read</span>
                  </button>
                ` : '<span class="acc-notif-read-check" title="Read"><i data-lucide="check-check"></i></span>'}
              </div>
            </div>

            <p class="acc-notif-stream-msg">${escapeHtml(n.message)}</p>

            ${n.actionUrl ? `
              <div class="acc-notif-stream-action-row">
                <a href="${escapeHtml(n.actionUrl)}" class="acc-notif-action-btn ${isAction ? 'acc-notif-btn-primary' : 'acc-notif-btn-secondary'}">
                  <span>${escapeHtml(n.actionLabel || "View Details")}</span>
                  <i data-lucide="arrow-right"></i>
                </a>
              </div>
            ` : ''}
          </div>
        </article>
      `;
    }).join("");

    // Attach mark as read handlers
    stream.querySelectorAll("[data-mark-read]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.markRead);
        filtered[idx].read = true;
        updateBadges();
        renderNotifications();
      };
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ==================== 3. INITIALIZE NOTIFICATIONS ====================
  window.OPDSAccount.ready.then((data) => {
    if (!data) return;

    allNotifications = [
      {
        id: "notif-1",
        category: "requests",
        severity: "action",
        title: "Action Required: Clearer Passport Photo Needed",
        message: "Your PAN Card correction application is currently paused. The uploaded photograph appears blurred. Please upload a clear photo scan to proceed.",
        entityId: "OPDS-260824-00123",
        actionUrl: "customer-account-order-detail.html?id=OPDS-260824-00123",
        actionLabel: "Upload Replacement Photo",
        timeAgo: "18 mins ago",
        read: false
      },
      {
        id: "notif-2",
        category: "payments",
        severity: "success",
        title: "Payment Received & GST Tax Invoice Ready",
        message: "Your facilitation payment of ₹399 via UPI was confirmed. Official GST Tax Invoice OPDS-INV-2026-00123 is available in your archive.",
        entityId: "TXN-260824-00123",
        actionUrl: "customer-account-invoices.html",
        actionLabel: "Download Tax Invoice",
        timeAgo: "2 hours ago",
        read: false
      },
      {
        id: "notif-3",
        category: "requests",
        severity: "success",
        title: "UPSSSC Exam Registration Completed",
        message: "Kendra operator has completed online submission on the official portal. Department Acknowledgement Slip has been saved to your Document Vault.",
        entityId: "OPDS-260822-00045",
        actionUrl: "customer-account-vault.html",
        actionLabel: "View in Document Vault",
        timeAgo: "2 days ago",
        read: false
      },
      {
        id: "notif-4",
        category: "security",
        severity: "info",
        title: "Security Credentials Updated",
        message: "Your account password was updated successfully from Chrome on Windows (Lucknow Kendra Network).",
        entityId: "Account Settings",
        actionUrl: "customer-profile.html",
        actionLabel: "Review Security Settings",
        timeAgo: "12 days ago",
        read: true
      }
    ];

    initTabs();
    updateBadges();
    renderNotifications();

    const markAllBtn = byId("acc-notif-mark-all-read-btn");
    if (markAllBtn) {
      markAllBtn.onclick = () => {
        allNotifications.forEach((n) => n.read = true);
        showToast("✓ All notifications marked as read.");
        updateBadges();
        renderNotifications();
      };
    }

    if (window.lucide) window.lucide.createIcons();
  }).catch((error) => {
    console.error("[customer-account-notifications]", error);
  });
})();
