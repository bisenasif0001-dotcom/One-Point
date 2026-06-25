import React, { useState, useEffect } from 'react';
import { Card, PanelHeader, Icon, Badge } from '../Shared';

const getAdminHeaders = () => ({
  'X-Admin-Token': localStorage.getItem('opds_admin_token') || '',
  'Content-Type': 'application/json',
});

async function getCsrf() {
  const r = await fetch('/api/csrf');
  const d = await r.json().catch(() => ({}));
  return d.csrfToken || '';
}

// Map backend catalog item → OneMart product
function mapCatalogItem(item: any) {
  return {
    id:       item.slug || item.id,
    slug:     item.slug,
    name:     item.name,
    category: item.category,
    price:    item.price || Math.round((item.price_paise || 0) / 100),
    stock:    item.stock || item.automationCount || 99,
    synced:   Boolean(item.active),
    img:      item.icon || 'package',
    type:     item.type,
  };
}

const PRODUCT_CATEGORIES = [
  'Personalized Gifts',
  'Sticker Printing',
  'T-Shirt Printing',
  'UV DTF Printing',
  'Business Branding',
];

export const OneMartPanel = () => {
  const [products, setProducts]         = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isSyncing, setIsSyncing]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [saveMsg, setSaveMsg]           = useState('');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Load catalog from backend — products only
  async function loadCatalog() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/catalog', { headers: getAdminHeaders() });
      const d = await r.json();
      const rawProducts = Array.isArray(d.products) ? d.products : Array.isArray(d) ? d.filter((i: any) => i.type === 'product') : [];
      setProducts(rawProducts.map(mapCatalogItem));
    } catch {
      // Fallback: public endpoint, filter products
      try {
        const r = await fetch('/api/products');
        const d = await r.json().catch(() => ({}));
        const raw = [
          ...(Array.isArray(d.products) ? d.products : []),
          ...(Array.isArray(d) ? d.filter((i: any) => i.type === 'product') : []),
        ];
        setProducts(raw.map(mapCatalogItem));
      } catch { /* offline — keep local state */ }
    }
    setLoading(false);
  }

  useEffect(() => { loadCatalog(); }, []);

  const categories = ['All', ...Array.from(new Set([...PRODUCT_CATEGORIES, ...products.map(p => p.category).filter(Boolean)]))];
  const filteredProducts = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);

  async function handleSync() {
    setIsSyncing(true);
    setSaveMsg('');
    try {
      // Reload from backend — this IS the sync (catalog is source of truth)
      await loadCatalog();
      setSaveMsg('✓ Catalog synced from website backend.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { setSaveMsg('✗ Sync failed — check backend.'); }
    setIsSyncing(false);
  }

  async function handleSaveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name     = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || '');
    const price    = Number(formData.get('price') || 0);
    const slug     = editingProduct?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

    if (!name) return;
    try {
      const csrf = await getCsrf();
      await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'X-CSRF-Token': csrf },
        body: JSON.stringify({ type: 'product', slug, name, category, price: price, price_paise: price * 100, tax_rate: 18, active: 1 }),
      });
      await loadCatalog();
      setSaveMsg(`✓ "${name}" saved to website catalog.`);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { setSaveMsg('✗ Save failed.'); }
    setIsModalOpen(false);
  }

  async function deleteProduct(slug: string) {
    if (!confirm('Remove this item from the website catalog?')) return;
    try {
      const csrf = await getCsrf();
      await fetch('/api/admin/catalog', {
        method: 'DELETE',
        headers: { ...getAdminHeaders(), 'X-CSRF-Token': csrf },
        body: JSON.stringify({ slug }),
      });
      await loadCatalog();
    } catch { /* offline */ }
  }

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader
        title="OneMart Store"
        sub="Physical products catalog — gifts, printing, branding, stationery"
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {saveMsg && <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: saveMsg.startsWith('✓') ? 'var(--emerald)' : 'var(--rose)' }}>{saveMsg}</span>}
            <button className="btn btn-ghost" onClick={handleSync} disabled={isSyncing}>
              <Icon name={isSyncing ? 'loader-2' : 'refresh-cw'} size={15} className={isSyncing ? 'spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync with Website'}
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
              <Icon name="plus" size={15} /> Add Product
            </button>
          </div>
        }
      />

      <div className="panels" style={{ flex: 1, paddingBottom: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c} className={`btn btn-sm ${activeCategory === c ? 'btn-primary' : 'btn-ghost'}`}
              style={activeCategory === c ? { background: 'var(--blue)', color: '#fff' } : { background: 'var(--bg-2)' }}
              onClick={() => setActiveCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon name="loader-2" size={28} className="spin" style={{ marginBottom: 12 }} />
            <div>Loading catalog from website backend...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border-2)', borderRadius: 12 }}>
            <Icon name="package" size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontWeight: 'var(--fw-semibold)', marginBottom: 8 }}>No products in this category</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
              <Icon name="plus" size={13} /> Add First Product
            </button>
          </div>
        ) : (
          <div className="grid-4" style={{ overflowY: 'auto', paddingBottom: 24 }}>
            {filteredProducts.map(p => (
              <Card key={p.id} bodyClass="card-body-flush" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 120, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-1)', position: 'relative' }}>
                  <Icon name={p.img || 'package'} size={40} style={{ opacity: 0.2 }} />
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <Badge type={p.synced ? 'success' : 'warning'}>{p.synced ? '● Live' : 'Draft'}</Badge>
                  </div>
                  <div style={{ position: 'absolute', top: 10, left: 10 }}>
                    <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', background: 'var(--bg-1)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-1)', color: 'var(--text-3)' }}>{p.type || 'product'}</span>
                  </div>
                </div>
                <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', marginBottom: 4 }}>{p.category}</div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', lineHeight: 1.3, marginBottom: 8, flex: 1 }}>{p.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)' }}>₹{p.price.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', fontFamily: 'monospace' }}>{p.slug?.slice(0, 14)}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 12, borderTop: '1px solid var(--border-1)' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}><Icon name="edit-2" size={12} /> Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)' }} onClick={() => deleteProduct(p.slug)}><Icon name="trash-2" size={12} /> Remove</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input type="text" name="name" className="input" defaultValue={editingProduct?.name || ''} required style={{ width: '100%' }} placeholder="e.g. Custom T-Shirt Print" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" name="category" className="input" list="product-categories" defaultValue={editingProduct?.category || ''} style={{ width: '100%' }} placeholder="e.g. Personalized Gifts" />
                <datalist id="product-categories">
                  {PRODUCT_CATEGORIES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input type="number" name="price" className="input" defaultValue={editingProduct?.price || ''} required min="0" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProduct ? 'Save Changes' : 'Add to Catalog'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
