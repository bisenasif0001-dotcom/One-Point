import React, { useState, useEffect } from 'react';
import { PanelHeader, Card, Icon, Badge } from '../Shared';
import { useApp } from '../AppContext';

const money = (amount: any) => `Rs. ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const paymentBadgeType = (status = '') => {
  if (status === 'Paid') return 'success';
  if (status === 'Failed') return 'danger';
  return 'warning';
};

const statusBadgeType = (status = '') => {
  if (status === 'Completed' || status === 'Verified') return 'success';
  if (status === 'Processing') return 'info';
  if (status === 'Failed' || status === 'Cancelled') return 'danger';
  return 'warning';
};

// ─── Ticket Detail Modal ──────────────────────────────────────────────────────
const TOKEN_TKT = localStorage.getItem('opds_admin_token') || '';

const TicketDetailModal = ({ ticket, isCustomer, customer, onClose, onWhatsApp }: any) => {
  const [replyText, setReplyText] = useState('');
  const [status, setStatus]       = useState(ticket.status || 'Open');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const customerPhone = ticket.phone || customer?.phone || '';
  const waNumber = customerPhone.replace(/\D/g, '');

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'X-Admin-Token': TOKEN_TKT, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ status }),
      }).catch(() => {});
    } catch { /* offline */ }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openWA = () => {
    const msg = encodeURIComponent(`Ticket ${ticket.id} reply:\n\n${replyText}`);
    window.open(`https://wa.me/${waNumber.length === 10 ? '91' + waNumber : waNumber}?text=${msg}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e: any) => e.stopPropagation()} style={{ width: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {ticket.id}
              <select
                className="form-input"
                style={{ fontSize: 'var(--fs-xs)', height: 26, padding: '0 8px', width: 140 }}
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Escalated">Escalated</option>
                <option value="Solved">Solved</option>
              </select>
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>{ticket.subject}</div>
            {ticket.customer && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', marginTop: 2 }}>Customer: <strong>{ticket.customer}</strong> · {ticket.phone}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {/* Original message */}
        <div style={{ padding: 14, border: '1px solid var(--border-1)', borderRadius: 10, background: 'var(--bg-2)', lineHeight: 1.7, color: 'var(--text-2)', fontSize: 'var(--fs-sm)', marginBottom: 16 }}>
          {ticket.reply || ticket.message || 'No message content.'}
        </div>

        {/* Reply section */}
        {!isCustomer && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>
              Reply / Admin Note
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Type your reply or internal note..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {waNumber && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--emerald)' }} onClick={openWA} disabled={!replyText.trim()}>
                <Icon name="message-circle" size={13} /> Reply via WhatsApp
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onWhatsApp}>
              <Icon name="message-circle" size={13} /> Open WA Center
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            {!isCustomer && (
              <button className="btn btn-primary" onClick={handleReply} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? <Icon name="loader-2" size={13} className="spin" /> : saved ? <Icon name="check" size={13} /> : <Icon name="save" size={13} />}
                {saved ? 'Saved!' : 'Save & Update'}
              </button>
            )}
            {isCustomer && <button className="btn btn-primary" onClick={onClose}>Done</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SupportTicketsPanel = () => {
  const { role, customers, allOrders, setActivePanel, addNotification } = useApp();
  const isCustomer = role === 'customer';
  const customer = customers[0];
  const latestOrder = customer?.orders?.[0];
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [localTickets, setLocalTickets] = useState<any[]>([]);
  const [ticketForm, setTicketForm] = useState({ subject: latestOrder ? `Help with ${latestOrder.service}` : 'Service support request', message: '' });

  const customerTickets = [
    ...localTickets,
    ...(latestOrder ? [{
      id: `TKT-${latestOrder.id.replace(/\D/g, '').slice(-5) || '1001'}`,
      subject: `${latestOrder.service} status support`,
      sub: `Regarding order ${latestOrder.id}`,
      date: latestOrder.date,
      status: latestOrder.status === 'Completed' ? 'Solved' : 'In Progress',
      updated: latestOrder.status === 'Completed' ? 'Completed by operator' : 'Waiting for operator update',
      reply: `Your request ${latestOrder.id} is currently ${latestOrder.status}. Payment status is ${latestOrder.payStatus}. We will share receipt/tracking updates after operator review.`,
    }] : []),
    ...((customer?.documents || []).length ? [{
      id: 'TKT-DOCS',
      subject: 'Submitted documents linked',
      sub: `${customer?.documents?.length || 0} file/link item(s) in Digital Locker`,
      date: customer?.joined || new Date().toISOString().slice(0, 10),
      status: 'Open',
      updated: 'Ready for operator review',
      reply: 'Your uploaded files or shared Drive link are visible in the Digital Locker. Operator will verify them before final processing.',
    }] : []),
  ];

  const adminTickets = allOrders
    .filter(order => order.payStatus !== 'Paid' || ['Pending', 'Verified'].includes(order.status))
    .slice(0, 8)
    .map(order => ({
      id: `TKT-${order.id.replace(/\D/g, '').slice(-5) || '1000'}`,
      customer: order.customer?.name || 'Customer',
      phone: order.customer?.phone || 'N/A',
      subject: `${order.service} - ${order.payStatus === 'Paid' ? 'verification pending' : 'payment attention needed'}`,
      status: order.payStatus === 'Failed' ? 'Escalated' : 'Open',
      priority: order.payStatus === 'Failed' ? 'High' : 'Medium',
      assigned: order.payStatus === 'Failed' ? 'AS' : 'OP',
      reply: `Order ${order.id}: ${order.status} / ${order.payStatus}. Customer amount ${money(order.amount)}.`,
    }));

  const TOKEN_SUPPORT = localStorage.getItem('opds_admin_token') || '';

  const createTicket = async () => {
    const subject = ticketForm.subject.trim();
    if (!subject) return;
    const ticket = {
      id: `TKT-${Date.now().toString().slice(-5)}`,
      subject,
      sub: latestOrder ? `Regarding order ${latestOrder.id}` : 'General support',
      date: new Date().toLocaleDateString('en-IN'),
      status: 'Open',
      updated: 'Created just now',
      reply: ticketForm.message.trim() || 'Support team will review this request and reply soon.',
    };
    setLocalTickets(prev => [ticket, ...prev]);
    addNotification({ title: `New Support Ticket: ${ticket.id}`, sub: subject, time: 'just now', color: 'var(--blue)', icon: 'life-buoy', panelTarget: 'support' });

    // Persist to backend
    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'X-Admin-Token': TOKEN_SUPPORT, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ phone: customer?.phone || '', name: customer?.name || 'Customer', subject, message: ticketForm.message.trim(), orderId: latestOrder?.id || null }),
      });
    } catch { /* offline — local state only */ }

    setShowNewTicket(false);
    setTicketForm({ subject: latestOrder ? `Help with ${latestOrder.service}` : 'Service support request', message: '' });
  };

  return (
    <div className="panel active">
      {isCustomer ? (
        <>
          <PanelHeader 
            title="My Support Tickets & Help Center" 
            sub="Track your raised queries or connect instantly with our CSC support experts" 
            actions={<button className="btn btn-primary btn-sm" onClick={() => setShowNewTicket(true)}><Icon name="plus" size={14} /> Raise New Ticket</button>} 
          />
          <div className="panels" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card title="Active & Recent Support Tickets" bodyClass="card-body-flush">
              {customerTickets.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th><th>Subject / Query</th><th>Date</th><th>Status</th><th>Last Updated</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerTickets.map(ticket => (
                      <tr key={ticket.id}>
                        <td><span style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', fontWeight: 'var(--fw-semibold)' }}>{ticket.id}</span></td>
                        <td><div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{ticket.subject}</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{ticket.sub}</div></td>
                        <td>{ticket.date}</td>
                        <td><Badge type={ticket.status === 'Solved' ? 'success' : 'warning'} className={ticket.status !== 'Solved' ? 'pulse' : ''}>{ticket.status}</Badge></td>
                        <td><span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{ticket.updated}</span></td>
                        <td><button className="btn btn-ghost btn-xs" style={{ color: 'var(--blue)' }} onClick={() => setSelectedTicket(ticket)}><Icon name="message-square" size={12} /> View Reply</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                  <Icon name="life-buoy" size={28} style={{ marginBottom: 8, opacity: 0.45 }} />
                  <div>No support ticket yet. Raise one if you need help with your application.</div>
                </div>
              )}
            </Card>

            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 16, padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--blue-dim)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="life-buoy" size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', marginBottom: 4 }}>Need immediate emergency support?</div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)' }}>Use our Direct WhatsApp Support or call your dedicated RM Asif Bisen with Support PIN #8841.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }} onClick={() => setActivePanel('whatsapp')}>
                  <Icon name="message-circle" size={14} /> Direct WhatsApp Chat
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <PanelHeader title="Support Tickets" sub="Manage customer issues and escalations" actions={<button className="btn btn-primary btn-sm" onClick={() => setShowNewTicket(true)}><Icon name="plus" /> New Ticket</button>} />
          <div className="panels">
            <Card bodyClass="card-body-flush">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th><th>Customer</th><th>Subject</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminTickets.map(ticket => (
                    <tr key={ticket.id}>
                      <td><span style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)' }}>{ticket.id}</span></td>
                      <td><div style={{ fontWeight: 'var(--fw-semibold)' }}>{ticket.customer}</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{ticket.phone}</div></td>
                      <td>{ticket.subject}</td>
                      <td><Badge type={ticket.status === 'Escalated' ? 'danger' : 'warning'}>{ticket.status}</Badge></td>
                      <td>{ticket.priority}</td>
                      <td><div className="cust-avatar" style={{ background: 'var(--blue)', width: 24, height: 24, fontSize: 'var(--fs-xs)' }}>{ticket.assigned}</div></td>
                      <td><button className="btn btn-ghost btn-xs" onClick={() => setSelectedTicket(ticket)}>Open</button></td>
                    </tr>
                  ))}
                  {adminTickets.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28 }}>No open support tickets from live orders.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}

      {showNewTicket && (
        <div className="modal-overlay" onClick={() => setShowNewTicket(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)' }}>Raise Support Ticket</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Ticket will be visible in this dashboard immediately.</div>
              </div>
              <button className="icon-btn" onClick={() => setShowNewTicket(false)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="form-group">
                <span className="form-label">Subject</span>
                <input className="form-input" value={ticketForm.subject} onChange={e => setTicketForm(prev => ({ ...prev, subject: e.target.value }))} />
              </label>
              <label className="form-group">
                <span className="form-label">Message</span>
                <textarea className="form-input" style={{ minHeight: 120, resize: 'vertical' }} value={ticketForm.message} onChange={e => setTicketForm(prev => ({ ...prev, message: e.target.value }))} placeholder="Describe the issue or instruction..." />
              </label>
              <button className="btn btn-primary" onClick={createTicket}><Icon name="send" size={14} /> Create Ticket</button>
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isCustomer={isCustomer}
          customer={customer}
          onClose={() => setSelectedTicket(null)}
          onWhatsApp={() => { setActivePanel('whatsapp'); setSelectedTicket(null); }}
        />
      )}
    </div>
  );
};

const VQ_TOKEN = localStorage.getItem('opds_admin_token') || '';

export const VerificationQueuePanel = () => {
  const { role, customers, addNotification } = useApp();
  const isCustomer = role === 'customer';
  const customer = customers[0];

  // Real document queue from backend + fallback demo items
  const [queue, setQueue] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    fetch('/api/admin/documents', { headers: { 'X-Admin-Token': VQ_TOKEN } })
      .then(r => r.json())
      .then(d => {
        const real = (d.documents || []).map((doc: any) => ({
          id:       `VQ-${doc.id}`,
          dbId:     doc.id,
          cust:     doc.customer_name || 'Customer',
          phone:    doc.customer_phone || 'N/A',
          docType:  `${doc.doc_type?.replace(/_/g, ' ').toUpperCase()} — ${doc.file_name}`,
          orderId:  doc.order_id,
          extractedData: { name: doc.customer_name || 'N/A', idNo: doc.doc_type || 'uploaded' },
          fraudFlags: [],
          status:   doc.verified ? 'Approved' : 'Pending Review',
          tag:      doc.uploaded_by === 'customer' ? 'Customer Upload' : 'Admin Upload',
          color:    doc.verified ? 'var(--emerald)' : 'var(--amber)',
          fileUrl:  doc.file_url || null,
          verified: doc.verified,
          createdAt: doc.created_at,
        }));
        // If no real docs yet, show demo items so panel isn't empty
        if (real.length === 0) {
          setQueue([
            { id: 'VQ-DEMO1', dbId: null, cust: 'Nida Begum', phone: '+91 9876543210', docType: 'Aadhaar Card (Demo)', extractedData: { name: 'Nida Begum', idNo: 'XXXX-XXXX-1234' }, fraudFlags: [], status: 'Pending Review', tag: 'Demo Item', color: 'var(--amber)', fileUrl: null, verified: false },
            { id: 'VQ-DEMO2', dbId: null, cust: 'Anil Sharma',  phone: '+91 9123456789', docType: 'PAN Card (Demo)',      extractedData: { name: 'Anil Sharma',  idNo: 'ABCDE1234F'     }, fraudFlags: [], status: 'Pending Review', tag: 'Demo Item', color: 'var(--amber)', fileUrl: null, verified: false },
          ]);
        } else {
          setQueue(real);
        }
      })
      .catch(() => setQueue([]))
      .finally(() => setLoadingDocs(false));
  }, []);

  const handleAction = async (id: string, action: string) => {
    const item = queue.find(q => q.id === id);
    if (item?.dbId) {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      await fetch(`/api/admin/documents/${item.dbId}`, {
        method: 'PATCH',
        headers: { 'X-Admin-Token': VQ_TOKEN, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ verified: action === 'approve' ? 1 : 0 }),
      }).catch(() => {});
    }
    setQueue(prev => action === 'reject' ? prev.filter(q => q.id !== id)
      : prev.map(q => q.id === id ? { ...q, status: action === 'approve' ? 'Approved' : action === 'request_reupload' ? 'Re-upload Requested' : q.status, color: action === 'approve' ? 'var(--emerald)' : 'var(--amber)' } : q));
    setSelectedDoc(null);
  };
  
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [hiddenDocIds, setHiddenDocIds] = useState<string[]>([]);
  const customerDocuments = (customer?.documents || []).filter((doc: any) => !hiddenDocIds.includes(doc.id || doc.title));

  const openCustomerDoc = (doc: any) => {
    setSelectedDoc({
      ...doc,
      cust: customer?.name || 'Customer',
      phone: customer?.phone || 'N/A',
      docType: doc.title || 'Customer Document',
      fraudFlags: [],
      extractedData: {
        name: customer?.name || 'Customer',
        idNo: doc.type || doc.format || 'Linked file',
      },
      extractedText: doc.extractedText || doc.extracted || 'Document metadata is linked with this order and ready for operator review.',
    });
  };

  const downloadCustomerDoc = (doc: any) => {
    const text = [
      doc.title || 'Customer Document',
      `Customer: ${customer?.name || 'Customer'}`,
      `Phone: ${customer?.phone || 'N/A'}`,
      '',
      doc.extractedText || doc.extracted || 'No extracted metadata available.',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(doc.title || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hideCustomerDoc = (doc: any) => {
    setHiddenDocIds(prev => [...prev, doc.id || doc.title]);
    addNotification({ title: 'Document hidden from locker', sub: doc.title || 'Customer document', time: 'just now', color: 'var(--amber)', icon: 'trash-2', panelTarget: 'documents' });
  };

  // handleAction is defined above with async backend call

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isCustomer ? (
        <>
          <PanelHeader title="My Digital Locker" sub="Files and Drive links submitted from your service requests" actions={<button className="btn btn-primary btn-sm" onClick={() => { window.location.href = '/online-services.html#apply-now'; }}><Icon name="upload-cloud" size={14} /> Upload New Document</button>} />
          <div className="panels" style={{ flex: 1, overflowY: 'auto' }}>
            {customerDocuments.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 }}>
                {customerDocuments.map((doc: any) => (
                  <Card key={doc.id || doc.title} title={doc.title || 'Customer Document'} sub={`Linked on ${doc.uploadedAt || customer?.joined || 'recently'} - ${doc.size || 'metadata saved'}`} actions={<span className="chip" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>{doc.format || 'FILE'}</span>}>
                    <div style={{ padding: '16px 0 0' }}>
                      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="cpu" size={12} style={{ color: 'var(--violet)' }} /> Operator Review Data
                      </div>
                      <pre style={{ margin: 0, padding: 16, background: 'var(--bg-3)', borderRadius: 8, fontSize: 'var(--fs-sm)', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: 1.5, border: '1px solid var(--border-1)' }}>
                        {doc.extractedText || doc.extracted || 'Document metadata is linked with this order and ready for operator review.'}
                      </pre>
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border-1)', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'var(--fw-semibold)' }}><Icon name="check-circle" size={14} /> Linked with service request</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue)' }} onClick={() => openCustomerDoc(doc)}><Icon name="eye" size={14} /> View</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue)' }} onClick={() => downloadCustomerDoc(doc)}><Icon name="download" size={14} /> Download</button>
                          <button className="btn btn-ghost btn-sm text-rose" onClick={() => hideCustomerDoc(doc)}><Icon name="trash-2" size={14} /> Hide</button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div style={{ padding: 40, border: '1px dashed var(--border-2)', borderRadius: 16, background: 'var(--bg-2)', textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon name="folder-open" size={34} style={{ marginBottom: 10, opacity: 0.5 }} />
                <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', marginBottom: 6 }}>No linked documents yet</div>
                <div style={{ marginBottom: 16 }}>Upload files or paste a shared Drive link from the service request form.</div>
                <button className="btn btn-primary" onClick={() => { window.location.href = '/online-services.html#apply-now'; }}><Icon name="upload-cloud" size={14} /> Start Upload</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <PanelHeader title="Verification Queue" sub="Pending document verifications and automated fraud detection" actions={<button className="btn btn-primary btn-sm"><Icon name="shield" size={14} /> Run Global Scan</button>} />
          <div className="panels" style={{ flex: 1, overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div className="insight-card info" style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Pending Review</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>24</div>
              </div>
              <div className="insight-card warning" style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>AI Flagged (Low Risk)</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>8</div>
              </div>
              <div className="insight-card alert" style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Critical Fraud Alerts</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--rose)' }}>{queue.filter(q => q.fraudFlags.length > 0).length}</div>
              </div>
            </div>

            <div className="grid-3">
              {queue.map((d, i) => (
                <Card key={i} bodyClass="card-body-flush" style={d.fraudFlags.length > 0 ? { border: '1px solid var(--rose-border)', background: 'var(--rose-dim)' } : {}}>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{d.cust}</div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{d.docType}</div>
                      </div>
                      <Badge type={d.color === 'var(--rose)' ? 'danger' : 'warning'}>{d.status}</Badge>
                    </div>
                    
                    <div style={{ height: 120, background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', cursor: 'pointer' }} onClick={() => setSelectedDoc(d)} className="hover-lift">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Icon name="file-image" size={32} />
                        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)' }}>Click to preview</div>
                      </div>
                    </div>

                    {d.fraudFlags.length > 0 && (
                      <div style={{ background: 'var(--rose-dim)', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--rose-border)' }}>
                        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--rose)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="alert-triangle" size={12} /> FRAUD DETECTED
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 'var(--fs-xs)', color: 'var(--text-1)' }}>
                          {d.fraudFlags.map((flag, idx) => (
                            <li key={idx} style={{ marginBottom: 2 }}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setSelectedDoc(d)}>Review File</button>
                      {d.fraudFlags.length === 0 && <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleAction(d.id, 'approve')}>Approve</button>}
                      {d.fraudFlags.length > 0 && <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleAction(d.id, 'reject')}><Icon name="slash" size={14} /> Reject & Block</button>}
                    </div>
                  </div>
                </Card>
              ))}
              {queue.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                  <Icon name="check-circle" size={32} style={{ marginBottom: 12, opacity: 0.5, color: 'var(--emerald)' }} />
                  <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)', color: 'var(--text-1)' }}>All caught up!</div>
                  <div style={{ fontSize: 'var(--fs-sm)' }}>No pending documents in the queue.</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {selectedDoc && (
        <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 800, padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                 <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', lineHeight: 1.3 }}>{selectedDoc.cust} &mdash; Document Review</div>
                 <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{selectedDoc.id} · {selectedDoc.docType}</div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedDoc(null)}><Icon name="x" size={18} /></button>
            </div>
            
            <div style={{ display: 'flex' }}>
              {/* Document Preview Area */}
              <div style={{ flex: 3, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-1)', position: 'relative', minHeight: 400 }}>
                <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                  <button className="btn-icon-sm" style={{ background: 'var(--bg-1)' }}><Icon name="zoom-in" size={16} /></button>
                  <button className="btn-icon-sm" style={{ background: 'var(--bg-1)' }}><Icon name="rotate-cw" size={16} /></button>
                </div>
                <div style={{ width: '80%', height: '70%', border: '4px dashed var(--border-2)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)' }}>
                  <Icon name="file-image" size={48} style={{ marginBottom: 16 }} />
                  <div style={{ fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-sm)' }}>{selectedDoc.docType}</div>
                  <div style={{ fontSize: 'var(--fs-xs)' }}>Preview Placeholder</div>
                </div>

                {selectedDoc.fraudFlags.length > 0 && (
                   <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid var(--rose-border)', borderRadius: 8, padding: 12 }}>
                     <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert-triangle" size={14} /> AI Fraud Analysis</div>
                     <ul style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--fs-xs)' }}>
                       {selectedDoc.fraudFlags.map((flag: string, i: number) => <li key={i}>{flag}</li>)}
                     </ul>
                   </div>
                )}
              </div>
              
              {/* Data Extraction & Action Area */}
              <div style={{ flex: 2, padding: 20, background: 'var(--bg-1)' }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="cpu" size={14} style={{ color: 'var(--blue)' }} /> Extracted Data (OCR)
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                   <div className="form-group">
                     <label className="form-label">Full Name</label>
                     <input type="text" className="form-input" defaultValue={selectedDoc.extractedData.name} />
                   </div>
                   <div className="form-group">
                     <label className="form-label">Identifier (Aadhaar/PAN)</label>
                     <input type="text" className="form-input" defaultValue={selectedDoc.extractedData.idNo} />
                   </div>
                   <div className="form-group">
                     <label className="form-label">Phone Number</label>
                     <input type="text" className="form-input" defaultValue={selectedDoc.phone} />
                   </div>
                </div>

                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginBottom: 12, color: 'var(--text-1)' }}>Verification Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => handleAction(selectedDoc.id, 'approve')}><Icon name="check" size={16} /> Approve Document</button>
                  <button className="btn btn-ghost" style={{ color: 'var(--amber)', borderColor: 'var(--amber-border)' }} onClick={() => handleAction(selectedDoc.id, 'request_reupload')}><Icon name="refresh-cw" size={16} /> Request Re-upload</button>
                  <button className="btn btn-danger" onClick={() => handleAction(selectedDoc.id, 'reject')}><Icon name="slash" size={16} /> Reject & Suspend User</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const RefundsPanel = () => {
  const { allOrders, addNotification, addActivity } = useApp();
  const TOKEN = localStorage.getItem('opds_admin_token') || '';

  // Build refund list from failed/cancelled orders + demo rows
  const [refunds, setRefunds] = React.useState(() => {
    const fromOrders = allOrders
      .filter((o: any) => o.payStatus === 'Failed' || o.status === 'Cancelled')
      .slice(0, 8)
      .map((o: any) => ({
        orderId: o.id,
        customer: o.customer?.name || 'Customer',
        amount: `₹${Number(o.amount || 0).toLocaleString('en-IN')}`,
        reason: o.status === 'Cancelled' ? 'Order cancelled' : 'Payment failed',
        status: 'Requested',
        gateway: o.gateway || 'razorpay',
      }));
    if (fromOrders.length > 0) return fromOrders;
    return [
      { orderId: 'ORD-2026-1002', customer: 'Sameer Khan',  amount: '₹1,200', reason: 'Service unavailable',  status: 'Requested', gateway: 'razorpay' },
      { orderId: 'ORD-2026-0988', customer: 'Anita Desai',  amount: '₹499',   reason: 'Duplicate payment',    status: 'Approved',  gateway: 'razorpay' },
    ];
  });

  const [processing, setProcessing] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<any>(null);

  const handleReview = (r: any) => setSelected(r);

  const handleProcess = async (r: any) => {
    setProcessing(r.orderId);
    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ orderId: r.orderId, refundType: 'full', reason: r.reason, gateway: r.gateway }),
      });
      const data = await res.json();
      setRefunds((prev: any[]) => prev.map((x: any) => x.orderId === r.orderId ? { ...x, status: data.error ? 'Error' : 'Processed' } : x));
      addActivity({ text: `Refund processed for ${r.customer} — ${r.amount}`, color: 'var(--blue)', bg: 'var(--blue-dim)', icon: 'rotate-ccw' });
      addNotification({ title: 'Refund Processed', sub: `${r.amount} for ${r.customer}`, time: 'just now', color: 'var(--blue)', icon: 'check-circle', panelTarget: 'refunds' });
    } catch {
      setRefunds((prev: any[]) => prev.map((x: any) => x.orderId === r.orderId ? { ...x, status: 'Approved' } : x));
    }
    setProcessing(null);
  };

  return (
    <div className="panel active">
      <PanelHeader title="Refund Management" sub="Track and process customer refund requests" />
      <div className="panels">
        <Card bodyClass="card-body-flush">
          <table className="data-table">
            <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {refunds.map((r: any, i: number) => (
                <tr key={i}>
                  <td><span style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', fontWeight: 'var(--fw-semibold)' }}>{r.orderId}</span></td>
                  <td><div style={{ fontWeight: 'var(--fw-semibold)' }}>{r.customer}</div></td>
                  <td><strong>{r.amount}</strong></td>
                  <td style={{ color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>{r.reason}</td>
                  <td>
                    <Badge type={r.status === 'Processed' ? 'success' : r.status === 'Approved' ? 'info' : r.status === 'Error' ? 'danger' : 'warning'}>{r.status}</Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.status === 'Requested' && (
                        <button className="btn btn-ghost btn-xs" onClick={() => handleReview(r)}>
                          <Icon name="eye" size={12} /> Review
                        </button>
                      )}
                      {(r.status === 'Approved' || r.status === 'Requested') && (
                        <button className="btn btn-primary btn-xs" disabled={processing === r.orderId} onClick={() => handleProcess(r)} style={{ opacity: processing === r.orderId ? 0.6 : 1 }}>
                          {processing === r.orderId ? <Icon name="loader-2" size={11} className="spin" /> : <Icon name="rotate-ccw" size={11} />} {processing === r.orderId ? '...' : 'Process'}
                        </button>
                      )}
                      {r.status === 'Processed' && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--emerald)', fontWeight: 'var(--fw-semibold)' }}>✓ Done</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Review modal */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 460 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div><div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)' }}>Review Refund Request</div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{selected.orderId}</div></div>
                <button className="icon-btn" onClick={() => setSelected(null)}><Icon name="x" size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 4 }}>Customer</div><div style={{ fontWeight: 'var(--fw-semibold)' }}>{selected.customer}</div></div>
                  <div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 4 }}>Amount</div><div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--rose)' }}>{selected.amount}</div></div>
                </div>
                <div><div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 4 }}>Reason</div><div style={{ padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 8, fontSize: 'var(--fs-sm)' }}>{selected.reason}</div></div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
                  <button className="btn btn-primary" onClick={() => { handleProcess(selected); setSelected(null); }} style={{ background: 'var(--blue)' }}>
                    <Icon name="rotate-ccw" size={14} /> Approve & Process Refund
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const FinancePanel = () => {
  const { allOrders, role, customers, setActivePanel } = useApp();
  const isCustomer = role === 'customer';
  const currentCustomer = customers[0];
  const visibleOrders = isCustomer ? (currentCustomer?.orders || []) : allOrders;
  const paidOrders = visibleOrders.filter((order: any) => order.payStatus === 'Paid');
  const pendingOrders = visibleOrders.filter((order: any) => order.payStatus === 'Pending');
  const failedOrders = visibleOrders.filter((order: any) => order.payStatus === 'Failed');
  const totalPaid = paidOrders.reduce((sum: number, order: any) => sum + Number(order.amount || 0), 0);
  const totalPending = pendingOrders.reduce((sum: number, order: any) => sum + Number(order.amount || 0), 0);
  const walletBalance = isCustomer ? Math.max(0, 500 - Math.min(500, Math.round((currentCustomer?.totalSpent || 0) / 10))) : 0;
  const methodBreakdown = visibleOrders.reduce((acc: Record<string, number>, order: any) => {
    const key = order.gateway || 'Online';
    acc[key] = (acc[key] || 0) + Number(order.amount || 0);
    return acc;
  }, {});
  const methodCards = Object.entries(methodBreakdown).length
    ? Object.entries(methodBreakdown).map(([gateway, amount]) => ({
      l: gateway,
      v: money(amount),
      p: `${visibleOrders.filter((order: any) => (order.gateway || 'Online') === gateway).length} txn`,
    }))
    : [{ l: 'No payments yet', v: money(0), p: '0 txn' }];

  const exportCsv = () => {
    const rows = [
      ['Order ID', 'Customer', 'Service', 'Gateway', 'Payment Status', 'Order Status', 'Amount'],
      ...visibleOrders.map((order: any) => [
        order.id,
        order.customer?.name || currentCustomer?.name || 'Customer',
        order.service,
        order.gateway,
        order.payStatus,
        order.status,
        String(order.amount),
      ]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `one-point-payment-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel active">
      <PanelHeader
        title={isCustomer ? 'My Wallet & Payments' : 'Payment Ledger'}
        sub={isCustomer ? 'Your service payments, wallet balance, and receipts' : 'Real-time transaction breakdown from live orders'}
        actions={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={exportCsv}><Icon name="download" size={14} /> Export CSV</button>
            {isCustomer && <button className="btn btn-primary btn-sm" onClick={() => setActivePanel('orders')}><Icon name="package" size={14} /> View Orders</button>}
          </div>
        }
      />
      <div className="panels">
        <div className="grid-4">
           {[
             { l: isCustomer ? 'Wallet Balance' : 'Paid Revenue', v: isCustomer ? money(walletBalance) : money(totalPaid), p: isCustomer ? 'Available for future services' : `${paidOrders.length} paid order(s)` },
             { l: 'Pending Payments', v: money(totalPending), p: `${pendingOrders.length} pending` },
             { l: 'Failed Payments', v: money(failedOrders.reduce((sum: number, order: any) => sum + Number(order.amount || 0), 0)), p: `${failedOrders.length} failed` },
             { l: 'Total Orders', v: String(visibleOrders.length), p: isCustomer ? 'Your profile' : 'Current dashboard data' },
           ].map((m,i)=> (
             <Card key={i}>
               <div style={{ padding: 16 }}>
                 <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>{m.l}</div>
                 <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{m.v}</div>
                 <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', marginTop: 4 }}>{m.p}</div>
               </div>
             </Card>
           ))}
        </div>
        {!isCustomer && (
          <div className="grid-4">
             {methodCards.slice(0, 4).map((m,i)=> (
               <Card key={i}>
                 <div style={{ padding: 16 }}>
                   <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>{m.l}</div>
                   <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{m.v}</div>
                   <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', marginTop: 4 }}>{m.p}</div>
                 </div>
               </Card>
             ))}
          </div>
        )}
        <Card title={isCustomer ? 'My Payment History' : 'Recent Transactions'} bodyClass="card-body-flush">
          <table className="data-table">
            <thead>
              <tr>
                <th>Txn / Order ID</th><th>Date</th><th>{isCustomer ? 'Service' : 'Customer'}</th><th>Method</th><th>Amount</th><th>Payment</th><th>Order</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order: any) => (
                <tr key={order.id}>
                  <td><span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{order.id}</span></td>
                  <td>{order.date}</td>
                  <td>{isCustomer ? order.service : (order.customer?.name || 'Customer')}</td>
                  <td>{order.gateway || 'Online'}</td>
                  <td><strong>{money(order.amount)}</strong></td>
                  <td><Badge type={paymentBadgeType(order.payStatus)}>{order.payStatus}</Badge></td>
                  <td><Badge type={statusBadgeType(order.status)}>{order.status}</Badge></td>
                </tr>
              ))}
              {visibleOrders.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 28 }}>No payment records yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};
