"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

const { config } = require("./config");

function resolveDatabasePath(databasePath = config.databaseUrl) {
  if (!databasePath) throw new Error("Database path is required.");
  if (String(databasePath).startsWith("file:")) {
    return new URL(String(databasePath));
  }
  return path.resolve(String(databasePath));
}

function defaultBackupDir(resolvedDatabasePath) {
  if (resolvedDatabasePath instanceof URL) {
    return path.join(path.dirname(fileURLToPath(resolvedDatabasePath)), "backups");
  }
  return path.join(path.dirname(resolvedDatabasePath), "backups");
}

function toFilesystemPath(resolvedDatabasePath) {
  return resolvedDatabasePath instanceof URL ? fileURLToPath(resolvedDatabasePath) : resolvedDatabasePath;
}

function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfExists(sourcePath, targetPath) {
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    return true;
  }
  return false;
}

function backup(options = {}) {
  const resolvedDatabasePath = resolveDatabasePath(options.databasePath);
  const databaseFilePath = toFilesystemPath(resolvedDatabasePath);
  const backupDir = path.resolve(options.backupDir || defaultBackupDir(resolvedDatabasePath));
  const prefix = options.prefix || path.basename(databaseFilePath, path.extname(databaseFilePath));
  const timestamp = options.timestamp || formatTimestamp();

  if (!fs.existsSync(databaseFilePath)) {
    throw new Error(`Database file not found: ${databaseFilePath}`);
  }

  ensureDir(backupDir);

  const extension = path.extname(databaseFilePath) || ".sqlite";
  const backupFileName = `${prefix}-${timestamp}${extension}`;
  const backupPath = path.join(backupDir, backupFileName);
  fs.copyFileSync(databaseFilePath, backupPath);

  const walCopied = copyIfExists(`${databaseFilePath}-wal`, `${backupPath}-wal`);
  const shmCopied = copyIfExists(`${databaseFilePath}-shm`, `${backupPath}-shm`);

  return {
    backupDir,
    backupFileName,
    backupPath,
    databaseFilePath,
    walCopied,
    shmCopied,
    createdAt: new Date().toISOString()
  };
}

function listBackups(backupDir, prefix) {
  const resolvedDatabasePath = resolveDatabasePath();
  const dirPath = path.resolve(backupDir || defaultBackupDir(resolvedDatabasePath));
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith(".sqlite") && (!prefix || fileName.startsWith(prefix)))
    .sort()
    .reverse();
}

function verify(backupFileName, options = {}) {
  const resolvedDatabasePath = resolveDatabasePath(options.databasePath);
  const backupDir = path.resolve(options.backupDir || defaultBackupDir(resolvedDatabasePath));
  const backupPath = path.join(backupDir, backupFileName);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  const stats = fs.statSync(backupPath);
  return {
    backupPath,
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    exists: true
  };
}

function restore(backupFileName, options = {}) {
  const resolvedDatabasePath = resolveDatabasePath(options.databasePath);
  const databaseFilePath = toFilesystemPath(resolvedDatabasePath);
  const backupDir = path.resolve(options.backupDir || defaultBackupDir(resolvedDatabasePath));
  const backupPath = path.join(backupDir, backupFileName);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  ensureDir(path.dirname(databaseFilePath));
  fs.copyFileSync(backupPath, databaseFilePath);
  copyIfExists(`${backupPath}-wal`, `${databaseFilePath}-wal`);
  copyIfExists(`${backupPath}-shm`, `${databaseFilePath}-shm`);

  return {
    backupPath,
    databaseFilePath,
    restoredAt: new Date().toISOString()
  };
}

function scheduleDaily(options = {}) {
  const hour = Number.isFinite(Number(options.hour)) ? Number(options.hour) : 3;
  const minute = Number.isFinite(Number(options.minute)) ? Number(options.minute) : 0;
  const intervalMs = 60 * 1000;
  const timer = setInterval(() => {
    const now = new Date();
    if (now.getHours() === hour && now.getMinutes() === minute) {
      backup(options);
    }
  }, intervalMs);
  return timer;
}

module.exports = {
  resolveDatabasePath,
  backup,
  listBackups,
  verify,
  restore,
  scheduleDaily
};

if (require.main === module) {
  const [, , command = "backup", arg] = process.argv;
  try {
    if (command === "backup") {
      const result = backup();
      console.log(`Backup created: ${result.backupPath}`);
    } else if (command === "list") {
      const backups = listBackups();
      backups.forEach((fileName, index) => {
        console.log(`${index + 1}. ${fileName}`);
      });
    } else if (command === "verify") {
      if (!arg) throw new Error("Provide a backup file name to verify.");
      const result = verify(arg);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === "restore") {
      if (!arg) throw new Error("Provide a backup file name to restore.");
      const result = restore(arg);
      console.log(`Backup restored: ${result.backupPath} -> ${result.databaseFilePath}`);
    } else {
      throw new Error(`Unsupported command: ${command}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
