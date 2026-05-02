import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Transaction Queue using SQLite
 *
 * States:
 *   PENDING    → Event detected, ready to execute
 *   EXECUTING  → Transaction submitted to destination chain
 *   COMPLETED  → Successfully executed
 *   FAILED     → Execution failed, will retry
 *   RETRYING   → Retrying after failure
 *   DEAD       → Max retries exceeded, needs manual intervention
 */
export class TxQueue {
  constructor(dbPath = config.dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this._initTables();
  }

  /**
   * Initialize database tables
   */
  _initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        source_tx_hash TEXT NOT NULL,
        source_chain TEXT NOT NULL,
        source_block INTEGER NOT NULL,
        source_nonce INTEGER NOT NULL,
        recipient TEXT NOT NULL,
        amount TEXT NOT NULL,
        dest_tx_hash TEXT,
        retries INTEGER DEFAULT 0,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(source_tx_hash, source_nonce)
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
        chain TEXT PRIMARY KEY,
        block_number INTEGER NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_tx_source ON transactions(source_tx_hash, source_nonce);
    `);

    logger.info('Database initialized');
  }

  // ============================================================
  //  Transaction Operations
  // ============================================================

  /**
   * Add a new transaction to the queue
   * Returns false if already exists (dedup)
   */
  addTransaction({ type, sourceTxHash, sourceChain, sourceBlock, sourceNonce, recipient, amount }) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO transactions (type, source_tx_hash, source_chain, source_block, source_nonce, recipient, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(type, sourceTxHash, sourceChain, sourceBlock, sourceNonce, recipient, amount);

      logger.info(`Queued ${type} transaction`, {
        sourceTxHash: sourceTxHash.slice(0, 10) + '...',
        sourceNonce,
        recipient: recipient.slice(0, 10) + '...',
      });

      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        logger.debug(`Transaction already queued: ${sourceTxHash}:${sourceNonce}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Get all pending transactions ready to execute
   */
  getPendingTransactions() {
    const stmt = this.db.prepare(`
      SELECT * FROM transactions
      WHERE status IN ('PENDING', 'RETRYING')
      ORDER BY created_at ASC
    `);
    return stmt.all();
  }

  /**
   * Mark transaction as executing
   */
  markExecuting(id) {
    const stmt = this.db.prepare(`
      UPDATE transactions
      SET status = 'EXECUTING', updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(id);
  }

  /**
   * Mark transaction as completed
   */
  markCompleted(id, destTxHash) {
    const stmt = this.db.prepare(`
      UPDATE transactions
      SET status = 'COMPLETED', dest_tx_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(destTxHash, id);

    logger.info(`Transaction completed`, { id, destTxHash: destTxHash.slice(0, 10) + '...' });
  }

  /**
   * Mark transaction as failed, increment retry counter
   */
  markFailed(id, error) {
    const tx = this.getTransaction(id);
    if (!tx) return;

    const newRetries = tx.retries + 1;
    const newStatus = newRetries >= config.maxRetries ? 'DEAD' : 'FAILED';

    const stmt = this.db.prepare(`
      UPDATE transactions
      SET status = ?, retries = ?, error = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(newStatus, newRetries, error, id);

    if (newStatus === 'DEAD') {
      logger.error(`Transaction DEAD (max retries exceeded)`, { id, retries: newRetries, error });
    } else {
      logger.warn(`Transaction failed, will retry`, { id, retries: newRetries, error });
    }
  }

  /**
   * Move failed transactions to retrying status
   * Called periodically to retry failed transactions with exponential backoff
   */
  retryFailed() {
    const stmt = this.db.prepare(`
      SELECT * FROM transactions
      WHERE status = 'FAILED'
      ORDER BY updated_at ASC
    `);
    const failed = stmt.all();

    const update = this.db.prepare(`
      UPDATE transactions
      SET status = 'RETRYING', updated_at = datetime('now')
      WHERE id = ?
    `);

    let retried = 0;
    for (const tx of failed) {
      // Exponential backoff: 10s * 2^retries
      const backoffMs = 10000 * Math.pow(2, tx.retries);
      const failedAt = new Date(tx.updated_at).getTime();
      const now = Date.now();

      if (now - failedAt >= backoffMs) {
        update.run(tx.id);
        retried++;
        logger.info(`Retrying transaction`, { id: tx.id, attempt: tx.retries + 1 });
      }
    }

    return retried;
  }

  /**
   * Get a single transaction by ID
   */
  getTransaction(id) {
    const stmt = this.db.prepare('SELECT * FROM transactions WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Get transaction stats
   */
  getStats() {
    const stmt = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM transactions
      GROUP BY status
    `);
    const rows = stmt.all();
    const stats = {};
    for (const row of rows) {
      stats[row.status] = row.count;
    }
    return stats;
  }

  // ============================================================
  //  Checkpoint Operations
  // ============================================================

  /**
   * Get the last processed block for a chain
   */
  getCheckpoint(chain) {
    const stmt = this.db.prepare('SELECT block_number FROM checkpoints WHERE chain = ?');
    const row = stmt.get(chain);
    return row ? row.block_number : null;
  }

  /**
   * Set the last processed block for a chain
   */
  setCheckpoint(chain, blockNumber) {
    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (chain, block_number, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(chain) DO UPDATE SET
        block_number = excluded.block_number,
        updated_at = datetime('now')
    `);
    stmt.run(chain, blockNumber);
  }

  // ============================================================
  //  Cleanup
  // ============================================================

  /**
   * Close database connection
   */
  close() {
    this.db.close();
    logger.info('Database connection closed');
  }
}
