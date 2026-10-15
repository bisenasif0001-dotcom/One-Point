const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Refine service-business-registration-corporate-setup.html
function refineCorporateSetup() {
  const file = path.join(ROOT_DIR, 'service-business-registration-corporate-setup.html');
  let content = fs.readFileSync(file, 'utf8');

  // Add mobile CSS if not already present
  if (!content.includes('/* Phase 9: Mobile Responsive Entity Comparison Matrix */')) {
    const targetCss = '.biz-matrix-table tbody tr:hover {\r\n        background: #f8fafc;\r\n      }';
    const altTargetCss = '.biz-matrix-table tbody tr:hover {\n        background: #f8fafc;\n      }';
    const replacementCss = `      .biz-matrix-table tbody tr:hover {
        background: #f8fafc;
      }
      /* Phase 9: Mobile Responsive Entity Comparison Matrix */
      @media (max-width: 860px) {
        .biz-matrix-table-wrap {
          overflow-x: visible;
          border: none;
        }
        .biz-matrix-table {
          display: block;
          min-width: 0 !important;
          width: 100%;
        }
        .biz-matrix-table thead {
          display: none;
        }
        .biz-matrix-table tbody {
          display: grid;
          gap: 14px;
        }
        .biz-matrix-table tbody tr {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 16px;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }
        .biz-matrix-table td {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0 !important;
          border-bottom: 1px dashed #f1f5f9;
          font-size: 0.84rem;
          flex-wrap: wrap;
          gap: 6px;
        }
        .biz-matrix-table td:first-child {
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 10px !important;
        }
        .biz-matrix-table td:last-child {
          border-bottom: none;
          padding-top: 10px !important;
        }
        .biz-matrix-table td:last-child .biz-table-btn {
          width: 100%;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .biz-matrix-table td::before {
          content: attr(data-label);
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          margin-right: 8px;
        }
        .biz-matrix-table td:first-child::before,
        .biz-matrix-table td:last-child::before {
          display: none;
        }
      }`;

    if (content.includes(targetCss)) {
      content = content.replace(targetCss, replacementCss);
    } else if (content.includes(altTargetCss)) {
      content = content.replace(altTargetCss, replacementCss);
    }
  }

  // Add data-label to table cells
  content = content.replace(
    /<tr>\s*<td>\s*<div class="biz-entity-name-cell">/g,
    '<tr>\n                    <td data-label="Entity Structure">\n                      <div class="biz-entity-name-cell">'
  );
  content = content.replace(
    /<td><span class="biz-pill-badge">/g,
    '<td data-label="Min Owners / Directors"><span class="biz-pill-badge">'
  );
  content = content.replace(
    /<td><strong>(GST \/ Udyam|Partnership Deed|MCA Incorporation Certificate|MCA SPICe\+|MCA Incorporation &amp; Nominee)/g,
    '<td data-label="Key Registration Proof"><strong>$1'
  );
  content = content.replace(
    /<td>(Small shops, retail traders|Family businesses|Professional services|Startups seeking|Solo founders wanting)/g,
    '<td data-label="Suitable For">$1'
  );
  content = content.replace(
    /<td><span class="biz-sla-pill">/g,
    '<td data-label="Turnaround &amp; SLA"><span class="biz-sla-pill">'
  );
  content = content.replace(
    /<td><a class="biz-table-btn"/g,
    '<td data-label="Action"><a class="biz-table-btn"'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated service-business-registration-corporate-setup.html');
}

// 2. Refine service-gst-registration.html
function refineGst() {
  const file = path.join(ROOT_DIR, 'service-gst-registration.html');
  let content = fs.readFileSync(file, 'utf8');

  // Add mobile CSS for tax-fee-table
  if (!content.includes('/* Phase 9: Mobile Responsive Tax Fee Table */')) {
    const target = '.tax-fee-table .tax-fee-total {\r\n        font-weight: 850;\r\n        color: #075092;\r\n        font-size: 0.92rem;\r\n      }';
    const altTarget = '.tax-fee-table .tax-fee-total {\n        font-weight: 850;\n        color: #075092;\n        font-size: 0.92rem;\n      }';
    const rep = `      .tax-fee-table .tax-fee-total {
        font-weight: 850;
        color: #075092;
        font-size: 0.92rem;
      }
      /* Phase 9: Mobile Responsive Tax Fee Table */
      @media (max-width: 768px) {
        .tax-fee-table-wrap {
          overflow-x: visible;
          border: none;
        }
        .tax-fee-table {
          display: block;
          width: 100%;
        }
        .tax-fee-table thead {
          display: none;
        }
        .tax-fee-table tbody {
          display: grid;
          gap: 12px;
        }
        .tax-fee-table tr {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
        }
        .tax-fee-table td {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0 !important;
          border-bottom: 1px dashed #f1f5f9;
          font-size: 0.85rem;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tax-fee-table td:first-child {
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 8px !important;
        }
        .tax-fee-table td:last-child {
          border-bottom: none;
        }
        .tax-fee-table td::before {
          content: attr(data-label);
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.03em;
        }
        .tax-fee-table td:first-child::before {
          display: none;
        }
      }`;

    if (content.includes(target)) {
      content = content.replace(target, rep);
    } else if (content.includes(altTarget)) {
      content = content.replace(altTarget, rep);
    }
  }

  // Add data-labels in tbody
  content = content.replace(
    /<tr>\s*<td><strong>(.*?)<\/strong><\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td class="tax-fee-total">(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gs,
    '<tr>\n                    <td data-label="Service Category"><strong>$1</strong></td>\n                    <td data-label="Govt Portal Fee">$2</td>\n                    <td data-label="Operator Assistance">$3</td>\n                    <td data-label="Estimated Total" class="tax-fee-total">$4</td>\n                    <td data-label="Turnaround Time">$5</td>\n                  </tr>'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated service-gst-registration.html');
}

// 3. Refine service-income-tax-assistance.html
function refineIncomeTax() {
  const file = path.join(ROOT_DIR, 'service-income-tax-assistance.html');
  let content = fs.readFileSync(file, 'utf8');

  // Add mobile CSS for tax-fee-table
  if (!content.includes('/* Phase 9: Mobile Responsive Tax Fee Table */')) {
    const target = '.tax-fee-table .tax-fee-total {\r\n        font-weight: 850;\r\n        color: #075092;\r\n        font-size: 0.92rem;\r\n      }';
    const altTarget = '.tax-fee-table .tax-fee-total {\n        font-weight: 850;\n        color: #075092;\n        font-size: 0.92rem;\n      }';
    const rep = `      .tax-fee-table .tax-fee-total {
        font-weight: 850;
        color: #075092;
        font-size: 0.92rem;
      }
      /* Phase 9: Mobile Responsive Tax Fee Table */
      @media (max-width: 768px) {
        .tax-fee-table-wrap {
          overflow-x: visible;
          border: none;
        }
        .tax-fee-table {
          display: block;
          width: 100%;
        }
        .tax-fee-table thead {
          display: none;
        }
        .tax-fee-table tbody {
          display: grid;
          gap: 12px;
        }
        .tax-fee-table tr {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
        }
        .tax-fee-table td {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0 !important;
          border-bottom: 1px dashed #f1f5f9;
          font-size: 0.85rem;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tax-fee-table td:first-child {
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 8px !important;
        }
        .tax-fee-table td:last-child {
          border-bottom: none;
        }
        .tax-fee-table td::before {
          content: attr(data-label);
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.03em;
        }
        .tax-fee-table td:first-child::before {
          display: none;
        }
      }`;

    if (content.includes(target)) {
      content = content.replace(target, rep);
    } else if (content.includes(altTarget)) {
      content = content.replace(altTarget, rep);
    }
  }

  // Add data-labels in tbody
  content = content.replace(
    /<tr>\s*<td><strong>(.*?)<\/strong><\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td class="tax-fee-total">(.*?)<\/td>\s*<\/tr>/gs,
    '<tr>\n                    <td data-label="Service Category"><strong>$1</strong></td>\n                    <td data-label="Govt Portal Fee">$2</td>\n                    <td data-label="Operator Assistance">$3</td>\n                    <td data-label="Total Estimated" class="tax-fee-total">$4</td>\n                  </tr>'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated service-income-tax-assistance.html');
}

// 4. Refine business-online-setup-services.html
function refineBusinessOnline() {
  const file = path.join(ROOT_DIR, 'business-online-setup-services.html');
  let content = fs.readFileSync(file, 'utf8');

  // Add mobile CSS for bos-estimate-table
  if (!content.includes('/* Phase 9: Mobile Responsive Estimate Table */')) {
    const target = '.bos-table-tag-actual {\r\n        font-size: 12px;\r\n        font-weight: 750;\r\n        color: #92400e;\r\n        background: var(--bos-gold-light);\r\n        border: 1px solid var(--bos-gold-border);\r\n        padding: 3px 10px;\r\n        border-radius: 999px;\r\n      }';
    const altTarget = '.bos-table-tag-actual {\n        font-size: 12px;\n        font-weight: 750;\n        color: #92400e;\n        background: var(--bos-gold-light);\n        border: 1px solid var(--bos-gold-border);\n        padding: 3px 10px;\n        border-radius: 999px;\n      }';
    const rep = `      .bos-table-tag-actual {
        font-size: 12px;
        font-weight: 750;
        color: #92400e;
        background: var(--bos-gold-light);
        border: 1px solid var(--bos-gold-border);
        padding: 3px 10px;
        border-radius: 999px;
      }
      /* Phase 9: Mobile Responsive Estimate Table */
      @media (max-width: 680px) {
        .bos-estimate-table-wrap {
          padding: 14px 16px;
          overflow-x: visible;
        }
        .bos-estimate-table {
          display: block;
          width: 100%;
        }
        .bos-estimate-table thead {
          display: none;
        }
        .bos-estimate-table tbody {
          display: grid;
          gap: 12px;
        }
        .bos-estimate-table tr {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border: 1.5px solid var(--bos-border);
          border-radius: 12px;
          padding: 12px 14px;
          gap: 6px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
        }
        .bos-estimate-table td {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0 !important;
          border-bottom: 1px dashed var(--bos-border);
          font-size: 0.85rem;
          flex-wrap: wrap;
          gap: 6px;
        }
        .bos-estimate-table td:first-child {
          border-bottom: 1.5px solid var(--bos-border);
          padding-bottom: 8px !important;
        }
        .bos-estimate-table td:last-child {
          border-bottom: none;
        }
        .bos-estimate-table td::before {
          content: attr(data-label);
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--bos-muted);
          letter-spacing: 0.03em;
        }
        .bos-estimate-table td:first-child::before {
          display: none;
        }
      }`;

    if (content.includes(target)) {
      content = content.replace(target, rep);
    } else if (content.includes(altTarget)) {
      content = content.replace(altTarget, rep);
    }
  }

  // Add data-labels in tbody
  content = content.replace(
    /<tr>\s*<td><strong>(.*?)<\/strong><\/td>\s*<td>(.*?)<\/td>\s*<td(.*?)>(.*?)<\/td>\s*<\/tr>/gs,
    '<tr>\n                    <td data-label="Service Component"><strong>$1</strong></td>\n                    <td data-label="Included Status">$2</td>\n                    <td data-label="Typical Turnaround"$3>$4</td>\n                  </tr>'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated business-online-setup-services.html');
}

// 5. Refine CTAs in service-ration-card-assistance.html & service-transport-rto-facilitation.html
function refineCtas() {
  // Ration card pre-footer CTA
  const rationFile = path.join(ROOT_DIR, 'service-ration-card-assistance.html');
  let rationContent = fs.readFileSync(rationFile, 'utf8');
  rationContent = rationContent.replace(
    'Start Application <i data-lucide="arrow-right"></i>',
    'Request Assistance <i data-lucide="arrow-right"></i>'
  );
  fs.writeFileSync(rationFile, rationContent, 'utf8');
  console.log('Updated service-ration-card-assistance.html pre-footer CTA');

  // RTO pre-footer CTA
  const rtoFile = path.join(ROOT_DIR, 'service-transport-rto-facilitation.html');
  let rtoContent = fs.readFileSync(rtoFile, 'utf8');
  rtoContent = rtoContent.replace(
    '<i data-lucide="file-plus-2"></i> Start Application',
    '<i data-lucide="file-plus-2"></i> Select RTO Service'
  );
  fs.writeFileSync(rtoFile, rtoContent, 'utf8');
  console.log('Updated service-transport-rto-facilitation.html pre-footer CTA');

  // Legal drafting guarantee wording
  const legalFile = path.join(ROOT_DIR, 'service-legal-drafting-court-services.html');
  let legalContent = fs.readFileSync(legalFile, 'utf8');
  legalContent = legalContent.replace(
    'Pre-Delivery WhatsApp Proofing &amp; Free Revision Guarantee',
    'Pre-Delivery WhatsApp Proofing &amp; Free Operator Revisions'
  );
  fs.writeFileSync(legalFile, legalContent, 'utf8');
  console.log('Updated service-legal-drafting-court-services.html claim wording');
}

try {
  refineCorporateSetup();
  refineGst();
  refineIncomeTax();
  refineBusinessOnline();
  refineCtas();
  console.log('All Phase 9 refinements successfully applied.');
} catch (err) {
  console.error('Error applying refinements:', err);
  process.exit(1);
}
