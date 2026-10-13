(function () {
  'use strict';
  const phone = matchMedia('(max-width: 1080px)');
  const disclosures = [];
  function wrap(nodes, label) {
    nodes = nodes.filter(Boolean);
    if (!nodes.length) return;
    const details = document.createElement('details');
    details.className = 'mobile-service-disclosure';
    const summary = document.createElement('summary'); summary.textContent = label;
    details.append(summary); nodes[0].before(details); nodes.forEach(node => details.append(node));
    disclosures.push(details);
    return summary;
  }
  function setup() {
    const filters = document.querySelector('.shub-toolbar-filters');
    if (filters) {
      document.body.classList.add("mobile-directory-ready");
      const label = wrap([filters], 'Filters');
      const update = () => {
        const count = [...filters.querySelectorAll('select')].filter(select => select.value !== 'all').length;
        label.textContent = count ? 'Filters (' + count + ' active)' : 'Filters';
      };
      filters.addEventListener('change', update); update();
      wrap([document.querySelector('.shub-view-switcher'), document.getElementById('shub-cat-grid'), document.getElementById('shub-goals-grid')], 'Categories & needs');
    }
    const detail = document.querySelector('.voter-overview-main')?.closest('section') || document.querySelector('.enterprise-detail-command');
    if (detail) {
      document.body.classList.add('mobile-service-detail-ready');
      wrap([document.querySelector('.voter-trust-row')], 'Service standards');
      const nativeMain = detail.querySelector('.voter-overview-main');
      if (nativeMain && !detail.querySelector('.edc-summary')) {
        const action = document.createElement('a'); action.href = '#service-options';
        action.className = 'btn btn-primary mobile-native-action'; action.textContent = 'Choose your service task';
        if (location.pathname.endsWith('/service-pan-card.html')) {
          action.href = 'service-pan-card.html'; action.dataset.quickOrder = 'pan'; action.textContent = 'Choose PAN task';
        }
        const heading = nativeMain.querySelector('h1');
        if (heading) heading.parentElement.after(action); else nativeMain.prepend(action);
        wrap([nativeMain.querySelector('.voter-flow-chain')?.parentElement], 'How the application works');
        wrap([nativeMain.querySelector('.voter-assist-wrap')], 'How we assist');
        nativeMain.querySelectorAll('.voter-flow-kicker').forEach(kicker => {
          if (kicker.closest('details')) return;
          const text = kicker.textContent.trim().toLowerCase();
          if (text.includes('assist')) wrap([kicker.parentElement], 'How we assist');
          if (text.includes('need')) wrap([kicker.parentElement], 'Document checklist');
        });
        if (location.pathname.endsWith('/service-pan-card.html')) {
          document.querySelectorAll('.enterprise-sticky-actions .esa-apply').forEach(link => {
            link.href = 'service-pan-card.html'; link.dataset.quickOrder = 'pan'; link.textContent = 'Choose PAN task';
          });
        }
        wrap([document.getElementById('eligibility-section')], 'Eligibility and documents');
        wrap([document.getElementById('gst-tabs-section')], 'Eligibility and document checklist');
        wrap([document.getElementById('timeline-section')], 'Processing timeline');
        const advisory = document.getElementById('advisory-modal');
        if (advisory) {
          const paragraph = advisory.querySelector('p');
          if (paragraph) {
            const note = document.createElement('p'); note.className = 'mobile-service-advisory'; note.textContent = paragraph.textContent;
            nativeMain.append(note);
          }
        }
      }

      const feeGrid = detail.querySelector('.edc-transparent-pricing-grid');
      if (feeGrid) {
        const fee = feeGrid.firstElementChild;
        feeGrid.replaceChildren(...(fee ? [fee] : []));
        const note = document.createElement('p');
        note.textContent = 'Review the selected task and server-confirmed total at checkout. Government or third-party fees are separate unless explicitly included for that task.';
        feeGrid.append(note);
        const heading = detail.querySelector('.edc-pricing-transparency-card .edc-section-head strong');
        if (heading) heading.textContent = 'Selected task rules apply';
      }
      detail.querySelectorAll('.edc-doc-req-tag').forEach(tag => { tag.textContent = 'Check for task'; });
      const processLabel = detail.querySelector('.edc-active-step-tag');
      if (processLabel) processLabel.textContent = 'Process overview';
      detail.querySelectorAll('.edc-step-item, .edc-step-divider').forEach(step => step.classList.remove('is-current', 'is-complete'));
      wrap([detail.querySelector('.edc-trust-section')], 'How we assist');
      wrap([detail.querySelector('.edc-eligibility-docs-card')], 'Eligibility and document checklist');
      wrap([detail.querySelector('.edc-pricing-transparency-card')], 'Fee details and exclusions');
      wrap([detail.querySelector('.edc-timeline-card')], 'Application process');
      if (location.pathname.endsWith('/service-pan-card.html')) {
        detail.querySelectorAll('.edc-primary-action, .edc-sticky-apply').forEach(link => {
          link.href = 'service-pan-card.html'; link.dataset.quickOrder = 'pan'; link.textContent = 'Choose PAN task';
        });
        detail.querySelectorAll('.edc-summary [data-pricing-slot]').forEach(price => {
          price.removeAttribute('data-pricing-slot'); price.textContent = 'Select task for price';
        });
        const hint = detail.querySelector('.edc-action-micro-hint');
        if (hint) hint.textContent = 'Choose your exact task to see its price and requirements.';
      }
      detail.querySelectorAll('.edc-sub-hint').forEach(hint => {
        if (hint.textContent.includes('Max 5 MB')) hint.textContent = 'Accepted: PDF, JPG, PNG • Max 3 MB per file. Exact requirements appear for your selected task.';
      });
    }
    function sync() { disclosures.forEach(details => { details.open = !phone.matches; }); }
    phone.addEventListener('change', sync); sync();
  }
  // Deferred directory script runs after parsing; build its disclosures before
  // the shared app releases the first paint. Detail pages need generated content.
  if (document.querySelector('.shub-toolbar-filters')) setup();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
