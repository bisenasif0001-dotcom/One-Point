(function () {
  "use strict";

  let profile = null;
  let savedAddresses = [];
  let privacyRequests = [];
  let activeTab = "personal";
  let hasUnsavedPersonalChanges = false;

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "OP";
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function showToast(message, type = "success") {
    let toast = byId("cpf-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cpf-toast";
      toast.className = "cpf-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `cpf-toast cpf-toast-${type} show`;
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function closeModal() {
    byId("cpf-modal-backdrop").hidden = true;
    byId("cpf-modal").innerHTML = "";
  }

  function openModalShell(title, bodyHtml) {
    byId("cpf-modal").innerHTML = `
      <div class="cpf-modal-head">
        <strong>${title}</strong>
        <button type="button" class="cpf-modal-close" id="cpf-modal-close-btn" aria-label="Close">&times;</button>
      </div>
      <div class="cpf-modal-body">${bodyHtml}</div>
    `;
    byId("cpf-modal-backdrop").hidden = false;
    byId("cpf-modal-close-btn").addEventListener("click", closeModal);
    if (window.lucide) window.lucide.createIcons();
  }

  // ==================== 1. SUB-NAVIGATION TABS ====================
  function initTabs() {
    const tabBtns = document.querySelectorAll(".cpf-tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        if (activeTab === targetTab) return;

        if (hasUnsavedPersonalChanges) {
          if (!confirm("You have unsaved changes in your Personal Details. Discard changes?")) {
            return;
          }
          hasUnsavedPersonalChanges = false;
          togglePersonalEditMode(false);
        }

        activeTab = targetTab;
        tabBtns.forEach((b) => {
          const isCurrent = b === btn;
          b.classList.toggle("active", isCurrent);
          b.setAttribute("aria-selected", isCurrent ? "true" : "false");
        });

        document.querySelectorAll(".cpf-tab-panel").forEach((panel) => {
          const isMatch = panel.id === `cpf-panel-${targetTab}`;
          panel.classList.toggle("active", isMatch);
          panel.hidden = !isMatch;
        });

        if (window.lucide) window.lucide.createIcons();
      });
    });
  }

  // ==================== 2. IDENTITY HEADER & COMPLETION CHECKLIST ====================
  function renderIdentityHeader(identity) {
    byId("cpf-avatar").textContent = initials(identity.name);
    byId("cpf-name").textContent = identity.name || "Customer";
    
    const custId = identity.customerId || ("OPDS-" + String(identity.mobile || "9473946181").slice(-6));
    const custIdElem = byId("cpf-customer-id");
    if (custIdElem) custIdElem.textContent = custId;

    const copyBtn = byId("cpf-copy-custid-btn");
    if (copyBtn) {
      copyBtn.setAttribute("data-copy-text", custId);
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(custId).then(() => showToast("Customer ID copied."));
      };
    }

    const badgeRow = byId("cpf-badge-row");
    badgeRow.innerHTML = [
      identity.phoneVerified ? `<span class="cpf-badge cpf-badge-ok"><i data-lucide="check-circle-2"></i> Mobile Verified</span>` : `<span class="cpf-badge cpf-badge-warn"><i data-lucide="alert-circle"></i> Mobile Unverified</span>`,
      identity.emailVerified ? `<span class="cpf-badge cpf-badge-ok"><i data-lucide="check-circle-2"></i> Email Verified</span>` : `<span class="cpf-badge cpf-badge-warn"><i data-lucide="alert-circle"></i> Email Unverified</span>`
    ].join("");

    const memberSince = byId("cpf-member-since");
    if (memberSince) {
      memberSince.innerHTML = `<i data-lucide="calendar"></i> ${identity.createdAt ? `Member since ${formatDate(identity.createdAt)}` : "Member since Jul 2026"}`;
    }
    renderProfileCompletion(identity);
  }

  function renderProfileCompletion(identity) {
    const box = byId("cpf-completion");
    if (!box) return;

    const checks = [
      { key: "name", label: "Legal Name Added", isDone: Boolean(identity.name) },
      { key: "mobile", label: "Mobile Number Verified", isDone: Boolean(identity.phoneVerified) },
      { key: "email", label: "Email Address Verified", isDone: Boolean(identity.emailVerified) },
      { key: "address", label: "Residential Address Added", isDone: savedAddresses.length > 0 || Boolean(identity.address) },
      { key: "password", label: "Permanent Password Set", isDone: Boolean(identity.hasPassword) }
    ];

    const completed = checks.filter((c) => c.isDone).length;
    const total = checks.length;
    const percent = Math.round((completed / total) * 100);
    const pendingCount = total - completed;

    box.innerHTML = `
      <div class="cpf-completion-head">
        <div class="cpf-completion-score-badge ${percent === 100 ? 'complete' : ''}">
          <span class="cpf-score-number">${percent}%</span>
        </div>
        <div class="cpf-completion-title-wrap">
          <strong class="cpf-completion-title">Profile Completion</strong>
          <p class="cpf-completion-sub">${pendingCount === 0 ? 'All 5 security & profile steps complete!' : `${pendingCount} ${pendingCount === 1 ? 'step' : 'steps'} remaining`}</p>
        </div>
      </div>
      <div class="cpf-progress-bar-wrap">
        <div class="cpf-progress-bar-fill" style="width: ${percent}%;"></div>
      </div>
      <div class="cpf-checklist-list">
        ${checks.map((c) => `
          <div class="cpf-check-item ${c.isDone ? 'done' : 'pending'}">
            <i data-lucide="${c.isDone ? 'check-circle-2' : 'circle'}"></i>
            <span>${c.label}</span>
          </div>
        `).join("")}
      </div>
      ${pendingCount > 0 ? `
        <button type="button" class="eds-btn eds-btn-primary" id="cpf-checklist-cta-btn" style="width:100%; font-size:.8rem; min-height:34px; margin-top:8px;">
          Complete Profile
        </button>
      ` : ''}
    `;

    const ctaBtn = byId("cpf-checklist-cta-btn");
    if (ctaBtn) {
      ctaBtn.onclick = () => {
        if (!identity.emailVerified) {
          openVerifyEmailModal();
        } else if (!savedAddresses.length && !identity.address) {
          document.querySelector("[data-tab='address']").click();
          openAddAddressModal();
        } else if (!identity.hasPassword) {
          openPasswordModal();
        } else {
          document.querySelector("[data-tab='personal']").click();
          togglePersonalEditMode(true);
        }
      };
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // ==================== 3. "SECURE YOUR ACCOUNT" STEPPER STRIP ====================
  function renderSecurityStepper(identity) {
    const card = byId("cpf-activation-card");
    if (!card) return;

    const isMobileDone = Boolean(identity.phoneVerified);
    const isEmailDone = Boolean(identity.emailVerified);
    const isPassDone = Boolean(identity.hasPassword);

    // If 100% complete, hide the strip
    if (isMobileDone && isEmailDone && isPassDone) {
      card.hidden = true;
      return;
    }

    if (sessionStorage.getItem("cpf_activation_dismissed") === "1") {
      card.hidden = true;
      return;
    }

    card.hidden = false;
    const strip = byId("cpf-security-stepper-strip");
    const actionBox = byId("cpf-stepper-action-box");

    strip.innerHTML = `
      <span class="cpf-step-item ${isMobileDone ? 'done' : 'active'}">
        <i data-lucide="${isMobileDone ? 'check' : 'circle'}"></i> 1. Mobile ${isMobileDone ? 'Verified' : ''}
      </span>
      <span class="cpf-step-sep">&rarr;</span>
      <span class="cpf-step-item ${isEmailDone ? 'done' : (!isMobileDone ? '' : 'active')}">
        <i data-lucide="${isEmailDone ? 'check' : 'circle'}"></i> 2. Email ${isEmailDone ? 'Verified' : ''}
      </span>
      <span class="cpf-step-sep">&rarr;</span>
      <span class="cpf-step-item ${isPassDone ? 'done' : (isMobileDone && isEmailDone ? 'active' : '')}">
        <i data-lucide="${isPassDone ? 'check' : 'circle'}"></i> 3. Set Password
      </span>
    `;

    if (!isMobileDone) {
      actionBox.innerHTML = `
        <button type="button" class="eds-btn eds-btn-primary" id="cpf-step-act-btn"><i data-lucide="smartphone"></i> Verify Mobile Phone</button>
        <button type="button" class="eds-btn eds-btn-ghost" id="cpf-step-dismiss-btn">Do This Later</button>
      `;
      byId("cpf-step-act-btn").onclick = openVerifyMobileModal;
    } else if (!isEmailDone) {
      actionBox.innerHTML = `
        <button type="button" class="eds-btn eds-btn-primary" id="cpf-step-act-btn"><i data-lucide="mail-check"></i> Verify Email Address</button>
        <button type="button" class="eds-btn eds-btn-ghost" id="cpf-step-dismiss-btn">Do This Later</button>
      `;
      byId("cpf-step-act-btn").onclick = openVerifyEmailModal;
    } else if (!isPassDone) {
      actionBox.innerHTML = `
        <button type="button" class="eds-btn eds-btn-primary" id="cpf-step-act-btn"><i data-lucide="key-round"></i> Create Password</button>
        <button type="button" class="eds-btn eds-btn-ghost" id="cpf-step-dismiss-btn">Do This Later</button>
      `;
      byId("cpf-step-act-btn").onclick = openPasswordModal;
    }

    const dismissBtn = byId("cpf-step-dismiss-btn");
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        sessionStorage.setItem("cpf_activation_dismissed", "1");
        card.hidden = true;
      };
    }
  }

  // ==================== 4. PERSONAL DETAILS (VIEW VS EDIT MODE) ====================
  function renderPersonalView(identity) {
    byId("cpf-view-name").textContent = identity.name || "Not specified";
    byId("cpf-view-mobile").textContent = identity.mobile ? `+91 ${identity.mobile}` : "Not specified";
    
    const mStatus = byId("cpf-view-mobile-status");
    mStatus.className = `cpf-tag ${identity.phoneVerified ? "ok" : "warn"}`;
    mStatus.innerHTML = identity.phoneVerified ? `<i data-lucide="check"></i> Verified` : `Unverified`;

    byId("cpf-view-email").textContent = identity.email || "Not specified";
    const eStatus = byId("cpf-view-email-status");
    eStatus.className = `cpf-tag ${identity.emailVerified ? "ok" : "warn"}`;
    eStatus.innerHTML = identity.emailVerified ? `<i data-lucide="check"></i> Verified` : `Unverified`;

    byId("cpf-view-lang").textContent = identity.language === "hi" ? "Hindi Only" : identity.language === "en" ? "English Only" : "Hindi / English (Bilingual)";
    byId("cpf-view-dob").textContent = identity.dob || "Not specified";

    // Populate form fields
    byId("cpf-full-name").value = identity.name || "";
    byId("cpf-mobile").value = identity.mobile || "";
    byId("cpf-email").value = identity.email || "";
    byId("cpf-lang").value = identity.language || "hi_en";
    byId("cpf-dob").value = identity.dob || "";
  }

  function togglePersonalEditMode(isEdit) {
    const viewGrid = byId("cpf-personal-view");
    const editForm = byId("cpf-personal-form");
    const editBtn = byId("cpf-edit-personal-btn");

    if (isEdit) {
      viewGrid.hidden = true;
      editForm.hidden = false;
      editBtn.hidden = true;
      hasUnsavedPersonalChanges = true;
    } else {
      viewGrid.hidden = false;
      editForm.hidden = true;
      editBtn.hidden = false;
      hasUnsavedPersonalChanges = false;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  function setupPersonalForm(identity) {
    const editBtn = byId("cpf-edit-personal-btn");
    const cancelBtn = document.querySelector("[data-cpf-cancel='personal']");
    const form = byId("cpf-personal-form");

    if (editBtn) editBtn.onclick = () => togglePersonalEditMode(true);
    if (cancelBtn) cancelBtn.onclick = () => togglePersonalEditMode(false);

    const mChangeBtn = byId("cpf-mobile-change-btn");
    if (mChangeBtn) mChangeBtn.onclick = openVerifyMobileModal;

    const eChangeBtn = byId("cpf-email-change-btn");
    if (eChangeBtn) eChangeBtn.onclick = openVerifyEmailModal;

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const newName = byId("cpf-full-name").value.trim();
        const newLang = byId("cpf-lang").value;
        const newDob = byId("cpf-dob").value.trim();

        identity.name = newName;
        identity.language = newLang;
        identity.dob = newDob;

        // Persist locally
        localStorage.setItem("opds_customer_profile", JSON.stringify(profile));

        showToast("✓ Personal details updated successfully.");
        renderIdentityHeader(identity);
        renderPersonalView(identity);
        togglePersonalEditMode(false);
      };
    }
  }

  // ==================== 5. SAVED ADDRESSES (REUSABLE SYSTEM WITH PIN AUTOFILL) ====================
  function getStoredAddresses(identity) {
    try {
      const stored = localStorage.getItem("opds_customer_addresses");
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return [
      {
        id: "addr-1",
        label: "Home",
        isDefault: true,
        addressLine1: identity.address || "Milan Tower, Sector B, Bargawan",
        addressLine2: identity.addressLine2 || "LDA Colony",
        landmark: "Near Picup Bhawan",
        city: identity.city || "Lucknow",
        district: "Lucknow",
        state: identity.state || "Uttar Pradesh",
        pincode: identity.pincode || "226012",
        country: "India",
        useForApplications: true,
        useForDelivery: true
      }
    ];
  }

  function saveStoredAddresses(addresses) {
    savedAddresses = addresses;
    try {
      localStorage.setItem("opds_customer_addresses", JSON.stringify(addresses));
    } catch (e) {}
    const badge = byId("cpf-address-count-badge");
    if (badge) badge.textContent = addresses.length;
  }

  function renderAddresses() {
    const grid = byId("cpf-address-cards-grid");
    const empty = byId("cpf-address-empty");
    if (!grid) return;

    if (!savedAddresses.length) {
      grid.innerHTML = "";
      grid.hidden = true;
      empty.hidden = false;
      return;
    }

    grid.hidden = false;
    empty.hidden = true;

    grid.innerHTML = savedAddresses.map((addr, index) => `
      <article class="cpf-addr-card ${addr.isDefault ? 'cpf-addr-default' : ''}">
        <div class="cpf-addr-card-head">
          <div style="display:flex; align-items:center; gap:8px;">
            <strong class="cpf-addr-label">${escapeHtml(addr.label || "Address")}</strong>
            ${addr.isDefault ? `<span class="cpf-addr-default-tag"><i data-lucide="check"></i> Default</span>` : ''}
          </div>
          <div class="cpf-addr-actions">
            <button type="button" class="cpf-addr-act-btn" data-edit-addr="${index}" title="Edit Address"><i data-lucide="edit-3"></i></button>
            ${!addr.isDefault ? `<button type="button" class="cpf-addr-act-btn cpf-addr-del-btn" data-del-addr="${index}" title="Delete Address"><i data-lucide="trash-2"></i></button>` : ''}
          </div>
        </div>
        <p class="cpf-addr-lines">
          ${escapeHtml(addr.addressLine1)}<br>
          ${addr.addressLine2 ? `${escapeHtml(addr.addressLine2)}<br>` : ''}
          ${addr.landmark ? `Landmark: ${escapeHtml(addr.landmark)}<br>` : ''}
          <strong>${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} — ${escapeHtml(addr.pincode)}</strong>
        </p>
        <div class="cpf-addr-tags">
          ${addr.useForApplications ? `<span class="cpf-addr-usage-pill"><i data-lucide="file-check"></i> Use for Applications</span>` : ''}
          ${addr.useForDelivery ? `<span class="cpf-addr-usage-pill"><i data-lucide="truck"></i> Use for Delivery</span>` : ''}
        </div>
        <div class="cpf-addr-bottom">
          ${!addr.isDefault ? `
            <button type="button" class="cpf-inline-action" data-set-default-addr="${index}">
              Set as Default Address
            </button>
          ` : `
            <small class="cpf-muted" style="font-size:.76rem;"><i data-lucide="shield-check" style="width:12px; height:12px; color:#15803d;"></i> Primary application address</small>
          `}
        </div>
      </article>
    `).join("");

    // Attach address actions
    grid.querySelectorAll("[data-edit-addr]").forEach((btn) => {
      btn.onclick = () => openEditAddressModal(savedAddresses[Number(btn.dataset.editAddr)], Number(btn.dataset.editAddr));
    });

    grid.querySelectorAll("[data-del-addr]").forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.delAddr);
        if (confirm("Are you sure you want to delete this address?")) {
          savedAddresses.splice(idx, 1);
          saveStoredAddresses(savedAddresses);
          showToast("Address deleted.");
          renderAddresses();
          renderProfileCompletion(profile.identity);
        }
      };
    });

    grid.querySelectorAll("[data-set-default-addr]").forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.setDefaultAddr);
        savedAddresses.forEach((a, i) => a.isDefault = i === idx);
        saveStoredAddresses(savedAddresses);
        showToast("✓ Default address updated.");
        renderAddresses();
      };
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function openAddAddressModal() {
    openEditAddressModal(null, -1);
  }

  function openEditAddressModal(existingAddr, editIndex) {
    const isNew = !existingAddr;
    const addr = existingAddr || {
      label: "Home",
      addressLine1: "",
      addressLine2: "",
      landmark: "",
      pincode: "226012",
      city: "Lucknow",
      district: "Lucknow",
      state: "Uttar Pradesh",
      country: "India",
      isDefault: savedAddresses.length === 0,
      useForApplications: true,
      useForDelivery: true
    };

    const modalHtml = `
      <form id="cpf-modal-address-form" class="cpf-form-grid" style="grid-template-columns: 1fr 1fr; gap:12px;">
        <div class="cpf-field span-2">
          <label for="m-addr-label">Address Type / Label</label>
          <select class="eds-input" id="m-addr-label" name="label">
            <option value="Home" ${addr.label === 'Home' ? 'selected' : ''}>Home</option>
            <option value="Business / Office" ${addr.label === 'Business / Office' ? 'selected' : ''}>Business / Office</option>
            <option value="Hostel / College" ${addr.label === 'Hostel / College' ? 'selected' : ''}>Hostel / College</option>
            <option value="Other" ${addr.label === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>

        <div class="cpf-field span-2">
          <label for="m-addr-1">House / Flat / Building No. &amp; Street</label>
          <input class="eds-input" id="m-addr-1" name="addressLine1" value="${escapeHtml(addr.addressLine1)}" placeholder="e.g. 2/531 Sector H" required>
        </div>

        <div class="cpf-field span-2">
          <label for="m-addr-2">Area / Locality / Sector <span>(Optional)</span></label>
          <input class="eds-input" id="m-addr-2" name="addressLine2" value="${escapeHtml(addr.addressLine2)}" placeholder="e.g. LDA Colony, Bargawan">
        </div>

        <div class="cpf-field span-2">
          <label for="m-addr-landmark">Nearby Landmark <span>(Optional)</span></label>
          <input class="eds-input" id="m-addr-landmark" name="landmark" value="${escapeHtml(addr.landmark)}" placeholder="e.g. Near Milan Tower / Petrol Pump">
        </div>

        <div class="cpf-field">
          <label for="m-addr-pin">6-Digit PIN Code</label>
          <input class="eds-input" id="m-addr-pin" name="pincode" value="${escapeHtml(addr.pincode)}" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="226012" required>
          <small class="cpf-field-help" style="color:#075aa8;">PIN code automatically autofills City &amp; State.</small>
        </div>

        <div class="cpf-field">
          <label for="m-addr-city">City / District</label>
          <input class="eds-input" id="m-addr-city" name="city" value="${escapeHtml(addr.city)}" placeholder="Lucknow" required>
        </div>

        <div class="cpf-field">
          <label for="m-addr-state">State / UT</label>
          <input class="eds-input" id="m-addr-state" name="state" value="${escapeHtml(addr.state)}" placeholder="Uttar Pradesh" required>
        </div>

        <div class="cpf-field">
          <label for="m-addr-country">Country</label>
          <input class="eds-input" id="m-addr-country" name="country" value="India" disabled>
        </div>

        <div class="cpf-field span-2" style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
          <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
            <input type="checkbox" id="m-addr-default" ${addr.isDefault ? 'checked' : ''}> Set as default delivery &amp; application address
          </label>
        </div>

        <div class="cpf-form-actions span-2" style="margin-top:8px;">
          <button type="submit" class="eds-btn eds-btn-primary">${isNew ? 'Save Address' : 'Update Address'}</button>
          <button type="button" class="eds-btn eds-btn-secondary" id="cpf-modal-cancel-btn">Cancel</button>
        </div>
      </form>
    `;

    openModalShell(isNew ? "Add New Saved Address" : "Edit Saved Address", modalHtml);

    // PIN code autofill logic
    const pinInput = byId("m-addr-pin");
    const cityInput = byId("m-addr-city");
    const stateInput = byId("m-addr-state");

    pinInput.addEventListener("input", (e) => {
      const pin = e.target.value.trim();
      if (pin.length === 6) {
        let matchedCity = "";
        let matchedState = "Uttar Pradesh";

        if (pin.startsWith("226")) {
          matchedCity = "Lucknow";
        } else if (pin.startsWith("201") || pin.startsWith("202")) {
          matchedCity = "Noida / Ghaziabad";
        } else if (pin.startsWith("110")) {
          matchedCity = "New Delhi";
          matchedState = "Delhi";
        } else if (pin.startsWith("221")) {
          matchedCity = "Varanasi";
        } else if (pin.startsWith("208")) {
          matchedCity = "Kanpur";
        }

        if (matchedCity) {
          cityInput.value = matchedCity;
          stateInput.value = matchedState;
          cityInput.style.borderColor = "#15803d";
          stateInput.style.borderColor = "#15803d";
          showToast(`✓ Autofilled ${matchedCity}, ${matchedState} from PIN`);
          setTimeout(() => {
            cityInput.style.borderColor = "";
            stateInput.style.borderColor = "";
          }, 1800);
        }
      }
    });

    byId("cpf-modal-cancel-btn").onclick = closeModal;

    const modalForm = byId("cpf-modal-address-form");
    modalForm.onsubmit = (e) => {
      e.preventDefault();
      const updated = {
        id: existingAddr ? existingAddr.id : `addr-${Date.now()}`,
        label: byId("m-addr-label").value,
        addressLine1: byId("m-addr-1").value.trim(),
        addressLine2: byId("m-addr-2").value.trim(),
        landmark: byId("m-addr-landmark").value.trim(),
        pincode: byId("m-addr-pin").value.trim(),
        city: byId("m-addr-city").value.trim(),
        district: byId("m-addr-city").value.trim(),
        state: byId("m-addr-state").value.trim(),
        country: "India",
        isDefault: byId("m-addr-default").checked,
        useForApplications: true,
        useForDelivery: true
      };

      if (updated.isDefault) {
        savedAddresses.forEach((a) => a.isDefault = false);
      }

      if (isNew) {
        savedAddresses.push(updated);
      } else {
        savedAddresses[editIndex] = updated;
      }

      saveStoredAddresses(savedAddresses);
      closeModal();
      showToast(isNew ? "✓ New address added." : "✓ Address updated.");
      renderAddresses();
      renderProfileCompletion(profile.identity);
    };
  }

  // ==================== 6. VERIFICATION & PASSWORD MODALS ====================
  function openVerifyMobileModal() {
    const mobile = profile.identity.mobile || "9473946181";
    openModalShell("Verify Mobile Number", `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <p class="cpf-muted" style="margin:0; font-size:.88rem;">We will send a 6-digit one-time verification code to <strong>+91 ${escapeHtml(mobile)}</strong>.</p>
        <div class="cpf-field">
          <label for="m-otp-code">Enter 6-Digit OTP</label>
          <input class="eds-input" id="m-otp-code" placeholder="e.g. 260824" maxlength="6" inputmode="numeric" style="letter-spacing:4px; font-size:1.1rem; font-weight:700;">
        </div>
        <div class="cpf-form-actions">
          <button type="button" class="eds-btn eds-btn-primary" id="m-verify-phone-btn">Verify Phone</button>
          <button type="button" class="eds-btn eds-btn-secondary" id="m-resend-otp-btn">Resend OTP</button>
        </div>
      </div>
    `);

    byId("m-verify-phone-btn").onclick = () => {
      profile.identity.phoneVerified = true;
      localStorage.setItem("opds_customer_profile", JSON.stringify(profile));
      closeModal();
      showToast("✓ Mobile number verified successfully.");
      renderIdentityHeader(profile.identity);
      renderPersonalView(profile.identity);
      renderSecurityStepper(profile.identity);
    };

    byId("m-resend-otp-btn").onclick = () => {
      showToast("New OTP sent to registered mobile.");
    };
  }

  function openVerifyEmailModal() {
    const email = profile.identity.email || "asif@bisen.in";
    openModalShell("Verify Email Address", `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <p class="cpf-muted" style="margin:0; font-size:.88rem;">Enter the verification code sent to <strong>${escapeHtml(email)}</strong>.</p>
        <div class="cpf-field">
          <label for="m-email-code">Enter 6-Digit Verification Code</label>
          <input class="eds-input" id="m-email-code" placeholder="e.g. 842190" maxlength="6" inputmode="numeric" style="letter-spacing:4px; font-size:1.1rem; font-weight:700;">
        </div>
        <div class="cpf-form-actions">
          <button type="button" class="eds-btn eds-btn-primary" id="m-verify-email-btn">Confirm Email</button>
          <button type="button" class="eds-btn eds-btn-secondary" onclick="showToast('Verification email resent.')">Resend Code</button>
        </div>
      </div>
    `);

    byId("m-verify-email-btn").onclick = () => {
      profile.identity.emailVerified = true;
      localStorage.setItem("opds_customer_profile", JSON.stringify(profile));
      closeModal();
      showToast("✓ Email address verified successfully.");
      renderIdentityHeader(profile.identity);
      renderPersonalView(profile.identity);
      renderSecurityStepper(profile.identity);
    };
  }

  function openPasswordModal() {
    openModalShell("Manage Account Password", `
      <form id="m-password-form" class="cpf-form-grid" style="gap:12px;">
        <div class="cpf-field">
          <label for="m-curr-pass">Current Password <span>(or OTP if first time)</span></label>
          <input class="eds-input" id="m-curr-pass" type="password" placeholder="Current password">
        </div>
        <div class="cpf-field">
          <label for="m-new-pass">New Password</label>
          <input class="eds-input" id="m-new-pass" type="password" placeholder="At least 8 characters" required>
        </div>
        <div class="cpf-field">
          <label for="m-conf-pass">Confirm New Password</label>
          <input class="eds-input" id="m-conf-pass" type="password" placeholder="Repeat new password" required>
        </div>
        <div class="cpf-form-actions">
          <button type="submit" class="eds-btn eds-btn-primary">Save New Password</button>
          <button type="button" class="eds-btn eds-btn-secondary" id="m-pass-cancel-btn">Cancel</button>
        </div>
      </form>
    `);

    byId("m-pass-cancel-btn").onclick = closeModal;

    byId("m-password-form").onsubmit = (e) => {
      e.preventDefault();
      const p1 = byId("m-new-pass").value;
      const p2 = byId("m-conf-pass").value;
      if (p1.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }
      if (p1 !== p2) {
        alert("Passwords do not match.");
        return;
      }

      profile.identity.hasPassword = true;
      localStorage.setItem("opds_customer_profile", JSON.stringify(profile));
      closeModal();
      showToast("✓ Password updated successfully.");
      byId("cpf-password-status-text").textContent = "Password updated just now";
      renderIdentityHeader(profile.identity);
      renderSecurityStepper(profile.identity);
    };
  }

  // ==================== 7. PRIVACY & DATA REQUESTS ====================
  function getStoredPrivacyRequests() {
    try {
      const stored = localStorage.getItem("opds_customer_privacy_requests");
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return [
      { id: "PR-1029", type: "Document Removal Request", target: "Older Marksheet Scan (Doc ID: 410)", status: "Under Review", date: "24 Aug 2026" }
    ];
  }

  function renderPrivacyRequests() {
    const list = byId("cpf-deletion-requests");
    if (!list) return;

    if (!privacyRequests.length) {
      list.innerHTML = `<p class="cpf-muted" style="font-size:.82rem; margin:6px 0;">No active privacy or removal requests.</p>`;
      return;
    }

    list.innerHTML = privacyRequests.map((pr) => `
      <div class="cpf-deletion-row">
        <span>
          <strong>${escapeHtml(pr.type)} &middot; <code>${escapeHtml(pr.id)}</code></strong>
          <small class="cpf-muted">${escapeHtml(pr.target)} &middot; Submitted ${escapeHtml(pr.date)}</small>
        </span>
        <span class="cpf-deletion-status">${escapeHtml(pr.status)}</span>
      </div>
    `).join("");
  }

  function setupPrivacyActions() {
    const reqRemovalBtn = byId("cpf-btn-req-removal");
    if (reqRemovalBtn) {
      reqRemovalBtn.onclick = () => {
        const targetDoc = prompt("Enter the document name or ID to request removal:", "Aadhaar Scan / Marksheet");
        if (targetDoc) {
          const newReq = {
            id: `PR-${Math.floor(1000 + Math.random() * 9000)}`,
            type: "Document Removal Request",
            target: targetDoc,
            status: "Under Review",
            date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          };
          privacyRequests.unshift(newReq);
          localStorage.setItem("opds_customer_privacy_requests", JSON.stringify(privacyRequests));
          showToast(`✓ Privacy Request ${newReq.id} submitted for operator review.`);
          renderPrivacyRequests();
        }
      };
    }

    const reqCorrBtn = byId("cpf-btn-req-correction");
    if (reqCorrBtn) {
      reqCorrBtn.onclick = () => {
        const correctionNote = prompt("Describe the official data correction required:", "Name spelling correction on permanent record");
        if (correctionNote) {
          const newReq = {
            id: `PR-${Math.floor(1000 + Math.random() * 9000)}`,
            type: "Data Correction Request",
            target: correctionNote,
            status: "Under Review",
            date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          };
          privacyRequests.unshift(newReq);
          localStorage.setItem("opds_customer_privacy_requests", JSON.stringify(privacyRequests));
          showToast(`✓ Privacy Request ${newReq.id} submitted to Kendra Data Officer.`);
          renderPrivacyRequests();
        }
      };
    }
  }

  // ==================== 8. INITIALIZE PHASE 3 ACCOUNT SETTINGS ====================
  window.OPDSAccount.ready.then((data) => {
    if (!data) return;
    profile = data.profile;
    const identity = profile.identity || {};

    savedAddresses = getStoredAddresses(identity);
    privacyRequests = getStoredPrivacyRequests();

    initTabs();
    renderIdentityHeader(identity);
    renderSecurityStepper(identity);
    renderPersonalView(identity);
    setupPersonalForm(identity);
    renderAddresses();
    renderPrivacyRequests();
    setupPrivacyActions();

    const addAddrBtn = byId("cpf-add-address-btn");
    if (addAddrBtn) addAddrBtn.onclick = openAddAddressModal;
    const emptyAddBtn = byId("cpf-empty-add-address-btn");
    if (emptyAddBtn) emptyAddBtn.onclick = openAddAddressModal;

    const passActionBtn = byId("cpf-password-action-btn");
    if (passActionBtn) passActionBtn.onclick = openPasswordModal;

    const signoutAllBtn = byId("cpf-signout-all-devices-btn");
    if (signoutAllBtn) {
      signoutAllBtn.onclick = () => {
        if (confirm("Sign out of all other devices except this current browser?")) {
          showToast("✓ All other sessions terminated.");
        }
      };
    }

    const logoutBtn2 = byId("cpf-logout-btn-2");
    if (logoutBtn2) logoutBtn2.onclick = window.OPDSAccount.logout;

    if (window.lucide) window.lucide.createIcons();
  }).catch((error) => {
    console.error("[customer-profile]", error);
  });
})();
