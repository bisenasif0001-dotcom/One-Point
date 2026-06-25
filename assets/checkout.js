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

  window._opdsSanitizeData = sanitizeData;

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

  let checkoutItems = [];
  let checkoutCsrfToken = "";

  async function getCheckoutCsrfToken() {
    if (checkoutCsrfToken) return checkoutCsrfToken;
    const { response, data } = await fetchJsonWithRetry("/api/csrf");
    if (!response.ok || !data.csrfToken) throw new Error(data.message || "Secure checkout token could not be created.");
    checkoutCsrfToken = data.csrfToken;
    return checkoutCsrfToken;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function apiUrl(path) {
    return new URL(path, window.location.origin).toString();
  }

  function xhrJson(url, options = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method || "GET", url, true);
      xhr.timeout = 15000;
      xhr.withCredentials = true;
      Object.entries(options.headers || {}).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      xhr.onload = () => {
        let data = {};
        try {
          data = xhr.responseText ? (window._opdsSanitizeData ? window._opdsSanitizeData(JSON.parse(xhr.responseText)) : JSON.parse(xhr.responseText)) : {};
        } catch {
          data = {};
        }
        resolve({
          response: {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status
          },
          data
        });
      };
      xhr.onerror = () => reject(new Error("Checkout server connection failed."));
      xhr.ontimeout = () => reject(new Error("Checkout server did not respond in time."));
      xhr.send(options.body || null);
    });
  }

  async function fetchJsonWithRetry(url, options = {}, retries = 1) {
    const targetUrl = apiUrl(url);
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        if (typeof fetch === "function") {
          const response = await fetch(targetUrl, {
            credentials: "same-origin",
            ...options
          });
          const data = await response.json().catch(() => ({}));
          return { response, data };
        }
      } catch (error) {
        lastError = error;
        try {
          return await xhrJson(targetUrl, options);
        } catch (xhrError) {
          lastError = xhrError;
        }
      }
      if (typeof fetch !== "function") {
        try {
          return await xhrJson(targetUrl, options);
        } catch (xhrError) {
          lastError = xhrError;
        }
      }
      if (attempt < retries) await delay(650);
    }
    throw lastError || new Error("Checkout server connection failed.");
  }

  async function pingCheckoutServer() {
    try {
      const { response } = await fetchJsonWithRetry("/api/health", {}, 0);
      return response.ok;
    } catch {
      return false;
    }
  }

  function explainCheckoutError(error) {
    const message = error.message || "";
    if (/failed to fetch|connection failed|did not respond/i.test(message)) {
      return "Unable to connect to our secure payment server. Please check your internet connection and click Pay again.";
    }
    return message;
  }

  function parseCheckoutParams() {
    const params = new URLSearchParams(window.location.search);
    const serviceSlug = params.get("service");
    const serviceName = params.get("service_name");

    const nameInput = document.getElementById("checkout-name");
    const mobileInput = document.getElementById("checkout-mobile");
    const emailInput = document.getElementById("checkout-email");
    const addressInput = document.getElementById("checkout-address");
    const notesInput = document.getElementById("checkout-notes");
    const attachmentsInput = document.getElementById("checkout-attachments");

    if (nameInput && params.get("name")) nameInput.value = params.get("name");
    if (mobileInput && params.get("phone")) mobileInput.value = params.get("phone");
    if (emailInput && params.get("email")) emailInput.value = params.get("email");
    if (addressInput && params.get("address")) addressInput.value = params.get("address");
    if (notesInput && params.get("notes")) notesInput.value = params.get("notes");
    if (attachmentsInput && params.get("attachments")) attachmentsInput.value = params.get("attachments");

    if (serviceSlug) {
      let name = serviceName || "E-Service Booking";
      let price = 199;
      
      const lowerName = name.toLowerCase();
      const lowerSlug = serviceSlug.toLowerCase();
      
      if (lowerName.includes("ayushman") || lowerSlug.includes("ayushman")) {
        price = 100;
        if (!serviceName) name = "Ayushman Card";
      } else if (lowerName.includes("voter") || lowerSlug.includes("voter")) {
        price = 100;
        if (!serviceName) name = "Voter ID Registration";
      } else if (lowerName.includes("passport") || lowerSlug.includes("passport")) {
        price = 499;
        if (!serviceName) name = "Passport Application";
      } else if (
        lowerName.includes("income") || lowerSlug.includes("income") ||
        lowerName.includes("caste") || lowerSlug.includes("caste") ||
        lowerName.includes("domicile") || lowerSlug.includes("domicile") ||
        lowerName.includes("birth") || lowerSlug.includes("birth") ||
        lowerName.includes("police") || lowerSlug.includes("police")
      ) {
        price = 150;
        if (!serviceName) name = "Certificate Assistance";
      } else if (lowerName.includes("gst") || lowerSlug.includes("gst")) {
        price = 499;
        if (!serviceName) name = "GST Registration";
      } else if (lowerName.includes("msme") || lowerSlug.includes("msme")) {
        price = 299;
        if (!serviceName) name = "MSME Registration";
      } else if (lowerName.includes("digital signature") || lowerSlug.includes("digital signature") || lowerName.includes("dsc") || lowerSlug.includes("dsc")) {
        price = 999;
        if (!serviceName) name = "Digital Signature (DSC)";
      } else if (lowerName.includes("fssai") || lowerSlug.includes("fssai")) {
        price = 499;
        if (!serviceName) name = "FSSAI License";
      } else if (lowerName.includes("shop") || lowerSlug.includes("shop")) {
        price = 299;
        if (!serviceName) name = "Shop License";
      } else if (lowerName.includes("iec") || lowerSlug.includes("iec")) {
        price = 499;
        if (!serviceName) name = "IEC Code Registration";
      } else if (lowerName.includes("trademark") || lowerSlug.includes("trademark")) {
        price = 999;
        if (!serviceName) name = "Trademark Registration";
      } else if (lowerName.includes("company") || lowerSlug.includes("company")) {
        price = 1999;
        if (!serviceName) name = "Company Registration";
      } else if (lowerName.includes("exam") || lowerSlug.includes("exam")) {
        price = 199;
        if (!serviceName) name = "Exam Form Filling";
      } else if (lowerSlug.includes("pan") || lowerName.includes("pan")) {
        price = 199;
        if (!serviceName) name = "PAN Card Assistance";
      }

      checkoutItems = [{ slug: serviceSlug, name, type: "service", price, quantity: 1 }];
    } else {
      try {
        checkoutItems = JSON.parse(localStorage.getItem("opds_cart") || "[]");
      } catch (e) {
        checkoutItems = [];
      }
    }

    renderOrderSummary();
  }

  function renderOrderSummary() {
    const container = document.getElementById("checkout-items-container");
    const subtotalEl = document.getElementById("summary-subtotal");
    const totalEl = document.getElementById("summary-total");
    const payableTotalEl = document.getElementById("summary-payable-total");
    const submitBtnText = document.getElementById("submit-btn-text");

    if (!container) return;

    if (checkoutItems.length === 0) {
      container.innerHTML = `
        <div class="empty-console-state">
          <i data-lucide="shopping-bag"></i>
          <p>Your order summary is empty. Please select a product or service.</p>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = "Rs. 0.00";
      if (totalEl) totalEl.textContent = "Rs. 0.00";
      if (payableTotalEl) payableTotalEl.textContent = "Rs. 0.00";
      if (submitBtnText) submitBtnText.innerHTML = `<i data-lucide="lock"></i> Complete Secure Payment`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let subtotal = 0;
    container.innerHTML = checkoutItems.map(item => {
      const itemPrice = Number(item.price || 0) * (item.quantity || 1);
      subtotal += itemPrice;
      return `
        <div class="elite-line-item">
          <div class="item-icon"><i data-lucide="${item.type === 'service' ? 'layers' : 'package'}"></i></div>
          <div class="item-details">
            <strong>${item.name || item.slug}</strong>
            <span>Qty: ${item.quantity || 1} &bull; ${item.type === 'service' ? 'Government E-Service' : 'Store Product'}</span>
            <span class="service-badge"><i data-lucide="check"></i> Verified Fee</span>
          </div>
          <div class="item-price">
            <strong>Rs. ${itemPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>
      `;
    }).join("");

    if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (totalEl) totalEl.textContent = `Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (payableTotalEl) payableTotalEl.textContent = `Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (submitBtnText) submitBtnText.innerHTML = `<i data-lucide="lock"></i> Pay Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (window.lucide) window.lucide.createIcons();
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorEl = document.getElementById("checkout-error");
    const submitBtnText = document.getElementById("submit-btn-text");

    if (errorEl) errorEl.style.display = "none";

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const customer = {
      name: formData.get("name"),
      phone: formData.get("mobile"),
      email: formData.get("email"),
      address: formData.get("address") || ""
    };

    const paymentMethod = formData.get("paymentMethod") || "upi";
    const gateway = formData.get("gateway") || "razorpay";
    const notes = formData.get("notes") || "";
    let attachments = {};
    try {
      attachments = JSON.parse(formData.get("attachments") || "{}");
    } catch (e) {
      attachments = {};
    }

    if (submitBtnText) {
      submitBtnText.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Initializing Secure Gateway...`;
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const serverReady = await pingCheckoutServer();
      if (!serverReady) throw new Error("Checkout server connection failed.");
      const isService = checkoutItems.some(i => i.type === "service");
      const endpoint = isService ? "/api/service-bookings" : "/api/orders";
      const csrfToken = await getCheckoutCsrfToken();

      const { response, data } = await fetchJsonWithRetry(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
          customer,
          items: checkoutItems,
          paymentMethod,
          gateway,
          idempotencyKey: "checkout_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
          notes,
          attachments
        })
      });

      if (!response.ok) throw new Error(data.message || "Payment gateway initialization failed.");

      if (submitBtnText) {
        submitBtnText.innerHTML = `<i data-lucide="check-circle-2"></i> Booking Created. Opening Gateway...`;
        if (window.lucide) window.lucide.createIcons();
      }

      if (window.trackAnalyticsEvent) {
        window.trackAnalyticsEvent('checkout_completed', {
          orderId: data.order?.orderId || data.booking?.bookingId,
          amount: data.order?.payableAmount || data.booking?.payableAmount || 199,
          customerName: customer.name,
          phone: customer.phone,
          gateway
        });
      }

      if (window.openGatewaySession) {
        localStorage.setItem("opds_testing_user", customer.phone);
        await window.openGatewaySession(data);
      } else {
        localStorage.setItem("opds_testing_user", customer.phone);
        const successParams = new URLSearchParams({
          redirect: "dashboard"
        });
        if (data.order?.orderId) successParams.set("order_id", data.order.orderId);
        if (customer.phone) successParams.set("phone", customer.phone);
        window.location.href = `payment-success.html?${successParams.toString()}`;
      }
    } catch (error) {
      const readableError = explainCheckoutError(error);
      if (errorEl) {
        errorEl.innerHTML = `<i data-lucide="alert-circle"></i> ${readableError}`;
        errorEl.style.display = "flex";
      }
      renderOrderSummary();
      if (window.lucide) window.lucide.createIcons();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    parseCheckoutParams();

    if (window.trackAnalyticsEvent) {
      window.trackAnalyticsEvent('checkout_started', {
        items: checkoutItems,
        total: checkoutItems.reduce((acc, curr) => acc + (Number(curr.price || 0) * (curr.quantity || 1)), 0)
      });
    }

    const form = document.getElementById("checkout-form");
    if (form) form.addEventListener("submit", handleCheckoutSubmit);
  });
})();
