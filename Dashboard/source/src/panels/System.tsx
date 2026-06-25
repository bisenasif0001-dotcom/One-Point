import { useState, useEffect } from 'react';
import { AutomationPanel } from './Automation';
import { WhatsAppPanel } from './WhatsAppPanel';
import { SmsPanel } from './SmsPanel';
import { SupportTicketsPanel, VerificationQueuePanel, RefundsPanel, FinancePanel } from './ServiceOSModules';
import { AnalyticsPanel } from './AnalyticsPanel';
import { FranchisePanel, SettingsPanel } from './FranchiseSettings';
import { Icon, Badge, PanelHeader } from '../Shared';

const getAdminHeaders = () => ({
  'X-Admin-Token': localStorage.getItem('opds_admin_token') || '',
  'Content-Type': 'application/json',
});

// ─── Kabir: Real assignments from backend ─────────────────────────────────────
function mapAssignmentToTask(a: any) {
  const statusMap: Record<string, string> = {
    assigned:  'pending_review',
    accepted:  'in_progress',
    working:   'in_progress',
    done:      'completed',
    cancelled: 'paused',
  };
  return {
    id:           String(a.id),
    customer:     a.customer_name || 'Customer',
    docType:      a.order_id || 'Service Order',
    status:       statusMap[a.status] || 'pending_review',
    assignedBy:   a.admin_notes ? 'manual' : 'auto',
    date:         a.assigned_at ? new Date(a.assigned_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
    actionRequired: a.status === 'assigned' ? 'Review & Accept' : undefined,
    reason:       a.notes || undefined,
    staffName:    a.staff_name,
    priority:     a.priority,
    orderStatus:  a.order_status,
    rawStatus:    a.status,
    _assignmentId: a.id,
  };
}

// ─── Sana: Notification logs from backend ────────────────────────────────────
const SanaPanel = ({ onBack }: { onBack: () => void }) => {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testMsg, setTestMsg] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch('/api/admin/notifications?limit=30', { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function sendTest() {
    if (!testMsg || !testPhone) return;
    setSending(true);
    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { ...getAdminHeaders(), 'X-CSRF-Token': csrf },
        body: JSON.stringify({ event: 'manual_test', message: testMsg, phones: [testPhone] }),
      });
      const r = await fetch('/api/admin/notifications?limit=30', { headers: getAdminHeaders() });
      const d = await r.json();
      setLogs(d.logs || []);
      setTestMsg(''); setTestPhone('');
    } catch { /* offline */ }
    setSending(false);
  }

  const channelIcon: Record<string, string> = { whatsapp: '💬', sms: '📱', email: '✉️' };
  const statusColor: Record<string, string> = { sent: 'var(--emerald)', queued: 'var(--amber)', logged: 'var(--text-3)', failed: 'var(--rose)' };

  return (
    <div className="panel active">
      <div className="page-header" style={{ cursor: 'pointer' }} onClick={onBack}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="arrow-left" size={20} />
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Sana <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px', background: 'var(--blue-dim)', color: 'var(--blue)' }}>EMP-AI-109</span>
            </div>
            <div className="page-sub">Customer Support Bot · Notification Dispatcher Dashboard</div>
          </div>
        </div>
      </div>
      <div className="panels">
        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Sent',   value: logs.filter(l => l.status === 'sent').length,   color: 'var(--emerald)' },
            { label: 'Queued',       value: logs.filter(l => l.status === 'queued').length,  color: 'var(--amber)' },
            { label: 'Logged Only',  value: logs.filter(l => l.status === 'logged').length,  color: 'var(--text-3)' },
            { label: 'Failed',       value: logs.filter(l => l.status === 'failed').length,  color: 'var(--rose)' },
          ].map(s => (
            <div key={s.label} className="insight-card" style={{ padding: 16, border: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{s.label}</div>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Send Test Message */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">Send Test Notification</div></div>
          <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input className="form-input" placeholder="Phone: 9876543210" value={testPhone} onChange={e => setTestPhone(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <input className="form-input" placeholder="Message content..." value={testMsg} onChange={e => setTestMsg(e.target.value)} style={{ flex: 2, minWidth: 200 }} />
            <button className="btn btn-primary btn-sm" disabled={!testMsg || !testPhone || sending} onClick={sendTest} style={{ opacity: sending ? 0.6 : 1 }}>
              {sending ? <Icon name="loader-2" size={13} className="spin" /> : <Icon name="send" size={13} />} Send Now
            </button>
          </div>
        </div>

        {/* Notification Logs */}
        <div className="card">
          <div className="card-header"><div className="card-title">Notification History</div></div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}><Icon name="loader-2" size={24} className="spin" /></div>
          ) : (
            <table className="table" style={{ width: '100%', fontSize: 'var(--fs-sm)', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-3)' }}>
                <tr>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Channel</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Recipient</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Event</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>No notifications yet. They appear here after orders are created.</td></tr>
                ) : logs.map((log: any) => (
                  <tr key={log.id} style={{ borderTop: '1px solid var(--border-1)' }}>
                    <td style={{ padding: '10px 16px' }}>{channelIcon[log.channel] || '📨'} {log.channel?.toUpperCase()}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 'var(--fs-xs)' }}>{log.recipient}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>{log.event}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: statusColor[log.status] || 'var(--text-3)', background: `${statusColor[log.status] || 'var(--text-3)'}15`, padding: '2px 8px', borderRadius: 20 }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
                      {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Kabir: Live task queue from real assignments ────────────────────────────
const KabirPanel = ({ onBack }: { onBack: () => void }) => {
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [botRunning, setBotRunning] = useState(false);

  async function loadTasks() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/assignments', { headers: getAdminHeaders() });
      const d = await r.json();
      setTasks((d.assignments || []).map(mapAssignmentToTask));
    } catch { /* offline */ }
    setLoading(false);
  }

  useEffect(() => { loadTasks(); }, []);

  async function updateStatus(task: any, newRawStatus: string) {
    try {
      const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
      await fetch(`/api/admin/assignments/${task._assignmentId}`, {
        method: 'PATCH',
        headers: { ...getAdminHeaders(), 'X-CSRF-Token': csrf },
        body: JSON.stringify({ status: newRawStatus }),
      });
      await loadTasks();
    } catch { /* offline */ }
  }

  async function runBotCheckAll() {
    setBotRunning(true);
    const csrf = document.cookie.split(';').find(c => c.trim().startsWith('opds_csrf='))?.split('=')[1] || '';
    // Get all unassigned orders and run bot check
    try {
      const r = await fetch('/api/admin/assignments/queue', { headers: getAdminHeaders() });
      const d = await r.json();
      for (const order of (d.queue || [])) {
        await fetch('/api/bot/check', {
          method: 'POST',
          headers: { ...getAdminHeaders(), 'X-CSRF-Token': csrf },
          body: JSON.stringify({ orderId: order.order_id }),
        });
      }
      await loadTasks();
    } catch { /* offline */ }
    setBotRunning(false);
  }

  const total         = tasks.length;
  const completed     = tasks.filter(t => t.status === 'completed').length;
  const autoAssigned  = tasks.filter(t => t.assignedBy === 'auto').length;
  const manualAssigned = total - autoAssigned;
  const pendingReview = tasks.filter(t => t.status === 'pending_review').length;

  return (
    <div className="panel active">
      <div className="page-header" style={{ cursor: 'pointer' }} onClick={onBack}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="arrow-left" size={20} />
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Kabir <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px', background: 'var(--violet-dim)', color: 'var(--violet)' }}>EMP-AI-108</span>
            </div>
            <div className="page-sub">Assignment Processor Bot · Live Task Queue from Backend</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadTasks}><Icon name="refresh-cw" size={13} /> Refresh</button>
            <button className="btn btn-primary btn-sm" disabled={botRunning} onClick={runBotCheckAll} style={{ opacity: botRunning ? 0.6 : 1 }}>
              {botRunning ? <Icon name="loader-2" size={13} className="spin" /> : <Icon name="zap" size={13} />} Run Bot Check All
            </button>
          </div>
        </div>
      </div>

      <div className="panels">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Tasks',        value: total,         cls: 'info' },
            { label: 'Completed',          value: completed,     cls: 'positive' },
            { label: 'Pending Review',     value: pendingReview, cls: 'warning' },
            { label: 'Auto Assigned',      value: autoAssigned,  cls: '' },
            { label: 'Manual Assigned',    value: manualAssigned,cls: '' },
          ].map(s => (
            <div key={s.label} className={`insight-card ${s.cls}`} style={{ padding: 16 }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{s.label}</div>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Task Queue */}
        <div className="card">
          <div className="card-header"><div className="card-title">Live Task Queue</div></div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}><Icon name="loader-2" size={24} className="spin" /></div>
          ) : (
            <table className="table" style={{ width: '100%', fontSize: 'var(--fs-sm)', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-3)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Task ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Customer / Order</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Assigned To</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Priority</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-2)' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-2)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                    No active assignments. Add staff members and submit orders to see tasks here.
                  </td></tr>
                ) : tasks.map(t => (
                  <tr key={t.id} style={{ borderTop: '1px solid var(--border-1)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'var(--fw-semibold)', color: 'var(--blue)' }}>#{t.id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 'var(--fw-medium)' }}>{t.customer}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{t.docType} · {t.date}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--fs-xs)' }}>{t.staffName || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', padding: '2px 8px', borderRadius: 20,
                        background: t.priority === 'high' || t.priority === 'critical' ? 'var(--rose-dim)' : 'var(--bg-3)',
                        color: t.priority === 'high' || t.priority === 'critical' ? 'var(--rose)' : 'var(--text-3)',
                      }}>{t.priority}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {t.status === 'completed'     && <Badge type="success">Completed</Badge>}
                      {t.status === 'in_progress'   && <Badge type="warning" className="pulse">In Progress</Badge>}
                      {t.status === 'pending_review'&& <Badge type="warning">Review Required</Badge>}
                      {t.status === 'paused'        && <Badge type="danger">Cancelled</Badge>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {t.rawStatus === 'assigned' && (
                          <button className="btn btn-primary btn-sm" style={{ background: 'var(--amber)', color: '#000', borderColor: 'var(--amber)' }}
                            onClick={() => updateStatus(t, 'accepted')}>Accept</button>
                        )}
                        {t.rawStatus === 'accepted' && (
                          <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t, 'working')}>Start Working</button>
                        )}
                        {t.rawStatus === 'working' && (
                          <button className="btn btn-primary btn-sm" style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }}
                            onClick={() => updateStatus(t, 'done')}>Mark Done ✓</button>
                        )}
                        {['working', 'accepted'].includes(t.rawStatus) && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)' }}
                            onClick={() => updateStatus(t, 'cancelled')}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main AI Agents Panel ────────────────────────────────────────────────────
const AIAgentsPanel = () => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  if (selectedAgent === 'doc_processor') return <KabirPanel onBack={() => setSelectedAgent(null)} />;
  if (selectedAgent === 'sana')          return <SanaPanel onBack={() => setSelectedAgent(null)} />;

  return (
    <div className="panel active">
      <div className="page-header">
        <div>
          <div className="page-title">Digital Workforce & AI Agents</div>
          <div className="page-sub">Configure and orchestrate your autonomous employee workforce</div>
        </div>
      </div>
      <div className="panels">
        <div className="grid-3">

          {/* Kabir */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--fs-xl)' }}>👨‍💻</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Kabir <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px', background: 'var(--violet-dim)', color: 'var(--violet)' }}>EMP-AI-108</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-regular)', marginTop: 2 }}>Assignment Processor Bot</div>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', marginBottom: 12 }}>
                Fetches live order assignments, runs bot-checks, auto-assigns to staff, and tracks task completion.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, fontSize: 'var(--fs-xs)' }}>
                {['✓ Auto-assign on payment', '✓ Doc verification check', '✓ Staff load balancing', '✓ Completion notifications'].map(f => (
                  <div key={f} style={{ color: 'var(--emerald)', fontWeight: 'var(--fw-medium)' }}>{f}</div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="chip" style={{ color: 'var(--emerald)', borderColor: 'var(--emerald-border)' }}>● Active</span>
                <button className="btn btn-primary btn-sm" onClick={() => setSelectedAgent('doc_processor')}>Open Dashboard →</button>
              </div>
            </div>
          </div>

          {/* Sana */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--fs-xl)' }}>👩‍💻</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Sana <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px', background: 'var(--blue-dim)', color: 'var(--blue)' }}>EMP-AI-109</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-regular)', marginTop: 2 }}>Notification Dispatcher Bot</div>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', marginBottom: 12 }}>
                Manages auto-replies, sends WhatsApp/SMS/Email notifications on order events, and tracks delivery.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, fontSize: 'var(--fs-xs)' }}>
                {['✓ Auto-reply on order create', '✓ Payment confirmation SMS', '✓ Doc reminder WhatsApp', '✓ Completion notification'].map(f => (
                  <div key={f} style={{ color: 'var(--blue)', fontWeight: 'var(--fw-medium)' }}>{f}</div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="chip" style={{ color: 'var(--emerald)', borderColor: 'var(--emerald-border)' }}>● Active</span>
                <button className="btn btn-primary btn-sm" onClick={() => setSelectedAgent('sana')}>Open Dashboard →</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const DigiPayPanel = () => {
  const [activeTab, setActiveTab] = useState<'religare' | 'aeps' | 'bbps' | 'insurance'>('religare');
  const [simulating, setSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([
    'System Initialized: Ready for API handshake.',
    'Terminal ID: OPDS-MUM-9473 validated.',
  ]);

  const runHandshake = () => {
    setSimulating(true);
    setSimLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting Religare secure session handshake...`]);
    setTimeout(() => {
      setSimLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Decrypting partner public key...`,
        `[${new Date().toLocaleTimeString()}] Handshake completed successfully. Active Session Token: rel_sess_` + Math.random().toString(36).substring(7),
        `[${new Date().toLocaleTimeString()}] Status: AEPS/BBPS channels verified and ready.`
      ]);
      setSimulating(false);
    }, 1200);
  };

  const getContractCode = () => {
    switch (activeTab) {
      case 'religare':
        return `{
  "provider": "Religare",
  "endpoint": "https://api.religareonline.com/digipay/v2/transact",
  "auth": {
    "partner_id": "OPDS-9473",
    "signature_algo": "SHA256withRSA"
  },
  "request_contract": {
    "agent_id": "string",
    "merchant_code": "string",
    "transaction_type": "CASH_WITHDRAWAL | BALANCE_INQUIRY | MINI_STATEMENT",
    "aadhaar_number_masked": "XXXX-XXXX-1234",
    "biometric_data_encrypted": "base64String",
    "amount_in_rupees": 500
  },
  "expected_response": {
    "status": "SUCCESS | FAILED",
    "rrn": "string (NPCI Ref Number)",
    "stan": "string",
    "ledger_balance": 10540.20,
    "commission_credited": 7.50
  }
}`;
      case 'aeps':
        return `{
  "system": "AEPS (Aadhaar Enabled Payment System)",
  "vendor": "NPCI / UIDAI Biometric",
  "device_compatibility": ["Mantra MFS100", "Morpho MSO1300", "Startek FM220"],
  "security": {
    "rd_service": "Registered Device L1 Compliant",
    "hashing": "HMAC-SHA-256",
    "timestamp_validity": "30 seconds"
  },
  "flow": [
    "1. Read Aadhaar No & Select Bank IIN",
    "2. Capture biometric FP via RD Service",
    "3. Format AuthXML as per UIDAI v2.0 schema",
    "4. Post payload to /api/finance/aeps/withdraw",
    "5. Credit operator wallet upon NPCI response"
  ]
}`;
      case 'bbps':
        return `{
  "gateway": "BBPS (Bharat Bill Payment System)",
  "biller_fetch_url": "/api/finance/bbps/billers",
  "supported_categories": [
    "ELECTRICITY", "WATER", "GAS", "BROADBAND", "MOBILE_POSTPAID", "FASTAG"
  ],
  "transaction_payload": {
    "biller_id": "MSEB00000MUM01",
    "customer_params": [
      { "name": "Consumer Number", "value": "194738592" }
    ],
    "bill_amount": 1420.00,
    "payment_mode": "Wallet"
  }
}`;
      case 'insurance':
        return `{
  "product": "Micro-Insurance & Recharges",
  "partners": ["HDFC Ergo", "SBI General", "Jio/Airtel Utility"],
  "stubs": {
    "recharge": "/api/services/utility/recharge",
    "insurance_create": "/api/services/insurance/create_policy"
  },
  "contracts": {
    "premium_paise": 15000,
    "coverage_amount_paise": 20000000,
    "policy_duration_months": 12
  }
}`;
    }
  };

  return (
    <div className="panel active">
      <PanelHeader
        title="DigiPay & AEPS Financial Core"
        sub="Monitor Religare integration readiness, AEPS cashout pathways, BBPS biller status, and recharge/insurance micro-services."
        icon="wallet"
      />
      <div style={{ margin: '0 0 16px', padding: '14px 18px', background: 'var(--amber-dim, rgba(245,158,11,0.08))', border: '1px solid var(--amber-border, rgba(245,158,11,0.3))', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name="clock" size={18} style={{ color: 'var(--amber)', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', color: 'var(--amber)' }}>Coming Soon — Integration Under Development</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>DigiPay / AEPS / BBPS integration is currently in planning. The panel below shows the planned architecture for preview only — no real transactions can be processed yet.</div>
        </div>
      </div>
      <div className="panels" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        
        {/* Left: Architecture Diagram & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 12 }}>
              Integration Architecture & Handshake Flow
            </div>
            
            {/* Visual Flow diagram in Sleek design */}
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { name: 'Customer App / Portal', sub: 'Initiates cashout or utility payment request', status: 'ready', color: 'var(--blue)' },
                { name: 'OPDS Financial Gateway API', sub: 'Signs and forwards payloads with SHA-256 HMAC', status: 'ready', color: 'var(--violet)' },
                { name: 'Religare / BBPS Provider Node', sub: 'Routes transactions securely to NPCI network', status: 'connected', color: 'var(--emerald)' },
                { name: 'UIDAI / National Clearing', sub: 'Biometric authorization & bank ledger settlement', status: 'pending_handshake', color: 'var(--amber)' }
              ].map((step, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: `${step.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'var(--fw-semibold)', color: step.color, fontSize: 'var(--fs-xs)'
                    }}>{idx + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>{step.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{step.sub}</div>
                    </div>
                    <span className="chip" style={{
                      fontSize: '9px', padding: '1px 6px',
                      background: step.status === 'ready' || step.status === 'connected' ? 'var(--emerald-dim)' : 'var(--amber-dim)',
                      color: step.status === 'ready' || step.status === 'connected' ? 'var(--emerald)' : 'var(--amber)',
                      borderColor: step.status === 'ready' || step.status === 'connected' ? 'var(--emerald-border)' : 'var(--amber-border)'
                    }}>{step.status}</span>
                  </div>
                  {idx < 3 && (
                    <div style={{ height: 16, width: 2, background: 'var(--border-1)', marginLeft: 13, marginTop: 4, marginBottom: 4 }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-primary btn-sm" disabled={simulating} onClick={runHandshake} style={{ flex: 1 }}>
                {simulating ? <Icon name="loader-2" size={13} className="spin" /> : <Icon name="activity" size={13} />} Run API Handshake
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSimLogs(['[SYSTEM] Logs cleared. Ready.'])}>
                <Icon name="trash" size={13} /> Clear Logs
              </button>
            </div>
          </div>

          {/* Real-time Handshake Logs */}
          <div className="card" style={{ padding: 18, background: '#090d16', border: '1px solid var(--border-2)', color: '#39ff14', fontFamily: 'monospace', fontSize: 'var(--fs-xs)', minHeight: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ color: 'var(--text-2)', borderBottom: '1px solid var(--border-1)', paddingBottom: 6, marginBottom: 6, fontWeight: 'var(--fw-bold)' }}>CONSOLE LOGS</div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 150, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {simLogs.map((log, idx) => (
                <div key={idx} style={{ lineHeight: 1.4 }}>{log}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Code Contract & Stubs */}
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 12 }}>
            API Contract Schema & Stubs
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { id: 'religare', label: 'Religare API' },
              { id: 'aeps', label: 'AEPS Specs' },
              { id: 'bbps', label: 'BBPS Billers' },
              { id: 'insurance', label: 'Recharge & Ins.' }
            ].map(t => (
              <button
                key={t.id}
                className={`btn btn-xs ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab(t.id as any)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <pre style={{
            background: 'var(--bg-3)', border: '1px solid var(--border-2)',
            borderRadius: 8, padding: 12, overflow: 'auto', flex: 1,
            maxHeight: 'calc(100vh - 350px)', margin: 0,
            fontSize: 'var(--fs-xs)', fontFamily: 'monospace', color: 'var(--text-2)',
            lineHeight: 1.4
          }}>
            {getContractCode()}
          </pre>
        </div>

      </div>
    </div>
  );
};

export const SystemPanels = ({ activePanel }: any) => {
  return (
    <>
      {activePanel === 'automation'  && <AutomationPanel />}
      {activePanel === 'whatsapp'    && <WhatsAppPanel />}
      {activePanel === 'sms'         && <SmsPanel />}
      {activePanel === 'support'     && <SupportTicketsPanel />}
      {activePanel === 'documents'   && <VerificationQueuePanel />}
      {activePanel === 'finance'     && <FinancePanel />}
      {activePanel === 'refunds'     && <RefundsPanel />}
      {activePanel === 'analytics'   && <AnalyticsPanel />}
      {activePanel === 'franchise'   && <FranchisePanel />}
      {activePanel === 'settings'    && <SettingsPanel />}
      {activePanel === 'ai-agents'   && <AIAgentsPanel />}
      {activePanel === 'digipay'     && <DigiPayPanel />}
      {['operators','kyc','marketing','reports','notifications','security','audit'].includes(activePanel) && (
        <div className="panel active">
          <div className="page-header">
            <div>
              <div className="page-title" style={{ textTransform: 'capitalize' }}>{activePanel.replace('-', ' ')}</div>
              <div className="page-sub">This module is coming soon.</div>
            </div>
          </div>
          <div className="panels">
            <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-2)', border: '1px dashed var(--border-2)', borderRadius: 16, color: 'var(--text-3)' }}>
              <Icon name="construction" size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', marginBottom: 8 }}>Coming Soon</div>
              <div style={{ fontSize: 'var(--fs-sm)' }}>This panel is under development.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
