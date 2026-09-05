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
  let checkoutTimerVal = 900; // 15 minutes timer countdown
  let checkoutSessionExpired = false;
  let loggedInCheckoutCustomer = null;
  let checkoutProfilePromise = null;
  let applicantMode = "self";

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
    const status = document.getElementById("checkout-step-status");
    if (!status) return;
    status.className = `checkout-step-status is-${type}`;
    const iconName = type === "error" ? "alert-circle" : (type === "success" ? "check-circle-2" : "info");
    status.innerHTML = `
      <div class="checkout-status-icon"><i data-lucide="${iconName}"></i></div>
      <div class="checkout-status-text">${escapeHtml(message)}</div>
      <button type="button" class="checkout-status-close" onclick="clearCheckoutStatus()" aria-label="Dismiss alert"><i data-lucide="x"></i></button>
    `;
    status.hidden = false;
    if (window.lucide) window.lucide.createIcons();
    if (focusTarget && typeof focusTarget.focus === "function") focusTarget.focus({ preventScroll: true });
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
    const mobile = String(identity.mobile || identity.phone || "").replace(/\D/g, "");
    const email = String(identity.email || "").trim();
    return Boolean(name && !/^customer$/i.test(name) && /^\d{10}$/.test(mobile) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && checkoutProfileAddress(identity));
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
        <span>${escapeHtml(address || "Please add the missing address below.")}</span>
      </span>
      <span class="checkout-saved-actions">
        ${complete && !usingSaved ? `<button type="button" class="eds-btn eds-btn-primary" onclick="useSavedCustomerDetails()"><i data-lucide="check"></i> Use my details</button>` : ""}
        ${usingSaved ? `<button type="button" class="eds-btn eds-btn-secondary" onclick="editCheckoutApplicant(true)"><i data-lucide="users"></i> Apply for someone else</button>` : ""}
      </span>
    `;
    editor.hidden = complete && usingSaved;
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
      applicantMode = new URLSearchParams(window.location.search).get("for_other") === "1"
        || localStorage.getItem("opds_checkout_applicant_mode") === "other" ? "other" : "self";
      if (applicantMode === "self") fillCheckoutCustomer();
      renderSavedCustomer();
      if (button && savedIdentityComplete()) button.innerHTML = `Continue with saved details <i data-lucide="arrow-right"></i>`;
      if (window.lucide) window.lucide.createIcons();
      return loggedInCheckoutCustomer;
    } catch {
      return null;
    }
  }

  window.useSavedCustomerDetails = function() {
    applicantMode = "self";
    localStorage.setItem("opds_checkout_applicant_mode", "self");
    fillCheckoutCustomer();
    renderSavedCustomer();
    if (validateStep1Form()) {
      updateApplicantSummary();
      showCheckoutStatus("Saved profile details applied successfully.", "info");
    }
  };

  window.editCheckoutApplicant = function(forOther = false) {
    applicantMode = forOther ? "other" : applicantMode;
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
    if (checkoutProfilePromise) await checkoutProfilePromise;
    if (!validateStep1Form()) return;
    updateApplicantSummary();
    window.navigateToStep(2);
  };
  window.continueFromService = window.continueFromStep1;

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

    const mobileCta = document.getElementById("mobile-checkout-cta");
    if (mobileCta) {
      const nextLabel = currentStepIndex >= 5 ? "Pay Securely" : `Continue: ${checkoutStepLabels[currentStepIndex + 1] || "Next"}`;
      mobileCta.textContent = currentStepIndex === 6 ? "Track Application" : nextLabel;
    }

    document.querySelectorAll(".profile-choice-card").forEach(card => {
      const input = card.querySelector('input[name="profileType"]');
      card.classList.toggle("active", !!input && input.checked);
    });
  }

  // API Utilities
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
      script.onerror = () => reject(new Error("Secure payment gateway could not be loaded."));
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
          window.location.href = successUrl();
        },
        modal: {
          ondismiss: () => {
            window.location.href = `payment-pending.html?order_id=${encodeURIComponent(payment.orderId || "")}&payment_id=${encodeURIComponent(payment.paymentId || "")}`;
          }
        }
      };
      new window.Razorpay(options).open();
      return;
    }

    window.location.href = `payment-pending.html?order_id=${encodeURIComponent(payment.orderId || "")}`;
  }

  async function fetchProductCatalog() {
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
        imageUrl: product.imageUrl || ""
      }];
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
        if (document.getElementById("checkout-name")) document.getElementById("checkout-name").value = draft.name || "";
        if (document.getElementById("checkout-mobile")) document.getElementById("checkout-mobile").value = draft.mobile || "";
        if (document.getElementById("checkout-email")) document.getElementById("checkout-email").value = draft.email || "";
        if (document.getElementById("checkout-address")) document.getElementById("checkout-address").value = draft.address || "";
        if (document.getElementById("checkout-gst") && draft.gstin) {
          document.getElementById("checkout-gst").value = draft.gstin;
          document.querySelector('input[name="profileType"][value="business"]').checked = true;
          toggleProfileType("business");
        }
      } catch (e) { /* ignore */ }
    }

    // Explicit apply-flow values are newer than an older local draft.
    hydrateCustomerFromParams(params);

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
      loadProductCheckoutItem(productSlug, quantity);
    } else {
      try {
        checkoutItems = JSON.parse(localStorage.getItem("opds_cart") || "[]");
      } catch (e) {
        checkoutItems = [];
      }
      calculatePricingDetails();
    }
  }

  // Live Calculations & Breakdowns
  function calculatePricingDetails() {
    let subtotal = 0;
    const staticMaster = window.OPDS_MASTER_PRICING || window.OPDS_STATIC_PRICING || {};

    let totalServiceCharge = 0;
    let totalOfficialFee = 0;

    checkoutItems.forEach(item => {
      const slugKey = pricingKey(item.slug || item.id || item.name || "");
      const masterInfo = staticMaster[slugKey] || {};
      const itemPrice = masterInfo.price || Number(item.price || 0);
      const itemServiceCharge = masterInfo.serviceCharge !== undefined ? masterInfo.serviceCharge : itemPrice;
      const itemOfficialFee = masterInfo.officialFee !== undefined ? masterInfo.officialFee : 0;
      
      const qty = item.quantity || 1;
      subtotal += itemPrice * qty;
      totalServiceCharge += itemServiceCharge * qty;
      totalOfficialFee += itemOfficialFee * qty;
    });

    const serviceItem = checkoutItems.find(i => i.type === "service");
    const isService = Boolean(serviceItem);

    const governmentFeeLabel = !isService
      ? formatINR(0)
      : (totalOfficialFee > 0 ? formatINR(totalOfficialFee) : "Included / ₹0");
    const platformFee = isService ? totalServiceCharge : subtotal;

    const gstRate = isService ? Number(serviceItem.taxRate || 0) : 0;
    const gstAmount = Math.round(platformFee * gstRate);
    const gstLabel = gstRate > 0 ? formatINR(gstAmount) : "Not applicable";

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
          <small>${item.type === 'service' ? 'Government service workflow' : 'Store product'} &bull; Qty ${item.quantity || 1}</small>
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
              <p class="selected-service-desc">${escapeHtml(service.priceNote || service.displayPrice || "Operator reviewed government filing with live status tracking.")}</p>
            </div>
            <div class="selected-service-price-pill">
              <small>Total Fee</small>
              <strong>${formatINR(service.price)}</strong>
              <button type="button" class="change-service-link" onclick="window.clearSelectedCheckoutItem()"><i data-lucide="refresh-cw"></i> Change</button>
            </div>
          </div>
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  window.selectQuickService = function(slug, name, price) {
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

  function setupCheckoutInteractions() {
    const mobileCta = document.getElementById("mobile-checkout-cta");
    if (mobileCta) {
      mobileCta.addEventListener("click", () => {
        if (currentStepIndex === 4) {
          const link = document.getElementById("success-track-link");
          if (link) window.location.href = link.href;
          return;
        }
        if (currentStepIndex === 3) {
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
        if (event.key === "Enter" || event.key === " ") {
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
    if (stepIndex > currentStepIndex + 1) stepIndex = currentStepIndex + 1;
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
    if (stepIndex === 2) updateApplicantSummary();
    if (stepIndex === 3) {
      renderReviewStep();
      syncPaymentSelection();
    }
    updateCheckoutChrome();
    if (window.lucide) window.lucide.createIcons();
    const activeHeading = targetStep?.querySelector("h2");
    if (activeHeading) activeHeading.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (isBusiness && gstin && !validateGstinInput(gstin)) valid = false;

    if (!valid) {
      const firstInvalid = document.querySelector("#step-1 .eds-input-invalid");
      showCheckoutStatus("Check the highlighted applicant details before continuing.", "error", firstInvalid);
    } else {
      // Autosave draft state
      const draft = {
        name: name?.value || "",
        mobile: mobile?.value || "",
        email: email?.value || "",
        address: address?.value || "",
        gstin: isBusiness ? (gstin?.value || "") : ""
      };
      localStorage.setItem("opds_checkout_draft", JSON.stringify(draft));
    }
    return valid;
  }
  window.validateStep1Form = validateStep1Form;
  window.validateStep2Form = validateStep1Form;

  window.validateLiveInput = function(input) {
    if (input.type === "tel") {
      input.value = input.value.replace(/\D/g, "").slice(0, 10);
    }
    let valid = true;
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
    input.closest(".enterprise-field")?.classList.toggle("is-valid", valid);
    input.closest(".enterprise-field")?.classList.toggle("is-invalid", !valid && input.value.trim().length > 0);
    renderReviewStep();
    return valid;
  };

  window.validateGstinInput = function(input) {
    input.value = input.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    const val = input.value.trim().toUpperCase();
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const valid = gstinPattern.test(val);

    if (valid) {
      input.classList.remove("eds-input-invalid");
      input.classList.add("eds-input-valid");
    } else {
      input.classList.remove("eds-input-valid");
      input.classList.add("eds-input-invalid");
    }
    input.closest(".enterprise-field")?.classList.toggle("is-valid", valid);
    input.closest(".enterprise-field")?.classList.toggle("is-invalid", !valid && input.value.trim().length > 0);
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
        document.getElementById("checkout-gst").setAttribute("required", "required");
      } else {
        gstContainer.style.display = "none";
        document.getElementById("checkout-gst").removeAttribute("required");
        document.getElementById("checkout-gst").classList.remove("eds-input-invalid", "eds-input-valid");
      }
    }
    renderReviewStep();
    updateCheckoutChrome();
  };

  // Step 3 Document Upload Simulation
  window.triggerFileInput = function() {
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.click();
  };

  window.triggerCamera = function() {
    const fileInput = document.getElementById("file-input");
    if (fileInput) {
      fileInput.setAttribute("accept", "image/*,.pdf");
      fileInput.setAttribute("capture", "environment");
    }
    window.triggerFileInput();
  };

  function addUploadFiles(files) {
    if (!files || files.length === 0) return;

    const allowedExtensions = /\.(pdf|jpe?g|png)$/i;
    const accepted = [];
    const rejected = [];
    Array.from(files).forEach(file => {
      const duplicate = uploadFiles.some(existing => existing.name === file.name && existing.size === file.size);
      if (duplicate) {
        rejected.push(`${file.name} is already attached`);
      } else if (!allowedExtensions.test(file.name)) {
        rejected.push(`${file.name} is not a supported file`);
      } else if (file.size > 10 * 1024 * 1024) {
        rejected.push(`${file.name} exceeds 10MB`);
      } else {
        accepted.push(file);
      }
    });

    if (rejected.length) showCheckoutStatus(rejected.join(". "), "error");
    if (!accepted.length) return;

    const progressContainer = document.getElementById("upload-progress-container");
    const progressFill = document.getElementById("upload-progress-fill");

    if (progressContainer && progressFill) {
      progressContainer.style.display = "block";
      progressFill.style.width = "0%";

      let prg = 0;
      const interval = setInterval(() => {
        prg += 20;
        progressFill.style.width = `${prg}%`;
        if (prg >= 100) {
          clearInterval(interval);
          progressContainer.style.display = "none";

          for (let i = 0; i < accepted.length; i++) {
            uploadFiles.push(accepted[i]);
          }
          renderUploadedFileList();
          renderReviewStep();
        }
      }, 100);
    } else {
      for (let i = 0; i < accepted.length; i++) {
        uploadFiles.push(accepted[i]);
      }
      renderUploadedFileList();
      renderReviewStep();
    }
  }

  window.handleFileSelect = function(event) {
    addUploadFiles(event.target.files);
    event.target.value = "";
  };

  function renderUploadedFileList() {
    const container = document.getElementById("uploaded-files-list");
    if (!container) return;

    if (uploadFiles.length === 0) {
      container.innerHTML = `
        <div class="upload-empty-state">
          <i data-lucide="file-search"></i>
          <span>No documents uploaded yet.</span>
        </div>
      `;
      const hiddenAttach = document.getElementById("checkout-attachments");
      if (hiddenAttach) hiddenAttach.value = "[]";
      renderReviewStep();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = uploadFiles.map((file, idx) => `
      <article class="uploaded-file-card">
        <span class="uploaded-file-icon"><i data-lucide="${/pdf/i.test(file.type || file.name) ? 'file-text' : 'image'}"></i></span>
        <div class="uploaded-file-copy">
          <strong>${escapeHtml(file.name)}</strong>
          <small>${Math.max(1, Math.round(file.size / 1024))} KB &bull; Ready for preview</small>
        </div>
        <div class="uploaded-file-actions">
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
    uploadFiles.splice(idx, 1);
    renderUploadedFileList();
    renderReviewStep();
  };

  window.replaceUploadedFile = function(idx) {
    window.removeUploadedFile(idx);
    window.triggerFileInput();
  };

  // Promo Coupon apply
  window.applyPromoCoupon = function() {
    const input = document.getElementById("coupon-code");
    const feedback = document.getElementById("coupon-feedback");
    if (!input || !feedback) return;

    const val = input.value.trim().toUpperCase();
    if (val === "ONEPOINT10") {
      activeCoupon = { code: "ONEPOINT10", percent: 0.10 };
      feedback.style.color = "var(--eds-color-success)";
      feedback.textContent = "Coupon Applied successfully! 10% Discount applied.";
      feedback.style.display = "block";
      calculatePricingDetails();
    } else {
      feedback.style.color = "var(--eds-color-danger)";
      feedback.textContent = "Invalid Coupon code. Try ONEPOINT10.";
      feedback.style.display = "block";
    }
  };

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
    const payNow = Math.round(lastTotalPayable * (plan ? plan.nowFactor : 1));
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
      const payNow = Math.round(lastTotalPayable * (plan ? plan.nowFactor : 1));
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

  // Checkout submission handler
  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    const errorEl = document.getElementById("checkout-error");
    const submitBtnText = document.getElementById("submit-btn-text");
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');

    if (errorEl) errorEl.style.display = "none";

    if (checkoutSessionExpired) {
      showCheckoutStatus("This checkout session has expired. Refresh the page to start a new secure session.", "error");
      return;
    }
    if (checkoutItems.length === 0) {
      window.navigateToStep(1);
      showCheckoutStatus("Select a service or add a product before payment.", "error", document.getElementById("service-continue-btn"));
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

    try {
      const serverReady = await pingCheckoutServer();
      if (!serverReady) throw new Error("Checkout server connection failed.");

      const isService = checkoutItems.some(i => i.type === "service");
      const endpoint = isService ? "/api/service-bookings" : "/api/orders";
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
          items: checkoutItems,
          paymentMethod,
          gateway,
          paymentPlan: plan ? plan.id : "full",
          paymentChannel: selectedMethodId,
          idempotencyKey: "checkout_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
          attachments
        })
      });

      if (!response.ok) throw new Error(data.message || "Payment Gateway declined session.");

      storeGuestSession(data);

      const orderId = data.order?.orderId || data.booking?.bookingId || "OPDS-4692-VALID";
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
      if (submitButton && !orderCompleted) submitButton.disabled = false;
    }
  }

  // Session Slot countdown timer helper
  function startSessionTimer() {
    const timerEl = document.getElementById("slot-timer");
    if (!timerEl) return;

    const interval = setInterval(() => {
      checkoutTimerVal--;
      const min = Math.floor(checkoutTimerVal / 60);
      const sec = checkoutTimerVal % 60;
      timerEl.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

      if (checkoutTimerVal <= 0) {
        clearInterval(interval);
        checkoutSessionExpired = true;
        timerEl.textContent = "Expired";
        showCheckoutStatus("This secure session has expired. Refresh the page before submitting payment.", "error");
      }
    }, 1000);
  }

  // Initial Load hooks
  document.addEventListener("DOMContentLoaded", () => {
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
    startSessionTimer();

    const form = document.getElementById("checkout-form");
    if (form) form.addEventListener("submit", handleCheckoutSubmit);
  });
})();
