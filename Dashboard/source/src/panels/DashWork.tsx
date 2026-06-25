import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { PanelHeader, Card, Badge, Icon } from '../Shared';
import { useApp } from '../AppContext';
import { ServicesPanel } from './ServicesPanel';
import { OneMartPanel } from './OneMartPanel';
import { TasksPanel } from './TasksPanel';
import { AddTaskModal } from '../Modals';

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

export const DashboardPanel = ({ setActivePanel }: any) => {
  const { activities, allOrders, customers, tasks, backendSync, refreshBackend } = useApp();

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
            <button className="btn btn-ghost btn-sm" onClick={refreshBackend}>
              <Icon name={backendSync.status === 'syncing' ? 'loader-2' : 'refresh-cw'} size={14} className={backendSync.status === 'syncing' ? 'spin' : ''} /> Refresh Live Data
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
              style={{ display: 'flex', flexDirection: 'column', padding: 14, cursor: 'pointer', aspectRatio: '1 / 1', justifyContent: 'space-between' }}
              onClick={() => setActivePanel && setActivePanel(h.action)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${h.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={h.icon} size={18} color={h.color} />
                </div>
                <div className={`health-cell-meta ${h.cls}`} style={{ background: 'var(--bg-3)', padding: '3px 7px', borderRadius: 4, fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-xs)' }}>{h.t}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', marginBottom: 4 }}>{h.l}</div>
                <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', lineHeight: 1 }}>{h.v}</div>
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

        {/* Second Row: 3 more stat cards + Activity Feed */}
        <div className="grid-65">
          <Card title="Order Pipeline Activity" actions={<button className="btn btn-ghost btn-xs" onClick={() => setActivePanel('orders')}>View All</button>}>
            <div className="activity-feed">
              {activities.slice(0, 6).map((a, i) => (
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
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border-1)' : 'none' }}>
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
