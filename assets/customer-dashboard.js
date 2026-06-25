// Global fetch interceptor to strip AI agent thoughts/traces and paths from API responses
(function() {
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  function sanitizeData(val) {
    if (val === null || val === undefined) {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeData);
    }
    if (typeof val === "object") {
      const cleaned = {};
      for (const [key, value] of Object.entries(val)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === "thought" ||
          lowerKey === "reasoning" ||
          lowerKey === "plan" ||
          lowerKey === "tool_call" ||
          lowerKey === "debug" ||
          lowerKey === "trace"
        ) {
          continue;
        }
        if (lowerKey === "action") {
          if (typeof value === "string") {
            if (/^[a-zA-Z0-9_\-]+$/.test(value)) {
              cleaned[key] = value;
            }
            continue;
          }
          continue;
        }
        cleaned[key] = sanitizeData(value);
      }
      return cleaned;
    }
    if (typeof val === "string") {
      let s = val;
      s = s.replace(/d:[\\/]csc banner_folder[\\/]130626/gi, "[PROJECT_ROOT]");
      s = s.replace(/c:[\\/]users[\\/]advar/gi, "[USER_HOME]");
      s = s.replace(/let's\s+(do|call|run|check)/gi, "[REDACTED]");
      s = s.replace(/view_file/gi, "[REDACTED]");
      s = s.replace(/inspect\s+code/gi, "[REDACTED]");
      s = s.replace(/targetfile/gi, "[REDACTED]");
      return s;
    }
    return val;
  }

  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const cloned = response.clone();
        try {
          const json = await cloned.json();
          const sanitized = sanitizeData(json);
          const blob = new Blob([JSON.stringify(sanitized)], { type: "application/json" });
          return new Response(blob, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch {
          return response;
        }
      }
      return response;
    } catch (err) {
      if (err && err.message) {
        err.message = sanitizeData(err.message);
      }
      throw err;
    }
  };
})();

(function () {
  "use strict";

  // ── Document Upload ────────────────────────────────────────────────────────
  const COMMON_DOCS = [
    { id: "aadhaar",      label: "Aadhaar Card",       icon: "id-card" },
    { id: "pan",          label: "PAN Card",            icon: "credit-card" },
    { id: "photo",        label: "Passport Photo",      icon: "user" },
    { id: "birth_cert",   label: "Birth Certificate",   icon: "file-text" },
    { id: "income_cert",  label: "Income Certificate",  icon: "file-text" },
    { id: "address_proof",label: "Address Proof",       icon: "map-pin" },
    { id: "signature",    label: "Signature",           icon: "pen-line" },
  ];

  async function getCsrfToken() {
    try {
      const res = await fetch("/api/csrf");
      const data = await res.json();
      // Cookie set automatically
      return data.csrfToken || "";
    } catch { return ""; }
  }

  async function uploadDocument(orderId, docType, fileName, fileUrl) {
    const csrf = await getCsrfToken();
    const res = await fetch("/api/orders/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ orderId, docType, fileName, fileUrl }),
    });
    return res.json();
  }

  function buildDocUploadSection(orderId) {
    return `
      <div class="doc-upload-section" style="border-top:1px solid rgba(0,0,0,0.08);padding:16px 20px;">
        <div class="text-sm font-bold" style="margin-bottom:12px;display:flex;align-items:center;gap:8px;">
          <i data-lucide="upload-cloud" style="width:16px;height:16px;color:#3b82f6;"></i>
          Upload Required Documents
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">
          ${COMMON_DOCS.map(doc => `
            <label class="doc-upload-item" data-order="${orderId}" data-doctype="${doc.id}" style="
              display:flex;align-items:center;gap:10px;padding:10px 12px;
              border:1px dashed rgba(0,0,0,0.15);border-radius:8px;cursor:pointer;
              background:#f8fafc;transition:all 0.15s;
            ">
              <i data-lucide="file-plus" style="width:16px;height:16px;color:#64748b;flex-shrink:0;"></i>
              <div style="flex:1;min-width:0;">
                <div class="text-xs font-semibold" style="color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.label}</div>
                <div class="doc-status-text-${orderId}-${doc.id}" class="text-xs" style="color:#94a3b8;">Click to upload</div>
              </div>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                style="display:none;"
                onchange="window._handleDocUpload(event,'${orderId}','${doc.id}','${doc.label}')"
              >
            </label>
          `).join("")}
        </div>
        <div class="doc-upload-msg-${orderId}" class="text-xs" style="margin-top:8px;min-height:18px;"></div>
      </div>
    `;
  }

  // Global handler for file input change
  window._handleDocUpload = async function(event, orderId, docType, docLabel) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const statusEl = document.querySelector(`.doc-status-text-${orderId}-${docType}`);
    const msgEl    = document.querySelector(`.doc-upload-msg-${orderId}`);

    if (statusEl) statusEl.textContent = "Uploading…";
    if (msgEl)    msgEl.innerHTML = `<span style="color:#3b82f6;">⟳ Uploading ${docLabel}...</span>`;

    try {
      // For now we send the filename. In production you'd upload to a CDN first.
      const result = await uploadDocument(orderId, docType, file.name, "");
      if (result.ok) {
        if (statusEl) { statusEl.textContent = "✓ Uploaded"; statusEl.style.color = "#22c55e"; }
        if (msgEl)    msgEl.innerHTML = `<span style="color:#22c55e;">✓ ${docLabel} uploaded successfully! Bot will re-check your application.</span>`;
        // Update label style
        const label = document.querySelector(`[data-order="${orderId}"][data-doctype="${docType}"]`);
        if (label) { label.style.borderColor = "#22c55e"; label.style.background = "#f0fdf4"; }
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (err) {
      if (statusEl) { statusEl.textContent = "Upload failed"; statusEl.style.color = "#ef4444"; }
      if (msgEl)    msgEl.innerHTML = `<span style="color:#ef4444;">✗ Failed: ${err.message}</span>`;
    }
    if (window.lucide) window.lucide.createIcons();
  };

  function getStatusStepper(status, paymentStatus) {
    const s = (status || "").toLowerCase();
    const p = (paymentStatus || "").toLowerCase();

    let step = 1;
    if (s === "verified") step = 2;
    else if (s === "processing") step = 3;
    else if (s === "out_for_delivery" || s === "out for delivery") step = 3.5;
    else if (s === "completed" || s === "paid") step = 4;
    else if (s === "cancelled") step = 0;
    else if (p === "paid" || p === "captured") step = 2;

    if (step === 0) {
      return `
        <div class="elite-stepper cancelled">
          <div class="stepper-track"></div>
          <div class="stepper-item active error"><span class="step-dot"><i data-lucide="x"></i></span><strong>Order Cancelled</strong></div>
        </div>
      `;
    }

    return `
      <div class="elite-stepper">
        <div class="stepper-track"><div class="stepper-progress" style="width: ${Math.min(100, (step - 1) * 33.33)}%"></div></div>
        <div class="stepper-item ${step >= 1 ? 'active' : ''}"><span class="step-dot"><i data-lucide="check"></i></span><strong>Order Placed</strong></div>
        <div class="stepper-item ${step >= 2 ? 'active' : ''}"><span class="step-dot"><i data-lucide="shield-check"></i></span><strong>Verified</strong></div>
        <div class="stepper-item ${step >= 3 ? 'active' : ''}"><span class="step-dot"><i data-lucide="cog"></i></span><strong>Processing</strong></div>
        <div class="stepper-item ${step >= 4 ? 'active' : ''}"><span class="step-dot"><i data-lucide="package-check"></i></span><strong>Completed</strong></div>
      </div>
    `;
  }

  function getStatusBadge(status, type = "status") {
    const val = (status || "").toLowerCase();
    if (type === "payment") {
      if (val === "paid" || val === "captured") return `<span class="status-pill pill-success"><i data-lucide="check-circle-2"></i> Paid</span>`;
      if (val === "failed") return `<span class="status-pill pill-error"><i data-lucide="x-circle"></i> Failed</span>`;
      return `<span class="status-pill pill-warning"><i data-lucide="clock"></i> Pending</span>`;
    }
    if (val === "completed" || val === "paid") return `<span class="status-pill pill-success"><i data-lucide="check-circle-2"></i> Completed</span>`;
    if (val === "out_for_delivery" || val === "out for delivery") return `<span class="status-pill pill-info"><i data-lucide="truck"></i> Out for Delivery</span>`;
    if (val === "processing") return `<span class="status-pill pill-info"><i data-lucide="cog" class="spin"></i> Processing</span>`;
    if (val === "verified") return `<span class="status-pill pill-primary"><i data-lucide="shield-check"></i> Verified</span>`;
    if (val === "cancelled") return `<span class="status-pill pill-error"><i data-lucide="x-circle"></i> Cancelled</span>`;
    return `<span class="status-pill pill-primary"><i data-lucide="file-plus"></i> Created</span>`;
  }

  function renderCustomerOrders(orders) {
    const root = document.querySelector("[data-customer-orders]");
    if (!root) return;

    if (!orders || orders.length === 0) {
      root.innerHTML = `
        <div class="empty-console-state">
          <i data-lucide="package-x"></i>
          <p>No orders or service bookings found for this mobile number / User ID.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    root.innerHTML = `
      <div class="elite-customer-orders-list">
        ${orders.map((order) => `
          <div class="elite-order-card glass-panel">
            <div class="order-card-header">
              <div class="order-id-block">
                <i data-lucide="package"></i>
                <div>
                  <strong>Order #${order.orderId}</strong>
                  <span class="order-date">${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <div class="order-status-badges">
                ${getStatusBadge(order.status, "status")}
                ${getStatusBadge(order.paymentStatus, "payment")}
                <span class="status-pill pill-gateway"><i data-lucide="cpu"></i> ${order.gateway || 'razorpay'}</span>
              </div>
            </div>

            <div class="order-stepper-box">
              ${getStatusStepper(order.status, order.paymentStatus)}
            </div>

            <div class="order-items-list">
              ${(order.items || []).map(item => `
                <div class="elite-line-item">
                  <div class="item-icon"><i data-lucide="${item.type === 'service' ? 'layers' : 'shopping-bag'}"></i></div>
                  <div class="item-details">
                    <strong>${item.name || item.slug || 'Service Item'}</strong>
                    <span>Quantity: ${item.quantity || 1} • Type: ${item.type === 'service' ? 'E-Service Booking' : 'Store Product'}</span>
                  </div>
                  <div class="item-price">
                    <strong>Rs. ${Number(item.price || order.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              `).join("")}
            </div>

            ${buildDocUploadSection(order.orderId)}

            <div class="order-card-footer">
              <div class="footer-total">
                <span>Total Amount Paid</span>
                <strong>Rs. ${Number(order.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div class="footer-actions">
                <button class="btn btn-soft btn-sm" onclick="window.print()"><i data-lucide="printer"></i> Print Receipt</button>
                <a class="btn btn-primary btn-sm" href="track-application.html?id=${order.orderId}"><i data-lucide="external-link"></i> Live Tracker</a>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  async function loadCustomer(event) {
    if (event) event.preventDefault();
    const phoneInput = document.getElementById("customer-phone");
    const helper = document.getElementById("phone-helper");
    const phone = phoneInput ? phoneInput.value.trim() : "";

    if (!phone) return;

    try {
      if (helper) helper.innerHTML = `<span class="info-text"><i data-lucide="loader-2" class="spin"></i> Fetching orders & profile from secure cloud database...</span>`;
      if (window.lucide) window.lucide.createIcons();

      const response = await fetch(`/api/customer/dashboard?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to load customer orders.");

      const profileBox = document.getElementById("customer-profile-box");
      if (profileBox && data.customer) {
        profileBox.innerHTML = `
          <div class="verified-customer-card">
            <div class="customer-avatar-head">
              <i data-lucide="user-check"></i>
              <div>
                <strong>${data.customer.name}</strong>
                <span class="badge-tag pill-success"><i data-lucide="shield-check"></i> Verified Profile</span>
              </div>
            </div>
            <div class="customer-meta-grid mt-3">
              <div class="meta-item">
                <small>Mobile Number</small>
                <strong><i data-lucide="phone"></i> ${data.customer.phone}</strong>
              </div>
              <div class="meta-item">
                <small>Email Address</small>
                <strong><i data-lucide="mail"></i> ${data.customer.email || 'N/A'}</strong>
              </div>
              <div class="meta-item full-width">
                <small>Delivery & Billing Address</small>
                <strong><i data-lucide="map-pin"></i> ${data.customer.address || 'N/A'}</strong>
              </div>
            </div>
          </div>
        `;
      }

      renderCustomerOrders(data.orders || []);
      if (helper) helper.innerHTML = `<span class="success-text"><i data-lucide="check"></i> Loaded profile & ${(data.orders || []).length} orders successfully.</span>`;
      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      if (helper) helper.innerHTML = `<span class="error-text"><i data-lucide="alert-circle"></i> ${error.message}</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const phoneInput = document.getElementById("customer-phone");
    const userPill = document.getElementById("customer-user-pill");
    const logoutBtn = document.getElementById("customer-logout-btn");

    const params = new URLSearchParams(window.location.search);
    const queryPhone = params.get("phone") || "";
    const storedPhone = localStorage.getItem("opds_customer_phone") || localStorage.getItem("opds_testing_user") || "";
    const customerPhone = queryPhone || (storedPhone !== "bisenasif0001" ? storedPhone : "");

    if (customerPhone) {
      if (phoneInput) phoneInput.value = customerPhone;
      if (userPill) userPill.style.display = "flex";
      loadCustomer();
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("opds_testing_user");
        localStorage.removeItem("opds_customer_phone");
        localStorage.removeItem("opds_customer_email");
        localStorage.removeItem("opds_customer_profile");
        localStorage.removeItem("opds_customer_session");
        localStorage.removeItem("opds_admin_token");
        window.location.href = "login.html";
      });
    }

    document.querySelector("[data-customer-dashboard-form]")?.addEventListener("submit", loadCustomer);
  });
})();
