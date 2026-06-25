import React, { useState, useEffect } from 'react';
import { PanelHeader, Card, Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';

// ─── Franchise Data ───────────────────────────────────────────────────────────
const INIT_DATA = [
  { id: 'FC_UP_LKO_01', name: 'Sharma Suvidha Kendra', owner: 'Rajesh Sharma', location: 'Alambagh, Lucknow',   phone: '9876543210', balance: 14200, tier: 'Gold',   commission: 12, orders: 89, joined: 'Jan 2026', active: true  },
  { id: 'FC_UP_KNP_02', name: 'Kanpur e-Point',         owner: 'Priya Singh',    location: 'Civil Lines, Kanpur', phone: '9512312312', balance: 450,   tier: 'Silver', commission: 8,  orders: 34, joined: 'Mar 2026', active: true  },
  { id: 'FC_UP_VNS_03', name: 'Varanasi DigiPoint',     owner: 'Suresh Gupta',   location: 'Lanka, Varanasi',    phone: '9988776655', balance: 8900,  tier: 'Gold',   commission: 10, orders: 62, joined: 'Feb 2026', active: true  },
  { id: 'FC_UP_AGR_04', name: 'Agra Smart Center',      owner: 'Meera Patel',    location: 'Sanjay Place, Agra', phone: '9812345678', balance: 200,   tier: 'Bronze', commission: 5,  orders: 12, joined: 'May 2026', active: false },
];

const TIER_COLORS: Record<string, string> = { Gold: 'var(--amber)', Silver: 'var(--text-2)', Bronze: '#cd7f32' };
const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];

const EMPTY_FORM = { name: '', owner: '', location: '', phone: '', tier: 'Silver', commission: 8, balance: 0, orders: 0, joined: '', active: true };

const FRANCHISE_STORAGE_KEY = 'opds_franchise_data';

function loadFranchises() {
  try {
    const raw = localStorage.getItem(FRANCHISE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return INIT_DATA;
}

export const FranchisePanel: React.FC = () => {
  const { addNotification, setActivePanel } = useApp() as any;
  const [franchises, setFranchises] = useState(loadFranchises);

  useEffect(() => {
    try { localStorage.setItem(FRANCHISE_STORAGE_KEY, JSON.stringify(franchises)); } catch {}
  }, [franchises]);
  const [selected, setSelected]     = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm]             = useState<any>(EMPTY_FORM);
  const [topupModal, setTopupModal] = useState<any>(null);
  const [topupAmt, setTopupAmt]     = useState('5000');

  const filtered = franchises.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.location.toLowerCase().includes(search.toLowerCase()) ||
    f.owner.toLowerCase().includes(search.toLowerCase())
  );
  const sel = franchises.find(f => f.id === selected);

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditTarget(null); setShowForm(true); };
  const openEdit = (f: any) => { setForm({ ...f }); setEditTarget(f.id); setShowForm(true); };

  const saveForm = () => {
    if (!form.name || !form.owner || !form.phone) return;
    if (editTarget) {
      setFranchises(prev => prev.map(f => f.id === editTarget ? { ...f, ...form } : f));
      addNotification({ title: 'Franchise updated', sub: form.name, time: 'just now', color: 'var(--blue)', icon: 'store', panelTarget: 'franchise' });
    } else {
      const newId = `FC_NEW_${Date.now()}`;
      setFranchises(prev => [...prev, { ...form, id: newId, balance: Number(form.balance) || 0, orders: 0, joined: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) }]);
      addNotification({ title: 'Franchise added', sub: form.name, time: 'just now', color: 'var(--emerald)', icon: 'store', panelTarget: 'franchise' });
    }
    setShowForm(false);
  };

  const toggleActive = (id: string) => {
    setFranchises(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
    const f = franchises.find(x => x.id === id);
    addNotification({ title: f?.active ? 'Franchise deactivated' : 'Franchise activated', sub: f?.name || '', time: 'just now', color: f?.active ? 'var(--rose)' : 'var(--emerald)', icon: 'store', panelTarget: 'franchise' });
  };

  const sendWhatsApp = (phone: string, name: string) => {
    const num = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Namaste ${name} ji, One Point Digital Services Franchise support se bol raha hoon. Koi madad chahiye?`);
    window.open(`https://wa.me/${num.length === 10 ? '91' + num : num}?text=${msg}`, '_blank');
  };

  const processTopup = () => {
    const amt = Number(topupAmt) || 0;
    if (!amt || !topupModal) return;
    setFranchises(prev => prev.map(f => f.id === topupModal.id ? { ...f, balance: f.balance + amt } : f));
    addNotification({ title: `Wallet Topup: ${topupModal.name}`, sub: `₹${amt.toLocaleString()} added successfully`, time: 'just now', color: 'var(--emerald)', icon: 'indian-rupee', panelTarget: 'franchise' });
    setTopupModal(null);
  };

  const totalBalance = franchises.reduce((s, f) => s + f.balance, 0);
  const lowBalanceCount = franchises.filter(f => f.balance < 1000).length;

  return (
    <div className="panel active">
      <PanelHeader title="Franchise Network" sub="Manage partner centers · Wallet & commissions" actions={
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <Icon name="plus" size={13} /> Add Franchise
        </button>
      } />

      <div className="panels">
        {/* Demo notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: 10 }}>
          <Icon name="database" size={16} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>
            <strong>Local Data Mode</strong> — Franchise records are saved in your browser (localStorage). A backend API for franchise management is not yet connected. Data added/edited here persists across page reloads on this device only.
          </div>
        </div>

        {/* KPI */}
        <div className="grid-4">
          {[
            { l: 'Total Partners',    v: String(franchises.length),                          icon: 'store',           color: 'var(--blue)',    cls: 'info' },
            { l: 'Active Centers',    v: String(franchises.filter(f => f.active).length),    icon: 'check-circle',    color: 'var(--emerald)', cls: 'positive' },
            { l: 'Network Wallet',    v: `₹${totalBalance.toLocaleString('en-IN')}`,         icon: 'indian-rupee',    color: 'var(--amber)',   cls: 'warning' },
            { l: 'Low Balance Alert', v: String(lowBalanceCount),                             icon: 'alert-triangle',  color: 'var(--rose)',    cls: lowBalanceCount > 0 ? 'alert' : 'positive' },
          ].map((k, i) => (
            <div key={i} className={`insight-card ${k.cls}`} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{k.l}</div>
                <Icon name={k.icon} size={14} style={{ color: k.color }} />
              </div>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <Card title="Partner Centers" sub={`${filtered.length} franchise partners`}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)' }}>
            <input className="form-input" placeholder="Search by name, location, owner..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <table className="data-table">
            <thead><tr><th>Partner Center</th><th>Owner</th><th>Tier</th><th>Wallet</th><th>Orders</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} onClick={() => setSelected(f.id === selected ? null : f.id)} style={{ cursor: 'pointer', background: selected === f.id ? 'var(--blue-dim)' : 'transparent' }}>
                  <td><div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{f.name}</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{f.location}</div></td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{f.owner}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: TIER_COLORS[f.tier] || '#888' }} />
                      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: TIER_COLORS[f.tier] }}>{f.tier}</span>
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>({f.commission}%)</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 'var(--fw-semibold)', color: f.balance < 1000 ? 'var(--rose)' : f.balance < 5000 ? 'var(--amber)' : 'var(--emerald)', fontSize: 'var(--fs-sm)' }}>₹{f.balance.toLocaleString('en-IN')}</span>
                    {f.balance < 1000 && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--rose)' }}>⚠ Low Balance</div>}
                  </td>
                  <td style={{ fontWeight: 'var(--fw-semibold)' }}>{f.orders}</td>
                  <td><Badge type={f.active ? 'success' : 'neutral'}>{f.active ? 'Active' : 'Inactive'}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" title="Topup Wallet" onClick={() => { setTopupModal(f); setTopupAmt('5000'); }}>
                        <Icon name="plus-circle" size={11} /> Topup
                      </button>
                      <button className="btn btn-ghost btn-xs" title={`WhatsApp ${f.owner}`} style={{ color: 'var(--emerald)' }} onClick={() => sendWhatsApp(f.phone, f.owner)}>
                        <Icon name="message-circle" size={11} /> WA
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Detail Panel */}
        {sel && (
          <Card title={sel.name} sub={`${sel.id} · Partner Details`}>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { l: 'Owner',      v: sel.owner },
                { l: 'Phone',      v: sel.phone },
                { l: 'Location',   v: sel.location },
                { l: 'Tier',       v: `${sel.tier} (${sel.commission}% commission)` },
                { l: 'Orders',     v: String(sel.orders) },
                { l: 'Joined',     v: sel.joined },
              ].map((d, i) => (
                <div key={i}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', marginBottom: 3 }}>{d.l}</div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{d.v}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { setTopupModal(sel); setTopupAmt('5000'); }}>
                <Icon name="plus-circle" size={13} /> Topup Wallet
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--emerald)' }} onClick={() => sendWhatsApp(sel.phone, sel.owner)}>
                <Icon name="message-circle" size={13} /> WhatsApp
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(sel)}>
                <Icon name="edit-2" size={13} /> Edit Details
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => (setActivePanel as any)('analytics')}>
                <Icon name="bar-chart-2" size={13} /> View Reports
              </button>
              <button
                className={`btn btn-sm ${sel.active ? 'btn-danger' : 'btn-primary'}`}
                style={{ marginLeft: 'auto', background: sel.active ? 'var(--rose)' : 'var(--emerald)', borderColor: sel.active ? 'var(--rose)' : 'var(--emerald)', color: '#fff' }}
                onClick={() => toggleActive(sel.id)}
              >
                <Icon name={sel.active ? 'pause-circle' : 'play-circle'} size={13} />
                {sel.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* Add/Edit Franchise Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e: any) => e.stopPropagation()} style={{ width: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)' }}>{editTarget ? 'Edit Franchise' : 'Add New Franchise'}</div></div>
              <button className="icon-btn" onClick={() => setShowForm(false)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { l: 'Center Name *', k: 'name',     ph: 'Sharma Suvidha Kendra' },
                { l: 'Owner Name *',  k: 'owner',    ph: 'Rajesh Sharma' },
                { l: 'Phone *',       k: 'phone',    ph: '9876543210' },
                { l: 'Location',      k: 'location', ph: 'City, District' },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5 }}>{f.l}</label>
                  <input className="form-input" placeholder={f.ph} value={form[f.k] || ''} onChange={e => setForm((p: any) => ({ ...p, [f.k]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5 }}>Tier</label>
                <select className="form-input" value={form.tier || 'Silver'} onChange={e => setForm((p: any) => ({ ...p, tier: e.target.value }))}>
                  {TIERS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5 }}>Commission (%)</label>
                <input type="number" className="form-input" min={0} max={30} value={form.commission || 8} onChange={e => setForm((p: any) => ({ ...p, commission: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!form.name || !form.owner || !form.phone} onClick={saveForm}>
                <Icon name="save" size={13} /> {editTarget ? 'Save Changes' : 'Add Franchise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topup Modal */}
      {topupModal && (
        <div className="modal-overlay" onClick={() => setTopupModal(null)}>
          <div className="modal-content" onClick={(e: any) => e.stopPropagation()} style={{ width: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)' }}>Topup Wallet</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{topupModal.name}</div></div>
              <button className="icon-btn" onClick={() => setTopupModal(null)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Current Balance: <strong style={{ color: topupModal.balance < 1000 ? 'var(--rose)' : 'var(--emerald)' }}>₹{topupModal.balance.toLocaleString('en-IN')}</strong></div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 6 }}>Amount to Add (₹)</label>
              <input type="number" className="form-input" value={topupAmt} onChange={e => setTopupAmt(e.target.value)} min={100} step={500} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {['1000','2000','5000','10000'].map(v => (
                  <button key={v} className="btn btn-ghost btn-xs" style={{ background: topupAmt === v ? 'var(--blue-dim)' : undefined }} onClick={() => setTopupAmt(v)}>₹{Number(v).toLocaleString()}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setTopupModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={processTopup} style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }}>
                <Icon name="plus-circle" size={13} /> Add ₹{Number(topupAmt || 0).toLocaleString('en-IN')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SETTINGS_KEY = 'opds_platform_settings';
function loadSettings() { try { const r = localStorage.getItem(SETTINGS_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }

export const SettingsPanel: React.FC = () => {
  const { addNotification } = useApp() as any;
  const [section, setSection] = useState('general');
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState(() => loadSettings() || {
    businessName:   'One Point Digital Services',
    gstin:          '09AABCU9603R1Z0',
    address:        'One Point Digital Services Center, Bisen Colony, Balaghat MP',
    phone:          '9473946181',
    email:          'asif@bisenonepoint.com',
    razorpay:       '',
    razorpaySecret: '',
    whatsappToken:  '',
    smsWebhook:     '',
    adminToken:     localStorage.getItem('opds_admin_token') || '',
    twoFA:          true,
    sessionTimeout: '30',
    emailAlerts:    true,
    whatsappAlerts: true,
    smsAlerts:      false,
    autoVerify:     true,
    autoWhatsApp:   true,
  });

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      setLoading(true);
      const TOKEN = localStorage.getItem('opds_admin_token') || '';
      try {
        const res = await fetch('/api/admin/settings', {
          headers: { 'X-Admin-Token': token },
        });
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();
        if (active) {
          setSettings(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSettings();
    return () => { active = false; };
  }, []);

  const SECTIONS = [
    { id: 'general',       label: 'General',             icon: 'building-2' },
    { id: 'integrations',  label: 'Integrations',        icon: 'plug' },
    { id: 'notifications', label: 'Notifications',       icon: 'bell' },
    { id: 'security',      label: 'Security',            icon: 'shield' },
    { id: 'automation',    label: 'Automation Defaults', icon: 'zap' },
  ];

  const set = (key: string, val: any) => setSettings((p: any) => ({ ...p, [key]: val }));
  const toggle = (key: string) => setSettings((p: any) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setLoading(true);
    const TOKEN = localStorage.getItem('opds_admin_token') || '';
    try {
      const csrfRes = await fetch('/api/csrf');
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken || '';

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save settings');
      }

      const data = await res.json();
      setSettings(data.settings);

      // Keep localStorage in sync
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      if (data.settings.adminToken) {
        localStorage.setItem('opds_admin_token', data.settings.adminToken);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      addNotification({
        title: 'Settings Saved',
        sub: 'Platform configurations updated on the server.',
        time: 'just now',
        color: 'var(--emerald)',
        icon: 'check-circle',
        panelTarget: 'settings',
      });
    } catch (err: any) {
      console.error(err);
      addNotification({
        title: 'Save Failed',
        sub: err.message || 'Connection error while saving settings.',
        time: 'just now',
        color: 'var(--rose)',
        icon: 'alert-triangle',
        panelTarget: 'settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ field, label, sub }: { field: string; label: string; sub?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-1)' }}>
      <div>
        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{label}</div>
        {sub && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input type="checkbox" checked={Boolean((settings as any)[field])} onChange={() => toggle(field)} style={{ display: 'none' }} />
        <div style={{ width: 40, height: 22, borderRadius: 11, position: 'relative', transition: 'background 0.2s', background: (settings as any)[field] ? 'var(--blue)' : 'var(--bg-4, #374151)' }}>
          <div style={{ position: 'absolute', top: 3, left: (settings as any)[field] ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
        </div>
      </label>
    </div>
  );

  return (
    <div className="panel active" style={{ opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s' }}>
      <PanelHeader title="Platform Settings" sub="Configure integrations, notifications, and security"
        actions={
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading} style={{ background: saved ? 'var(--emerald)' : undefined }}>
            <Icon name={saved ? 'check' : 'save'} size={14} /> {saved ? 'Saved!' : loading ? 'Saving...' : 'Save Changes'}
          </button>
        }
      />
      <div className="panels">
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 8, height: 'fit-content' }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)} className={`nav-link ${section === s.id ? 'active' : ''}`} style={{ width: '100%', marginBottom: 2 }}>
                <Icon name={s.icon} size={15} className="ni" /> {s.label}
              </button>
            ))}
          </div>
          <div>
            {section === 'general' && (
              <Card title="Business Information" sub="Your CSC center details — used in invoices and communications">
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { l: 'Business Name',  k: 'businessName', ph: 'Your center name' },
                    { l: 'GSTIN',          k: 'gstin',        ph: '15-digit GSTIN' },
                    { l: 'Address',        k: 'address',      ph: 'Full registered address' },
                    { l: 'Contact Phone',  k: 'phone',        ph: '10-digit number' },
                    { l: 'Email',          k: 'email',        ph: 'business@email.com' },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5, color: 'var(--text-2)' }}>{f.l}</label>
                      <input className="form-input" value={(settings as any)[f.k] || ''} onChange={e => set(f.k, e.target.value)} placeholder={f.ph} disabled={loading} />
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {section === 'integrations' && (
              <Card title="API Integrations" sub="Payment gateway & communication APIs — synced with server database">
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { l: 'Razorpay API Key',         k: 'razorpay',       icon: 'credit-card',    color: 'var(--blue)',    desc: 'rzp_live_... — from dashboard.razorpay.com' },
                    { l: 'Razorpay API Key Secret',  k: 'razorpaySecret', icon: 'key',            color: 'var(--blue)',    desc: 'rzp_live_secret_... — keep this secret' },
                    { l: 'WhatsApp Webhook URL',      k: 'whatsappToken',  icon: 'message-circle', color: 'var(--emerald)', desc: 'WHATSAPP_NOTIFICATION_WEBHOOK_URL (Wati/360Dialog)' },
                    { l: 'SMS Webhook URL',           k: 'smsWebhook',     icon: 'smartphone',     color: 'var(--amber)',   desc: 'SMS_NOTIFICATION_WEBHOOK_URL (MSG91/Fast2SMS)' },
                    { l: 'Admin API Token',           k: 'adminToken',     icon: 'shield',         color: 'var(--violet)',  desc: 'ADMIN_API_TOKEN — keep this secret' },
                  ].map(f => {
                    const isSecret = f.k === 'adminToken' || f.k === 'razorpaySecret';
                    return (
                      <div key={f.k} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 14, background: 'var(--bg-3)', borderRadius: 10, border: '1px solid var(--border-1)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name={f.icon} size={18} style={{ color: f.color }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 2 }}>{f.l}</div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>{f.desc}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              className="form-input"
                              value={(settings as any)[f.k] || ''}
                              onChange={e => set(f.k, e.target.value)}
                              placeholder={`Enter ${f.l.toLowerCase()}...`}
                              type={isSecret && !showSecrets[f.k] ? 'password' : 'text'}
                              style={{ flex: 1 }}
                              disabled={loading}
                            />
                            {isSecret && (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0 10px', height: 38, display: 'flex', alignItems: 'center', background: 'var(--bg-4)' }}
                                onClick={() => setShowSecrets(p => ({ ...p, [f.k]: !p[f.k] }))}
                              >
                                <Icon name={showSecrets[f.k] ? 'eye-off' : 'eye'} size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                        <Badge type={(settings as any)[f.k] ? 'success' : 'warning'}>{(settings as any)[f.k] ? 'Configured' : 'Not Set'}</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            {section === 'notifications' && (
              <Card title="Alert Preferences">
                <div style={{ padding: '4px 20px' }}>
                  <Toggle field="emailAlerts"    label="Email Alerts"    sub="Daily summary & critical alerts via email" />
                  <Toggle field="whatsappAlerts" label="WhatsApp Alerts" sub="Payment & order updates on WhatsApp" />
                  <Toggle field="smsAlerts"      label="SMS Alerts"      sub="SMS for failed payments and urgent actions" />
                </div>
              </Card>
            )}
            {section === 'security' && (
              <Card title="Security Settings">
                <div style={{ padding: '4px 20px' }}>
                  <Toggle field="twoFA" label="Two-Factor Authentication (2FA)" sub="Require TOTP on every login" />
                  <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>Session Timeout</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Auto-logout after inactivity</div></div>
                    <select className="form-input" style={{ width: 120 }} value={(settings as any).sessionTimeout || '30'} onChange={e => set('sessionTimeout', e.target.value)}>
                      {['15','30','60','120','480'].map(v => <option key={v} value={v}>{v} min</option>)}
                    </select>
                  </div>
                </div>
              </Card>
            )}
            {section === 'automation' && (
              <Card title="Automation Defaults">
                <div style={{ padding: '4px 20px' }}>
                  <Toggle field="autoVerify"    label="Auto-Verify Documents"    sub="Bot checks docs automatically after upload" />
                  <Toggle field="autoWhatsApp"  label="Auto WhatsApp on Order"   sub="Send instant confirmation to customers" />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
