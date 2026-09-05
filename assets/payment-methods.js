/*
 * One Point Service OS — Payment Method Registry (gateway abstraction layer)
 * ---------------------------------------------------------------------------
 * Single source of truth for every payment channel shown on the frontend.
 * Pages never hardcode a provider: they render categories/methods from this
 * registry and let resolveRouting() decide which live gateway carries the
 * transaction. Adding, disabling or re-routing a provider is a config change
 * in this file only.
 *
 * Backend contract (unchanged, see backend/utils.js + payment-service.js):
 *   paymentMethod ∈ upi | debit_card | credit_card | net_banking | wallet | qr
 *   gateway       ∈ razorpay | phonepe   (others fall back server-side too)
 */
(function () {
  "use strict";

  /* Gateways known to the platform. `live` marks adapters that exist on the
     backend today; non-live gateways route through `fallback`. */
  var GATEWAYS = {
    razorpay: { id: "razorpay", label: "Razorpay", live: true },
    phonepe:  { id: "phonepe",  label: "PhonePe PG", live: true },
    cashfree: { id: "cashfree", label: "Cashfree", live: false, fallback: "razorpay" },
    payu:     { id: "payu",     label: "PayU", live: false, fallback: "razorpay" },
    offline:  { id: "offline",  label: "Pay at Center", live: false, fallback: null }
  };

  var CATEGORIES = [
    { id: "upi",     label: "UPI & QR",           icon: "qr-code" },
    { id: "cards",   label: "Cards",              icon: "credit-card" },
    { id: "netbank", label: "Net Banking",        icon: "landmark" },
    { id: "wallets", label: "Wallets & Pay Later", icon: "wallet" },
    { id: "counter", label: "Pay at Center",      icon: "store" }
  ];

  /* flow: "gateway" → online session via backend gateway adapter
     flow: "offline" → booking confirmed now, payment collected at counter */
  var METHODS = [
    /* ── UPI & QR ─────────────────────────────────────────────── */
    { id: "razorpay_upi", category: "upi", label: "Razorpay UPI / QR", sub: "Any UPI app · instant verification",
      icon: "qr-code", gateway: "razorpay", apiMethod: "upi", flow: "gateway", enabled: true, recommended: true },
    { id: "gpay_upi", category: "upi", label: "Google Pay UPI", sub: "Direct bank transfer",
      icon: "smartphone", gateway: "razorpay", apiMethod: "upi", flow: "gateway", enabled: true },
    { id: "phonepe_upi", category: "upi", label: "PhonePe", sub: "UPI, wallet & cards",
      icon: "smartphone-nfc", gateway: "phonepe", apiMethod: "upi", flow: "gateway", enabled: true },
    { id: "bhim_upi", category: "upi", label: "BHIM UPI", sub: "NPCI official UPI app",
      icon: "banknote", gateway: "razorpay", apiMethod: "upi", flow: "gateway", enabled: true },
    { id: "paytm_upi", category: "upi", label: "Paytm UPI", sub: "Paytm app & wallet",
      icon: "smartphone", gateway: "razorpay", apiMethod: "upi", flow: "gateway", enabled: true },

    /* ── Cards ────────────────────────────────────────────────── */
    { id: "credit_card", category: "cards", label: "Credit Card", sub: "Visa · MasterCard · RuPay · Amex",
      icon: "credit-card", gateway: "razorpay", apiMethod: "credit_card", flow: "gateway", enabled: true },
    { id: "debit_card", category: "cards", label: "Debit Card", sub: "All Indian banks supported",
      icon: "credit-card", gateway: "razorpay", apiMethod: "debit_card", flow: "gateway", enabled: true },

    /* ── Net Banking / alternate gateways ─────────────────────── */
    { id: "netbanking", category: "netbank", label: "Net Banking", sub: "60+ banks · SBI, HDFC, ICICI…",
      icon: "landmark", gateway: "razorpay", apiMethod: "net_banking", flow: "gateway", enabled: true },
    { id: "cashfree_checkout", category: "netbank", label: "Cashfree Checkout", sub: "Via secure gateway routing",
      icon: "shield-check", gateway: "cashfree", apiMethod: "net_banking", flow: "gateway", enabled: true },
    { id: "payu_checkout", category: "netbank", label: "PayU Checkout", sub: "Via secure gateway routing",
      icon: "shield-check", gateway: "payu", apiMethod: "net_banking", flow: "gateway", enabled: true },

    /* ── Wallets & Pay Later ──────────────────────────────────── */
    { id: "wallet", category: "wallets", label: "Wallets", sub: "Paytm · Mobikwik · Amazon Pay",
      icon: "wallet", gateway: "razorpay", apiMethod: "wallet", flow: "gateway", enabled: true },
    { id: "pay_later", category: "wallets", label: "Pay Later", sub: "LazyPay · Simpl · ICICI PayLater",
      icon: "calendar-clock", gateway: "razorpay", apiMethod: "wallet", flow: "gateway", enabled: true },
    { id: "csc_wallet", category: "wallets", label: "CSC Wallet", sub: "VLE balance adjustment at center",
      icon: "badge-indian-rupee", gateway: "offline", apiMethod: "wallet", flow: "offline", enabled: false },
    { id: "operator_wallet", category: "wallets", label: "Operator Wallet", sub: "Settled by assigned operator",
      icon: "user-check", gateway: "offline", apiMethod: "wallet", flow: "offline", enabled: false },

    /* ── Pay at Center / offline ──────────────────────────────── */
    { id: "cash_counter", category: "counter", label: "Cash at Counter", sub: "Pay when you visit the Kendra",
      icon: "store", gateway: "offline", apiMethod: "upi", flow: "offline", enabled: false, recommended: true },
    { id: "offline_transfer", category: "counter", label: "Bank Transfer / NEFT", sub: "Details shared on WhatsApp",
      icon: "building-2", gateway: "offline", apiMethod: "upi", flow: "offline", enabled: false }
  ];

  /* Payment plans — how much is collected now vs later. Advance/split are a
     frontend commitment note today; ledger enforcement is a backend milestone. */
  var PLANS = [
    { id: "full", label: "Pay Full Amount", sub: "Complete payment now", icon: "check-circle-2", nowFactor: 1, enabled: true, default: true },
    { id: "partial", label: "Partial · 30% Advance", sub: "Balance due before delivery", icon: "circle-dollar-sign", nowFactor: 0.3, enabled: true },
    { id: "split", label: "Split · 2 Payments", sub: "50% now · 50% on approval", icon: "split", nowFactor: 0.5, enabled: true }
  ];

  // Advance and split plans stay hidden until backend ledger enforcement is live.
  PLANS.forEach(function (plan) {
    if (plan.id !== "full") plan.enabled = false;
  });

  function getCategories() {
    return CATEGORIES.filter(function (cat) {
      return getMethods(cat.id).length > 0;
    });
  }

  function getMethods(categoryId) {
    return METHODS.filter(function (m) {
      return m.enabled && (!categoryId || m.category === categoryId);
    });
  }

  function getMethod(id) {
    return METHODS.find(function (m) { return m.id === id; }) || null;
  }

  function getPlans() {
    return PLANS.filter(function (p) { return p.enabled; });
  }

  function getPlan(id) {
    return PLANS.find(function (p) { return p.id === id; }) || PLANS[0];
  }

  /* Resolve the concrete backend routing for a UI method. Non-live gateways
     collapse onto their configured live fallback so the customer's choice
     always produces a valid session without any page knowing gateway state. */
  function resolveRouting(methodId) {
    var method = getMethod(methodId) || getMethod("razorpay_upi");
    var gw = GATEWAYS[method.gateway] || GATEWAYS.razorpay;
    var routedId = gw.live ? gw.id : (gw.fallback || "razorpay");
    return {
      method: method,
      apiMethod: method.apiMethod,
      gateway: method.flow === "offline" ? "razorpay" : routedId,
      offline: method.flow === "offline",
      routedThroughFallback: !gw.live && method.flow !== "offline",
      routedLabel: method.flow === "offline" ? "Pay at Center" : (GATEWAYS[routedId] || gw).label
    };
  }

  /* Live retry gateways for the payment-failed page, current one excluded. */
  function getRetryGateways(excludeId) {
    return Object.keys(GATEWAYS)
      .map(function (key) { return GATEWAYS[key]; })
      .filter(function (gw) { return gw.live && gw.id !== excludeId; });
  }

  function formatINR(value) {
    return "Rs. " + Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  }

  window.OPDSPay = {
    gateways: GATEWAYS,
    getCategories: getCategories,
    getMethods: getMethods,
    getMethod: getMethod,
    getPlans: getPlans,
    getPlan: getPlan,
    resolveRouting: resolveRouting,
    getRetryGateways: getRetryGateways,
    formatINR: formatINR
  };
})();
