import { useState, useEffect, type FormEvent } from 'react';
import { ShieldCheck, User, Lock, Eye, EyeOff, Radio } from 'lucide-react';
import { AppProvider } from './AppContext';
import { TopBar, Sidebar, RightPanel } from './Navigation';
import { DashboardPanel, WorkPanels } from './panels/DashWork';
import { OrdersCrmPanels } from './panels/OrdersCrm';
import { SystemPanels } from './panels/System';
import { SearchModal, useSearchShortcut } from './SearchModal';
import { AssignmentPanel } from './panels/AssignmentPanel';
import { StaffPanel } from './panels/StaffPanel';
import { CustomerDatabase } from './panels/CustomerDatabase';
import { EnterpriseDashboardPanels } from './panels/EnterpriseCommandCenter';
import { useApp } from './AppContext';
import { getCsrfToken, hasAdminSession, setStoredAdminToken } from './security/adminSession';
import { DashboardShell } from './layouts/DashboardShell';
import EmployeePortalPanel from './panels/EmployeePortalPanel';


// ─── Admin Login Screen ───────────────────────────────────────────────────────
const AdminLoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: 'error' | 'success' | '' }>({ msg: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId.trim() || !password) return;
    setLoading(true);
    setStatus({ msg: '', type: '' });
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ user_id: userId.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Login failed.');
      setStoredAdminToken(data.token);
      setStatus({ msg: 'Login successful! Opening admin console…', type: 'success' });
      setTimeout(onLogin, 400);
    } catch (err: any) {
      setStatus({ msg: err.message || 'Login failed. Check credentials.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-shell" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #f9fbfd 0%, #f5f7fb 48%, #ffffff 100%)',
      padding: 20, position: 'relative', overflow: 'hidden'
    }}>
      {/* Ambient background glow orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: 450, height: 450,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(18, 86, 150, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%', width: 450, height: 450,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(201, 146, 26, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div className="admin-login-card" style={{
        width: '100%', maxWidth: 440, position: 'relative', zIndex: 1,
        background: '#ffffff', borderRadius: 24, overflow: 'hidden',
        border: '1px solid rgba(18, 86, 150, 0.16)',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
      }}>
        {/* Header */}
        <div style={{
          padding: '36px 36px 24px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(18, 86, 150, 0.08)',
        }}>
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '8px 14px', borderRadius: 12, background: '#ffffff',
            border: '1px solid rgba(18, 86, 150, 0.16)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            marginBottom: 18, textDecoration: 'none'
          }}>
            <img src="/assets/logo-bisen-one-point.svg" alt="Bisen One Point" style={{ height: 34 }} />
          </a>

          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 12,
              background: 'rgba(201, 146, 26, 0.10)',
              border: '1px solid rgba(201, 146, 26, 0.28)',
              color: '#0d4275', fontSize: 11.5, fontWeight: 700,
              marginBottom: 12
            }}>
              <Radio size={13} color="#C9921A" /> Service OS · Authorized Admin
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0d4275', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Admin <span style={{ color: '#C9921A' }}>Console</span>
          </h2>
          <p style={{ fontSize: 13, color: '#52657d', margin: 0, lineHeight: 1.5 }}>
            Sign in to manage operations, services, and applications.
          </p>
        </div>

        {/* Form */}
        <form className="admin-login-form" onSubmit={handleSubmit} style={{ padding: '24px 36px 36px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#24364b', display: 'block', marginBottom: 6 }}>
              Admin User ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
              background: 'rgba(18, 86, 150, 0.03)',
              border: '1px solid rgba(18, 86, 150, 0.16)',
              borderRadius: 12, minHeight: 48,
              transition: 'all 0.2s ease'
            }}>
              <User size={18} color="#52657d" />
              <input
                type="text"
                placeholder="bisenasif0001"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#0f172a', fontWeight: 500 }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#24364b', display: 'block', marginBottom: 6 }}>
              Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
              background: 'rgba(18, 86, 150, 0.03)',
              border: '1px solid rgba(18, 86, 150, 0.16)',
              borderRadius: 12, minHeight: 48,
              transition: 'all 0.2s ease'
            }}>
              <Lock size={18} color="#52657d" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#0f172a', fontWeight: 500 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#52657d', padding: 0, display: 'flex', alignItems: 'center'
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {status.msg && (
            <div style={{
              padding: '11px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: status.type === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.10)',
              color: status.type === 'error' ? '#dc2626' : '#16a34a',
              border: `1px solid ${status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.25)'}`,
            }}>
              {status.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !userId.trim() || !password}
            style={{
              width: '100%', height: 48, borderRadius: 12,
              background: loading ? '#64748b' : 'linear-gradient(135deg, #125696 0%, #0d4275 100%)',
              color: '#ffffff', fontWeight: 700, fontSize: 14.5,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(18, 86, 150, 0.2)',
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck size={18} />
            {loading ? 'Verifying Credentials…' : 'Login to Admin Dashboard'}
          </button>

          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 12,
            background: 'rgba(18, 86, 150, 0.03)',
            border: '1px solid rgba(18, 86, 150, 0.14)',
            marginTop: 4
          }}>
            <ShieldCheck size={16} color="#125696" style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: '#52657d', lineHeight: 1.45 }}>
              This workspace is restricted to authorized operations staff. All authentication attempts are logged for security.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Inner app with context access ───────────────────────────────────────────
const AppInner = () => {
  const { activePanel, setActivePanel } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') === 'customer') {
      window.location.replace('/customer-account-overview.html');
    }
  }, []);

  const [adminAuthed, setAdminAuthed] = useState(() => hasAdminSession());

  // Poll: show login if token removed (logout) or JWT expired
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasAdminSession()) {
        setAdminAuthed(false);
        return;
      }
      if (!adminAuthed) setAdminAuthed(true);
    }, 10000); // check every 10s
    return () => clearInterval(interval);
  }, [adminAuthed]);

  // Ctrl+K / ⌘K shortcut
  useSearchShortcut(() => setSearchOpen(true));

  if (!adminAuthed) {
    return <AdminLoginScreen onLogin={() => setAdminAuthed(true)} />;
  }

  return (
    <>
      <a href="#main-content" className="skip-nav-link">Skip to Main Content</a>
      <h1 className="sr-only">One Point OS Dashboard</h1>
      <TopBar onSearchOpen={() => setSearchOpen(true)} />
      <DashboardShell
        sidebar={<Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />}
        workspace={
          <>
            {activePanel === 'home' ? <DashboardPanel setActivePanel={setActivePanel} /> : null}
            <WorkPanels activePanel={activePanel} />
            <OrdersCrmPanels activePanel={activePanel} />
            <SystemPanels activePanel={activePanel} />
            <EnterpriseDashboardPanels activePanel={activePanel} setActivePanel={setActivePanel} />

            {/* New Workflow Panels */}
            {activePanel === 'assignments'  && <AssignmentPanel />}
            {activePanel === 'staff'        && <StaffPanel />}
            {activePanel === 'customer-db'  && <CustomerDatabase />}
            {activePanel === 'employee-portal' && <EmployeePortalPanel />}

          </>
        }
        rightPanel={<RightPanel />}
      />

      {/* Global Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
