import React, { useState, useEffect } from 'react';
import { PanelHeader, Card, Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';
import { getCsrfToken, getStoredAdminToken, setStoredAdminToken } from '../security/adminSession';

const TIER_COLORS: Record<string, string> = { Gold: 'var(--amber)', Silver: 'var(--text-2)', Bronze: '#cd7f32', Platinum: 'var(--violet)' };
const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Archived'];
const adminHeaders = () => ({ 'X-Admin-Token': getStoredAdminToken(), 'Content-Type': 'application/json' });
const adminWriteHeaders = async () => ({ ...adminHeaders(), 'X-CSRF-Token': await getCsrfToken() });

const EMPTY_FORM = {
  branchName: '',
  ownerName: '',
  contactPhone: '',
  contactEmail: '',
  locationText: '',
  tier: 'Silver',
  commissionRate: 8,
  operationalStatus: 'Active',
  parentBranchUuid: '',
};

export const FranchisePanel: React.FC = () => {
  const { addNotification, setActivePanel } = useApp() as any;
  const [franchises, setFranchises] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const headers = adminHeaders();
      const [franchiseRes, branchRes] = await Promise.all([
        fetch('/api/admin/branches?branchType=Franchise', { headers }),
        fetch('/api/admin/branches', { headers }),
      ]);
      if (franchiseRes.ok) setFranchises((await franchiseRes.json()).branches || []);
      if (branchRes.ok) setAllBranches((await branchRes.json()).branches || []);
    } catch {
      // Keep current state on transient fetch issues.
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = franchises.filter((item) =>
    item.branchName.toLowerCase().includes(search.toLowerCase()) ||
    item.locationText.toLowerCase().includes(search.toLowerCase()) ||
    item.ownerName.toLowerCase().includes(search.toLowerCase())
  );
  const selectedFranchise = franchises.find((item) => item.branchUuid === selected);
  const parentOptions = allBranches.filter((item) => item.branchUuid !== editTarget?.branchUuid);
  const parentByUuid = new Map(allBranches.map((item) => [item.branchUuid, item.branchName]));

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditTarget(null);
    setShowForm(true);
  };

  const openEdit = (record: any) => {
    setEditTarget(record);
    setForm({
      branchName: record.branchName || '',
      ownerName: record.ownerName || '',
      contactPhone: record.contactPhone || '',
      contactEmail: record.contactEmail || '',
      locationText: record.locationText || '',
      tier: record.tier || 'Silver',
      commissionRate: Number(record.commissionRate || 0),
      operationalStatus: record.operationalStatus || 'Active',
      parentBranchUuid: record.parentBranchUuid || '',
    });
    setShowForm(true);
  };

  const saveForm = async () => {
    if (!form.branchName || !form.ownerName || !form.contactPhone) return;
    const method = editTarget ? 'PATCH' : 'POST';
    const endpoint = editTarget ? `/api/admin/branches/${editTarget.branchUuid}` : '/api/admin/branches';
    const payload = {
      branchType: 'Franchise',
      ...form,
      parentBranchUuid: form.parentBranchUuid || null,
    };
    const response = await fetch(endpoint, {
      method,
      headers: await adminWriteHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) return;
    await load();
    addNotification({
      title: editTarget ? 'Franchise updated' : 'Franchise added',
      sub: form.branchName,
      time: 'just now',
      color: editTarget ? 'var(--blue)' : 'var(--emerald)',
      icon: 'store',
      panelTarget: 'franchise',
    });
    setShowForm(false);
  };

  const toggleActive = async (record: any) => {
    const nextStatus = record.active ? 'Inactive' : 'Active';
    const response = await fetch(`/api/admin/branches/${record.branchUuid}`, {
      method: 'PATCH',
      headers: await adminWriteHeaders(),
      body: JSON.stringify({ branchType: 'Franchise', operationalStatus: nextStatus }),
    });
    if (!response.ok) return;
    await load();
    addNotification({
      title: record.active ? 'Franchise deactivated' : 'Franchise activated',
      sub: record.branchName,
      time: 'just now',
      color: record.active ? 'var(--rose)' : 'var(--emerald)',
      icon: 'store',
      panelTarget: 'franchise',
    });
  };

  const sendWhatsApp = (phone: string, name: string) => {
    const num = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Namaste ${name} ji, One Point Digital Services Franchise support se bol raha hoon. Koi madad chahiye?`);
    window.open(`https://wa.me/${num.length === 10 ? `91${num}` : num}?text=${msg}`, '_blank');
  };

  const activeCount = franchises.filter((item) => item.active).length;
  const linkedCount = franchises.filter((item) => item.parentBranchUuid).length;
  const archivedCount = franchises.filter((item) => item.operationalStatus === 'Archived').length;

  return (
    <div className="panel active">
      <PanelHeader
        title="Franchise Network"
        sub="Governed partner registry · Metadata only · No wallet automation"
        actions={(
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Icon name="plus" size={13} /> Add Franchise
          </button>
        )}
      />

      <div className="panels">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--blue-dim)', border: '1px solid var(--border-1)', borderRadius: 10 }}>
          <Icon name="shield-check" size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>
            <strong>Governed Registry Mode</strong> — franchise centers now come from the backend branch registry. Commission, hierarchy, and status are governed metadata only in this milestone.
          </div>
        </div>

        <div className="grid-4">
          {[
            { l: 'Total Partners', v: String(franchises.length), icon: 'store', color: 'var(--blue)', cls: 'info' },
            { l: 'Active Centers', v: String(activeCount), icon: 'check-circle', color: 'var(--emerald)', cls: 'positive' },
            { l: 'Linked To Parent', v: String(linkedCount), icon: 'git-branch', color: 'var(--violet)', cls: 'info' },
            { l: 'Archived', v: String(archivedCount), icon: 'archive', color: 'var(--amber)', cls: archivedCount ? 'warning' : 'positive' },
          ].map((card, index) => (
            <div key={index} className={`insight-card ${card.cls}`} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{card.l}</div>
                <Icon name={card.icon} size={14} style={{ color: card.color }} />
              </div>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{card.v}</div>
            </div>
          ))}
        </div>

        <Card title="Partner Centers" sub={`${filtered.length} governed franchise records`}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)' }}>
            <input className="form-input" placeholder="Search by name, location, owner..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
              <Icon name="loader-2" size={24} className="spin" style={{ marginBottom: 10 }} />
              <div>Loading governed franchise records...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 8 }}>No franchise records yet</div>
              <div style={{ fontSize: 'var(--fs-sm)' }}>Create the first governed franchise center.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Partner Center</th>
                  <th>Owner</th>
                  <th>Tier</th>
                  <th>Parent Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.branchUuid}
                    onClick={() => setSelected(item.branchUuid === selected ? null : item.branchUuid)}
                    style={{ cursor: 'pointer', background: selected === item.branchUuid ? 'var(--blue-dim)' : 'transparent' }}
                  >
                    <td>
                      <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{item.branchName}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{item.locationText || 'Location not set'}</div>
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)' }}>
                      <div>{item.ownerName || 'Not set'}</div>
                      <div style={{ color: 'var(--text-3)' }}>{item.contactPhone || 'No phone'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: TIER_COLORS[item.tier] || '#888' }} />
                        <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: TIER_COLORS[item.tier] || 'var(--text-2)' }}>{item.tier || 'Unspecified'}</span>
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>({Number(item.commissionRate || 0)}%)</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>{parentByUuid.get(item.parentBranchUuid) || 'Standalone'}</td>
                    <td><Badge type={item.active ? 'success' : item.operationalStatus === 'Archived' ? 'warning' : 'neutral'}>{item.operationalStatus}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => openEdit(item)}>
                          <Icon name="edit-2" size={11} /> Edit
                        </button>
                        <button className="btn btn-ghost btn-xs" title={`WhatsApp ${item.ownerName || item.branchName}`} style={{ color: 'var(--emerald)' }} onClick={() => sendWhatsApp(item.contactPhone || '', item.ownerName || item.branchName)}>
                          <Icon name="message-circle" size={11} /> WA
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {selectedFranchise ? (
          <Card title={selectedFranchise.branchName} sub={`${selectedFranchise.branchUuid} · Governed franchise metadata`}>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { l: 'Owner', v: selectedFranchise.ownerName || 'Not set' },
                { l: 'Phone', v: selectedFranchise.contactPhone || 'Not set' },
                { l: 'Email', v: selectedFranchise.contactEmail || 'Not set' },
                { l: 'Location', v: selectedFranchise.locationText || 'Not set' },
                { l: 'Tier', v: `${selectedFranchise.tier || 'Unspecified'} (${Number(selectedFranchise.commissionRate || 0)}% metadata)` },
                { l: 'Parent Branch', v: parentByUuid.get(selectedFranchise.parentBranchUuid) || 'Standalone' },
                { l: 'Status', v: selectedFranchise.operationalStatus },
                { l: 'Type', v: selectedFranchise.branchType },
                { l: 'Joined', v: selectedFranchise.joinedAt ? new Date(selectedFranchise.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A' },
              ].map((detail, index) => (
                <div key={index}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', marginBottom: 3 }}>{detail.l}</div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{detail.v}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--emerald)' }} onClick={() => sendWhatsApp(selectedFranchise.contactPhone || '', selectedFranchise.ownerName || selectedFranchise.branchName)}>
                <Icon name="message-circle" size={13} /> WhatsApp
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(selectedFranchise)}>
                <Icon name="edit-2" size={13} /> Edit Details
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => (setActivePanel as any)('analytics')}>
                <Icon name="bar-chart-2" size={13} /> View Reports
              </button>
              <button
                className="btn btn-sm"
                style={{ marginLeft: 'auto', background: selectedFranchise.active ? 'var(--rose)' : 'var(--emerald)', borderColor: selectedFranchise.active ? 'var(--rose)' : 'var(--emerald)', color: '#fff' }}
                onClick={() => toggleActive(selectedFranchise)}
              >
                <Icon name={selectedFranchise.active ? 'pause-circle' : 'play-circle'} size={13} />
                {selectedFranchise.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </Card>
        ) : null}
      </div>

      {showForm ? (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e: any) => e.stopPropagation()} style={{ width: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)' }}>{editTarget ? 'Edit Franchise' : 'Add New Franchise'}</div></div>
              <button className="icon-btn" onClick={() => setShowForm(false)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { l: 'Center Name *', k: 'branchName', ph: 'Sharma Suvidha Kendra' },
                { l: 'Owner Name *', k: 'ownerName', ph: 'Rajesh Sharma' },
                { l: 'Phone *', k: 'contactPhone', ph: '9876543210' },
                { l: 'Email', k: 'contactEmail', ph: 'franchise@example.com' },
                { l: 'Location', k: 'locationText', ph: 'City, District' },
              ].map((field) => (
                <div key={field.k}>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5 }}>{field.l}</label>
                  <input className="form-input" placeholder={field.ph} value={form[field.k] || ''} onChange={(e) => setForm((p: any) => ({ ...p, [field.k]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5 }}>Tier</label>
                <select className="form-input" value={form.tier || 'Silver'} onChange={(e) => setForm((p: any) => ({ ...p, tier: e.target.value }))}>
                  {TIERS.map((tier) => <option key={tier}>{tier}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5 }}>Commission Metadata (%)</label>
                <input type="number" className="form-input" min={0} max={30} value={form.commissionRate || 0} onChange={(e) => setForm((p: any) => ({ ...p, commissionRate: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5 }}>Operational Status</label>
                <select className="form-input" value={form.operationalStatus || 'Active'} onChange={(e) => setForm((p: any) => ({ ...p, operationalStatus: e.target.value }))}>
                  {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5 }}>Parent Branch (Optional)</label>
                <select className="form-input" value={form.parentBranchUuid || ''} onChange={(e) => setForm((p: any) => ({ ...p, parentBranchUuid: e.target.value }))}>
                  <option value="">Standalone</option>
                  {parentOptions.map((branch) => (
                    <option key={branch.branchUuid} value={branch.branchUuid}>{branch.branchName} ({branch.branchType})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!form.branchName || !form.ownerName || !form.contactPhone} onClick={saveForm}>
                <Icon name="save" size={13} /> {editTarget ? 'Save Changes' : 'Add Franchise'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
    adminToken:     getStoredAdminToken(),
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
      const TOKEN = getStoredAdminToken();
      try {
        const res = await fetch('/api/admin/settings', {
          headers: { 'X-Admin-Token': TOKEN },
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
    const TOKEN = getStoredAdminToken();
    try {
      const csrfToken = await getCsrfToken();

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': TOKEN,
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

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      if (data.settings.adminToken) {
        setStoredAdminToken(data.settings.adminToken);
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
        {sub ? <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>{sub}</div> : null}
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
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', overflowY: 'auto', opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s' }}>
      
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        background: '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 8px', borderRadius: 6 }}>
              Platform & Center Operations
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>
            Center Settings & API Configuration
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
            Configure Payment Gateways, WhatsApp Webhooks, Center Profile & Automatic Verification Rules
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={loading}
            style={{
              background: saved ? 'var(--emerald)' : 'var(--blue)',
              borderColor: saved ? 'var(--emerald)' : 'var(--blue)',
              borderRadius: 10,
              fontWeight: 600
            }}
          >
            <Icon name={saved ? 'check' : 'save'} size={14} /> {saved ? '✓ Changes Saved!' : loading ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 18, alignItems: 'flex-start' }}>
        {/* Settings Navigation */}
        <div style={{
          background: '#ffffff', padding: 8, borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)',
          boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {SECTIONS.map((sectionItem) => {
            const isActive = section === sectionItem.id;
            return (
              <button
                key={sectionItem.id}
                type="button"
                onClick={() => setSection(sectionItem.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                  fontSize: 13, fontWeight: isActive ? 700 : 500, width: '100%', textAlign: 'left',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                  background: isActive ? 'var(--blue-dim)' : 'transparent',
                  color: isActive ? 'var(--blue)' : 'var(--text-2)'
                }}
              >
                <Icon name={sectionItem.icon} size={16} style={{ color: isActive ? 'var(--blue)' : 'var(--text-3)' }} />
                <span>{sectionItem.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section Content */}
        <div style={{
          background: '#ffffff', padding: '20px 24px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
          boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
        }}>
          {section === 'general' && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Business & Center Profile</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '4px 0 0' }}>Your CSC center details — printed on citizen receipts, invoices, and verification certificates.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { l: 'Business / Center Name', k: 'businessName', ph: 'e.g. One Point Digital Services' },
                  { l: 'GSTIN / Registration Number', k: 'gstin', ph: '15-digit GSTIN or Registration No.' },
                  { l: 'Registered Physical Address', k: 'address', ph: 'Complete center address' },
                  { l: 'Primary Helpline Phone', k: 'phone', ph: '10-digit customer helpline number' },
                  { l: 'Official Support Email', k: 'email', ph: 'support@yourdomain.com' },
                ].map((field) => (
                  <div key={field.k}>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: 'var(--text-2)' }}>{field.l}</label>
                    <input
                      className="form-input"
                      value={(settings as any)[field.k] || ''}
                      onChange={(e) => set(field.k, e.target.value)}
                      placeholder={field.ph}
                      disabled={loading}
                      style={{ height: 38, borderRadius: 10, fontSize: 13 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'integrations' && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Payment & Communication APIs</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '4px 0 0' }}>Synced in real-time with your server database for instant payment collection and customer WhatsApp alerts.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { l: 'Razorpay API Key', k: 'razorpay', icon: 'credit-card', color: 'var(--blue)', desc: 'rzp_live_... — from dashboard.razorpay.com' },
                  { l: 'Razorpay API Key Secret', k: 'razorpaySecret', icon: 'key', color: 'var(--blue)', desc: 'rzp_live_secret_... — keep this secret' },
                  { l: 'WhatsApp Webhook URL', k: 'whatsappToken', icon: 'message-circle', color: 'var(--emerald)', desc: 'WHATSAPP_NOTIFICATION_WEBHOOK_URL (Wati / 360Dialog / Gupshup)' },
                  { l: 'SMS Webhook URL', k: 'smsWebhook', icon: 'smartphone', color: 'var(--amber)', desc: 'SMS_NOTIFICATION_WEBHOOK_URL (MSG91 / Fast2SMS)' },
                  { l: 'Admin API Token', k: 'adminToken', icon: 'shield', color: 'var(--violet)', desc: 'ADMIN_API_TOKEN — server authorization key' },
                ].map((field) => {
                  const isSecret = field.k === 'adminToken' || field.k === 'razorpaySecret';
                  return (
                    <div key={field.k} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid rgba(8, 47, 97, 0.06)' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${field.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={field.icon} size={18} style={{ color: field.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{field.l}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8 }}>{field.desc}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            className="form-input"
                            value={(settings as any)[field.k] || ''}
                            onChange={(e) => set(field.k, e.target.value)}
                            placeholder={`Enter ${field.l.toLowerCase()}...`}
                            type={isSecret && !showSecrets[field.k] ? 'password' : 'text'}
                            style={{ flex: 1, height: 36, borderRadius: 8, fontSize: 12.5 }}
                            disabled={loading}
                          />
                          {isSecret && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '0 10px', height: 36, display: 'flex', alignItems: 'center', borderRadius: 8 }}
                              onClick={() => setShowSecrets((prev) => ({ ...prev, [field.k]: !prev[field.k] }))}
                            >
                              <Icon name={showSecrets[field.k] ? 'eye-off' : 'eye'} size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                      <Badge type={(settings as any)[field.k] ? 'success' : 'warning'}>
                        {(settings as any)[field.k] ? 'Configured' : 'Not Set'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Notification & Broadcast Preferences</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '4px 0 0' }}>Control automatic notifications sent to operators and customers across channels.</p>
              </div>
              <div style={{ padding: '0 4px' }}>
                <Toggle field="emailAlerts" label="Email Alerts" sub="Daily financial ledger summary & critical verification alerts via email" />
                <Toggle field="whatsappAlerts" label="WhatsApp Customer Alerts" sub="Instant payment receipt & order status transitions delivered on WhatsApp" />
                <Toggle field="smsAlerts" label="SMS Alerts Fallback" sub="Send fallback SMS for failed payments and OTP verifications" />
              </div>
            </div>
          )}

          {section === 'security' && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Security & Access Protection</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '4px 0 0' }}>Manage two-factor authentication requirements and administrative session lifespan.</p>
              </div>
              <div style={{ padding: '0 4px' }}>
                <Toggle field="twoFA" label="Two-Factor Authentication (2FA)" sub="Require authenticator TOTP token on every admin and operator sign-in" />
                <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(8, 47, 97, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Session Inactivity Timeout</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Auto-logout admin & desk staff after inactivity</div>
                  </div>
                  <select
                    className="form-input"
                    style={{ width: 130, height: 36, borderRadius: 8, fontSize: 12.5 }}
                    value={(settings as any).sessionTimeout || '30'}
                    onChange={(e) => set('sessionTimeout', e.target.value)}
                  >
                    {['15', '30', '60', '120', '480'].map((value) => (
                      <option key={value} value={value}>{value} Minutes</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {section === 'automation' && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Workflow Automation Engine</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '4px 0 0' }}>Configure automated bots for OCR document verification and instant order assignment.</p>
              </div>
              <div style={{ padding: '0 4px' }}>
                <Toggle field="autoVerify" label="AI Document Auto-Check" sub="Verify Aadhaar, PAN, and Photo readability immediately upon citizen upload" />
                <Toggle field="autoWhatsApp" label="Instant Order WhatsApp Broadcast" sub="Trigger WhatsApp message with Order ID and Tracking Link immediately after payment" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
