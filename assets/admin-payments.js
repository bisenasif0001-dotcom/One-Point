(function () {
  "use strict";

  let adminToken = "";
  let csrfToken = "";

  async function loadCsrf() {
    const data = await fetch("/api/csrf").then((res) => res.json());
    csrfToken = data.csrfToken || "";
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken,
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Admin request failed.");
    return data;
  }

  async function loadKyc() {
    const root = document.querySelector("[data-kyc-panel]");
    if (!root) return;
    const data = await fetch("/api/kyc-requirements").then((res) => res.json());
    root.innerHTML = `
      <div class="elite-kyc-box">
        <strong>${data.businessName}</strong>
        <span>Required KYC documents for verified payment gateway onboarding</span>
      </div>
      <ul class="elite-checklist">${data.requiredKyc.map((item) => `<li><i data-lucide="check-circle-2"></i> <span>${item}</span></li>`).join("")}</ul>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  function renderAnalytics(data) {
    const root = document.querySelector("[data-admin-analytics]");
    const metricRev = document.getElementById("metric-revenue");
    const metricTrans = document.getElementById("metric-transactions");
    const metricRef = document.getElementById("metric-refunds");

    const stats = data.paymentStats || [];
    const daily = data.daily || [];

    // Calculate totals for bento metrics
    let totalRev = 0;
    let totalTrans = 0;
    let totalRefunds = 0;

    stats.forEach(item => {
      if (item.status.toLowerCase() === "paid" || item.status.toLowerCase() === "completed") {
        totalTrans += item.count;
      } else if (item.status.toLowerCase() === "refunded" || item.status.toLowerCase() === "refund_pending") {
        totalRefunds += item.count;
      }
    });

    (data.topProducts || []).forEach(p => totalRev += Number(p.revenue || 0));
    (data.topServices || []).forEach(s => totalRev += Number(s.revenue || 0));

    if (metricRev) metricRev.textContent = `Rs. ${totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (metricTrans) metricTrans.textContent = totalTrans.toString();
    if (metricRef) metricRef.textContent = totalRefunds.toString();

    if (!root) return;

    root.innerHTML = `
      <div class="elite-analytics-grid">
        <div class="elite-table-card">
          <div class="table-card-head">
            <i data-lucide="shopping-bag"></i>
            <h3>Top Store Products</h3>
            <span class="badge-tag ml-auto">${(data.topProducts || []).length} Active</span>
          </div>
          <ul class="elite-table-list">
            ${(data.topProducts || []).map((item) => `
              <li>
                <div class="item-meta">
                  <i data-lucide="package"></i>
                  <div>
                    <strong>${item.name}</strong>
                    <span>Store Product • Verified</span>
                  </div>
                </div>
                <div class="item-revenue">
                  <strong>Rs. ${Number(item.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  <span class="status-pill pill-success">Active</span>
                </div>
              </li>
            `).join("") || `<li><div class="empty-state"><i data-lucide="package-x"></i> No store product revenue data yet</div></li>`}
          </ul>
        </div>

        <div class="elite-table-card">
          <div class="table-card-head">
            <i data-lucide="briefcase"></i>
            <h3>Top E-Services & Bookings</h3>
            <span class="badge-tag ml-auto">${(data.topServices || []).length} Active</span>
          </div>
          <ul class="elite-table-list">
            ${(data.topServices || []).map((item) => `
              <li>
                <div class="item-meta">
                  <i data-lucide="layers"></i>
                  <div>
                    <strong>${item.name}</strong>
                    <span>E-Service Booking • Verified</span>
                  </div>
                </div>
                <div class="item-revenue">
                  <strong>Rs. ${Number(item.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  <span class="status-pill pill-success">Active</span>
                </div>
              </li>
            `).join("") || `<li><div class="empty-state"><i data-lucide="package-x"></i> No e-service revenue data yet</div></li>`}
          </ul>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  async function loadOmsOrders() {
    const root = document.querySelector("[data-admin-orders]");
    if (!root) return;
    try {
      root.innerHTML = `<div class="empty-console-state"><i data-lucide="loader-2" class="spin"></i><p>Loading live customer profiles and order governance table...</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      const data = await api("/api/admin/orders");
      renderOmsOrders(data);
    } catch (error) {
      root.innerHTML = `<div class="empty-console-state"><i data-lucide="alert-circle" class="error-text"></i><p>Failed to load orders: ${error.message}</p></div>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  window.updateOmsStatus = async function(orderId) {
    const statusSelect = document.getElementById(`status-select-${orderId}`);
    const paySelect = document.getElementById(`pay-select-${orderId}`);
    const toast = document.getElementById(`oms-toast-${orderId}`);
    
    if (!statusSelect || !paySelect || !toast) return;

    try {
      toast.innerHTML = `<span class="badge-tag"><i data-lucide="loader-2" class="spin"></i> Updating...</span>`;
      if (window.lucide) window.lucide.createIcons();

      const result = await api("/api/admin/orders/status", {
        method: "POST",
        body: JSON.stringify({
          orderId: orderId,
          status: statusSelect.value,
          paymentStatus: paySelect.value
        })
      });

      toast.innerHTML = `<span class="status-pill pill-success"><i data-lucide="check"></i> Updated to ${result.status} / ${result.paymentStatus}</span>`;
      if (window.lucide) window.lucide.createIcons();

      const analytics = await api("/api/admin/analytics");
      renderAnalytics(analytics);
    } catch (error) {
      toast.innerHTML = `<span class="status-pill pill-failed"><i data-lucide="alert-circle"></i> ${error.message}</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  };

  function renderOmsOrders(data) {
    const root = document.querySelector("[data-admin-orders]");
    if (!root) return;

    const orders = data.orders || [];
    if (orders.length === 0) {
      root.innerHTML = `<div class="empty-console-state"><i data-lucide="inbox"></i><p>No customer orders found in the database yet.</p></div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    root.innerHTML = `
      <div class="elite-oms-table-wrapper">
        <table class="elite-oms-table">
          <thead>
            <tr>
              <th>Customer Profile</th>
              <th>Order Details & Items</th>
              <th>Category & Channel</th>
              <th>Live Status Governance</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => `
              <tr id="order-row-${order.orderId}">
                <td class="oms-customer-cell">
                  <div class="customer-avatar-box">
                    <i data-lucide="user"></i>
                    <div>
                      <strong>${order.customer.name}</strong>
                      <span class="phone-text"><i data-lucide="phone"></i> ${order.customer.phone}</span>
                    </div>
                  </div>
                  <div class="customer-sub-meta">
                    <small><i data-lucide="mail"></i> ${order.customer.email}</small>
                    <small><i data-lucide="map-pin"></i> ${order.customer.address}</small>
                  </div>
                </td>
                
                <td class="oms-items-cell">
                  <div class="order-id-box">
                    <strong>${order.orderId}</strong>
                    <span class="date-tag"><i data-lucide="calendar"></i> ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <ul class="oms-item-list">
                    ${(order.items || []).map(item => `
                      <li>
                        <i data-lucide="${item.type === 'service' ? 'layers' : 'package'}"></i>
                        <span>${item.name} (x${item.quantity})</span>
                        <strong class="ml-auto">Rs. ${item.total}</strong>
                      </li>
                    `).join("")}
                  </ul>
                  <div class="order-total-bar">
                    <span>Grand Total:</span>
                    <strong>Rs. ${order.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </td>

                <td class="oms-category-cell">
                  <span class="badge-tag mb-1"><i data-lucide="${order.orderType === 'service' ? 'layers' : 'shopping-bag'}"></i> ${order.orderType.toUpperCase()}</span>
                  <span class="badge-tag pill-neutral"><i data-lucide="globe"></i> ${order.sourceChannel.toUpperCase()}</span>
                  <div class="mt-2">
                    <small class="text-muted">Gateway: <strong>${order.payment?.gateway?.toUpperCase() || 'RAZORPAY'}</strong></small><br>
                    <small class="text-muted">Method: <strong>${order.payment?.method?.toUpperCase() || 'UPI'}</strong></small><br>
                    <small class="text-muted">Invoice: <strong>${order.invoiceNo}</strong></small>
                  </div>
                </td>

                <td class="oms-governance-cell">
                  <div class="governance-controls">
                    <div class="control-group">
                      <label>Order Status:</label>
                      <select id="status-select-${order.orderId}" class="select select-xs" onchange="window.updateOmsStatus('${order.orderId}')">
                        <option value="created" ${order.status === 'created' ? 'selected' : ''}>Order Placed (Created)</option>
                        <option value="verified" ${order.status === 'verified' ? 'selected' : ''}>Verified</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="out_for_delivery" ${order.status === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
                        <option value="completed" ${order.status === 'completed' || order.status === 'paid' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                      </select>
                    </div>

                    <div class="control-group">
                      <label>Payment Status:</label>
                      <select id="pay-select-${order.orderId}" class="select select-xs" onchange="window.updateOmsStatus('${order.orderId}')">
                        <option value="created" ${order.payment?.status === 'created' ? 'selected' : ''}>Created (Pending)</option>
                        <option value="pending" ${order.payment?.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="paid" ${order.payment?.status === 'paid' || order.payment?.status === 'captured' ? 'selected' : ''}>Paid (Captured)</option>
                        <option value="failed" ${order.payment?.status === 'failed' ? 'selected' : ''}>Failed</option>
                      </select>
                    </div>

                    <div id="oms-toast-${order.orderId}" class="oms-status-toast">
                      <span class="status-pill ${order.status === 'completed' || order.status === 'paid' ? 'pill-success' : 'pill-neutral'}">Current: ${order.status.toUpperCase()}</span>
                    </div>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  async function loadAdmin(event) {
    if (event) event.preventDefault();
    const tokenInput = document.getElementById("admin-token");
    if (tokenInput && tokenInput.value) {
      adminToken = tokenInput.value;
    }
    await loadCsrf();
    try {
      const analytics = await api("/api/admin/analytics");
      renderAnalytics(analytics);
      await loadOmsOrders();
      const helper = document.getElementById("token-helper");
      if (helper) helper.innerHTML = `<span class="success-text"><i data-lucide="check"></i> Decrypted and loaded secure analytics & OMS orders successfully.</span>`;
      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      const helper = document.getElementById("token-helper");
      if (helper) helper.innerHTML = `<span class="error-text"><i data-lucide="alert-circle"></i> ${error.message}</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async function requestRefund(event) {
    event.preventDefault();
    const status = document.querySelector("[data-refund-status]");
    try {
      if (!csrfToken) await loadCsrf();
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const result = await api("/api/admin/refunds", { method: "POST", body: JSON.stringify(body) });
      status.innerHTML = `<span class="success-text"><i data-lucide="check-circle-2"></i> Refund ${result.refundId} is ${result.status}.</span>`;
      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      status.innerHTML = `<span class="error-text"><i data-lucide="alert-circle"></i> ${error.message}</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadKyc();
    const tokenInput = document.getElementById("admin-token");
    const userPill = document.getElementById("admin-user-pill");
    const logoutBtn = document.getElementById("admin-logout-btn");
    const refreshOmsBtn = document.getElementById("refresh-oms-btn");
    
    const storedToken = localStorage.getItem("opds_admin_token");
    const storedUser = localStorage.getItem("opds_testing_user");

    if (storedToken && storedUser === "bisenasif0001") {
      if (tokenInput) tokenInput.value = storedToken;
      if (userPill) userPill.style.display = "flex";
      adminToken = storedToken;
      loadAdmin();
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("opds_admin_token");
        localStorage.removeItem("opds_testing_user");
        window.location.href = "login.html";
      });
    }

    if (refreshOmsBtn) {
      refreshOmsBtn.addEventListener("click", loadOmsOrders);
    }

    document.querySelector("[data-admin-token-form]")?.addEventListener("submit", loadAdmin);
    document.querySelector("[data-refund-form]")?.addEventListener("submit", requestRefund);
  });
})();
