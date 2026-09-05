import { useState, useEffect} from 'react';
import { PanelHeader, Card, Icon} from '../Shared';
import { adminTokenHeader} from '../security/adminSession';

const money = (v: any) => `₹${Number(v / 100 || 0).toLocaleString('en-IN')}`;

const priorityColor: Record<string, string> = {
  critical: 'var(--rose)',
  high:     'var(--amber)',
  normal:   'var(--blue)',
  low:      'var(--text-3)',
};

const priorityBg: Record<string, string> = {
  critical: 'var(--rose-dim)',
  high:     'var(--amber-dim)',
  normal:   'var(--blue-dim)',
  low:      'var(--bg-2)',
};

const statusColor: Record<string, string> = {
  assigned:  'var(--amber)',
  accepted:  'var(--blue)',
  working:   'var(--violet)',
  done:      'var(--emerald)',
  cancelled: 'var(--rose)',
};

const AssignmentCard = ({ a, staff, onUpdate }: any) => {
  const [updating, setUpdating] = useState(false);

  const nextStatus: Record<string, string> = {
    assigned: 'accepted',
    accepted: 'working',
    working:  'done',
  };

  const nextLabel: Record<string, string> = {
    assigned: 'Accept Task',
    accepted: 'Start Working',
    working:  'Mark Complete',
  };

  const handleUpdate = async (newStatus: string) => {
    setUpdating(true);
    await onUpdate(a.id, newStatus);
    setUpdating(false);
  };

  const staffMember = staff.find((s: any) => s.id === a.staff_id);

  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 12,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
      borderLeft: `3px solid ${priorityColor[a.priority] || 'var(--blue)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', padding: '2px 8px', borderRadius: 20,
              background: priorityBg[a.priority], color: priorityColor[a.priority],
              textTransform: 'uppercase', letterSpacing: 1,
            }}>{a.priority}</span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{a.order_id}</span>
          </div>
          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{a.customer_name}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>
            {a.customer_phone} • {a.order_type} • {money(a.total_paise)}
          </div>
        </div>
        <div style={{
          fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
          background: `${statusColor[a.status]}22`, color: statusColor[a.status],
        }}>
          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: '#fff', flexShrink: 0 }}>
          {(staffMember?.name || a.staff_name || 'S').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)' }}>{a.staff_name}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{a.staff_phone} • {a.staff_role}</div>
        </div>
      </div>

      {a.notes && (
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', padding: '6px 8px', background: 'var(--bg-2)', borderRadius: 6 }}>
          {a.notes}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>
          Assigned {new Date(a.assigned_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
        {nextStatus[a.status] && (
          <button
            className="btn btn-sm"
            style={{ background: priorityColor[a.priority], color: '#fff', border: 'none', opacity: updating ? 0.6 : 1 }}
            disabled={updating}
            onClick={() => handleUpdate(nextStatus[a.status])}
          >
            {updating ? <Icon name="loader-2" size={13} className="spin" /> : null}
            {nextLabel[a.status]}
          </button>
        )}
      </div>
    </div>
  );
};

const IncomingQueueCard = ({ order, staff, onAssign }: any) => {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedStaff) return;
    setAssigning(true);
    await onAssign(order.order_id, Number(selectedStaff));
    setAssigning(false);
  };

  const availableStaff = staff.filter((s: any) => s.available);

  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--amber-border)', borderRadius: 12,
      padding: 16, borderLeft: '3px solid var(--amber)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--amber)', textTransform: 'uppercase', marginBottom: 4 }}>Needs Assignment</div>
          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{order.customer_name || 'Customer'}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>{order.order_id} • {money(order.total_paise)}</div>
        </div>
        <Icon name="alert-circle" size={20} style={{ color: 'var(--amber)' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <select
          className="input"
          style={{ flex: 1, fontSize: 'var(--fs-xs)', height: 34 }}
          value={selectedStaff}
          onChange={e => setSelectedStaff(e.target.value)}
        >
          <option value="">Select Agent...</option>
          {availableStaff.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.currentLoad}/{s.max_tasks} tasks)
            </option>
          ))}
        </select>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--amber)', color: '#fff', border: 'none', whiteSpace: 'nowrap', opacity: (!selectedStaff || assigning) ? 0.5 : 1 }}
          disabled={!selectedStaff || assigning}
          onClick={handleAssign}
        >
          {assigning ? <Icon name="loader-2" size={13} className="spin" /> : 'Assign'}
        </button>
      </div>
    </div>
  );
};

const StaffLoadBar = ({ staff }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10 }}>
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: staff.available ? 'var(--emerald)' : 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: '#fff', flexShrink: 0 }}>
      {staff.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{staff.name}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>{staff.currentLoad}/{staff.max_tasks}</div>
      </div>
      <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${Math.min(100, (staff.currentLoad / staff.max_tasks) * 100)}%`,
          background: staff.currentLoad >= staff.max_tasks ? 'var(--rose)' : staff.currentLoad >= staff.max_tasks * 0.8 ? 'var(--amber)' : 'var(--emerald)',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', padding: '2px 8px', borderRadius: 20, flexShrink: 0,
      background: staff.available ? 'var(--emerald-dim)' : 'var(--rose-dim)',
      color: staff.available ? 'var(--emerald)' : 'var(--rose)',
    }}>
      {staff.available ? 'Available' : 'Full'}
    </div>
  </div>
);

export const AssignmentPanel = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [filter, setFilter] = useState('active'); // 'active' | 'done' | 'all'
  const [loading, setLoading] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const headers = { ...adminTokenHeader(), 'Content-Type': 'application/json' };

  async function load() {
    setLoading(true);
    try {
      const [aRes, qRes, sRes] = await Promise.all([
        fetch('/api/admin/assignments', { headers }),
        fetch('/api/admin/assignments/queue', { headers }),
        fetch('/api/admin/staff', { headers }),
      ]);
      if (aRes.ok) setAssignments((await aRes.json()).assignments || []);
      if (qRes.ok) setQueue((await qRes.json()).queue || []);
      if (sRes.ok) setStaff((await sRes.json()).staff || []);
    } catch { /* offline */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleUpdateStatus(assignmentId: number, status: string) {
    await fetch(`/api/admin/assignments/${assignmentId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function handleManualAssign(orderId: string, staffId: number) {
    await fetch('/api/admin/assignments', {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId, staffId, priority: 'normal' }),
    });
    await load();
  }

  async function handleAutoAssignAll() {
    setAutoAssigning(true);
    for (const order of queue) {
      await fetch('/api/bot/check', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId: order.order_id }),
      });
    }
    await load();
    setAutoAssigning(false);
  }

  const filtered = assignments.filter(a => {
    if (filter === 'active') return ['assigned', 'accepted', 'working'].includes(a.status);
    if (filter === 'done')   return ['done', 'cancelled'].includes(a.status);
    return true;
  });

  const activeCount = assignments.filter(a => ['assigned', 'accepted', 'working'].includes(a.status)).length;
  const doneCount   = assignments.filter(a => a.status === 'done').length;

  return (
    <div className="panel-container">
      <PanelHeader
        title="Assignment Control"
        sub={`${activeCount} active • ${queue.length} waiting • ${staff.filter((s: any) => s.available).length} staff available`}
        icon="user-check"
      >
        <button
          className="btn btn-sm"
          style={{ background: 'var(--amber)', color: '#fff', border: 'none', opacity: autoAssigning ? 0.6 : 1 }}
          disabled={autoAssigning || queue.length === 0}
          onClick={handleAutoAssignAll}
        >
          {autoAssigning ? <Icon name="loader-2" size={13} className="spin" /> : <Icon name="zap" size={13} />}
          Auto-Assign All ({queue.length})
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <Icon name={loading ? 'loader-2' : 'refresh-cw'} size={13} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </PanelHeader>

      <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start', padding: '14px 20px 100px 20px', overflowY: 'auto' }}>

        {/* Left: Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Incoming Queue */}
          {queue.length > 0 && (
            <Card>
              <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="inbox" size={16} style={{ color: 'var(--amber)' }} />
                Incoming Queue — Needs Human Assignment
                <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)', background: 'var(--amber-dim)', color: 'var(--amber)', borderRadius: 20, padding: '2px 8px', fontWeight: 'var(--fw-semibold)' }}>
                  {queue.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {queue.map((order: any) => (
                  <IncomingQueueCard key={order.id} order={order} staff={staff} onAssign={handleManualAssign} />
                ))}
              </div>
            </Card>
          )}

          {/* Active Assignments */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', flex: 1 }}>Assignments</div>
              {[
                { id: 'active', label: `Active (${activeCount})` },
                { id: 'done',   label: `Done (${doneCount})` },
                { id: 'all',    label: 'All' },
              ].map(f => (
                <button
                  key={f.id}
                  className="btn btn-sm"
                  style={{
                    background: filter === f.id ? 'var(--blue)' : 'var(--bg-2)',
                    color: filter === f.id ? '#fff' : 'var(--text-2)',
                    border: '1px solid var(--border-1)',
                  }}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon name="loader-2" size={24} className="spin" style={{ marginBottom: 8 }} />
                <div>Loading assignments...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon name="check-circle" size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontWeight: 'var(--fw-semibold)' }}>No assignments here</div>
                <div style={{ fontSize: 'var(--fs-xs)', marginTop: 4 }}>
                  {filter === 'active' ? 'All tasks are completed or no active assignments.' : 'Nothing to show.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {filtered.map((a: any) => (
                  <AssignmentCard key={a.id} a={a} staff={staff} onUpdate={handleUpdateStatus} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Staff Load */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="users" size={16} style={{ color: 'var(--blue)' }} />
              Staff Load
            </div>
            {staff.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
                No staff added yet. Go to Staff Panel to add agents.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {staff.map((s: any) => (
                  <StaffLoadBar key={s.id} staff={s} />
                ))}
              </div>
            )}
          </Card>

          <Card style={{ padding: '14px 16px' }}>
            <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 12 }}>Summary</div>
            {[
              { label: 'Total Assignments', value: assignments.length, color: 'var(--blue)' },
              { label: 'Active', value: activeCount, color: 'var(--amber)' },
              { label: 'Completed', value: doneCount, color: 'var(--emerald)' },
              { label: 'Waiting Queue', value: queue.length, color: 'var(--rose)' },
              { label: 'Available Staff', value: staff.filter((s: any) => s.available).length, color: 'var(--emerald)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{item.label}</span>
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: item.color }}>{item.value}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
      {/* Bottom spacer for clean scrolling */}
      <div style={{ height: 60, flexShrink: 0 }} />
    </div>
  );
};
