import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';

const DB_PATH = path.resolve('./data/checkpoint.db');

let db = null;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoint (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    logger.info(`SQLite checkpoint DB initialized at ${DB_PATH}`);
  }
  return db;
}

export function getLastProcessedBlock(defaultBlock = 0) {
  const row = getDb().prepare('SELECT value FROM checkpoint WHERE key = ?').get('last_processed_block');
  return row ? parseInt(row.value) : defaultBlock;
}

export function setLastProcessedBlock(blockNumber) {
  getDb().prepare(`
    INSERT OR REPLACE INTO checkpoint (key, value, updated_at)
    VALUES ('last_processed_block', ?, datetime('now'))
  `).run(blockNumber.toString());
}

export default { getLastProcessedBlock, setLastProcessedBlock };
