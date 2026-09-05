"use strict";

const db = require("./db");
const { safeString, toPaise, fromPaise } = require("./utils");
const pricingEngine = require("./pricing-engine");
const serviceEngine = require("./service-engine");

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

function publicService(row, { includeInternal = false } = {}) {
  const serviceRow = serviceEngine.applyActiveServiceDnaToPricingRow(row);
  const pricing = includeInternal
    ? pricingEngine.internalPricingPayload(serviceRow)
    : pricingEngine.publicPricingPayload(serviceRow);
  const serviceDna = serviceEngine.publicServiceDna(row.slug);
  const payload = {
    type: "service",
    slug: row.slug,
    name: row.name,
    category: row.category,
    subCategory: row.sub_category || "",
    variant: row.variant || "Standard",
    price: pricing.payableAmount,
    displayPrice: pricing.displayPrice,
    pricingModel: pricing.model,
    pricing,
    taxRate: Number(row.tax_rate || 0),
    active: Boolean(row.active),
    duration: row.duration || "",
    icon: row.icon || "layers",
    sla: row.sla || "",
    requiredDocs: readDocs(row.required_docs_json),
    automationCount: Number(row.automation_count || 0),
    imageUrl: "",
    object: db.getUniversalObjectPayload("services", row.id),
    serviceDna
  };
  if (includeInternal) {
    payload.governmentFee = pricing.governmentFee;
    payload.operatorFee = pricing.operatorFee;
    payload.convenienceFee = pricing.convenienceFee;
    payload.gstRate = pricing.gstRate;
    payload.offerPrice = pricing.offerPrice;
    payload.popular = Boolean(row.popular);
    payload.featured = Boolean(row.featured);
    payload.homepageVisibility = Boolean(row.homepage_visibility);
    payload.internalNotes = row.internal_notes || "";
    payload.lastUpdated = row.last_updated || "";
  }
  return payload;
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
    imageUrl: row.image_url || "",
    object: db.getUniversalObjectPayload("products", row.id)
  };
}

function publicServiceVariant(row, { includeInternal = false } = {}) {
  const serviceRow = serviceEngine.applyActiveServiceDnaToPricingRow(row);
  const pricing = includeInternal
    ? pricingEngine.internalPricingPayload(serviceRow)
    : pricingEngine.publicPricingPayload(serviceRow);
  const serviceDna = serviceEngine.publicServiceDna(row.parent_slug);
  const payload = {
    type: "service_variant",
    parentSlug: row.parent_slug,
    slug: row.variant_slug,
    serviceName: row.service_name,
    name: row.variant_name,
    category: row.category || "",
    subCategory: row.sub_category || "",
    price: pricing.payableAmount,
    displayPrice: pricing.displayPrice,
    pricingModel: pricing.model,
    pricing,
    active: Boolean(row.active),
    duration: row.duration || "",
    requiredDocs: readDocs(row.required_docs_json),
    status: row.status || "active",
    description: row.description || "",
    object: db.getUniversalObjectPayload("service_pricing_variants", row.id),
    serviceDna
  };
  if (includeInternal) {
    payload.governmentFee = pricing.governmentFee;
    payload.operatorFee = pricing.operatorFee;
    payload.convenienceFee = pricing.convenienceFee;
    payload.gstRate = pricing.gstRate;
    payload.offerPrice = pricing.offerPrice;
    payload.popular = Boolean(row.popular);
    payload.featured = Boolean(row.featured);
    payload.homepageVisibility = Boolean(row.homepage_visibility);
    payload.internalNotes = row.internal_notes || "";
    payload.lastUpdated = row.last_updated || "";
  }
  return payload;
}

function listCatalog({ includeInactive = false, includeInternal = false } = {}) {
  const activeClause = includeInactive ? "" : "WHERE active = 1";
  const services = db.all(`
    SELECT *
    FROM services
    ${activeClause}
    ORDER BY category COLLATE NOCASE, name COLLATE NOCASE
  `).map((row) => publicService(row, { includeInternal }));

  const serviceVariants = db.all(`
    SELECT *
    FROM service_pricing_variants
    ${activeClause}
    ORDER BY parent_slug COLLATE NOCASE, variant_name COLLATE NOCASE
  `).map((row) => publicServiceVariant(row, { includeInternal }));
  const variantsByParent = new Map();
  serviceVariants.forEach((variant) => {
    const list = variantsByParent.get(variant.parentSlug) || [];
    list.push(variant);
    variantsByParent.set(variant.parentSlug, list);
  });
  services.forEach((service) => {
    service.variants = variantsByParent.get(service.slug) || [];
  });

  const products = db.all(`
    SELECT id, slug, name, category, image_url, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count
    FROM products
    ${activeClause}
    ORDER BY category COLLATE NOCASE, name COLLATE NOCASE
  `).map(publicProduct);

  return {
    services,
    serviceVariants,
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
    const hasStructuredPricing = [
      "pricingModel", "governmentFee", "operatorFee", "convenienceFee", "gstRate", "offerPrice",
      "pricing_model", "government_fee", "operator_fee", "convenience_fee", "gst_rate", "offer_price"
    ].some((key) => Object.prototype.hasOwnProperty.call(input, key));
    const pricing = pricingEngine.normalizePricingRecord({
      serviceId: slug,
      serviceName: name,
      category,
      subCategory: safeString(input.subCategory || input.sub_category, 80),
      variant: safeString(input.variant, 80) || "Standard",
      pricingModel: input.pricingModel || input.pricing_model || pricingEngine.PRICING_MODELS.ALL_INCLUSIVE,
      governmentFee: Number(input.governmentFee ?? input.government_fee ?? 0),
      operatorFee: Number(input.operatorFee ?? input.operator_fee ?? (hasStructuredPricing ? 0 : price)),
      convenienceFee: Number(input.convenienceFee ?? input.convenience_fee ?? 0),
      gstRate: Number(input.gstRate ?? input.gst_rate ?? 0),
      offerPrice: input.offerPrice ?? input.offer_price ?? null,
      displayPrice: safeString(input.displayPrice || input.display_price, 80),
      customerPriceNote: safeString(input.customerPriceNote || input.customer_price_note, 300),
      timeline: duration,
      requiredDocs,
      popular: Boolean(input.popular),
      featured: Boolean(input.featured),
      homepageVisibility: Boolean(input.homepageVisibility || input.homepage_visibility),
      internalNotes: safeString(input.internalNotes || input.internal_notes, 500)
    });
    db.run(
      `
      INSERT INTO services (
        slug, name, category, price_paise, tax_rate, active, duration, icon, sla, required_docs_json, automation_count,
        sub_category, variant, pricing_model, government_fee_paise, operator_fee_paise, convenience_fee_paise,
        gst_rate, offer_price_paise, display_price, customer_price_note, internal_notes, popular, featured,
        homepage_visibility, last_updated
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        automation_count = excluded.automation_count,
        sub_category = excluded.sub_category,
        variant = excluded.variant,
        pricing_model = excluded.pricing_model,
        government_fee_paise = excluded.government_fee_paise,
        operator_fee_paise = excluded.operator_fee_paise,
        convenience_fee_paise = excluded.convenience_fee_paise,
        gst_rate = excluded.gst_rate,
        offer_price_paise = excluded.offer_price_paise,
        display_price = excluded.display_price,
        customer_price_note = excluded.customer_price_note,
        internal_notes = excluded.internal_notes,
        popular = excluded.popular,
        featured = excluded.featured,
        homepage_visibility = excluded.homepage_visibility,
        last_updated = excluded.last_updated
      `,
      [
        slug,
        name,
        category,
        pricing.pricePaise,
        0,
        active,
        duration || pricing.timeline,
        icon,
        sla,
        JSON.stringify(requiredDocs),
        automationCount,
        pricing.subCategory,
        pricing.variant || "Standard",
        pricing.pricingModel,
        pricing.governmentFeePaise,
        pricing.operatorFeePaise,
        pricing.convenienceFeePaise,
        pricing.gstRate,
        pricing.offerPricePaise,
        pricing.displayPrice,
        pricing.customerPriceNote,
        pricing.internalNotes,
        pricing.popular ? 1 : 0,
        pricing.featured ? 1 : 0,
        pricing.homepageVisibility ? 1 : 0,
        pricing.lastUpdated
      ]
    );
    const saved = db.get("SELECT * FROM services WHERE slug = ?", [slug]);
    serviceEngine.ensureBaselineServiceDnaForService(saved);
    return publicService(saved, { includeInternal: true });
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
