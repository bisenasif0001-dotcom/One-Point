import React, { useState, useEffect, useCallback } from 'react';
import { PanelHeader, Card, Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';
import { OrderPipelinePanel } from './OrderPipeline';
import { AddCustomerModal } from '../Modals';

const BOT_STATUS_MAP: Record<string, { icon: string; color: string; label: string }> = {
  passed:        { icon: 'check-circle', color: 'var(--emerald)', label: 'Ready' },
  assigned:      { icon: 'user-check',   color: 'var(--blue)',    label: 'Assigned' },
  completed:     { icon: 'check-square', color: 'var(--emerald)', label: 'Done' },
  needs_payment: { icon: 'credit-card',  color: 'var(--amber)',   label: 'Pay Due' },
  needs_docs:    { icon: 'file-x',       color: 'var(--rose)',    label: 'Docs Due' },
  pending:       { icon: 'clock',        color: 'var(--text-3)',  label: 'Pending' },
  failed:        { icon: 'alert-circle', color: 'var(--rose)',    label: 'Failed' },
};

const BotStatusBadge = ({ orderId }: { orderId: string }) => {
  const [status, setStatus] = useState<string>('pending');
  const [running, setRunning] = useState(false);
  const TOKEN = localStorage.getItem('opds_admin_token') || '';

  const runBotCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRunning(true);
    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      const res = await fetch('/api/bot/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        const d = await res.json();
        setStatus(d.status || 'pending');
      }
    } catch { /* offline */ }
    setRunning(false);
  };

  const info = BOT_STATUS_MAP[status] || BOT_STATUS_MAP.pending;

  return (
    <button
      className="btn btn-ghost btn-xs"
      title={`Bot status: ${status}. Click to re-check.`}
      style={{ color: info.color, gap: 4, padding: '2px 6px' }}
      onClick={runBotCheck}
      disabled={running}
    >
      <Icon name={running ? 'loader-2' : info.icon} size={12} className={running ? 'spin' : ''} />
      {running ? '…' : info.label}
    </button>
  );
};

const AssignedBadge = ({ orderId, onAssignClick }: { orderId: string; onAssignClick: () => void }) => {
  const [assignee, setAssignee] = useState<string | null>(null);
  const TOKEN = localStorage.getItem('opds_admin_token') || '';

  useEffect(() => {
    fetch(`/api/admin/assignments?status=assigned`, { headers: { 'X-Admin-Token': token } })
      .then(r => r.json())
      .then(d => {
        const match = (d.assignments || []).find((a: any) => a.order_id === orderId || a.order_id === String(orderId));
        if (match) setAssignee(match.staff_name);
      })
      .catch(() => {});
  }, [orderId]);

  if (!assignee) {
    return (
      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--amber)', padding: '2px 6px' }} onClick={onAssignClick}>
        <Icon name="user-plus" size={12} /> Assign
      </button>
    );
  }
  return (
    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', fontWeight: 'var(--fw-semibold)', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon name="user-check" size={12} /> {assignee}
    </span>
  );
};

const money = (amount: any) => `Rs. ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function downloadInvoicePdf(invoiceNo?: string, orderId?: string) {
  const adminToken = localStorage.getItem('opds_admin_token') || '';
  if (orderId) {
    const url = `/api/admin/invoices/${encodeURIComponent(orderId)}`;
    fetch(url, { headers: { 'X-Admin-Token': adminToken } })
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.blob(); })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Invoice-${orderId}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      })
      .catch(() => {
        if (invoiceNo && invoiceNo !== 'N/A') window.open(`/api/invoices/${encodeURIComponent(invoiceNo)}.pdf`, '_blank');
        else alert('Invoice not yet available. Complete payment to generate invoice.');
      });
    return;
  }
  if (invoiceNo && invoiceNo !== 'N/A') window.open(`/api/invoices/${encodeURIComponent(invoiceNo)}.pdf`, '_blank');
}

const statusBadgeType = (status = '') => {
  if (status === 'Completed' || status === 'Verified') return 'success';
  if (status === 'Processing') return 'info';
  if (status === 'Failed' || status === 'Cancelled') return 'danger';
  return 'warning';
};

const paymentBadgeType = (status = '') => {
  if (status === 'Paid') return 'success';
  if (status === 'Failed') return 'danger';
  return 'warning';
};

const getActiveOrder = (customer: any) => {
  const orders = customer?.orders || [];
  return orders.find((order: any) => !['Completed', 'Cancelled'].includes(order.status)) || orders[0];
};

const getExpectedCompletion = (dateStr: string) => {
  if (!dateStr) return 'Pending';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 3);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getOrderSteps = (order: any) => {
  const isPaid = order?.payStatus === 'Paid';
  const isVerified = ['Verified', 'Processing', 'Completed'].includes(order?.status);
  const isProcessing = ['Processing', 'Completed'].includes(order?.status);
  const isCompleted = order?.status === 'Completed';
  
  const dateStr = order?.date || new Date().toISOString().slice(0, 10);
  
  return [
    { step: 'Submitted', label: 'Application Placed', date: dateStr, time: '10:15 AM', status: 'done' },
    { step: 'Under Review', label: 'Under Review', date: dateStr, time: '10:30 AM', status: isPaid ? 'done' : 'active' },
    { step: 'Docs Verified', label: isVerified ? 'Documents Verified' : 'Awaiting Verify', date: dateStr, time: isVerified ? '02:00 PM' : 'Pending', status: isVerified ? 'done' : (isPaid ? 'active' : 'pending') },
    { step: 'Processing', label: isProcessing ? 'In Progress' : 'In Queue', date: isProcessing ? dateStr : 'Pending', time: isProcessing ? '04:15 PM' : 'Pending', status: isProcessing ? (isCompleted ? 'done' : 'active') : 'pending' },
    { step: 'Completed', label: isCompleted ? 'Completed & Output' : 'Awaiting Dept', date: isCompleted ? dateStr : 'Pending', time: isCompleted ? '05:30 PM' : 'Pending', status: isCompleted ? 'done' : 'pending' }
  ];
};

const CustomerOrderTracker = ({ customer }: any) => {
  const order = getActiveOrder(customer);
  if (!order) {
    return (
      <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>
        <Icon name="package-x" size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
        <div>No active order found for this customer.</div>
      </div>
    );
  }
  const steps = getOrderSteps(order);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span className="chip" style={{ background: 'var(--blue-dim)', color: 'var(--blue)', borderColor: 'var(--blue-border)', marginBottom: 6 }}>Active Order: {order.id}</span>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>{order.service}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>Expected Completion: <strong style={{ color: 'var(--blue)' }}>{getExpectedCompletion(order.date)}</strong></div>
        </div>
        <Badge type={statusBadgeType(order.status)} className={order.status === 'Processing' ? 'pulse' : ''}>{order.status}</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, position: 'relative', marginTop: 12 }}>
        {steps.map((st, idx) => (
          <div key={idx} style={{ background: st.status === 'done' ? 'var(--emerald-dim)' : st.status === 'active' ? 'var(--blue-dim)' : 'var(--bg-1)', border: '1px solid', borderColor: st.status === 'done' ? 'var(--emerald-border)' : st.status === 'active' ? 'var(--blue-border)' : 'var(--border-1)', borderRadius: 10, padding: 12, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon name={st.status === 'done' ? 'check-circle' : st.status === 'active' ? 'loader' : 'clock'} size={14} className={st.status === 'active' ? 'spin' : ''} style={{ color: st.status === 'done' ? 'var(--emerald)' : st.status === 'active' ? 'var(--blue)' : 'var(--text-3)' }} />
              <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: st.status === 'done' ? 'var(--emerald)' : st.status === 'active' ? 'var(--blue)' : 'var(--text-3)' }}>{st.step}</span>
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', marginBottom: 4 }}>{st.label}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{st.date} {st.time !== 'Pending' && <span style={{ opacity: 0.7 }}>· {st.time}</span>}</div>
          </div>
        ))}
      </div>
    </>
  );
};

const CustomerHistoryTable = ({ orders, onDownload }: any) => {
  if (!orders?.length) {
    return <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>No orders found for this profile.</div>;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Order ID</th><th>Service / Product</th><th>Date</th><th>Payment</th><th>Amount</th><th>Status</th><th>Invoice</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order: any) => (
          <tr key={order.id}>
            <td><span style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', fontWeight: 'var(--fw-semibold)' }}>{order.id}</span></td>
            <td><span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)' }}>{order.service}</span></td>
            <td>{order.date}</td>
            <td><Badge type={paymentBadgeType(order.payStatus)}>{order.payStatus}</Badge></td>
            <td><strong>{money(order.amount)}</strong></td>
            <td><Badge type={statusBadgeType(order.status)}>{order.status}</Badge></td>
            <td><button className="btn btn-ghost btn-xs" style={{ color: 'var(--blue)' }} onClick={() => downloadInvoicePdf(order.invoiceNo, order.id)}><Icon name="download" size={12} /> {order.invoiceNo && order.invoiceNo !== 'N/A' ? 'Download' : 'Generate'}</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const CustomerProfileDashboard = ({ customer }: any) => {
  const { setActivePanel, updateCustomer, addNotification } = useApp();
  const orders = customer?.orders || [];
  const documents = customer?.documents || [];
  const activeCount = orders.filter((order: any) => !['Completed', 'Cancelled'].includes(order.status)).length;
  const supportPin = String(customer?.phone || '').replace(/\D/g, '').slice(-4) || '0000';
  const kycLabel = documents.length ? 'Documents linked' : customer?.verified ? 'Profile verified' : 'Details pending';
  const [editOpen, setEditOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    city: customer?.city || '',
  });

  useEffect(() => {
    setProfileDraft({
      name: customer?.name || '',
      email: customer?.email || '',
      city: customer?.city || '',
    });
  }, [customer?.id]);

  const saveProfile = () => {
    if (!customer?.id) return;
    updateCustomer(customer.id, profileDraft);
    addNotification({ title: 'Profile updated', sub: profileDraft.name || customer.name, time: 'just now', color: 'var(--blue)', icon: 'user-check', panelTarget: 'crm' });
    setEditOpen(false);
  };

  return (
    <>
      <Card bodyClass="card-body-flush">
        <div style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', minWidth: 260 }}>
            <div className="cust-avatar" style={{ background: customer?.color || 'var(--blue)', width: 72, height: 72, fontSize: 'var(--fs-2xl)', flexShrink: 0 }}>{customer?.initials || 'OP'}</div>
            <div>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-1)', flexWrap: 'wrap' }}>
                {customer?.name || 'One Point Customer'}
                <Badge type={customer?.verified ? 'success' : 'info'}><Icon name={customer?.verified ? 'check-circle' : 'user-check'} size={12} /> {customer?.verified ? 'Verified Customer' : 'Live Customer'}</Badge>
              </div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-2)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="phone" size={14} className="text-blue" /> {customer?.phone || 'Phone pending'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="mail" size={14} className="text-blue" /> {customer?.email || 'Email optional'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="map-pin" size={14} className="text-blue" /> {customer?.city || 'Location pending'}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditOpen(true)}><Icon name="edit-2" size={14} /> Edit Profile</button>
            <button className="btn btn-primary btn-sm" style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }} onClick={() => setActivePanel('whatsapp')}><Icon name="message-circle" size={14} /> WhatsApp Support</button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <div className="insight-card info" style={{ padding: 18 }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Total Purchases / Spent</div>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginTop: 4 }}>{money(customer?.totalSpent)}</div>
        </div>
        <div className="insight-card warning" style={{ padding: 18 }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Active Applications</div>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginTop: 4, color: 'var(--amber)' }}>{activeCount || orders.length} {activeCount === 1 || orders.length === 1 ? 'Order' : 'Orders'}</div>
        </div>
        <div className="insight-card positive" style={{ padding: 18 }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>KYC / Documents</div>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginTop: 4, color: 'var(--emerald)' }}>{kycLabel}</div>
        </div>
        <div className="insight-card" style={{ padding: 18, border: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Support Pin</div>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginTop: 4, color: 'var(--blue)' }}>#{supportPin}</div>
        </div>
      </div>

      <Card title="Live Application Status & Order Tracking" sub="Real-time service updates from the website flow">
        <div style={{ padding: '8px 0 24px' }}>
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
            <CustomerOrderTracker customer={customer} />
          </div>
          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', marginBottom: 16, padding: '0 24px' }}>Order & Payment History</div>
          <div style={{ border: '1px solid var(--border-1)', borderRadius: 8, overflow: 'hidden', margin: '0 24px' }}>
            <CustomerHistoryTable orders={orders} />
          </div>
        </div>
      </Card>

      <Card title="My Digital Locker & Submitted Documents" sub="Files and Drive links attached from the service request">
        {documents.length ? (
          <div style={{ padding: '12px 0', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            {documents.map((doc: any) => (
              <div key={doc.id || doc.title} className="doc-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border-2)', background: 'var(--bg-2)' }}>
                <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-3)', borderBottom: '1px solid var(--border-1)' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--blue-dim)', color: 'var(--blue)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="file-text" size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-1)' }}>
                      {doc.title} <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px' }}>{doc.format || 'FILE'}</span>
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{doc.size || 'Linked'} &middot; {doc.uploadedAt || customer?.joined || 'Recently added'}</div>
                  </div>
                  <Badge type="info">Linked</Badge>
                </div>
                <div style={{ padding: 16, background: 'var(--bg-1)' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="cpu" size={12} style={{ color: 'var(--violet)' }} /> Operator Review Data
                  </div>
                  <pre style={{ margin: 0, padding: 12, background: 'var(--bg-3)', borderRadius: 6, fontSize: 'var(--fs-xs)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.5, border: '1px solid var(--border-1)' }}>
                    {doc.extractedText || doc.extracted || 'Document metadata is linked with this order and ready for operator review.'}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 32, border: '1px dashed var(--border-2)', borderRadius: 10, color: 'var(--text-3)', textAlign: 'center' }}>
            <Icon name="folder-open" size={28} style={{ marginBottom: 8, opacity: 0.55 }} />
            <div>No submitted documents are linked yet.</div>
          </div>
        )}
      </Card>

      {editOpen && (
        <div className="modal-overlay" onClick={() => setEditOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)' }}>Edit Profile</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Update customer-visible details.</div>
              </div>
              <button className="icon-btn" onClick={() => setEditOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <label className="form-group"><span className="form-label">Full Name</span><input className="form-input" value={profileDraft.name} onChange={e => setProfileDraft(prev => ({ ...prev, name: e.target.value }))} /></label>
              <label className="form-group"><span className="form-label">Email</span><input className="form-input" value={profileDraft.email} onChange={e => setProfileDraft(prev => ({ ...prev, email: e.target.value }))} /></label>
              <label className="form-group"><span className="form-label">Address / City</span><input className="form-input" value={profileDraft.city} onChange={e => setProfileDraft(prev => ({ ...prev, city: e.target.value }))} /></label>
              <button className="btn btn-primary" onClick={saveProfile}><Icon name="save" size={14} /> Save Profile</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Admin CRM 360° View ──────────────────────────────────────────────────────
const CrmAdminView = ({ CUSTOMERS, selectedCustomerIndex, setSelectedCustomerIndex, setShowAddCustomer, setActivePanel, updateCustomer, addNotification, setAiAgentDoc, setAiStep, timelineEvents }: any) => {
  const selectedCustomer = CUSTOMERS[selectedCustomerIndex] || CUSTOMERS[0];
  const [editOpen, setEditOpen]   = React.useState(false);
  const [search, setSearch]       = React.useState('');
  const [editDraft, setEditDraft] = React.useState({ name: '', email: '', city: '', phone: '' });

  const openEdit = () => {
    setEditDraft({ name: selectedCustomer.name, email: selectedCustomer.email, city: selectedCustomer.city, phone: selectedCustomer.phone });
    setEditOpen(true);
  };
  const saveEdit = () => {
    updateCustomer(selectedCustomer.id, editDraft);
    addNotification({ title: 'Profile updated', sub: editDraft.name, time: 'just now', color: 'var(--blue)', icon: 'user-check', panelTarget: 'crm' });
    setEditOpen(false);
  };
  const openWhatsApp = (phone: string, name: string) => {
    const num = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Namaste ${name} ji, One Point Digital Services se bol raha hoon. Aapki koi madad kar sakta hoon?`);
    window.open(`https://wa.me/${num.length === 10 ? '91' + num : num}?text=${msg}`, '_blank');
  };

  const filteredCusts = search.trim()
    ? CUSTOMERS.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
    : CUSTOMERS;

  return (
    <>
      <PanelHeader title="Customer CRM" sub="360° Profile & Timeline" actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setActivePanel('customer-db')}>
            <Icon name="database" size={13} /> Customer Database
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddCustomer(true)}>
            <Icon name="user-plus" size={13} /> Add Customer
          </button>
        </div>
      } />
      <div className="panels">
        <div className="crm-360">
          {/* Left: Customer List */}
          <Card bodyClass="card-body-flush" style={{ height: 'calc(100vh - 160px)', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)' }}>
              <input type="text" className="form-input" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredCusts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>No customers found</div>
              ) : filteredCusts.map((c: any, i: number) => {
                const realIdx = CUSTOMERS.indexOf(c);
                return (
                  <div
                    key={c.id}
                    className={`crm-list-item ${realIdx === selectedCustomerIndex ? 'selected' : ''}`}
                    style={{ borderLeft: realIdx === selectedCustomerIndex ? '3px solid var(--blue)' : '3px solid transparent', cursor: 'pointer' }}
                    onClick={() => setSelectedCustomerIndex(realIdx)}
                  >
                    <div className="cust-avatar" style={{ background: c.color, width: 36, height: 36, fontSize: 'var(--fs-sm)' }}>{c.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{c.phone} · {c.tier}</div>
                    </div>
                    {c.orders?.length > 0 && <span style={{ fontSize: 'var(--fs-xs)', background: 'var(--blue-dim)', color: 'var(--blue)', padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>{c.orders.length}</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Right: Profile Detail */}
          <Card bodyClass="card-body-flush" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: 600 }}>
            {/* Profile Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div className="cust-avatar" style={{ background: selectedCustomer.color, width: 56, height: 56, fontSize: 'var(--fs-xl)', flexShrink: 0 }}>{selectedCustomer.initials}</div>
                  <div>
                    <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {selectedCustomer.name}
                      {selectedCustomer.verified && <Icon name="check-circle" size={16} style={{ color: 'var(--emerald)' }} />}
                      <span style={{ fontSize: 'var(--fs-xs)', background: 'var(--blue-dim)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 20, fontWeight: 'var(--fw-semibold)' }}>{selectedCustomer.tier}</span>
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="phone" size={12} /> {selectedCustomer.phone}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="mail" size={12} /> {selectedCustomer.email}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="map-pin" size={12} /> {selectedCustomer.city}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={openEdit}>
                    <Icon name="edit-2" size={13} /> Edit
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }}
                    onClick={() => openWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                    title={`Send WhatsApp to ${selectedCustomer.phone}`}
                  >
                    <Icon name="message-circle" size={13} /> WhatsApp
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActivePanel('assignments')} title="View assignments">
                    <Icon name="user-check" size={13} /> Assign
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                {[
                  { l: 'Lifetime Value', v: `₹${selectedCustomer.totalSpent?.toLocaleString('en-IN') || 0}`, color: 'var(--emerald)' },
                  { l: 'Total Orders', v: String(selectedCustomer.orders?.length || 0), color: 'var(--blue)' },
                  { l: 'Customer Tier', v: selectedCustomer.tier, color: 'var(--amber)' },
                ].map(k => (
                  <div key={k.l} className="insight-card" style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{k.l}</div>
                    <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', color: k.color }}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content: Orders + Timeline */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Orders + Documents */}
              <div style={{ flex: 2, padding: 20, borderRight: '1px solid var(--border-1)', overflowY: 'auto' }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginBottom: 12 }}>Complete Order History</div>
                {selectedCustomer.orders?.length > 0 ? (
                  <div style={{ border: '1px solid var(--border-1)', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-xs)' }}>
                      <thead style={{ background: 'var(--bg-3)' }}>
                        <tr>{['Order ID','Service','Date','Amount','Status','Invoice'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {selectedCustomer.orders.map((o: any) => (
                          <tr key={o.id} style={{ borderTop: '1px solid var(--border-1)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 'var(--fw-semibold)', color: 'var(--blue)', fontSize: 'var(--fs-xs)' }}>{o.id}</td>
                            <td style={{ padding: '10px 12px' }}>{o.service}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-3)' }}>{o.date}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 'var(--fw-semibold)' }}>₹{o.amount}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <Badge type={o.status === 'Completed' ? 'success' : o.status === 'Processing' ? 'info' : 'warning'}>{o.status}</Badge>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--blue)' }} onClick={() => downloadInvoicePdf(o.invoiceNo, o.id)}>
                                <Icon name="download" size={11} /> PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: 20, background: 'var(--bg-3)', borderRadius: 8, color: 'var(--text-3)', textAlign: 'center', marginBottom: 24, fontSize: 'var(--fs-xs)' }}>No orders found for this customer.</div>
                )}

                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginBottom: 12 }}>Saved Documents & Extracted Data</div>
                {selectedCustomer.documents?.length > 0 ? selectedCustomer.documents.map((doc: any) => (
                  <div key={doc.id || doc.title} style={{ border: '1px solid var(--border-2)', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Icon name="file-text" size={18} style={{ color: 'var(--blue)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{doc.title} <span className="chip" style={{ fontSize: 'var(--fs-xs)' }}>{doc.format}</span></div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{doc.size} · {doc.uploadedAt}</div>
                      </div>
                      <button className="btn btn-ghost btn-xs" onClick={() => { setAiAgentDoc(doc); setAiStep(0); }}>
                        <Icon name="cpu" size={11} /> AI Verify
                      </button>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: 16, border: '1px dashed var(--border-2)', borderRadius: 8, color: 'var(--text-3)', fontSize: 'var(--fs-xs)', textAlign: 'center' }}>
                    <Icon name="file-search" size={20} style={{ marginBottom: 6, opacity: 0.4 }} /><br />
                    No verified documents mapped to this profile yet.
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: 'var(--bg-3)' }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginBottom: 16 }}>Real-Time Activity</div>
                <div className="timeline" style={{ marginLeft: 6 }}>
                  {timelineEvents.map((ev: any, i: number) => (
                    <div key={i} className="timeline-item" style={{ paddingLeft: 24, paddingBottom: 20 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${ev.color}15`, color: ev.color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: -8, top: -2, zIndex: 1, border: '2px solid var(--bg-3)' }}>
                        <Icon name={ev.icon} size={13} />
                      </div>
                      <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-xs)' }}>{ev.title}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 3, lineHeight: 1.4 }}>{ev.desc}</div>
                    </div>
                  ))}
                  {selectedCustomer.joined && (
                    <div className="timeline-item pb-0" style={{ paddingLeft: 24 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-2)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: -8, top: -2, zIndex: 1, border: '2px solid var(--bg-3)' }}>
                        <Icon name="user" size={13} />
                      </div>
                      <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-xs)' }}>Customer Registered</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 3 }}>{selectedCustomer.joined}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="modal-overlay" onClick={() => setEditOpen(false)}>
          <div className="modal-content" onClick={(e: any) => e.stopPropagation()} style={{ width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div><div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)' }}>Edit Customer Profile</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{selectedCustomer.phone}</div></div>
              <button className="icon-btn" onClick={() => setEditOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { l: 'Full Name',         k: 'name',  type: 'text',  ph: 'Customer name' },
                { l: 'Phone Number',      k: 'phone', type: 'tel',   ph: '10-digit number' },
                { l: 'Email Address',     k: 'email', type: 'email', ph: 'email@example.com' },
                { l: 'Address / City',    k: 'city',  type: 'text',  ph: 'City or full address' },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 5, color: 'var(--text-2)' }}>{f.l}</label>
                  <input type={f.type} className="form-input" placeholder={f.ph} value={(editDraft as any)[f.k] || ''} onChange={e => setEditDraft((prev: any) => ({ ...prev, [f.k]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit}><Icon name="save" size={14} /> Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OrdersCrmPanels = ({ activePanel }: any) => {
  const { customers: CUSTOMERS, allOrders: ALL_ORDERS, role, updateOrderStatus, updateCustomer, setActivePanel, addActivity, addNotification } = useApp();
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(0);
  const [aiAgentDoc, setAiAgentDoc] = useState<any>(null);
  const [aiStep, setAiStep] = useState(0);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const isCustomer = role === 'customer';
  
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [reuploadingDoc, setReuploadingDoc] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const selectedCustomer: any = CUSTOMERS[selectedCustomerIndex] || CUSTOMERS[0] || {
    id: '',
    name: 'Customer',
    phone: '',
    initials: 'OP',
    color: 'var(--blue)',
    email: '',
    city: '',
    joined: '',
    verified: false,
    tier: 'Standard',
    totalSpent: 0,
    orders: [],
    documents: [],
  };

  // Load support tickets for customer
  useEffect(() => {
    if (role !== 'customer' || !selectedCustomer?.phone) return;

    const sessionToken = localStorage.getItem('opds_customer_session') || '';
    if (!sessionToken) {
      setTickets([]);
      return;
    }

    fetch(`/api/customer/tickets?phone=${encodeURIComponent(selectedCustomer.phone)}`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.tickets) setTickets(data.tickets);
      })
      .catch(() => {});
  }, [role, selectedCustomer?.phone, activePanel]);

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) return;
    setTicketStatus('submitting');
    try {
      const sessionToken = localStorage.getItem('opds_customer_session') || '';
      if (!sessionToken) {
        setTicketStatus('idle');
        addNotification({
          title: "Login Required",
          sub: "Please log in again before submitting a support ticket.",
          time: "just now",
          color: "var(--amber)",
          icon: "shield-alert"
        });
        return;
      }

      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      const res = await fetch('/api/customer/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          subject: newTicket.subject,
          message: newTicket.message
        })
      });
      if (res.ok) {
        setTicketStatus('success');
        setNewTicket({ subject: '', message: '' });
        const data = await fetch(`/api/customer/tickets?phone=${encodeURIComponent(selectedCustomer.phone)}`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }).then(r => r.json());
        if (data.tickets) setTickets(data.tickets);
        addNotification({
          title: "Support Ticket Created",
          sub: "Our RM will contact you shortly.",
          time: "just now",
          color: "var(--blue)",
          icon: "life-buoy"
        });
        setTimeout(() => setTicketStatus('idle'), 2000);
      }
    } catch {
      setTicketStatus('idle');
    }
  };

  const triggerSecureDownload = async (doc: any) => {
    try {
      const sessionToken = localStorage.getItem('opds_customer_session') || '';
      const res = await fetch(`/api/customer/documents/sign?docId=${doc.id}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (!res.ok) throw new Error('Failed to sign document');
      const data = await res.json();
      if (data.downloadUrl) {
        addNotification({
          title: "Expiry URL Generated",
          sub: `Link valid for 15 minutes: ${doc.title}`,
          time: "just now",
          color: "var(--emerald)",
          icon: "shield-check"
        });
        window.open(data.downloadUrl, '_blank');
      }
    } catch (err) {
      addNotification({
        title: "Download Failed",
        sub: "Could not generate secure signature link.",
        time: "just now",
        color: "var(--rose)",
        icon: "alert-triangle"
      });
    }
  };

  const handleReupload = (doc: any) => {
    setReuploadingDoc(doc);
  };

  const simulateUpload = (fileName: string) => {
    setUploading(true);
    setTimeout(() => {
      const updatedDocs = selectedCustomer.documents.map((d: any) => d.id === reuploadingDoc.id ? {
        ...d,
        title: fileName,
        format: fileName.split('.').pop()?.toUpperCase() || 'FILE',
        uploadedAt: new Date().toISOString().slice(0, 10),
        extractedText: `Document Type: ${d.type}\nFile name: ${fileName}\nUploaded: ${new Date().toLocaleTimeString()}\nStatus: Awaiting Operator Verification.`
      } : d);
      updateCustomer(selectedCustomer.id, { documents: updatedDocs });
      addNotification({
        title: "Document Re-uploaded",
        sub: `${fileName} has been updated in vault.`,
        time: "just now",
        color: "var(--blue)",
        icon: "upload-cloud"
      });
      setUploading(false);
      setReuploadingDoc(null);
    }, 1500);
  };
  
  useEffect(() => {
    if (!aiAgentDoc) return;
    
    // Auto increment step 0 -> 1 -> 2 -> 3
    if (aiStep >= 0 && aiStep <= 2) {
      const timer = setTimeout(() => {
        setAiStep(s => s + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [aiAgentDoc, aiStep]);

  const downloadInvoice = (invoiceNo?: string, orderId?: string) => downloadInvoicePdf(invoiceNo, orderId);

  const updateSelectedOrder = async (status: string, paymentStatus?: string) => {
    if (!selectedOrder?.id) return;
    await updateOrderStatus(selectedOrder.id, status, paymentStatus);
    setSelectedOrder((prev: any) => prev ? {
      ...prev,
      status,
      ...(paymentStatus ? { payStatus: paymentStatus === 'captured' ? 'Paid' : paymentStatus === 'failed' ? 'Failed' : 'Pending' } : {}),
    } : prev);
  };

  const assignAiPrecheck = (order: any) => {
    if (!order?.id) return;
    addActivity({
      text: `AI pre-check assigned for ${order.id} - ${order.service}`,
      color: 'var(--violet)',
      bg: 'var(--violet-dim)',
      icon: 'bot',
    });
    addNotification({
      title: `AI Review Ready: ${order.id}`,
      sub: 'Kabir can prepare checklist and mismatch alerts. Human approval is still required.',
      time: 'just now',
      color: 'var(--violet)',
      icon: 'bot',
      panelTarget: 'orders',
    });
    setSelectedOrder((prev: any) => prev ? {
      ...prev,
      notes: `${prev.notes || ''}${prev.notes ? '\n' : ''}AI pre-check assigned. Awaiting admin final review.`,
    } : prev);
  };

  // Generate dynamic timeline events for the selected customer based on their orders
  const getTimelineForCustomer = (customer: typeof CUSTOMERS[0]) => {
    if (!customer) return [];
    let timeline: any[] = [];
    
    // For every order, generate the typical flow of events
    customer.orders.forEach((order) => {
      const isCompleted = order.status === 'Completed';
      const isProcessing = order.status === 'Processing' || order.status === 'Completed';
      
      if (isCompleted) {
        timeline.push({
          title: 'WhatsApp notification sent',
          desc: `${order.date} · "Your ${order.service} is completed."`,
          icon: 'message-circle',
          color: 'var(--emerald)'
        });
      }
      
      if (isProcessing) {
        timeline.push({
          title: 'Invoice generated',
          desc: `${order.date} - Auto-generated invoice for ${order.id}`,
          icon: 'file-text',
          color: 'var(--blue)'
        });
        
        timeline.push({
          title: 'Payment received',
          desc: `${order.date} - ${money(order.amount)} via ${order.gateway || 'Online'}`,
          icon: 'credit-card',
          color: 'var(--emerald)'
        });
      }
      
      timeline.push({
        title: 'Documents uploaded',
        desc: `${order.date} · ID proofs & forms submitted`,
        icon: 'upload-cloud',
        color: 'var(--violet)'
      });
      
      timeline.push({
        title: `Service selected: ${order.service}`,
        desc: `${order.date} · Pre-filled application initiated`,
        icon: 'mouse-pointer',
        color: 'var(--blue)'
      });
    });

    return timeline;
  };

  const timelineEvents = getTimelineForCustomer(selectedCustomer);

  return (
    <>
      {activePanel === 'orders' && (
        <div className="panel active">
          <PanelHeader title="Orders & Applications" sub="All orders · Live management" />
          <div className="panels">
            <Card bodyClass="card-body-flush">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th><th>Order ID</th><th>Service / Item</th><th>Amount</th><th>Payment</th><th>Status</th><th>Bot</th><th>Assigned</th><th>Invoice</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_ORDERS.map((o, i) => (
                    <tr key={i}>
                      <td>
                        <div className="cust-cell">
                          <div className="cust-avatar" style={{ background: o.customer?.color || 'var(--blue)' }}>{o.customer?.initials || 'OP'}</div>
                          <div><div className="cust-name">{o.customer?.name || 'Customer'}</div><div className="cust-id">{o.customer?.phone || 'N/A'}</div></div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--blue)', padding: 0, background: 'transparent', border: 0 }}
                          onClick={() => setSelectedOrder(o)}
                        >
                          {o.id}
                        </button>
                      </td>
                      <td><span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)' }}>{o.service}</span></td>
                      <td><strong>{money(o.amount)}</strong></td>
                      <td><Badge type={paymentBadgeType(o.payStatus)}>{o.payStatus}</Badge></td>
                      <td><Badge type={statusBadgeType(o.status)}>{o.status}</Badge></td>
                      <td>
                        <BotStatusBadge orderId={o.id} />
                      </td>
                      <td>
                        <AssignedBadge orderId={o.id} onAssignClick={() => setActivePanel('assignments')} />
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: o.invoiceNo && o.invoiceNo !== 'N/A' ? 'var(--blue)' : 'var(--text-3)' }}
                          disabled={!o.invoiceNo || o.invoiceNo === 'N/A'}
                          onClick={() => downloadInvoice(o.invoiceNo, o.id)}
                        >
                          <Icon name="download" size={12} /> {o.invoiceNo && o.invoiceNo !== 'N/A' ? o.invoiceNo : 'Pending'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => setSelectedOrder(o)}>Details</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => updateOrderStatus(o.id, 'Verified')}>Verify</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => updateOrderStatus(o.id, 'Processing')}>Processing</button>
                          <button className="btn btn-primary btn-xs" onClick={() => updateOrderStatus(o.id, 'Completed')}>Complete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {ALL_ORDERS.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>No orders found yet.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
      {activePanel === 'crm' && (
        <div className="panel active">
          <CrmAdminView
            CUSTOMERS={CUSTOMERS}
            selectedCustomerIndex={selectedCustomerIndex}
            setSelectedCustomerIndex={setSelectedCustomerIndex}
            setShowAddCustomer={setShowAddCustomer}
            setActivePanel={setActivePanel}
            updateCustomer={updateCustomer}
            addNotification={addNotification}
            setAiAgentDoc={setAiAgentDoc}
            setAiStep={setAiStep}
            timelineEvents={timelineEvents}
          />
        </div>
      )}
      {activePanel === 'customer-home' && (
        <div className="panel active">
          <PanelHeader
            title="Customer Workspace Home"
            sub={`Welcome back, ${selectedCustomer.name} ji`}
            actions={
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={() => { window.location.href = '/online-services.html'; }}>
                  <Icon name="plus" size={14} /> Book New Service
                </button>
              </div>
            }
          />
          <div className="panels" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(() => {
              const activeOrders = selectedCustomer.orders?.filter((o: any) => !['Completed', 'Delivered'].includes(o.status)) || [];
              return activeOrders.length > 0 ? (
                <div style={{ background: 'rgba(201,146,26,0.08)', border: '1px solid var(--amber)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon name="clock" size={16} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', color: 'var(--amber)' }}>
                      {activeOrders.length} Active Application{activeOrders.length > 1 ? 's' : ''} In Progress
                    </span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginLeft: 8 }}>
                      {activeOrders.map((o: any) => o.service || o.title || o.id).join(' · ')}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--amber)', color: 'var(--amber)' }} onClick={() => setActivePanel('customer-apps')}>
                    Track Status <Icon name="arrow-right" size={12} />
                  </button>
                </div>
              ) : null;
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div className="insight-card info" style={{ padding: 18, border: '1px solid var(--border-1)', background: 'var(--bg-2)', borderRadius: 10 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>CSC Customer Level</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginTop: 4, color: 'var(--blue)' }}>{selectedCustomer.tier} Tier</div>
              </div>
              <div className="insight-card warning" style={{ padding: 18, border: '1px solid var(--border-1)', background: 'var(--bg-2)', borderRadius: 10 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Active Applications</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginTop: 4, color: 'var(--amber)' }}>
                  {selectedCustomer.orders?.filter((o: any) => o.status !== 'Completed').length || 0} In Progress
                </div>
              </div>
              <div className="insight-card positive" style={{ padding: 18, border: '1px solid var(--border-1)', background: 'var(--bg-2)', borderRadius: 10 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Verified Locker Documents</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginTop: 4, color: 'var(--emerald)' }}>
                  {selectedCustomer.documents?.length || 0} Files Safe
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Card title="Latest Application Tracker" sub="Real-time timeline tracking">
                  <CustomerOrderTracker customer={selectedCustomer} />
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={() => setActivePanel('customer-apps')}>
                    View All Applications <Icon name="arrow-right" size={14} />
                  </button>
                </Card>
                
                <Card title="Quick Services Guide" sub="Government registrations with 1-click apply">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { name: 'PAN Card Registration', icon: 'credit-card', color: 'var(--blue)' },
                      { name: 'Passport Assistance', icon: 'globe', color: 'var(--violet)' },
                      { name: 'Ayushman Card', icon: 'shield', color: 'var(--emerald)' },
                      { name: 'Income / Caste Certificate', icon: 'file-text', color: 'var(--amber)' }
                    ].map(s => (
                      <button key={s.name} className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: 12, borderRadius: 10, border: '1px solid var(--border-1)', background: 'var(--bg-2)' }} onClick={() => { window.location.href = '/online-services.html'; }}>
                        <Icon name={s.icon} size={16} style={{ color: s.color, marginRight: 8 }} /> {s.name}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Card title="Recent Activity" sub="Latest application status updates">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(selectedCustomer.orders?.slice(0, 4) || []).length > 0 ? (
                      selectedCustomer.orders.slice(0, 4).map((o: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 10, fontSize: 'var(--fs-xs)' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: o.status === 'Completed' ? 'var(--emerald)' : o.status === 'Rejected' ? 'var(--rose)' : 'var(--amber)', marginTop: 5, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--text-2)', lineHeight: 1.4 }}>
                              {o.service || o.title || 'Application'} — <strong>{o.status}</strong>
                            </div>
                            {o.date && <div style={{ color: 'var(--text-4)', marginTop: 2 }}>{o.date}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-4)', fontSize: 'var(--fs-xs)', textAlign: 'center', padding: '12px 0' }}>
                        No applications yet. Book a service to get started.
                      </div>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={() => setActivePanel('customer-apps')}>
                    View All Applications <Icon name="arrow-right" size={14} />
                  </button>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
      {activePanel === 'customer-apps' && (
        <div className="panel active">
          <PanelHeader title="My Applications & Track" sub="Real-time tracking of government service applications" />
          <div className="panels" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card title="Active Application Timeline" bodyClass="card-body-flush" style={{ padding: 20 }}>
              <CustomerOrderTracker customer={selectedCustomer} />
            </Card>
            <Card title="All Applications History" bodyClass="card-body-flush">
              <CustomerHistoryTable orders={selectedCustomer.orders} />
            </Card>
          </div>
        </div>
      )}
      {activePanel === 'customer-docs' && (
        <div className="panel active">
          <PanelHeader title="My Digital Document Locker" sub="Secure vault for document previews, downloads, and re-uploads" actions={<button className="btn btn-primary btn-sm" onClick={() => handleReupload({ id: 'new-doc', title: 'New File', type: 'DOC' })}><Icon name="upload-cloud" size={14} /> Upload New Doc</button>} />
          <div className="panels">
            <Card title="Secure Document Vault" sub="Watermarked previews and secure signed download URLs">
              {selectedCustomer.documents?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {selectedCustomer.documents.map((doc: any) => (
                    <div key={doc.id} className="doc-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: 0, overflow: 'hidden', border: '1px solid var(--border-2)', background: 'var(--bg-2)', borderRadius: 10 }}>
                      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-3)', borderBottom: '1px solid var(--border-1)' }}>
                        <div style={{ width: 40, height: 40, background: 'var(--blue-dim)', color: 'var(--blue)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="file-text" size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-1)' }}>
                            {doc.title} <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px' }}>{doc.format || 'PDF'}</span>
                          </div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{doc.size || '150 KB'} &middot; Uploaded on {doc.uploadedAt}</div>
                        </div>
                        <Badge type={doc.verified ? "success" : "warning"}>{doc.verified ? "Verified" : "Pending"}</Badge>
                      </div>
                      <div style={{ padding: 16, background: 'var(--bg-1)', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-1)' }}>
                        <button className="btn btn-ghost btn-xs text-blue" onClick={() => setPreviewDoc(doc)}><Icon name="eye" size={12} /> Preview (Watermark)</button>
                        <button className="btn btn-ghost btn-xs text-emerald" onClick={() => triggerSecureDownload(doc)}><Icon name="download" size={12} /> Secure Download</button>
                        <button className="btn btn-ghost btn-xs text-amber" onClick={() => handleReupload(doc)}><Icon name="upload" size={12} /> Re-upload</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
                  <Icon name="folder-open" size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <div>Locker is empty. Submit a service application to link documents.</div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
      {activePanel === 'customer-payments' && (
        <div className="panel active">
          <PanelHeader title="Payments & Receipts Ledger" sub="Download billing statements and verify transactions" />
          <div className="panels" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="insight-card positive" style={{ padding: 20, border: '1px solid var(--border-1)', background: 'var(--bg-2)', borderRadius: 10 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Total Paid</div>
                <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--emerald)', marginTop: 6 }}>
                  {money(selectedCustomer.orders?.filter((o: any) => o.payStatus === 'Paid').reduce((s: number, o: any) => s + (o.amount || 0), 0) || 0)}
                </div>
              </div>
              <div className="insight-card info" style={{ padding: 20, border: '1px solid var(--border-1)', background: 'var(--bg-2)', borderRadius: 10 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Lifetime Purchases</div>
                <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--blue)', marginTop: 6 }}>{money(selectedCustomer.totalSpent)}</div>
              </div>
              <div className="insight-card" style={{ padding: 20, border: '1px solid var(--border-1)', background: 'var(--bg-2)', borderRadius: 10 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Wallet Top-up</div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" size={14} /> Coming Soon
                </div>
              </div>
            </div>
            <Card title="Billing & Receipt History" bodyClass="card-body-flush">
              <CustomerHistoryTable orders={selectedCustomer.orders} />
            </Card>
          </div>
        </div>
      )}
      {activePanel === 'customer-support' && (
        <div className="panel active">
          <PanelHeader title="Customer Helpdesk & Tickets" sub="Get instant support from our experts and AI operators" />
          <div className="panels" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
            <Card title="Create Support Ticket" sub="Submit a question or issue to your RM">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Subject / Service Issue</label>
                  <input className="form-input" placeholder="e.g., PAN card document upload failed" value={newTicket.subject} onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Message / Details</label>
                  <textarea className="form-input" rows={4} placeholder="Describe your issue..." value={newTicket.message} onChange={e => setNewTicket(p => ({ ...p, message: e.target.value }))} style={{ width: '100%', resize: 'none' }} />
                </div>
                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleCreateTicket} disabled={ticketStatus === 'submitting' || !newTicket.subject.trim() || !newTicket.message.trim()}>
                  {ticketStatus === 'submitting' ? 'Submitting...' : ticketStatus === 'success' ? 'Submitted!' : 'Submit Support Ticket'}
                </button>
              </div>
            </Card>
            
            <Card title="Your Ticket History" bodyClass="card-body-flush">
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                {tickets.length > 0 ? (
                  tickets.map((t: any) => (
                    <div key={t.ticket_id} style={{ padding: 12, border: '1px solid var(--border-1)', borderRadius: 8, background: 'var(--bg-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-xs)', color: 'var(--blue)' }}>{t.ticket_id}</span>
                        <Badge type={t.status === 'open' ? 'warning' : 'success'}>{t.status}</Badge>
                      </div>
                      <div style={{ fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-sm)', color: 'var(--text-1)' }}>{t.subject}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>{t.message}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', marginTop: 6 }}>{new Date(t.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>No tickets submitted yet.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
      {activePanel === 'customer-profile' && (
        <div className="panel active">
          <PanelHeader title="My Account Settings" sub="Manage your customer profile and locker metadata" />
          <div className="panels" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <CustomerProfileDashboard customer={selectedCustomer} />
          </div>
        </div>
      )}
      {activePanel === 'kanban' && <OrderPipelinePanel />}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 820, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>Order Details</div>
                  <Badge type={statusBadgeType(selectedOrder.status)}>{selectedOrder.status}</Badge>
                  <Badge type={paymentBadgeType(selectedOrder.payStatus)}>{selectedOrder.payStatus}</Badge>
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>{selectedOrder.id} - {selectedOrder.service}</div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedOrder(null)}><Icon name="x" size={16} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 16, marginBottom: 16 }}>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, padding: 16, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 10, fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Customer</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="cust-avatar" style={{ background: selectedOrder.customer?.color || 'var(--blue)' }}>{selectedOrder.customer?.initials || 'OP'}</div>
                  <div>
                    <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>{selectedOrder.customer?.name || 'Customer'}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 3 }}>{selectedOrder.customer?.phone || 'N/A'} - {selectedOrder.customer?.email || 'Email not provided'}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 3 }}>{selectedOrder.customer?.city || 'Address not provided'}</div>
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, padding: 16, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 10, fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Payment</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>{money(selectedOrder.amount)}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 5 }}>{selectedOrder.gateway || 'Online'} - {selectedOrder.payStatus}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 10, fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Invoice</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 'var(--fw-semibold)' }}>{selectedOrder.invoiceNo && selectedOrder.invoiceNo !== 'N/A' ? selectedOrder.invoiceNo : 'Invoice pending'}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 3 }}>Generated after payment capture.</div>
                  </div>
                  <button className="btn btn-primary btn-sm" disabled={!selectedOrder.invoiceNo || selectedOrder.invoiceNo === 'N/A'} onClick={() => downloadInvoice(selectedOrder.invoiceNo)}>
                    <Icon name="download" size={14} /> Download
                  </button>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 10, fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Admin Workflow</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateSelectedOrder('Verified')}><Icon name="check-circle" size={14} /> Verify</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateSelectedOrder('Processing')}><Icon name="loader" size={14} /> Processing</button>
                  <button className="btn btn-primary btn-sm" onClick={() => updateSelectedOrder('Completed')}><Icon name="check" size={14} /> Complete</button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateSelectedOrder(selectedOrder.status, 'captured')}><Icon name="credit-card" size={14} /> Mark Paid</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateSelectedOrder(selectedOrder.status, 'failed')}><Icon name="alert-triangle" size={14} /> Mark Failed</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => assignAiPrecheck(selectedOrder)}><Icon name="bot" size={14} /> Assign AI Pre-check</button>
                </div>
                <div style={{ marginTop: 10, fontSize: 'var(--fs-xs)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="shield-check" size={13} style={{ color: 'var(--amber)' }} />
                  AI can prepare checks; admin final approval stays manual.
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Service / Item</div>
                  <div style={{ marginTop: 5, fontWeight: 'var(--fw-semibold)' }}>{selectedOrder.service}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Category</div>
                  <div style={{ marginTop: 5 }}>{selectedOrder.category || 'Website order'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Created</div>
                  <div style={{ marginTop: 5 }}>{selectedOrder.date || 'Live order'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, padding: 16, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 10, fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Documents / Links</div>
                {selectedOrder.attachments?.driveLink ? (
                  <a className="btn btn-ghost btn-sm" href={selectedOrder.attachments.driveLink} target="_blank" rel="noreferrer">
                    <Icon name="external-link" size={14} /> Open Drive Link
                  </a>
                ) : (
                  <div style={{ color: 'var(--text-3)', fontSize: 'var(--fs-sm)' }}>No Drive link attached.</div>
                )}
                {Array.isArray(selectedOrder.attachments?.files) && selectedOrder.attachments.files.length > 0 && (
                  <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
                    {selectedOrder.attachments.files.map((file: any, index: number) => (
                      <div key={`${file.name}-${index}`} style={{ padding: 8, border: '1px solid var(--border-1)', borderRadius: 6, fontSize: 'var(--fs-xs)' }}>
                        <Icon name="file" size={12} /> {file.name || `File ${index + 1}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, padding: 16, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 10, fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase' }}>Notes</div>
                <div style={{ minHeight: 74, color: selectedOrder.notes ? 'var(--text-2)' : 'var(--text-3)', fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>
                  {selectedOrder.notes || 'No customer notes added.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && <AddCustomerModal onClose={() => setShowAddCustomer(false)} />}

      {/* AI Agent Modal */}
      {aiAgentDoc && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: 600, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', background: 'var(--violet)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 'var(--fs-xl)' }}>👨‍💻</span>
                <div>
                  <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Kabir <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>EMP-AI-108</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.8)' }}>Executing dashboard tasks for {aiAgentDoc.title}</div>
                </div>
              </div>
              <button className="icon-btn" style={{ color: 'white' }} onClick={() => setAiAgentDoc(null)}><Icon name="x" size={18} /></button>
            </div>

            <div style={{ padding: 24, background: 'var(--bg-1)' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: aiStep >= 0 ? 1 : 0.4 }}>
                  <Icon name={aiStep > 0 ? "check-circle" : "loader"} size={20} className={aiStep === 0 ? "spin" : ""} style={{ color: aiStep === 0 ? 'var(--violet)' : 'var(--emerald)'}} />
                  <div style={{ fontWeight: 'var(--fw-medium)' }}>Reading & Extracting Data from Document...</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: aiStep >= 1 ? 1 : 0.4 }}>
                  <Icon name={aiStep > 1 ? "check-circle" : "loader"} size={20} className={aiStep === 1 ? "spin" : ""} style={{ color: aiStep === 1 ? 'var(--violet)' : 'var(--emerald)'}} />
                  <div style={{ fontWeight: 'var(--fw-medium)' }}>Cross-verifying extracted data with Customer Profile...</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: aiStep >= 2 ? 1 : 0.4 }}>
                  <Icon name={aiStep > 2 ? "check-circle" : aiStep === 2 ? "loader" : "loader"} size={20} className={aiStep === 2 ? "spin" : ""} style={{ color: aiStep === 2 ? 'var(--violet)' : 'var(--emerald)'}} />
                  <div style={{ fontWeight: 'var(--fw-medium)' }}>Updating internal CRM records and preparing draft...</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: aiStep >= 3 ? 1 : 0.4 }}>
                  <Icon name={aiStep > 3 ? "check-circle" : aiStep === 3 ? "loader" : "loader"} size={20} className={aiStep === 3 ? "spin" : ""} style={{ color: aiStep === 3 ? 'var(--violet)' : 'var(--emerald)'}} />
                  <div style={{ fontWeight: 'var(--fw-medium)' }}>Awaiting Admin check & final approval...</div>
                </div>
              </div>

              {aiStep === 3 && (
                <div style={{ padding: 20, background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--amber)', marginBottom: 12 }}>
                    <Icon name="alert-circle" size={24} />
                    <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>Waiting for Human Authorization</div>
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', marginBottom: 16 }}>The AI Agent has completed the internal dashboard tasks. Please verify the prepared order data and authorize the final system update.</div>
                  
                  <div style={{ padding: 16, background: 'rgba(255,255,255,0.7)', borderRadius: 6, marginBottom: 16, border: '1px solid var(--amber-border)' }}>
                     <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase' }}>Cross-Check Data Summary</div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 'var(--fs-sm)' }}>
                       <div><span style={{ color: 'var(--text-3)' }}>Service Type:</span> <strong>{selectedCustomer.orders?.[0]?.service || 'PAN Application'}</strong></div>
                       <div><span style={{ color: 'var(--text-3)' }}>Applicant:</span> <strong>{selectedCustomer.name}</strong></div>
                       <div><span style={{ color: 'var(--text-3)' }}>Doc Linked:</span> <strong>{aiAgentDoc.title}</strong></div>
                       <div><span style={{ color: 'var(--text-3)' }}>Status:</span> <strong style={{ color: 'var(--amber)' }}>Draft Prepared</strong></div>
                     </div>
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%', background: 'var(--amber)', color: '#000', borderColor: 'var(--amber)' }} onClick={() => setAiStep(4)}>
                    <Icon name="check" size={16} /> Data Matches - Approve & Finalize Task
                  </button>
                </div>
              )}

              {aiStep === 4 && (
                <div style={{ padding: 20, background: 'var(--emerald-dim)', border: '1px solid var(--emerald-border)', borderRadius: 8, textAlign: 'center' }}>
                  <Icon name="check-circle" size={48} style={{ color: 'var(--emerald)', marginBottom: 16 }} />
                  <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)', color: 'var(--emerald)', marginBottom: 8 }}>Dashboard Task Completed</div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-2)' }}>The task has been successfully finalized internally. Status has been updated in the CRM.</div>
                  <button className="btn btn-ghost" style={{ marginTop: 24, background: 'var(--bg-3)' }} onClick={() => setAiAgentDoc(null)}>Close Workflow</button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};
