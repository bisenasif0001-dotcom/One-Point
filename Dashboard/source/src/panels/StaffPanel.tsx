import { useEffect, useState } from 'react';
import { PanelHeader, Card, Icon, Badge } from '../Shared';
import { getCsrfToken, getStoredAdminToken } from '../security/adminSession';

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
  admin: 'var(--rose)',
  agent: 'var(--blue)',
  verifier: 'var(--violet)',
  support: 'var(--emerald)',
};

const WORKFORCE_TYPES = ['Human', 'AI Employee', 'Hybrid', 'System'];
const LIFECYCLE_OPTIONS = ['Draft', 'Active', 'Suspended', 'Inactive', 'Archived'];
const EXPERIENCE_OPTIONS = ['Beginner', 'Intermediate', 'Senior', 'Lead'];
const AVAILABILITY_OPTIONS = ['Available', 'Busy', 'On Leave', 'Unavailable'];

const listToText = (value: any) => Array.isArray(value) ? value.join(', ') : '';
const textToList = (value: string) => Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));
const adminHeaders = () => ({ 'X-Admin-Token': getStoredAdminToken(), 'Content-Type': 'application/json' });
const adminWriteHeaders = async () => ({ ...adminHeaders(), 'X-CSRF-Token': await getCsrfToken() });

const GovernanceRow = ({ label, value }: any) => (
  <div>
    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>{value || 'Not set'}</div>
  </div>
);

const ChipList = ({ items, tone = 'var(--blue)' }: any) => {
  if (!items?.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {items.map((item: string) => (
        <span
          key={item}
          style={{
            fontSize: 'var(--fs-xs)',
            padding: '2px 8px',
            borderRadius: 999,
            background: `${tone}14`,
            color: tone,
            border: `1px solid ${tone}25`,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
};

const StaffCard = ({ staff, onEdit, onToggle }: any) => (
  <div
    style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border-1)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      opacity: staff.is_active ? 1 : 0.55,
    }}
  >
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          flexShrink: 0,
          background: ROLE_COLORS[staff.role] || 'var(--blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--fs-sm)',
          fontWeight: 'var(--fw-semibold)',
          color: '#fff',
        }}
      >
        {staff.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>{staff.name}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>{staff.phone}</div>
        {staff.email ? <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>{staff.email}</div> : null}
        {staff.workforceUuid ? (
          <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: 4 }}>
            UUID: {staff.workforceUuid}
          </div>
        ) : null}
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

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        padding: '10px 12px',
        background: 'var(--bg-3)',
        borderRadius: 8,
        border: '1px solid var(--border-2)',
        fontSize: 'var(--fs-xs)',
      }}
    >
      <div><span style={{ color: 'var(--text-3)' }}>Assigned: </span><strong>{staff.assignedTasks ?? 0}</strong></div>
      <div><span style={{ color: 'var(--text-3)' }}>Pending: </span><strong>{staff.pendingTasks ?? staff.currentLoad}</strong></div>
      <div><span style={{ color: 'var(--text-3)' }}>Completion: </span><strong style={{ color: 'var(--emerald)' }}>{staff.completionRate ?? '0%'}</strong></div>
      <div><span style={{ color: 'var(--text-3)' }}>Avg SLA: </span><strong style={{ color: 'var(--blue)' }}>{staff.avgProcessingTime ?? 'N/A'}</strong></div>
    </div>

    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span
        style={{
          fontSize: 'var(--fs-xs)',
          fontWeight: 'var(--fw-semibold)',
          padding: '2px 8px',
          borderRadius: 20,
          background: `${ROLE_COLORS[staff.role] || 'var(--blue)'}22`,
          color: ROLE_COLORS[staff.role] || 'var(--blue)',
          textTransform: 'capitalize',
        }}
      >
        {staff.role}
      </span>
      <Badge type="info">{staff.workforceType || 'Human'}</Badge>
      <Badge type={staff.lifecycleStatus === 'Active' ? 'success' : staff.lifecycleStatus === 'Inactive' ? 'neutral' : 'warning'}>
        {staff.lifecycleStatus || 'Active'}
      </Badge>
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>
        Max tasks: <strong style={{ color: 'var(--text-1)' }}>{staff.max_tasks}</strong>
      </span>
      <span
        style={{
          fontSize: 'var(--fs-xs)',
          fontWeight: 'var(--fw-semibold)',
          padding: '2px 8px',
          borderRadius: 20,
          marginLeft: 'auto',
          background: staff.available ? 'var(--emerald-dim)' : 'var(--rose-dim)',
          color: staff.available ? 'var(--emerald)' : 'var(--rose)',
        }}
      >
        {staff.available ? `${staff.currentLoad}/${staff.max_tasks} Available` : 'Full'}
      </span>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        padding: '12px 14px',
        border: '1px solid var(--border-1)',
        borderRadius: 10,
        background: 'var(--bg-2)',
      }}
    >
      <GovernanceRow label="Primary Department" value={staff.primaryDepartmentName} />
      <GovernanceRow label="Branch" value={staff.branchName || 'Unassigned'} />
      <GovernanceRow label="Experience" value={staff.experienceLevel} />
      <GovernanceRow label="Availability" value={staff.availabilityStatus} />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ChipList items={staff.skills} tone="var(--blue)" />
      <ChipList items={staff.certifications} tone="var(--violet)" />
      <ChipList items={staff.languages} tone="var(--emerald)" />
      <ChipList items={staff.supportedServices} tone="var(--amber)" />
    </div>
  </div>
);

const StaffForm = ({ initial, departments, branches, onSave, onCancel }: any) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    role: initial?.role || 'agent',
    maxTasks: initial?.max_tasks || 10,
    skills: initial?.skills || [],
    workforceType: initial?.workforceType || 'Human',
    primaryDepartmentUuid: initial?.primaryDepartmentUuid || departments?.[0]?.departmentUuid || '',
    branchUuid: initial?.branchUuid || '',
    lifecycleStatus: initial?.lifecycleStatus || (initial?.is_active ? 'Active' : 'Inactive'),
    experienceLevel: initial?.experienceLevel || 'Intermediate',
    availabilityStatus: initial?.availabilityStatus || 'Available',
    certificationsText: listToText(initial?.certifications),
    supportedServicesText: listToText(initial?.supportedServices),
    languagesText: listToText(initial?.languages),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.primaryDepartmentUuid && departments?.length) {
      setForm((prev) => ({ ...prev, primaryDepartmentUuid: departments[0].departmentUuid }));
    }
  }, [departments, form.primaryDepartmentUuid]);

  const toggleSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s: string) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.primaryDepartmentUuid) return;
    setSaving(true);
    await onSave({
      ...form,
      certifications: textToList(form.certificationsText),
      supportedServices: textToList(form.supportedServicesText),
      languages: textToList(form.languagesText),
    }, initial?.id);
    setSaving(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border-2)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>{initial ? 'Edit Workforce Member' : 'Add Workforce Member'}</div>
          <button className="btn-icon-sm" onClick={onCancel}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Full Name *</label>
              <input className="input" placeholder="Ramesh Kumar" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Phone *</label>
              <input className="input" placeholder="9876543210" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Email</label>
              <input className="input" type="email" placeholder="staff@bisenonepoint.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                <option value="agent">Agent</option>
                <option value="verifier">Verifier</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Workforce Type</label>
              <select className="input" value={form.workforceType} onChange={(e) => setForm((p) => ({ ...p, workforceType: e.target.value }))}>
                {WORKFORCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Lifecycle</label>
              <select className="input" value={form.lifecycleStatus} onChange={(e) => setForm((p) => ({ ...p, lifecycleStatus: e.target.value }))}>
                {LIFECYCLE_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Max Tasks</label>
              <input className="input" type="number" min={1} max={50} value={form.maxTasks} onChange={(e) => setForm((p) => ({ ...p, maxTasks: Number(e.target.value) }))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Primary Department *</label>
              <select className="input" value={form.primaryDepartmentUuid} onChange={(e) => setForm((p) => ({ ...p, primaryDepartmentUuid: e.target.value }))}>
                {departments.map((department: any) => (
                  <option key={department.departmentUuid} value={department.departmentUuid}>{department.departmentName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Branch / Franchise</label>
              <select className="input" value={form.branchUuid} onChange={(e) => setForm((p) => ({ ...p, branchUuid: e.target.value }))}>
                <option value="">Not linked</option>
                {branches.map((branch: any) => (
                  <option key={branch.branchUuid} value={branch.branchUuid}>{branch.branchName} ({branch.branchType})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Experience Level</label>
              <select className="input" value={form.experienceLevel} onChange={(e) => setForm((p) => ({ ...p, experienceLevel: e.target.value }))}>
                {EXPERIENCE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Availability Status</label>
              <select className="input" value={form.availabilityStatus} onChange={(e) => setForm((p) => ({ ...p, availabilityStatus: e.target.value }))}>
                {AVAILABILITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 8, display: 'block' }}>
              Service Skills ({form.skills.length} selected)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SERVICE_SKILLS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  style={{
                    fontSize: 'var(--fs-xs)',
                    padding: '4px 10px',
                    borderRadius: 20,
                    cursor: 'pointer',
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Certifications</label>
              <input className="input" placeholder="NSDC, GST Expert" value={form.certificationsText} onChange={(e) => setForm((p) => ({ ...p, certificationsText: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Supported Services</label>
              <input className="input" placeholder="PAN, Passport, GST" value={form.supportedServicesText} onChange={(e) => setForm((p) => ({ ...p, supportedServicesText: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 6, display: 'block' }}>Languages</label>
              <input className="input" placeholder="Hindi, English" value={form.languagesText} onChange={(e) => setForm((p) => ({ ...p, languagesText: e.target.value }))} />
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-1)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: 'var(--blue)', color: '#fff', border: 'none', opacity: (!form.name || !form.phone || !form.primaryDepartmentUuid || saving) ? 0.5 : 1 }}
            disabled={!form.name || !form.phone || !form.primaryDepartmentUuid || saving}
            onClick={handleSave}
          >
            {saving ? <><Icon name="loader-2" size={13} className="spin" /> Saving...</> : (initial ? 'Save Changes' : 'Add Workforce Member')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StaffPanel = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const headers = adminHeaders();
      const [staffRes, departmentsRes, branchesRes] = await Promise.all([
        fetch('/api/admin/staff', { headers }),
        fetch('/api/admin/departments', { headers }),
        fetch('/api/admin/branches', { headers }),
      ]);
      if (staffRes.ok) setStaff((await staffRes.json()).staff || []);
      if (departmentsRes.ok) setDepartments((await departmentsRes.json()).departments || []);
      if (branchesRes.ok) setBranches((await branchesRes.json()).branches || []);
    } catch {
      // Keep current state on transient errors.
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: any, existingId?: number) {
    const method = existingId ? 'PATCH' : 'POST';
    const url = existingId ? `/api/admin/staff/${existingId}` : '/api/admin/staff';
    await fetch(url, { method, headers: await adminWriteHeaders(), body: JSON.stringify(form) });
    setShowForm(false);
    setEditTarget(null);
    await load();
  }

  async function handleToggle(record: any) {
    const nextLifecycle = record.is_active ? 'Inactive' : 'Active';
    await fetch(`/api/admin/staff/${record.id}`, {
      method: 'PATCH',
      headers: await adminWriteHeaders(),
      body: JSON.stringify({ isActive: !record.is_active, lifecycleStatus: nextLifecycle }),
    });
    await load();
  }

  const active = staff.filter((item) => item.is_active);
  const inactive = staff.filter((item) => !item.is_active);

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', overflowY: 'auto' }}>
      
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
        background: '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 8px', borderRadius: 6 }}>
              Workforce & Operator Command
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>
            Staff, Operators & Verification Officers
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
            {active.length} Active Operators · {staff.filter((item) => item.available).length} Ready for Verification · Governed CSC Workforce
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={load}
            style={{ borderRadius: 10, fontWeight: 600 }}
          >
            <Icon name={loading ? 'loader-2' : 'refresh-cw'} size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ background: 'var(--blue)', borderColor: 'var(--blue)', borderRadius: 10, fontWeight: 600 }}
            onClick={() => { setEditTarget(null); setShowForm(true); }}
          >
            <Icon name="plus" size={14} /> Add Operator / Staff
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase' }}>Total Workforce</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>{staff.length}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>{departments.length} Operational Departments</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--emerald)', textTransform: 'uppercase' }}>Active On Duty</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--emerald)', marginTop: 4 }}>{active.length}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>{staff.filter(s => s.available).length} currently available</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase' }}>Branches & Desks</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>{branches.length}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Mapped physical & digital counters</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(8, 47, 97, 0.08)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--violet)', textTransform: 'uppercase' }}>AI & Hybrid Agents</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--violet)', marginTop: 4 }}>
            {staff.filter(s => s.workforceType === 'AI Employee' || s.workforceType === 'Hybrid').length}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>Automated verification bots</div>
        </div>
      </div>

      {/* Staff Cards Body */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)', background: '#ffffff', borderRadius: 16 }}>
          <Icon name="loader-2" size={28} className="spin" style={{ marginBottom: 12 }} />
          <div>Loading workforce registry…</div>
        </div>
      ) : staff.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid rgba(8, 47, 97, 0.08)' }}>
          <Icon name="users" size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text-1)' }}>No Operators Registered</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
            Add your first operator or verification officer to start distributing applications.
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={14} /> Add First Operator
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {active.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Operators & Staff ({active.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {active.map((item) => (
                  <StaffCard key={item.id} staff={item} onEdit={(value: any) => { setEditTarget(value); setShowForm(true); }} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Inactive / Suspended Operators ({inactive.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {inactive.map((item) => (
                  <StaffCard key={item.id} staff={item} onEdit={(value: any) => { setEditTarget(value); setShowForm(true); }} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <StaffForm
          initial={editTarget}
          departments={departments}
          branches={branches}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
};
