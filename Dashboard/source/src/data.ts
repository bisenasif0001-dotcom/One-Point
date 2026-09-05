// Live data — populated from backend API on login
export const CUSTOMERS: any[] = [];

export const ALL_ORDERS = CUSTOMERS.flatMap(c => (c as any).orders.map((o: any) => ({ ...o, customer: c })));

export const ACTIVITIES: any[] = [];

export const LIVE_PAYMENTS: any[] = [];

export const TASKS: any[] = [];

export const DOCS: any[] = [];

export const AUDIT: any[] = [];

export const FRANCHISES: any[] = [];

export const SERVICES = [
  { icon: '🏛', name: 'Govt / E-Services', count: 12, color: '#125696', status: true },
  { icon: '🎓', name: 'EduPoint', count: 10, color: '#C9921A', status: true },
  { icon: '💼', name: 'Business', count: 8, color: '#f59e0b', status: true },
  { icon: '🎁', name: 'OneMart Store', count: 14, color: '#16a34a', status: true },
  { icon: '✈', name: 'Travel Booking', count: 4, color: '#0284c7', status: false },
  { icon: '💳', name: 'Bill & Recharge', count: 6, color: '#dc2626', status: true }
];

export const WORKFLOW_RULES = [
  { name: 'Auto-Verify Paid Orders', trigger: 'Payment Captured', action: 'Set status → Verified', active: true },
  { name: 'WhatsApp on Completion', trigger: 'Status = Completed', action: 'Send WhatsApp', active: true },
  { name: 'Refund Risk Alert', trigger: 'Refund threshold exceeded', action: 'Alert admin', active: true }
];

export const WEBHOOK_LOG: any[] = [];

export const NOTIFS: any[] = [];
