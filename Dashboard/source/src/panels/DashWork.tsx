import { useEffect, useState } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { PanelHeader, Card, Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';
import { ServicesPanel } from './ServicesPanel';
import { OneMartPanel } from './OneMartPanel';
import { TasksPanel } from './TasksPanel';
import { AddTaskModal } from '../Modals';
import { getStoredAdminToken } from '../security/adminSession';

// Payment Simulator — triggers automation rules
const PaymentSimulator = () => {
  const { customers, triggerEvent, addOrder } = useApp();
  const [simOpen, setSimOpen] = useState(false);
  const [form, setForm] = useState({ customerId: customers[0]?.id || '', service: 'PAN Card Application', amount: '499', gateway: 'Razorpay' });
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');

  const simulate = (success: boolean) => {
    const customer = customers.find(c => c.id === form.customerId);
    if (!customer) return;

    const orderId = `OPDS-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const amount = parseInt(form.amount) || 499;

    if (success) {
      // Add real order
      addOrder(form.customerId, {
        id: orderId, service: form.service, category: 'E-Services',
        amount, status: 'Pending', payStatus: 'Paid', gateway: form.gateway,
        date: new Date().toISOString().split('T')[0],
      });
      // Fire automation rules
      triggerEvent('payment.captured', {
        orderId, amount, customerName: customer.name,
        service: form.service, gateway: form.gateway,
      });
      setStatus('success');
    } else {
      triggerEvent('payment.failed', {
        orderId, amount, customerName: customer.name, service: form.service,
      });
      setStatus('fail');
    }
    setTimeout(() => { setStatus('idle'); setSimOpen(false); }, 2000);
  };

  return (
    <>
      <button
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--emerald)', border: '1px solid var(--emerald-border)' }}
        onClick={() => setSimOpen(true)}
      >
        <Icon name="zap" size={14} /> Simulate Payment
      </button>

      {simOpen && (
        <div className="modal-overlay" style={{ justifyContent: 'center', alignItems: 'center' }} onClick={() => setSimOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 16,
            width: 440, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s var(--ease)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'var(--fw-semibold)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="zap" size={16} style={{ color: 'var(--amber)' }} /> Payment Simulator
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Automation rules trigger karein</div>
              </div>
              <button className="icon-btn" onClick={() => setSimOpen(false)}><Icon name="x" size={16} /></button>
            </div>

            {status !== 'idle' ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Icon
                  name={status === 'success' ? 'check-circle' : 'x-circle'}
                  size={48}
                  style={{ color: status === 'success' ? 'var(--emerald)' : 'var(--rose)', marginBottom: 12 }}
                />
                <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>
                  {status === 'success' ? '✅ Payment Captured!' : '❌ Payment Failed!'}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 8 }}>
                  {status === 'success' ? 'Automation rules triggered. Check Activity Feed.' : 'Failed event logged. Check Notifications.'}
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Customer</label>
                  <select className="form-input" value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Service</label>
                  <input className="form-input" value={form.service} onChange={e => setForm(p => ({ ...p, service: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Amount (₹)</label>
                    <input type="number" className="form-input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Gateway</label>
                    <select className="form-input" value={form.gateway} onChange={e => setForm(p => ({ ...p, gateway: e.target.value }))}>
                      <option>Razorpay</option><option>Paytm</option><option>UPI</option><option>Cash</option>
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: 8, padding: '8px 12px' }}>
                  ⚡ Simulating payment will trigger active automation rules — try it!
                </div>
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => simulate(true)}>
                    <Icon name="check" size={14} /> Success Payment
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => simulate(false)}>
                    <Icon name="x" size={14} /> Failed Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};


const money = (amount: any) => `Rs. ${Number(amount || 0).toLocaleString('en-IN')}`;

function buildRevenueChart(orders: any[]) {
  const paid = orders.filter(o => o.payStatus === 'Paid' && o.date);
  if (paid.length === 0) return [];
  const byDate = new Map<string, number>();
  paid.forEach(o => {
    const d = String(o.date).slice(0, 10);
    byDate.set(d, (byDate.get(d) || 0) + Number(o.amount || 0));
  });
  const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let cumulative = 0;
  return sorted.map(([date, amount]) => {
    cumulative += amount;
    const d = new Date(date);
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { date: label, value: cumulative };
  });
}

const statusTone = (value: any) => {
  const status = String(value || '').toLowerCase();
  if (status.includes('complete') || status.includes('done') || status.includes('success')) return 'success';
  if (status.includes('reject') || status.includes('cancel') || status.includes('fail')) return 'danger';
  if (status.includes('process') || status.includes('verify') || status.includes('review') || status.includes('pending')) return 'warning';
  return 'info';
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const formatDate = (value: any) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const LegacyDashboardPanel = ({ setActivePanel }: any) => {
  const { activities, allOrders, customers, tasks, backendSync, refreshBackend } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const loadExecutiveSummary = async () => {
      try {
        const response = await fetch('/api/admin/executive/summary', {
          headers: { 'X-Admin-Token': getStoredAdminToken() },
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) setExecutiveSummary(payload.summary || null);
      } catch {
        if (active) setExecutiveSummary(null);
      }
    };
    loadExecutiveSummary();
    return () => { active = false; };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshDone(false);
    refreshBackend();
    setTimeout(() => {
      setRefreshing(false);
      setRefreshDone(true);
      setTimeout(() => setRefreshDone(false), 2000);
    }, 1200);
  };

  const completed = allOrders.filter(o => o.status === 'Completed').length;
  const paidOrders = allOrders.filter(o => o.payStatus === 'Paid');
  const paidRevenue = paidOrders.reduce((s, o) => s + o.amount, 0);

  const revenueData = buildRevenueChart(allOrders);

  const statsTop = [
    { l: "Total Orders", v: String(allOrders.length), t: `${allOrders.length} total`, cls: 'trend-up', icon: 'package', color: 'var(--blue)', action: 'orders' },
    { l: 'Revenue', v: money(paidRevenue), t: `${paidOrders.length} paid`, cls: 'trend-up', icon: 'indian-rupee', color: 'var(--emerald)', action: 'finance' },
    { l: 'Pending Orders', v: String(allOrders.filter(o => ['Pending', 'Verified', 'Processing'].includes(o.status)).length), t: 'Needs action', cls: 'trend-neutral', icon: 'clock', color: 'var(--amber)', action: 'kanban' },
  ];

  const statsBottom = [
    { l: 'Completed Orders', v: String(completed), t: `${allOrders.length} total`, cls: 'trend-up', icon: 'check-circle-2', color: 'var(--emerald)', action: 'orders' },
    { l: 'Customer Profiles', v: String(customers.length), t: 'Live profiles', cls: 'trend-up', icon: 'users', color: 'var(--blue)', action: 'crm' },
    { l: 'Conversion Rate', v: String(((paidOrders.length / Math.max(1, allOrders.length)) * 100).toFixed(1)) + '%', t: 'Paid vs total', cls: 'trend-up', icon: 'trending-up', color: 'var(--violet)', action: 'analytics' },
  ];
  const activeTasks = tasks.filter((task: any) => task.status !== 'done').length;
  const healthRows = [
    {
      n: 'Website Backend',
      status: backendSync.status === 'live' ? 'Live' : backendSync.status === 'syncing' ? 'Syncing' : backendSync.status === 'offline' ? 'Offline' : 'Demo mode',
      type: backendSync.status === 'live' ? 'success' : backendSync.status === 'offline' ? 'danger' : 'warning',
    },
    { n: 'Customer Profiles', status: `${customers.length} loaded`, type: customers.length ? 'success' : 'warning' },
    { n: 'Order Dataset', status: `${allOrders.length} orders`, type: allOrders.length ? 'success' : 'warning' },
    { n: 'Task Queue', status: `${activeTasks} active`, type: activeTasks ? 'info' : 'success' },
  ];

  return (
    <div className="panel active">
      <PanelHeader
        title="Service Control Center"
        sub={`${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} - Real-time Operations`}
        actions={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleRefresh} disabled={refreshing}>
              <Icon name={refreshing ? 'loader-2' : refreshDone ? 'check' : 'refresh-cw'} size={14} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : refreshDone ? '✓ Updated' : 'Refresh Live Data'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { window.location.href = '/online-services.html#apply-now'; }}>
              <Icon name="plus" size={14} /> New Website Order
            </button>
          </div>
        }
      />
      <div className="panels">
        {/* Top Row: 3 Square Stat Cards + 1 Wide Revenue Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2.5fr', gap: 14 }}>
          {statsTop.map((h, i) => (
            <div
              className="card hover-lift"
              key={i}
              style={{ display: 'flex', flexDirection: 'column', padding: 16, cursor: 'pointer', justifyContent: 'space-between', minHeight: 120 }}
              onClick={() => setActivePanel && setActivePanel(h.action)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${h.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={h.icon} size={15} color={h.color} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4 }}>{h.t}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h.l}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1, letterSpacing: '-0.02em' }}>{h.v}</div>
              </div>
            </div>
          ))}

          {/* 4th card: Revenue Trend Line Chart - wider */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Revenue Trend</div>
                <div className="card-sub">{revenueData.length ? `${revenueData[0].date} – ${revenueData[revenueData.length - 1].date}` : 'Live orders'}</div>
              </div>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--emerald)' }}>{money(paidRevenue)}</div>
            </div>
            <div style={{ padding: '8px 0 0' }}>
              {revenueData.length === 0 ? (
                <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
                  No paid orders yet — chart will appear after first payment.
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 'var(--fs-xs)', fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: any) => [money(v), 'Revenue']} contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 6, fontSize: 'var(--fs-xs)' }} />
                  <Area type="monotone" dataKey="value" stroke="#16a34a" fill="url(#grad-rev)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {executiveSummary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            {[
              { label: 'Governed Workforce', value: String(executiveSummary.workforce?.active || 0), sub: `${executiveSummary.workforce?.total || 0} total`, icon: 'users', color: 'var(--blue)', panel: 'staff' },
              { label: 'Departments', value: String(executiveSummary.workforce?.byDepartment?.length || 0), sub: 'Governed ownership', icon: 'building-2', color: 'var(--violet)', panel: 'staff' },
              { label: 'Network Nodes', value: String(executiveSummary.network?.total || 0), sub: `${executiveSummary.network?.franchises || 0} franchises`, icon: 'store', color: 'var(--amber)', panel: 'franchise' },
              { label: 'Conversations', value: String(executiveSummary.operations?.totalConversations || 0), sub: 'Read-only pulse', icon: 'message-circle', color: 'var(--emerald)', panel: 'analytics' },
            ].map((metric) => (
              <div
                key={metric.label}
                className="card hover-lift"
                style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, cursor: 'pointer' }}
                onClick={() => setActivePanel && setActivePanel(metric.panel)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${metric.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={metric.icon} size={15} color={metric.color} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-4)' }}>Executive read model</span>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 2 }}>{metric.label}</div>
                  <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{metric.value}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 4 }}>{metric.sub}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Second Row: 3 more stat cards + Activity Feed */}
        <div className="grid-65" style={{ flex: 1, minHeight: 0 }}>
          <Card title="Order Pipeline Activity" actions={<button className="btn btn-ghost btn-xs" onClick={() => setActivePanel('orders')}>View All</button>}>
            <div className="activity-feed">
              {activities.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
                  <Icon name="inbox" size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                  <div style={{ fontSize: 'var(--fs-sm)' }}>Abhi tak koi activity nahi. Pehla order aane pe yahan dikhega.</div>
                </div>
              ) : activities.slice(0, 6).map((a, i) => (
                <div className="activity-item" key={i}>
                  <div className="activity-icon" style={{ background: a.bg }}><Icon name={a.icon} color={a.color} size={14} /></div>
                  <div className="activity-body">
                    <div className="activity-text">{a.text}</div>
                    <div className="activity-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Bottom 3 stat cards stacked */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {statsBottom.map((h, i) => (
                <div
                  className="card hover-lift"
                  key={i}
                  style={{ display: 'flex', flexDirection: 'column', padding: 12, cursor: 'pointer', gap: 8 }}
                  onClick={() => setActivePanel && setActivePanel(h.action)}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${h.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={h.icon} size={16} color={h.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', marginBottom: 2 }}>{h.l}</div>
                    <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: h.l === 'Failed' ? 'var(--rose)' : 'var(--text-1)', lineHeight: 1 }}>{h.v}</div>
                    <div className={`health-cell-meta ${h.cls}`} style={{ fontSize: 'var(--fs-xs)', marginTop: 4 }}>{h.t}</div>
                  </div>
                </div>
              ))}
            </div>

            <Card title="System Health Monitor" sub={backendSync.message}>
              <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {healthRows.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < healthRows.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)' }}>{s.n}</div>
                    <Badge type={s.type}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DashboardPanel = ({ setActivePanel }: any) => {
  const { activities, allOrders, customers, tasks, backendSync, refreshBackend } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [queueSearch, setQueueSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('latest');

  useEffect(() => {
    let active = true;
    const loadExecutiveSummary = async () => {
      try {
        const response = await fetch('/api/admin/executive/summary', {
          headers: { 'X-Admin-Token': getStoredAdminToken() },
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) setExecutiveSummary(payload.summary || null);
      } catch {
        if (active) setExecutiveSummary(null);
      }
    };
    loadExecutiveSummary();
    return () => { active = false; };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshDone(false);
    refreshBackend();
    setTimeout(() => {
      setRefreshing(false);
      setRefreshDone(true);
      setTimeout(() => setRefreshDone(false), 2000);
    }, 1200);
  };

  const completed = allOrders.filter(o => o.status === 'Completed').length;
  const paidOrders = allOrders.filter(o => o.payStatus === 'Paid');
  const paidRevenue = paidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = allOrders.filter(o => String(o.date || '').slice(0, 10) === todayKey);
  const todayRevenue = todayOrders.filter(o => o.payStatus === 'Paid').reduce((s, o) => s + Number(o.amount || 0), 0);
  const pendingApplications = allOrders.filter(o => ['Pending', 'Verified', 'Processing', 'Review Needed'].includes(o.status)).length;
  const rejectedApplications = allOrders.filter(o => {
    const state = `${o.status || ''} ${o.payStatus || ''}`.toLowerCase();
    return state.includes('reject') || state.includes('cancel') || state.includes('fail');
  }).length;
  const activeTasks = tasks.filter((task: any) => task.status !== 'done').length;
  const operatorActivity = activities.length + activeTasks;
  const successRate = clampPercent((completed / Math.max(1, allOrders.length - rejectedApplications)) * 100);
  const conversionRate = clampPercent((paidOrders.length / Math.max(1, allOrders.length)) * 100);
  const averageTicket = paidOrders.length ? Math.round(paidRevenue / paidOrders.length) : 0;
  const revenueData = buildRevenueChart(allOrders);

  const stageMix = [
    { label: 'Pending', count: pendingApplications, color: 'var(--amber)' },
    { label: 'Completed', count: completed, color: 'var(--emerald)' },
    { label: 'Rejected', count: rejectedApplications, color: 'var(--rose)' },
    { label: 'Paid', count: paidOrders.length, color: 'var(--blue)' },
  ];
  const maxStageCount = Math.max(1, ...stageMix.map(item => item.count));
  const serviceMix = Object.values(
    allOrders.reduce((map: any, order: any) => {
      const key = order.category || order.service || 'Services';
      map[key] = map[key] || { label: key, count: 0, revenue: 0 };
      map[key].count += 1;
      map[key].revenue += Number(order.amount || 0);
      return map;
    }, {})
  ).sort((a: any, b: any) => b.count - a.count).slice(0, 5);

  const filteredOrders = [...allOrders]
    .filter(order => {
      const query = queueSearch.trim().toLowerCase();
      const haystack = `${order.id} ${order.service} ${order.customer?.name || ''} ${order.customer?.phone || ''}`.toLowerCase();
      const queryMatch = !query || haystack.includes(query);
      const status = String(order.status || '').toLowerCase();
      const payment = String(order.payStatus || '').toLowerCase();
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'paid' ? payment === 'paid' : status.includes(statusFilter));
      return queryMatch && statusMatch;
    })
    .sort((a, b) => {
      if (sortMode === 'amount') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortMode === 'oldest') return String(a.date || '').localeCompare(String(b.date || ''));
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  const visibleOrders = filteredOrders.slice(0, 8);
  const priorityQueue = filteredOrders
    .filter(order => statusTone(order.status) !== 'success')
    .slice(0, 6);

  const heroKpis = [
    { label: "Today's Revenue", value: money(todayRevenue), meta: `${todayOrders.length} orders today`, icon: 'indian-rupee', color: 'var(--emerald)', panel: 'finance' },
    { label: "Today's Orders", value: String(todayOrders.length), meta: `${allOrders.length} total applications`, icon: 'shopping-bag', color: 'var(--blue)', panel: 'orders' },
    { label: 'Pending Applications', value: String(pendingApplications), meta: 'Needs operator review', icon: 'clock-3', color: 'var(--amber)', panel: 'kanban' },
    { label: 'Completed Applications', value: String(completed), meta: `${successRate.toFixed(1)}% success rate`, icon: 'check-circle-2', color: 'var(--emerald)', panel: 'orders' },
    { label: 'Rejected', value: String(rejectedApplications), meta: 'Refund or correction queue', icon: 'octagon-alert', color: 'var(--rose)', panel: 'support' },
    { label: 'Operator Activity', value: String(operatorActivity), meta: `${activeTasks} active tasks`, icon: 'activity', color: 'var(--violet)', panel: 'tasks' },
  ];

  const focusCards = [
    {
      label: "Today's Focus",
      title: pendingApplications ? `${pendingApplications} applications need movement` : 'Queue is clear',
      detail: pendingApplications ? 'Review documents, assign owner, and push next-stage updates.' : 'Use the clean window to follow up premium customers.',
      icon: 'target',
      tone: 'warning',
    },
    {
      label: 'Recommended Action',
      title: rejectedApplications ? 'Resolve rejected or failed cases first' : 'Protect payment capture flow',
      detail: rejectedApplications ? 'Open support queue and convert failed outcomes into correction tasks.' : `${paidOrders.length} paid orders are ready for completion tracking.`,
      icon: 'sparkles',
      tone: rejectedApplications ? 'danger' : 'success',
    },
    {
      label: 'Risk Alert',
      title: backendSync.status === 'offline' ? 'Backend sync is offline' : 'No critical platform risk',
      detail: backendSync.message || 'Server, queue and dashboard are responding.',
      icon: 'shield-alert',
      tone: backendSync.status === 'offline' ? 'danger' : 'info',
    },
  ];

  const liveStatus = [
    {
      label: 'Server Status',
      status: backendSync.status === 'live' ? 'Live' : backendSync.status === 'syncing' ? 'Syncing' : backendSync.status === 'offline' ? 'Offline' : 'Demo mode',
      type: backendSync.status === 'live' ? 'success' : backendSync.status === 'offline' ? 'danger' : 'warning',
      icon: 'server',
    },
    { label: 'Database Status', status: allOrders.length ? `${allOrders.length} records` : 'Waiting for data', type: allOrders.length ? 'success' : 'warning', icon: 'database' },
    { label: 'Payment Gateway', status: paidOrders.length ? 'Capturing' : 'Ready', type: 'success', icon: 'credit-card' },
    { label: 'Notification Queue', status: `${activities.length} events`, type: activities.length ? 'info' : 'success', icon: 'bell-ring' },
    { label: 'Background Jobs', status: refreshing ? 'Running' : 'Idle', type: refreshing ? 'warning' : 'success', icon: 'cpu' },
  ];

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '20px 24px', overflowY: 'auto' }}>
      
      {/* 1. Header Banner & Quick Actions */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        background: '#ffffff', padding: '20px 24px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--amber)', background: 'var(--amber-dim)', padding: '3px 8px', borderRadius: 6 }}>
              Suvidha Kendra Lucknow
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600,
              color: backendSync.status === 'live' ? 'var(--emerald)' : backendSync.status === 'offline' ? 'var(--rose)' : 'var(--amber)',
              background: backendSync.status === 'live' ? 'var(--emerald-dim)' : backendSync.status === 'offline' ? 'var(--rose-dim)' : 'var(--amber-dim)',
              padding: '3px 10px', borderRadius: 20
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {backendSync.status === 'live' ? 'Live Production' : backendSync.status === 'offline' ? 'Offline' : 'Demo Mode'}
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>
            Executive Command Center
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
            Real-time pipeline monitoring, revenue collection, citizen requests, and operator activity.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ borderRadius: 10, padding: '7px 14px', background: 'var(--bg-3)' }}
          >
            <Icon name={refreshing ? 'loader-2' : refreshDone ? 'check' : 'refresh-cw'} size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing…' : refreshDone ? '✓ Updated' : 'Sync Live Data'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setActivePanel && setActivePanel('whatsapp')}
            style={{ borderRadius: 10, padding: '7px 14px', color: '#128c7e', borderColor: 'rgba(18, 140, 126, 0.25)', background: 'rgba(18, 140, 126, 0.06)' }}
          >
            <Icon name="message-circle" size={14} /> WhatsApp Desk
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setActivePanel && setActivePanel('orders')}
            style={{ borderRadius: 10, padding: '7px 16px', fontWeight: 600 }}
          >
            <Icon name="plus" size={14} /> New Application
          </button>

          <PaymentSimulator />
        </div>
      </div>

      {/* 2. Top 4 Core KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {/* KPI 1: Revenue */}
        <div
          className="hover-lift"
          onClick={() => setActivePanel && setActivePanel('finance')}
          style={{
            background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--emerald-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald)' }}>
              <Icon name="indian-rupee" size={18} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)', background: 'var(--emerald-dim)', padding: '2px 8px', borderRadius: 6 }}>
              {paidOrders.length} Paid
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Collection</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 2, letterSpacing: '-0.02em' }}>{money(paidRevenue)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Today: {money(todayRevenue)} collected</div>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div
          className="hover-lift"
          onClick={() => setActivePanel && setActivePanel('orders')}
          style={{
            background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
              <Icon name="shopping-bag" size={18} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 8px', borderRadius: 6 }}>
              {completed} Completed
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Applications</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 2, letterSpacing: '-0.02em' }}>{allOrders.length}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>{successRate.toFixed(0)}% completion success rate</div>
          </div>
        </div>

        {/* KPI 3: Pending Verification */}
        <div
          className="hover-lift"
          onClick={() => setActivePanel && setActivePanel('kanban')}
          style={{
            background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
              <Icon name="clock-3" size={18} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-dim)', padding: '2px 8px', borderRadius: 6 }}>
              Action Required
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Processing</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 2, letterSpacing: '-0.02em' }}>{pendingApplications}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>In verification or queue</div>
          </div>
        </div>

        {/* KPI 4: Customers */}
        <div
          className="hover-lift"
          onClick={() => setActivePanel && setActivePanel('customer-db')}
          style={{
            background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(8, 47, 97, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#082f61' }}>
              <Icon name="users" size={18} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#082f61', background: 'rgba(8, 47, 97, 0.08)', padding: '2px 8px', borderRadius: 6 }}>
              Citizen CRM
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Citizens</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 2, letterSpacing: '-0.02em' }}>{customers.length}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Profiles in database</div>
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Working Layout (66% / 34%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 360px)', gap: 18, alignItems: 'start' }}>
        
        {/* Left Column: Revenue Velocity & Orders Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          
          {/* Revenue Chart Card */}
          <div style={{
            background: '#ffffff', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Revenue & Application Growth</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>Cumulative collection across settled citizen requests</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--emerald)', background: 'var(--emerald-dim)', padding: '3px 8px', borderRadius: 6 }}>
                  {conversionRate.toFixed(1)}% Conversion Rate
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-dim)', padding: '3px 8px', borderRadius: 6 }}>
                  Avg {money(averageTicket)}
                </span>
              </div>
            </div>

            <div style={{ height: 200, width: '100%' }}>
              {revenueData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', gap: 6 }}>
                  <Icon name="line-chart" size={28} style={{ opacity: 0.4 }} />
                  <span style={{ fontSize: 12 }}>No paid orders yet. Chart will activate automatically on first payment.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="opdsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#125696" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#125696" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: any) => [money(v), 'Revenue']}
                      contentStyle={{ background: '#ffffff', border: '1px solid rgba(8, 47, 97, 0.12)', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#125696" fill="url(#opdsRevenueGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#125696' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Stage mix distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
              {stageMix.map(s => (
                <div key={s.label} style={{ background: 'var(--bg-3)', padding: '8px 12px', borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Applications Table Card */}
          <div style={{
            background: '#ffffff', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Recent Citizen Applications</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>Live stream from web portal and Suvidha Kendra desk</p>
              </div>

              {/* Status Filter Chips */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 3, borderRadius: 8 }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'processing', label: 'Processing' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'paid', label: 'Paid' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      border: 'none', background: statusFilter === tab.id ? '#ffffff' : 'transparent',
                      color: statusFilter === tab.id ? 'var(--blue)' : 'var(--text-3)',
                      fontWeight: statusFilter === tab.id ? 700 : 500, fontSize: 11.5,
                      padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                      boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Search & Summary */}
            <div style={{ padding: '10px 20px', background: 'var(--bg-3)', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="search" size={14} style={{ color: 'var(--text-4)' }} />
              <input
                type="text"
                placeholder="Search by order ID, customer name, phone, or service..."
                value={queueSearch}
                onChange={e => setQueueSearch(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text-1)' }}
              />
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-3)', color: 'var(--text-3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '10px 18px' }}>Application</th>
                    <th style={{ padding: '10px 14px' }}>Customer</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Payment</th>
                    <th style={{ padding: '10px 14px' }}>Amount</th>
                    <th style={{ padding: '10px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
                        <Icon name="inbox" size={24} style={{ opacity: 0.4, marginBottom: 8 }} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>No applications matching the filter.</div>
                      </td>
                    </tr>
                  ) : (
                    visibleOrders.map((order, idx) => (
                      <tr
                        key={order.id || idx}
                        style={{ borderBottom: '1px solid var(--border-1)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(18, 86, 150, 0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{order.service}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{order.id} • {formatDate(order.date)}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>{order.customer?.name || 'Walk-in Citizen'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{order.customer?.phone || 'No phone'}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge type={statusTone(order.status)} dot>{order.status || 'Pending'}</Badge>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge type={order.payStatus === 'Paid' ? 'success' : order.payStatus === 'Failed' ? 'danger' : 'warning'}>
                            {order.payStatus || 'Pending'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-1)' }}>
                          {money(order.amount)}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => setActivePanel && setActivePanel('kanban')}
                              title="Process in Kanban"
                            >
                              Process
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => setActivePanel && setActivePanel('customer-db')}
                              title="View CRM Profile"
                            >
                              CRM
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-3)' }}>
              <span>Showing {visibleOrders.length} of {filteredOrders.length} applications</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setActivePanel && setActivePanel('orders')}
                style={{ fontWeight: 600 }}
              >
                View Full Pipeline <Icon name="arrow-right" size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Priority Queue, Health Monitor & Activities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Urgent Queue Card */}
          <div style={{
            background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="alert-circle" size={16} style={{ color: 'var(--amber)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Priority Action Queue</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setActivePanel && setActivePanel('documents')}
              >
                Verify Queue
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {priorityQueue.length === 0 ? (
                <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                  <Icon name="check-circle-2" size={22} style={{ color: 'var(--emerald)', marginBottom: 6 }} />
                  <div>All active applications are progressing smoothly.</div>
                </div>
              ) : (
                priorityQueue.slice(0, 4).map(item => (
                  <div
                    key={item.id}
                    onClick={() => setActivePanel && setActivePanel('kanban')}
                    style={{
                      background: 'var(--bg-3)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-1)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{item.service}</span>
                      <Badge type={statusTone(item.status)}>{item.status}</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{item.customer?.name || 'Citizen'} • {item.id}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Health Card */}
          <div style={{
            background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="shield-check" size={16} style={{ color: 'var(--emerald)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>System & Services Health</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {liveStatus.map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                    <Icon name={item.icon} size={14} style={{ color: 'var(--text-4)' }} />
                    {item.label}
                  </div>
                  <Badge type={item.type}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Stream Card */}
          <div style={{
            background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(8, 47, 97, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="activity" size={16} style={{ color: 'var(--blue)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Live Activity Stream</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.length === 0 ? (
                <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                  <Icon name="inbox" size={20} style={{ opacity: 0.4, marginBottom: 6 }} />
                  <div>No activity recorded yet.</div>
                </div>
              ) : (
                activities.slice(0, 5).map((act, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: act.bg || 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: act.color || 'var(--blue)' }}>
                      <Icon name={act.icon || 'activity'} size={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{act.text}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 2 }}>{act.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export const WorkPanels = ({ activePanel }: any) => {
  const [showNewTask, setShowNewTask] = useState(false);

  return (
    <>
      {activePanel === 'tasks' && (
        <>
          <TasksPanel onNewTask={() => setShowNewTask(true)} />
          {showNewTask && <AddTaskModal onClose={() => setShowNewTask(false)} />}
        </>
      )}
      {activePanel === 'services' && <ServicesPanel />}
      {activePanel === 'onemart' && <OneMartPanel />}
      {activePanel === 'travel' && (
        <div className="panel active">
          <PanelHeader title="Travel Desk" sub="Flight, Train & Bus booking management" />
          <div className="panels">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 24, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--blue-dim)', border: '2px solid var(--blue-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plane" size={32} style={{ color: 'var(--blue)' }} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', marginBottom: 8 }}>Travel Desk — Coming Soon</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', maxWidth: 460, lineHeight: 1.6 }}>
                  IRCTC train booking, flight search (via Amadeus/Skyscanner), and bus ticketing (RedBus) integrations are under development. This panel will manage all travel bookings and commission tracking once live.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 520 }}>
                {[
                  { icon: 'train', label: 'Train / IRCTC', sub: 'PNR status, seat booking' },
                  { icon: 'plane', label: 'Flights', sub: 'Amadeus API integration' },
                  { icon: 'bus', label: 'Bus Booking', sub: 'RedBus API' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Icon name={item.icon} size={22} style={{ color: 'var(--blue)', opacity: 0.6 }} />
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
