import React, { useState } from 'react';
import { Icon } from './Shared';
import { useApp } from './AppContext';

// ─── Top Bar ──────────────────────────────────────────────────────────────────
export const TopBar = ({ onSearchOpen }: { onSearchOpen: () => void }) => {
  const { role, setRole, activePanel, unreadCount, notifications, markAllRead, setActivePanel, backendSync, refreshBackend, customers } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const isCustomer = role === 'customer';
  const currentCustomer = customers[0];

  const handleRoleChange = (nextRole: any) => {
    setRole(nextRole);
    if (nextRole === 'customer') {
      setActivePanel('customer-home');
      return;
    }
    if (role === 'customer' || ['crm', 'orders', 'documents', 'support', 'whatsapp', 'customer-home', 'customer-apps', 'customer-docs', 'customer-payments', 'customer-support', 'customer-profile'].includes(activePanel)) {
      setActivePanel(nextRole === 'franchise' ? 'orders' : 'home');
    }
  };

  const syncLabel = backendSync.status === 'live'
    ? 'Website backend live'
    : backendSync.status === 'syncing'
      ? 'Syncing website'
      : backendSync.status === 'offline'
        ? 'Backend offline'
        : 'Demo data mode';
  const syncTitle = backendSync.lastSyncedAt
    ? `${backendSync.message} Last sync: ${new Date(backendSync.lastSyncedAt).toLocaleTimeString('en-IN')}`
    : backendSync.message;

  return (
    <div className="command-bar" style={{ position: 'relative' }}>
      <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setActivePanel(isCustomer ? 'customer-home' : 'home')}>
        <img src="../assets/logo-bisen-one-point.svg" alt="One Point" style={{ height: 28, width: 'auto', flexShrink: 0 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        {isCustomer ? (
          <div className="brand-name">One Point <span>Customer Portal</span></div>
        ) : (
          <div className="brand-name">One Point <span>Service OS</span></div>
        )}
      </div>
      <a className="icon-btn" href="../" title="Back to website">
        <Icon name="home" size={15} />
      </a>
      <div className="cmd-divider" />

      {/* Working Search Bar */}
      <div className="global-search" onClick={onSearchOpen} style={{ cursor: 'pointer' }}>
        <Icon name="search" size={14} className="text-gray-400" />
        <span style={{ color: 'var(--text-3)', flex: 1, fontSize: '12.5px' }}>
          {isCustomer ? 'Search my applications, documents, support...' : 'Search customers, orders, panels...'}
        </span>
        <span className="search-hint">Ctrl+K</span>
      </div>

      {!isCustomer && (
        <div className={`sys-status sys-status-${backendSync.status}`} title={syncTitle}>
          <div className="sys-dot" />
          {syncLabel}
        </div>
      )}

      <div className="cmd-right">
        {!isCustomer && (
          <button className="icon-btn" title="Sync website backend" onClick={refreshBackend}>
            <Icon name={backendSync.status === 'syncing' ? 'loader-2' : 'refresh-cw'} size={15} className={backendSync.status === 'syncing' ? 'spin' : ''} />
          </button>
        )}

        {isCustomer ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="role-switcher" title="Customer portal" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
              <Icon name="user-check" size={13} /> Customer Portal
            </span>
            <button
              className="btn btn-ghost btn-sm"
              title="Logout from customer portal"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--rose)', border: '1px solid var(--rose)', borderRadius: 6, padding: '4px 10px', fontSize: 'var(--fs-xs)' }}
              onClick={() => {
                localStorage.removeItem('opds_customer_session');
                handleRoleChange('operator');
              }}
            >
              <Icon name="log-out" size={13} /> Logout
            </button>
          </div>
        ) : (
          <select
            className="role-switcher"
            value={role}
            onChange={e => handleRoleChange(e.target.value)}
            title="Switch role"
          >
            <option value="admin">Global Admin</option>
            <option value="operator">Operator Viewer</option>
            <option value="franchise">Franchise Partner</option>
            <option value="support">Support Agent</option>
            <option value="customer">Customer Portal</option>
          </select>
        )}

        {!isCustomer && (
          <button className="icon-btn" title="AI Assistant" onClick={() => setActivePanel('ai-agents')}>
            <Icon name="sparkles" size={16} />
          </button>
        )}

        {isCustomer && (
          <span className="chip" style={{ background: 'var(--emerald-dim)', color: 'var(--emerald)', borderColor: 'var(--emerald-border)', padding: '4px 10px', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)' }}>
            {currentCustomer?.tier || 'Customer'} Customer
          </span>
        )}

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => { setNotifOpen(o => !o); }}
            title="Notifications"
          >
            <Icon name="bell" size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4, width: 8, height: 8,
                background: 'var(--rose)', borderRadius: '50%', border: '1.5px solid var(--bg-1)',
              }} />
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: 'absolute', top: 40, right: 0, width: 340,
              background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 12,
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 3000, overflow: 'hidden',
              animation: 'fadeIn 0.15s var(--ease)',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)' }}>Notifications {unreadCount > 0 && <span style={{ marginLeft: 6, fontSize: 'var(--fs-xs)', background: 'var(--rose)', color: '#fff', borderRadius: 10, padding: '1px 6px' }}>{unreadCount}</span>}</div>
                <button onClick={markAllRead} style={{ fontSize: 'var(--fs-xs)', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
              </div>
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>No notifications</div>
                ) : notifications.slice(0, 15).map((n, i) => (
                  <div
                    key={i}
                    onClick={() => { if (n.panelTarget) setActivePanel(n.panelTarget); setNotifOpen(false); }}
                    style={{
                      display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border-1)',
                      background: n.read ? 'transparent' : 'rgba(59,130,246,0.04)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(59,130,246,0.04)')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${n.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={n.icon} size={15} style={{ color: n.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', marginTop: 2 }}>{n.sub}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', marginTop: 2 }}>{n.time}</div>
                    </div>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, marginTop: 6 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* New Order Button */}
        {!isCustomer && (
          <button className="quick-create-btn" onClick={() => setActivePanel('orders')}>
            <Icon name="plus" size={14} /> New Order
          </button>
        )}

        {/* User Avatar */}
        <button className="user-btn" onClick={() => setActivePanel(isCustomer ? 'crm' : 'settings')} title={isCustomer ? 'Open my profile' : 'Open platform settings'}>
          <div className="user-avatar" style={{ background: isCustomer ? 'var(--blue)' : undefined }}>
            {isCustomer ? (currentCustomer?.initials || 'OP') : 'AS'}
          </div>
          <span className="user-name">{isCustomer ? (currentCustomer?.name || 'Customer') : 'Asif Bisen'}</span>
        </button>
      </div>

      {/* Click-outside to close notif */}
      {notifOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2999 }} onClick={() => setNotifOpen(false)} />
      )}
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export const Sidebar = ({ activePanel, setActivePanel }: any) => {
  const { role, customers } = useApp();

  const link = (id: string, icon: string, text: string, badge?: any) => (
    <button className={`nav-link ${activePanel === id ? 'active' : ''}`} onClick={() => setActivePanel(id)}>
      <Icon name={icon} className="ni" /> {text}
      {badge && <span className={`nav-badge ${badge.cls || ''}`}>{badge.num}</span>}
    </button>
  );

  // Role-based visibility
  const isAdmin = role === 'admin';
  const isOperator = role === 'admin' || role === 'operator';
  const isSupport = role === 'admin' || role === 'support';
  const isFranchise = role === 'franchise';
  const isCustomer = role === 'customer';

  if (isCustomer) {
    return (
      <aside className="sidebar" id="sidebar">
        <div className="nav-section">
          <div className="nav-section-label">My Account</div>
          {link('customer-home', 'home', 'Dashboard Home')}
          {link('customer-apps', 'package', 'My Applications', { num: customers[0]?.orders?.length || 0, cls: 'emerald' })}
          {link('customer-docs', 'folder', 'Documents Locker')}
          {link('customer-payments', 'credit-card', 'Payments & Receipts')}
        </div>
        <div className="nav-section">
          <div className="nav-section-label">Help & Support</div>
          {link('customer-support', 'life-buoy', 'Support Tickets')}
          {link('customer-profile', 'user', 'Profile & Settings')}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 10px 0' }}>
          <img src="../assets/logo-bisen-one-point.svg" alt="One Point" style={{ height: 20, opacity: 0.5 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span style={{ fontSize: 10, color: 'var(--text-4)', lineHeight: 1.3 }}>Bisen One Point<br/>Suvidha Kendra</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar" id="sidebar">
      <div className="nav-section">
        {link('home', 'layout-dashboard', 'Dashboard')}
      </div>

      {isOperator && (
        <div className="nav-section">
          <div className="nav-section-label">Operations Control</div>
          {link('kanban',      'git-commit',    'Order Pipeline', { num: 28, cls: 'amber' })}
          {link('assignments', 'user-check',    'Assignments', { num: 0, cls: 'rose' })}
          {link('documents',   'file-check-2',  'Verify Queue')}
          {link('orders',      'list-ordered',  'All Applications')}
          {link('tasks',       'check-square',  'Tasks & Follow-ups')}
        </div>
      )}

      <div className="nav-section">
        <div className="nav-section-label">Customer & Comms</div>
        {link('crm',         'users',          'CRM Profiles')}
        {link('customer-db', 'database',       'Customer Database')}
        {link('whatsapp', 'message-circle', 'WhatsApp Center', { num: 4, cls: 'emerald' })}
        {link('sms', 'smartphone', 'SMS Notifications')}
        {isSupport && link('support', 'life-buoy', 'Support Tickets')}
      </div>

      {isAdmin && (
        <div className="nav-section">
          <div className="nav-section-label">Business & Finance</div>
          {link('finance', 'indian-rupee', 'Payment Ledger')}
          {link('refunds', 'rotate-ccw', 'Refunds')}
          {link('franchise', 'store', 'Franchise Network')}
          {link('analytics', 'pie-chart', 'Data Analytics')}
          {link('digipay', 'wallet', 'DigiPay / AEPS')}
        </div>
      )}

      {isFranchise && (
        <div className="nav-section">
          <div className="nav-section-label">Franchise View</div>
          {link('orders', 'list-ordered', 'My Orders')}
          {link('finance', 'indian-rupee', 'My Wallet')}
        </div>
      )}

      {isAdmin && (
        <div className="nav-section">
          <div className="nav-section-label">System</div>
          {link('staff', 'user-cog', 'Staff Management')}
          {link('automation', 'zap', 'Rule Builder')}
          {link('ai-agents', 'bot', 'AI Employees / Agents')}
          {link('services', 'grid-3x3', 'Service Templates')}
          {link('onemart', 'shopping-cart', 'OneMart Store')}
          {link('settings', 'settings', 'Platform Settings')}
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 10px 0' }}>
        <img src="../assets/logo-bisen-one-point.svg" alt="One Point" style={{ height: 20, opacity: 0.5 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span style={{ fontSize: 10, color: 'var(--text-4)', lineHeight: 1.3 }}>Bisen One Point<br/>Suvidha Kendra</span>
      </div>
    </aside>
  );
};

// ─── Right Panel — Working AI Assistant & Customer Widgets ───────────────────
export const RightPanel = () => {
  const { role, livePayments, setActivePanel, addTask, addActivity, customers, allOrders } = useApp();
  const [aiInput, setAiInput] = useState('');
  const [aiResponses, setAiResponses] = useState<{ q: string; a: string }[]>([]);
  const isCustomer = role === 'customer';
  const currentCustomer = customers[0];
  const latestOrder = currentCustomer?.orders?.[0] || allOrders[0];
  const paidOrders = allOrders.filter(order => order.payStatus === 'Paid');
  const failedOrders = allOrders.filter(order => order.payStatus === 'Failed' || (order.payStatus === 'Pending' && order.status === 'Pending'));
  const pendingOrders = allOrders.filter(order => ['Pending', 'Verified'].includes(order.status));
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const customerWallet = 0;
  const loyaltyPoints = currentCustomer ? Math.round((currentCustomer.totalSpent || 0) / 100) * 10 : 0;
  const money = (amount: any) => `Rs. ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const processAIQuery = (query: string) => {
    const q = query.toLowerCase().trim();
    let answer = '';
    let panel = '';

    // Score-based intent matching — returns best match above threshold
    const score = (keywords: string[]) => keywords.filter(k => q.includes(k)).length;

    if (isCustomer) {
      const orders = currentCustomer?.orders || [];
      const docs = currentCustomer?.documents || [];
      const paidCustomerOrders = orders.filter(o => o.payStatus === 'Paid');
      const pendingCustomerOrders = orders.filter(o => ['Pending', 'Verified', 'Processing'].includes(o.status));

      // Direct order ID lookup (e.g. "OPDS-0001" or "opds")
      const orderIdMatch = query.match(/OPDS-[\w-]+/i) || q.match(/opds/i);
      if (orderIdMatch) {
        const orderId = String(orderIdMatch[0]).toUpperCase();
        const found = orders.find(o => o.id.toUpperCase().includes(orderId.replace('OPDS', 'OPDS')));
        if (found) {
          answer = `Order ${found.id} — ${found.service}\nStatus: ${found.status} | Payment: ${found.payStatus}\nAmount: ${money(found.amount)}\n${found.invoiceNo && found.invoiceNo !== 'N/A' ? `Invoice: ${found.invoiceNo}` : 'Invoice will be generated after completion.'}`;
          panel = 'customer-apps';
        } else {
          answer = `Order ID "${orderId}" not found in your profile. Check the order number and try again, or contact support.`;
          panel = 'customer-support';
        }
      }
      // Order / status / tracking
      else if (score(['order', 'status', 'track', 'kahan', 'application', 'apply', 'pan', 'aadhaar', 'service', 'baaki']) >= 1) {
        if (orders.length === 0) {
          answer = 'No applications are linked with your profile yet.\nStart a service request from the website and it will appear here automatically.';
          panel = 'customer-apps';
        } else if (pendingCustomerOrders.length > 0) {
          const latest = pendingCustomerOrders[0];
          answer = `${pendingCustomerOrders.length} application(s) in progress.\nLatest: ${latest.id} — ${latest.service}\nStatus: ${latest.status} | Payment: ${latest.payStatus} | ${money(latest.amount)}\nOpen My Applications to see the full timeline.`;
          panel = 'customer-apps';
        } else {
          answer = `All ${orders.length} application(s) completed.\nLatest: ${latestOrder?.id} — ${latestOrder?.service} — ${latestOrder?.status}.\n${money(latestOrder?.amount || 0)} paid.`;
          panel = 'customer-apps';
        }
      }
      // Documents / locker
      else if (score(['document', 'doc', 'locker', 'file', 'upload', 'passport', 'photo', 'certificate', 'drive']) >= 1) {
        answer = docs.length
          ? `${docs.length} document(s) in your Digital Locker.\nThey are linked to your service request and visible to the operator.\nOpen Documents Locker to view or add more.`
          : 'No documents uploaded yet.\nYou can upload files or share a Google Drive link from the service request form on the website.';
        panel = 'customer-docs';
      }
      // Payment / invoice / receipt
      else if (score(['payment', 'invoice', 'bill', 'receipt', 'paid', 'kitna', 'amount', 'paise', 'rupee', 'download']) >= 1) {
        if (paidCustomerOrders.length > 0) {
          const totalPaid = paidCustomerOrders.reduce((s, o) => s + o.amount, 0);
          const latest = paidCustomerOrders[0];
          answer = `${paidCustomerOrders.length} paid transaction(s). Total paid: ${money(totalPaid)}.\nLatest: ${latest.id} — ${latest.service} — ${money(latest.amount)}\nInvoice: ${latest.invoiceNo && latest.invoiceNo !== 'N/A' ? latest.invoiceNo : 'pending until completion'}.\nOpen Payments & Receipts to download.`;
          panel = 'customer-payments';
        } else {
          answer = latestOrder
            ? `Latest order ${latestOrder.id} — ${latestOrder.service}\nPayment status: ${latestOrder.payStatus}. Amount: ${money(latestOrder.amount)}.\nInvoice will be generated after payment confirmation.`
            : 'No payment records found. Complete a service request to see payment history.';
          panel = 'customer-payments';
        }
      }
      // Support / help / complaint
      else if (score(['help', 'support', 'ticket', 'complaint', 'problem', 'issue', 'call', 'contact', 'whatsapp']) >= 1) {
        answer = 'For support, you can:\n① Open a Support Ticket from the Help & Support section\n② WhatsApp: 9473946181 (Asif Bisen, CSC Expert)\n③ Call: +91 94739 46181\nResponse time: usually within 2 hours during working hours.';
        panel = 'customer-support';
      }
      // Wallet / points / rewards
      else if (score(['wallet', 'balance', 'point', 'reward', 'cashback', 'loyalty']) >= 1) {
        answer = `Loyalty Points: ${loyaltyPoints} pts (earned from ${money(currentCustomer?.totalSpent || 0)} total spend).\nWallet top-up feature is coming soon.\nPoints can be redeemed for discounts on future service bookings.`;
        panel = 'customer-payments';
      }
      // Greeting / general
      else if (score(['hello', 'hi', 'namaste', 'hey', 'helo', 'kya', 'help me']) >= 1) {
        answer = `Namaste! Main aapki madad kar sakta hoon:\n• Order / application status check\n• Documents locker details\n• Payment & invoice download\n• Support ticket raise karna\n• Service request track karna\n\nKya poochna chahte hain?`;
      }
      // Fallback
      else {
        const suggestions = ['Track my order', 'Show my documents', 'Latest payment', 'Contact support'];
        answer = `Mujhe samajh nahi aaya. Aap yeh pooch sakte hain:\n${suggestions.map(s => `• "${s}"`).join('\n')}\n\nYa apna order number type karein (jaise: OPDS-0001).`;
      }

    } else {
      // ── Admin intelligence ──────────────────────────────────────────────────
      const completedOrders = allOrders.filter(o => o.status === 'Completed');
      const topServices = (() => {
        const counts: Record<string, number> = {};
        allOrders.forEach(o => { counts[o.service] = (counts[o.service] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      })();
      const premiumCustomers = customers.filter(c => c.tier === 'Premium');

      // Direct task creation command
      if (score(['add task', 'create task', 'task banao', 'task add', 'new task']) >= 1 ||
          (score(['task', 'banao', 'create', 'add']) >= 2)) {
        const title = query.replace(/add task|create task|task banao|task add|new task/i, '').trim() || 'New Task';
        addTask({ title, sub: 'Created via AI Assistant', priority: 'Medium', type: 'warning', owner: 'AS', dueDate: '' });
        addActivity({ text: `Task created: "${title}"`, color: 'var(--violet)', bg: 'var(--violet-dim)', icon: 'sparkles' });
        answer = `Task "${title}" created and added to your queue.\nOpen Tasks & Follow-ups to assign priority and due date.`;
        panel = 'tasks';
      }
      // Revenue / money / finance
      else if (score(['revenue', 'earning', 'income', 'money', 'kitna', 'kamaya', 'profit', 'total']) >= 1) {
        const avgOrder = paidOrders.length ? totalRevenue / paidOrders.length : 0;
        answer = `Revenue Summary:\n• Total collected: ${money(totalRevenue)}\n• Paid orders: ${paidOrders.length} | Failed/pending: ${failedOrders.length}\n• Average order value: ${money(avgOrder)}\n• Completion rate: ${allOrders.length ? ((completedOrders.length / allOrders.length) * 100).toFixed(0) : 0}%\n\nTop services: ${topServices.map(([s, n]) => `${s} (${n})`).join(', ') || 'none yet'}.`;
        panel = 'finance';
      }
      // Failed payments
      else if (score(['fail', 'failed', 'unsuccessful', 'bounced', 'decline', 'problem payment']) >= 1) {
        if (failedOrders.length) {
          answer = `${failedOrders.length} failed/unpaid order(s):\n${failedOrders.slice(0, 3).map(o => `• ${o.id} — ${o.service} — ${o.customer?.name || 'Customer'} — ${money(o.amount)}`).join('\n')}${failedOrders.length > 3 ? `\n…and ${failedOrders.length - 3} more.` : ''}\nOpen Payment Ledger to investigate.`;
        } else {
          answer = 'No failed payments in the current dataset.';
        }
        panel = 'finance';
      }
      // Pending / verify / queue
      else if (score(['pending', 'verify', 'queue', 'waiting', 'baaki', 'incomplete', 'check']) >= 1) {
        const docsReady = customers.filter(c => (c.documents || []).length > 0).length;
        answer = `Verification Queue:\n• Pending orders: ${pendingOrders.length}\n• Processing: ${allOrders.filter(o => o.status === 'Processing').length}\n• Customers with documents uploaded: ${docsReady}\n• Completed today: ${completedOrders.length}\n\nOpen Verify Queue to process applications.`;
        panel = 'documents';
      }
      // Customer / CRM search
      else if (score(['customer', 'client', 'crm', 'profile', 'user', 'who', 'kon', 'dhundo', 'search', 'premium']) >= 1) {
        // Try to find a customer by name in the query
        const matchedCustomer = customers.find(c => q.includes(c.name.toLowerCase().split(' ')[0]));
        if (matchedCustomer) {
          answer = `Found: ${matchedCustomer.name}\nPhone: ${matchedCustomer.phone} | Tier: ${matchedCustomer.tier}\nOrders: ${matchedCustomer.orders.length} | Total spent: ${money(matchedCustomer.totalSpent)}\nCity: ${matchedCustomer.city} | Joined: ${matchedCustomer.joined}`;
          panel = 'crm';
        } else {
          answer = `CRM Overview:\n• Total customers: ${customers.length}\n• Premium: ${premiumCustomers.length} | Standard: ${customers.filter(c => c.tier === 'Standard').length} | New: ${customers.filter(c => c.tier === 'New').length}\n• Highest spender: ${customers.sort((a, b) => b.totalSpent - a.totalSpent)[0]?.name || 'N/A'} (${money(customers.sort((a, b) => b.totalSpent - a.totalSpent)[0]?.totalSpent || 0)})\n\nOpen CRM Profiles to search by name or phone.`;
          panel = 'crm';
        }
      }
      // WhatsApp / SMS / message
      else if (score(['whatsapp', 'sms', 'message', 'notify', 'send', 'follow']) >= 1) {
        answer = `WhatsApp & SMS Center:\n• ${customers.length} customers in CRM\n• Live payment feed: ${livePayments.length} recent transactions\n\nYou can send bulk notifications or respond to individual customers from WhatsApp Center.`;
        panel = 'whatsapp';
      }
      // Analytics / report / GST
      else if (score(['analytics', 'report', 'gst', 'chart', 'graph', 'data', 'stats', 'summary']) >= 1) {
        const gstCount = allOrders.filter(o => o.service.toLowerCase().includes('gst')).length;
        answer = `Analytics Snapshot:\n• Total orders: ${allOrders.length} | Revenue: ${money(totalRevenue)}\n• GST-related orders: ${gstCount}\n• Top service: ${topServices[0]?.[0] || 'none'} (${topServices[0]?.[1] || 0} orders)\n• Customer growth: ${customers.length} profiles\n\nOpen Data Analytics for visual charts.`;
        panel = 'analytics';
      }
      // Order search by ID
      else if (q.match(/opds-[\w-]+/i) || (score(['order', 'id', 'find', 'dhundo']) >= 2)) {
        const idMatch = query.match(/OPDS-[\w-]+/i);
        if (idMatch) {
          const found = allOrders.find(o => o.id.toUpperCase() === idMatch[0].toUpperCase());
          if (found) {
            answer = `Order ${found.id} — ${found.service}\nCustomer: ${found.customer?.name || 'N/A'} | Status: ${found.status}\nPayment: ${found.payStatus} | Amount: ${money(found.amount)}\nDate: ${found.date}`;
            panel = 'orders';
          } else {
            answer = `Order "${idMatch[0]}" not found in current dataset. It may be from a backend sync that hasn't loaded yet.`;
            panel = 'orders';
          }
        } else {
          answer = `Current orders: ${allOrders.length} total.\n${pendingOrders.length} pending | ${completedOrders.length} completed | ${failedOrders.length} failed.\nType an order ID like "OPDS-0001" to look up a specific order.`;
          panel = 'orders';
        }
      }
      // Greeting
      else if (score(['hello', 'hi', 'namaste', 'hey', 'kya hal', 'sup']) >= 1) {
        answer = `Namaste! Main aapka Business Intelligence Assistant hoon.\n\nMain help kar sakta hoon:\n• Revenue & payment summary\n• Pending verification queue\n• Customer CRM lookup\n• Failed payment report\n• Analytics snapshot\n• Task create karna\n\nKya poochna hai?`;
      }
      // Fallback with suggestions based on actual data
      else {
        const suggestions = [];
        if (pendingOrders.length) suggestions.push(`"${pendingOrders.length} pending orders — verify karo"`);
        if (failedOrders.length) suggestions.push(`"Failed payments dikhao"`);
        if (totalRevenue) suggestions.push(`"Revenue kitna hai?"`);
        suggestions.push('"Customer dhundo: [naam]"');
        suggestions.push('"Add task: [kaam ka naam]"');
        answer = `Yeh query samajh nahi aaya.\n\nTry karein:\n${suggestions.slice(0, 4).map(s => `• ${s}`).join('\n')}`;
      }
    }

    if (panel) setActivePanel(panel);
    setAiResponses(prev => [{ q: query, a: answer }, ...prev.slice(0, 4)]);
    setAiInput('');
  };

  if (isCustomer) {
    return (
      <aside className="right-panel" style={{ background: 'var(--bg-1)', borderLeft: '1px solid var(--border-1)' }}>
        {/* Customer Wallet & Rewards */}
        <div className="rp-section" style={{ borderBottom: '1px solid var(--border-1)', paddingBottom: 20 }}>
          <div className="rp-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-1)' }}>
            <Icon name="wallet" size={15} style={{ color: 'var(--blue)' }} /> My Wallet & Rewards
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Wallet Balance</span>
              <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--emerald)' }}>{money(customerWallet)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>CSC Loyalty Points</span>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--amber)' }}>{loyaltyPoints} Pts</span>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', opacity: 0.6 }} disabled title="Coming soon">
              <Icon name="clock" size={14} /> Top-up coming soon
            </button>
          </div>
        </div>

        {/* Dedicated CSC Expert / RM */}
        <div className="rp-section" style={{ borderBottom: '1px solid var(--border-1)', paddingBottom: 20 }}>
          <div className="rp-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-1)' }}>
            <Icon name="shield-check" size={15} style={{ color: 'var(--emerald)' }} /> Dedicated CSC Expert
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 12, padding: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="cust-avatar" style={{ background: 'var(--blue)', width: 40, height: 40, fontSize: 'var(--fs-base)' }}>AS</div>
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>Asif Bisen</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Senior CSC Expert & RM</div>
              </div>
            </div>
            <div style={{ background: 'var(--bg-3)', padding: '8px 12px', borderRadius: 8, border: '1px dashed var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>Fast Support PIN:</span>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--blue)' }}>#8841</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-xs" style={{ flex: 1, justifyContent: 'center', border: '1px solid var(--border-1)' }} onClick={() => { window.location.href = 'tel:+919473946181'; }}>
                <Icon name="phone" size={12} /> Call
              </button>
              <button className="btn btn-primary btn-xs" style={{ flex: 1, justifyContent: 'center', background: 'var(--emerald)', borderColor: 'var(--emerald)' }} onClick={() => setActivePanel('whatsapp')}>
                <Icon name="message-circle" size={12} /> WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Customer AI Assistant */}
        <div className="rp-section" style={{ flex: 1 }}>
          <div className="rp-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-1)' }}>
            <Icon name="bot" size={15} style={{ color: 'var(--violet)' }} /> Kabir AI Assistant
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: 12 }}>
            Instant help with your applications, documents, or government schemes.
          </div>

          {/* Quick Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {['Order status', 'My documents', 'Payment & invoice'].map(q => (
              <button
                key={q}
                className="btn btn-ghost btn-xs text-left"
                style={{ justifyContent: 'flex-start', fontSize: 'var(--fs-xs)', background: 'var(--bg-2)', border: '1px solid var(--border-1)', padding: '8px 12px', borderRadius: 8, height: 'auto' }}
                onClick={() => processAIQuery(q)}
              >
                <Icon name="sparkles" size={12} style={{ color: 'var(--violet)', flexShrink: 0 }} /> {q}
              </button>
            ))}
          </div>

          {/* Responses */}
          {aiResponses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', marginBottom: 8 }}>
              {aiResponses.map((r, i) => (
                <div key={i} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 10, padding: 12, fontSize: 'var(--fs-xs)' }}>
                  <div style={{ color: 'var(--text-3)', marginBottom: 6, fontStyle: 'italic' }}>"{r.q}"</div>
                  <div style={{ color: 'var(--text-1)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{r.a}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Input */}
        <div className="ai-prompt-bar">
          <input
            className="ai-input"
            placeholder="Ask Kabir AI…"
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && aiInput.trim() && processAIQuery(aiInput)}
          />
          <button
            className="ai-send"
            onClick={() => aiInput.trim() && processAIQuery(aiInput)}
            disabled={!aiInput.trim()}
          >
            <Icon name="send" size={14} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="right-panel">
      {/* Live Payments */}
      <div className="rp-section">
        <div className="rp-label">Live Payments</div>
        <div className="live-feed">
          {livePayments.slice(0, 4).map((p, i) => (
            <div className="live-item" key={i}>
              <div className="live-dot" style={{ background: p.color }} />
              <div className="live-text">{p.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Assistant */}
      <div className="rp-section" style={{ flex: 1 }}>
        <div className="rp-label">AI Assistant</div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: 8 }}>Ask anything about your business</div>

        {/* Quick Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
          {['Revenue kitna hai?', 'Pending verifications', 'Failed payments'].map(q => (
            <button
              key={q}
              className="btn btn-ghost btn-xs text-left"
              style={{ justifyContent: 'flex-start', fontSize: 'var(--fs-xs)' }}
              onClick={() => processAIQuery(q)}
            >
              <Icon name="zap" size={11} style={{ color: 'var(--amber)', flexShrink: 0 }} /> {q}
            </button>
          ))}
        </div>

        {/* Responses */}
        {aiResponses.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
            {aiResponses.map((r, i) => (
              <div key={i} style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 8, padding: 10, fontSize: 'var(--fs-xs)' }}>
                <div style={{ color: 'var(--text-3)', marginBottom: 4, fontStyle: 'italic' }}>"{r.q}"</div>
                <div style={{ color: 'var(--text-1)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{r.a}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Input */}
      <div className="ai-prompt-bar">
        <input
          className="ai-input"
          placeholder="Ask AI assistant…"
          value={aiInput}
          onChange={e => setAiInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && aiInput.trim() && processAIQuery(aiInput)}
        />
        <button
          className="ai-send"
          onClick={() => aiInput.trim() && processAIQuery(aiInput)}
          disabled={!aiInput.trim()}
        >
          <Icon name="send" size={14} />
        </button>
      </div>
    </aside>
  );
};
