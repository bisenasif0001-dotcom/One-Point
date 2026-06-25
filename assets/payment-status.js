(function () {
  "use strict";

  const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
  const isSuccessPage = () => Boolean(document.querySelector(".payment-result-card.success-state"));

  function dashboardUrl(params) {
    const target = new URLSearchParams({
      portal: "customer",
      panel: "orders",
      payment: "success"
    });
    const orderId = params.get("order_id");
    const phone = params.get("phone") || localStorage.getItem("opds_testing_user") || "";
    if (orderId) target.set("order_id", orderId);
    if (phone) target.set("phone", phone);
    return `dashboard/index.html?${target.toString()}`;
  }

  function setupDashboardRedirect(params) {
    if (!isSuccessPage() || params.get("redirect") !== "dashboard") return;
    const note = document.querySelector("[data-dashboard-redirect-note]");
    const targetUrl = dashboardUrl(params);
    let remaining = 4;

    const updateNote = () => {
      if (!note) return;
      note.innerHTML = `Opening your customer dashboard in <strong>${remaining}</strong> seconds... <a href="${targetUrl}">Open now</a>`;
    };

    updateNote();
    const timer = window.setInterval(() => {
      remaining -= 1;
      updateNote();
      if (remaining <= 0) window.clearInterval(timer);
    }, 1000);
    window.setTimeout(() => {
      window.location.href = targetUrl;
    }, 4200);
  }

  async function loadStatus() {
    const root = document.querySelector("[data-payment-status]");
    if (!root) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    if (!orderId) {
      root.innerHTML = isSuccessPage()
        ? `<p class="status-copy">Payment confirmed. Your order details will appear in the customer dashboard.</p>`
        : `<p class="status-copy">Order ID missing.</p>`;
      setupDashboardRedirect(params);
      return;
    }

    try {
      const response = await fetch(`/api/payments/status/${encodeURIComponent(orderId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load payment status.");
      const payment = data.payment || {};
      const transaction = data.transaction || {};
      root.innerHTML = `
        <div class="status-detail-grid">
          <span><small>Order ID</small><strong>${data.order.orderId}</strong></span>
          <span><small>Transaction ID</small><strong>${transaction.transactionId || payment.paymentId || "Processing"}</strong></span>
          <span><small>Payment method</small><strong>${payment.method || "UPI"}</strong></span>
          <span><small>Gateway</small><strong>${payment.gateway || "-"}</strong></span>
          <span><small>Amount</small><strong>${money(data.order.total)}</strong></span>
          <span><small>Date/time</small><strong>${data.order.createdAt}</strong></span>
        </div>
        <div class="status-actions">
          ${data.invoice?.downloadUrl ? `<a class="btn btn-primary" href="${data.invoice.downloadUrl}">Invoice Download</a>` : ""}
          <a class="btn btn-soft" href="track-application.html?id=${encodeURIComponent(data.order.orderId || orderId)}">Track Order</a>
          <a class="btn btn-ghost" href="products.html">Continue Shopping</a>
        </div>
      `;
      setupDashboardRedirect(params);
    } catch (error) {
      root.innerHTML = `<p class="status-copy">${error.message}</p>`;
      setupDashboardRedirect(params);
    }
  }

  async function retryPayment(event) {
    const button = event.target.closest("[data-retry-payment]");
    if (!button) return;
    event.preventDefault();
    const paymentId = new URLSearchParams(window.location.search).get("payment_id");
    if (!paymentId) return;
    const csrf = await fetch("/api/csrf").then((res) => res.json());
    const response = await fetch("/api/payments/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrfToken },
      body: JSON.stringify({ paymentId, gateway: button.dataset.retryPayment || "phonepe" })
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.message || "Retry failed");
      return;
    }
    if (data.payment.sessionType === "redirect") window.location.href = data.payment.session.redirectUrl;
    else window.location.href = `checkout.html`;
  }

  document.addEventListener("DOMContentLoaded", loadStatus);
  document.addEventListener("click", retryPayment);
})();
