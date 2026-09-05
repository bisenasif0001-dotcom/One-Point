import { getRegistryNavigationLinks, type DashboardRegistryRole } from '../dashboard/enterprise-dashboard-registry';

export type PanelLinkDefinition = {
  label: string;
  panel: string;
  icon: string;
  group: string;
};

const ADMIN_SEARCH_PANEL_LINKS: PanelLinkDefinition[] = [
  { label: 'Dashboard Home', panel: 'home', icon: 'layout-dashboard', group: 'Overview' },
  { label: 'Order Pipeline', panel: 'kanban', icon: 'git-commit', group: 'Operations' },
  { label: 'Verify Queue', panel: 'documents', icon: 'file-check-2', group: 'Operations' },
  { label: 'All Applications', panel: 'orders', icon: 'list-ordered', group: 'Operations' },
  { label: 'Desk Assignments', panel: 'assignments', icon: 'user-check', group: 'Operations' },
  { label: 'Tasks & Follow-ups', panel: 'tasks', icon: 'check-square', group: 'Operations' },
  { label: 'Customer Database & CRM', panel: 'customer-db', icon: 'users', group: 'Customers' },
  { label: 'WhatsApp Desk', panel: 'whatsapp', icon: 'message-circle', group: 'Customers' },
  { label: 'SMS Notifications', panel: 'sms', icon: 'smartphone', group: 'Customers' },
  { label: 'Support Tickets', panel: 'support', icon: 'life-buoy', group: 'Customers' },
  { label: 'Payment Ledger', panel: 'finance', icon: 'indian-rupee', group: 'Management' },
  { label: 'Refunds & Returns', panel: 'refunds', icon: 'rotate-ccw', group: 'Management' },
  { label: 'Staff Management', panel: 'staff', icon: 'user-cog', group: 'Management' },
  { label: 'Service Catalog', panel: 'services', icon: 'grid-3x3', group: 'Management' },
  { label: 'Rule Builder / Automation', panel: 'automation', icon: 'zap', group: 'Management' },
  { label: 'Platform Settings', panel: 'settings', icon: 'settings', group: 'Management' },
];

export const OPERATIONS_PANEL_LINKS: PanelLinkDefinition[] = [
  { label: 'Order Pipeline', panel: 'kanban', icon: 'git-commit', group: 'Operations' },
  { label: 'Verify Queue', panel: 'documents', icon: 'file-check-2', group: 'Operations' },
  { label: 'All Applications', panel: 'orders', icon: 'list-ordered', group: 'Operations' },
  { label: 'Desk Assignments', panel: 'assignments', icon: 'user-check', group: 'Operations' },
  { label: 'Tasks & Follow-ups', panel: 'tasks', icon: 'check-square', group: 'Operations' },
];

export const CUSTOMER_COMMS_PANEL_LINKS: PanelLinkDefinition[] = [
  { label: 'Customer Database & CRM', panel: 'customer-db', icon: 'users', group: 'Customers & Comms' },
  { label: 'WhatsApp Desk', panel: 'whatsapp', icon: 'message-circle', group: 'Customers & Comms' },
  { label: 'SMS Notifications', panel: 'sms', icon: 'smartphone', group: 'Customers & Comms' },
  { label: 'Support Tickets', panel: 'support', icon: 'life-buoy', group: 'Customers & Comms' },
];

export const FINANCE_SYSTEM_PANEL_LINKS: PanelLinkDefinition[] = [
  { label: 'Payment Ledger', panel: 'finance', icon: 'indian-rupee', group: 'Management & System' },
  { label: 'Refunds & Returns', panel: 'refunds', icon: 'rotate-ccw', group: 'Management & System' },
  { label: 'Staff Management', panel: 'staff', icon: 'user-cog', group: 'Management & System' },
  { label: 'AI Employees & Command', panel: 'ai-agents', icon: 'bot', group: 'Management & System' },
  { label: 'Service Catalog', panel: 'services', icon: 'grid-3x3', group: 'Management & System' },
  { label: 'Automation Rules', panel: 'automation', icon: 'zap', group: 'Management & System' },
  { label: 'Platform Settings', panel: 'settings', icon: 'settings', group: 'Management & System' },
];

export const FINANCE_PANEL_LINKS = FINANCE_SYSTEM_PANEL_LINKS;
export const SYSTEM_PANEL_LINKS = FINANCE_SYSTEM_PANEL_LINKS;

export function getSearchPanelLinks(role: string) {
  return [...getRegistryNavigationLinks(role as DashboardRegistryRole), ...ADMIN_SEARCH_PANEL_LINKS];
}

export function isCustomerContextPanel(_panel: string) {
  return false;
}
