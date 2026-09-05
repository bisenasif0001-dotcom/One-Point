import { useState, useEffect, useRef } from 'react';
import { AutomationPanel } from './Automation';
import { WhatsAppPanel } from './WhatsAppPanel';
import { SmsPanel } from './SmsPanel';
import { SupportTicketsPanel, VerificationQueuePanel, RefundsPanel, FinancePanel } from './ServiceOSModules';
import { AnalyticsPanel } from './AnalyticsPanel';
import { FranchisePanel, SettingsPanel } from './FranchiseSettings';
import { Icon, Badge, PanelHeader } from '../Shared';
import AICommandCenterPanel from './AICommandCenterPanel';
import { adminTokenHeader, getCsrfToken } from '../security/adminSession';

const getAdminHeaders = () => ({
  ...adminTokenHeader(),
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
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchLogs = () =>
    fetch('/api/admin/notifications?limit=50', { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLastRefresh(new Date()); })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  async function sendTest() {
    if (!testMsg || !testPhone) return;
    setSending(true);
    try {
      const csrf = await getCsrfToken();
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

  const sentCount   = logs.filter(l => l.status === 'sent').length;
  const totalCount  = logs.length;
  const deliveryRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  return (
    <div className="panel active">
      <div className="page-header" style={{ cursor: 'pointer' }} onClick={onBack}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Icon name="arrow-left" size={20} />
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              👩‍💻 Sana <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px', background: 'var(--blue-dim)', color: 'var(--blue)' }}>EMP-AI-109</span>
              <span style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 20, background: 'var(--emerald-dim)', color: 'var(--emerald)', border: '1px solid var(--emerald-border)' }}>
                🟢 Auto-Refresh ON (30s)
              </span>
            </div>
            <div className="page-sub">Notification Dispatcher Bot · {lastRefresh ? `Updated: ${lastRefresh.toLocaleTimeString('en-IN')}` : 'Loading...'}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm" onClick={fetchLogs}>
              <Icon name="refresh-cw" size={13} /> Refresh Now
            </button>
          </div>
        </div>
      </div>
      <div className="panels">
        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { label: 'Delivery Rate', value: `${deliveryRate}%`, color: deliveryRate > 80 ? 'var(--emerald)' : 'var(--amber)' },
            { label: 'Total Sent',    value: sentCount,                    color: 'var(--emerald)' },
            { label: 'Queued',        value: logs.filter(l => l.status === 'queued').length,  color: 'var(--amber)' },
            { label: 'Logged Only',   value: logs.filter(l => l.status === 'logged').length,  color: 'var(--text-3)' },
            { label: 'Failed',        value: logs.filter(l => l.status === 'failed').length,  color: 'var(--rose)' },
          ].map(s => (
            <div key={s.label} className="insight-card" style={{ padding: 14, border: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 6 }}>{s.label}</div>
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

// ─── Kabir: Live task queue + Auto-mode ─────────────────────────────────────
const KabirPanel = ({ onBack }: { onBack: () => void }) => {
  const [tasks, setTasks]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [botRunning, setBotRunning] = useState(false);
  const [autoMode, setAutoMode]   = useState(false);
  const [lastRan, setLastRan]     = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const intervalRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  async function loadTasks() {
    try {
      const r = await fetch('/api/admin/assignments', { headers: getAdminHeaders() });
      const d = await r.json();
      setTasks((d.assignments || []).map(mapAssignmentToTask));
    } catch { /* offline */ }
    setLoading(false);
  }

  useEffect(() => { loadTasks(); }, []);

  // Auto-mode: every 30s checks queue and assigns
  useEffect(() => {
    if (!autoMode) {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
      return;
    }
    const runCycle = async () => {
      setBotRunning(true);
      const csrf = await getCsrfToken();
      try {
        const r = await fetch('/api/admin/assignments/queue', { headers: getAdminHeaders() });
        const d = await r.json();
        const queue = d.queue || [];
        if (queue.length > 0) {
          for (const order of queue) {
            await fetch('/api/bot/check', {
              method: 'POST',
              headers: { ...getAdminHeaders(), 'X-CSRF-Token': csrf },
              body: JSON.stringify({ orderId: order.order_id }),
            });
          }
          setActivityLog(prev => [
            `[${new Date().toLocaleTimeString('en-IN')}] ✅ ${queue.length} order(s) auto-assigned to staff`,
            ...prev.slice(0, 14),
          ]);
          await loadTasks();
        } else {
          setActivityLog(prev => [
            `[${new Date().toLocaleTimeString('en-IN')}] 💤 Queue empty — no action needed`,
            ...prev.slice(0, 14),
          ]);
        }
      } catch {
        setActivityLog(prev => [`[${new Date().toLocaleTimeString('en-IN')}] ⚠️ Offline — retrying next cycle`, ...prev.slice(0, 14)]);
      }
      setBotRunning(false);
      setLastRan(new Date());
      setCountdown(30);
    };
    runCycle();
    intervalRef.current = setInterval(runCycle, 30000);
    countdownRef.current = setInterval(() => setCountdown(c => (c <= 1 ? 30 : c - 1)), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current); };
  }, [autoMode]);

  async function updateStatus(task: any, newRawStatus: string) {
    try {
      const csrf = await getCsrfToken();
      await fetch(`/api/admin/assignments/${task._assignmentId}`, {
        method: 'PATCH',
        headers: { ...getAdminHeaders(), 'X-CSRF-Token': csrf },
        body: JSON.stringify({ status: newRawStatus }),
      });
      await loadTasks();
    } catch { /* offline */ }
  }

  async function runBotCheckOnce() {
    setBotRunning(true);
    const csrf = await getCsrfToken();
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
      const count = (d.queue || []).length;
      setActivityLog(prev => [`[${new Date().toLocaleTimeString('en-IN')}] 🚀 Manual run — ${count} order(s) processed`, ...prev.slice(0, 14)]);
      await loadTasks();
    } catch { /* offline */ }
    setLastRan(new Date());
    setBotRunning(false);
  }

  const total         = tasks.length;
  const completed     = tasks.filter(t => t.status === 'completed').length;
  const autoAssigned  = tasks.filter(t => t.assignedBy === 'auto').length;
  const pendingReview = tasks.filter(t => t.status === 'pending_review').length;

  return (
    <div className="panel active">
      <div className="page-header" style={{ cursor: 'pointer' }} onClick={onBack}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Icon name="arrow-left" size={20} />
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              👨‍💻 Kabir <span className="chip" style={{ fontSize: 'var(--fs-xs)', padding: '2px 6px', background: 'var(--violet-dim)', color: 'var(--violet)' }}>EMP-AI-108</span>
              <span style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 20,
                background: autoMode ? 'var(--emerald-dim)' : 'var(--bg-3)',
                color: autoMode ? 'var(--emerald)' : 'var(--text-3)',
                border: autoMode ? '1px solid var(--emerald-border)' : '1px solid var(--border-1)',
              }}>
                {autoMode ? (botRunning ? '⚡ Running...' : `🟢 Auto — next in ${countdown}s`) : '⏸ Manual Mode'}
              </span>
            </div>
            <div className="page-sub">Assignment Processor Bot · {lastRan ? `Last ran: ${lastRan.toLocaleTimeString('en-IN')}` : 'Never ran yet'}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
            <button
              className="btn btn-sm"
              style={{ background: autoMode ? 'var(--rose)' : 'var(--emerald)', color: '#fff', border: 'none' }}
              onClick={() => setAutoMode(m => !m)}
            >
              <Icon name={autoMode ? 'pause-circle' : 'play-circle'} size={13} />
              {autoMode ? 'Stop Auto Mode' : 'Start Auto Mode'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); loadTasks(); }}><Icon name="refresh-cw" size={13} /> Refresh</button>
            <button className="btn btn-primary btn-sm" disabled={botRunning} onClick={runBotCheckOnce} style={{ opacity: botRunning ? 0.6 : 1 }}>
              {botRunning ? <Icon name="loader-2" size={13} className="spin" /> : <Icon name="zap" size={13} />} Run Now
            </button>
          </div>
        </div>
      </div>

      <div className="panels">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Total Tasks', value: total, color: 'var(--blue)' },
                { label: 'Completed', value: completed, color: 'var(--emerald)' },
                { label: 'Pending Review', value: pendingReview, color: 'var(--amber)' },
                { label: 'Auto Assigned', value: autoAssigned, color: 'var(--violet)' },
              ].map(s => (
                <div key={s.label} className="insight-card" style={{ padding: 14, border: '1px solid var(--border-1)' }}>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Task Queue Table */}
            <div className="card">
              <div className="card-header"><div className="card-title">Live Task Queue</div></div>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}><Icon name="loader-2" size={24} className="spin" /></div>
              ) : (
                <table className="table" style={{ width: '100%', fontSize: 'var(--fs-sm)', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--bg-3)' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>ID</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>Customer / Order</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>Assigned To</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>Priority</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                        No active assignments. Staff add karein aur orders submit honge to yahan dikhenge.
                      </td></tr>
                    ) : tasks.map(t => (
                      <tr key={t.id} style={{ borderTop: '1px solid var(--border-1)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 'var(--fw-semibold)', color: 'var(--blue)', fontSize: 'var(--fs-xs)' }}>#{t.id}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-xs)' }}>{t.customer}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.docType} · {t.date}</div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 'var(--fs-xs)' }}>{t.staffName || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 'var(--fw-semibold)', padding: '2px 7px', borderRadius: 20,
                            background: t.priority === 'high' || t.priority === 'critical' ? 'var(--rose-dim)' : 'var(--bg-3)',
                            color: t.priority === 'high' || t.priority === 'critical' ? 'var(--rose)' : 'var(--text-3)',
                          }}>{t.priority}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {t.status === 'completed'      && <Badge type="success">Completed</Badge>}
                          {t.status === 'in_progress'    && <Badge type="warning">In Progress</Badge>}
                          {t.status === 'pending_review' && <Badge type="warning">Review Needed</Badge>}
                          {t.status === 'paused'         && <Badge type="danger">Cancelled</Badge>}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {t.rawStatus === 'assigned' && <button className="btn btn-sm" style={{ background: 'var(--amber)', color: '#000', border: 'none' }} onClick={() => updateStatus(t, 'accepted')}>Accept</button>}
                            {t.rawStatus === 'accepted' && <button className="btn btn-sm btn-primary" onClick={() => updateStatus(t, 'working')}>Start</button>}
                            {t.rawStatus === 'working'  && <button className="btn btn-sm" style={{ background: 'var(--emerald)', color: '#fff', border: 'none' }} onClick={() => updateStatus(t, 'done')}>Done ✓</button>}
                            {['working','accepted'].includes(t.rawStatus) && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)' }} onClick={() => updateStatus(t, 'cancelled')}>Cancel</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Activity Log Panel */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="activity" size={15} style={{ color: 'var(--violet)' }} /> Activity Log
              </div>
            </div>
            <div style={{ padding: '4px 0', minHeight: 180 }}>
              {activityLog.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
                  Auto Mode shuru karo ya "Run Now" click karo — Kabir ki activity yahan log hogi.
                </div>
              ) : activityLog.map((log, i) => (
                <div key={i} style={{ padding: '8px 14px', borderBottom: i < activityLog.length - 1 ? '1px solid var(--border-1)' : 'none', fontSize: 11, fontFamily: 'monospace', color: log.includes('✅') ? 'var(--emerald)' : log.includes('⚠️') ? 'var(--amber)' : 'var(--text-2)', lineHeight: 1.4 }}>
                  {log}
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                💡 Auto Mode ON karne se Kabir har 30 seconds mein unassigned orders ko staff members mein automatically distribute karega.
              </div>
            </div>
          </div>
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

  const agents = [
    {
      id: 'doc_processor',
      emoji: '👨‍💻',
      name: 'Kabir',
      empId: 'EMP-AI-108',
      badgeBg: 'var(--violet-dim)',
      badgeColor: 'var(--violet)',
      role: 'Assignment Automation (Current)',
      desc: 'Existing order aur staff-assignment workflows ka dashboard view. Queue status, staff load aur assignment records dikhata hai.',
      capabilities: [
        { icon: '⚡', text: 'Payment/document readiness check' },
        { icon: '⚖️', text: 'Staff load comparison' },
        { icon: '📋', text: 'Assignment status tracking' },
        { icon: '🔁', text: 'Optional 30-second dashboard polling' },
      ],
      how: 'Current backend assignment aur bot-check endpoints ko use karta hai. Ye governed AI Runtime, autonomous reasoning, ya AI employee execution nahi hai.',
      active: true,
      accentColor: 'var(--violet)',
    },
    {
      id: 'sana',
      emoji: '👩‍💻',
      name: 'Sana',
      empId: 'EMP-AI-109',
      badgeBg: 'var(--blue-dim)',
      badgeColor: 'var(--blue)',
      role: 'Notification Automation (Current)',
      desc: 'Existing notification records aur dispatch actions ka dashboard view. Configured provider hone par outbound webhook use ho sakta hai.',
      capabilities: [
        { icon: '💬', text: 'Order-event notification records' },
        { icon: '💳', text: 'Payment/document reminder records' },
        { icon: '📎', text: 'Completion update records' },
        { icon: '✅', text: 'Manual test notification' },
      ],
      how: 'Current notification API aur logs ko use karti hai. Ye autonomous communication AI ya verified omnichannel delivery engine nahi hai.',
      active: true,
      accentColor: 'var(--blue)',
    },
    {
      id: 'riya',
      emoji: '🤖',
      name: 'Riya',
      empId: 'EMP-AI-110',
      badgeBg: 'var(--amber-dim)',
      badgeColor: 'var(--amber)',
      role: 'Future Customer Assistance Role',
      desc: 'Planned governed customer-assistance role. Current WhatsApp panel keyword-based FAQ replies dikhata hai; production AI employee abhi implemented nahi hai.',
      capabilities: [
        { icon: '🗣️', text: 'Keyword-based FAQ replies (current)' },
        { icon: '🔍', text: 'Order-status guidance (current rules)' },
        { icon: '📚', text: 'Governed AI assistance (future)' },
        { icon: '🎫', text: 'Support workflow integration (future)' },
      ],
      how: 'Future role — governed AI Runtime, approved knowledge, permissions, human handoff, aur WhatsApp Business integration ke baad hi AI employee ke roop mein active hogi.',
      active: false,
      accentColor: 'var(--amber)',
    },
  ];

  return (
    <div className="panel active">
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🤖</span> Digital Workforce & AI Agents
          </div>
          <div className="page-sub">Current automation readiness and future governed AI workforce roles</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '6px 14px', borderRadius: 20, background: 'var(--emerald-dim)', border: '1px solid var(--emerald-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--emerald)', fontWeight: 'var(--fw-semibold)' }}>2 Automations Available</span>
          </div>
        </div>
      </div>

      <div className="panels">
        {/* Info Banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(18,86,150,0.06) 0%, rgba(201,146,26,0.06) 100%)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>💡</span>
          <div>
            <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 4 }}>Current operating status</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', lineHeight: 1.6 }}>
              <strong>Kabir</strong> aur <strong>Sana</strong> existing backend automation modules ke dashboard views hain. Ye assignment aur notification workflows ko support karte hain. Governed AI Runtime, Event Bus, AI Memory, aur autonomous AI employees abhi implemented nahi hain.
            </div>
          </div>
        </div>

        {/* Agent Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {agents.map(agent => (
            <div key={agent.id} className="card" style={{
              position: 'relative', overflow: 'hidden',
              borderTop: `3px solid ${agent.active ? agent.accentColor : 'var(--border-2)'}`,
              opacity: agent.active ? 1 : 0.75,
            }}>
              {/* Header */}
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 32 }}>{agent.emoji}</span>
                  {agent.active ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--emerald)', background: 'var(--emerald-dim)', border: '1px solid var(--emerald-border)', borderRadius: 20, padding: '3px 10px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} /> AUTOMATION AVAILABLE
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: 20, padding: '3px 10px' }}>
                      COMING SOON
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>{agent.name}</span>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: agent.badgeBg, color: agent.badgeColor, fontWeight: 600 }}>{agent.empId}</span>
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{agent.role}</div>
              </div>

              {/* Body */}
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{agent.desc}</p>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Capabilities</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {agent.capabilities.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-xs)', color: agent.active ? 'var(--text-2)' : 'var(--text-3)' }}>
                        <span>{c.icon}</span> {c.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Kaise kaam karta/karti hai</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{agent.how}</div>
                </div>

                {agent.active && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center', background: agent.accentColor, borderColor: agent.accentColor }}
                    onClick={() => setSelectedAgent(agent.id)}
                  >
                    Open {agent.name} Automation →
                  </button>
                )}
              </div>
            </div>
          ))}
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
      {activePanel === 'ai-agents'   && <AICommandCenterPanel />}
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
