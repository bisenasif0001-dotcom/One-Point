"use strict";

/**
 * backup.js — Database Backup & Recovery Utility
 * ================================================
 * Provides:
 *   - Timestamped SQLite backups
 *   - Backup rotation (configurable retention)
 *   - Integrity verification (SQLite PRAGMA integrity_check)
 *   - Recovery (restore from a named backup)
 *   - CLI usage: node backend/backup.js [backup|list|verify|restore <file>]
 */

const fs   = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

// ── Paths ───────────────────────────────────────────────────────────────────
const ROOT        = path.join(__dirname, "..");
const DB_PATH     = path.join(ROOT, "backend", "data", "opds.db");
const BACKUP_DIR  = path.join(ROOT, "backend", "data", "backups");
const MAX_BACKUPS = Number(process.env.BACKUP_RETENTION || 14); // keep last N backups

// ── Helpers ─────────────────────────────────────────────────────────────────
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** Return sorted list (oldest first) of backup files in BACKUP_DIR */
function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith("opds_backup_") && f.endsWith(".db"))
    .sort();                    // ISO timestamp sort = chronological
}

/** Verify SQLite integrity of a given db file. Returns { ok, details }. */
function verifyIntegrity(dbPath) {
  try {
    const db = new DatabaseSync(dbPath, { open: true });
    const rows = db.prepare("PRAGMA integrity_check").all();
    db.close();
    const ok = rows.length === 1 && rows[0].integrity_check === "ok";
    return { ok, details: rows.map(r => r.integrity_check) };
  } catch (err) {
    return { ok: false, details: [err.message] };
  }
}

// ── Core Operations ──────────────────────────────────────────────────────────

/**
 * Create a timestamped backup of the live database.
 * Uses SQLite VACUUM INTO for a clean, defragmented snapshot.
 * Returns the path to the new backup file.
 */
function backup() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }
  ensureBackupDir();

  const fileName   = `opds_backup_${timestamp()}.db`;
  const backupPath = path.join(BACKUP_DIR, fileName);

  // VACUUM INTO creates a full, consistent copy — safe while DB is in use
  const db = new DatabaseSync(DB_PATH, { open: true });
  try {
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }

  // Verify the new backup is healthy before declaring success
  const check = verifyIntegrity(backupPath);
  if (!check.ok) {
    fs.unlinkSync(backupPath);
    throw new Error(`Backup integrity check failed: ${check.details.join(", ")}`);
  }

  // Rotate old backups
  rotate();

  const stat = fs.statSync(backupPath);
  console.log(`[BACKUP] ✅ Created: ${fileName} (${(stat.size / 1024).toFixed(1)} KB)`);
  return backupPath;
}

/**
 * Remove oldest backups, keeping only the last MAX_BACKUPS files.
 */
function rotate() {
  const all = listBackups();
  if (all.length <= MAX_BACKUPS) return;
  const toDelete = all.slice(0, all.length - MAX_BACKUPS);
  toDelete.forEach(f => {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
    console.log(`[BACKUP] 🗑  Rotated: ${f}`);
  });
}

/**
 * Verify the integrity of the live database (or a specific backup).
 * @param {string} [targetPath] - Optional path override; defaults to live DB.
 */
function verify(targetPath = DB_PATH) {
  const result = verifyIntegrity(targetPath);
  if (result.ok) {
    console.log(`[BACKUP] ✅ Integrity OK: ${path.basename(targetPath)}`);
  } else {
    console.error(`[BACKUP] ❌ Integrity FAILED: ${path.basename(targetPath)}`);
    result.details.forEach(d => console.error("  →", d));
  }
  return result;
}

/**
 * Restore a backup by copying it over the live database.
 * A safety snapshot of the current live DB is taken before overwriting.
 * @param {string} backupFileName - Filename (not full path) inside BACKUP_DIR.
 */
function restore(backupFileName) {
  if (!backupFileName) throw new Error("restore() requires a backup file name.");

  const backupPath = path.join(BACKUP_DIR, backupFileName);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  // Verify backup before restoring
  const check = verifyIntegrity(backupPath);
  if (!check.ok) {
    throw new Error(`Cannot restore — backup integrity check failed: ${check.details.join(", ")}`);
  }

  // Safety: snapshot the current live DB
  if (fs.existsSync(DB_PATH)) {
    const safetyName = `opds_pre_restore_${timestamp()}.db`;
    fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, safetyName));
    console.log(`[BACKUP] 💾 Safety snapshot saved: ${safetyName}`);
  }

  // Overwrite live DB with the chosen backup
  fs.copyFileSync(backupPath, DB_PATH);
  console.log(`[BACKUP] ✅ Restored from: ${backupFileName}`);

  // Final verification
  return verify(DB_PATH);
}

// ── Scheduled backup (call from app startup / cron) ─────────────────────────

/** Schedule automatic daily backups using setInterval. Call once at startup. */
function scheduleDaily() {
  const INTERVAL_MS = 24 * 60 * 60 * 1000;     // 24 hours
  const doBackup = () => {
    try { backup(); }
    catch (err) { console.error("[BACKUP] ❌ Scheduled backup failed:", err.message); }
  };
  doBackup();                                   // immediate first run
  setInterval(doBackup, INTERVAL_MS).unref();   // unref so it won't block process exit
  console.log("[BACKUP] ⏰ Daily backup scheduled.");
}

// ── Module exports ───────────────────────────────────────────────────────────
module.exports = { backup, restore, verify, list: listBackups, scheduleDaily };

// ── CLI interface ────────────────────────────────────────────────────────────
if (require.main === module) {
  const [,, cmd, arg] = process.argv;
  switch (cmd) {
    case "backup":
      backup();
      break;
    case "list": {
      const files = listBackups();
      if (files.length === 0) {
        console.log("[BACKUP] No backups found.");
      } else {
        console.log(`[BACKUP] ${files.length} backup(s) in ${BACKUP_DIR}:`);
        files.forEach((f, i) => {
          const stat = fs.statSync(path.join(BACKUP_DIR, f));
          console.log(`  ${i + 1}. ${f}  (${(stat.size / 1024).toFixed(1)} KB)`);
        });
      }
      break;
    }
    case "verify":
      verify(arg ? path.resolve(arg) : DB_PATH);
      break;
    case "restore":
      if (!arg) { console.error("Usage: node backend/backup.js restore <backupFileName>"); process.exit(1); }
      restore(arg);
      break;
    default:
      console.log("Usage: node backend/backup.js [backup | list | verify [path] | restore <file>]");
  }
}
