import React, { useState, useMemo } from 'react';
import { PanelHeader, Card, Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';

const TOKEN = localStorage.getItem('opds_admin_token') || '';

function getCsrf() {
  return document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
}

// Service categories for filtering
const CATEGORIES = ['All', 'Premium', 'Standard', 'New', 'E-Services', 'OneMart Store'];

export const CustomerDatabase: React.FC = () => {
  const { customers, allOrders, addActivity, addNotification } = useApp();

  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const [sortBy, setSortBy]         = useState<'name' | 'spent' | 'orders' | 'joined'>('spent');
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [waModal, setWaModal]       = useState(false);
  const [waMessage, setWaMessage]   = useState('');
  const [waSending, setWaSending]   = useState(false);
  const [waResult, setWaResult]     = useState('');
  const [exportMsg, setExportMsg]   = useState('');
  const [viewCustomer, setViewCustomer] = useState<any>(null);

  // Filter + sort customers
  const filtered = useMemo(() => {
    let list = [...customers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }
    if (category !== 'All') {
      list = list.filter(c => {
        if (['Premium', 'Standard', 'New'].includes(category)) return c.tier === category;
        if (category === 'E-Services')   return c.orders.some((o: any) => o.category === 'E-Services');
        if (category === 'OneMart Store') return c.orders.some((o: any) => o.category === 'OneMart Store');
        return true;
      });
    }
    list.sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'spent')  return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (sortBy === 'orders') return (b.orders?.length || 0) - (a.orders?.length || 0);
      if (sortBy === 'joined') return (b.joined || '').localeCompare(a.joined || '');
      return 0;
    });
    return list;
  }, [customers, search, category, sortBy]);

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleSelectAll = () =>
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));

  const selectedCustomers = filtered.filter(c => selected.has(c.id));

  // Export to CSV
  const exportCSV = () => {
    const rows = [
      ['Name', 'Phone', 'Email', 'City', 'Tier', 'Total Spent (₹)', 'Orders', 'Verified', 'Joined'],
      ...filtered.map(c => [c.name, c.phone, c.email || '', c.city || '', c.tier, String(c.totalSpent || 0), String(c.orders?.length || 0), c.verified ? 'Yes' : 'No', c.joined || '']),
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `customer-database-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg(`✓ Exported ${filtered.length} customers`);
    setTimeout(() => setExportMsg(''), 3000);
  };

  // Send WhatsApp broadcast to selected customers
  const sendBroadcast = async () => {
    if (!waMessage.trim()) return;
    setWaSending(true);
    try {
      const csrf = getCsrf();
      const phones = selectedCustomers.map(c => c.phone.replace(/\D/g, '')).filter(p => p.length >= 10);
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ event: 'manual_broadcast', message: waMessage, phones }),
      });
      const d = await res.json();
      setWaResult(`✓ Message queued for ${d.sent || phones.length} customers. Check WhatsApp webhook for delivery.`);
      addActivity({ text: `Broadcast to ${phones.length} customers from Customer Database`, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'send' });
      addNotification({ title: 'Broadcast Sent', sub: `${phones.length} customers notified`, time: 'just now', color: 'var(--emerald)', icon: 'message-circle', panelTarget: 'customer-db' });
      setSelected(new Set());
      setWaMessage('');
      setTimeout(() => { setWaModal(false); setWaResult(''); }, 3000);
    } catch { setWaResult('✗ Failed. Check server connection.'); }
    setWaSending(false);
  };

  // Open WhatsApp directly for individual customer
  const openDirectWA = (phone: string, name: string) => {
    const num = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Namaste ${name} ji! One Point Digital Services. Koi seva chahiye ho toh batayein.`);
    window.open(`https://wa.me/${num.length === 10 ? '91' + num : num}?text=${msg}`, '_blank');
  };

  const tierColor: Record<string, string> = { Premium: 'var(--amber)', Standard: 'var(--blue)', New: 'var(--text-3)' };

  return (
    <div className="panel-container">
      <PanelHeader
        title="Customer Database"
        sub={`${customers.length} total customers · ${filtered.length} shown · Manage & message in bulk`}
        icon="database"
      >
        {exportMsg && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--emerald)', fontWeight: 'var(--fw-semibold)' }}>{exportMsg}</span>}
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
          <Icon name="download" size={13} /> Export CSV
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)', opacity: selected.size === 0 ? 0.5 : 1 }}
          disabled={selected.size === 0}
          onClick={() => { setWaModal(true); setWaResult(''); }}
        >
          <Icon name="message-circle" size={13} /> WhatsApp Selected ({selected.size})
        </button>
      </PanelHeader>

      <div className="panel-body">
        {/* Filters */}
        <Card style={{ padding: '12px 16px', marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input type="text" className="form-input" placeholder="Search name, phone, email, city..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-ghost'}`}
                  style={category === cat ? { background: 'var(--blue)', color: '#fff' } : { background: 'var(--bg-2)' }}
                  onClick={() => setCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Sort:</span>
              <select className="form-input" style={{ width: 130 }} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                <option value="spent">By Revenue ↓</option>
                <option value="orders">By Orders ↓</option>
                <option value="name">By Name A-Z</option>
                <option value="joined">By Date ↓</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: 'Total Customers', v: customers.length,                                                    color: 'var(--blue)' },
            { l: 'Premium Tier',    v: customers.filter(c => c.tier === 'Premium').length,                  color: 'var(--amber)' },
            { l: 'Total Revenue',   v: `₹${customers.reduce((s, c) => s + (c.totalSpent || 0), 0).toLocaleString('en-IN')}`, color: 'var(--emerald)' },
            { l: 'Verified',        v: customers.filter(c => c.verified).length,                            color: 'var(--emerald)' },
          ].map(k => (
            <div key={k.l} className="insight-card" style={{ padding: '12px 16px', border: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{k.l}</div>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: k.color }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <Card bodyClass="card-body-flush">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th>Tier</th>
                <th>Spent</th>
                <th>Orders</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                  No customers found. Orders from website will appear here automatically.
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} style={{ background: selected.has(c.id) ? 'rgba(59,130,246,0.04)' : 'transparent' }}>
                  <td>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="cust-avatar" style={{ background: c.color, width: 30, height: 30, fontSize: 'var(--fs-xs)', flexShrink: 0 }}>{c.initials}</div>
                      <div>
                        <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{c.name}</div>
                        {c.verified && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 3 }}><Icon name="check-circle" size={10} /> Verified</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>{c.phone}</td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{c.email && c.email !== 'not-provided@bisenonepoint.com' ? c.email : '—'}</td>
                  <td style={{ fontSize: 'var(--fs-xs)' }}>{c.city || '—'}</td>
                  <td>
                    <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: tierColor[c.tier] || 'var(--text-3)', background: `${tierColor[c.tier] || 'var(--bg-3)'}15`, padding: '2px 8px', borderRadius: 20 }}>
                      {c.tier}
                    </span>
                  </td>
                  <td style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--emerald)' }}>₹{(c.totalSpent || 0).toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 'var(--fw-semibold)' }}>{c.orders?.length || 0}</td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{c.joined || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" title="View profile" onClick={() => setViewCustomer(c)}>
                        <Icon name="eye" size={11} />
                      </button>
                      <button
                        className="btn btn-ghost btn-xs"
                        title={`WhatsApp ${c.phone}`}
                        style={{ color: 'var(--emerald)' }}
                        onClick={() => openDirectWA(c.phone, c.name)}
                      >
                        <Icon name="message-circle" size={11} />
                      </button>
                      <a
                        className="btn btn-ghost btn-xs"
                        title={`Call ${c.phone}`}
                        href={`tel:${c.phone}`}
                        style={{ color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px' }}
                      >
                        <Icon name="phone" size={11} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div style={{ padding: '8px 16px', fontSize: 'var(--fs-xs)', color: 'var(--text-3)', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Showing {filtered.length} of {customers.length} customers</span>
              {selected.size > 0 && <span style={{ color: 'var(--blue)', fontWeight: 'var(--fw-semibold)' }}>{selected.size} selected</span>}
            </div>
          )}
        </Card>
      </div>

      {/* WhatsApp Broadcast Modal */}
      {waModal && (
        <div className="modal-overlay" onClick={() => setWaModal(false)}>
          <div className="modal-content" onClick={(e: any) => e.stopPropagation()} style={{ width: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="message-circle" size={18} style={{ color: 'var(--emerald)' }} />
                  WhatsApp Broadcast
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Sending to {selectedCustomers.length} selected customers</div>
              </div>
              <button className="icon-btn" onClick={() => setWaModal(false)}><Icon name="x" size={16} /></button>
            </div>

            {/* Recipients Preview */}
            <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 12, marginBottom: 14, maxHeight: 100, overflowY: 'auto' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', marginBottom: 6 }}>RECIPIENTS ({selectedCustomers.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedCustomers.slice(0, 12).map(c => (
                  <span key={c.id} style={{ fontSize: 'var(--fs-xs)', background: 'var(--blue-dim)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 20 }}>
                    {c.name.split(' ')[0]} ({c.phone.slice(-4)})
                  </span>
                ))}
                {selectedCustomers.length > 12 && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>+{selectedCustomers.length - 12} more</span>}
              </div>
            </div>

            {/* Quick Templates */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', marginBottom: 8 }}>QUICK TEMPLATES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'New Service Launch',   msg: 'Namaste! One Point Digital Services mein naya service shuru hua hai. Aaj hi apply karein. Details: ' + window.location.origin + '/services.html' },
                  { label: 'Festive Offer',         msg: 'Iss festive season mein One Point Digital Services de raha hai special discount. PAN Card, GST, Passport par 20% off. Limited time offer!' },
                  { label: 'Reminder — Documents', msg: 'Aapka application pending hai — kuch documents upload karne hain. Abhi upload karein: ' + window.location.origin + '/track-application.html' },
                  { label: 'Follow Up',             msg: 'Namaste! One Point se follow up — kya aapko koi service chahiye? Hum ready hain — PAN, GST, Passport, FSSAI, sab kuch ek jagah.' },
                ].map(t => (
                  <button key={t.label} className="btn btn-ghost btn-xs" style={{ textAlign: 'left', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 'var(--fs-xs)', whiteSpace: 'normal' }}
                    onClick={() => setWaMessage(t.msg)}>
                    <Icon name="zap" size={11} style={{ flexShrink: 0 }} /> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 6 }}>
                Message * <span style={{ color: 'var(--text-3)' }}>({waMessage.length} chars)</span>
              </label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Type your WhatsApp message here... It will be sent to all selected customers."
                value={waMessage}
                onChange={e => setWaMessage(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {waResult && (
              <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 12,
                background: waResult.startsWith('✓') ? 'var(--emerald-dim)' : 'var(--rose-dim)',
                color:      waResult.startsWith('✓') ? 'var(--emerald)' : 'var(--rose)',
              }}>{waResult}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setWaModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)', minWidth: 160, opacity: (!waMessage.trim() || waSending) ? 0.6 : 1 }}
                disabled={!waMessage.trim() || waSending}
                onClick={sendBroadcast}
              >
                {waSending ? <><Icon name="loader-2" size={13} className="spin" /> Sending...</> : <><Icon name="send" size={13} /> Send to {selectedCustomers.length} Customers</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick view modal */}
      {viewCustomer && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="modal-content" onClick={(e: any) => e.stopPropagation()} style={{ width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="cust-avatar" style={{ background: viewCustomer.color, width: 44, height: 44, fontSize: 'var(--fs-base)' }}>{viewCustomer.initials}</div>
                <div>
                  <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)' }}>{viewCustomer.name}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{viewCustomer.tier} Customer · {viewCustomer.verified ? '✓ Verified' : 'Not Verified'}</div>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setViewCustomer(null)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { l: 'Phone',    v: viewCustomer.phone },
                { l: 'Email',    v: viewCustomer.email !== 'not-provided@bisenonepoint.com' ? viewCustomer.email : '—' },
                { l: 'City',     v: viewCustomer.city || '—' },
                { l: 'Joined',   v: viewCustomer.joined || '—' },
                { l: 'Spent',    v: `₹${(viewCustomer.totalSpent || 0).toLocaleString('en-IN')}` },
                { l: 'Orders',   v: String(viewCustomer.orders?.length || 0) },
              ].map((d, i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>{d.l}</div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginTop: 2 }}>{d.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }} onClick={() => { openDirectWA(viewCustomer.phone, viewCustomer.name); setViewCustomer(null); }}>
                <Icon name="message-circle" size={13} /> WhatsApp
              </button>
              <a className="btn btn-ghost btn-sm" href={`tel:${viewCustomer.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="phone" size={13} /> Call
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(new Set([viewCustomer.id])); setWaModal(true); setViewCustomer(null); }}>
                <Icon name="send" size={13} /> Send Custom Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
