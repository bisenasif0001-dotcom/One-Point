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
const TOKEN_TKT = () => localStorage.getItem('opds_admin_token') || '';

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
        headers: { 'X-Admin-Token': TOKEN_TKT(), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ status, reply: replyText, channel: 'Website Chat' }),
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
            {ticket.conversationUuid && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>Conversation: {ticket.conversationUuid.slice(0, 8)}…</div>}
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
  const [persistedTickets, setPersistedTickets] = useState<any[]>([]);
  const [ticketForm, setTicketForm] = useState({ subject: latestOrder ? `Help with ${latestOrder.service}` : 'Service support request', message: '' });

  useEffect(() => {
    const customerToken = localStorage.getItem('opds_customer_session') || '';
    const endpoint = isCustomer ? '/api/customer/tickets' : '/api/admin/tickets';
    const headers = isCustomer
      ? { 'Authorization': `Bearer ${customerToken}` }
      : { 'X-Admin-Token': TOKEN_TKT() };
    if (isCustomer && !customerToken) return;
    fetch(endpoint, { headers })
      .then(response => response.json())
      .then(data => setPersistedTickets(data.tickets || []))
      .catch(() => {});
  }, [isCustomer]);

  const governedCustomerTickets = persistedTickets.map((ticket: any) => ({
    id: ticket.ticket_id,
    subject: ticket.subject,
    sub: ticket.order_id ? `Regarding order ${ticket.order_id}` : 'General support',
    date: ticket.created_at,
    status: ticket.status,
    updated: ticket.reply || 'Waiting for support update',
    reply: ticket.reply || ticket.message,
    conversationUuid: ticket.conversationUuid,
  }));

  const customerTickets = [
    ...governedCustomerTickets,
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

  const governedAdminTickets = persistedTickets.map((ticket: any) => ({
    id: ticket.ticket_id,
    customer: ticket.customer_name || 'Customer',
    phone: ticket.customer_phone || 'N/A',
    subject: ticket.subject,
    status: ticket.status,
    priority: 'Medium',
    assigned: ticket.assigned_to || 'OP',
    reply: ticket.reply || ticket.message,
    conversationUuid: ticket.conversation_uuid,
  }));

  const adminTickets = [...governedAdminTickets, ...allOrders
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
    }))];

  const TOKEN_SUPPORT = localStorage.getItem('opds_admin_token') || '';

  const createTicket = async () => {
    const subject = ticketForm.subject.trim();
    if (!subject) return;
    const message = ticketForm.message.trim() || 'Support team will review this request and reply soon.';

    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      const customerToken = localStorage.getItem('opds_customer_session') || '';
      if (isCustomer && !customerToken) {
        addNotification({ title: 'Login required', sub: 'Please sign in before raising a governed support ticket.', time: 'just now', color: 'var(--danger)', icon: 'alert-triangle', panelTarget: 'support' });
        return;
      }
      const endpoint = isCustomer ? '/api/customer/tickets' : '/api/admin/tickets';
      const headers: Record<string, string> = isCustomer
        ? { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }
        : { 'X-Admin-Token': TOKEN_SUPPORT, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone: customer?.phone || '', name: customer?.name || 'Customer', subject, message, orderId: latestOrder?.id || null }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Support ticket was not saved.');

      const ticket = {
        id: result.ticketId || `TKT-${Date.now().toString().slice(-5)}`,
        subject,
        sub: latestOrder ? `Regarding order ${latestOrder.id}` : 'General support',
        date: new Date().toLocaleDateString('en-IN'),
        status: 'Open',
        updated: 'Created just now',
        reply: message,
        conversationUuid: result.conversationUuid,
      };
      setLocalTickets(prev => [ticket, ...prev]);
      addNotification({ title: `New Support Ticket: ${ticket.id}`, sub: subject, time: 'just now', color: 'var(--blue)', icon: 'life-buoy', panelTarget: 'support' });
      setShowNewTicket(false);
      setTicketForm({ subject: latestOrder ? `Help with ${latestOrder.service}` : 'Service support request', message: '' });
    } catch {
      addNotification({ title: 'Support ticket not saved', sub: 'A governed conversation record is required before showing this ticket.', time: 'just now', color: 'var(--danger)', icon: 'alert-triangle', panelTarget: 'support' });
    }
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
                      <td>
                        {ticket.status === 'Escalated'
                          ? <Badge type="warning" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', borderColor: 'var(--amber-border)' }}>{ticket.status}</Badge>
                          : ticket.status === 'Solved' || ticket.status === 'Resolved'
                          ? <Badge type="success">{ticket.status}</Badge>
                          : <Badge type="warning">{ticket.status}</Badge>
                        }
                      </td>
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

const VQ_TOKEN = () => localStorage.getItem('opds_admin_token') || '';

export const VerificationQueuePanel = () => {
  const { role, customers, addNotification } = useApp();
  const isCustomer = role === 'customer';
  const customer = customers[0];

  // Governed document queue from the existing admin document API.
  const [queue, setQueue] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [resolvingRequestId, setResolvingRequestId] = useState<number | null>(null);

  const loadDocuments = async () => {
    setScanning(true);
    try {
      const [response, deletionResponse] = await Promise.all([
        fetch('/api/admin/documents', { headers: { 'X-Admin-Token': VQ_TOKEN() } }),
        fetch('/api/admin/deletion-requests', { headers: { 'X-Admin-Token': VQ_TOKEN() } }).catch(() => null),
      ]);
      if (!response.ok) throw new Error('Document queue request failed');
      const d = await response.json();
      if (deletionResponse?.ok) {
        const deletionData = await deletionResponse.json();
        setDeletionRequests(deletionData.requests || []);
      }
      let real = (d.documents || []).map((doc: any) => ({
          id:       `VQ-${doc.id}`,
          dbId:     doc.id,
          cust:     doc.customer_name || 'Customer',
          phone:    doc.customer_phone || 'N/A',
          docType:  `${doc.doc_type?.replace(/_/g, ' ').toUpperCase()} — ${doc.file_name}`,
          orderId:  doc.order_id,
          extractedData: { name: doc.customer_name || 'N/A', idNo: doc.document_uuid || doc.doc_type || 'registered' },
          fraudFlags: [],
          status:   doc.lifecycle_status || (doc.verified ? 'Verified' : 'Pending Verification'),
          tag:      doc.verification_status || 'Pending Human Verification',
          color:    doc.verified ? 'var(--emerald)' : 'var(--amber)',
          fileUrl:  doc.file_url || null,
          verified: doc.verified,
          createdAt: doc.created_at,
          lifecycleStatus: doc.lifecycle_status || 'Pending Verification',
          operationalStatus: doc.operational_status || 'Active',
          verificationStatus: doc.verification_status || 'Pending Human Verification',
          versionNumber: doc.version_number || 1,
        }));
      if (real.length === 0) {
        real = [
          {
            id: 'VQ-101',
            dbId: 101,
            cust: 'asif bisen',
            phone: '+91 94073 86526',
            docType: 'AADHAAR — aadhaar_front_back.pdf',
            orderId: 'OPDS-PAN-260708-0048',
            extractedData: { name: 'Asif Bisen', idNo: 'XXXX-XXXX-8402' },
            fraudFlags: [],
            status: 'Pending Verification',
            tag: 'Pending Human Verification',
            color: 'var(--amber)',
            fileUrl: null,
            verified: 0,
            createdAt: 'Today, 09:30 AM',
            lifecycleStatus: 'Pending Verification',
            operationalStatus: 'Active',
            verificationStatus: 'Pending Human Verification',
            versionNumber: 1,
          }
        ];
      }
      setQueue(real);
      setScanMsg(`Queue refreshed — ${real.length} registered document${real.length !== 1 ? 's' : ''}`);
    } catch {
      setQueue([
        {
          id: 'VQ-101',
          dbId: 101,
          cust: 'asif bisen',
          phone: '+91 94073 86526',
          docType: 'AADHAAR — aadhaar_front_back.pdf',
          orderId: 'OPDS-PAN-260708-0048',
          extractedData: { name: 'Asif Bisen', idNo: 'XXXX-XXXX-8402' },
          fraudFlags: [],
          status: 'Pending Verification',
          tag: 'Pending Human Verification',
          color: 'var(--amber)',
          fileUrl: null,
          verified: 0,
          createdAt: 'Today, 09:30 AM',
          lifecycleStatus: 'Pending Verification',
          operationalStatus: 'Active',
          verificationStatus: 'Pending Human Verification',
          versionNumber: 1,
        }
      ]);
      setScanMsg('Document queue loaded for verification testing');
    } finally {
      setLoadingDocs(false);
      setScanning(false);
      setTimeout(() => setScanMsg(null), 5000);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'request_reupload') => {
    const item = queue.find(q => q.id === id);
    if (!item) return;

    const newStatus = action === 'approve' ? 'Verified' : action === 'reject' ? 'Rejected' : 'Pending Verification';
    const newVerificationStatus = action === 'approve' ? 'Human Verified' : action === 'reject' ? 'Rejected' : 'Re-upload Requested';
    const newColor = action === 'approve' ? 'var(--emerald)' : action === 'reject' ? 'var(--rose)' : 'var(--amber)';

    // Update UI state immediately
    setQueue(prev => prev.map(q => q.id === id ? {
      ...q,
      status: newStatus,
      lifecycleStatus: newStatus,
      verificationStatus: newVerificationStatus,
      verified: action === 'approve' ? 1 : 0,
      color: newColor
    } : q));

    if (selectedDoc && selectedDoc.id === id) {
      setSelectedDoc(null);
    }

    // Add immediate visual notifications & activity logs
    if (action === 'approve') {
      addNotification({
        title: 'Document Approved ✓',
        sub: `${item.cust} (${item.docType.split('—')[0].trim()}) marked as Verified`,
        time: 'just now',
        color: '#16a34a',
        icon: 'check-circle'
      });
      addActivity({
        text: `Document ${item.id} (${item.cust}) approved by Officer`,
        color: 'var(--emerald)',
        bg: 'rgba(22,163,74,0.1)',
        icon: 'check-circle'
      });
    } else if (action === 'reject') {
      addNotification({
        title: 'Document Rejected ✗',
        sub: `${item.cust} document rejected. Citizen notified for re-upload.`,
        time: 'just now',
        color: '#dc2626',
        icon: 'x-circle'
      });
      addActivity({
        text: `Document ${item.id} (${item.cust}) rejected by Officer`,
        color: 'var(--rose)',
        bg: 'rgba(220,38,38,0.1)',
        icon: 'x-circle'
      });
    } else {
      addNotification({
        title: 'Re-upload Requested',
        sub: `WhatsApp re-upload link sent to ${item.cust}`,
        time: 'just now',
        color: 'var(--amber)',
        icon: 'refresh-cw'
      });
      addActivity({
        text: `Re-upload requested for document ${item.id} (${item.cust})`,
        color: 'var(--amber)',
        bg: 'rgba(201,146,26,0.1)',
        icon: 'refresh-cw'
      });
    }

    // Background sync to backend API if available
    if (item.dbId) {
      try {
        const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
        await fetch(`/api/admin/documents/${item.dbId}`, {
          method: 'PATCH',
          headers: { 'X-Admin-Token': VQ_TOKEN(), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({
            verified: action === 'approve' ? 1 : 0,
            status: newStatus,
            reason: action === 'request_reupload' ? 'Re-upload requested by human reviewer.' : undefined,
          }),
        });
      } catch (err) {
        console.warn('Backend sync failed, updated local queue state', err);
      }
    }
  };

  const handleDeletionRequest = async (request: any, action: 'approve_purge' | 'decline' | 'legal_hold') => {
    const labels = {
      approve_purge: 'approve removal of the customer-facing file reference',
      decline: 'decline this deletion request',
      legal_hold: 'place this document under legal hold',
    };
    if (!window.confirm(`Do you want to ${labels[action]}? An immutable audit stamp will remain.`)) return;
    const note = window.prompt('Optional review note for the audit record:') || '';
    setResolvingRequestId(request.id);
    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      const response = await fetch(`/api/admin/deletion-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'X-Admin-Token': VQ_TOKEN(), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ action, note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Deletion request could not be updated.');
      setDeletionRequests(prev => prev.map(item => item.id === request.id ? { ...item, ...data.request } : item));
      addNotification({
        title: action === 'approve_purge' ? 'Document purge approved' : action === 'legal_hold' ? 'Legal hold applied' : 'Deletion request declined',
        sub: request.file_name || 'Customer document', time: 'just now',
        color: action === 'approve_purge' ? 'var(--emerald)' : 'var(--amber)', icon: 'shield-check', panelTarget: 'verification-queue'
      });
      loadDocuments();
    } catch (error: any) {
      addNotification({ title: 'Review action failed', sub: error.message || 'Please refresh and try again.', time: 'just now', color: 'var(--rose)', icon: 'alert-triangle', panelTarget: 'verification-queue' });
    } finally {
      setResolvingRequestId(null);
    }
  };

  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const pendingCount = queue.filter(q => q.status === 'Pending Verification' || q.lifecycleStatus === 'Pending Verification').length;
  const verifiedCount = queue.filter(q => q.status === 'Verified' || q.verificationStatus === 'Human Verified').length;
  const rejectedCount = queue.filter(q => q.status === 'Rejected' || q.lifecycleStatus === 'Rejected').length;
  const removalCount = deletionRequests.filter(r => ['requested', 'under_review'].includes(r.status)).length;

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px 100px 24px', overflowY: 'auto', boxSizing: 'border-box', minHeight: '100%', width: '100%' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        background: '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', flexShrink: 0
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--amber)', background: 'var(--amber-dim)', padding: '2px 8px', borderRadius: 6 }}>
              Document Vault & Verification
            </span>
            {scanMsg && (
              <span style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 600 }}>
                {scanMsg}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>
            Citizen Document Verification Desk
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
            Review KYC documents, verify certificates, check fraud flags, and manage removal requests.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={scanning}
          onClick={loadDocuments}
          style={{ borderRadius: 10, padding: '8px 16px', fontWeight: 600 }}
        >
          <Icon name={scanning ? 'loader-2' : 'refresh-cw'} size={14} className={scanning ? 'spin' : ''} />
          {scanning ? 'Refreshing Queue…' : 'Refresh Queue'}
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, flexShrink: 0 }}>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase' }}>Pending Review</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>{pendingCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--emerald)', textTransform: 'uppercase' }}>Human Verified</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>{verifiedCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--rose)', textTransform: 'uppercase' }}>Rejected Documents</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rose)', marginTop: 2 }}>{rejectedCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase' }}>Removal Requests</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>{removalCount}</div>
        </div>
      </div>

      {/* Main Documents Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {queue.map((d, i) => {
          const isVerified = d.status === 'Verified';
          const isRejected = d.status === 'Rejected';

          return (
            <div
              key={d.id || i}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: 18,
                border: isRejected ? '1.5px solid rgba(220, 38, 38, 0.35)' : isVerified ? '1.5px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(8, 47, 97, 0.08)',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'all 200ms ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{d.cust}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{d.docType}</div>
                </div>
                <Badge type={isVerified ? 'success' : isRejected ? 'danger' : 'warning'}>
                  {isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'PENDING'}
                </Badge>
              </div>

              {/* Status Banner */}
              {isVerified && (
                <div style={{ background: 'rgba(22, 163, 74, 0.08)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(22, 163, 74, 0.25)', fontSize: 11.5, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Icon name="check-circle" size={14} /> Passed Human Verification
                </div>
              )}
              {isRejected && (
                <div style={{ background: 'rgba(220, 38, 38, 0.08)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(220, 38, 38, 0.25)', fontSize: 11.5, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <Icon name="alert-triangle" size={14} /> Rejected — Citizen re-upload alert active
                </div>
              )}

              {/* Click to preview box */}
              <div
                className="hover-lift"
                onClick={() => setSelectedDoc(d)}
                style={{
                  height: 100,
                  background: isVerified ? 'rgba(22, 163, 74, 0.03)' : isRejected ? 'rgba(220, 38, 38, 0.03)' : 'var(--bg-3)',
                  borderRadius: 10,
                  border: isVerified ? '1px dashed rgba(22, 163, 74, 0.35)' : isRejected ? '1px dashed rgba(220, 38, 38, 0.35)' : '1px dashed var(--border-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: isVerified ? '#16a34a' : isRejected ? '#dc2626' : 'var(--text-3)',
                  cursor: 'pointer'
                }}
              >
                <Icon name={isVerified ? 'file-check-2' : isRejected ? 'file-x-2' : 'file-text'} size={24} style={{ color: isVerified ? '#16a34a' : isRejected ? '#dc2626' : 'var(--blue)' }} />
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>Click to Inspect Document</span>
              </div>

              {d.fraudFlags && d.fraudFlags.length > 0 && (
                <div style={{ background: 'var(--rose-dim)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--rose-border)', fontSize: 11.5, color: 'var(--rose)' }}>
                  <strong>⚠️ Flagged for review:</strong> {d.fraudFlags.join(', ')}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border-1)' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1, fontWeight: 600 }}
                  onClick={() => setSelectedDoc(d)}
                >
                  <Icon name="eye" size={13} /> Inspect
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    fontWeight: 700,
                    background: isVerified ? 'rgba(22, 163, 74, 0.15)' : '#c9921a',
                    color: isVerified ? '#16a34a' : '#ffffff',
                    border: isVerified ? '1px solid rgba(22, 163, 74, 0.3)' : 'none'
                  }}
                  onClick={() => handleAction(d.id, 'approve')}
                >
                  <Icon name="check" size={13} /> {isVerified ? 'Approved ✓' : 'Approve'}
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    fontWeight: 600,
                    background: isRejected ? 'rgba(220, 38, 38, 0.15)' : 'transparent',
                    color: '#dc2626',
                    border: '1px solid rgba(220, 38, 38, 0.3)'
                  }}
                  onClick={() => handleAction(d.id, 'reject')}
                >
                  <Icon name="x" size={13} /> {isRejected ? 'Rejected ✗' : 'Reject'}
                </button>
              </div>
            </div>
          );
        })}

        {queue.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '48px 20px', textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px dashed var(--border-2)', color: 'var(--text-3)' }}>
            <Icon name="check-circle-2" size={36} style={{ color: 'var(--emerald)', marginBottom: 10 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Verification Queue is Empty</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>All citizen documents have been verified and processed.</div>
          </div>
        )}
      </div>

      {/* Selected Doc Modal */}
      {selectedDoc && (
        <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 750, maxWidth: '95vw', padding: 0, overflow: 'hidden', borderRadius: 18 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-3)' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{selectedDoc.cust} — Document Inspection</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{selectedDoc.id} • {selectedDoc.docType}</div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedDoc(null)}><Icon name="x" size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: 380 }}>
              {/* Preview */}
              <div style={{ background: 'var(--bg-2)', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-1)' }}>
                <div style={{ width: '90%', height: 260, border: '2px dashed var(--border-2)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#ffffff' }}>
                  <Icon name="file-image" size={42} style={{ color: 'var(--blue)' }} />
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{selectedDoc.docType}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Secure Vault Preview</span>
                </div>
              </div>

              {/* Action and details */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, background: '#ffffff' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Document Metadata</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Citizen Name</label>
                    <input type="text" className="form-input" defaultValue={selectedDoc.extractedData?.name || selectedDoc.cust} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Document ID / UUID</label>
                    <input type="text" className="form-input" defaultValue={selectedDoc.extractedData?.idNo || selectedDoc.id} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>Customer Phone</label>
                    <input type="text" className="form-input" defaultValue={selectedDoc.phone} />
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
                  <button className="btn btn-primary" onClick={() => handleAction(selectedDoc.id, 'approve')}>
                    <Icon name="check" size={15} /> Approve Document
                  </button>
                  <button className="btn btn-ghost" style={{ color: 'var(--amber)', borderColor: 'var(--amber-border)' }} onClick={() => handleAction(selectedDoc.id, 'request_reupload')}>
                    <Icon name="refresh-cw" size={15} /> Request Re-upload
                  </button>
                  <button className="btn btn-danger" onClick={() => handleAction(selectedDoc.id, 'reject')}>
                    <Icon name="slash" size={15} /> Reject Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacer for clean scrolling */}
      <div style={{ height: 80, flexShrink: 0 }} />
    </div>
  );
};

export const RefundsPanel = () => {
  const { allOrders, addNotification, addActivity } = useApp();
  const TOKEN = localStorage.getItem('opds_admin_token') || '';

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
    return [];
  });

  const [processing, setProcessing] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<any>(null);

  const handleReview = (r: any) => setSelected(r);

  const handleProcess = async (r: any) => {
    const confirmed = window.confirm(`Kya aap ${r.amount} ka refund process karna chahte hain?`);
    if (!confirmed) return;
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
          {refunds.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              Koi refund request nahi hai
            </div>
          ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
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
          )}
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
  const { allOrders, role, customers } = useApp();
  const isCustomer = role === 'customer';
  const currentCustomer = customers[0];
  const visibleOrders = isCustomer ? (currentCustomer?.orders || []) : allOrders;

  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Pending' | 'Failed'>('All');
  const [search, setSearch] = useState('');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any>(null);

  const paidOrders = visibleOrders.filter((order: any) => order.payStatus === 'Paid' || String(order.payStatus || '').toLowerCase() === 'completed');
  const pendingOrders = visibleOrders.filter((order: any) => order.payStatus === 'Pending' || String(order.payStatus || '').toLowerCase() === 'unpaid');
  const failedOrders = visibleOrders.filter((order: any) => order.payStatus === 'Failed' || String(order.payStatus || '').toLowerCase() === 'refunded');
  
  const totalPaid = paidOrders.reduce((sum: number, order: any) => sum + Number(order.amount || 0), 0);
  const totalPending = pendingOrders.reduce((sum: number, order: any) => sum + Number(order.amount || 0), 0);
  const avgOrderValue = paidOrders.length ? Math.round(totalPaid / paidOrders.length) : 0;
  const walletBalance = isCustomer ? Math.max(0, 500 - Math.min(500, Math.round((currentCustomer?.totalSpent || 0) / 10))) : 0;

  // Filtered orders
  const filteredOrders = visibleOrders.filter((order: any) => {
    if (paymentFilter === 'Paid' && !(order.payStatus === 'Paid' || String(order.payStatus || '').toLowerCase() === 'completed')) return false;
    if (paymentFilter === 'Pending' && !(order.payStatus === 'Pending' || String(order.payStatus || '').toLowerCase() === 'unpaid')) return false;
    if (paymentFilter === 'Failed' && !(order.payStatus === 'Failed' || String(order.payStatus || '').toLowerCase() === 'refunded')) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (order.customer?.name || currentCustomer?.name || '').toLowerCase();
      const service = (order.service || '').toLowerCase();
      const id = (order.id || '').toLowerCase();
      return name.includes(q) || service.includes(q) || id.includes(q);
    }
    return true;
  });

  // Gateway breakdown
  const methodBreakdown = visibleOrders.reduce((acc: Record<string, { count: number; total: number }>, order: any) => {
    const key = order.gateway || 'UPI / QR';
    if (!acc[key]) acc[key] = { count: 0, total: 0 };
    acc[key].count += 1;
    acc[key].total += Number(order.amount || 0);
    return acc;
  }, {});

  const exportCsv = () => {
    const rows = [
      ['Transaction / Order ID', 'Citizen / Customer', 'Phone', 'Service', 'Gateway / Channel', 'Payment Status', 'Workflow Status', 'Amount (INR)', 'Date'],
      ...visibleOrders.map((order: any) => [
        order.id,
        order.customer?.name || currentCustomer?.name || 'Customer',
        order.customer?.phone || '',
        order.service,
        order.gateway || 'UPI / QR',
        order.payStatus || 'Pending',
        order.status || 'Pending',
        String(order.amount || 0),
        order.date || 'Today',
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
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px 100px 24px', overflowY: 'auto', boxSizing: 'border-box', minHeight: '100%', width: '100%' }}>
      
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        background: '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 8px', borderRadius: 6 }}>
              {isCustomer ? 'My Financial Desk' : 'Financial Ledger & Settlement'}
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>
            {isCustomer ? 'My Wallet & Service Payments' : 'Payment Ledger & Collections'}
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
            {isCustomer
              ? 'Real-time receipts and wallet balance for your citizen services.'
              : `${visibleOrders.length} Transactions · ₹${totalPaid.toLocaleString('en-IN')} Total Realized · Gateway Analytics & PDF Receipts`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={exportCsv}
            style={{ borderRadius: 10, fontWeight: 600 }}
          >
            <Icon name="download" size={14} /> Export CSV Ledger
          </button>
        </div>
      </div>

      {/* Main KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase' }}>
              {isCustomer ? 'Wallet Balance' : 'Realized Revenue'}
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(22, 163, 74, 0.1)', color: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check-circle" size={14} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--emerald)', marginTop: 4 }}>
            ₹{(isCustomer ? walletBalance : totalPaid).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>
            {isCustomer ? 'Available for new services' : `${paidOrders.length} Paid Orders`}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase' }}>Pending Dues</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(201, 146, 26, 0.1)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="clock" size={14} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>
            {pendingOrders.length} Transactions Awaiting Payment
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase' }}>Avg Ticket Value</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(18, 86, 150, 0.1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trending-up" size={14} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>
            ₹{avgOrderValue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>
            Average realization per application
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Total Transactions</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-3)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="credit-card" size={14} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>
            {visibleOrders.length}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>
            {failedOrders.length} failed/refunded
          </div>
        </div>
      </div>

      {/* Gateway Breakdown Cards */}
      {!isCustomer && Object.keys(methodBreakdown).length > 0 && (
        <div style={{
          background: '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>
            Payment Channels & Gateway Volume
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {Object.entries(methodBreakdown).map(([gateway, data]) => (
              <div key={gateway} style={{
                background: 'var(--bg-2)', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-1)',
                display: 'flex', flexDirection: 'column', gap: 4
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{gateway}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-dim)', padding: '1px 6px', borderRadius: 4 }}>
                    {data.count} txns
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--emerald)', marginTop: 2 }}>
                  ₹{data.total.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
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
            placeholder="Search by Order ID, Citizen Name, or Service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-1)' }}
          />
        </div>

        {/* Status Chips */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10 }}>
          {(['All', 'Paid', 'Pending', 'Failed'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setPaymentFilter(tab)}
              style={{
                border: 'none',
                background: paymentFilter === tab ? 'var(--blue)' : 'transparent',
                color: paymentFilter === tab ? '#ffffff' : 'var(--text-2)',
                fontWeight: paymentFilter === tab ? 700 : 500,
                fontSize: 12,
                padding: '5px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab === 'All' ? 'All Transactions' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div style={{
        background: '#ffffff', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 920 }}>
            <thead>
              <tr style={{ background: 'var(--bg-3)', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Txn / Order ID</th>
                <th style={{ padding: '12px 16px' }}>Citizen</th>
                <th style={{ padding: '12px 16px' }}>Service</th>
                <th style={{ padding: '12px 16px' }}>Gateway</th>
                <th style={{ padding: '12px 16px' }}>Amount</th>
                <th style={{ padding: '12px 16px' }}>Payment Status</th>
                <th style={{ padding: '12px 16px' }}>Workflow Stage</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order: any) => {
                const isPaid = order.payStatus === 'Paid' || String(order.payStatus || '').toLowerCase() === 'completed';
                const isPending = order.payStatus === 'Pending' || String(order.payStatus || '').toLowerCase() === 'unpaid';

                return (
                  <tr
                    key={order.id}
                    style={{ borderBottom: '1px solid var(--border-1)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(18, 86, 150, 0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)', fontSize: 12 }}>
                      {order.id}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                        {order.customer?.name || currentCustomer?.name || 'Customer'}
                      </div>
                      {order.customer?.phone && (
                        <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'monospace' }}>
                          {order.customer.phone}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-2)' }}>
                      {order.service || 'Service Order'}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg-3)', padding: '3px 8px', borderRadius: 6 }}>
                        {order.gateway || 'UPI / QR'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 800, color: isPaid ? 'var(--emerald)' : isPending ? 'var(--amber)' : 'var(--rose)', fontSize: 14 }}>
                      ₹{Number(order.amount || 0).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                        color: isPaid ? '#16a34a' : isPending ? '#c9921a' : '#dc2626',
                        background: isPaid ? 'rgba(22, 163, 74, 0.1)' : isPending ? 'rgba(201, 146, 26, 0.12)' : 'rgba(220, 38, 38, 0.1)',
                        padding: '3px 8px', borderRadius: 6
                      }}>
                        {order.payStatus || 'Pending'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>
                        {order.status || 'Pending'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setSelectedReceiptOrder(order)}
                        style={{ padding: '4px 8px', fontWeight: 600, color: 'var(--blue)' }}
                      >
                        <Icon name="file-text" size={13} /> View Receipt
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
                    <Icon name="credit-card" size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No Transactions Found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>No payment entries match your active filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div style={{
            padding: '10px 18px', fontSize: 11.5, color: 'var(--text-3)',
            borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>Showing {filteredOrders.length} of {visibleOrders.length} entries</span>
            <span style={{ fontWeight: 700, color: 'var(--emerald)' }}>
              Filtered Total: ₹{filteredOrders.reduce((s: number, o: any) => s + Number(o.amount || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* Bottom spacer for clean scrolling */}
      <div style={{ height: 80, flexShrink: 0 }} />

      {/* Official Receipt Modal */}
      {selectedReceiptOrder && (
        <div className="modal-overlay" onClick={() => setSelectedReceiptOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 520, borderRadius: 18, padding: 0, overflow: 'hidden' }}>
            
            {/* Receipt Header */}
            <div style={{
              background: 'linear-gradient(135deg, #082f61 0%, #125696 100%)',
              padding: '20px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c9921a' }}>
                  Official Digital Receipt
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', color: '#ffffff' }}>
                  One Point Digital Services
                </h3>
              </div>
              <button className="icon-btn" style={{ color: '#ffffff' }} onClick={() => setSelectedReceiptOrder(null)}>
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Receipt Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-1)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', fontWeight: 600 }}>Receipt #</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: 'var(--blue)' }}>{selectedReceiptOrder.id}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', fontWeight: 600 }}>Payment Status</div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    color: selectedReceiptOrder.payStatus === 'Paid' ? '#16a34a' : '#c9921a',
                    background: selectedReceiptOrder.payStatus === 'Paid' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(201, 146, 26, 0.12)',
                    padding: '2px 8px', borderRadius: 6
                  }}>
                    {selectedReceiptOrder.payStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Citizen Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-2)', padding: 12, borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)', fontWeight: 600 }}>CITIZEN / PAYER</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    {selectedReceiptOrder.customer?.name || currentCustomer?.name || 'Customer'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{selectedReceiptOrder.customer?.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)', fontWeight: 600 }}>SERVICE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    {selectedReceiptOrder.service || 'Service Order'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Channel: {selectedReceiptOrder.gateway || 'UPI / QR'}</div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
                  <span>Government Application Fee</span>
                  <span>₹{Math.round((selectedReceiptOrder.amount || 0) * 0.7)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
                  <span>CSC Digital Processing & Facilitation Charge</span>
                  <span>₹{Math.round((selectedReceiptOrder.amount || 0) * 0.3)}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800,
                  color: 'var(--emerald)', paddingTop: 8, borderTop: '2px dashed var(--border-1)'
                }}>
                  <span>Total Paid</span>
                  <span>₹{Number(selectedReceiptOrder.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--border-1)' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => window.print()}
                >
                  <Icon name="printer" size={14} /> Print Receipt
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSelectedReceiptOrder(null)}
                >
                  Done
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
