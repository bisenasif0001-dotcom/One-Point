"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const KEEP_PHONE = "9473946181";
const DB_PATH = path.join(__dirname, "backend", "data", "opds-payments.sqlite");
const APPLY = process.argv.includes("--apply");
const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

function rows(db, sql, params = []) { return db.prepare(sql).all(...params); }
function one(db, sql, params = []) { return db.prepare(sql).get(...params); }
function run(db, sql, params = []) { return db.prepare(sql).run(...params); }
function tableColumns(db, table) { return rows(db, `PRAGMA table_info(${quote(table)})`).map((column) => column.name); }
function tableNames(db) {
  return rows(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .map((row) => row.name);
}
function count(db, table) { return Number(one(db, `SELECT COUNT(*) AS count FROM ${quote(table)}`).count); }

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 10000;");
const keeper = one(db, "SELECT * FROM users WHERE phone = ? LIMIT 1", [KEEP_PHONE]);
if (!keeper) throw new Error(`Keeper customer ${KEEP_PHONE} was not found. Nothing was changed.`);

const keeperOrders = rows(db, "SELECT id, order_id FROM orders WHERE user_id = ? ORDER BY id", [keeper.id]);
const nonKeeperOrders = rows(db, "SELECT id, order_id FROM orders WHERE user_id != ? ORDER BY id", [keeper.id]);
const keeperProfile = one(db, "SELECT customer_object_uuid FROM customer_profiles WHERE user_id = ? LIMIT 1", [keeper.id]);
const tables = tableNames(db);
const before = {
  users: count(db, "users"),
  orders: count(db, "orders"),
  sessions: count(db, "auth_sessions"),
  conversations: count(db, "conversations"),
  messages: count(db, "conversation_messages"),
  notifications: count(db, "notifications"),
  invoices: count(db, "invoices")
};

if (!APPLY) {
  console.log(JSON.stringify({
    preview: true,
    keeper: { id: keeper.id, name: keeper.name, phone: keeper.phone, email: keeper.email },
    keeperOrders,
    remove: { users: before.users - 1, orders: nonKeeperOrders.length },
    before
  }, null, 2));
  db.close();
  process.exit(0);
}

const backupDir = path.join(__dirname, "backend", "data", "backups");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `pre-demo-cleanup-${stamp}.sqlite`);
db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);

// Work against all related rows in one transaction. System catalog/configuration
// tables are intentionally untouched.
db.exec("PRAGMA foreign_keys = OFF;");
db.exec("BEGIN IMMEDIATE;");
try {
  const nonKeeperOrderIds = nonKeeperOrders.map((order) => order.id);
  const nonKeeperOrderRefs = nonKeeperOrders.map((order) => String(order.order_id));
  const placeholders = (items) => items.map(() => "?").join(", ");

  // Customer-facing messaging: preserve only conversations owned by the keeper.
  const keeperConversationIds = rows(db, "SELECT id FROM conversations WHERE owner_type = 'customer' AND owner_id = ?", [String(keeper.id)]).map((row) => row.id);
  const conversationTables = ["conversation_messages", "conversation_channels", "conversation_participants"];
  for (const table of conversationTables) {
    if (!tables.includes(table)) continue;
    if (keeperConversationIds.length) run(db, `DELETE FROM ${quote(table)} WHERE conversation_id NOT IN (${placeholders(keeperConversationIds)})`, keeperConversationIds);
    else run(db, `DELETE FROM ${quote(table)}`);
  }
  if (tables.includes("conversations")) {
    if (keeperConversationIds.length) run(db, `DELETE FROM conversations WHERE id NOT IN (${placeholders(keeperConversationIds)})`, keeperConversationIds);
    else run(db, "DELETE FROM conversations");
  }
  // Notifications cannot be reliably attributed in older records; clear the
  // demo notification feed so no fake customer messages survive deployment.
  if (tables.includes("notifications")) run(db, "DELETE FROM notifications");

  // Remove OTPs and sessions for every non-keeper profile.
  if (tables.includes("auth_otps")) run(db, "DELETE FROM auth_otps WHERE phone != ?", [KEEP_PHONE]);
  if (tables.includes("auth_sessions")) run(db, "DELETE FROM auth_sessions WHERE user_id != ?", [keeper.id]);

  // Clear direct user-bound records for non-keepers, except orders which are
  // cleaned after their dependent records below.
  for (const table of tables) {
    if (["users", "orders", "auth_sessions", "customer_profiles"].includes(table)) continue;
    const columns = tableColumns(db, table);
    if (columns.includes("user_id")) run(db, `DELETE FROM ${quote(table)} WHERE user_id != ?`, [keeper.id]);
    if (columns.includes("customer_user_id")) run(db, `DELETE FROM ${quote(table)} WHERE customer_user_id != ?`, [keeper.id]);
  }

  // Remove every child row tied to a non-keeper order. This handles both
  // numeric order IDs and public OPDS order references across legacy tables.
  if (nonKeeperOrderIds.length) {
    for (const table of tables) {
      if (["orders", "order_sequences", "order_workflows"].includes(table)) continue;
      const columns = tableColumns(db, table);
      if (!columns.includes("order_id")) continue;
      run(db,
        `DELETE FROM ${quote(table)}
         WHERE CAST(order_id AS TEXT) IN (${placeholders(nonKeeperOrderIds.concat(nonKeeperOrderRefs))})`,
        nonKeeperOrderIds.concat(nonKeeperOrderRefs).map(String)
      );
    }
    // Workflow steps have only workflow_id, so remove them before their parent workflows.
    run(db, `DELETE FROM order_workflow_steps WHERE workflow_id IN (SELECT id FROM order_workflows WHERE order_id IN (${placeholders(nonKeeperOrderIds)}))`, nonKeeperOrderIds);
    run(db, `DELETE FROM order_timeline_events WHERE workflow_id IN (SELECT id FROM order_workflows WHERE order_id IN (${placeholders(nonKeeperOrderIds)}))`, nonKeeperOrderIds);
    run(db, `DELETE FROM order_workflows WHERE order_id IN (${placeholders(nonKeeperOrderIds)})`, nonKeeperOrderIds);
  }

  // Remove the deleted users' customer-360 projections and their audit history.
  const keepCustomerUuid = keeperProfile?.customer_object_uuid || null;
  const customerObjectTables = ["customer_consents", "customer_lifecycle_events", "customer_preferences", "customer_trust_signals"];
  for (const table of customerObjectTables) {
    if (!tables.includes(table) || !keepCustomerUuid) continue;
    run(db, `DELETE FROM ${quote(table)} WHERE customer_object_uuid != ?`, [keepCustomerUuid]);
  }
  if (tables.includes("customer_profiles")) run(db, "DELETE FROM customer_profiles WHERE user_id != ?", [keeper.id]);

  // Universal objects/timelines/relationships generated for deleted users and orders.
  const deleteObjectUuids = rows(db, `
    SELECT universal_uuid FROM universal_objects
    WHERE (source_table = 'users' AND CAST(source_pk AS TEXT) != ?)
       OR (source_table = 'orders' AND CAST(source_pk AS TEXT) IN (${nonKeeperOrderIds.length ? placeholders(nonKeeperOrderIds) : "''"}))
  `, [String(keeper.id), ...nonKeeperOrderIds.map(String)]).map((row) => row.universal_uuid);
  if (deleteObjectUuids.length) {
    run(db, `DELETE FROM universal_object_relationships WHERE from_object_uuid IN (${placeholders(deleteObjectUuids)}) OR to_object_uuid IN (${placeholders(deleteObjectUuids)})`, deleteObjectUuids.concat(deleteObjectUuids));
    run(db, `DELETE FROM universal_object_timeline WHERE object_uuid IN (${placeholders(deleteObjectUuids)})`, deleteObjectUuids);
    run(db, `DELETE FROM universal_objects WHERE universal_uuid IN (${placeholders(deleteObjectUuids)})`, deleteObjectUuids);
  }

  // Finally remove non-keeper orders and customer profiles themselves.
  if (nonKeeperOrderIds.length) run(db, `DELETE FROM orders WHERE id IN (${placeholders(nonKeeperOrderIds)})`, nonKeeperOrderIds);
  run(db, "DELETE FROM users WHERE id != ?", [keeper.id]);

  db.exec("COMMIT;");
} catch (error) {
  try { db.exec("ROLLBACK;"); } catch {}
  throw error;
} finally {
  db.exec("PRAGMA foreign_keys = ON;");
}

const after = {
  users: count(db, "users"),
  orders: count(db, "orders"),
  sessions: count(db, "auth_sessions"),
  conversations: count(db, "conversations"),
  messages: count(db, "conversation_messages"),
  notifications: count(db, "notifications"),
  invoices: count(db, "invoices")
};
const remainingUsers = rows(db, "SELECT id, name, phone, email FROM users ORDER BY id");
const remainingOrders = rows(db, "SELECT id, order_id, user_id, status FROM orders ORDER BY id");
console.log(JSON.stringify({ applied: true, backupPath, keeper: { id: keeper.id, name: keeper.name, phone: keeper.phone }, before, after, remainingUsers, remainingOrders }, null, 2));
db.close();
