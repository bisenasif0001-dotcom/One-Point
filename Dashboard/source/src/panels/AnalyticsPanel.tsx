import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area} from 'recharts';
import { PanelHeader, Card, Badge, Icon} from '../Shared';
import { useApp} from '../AppContext';
import { usePersistentState} from '../hooks/usePersistentState';
import { adminTokenHeader} from '../security/adminSession';

const CHART_COLORS = ['#125696', '#16a34a', '#C9921A', '#f59e0b', '#dc2626', '#0284c7'];

const SLA_DATA: any[] = [];

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '10px 14px', fontSize: 'var(--fs-xs)' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 'var(--fw-semibold)' }}>
          {p.name === 'revenue' ? `₹${p.value.toLocaleString()}` : p.value} {p.name !== 'revenue' ? p.name : ''}
        </div>
      ))}
    </div>
  );
};

export const AnalyticsPanel: React.FC = () => {
  const { customers, allOrders } = useApp();
  const [period, setPeriod] = usePersistentState<'7d' | '30d' | 'all'>('analytics_period', '30d');
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);

  const setPeriodAndSave = (p: '7d' | '30d' | 'all') => setPeriod(p);

  useEffect(() => {
    let active = true;
    const loadExecutiveSummary = async () => {
      try {
        const response = await fetch('/api/admin/executive/summary', {
          headers: adminTokenHeader(),
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

  // Filter orders by period
  const filteredOrders = useMemo(() => {
    if (period === 'all') return allOrders;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (period === '7d' ? 7 : 30));
    return allOrders.filter(o => {
      try { return new Date(o.date) >= cutoff; } catch { return true; }
    });
  }, [allOrders, period]);

  // Build daily chart data from real orders (or fallback to sample)
  const dailyChartData = useMemo(() => {
    if (filteredOrders.length === 0) {
      // Sample data when no real orders
      const days = period === '7d' ? 7 : 10;
      const base = new Date();
      return Array.from({ length: days }, (_, i) => {
        const d = new Date(base); d.setDate(d.getDate() - (days - 1 - i));
        return { date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: Math.floor(2000 + Math.random() * 8000), orders: Math.floor(5 + Math.random() * 30) };
      });
    }
    // Group by date
    const map: Record<string, { revenue: number; orders: number }> = {};
    filteredOrders.forEach(o => {
      const d = o.date || new Date().toISOString().slice(0, 10);
      if (!map[d]) map[d] = { revenue: 0, orders: 0 };
      map[d].revenue += o.amount || 0;
      map[d].orders++;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      ...v,
    }));
  }, [filteredOrders, period]);

  // Compute service distribution
  const serviceBreakdown = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    filteredOrders.forEach(o => {
      const cat = o.category || 'Other';
      if (!map[cat]) map[cat] = { count: 0, revenue: 0 };
      map[cat].count++;
      map[cat].revenue += o.amount;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [filteredOrders]);

  // Top customers by LTV
  const topCustomers = useMemo(() =>
    [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5),
    [customers]
  );

  // KPI — uses filteredOrders (period-aware)
  const totalRevenue = filteredOrders.reduce((s, o) => s + o.amount, 0);
  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter(o => o.status === 'Completed').length;
  const conversionRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="panel active">
      <PanelHeader
        title="Data Analytics & Reports"
        sub="Business performance · Revenue trends · SLA metrics"
        actions={
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 8, padding: 3 }}>
            {(['7d', '30d', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodAndSave(p)}
                style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 'var(--fs-xs)', cursor: 'pointer',
                  background: period === p ? 'var(--blue)' : 'var(--bg-2)',
                  color: period === p ? '#fff' : 'var(--text-2)',
                  fontWeight: period === p ? 'var(--fw-semibold)' : undefined,
                  transition: 'all 0.15s',
                }}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        }
      />

      <div className="panels">
        {/* KPI Row */}
        <div className="grid-4">
          {[
            { l: 'Total Revenue', v: `₹${totalRevenue.toLocaleString()}`, sub: 'vs previous period', color: 'var(--emerald)', icon: 'indian-rupee', cls: 'positive' },
            { l: 'Total Orders', v: String(totalOrders), sub: `${completedOrders} completed`, color: 'var(--blue)', icon: 'package', cls: 'info' },
            { l: 'Avg Order Value', v: `₹${avgOrderValue}`, sub: 'Per transaction', color: 'var(--violet)', icon: 'trending-up', cls: 'info' },
            { l: 'Completion Rate', v: `${conversionRate}%`, sub: 'SLA compliance', color: 'var(--amber)', icon: 'check-circle', cls: conversionRate > 80 ? 'positive' : 'warning' },
          ].map((k, i) => (
            <div key={i} className={`insight-card ${k.cls}`} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-medium)' }}>{k.l}</div>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${k.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={k.icon} size={14} style={{ color: k.color }} />
                </div>
              </div>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)', marginBottom: 4 }}>{k.v}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {executiveSummary ? (
          <Card
            title="Executive Command Read Model"
            sub={`Snapshot boundary: ${executiveSummary.latestSnapshot ? `v${executiveSummary.latestSnapshot.snapshotVersion}` : 'No snapshot captured yet'} · Read-only governance projection`}
            style={{ flexShrink: 0 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
              <div className="insight-card info" style={{ padding: 14 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Governed Workforce</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{executiveSummary.workforce?.active || 0}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{executiveSummary.workforce?.total || 0} total</div>
              </div>
              <div className="insight-card positive" style={{ padding: 14 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Branches / Franchises</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{executiveSummary.network?.total || 0}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{executiveSummary.network?.franchises || 0} franchise nodes</div>
              </div>
              <div className="insight-card warning" style={{ padding: 14 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Documents</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{executiveSummary.operations?.totalDocuments || 0}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Registry-backed</div>
              </div>
              <div className="insight-card info" style={{ padding: 14 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Conversations</div>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-semibold)' }}>{executiveSummary.operations?.totalConversations || 0}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Omnichannel memory</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginTop: 16 }}>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-1)', fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)' }}>
                  Department Ownership
                </div>
                {(executiveSummary.workforce?.byDepartment || []).map((department: any, index: number, rows: any[]) => (
                  <div key={department.departmentUuid} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: index < rows.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)' }}>{department.departmentName}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{department.activeWorkforce} active workforce</div>
                    </div>
                    <Badge type={department.workforceCount > 0 ? 'success' : 'neutral'}>{department.workforceCount}</Badge>
                  </div>
                ))}
              </div>

              <div style={{ border: '1px solid var(--border-1)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontWeight: 'var(--fw-semibold)' }}>Read Boundary</div>
                <div style={{ fontSize: 'var(--fs-sm)' }}>Executive dashboards read governed projections only.</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Predictive analytics: {executiveSummary.boundaries?.predictiveAnalytics || 'not_implemented'}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Scoring engine: {executiveSummary.boundaries?.scoringEngine || 'not_implemented'}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>AI runtime: {executiveSummary.boundaries?.aiRuntime || 'not_implemented'}</div>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Revenue Trend + Service Pie */}
        <div className="grid-65">
          <Card title="Revenue Trend" sub="Daily revenue & order volume">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#125696" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#125696" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 'var(--fs-xs)', fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#125696" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Service Mix" sub="Orders by category">
            <div className="chart-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {serviceBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={serviceBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {serviceBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} orders`, 'Count']} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 'var(--fs-xs)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: 'var(--text-3)', fontSize: 'var(--fs-sm)' }}>No order data yet</div>
              )}
            </div>
          </Card>
        </div>

        {/* SLA Compliance */}
        <Card title="SLA Compliance by Service" sub="Average processing time vs target" style={{ flexShrink: 0 }}>
          <div style={{ padding: '8px 0' }}>
            {SLA_DATA.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-sm)' }}>
                SLA data orders aane ke baad yahan dikhega
              </div>
            ) : SLA_DATA.map((s, i) => (
              <div key={i} style={{ padding: '10px 18px', borderBottom: i < SLA_DATA.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)' }}>{s.service}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>
                      Avg: {s.avgHours < 24 ? `${s.avgHours}h` : `${(s.avgHours / 24).toFixed(1)} days`}
                    </span>
                    <span style={{
                      fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', padding: '2px 8px', borderRadius: 20,
                      background: s.met >= 90 ? 'var(--emerald-dim)' : s.met >= 75 ? 'var(--amber-dim)' : 'var(--rose-dim)',
                      color: s.met >= 90 ? 'var(--emerald)' : s.met >= 75 ? 'var(--amber)' : 'var(--rose)',
                    }}>
                      {s.met}% SLA
                    </span>
                  </div>
                </div>
                <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${s.met}%`, height: '100%', borderRadius: 3,
                    background: s.met >= 90 ? 'var(--emerald)' : s.met >= 75 ? 'var(--amber)' : 'var(--rose)',
                    transition: 'width 0.8s var(--ease)',
                  }} />
                </div>
              </div>
            ))}
          </div>

        </Card>

        {/* Top Customers */}
        <div className="grid-2">
          <Card title="Top Customers by Revenue" sub="Lifetime value ranking">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {topCustomers.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < topCustomers.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', width: 20 }}>#{i + 1}</div>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: '#fff' }}>{c.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)' }}>{c.name}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{c.orders.length} orders · {c.tier}</div>
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--emerald)' }}>₹{c.totalSpent.toLocaleString()}</div>
                </div>
              ))}
              {topCustomers.length === 0 && (
                <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>No customer data</div>
              )}
            </div>
          </Card>

          <Card title="Order Status Breakdown" sub="Current pipeline health">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: 'Pending', count: allOrders.filter(o => o.status === 'Pending').length, fill: '#f59e0b' },
                  { name: 'Processing', count: allOrders.filter(o => o.status === 'Processing').length, fill: '#125696' },
                  { name: 'Completed', count: allOrders.filter(o => o.status === 'Completed').length, fill: '#16a34a' },
                  { name: 'Verified', count: allOrders.filter(o => o.status === 'Verified').length, fill: '#C9921A' },
                ]} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 'var(--fs-xs)', fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 'var(--fs-xs)', fill: 'var(--text-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {[
                      { fill: '#f59e0b' }, { fill: '#125696' }, { fill: '#16a34a' }, { fill: '#C9921A' }
                    ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
