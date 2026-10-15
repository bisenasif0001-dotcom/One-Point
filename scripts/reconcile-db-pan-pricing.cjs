const db = require('../backend/db');

console.log('--- RECONCILING SQLITE PAN PRICING ---');

db.run("BEGIN TRANSACTION");

try {
  // Update services table
  db.run("UPDATE services SET price_paise = 10000, operator_fee_paise = 10000, government_fee_paise = 0, display_price = 'Rs. 100' WHERE slug = 'card-reprint'");
  db.run("UPDATE services SET price_paise = 15000, operator_fee_paise = 15000, government_fee_paise = 0, display_price = 'Rs. 150' WHERE slug = 'e-pan-download'");
  db.run("UPDATE services SET price_paise = 10000, operator_fee_paise = 10000, government_fee_paise = 0, display_price = 'Rs. 100' WHERE slug = 'pan-aadhaar-link'");
  db.run("UPDATE services SET price_paise = 25000, operator_fee_paise = 25000, government_fee_paise = 0, display_price = 'Rs. 250' WHERE slug = 'duplicate-pan-surrender'");

  // Update service_pricing_variants table
  db.run("UPDATE service_pricing_variants SET price_paise = 10000, operator_fee_paise = 10000, government_fee_paise = 0, display_price = 'Rs. 100' WHERE variant_slug = 'card-reprint'");
  db.run("UPDATE service_pricing_variants SET price_paise = 15000, operator_fee_paise = 15000, government_fee_paise = 0, display_price = 'Rs. 150' WHERE variant_slug = 'e-pan-download'");

  // Check if variants exist for pan-aadhaar-link and duplicate-pan-surrender
  const linkVar = db.get("SELECT id FROM service_pricing_variants WHERE variant_slug = 'pan-aadhaar-link'");
  if (linkVar) {
    db.run("UPDATE service_pricing_variants SET price_paise = 10000, operator_fee_paise = 10000, government_fee_paise = 0, display_price = 'Rs. 100' WHERE variant_slug = 'pan-aadhaar-link'");
  } else {
    db.run(`INSERT INTO service_pricing_variants 
      (parent_slug, variant_slug, service_name, variant_name, category, sub_category, pricing_model, government_fee_paise, operator_fee_paise, convenience_fee_paise, gst_rate, price_paise, display_price, customer_price_note, duration, required_docs_json, status, popular, featured, homepage_visibility, description, internal_notes, last_updated, active, created_at)
      VALUES 
      ('pan-card', 'pan-aadhaar-link', 'PAN–Aadhaar Linking & Status Support', 'PAN–Aadhaar Linking & Status Support', 'E-Services', 'Identity', 'all_inclusive', 0, 10000, 0, 0, 10000, 'Rs. 100', 'Operator assistance included.', '1-2 days', '["PAN card","Aadhaar card","Mobile number"]', 'active', 0, 0, 0, 'PAN-Aadhaar linking and status support', 'Reconciled to approved price Rs. 100', '2026-10-15', 1, datetime('now'))`);
  }

  const surrVar = db.get("SELECT id FROM service_pricing_variants WHERE variant_slug = 'duplicate-pan-surrender'");
  if (surrVar) {
    db.run("UPDATE service_pricing_variants SET price_paise = 25000, operator_fee_paise = 25000, government_fee_paise = 0, display_price = 'Rs. 250' WHERE variant_slug = 'duplicate-pan-surrender'");
  } else {
    db.run(`INSERT INTO service_pricing_variants 
      (parent_slug, variant_slug, service_name, variant_name, category, sub_category, pricing_model, government_fee_paise, operator_fee_paise, convenience_fee_paise, gst_rate, price_paise, display_price, customer_price_note, duration, required_docs_json, status, popular, featured, homepage_visibility, description, internal_notes, last_updated, active, created_at)
      VALUES 
      ('pan-card', 'duplicate-pan-surrender', 'Duplicate PAN Surrender Guidance', 'Duplicate PAN Surrender Guidance', 'E-Services', 'Identity', 'all_inclusive', 0, 25000, 0, 0, 25000, 'Rs. 250', 'Legal guidance and affidavit preparation included.', '3-7 days', '["Multiple PAN details","Aadhaar card","AO letter details"]', 'active', 0, 0, 0, 'Duplicate PAN surrender guidance', 'Reconciled to approved price Rs. 250', '2026-10-15', 1, datetime('now'))`);
  }

  db.run("COMMIT");
  console.log('Successfully committed pricing reconciliation in SQLite DB.');
} catch (error) {
  db.run("ROLLBACK");
  console.error('Failed to reconcile SQLite DB:', error);
  process.exit(1);
}

// Verification query
console.log('\n--- VERIFIED SERVICES TABLE ---');
console.log(db.all("SELECT id, slug, name, price_paise, operator_fee_paise, government_fee_paise, display_price FROM services WHERE slug IN ('pan-aadhaar-link', 'duplicate-pan-surrender', 'e-pan-download', 'card-reprint')"));

console.log('\n--- VERIFIED VARIANTS TABLE ---');
console.log(db.all("SELECT id, parent_slug, variant_slug, variant_name, price_paise, operator_fee_paise, government_fee_paise, display_price FROM service_pricing_variants WHERE variant_slug IN ('pan-aadhaar-link', 'duplicate-pan-surrender', 'e-pan-download', 'card-reprint')"));
