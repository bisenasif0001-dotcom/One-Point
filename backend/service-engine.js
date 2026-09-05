"use strict";

const db = require("./db");
const serviceConfigurationRepository = require("./repositories/service-configuration-repository");

function getDb() {
  return db.getDb();
}

function getActiveServiceDna(slug) {
  return serviceConfigurationRepository.getActiveServiceDna(getDb(), slug);
}

function listActiveServiceDna() {
  return serviceConfigurationRepository.listActiveServiceDna(getDb());
}

function ensureBaselineServiceDnaForService(row) {
  if (!row || !row.slug) return null;
  try {
    return serviceConfigurationRepository.ensureDraftProfileFromService(getDb(), row);
  } catch (error) {
    console.warn("[service-dna] on-demand sync skipped:", error.message);
    return serviceConfigurationRepository.getActiveServiceDna(getDb(), row.slug);
  }
}

function backfillExistingServices(options = {}) {
  return serviceConfigurationRepository.backfillServiceDna(getDb(), options);
}

function resolveServiceSlug(row = {}) {
  return row.slug || row.parent_slug || row.service_slug || "";
}

function applyActiveServiceDnaToPricingRow(row = {}) {
  if (row.variant_slug && !row.slug) return row;
  const slug = resolveServiceSlug(row);
  if (!slug) return row;
  const dna = getActiveServiceDna(slug);
  const pricingLayer = dna?.layers?.pricing?.config;
  if (!pricingLayer) return row;

  return {
    ...row,
    pricing_model: pricingLayer.pricingModel ?? row.pricing_model,
    government_fee_paise: pricingLayer.governmentFeePaise ?? row.government_fee_paise,
    operator_fee_paise: pricingLayer.operatorFeePaise ?? row.operator_fee_paise,
    convenience_fee_paise: pricingLayer.convenienceFeePaise ?? row.convenience_fee_paise,
    gst_rate: pricingLayer.gstRate ?? row.gst_rate,
    offer_price_paise: pricingLayer.offerPricePaise ?? row.offer_price_paise,
    price_paise: pricingLayer.pricePaise ?? row.price_paise,
    display_price: pricingLayer.displayPrice ?? row.display_price,
    customer_price_note: pricingLayer.customerPriceNote ?? row.customer_price_note,
    serviceDna: dna
  };
}

function publicServiceDna(slug) {
  const dna = getActiveServiceDna(slug);
  if (!dna) return null;
  const documentLayer = dna.documentLayer || {};
  return {
    serviceSlug: dna.serviceSlug,
    serviceCode: dna.serviceCode,
    lifecycleStatus: dna.lifecycleStatus,
    active: dna.active,
    version: dna.version,
    layers: Object.keys(dna.layers || {}),
    documentLayer: {
      required: documentLayer.required || [],
      optional: documentLayer.optional || [],
      conditional: documentLayer.conditional || [],
      evidenceRequired: documentLayer.evidenceRequired || [],
      evidenceRequiredScope: documentLayer.evidenceRequiredScope || "metadata_only"
    }
  };
}

function adminServiceDna(slug) {
  return getActiveServiceDna(slug);
}

function listAdminServiceDna() {
  return listActiveServiceDna();
}

module.exports = {
  getActiveServiceDna,
  listActiveServiceDna,
  ensureBaselineServiceDnaForService,
  backfillExistingServices,
  applyActiveServiceDnaToPricingRow,
  publicServiceDna,
  adminServiceDna,
  listAdminServiceDna
};
