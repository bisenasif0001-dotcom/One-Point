-- Rollback Migration 022: Rollback of PAN Pricing Reconciliation
-- OnePoint Suvidha Kendra - Safe Database Rollback Script
-- Reverts pricing rows to pre-reconciliation values if release rollback is authorized.
-- Preserves all orders, payments, customers, and transaction histories intact.

BEGIN TRANSACTION;

-- 1. Revert 'services' Table
UPDATE services
SET price_paise = 14900,
    operator_fee_paise = 9900,
    government_fee_paise = 5000,
    display_price = 'Rs. 149',
    last_updated = '2026-06-29'
WHERE slug = 'card-reprint';

UPDATE services
SET price_paise = 9900,
    operator_fee_paise = 9900,
    government_fee_paise = 0,
    display_price = 'Rs. 99',
    last_updated = '2026-06-29'
WHERE slug = 'e-pan-download';

UPDATE services
SET price_paise = 9900,
    operator_fee_paise = 9900,
    government_fee_paise = 0,
    display_price = 'Rs. 99',
    last_updated = '2026-06-29'
WHERE slug = 'pan-aadhaar-link';

UPDATE services
SET price_paise = 19900,
    operator_fee_paise = 19900,
    government_fee_paise = 0,
    display_price = 'Rs. 199',
    last_updated = '2026-06-29'
WHERE slug = 'duplicate-pan-surrender';

-- 2. Revert 'service_pricing_variants' Table
UPDATE service_pricing_variants
SET price_paise = 14900,
    operator_fee_paise = 9900,
    government_fee_paise = 5000,
    display_price = 'Rs. 149',
    last_updated = '2026-06-29'
WHERE variant_slug = 'card-reprint';

UPDATE service_pricing_variants
SET price_paise = 9900,
    operator_fee_paise = 9900,
    government_fee_paise = 0,
    display_price = 'Rs. 99',
    last_updated = '2026-06-29'
WHERE variant_slug = 'e-pan-download';

UPDATE service_pricing_variants
SET price_paise = 9900,
    operator_fee_paise = 9900,
    government_fee_paise = 0,
    display_price = 'Rs. 99',
    last_updated = '2026-06-29'
WHERE variant_slug = 'pan-aadhaar-link';

UPDATE service_pricing_variants
SET price_paise = 19900,
    operator_fee_paise = 19900,
    government_fee_paise = 0,
    display_price = 'Rs. 199',
    last_updated = '2026-06-29'
WHERE variant_slug = 'duplicate-pan-surrender';

COMMIT;
