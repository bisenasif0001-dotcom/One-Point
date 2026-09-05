(function () {
  "use strict";

  const VERSION = "voter-id-consent-v1.0-2026-08-01";
  const SELECTOR = 'a[href*="checkout.html"][href*="service=voter-id"], button[data-voter-consent], [onclick*="checkout.html?service=voter-id"]';
  let destination = "";
  let serviceOption = "Voter ID Application";
  let previousFocus = null;

  const markup = `
    <div class="voter-consent-modal" data-voter-consent-modal hidden>
      <div class="voter-consent-backdrop" data-voter-consent-close></div>
      <section class="voter-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="voter-consent-title" tabindex="-1">
        <header class="voter-consent-header">
          <p class="voter-consent-kicker">Required before proceeding</p>
          <h2 id="voter-consent-title">ग्राहक की सहमति एवं घोषणा<br><span lang="en">Customer Consent and Declaration</span></h2>
          <p class="voter-consent-service">चुनी गई सेवा / Selected service: <strong data-voter-consent-service>Voter ID</strong></p>
        </header>
        <div class="voter-consent-body">
          <p class="voter-consent-notice"><strong>महत्वपूर्ण / Important:</strong> यह एक स्वतंत्र निजी डिजिटल सहायता केंद्र है, Election Commission of India या किसी सरकारी विभाग का अधिकृत कार्यालय नहीं।</p>
          <div class="voter-consent-copy">
            <section lang="hi">
              <h3>हिन्दी</h3>
              <p>मैं पुष्टि करता/करती हूँ कि इस आवेदन के लिए मेरे द्वारा दी गई सभी जानकारी और दस्तावेज मेरी जानकारी के अनुसार सही, पूर्ण और वैध हैं।</p>
              <p>मैं इस स्वतंत्र निजी डिजिटल सहायता केंद्र को मेरे द्वारा चुनी गई सेवा के लिए आवेदन भरने, विवरण दर्ज करने, दस्तावेज स्कैन/अपलोड करने, आवेदन जमा करने तथा उसकी स्थिति देखने में सहायता प्रदान करने की अनुमति देता/देती हूँ।</p>
              <p>मैं समझता/समझती हूँ कि यह पोर्टल Election Commission of India या किसी सरकारी विभाग का अधिकृत कार्यालय या प्रतिनिधि नहीं है। यह केवल ऑनलाइन आवेदन एवं दस्तावेजी सहायता प्रदान करता है।</p>
              <p>आवेदन की जाँच, सत्यापन, स्वीकृति, अस्वीकृति, सुधार, Voter ID जारी करना अथवा मतदाता सूची में नाम जोड़ने या हटाने का अंतिम निर्णय संबंधित निर्वाचन अधिकारी या सक्षम सरकारी प्राधिकारी द्वारा लिया जाएगा। पोर्टल किसी आवेदन की स्वीकृति या निश्चित समय में सेवा पूरी होने की गारंटी नहीं देता।</p>
              <p>मैं सहमत हूँ कि मेरे द्वारा उपलब्ध कराई गई जानकारी और दस्तावेजों का उपयोग केवल मेरी चुनी हुई सेवा को पूरा करने, आवेदन की स्थिति बताने और आवश्यक सहायता प्रदान करने के लिए किया जा सकता है।</p>
              <p>नीचे दिए गए सहमति बॉक्स को चुनकर और <strong>“सहमत हूँ एवं आगे बढ़ें”</strong> बटन पर क्लिक करके मैं अपनी इलेक्ट्रॉनिक सहमति प्रदान करता/करती हूँ। मेरी सहमति का रिकॉर्ड सेवा का नाम, दिनांक, समय और संबंधित तकनीकी विवरण के साथ पोर्टल पर सुरक्षित रखा जा सकता है।</p>
            </section>
            <section lang="en">
              <h3>English</h3>
              <p>I confirm that all information and documents provided by me for this application are true, complete and valid to the best of my knowledge.</p>
              <p>I authorise this independent private digital assistance centre to help me with the selected service, including filling out the application, entering details, scanning or uploading documents, submitting the application and checking its status.</p>
              <p>I understand that this portal is not an authorised office or representative of the Election Commission of India or any government department. It provides online application and documentation assistance only.</p>
              <p>The final decision regarding verification, approval, rejection, correction, issuance of a Voter ID, or inclusion or deletion of a name in the electoral roll will be taken by the concerned election officer or competent government authority. The portal does not guarantee approval of any application or completion within a specific period.</p>
              <p>I consent to the use of the information and documents provided by me only for completing the selected service, providing application-status updates and delivering necessary assistance.</p>
              <p>By selecting the consent checkbox and clicking <strong>“I Agree and Continue”</strong>, I provide my electronic consent. A record of my consent may be securely stored on the portal along with the service name, date, time and relevant technical details.</p>
            </section>
          </div>
          <form id="voter-consent-form" data-voter-consent-form novalidate>
            <div class="voter-consent-fields">
              <label class="voter-consent-field"><span>ग्राहक का पूरा नाम / Customer full name</span><input name="customerName" type="text" autocomplete="name" maxlength="120" required></label>
              <label class="voter-consent-field"><span>मोबाइल नंबर / Mobile number</span><input name="customerPhone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="13" placeholder="10-digit mobile number" required></label>
            </div>
            <label class="voter-consent-check">
              <input name="accepted" type="checkbox" required>
              <span><strong>मैंने ऊपर दी गई ग्राहक सहमति एवं घोषणा को पढ़ लिया है, समझ लिया है और इससे सहमत हूँ।</strong><br>I have read, understood and agreed to the Customer Consent and Declaration stated above.</span>
            </label>
            <p class="voter-consent-error" data-voter-consent-error role="alert" aria-live="polite"></p>
          </form>
        </div>
        <footer class="voter-consent-actions">
          <button class="btn btn-ghost" type="button" data-voter-consent-close>वापस जाएँ / Go Back</button>
          <button class="btn btn-primary" type="submit" form="voter-consent-form" data-voter-consent-submit>सहमत हूँ एवं आगे बढ़ें / I Agree and Continue</button>
        </footer>
      </section>
    </div>`;

  function isVoterCheckout(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.pathname.split("/").pop() === "checkout.html" && url.searchParams.get("service") === "voter-id";
    } catch { return false; }
  }

  function choiceFrom(element) {
    let optionFromUrl = "";
    try {
      optionFromUrl = new URL(element.getAttribute("href") || "", window.location.href).searchParams.get("service_option") || "";
    } catch {}
    return element.dataset.voterConsentOption
      || optionFromUrl
      || element.closest(".service-option-card")?.querySelector("h3")?.textContent?.trim()
      || element.closest(".premium-small-features-list")?.querySelector("h4")?.textContent?.trim()
      || element.closest(".premium-story-showcase")?.querySelector("h3")?.textContent?.trim()
      || "Voter ID Application";
  }

  function openModal(url, option, trigger) {
    destination = url;
    serviceOption = option;
    previousFocus = trigger;
    modal.querySelector("[data-voter-consent-service]").textContent = /^voter id\b/i.test(serviceOption)
      ? serviceOption
      : `Voter ID — ${serviceOption}`;
    modal.hidden = false;
    document.documentElement.classList.add("voter-consent-open");
    modal.querySelector(".voter-consent-body").scrollTop = 0;
    modal.querySelector(".voter-consent-dialog").focus({ preventScroll: true });
  }

  function closeModal() {
    modal.hidden = true;
    document.documentElement.classList.remove("voter-consent-open");
    form.reset();
    error.textContent = "";
    previousFocus?.focus?.();
  }

  async function getCsrf(base) {
    const response = await fetch(`${base}/api/csrf`, { credentials: "include" });
    if (!response.ok) throw new Error("Consent service is not available.");
    return (await response.json()).csrfToken || "";
  }

  async function saveConsent(payload) {
    const bases = window.location.protocol === "file:"
      ? ["http://localhost:4273", "http://127.0.0.1:4273", "http://localhost:4173", "http://127.0.0.1:4173"]
      : [""];
    let lastError;
    for (const base of bases) {
      try {
        const csrf = await getCsrf(base);
        const response = await fetch(`${base}/api/consents/voter-id`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Consent could not be saved.");
        return data.consent;
      } catch (err) { lastError = err; }
    }
    throw lastError || new Error("Consent service is not available.");
  }

  document.body.insertAdjacentHTML("beforeend", markup);
  const modal = document.querySelector("[data-voter-consent-modal]");
  const form = modal.querySelector("[data-voter-consent-form]");
  const error = modal.querySelector("[data-voter-consent-error]");
  const submit = modal.querySelector("[data-voter-consent-submit]");

  document.addEventListener("click", function (event) {
    const trigger = event.target.closest(SELECTOR);
    if (!trigger) return;
    const raw = trigger.getAttribute("href") || trigger.dataset.checkoutHref || trigger.getAttribute("onclick")?.match(/['\"](checkout\.html\?service=voter-id[^'\"]*)/)?.[1] || "";
    if (!isVoterCheckout(raw)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openModal(raw.replace(/&amp;/g, "&"), choiceFrom(trigger), trigger);
  }, true);

  modal.querySelectorAll("[data-voter-consent-close]").forEach((button) => button.addEventListener("click", closeModal));
  modal.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeModal();
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    error.textContent = "";
    const data = new FormData(form);
    const phone = String(data.get("customerPhone") || "").replace(/\D/g, "");
    if (String(data.get("customerName") || "").trim().length < 2) {
      error.textContent = "कृपया ग्राहक का पूरा नाम दर्ज करें / Please enter the customer name.";
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      error.textContent = "कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें / Please enter a valid 10-digit mobile number.";
      return;
    }
    if (data.get("accepted") !== "on") {
      error.textContent = "आगे बढ़ने के लिए सहमति बॉक्स चुनना आवश्यक है / Please select the consent checkbox.";
      return;
    }

    submit.disabled = true;
    submit.textContent = "सहमति सुरक्षित की जा रही है… / Saving consent…";
    try {
      const consent = await saveConsent({
        customerName: String(data.get("customerName") || "").trim(),
        customerPhone: phone,
        serviceOption,
        declarationVersion: VERSION,
        accepted: true,
        destinationUrl: destination,
        sourcePage: `${window.location.pathname}${window.location.search}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}`
      });
      const next = new URL(destination, window.location.href);
      next.searchParams.set("consent_id", consent.consentId);
      window.location.assign(next.href);
    } catch (err) {
      error.textContent = `${err.message || "Consent could not be saved."} कृपया वेबसाइट को server से खोलें और दोबारा प्रयास करें।`;
    } finally {
      submit.disabled = false;
      submit.textContent = "सहमत हूँ एवं आगे बढ़ें / I Agree and Continue";
    }
  });
})();
