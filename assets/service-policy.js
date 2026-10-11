(function (root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.OPDSServicePolicy = rules;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const aliases = Object.freeze({
    'fssai-license': 'fssai', 'trademark-registration': 'trademark',
    'flight-ticket': 'flight-booking', 'flight-booking': 'flight-booking',
    'train-ticket-booking': 'train-ticket', 'tour-package-assistance': 'tour-package',
    'photocopy-print': 'photocopy-printing', 'photocopy-and-print': 'photocopy-printing',
    'scanning': 'document-scanning', 'pension-assistance': 'pension',
    'fastag-recharge': 'fastag', 'recharge-and-bills': 'electricity-bill',
    'social-media-creative': 'social-media-post', 'travel-booking': 'bus-ticket', 'general-support': 'jan-seva'
  });
  const unique = values => [...new Set(values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
  const docs = item => Array.isArray(item?.requiredDocs) ? item.requiredDocs : [];
  function resolve(catalog, slug, type = 'service') {
    if (!catalog || !slug) return null;
    if (type === 'service') slug = aliases[slug] || slug;
    const list = type === 'product' ? catalog.products || [] : catalog.services || [];
    const main = list.find(item => item.slug === slug && item.active !== false);
    const variant = type === 'service' ? (catalog.serviceVariants || []).find(item => item.slug === slug && item.active !== false) : null;
    const selected = variant || main;
    if (!selected) return null;
    // Variant pricing follows the backend's exact-slug precedence. Same-ID main
    // requirements are retained too, so generic variant defaults cannot relax them.
    const required = unique([...docs(selected), ...docs(main), ...(main?.serviceDna?.documentLayer?.required || [])]);
    const optional = unique(main?.serviceDna?.documentLayer?.optional || []).filter(label => !required.includes(label));
    const model = type === 'product' ? 'catalog_product' : selected.pricingModel || selected.pricing?.model || 'unconfirmed';
    const policy = {
      version: 1, id: slug, type, name: selected.name, parentId: variant?.parentSlug || null,
      fields: { required: ['name', 'phone', 'email'], optional: ['address'], conditional: [] },
      pricing: { model, amount: Number(selected.pricing?.payableAmount ?? selected.price ?? 0),
        includesGovernmentFee: selected.pricing?.includesGovernmentFee === true,
        displayPrice: selected.displayPrice || selected.pricing?.displayPrice || '',
        note: selected.pricing?.customerPriceNote || '',
        label: model === 'starting_from' ? 'Starting price' : model === 'service_charge_plus_actual' ? 'Service charge' : 'Total fee' },
      purchase: { mode: model === 'starting_from' ? 'scope_review' : model === 'service_charge_plus_actual' ? 'assistance_plus_actual' : type === 'product' ? 'catalog_product' : model === 'all_inclusive' ? 'fixed_service' : 'unconfirmed',
        finalScopeConfirmed: model === 'all_inclusive', configurationRules: type === 'product' ? 'unconfirmed' : null },
      documents: { required, optional, conditional: main?.serviceDna?.documentLayer?.conditional || [],
        submission: 'existing_upload_or_whatsapp_later', fulfilmentReviewRequired: true,
        source: variant && main ? 'exact_variant_and_same_id_main' : 'exact_catalog_item' },
      fulfilment: { duration: selected.duration || main?.duration || '', deliveryType: 'unconfirmed' },
      reviewNeeded: ['eligibility', 'document_deferral_per_service', 'delivery_type',
        ...(model === 'starting_from' ? ['scope_and_quote_approval'] : []),
        ...(type === 'product' ? ['configuration_and_quantity_pricing'] : [])]
    };
    return { ...selected, type, policy };
  }
  function validateApplicant(input = {}) {
    const errors = [];
    if (!String(input.name || '').trim()) errors.push('Customer name is required.');
    if (String(input.phone || '').replace(/\D/g, '').length < 10) errors.push('A valid phone number is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email || '').trim())) errors.push('A valid email address is required.');
    return errors;
  }
  return Object.freeze({ resolve, validateApplicant, aliases });
});
