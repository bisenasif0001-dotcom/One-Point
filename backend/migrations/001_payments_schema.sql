PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_email ON users(phone, email);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_paise INTEGER NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  duration TEXT,
  icon TEXT,
  sla TEXT,
  required_docs_json TEXT NOT NULL DEFAULT '[]',
  automation_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  price_paise INTEGER NOT NULL,
  tax_rate REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  duration TEXT,
  icon TEXT,
  sla TEXT,
  required_docs_json TEXT NOT NULL DEFAULT '[]',
  automation_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_sequences (
  order_date TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  order_type TEXT NOT NULL CHECK(order_type IN ('product','service','booking')),
  source_channel TEXT NOT NULL DEFAULT 'online',
  client_reference TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  subtotal_paise INTEGER NOT NULL DEFAULT 0,
  gst_paise INTEGER NOT NULL DEFAULT 0,
  discount_paise INTEGER NOT NULL DEFAULT 0,
  delivery_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_reference ON orders(client_reference) WHERE client_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK(item_type IN ('product','service')),
  item_slug TEXT NOT NULL,
  item_name TEXT NOT NULL,
  image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_paise INTEGER NOT NULL,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  gateway TEXT NOT NULL CHECK(gateway IN ('razorpay','phonepe')),
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_session_json TEXT,
  failure_reason TEXT,
  retry_of_payment_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_order_gateway ON payments(order_id, gateway);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  payment_id INTEGER NOT NULL,
  gateway TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  gateway_reference TEXT,
  raw_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(payment_id) REFERENCES payments(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_gateway_ref ON transactions(gateway, gateway_reference);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  transaction_id INTEGER,
  pdf_path TEXT,
  subtotal_paise INTEGER NOT NULL,
  gst_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL,
  delivery_paise INTEGER NOT NULL,
  total_paise INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued',
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);

CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  refund_id TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  payment_id INTEGER NOT NULL,
  transaction_id INTEGER,
  gateway TEXT NOT NULL,
  refund_type TEXT NOT NULL CHECK(refund_type IN ('full','partial')),
  amount_paise INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  reason TEXT,
  gateway_refund_id TEXT,
  raw_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(payment_id) REFERENCES payments(id),
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

CREATE TABLE IF NOT EXISTS payment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  payment_id INTEGER,
  gateway TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  event TEXT NOT NULL,
  message TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(payment_id) REFERENCES payments(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_created ON payment_logs(created_at);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway TEXT NOT NULL,
  event TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL,
  signature_valid INTEGER NOT NULL DEFAULT 0,
  raw_payload TEXT NOT NULL,
  headers_json TEXT,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_gateway_event ON webhook_logs(gateway, event);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('email','sms','whatsapp')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'logged',
  payload_json TEXT,
  provider_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_event_status ON notifications(event, status);
