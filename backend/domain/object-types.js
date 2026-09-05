"use strict";

const DEPARTMENTS = Object.freeze({
  EXECUTIVE_OFFICE: "executive_office",
  OPERATIONS: "operations",
  CUSTOMER_SUCCESS: "customer_success",
  GOVERNMENT_SERVICES: "government_services",
  PRINTING: "printing",
  ONEMART: "onemart",
  FINANCE: "finance",
  KNOWLEDGE: "knowledge",
  COMPLIANCE: "compliance",
  HR: "hr",
  SALES: "sales",
  MARKETING: "marketing",
  ANALYTICS: "analytics",
  INNOVATION: "innovation",
  INFRASTRUCTURE: "infrastructure",
  BRANCH_OPERATIONS: "branch_operations",
  FRANCHISE_OPERATIONS: "franchise_operations"
});

const OBJECT_TYPES = Object.freeze({
  CUSTOMER: "customer",
  SERVICE: "service",
  SERVICE_VARIANT: "service_variant",
  PRODUCT: "product",
  ORDER: "order",
  ORDER_ITEM: "order_item",
  PAYMENT: "payment",
  TRANSACTION: "transaction",
  INVOICE: "invoice",
  REFUND: "refund",
  PAYMENT_LOG: "payment_log",
  WEBHOOK_LOG: "webhook_log",
  NOTIFICATION: "notification",
  HUMAN_STAFF: "human_staff",
  TASK_ASSIGNMENT: "task_assignment",
  DOCUMENT: "document",
  AUTOMATION_CHECK: "automation_check",
  AUTOMATION_RULE: "automation_rule",
  SUPPORT_TICKET: "support_ticket",
  DEPARTMENT: "department"
});

const OBJECT_TYPE_DEFINITIONS = Object.freeze({
  users: {
    objectType: OBJECT_TYPES.CUSTOMER,
    displayName: "Customer",
    domainKey: "customer",
    defaultDepartment: DEPARTMENTS.CUSTOMER_SUCCESS,
    visibility: "internal",
    aiContextEnabled: true
  },
  services: {
    objectType: OBJECT_TYPES.SERVICE,
    displayName: "Service",
    domainKey: "service",
    defaultDepartment: DEPARTMENTS.GOVERNMENT_SERVICES,
    visibility: "public",
    aiContextEnabled: true
  },
  service_pricing_variants: {
    objectType: OBJECT_TYPES.SERVICE_VARIANT,
    displayName: "Service Variant",
    domainKey: "service",
    defaultDepartment: DEPARTMENTS.GOVERNMENT_SERVICES,
    visibility: "public",
    aiContextEnabled: true
  },
  products: {
    objectType: OBJECT_TYPES.PRODUCT,
    displayName: "Product",
    domainKey: "marketplace",
    defaultDepartment: DEPARTMENTS.ONEMART,
    visibility: "public",
    aiContextEnabled: true
  },
  orders: {
    objectType: OBJECT_TYPES.ORDER,
    displayName: "Order",
    domainKey: "order",
    defaultDepartment: DEPARTMENTS.OPERATIONS,
    visibility: "internal",
    aiContextEnabled: true
  },
  order_items: {
    objectType: OBJECT_TYPES.ORDER_ITEM,
    displayName: "Order Item",
    domainKey: "order",
    defaultDepartment: DEPARTMENTS.OPERATIONS,
    visibility: "internal",
    aiContextEnabled: true
  },
  payments: {
    objectType: OBJECT_TYPES.PAYMENT,
    displayName: "Payment",
    domainKey: "finance",
    defaultDepartment: DEPARTMENTS.FINANCE,
    visibility: "restricted",
    aiContextEnabled: true
  },
  transactions: {
    objectType: OBJECT_TYPES.TRANSACTION,
    displayName: "Transaction",
    domainKey: "finance",
    defaultDepartment: DEPARTMENTS.FINANCE,
    visibility: "restricted",
    aiContextEnabled: true
  },
  invoices: {
    objectType: OBJECT_TYPES.INVOICE,
    displayName: "Invoice",
    domainKey: "finance",
    defaultDepartment: DEPARTMENTS.FINANCE,
    visibility: "restricted",
    aiContextEnabled: true
  },
  refunds: {
    objectType: OBJECT_TYPES.REFUND,
    displayName: "Refund",
    domainKey: "finance",
    defaultDepartment: DEPARTMENTS.FINANCE,
    visibility: "restricted",
    aiContextEnabled: true
  },
  payment_logs: {
    objectType: OBJECT_TYPES.PAYMENT_LOG,
    displayName: "Payment Log",
    domainKey: "finance",
    defaultDepartment: DEPARTMENTS.FINANCE,
    visibility: "restricted",
    aiContextEnabled: false
  },
  webhook_logs: {
    objectType: OBJECT_TYPES.WEBHOOK_LOG,
    displayName: "Webhook Log",
    domainKey: "infrastructure",
    defaultDepartment: DEPARTMENTS.INFRASTRUCTURE,
    visibility: "restricted",
    aiContextEnabled: false
  },
  notifications: {
    objectType: OBJECT_TYPES.NOTIFICATION,
    displayName: "Notification",
    domainKey: "notification",
    defaultDepartment: DEPARTMENTS.CUSTOMER_SUCCESS,
    visibility: "internal",
    aiContextEnabled: true
  },
  staff: {
    objectType: OBJECT_TYPES.HUMAN_STAFF,
    displayName: "Human Staff",
    domainKey: "human_workforce",
    defaultDepartment: DEPARTMENTS.HR,
    visibility: "internal",
    aiContextEnabled: true
  },
  task_assignments: {
    objectType: OBJECT_TYPES.TASK_ASSIGNMENT,
    displayName: "Task Assignment",
    domainKey: "task",
    defaultDepartment: DEPARTMENTS.OPERATIONS,
    visibility: "internal",
    aiContextEnabled: true
  },
  order_documents: {
    objectType: OBJECT_TYPES.DOCUMENT,
    displayName: "Document",
    domainKey: "document",
    defaultDepartment: DEPARTMENTS.OPERATIONS,
    visibility: "restricted",
    aiContextEnabled: true
  },
  bot_checks: {
    objectType: OBJECT_TYPES.AUTOMATION_CHECK,
    displayName: "Automation Check",
    domainKey: "workflow",
    defaultDepartment: DEPARTMENTS.OPERATIONS,
    visibility: "internal",
    aiContextEnabled: true
  },
  automation_rules: {
    objectType: OBJECT_TYPES.AUTOMATION_RULE,
    displayName: "Automation Rule",
    domainKey: "workflow",
    defaultDepartment: DEPARTMENTS.OPERATIONS,
    visibility: "internal",
    aiContextEnabled: true
  },
  support_tickets: {
    objectType: OBJECT_TYPES.SUPPORT_TICKET,
    displayName: "Support Ticket",
    domainKey: "customer_success",
    defaultDepartment: DEPARTMENTS.CUSTOMER_SUCCESS,
    visibility: "internal",
    aiContextEnabled: true
  },
  domain_departments: {
    objectType: OBJECT_TYPES.DEPARTMENT,
    displayName: "Department",
    domainKey: "enterprise",
    defaultDepartment: DEPARTMENTS.EXECUTIVE_OFFICE,
    visibility: "internal",
    aiContextEnabled: true
  }
});

const SOURCE_TABLE_BY_TYPE = Object.freeze(
  Object.fromEntries(Object.entries(OBJECT_TYPE_DEFINITIONS).map(([sourceTable, definition]) => [definition.objectType, sourceTable]))
);

const OBJECT_TYPE_BY_SOURCE_TABLE = Object.freeze(
  Object.fromEntries(Object.entries(OBJECT_TYPE_DEFINITIONS).map(([sourceTable, definition]) => [sourceTable, definition.objectType]))
);

function departmentForCategory(category, fallback = DEPARTMENTS.OPERATIONS) {
  const value = String(category || "").toLowerCase();
  if (value.includes("print") || value.includes("scan") || value.includes("lamination") || value.includes("photocopy")) return DEPARTMENTS.PRINTING;
  if (value.includes("product") || value.includes("mart") || value.includes("store")) return DEPARTMENTS.ONEMART;
  if (value.includes("payment") || value.includes("finance") || value.includes("bank") || value.includes("insurance")) return DEPARTMENTS.FINANCE;
  if (value.includes("customer") || value.includes("support")) return DEPARTMENTS.CUSTOMER_SUCCESS;
  if (value.includes("government") || value.includes("csc") || value.includes("service") || value.includes("registration") || value.includes("certificate")) return DEPARTMENTS.GOVERNMENT_SERVICES;
  return fallback;
}

module.exports = {
  DEPARTMENTS,
  OBJECT_TYPES,
  OBJECT_TYPE_DEFINITIONS,
  SOURCE_TABLE_BY_TYPE,
  OBJECT_TYPE_BY_SOURCE_TABLE,
  departmentForCategory
};
