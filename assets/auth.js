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

  function setBusy(form, busy, label) {
    if (!form) return;
    const buttons = form.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = Boolean(busy);
    });
    const primary = form.querySelector("[data-auth-submit-text]");
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

  async function api(path, payload) {
    const token = await getCsrfToken();
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": token
      },
      body: JSON.stringify(payload || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  }

  function dashboardUrl(user, params = {}) {
    const url = new URL("dashboard/index.html", window.location.href);
    url.searchParams.set("portal", "customer");
    url.searchParams.set("panel", params.panel || "orders");
    const phone = (user && user.phone) || params.phone || "";
    if (phone) url.searchParams.set("phone", phone);
    if (params.payment) url.searchParams.set("payment", params.payment);
    return url.toString();
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
        setStatus(status, "Account ready. Dashboard open ho raha hai...", "success");
        setTimeout(() => redirectToDashboard(data), 350);
      } catch (error) {
        setStatus(status, error.message, "error");
      } finally {
        setBusy(form, false);
      }
    });
  }

  function initOtp() {
    const forms = document.querySelectorAll("[data-auth-otp]");
    forms.forEach((form) => {
      const status = form.querySelector("[data-auth-status]");
      const sendButton = form.querySelector("[data-send-otp]");
      const verifyButton = form.querySelector("[data-verify-otp]");
      const codeField = form.querySelector("[name='otp']");
      const otpPanel = form.querySelector("[data-otp-panel]");

      if (verifyButton) verifyButton.hidden = true;

      async function sendOtp() {
        setStatus(status, "");
        const payload = {
          name: form.elements.name ? form.elements.name.value.trim() : "",
          phone: form.elements.phone.value.trim(),
          email: form.elements.email ? form.elements.email.value.trim() : "",
          purpose: form.dataset.otpPurpose || "login"
        };
        try {
          setBusy(form, true, "Sending OTP...");
          const data = await api("/api/auth/otp/request", payload);
          if (otpPanel) otpPanel.hidden = false;
          if (verifyButton) verifyButton.hidden = false;
          if (codeField) codeField.focus();
          const demoSuffix = data.devOtp ? ` Dev OTP: ${data.devOtp}` : "";
          setStatus(status, `OTP sent to ${data.phone}.${demoSuffix}`, "success");
        } catch (error) {
          setStatus(status, error.message, "error");
        } finally {
          setBusy(form, false);
          const submitText = sendButton && sendButton.querySelector("[data-auth-submit-text]");
          if (submitText && (otpPanel && !otpPanel.hidden)) {
            submitText.innerHTML = '<i data-lucide="refresh-cw"></i> Resend OTP';
            submitText.dataset.originalText = submitText.innerHTML;
            if (window.lucide) window.lucide.createIcons();
          }
        }
      }

      async function verifyOtp() {
        setStatus(status, "");
        const payload = {
          phone: form.elements.phone.value.trim(),
          otp: form.elements.otp.value.trim()
        };
        try {
          setBusy(form, true, "Verifying OTP...");
          const data = await api("/api/auth/otp/verify", payload);
          setStatus(status, "Mobile verified. Dashboard open ho raha hai...", "success");
          setTimeout(() => redirectToDashboard(data), 350);
        } catch (error) {
          setStatus(status, error.message, "error");
        } finally {
          setBusy(form, false);
        }
      }

      if (sendButton) sendButton.addEventListener("click", sendOtp);
      if (verifyButton) verifyButton.addEventListener("click", verifyOtp);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (codeField && codeField.value.trim()) verifyOtp();
        else sendOtp();
      });
    });
  }

  function initGmailLink() {
    const form = document.querySelector("[data-auth-gmail]");
    if (!form) return;
    const status = form.querySelector("[data-auth-status]");
    const otpPanel = form.querySelector("[data-gmail-otp-panel]");
    const startButton = form.querySelector("[data-gmail-start]");
    const verifyButton = form.querySelector("[data-gmail-verify]");

    async function startGmailLink() {
      setStatus(status, "");
      const payload = {
        name: form.elements.gmail_name.value.trim(),
        email: form.elements.gmail_email.value.trim(),
        phone: form.elements.gmail_phone.value.trim()
      };
      try {
        setBusy(form, true, "Sending OTP...");
        const data = await api("/api/auth/gmail/start", payload);
        if (otpPanel) otpPanel.hidden = false;
        const otp = form.elements.gmail_otp;
        if (otp) otp.focus();
        const demoSuffix = data.devOtp ? ` Demo OTP: ${data.devOtp}` : "";
        setStatus(status, `Gmail accepted. Mobile OTP sent.${demoSuffix}`, "success");
      } catch (error) {
        setStatus(status, error.message, "error");
      } finally {
        setBusy(form, false);
      }
    }

    async function verifyGmailOtp() {
      setStatus(status, "");
      try {
        setBusy(form, true, "Linking account...");
        const data = await api("/api/auth/otp/verify", {
          phone: form.elements.gmail_phone.value.trim(),
          otp: form.elements.gmail_otp.value.trim()
        });
        setStatus(status, "Gmail + mobile linked. Dashboard open ho raha hai...", "success");
        setTimeout(() => redirectToDashboard(data), 350);
      } catch (error) {
        setStatus(status, error.message, "error");
      } finally {
        setBusy(form, false);
      }
    }

    if (startButton) startButton.addEventListener("click", startGmailLink);
    if (verifyButton) verifyButton.addEventListener("click", verifyGmailOtp);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const otp = form.elements.gmail_otp;
      if (otp && otp.value.trim()) verifyGmailOtp();
      else startGmailLink();
    });
  }

  async function loginCustomer(payload) {
    const data = await api("/api/auth/login", payload);
    storeSession(data);
    return data;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSignup();
    initOtp();
    initGmailLink();
    if (window.lucide) window.lucide.createIcons();
  });

  window.OPDSAuth = {
    api,
    dashboardUrl,
    loginCustomer,
    redirectToDashboard,
    setStatus,
    storeSession
  };
  document.documentElement.setAttribute("data-auth-ready", "true");
})();
