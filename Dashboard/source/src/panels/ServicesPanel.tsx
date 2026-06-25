import React, { useEffect, useMemo, useState } from 'react';
import { PanelHeader, Badge, Icon } from '../Shared';

type CatalogType = 'service' | 'product';

type CatalogItem = {
  type: CatalogType;
  slug: string;
  name: string;
  category: string;
  price: number;
  taxRate: number;
  active: boolean;
  duration?: string;
  icon?: string;
  sla?: string;
  requiredDocs?: string[];
  automationCount?: number;
  imageUrl?: string;
};

type Draft = {
  type: CatalogType;
  slug: string;
  name: string;
  category: string;
  price: string;
  taxRate: string;
  active: boolean;
  duration: string;
  icon: string;
  sla: string;
  requiredDocs: string;
  automationCount: string;
  imageUrl: string;
};


const DEFAULT_CATEGORIES = [
  'E-Services',
  'EduPoint',
  'ProServe',
  'CSC Services',
  'Documentation',
  'Bill & Recharge',
  'Travel Services',
  'Design Services',
];

const defaultDraft: Draft = {
  type: 'service',
  slug: '',
  name: '',
  category: 'E-Services',
  price: '199',
  taxRate: '0',
  active: true,
  duration: '1-3 Days',
  icon: 'layers',
  sla: '95%',
  requiredDocs: 'Identity proof, Mobile number',
  automationCount: '2',
  imageUrl: '',
};

const money = (amount: any) => `Rs. ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function docsText(item?: CatalogItem) {
  return (item?.requiredDocs || []).join(', ');
}

function toDraft(item: CatalogItem): Draft {
  return {
    type: item.type,
    slug: item.slug,
    name: item.name,
    category: item.category,
    price: String(item.price || 0),
    taxRate: String(item.taxRate || 0),
    active: item.active,
    duration: item.duration || '',
    icon: item.icon || (item.type === 'product' ? 'shopping-bag' : 'layers'),
    sla: item.sla || '',
    requiredDocs: docsText(item),
    automationCount: String(item.automationCount || 0),
    imageUrl: item.imageUrl || '',
  };
}

function copyDraftForDuplicate(item: CatalogItem): Draft {
  return {
    ...toDraft(item),
    slug: `${item.slug}-copy`,
    name: `${item.name} Copy`,
    active: false,
  };
}

async function getCsrfToken() {
  const response = await fetch('/api/csrf');
  const data = await response.json().catch(() => ({}));
  return data.csrfToken || '';
}

async function adminCatalogFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'X-Admin-Token': localStorage.getItem('opds_admin_token') || '',
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    const csrf = await getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Catalog sync failed.');
  return data;
}

function normalizeCatalog(data: any): CatalogItem[] {
  const all = [
    ...(Array.isArray(data?.services) ? data.services : []),
    ...(Array.isArray(data?.products) ? data.products : []),
    ...(Array.isArray(data) ? data : []),
  ];
  return all
    .filter((item: any) => item.type === 'service' || !item.type)
    .sort((a, b) => `${a.category}-${a.name}`.localeCompare(`${b.category}-${b.name}`));
}

export const ServicesPanel = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const loadCatalog = async () => {
    setLoading(true);
    setShowTokenInput(false);
    try {
      const data = await adminCatalogFetch('/api/admin/catalog');
      setItems(normalizeCatalog(data));
      setNotice('Website catalog synced (admin view — includes inactive items).');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Catalog sync failed.';
      if (msg.toLowerCase().includes('admin token') || msg.toLowerCase().includes('auth')) {
        // Fallback: load the public catalog so at least live services are visible
        try {
          const pub = await fetch('/api/products');
          const pubData = await pub.json().catch(() => ({}));
          setItems(normalizeCatalog(pubData));
          setNotice('Showing public catalog (active items only). Enter admin token below to unlock full management.');
        } catch {
          setNotice('Could not reach server. Make sure the backend is running.');
        }
        setShowTokenInput(true);
      } else {
        setNotice(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveAdminToken = () => {
    const t = tokenInput.trim();
    if (!t) return;
    localStorage.setItem('opds_admin_token', t);
    setTokenInput('');
    loadCatalog();
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const categories = useMemo(() => {
    const fromItems = items.map(item => item.category).filter(Boolean);
    const categoryList = Array.from(new Set<string>([...fromItems, ...DEFAULT_CATEGORIES]));
    return ['All', ...categoryList.sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      if (activeCat !== 'All' && item.category !== activeCat) return false;
      if (query && !`${item.name} ${item.slug} ${item.category}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, activeCat, search]);

  const activeCount = items.filter(item => item.active).length;
  const totalCount = items.length;
  const categoryCount = useMemo(() => new Set(items.map(i => i.category).filter(Boolean)).size, [items]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
    setDraft({ ...defaultDraft, type: 'service', category: 'E-Services', icon: 'layers', requiredDocs: 'Identity proof, Mobile number' });
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setEditorOpen(true);
    setDraft(toDraft(item));
  };

  const openDuplicate = (item: CatalogItem) => {
    setEditing(null);
    setEditorOpen(true);
    setDraft(copyDraftForDuplicate(item));
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditing(null);
    setDraft(defaultDraft);
  };

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await adminCatalogFetch('/api/admin/catalog', {
        method: 'POST',
        body: JSON.stringify({
          ...draft,
          requiredDocs: draft.requiredDocs.split(',').map(doc => doc.trim()).filter(Boolean),
          price: Number(draft.price || 0),
          taxRate: Number(draft.taxRate || 0),
          automationCount: Number(draft.automationCount || 0),
        }),
      });
      setItems(normalizeCatalog(data.catalog || data));
      setNotice(`${draft.name} saved. Website forms and checkout are now using this catalog.`);
      closeEditor();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const data = await adminCatalogFetch('/api/admin/catalog', {
        method: 'DELETE',
        body: JSON.stringify({ type: deleteTarget.type, slug: deleteTarget.slug }),
      });
      setItems(normalizeCatalog(data.catalog || data));
      setNotice(`${deleteTarget.name} removed from website catalog. Old orders stay safe.`);
      setDeleteTarget(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader
        title="Service Templates"
        sub="Website catalog, pricing, required docs, and automation controls"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={loadCatalog} disabled={loading}>
              <Icon name="refresh-cw" size={14} /> Sync Website
            </button>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Icon name="plus" size={14} /> Add Service
            </button>
          </div>
        }
      />

      <div className="panels" style={{ flex: 1, paddingBottom: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grid-3">
          <div className="insight-card info" style={{ padding: 16 }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Active Services</div>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', marginTop: 4 }}>{activeCount}</div>
          </div>
          <div className="insight-card positive" style={{ padding: 16 }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Total Services</div>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--emerald)', marginTop: 4 }}>{totalCount}</div>
          </div>
          <div className="insight-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Categories</div>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--blue)', marginTop: 4 }}>{categoryCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button
                key={c}
                className={`btn btn-sm ${activeCat === c ? 'btn-primary' : 'btn-ghost'}`}
                style={{ whiteSpace: 'nowrap', ...(activeCat !== c ? { border: '1px solid var(--border-1)', color: 'var(--text-2)' } : {}) }}
                onClick={() => setActiveCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                <Icon name="search" size={14} />
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="Search services..."
                style={{ paddingLeft: 32, fontSize: 'var(--fs-sm)', height: 34 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {notice && (
          <div style={{ border: '1px solid var(--blue-border)', background: 'var(--blue-dim)', color: 'var(--text-1)', borderRadius: 8, padding: '10px 12px', fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="info" size={14} style={{ color: 'var(--blue)' }} />
            {notice}
          </div>
        )}

        {showTokenInput && (
          <div style={{ border: '1px solid var(--amber)', background: 'rgba(201,146,26,0.08)', borderRadius: 8, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="key" size={18} style={{ color: 'var(--amber)', marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'var(--fw-semibold)', marginBottom: 4, color: 'var(--text-1)' }}>Admin Token Required</div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-2)', marginBottom: 10 }}>
                Enter your admin API token to sync the live website catalog. You can find this in your server config or <code>.env</code> file as <code>ADMIN_API_TOKEN</code>.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ flex: 1, fontSize: 'var(--fs-sm)', height: 36 }}
                  placeholder="Paste admin token here..."
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveAdminToken()}
                  autoComplete="off"
                />
                <button className="btn btn-primary btn-sm" onClick={saveAdminToken} disabled={!tokenInput.trim()}>
                  <Icon name="check" size={14} /> Connect
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid-3" style={{ overflowY: 'auto', paddingBottom: 24 }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              <Icon name="loader" size={28} className="spin" style={{ marginBottom: 8 }} />
              <div>Loading live website catalog...</div>
            </div>
          ) : filtered.map(item => (
            <div key={`${item.type}-${item.slug}`} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-3)', border: '1px solid var(--border-1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={item.icon || 'layers'} size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', fontWeight: 'var(--fw-semibold)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{item.category}</span>
                      <Badge type="info">service</Badge>
                    </div>
                    <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)', color: 'var(--text-1)', lineHeight: 1.25 }}>{item.name}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 3 }}>{item.slug}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10, margin: '12px 0 16px', flex: 1, borderTop: '1px solid var(--border-1)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="tag" size={14} /> Website Price</span>
                    <strong>{money(item.price)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="clock" size={14} /> Est. Duration</span>
                    <span style={{ fontWeight: 'var(--fw-semibold)' }}>{item.duration || 'Not set'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="activity" size={14} /> Target SLA</span>
                    <span style={{ fontWeight: 'var(--fw-semibold)', color: item.sla ? 'var(--emerald)' : 'var(--text-3)' }}>{item.sla || 'Not set'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="bot" size={14} /> Auto Tasks</span>
                    <Badge type={item.automationCount ? 'info' : 'neutral'}>{item.automationCount || 0} configured</Badge>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 6, fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Required documents</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(item.requiredDocs || []).length ? item.requiredDocs!.map(doc => (
                        <span key={doc} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', color: 'var(--text-2)', padding: '3px 8px', borderRadius: 4, fontSize: 'var(--fs-xs)' }}>{doc}</span>
                      )) : <span style={{ color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>No checklist set</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border-1)', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge type={item.active ? 'success' : 'danger'}>{item.active ? 'Live on website' : 'Hidden'}</Badge>
                    {item.active && <Badge type="info"><Icon name="globe" size={11} /> Synced</Badge>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-icon-sm" title="Edit Template" onClick={() => openEdit(item)}><Icon name="edit-2" size={14} /></button>
                    <button className="btn-icon-sm" title="Duplicate" onClick={() => openDuplicate(item)}><Icon name="copy" size={14} /></button>
                    <button className="btn-icon-sm" title="Remove from website" onClick={() => setDeleteTarget(item)}><Icon name="trash-2" size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
              <Icon name="search" size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>No services found</div>
              <div style={{ fontSize: 'var(--fs-sm)' }}>Try another category or search, or add a new service.</div>
            </div>
          )}
        </div>
      </div>

      {editorOpen && (
        <div className="modal-overlay" onClick={closeEditor}>
          <form className="modal-content" onClick={e => e.stopPropagation()} onSubmit={saveItem} style={{ width: 760, maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{editing ? 'Edit Service' : 'Add Service'}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Changes reflect on website forms and checkout after saving.</div>
              </div>
              <button type="button" className="icon-btn" onClick={closeEditor}><Icon name="x" size={16} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="form-group">
                <span className="form-label">Category</span>
                <input className="form-input" list="catalog-categories" value={draft.category} onChange={e => setDraft(prev => ({ ...prev, category: e.target.value }))} required />
              </label>
              <label className="form-group">
                <span className="form-label">Name</span>
                <input className="form-input" value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} required />
              </label>
              <label className="form-group">
                <span className="form-label">Slug</span>
                <input className="form-input" value={draft.slug} placeholder="Auto from name if empty" onChange={e => setDraft(prev => ({ ...prev, slug: e.target.value }))} />
              </label>
              <label className="form-group">
                <span className="form-label">Base Price</span>
                <input type="number" min="0" className="form-input" value={draft.price} onChange={e => setDraft(prev => ({ ...prev, price: e.target.value }))} required />
              </label>
              <label className="form-group">
                <span className="form-label">Tax Rate (%)</span>
                <input type="number" min="0" className="form-input" value={draft.taxRate} onChange={e => setDraft(prev => ({ ...prev, taxRate: e.target.value }))} />
              </label>
              <label className="form-group">
                <span className="form-label">Duration</span>
                <input className="form-input" value={draft.duration} onChange={e => setDraft(prev => ({ ...prev, duration: e.target.value }))} />
              </label>
              <label className="form-group">
                <span className="form-label">Icon</span>
                <input className="form-input" value={draft.icon} onChange={e => setDraft(prev => ({ ...prev, icon: e.target.value }))} />
              </label>
              <label className="form-group">
                <span className="form-label">Target SLA</span>
                <input className="form-input" value={draft.sla} onChange={e => setDraft(prev => ({ ...prev, sla: e.target.value }))} />
              </label>
              <label className="form-group">
                <span className="form-label">Automation Count</span>
                <input type="number" min="0" className="form-input" value={draft.automationCount} onChange={e => setDraft(prev => ({ ...prev, automationCount: e.target.value }))} />
              </label>
              <label className="form-group" style={{ gridColumn: '1 / -1' }}>
                <span className="form-label">Required Docs / Customer Inputs</span>
                <textarea className="form-input" rows={3} value={draft.requiredDocs} onChange={e => setDraft(prev => ({ ...prev, requiredDocs: e.target.value }))} placeholder="Comma separated checklist" />
              </label>
            </div>

            <datalist id="catalog-categories">
              {categories.filter(c => c !== 'All').map(category => <option key={category} value={category} />)}
            </datalist>

            <label style={{ marginTop: 16, border: '1px solid var(--border-1)', background: 'var(--bg-3)', borderRadius: 8, padding: 12, display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.active} onChange={e => setDraft(prev => ({ ...prev, active: e.target.checked }))} />
              <span>
                <strong style={{ display: 'block' }}>Show this item on website</strong>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Turn off to hide it from forms and checkout without deleting order history.</span>
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-1)' }}>
              <button type="button" className="btn btn-ghost" onClick={closeEditor}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Icon name={saving ? 'loader' : 'save'} size={14} className={saving ? 'spin' : ''} /> Save & Sync Website
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 460 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--rose-dim)', color: 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trash-2" size={20} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)' }}>Remove from website?</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', marginTop: 4 }}>{deleteTarget.name} will be hidden from website forms and checkout. Existing orders and invoices stay intact.</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--rose)', borderColor: 'var(--rose)' }} onClick={deleteItem} disabled={saving}>
                <Icon name={saving ? 'loader' : 'trash-2'} size={14} className={saving ? 'spin' : ''} /> Hide Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
