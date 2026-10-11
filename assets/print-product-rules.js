(function (root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.OPDSPrintProduct = rules;
})(typeof window === 'object' ? window : globalThis, function () {
  function quote(product, packs) {
    if (!product || product.slug !== 'visiting-cards' || product.active === false) throw new Error('Product unavailable');
    if (!Number.isInteger(packs) || packs < 1 || packs > 10) throw new Error('Choose between 1 and 10 packs');
    const price = Number(product.price);
    const taxRate = Number(product.taxRate || 0);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(taxRate) || taxRate < 0) throw new Error('Product price unavailable');
    const subtotal = Math.round(price * 100) * packs;
    const tax = Math.round(subtotal * taxRate / 100);
    return { subtotal: subtotal / 100, tax: tax / 100, total: (subtotal + tax) / 100,
      configuration: { packSize: 100, packs }, cards: packs * 100 };
  }
  function validate(configuration, quantity) {
    if (!configuration || Object.keys(configuration).some(key => !['packSize', 'packs'].includes(key)) || configuration.packSize !== 100 || configuration.packs !== quantity ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error('Invalid visiting-card pack selection.');
    return { packSize: 100, packs: quantity };
  }
  return Object.freeze({ quote, validate });
});
