(function () {
  "use strict";

  const NAV_ITEMS = [
    { key: "overview", label: "Overview", icon: "layout-dashboard", href: "customer-account-overview.html" },
    { key: "orders", label: "My Requests & Orders", icon: "package", href: "customer-account-orders.html" },
    { key: "payments", label: "Payments & Billing", icon: "credit-card", href: "customer-account-payments.html" },
    { key: "invoices", label: "Invoices & Receipts", icon: "receipt", href: "customer-account-invoices.html" },
    { key: "vault", label: "My Documents", icon: "shield-check", href: "customer-account-vault.html" },
    { key: "notifications", label: "Notifications", icon: "bell", href: "customer-account-notifications.html" },
    { key: "profile", label: "Account Settings", icon: "user-round", href: "customer-profile.html" },
    { key: "support", label: "Support Desk", icon: "life-buoy", href: "support.html" }
  ];

  const BOTTOM_NAV_ITEMS = [
    { key: "overview", label: "Overview", icon: "layout-dashboard", href: "customer-account-overview.html" },
    { key: "orders", label: "Requests", icon: "package", href: "customer-account-orders.html" },
    { key: "vault", label: "Documents", icon: "shield-check", href: "customer-account-vault.html" },
    { key: "notifications", label: "Alerts", icon: "bell", href: "customer-account-notifications.html" },
    { key: "profile", label: "Settings", icon: "user-round", href: "customer-profile.html" }
  ];

  function byId(id) { return document.getElementById(id); }

  const CANCELLED_STATUSES = ["cancelled", "canceled"];
  const REFUNDED_STATUSES = ["refunded", "partially_refunded"];
  const COMPLETED_STATUSES = ["completed", "delivered"];
  const ACTION_STATUSES = ["documents_required", "documents_pending", "rejected", "action_required", "draft_review"];

  function classifyOrder(order) {
    const status = String(order.status || "").toLowerCase();
    const paymentStatus = String(order.paymentStatus || "").toLowerCase();
    const isApproved = localStorage.getItem(`opds_draft_approved_${order.orderId}`);

    if (CANCELLED_STATUSES.includes(status)) return "cancelled";
    if (REFUNDED_STATUSES.includes(status) || paymentStatus === "refunded") return "refunded";
    if (ACTION_STATUSES.includes(status) || paymentStatus === "failed" || (status === "draft_ready" && !isApproved)) return "action";
    if (["created", "session_created", "pending", "initiated"].includes(paymentStatus) && status !== "paid") return "pending";
    if (COMPLETED_STATUSES.includes(status)) return "completed";
    return "active";
  }

  function getServiceCategory(order) {
    const title = String(order.items?.[0]?.name || order.serviceTitle || "").toLowerCase();
    if (title.includes("exam") || title.includes("admit") || title.includes("scholarship") || title.includes("result") || title.includes("student")) {
      return { label: "Student Service", slug: "student", shortLabel: "STUDENT" };
    }
    if (title.includes("print") || title.includes("pvc") || title.includes("lamination") || title.includes("scan") || title.includes("xerox") || title.includes("banner")) {
      return { label: "Print Job", slug: "print", shortLabel: "PRINT" };
    }
    if (title.includes("web") || title.includes("app") || title.includes("software") || title.includes("domain") || title.includes("hosting")) {
      return { label: "Web Development", slug: "web", shortLabel: "WEB DEV" };
    }
    if (title.includes("design") || title.includes("logo") || title.includes("poster") || title.includes("card") || title.includes("graphic")) {
      return { label: "Graphic Design", slug: "design", shortLabel: "DESIGN" };
    }
    if (title.includes("itr") || title.includes("gst") || title.includes("msme") || title.includes("trade") || title.includes("business") || title.includes("pan")) {
      return { label: "Business & Tax", slug: "business", shortLabel: "BUSINESS" };
    }
    if (title.includes("product") || title.includes("stationery") || title.includes("item") || title.includes("onemart")) {
      return { label: "OneMart Product", slug: "product", shortLabel: "ONEMART" };
    }
    return { label: "Government E-Service", slug: "eservice", shortLabel: "E-SERVICE" };
  }

  function getContextualDisplayStatus(order) {
    const bucket = classifyOrder(order);
    const cat = getServiceCategory(order);
    const rawStatus = String(order.status || "").toLowerCase();

    if (bucket === "action") {
      if (order.paymentStatus === "failed") return "Payment Failed";
      if (rawStatus === "documents_required" || rawStatus === "documents_pending") return "Upload Document";
      if (rawStatus === "draft_review" || rawStatus === "draft_ready") return "Approve Draft Proof";
      return "Action Required";
    }

    if (bucket === "pending") return "Payment Pending";
    if (bucket === "cancelled") return "Cancelled";
    if (bucket === "refunded") return "Refunded";

    if (bucket === "completed") {
      if (cat.slug === "print" || cat.slug === "product") return "Ready / Delivered";
      if (cat.slug === "design" || cat.slug === "web") return "Final Handover Complete";
      return "Filing Completed";
    }

    // Active / In-progress states tailored per service category
    if (cat.slug === "print") {
      if (rawStatus === "under_review") return "Artwork Checked";
      return "In Production";
    }
    if (cat.slug === "design") {
      if (rawStatus === "under_review") return "Concept Review";
      return "Design in Progress";
    }
    if (cat.slug === "web") {
      return "Development in Progress";
    }
    if (cat.slug === "product") {
      return "Preparing Order";
    }
    if (cat.slug === "business") {
      return "Tax Portal Filing";
    }
    
    // Default Government / Student
    if (rawStatus === "under_review") return "Documents Under Review";
    return "Authority Processing";
  }

  function statusBadgeHtml(order) {
    const bucket = classifyOrder(order);
    const label = getContextualDisplayStatus(order);
    return `<span class="acc-status-badge acc-status-${bucket}">${label}</span>`;
  }

  function categoryBadgeHtml(order) {
    const cat = getServiceCategory(order);
    return `<span class="acc-category-badge acc-cat-${cat.slug}">${cat.shortLabel}</span>`;
  }

  function getTimelineSteps(order) {
    const cat = getServiceCategory(order);
    const bucket = classifyOrder(order);
    const rawStatus = String(order.status || "").toLowerCase();
    const payStatus = String(order.paymentStatus || "").toLowerCase();
    const isPaid = payStatus === "paid" || payStatus === "captured" || payStatus === "success";

    const baseDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const formatTime = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    if (cat.slug === "print") {
      return [
        { title: "Order & Artwork Received", status: "completed", time: formatTime(baseDate), desc: "Files uploaded and specifications received." },
        { title: "Artwork Quality Check", status: isPaid ? "completed" : "active", time: formatTime(new Date(baseDate.getTime() + 1800000)), desc: "Resolution & color profile verified for print." },
        { title: "In Production / Printing", status: bucket === "completed" ? "completed" : (isPaid ? "active" : "pending"), time: bucket === "completed" ? formatTime(new Date(baseDate.getTime() + 7200000)) : "In progress", desc: "High-precision printing & finishing." },
        { title: "Ready / Delivered", status: bucket === "completed" ? "completed" : "pending", time: bucket === "completed" ? formatTime(new Date(baseDate.getTime() + 14400000)) : "Awaiting completion", desc: "Available for pickup at Kendra or dispatched." }
      ];
    }

    if (cat.slug === "design" || cat.slug === "web") {
      return [
        { title: "Project Brief Received", status: "completed", time: formatTime(baseDate), desc: "Requirements & assets submitted." },
        { title: "Concept & Architecture", status: isPaid ? "completed" : "active", time: formatTime(new Date(baseDate.getTime() + 3600000)), desc: "Drafting layout and prototype." },
        { title: "Client Review & Feedback", status: bucket === "completed" ? "completed" : (rawStatus === "draft_review" ? "active" : "pending"), time: "Awaiting approval", desc: "Customer review of draft." },
        { title: "Final Files & Deployment", status: bucket === "completed" ? "completed" : "pending", time: bucket === "completed" ? "Completed" : "Awaiting final sign-off", desc: "High-res assets / live code handover." }
      ];
    }

    if (cat.slug === "product") {
      return [
        { title: "Order Confirmed", status: "completed", time: formatTime(baseDate), desc: "Payment confirmed." },
        { title: "Order Packaging & Prep", status: bucket === "completed" ? "completed" : "active", time: formatTime(new Date(baseDate.getTime() + 3600000)), desc: "Item inspected and packed." },
        { title: "In Transit / Handover", status: bucket === "completed" ? "completed" : "pending", time: "Pending", desc: "En route to delivery address." },
        { title: "Delivered", status: bucket === "completed" ? "completed" : "pending", time: bucket === "completed" ? "Delivered" : "Pending", desc: "Handover completed." }
      ];
    }

    // Default Government E-Service & Student
    return [
      { title: "Request Received", status: "completed", time: formatTime(baseDate), desc: "Citizen form data securely recorded." },
      { title: "Documents Reviewed", status: isPaid ? "completed" : (bucket === "action" ? "active" : "completed"), time: formatTime(new Date(baseDate.getTime() + 1800000)), desc: "Verified by Lucknow Suvidha Kendra operator." },
      { title: "Authority Portal Filing", status: bucket === "completed" ? "completed" : (isPaid && bucket !== "action" ? "active" : "pending"), time: isPaid ? "Started " + formatTime(new Date(baseDate.getTime() + 3600000)) : "Awaiting payment/docs", desc: "Submission to designated government department." },
      { title: "Official Sanction & Delivered", status: bucket === "completed" ? "completed" : "pending", time: bucket === "completed" ? formatTime(new Date(baseDate.getTime() + 86400000)) : "Awaiting authority clearance", desc: "Challan & final certificate delivery." }
    ];
  }

  function getRequestAction(order) {
    const bucket = classifyOrder(order);
    const rawStatus = String(order.status || "").toLowerCase();
    const payStatus = String(order.paymentStatus || "").toLowerCase();
    const isApproved = localStorage.getItem(`opds_draft_approved_${order.orderId}`);

    if (payStatus !== "paid" && ["pending", "created", "session_created", "failed"].includes(payStatus)) {
      return {
        requiresAction: true,
        type: "payment",
        label: "Payment Required",
        message: `Complete facilitation fee payment of ${money(order.amount)} to continue.`,
        ctaLabel: `Pay ${money(order.amount)}`,
        ctaIcon: "credit-card",
        actionType: "pay"
      };
    }

    if (!isApproved && ["documents_required", "documents_pending", "draft_review", "draft_ready"].includes(rawStatus)) {
      return {
        requiresAction: true,
        type: "approve_draft",
        label: "Approve Draft Proof",
        message: "Please inspect operator-prepared draft entries to authorize submission.",
        ctaLabel: "Review Draft",
        ctaIcon: "file-check-2",
        actionType: "detail"
      };
    }

    if (rawStatus === "documents_required" || rawStatus === "documents_pending") {
      return {
        requiresAction: true,
        type: "upload_document",
        label: "Upload Required Document",
        message: "Please upload a clearer identity scan or photograph to continue.",
        ctaLabel: "Upload Document",
        ctaIcon: "upload-cloud",
        actionType: "detail"
      };
    }

    return {
      requiresAction: false,
      type: "none",
      label: "No Action Needed",
      message: "Your application is actively progressing with our Kendra team.",
      ctaLabel: "View Details",
      ctaIcon: "chevron-right",
      actionType: "detail"
    };
  }

  function paymentAction(order) {
    const status = String(order.paymentStatus || "").toLowerCase();
    if (!order.paymentId && !order.amount) return null;
    if (status === "failed") return { label: "Retry Payment", icon: "refresh-cw" };
    if (["pending", "created", "session_created", "initiated"].includes(status) || !order.paymentStatus) {
      return { label: "Pay Now", icon: "credit-card" };
    }
    return null;
  }

  function showToast(message, type = "success") {
    let toast = byId("acc-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "acc-toast";
      toast.className = "cpf-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `cpf-toast cpf-toast-${type} show`;
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  async function resumePayment(order, button) {
    if (!order || !order.paymentId) {
      window.location.href = `checkout.html?orderId=${encodeURIComponent(order.orderId)}`;
      return;
    }
    if (button) button.disabled = true;
    try {
      const data = await window.OPDSAuth.request("POST", "/api/payments/retry", {
        paymentId: order.paymentId,
        gateway: order.gateway || "razorpay"
      });
      if (data.payment && data.payment.sessionType === "redirect" && data.payment.session?.redirectUrl) {
        window.location.href = data.payment.session.redirectUrl;
      } else {
        window.location.href = `checkout.html?orderId=${encodeURIComponent(order.orderId)}`;
      }
    } catch (error) {
      showToast(error.message || "Payment could not be started. Please try again.", "error");
      if (button) button.disabled = false;
    }
  }

  function money(amount, currency) {
    const num = Number(amount || 0);
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function titleCase(value) {
    return String(value || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  }

  const PAYMENT_STATUS_LABELS = {
    created: "Payment Pending", session_created: "Payment Pending", pending: "Payment Pending", initiated: "Payment Pending",
    paid: "Paid", captured: "Paid", success: "Paid", settled: "Paid",
    failed: "Failed", cancelled: "Cancelled", canceled: "Cancelled",
    refunded: "Refunded", partially_refunded: "Partially Refunded"
  };
  function paymentStatusLabel(status) {
    const key = String(status || "").toLowerCase();
    return PAYMENT_STATUS_LABELS[key] || titleCase(status) || "Pending";
  }

  function logout() {
    try { window.OPDSAuth.request("POST", "/api/auth/logout", {}); } catch { /* best-effort */ }
    localStorage.removeItem("opds_customer_session");
    localStorage.removeItem("opds_customer_phone");
    localStorage.removeItem("opds_customer_email");
    localStorage.removeItem("opds_customer_profile");
    localStorage.removeItem("opds_testing_user");
    localStorage.removeItem("opds_customer_last_activity");
    localStorage.setItem("opds_customer_session_event", JSON.stringify({ type: "logout", at: Date.now() }));
    window.location.href = "login.html";
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "OP";
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  }

  function navHtml(items, activeKey, listClass) {
    return items.map((item) => `
      <a class="${listClass}-item${item.key === activeKey ? " active" : ""}" href="${item.href}"${item.key === activeKey ? ' aria-current="page"' : ""}>
        <i data-lucide="${item.icon}"></i>
        <span>${item.label}</span>
        ${item.key === "notifications" ? `<span class="acc-sidebar-badge">2</span>` : ""}
      </a>
    `).join("");
  }

  function renderPortalFooter() {
    const footerRoot = document.querySelector("[data-account-footer]");
    if (!footerRoot) return;
    footerRoot.innerHTML = `
      <footer class="acc-portal-footer">
        <div>
          <strong>One Point Digital Services &middot; Citizen Suvidha Kendra</strong>
          <span>Authorized Lucknow Digital Command Center &middot; Milan Tower, LDA Colony</span>
        </div>
        <nav aria-label="Portal footer navigation">
          <a href="privacy.html">Privacy Charter</a>
          <a href="terms.html">Terms of Service</a>
          <a href="disclaimer.html">Disclaimers</a>
          <a href="support.html">Support Desk</a>
        </nav>
        <span>&copy; ${new Date().getFullYear()} One Point. All rights reserved.</span>
      </footer>`;
  }

  function skeletonHtml() {
    return `
      <div class="acc-skel-wrap" id="acc-skeleton">
        <div class="acc-skel" style="height:96px"></div>
        <div class="acc-skel" style="height:180px"></div>
        <div class="acc-skel" style="height:240px"></div>
      </div>`;
  }

  function renderShell(activePage) {
    const root = document.querySelector("[data-account-shell]");
    if (!root) return;
    root.innerHTML = `
      <header class="acc-topbar">
        <div class="acc-topbar-inner">
          <div class="acc-topbar-left">
            <a class="acc-topbar-brand" href="index.html" aria-label="One Point Digital Services home">
              <img class="acc-topbar-logo" src="assets/logo-bisen-one-point.svg" alt="Bisen One Point Suvidha Kendra">
            </a>
            <span class="acc-topbar-badge">CUSTOMER ACCOUNT</span>
          </div>

          <div class="acc-topbar-right">
            <!-- Quick action to start service -->
            <a href="services.html" class="acc-topbar-start-btn hide-mobile-sm">
              <i data-lucide="plus-circle"></i> <span>Start Request</span>
            </a>

            <!-- Notification Bell Dropdown -->
            <div class="acc-notif-wrap" id="acc-notif-wrap">
              <button type="button" class="acc-notif-btn" id="acc-notif-trigger" aria-label="Notifications" title="Recent Notifications">
                <i data-lucide="bell"></i>
                <span class="acc-notif-badge" id="acc-notif-count">2</span>
              </button>
              <div class="acc-notif-dropdown" id="acc-notif-dropdown" hidden>
                <div class="acc-notif-head">
                  <strong>Notifications</strong>
                  <button type="button" class="acc-notif-clear-btn" id="acc-notif-clear">Mark all read</button>
                </div>
                <div class="acc-notif-list" id="acc-notif-list">
                  <div class="acc-notif-item unread">
                    <span class="acc-notif-icon warn"><i data-lucide="alert-triangle"></i></span>
                    <div>
                      <strong>Action Required: Photo Replacement</strong>
                      <p>PAN request paused. Please upload a clear photo.</p>
                      <small>18 mins ago</small>
                    </div>
                  </div>
                  <div class="acc-notif-item">
                    <span class="acc-notif-icon ok"><i data-lucide="check-circle-2"></i></span>
                    <div>
                      <strong>Payment Confirmed (₹399)</strong>
                      <p>Tax invoice is available in your archive.</p>
                      <small>2 hours ago</small>
                    </div>
                  </div>
                </div>
                <div class="acc-notif-footer">
                  <a href="customer-account-notifications.html">View All Notifications &rarr;</a>
                </div>
              </div>
            </div>

            <!-- Helpdesk Shortcut -->
            <a href="support.html" class="acc-topbar-link hide-mobile-sm" title="Help & Support Desk">
              <i data-lucide="life-buoy"></i>
              <span>Helpdesk</span>
            </a>

            <!-- User Profile & Sign Out Bar -->
            <div class="acc-topbar-user-pill">
              <a href="customer-profile.html" class="acc-topbar-avatar" id="acc-topbar-avatar" title="Account Settings">OP</a>
              <div class="acc-topbar-user-meta hide-mobile-sm">
                <a href="customer-profile.html" class="acc-topbar-user-name" id="acc-topbar-user-name">Citizen Account</a>
              </div>
              <button type="button" class="acc-topbar-logout-btn" id="acc-logout-btn" title="Sign out of account" aria-label="Sign out">
                <i data-lucide="log-out"></i>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div class="acc-shell">
        <aside class="acc-sidebar hide-mobile-sm">
          <div class="acc-sidebar-user" id="acc-sidebar-user">
            <div class="acc-sidebar-avatar acc-skel-avatar"></div>
            <div class="acc-sidebar-user-lines">
              <span class="acc-skel acc-skel-line" style="width:80px"></span>
              <span class="acc-skel acc-skel-line" style="width:110px"></span>
            </div>
          </div>
          <div class="acc-sidebar-nav-wrap">
            <nav class="acc-sidebar-nav">${navHtml(NAV_ITEMS, activePage, "acc-sidebar-nav")}</nav>
          </div>
        </aside>
        <div class="acc-content-area" id="acc-content-area">${skeletonHtml()}</div>
      </div>
      <nav class="acc-bottom-nav" aria-label="Account navigation">${navHtml(BOTTOM_NAV_ITEMS, activePage, "acc-bottom-nav")}</nav>
    `;

    const logoutBtn = byId("acc-logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    // Notification dropdown toggle
    const notifBtn = byId("acc-notif-trigger");
    const notifDropdown = byId("acc-notif-dropdown");
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        notifDropdown.hidden = !notifDropdown.hidden;
      });
      document.addEventListener("click", (e) => {
        if (!notifDropdown.contains(e.target) && e.target !== notifBtn) {
          notifDropdown.hidden = true;
        }
      });
      const clearBtn = byId("acc-notif-clear");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          byId("acc-notif-count").style.display = "none";
          document.querySelectorAll(".acc-notif-item.unread").forEach(el => el.classList.remove("unread"));
        });
      }
    }

    renderPortalFooter();
    if (window.lucide) window.lucide.createIcons();
  }

  function fillSidebarUser(identity) {
    const el = byId("acc-sidebar-user");
    if (!el) return;
    const custId = identity.customerId || ("OPDS-" + String(identity.mobile || "9473946181").slice(-6));
    el.innerHTML = `
      <div class="acc-sidebar-avatar">${initials(identity.name)}</div>
      <div class="acc-sidebar-user-lines">
        <div class="acc-sidebar-name-row">
          <strong class="acc-sidebar-name">${escapeHtml(identity.name || "Customer")}</strong>
          <span class="acc-verified-chip" title="Verified Customer Account">✓</span>
        </div>
        <div class="acc-sidebar-custid-row">
          <code>${escapeHtml(custId)}</code>
          <button type="button" class="acc-copy-btn" data-copy-text="${escapeHtml(custId)}" title="Copy Customer ID" aria-label="Copy Customer ID">
            <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
          </button>
        </div>
      </div>`;

    const topAvatar = byId("acc-topbar-avatar");
    const topName = byId("acc-topbar-user-name");
    const topId = byId("acc-topbar-user-id");
    if (topAvatar) topAvatar.textContent = initials(identity.name);
    if (topName) topName.textContent = identity.name || "Customer Account";
    if (topId) topId.textContent = custId;

    el.querySelectorAll("[data-copy-text]").forEach((button) => {
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
  }

  function moveContentIntoShell() {
    const content = document.querySelector("[data-account-content]");
    const target = byId("acc-content-area");
    if (content && target) {
      target.innerHTML = "";
      target.appendChild(content);
      content.hidden = false;
    }
  }

  // Check customer session and load profile + orders
  const readyPromise = (async function init() {
    const page = document.body.dataset.accountPage || "overview";
    renderShell(page);

    let profile = null;
    let orders = [];

    try {
      if (window.OPDSAuth && window.OPDSAuth.getCustomerProfile) {
        profile = await window.OPDSAuth.getCustomerProfile();
      }
    } catch (e) {}

    // Fallback profile if none
    if (!profile || !profile.identity) {
      profile = {
        identity: {
          name: "Asif Bisen",
          mobile: "9473946181",
          email: "asif@bisen.in",
          phoneVerified: true,
          emailVerified: true,
          hasPassword: true,
          address: "Milan Tower, Sector B, Bargawan, LDA Colony",
          city: "Lucknow",
          state: "Uttar Pradesh",
          pincode: "226012",
          customerId: "OPDS-CUST-946181"
        }
      };
    }

    try {
      if (window.OPDSAuth && window.OPDSAuth.request) {
        const orderData = await window.OPDSAuth.request("GET", "/api/customer/orders");
        if (orderData && orderData.orders) orders = orderData.orders;
      }
    } catch (e) {}

    // Rich sample orders representing various service types
    if (!orders || !orders.length) {
      orders = [
        {
          orderId: "OPDS-260824-00123",
          status: "documents_pending",
          paymentStatus: "paid",
          amount: 399.00,
          createdAt: "2026-08-24T10:30:00.000Z",
          updatedAt: "2026-08-24T14:42:00.000Z",
          items: [{ name: "PAN Card Correction & Instant e-PAN", qty: 1 }],
          officialFee: 107.00,
          assistanceFee: 292.00,
          breakdown: { subtotal: 247.46, gst: 44.54, total: 399.00, amountPaid: 399.00, amountRemaining: 0 },
          latestUpdate: "Documents verified 18 minutes ago"
        },
        {
          orderId: "OPDS-260822-00045",
          status: "processing",
          paymentStatus: "paid",
          amount: 150.00,
          createdAt: "2026-08-22T09:15:00.000Z",
          updatedAt: "2026-08-23T11:20:00.000Z",
          items: [{ name: "UPSSSC Exam Form Online Registration", qty: 1 }],
          officialFee: 25.00,
          assistanceFee: 125.00,
          breakdown: { subtotal: 127.12, gst: 22.88, total: 150.00, amountPaid: 150.00, amountRemaining: 0 },
          latestUpdate: "Filed on UPSSSC portal &bull; Waiting for admit card schedule"
        },
        {
          orderId: "OPDS-260820-00012",
          status: "completed",
          paymentStatus: "paid",
          amount: 250.00,
          createdAt: "2026-08-20T14:00:00.000Z",
          updatedAt: "2026-08-21T16:30:00.000Z",
          items: [{ name: "PVC Smart Voter ID Card Printing", qty: 1 }],
          officialFee: 0,
          assistanceFee: 250.00,
          breakdown: { subtotal: 211.86, gst: 38.14, total: 250.00, amountPaid: 250.00, amountRemaining: 0 },
          latestUpdate: "Delivered at Lucknow Suvidha Kendra Desk"
        }
      ];
    }

    fillSidebarUser(profile.identity);
    moveContentIntoShell();
    if (window.lucide) window.lucide.createIcons();

    return { profile, orders };
  })();

  window.OPDSAccount = {
    ready: readyPromise,
    classifyOrder,
    statusBadgeHtml,
    categoryBadgeHtml,
    getServiceCategory,
    getContextualDisplayStatus,
    getTimelineSteps,
    getRequestAction,
    paymentAction,
    resumePayment,
    showToast,
    money,
    formatDate,
    escapeHtml,
    titleCase,
    paymentStatusLabel,
    logout
  };
})();
