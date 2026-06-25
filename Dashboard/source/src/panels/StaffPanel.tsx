import React, { useState, useEffect } from 'react';
import { PanelHeader, Card, Badge, Icon } from '../Shared';

const SERVICE_SKILLS = [
  'Pan Card', 'Passport', 'Voter ID', 'Aadhaar', 'Ayushman Card',
  'Income Certificate', 'Domicile Certificate', 'Caste Certificate',
  'Birth Certificate', 'Police Verification',
  'GST Registration', 'MSME/Udyam', 'Digital Signature', 'FSSAI',
  'Trademark', 'Company Registration',
  'Typing', 'Scanning', 'Printing', 'Affidavit',
  'CCC Exam', 'Scholarship', 'University',
  'Design Services', 'Logo', 'Banner',
  'Mobile Recharge', 'Electricity Bill', 'Train Ticket', 'Bus Ticket',
];

const ROLE_COLORS: Record<string, string> = {
  admin:    'var(--rose)',
  agent:    'var(--blue)',
  verifier: 'var(--violet)',
  support:  'var(--emerald)',
};

const StaffCard = ({ staff, onEdit, onToggle, onDelete }: any) => (
  <div style={{
    background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 12,
    padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    opacity: staff.is_active ? 1 : 0.55,
  }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: ROLE_COLORS[staff.role] || 'var(--blue)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: '#fff',
      }}>
        {staff.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{staff.name}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>{staff.phone}</div>
        {staff.email && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>{staff.email}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon-sm" title="Edit" onClick={() => onEdit(staff)}>
          <Icon name="edit-2" size={13} />
        </button>
        <button className="btn-icon-sm" title={staff.is_active ? 'Deactivate' : 'Activate'} onClick={() => onToggle(staff)}>
          <Icon name={staff.is_active ? 'pause-circle' : 'play-circle'} size={13} style={{ color: staff.is_active ? 'var(--amber)' : 'var(--emerald)' }} />
        </button>
      </div>
    </div>

    {/* Operator Metrics Grid */}
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 8,
      border: '1px solid var(--border-2)', fontSize: 'var(--fs-xs)'
    }}>
      <div>
        <span style={{ color: 'var(--text-3)' }}>Assigned: </span>
        <strong style={{ color: 'var(--text-1)' }}>{staff.assignedTasks ?? 0}</strong>
      </div>
      <div>
        <span style={{ color: 'var(--text-3)' }}>Pending: </span>
        <strong style={{ color: 'var(--text-1)' }}>{staff.pendingTasks ?? staff.currentLoad}</strong>
      </div>
      <div>
        <span style={{ color: 'var(--text-3)' }}>Completion: </span>
        <strong style={{ color: 'var(--emerald)' }}>{staff.completionRate ?? '94%'}</strong>
      </div>
      <div>
        <span style={{ color: 'var(--text-3)' }}>Avg SLA: </span>
        <strong style={{ color: 'var(--blue)' }}>{staff.avgProcessingTime ?? '2.2 hrs'}</strong>
      </div>
    </div>

    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{
        fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', padding: '2px 8px', borderRadius: 20,
        background: `${ROLE_COLORS[staff.role] || 'var(--blue)'}22`,
        color: ROLE_COLORS[staff.role] || 'var(--blue)',
        textTransform: 'capitalize',
      }}>{staff.role}</span>

      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>
        Max tasks: <strong style={{ color: 'var(--text-1)' }}>{staff.max_tasks}</strong>
      </span>

      <span style={{
        fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', padding: '2px 8px', borderRadius: 20, marginLeft: 'auto',
        background: staff.available ? 'var(--emerald-dim)' : 'var(--rose-dim)',
        color: staff.available ? 'var(--emerald)' : 'var(--rose)',
      }}>
        {staff.available ? `${staff.currentLoad}/${staff.max_tasks} Available` : 'Full'}
      </span>
    </div>

    {staff.skills && staff.skills.length > 0 && (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {staff.skills.slice(0, 5).map((skill: string) => (
          <span key={skill} style={{
            fontSize: 'var(--fs-xs)', padding: '2px 7px', borderRadius: 20,
            background: 'var(--bg-3)', color: 'var(--text-2)',
            border: '1px solid var(--border-1)',
          }}>{skill}</span>
        ))}
        {staff.skills.length > 5 && (
          <span style={{ fontSize: 'var(--fs-xs)', padding: '2px 7px', color: 'var(--text-3)' }}>+{staff.skills.length - 5} more</span>
        )}
      </div>
    )}
  </div>
);

const StaffForm = ({ initial, onSave, onCancel }: any) => {
  const [form, setForm] = useState({
    name:     initial?.name     || '',
    phone:    initial?.phone    || '',
    email:    initial?.email    || '',
    role:     initial?.role     || 'agent',
    maxTasks: initial?.max_tasks || 10,
    skills:   initial?.skills   || [],
    isActive: initial?.is_active !== undefined ? Boolean(initial.is_active) : true,
  });
  const [saving, setSaving] = useState(false);

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s: string) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    await onSave(form, initial?.id);
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 16,
        width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>{initial ? 'Edit Staff' : 'Add New Staff'}</div>
          <button className="btn-icon-sm" onClick={onCancel}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Full Name *</label>
              <input className="input" placeholder="Ramesh Kumar" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Phone *</label>
              <input className="input" placeholder="9876543210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Email (Optional)</label>
            <input className="input" type="email" placeholder="staff@bisenonepoint.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Role</label>
              <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="agent">Agent</option>
                <option value="verifier">Verifier</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Max Tasks</label>
              <input className="input" type="number" min={1} max={50} value={form.maxTasks} onChange={e => setForm(p => ({ ...p, maxTasks: Number(e.target.value) }))} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 8, display: 'block' }}>
              Service Skills ({form.skills.length} selected)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SERVICE_SKILLS.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  style={{
                    fontSize: 'var(--fs-xs)', padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: form.skills.includes(skill) ? 'var(--blue)' : 'var(--border-1)',
                    background: form.skills.includes(skill) ? 'var(--blue-dim)' : 'var(--bg-2)',
                    color: form.skills.includes(skill) ? 'var(--blue)' : 'var(--text-3)',
                    transition: 'all 0.1s',
                  }}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-1)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: 'var(--blue)', color: '#fff', border: 'none', opacity: (!form.name || !form.phone || saving) ? 0.5 : 1 }}
            disabled={!form.name || !form.phone || saving}
            onClick={handleSave}
          >
            {saving ? <><Icon name="loader-2" size={13} className="spin" /> Saving...</> : (initial ? 'Save Changes' : 'Add Staff')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StaffPanel = () => {
  const token = localStorage.getItem('opds_admin_token') || '';
  const headers = { 'X-Admin-Token': token, 'Content-Type': 'application/json' };

  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff', { headers });
      if (res.ok) setStaff((await res.json()).staff || []);
    } catch { /* offline */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: any, existingId?: number) {
    const method = existingId ? 'PATCH' : 'POST';
    const url = existingId ? `/api/admin/staff/${existingId}` : '/api/admin/staff';
    await fetch(url, { method, headers, body: JSON.stringify(form) });
    setShowForm(false);
    setEditTarget(null);
    await load();
  }

  async function handleToggle(s: any) {
    await fetch(`/api/admin/staff/${s.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ isActive: !s.is_active }),
    });
    await load();
  }

  async function handleDelete(s: any) {
    if (!window.confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    await fetch(`/api/admin/staff/${s.id}`, { method: 'DELETE', headers });
    await load();
  }

  const active   = staff.filter(s => s.is_active);
  const inactive = staff.filter(s => !s.is_active);

  return (
    <div className="panel-container">
      <PanelHeader title="Staff Management" sub={`${active.length} active agents • ${staff.filter(s => s.available).length} available now`} icon="users">
        <button className="btn btn-sm" style={{ background: 'var(--blue)', color: '#fff', border: 'none' }} onClick={() => { setEditTarget(null); setShowForm(true); }}>
          <Icon name="plus" size={13} /> Add Staff
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <Icon name={loading ? 'loader-2' : 'refresh-cw'} size={13} className={loading ? 'spin' : ''} />
        </button>
      </PanelHeader>

      <div className="panel-body">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon name="loader-2" size={28} className="spin" style={{ marginBottom: 12 }} />
            <div>Loading staff...</div>
          </div>
        ) : staff.length === 0 ? (
          <Card style={{ padding: 48, textAlign: 'center' }}>
            <Icon name="user-plus" size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)', marginBottom: 8 }}>No Staff Added</div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', marginBottom: 20 }}>
              Add your agents and operators to enable auto-assignment.
            </div>
            <button className="btn" style={{ background: 'var(--blue)', color: '#fff', border: 'none' }} onClick={() => setShowForm(true)}>
              <Icon name="plus" size={14} /> Add First Staff Member
            </button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {active.length > 0 && (
              <div>
                <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 12, color: 'var(--text-2)' }}>Active Staff ({active.length})</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {active.map(s => (
                    <StaffCard key={s.id} staff={s} onEdit={s => { setEditTarget(s); setShowForm(true); }} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
            {inactive.length > 0 && (
              <div>
                <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', marginBottom: 12, color: 'var(--text-3)' }}>Inactive ({inactive.length})</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {inactive.map(s => (
                    <StaffCard key={s.id} staff={s} onEdit={s => { setEditTarget(s); setShowForm(true); }} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <StaffForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
};
