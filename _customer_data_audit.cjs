"use strict";

const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("backend/data/opds-payments.sqlite", { readOnly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name);
const users = db.prepare("SELECT id, name, phone, email, auth_provider, created_at, updated_at FROM users ORDER BY id").all();
const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map((column) => column.name);
const orderProjection = ["id", "order_id", "user_id", "status", "created_at"].filter((column) => orderColumns.includes(column));
const orders = db.prepare(`SELECT ${orderProjection.map((column) => JSON.stringify(column)).join(", ")} FROM orders ORDER BY id`).all();

const relatedTables = tables.map((table) => {
  const columns = db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all().map((column) => column.name);
  const links = columns.filter((name) => /(^|_)(user|customer|order)(_|id|$)/i.test(name));
  return links.length ? { table, links, count: db.prepare(`SELECT COUNT(*) AS count FROM ${JSON.stringify(table)}`).get().count } : null;
}).filter(Boolean);

const nonEmptyTables = tables.map((table) => ({
  table,
  count: db.prepare(`SELECT COUNT(*) AS count FROM ${JSON.stringify(table)}`).get().count,
  columns: db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all().map((column) => column.name),
  foreignKeys: db.prepare(`PRAGMA foreign_key_list(${JSON.stringify(table)})`).all().map((key) => ({ from: key.from, table: key.table, to: key.to }))
})).filter((row) => row.count > 0);

console.log(JSON.stringify({ users, orders, relatedTables, nonEmptyTables }, null, 2));
db.close();
