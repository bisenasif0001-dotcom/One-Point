import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CUSTOMERS as INIT_CUSTOMERS,
  TASKS as INIT_TASKS,
  ACTIVITIES as INIT_ACTIVITIES,
  WORKFLOW_RULES as INIT_RULES,
  NOTIFS as INIT_NOTIFS,
  LIVE_PAYMENTS as INIT_PAYMENTS,
} from './data';
import { adminTokenHeader, clearStoredAdminToken, getCsrfToken, getStoredAdminToken } from './security/adminSession';

// ─── Types ───────────────────────────────────────────────────────────────────
export type Customer = {
  id: string; name: string; phone: string; initials: string; color: string;
  email: string; city: string; joined: string; verified: boolean; tier: string;
  totalSpent: number;
  orders: Order[];
  documents?: any[];
  object?: any;
  customerUuid?: string;
  customerNumber?: string;
  lifecycleStage?: string;
  segment?: string;
  trustScore?: number | null;
  riskLevel?: string;
  preferredLanguage?: string;
  preferredChannel?: string;
  consentStatus?: string;
  serviceDna?: any[];
  customerTimeline?: any[];
  genome?: any;
};

export type Order = {
  id: string; service: string; category: string; amount: number;
  status: string; payStatus: string; gateway: string; date: string;
  invoiceNo?: string; notes?: string; attachments?: any;
  customer?: any;
  object?: any; paymentObject?: any; invoiceObject?: any;
  workflow?: any;
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

  // Preferences & Accessibility
  theme: 'light' | 'dark' | 'high-contrast' | 'auto' | 'print';
  fontScale: '100%' | '110%' | '120%' | '130%' | '140%' | '150%';
  density: 'compact' | 'comfort' | 'high';
  animation: 'on' | 'reduced' | 'off';
  direction: 'ltr' | 'rtl';
  setTheme: (theme: 'light' | 'dark' | 'high-contrast' | 'auto' | 'print') => void;
  setFontScale: (scale: '100%' | '110%' | '120%' | '130%' | '140%' | '150%') => void;
  setDensity: (density: 'compact' | 'comfort' | 'high') => void;
  setAnimation: (animation: 'on' | 'reduced' | 'off') => void;
  setDirection: (dir: 'ltr' | 'rtl') => void;

  // Right insights panel collapse
  rightPanelCollapsed: boolean;
  toggleRightPanel: () => void;
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
  amount: 0,
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
  if (portal === 'employee' && !panel) return 'employee-portal';
  return panel || savedPanel || 'home';
}

function getInitialRole(savedRole?: AppRole): AppRole {
  const params = getUrlParams();
  const role = params.get('role') as AppRole | null;
  const portal = params.get('portal');
  if (role && ['admin', 'operator', 'franchise', 'support'].includes(role)) return role;
  if (portal === 'employee') return 'operator';
  if (portal === 'admin') return 'admin';
  return savedRole && ['admin', 'operator', 'franchise', 'support'].includes(savedRole) ? savedRole : 'admin';
}

function titleCaseStatus(status: any, fallback = 'Pending') {
  const value = String(status || '').toLowerCase();
  const map: Record<string, string> = {
    created: 'Pending',
    pending: 'Pending',
    documents_pending: 'Documents Pending',
    verification: 'Verification',
    payment: 'Payment',
    paid: 'Completed',
    ready: 'Ready',
    captured: 'Completed',
    verified: 'Verified',
    processing: 'Processing',
    government_submission: 'Government Submission',
    waiting: 'Waiting',
    out_for_delivery: 'Processing',
    completed: 'Completed',
    delivered: 'Delivered',
    feedback: 'Feedback',
    archived: 'Archived',
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
  const workflow = order.workflow || null;
  return {
    id: String(order.orderId || order.id || `WEB-${index + 1}`),
    service: itemNames(order),
    category: order.orderType === 'service' ? 'E-Services' : 'OneMart Store',
    amount: Number(order.total ?? order.amount ?? 0),
    status: String(workflow?.statusLabel || titleCaseStatus(order.status)),
    payStatus: paymentStatus(payment.status || order.paymentStatus),
    gateway: String(payment.gateway || order.gateway || 'razorpay'),
    date: formatDate(order.createdAt),
    invoiceNo: order.invoiceNo,
    notes: order.notes || '',
    attachments: order.attachments || {},
    object: order.object || null,
    paymentObject: order.paymentObject || payment.object || null,
    invoiceObject: order.invoiceObject || null,
    workflow,
  };
}

function orderDocuments(order: any) {
  const registered = Array.isArray(order.documents) ? order.documents.map((doc: any, index: number) => ({
    id: doc.id,
    title: doc.file_name || `Document ${index + 1}`,
    type: doc.doc_type || 'Document',
    format: String(doc.file_name || '').split('.').pop()?.toUpperCase() || 'FILE',
    size: doc.file_size_bytes ? `${Math.max(1, Math.round(Number(doc.file_size_bytes) / 1024))} KB` : 'Metadata registered',
    uploadedAt: formatDate(doc.created_at || order.createdAt),
    extractedText: `Lifecycle: ${doc.lifecycle_status || 'Pending Verification'}\nOperational status: ${doc.operational_status || 'Active'}\nVerification: ${doc.verification_status || 'Pending Human Verification'}`,
    documentUuid: doc.document_uuid || null,
    versionNumber: doc.version_number || 1,
    lifecycleStatus: doc.lifecycle_status || 'Pending Verification',
    operationalStatus: doc.operational_status || 'Active',
    verificationStatus: doc.verification_status || 'Pending Human Verification',
    verified: Boolean(doc.verified),
    fileUrl: doc.file_url || null,
  })) : [];
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

  return [...registered, ...docs];
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
        object: rawCustomer.object || null,
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

function applyGenomeFields(customer: Customer, genome: any): Customer {
  if (!genome) return customer;
  const identity = genome.identity || {};
  const lifecycle = genome.lifecycle || {};
  const trust = genome.trust || {};
  const financial = genome.financial || {};
  const preferences = genome.preferences || {};
  const consent = genome.consent || {};
  const trustIsPlaceholder = trust.assessmentStatus === 'placeholder'
    || String(genome.riskLevel || trust.riskLevel || '').toLowerCase() === 'not_assessed';
  const trustScore = trustIsPlaceholder
    ? Number.NaN
    : Number(genome.trustScore ?? trust.score ?? customer.trustScore ?? NaN);
  const lifetimeValue = Number(genome.lifetimeValue ?? financial.lifetimeValue ?? customer.totalSpent ?? 0);
  const lifecycleStage = String(genome.lifecycleStage || lifecycle.stage || customer.lifecycleStage || '').toLowerCase();
  const tier = lifecycleStage === 'premium'
    ? 'Premium'
    : lifecycleStage === 'regular' || lifecycleStage === 'active'
      ? 'Standard'
      : customer.tier;

  return {
    ...customer,
    name: identity.name || customer.name,
    phone: identity.mobile || customer.phone,
    email: identity.email || customer.email,
    city: identity.city || identity.address || customer.city,
    verified: customer.verified || identity.identityStatus === 'verified' || lifecycleStage === 'verified',
    tier,
    totalSpent: Number.isFinite(lifetimeValue) ? lifetimeValue : customer.totalSpent,
    customerUuid: genome.customerUuid || customer.customerUuid,
    customerNumber: genome.customerNumber || customer.customerNumber,
    lifecycleStage: genome.lifecycleStage || lifecycle.stage || customer.lifecycleStage,
    segment: genome.segment || lifecycle.segment || customer.segment,
    trustScore: trustIsPlaceholder ? null : Number.isFinite(trustScore) ? trustScore : customer.trustScore ?? null,
    riskLevel: genome.riskLevel || trust.riskLevel || customer.riskLevel,
    preferredLanguage: genome.preferredLanguage || preferences.preferredLanguage || customer.preferredLanguage,
    preferredChannel: genome.preferredChannel || preferences.preferredChannel || customer.preferredChannel,
    consentStatus: genome.consentStatus || consent.status || customer.consentStatus,
    serviceDna: genome.serviceDna || customer.serviceDna || [],
    customerTimeline: genome.timeline || customer.customerTimeline || [],
    object: genome.object || customer.object,
    genome,
  };
}

function mapCustomer360ToCustomer(genome: any, index = 0): Customer {
  const identity = genome?.identity || {};
  const name = String(identity.name || 'Customer');
  const phone = String(identity.mobile || 'N/A');
  const email = String(identity.email || '');
  const customer: Customer = {
    id: stableId(genome?.customerUuid || phone || email || name),
    name,
    phone,
    initials: initials(name),
    color: LIVE_COLORS[index % LIVE_COLORS.length],
    email: email || 'not-provided@bisenonepoint.com',
    city: identity.city || identity.address || 'Address not provided',
    joined: genome?.timeline?.slice(-1)?.[0]?.occurredAt ? formatDate(genome.timeline.slice(-1)[0].occurredAt) : formatDate(new Date()),
    verified: identity.identityStatus === 'verified',
    tier: 'New',
    totalSpent: 0,
    orders: [],
    documents: [],
  };
  return applyGenomeFields(customer, genome);
}

function mergeCustomersWithGenomes(orderCustomers: Customer[], genomes: any[]): Customer[] {
  const byPhone = new Map(orderCustomers.map(customer => [String(customer.phone || '').replace(/\D/g, ''), customer]));
  const byUuid = new Map(orderCustomers.filter(customer => customer.customerUuid).map(customer => [customer.customerUuid, customer]));
  const merged = [...orderCustomers];

  genomes.forEach((genome, index) => {
    const phone = String(genome?.identity?.mobile || '').replace(/\D/g, '');
    const uuid = genome?.customerUuid;
    const match = (uuid && byUuid.get(uuid)) || (phone && byPhone.get(phone));
    if (match) {
      const updated = applyGenomeFields(match, genome);
      const existingIndex = merged.findIndex(customer => customer.id === match.id);
      if (existingIndex >= 0) merged[existingIndex] = updated;
      return;
    }
    merged.push(mapCustomer360ToCustomer(genome, merged.length + index));
  });

  return merged;
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
  const saved = loadState();

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

  const [theme, setThemeState] = useState<'light' | 'dark' | 'high-contrast' | 'auto' | 'print'>(
    () => {
      // 'print' is no longer a selectable screen theme — it hides the sidebar/right panel
      // (and the theme switcher itself), trapping the user. Self-heal any stuck session.
      const stored = localStorage.getItem('opds_theme');
      return (stored && stored !== 'print' ? stored : 'auto') as any;
    }
  );
  const [fontScale, setFontScaleState] = useState<'100%' | '110%' | '120%' | '130%' | '140%' | '150%'>(
    () => (localStorage.getItem('opds_font_scale') as any) || '100%'
  );
  const [density, setDensityState] = useState<'compact' | 'comfort' | 'high'>(
    () => (localStorage.getItem('opds_density') as any) || 'comfort'
  );
  const [animation, setAnimationState] = useState<'on' | 'reduced' | 'off'>(
    () => (localStorage.getItem('opds_animation') as any) || 'on'
  );
  const [direction, setDirectionState] = useState<'ltr' | 'rtl'>(
    () => (localStorage.getItem('opds_direction') as any) || 'ltr'
  );
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(
    () => localStorage.getItem('opds_right_collapsed') !== '0'
  );

  useEffect(() => {
    const applyTheme = (t: typeof theme) => {
      let resolvedTheme = t;
      if (t === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolvedTheme = isDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      localStorage.setItem('opds_theme', t);
    };

    applyTheme(theme);

    if (theme === 'auto') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  useEffect(() => {
    const scaleMap = { '100%': '16px', '110%': '17.6px', '120%': '19.2px', '130%': '20.8px', '140%': '22.4px', '150%': '24px' };
    document.documentElement.style.fontSize = scaleMap[fontScale];
    localStorage.setItem('opds_font_scale', fontScale);
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem('opds_density', density);
  }, [density]);

  useEffect(() => {
    document.documentElement.setAttribute('data-animation', animation);
    localStorage.setItem('opds_animation', animation);
  }, [animation]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', direction);
    localStorage.setItem('opds_direction', direction);
  }, [direction]);

  useEffect(() => {
    document.documentElement.setAttribute('data-rightpanel', rightPanelCollapsed ? 'collapsed' : 'open');
    localStorage.setItem('opds_right_collapsed', rightPanelCollapsed ? '1' : '0');
  }, [rightPanelCollapsed]);

  const toggleRightPanel = useCallback(() => setRightPanelCollapsed(v => !v), []);

  const setTheme = useCallback((t: typeof theme) => setThemeState(t), []);
  const setFontScale = useCallback((s: typeof fontScale) => setFontScaleState(s), []);
  const setDensity = useCallback((d: typeof density) => setDensityState(d), []);
  const setAnimation = useCallback((a: typeof animation) => setAnimationState(a), []);
  const setDirection = useCallback((dir: typeof direction) => setDirectionState(dir), []);


  const refreshBackend = useCallback(async () => {
    const token = getStoredAdminToken();
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
        headers: adminTokenHeader(),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        clearStoredAdminToken();
        setBackendSync({ status: 'offline', source: 'Admin portal', message: 'SESSION_EXPIRED: Admin session expired. Please login again.' });
        return;
      }
      if (!response.ok) throw new Error(data.message || 'Website backend sync failed.');

      const liveOrders = Array.isArray(data.orders) ? data.orders : [];
      let liveCustomers = mapWebsiteOrdersToCustomers(liveOrders);

      try {
        const customerResponse = await fetch('/api/admin/customers', {
          headers: adminTokenHeader(),
        });
        const customerData = await customerResponse.json().catch(() => ({}));
        if (customerResponse.ok && Array.isArray(customerData.customers)) {
          liveCustomers = mergeCustomersWithGenomes(liveCustomers, customerData.customers);
        }
      } catch {
        // Keep order-backed customer data when the Customer 360 endpoint is unavailable.
      }

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
    let previousOrderSnapshot: Order | null = null;

    setCustomers(prev => prev.map(c => ({
      ...c,
      orders: c.orders.map(o => {
        if (o.id !== orderId) return o;
        previousOrderSnapshot = { ...o };
        return {
          ...o,
          status: uiStatus,
          ...(uiPaymentStatus ? { payStatus: uiPaymentStatus } : {}),
        };
      })
    })));
    addActivity({ text: `Order ${orderId} status updated to ${uiStatus}`, color: 'var(--blue)', bg: 'var(--blue-dim)', icon: 'refresh-cw' });

    try {
      const csrf = await getCsrfToken();
      const response = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminTokenHeader(),
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
      const acceptedStatus = String(data.workflow?.statusLabel || uiStatus);
      setCustomers(prev => prev.map(c => ({
        ...c,
        orders: c.orders.map(o => o.id === orderId ? {
          ...o,
          status: acceptedStatus,
          ...(uiPaymentStatus ? { payStatus: uiPaymentStatus } : {}),
          ...(data.workflow ? { workflow: data.workflow } : {}),
        } : o)
      })));
      addNotification({ title: `Order Updated: ${orderId}`, sub: `${uiStatus}${uiPaymentStatus ? ` / ${uiPaymentStatus}` : ''}`, time: 'just now', color: 'var(--blue)', icon: 'refresh-cw', panelTarget: 'orders' });
    } catch (error) {
      if (previousOrderSnapshot) {
        setCustomers(prev => prev.map(c => ({
          ...c,
          orders: c.orders.map(o => o.id === orderId ? previousOrderSnapshot as Order : o)
        })));
      }
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
    theme, fontScale, density, animation, direction,
    setTheme, setFontScale, setDensity, setAnimation, setDirection,
    rightPanelCollapsed, toggleRightPanel,
  };


  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
