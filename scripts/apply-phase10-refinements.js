const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function updateAppJs() {
  const filePath = path.join(ROOT_DIR, 'assets', 'app.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update section kicker in cart drawer
  content = content.replace(
    '<p class="section-kicker">OneMart</p>',
    '<p class="section-kicker">OnePoint Suvidha</p>'
  );

  // 2. Add data-cart-total-section to cart-total
  content = content.replace(
    '<div class="cart-total">',
    '<div class="cart-total" data-cart-total-section>'
  );

  // 3. Update refreshCartDrawer
  const oldRefreshCart = `function refreshCartDrawer() {
  renderCartDrawer();
  const cart = getCart();
  const itemsRoot = document.querySelector("[data-cart-items]");
  const totalRoot = document.querySelector("[data-cart-total]");
  const checkout = document.querySelector("[data-cart-checkout]");
  if (!itemsRoot || !totalRoot || !checkout) return;

  const enriched = cart
    .map((item) => ({ ...item, product: productBySlug(item.slug) }))
    .filter((item) => item.product);
  const total = enriched.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  itemsRoot.innerHTML = enriched.length
    ? enriched.map((item) => \`
      <div class="cart-item">
        <img src="\${item.product.images[0]}" alt="\${item.product.name}" loading="lazy" decoding="async">
        <div>
          <strong>\${item.product.name}</strong>
          <span>\${productPriceLabel(item.product)} x \${item.quantity}</span>
        </div>
        <button type="button" data-remove-cart="\${item.product.slug}" aria-label="Remove \${item.product.name}">\${icon("trash-2", 16)}</button>
      </div>
    \`).join("")
    : \`<p class="cart-empty">Cart is empty. Add products from OneMart.</p>\`;

  totalRoot.textContent = \`Rs. \${total}\`;
  checkout.href = "checkout.html";
  if (window.lucide) window.lucide.createIcons();
}`;

  const newRefreshCart = `function refreshCartDrawer() {
  renderCartDrawer();
  const cart = getCart();
  const itemsRoot = document.querySelector("[data-cart-items]");
  const totalRoot = document.querySelector("[data-cart-total]");
  const totalSection = document.querySelector("[data-cart-total-section]");
  const checkout = document.querySelector("[data-cart-checkout]");
  if (!itemsRoot || !totalRoot || !checkout) return;

  const enriched = cart
    .map((item) => ({ ...item, product: productBySlug(item.slug) }))
    .filter((item) => item.product);
  const total = enriched.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  if (enriched.length) {
    itemsRoot.innerHTML = enriched.map((item) => \`
      <div class="cart-item">
        <img src="\${item.product.images[0]}" alt="\${item.product.name}" loading="lazy" decoding="async">
        <div>
          <strong>\${item.product.name}</strong>
          <span>\${productPriceLabel(item.product)} x \${item.quantity}</span>
        </div>
        <button type="button" data-remove-cart="\${item.product.slug}" aria-label="Remove \${item.product.name}">\${icon("trash-2", 16)}</button>
      </div>
    \`).join("");
    totalRoot.textContent = \`Rs. \${total}\`;
    if (totalSection) totalSection.style.display = "";
    checkout.style.display = "";
    checkout.removeAttribute("aria-disabled");
    checkout.href = "checkout.html";
  } else {
    itemsRoot.innerHTML = \`
      <div class="cart-empty-state">
        <div class="cart-empty-icon">\${icon("shopping-bag", 28)}</div>
        <strong>Your Cart is Empty</strong>
        <p>Explore government and citizen services or business solutions to get started.</p>
        <a class="btn btn-secondary cart-browse-btn" href="services.html" data-cart-close>\${icon("compass", 16)} Browse Services</a>
      </div>
    \`;
    totalRoot.textContent = \`Rs. 0\`;
    if (totalSection) totalSection.style.display = "none";
    checkout.style.display = "none";
    checkout.setAttribute("aria-disabled", "true");
  }
  if (window.lucide) window.lucide.createIcons();
}`;

  // Normalize CRLF for robust matching
  const normContent = content.replace(/\r\n/g, '\n');
  const normOld = oldRefreshCart.replace(/\r\n/g, '\n');

  if (normContent.includes(normOld)) {
    const isCRLF = content.includes('\r\n');
    const replaced = normContent.replace(normOld, newRefreshCart.replace(/\r\n/g, '\n'));
    content = isCRLF ? replaced.replace(/\n/g, '\r\n') : replaced;
    console.log('Successfully updated refreshCartDrawer in assets/app.js');
  } else {
    console.warn('Could not find exact oldRefreshCart in assets/app.js');
  }

  // 4. Update data-cart-close event handling
  const oldCloseHandler = `    if (event.target.closest("[data-cart-close]")) {
      event.preventDefault();
      hideCartDrawer();
      return;
    }`;

  const newCloseHandler = `    const closeBtn = event.target.closest("[data-cart-close]");
    if (closeBtn) {
      hideCartDrawer();
      if (!closeBtn.hasAttribute("href")) {
        event.preventDefault();
      }
      return;
    }`;

  const normContent2 = content.replace(/\r\n/g, '\n');
  const normOldClose = oldCloseHandler.replace(/\r\n/g, '\n');

  if (normContent2.includes(normOldClose)) {
    const isCRLF = content.includes('\r\n');
    const replaced = normContent2.replace(normOldClose, newCloseHandler.replace(/\r\n/g, '\n'));
    content = isCRLF ? replaced.replace(/\n/g, '\r\n') : replaced;
    console.log('Successfully updated [data-cart-close] handler in assets/app.js');
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateCheckoutUxCss() {
  const filePath = path.join(ROOT_DIR, 'assets', 'checkout-ux.css');
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace mobile floating label styling to ensure no collision
  const oldMobileLabelRule = `body.enterprise-checkout-body .enterprise-field .eds-input:is(:focus, :not(:placeholder-shown), .eds-input-valid, .eds-input-invalid) + label { font-size: var(--eds-fs-base); line-height: var(--eds-lh-heading); transform: var(--checkout-label-transform, translateY(-13px)); }`;

  const newMobileLabelRule = `body.enterprise-checkout-body .enterprise-field .eds-input:is(:focus, :not(:placeholder-shown), :-webkit-autofill, .eds-input-valid, .eds-input-invalid) + label { font-size: var(--eds-fs-xs, 11px) !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; line-height: var(--eds-lh-heading, 1.2) !important; transform: var(--checkout-label-transform, translateY(-11px)) !important; color: #0369a1 !important; }
  body.enterprise-checkout-body .enterprise-field .eds-input.eds-input-invalid + label { color: #ef4444 !important; }`;

  if (content.includes(oldMobileLabelRule)) {
    content = content.replace(oldMobileLabelRule, newMobileLabelRule);
    console.log('Successfully updated mobile floating label rule in assets/checkout-ux.css');
  } else {
    console.warn('Could not find oldMobileLabelRule in assets/checkout-ux.css');
  }

  // Add short viewport height clearance if not already present
  if (!content.includes('max-height: 520px')) {
    content += `\n/* Short viewport & landscape mobile clearance */\n@media (max-height: 520px) and (max-width: 900px) {\n  body.enterprise-checkout-body .checkout-mobile-cta {\n    position: static !important;\n    padding: var(--eds-space-2) 0 !important;\n    box-shadow: none !important;\n    background: transparent !important;\n  }\n  body.enterprise-checkout-body .enterprise-checkout-page {\n    padding-bottom: var(--eds-space-4) !important;\n  }\n}\n`;
    console.log('Appended short viewport clearance to assets/checkout-ux.css');
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateCheckoutJs() {
  const filePath = path.join(ROOT_DIR, 'assets', 'checkout.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Update validateLiveInput parent class toggling
  const oldLiveToggle = `    input.closest(".enterprise-field")?.classList.toggle("is-valid", valid);
    input.closest(".enterprise-field")?.classList.toggle("is-invalid", !valid && input.value.trim().length > 0);`;

  const newLiveToggle = `    input.closest(".enterprise-field")?.classList.toggle("is-valid", valid && input.value.trim().length > 0);
    input.closest(".enterprise-field")?.classList.toggle("is-invalid", !valid);`;

  const normContent = content.replace(/\r\n/g, '\n');
  const normOldToggle = oldLiveToggle.replace(/\r\n/g, '\n');

  if (normContent.includes(normOldToggle)) {
    const isCRLF = content.includes('\r\n');
    const replaced = normContent.replace(normOldToggle, newLiveToggle.replace(/\r\n/g, '\n'));
    content = isCRLF ? replaced.replace(/\n/g, '\r\n') : replaced;
    console.log('Successfully updated validateLiveInput parent class toggling in assets/checkout.js');
  } else {
    console.warn('Could not find oldLiveToggle in assets/checkout.js');
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Applying Phase 10 Refinements...');
updateAppJs();
updateCheckoutUxCss();
updateCheckoutJs();
console.log('Phase 10 Refinements applied successfully!');
