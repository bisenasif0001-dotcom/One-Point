(function () {
  "use strict";

  const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const isSuccessPage = () => Boolean(document.querySelector(".payment-result-card.success-state"));
  const isPendingPage = () => Boolean(document.querySelector(".payment-result-card.pending-state"));
  const isFailedPage = () => Boolean(document.querySelector(".payment-result-card.failed-state"));

  function announceStatus(root, message) {
    let announcement = document.getElementById('payment-status-announcement');
    if (!announcement) {
      announcement = document.createElement('p');
      announcement.id = 'payment-status-announcement';
      announcement.className = 'sr-only';
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      root.before(announcement);
    }
    if (announcement.textContent !== message) announcement.textContent = message;
    return announcement;
  }

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

  function profileUrl(params) {
    const target = new URLSearchParams({ payment: "success" });
    const orderId = params.get("order_id");
    if (orderId) target.set("order", orderId);
    return `customer-profile.html?${target.toString()}`;
  }

  function accountOrderUrl(params) {
    const orderId = params.get("order_id");
    const target = new URLSearchParams({ checkout: "success" });
    if (orderId) target.set("id", orderId);
    return `customer-account-order-detail.html?${target.toString()}`;
  }

  function setupDashboardRedirect(params) {
    const redirectTarget = params.get("redirect");
    const validTargets = ["dashboard", "profile", "account-order"];
    if (!isSuccessPage() || !validTargets.includes(redirectTarget)) return;
    const note = document.querySelector("[data-dashboard-redirect-note]");
    const targetUrl = redirectTarget === "profile" ? profileUrl(params)
      : redirectTarget === "account-order" ? accountOrderUrl(params)
      : dashboardUrl(params);
    const destinationLabel = redirectTarget === "profile" ? "profile"
      : redirectTarget === "account-order" ? "order details"
      : "customer dashboard";
    let remaining = 4;

    const updateNote = () => {
      if (!note) return;
      note.innerHTML = `Opening your ${destinationLabel} in <strong>${remaining}</strong> seconds... <a href="${targetUrl}">Open now</a>`;
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

  window.copyPaymentText = function (text, btn) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      const originalText = btn.textContent;
      btn.textContent = "Copied!";
      btn.style.background = "#dcfce7";
      btn.style.color = "#166534";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = "";
        btn.style.color = "";
      }, 1600);
    });
  };

  function updateSupportLinks(orderId, paymentId, amount) {
    const supportLink = document.getElementById("payment-support-link") || document.querySelector("a[href='support.html']");
    if (!supportLink) return;
    const statusType = isPendingPage() ? "Pending" : isFailedPage() ? "Failed" : "Query";
    const text = encodeURIComponent(
      `Hello One Point Team, my payment status is ${statusType}.\n` +
      `Order ID: ${orderId || "N/A"}\n` +
      `Transaction ID: ${paymentId || "N/A"}\n` +
      `Amount: ${amount ? "Rs. " + amount : "N/A"}\n` +
      `Please help verify the status.`
    );
    supportLink.href = `https://wa.me/919473946181?text=${text}`;
    supportLink.target = "_blank";
    supportLink.rel = "noopener noreferrer";
  }

  function renderStatusGrid(details) {
    const orderId = details.orderId;
    const paymentId = details.paymentId;
    const downloadUrl = details.downloadUrl;
    details = { ...details, ...Object.fromEntries(['orderId', 'paymentId', 'amountFormatted', 'method', 'gateway', 'dateTime'].map(key => [key, escapeHtml(details[key])])) };
    return `
      <div class="status-detail-grid">
        <span>
          <small>Order ID</small>
          <strong>
            ${details.orderId}
            <button type="button" class="copy-btn-inline" aria-label="Copy order ID" data-copy-payment="${escapeHtml(orderId)}">Copy</button>
          </strong>
        </span>
        <span>
          <small>Amount</small>
          <strong class="amount-value">${details.amountFormatted}</strong>
        </span>
        <span>
          <small>Transaction ID</small>
          <strong>
            ${details.paymentId}
            ${paymentId && paymentId !== "Processing" && paymentId !== "Pending" ? `<button type="button" class="copy-btn-inline" aria-label="Copy transaction ID" data-copy-payment="${escapeHtml(paymentId)}">Copy</button>` : ""}
          </strong>
        </span>
        <span>
          <small>Payment Method & Gateway</small>
          <strong>${details.method} (${details.gateway})</strong>
        </span>
        <span>
          <small>Date / Time</small>
          <strong>${details.dateTime}</strong>
        </span>
        <span>
          <small>Gateway Status</small>
          <strong>${details.statusBadge}</strong>
        </span>
      </div>
      <div class="status-actions" style="margin-bottom: 22px;">
        ${downloadUrl && /^\/(?!\/)/.test(downloadUrl) ? `<a class="btn btn-primary" href="${escapeHtml(downloadUrl)}"><i data-lucide="download"></i> Invoice Download</a>` : ""}
        <a class="btn btn-soft" href="track-application.html?id=${encodeURIComponent(orderId)}"><i data-lucide="radar"></i> Track Order</a>
        <a class="btn btn-ghost" href="products.html"><i data-lucide="shopping-bag"></i> Continue Shopping</a>
      </div>
    `;
  }

  async function loadStatus(isManual = false) {
    const root = document.querySelector("[data-payment-status]");
    if (!root) return;
    root.removeAttribute('role');
    root.removeAttribute('aria-live');
    root.removeAttribute('aria-atomic');
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    const urlPaymentId = params.get("payment_id") || "";
    const urlAmount = params.get("amount") || "220.00";
    const urlGateway = params.get("gateway") || "Razorpay";
    const urlMethod = params.get("method") || "UPI";

    updateSupportLinks(orderId, urlPaymentId, urlAmount);

    if (!orderId) {
      const heading = document.querySelector('.payment-result-card h1');
      if (heading) heading.textContent = 'Payment reference missing';
      document.querySelectorAll('[data-retry-payment]').forEach(button => button.disabled = true);
      root.innerHTML = isSuccessPage()
        ? `<p class="status-copy">Order ID missing. Payment cannot be confirmed.</p>`
        : `<p class="status-copy">Order ID missing in URL parameters.</p>`;

      announceStatus(root, 'Payment reference missing. Open your existing order or contact support.');

      return;
    }

    root.setAttribute('aria-busy', 'true');
    root.textContent = 'Checking the existing order’s payment status…';
    if (!document.getElementById('payment-status-announcement')?.textContent || isManual) announceStatus(root, 'Checking the existing order’s payment status.');
    try {
      const response = await fetch(`/api/payments/status/${encodeURIComponent(orderId)}`);
      if (!response.ok) throw new Error("Order status API returned " + response.status);
      const data = await response.json();

      const payment = data.payment || {};
      const transaction = data.transaction || {};
      const order = data.order || {};
      const rawStatus = (payment.status || order.paymentStatus || "pending").toLowerCase();
      window.OPDSPilotMetrics?.track(['captured', 'success', 'paid'].includes(rawStatus) ? 'payment_verified' : 'payment_pending', { once: true });
      const finalPaymentId = transaction.transactionId || payment.paymentId || urlPaymentId || "Processing";
      const finalAmount = order.total != null ? order.total : urlAmount;
      const finalGateway = payment.gateway || urlGateway;
      const finalMethod = (payment.method || urlMethod).toUpperCase();
      const finalDate = order.createdAt || new Date().toLocaleString();

      updateSupportLinks(order.orderId || orderId, finalPaymentId, finalAmount);

      // Auto redirect if status changed
      if (isPendingPage()) {
        if (rawStatus === "captured" || rawStatus === "success" || rawStatus === "paid") {
          window.location.href = `payment-success.html?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(finalPaymentId)}&redirect=dashboard`;
          return;
        }
        if (rawStatus === "failed") {
          window.location.href = `payment-failed.html?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(finalPaymentId)}&gateway=${encodeURIComponent(finalGateway)}`;
          return;
        }
      }

      let statusBadge = `<span class="payment-status-label--pending">⏳ Awaiting Confirmation</span>`;
      if (rawStatus === "captured" || rawStatus === "success" || rawStatus === "paid") {
        statusBadge = `<span class="payment-status-label--confirmed">✓ Confirmed</span>`;
      } else if (rawStatus === "failed") {
        statusBadge = `<span class="payment-status-label--failed">❌ Payment Failed</span>`;
      }

      root.innerHTML = renderStatusGrid({
        orderId: order.orderId || orderId,
        paymentId: finalPaymentId,
        amountFormatted: money(finalAmount),
        method: finalMethod,
        gateway: finalGateway,
        dateTime: finalDate,
        statusBadge: statusBadge,
        downloadUrl: data.invoice?.downloadUrl || ""
      });

      if (window.lucide) window.lucide.createIcons();
      const statusHeading = document.querySelector('.payment-result-card h1');
      if (statusHeading) statusHeading.textContent = ['captured', 'success', 'paid'].includes(rawStatus) ? 'Payment successful' : rawStatus === 'failed' ? 'Payment failed' : 'Payment awaiting confirmation';
      if (['captured', 'success', 'paid'].includes(rawStatus)) document.querySelectorAll('[data-retry-payment]').forEach(button => button.disabled = true);
      announceStatus(root, statusHeading?.textContent || 'Payment awaiting confirmation');
      if (["captured", "success", "paid"].includes(rawStatus)) {
        const heading = document.querySelector('.payment-result-card h1');
        if (heading) heading.textContent = 'Payment successful';
        localStorage.removeItem('opds_checkout_intent');
        localStorage.removeItem('opds_checkout_draft');
        setupDashboardRedirect(params);
      }
      if (data.documentSubmission) {
        const documents = document.createElement('p');
        documents.textContent = data.documentSubmission.label + ' ';
        const link = document.createElement('a');
        link.href = 'order-documents.html?order=' + encodeURIComponent(order.orderId || orderId);
        link.textContent = 'Send / retry documents';
        documents.append(link); root.append(documents);
      }

    } catch (error) {
      const statusBadge = '<span>Verification unavailable — check again before paying.</span>';
      const heading = document.querySelector('.payment-result-card h1');
      if (heading) heading.textContent = 'Payment status unavailable';
      announceStatus(root, 'Payment status unavailable. Check the existing order before paying.');
      root.innerHTML = renderStatusGrid({
        orderId: orderId,
        paymentId: urlPaymentId || "Processing",
        amountFormatted: money(urlAmount),
        method: urlMethod.toUpperCase(),
        gateway: urlGateway,
        dateTime: new Date().toLocaleString(),
        statusBadge: statusBadge,
        downloadUrl: ""
      });

      if (window.lucide) window.lucide.createIcons();

    } finally {
      root.setAttribute('aria-busy', 'false');
    }
  }

  async function retryPayment(event) {
    const button = event.target.closest("[data-retry-payment]");
    if (!button) return;
    event.preventDefault();
    const paymentId = new URLSearchParams(window.location.search).get("payment_id");
    if (!paymentId) return;
    try {
      if (!window.OPDSPaymentRecovery) await import('./payment-recovery.js?v=verification-106');
      await window.OPDSPaymentRecovery.retry(paymentId, button.dataset.retryPayment || 'razorpay', button);
    } catch (error) { const root = document.querySelector('[data-payment-status]'); const message = document.createElement('p'); message.setAttribute('role', 'alert'); message.textContent = error.message; root?.append(message); }
  }

  function renderRetryRail() {
    const rail = document.querySelector("[data-retry-rail]");
    if (!rail || !window.OPDSPay) return;
    const params = new URLSearchParams(window.location.search);
    const failedGateway = params.get("gateway") || "";
    const options = window.OPDSPay.getRetryGateways(failedGateway);
    if (!options.length) return;
    rail.innerHTML = options.map((gw) => `
      <button class="btn btn-soft" type="button" data-retry-payment="${gw.id}">
        <i data-lucide="refresh-cw"></i> Retry via ${gw.label}
      </button>
    `).join("");
    if (window.lucide) window.lucide.createIcons();
  }

  function setupPendingPolling() {
    if (!isPendingPage()) return;
    let countdown = 6;
    const timerSecEl = document.getElementById("polling-timer-sec");

    window.setInterval(() => {
      countdown -= 1;
      if (timerSecEl) timerSecEl.textContent = countdown;
      if (countdown <= 0) {
        countdown = 6;
        loadStatus(false);
      }
    }, 1000);

    const manualBtn = document.getElementById("manual-refresh-status-btn");
    if (manualBtn) {
      manualBtn.addEventListener("click", () => {
        manualBtn.disabled = true;
        const originalText = manualBtn.innerHTML;
        manualBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Checking...`;
        if (window.lucide) window.lucide.createIcons();
        countdown = 6;
        loadStatus(true).finally(() => {
          setTimeout(() => {
            manualBtn.disabled = false;
            manualBtn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
          }, 600);
        });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderRetryRail();
    // The existing retry handler requires a payment reference from the URL.
    // Do not present an actionable retry when that reference is unavailable.
    if (!new URLSearchParams(window.location.search).get('payment_id')) {
      document.querySelectorAll('[data-retry-payment]').forEach(button => { button.disabled = true; });
    }
    loadStatus();
    setupPendingPolling();
  });
  document.addEventListener("click", retryPayment);
  document.addEventListener('click', event => { const button = event.target.closest('[data-copy-payment]'); if (button) window.copyPaymentText(button.dataset.copyPayment, button); });
})();
