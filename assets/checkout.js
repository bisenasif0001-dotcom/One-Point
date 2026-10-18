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
  let currentStepIndex = 1;
  let activeCoupon = null;
  let uploadFiles = [];
  let loggedInCheckoutCustomer = null;
  let checkoutProfilePromise = null;
  let applicantMode = "self";
  let applicantEditing = false;
  let applicantTouched = false;
  let otherApplicantValues = null;
  const applicantIds = ['checkout-name', 'checkout-mobile', 'checkout-email', 'checkout-address', 'checkout-gst'];
  function applicantValues() {
    return Object.fromEntries(applicantIds.map(id => [id, document.getElementById(id)?.value || '']));
  }
  function restoreApplicantValues(values) {
    applicantIds.forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = values?.[id] || '';
      input.classList.remove('eds-input-valid', 'eds-input-invalid');
      input.closest('.enterprise-field')?.classList.remove('is-valid', 'is-invalid');
    });
  }

  // Payment selection state (backed by the OPDSPay registry, no hardcoded providers)
  let selectedMethodId = "";
  let selectedPlanId = "full";
  let activePayCategory = "";
  let lastTotalPayable = 0;
  let lastPricingDetails = {
    subtotal: 0,
    governmentFee: 0,
    platformFee: 0,
    gstAmount: 0,
    discount: 0,
    totalPayable: 0
  };

  const checkoutStepLabels = {
    1: "Details",
    2: "Documents",
    3: "Payment",
    4: "Complete"
  };

  function formatINR(value) {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }

  function estimatedDeliveryText(item) {
    const raw = String(item?.tag || item?.timeline || "").trim();
    if (raw) return raw;
    const model = String(item?.pricingModel || "").toLowerCase();
    if (model.includes("all") || model.includes("inclusive") || model.includes("fixed")) return "2-3 days";
    return "2-3 days";
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function showCheckoutStatus(message, type = "info", focusTarget = null) {
    if (type === 'error') window.OPDSPilotMetrics?.track('checkout_error');
    const status = document.getElementById("checkout-step-status");
    if (!status) return;
    status.className = `checkout-step-status is-${type}`;
    status.setAttribute("role", type === "error" ? "alert" : "status");
    status.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    status.setAttribute("aria-atomic", "true");
    const iconName = type === "error" ? "alert-circle" : (type === "success" ? "check-circle-2" : "info");
    status.innerHTML = `
      <div class="checkout-status-icon"><i data-lucide="${iconName}"></i></div>
      <div class="checkout-status-text">${escapeHtml(message)}</div>
      <button type="button" class="checkout-status-close" onclick="clearCheckoutStatus()" aria-label="Dismiss alert"><i data-lucide="x"></i></button>
    `;
    status.hidden = false;
    if (window.lucide) window.lucide.createIcons();
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus({ preventScroll: false });
      if (typeof focusTarget.scrollIntoView === "function") {
        focusTarget.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      status.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function clearCheckoutStatus() {
    const status = document.getElementById("checkout-step-status");
    if (!status) return;
    status.hidden = true;
    status.textContent = "";
  }
  window.clearCheckoutStatus = clearCheckoutStatus;
  window.showCheckoutStatus = showCheckoutStatus;

  function hydrateCustomerFromParams(params) {
    const values = {
      "checkout-name": params.get("name"),
      "checkout-mobile": params.get("phone") || params.get("mobile"),
      "checkout-email": params.get("email"),
      "checkout-address": params.get("address"),
      "checkout-notes": params.get("notes"),
      "checkout-attachments": params.get("attachments")
    };
    Object.entries(values).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input && value) input.value = value;
    });
  }

  function setCheckoutAvailability(hasItems) {
    const continueButton = document.getElementById("service-continue-btn");
    if (continueButton) {
      continueButton.disabled = !hasItems;
      continueButton.setAttribute("aria-disabled", String(!hasItems));
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function checkoutSessionToken() {
    try { return localStorage.getItem("opds_customer_session") || ""; } catch { return ""; }
  }

  function checkoutProfileAddress(identity = {}) {
    const base = [identity.address, identity.addressLine2, identity.landmark, identity.city, identity.district, identity.state, identity.pincode]
      .map(value => String(value || "").trim())
      .filter(Boolean);
    if (!base.length) return "";
    const values = [...base, identity.country || "India"];
    return values.filter((value, index) => values.findIndex(item => item.toLowerCase() === value.toLowerCase()) === index).join(", ");
  }

  function savedIdentity() {
    return loggedInCheckoutCustomer?.identity || null;
  }

  function savedIdentityComplete(identity = savedIdentity()) {
    if (!identity) return false;
    const name = String(identity.name || "").trim();
    const mobile = String(identity.mobile || identity.phone || "").replace(/\D/g, "").slice(-10);
    const email = String(identity.email || "").trim();
    return Boolean(name && !/^customer$/i.test(name) && /^\d{10}$/.test(mobile) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }

  function fillCheckoutCustomer(identity = savedIdentity()) {
    if (!identity) return;
    const values = {
      "checkout-name": identity.name || "",
      "checkout-mobile": String(identity.mobile || identity.phone || "").replace(/\D/g, "").slice(-10),
      "checkout-email": identity.email || "",
      "checkout-address": checkoutProfileAddress(identity)
    };
    Object.entries(values).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = value;
      if (value) validateLiveInput(input);
    });
  }

  function updateApplicantSummary() {
    const summary = document.getElementById("checkout-applicant-summary");
    if (!summary) return;
    const name = document.getElementById("checkout-name")?.value.trim() || "Applicant";
    const mobile = document.getElementById("checkout-mobile")?.value.trim() || "";
    const email = document.getElementById("checkout-email")?.value.trim() || "";
    summary.innerHTML = `
      <span class="checkout-applicant-icon"><i data-lucide="circle-user-round"></i></span>
      <span><small>Application details</small><strong>${escapeHtml(name)}</strong><em>${escapeHtml([mobile, email].filter(Boolean).join(" · "))}</em></span>
      <button type="button" onclick="editCheckoutApplicant(false)"><i data-lucide="pencil"></i> Edit</button>
    `;
    summary.hidden = false;
    if (window.lucide) window.lucide.createIcons();
  }

  function renderSavedCustomer() {
    const card = document.getElementById("checkout-saved-customer");
    const editor = document.getElementById("checkout-customer-editor");
    const identity = savedIdentity();
    if (!card || !editor || !identity) {
      if (card) card.hidden = true;
      if (editor) editor.hidden = false;
      return;
    }
    const complete = savedIdentityComplete(identity);
    const mobile = String(identity.mobile || identity.phone || "").replace(/\D/g, "").slice(-10);
    const email = String(identity.email || "").trim();
    const address = checkoutProfileAddress(identity);
    const usingSaved = applicantMode === "self";
    card.hidden = false;
    card.classList.toggle("is-incomplete", !complete);
    card.innerHTML = `
      <span class="checkout-saved-icon"><i data-lucide="badge-check"></i></span>
      <span class="checkout-saved-copy">
        <small>${complete ? "SIGNED-IN CUSTOMER" : "PROFILE DETAILS FOUND"}</small>
        <strong>${escapeHtml(identity.name || "Customer")}</strong>
        <em>${escapeHtml([mobile, email].filter(Boolean).join(" · "))}</em>
        <span>${escapeHtml(address || "No postal address added (optional).")}</span>
      </span>
      <span class="checkout-saved-actions">
        ${usingSaved ? `<button type="button" class="eds-btn eds-btn-secondary" onclick="editCheckoutApplicant(false)">Edit my details</button>` : ""}
        ${complete && !usingSaved ? `<button type="button" class="eds-btn eds-btn-primary" onclick="useSavedCustomerDetails()"><i data-lucide="check"></i> Use my details</button>` : ""}
        ${usingSaved ? `<button type="button" class="eds-btn eds-btn-secondary" onclick="editCheckoutApplicant(true)"><i data-lucide="users"></i> Apply for someone else</button>` : ""}
      </span>
    `;
    editor.hidden = complete && usingSaved && !applicantEditing;
    const continueButton = document.getElementById('service-continue-btn');
    if (continueButton) continueButton.textContent = editor.hidden ? 'Continue with saved details' : 'Continue to Documents';
    if (window.lucide) window.lucide.createIcons();
  }

  async function loadLoggedInCheckoutCustomer() {
    const button = document.getElementById("service-continue-btn");
    const token = checkoutSessionToken();
    try {
      const response = await fetch("/api/customer/profile", {
        credentials: "same-origin",
        headers: token ? { "X-Session-Token": token, "Authorization": `Bearer ${token}` } : {}
      });
      if (!response.ok) return null;
      const data = await response.json();
      loggedInCheckoutCustomer = data.customer || null;
      if (applicantMode === "self" && !applicantTouched && !applicantEditing) fillCheckoutCustomer();
      renderSavedCustomer();
      if (window.lucide) window.lucide.createIcons();
      return loggedInCheckoutCustomer;
    } catch {
      return null;
    }
  }

  window.useSavedCustomerDetails = function() {
    if (applicantMode === 'other') otherApplicantValues = applicantValues();
    applicantMode = "self";
    applicantEditing = false;
    applicantTouched = false;
    localStorage.setItem("opds_checkout_applicant_mode", "self");
    localStorage.removeItem('opds_checkout_draft');
    fillCheckoutCustomer();
    document.getElementById('checkout-gst').value = '';
    window.toggleProfileType('personal');
    renderSavedCustomer();
    if (validateStep1Form()) {
      updateApplicantSummary();
      showCheckoutStatus("Saved profile details applied successfully.", "info");
    }
  };

  window.editCheckoutApplicant = function(forOther = false) {
    if (forOther && applicantMode !== 'other') {
      restoreApplicantValues(otherApplicantValues);
      localStorage.removeItem('opds_checkout_draft');
      window.toggleProfileType(otherApplicantValues?.['checkout-gst'] ? 'business' : 'personal');
    }
    applicantMode = forOther ? "other" : applicantMode;
    applicantEditing = true;
    if (forOther) localStorage.setItem("opds_checkout_applicant_mode", "other");
    const editor = document.getElementById("checkout-customer-editor");
    if (editor) editor.hidden = false;
    renderSavedCustomer();
    if (currentStepIndex !== 1) window.navigateToStep(1);
    window.setTimeout(() => document.getElementById("checkout-name")?.focus({ preventScroll: true }), 80);
  };

  window.continueFromStep1 = async function() {
    if (checkoutItems.length === 0) {
      showCheckoutStatus("Select a service or add a product before continuing.", "error", document.getElementById("service-continue-btn"));
      return;
    }
    if (!await validateSelectedCatalogItems()) return;
    if (checkoutProfilePromise) await checkoutProfilePromise;
    if (!validateStep1Form()) return;
    updateApplicantSummary();
    window.navigateToStep(2);
  };
  window.continueFromService = window.continueFromStep1;

  window.continueWithDocumentsLater = async function() {
    if (checkoutProfilePromise) await checkoutProfilePromise;
    if (!validateStep1Form()) return;
    if (!checkoutItems.length) {
      showCheckoutStatus("Choose a service before continuing.", "error");
      return;
    }
    if (!await validateSelectedCatalogItems()) return;
    const later = document.getElementById("whatsapp-doc-later");
    if (!later) return;
    later.checked = true;
    updateApplicantSummary();
    window.navigateToStep(3);
  };

  function pricingKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function staticPricingFor(...values) {
    const index = window.OPDS_STATIC_PRICING || {};
    for (const value of values) {
      const item = index[pricingKey(value)];
      if (item) return item;
    }
    return null;
  }

  function resolvedPricing(...candidates) {
    return candidates.find((item) => item && (
      Number(item.price || 0) > 0
      || (item.displayPrice && item.displayPrice !== "Price loading")
      || (item.pricingModel && item.pricingModel !== "catalog_pending")
    )) || null;
  }

  function selectedPaymentLabel() {
    const registry = payRegistry();
    const method = registry && selectedMethodId ? registry.getMethod(selectedMethodId) : null;
    return method ? method.label : "UPI ready";
  }

  function updateCheckoutChrome() {
    setText("summary-current-step", checkoutStepLabels[currentStepIndex] || "Checkout");
    setText("summary-payment-method", selectedPaymentLabel());
    setText("summary-service-type", checkoutItems.some(i => i.type === "service") ? "Assisted" : "Store order");
    const documentsLabel = document.querySelector("#node-2 .journey-copy small");
    if (documentsLabel) documentsLabel.textContent = document.getElementById("whatsapp-doc-later")?.checked ? "Send later" : "Upload / Attach";

    const mobileCta = document.getElementById("mobile-checkout-cta");
    if (mobileCta) {
      let nextLabel = `Continue: ${checkoutStepLabels[currentStepIndex + 1] || "Next"}`;
      if (currentStepIndex === 3) {
        const registry = payRegistry();
        const method = registry?.getMethod(selectedMethodId);
        const plan = registry?.getPlan(selectedPlanId);
        const amount = Math.round(lastTotalPayable * (plan ? plan.nowFactor : 1) * 100) / 100;
        nextLabel = method?.flow === "offline" ? "Confirm Booking" : `Pay ${formatINR(amount)}`;
        if (checkoutItems.some(item => item.policy?.purchase.mode === 'scope_review')) nextLabel = 'Request scope quote';
      } else if (currentStepIndex >= 4) {
        nextLabel = "Track Application";
      }
      mobileCta.textContent = nextLabel;
      mobileCta.disabled = checkoutSubmitting || gatewayOpen;
    }

    document.querySelectorAll(".profile-choice-card").forEach(card => {
      const input = card.querySelector('input[name="profileType"]');
      card.classList.toggle("active", !!input && input.checked);
    });
  }

  // API Utilities
  async function getCheckoutCsrfToken() {
    // Renew at submission instead of forcing a customer to restart a long draft.
    const { response, data } = await fetchJsonWithRetry("/api/csrf");
    if (!response.ok || !data.csrfToken) throw new Error(data.message || "Secure checkout token could not be created.");
    checkoutCsrfToken = data.csrfToken;
    return checkoutCsrfToken;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function apiUrl(path) {
    return new URL(path, path.startsWith("/api/") ? window.location.origin : window.location.href).toString();
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
      const { response, data } = await fetchJsonWithRetry("/api/health", {}, 0);
      // Static hosts can return a 200 HTML fallback. Require the API contract.
      return response.ok && (data.ok === true || data.status === "healthy");
    } catch {
      return false;
    }
  }

  function loadCheckoutScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(script => script.src === src);
      if (existing) {
        if (window.Razorpay) resolve();
        else existing.addEventListener("load", resolve, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error("Secure payment gateway could not be loaded. Please try again.")); };
      document.head.appendChild(script);
    });
  }

  function storeGuestSession(orderResponse) {
    const session = orderResponse && orderResponse.session;
    const user = orderResponse && orderResponse.user;
    if (!session || !session.token) return;
    localStorage.setItem("opds_customer_session", session.token);
    if (user && user.phone) {
      localStorage.setItem("opds_customer_phone", user.phone);
      localStorage.setItem("opds_testing_user", user.phone);
    }
    if (user && user.email) localStorage.setItem("opds_customer_email", user.email);
    if (user) localStorage.setItem("opds_customer_profile", JSON.stringify(user));
  }

  async function openCheckoutGateway(orderResponse) {
    const payment = orderResponse && orderResponse.payment;
    if (!payment) throw new Error("Payment session was not returned by the server.");

    if (payment.status === 'captured') {
      localStorage.removeItem('opds_checkout_intent');
      localStorage.removeItem('opds_checkout_draft');
      location.href = 'payment-success.html?order_id=' + encodeURIComponent(payment.orderId);
      return;
    }
    const successUrl = () => {
      const params = new URLSearchParams({ redirect: "account-order" });
      if (payment.orderId) params.set("order_id", payment.orderId);
      return `payment-success.html?${params.toString()}`;
    };

    if (payment.sessionType === "redirect" && payment.session?.redirectUrl) {
      window.location.href = payment.session.redirectUrl;
      return;
    }

    if (payment.sessionType === "razorpay_checkout") {
      await loadCheckoutScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable right now.");
      const options = {
        ...payment.session,
        handler: async response => {
          try {
          const csrfToken = await getCheckoutCsrfToken();
          const verified = await fetchJsonWithRetry("/api/payments/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify({ gateway: "razorpay", ...response })
          });
          if (!verified.response.ok) throw new Error(verified.data.message || "Payment verification failed.");
          localStorage.removeItem("opds_checkout_draft");
          localStorage.removeItem("opds_checkout_applicant_mode");
          localStorage.removeItem("opds_cart");
          localStorage.removeItem('opds_checkout_intent');
          window.location.href = successUrl();
          } catch (error) {
            gatewayOpen = false;
            showCheckoutStatus('Payment verification is incomplete. Check the existing order before paying again.', 'error');
            location.href = 'payment-pending.html?order_id=' + encodeURIComponent(payment.orderId) + '&payment_id=' + encodeURIComponent(payment.paymentId);
          }
        },
        modal: {
          ondismiss: () => {
            gatewayOpen = false;
            document.querySelector('#checkout-form button[type="submit"]')?.removeAttribute('disabled');
            updatePaymentCtaUI();
            showCheckoutStatus('Payment closed. Your booking is saved; press Pay again to reopen the same payment. Do not pay again if money was debited—check your order status first.', 'info');
          }
        }
      };
      gatewayOpen = true;
      updateCheckoutChrome();
      try { new window.Razorpay(options).open(); } catch (error) { gatewayOpen = false; throw error; }
      return;
    }

    window.location.href = `payment-pending.html?order_id=${encodeURIComponent(payment.orderId || "")}`;
  }

  let checkoutCatalogPromise = null;
  function fetchProductCatalog() {
    if (!checkoutCatalogPromise) checkoutCatalogPromise = requestProductCatalog().catch(error => {
      checkoutCatalogPromise = null;
      throw error;
    });
    return checkoutCatalogPromise;
  }
  async function requestProductCatalog() {
    const isWa = window.OPDSLaunch && window.OPDSLaunch.isWhatsAppMode && window.OPDSLaunch.isWhatsAppMode();
    const sources = isWa ? ["assets/catalog.json", "/api/products"] : ["/api/products", "assets/catalog.json"];
    for (const url of sources) {
      try {
        const { response, data } = await fetchJsonWithRetry(url, {}, 0);
        if (response.ok && data && Array.isArray(data.products)) return data;
      } catch (e) { /* try next */ }
    }
    throw new Error("Catalog unavailable");
  }

  // Load and Parse Functions
  let policySelection = "";
  let policyCatalog = null;
  async function validateSelectedCatalogItems() {
    if (!window.OPDSServicePolicy) return true;
    try {
      const catalog = policyCatalog || await fetchProductCatalog();
      if (checkoutItems.length && checkoutItems.every(item => window.OPDSServicePolicy.resolve(catalog, item.slug, item.type))) return true;
      showCheckoutStatus("This task is not currently listed for online booking. Please choose a service from the catalog or contact support.", "error", document.getElementById("step-1-details-container"));
    } catch {
      showCheckoutStatus("Service details could not be loaded. Please try again before continuing.", "error");
    }
    return false;
  }
  function applyCheckoutPolicyCatalog(catalog) {
    checkoutItems = checkoutItems.map(item => {
      const entry = window.OPDSServicePolicy.resolve(catalog, item.slug, item.type);
      if (!entry) return item;
      return { ...item, slug: entry.slug, name: item.name || entry.name, price: entry.policy.pricing.amount,
        taxRate: Number(entry.taxRate || 0), displayPrice: entry.policy.pricing.displayPrice,
        pricingModel: entry.policy.pricing.model, priceNote: entry.policy.pricing.note,
        duration: entry.policy.fulfilment.duration, policy: entry.policy };
    });
    renderServicePolicy();
  }
  async function hydrateCheckoutPolicies() {
    if (!window.OPDSServicePolicy) return;
    if (policyCatalog) {
      if (checkoutItems.some(item => !item.policy)) applyCheckoutPolicyCatalog(policyCatalog);
      return;
    }
    const key = checkoutItems.map(item => `${item.type}:${item.slug}:${item.quantity}`).join("|");
    if (!key || key === policySelection) return;
    policySelection = key;
    try {
      const catalog = await fetchProductCatalog();
      if (key !== checkoutItems.map(item => `${item.type}:${item.slug}:${item.quantity}`).join("|")) return;
      policyCatalog = catalog;
      applyCheckoutPolicyCatalog(catalog);
      calculatePricingDetails();
    } catch { policySelection = ""; }
  }
  function renderServicePolicy() {
    const list = document.getElementById("service-document-checklist");
    const note = document.getElementById("service-document-policy-note");
    if (!list || !note) return;
    const policies = checkoutItems.map(item => item.policy).filter(Boolean);
    if (policies.length !== checkoutItems.length || !policies.length) {
      list.replaceChildren();
      const row = document.createElement("li");
      row.textContent = "Select a service to see its document requirements.";
      list.append(row);
      note.textContent = "The operator will confirm requirements if catalog details are unavailable.";
      return;
    }
    const labels = [...new Set(policies.flatMap(policy => policy.documents.required))];
    list.replaceChildren();
    for (const label of labels) {
      const row = document.createElement("li");
      const icon = document.createElement("i"); icon.dataset.lucide = "check";
      row.append(icon, document.createTextNode(label)); list.append(row);
    }
    for (const label of [...new Set(policies.flatMap(policy => policy.documents.optional || []))].filter(label => !labels.includes(label))) {
      const row = document.createElement('li'); row.textContent = 'If applicable: ' + label; list.append(row);
    }
    if (!labels.length) {
      const row = document.createElement("li");
      row.textContent = "The operator will confirm the requirements for this task.";
      list.append(row);
    }
    note.textContent = "Required files are reviewed before processing. Upload now or send them from your order later. Sending later does not waive requirements.";
    if (policies.some(policy => policy.purchase.mode === "scope_review")) {
      note.textContent += " The displayed price is a starting price; final scope and charges need review.";
    }
  }

  async function refreshCartPricing() {
    const selection = checkoutItems.map(item => `${item.type}:${item.slug}:${item.quantity}`).join("|");
    try {
      const catalog = await fetchProductCatalog();
      if (selection !== checkoutItems.map(item => `${item.type}:${item.slug}:${item.quantity}`).join("|")) return;
      checkoutItems = checkoutItems.map(item => {
        const entries = item.type === "service"
          ? [...(catalog.serviceVariants || []), ...(catalog.services || [])] : (catalog.products || []);
        const match = entries.find(entry => entry.slug === item.slug);
        return match ? { ...item, name: match.name, price: Number(match.price || 0),
          taxRate: Number(match.taxRate || 0), imageUrl: match.imageUrl || "",
          displayPrice: match.displayPrice || "", pricingModel: match.pricingModel || "" } : item;
      });
      calculatePricingDetails();
    } catch { /* Keep resolved local pricing; server remains authoritative at booking. */ }
  }

  async function loadProductCheckoutItem(productSlug, quantity) {
    try {
      const data = await fetchProductCatalog();
      const products = Array.isArray(data.products) ? data.products : [];
      const product = products.find((p) => p.slug === productSlug);
      if (!product) {
        const fallback = staticPricingFor(productSlug);
        checkoutItems = fallback ? [{ ...fallback, type: "product", quantity }] : [];
        calculatePricingDetails();
        return;
      }
      checkoutItems = [{
        slug: product.slug,
        name: product.name,
        type: "product",
        price: Number(product.price || 0),
        quantity,
        taxRate: Number(product.taxRate || 0),
        imageUrl: product.imageUrl || ""
      }];
      const packSize = new URLSearchParams(location.search).get("pack_size");
      if (productSlug === "visiting-cards" && packSize) {
        const configuration = window.OPDSPrintProduct.validate({ packSize: Number(packSize), packs: quantity }, quantity);
        checkoutItems[0].configuration = configuration;
      }
    } catch (e) {
      const fallback = staticPricingFor(productSlug);
      checkoutItems = fallback ? [{ ...fallback, type: "product", quantity }] : [];
    }
    calculatePricingDetails();
  }

  let draftRestored = false;
  function parseCheckoutParams() {
    const params = new URLSearchParams(window.location.search);
    const serviceSlug = params.get("service");
    const serviceName = params.get("service_name");
    const productSlug = params.get("product");
    const quantity = Math.max(1, parseInt(params.get("qty"), 10) || 1);

    // Draft Recovery / Autosave load (first run only — reruns re-resolve pricing)
    const savedDraft = draftRestored ? null : localStorage.getItem("opds_checkout_draft");
    draftRestored = true;
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (!draft.savedAt || Date.now() - draft.savedAt > recoveryLifetime) { localStorage.removeItem('opds_checkout_draft'); throw new Error('Expired draft'); }
        if (params.get('for_other') === '1' && draft.applicantMode !== 'other') throw new Error('Different applicant draft');
        applicantMode = draft.applicantMode === 'other' ? 'other' : 'self';
        applicantEditing = true;
        if (document.getElementById("checkout-name")) document.getElementById("checkout-name").value = draft.name || "";
        if (document.getElementById("checkout-mobile")) document.getElementById("checkout-mobile").value = draft.mobile || "";
        if (document.getElementById("checkout-email")) document.getElementById("checkout-email").value = draft.email || "";
        if (document.getElementById("checkout-address")) document.getElementById("checkout-address").value = draft.address || "";
        if (document.getElementById("checkout-gst") && draft.gstin) {
          document.getElementById("checkout-gst").value = draft.gstin;
          document.querySelector('input[name="profileType"][value="business"]').checked = true;
          toggleProfileType("business");
          document.getElementById('checkout-optional-details').open = true;
        }
      } catch (e) { /* ignore */ }
    }

    // Explicit apply-flow values are newer than an older local draft.
    if (!applicantTouched) hydrateCustomerFromParams(params);
    if (['name', 'phone', 'mobile', 'email', 'address'].some(key => params.get(key))) applicantEditing = true;
    if (params.get('for_other') === '1') { applicantMode = 'other'; applicantEditing = true; }

    if (serviceSlug) {
      let name = serviceName || "E-Service Booking";
      // Prefer main-service pricing so variants don't shadow the parent price
      const pricing = resolvedPricing(
        window.OPDSPricing?.findMain?.(serviceSlug),
        window.OPDSPricing?.findMain?.(name),
        staticPricingFor(serviceSlug, name),
        window.OPDSPricing?.find?.(name, serviceSlug),
        window.OPDSPricing?.find?.(serviceSlug)
      );
      if (pricing?.name && !serviceName) name = pricing.name;
      const price = Number(pricing?.price || 0);
      checkoutItems = [{
        slug: serviceSlug,
        name,
        type: "service",
        price,
        quantity: 1,
        displayPrice: pricing?.displayPrice || "Price loading",
        pricingModel: pricing?.pricingModel || "",
        priceNote: pricing?.customerPriceNote || pricing?.priceNote || "",
        taxRate: Number(pricing?.taxRate || 0),
        includesGovernmentFee: Boolean(pricing?.includesGovernmentFee),
        calculationMode: pricing?.calculationMode || "",
        duration: pricing?.duration || ""
      }];
      calculatePricingDetails();
    } else if (productSlug) {
      if (productSlug === "visiting-cards" && params.has("pack_size")) {
        try { window.OPDSPrintProduct.validate({ packSize: Number(params.get("pack_size")), packs: quantity }, quantity); }
        catch (error) { checkoutItems = []; calculatePricingDetails(); showCheckoutStatus(error.message, "error"); return; }
      }
      loadProductCheckoutItem(productSlug, quantity);
    } else {
      try {
        checkoutItems = JSON.parse(localStorage.getItem("opds_cart") || "[]");
        checkoutItems = checkoutItems.map(item => {
          const pricing = resolvedPricing(window.OPDSPricing?.find?.(item.slug), staticPricingFor(item.slug, item.name));
          return pricing ? { ...item, name: pricing.name || item.name || item.slug,
            price: Number(pricing.price || 0), taxRate: Number(pricing.taxRate || 0),
            displayPrice: pricing.displayPrice || "", pricingModel: pricing.pricingModel || "" } : item;
        });
      } catch (e) {
        checkoutItems = [];
      }
      calculatePricingDetails();
      if (checkoutItems.length) refreshCartPricing();
    }
  }

  // Live Calculations & Breakdowns
  function calculatePricingDetails() {
    const needsQuote = checkoutItems.some(item => item.policy?.purchase.mode === 'scope_review');
    document.body.classList.toggle('scope-review-checkout', needsQuote);
    const continueButton = document.getElementById('service-continue-btn');
    if (continueButton && needsQuote) continueButton.disabled = true;
    const quoteLink = document.getElementById('scope-quote-link');
    if (quoteLink) {
      quoteLink.hidden = !needsQuote;
      quoteLink.href = 'https://wa.me/919473946181?text=' + encodeURIComponent('Please review scope and quote for ' + checkoutItems.map(item => item.name).join(', '));
    }
    const paymentButton = document.querySelector('.checkout-submit-btn');
    if (paymentButton) paymentButton.disabled = needsQuote;
    const productOnly = checkoutItems.length > 0 && checkoutItems.every(item => item.type === 'product');
    const nameLabel = document.querySelector('label[for="checkout-name"]');
    const nameHelp = document.getElementById('checkout-name')?.closest('.enterprise-field')?.querySelector('small');
    if (nameLabel) nameLabel.textContent = productOnly ? 'Contact Full Name *' : 'Applicant Full Name *';
    if (nameHelp) nameHelp.textContent = productOnly ? 'Name of the person placing this order.' : 'Enter the legal name from Aadhaar, PAN, or official identity card.';
    hydrateCheckoutPolicies();
    let subtotal = 0;
    const staticMaster = window.OPDS_MASTER_PRICING || window.OPDS_STATIC_PRICING || {};

    let totalServiceCharge = 0;
    let totalOfficialFee = 0;

    checkoutItems.forEach(item => {
      const slugKey = pricingKey(item.slug || item.id || item.name || "");
      const masterInfo = staticMaster[slugKey] || {};
      const itemPrice = item.policy ? item.policy.pricing.amount : (masterInfo.price || Number(item.price || 0));
      const itemServiceCharge = item.policy ? itemPrice : (masterInfo.serviceCharge !== undefined ? masterInfo.serviceCharge : itemPrice);
      const itemOfficialFee = item.policy ? 0 : (masterInfo.officialFee !== undefined ? masterInfo.officialFee : 0);
      
      const qty = item.quantity || 1;
      subtotal += itemPrice * qty;
      totalServiceCharge += itemServiceCharge * qty;
      totalOfficialFee += itemOfficialFee * qty;
    });

    const serviceItem = checkoutItems.find(i => i.type === "service");
    const isService = Boolean(serviceItem);

    const governmentFeeLabel = !isService
      ? formatINR(0)
      : serviceItem.policy?.pricing.model === "service_charge_plus_actual" ? "Payable separately"
      : serviceItem.policy?.pricing.model === "starting_from" ? "Scope review"
      : serviceItem.policy ? (serviceItem.policy.pricing.includesGovernmentFee ? "Included" : "Not specified")
      : (totalOfficialFee > 0 ? formatINR(totalOfficialFee) : "Included / ₹0");
    const platformFee = isService ? totalServiceCharge : subtotal;

    const gstRate = isService ? Number(serviceItem.taxRate || 0) : 0;
    const gstAmount = checkoutItems.reduce((sum, item) =>
      sum + Math.round(Number(item.price || 0) * (item.quantity || 1) * Number(item.type === "service" ? 0 : item.taxRate || 0)) / 100, 0);
    const gstLabel = gstAmount > 0 ? formatINR(gstAmount) : "Not applicable";

    let discount = 0;
    if (activeCoupon) {
      discount = Math.round((subtotal + gstAmount) * activeCoupon.percent);
    }

    const totalPayable = (subtotal + gstAmount) - discount;
    lastPricingDetails = { subtotal, governmentFee: totalOfficialFee, platformFee, gstAmount, discount, totalPayable, governmentFeeLabel, gstLabel };

    // Injections to DOM
    setText("breakdown-gov", governmentFeeLabel);
    setText("breakdown-platform", formatINR(platformFee));
    setText("breakdown-gst", gstLabel);
    setText("breakdown-total", formatINR(totalPayable));

    setText("summary-subtotal", formatINR(subtotal));
    setText("summary-gov", governmentFeeLabel);
    setText("summary-platform", formatINR(platformFee));
    setText("summary-taxes", gstLabel);
    setText("summary-total", formatINR(totalPayable));
    setText("summary-payable-total", formatINR(totalPayable));
    setText("summary-discount", `-${formatINR(discount)}`);
    setText("summary-savings", formatINR(discount));
    setText("summary-delivery", estimatedDeliveryText(checkoutItems[0]));

    // Sync Mobile Price Breakdown Drawer
    setText("drawer-gov", governmentFeeLabel);
    setText("drawer-platform", formatINR(platformFee));
    setText("drawer-gst", gstLabel);
    setText("drawer-total", formatINR(totalPayable));
    setText("drawer-discount", `-${formatINR(discount)}`);
    const drawerDiscountRow = document.getElementById("drawer-discount-row");
    if (drawerDiscountRow) drawerDiscountRow.style.display = discount > 0 ? "flex" : "none";

    // Submit button + plan summary react to plan/method selection
    lastTotalPayable = totalPayable;
    updatePaymentCtaUI();

    if (discount > 0) {
      if (document.getElementById("discount-row")) document.getElementById("discount-row").style.display = "table-row";
      if (document.getElementById("breakdown-discount")) document.getElementById("breakdown-discount").textContent = `-Rs. ${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    } else {
      if (document.getElementById("discount-row")) document.getElementById("discount-row").style.display = "none";
    }

    renderItemsSummaryList();
    renderReviewStep();
    updateCheckoutChrome();
  }

  function renderItemsSummaryList() {
    const container = document.getElementById("checkout-items-container");
    if (!container) return;

    if (checkoutItems.length === 0) {
      container.innerHTML = `
        <div class="summary-empty-state sleek-summary-empty">
          <div class="empty-icon-capsule">
            <i data-lucide="shopping-bag"></i>
          </div>
          <strong>No service selected yet</strong>
          <p>Pick a service from the left or explore the catalog to view live invoice totals.</p>
          <a class="eds-btn eds-btn-secondary btn-sm" href="services.html"><i data-lucide="grid-3x3"></i> Browse 100+ Services</a>
        </div>
      `;
      const step1Container = document.getElementById("step-1-details-container");
      if (step1Container) {
        step1Container.innerHTML = `
          <div class="checkout-quick-services-wrap">
            <div class="quick-services-header">
              <span class="mini-eyebrow"><i data-lucide="sparkles"></i> Popular E-Services</span>
              <h3>Select a Service to Start Booking</h3>
              <p>Choose from our top requested government services below for instant checkout:</p>
            </div>
            <div class="quick-service-pills-grid">
              <button type="button" class="quick-service-card-btn" onclick="selectQuickService('service-pan-card', 'PAN Card New Application', 107)">
                <span class="quick-serv-icon"><i data-lucide="credit-card"></i></span>
                <span class="quick-serv-copy">
                  <strong>PAN Card Application</strong>
                  <small>UTI / NSDL Portal &bull; 2-3 Days</small>
                </span>
                <span class="quick-serv-price">Rs. 107</span>
              </button>
              <button type="button" class="quick-service-card-btn" onclick="selectQuickService('service-income-certificate', 'Income Certificate (Aay Praman Patra)', 60)">
                <span class="quick-serv-icon"><i data-lucide="file-text"></i></span>
                <span class="quick-serv-copy">
                  <strong>Income Certificate</strong>
                  <small>eDistrict Portal &bull; 3-5 Days</small>
                </span>
                <span class="quick-serv-price">Rs. 60</span>
              </button>
              <button type="button" class="quick-service-card-btn" onclick="selectQuickService('service-aadhaar-services-assistance', 'Aadhaar Demographic Update', 50)">
                <span class="quick-serv-icon"><i data-lucide="fingerprint"></i></span>
                <span class="quick-serv-copy">
                  <strong>Aadhaar Update Assist</strong>
                  <small>UIDAI Update &bull; 1-2 Days</small>
                </span>
                <span class="quick-serv-price">Rs. 50</span>
              </button>
              <button type="button" class="quick-service-card-btn" onclick="selectQuickService('service-voter-id', 'Voter ID Registration / Correction', 50)">
                <span class="quick-serv-icon"><i data-lucide="vote"></i></span>
                <span class="quick-serv-copy">
                  <strong>Voter ID Registration</strong>
                  <small>NVSP Portal &bull; 5-7 Days</small>
                </span>
                <span class="quick-serv-price">Rs. 50</span>
              </button>
            </div>
            <div class="quick-services-footer">
              <span>Looking for other services?</span>
              <a class="eds-btn eds-btn-secondary btn-xs" href="services.html"><i data-lucide="grid-3x3"></i> Browse Full Catalog</a>
              <a class="eds-btn eds-btn-secondary btn-xs" href="products.html"><i data-lucide="shopping-cart"></i> OneMart Store</a>
            </div>
          </div>
        `;
      }
      setCheckoutAvailability(false);
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    setCheckoutAvailability(true);

    container.innerHTML = checkoutItems.map(item => `
      <article class="summary-line-item">
        <span class="summary-item-icon"><i data-lucide="${item.type === 'service' ? 'layers' : 'package'}"></i></span>
        <div>
          <strong>${escapeHtml(item.name || item.slug || "Selected item")}</strong>
          <small>${item.configuration?.packSize === 100 ? `${item.quantity} pack(s) · ${item.quantity * 100} cards` : `${item.type === 'service' ? 'Government service workflow' : 'Store product'} · Qty ${item.quantity || 1}`}</small>
        </div>
        <b>${formatINR(Number(item.price || 0) * (item.quantity || 1))}</b>
      </article>
    `).join("");

    // Step 1 summary injector
    const step1Container = document.getElementById("step-1-details-container");
    if (step1Container && checkoutItems[0]) {
      const service = checkoutItems[0];
      step1Container.innerHTML = `
        <div class="selected-service-modern-card">
          <div class="selected-service-header">
            <span class="selected-service-icon-modern"><i data-lucide="${service.type === 'service' ? 'landmark' : 'package'}"></i></span>
            <div class="selected-service-title-group">
              <div class="selected-service-badges">
                <span class="modern-micro-badge"><i data-lucide="shield-check"></i> ${service.type === 'service' ? 'CSC Verified E-Service' : 'OneMart Product'}</span>
                <span class="modern-micro-badge turnaround"><i data-lucide="clock"></i> ${escapeHtml(estimatedDeliveryText(service))}</span>
              </div>
              <h3 class="selected-service-heading">${escapeHtml(service.name || "Selected service")}</h3>
              <p class="selected-service-desc">${escapeHtml(service.configuration?.packSize === 100 ? `${service.quantity} pack(s) · ${service.quantity * 100} cards. Artwork and finish reviewed before printing.` : service.priceNote || service.displayPrice || "Operator reviewed government filing with live status tracking.")}</p>
            </div>
            <div class="selected-service-price-pill">
              <small>${escapeHtml(service.configuration ? "Pack subtotal" : service.policy?.pricing.label || "Total Fee")}</small>
              <strong>${formatINR(service.price * (service.configuration ? service.quantity : 1))}</strong>
              <button type="button" class="change-service-link" onclick="window.clearSelectedCheckoutItem()"><i data-lucide="refresh-cw"></i> Change</button>
            </div>
          </div>
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  window.selectQuickService = function(slug, name, price) {
    slug = String(slug).replace(/^service-/, "");
    checkoutItems = [{
      slug,
      name,
      type: "service",
      price: Number(price || 0),
      quantity: 1,
      displayPrice: `Rs. ${price}`,
      pricingModel: "inclusive",
      priceNote: "Government fee and operator verification charges included."
    }];
    clearCheckoutStatus();
    calculatePricingDetails();
    if (window.lucide) window.lucide.createIcons();
  };

  window.clearSelectedCheckoutItem = function() {
    checkoutItems = [];
    policySelection = "";
    renderServicePolicy();
    localStorage.removeItem("opds_cart");
    calculatePricingDetails();
  };

  function renderReviewStep() {
    const name = document.getElementById("checkout-name")?.value || "Not entered";
    const mobile = document.getElementById("checkout-mobile")?.value || "Not entered";
    const email = document.getElementById("checkout-email")?.value || "Not entered";
    const address = document.getElementById("checkout-address")?.value || "Not entered";
    const isBusiness = !!document.querySelector('input[name="profileType"][value="business"]')?.checked;
    const gstin = document.getElementById("checkout-gst")?.value || "Not required";
    const service = checkoutItems[0];

    const customer = document.getElementById("review-customer-summary");
    if (customer) {
      customer.innerHTML = `
        <span><small>Name</small><strong>${escapeHtml(name)}</strong></span>
        <span><small>Mobile</small><strong>${escapeHtml(mobile)}</strong></span>
        <span><small>Email</small><strong>${escapeHtml(email)}</strong></span>
        <span><small>Address</small><strong>${escapeHtml(address)}</strong></span>
        <span><small>Profile</small><strong>${isBusiness ? 'Business entity' : 'Personal applicant'}</strong></span>
        <span><small>GSTIN</small><strong>${escapeHtml(isBusiness ? gstin : 'Not required')}</strong></span>
      `;
    }

    const docs = document.getElementById("review-docs-summary");
    const waDocLater = document.getElementById("whatsapp-doc-later")?.checked;
    if (docs) {
      if (uploadFiles.length) {
        docs.innerHTML = uploadFiles.map(file => `<span><small>${Math.max(1, Math.round(file.size / 1024))} KB</small><strong>${escapeHtml(file.name)}</strong></span>`).join("");
      } else if (waDocLater) {
        docs.innerHTML = `<span><small>WhatsApp Submission</small><strong>Sending to 9473946181 after order</strong></span>`;
      } else {
        docs.innerHTML = `<span><small>Pending</small><strong>No documents uploaded yet</strong></span>`;
      }
    }

    const fees = document.getElementById("review-fees-summary");
    if (fees) {
      fees.innerHTML = `
        <span><small>Service</small><strong>${escapeHtml(service?.name || 'Selected item')}</strong></span>
        <span><small>Government fee</small><strong>${escapeHtml(lastPricingDetails.governmentFeeLabel || formatINR(lastPricingDetails.governmentFee))}</strong></span>
        <span><small>Service charge</small><strong>${formatINR(lastPricingDetails.platformFee)}</strong></span>
        <span><small>GST</small><strong>${escapeHtml(lastPricingDetails.gstLabel || formatINR(lastPricingDetails.gstAmount))}</strong></span>
        <span><small>Coupon</small><strong>${activeCoupon ? escapeHtml(activeCoupon.code) : 'Not applied'}</strong></span>
        <span><small>Total</small><strong>${formatINR(lastPricingDetails.totalPayable)}</strong></span>
      `;
    }

    const payment = document.getElementById("review-payment-summary");
    if (payment) {
      payment.innerHTML = `
        <span><small>Default method</small><strong>${escapeHtml(selectedPaymentLabel())}</strong></span>
        <span><small>Payment step</small><strong>Editable before confirmation</strong></span>
      `;
    }
  }

  let priceDrawerOpener = null;
  function clearPriceDrawerHistory() {
    if (history.state?.opdsCheckoutPrice) {
      const state = { ...history.state }; delete state.opdsCheckoutPrice; history.replaceState(state, '', location.href);
    }
  }
  window.toggleMobilePriceDrawer = function(forceOpen, fromHistory = false) {
    const drawer = document.getElementById('mobile-price-drawer');
    if (!drawer) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !drawer.open;
    if (shouldOpen && !drawer.open) {
      clearPriceDrawerHistory();
      priceDrawerOpener = document.activeElement;
      document.querySelector('.mobile-cta-price-block')?.setAttribute('aria-expanded', 'true');
      drawer.showModal(); drawer.classList.add('is-open'); document.body.classList.add('price-drawer-open');
      if (!fromHistory) history.pushState({ ...history.state, opdsCheckoutPrice: true }, '', location.href);
    } else if (!shouldOpen && drawer.open) { clearPriceDrawerHistory(); drawer.close(); }
  };

  function setupCheckoutInteractions() {
    const syncLabelLayout = label => {
      const field = label.closest('.enterprise-field');
      const enlarged = parseFloat(getComputedStyle(label).fontSize) > parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--eds-fs-lg'));
      field?.classList.toggle('is-label-expanded', enlarged);
    };
    document.querySelectorAll('.enterprise-field > label').forEach(label => {
      syncLabelLayout(label);
      if (window.ResizeObserver) new ResizeObserver(() => syncLabelLayout(label)).observe(label);
    });
    const drawer = document.getElementById('mobile-price-drawer');
    const priceControl = document.querySelector('.mobile-cta-price-block');
    priceControl?.setAttribute('aria-haspopup', 'dialog');
    priceControl?.setAttribute('aria-controls', 'mobile-price-drawer');
    const focusCheckoutHeading = () => {
      const heading = [...document.querySelectorAll('.wizard-step h2')].find(e => e.getClientRects().length);
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: 'center', behavior: 'instant' }); }
    };
    window.addEventListener('resize', () => {
      if (innerWidth <= 900) return;
      if (drawer?.open) toggleMobilePriceDrawer(false);
      if (document.activeElement === document.body || document.activeElement === priceDrawerOpener) setTimeout(focusCheckoutHeading, 0);
    });
    priceControl?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleMobilePriceDrawer(); }
    });
    drawer?.addEventListener('cancel', event => { event.preventDefault(); toggleMobilePriceDrawer(false); });
    drawer?.addEventListener('close', () => {
      if (drawer.open) return;
      document.querySelector('.mobile-cta-price-block')?.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('is-open'); document.body.classList.remove('price-drawer-open');
      if (history.state?.opdsCheckoutPrice) {
        const state = { ...history.state }; delete state.opdsCheckoutPrice; history.replaceState(state, '', location.href);
      }
      if (innerWidth > 900) {
        focusCheckoutHeading();
        return;
      }
      if (document.activeElement === document.body || drawer.contains(document.activeElement)) {
        const openerStyle = priceDrawerOpener && getComputedStyle(priceDrawerOpener);
        const openerVisible = innerWidth <= 900 && priceDrawerOpener?.getClientRects().length && openerStyle?.display !== 'none' && openerStyle?.visibility !== 'hidden';
        if (openerVisible) priceDrawerOpener.focus({ preventScroll: true });
        else focusCheckoutHeading();
      }
    });
    drawer?.addEventListener('click', event => {
      const rect = drawer.getBoundingClientRect();
      if (event.target === drawer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) drawer.close();
    });
    window.addEventListener('popstate', () => { if (drawer?.open && !history.state?.opdsCheckoutPrice) drawer.close(); });
    let viewportBaseline = window.visualViewport?.height || innerHeight;
    const syncKeyboard = () => {
      const viewport = window.visualViewport;
      const focused = document.activeElement;
      const editing = focused?.matches('input:not([type=radio]):not([type=checkbox]):not([type=file]), textarea');
      const keyboard = !!(editing && viewport && viewport.scale === 1 && Math.max(innerHeight, viewportBaseline) - viewport.height > 120);
      document.body.classList.toggle('keyboard-open', keyboard);
      if (!editing) viewportBaseline = viewport?.height || innerHeight;
      if (keyboard) focused.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    };
    window.visualViewport?.addEventListener('resize', syncKeyboard);
    document.addEventListener('focusin', syncKeyboard);
    document.addEventListener('focusout', () => setTimeout(syncKeyboard, 0));
    window.addEventListener('orientationchange', () => { viewportBaseline = 0; syncKeyboard(); });

    const mobileCta = document.getElementById("mobile-checkout-cta");
    if (mobileCta) {
      const actionBar = mobileCta.closest('.checkout-mobile-cta');
      if (actionBar && window.ResizeObserver) {
        const syncActionSpace = () => {
          const height = actionBar.getBoundingClientRect().height;
          const inline = height > innerHeight / 3;
          document.body.classList.toggle('checkout-inline-actions', inline);
          document.documentElement.style.setProperty('--checkout-action-height', inline ? '24px' : Math.ceil(height + 24) + 'px');
        };
        new ResizeObserver(syncActionSpace).observe(actionBar);
        window.addEventListener('resize', syncActionSpace, { passive: true });
      }
      mobileCta.addEventListener("click", () => {
        if (currentStepIndex === 4) {
          const link = document.getElementById("success-track-link");
          if (link) window.location.href = link.href;
          return;
        }
        if (currentStepIndex === 3) {
          if (checkoutItems.some(item => item.policy?.purchase.mode === 'scope_review')) { document.getElementById('scope-quote-link')?.click(); return; }
          const form = document.getElementById("checkout-form");
          if (form) form.requestSubmit();
          return;
        }
        if (currentStepIndex === 1) {
          window.continueFromStep1();
          return;
        }
        window.nextStep(currentStepIndex + 1);
      });
    }

    document.getElementById('file-input')?.addEventListener('cancel', () => { replacementIndex = null; });
    const dropZone = document.getElementById("drag-drop-zone");
    if (dropZone) {
      ["dragenter", "dragover"].forEach(type => {
        dropZone.addEventListener(type, event => {
          event.preventDefault();
          dropZone.classList.add("is-dragging");
        });
      });
      ["dragleave", "drop"].forEach(type => {
        dropZone.addEventListener(type, event => {
          event.preventDefault();
          dropZone.classList.remove("is-dragging");
        });
      });
      dropZone.addEventListener("drop", event => {
        const files = event.dataTransfer?.files;
        if (files && files.length) addUploadFiles(files);
      });
      dropZone.addEventListener("keydown", event => {
        if (event.target === dropZone && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          window.triggerFileInput();
        }
      });
    }
  }

  // Steps Navigation
  let orderCompleted = false;
  window.navigateToStep = function(stepIndex) {
    // Normalization for backward compatibility
    if (stepIndex === 5 || (stepIndex === 4 && !orderCompleted)) stepIndex = 3;
    if (stepIndex === 6) stepIndex = 4;
    if (stepIndex === 4 && !orderCompleted) return; // Success step only after a confirmed order
    const skipDeferredDocuments = currentStepIndex === 1 && stepIndex === 3
      && document.getElementById("whatsapp-doc-later")?.checked;
    if (stepIndex > currentStepIndex + 1 && !skipDeferredDocuments) stepIndex = currentStepIndex + 1;
    clearCheckoutStatus();

    // Validate current step before proceeding
    if (stepIndex > currentStepIndex) {
      if (currentStepIndex === 1) {
        if (checkoutItems.length === 0) {
          showCheckoutStatus("Select a service or add a product before continuing.", "error", document.getElementById("service-continue-btn"));
          return;
        }
        if (!validateStep1Form()) return;
      }
      if (currentStepIndex === 2) {
        const waDocLater = document.getElementById("whatsapp-doc-later")?.checked;
        if (uploadFiles.length === 0 && !waDocLater) {
          const dropZone = document.getElementById("drag-drop-zone");
          showCheckoutStatus("Upload at least one required document or choose to send via WhatsApp later.", "error", dropZone);
          return;
        }
      }
    }

    document.querySelectorAll(".wizard-step").forEach(step => {
      step.classList.remove("active");
    });
    const targetStep = document.getElementById(`step-${stepIndex}`);
    if (targetStep) targetStep.classList.add("active");

    // Update nodes
    document.querySelectorAll(".progress-node").forEach(node => {
      node.classList.remove("active", "done");
      node.removeAttribute("aria-current");
    });
    for (let i = 1; i <= 3; i++) {
      const node = document.getElementById(`node-${i}`);
      if (node) {
        if (i < stepIndex) node.classList.add("done");
        if (i === stepIndex) {
          node.classList.add("active");
          node.setAttribute("aria-current", "step");
        }
      }
    }

    // Fill line width for 3 steps: 0% -> 50% -> 100%
    const fillPercent = stepIndex >= 4 ? 100 : Math.min(100, Math.max(0, ((stepIndex - 1) / 2) * 100));
    const progressFill = document.getElementById("progress-fill");
    if (progressFill) progressFill.style.width = `${fillPercent}%`;

    currentStepIndex = stepIndex;
    if (stepIndex === 3) verifyPayableTotal().catch(error => showCheckoutStatus(error.message, 'error'));
    if (stepIndex === 2) updateApplicantSummary();
    if (stepIndex === 3) {
      renderReviewStep();
      syncPaymentSelection();
    }
    updateCheckoutChrome();
    if (window.lucide) window.lucide.createIcons();
    const activeHeading = targetStep?.querySelector("h2");
    if (activeHeading) { activeHeading.tabIndex = -1; activeHeading.focus({ preventScroll: true }); }
    if (activeHeading) activeHeading.scrollIntoView({
      behavior: window.innerWidth <= 768 || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start"
    });
  };

  window.nextStep = function(stepIndex) {
    window.navigateToStep(stepIndex);
  };
  window.prevStep = function(stepIndex) {
    window.navigateToStep(stepIndex);
  };

  // Step 1 Form Validations
  function validateStep1Form() {
    const name = document.getElementById("checkout-name");
    const mobile = document.getElementById("checkout-mobile");
    const email = document.getElementById("checkout-email");
    const address = document.getElementById("checkout-address");
    const gstin = document.getElementById("checkout-gst");
    const isBusiness = document.querySelector('input[name="profileType"][value="business"]')?.checked;

    let valid = true;
    if (name && !validateLiveInput(name)) valid = false;
    if (mobile && !validateLiveInput(mobile)) valid = false;
    if (email && !validateLiveInput(email)) valid = false;
    if (address && !validateLiveInput(address)) valid = false;
    if (isBusiness && gstin?.value.trim() && !validateGstinInput(gstin)) valid = false;
    if (window.OPDSServicePolicy?.validateApplicant({ name: name?.value, phone: mobile?.value, email: email?.value }).length) valid = false;

    if (!valid) {
      const firstInvalid = document.querySelector("#step-1 .eds-input-invalid");
      const optionalSection = firstInvalid?.closest('details');
      if (optionalSection) optionalSection.open = true;
      showCheckoutStatus("Check the highlighted applicant details before continuing.", "error", firstInvalid);
    } else {
      // Autosave draft state
      const draft = {
        name: name?.value || "",
        mobile: mobile?.value || "",
        email: email?.value || "",
        address: address?.value || "",
        gstin: isBusiness ? (gstin?.value || "") : "",
        applicantMode,
        savedAt: Date.now()
      };
      localStorage.setItem("opds_checkout_draft", JSON.stringify(draft));
    }
    return valid;
  }
  window.validateStep1Form = validateStep1Form;
  window.validateStep2Form = validateStep1Form;

  function updateFieldFeedback(input, valid) {
    input.setAttribute('aria-invalid', String(!valid));
    const field = input.closest('.enterprise-field');
    if (!field || !input.id) return;
    const helper = field.querySelector('small');
    if (helper && !helper.id) helper.id = input.id + '-help';
    let error = field.querySelector('.checkout-field-error');
    if (!error) {
      error = document.createElement('div');
      error.className = 'checkout-field-error';
      error.id = input.id + '-error';
      field.append(error);
    }
    const messages = {
      'checkout-name': 'Enter the applicant’s full name.',
      'checkout-mobile': 'Enter a 10-digit mobile number.',
      'checkout-email': 'Enter a valid email address.',
      'checkout-gst': 'Enter a valid 15-character GSTIN or leave it blank.'
    };
    error.textContent = valid ? '' : (messages[input.id] || 'Check this field before continuing.');
    error.hidden = valid;
    const ids = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    if (helper) ids.add(helper.id);
    ids.add(error.id);
    input.setAttribute('aria-describedby', [...ids].join(' '));
  }

  window.validateLiveInput = function(input) {
    if (input.type === "tel") {
      input.value = input.value.replace(/\D/g, "").slice(0, 10);
    }
    let valid = true;
    if (!input.required && !input.value.trim()) {
      input.classList.remove("eds-input-invalid", "eds-input-valid");
      input.closest(".enterprise-field")?.classList.remove("is-valid");
      input.closest(".enterprise-field")?.classList.remove("is-invalid");
      updateFieldFeedback(input, true);
      return true;
    }
    if (input.type === "email") {
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
    } else if (input.type === "tel") {
      valid = /^[0-9]{10}$/.test(input.value);
    } else {
      valid = input.value.trim().length > 0;
    }

    if (valid) {
      input.classList.remove("eds-input-invalid");
      input.classList.add("eds-input-valid");
    } else {
      input.classList.remove("eds-input-valid");
      input.classList.add("eds-input-invalid");
    }
    input.closest(".enterprise-field")?.classList.toggle("is-valid", valid && input.value.trim().length > 0);
    input.closest(".enterprise-field")?.classList.toggle("is-invalid", !valid);
    updateFieldFeedback(input, valid);
    renderReviewStep();
    return valid;
  };

  window.validateGstinInput = function(input) {
    input.value = input.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    const val = input.value.trim().toUpperCase();
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const valid = !val || gstinPattern.test(val);

    if (valid) {
      input.classList.remove("eds-input-invalid");
      input.classList.add("eds-input-valid");
    } else {
      input.classList.remove("eds-input-valid");
      input.classList.add("eds-input-invalid");
    }
    input.closest(".enterprise-field")?.classList.toggle("is-valid", valid);
    input.closest(".enterprise-field")?.classList.toggle("is-invalid", !valid && input.value.trim().length > 0);
    updateFieldFeedback(input, valid);
    renderReviewStep();
    return valid;
  };

  window.toggleProfileType = function(type) {
    document.querySelectorAll(".profile-choice-card").forEach(card => {
      const input = card.querySelector('input[name="profileType"]');
      card.classList.toggle("active", !!input && input.value === type);
      if (input) input.checked = input.value === type;
    });
    const gstContainer = document.getElementById("gst-field-container");
    if (gstContainer) {
      if (type === "business") {
        gstContainer.style.display = "block";
        document.getElementById("checkout-gst").removeAttribute("required");
      } else {
        gstContainer.style.display = "none";
        document.getElementById("checkout-gst").removeAttribute("required");
        document.getElementById("checkout-gst").classList.remove("eds-input-invalid", "eds-input-valid");
      }
    }
    renderReviewStep();
    updateCheckoutChrome();
  };

  // Files are selected here and sent to the owning order after booking.
  window.triggerFileInput = function() {
    const fileInput = document.getElementById("file-input");
    if (!arguments[0]) replacementIndex = null;
    if (fileInput) { fileInput.multiple = !arguments[0]; fileInput.removeAttribute('capture'); fileInput.setAttribute('accept', '.pdf,.jpg,.jpeg,.png'); fileInput.click(); }
  };

  window.triggerCamera = function() {
    const fileInput = document.getElementById("file-input");
    if (fileInput) {
      replacementIndex = null; fileInput.multiple = false;
      fileInput.setAttribute("accept", "image/jpeg,image/png");
      fileInput.setAttribute("capture", "environment");
    }
    if (fileInput) fileInput.click();
  };

  let replacementIndex = null;
  const filePreviews = new Map();
  function releasePreview(file) { const url = filePreviews.get(file); if (url) URL.revokeObjectURL(url); filePreviews.delete(file); }
  window.addEventListener('pagehide', () => { for (const file of filePreviews.keys()) releasePreview(file); });
  function addUploadFiles(files) {
    if (!files || files.length === 0) return;

    const allowedExtensions = /\.(pdf|jpe?g|png)$/i;
    const accepted = [];
    const rejected = [];
    Array.from(files).forEach(file => {
      const duplicate = uploadFiles.some((existing, index) => index !== replacementIndex && existing.name === file.name && existing.size === file.size) || accepted.some(existing => existing.name === file.name && existing.size === file.size);
      if (duplicate) {
        rejected.push(`${file.name} is already attached`);
      } else if (!allowedExtensions.test(file.name)) {
        rejected.push(`${file.name} is not a supported file`);
      } else if (!file.size || file.size > 3 * 1024 * 1024) {
        rejected.push(`${file.name} is empty or exceeds 3MB`);
      } else {
        accepted.push(file);
      }
    });

    if (rejected.length) showCheckoutStatus(rejected.join(". "), "error");
    if (!accepted.length) return;

    if (replacementIndex !== null && uploadFiles[replacementIndex]) {
      releasePreview(uploadFiles[replacementIndex]); uploadFiles.splice(replacementIndex, 1, accepted.shift());
    }
    replacementIndex = null;
    uploadFiles.push(...accepted);
    if (!rejected.length) showCheckoutStatus('Documents selected. You can preview or replace them before they are sent with your booking.', 'info');
    renderUploadedFileList();
    renderReviewStep();
  }

  window.handleFileSelect = function(event) {
    addUploadFiles(event.target.files);
    event.target.value = "";
    replacementIndex = null;
  };

  function renderUploadedFileList() {
    const container = document.getElementById("uploaded-files-list");
    if (!container) return;

    if (uploadFiles.length === 0) {
      container.innerHTML = `
        <div class="upload-empty-state">
          <i data-lucide="file-search"></i>
          <span>No documents selected yet.</span>
        </div>
      `;
      const hiddenAttach = document.getElementById("checkout-attachments");
      if (hiddenAttach) hiddenAttach.value = "[]";
      renderReviewStep();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    for (const file of uploadFiles) if (!filePreviews.has(file)) filePreviews.set(file, URL.createObjectURL(file));
    container.innerHTML = uploadFiles.map((file, idx) => `
      <article class="uploaded-file-card">
        <span class="uploaded-file-icon"><i data-lucide="${/pdf/i.test(file.type || file.name) ? 'file-text' : 'image'}"></i></span>
        ${/\.(png|jpe?g)$/i.test(file.name) ? `<img class="checkout-file-thumbnail" src="${filePreviews.get(file)}" alt="Preview of ${escapeHtml(file.name)}">` : ''}
        <div class="uploaded-file-copy">
          <strong>${escapeHtml(file.name)}</strong>
          <small>${Math.max(1, Math.round(file.size / 1024))} KB &bull; Selected — sent after order creation</small>
        </div>
        <div class="uploaded-file-actions">
          <a class="eds-btn eds-btn-secondary" href="${filePreviews.get(file)}" target="_blank" rel="noopener" aria-label="Preview ${escapeHtml(file.name)}">Preview</a>
          <button type="button" class="eds-btn eds-btn-secondary" onclick="replaceUploadedFile(${idx})"><i data-lucide="refresh-cw"></i> Replace</button>
          <button type="button" class="eds-btn eds-btn-secondary danger" onclick="removeUploadedFile(${idx})"><i data-lucide="trash-2"></i> Remove</button>
        </div>
      </article>
    `).join("");

    if (window.lucide) window.lucide.createIcons();

    // Map file names array to hidden attachment inputs
    const hiddenAttach = document.getElementById("checkout-attachments");
    if (hiddenAttach) {
      hiddenAttach.value = JSON.stringify(uploadFiles.map(f => f.name));
    }
    renderReviewStep();
  }

  window.removeUploadedFile = function(idx) {
    if (uploadFiles[idx]) releasePreview(uploadFiles[idx]);
    uploadFiles.splice(idx, 1);
    renderUploadedFileList();
    renderReviewStep();
  };

  window.replaceUploadedFile = function(idx) {
    replacementIndex = idx;
    window.triggerFileInput(true);
  };

  // Promo Coupon apply
  window.applyPromoCoupon = function() {
    const input = document.getElementById("coupon-code");
    const feedback = document.getElementById("coupon-feedback");
    if (!input || !feedback) return;

    activeCoupon = null;
    feedback.textContent = 'No server-verified coupon is currently available.';
    feedback.style.display = 'block';
    calculatePricingDetails();
  };

  let pendingQuoteVerification = null;
  async function verifyPayableTotal(required = false) {
    if (pendingQuoteVerification) {
      const previous = await pendingQuoteVerification;
      if (required && previous?.priceChanged) throw new Error('Price updated. Review the new amount and press Pay again.');
    }
    const task = verifyPayableTotalImpl(required); pendingQuoteVerification = task;
    try { return await task; } finally { if (pendingQuoteVerification === task) pendingQuoteVerification = null; }
  }
  async function verifyPayableTotalImpl(required = false) {
    if (!await pingCheckoutServer()) {
      if (required) throw new Error('Online price verification is unavailable. Please try again later.');
      return null;
    }
    const csrf = await getCheckoutCsrfToken();
    const response = await fetch('/api/checkout-quote', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, credentials: 'same-origin', body: JSON.stringify({ items: checkoutItems, paymentPlan: 'full' }) });
    const quote = await response.json();
    if (!response.ok || !quote.ok) throw new Error(quote.message || 'The selected service needs a confirmed quote before payment.');
    const changed = Math.round(lastTotalPayable * 100) !== quote.totalPaise;
    quote.priceChanged = changed;
    if (changed) {
      quote.items.forEach((quoted, index) => { const item = checkoutItems[index]; item.price = quoted.unitPrice; item.taxRate = quoted.taxRate; if (item.policy) item.policy.pricing.amount = quoted.unitPrice; });
      calculatePricingDetails();
    }
    const status = document.getElementById('server-price-status');
    if (status) status.textContent = changed ? 'Price updated by the server. Review the new total before paying.' : 'Server-verified total: ' + formatINR(quote.total);
    if (changed && required) throw new Error('Price updated. Review the new amount and press Pay again.');
    return quote;
  }

  // 1-Click Quick coupon applicator
  window.applyQuickCoupon = function(code) {
    const input = document.getElementById("coupon-code");
    if (input) {
      input.value = code;
      window.applyPromoCoupon();
    }
  };

  // WhatsApp Document Later Toggle
  window.toggleWhatsAppDocLater = function(checkbox) {
    const card = checkbox.closest(".checkout-whatsapp-doc-card");
    if (card) {
      card.classList.toggle("active", checkbox.checked);
    }
    clearCheckoutStatus();
    renderReviewStep();
  };

  // ── Step 5: payment UI rendered from the OPDSPay registry ──────────────
  function payRegistry() {
    return window.OPDSPay || null;
  }

  function renderPaymentUI() {
    const registry = payRegistry();
    const tabs = document.getElementById("payment-category-tabs");
    if (!registry || !tabs) return;

    const categories = registry.getCategories();
    tabs.hidden = categories.length <= 1;
    if (categories.length <= 1) tabs.style.setProperty('display', 'none', 'important');
    else tabs.style.removeProperty('display');
    if (!activePayCategory && categories[0]) activePayCategory = categories[0].id;

    tabs.innerHTML = categories.map(cat => `
      <button type="button" role="tab" aria-selected="${cat.id === activePayCategory}"
        class="pay-cat-tab${cat.id === activePayCategory ? " active" : ""}"
        onclick="selectPayCategory('${cat.id}')">
        <i data-lucide="${cat.icon}"></i><span>${cat.label}</span>
      </button>
    `).join("");

    renderPaymentMethods();
    renderPaymentPlans();
    if (window.lucide) window.lucide.createIcons();
  }

  function renderPaymentMethods() {
    const registry = payRegistry();
    const grid = document.getElementById("payment-methods-grid");
    if (!registry || !grid) return;

    const methods = registry.getMethods(activePayCategory);
    const selectedInCategory = methods.some(m => m.id === selectedMethodId);
    if (!selectedInCategory && methods[0]) {
      selectedMethodId = (methods.find(m => m.recommended) || methods[0]).id;
    }

    grid.innerHTML = methods.map(m => {
      const routing = registry.resolveRouting(m.id);
      const status = routing.offline ? "Counter available" : "Live gateway";
      const security = routing.offline ? "Receipt issued" : "Tokenized";
      return `
      <label class="pay-method-tile${m.id === selectedMethodId ? " active" : ""}" id="paytile-${m.id}" data-flow="${routing.offline ? 'offline' : 'online'}" onclick="selectPaymentMethod('${m.id}')">
        <input type="radio" name="paymentOption" value="${m.id}" ${m.id === selectedMethodId ? "checked" : ""}>
        <span class="pay-method-icon"><i data-lucide="${m.icon}"></i></span>
        <span class="pay-method-copy">
          <strong>${escapeHtml(m.label)}</strong>
          <small>${escapeHtml(m.sub)}</small>
          <em><i data-lucide="shield-check"></i> ${security}</em>
        </span>
        <span class="pay-method-status">${status}</span>
        ${m.recommended ? `<span class="pay-method-badge">Recommended</span>` : ""}
        <span class="pay-method-check"><i data-lucide="check"></i></span>
      </label>
    `;
    }).join("");

    syncPaymentSelection();
    if (window.lucide) window.lucide.createIcons();
  }

  function renderPaymentPlans() {
    const registry = payRegistry();
    const row = document.getElementById("payment-plan-row");
    if (!registry || !row) return;

    row.innerHTML = registry.getPlans().map(p => `
      <label class="pay-plan-card${p.id === selectedPlanId ? " active" : ""}" id="payplan-${p.id}" onclick="selectPaymentPlan('${p.id}')">
        <input type="radio" name="paymentPlan" value="${p.id}" ${p.id === selectedPlanId ? "checked" : ""}>
        <span class="pay-plan-icon"><i data-lucide="${p.icon}"></i></span>
        <span><strong>${escapeHtml(p.label)}</strong><small>${escapeHtml(p.sub)}</small></span>
      </label>
    `).join("");
    if (window.lucide) window.lucide.createIcons();
  }

  window.selectPayCategory = function(catId) {
    activePayCategory = catId;
    renderPaymentUI();
  };

  window.selectPaymentMethod = function(methodId) {
    selectedMethodId = methodId;
    document.querySelectorAll(".pay-method-tile").forEach(el => {
      el.classList.toggle("active", el.id === `paytile-${methodId}`);
      const input = el.querySelector("input");
      if (input) input.checked = el.id === `paytile-${methodId}`;
    });
    syncPaymentSelection();
  };

  window.selectPaymentPlan = function(planId) {
    selectedPlanId = planId;
    document.querySelectorAll(".pay-plan-card").forEach(el => {
      el.classList.toggle("active", el.id === `payplan-${planId}`);
      const input = el.querySelector("input");
      if (input) input.checked = el.id === `payplan-${planId}`;
    });
    const planInput = document.getElementById("payment-plan-input");
    if (planInput) planInput.value = planId;
    updatePaymentCtaUI();
  };

  // Push the current selection into hidden inputs + routing note
  function syncPaymentSelection() {
    const registry = payRegistry();
    if (!registry || !selectedMethodId) return;
    const routing = registry.resolveRouting(selectedMethodId);

    const hiddenGateway = document.querySelector('input[name="gateway"]');
    if (hiddenGateway) hiddenGateway.value = routing.gateway;
    const methodInput = document.getElementById("payment-method-input");
    if (methodInput) methodInput.value = selectedMethodId;

    const note = document.getElementById("payment-routing-note");
    if (note) {
      if (routing.offline) {
        note.innerHTML = `<i data-lucide="store"></i> <strong>${routing.method.label}</strong> selected — your booking is confirmed instantly and payment is collected at the Kendra counter. A receipt is issued on the spot.`;
      } else if (routing.routedThroughFallback) {
        note.innerHTML = `<i data-lucide="shield-check"></i> <strong>${routing.method.label}</strong> is processed through our secure <strong>${routing.routedLabel}</strong> routing for guaranteed settlement.`;
      } else {
        note.innerHTML = `<i data-lucide="lock"></i> <strong>${routing.method.label}</strong> — processed securely via <strong>${routing.routedLabel}</strong>. No card or UPI details are stored on One Point servers.`;
      }
      if (window.lucide) window.lucide.createIcons();
    }
    updatePaymentCtaUI();
  }

  // Submit button + plan summary text (reacts to totals, plan and method)
  function updatePaymentCtaUI() {
    const registry = payRegistry();
    const submitBtnText = document.getElementById("submit-btn-text");
    const planSummary = document.getElementById("payment-plan-summary");
    if (!registry) return;

    const plan = registry.getPlan(selectedPlanId);
    const method = registry.getMethod(selectedMethodId);
    const offline = method && method.flow === "offline";
    const payNow = Math.round(lastTotalPayable * (plan ? plan.nowFactor : 1) * 100) / 100;
    const needsQuote = checkoutItems.some(item => item.policy?.purchase.mode === 'scope_review');
    if (needsQuote && submitBtnText) { submitBtnText.textContent = 'Scope review needed before payment'; return; }
    const payLater = lastTotalPayable - payNow;

    if (planSummary) {
      planSummary.innerHTML = payLater > 0
        ? `Pay <strong>${registry.formatINR(payNow)}</strong> now &bull; <strong>${registry.formatINR(payLater)}</strong> due later (recorded on your order)`
        : `<strong>${registry.formatINR(payNow)}</strong> charged at confirmation.`;
    }

    if (submitBtnText) {
      if (offline) {
        submitBtnText.innerHTML = `<i data-lucide="store"></i> Confirm Booking &bull; Pay ${registry.formatINR(payNow)} at Counter`;
      } else {
        submitBtnText.innerHTML = `<i data-lucide="lock"></i> Pay ${registry.formatINR(payNow)} Securely`;
      }
      if (window.lucide) window.lucide.createIcons();
    }
    setText("summary-payment-method", method ? method.label : "UPI ready");
    renderReviewStep();
    updateCheckoutChrome();
  }

  // Success-step follow-through: deep-link tracking + payment note
  function applySuccessExtras(orderId) {
    orderCompleted = true;
    const registry = payRegistry();
    const trackLink = document.getElementById("success-track-link");
    if (trackLink && orderId) trackLink.href = `track-application.html?id=${encodeURIComponent(orderId)}`;
    const completionStatus = document.getElementById("completion-payment-status");
    const completionMethod = registry ? registry.getMethod(selectedMethodId) : null;
    if (completionStatus) completionStatus.textContent = completionMethod && completionMethod.flow === "offline" ? "Pay at center" : "Payment initiated";

    const note = document.getElementById("success-payment-note");
    if (note && registry) {
      const method = registry.getMethod(selectedMethodId);
      const plan = registry.getPlan(selectedPlanId);
      const payNow = Math.round(lastTotalPayable * (plan ? plan.nowFactor : 1) * 100) / 100;
      const payLater = lastTotalPayable - payNow;
      const parts = [];
      if (method && method.flow === "offline") {
        parts.push(`<i data-lucide="store"></i> Payment mode: <strong>${method.label}</strong> — please pay ${registry.formatINR(payNow)} when you visit the Kendra.`);
      } else if (method) {
        parts.push(`<i data-lucide="lock"></i> Payment mode: <strong>${method.label}</strong>.`);
      }
      if (payLater > 0) {
        parts.push(`Balance of <strong>${registry.formatINR(payLater)}</strong> is recorded against this order.`);
      }
      if (parts.length) {
        note.innerHTML = parts.join(" ");
        note.style.display = "flex";
        if (window.lucide) window.lucide.createIcons();
      }
    }
    updateCheckoutChrome();
  }

  let checkoutSubmitting = false;
  let gatewayOpen = false;
  const recoveryLifetime = 24 * 60 * 60 * 1000;
  function savePartialDraft() {
    const values = Object.fromEntries(applicantIds.map(id => [id.replace('checkout-', ''), document.getElementById(id)?.value || '']));
    localStorage.setItem('opds_checkout_draft', JSON.stringify({ name: values.name, mobile: values.mobile, email: values.email, address: values.address, gstin: values.gst, applicantMode, savedAt: Date.now() }));
  }
  function checkoutIntent(customer, gateway, paymentMethod) {
    const fingerprint = JSON.stringify({ customer, applicantMode, gateway, paymentMethod, items: checkoutItems.map(item => ({ slug: item.slug, type: item.type, quantity: item.quantity || 1, configuration: item.configuration || null })) });
    let intent;
    try { intent = JSON.parse(localStorage.getItem('opds_checkout_intent')); } catch {}
    if (!intent || intent.fingerprint !== fingerprint || Date.now() - intent.savedAt > recoveryLifetime) {
      intent = { fingerprint, savedAt: Date.now(), key: 'checkout_' + crypto.randomUUID() };
      localStorage.setItem('opds_checkout_intent', JSON.stringify(intent));
    }
    return intent.key;
  }

  // Checkout submission handler
  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    if (checkoutSubmitting || gatewayOpen) return;
    const errorEl = document.getElementById("checkout-error");
    const submitBtnText = document.getElementById("submit-btn-text");
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');

    if (errorEl) errorEl.style.display = "none";

    if (checkoutItems.length === 0) {
      window.navigateToStep(1);
      showCheckoutStatus("Select a service or add a product before payment.", "error", document.getElementById("service-continue-btn"));
      return;
    }
    if (!await validateSelectedCatalogItems()) {
      window.navigateToStep(1);
      return;
    }
    if (!validateStep1Form()) {
      window.navigateToStep(1);
      const firstInvalid = document.querySelector("#step-1 .eds-input-invalid");
      showCheckoutStatus("Check the highlighted applicant details before continuing.", "error", firstInvalid);
      return;
    }
    const waDocLater = document.getElementById("whatsapp-doc-later")?.checked;
    if (uploadFiles.length === 0 && !waDocLater) {
      window.navigateToStep(2);
      showCheckoutStatus("Upload at least one required document or choose to send via WhatsApp before payment.", "error", document.getElementById("drag-drop-zone"));
      return;
    }
    if (!selectedMethodId) {
      showCheckoutStatus("Choose a payment method before continuing.", "error");
      return;
    }

    const isBusiness = document.querySelector('input[name="profileType"][value="business"]')?.checked;
    const name = document.getElementById("checkout-name")?.value || "";
    const mobile = document.getElementById("checkout-mobile")?.value || "";
    const email = document.getElementById("checkout-email")?.value || "";
    const address = document.getElementById("checkout-address")?.value || "";
    const gstin = isBusiness ? (document.getElementById("checkout-gst")?.value || "") : "";

    const customer = { name, phone: mobile, email, address, gstin };
    const registry = payRegistry();
    const routing = registry ? registry.resolveRouting(selectedMethodId) : null;
    const paymentMethod = routing ? routing.apiMethod : "upi";
    const gateway = routing ? routing.gateway : (document.querySelector('input[name="gateway"]').value || "razorpay");
    const plan = registry ? registry.getPlan(selectedPlanId) : null;

    if (submitBtnText) {
      submitBtnText.innerHTML = routing && routing.offline
        ? `<i data-lucide="loader-2" class="spin"></i> Confirming your booking...`
        : `<i data-lucide="loader-2" class="spin"></i> Directing to Secure Gateway...`;
      if (window.lucide) window.lucide.createIcons();
    }
    if (submitButton) submitButton.disabled = true;

    if (checkoutSubmitting || gatewayOpen) return;
    checkoutSubmitting = true;
    updateCheckoutChrome();
    try {
      const serverReady = await pingCheckoutServer();
      if (!serverReady) throw new Error("Online booking is temporarily unavailable. Your details are saved; please try again later.");

      const isService = checkoutItems.some(i => i.type === "service");
      const endpoint = isService ? "/api/service-bookings" : "/api/orders";
      const verifiedQuote = await verifyPayableTotal(true);
      const csrfToken = await getCheckoutCsrfToken();
      const existingSessionToken = localStorage.getItem("opds_customer_session") || "";

      const attachments = uploadFiles.map(f => f.name);
      if (waDocLater && !attachments.length) {
        attachments.push("[SUBMIT_VIA_WHATSAPP_LATER]");
      }

      const { response, data } = await fetchJsonWithRetry(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
          ...(existingSessionToken ? { "X-Session-Token": existingSessionToken } : {})
        },
        body: JSON.stringify({
          customer,
          applicantMode,
          expectedTotalPaise: verifiedQuote.totalPaise,
          items: checkoutItems,
          paymentMethod,
          gateway,
          paymentPlan: plan ? plan.id : "full",
          paymentChannel: selectedMethodId,
          idempotencyKey: checkoutIntent(customer, gateway, paymentMethod),
          attachments
        })
      });

      if (!response.ok) throw new Error(data.message || "Payment Gateway declined session.");

      const orderId = data.order?.orderId || data.booking?.bookingId;
      if (!orderId) throw new Error("Booking confirmation could not be verified. Please contact support before retrying.");
      storeGuestSession(data);
      if (uploadFiles.length) {
        const failures = await window.OPDSDocuments.sendFiles(orderId, uploadFiles, (done, total) => showCheckoutStatus(`Sending documents ${done}/${total}…`, "info"));
        if (failures.length) showCheckoutStatus("Some files could not be sent. Continue payment, then retry from your order document page.", "info");
      }
      const service = checkoutItems[0];
      const timeEstimate = service ? (service.tag || "2-3 Days") : "2 Days";

      if (routing && routing.offline) {
        if (document.getElementById("tracking-order-id")) document.getElementById("tracking-order-id").textContent = orderId;
        if (document.getElementById("tracking-estimated")) document.getElementById("tracking-estimated").textContent = timeEstimate;
        applySuccessExtras(orderId);
        localStorage.removeItem("opds_checkout_draft");
        localStorage.removeItem("opds_checkout_applicant_mode");
        localStorage.removeItem("opds_cart");
        window.navigateToStep(4);
        return;
      }

      await openCheckoutGateway(data);
    } catch (e) {
      const message = e && e.message ? e.message : "Checkout could not be completed. Please try again.";
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = "block";
      }
      showCheckoutStatus(message, "error");
      updatePaymentCtaUI();
    } finally {
      checkoutSubmitting = false;
      updateCheckoutChrome();
      if (submitButton && !orderCompleted && !gatewayOpen) submitButton.disabled = false;
    }
  }

  // Initial Load hooks
  document.addEventListener("DOMContentLoaded", () => {
    window.OPDSPilotMetrics?.track('checkout_started', { once: true });
    applicantMode = new URLSearchParams(location.search).get('for_other') === '1' || localStorage.getItem('opds_checkout_applicant_mode') === 'other' ? 'other' : 'self';
    applicantIds.forEach(id => document.getElementById(id)?.addEventListener('input', () => { applicantTouched = true; applicantEditing = true; savePartialDraft(); }));
    const reset = document.createElement('button');
    reset.type = 'button'; reset.className = 'btn btn-soft'; reset.textContent = 'Clear saved applicant details';
    reset.addEventListener('click', () => {
      if (checkoutSubmitting || gatewayOpen) return;
      localStorage.removeItem('opds_checkout_draft');
      applicantIds.forEach(id => { const input = document.getElementById(id); if (input) input.value = ''; });
      applicantTouched = true; applicantEditing = true;
      showCheckoutStatus('Saved applicant details cleared. Existing orders remain in your account.', 'info');
    });
    document.getElementById('step-1')?.append(reset);
    parseCheckoutParams();
    checkoutProfilePromise = loadLoggedInCheckoutCustomer();
    // Re-resolve item pricing once the catalog arrives — prices captured
    // before catalog load would otherwise stay at 0.
    window.addEventListener("opds:catalog-ready", parseCheckoutParams);
    renderPaymentUI();
    calculatePricingDetails();
    renderUploadedFileList();
    renderReviewStep();
    setupCheckoutInteractions();
    updateCheckoutChrome();

    const form = document.getElementById("checkout-form");
    if (form) form.addEventListener("submit", handleCheckoutSubmit);
  });
})();
