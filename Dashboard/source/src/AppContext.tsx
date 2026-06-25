import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CUSTOMERS as INIT_CUSTOMERS,
  TASKS as INIT_TASKS,
  ACTIVITIES as INIT_ACTIVITIES,
  WORKFLOW_RULES as INIT_RULES,
  NOTIFS as INIT_NOTIFS,
  LIVE_PAYMENTS as INIT_PAYMENTS,
} from './data';

// ─── Types ───────────────────────────────────────────────────────────────────
export type Customer = {
  id: string; name: string; phone: string; initials: string; color: string;
  email: string; city: string; joined: string; verified: boolean; tier: string;
  totalSpent: number;
  orders: Order[];
  documents?: any[];
};

export type Order = {
  id: string; service: string; category: string; amount: number;
  status: string; payStatus: string; gateway: string; date: string;
  invoiceNo?: string; notes?: string; attachments?: any;
  customer?: any;
};

export type Task = {
  id: string; title: string; sub: string; priority: string;
  type: string; owner: string; dueDate: string; status: string;
  comments?: Comment[];
};

export type Comment = {
  id: string; author: string; initials: string; text: string; time: string;
};

export type Activity = {
  text: string; time: string; color: string; bg: string; icon: string;
};

export type WorkflowRule = {
  name: string; trigger: string; action: string; active: boolean;
};

export type Notification = {
  title: string; sub: string; time: string; color: string; icon: string;
  panelTarget?: string; read?: boolean;
};

export type LivePayment = {
  text: string; time: string; color: string;
};

export type AppRole = 'admin' | 'operator' | 'franchise' | 'support' | 'customer';
export type BackendSyncStatus = 'demo' | 'syncing' | 'live' | 'offline';

export type BackendSync = {
  status: BackendSyncStatus;
  source: string;
  message: string;
  lastSyncedAt?: string;
};

// ─── Context Shape ────────────────────────────────────────────────────────────
interface AppContextType {
  // State
  customers: Customer[];
  tasks: Task[];
  activities: Activity[];
  workflowRules: WorkflowRule[];
  notifications: Notification[];
  livePayments: LivePayment[];
  activePanel: string;
  role: AppRole;
  backendSync: BackendSync;

  // Computed
  allOrders: Order[];
  unreadCount: number;

  // Actions — Customers
  addCustomer: (c: Omit<Customer, 'orders' | 'documents'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;

  // Actions — Orders
  addOrder: (customerId: string, order: Omit<Order, 'customer'>) => void;
  updateOrderStatus: (orderId: string, status: string, paymentStatus?: string) => Promise<void>;

  // Actions — Tasks
  addTask: (t: Omit<Task, 'id' | 'status' | 'comments'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  // Actions — Activity Feed
  addActivity: (a: Omit<Activity, 'time'>) => void;

  // Actions — Workflow
  setWorkflowRules: (rules: WorkflowRule[]) => void;
  toggleRule: (index: number) => void;

  // Actions — Notifications
  addNotification: (n: Omit<Notification, 'read'>) => void;
  markAllRead: () => void;

  // Actions — Navigation
  setActivePanel: (panel: string) => void;
  setRole: (r: AppRole) => void;
  refreshBackend: () => Promise<void>;

  // Actions — Automation Engine
  triggerEvent: (event: string, payload: Record<string, any>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── localStorage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = 'opds_dashboard_state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSavedState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveState(state: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const LIVE_COLORS = ['#125696', '#C9921A', '#16a34a', '#f59e0b', '#dc2626', '#0284c7'];
const TRACKABLE_DEMO_ORDER = {
  id: 'OPDS-20260604-000002',
  service: 'Ayushman',
  category: 'E-Services',
  amount: 199,
  status: 'Completed',
  payStatus: 'Paid',
  gateway: 'Razorpay',
  date: '2026-06-04',
};

function normalizeSavedState(state: any) {
  if (!state || !Array.isArray(state.customers)) return state;
  return {
    ...state,
    customers: state.customers.map((customer: any) => ({
      ...customer,
      orders: Array.isArray(customer.orders)
        ? customer.orders.map((order: any) => order?.id === 'OPDS-0001' ? { ...order, ...TRACKABLE_DEMO_ORDER } : order)
        : customer.orders,
    })),
  };
}

function getUrlParams() {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

function getInitialPanel(savedPanel?: string) {
  const params = getUrlParams();
  const panel = params.get('panel');
  const portal = params.get('portal');
  if (portal === 'customer' && !panel) return 'crm';
  return panel || savedPanel || 'home';
}

function getInitialRole(savedRole?: AppRole): AppRole {
  const params = getUrlParams();
  const role = params.get('role') as AppRole | null;
  const portal = params.get('portal');
  if (role && ['admin', 'operator', 'franchise', 'support', 'customer'].includes(role)) return role;
  if (portal === 'customer') return 'customer';
  if (portal === 'admin') return 'admin';
  return savedRole || 'admin';
}

function titleCaseStatus(status: any, fallback = 'Pending') {
  const value = String(status || '').toLowerCase();
  const map: Record<string, string> = {
    created: 'Pending',
    pending: 'Pending',
    paid: 'Completed',
    captured: 'Completed',
    verified: 'Verified',
    processing: 'Processing',
    out_for_delivery: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled',
    failed: 'Pending',
  };
  return map[value] || fallback;
}

function paymentStatus(status: any) {
  const value = String(status || '').toLowerCase();
  if (value === 'paid' || value === 'captured') return 'Paid';
  if (value === 'failed') return 'Failed';
  return 'Pending';
}

function backendOrderStatus(status: string) {
  const map: Record<string, string> = {
    Pending: 'pending',
    Verified: 'verified',
    Processing: 'processing',
    Completed: 'completed',
    Cancelled: 'cancelled',
  };
  return map[status] || status.toLowerCase().replace(/\s+/g, '_');
}

function backendPaymentStatus(status?: string) {
  if (!status) return '';
  const map: Record<string, string> = {
    Paid: 'captured',
    Pending: 'created',
    Failed: 'failed',
  };
  return map[status] || status.toLowerCase();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'O').toUpperCase() + (parts[1]?.[0] || 'P').toUpperCase();
}

function stableId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || `customer${Date.now()}`;
}

function formatDate(value: any) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function itemNames(order: any) {
  const items = Array.isArray(order.items) ? order.items : [];
  const names = items.map((item: any) => item.name || item.slug).filter(Boolean);
  return names.length ? names.join(', ') : order.orderType === 'service' ? 'Service Booking' : 'Store Order';
}

function mapApiOrder(order: any, index = 0): Order {
  const payment = order.payment || {};
  return {
    id: String(order.orderId || order.id || `WEB-${index + 1}`),
    service: itemNames(order),
    category: order.orderType === 'service' ? 'E-Services' : 'OneMart Store',
    amount: Number(order.total ?? order.amount ?? 0),
    status: titleCaseStatus(order.status),
    payStatus: paymentStatus(payment.status || order.paymentStatus),
    gateway: String(payment.gateway || order.gateway || 'razorpay'),
    date: formatDate(order.createdAt),
    invoiceNo: order.invoiceNo,
    notes: order.notes || '',
    attachments: order.attachments || {},
  };
}

function orderDocuments(order: any) {
  const attachments = order.attachments || {};
  const files = Array.isArray(attachments.files) ? attachments.files : [];
  const docs = files.map((file: any, index: number) => ({
    id: `${order.orderId || order.id}-file-${index}`,
    title: file.name || `Document ${index + 1}`,
    type: file.type || 'FILE',
    format: String(file.name || '').split('.').pop()?.toUpperCase() || 'FILE',
    size: file.size ? `${Math.max(1, Math.round(Number(file.size) / 1024))} KB` : 'Pending upload',
    uploadedAt: formatDate(order.createdAt),
    extractedText: `Linked with order ${order.orderId || order.id}\nStatus: Pending operator review`,
  }));

  if (attachments.driveLink) {
    docs.push({
      id: `${order.orderId || order.id}-drive`,
      title: 'Shared Google Drive Link',
      type: 'DRIVE',
      format: 'LINK',
      size: 'Shared folder',
      uploadedAt: formatDate(order.createdAt),
      extractedText: `Drive link: ${attachments.driveLink}\nLinked with order ${order.orderId || order.id}`,
    });
  }

  return docs;
}

function mapWebsiteOrdersToCustomers(orders: any[]): Customer[] {
  const grouped = new Map<string, Customer>();

  orders.forEach((order, index) => {
    const rawCustomer = order.customer || {};
    const name = String(rawCustomer.name || 'Website Customer');
    const phone = String(rawCustomer.phone || 'N/A');
    const email = String(rawCustomer.email || '');
    const key = stableId(phone !== 'N/A' ? phone : email || name);

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        name,
        phone,
        initials: initials(name),
        color: LIVE_COLORS[grouped.size % LIVE_COLORS.length],
        email: email || 'not-provided@bisenonepoint.com',
        city: rawCustomer.address || 'Website order',
        joined: formatDate(order.createdAt),
        verified: false,
        tier: 'New',
        totalSpent: 0,
        orders: [],
        documents: [],
      });
    }

    const customer = grouped.get(key)!;
    const mappedOrder = mapApiOrder(order, index);

    customer.orders.push(mappedOrder);
    customer.totalSpent += mappedOrder.amount;
    customer.verified = customer.verified || mappedOrder.payStatus === 'Paid';
    customer.joined = customer.joined < mappedOrder.date ? customer.joined : mappedOrder.date;
    customer.documents = [...(customer.documents || []), ...orderDocuments(order)];
  });

  return Array.from(grouped.values()).map(customer => ({
    ...customer,
    tier: customer.totalSpent >= 2000 ? 'Premium' : customer.orders.length > 1 ? 'Standard' : 'New',
  }));
}

function mapCustomerDashboardToCustomers(data: any): Customer[] {
  const rawCustomer = data?.customer || {};
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const name = String(rawCustomer.name || 'Customer');
  const phone = String(rawCustomer.phone || getUrlParams().get('phone') || 'N/A');
  const email = String(rawCustomer.email || '');
  const customer: Customer = {
    id: stableId(phone !== 'N/A' ? phone : email || name),
    name,
    phone,
    initials: initials(name),
    color: LIVE_COLORS[0],
    email: email || 'not-provided@bisenonepoint.com',
    city: rawCustomer.address || 'Address not provided',
    joined: orders[orders.length - 1]?.createdAt ? formatDate(orders[orders.length - 1].createdAt) : formatDate(new Date()),
    verified: false,
    tier: 'New',
    totalSpent: 0,
    orders: [],
    documents: [],
  };

  customer.orders = orders.map(mapApiOrder);
  customer.totalSpent = customer.orders.reduce((sum, order) => sum + order.amount, 0);
  customer.verified = customer.orders.some(order => order.payStatus === 'Paid');
  customer.tier = customer.totalSpent >= 2000 ? 'Premium' : customer.orders.length > 1 ? 'Standard' : 'New';
  customer.documents = orders.flatMap(orderDocuments);
  return [customer];
}

function mapWebsiteOrdersToActivities(orders: any[]): Activity[] {
  return orders.slice(0, 12).map((order: any) => ({
    text: `Website order ${order.orderId || 'created'} - ${itemNames(order)}`,
    time: 'live sync',
    color: 'var(--blue)',
    bg: 'var(--blue-dim)',
    icon: order.orderType === 'service' ? 'layers' : 'shopping-bag',
  }));
}

function mapWebsiteOrdersToPayments(orders: any[]): LivePayment[] {
  return orders
    .filter((order: any) => order.payment)
    .slice(0, 6)
    .map((order: any) => ({
      text: `Rs. ${Number(order.total ?? order.amount ?? 0).toLocaleString('en-IN')} - ${itemNames(order)} - ${order.customer?.name || 'Customer'}`,
      time: 'live',
      color: paymentStatus(order.payment?.status) === 'Paid' ? 'var(--emerald)' : 'var(--amber)',
    }));
}

// ─── Helper: generate order ID ────────────────────────────────────────────────
let orderSeq = 100;
function nextOrderId() {
  return `OPDS-${String(++orderSeq).padStart(4, '0')}`;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("AppProvider: rendering start");
  const saved = loadState();
  console.log("AppProvider: saved state loaded =", saved);

  const [customers, setCustomers] = useState<Customer[]>(
    saved?.customers ?? INIT_CUSTOMERS
  );
  const [tasks, setTasks] = useState<Task[]>(
    saved?.tasks ?? INIT_TASKS.map((t: any, i: number) => ({
      ...t, status: t.status || (i === 0 ? 'todo' : i === 1 ? 'in_progress' : 'done'), comments: []
    }))
  );
  const [activities, setActivities] = useState<Activity[]>(
    saved?.activities ?? INIT_ACTIVITIES
  );
  const [workflowRules, setWorkflowRules] = useState<WorkflowRule[]>(
    saved?.workflowRules ?? INIT_RULES
  );
  const [notifications, setNotifications] = useState<Notification[]>(
    saved?.notifications ?? INIT_NOTIFS.map((n: any) => ({ ...n, read: false }))
  );
  const [livePayments, setLivePayments] = useState<LivePayment[]>(
    saved?.livePayments ?? INIT_PAYMENTS
  );
  const [activePanel, setActivePanel] = useState<string>(getInitialPanel(saved?.activePanel));
  const [role, setRole] = useState<AppRole>(getInitialRole(saved?.role));
  const [backendSync, setBackendSync] = useState<BackendSync>({
    status: 'demo',
    source: 'Demo dataset',
    message: 'Login as admin to sync live website orders.',
  });

  const refreshBackend = useCallback(async () => {
    const params = getUrlParams();
    const customerPhone = params.get('phone') || localStorage.getItem('opds_customer_phone') || localStorage.getItem('opds_testing_user') || '';

    if (role === 'customer') {
      if (!customerPhone) {
        setBackendSync({
          status: 'demo',
          source: 'Customer portal',
          message: 'Customer phone missing. Login or open dashboard from payment success.',
        });
        return;
      }

      setBackendSync(prev => ({ ...prev, status: 'syncing', message: 'Loading your live orders...' }));

      try {
        const sessionToken = localStorage.getItem('opds_customer_session') || '';
        const response = await fetch(`/api/customer/dashboard?phone=${encodeURIComponent(customerPhone)}`, {
          headers: sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {},
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Customer dashboard sync failed.');
        const liveCustomers = mapCustomerDashboardToCustomers(data);
        setCustomers(liveCustomers);
        setActivities(liveCustomers[0].orders.map(order => ({
          text: `Customer order ${order.id} - ${order.service}`,
          time: 'live sync',
          color: 'var(--blue)',
          bg: 'var(--blue-dim)',
          icon: 'package',
        })).slice(0, 20));
        setLivePayments(liveCustomers[0].orders.map(order => ({
          text: `Rs. ${order.amount.toLocaleString('en-IN')} - ${order.service} - ${liveCustomers[0].name}`,
          time: 'live',
          color: order.payStatus === 'Paid' ? 'var(--emerald)' : order.payStatus === 'Failed' ? 'var(--rose)' : 'var(--amber)',
        })).slice(0, 6));
        localStorage.setItem('opds_customer_phone', customerPhone);
        setBackendSync({
          status: 'live',
          source: 'Customer dashboard API',
          message: `${liveCustomers[0].orders.length} live orders loaded.`,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (error) {
        setBackendSync({
          status: 'offline',
          source: 'Customer dashboard API',
          message: error instanceof Error ? error.message : 'Customer sync failed.',
        });
      }
      return;
    }

    const token = localStorage.getItem('opds_admin_token') || '';
    if (!token) {
      setBackendSync({
        status: 'demo',
        source: 'Demo dataset',
        message: 'Login as admin to sync live website orders.',
      });
      return;
    }

    setBackendSync(prev => ({ ...prev, status: 'syncing', message: 'Syncing live orders from website backend...' }));

    try {
      const response = await fetch('/api/admin/orders', {
        headers: { 'X-Admin-Token': token },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Website backend sync failed.');

      const liveOrders = Array.isArray(data.orders) ? data.orders : [];
      const liveCustomers = mapWebsiteOrdersToCustomers(liveOrders);

      if (liveCustomers.length > 0) {
        setCustomers(liveCustomers);
        setActivities(prev => [...mapWebsiteOrdersToActivities(liveOrders), ...prev].slice(0, 20));
        const payments = mapWebsiteOrdersToPayments(liveOrders);
        if (payments.length > 0) setLivePayments(payments);
      }

      setBackendSync({
        status: 'live',
        source: 'Website backend API',
        message: liveOrders.length
          ? `${liveOrders.length} live orders synced.`
          : 'Website API connected. Demo data is visible until the first live order arrives.',
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (error) {
      setBackendSync({
        status: 'offline',
        source: 'Demo dataset',
        message: error instanceof Error ? error.message : 'Live sync failed.',
      });
    }
  }, [role]);

  // Persist state on every change
  useEffect(() => {
    saveState({ customers, tasks, activities, workflowRules, notifications, livePayments, activePanel, role });
  }, [customers, tasks, activities, workflowRules, notifications, livePayments, activePanel, role]);

  useEffect(() => {
    refreshBackend();
    const syncTimer = window.setInterval(refreshBackend, 60000);
    return () => window.clearInterval(syncTimer);
  }, [refreshBackend]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const allOrders: Order[] = customers.flatMap(c =>
    c.orders.map(o => ({ ...o, customer: c }))
  );
  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Customer Actions ──────────────────────────────────────────────────────
  const addCustomer = useCallback((c: Omit<Customer, 'orders' | 'documents'>) => {
    const newC: Customer = { ...c, orders: [], documents: [] };
    setCustomers(prev => [newC, ...prev]);
    addActivity({ text: `New customer registered: ${c.name}`, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'user-plus' });
    addNotification({ title: `New Customer: ${c.name}`, sub: `${c.phone} · ${c.city}`, time: 'just now', color: 'var(--emerald)', icon: 'user-plus', panelTarget: 'crm' });
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // ── Order Actions ──────────────────────────────────────────────────────────
  const addOrder = useCallback((customerId: string, order: Omit<Order, 'customer'>) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c;
      return { ...c, orders: [...c.orders, order], totalSpent: c.totalSpent + order.amount };
    }));
    addActivity({ text: `New order ${order.id} — ${order.service}`, color: 'var(--blue)', bg: 'var(--blue-dim)', icon: 'package' });
    addNotification({ title: `New Order: ${order.id}`, sub: `${order.service} · ₹${order.amount}`, time: 'just now', color: 'var(--blue)', icon: 'package', panelTarget: 'orders' });
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: string, nextPaymentStatus?: string) => {
    const uiStatus = titleCaseStatus(status, status);
    const uiPaymentStatus = nextPaymentStatus ? paymentStatus(nextPaymentStatus) : '';

    setCustomers(prev => prev.map(c => ({
      ...c,
      orders: c.orders.map(o => o.id === orderId ? {
        ...o,
        status: uiStatus,
        ...(uiPaymentStatus ? { payStatus: uiPaymentStatus } : {}),
      } : o)
    })));
    addActivity({ text: `Order ${orderId} status updated to ${uiStatus}`, color: 'var(--blue)', bg: 'var(--blue-dim)', icon: 'refresh-cw' });

    const token = localStorage.getItem('opds_admin_token') || '';
    try {
      const csrf = await fetch('/api/csrf').then(res => res.json()).then(data => data.csrfToken || '');
      const response = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: JSON.stringify({
          orderId,
          status: backendOrderStatus(uiStatus),
          ...(uiPaymentStatus ? { paymentStatus: backendPaymentStatus(uiPaymentStatus) } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Backend status update failed.');
      addNotification({ title: `Order Updated: ${orderId}`, sub: `${uiStatus}${uiPaymentStatus ? ` / ${uiPaymentStatus}` : ''}`, time: 'just now', color: 'var(--blue)', icon: 'refresh-cw', panelTarget: 'orders' });
    } catch (error) {
      addNotification({
        title: `Local update only: ${orderId}`,
        sub: error instanceof Error ? error.message : 'Backend status sync failed.',
        time: 'just now',
        color: 'var(--amber)',
        icon: 'alert-triangle',
        panelTarget: 'orders',
      });
    }
  }, []);

  // ── Task Actions ──────────────────────────────────────────────────────────
  const addTask = useCallback((t: Omit<Task, 'id' | 'status' | 'comments'>) => {
    const newTask: Task = { ...t, id: String(Date.now()), status: 'todo', comments: [] };
    setTasks(prev => [newTask, ...prev]);
    addActivity({ text: `Task created: ${t.title}`, color: 'var(--violet)', bg: 'var(--violet-dim)', icon: 'check-square' });
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Activity Actions ──────────────────────────────────────────────────────
  const addActivity = useCallback((a: Omit<Activity, 'time'>) => {
    const newA: Activity = { ...a, time: 'just now' };
    setActivities(prev => [newA, ...prev.slice(0, 19)]);
  }, []);

  // ── Workflow Rule Actions ─────────────────────────────────────────────────
  const toggleRule = useCallback((index: number) => {
    setWorkflowRules(prev => prev.map((r, i) => i === index ? { ...r, active: !r.active } : r));
  }, []);

  // ── Notification Actions ──────────────────────────────────────────────────
  const addNotification = useCallback((n: Omit<Notification, 'read'>) => {
    setNotifications(prev => [{ ...n, read: false }, ...prev.slice(0, 29)]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // ── Automation Engine ─────────────────────────────────────────────────────
  const triggerEvent = useCallback((event: string, payload: Record<string, any>) => {
    // Find all active rules matching this trigger
    const matchingRules = workflowRules.filter(r => {
      if (!r.active) return false;
      const tLower = r.trigger.toLowerCase();
      const eLower = event.toLowerCase();
      if (event === 'payment.captured' && (tLower.includes('payment') || tLower.includes('captured'))) return true;
      if (event === 'status.completed' && (tLower.includes('completed') || tLower.includes('completion'))) return true;
      if (event === 'refund.requested' && tLower.includes('refund')) return true;
      if (event === 'order.created' && (tLower.includes('service') || tLower.includes('requested'))) return true;
      return false;
    });

    matchingRules.forEach(rule => {
      const action = rule.action.toLowerCase();

      // Action: Update status
      if (action.includes('verified') || action.includes('status')) {
        if (payload.orderId) updateOrderStatus(payload.orderId, 'Verified');
      }

      // Action: Send WhatsApp
      if (action.includes('whatsapp') || action.includes('send')) {
        addActivity({ text: `WhatsApp sent to ${payload.customerName || 'customer'} via rule: "${rule.name}"`, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'message-circle' });
      }

      // Action: Alert admin
      if (action.includes('alert')) {
        addNotification({ title: `⚠️ Rule Alert: ${rule.name}`, sub: `Triggered by: ${event}`, time: 'just now', color: 'var(--rose)', icon: 'alert-triangle', panelTarget: 'automation' });
      }
    });

    // Payment event → live payment feed
    if (event === 'payment.captured') {
      const newPayment: LivePayment = {
        text: `₹${payload.amount} · ${payload.service || 'Order'} · ${payload.customerName || 'Customer'}`,
        time: 'just now',
        color: 'var(--emerald)'
      };
      setLivePayments(prev => [newPayment, ...prev.slice(0, 4)]);
      addActivity({ text: `Payment ₹${payload.amount} received · ${payload.gateway || 'Razorpay'}`, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'credit-card' });
      addNotification({ title: `Payment Received`, sub: `₹${payload.amount} · ${payload.service}`, time: 'just now', color: 'var(--emerald)', icon: 'check-circle', panelTarget: 'finance' });
    }

    if (event === 'payment.failed') {
      const failPayment: LivePayment = {
        text: `₹${payload.amount} FAILED · ${payload.service} · ${payload.customerName}`,
        time: 'just now',
        color: 'var(--rose)'
      };
      setLivePayments(prev => [failPayment, ...prev.slice(0, 4)]);
      addNotification({ title: `Payment Failed`, sub: `₹${payload.amount} · ${payload.service}`, time: 'just now', color: 'var(--rose)', icon: 'alert-triangle', panelTarget: 'finance' });
    }
  }, [workflowRules, updateOrderStatus, addActivity, addNotification]);

  const value: AppContextType = {
    customers, tasks, activities, workflowRules, notifications, livePayments,
    activePanel, role, backendSync, allOrders, unreadCount,
    addCustomer, updateCustomer,
    addOrder, updateOrderStatus,
    addTask, updateTask, deleteTask,
    addActivity,
    setWorkflowRules, toggleRule,
    addNotification, markAllRead,
    setActivePanel, setRole, refreshBackend,
    triggerEvent,
  };

  console.log("AppProvider: returning AppContext.Provider");
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
