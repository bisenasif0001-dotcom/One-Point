"use strict";

const db = require("./db");
const { safeString, toPaise, fromPaise } = require("./utils");

const VALID_TYPES = new Set(["service", "product"]);

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeType(value) {
  const type = String(value || "service").toLowerCase();
  if (!VALID_TYPES.has(type)) throw new Error("Invalid catalog type.");
  return type;
}

function parseDocs(value) {
  if (Array.isArray(value)) {
    return value.map((doc) => safeString(doc, 80)).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseDocs(parsed);
    } catch {
      return trimmed.split(",").map((doc) => safeString(doc, 80)).filter(Boolean);
    }
  }
  return [];
}

function readDocs(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function activeValue(value) {
  if (value === false || value === 0 || value === "0" || String(value).toLowerCase() === "false") return 0;
  return 1;
}

function publicService(row) {
  return {
    type: "service",
    slug: row.slug,
    name: row.name,
    category: row.category,
    price: fromPaise(row.price_paise),
    taxRate: Number(row.tax_rate || 0),
    active: Boolean(row.active),
    duration: row.duration || "",
    icon: row.icon || "layers",
    sla: row.sla || "",
    requiredDocs: readDocs(row.required_docs_json),
    automationCount: Number(row.automation_count || 0),
    imageUrl: ""
  };
}

function publicProduct(row) {
  return {
    type: "product",
    slug: row.slug,
    name: row.name,
    category: row.category,
    price: fromPaise(row.price_paise),
    taxRate: Number(row.tax_rate || 0),
    active: Boolean(row.active),
    duration: row.duration || "",
    icon: row.icon || "shopping-bag",
    sla: row.sla || "",
    requiredDocs: readDocs(row.required_docs_json),
    automationCount: Number(row.automation_count || 0),
    imageUrl: row.image_url || ""
  };
}

function listCatalog({ includeInactive = false } = {}) {
  const activeClause = includeInactive ? "" : "WHERE active = 1";
  const services = db.all(`
    SELECT slug, name, category, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count
    FROM services
    ${activeClause}
    ORDER BY category COLLATE NOCASE, name COLLATE NOCASE
  `).map(publicService);

  const products = db.all(`
    SELECT slug, name, category, image_url, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count
    FROM products
    ${activeClause}
    ORDER BY category COLLATE NOCASE, name COLLATE NOCASE
  `).map(publicProduct);

  return {
    services,
    products,
    categories: Array.from(new Set([...services, ...products].map((item) => item.category))).sort((a, b) => a.localeCompare(b)),
    updatedAt: new Date().toISOString()
  };
}

function upsertCatalogItem(input = {}) {
  const type = normalizeType(input.type);
  const name = safeString(input.name, 120);
  const category = safeString(input.category, 80);
  if (!name) throw new Error("Catalog item name is required.");
  if (!category) throw new Error("Catalog category is required.");

  const slug = slugify(input.slug || name);
  if (!slug) throw new Error("Catalog slug is required.");

  const price = Math.max(0, Number(input.price || 0));
  const taxRate = Math.max(0, Number(input.taxRate || 0));
  const duration = safeString(input.duration, 40);
  const icon = safeString(input.icon, 40);
  const sla = safeString(input.sla, 20);
  const requiredDocs = parseDocs(input.requiredDocs);
  const automationCount = Math.max(0, Number.parseInt(input.automationCount || 0, 10) || 0);
  const active = activeValue(input.active);

  if (type === "service") {
    db.run(
      `
      INSERT INTO services (slug, name, category, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        price_paise = excluded.price_paise,
        tax_rate = excluded.tax_rate,
        active = excluded.active,
        duration = excluded.duration,
        icon = excluded.icon,
        sla = excluded.sla,
        required_docs_json = excluded.required_docs_json,
        automation_count = excluded.automation_count
      `,
      [slug, name, category, toPaise(price), taxRate, active, duration, icon, sla, JSON.stringify(requiredDocs), automationCount]
    );
    return publicService(db.get("SELECT * FROM services WHERE slug = ?", [slug]));
  }

  const imageUrl = safeString(input.imageUrl || input.image, 500);
  db.run(
    `
    INSERT INTO products (slug, name, category, image_url, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      image_url = excluded.image_url,
      price_paise = excluded.price_paise,
      tax_rate = excluded.tax_rate,
      active = excluded.active,
      duration = excluded.duration,
      icon = excluded.icon,
      sla = excluded.sla,
      required_docs_json = excluded.required_docs_json,
      automation_count = excluded.automation_count
    `,
    [slug, name, category, imageUrl, toPaise(price), taxRate, active, duration, icon, sla, JSON.stringify(requiredDocs), automationCount]
  );
  return publicProduct(db.get("SELECT * FROM products WHERE slug = ?", [slug]));
}

function deleteCatalogItem(input = {}) {
  const type = normalizeType(input.type);
  const slug = slugify(input.slug);
  if (!slug) throw new Error("Catalog slug is required.");

  const table = type === "service" ? "services" : "products";
  const result = db.run(`UPDATE ${table} SET active = 0 WHERE slug = ?`, [slug]);
  if (!result.changes) throw new Error("Catalog item not found.");
  return { ok: true, type, slug, active: false };
}

module.exports = {
  listCatalog,
  upsertCatalogItem,
  deleteCatalogItem
};
