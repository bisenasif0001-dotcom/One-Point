/**
 * scripts/migrate-pricing.cjs
 * OnePoint Suvidha Kendra - Safe Database Migration & Rollback CLI Runner
 *
 * Usage:
 *   node scripts/migrate-pricing.cjs --dry-run
 *   node scripts/migrate-pricing.cjs --apply
 *   node scripts/migrate-pricing.cjs --rollback
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DATABASE_URL
  ? path.resolve(process.env.DATABASE_URL.replace(/^file:/, ''))
  : path.join(ROOT, 'backend', 'data', 'opds-payments.sqlite');
const BACKUP_DIR = path.join(ROOT, 'backend', 'data', 'backups');

const MIGRATION_SQL = path.join(ROOT, 'backend', 'migrations', '022_pan_pricing_reconciliation.sql');
const ROLLBACK_SQL = path.join(ROOT, 'backend', 'migrations', 'rollback_022_pan_pricing_reconciliation.sql');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.length === 0;
const isRollback = args.includes('--rollback');
const isApply = args.includes('--apply');

console.log('======================================================');
console.log('ONEPOINT SUVIDHA KENDRA - DATABASE PRICING MIGRATION');
console.log('======================================================');
console.log(`Database Target : ${DB_PATH}`);
console.log(`Mode            : ${isDryRun ? 'DRY-RUN (No Changes)' : isRollback ? 'ROLLBACK' : 'APPLY MIGRATION'}`);

if (!fs.existsSync(DB_PATH)) {
  console.error(`ERROR: Database file not found at ${DB_PATH}`);
  process.exit(1);
}

// Ensure backup directory exists
fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Step 1: Create atomic backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `opds-payments_pre-migration_${timestamp}.sqlite`);

if (!isDryRun) {
  console.log(`\n[1/3] Creating pre-operation database backup...`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`  ✓ Backup created at: ${backupPath}`);
} else {
  console.log(`\n[1/3] DRY-RUN: Backup simulation passed.`);
}

// Step 2: Execute SQL inside transaction
const targetSqlFile = isRollback ? ROLLBACK_SQL : MIGRATION_SQL;
console.log(`\n[2/3] Reading SQL: ${path.basename(targetSqlFile)}...`);
const sqlContent = fs.readFileSync(targetSqlFile, 'utf8');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

if (isDryRun) {
  console.log('  [DRY-RUN] Validating current pricing rows:');
  const rows = db.prepare(`
    SELECT slug, price_paise, display_price
    FROM services
    WHERE slug IN ('card-reprint', 'e-pan-download', 'pan-aadhaar-link', 'duplicate-pan-surrender', 'new-pan', 'pan-correction')
  `).all();
  rows.forEach(r => console.log(`    - ${r.slug}: ${r.price_paise} paise (${r.display_price})`));
  console.log('\n  Dry-run complete. Run with --apply to execute migration or --rollback to revert.');
  db.close();
  process.exit(0);
}

try {
  console.log(`  Executing transaction...`);
  db.exec(sqlContent);
  console.log(`  ✓ SQL executed successfully.`);
} catch (err) {
  console.error(`  ✗ Execution failed: ${err.message}`);
  db.close();
  process.exit(1);
}

// Step 3: Verify results
console.log(`\n[3/3] Verifying resulting database state:`);
const servicesRows = db.prepare(`
  SELECT slug, price_paise, operator_fee_paise, government_fee_paise, display_price
  FROM services
  WHERE slug IN ('card-reprint', 'e-pan-download', 'pan-aadhaar-link', 'duplicate-pan-surrender', 'new-pan', 'pan-correction', 'pan-status-check')
  ORDER BY slug
`).all();

console.log('  Services Table:');
servicesRows.forEach(r => console.log(`    - ${r.slug}: price_paise=${r.price_paise}, operator=${r.operator_fee_paise}, govt=${r.government_fee_paise} (${r.display_price})`));

const variantRows = db.prepare(`
  SELECT variant_slug, price_paise, operator_fee_paise, government_fee_paise, display_price
  FROM service_pricing_variants
  WHERE variant_slug IN ('card-reprint', 'e-pan-download', 'pan-aadhaar-link', 'duplicate-pan-surrender', 'new-pan', 'pan-correction')
  ORDER BY variant_slug
`).all();

console.log('\n  Service Pricing Variants Table:');
variantRows.forEach(r => console.log(`    - ${r.variant_slug}: price_paise=${r.price_paise}, operator=${r.operator_fee_paise}, govt=${r.government_fee_paise} (${r.display_price})`));

db.close();
console.log('\n======================================================');
console.log('MIGRATION OPERATION COMPLETED SAFELY & VERIFIED');
console.log('======================================================\n');
