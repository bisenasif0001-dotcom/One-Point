(function () {
  "use strict";

  let csrfToken = "";

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(target, message, type = "info") {
    if (!target) return;
    target.textContent = message || "";
    target.className = `login-status ${type}`;
    target.style.display = message ? "block" : "none";
  }

  function setBusy(form, busy, label, activeButton) {
    if (!form) return;
    const buttons = form.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = Boolean(busy);
    });
    const primary = activeButton
      ? activeButton.querySelector("[data-auth-submit-text], [data-auth-verify-text], [data-auth-resend-text]")
      : form.querySelector("[data-auth-submit-text]");
    if (primary) {
      if (busy) {
        primary.dataset.originalText = primary.dataset.originalText || primary.innerHTML;
        primary.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ${label || "Processing..."}`;
      } else if (primary.dataset.originalText) {
        primary.innerHTML = primary.dataset.originalText;
      }
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async function getCsrfToken() {
    if (csrfToken) return csrfToken;
    const response = await fetch("/api/csrf");
    const data = await response.json();
    if (!response.ok || !data.csrfToken) throw new Error(data.message || "Unable to start a secure session.");
    csrfToken = data.csrfToken;
    return csrfToken;
  }

  async function request(method, path, payload) {
    const token = await getCsrfToken();
    const sessionToken = localStorage.getItem("opds_customer_session") || "";
    const headers = { "X-CSRF-Token": token };
    if (sessionToken) headers["X-Session-Token"] = sessionToken;
    const options = { method, headers };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload || {});
    }
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "Request failed.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function api(path, payload) {
    return request("POST", path, payload);
  }

  function dashboardUrl(_user, params = {}) {
    if (params.panel === "orders") return new URL("customer-account-orders.html", window.location.href).toString();
    if (params.panel === "vault" || params.panel === "documents") return new URL("customer-account-vault.html", window.location.href).toString();
    if (params.panel === "payments") return new URL("customer-account-payments.html", window.location.href).toString();
    return new URL("customer-account-overview.html", window.location.href).toString();
  }

  function profileUrl(user, params = {}) {
    const url = new URL("customer-profile.html", window.location.href);
    if (params.order) url.searchParams.set("order", params.order);
    if (params.welcome) url.searchParams.set("welcome", "1");
    if (params.payment) url.searchParams.set("payment", params.payment);
    return url.toString();
  }

  function accountOverviewUrl() {
    return new URL("customer-account-overview.html", window.location.href).toString();
  }

  function isSafeReturnUrl(value) {
    if (!value || typeof value !== "string") return false;
    if (!value.startsWith("/")) return false;
    if (value.startsWith("//")) return false;
    if (/^\/\\/.test(value)) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
    return true;
  }

  function getReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("returnUrl") || params.get("return_url") || "";
    return isSafeReturnUrl(raw) ? raw : "";
  }

  function redirectToAccountOverview(data) {
    storeSession(data);
    const returnUrl = getReturnUrl();
    window.location.href = returnUrl || accountOverviewUrl();
  }

  function redirectToProfile(data, params = {}) {
    const user = storeSession(data);
    const returnUrl = getReturnUrl();
    window.location.href = returnUrl || profileUrl(user, params);
  }

  function storeSession(data) {
    const user = data.user || {};
    const session = data.session || {};
    if (session.token) localStorage.setItem("opds_customer_session", session.token);
    if (user.phone) {
      localStorage.setItem("opds_customer_phone", user.phone);
      localStorage.setItem("opds_testing_user", user.phone);
    }
    if (user.email) localStorage.setItem("opds_customer_email", user.email);
    localStorage.setItem("opds_customer_profile", JSON.stringify(user));
    localStorage.setItem("opds_customer_last_activity", String(Date.now()));
    localStorage.setItem("opds_customer_session_event", JSON.stringify({ type: "login", at: Date.now() }));
    if (window.OPDSCustomerSession && typeof window.OPDSCustomerSession.accept === "function") {
      window.OPDSCustomerSession.accept(user, session);
    }
    return user;
  }

  function redirectToDashboard(data, params = {}) {
    const user = storeSession(data);
    window.location.href = dashboardUrl(user, params);
  }

  function initSignup() {
    const form = document.querySelector("[data-auth-signup]");
    if (!form) return;
    const status = form.querySelector("[data-auth-status]");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(status, "");
      const payload = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        password: form.elements.password.value
      };
      const confirm = form.elements.confirm_password.value;
      if (payload.password !== confirm) {
        setStatus(status, "Password aur confirm password match nahi kar rahe.", "error");
        return;
      }

      try {
        setBusy(form, true, "Creating account...");
        const data = await api("/api/auth/signup", payload);
        setStatus(status, "Account ready. Aapka account khul raha hai...", "success");
        setTimeout(() => redirectToAccountOverview(data), 350);
      } catch (error) {
        setStatus(status, error.message, "error");
      } finally {
        setBusy(form, false);
      }
    });
  }

  function initSocialSignup() {
    const panel = document.querySelector("[data-auth-social]");
    if (!panel) return;
    const status = panel.querySelector("[data-social-status]");
    const buttons = Array.from(panel.querySelectorAll("[data-social-provider]"));
    const params = new URLSearchParams(window.location.search);

    async function startProvider(provider, button) {
      setStatus(status, "");
      try {
        const providerName = provider === "microsoft" ? "Microsoft" : "Google";
        setBusy(panel, true, `Connecting to ${providerName}...`, button);
        const providerStatus = await request("GET", `/api/auth/${provider}/status`);
        if (!providerStatus.configured) {
          throw new Error(`${providerName} account creation is not configured yet. Add its OAuth credentials to enable this button.`);
        }
        const query = new URLSearchParams({ entry: "signup" });
        const returnUrl = getReturnUrl();
        if (returnUrl) query.set("returnUrl", returnUrl);
        window.location.href = `/api/auth/${provider}/start?${query.toString()}`;
      } catch (error) {
        setStatus(status, error.message, "error");
        setBusy(panel, false, "", button);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => startProvider(button.dataset.socialProvider, button));
    });

    const errorProvider = ["google", "microsoft"].find((provider) => params.get(`${provider}_error`));
    if (errorProvider) setStatus(status, params.get(`${errorProvider}_error`), "error");

    const handoff = params.get("handoff");
    const successProvider = ["google", "microsoft"].find((provider) => params.get(provider) === "success");
    if (successProvider && handoff) {
      (async () => {
        const activeButton = panel.querySelector(`[data-social-provider="${successProvider}"]`);
        try {
          setBusy(panel, true, "Creating your account...", activeButton);
          const data = await api(`/api/auth/${successProvider}/complete`, { handoff });
          const user = storeSession(data);
          setStatus(status, "Account ready. Opening your profile...", "success");
          window.location.href = isSafeReturnUrl(data.returnUrl)
            ? data.returnUrl
            : profileUrl(user, { welcome: true });
        } catch (error) {
          setStatus(status, error.message, "error");
          setBusy(panel, false, "", activeButton);
        }
      })();
    }
  }

  function initOtp() {
    const forms = document.querySelectorAll("[data-auth-otp]");
    forms.forEach((form) => {
      const status = form.querySelector("[data-auth-status]");
      const sendButton = form.querySelector("[data-send-otp]");
      const verifyButton = form.querySelector("[data-verify-otp]");
      const resendButton = form.querySelector("[data-resend-otp]");
      const codeField = form.querySelector("[name='otp']");
      const otpPanel = form.querySelector("[data-otp-panel]");
      const phoneField = form.querySelector("[name='phone']");

      if (otpPanel) otpPanel.hidden = true;
      if (verifyButton) verifyButton.hidden = true;
      if (resendButton) resendButton.hidden = true;

      function enterCodeStage() {
        form.classList.add("is-code-stage");
        if (otpPanel) otpPanel.hidden = false;
        if (sendButton) sendButton.hidden = true;
        if (verifyButton) verifyButton.hidden = false;
        if (resendButton) resendButton.hidden = false;
        if (phoneField) phoneField.readOnly = true;
        if (codeField) codeField.focus();
      }

      async function sendOtp(isResend = false) {
        setStatus(status, "");
        const payload = {
          name: form.elements.name ? form.elements.name.value.trim() : "",
          phone: form.elements.phone.value.trim(),
          email: form.elements.email ? form.elements.email.value.trim() : "",
          purpose: form.dataset.otpPurpose || "login"
        };
        try {
          if (!/^\d{10}$/.test(payload.phone)) throw new Error("Enter a valid 10-digit mobile number.");
          setBusy(form, true, isResend ? "Resending OTP..." : "Sending OTP...", isResend ? resendButton : sendButton);
          const data = await api("/api/auth/otp/request", payload);
          enterCodeStage();
          if (codeField && isResend) codeField.value = "";
          const demoSuffix = data.devOtp ? ` Dev OTP: ${data.devOtp}` : "";
          setStatus(status, `${isResend ? "A new OTP was sent" : "OTP sent"} to ${data.phone}.${demoSuffix}`, "success");
        } catch (error) {
          setStatus(status, error.message, "error");
        } finally {
          setBusy(form, false, "", isResend ? resendButton : sendButton);
        }
      }

      async function verifyOtp() {
        setStatus(status, "");
        const payload = {
          phone: form.elements.phone.value.trim(),
          otp: form.elements.otp.value.trim()
        };
        try {
          if (!/^\d{6}$/.test(payload.otp)) throw new Error("Enter the 6-digit OTP.");
          setBusy(form, true, "Verifying OTP...", verifyButton);
          const data = await api("/api/auth/otp/verify", payload);
          setStatus(status, "Mobile verified. Aapka account khul raha hai...", "success");
          setTimeout(() => redirectToAccountOverview(data), 350);
        } catch (error) {
          setStatus(status, error.message, "error");
        } finally {
          setBusy(form, false, "", verifyButton);
        }
      }

      if (sendButton) sendButton.addEventListener("click", () => sendOtp(false));
      if (resendButton) resendButton.addEventListener("click", () => sendOtp(true));
      if (verifyButton) verifyButton.addEventListener("click", verifyOtp);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (codeField && codeField.value.trim()) verifyOtp();
        else sendOtp();
      });
    });
  }

  function initSocialLogin() {
    const form = document.querySelector("[data-auth-google]");
    if (!form) return;
    const status = form.querySelector("[data-auth-status]");
    const buttons = Array.from(form.querySelectorAll("[data-login-provider]"));
    const params = new URLSearchParams(window.location.search);

    async function startProvider(provider, startButton) {
      setStatus(status, "");
      try {
        const providerName = provider === "microsoft" ? "Microsoft" : "Google";
        setBusy(form, true, `Connecting to ${providerName}...`, startButton);
        const providerStatus = await request("GET", `/api/auth/${provider}/status`);
        if (!providerStatus.configured) {
          throw new Error(`${providerName} Sign-In setup is pending. Add its OAuth credentials to enable this button.`);
        }
        const query = new URLSearchParams({ entry: "login" });
        const returnUrl = getReturnUrl();
        if (returnUrl) query.set("returnUrl", returnUrl);
        window.location.href = `/api/auth/${provider}/start?${query.toString()}`;
      } catch (error) {
        setStatus(status, error.message, "error");
        setBusy(form, false, "", startButton);
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => startProvider(button.dataset.loginProvider, button));
    });

    const errorProvider = ["google", "microsoft"].find((provider) => params.get(`${provider}_error`));
    if (errorProvider) setStatus(status, params.get(`${errorProvider}_error`), "error");

    const handoff = params.get("handoff");
    const successProvider = ["google", "microsoft"].find((provider) => params.get(provider) === "success");
    if (successProvider && handoff) {
      (async () => {
        const startButton = form.querySelector(`[data-login-provider="${successProvider}"]`);
        try {
          setBusy(form, true, "Opening your account...", startButton);
          const data = await api(`/api/auth/${successProvider}/complete`, { handoff });
          storeSession(data);
          window.location.href = isSafeReturnUrl(data.returnUrl) ? data.returnUrl : accountOverviewUrl();
        } catch (error) {
          setStatus(status, error.message, "error");
          setBusy(form, false, "", startButton);
        }
      })();
    }
  }

  async function loginCustomer(payload) {
    const data = await api("/api/auth/login", payload);
    storeSession(data);
    return data;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSignup();
    initSocialSignup();
    initOtp();
    initSocialLogin();
    if (window.lucide) window.lucide.createIcons();
  });

  window.OPDSAuth = {
    api,
    request,
    dashboardUrl,
    profileUrl,
    accountOverviewUrl,
    loginCustomer,
    redirectToDashboard,
    redirectToProfile,
    redirectToAccountOverview,
    getReturnUrl,
    isSafeReturnUrl,
    setStatus,
    storeSession
  };
  document.documentElement.setAttribute("data-auth-ready", "true");
})();
