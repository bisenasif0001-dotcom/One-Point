import React, { useState } from 'react';
import { Icon } from './Shared';
import { useApp } from './AppContext';

// ─── Color Picker Options ─────────────────────────────────────────────────────
const AVATAR_COLORS = ['#125696', '#C9921A', '#16a34a', '#f59e0b', '#dc2626', '#0284c7'];

// ─────────────────────────────────────────────────────────────────────────────
// Add Customer Modal
// ─────────────────────────────────────────────────────────────────────────────
export const AddCustomerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addCustomer } = useApp();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', city: '',
    tier: 'New', color: AVATAR_COLORS[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name zaroori hai';
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone)) e.phone = '10-digit mobile number daalein';
    if (!form.city.trim()) e.city = 'City zaroori hai';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const initials = form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const id = `cust_${form.phone}`;
    addCustomer({
      id, initials, verified: false,
      joined: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      totalSpent: 0,
      ...form,
    });
    onClose();
  };

  const Field = ({ label, field, type = 'text', placeholder }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>{label}</label>
      <input
        type={type}
        className="form-input"
        placeholder={placeholder}
        value={(form as any)[field]}
        onChange={e => { setForm(prev => ({ ...prev, [field]: e.target.value })); setErrors(prev => ({ ...prev, [field]: '' })); }}
      />
      {errors[field] && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--rose)' }}>{errors[field]}</span>}
    </div>
  );

  return (
    <div className="modal-overlay" style={{ justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-1)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-xl)', width: 480, overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.2s var(--ease)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: '#fff' }}>
              {form.name ? form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'NA'}
            </div>
            <div>
              <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>Add New Customer</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>CRM mein naya customer add karein</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {/* Form */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Full Name *" field="name" placeholder="e.g. Rahul Kumar" />
          <Field label="Mobile Number *" field="phone" placeholder="10-digit number" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Email" field="email" type="email" placeholder="email@domain.com" />
            <Field label="City *" field="city" placeholder="e.g. Lucknow, UP" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Customer Tier</label>
              <select className="form-input" value={form.tier} onChange={e => setForm(prev => ({ ...prev, tier: e.target.value }))}>
                <option>New</option>
                <option>Standard</option>
                <option>Premium</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Avatar Color</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(prev => ({ ...prev, color: c }))}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                      outline: form.color === c ? `2px solid white` : 'none',
                      outlineOffset: 2, cursor: 'pointer',
                      transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-2)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <Icon name="user-plus" size={14} /> Add Customer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Add Task Modal
// ─────────────────────────────────────────────────────────────────────────────
export const AddTaskModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addTask, customers } = useApp();
  const [form, setForm] = useState({
    title: '', sub: '', priority: 'Medium', owner: 'AS', dueDate: '', type: 'warning',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const priorityToType: Record<string, string> = {
    High: 'danger', Medium: 'warning', Standard: 'info',
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Task title zaroori hai';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    addTask({
      title: form.title,
      sub: form.sub || 'No description',
      priority: form.priority,
      type: priorityToType[form.priority] || 'info',
      owner: form.owner,
      dueDate: form.dueDate,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-1)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-xl)', width: 460, overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.2s var(--ease)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check-square" size={18} style={{ color: 'var(--blue)' }} />
            </div>
            <div>
              <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>New Task</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Task board mein add karein</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {/* Form */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Task Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Verify Aadhaar docs for customer"
              value={form.title}
              onChange={e => { setForm(prev => ({ ...prev, title: e.target.value })); setErrors({}); }}
              autoFocus
            />
            {errors.title && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--rose)' }}>{errors.title}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Description / Sub-task</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Short description ya linked order ID..."
              value={form.sub}
              onChange={e => setForm(prev => ({ ...prev, sub: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Priority</label>
              <select className="form-input" value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}>
                <option>High</option>
                <option>Medium</option>
                <option>Standard</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Assignee</label>
              <select className="form-input" value={form.owner} onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}>
                <option value="AS">Asif Bisen (AS)</option>
                <option value="OP">Operator-2 (OP)</option>
                <option value="AI">Kabir AI (EMP-AI-108)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-2)' }}>Due Date</label>
            <input
              type="date"
              className="form-input"
              value={form.dueDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-2)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <Icon name="plus" size={14} /> Create Task
          </button>
        </div>
      </div>
    </div>
  );
};
