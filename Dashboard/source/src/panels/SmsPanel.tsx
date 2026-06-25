import React, { useState, useEffect } from 'react';
import { PanelHeader, Card, Icon, Badge } from '../Shared';
import { useApp } from '../AppContext';

export const SmsPanel = () => {
  const { customers, addActivity, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState('logs');
  const TOKEN = localStorage.getItem('opds_admin_token') || '';

  // Campaign State
  const [campaignName, setCampaignName] = useState('Festive Offer 2026');
  const [recipientGroup, setRecipientGroup] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState('Payment Reminder Template');
  const [customMessage, setCustomMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [sendResult, setSendResult] = useState('');

  const [logs, setLogs] = useState<any[]>([]);

  // Load real SMS logs from backend
  const loadLogs = () => {
    fetch('/api/admin/notifications?channel=sms&limit=50', { headers: { 'X-Admin-Token': TOKEN } })
      .then(r => r.json())
      .then(d => {
        if (d.logs) {
          setLogs(d.logs.map((l: any) => ({
            time: new Date(l.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            to: l.recipient,
            msg: (() => { try { return JSON.parse(l.payload_json)?.message?.slice(0, 40) + '...' || l.event; } catch { return l.event; } })(),
            cost: '₹0.20',
            status: l.status === 'sent' ? 'Delivered' : l.status === 'logged' ? 'Logged' : l.status === 'failed' ? 'Failed' : l.status,
            tag: l.status === 'sent' ? 'success' : l.status === 'failed' ? 'danger' : 'info',
          })));
        }
      })
      .catch(() => {});
  };

  useEffect(() => { loadLogs(); }, []);

  const handleSendSms = async () => {
    if (!campaignName.trim() || (!customMessage.trim())) return;
    setSendStatus('sending');
    setSendResult('');

    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'X-Admin-Token': TOKEN, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({
          event: `sms_campaign_${campaignName.toLowerCase().replace(/\s+/g, '_')}`,
          message: customMessage,
          audience: recipientGroup,
        }),
      });
      const data = await res.json();
      const count = data.sent || (recipientGroup === 'all' ? customers.length : 2);

      setSendResult(`✓ Campaign queued for ${count} recipients. Check notification logs for delivery status.`);
      setSendStatus('success');
      loadLogs(); // Refresh logs

      addActivity({ text: `Bulk SMS Campaign "${campaignName}" sent to ${count} recipients`, color: 'var(--blue)', bg: 'var(--blue-dim)', icon: 'smartphone' });
      addNotification({ title: 'SMS Campaign Sent', sub: `"${campaignName}" sent to ${count} contacts`, time: 'just now', color: 'var(--blue)', icon: 'check-circle', panelTarget: 'sms' });

      setTimeout(() => { setSendStatus('idle'); setActiveTab('logs'); setSendResult(''); }, 3000);
    } catch {
      setSendResult('✗ Failed to send. Check server connection.');
      setSendStatus('idle');
    }
  };

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PanelHeader 
        title="SMS Notifications" 
        sub="Manage SMS logs, bulk campaigns, and DLT approved templates" 
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('send')}>
            <Icon name="send" /> Send Bulk SMS
          </button>
        } 
      />
      <div className="panels" style={{ flex: 1, paddingBottom: 0 }}>
        
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, borderBottom: '1px solid var(--border-1)', paddingBottom: 8 }}>
          <button className={`btn btn-sm ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('logs')}>Delivery Logs</button>
          <button className={`btn btn-sm ${activeTab === 'send' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('send')}>Send Bulk SMS</button>
          <button className={`btn btn-sm ${activeTab === 'templates' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('templates')}>Manage Templates</button>
        </div>

        {activeTab === 'logs' && (
          <div className="grid-1">
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <Card>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Total Logged</div>
                  <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{logs.length}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--emerald)', marginTop: 4 }}>From database</div>
                </div>
              </Card>
              <Card>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Delivered</div>
                  <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{logs.filter(l => l.tag === 'success').length}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', marginTop: 4 }}>Via webhook provider</div>
                </div>
              </Card>
              <Card>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 8 }}>Failed / Pending</div>
                  <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{logs.filter(l => l.tag !== 'success').length}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--rose)', marginTop: 4 }}>Configure SMS webhook in .env</div>
                </div>
              </Card>
            </div>
            
            <Card title="Recent SMS Logs" bodyClass="card-body-flush">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Recipient</th>
                    <th>Message Snippet</th>
                    <th>Cost</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((s, i) => (
                    <tr key={i}>
                      <td>{s.time}</td>
                      <td style={{ fontWeight: 'var(--fw-medium)' }}>{s.to}</td>
                      <td style={{ color: 'var(--text-3)' }}>{s.msg}</td>
                      <td>{s.cost}</td>
                      <td><Badge type={s.tag as any}>{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {activeTab === 'send' && (
          <Card title="Send Bulk SMS Campaign" sub="Broadcast important updates via DLT approved routes">
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Campaign Name</label>
                <input type="text" className="form-input" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="E.g., Festive Offer 2026" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Recipients Group</label>
                <select className="form-input" value={recipientGroup} onChange={e => setRecipientGroup(e.target.value)}>
                  <option value="all">All Registered Customers ({customers.length} contacts)</option>
                  <option value="pending">Pending KYC Customers (2 contacts)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Message Template (TRAI / DLT Approved)</label>
                <select className="form-input" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                  <option>Payment Reminder Template</option>
                  <option>Document Request Template</option>
                  <option>Service Completion Notice</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Message Content <span style={{ color: 'var(--rose)' }}>*</span></label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Type your SMS message here... e.g. Dear Customer, your application for PAN Card is ready. Visit us to collect. - One Point Digital Services"
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                />
                <div style={{ marginTop: 4, fontSize: 'var(--fs-xs)', color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{customMessage.length} characters ({Math.max(1, Math.ceil(customMessage.length / 160))} SMS segment)</span>
                  <span>Est. Cost: ~₹{((recipientGroup === 'all' ? customers.length : 2) * 0.20).toFixed(2)}</span>
                </div>
              </div>

              {sendResult && (
                <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)',
                  background: sendResult.startsWith('✓') ? 'var(--emerald-dim)' : 'var(--rose-dim)',
                  color: sendResult.startsWith('✓') ? 'var(--emerald)' : 'var(--rose)',
                }}>{sendResult}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setActiveTab('logs')}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendSms}
                  disabled={sendStatus === 'sending' || !customMessage.trim()}
                  style={{ minWidth: 150, opacity: !customMessage.trim() ? 0.5 : 1 }}
                >
                  {sendStatus === 'sending' ? (<><Icon name="loader-2" size={14} className="spin" /> Sending...</>)
                  : sendStatus === 'success'  ? (<><Icon name="check" size={14} /> Sent!</>)
                  : (<><Icon name="send" size={14} /> Send Campaign</>)}
                </button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'templates' && (
          <div className="grid-2">
            <Card title="Payment Reminder" sub="Approved by TRAI (DLT)">
              <div className="card-body">
                <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, fontSize: 'var(--fs-sm)', border: '1px solid var(--border-1)' }}>
                  Dear {'{#var1#}'}, your payment of Rs. {'{#var2#}'} for {'{#var3#}'} is pending. Please pay via {'{#var4#}'} to proceed. - OnePoint
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <Badge type="success">Approved</Badge>
                  <button className="btn btn-ghost btn-xs">Edit</button>
                </div>
              </div>
            </Card>
            
            <Card title="Status Update" sub="Approved by TRAI (DLT)">
              <div className="card-body">
                <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, fontSize: 'var(--fs-sm)', border: '1px solid var(--border-1)' }}>
                  Hi {'{#var1#}'}, your service request {'{#var2#}'} status is now: {'{#var3#}'}. Check details at {'{#var4#}'}. - OnePoint
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <Badge type="success">Approved</Badge>
                  <button className="btn btn-ghost btn-xs">Edit</button>
                </div>
              </div>
            </Card>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 150, border: '1px dashed var(--border-2)', borderRadius: 'var(--radius-lg)', color: 'var(--text-3)', cursor: 'pointer' }} className="card hover-lift">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Icon name="plus" size={24} />
                <div style={{ fontWeight: 'var(--fw-medium)' }}>Request New Template</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
