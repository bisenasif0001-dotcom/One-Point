import React, { useState, useMemo } from 'react';
import { Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';
import { adminTokenHeader, getCsrfToken } from '../security/adminSession';

const SEGMENTS = [
  { id: 'All', label: 'All Citizens' },
  { id: 'Verified', label: 'KYC Verified' },
  { id: 'Premium', label: 'Premium Tier' },
  { id: 'Standard', label: 'Standard' },
  { id: 'New', label: 'New Citizens' },
];

const titleCase = (value?: string) => String(value || 'baseline')
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase());

const riskColor: Record<string, string> = {
  low: 'var(--emerald)',
  normal: 'var(--blue)',
  elevated: 'var(--amber)',
  medium: 'var(--amber)',
  high: 'var(--rose)',
  baseline: 'var(--text-3)',
};

const formatTrustScore = (score?: number | null) => {
  if (score === null || score === undefined) return '—';
  const value = Number(score);
  return Number.isFinite(value) ? `${value}/100` : '—';
};

export const CustomerDatabase: React.FC = () => {
  const { customers, allOrders, addActivity, addNotification } = useApp();

  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'spent' | 'orders' | 'joined'>('spent');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [waModal, setWaModal] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState('');
  const [exportMsg, setExportMsg] = useState('');
  const [viewCustomer, setViewCustomer] = useState<any>(null);

  // Filter + sort customers
  const filtered = useMemo(() => {
    let list = [...customers];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }
    if (segment !== 'All') {
      if (segment === 'Verified') {
        list = list.filter(c => c.verified || c.identityStatus === 'verified');
      } else if (['Premium', 'Standard', 'New'].includes(segment)) {
        list = list.filter(c => c.tier === segment);
      }
    }
    list.sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'spent')  return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (sortBy === 'orders') return (b.orders?.length || 0) - (a.orders?.length || 0);
      if (sortBy === 'joined') return (b.joined || '').localeCompare(a.joined || '');
      return 0;
    });
    return list;
  }, [customers, search, segment, sortBy]);

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleSelectAll = () =>
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));

  const selectedCustomers = filtered.filter(c => selected.has(c.id));

  // Export to CSV
  const exportCSV = () => {
    const rows = [
      ['Name', 'Phone', 'Email', 'City', 'Tier', 'Lifecycle', 'Trust Score', 'Risk Level', 'Consent Status', 'Total Spent (₹)', 'Orders', 'Verified', 'Joined'],
      ...filtered.map(c => [
        c.name,
        c.phone,
        c.email || '',
        c.city || '',
        c.tier,
        c.lifecycleStage || '',
        c.trustScore ?? '',
        c.riskLevel || '',
        c.consentStatus || '',
        (c.totalSpent || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
        String(c.orders?.length || 0),
        c.verified ? 'Yes' : 'No',
        c.joined || ''
      ]),
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `customer-database-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg(`✓ Exported ${filtered.length} citizens`);
    setTimeout(() => setExportMsg(''), 3000);
  };

  // Send WhatsApp broadcast to selected customers
  const sendBroadcast = async () => {
    if (!waMessage.trim()) return;
    const count = selectedCustomers.length;
    const confirmed = window.confirm(`Kya aap ${count} customers ko WhatsApp message bhejna chahte hain?`);
    if (!confirmed) return;
    setWaSending(true);
    try {
      const csrf = await getCsrfToken();
      const phones = selectedCustomers.map(c => c.phone.replace(/\D/g, '')).filter(p => p.length >= 10);
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { ...adminTokenHeader(), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ event: 'manual_broadcast', message: waMessage, phones }),
      });
      const d = await res.json();
      setWaResult(`✓ Message queued for ${d.sent || phones.length} customers.`);
      addActivity({ text: `Broadcast to ${phones.length} customers from Citizen CRM`, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'send' });
      addNotification({ title: 'Broadcast Sent', sub: `${phones.length} customers notified`, time: 'just now', color: 'var(--emerald)', icon: 'message-circle', panelTarget: 'customer-db' });
      setSelected(new Set());
      setWaMessage('');
      setTimeout(() => { setWaModal(false); setWaResult(''); }, 2500);
    } catch {
      setWaResult('✗ Failed to dispatch message. Check backend connection.');
    }
    setWaSending(false);
  };

  // Open WhatsApp directly for individual customer
  const openDirectWA = (phone: string, name: string) => {
    const num = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Namaste ${name} ji! One Point Digital Services. Aapki application ke regarding koi sahayata chahiye?`);
    window.open(`https://wa.me/${num.length === 10 ? '91' + num : num}?text=${msg}`, '_blank');
  };

  const tierColor: Record<string, string> = { Premium: '#c9921a', Standard: '#125696', New: 'var(--text-3)' };
  const totalRevenue = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
  const verifiedCount = customers.filter(c => c.verified || c.identityStatus === 'verified').length;
  const premiumCount = customers.filter(c => c.tier === 'Premium').length;

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', overflowY: 'auto' }}>
      
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        background: '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 8px', borderRadius: 6 }}>
              Citizen Registry & CRM 360
            </span>
            {exportMsg && (
              <span style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 600 }}>{exportMsg}</span>
            )}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>
            Citizen Database & Profile 360
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
            Manage {customers.length} registered citizens, inspect verification dossiers, and broadcast WhatsApp communications.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={exportCSV}
            style={{ borderRadius: 10, fontWeight: 600 }}
          >
            <Icon name="download" size={14} /> Export CSV
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{
              background: selected.size > 0 ? 'var(--emerald)' : 'var(--blue)',
              borderColor: selected.size > 0 ? 'var(--emerald)' : 'var(--blue)',
              borderRadius: 10,
              fontWeight: 600
            }}
            disabled={selected.size === 0}
            onClick={() => { setWaModal(true); setWaResult(''); }}
          >
            <Icon name="message-circle" size={14} /> WhatsApp Selected ({selected.size})
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase' }}>Total Citizens</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>{customers.length}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--emerald)', textTransform: 'uppercase' }}>KYC Verified</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald)', marginTop: 2 }}>
            {verifiedCount} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-4)' }}>({customers.length ? Math.round((verifiedCount / customers.length) * 100) : 0}%)</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase' }}>Premium Tier</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>{premiumCount}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase' }}>Lifetime Revenue</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald)', marginTop: 2 }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Search & Segment Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        background: '#ffffff', padding: '12px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 10, minWidth: 260, flex: 1
        }}>
          <Icon name="search" size={14} style={{ color: 'var(--text-4)' }} />
          <input
            type="text"
            placeholder="Search citizen by name, phone, email, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-1)' }}
          />
        </div>

        {/* Segment Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10 }}>
          {SEGMENTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegment(s.id)}
              style={{
                border: 'none',
                background: segment === s.id ? 'var(--blue)' : 'transparent',
                color: segment === s.id ? '#ffffff' : 'var(--text-2)',
                fontWeight: segment === s.id ? 700 : 500,
                fontSize: 12,
                padding: '5px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="form-input"
            style={{ width: 140, fontSize: 12, padding: '5px 8px', borderRadius: 8 }}
          >
            <option value="spent">By Revenue ↓</option>
            <option value="orders">By Orders ↓</option>
            <option value="name">By Name A-Z</option>
            <option value="joined">By Date Joined</option>
          </select>
        </div>
      </div>

      {/* Main Citizens Table */}
      <div style={{
        background: '#ffffff', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 980 }}>
            <thead>
              <tr style={{ background: 'var(--bg-3)', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ width: 42, padding: '12px 14px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px 14px' }}>Citizen</th>
                <th style={{ padding: '12px 14px' }}>Phone</th>
                <th style={{ padding: '12px 14px' }}>City / Address</th>
                <th style={{ padding: '12px 14px' }}>Tier</th>
                <th style={{ padding: '12px 14px' }}>Spent</th>
                <th style={{ padding: '12px 14px' }}>Orders</th>
                <th style={{ padding: '12px 14px' }}>Trust</th>
                <th style={{ padding: '12px 14px' }}>Joined</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isSelected = selected.has(c.id);
                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid var(--border-1)',
                      background: isSelected ? 'rgba(18, 86, 150, 0.04)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(18, 86, 150, 0.02)')}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(c.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', background: c.color || 'var(--blue)',
                          color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 11, flexShrink: 0
                        }}>
                          {c.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.name}
                            {(c.verified || c.identityStatus === 'verified') && (
                              <span title="Verified KYC" style={{ color: 'var(--emerald)', display: 'inline-flex' }}>
                                <Icon name="check-circle" size={13} />
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{c.email && c.email !== 'not-provided@bisenonepoint.com' ? c.email : 'No email'}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                      {c.phone}
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-2)' }}>
                      {c.city || '—'}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                        color: tierColor[c.tier] || 'var(--text-3)',
                        background: `${tierColor[c.tier] || '#64748b'}15`,
                        padding: '2px 8px', borderRadius: 6
                      }}>
                        {c.tier || 'New'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--emerald)' }}>
                      ₹{(c.totalSpent || 0).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-1)' }}>
                      {c.orders?.length || 0}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 600, color: Number(c.trustScore || 0) >= 75 ? 'var(--emerald)' : 'var(--blue)', fontSize: 12 }}>
                        {formatTrustScore(c.trustScore)}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: 'var(--text-4)' }}>
                      {c.joined || 'Today'}
                    </td>

                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          title="View 360 Dossier"
                          onClick={() => setViewCustomer(c)}
                          style={{ padding: '4px 8px', fontWeight: 600 }}
                        >
                          <Icon name="user" size={13} /> 360 Dossier
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          title={`WhatsApp ${c.phone}`}
                          style={{ color: 'var(--emerald)', borderColor: 'rgba(22, 163, 74, 0.2)' }}
                          onClick={() => openDirectWA(c.phone, c.name)}
                        >
                          <Icon name="message-circle" size={13} />
                        </button>

                        <a
                          className="btn btn-ghost btn-xs"
                          title={`Call ${c.phone}`}
                          href={`tel:${c.phone}`}
                          style={{ color: 'var(--blue)', borderColor: 'rgba(18, 86, 150, 0.2)' }}
                        >
                          <Icon name="phone" size={13} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
                    <Icon name="users" size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No Citizens Found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your search query or segment filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{
            padding: '10px 18px', fontSize: 11.5, color: 'var(--text-3)',
            borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>Showing {filtered.length} of {customers.length} citizens</span>
            {selected.size > 0 && (
              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{selected.size} selected for WhatsApp</span>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Broadcast Modal */}
      {waModal && (
        <div className="modal-overlay" onClick={() => setWaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 540, borderRadius: 18, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--emerald-dim)', color: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="message-circle" size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>WhatsApp Broadcast Desk</h3>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Dispatching to {selectedCustomers.length} selected citizens</div>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setWaModal(false)}><Icon name="x" size={16} /></button>
            </div>

            {/* Quick Templates */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 6 }}>Quick Templates</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { label: '🚀 New Service Launch', msg: 'Namaste! One Point Digital Services mein naya service shuru hua hai. Aaj hi apply karein. Details: ' + window.location.origin + '/services.html' },
                  { label: '🎉 Special Offer', msg: 'Iss mahine One Point Digital Services par special discount. PAN Card, GST, Passport par 20% off. Apply now!' },
                  { label: '📄 Document Reminder', msg: 'Aapka application pending hai — kripya zaroori documents upload karein: ' + window.location.origin + '/customer-account-overview.html' },
                  { label: '🤝 Application Follow-up', msg: 'Namaste! One Point se follow up — kya aapko kisi sarkari ya digital form mein help chahiye?' },
                ].map(t => (
                  <button
                    key={t.label}
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, whiteSpace: 'normal', borderRadius: 8 }}
                    onClick={() => setWaMessage(t.msg)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Message Text *</span>
                <span style={{ color: 'var(--text-4)' }}>{waMessage.length} chars</span>
              </label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Type your WhatsApp notification message here..."
                value={waMessage}
                onChange={e => setWaMessage(e.target.value)}
                style={{ width: '100%', resize: 'vertical', borderRadius: 10, fontSize: 12.5 }}
              />
            </div>

            {waResult && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 14,
                background: waResult.startsWith('✓') ? 'var(--emerald-dim)' : 'var(--rose-dim)',
                color: waResult.startsWith('✓') ? 'var(--emerald)' : 'var(--rose)',
              }}>
                {waResult}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setWaModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)', fontWeight: 600 }}
                disabled={!waMessage.trim() || waSending}
                onClick={sendBroadcast}
              >
                {waSending ? <><Icon name="loader-2" size={14} className="spin" /> Sending…</> : <><Icon name="send" size={14} /> Send Broadcast</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citizen 360 Profile Dossier Modal */}
      {viewCustomer && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 680, maxWidth: '95vw', borderRadius: 18, padding: 0, overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #082f61 0%, #125696 100%)',
              padding: '20px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: '#ffffff', color: '#082f61',
                  fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {viewCustomer.initials}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#ffffff' }}>{viewCustomer.name}</h2>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                    {viewCustomer.phone} • {viewCustomer.city || 'Location not set'} • {viewCustomer.tier} Tier
                  </div>
                </div>
              </div>

              <button className="icon-btn" style={{ color: '#ffffff' }} onClick={() => setViewCustomer(null)}>
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ background: 'var(--bg-3)', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Total Spent</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--emerald)', marginTop: 2 }}>
                    ₹{(viewCustomer.totalSpent || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-3)', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Orders</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>
                    {viewCustomer.orders?.length || 0}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-3)', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Trust Score</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--blue)', marginTop: 2 }}>
                    {formatTrustScore(viewCustomer.trustScore)}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-3)', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>KYC Status</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: viewCustomer.verified ? 'var(--emerald)' : 'var(--amber)', marginTop: 2 }}>
                    {viewCustomer.verified ? '✓ Verified' : 'Pending'}
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Recent Applications ({viewCustomer.orders?.length || 0})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                  {(viewCustomer.orders || []).map((o: any, i: number) => (
                    <div key={o.id || i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px',
                      background: 'var(--bg-2)', borderRadius: 8, fontSize: 12
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{o.service || 'Service Application'}</span>
                        <span style={{ color: 'var(--text-4)', marginLeft: 8 }}>{o.id}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--emerald)' }}>₹{o.amount || 0}</span>
                        <Badge type={o.status === 'Completed' ? 'success' : 'warning'}>{o.status || 'Pending'}</Badge>
                      </div>
                    </div>
                  ))}
                  {(!viewCustomer.orders || viewCustomer.orders.length === 0) && (
                    <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: 12 }}>No applications recorded yet.</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-1)', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)', fontWeight: 600 }}
                  onClick={() => { openDirectWA(viewCustomer.phone, viewCustomer.name); setViewCustomer(null); }}
                >
                  <Icon name="message-circle" size={14} /> WhatsApp Chat
                </button>
                <a className="btn btn-ghost" href={`tel:${viewCustomer.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="phone" size={14} /> Call Citizen
                </a>
                <button className="btn btn-ghost" onClick={() => setViewCustomer(null)}>Close</button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
