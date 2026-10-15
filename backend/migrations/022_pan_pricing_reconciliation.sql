-- Migration 022: Final Approved PAN Pricing Reconciliation
-- OnePoint Suvidha Kendra - Production Pricing Synchronization
-- Idempotent, transaction-safe, preserves customer orders and transaction history.
-- Effective Date: 15 October 2026

BEGIN TRANSACTION;

-- 1. Synchronize 'services' Table
UPDATE services
SET price_paise = 10000,
    operator_fee_paise = 10000,
    government_fee_paise = 0,
    display_price = 'Rs. 100',
    last_updated = '2026-10-15'
WHERE slug = 'card-reprint';

UPDATE services
SET price_paise = 15000,
    operator_fee_paise = 15000,
    government_fee_paise = 0,
    display_price = 'Rs. 150',
    last_updated = '2026-10-15'
WHERE slug = 'e-pan-download';

UPDATE services
SET price_paise = 10000,
    operator_fee_paise = 10000,
    government_fee_paise = 0,
    display_price = 'Rs. 100',
    last_updated = '2026-10-15'
WHERE slug = 'pan-aadhaar-link';

UPDATE services
SET price_paise = 25000,
    operator_fee_paise = 25000,
    government_fee_paise = 0,
    display_price = 'Rs. 250',
    last_updated = '2026-10-15'
WHERE slug = 'duplicate-pan-surrender';

UPDATE services
SET price_paise = 22000,
    operator_fee_paise = 11300,
    government_fee_paise = 10700,
    display_price = 'Rs. 220',
    last_updated = '2026-10-15'
WHERE slug = 'new-pan';

UPDATE services
SET price_paise = 25000,
    operator_fee_paise = 14300,
    government_fee_paise = 10700,
    display_price = 'Rs. 250',
    last_updated = '2026-10-15'
WHERE slug = 'pan-correction';

UPDATE services
SET price_paise = 0,
    operator_fee_paise = 0,
    government_fee_paise = 0,
    display_price = 'Free',
    last_updated = '2026-10-15'
WHERE slug = 'pan-status-check';

-- 2. Synchronize 'service_pricing_variants' Table
UPDATE service_pricing_variants
SET price_paise = 10000,
    operator_fee_paise = 10000,
    government_fee_paise = 0,
    display_price = 'Rs. 100',
    last_updated = '2026-10-15'
WHERE variant_slug = 'card-reprint';

UPDATE service_pricing_variants
SET price_paise = 15000,
    operator_fee_paise = 15000,
    government_fee_paise = 0,
    display_price = 'Rs. 150',
    last_updated = '2026-10-15'
WHERE variant_slug = 'e-pan-download';

UPDATE service_pricing_variants
SET price_paise = 10000,
    operator_fee_paise = 10000,
    government_fee_paise = 0,
    display_price = 'Rs. 100',
    last_updated = '2026-10-15'
WHERE variant_slug = 'pan-aadhaar-link';

UPDATE service_pricing_variants
SET price_paise = 25000,
    operator_fee_paise = 25000,
    government_fee_paise = 0,
    display_price = 'Rs. 250',
    last_updated = '2026-10-15'
WHERE variant_slug = 'duplicate-pan-surrender';

UPDATE service_pricing_variants
SET price_paise = 22000,
    operator_fee_paise = 11300,
    government_fee_paise = 10700,
    display_price = 'Rs. 220',
    last_updated = '2026-10-15'
WHERE variant_slug = 'new-pan';

UPDATE service_pricing_variants
SET price_paise = 25000,
    operator_fee_paise = 14300,
    government_fee_paise = 10700,
    display_price = 'Rs. 250',
    last_updated = '2026-10-15'
WHERE variant_slug = 'pan-correction';

COMMIT;
