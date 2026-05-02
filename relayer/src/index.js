import { config, validateConfig } from './config.js';
import { logger } from './utils/logger.js';
import { checkBalances } from './utils/provider.js';
import { TxQueue } from './queue/txQueue.js';
import { LiteforgeListener } from './listeners/liteforgeListener.js';
import { SepoliaListener } from './listeners/sepoliaListener.js';
import { MintExecutor } from './executors/mintExecutor.js';
import { UnlockExecutor } from './executors/unlockExecutor.js';

/**
 * LitVM Bridge Relayer
 *
 * Orchestrates the cross-chain bridge between LiteForge and Sepolia:
 * 1. Listens for Locked events on LiteForge → Mints wzkLTC on Sepolia
 * 2. Listens for Burned events on Sepolia → Unlocks zkLTC on LiteForge
 */

let txQueue;
let liteforgeListener;
let sepoliaListener;
let mintExecutor;
let unlockExecutor;
let executorTimer;
let retryTimer;
let statsTimer;
let shuttingDown = false;

/**
 * Process pending transactions from the queue
 */
async function processQueue() {
  if (shuttingDown) return;

  try {
    const pending = txQueue.getPendingTransactions();

    for (const tx of pending) {
      if (shuttingDown) break;

      if (tx.type === 'MINT') {
        await mintExecutor.execute(tx);
      } else if (tx.type === 'UNLOCK') {
        await unlockExecutor.execute(tx);
      } else {
        logger.warn(`Unknown transaction type: ${tx.type}`, { id: tx.id });
      }

      // Small delay between transactions to avoid nonce issues
      await sleep(1000);
    }
  } catch (error) {
    logger.error(`Queue processing error: ${error.message}`);
  }
}

/**
 * Retry failed transactions
 */
function processRetries() {
  if (shuttingDown) return;

  try {
    const retried = txQueue.retryFailed();
    if (retried > 0) {
      logger.info(`Moved ${retried} failed transactions to retry queue`);
    }
  } catch (error) {
    logger.error(`Retry processing error: ${error.message}`);
  }
}

/**
 * Log queue statistics
 */
function logStats() {
  if (shuttingDown) return;

  try {
    const stats = txQueue.getStats();
    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    if (total > 0) {
      logger.info(`Queue stats`, stats);
    }
  } catch (error) {
    logger.error(`Stats error: ${error.message}`);
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received, shutting down gracefully...`);

  // Stop listeners
  if (liteforgeListener) liteforgeListener.stop();
  if (sepoliaListener) sepoliaListener.stop();

  // Clear timers
  if (executorTimer) clearInterval(executorTimer);
  if (retryTimer) clearInterval(retryTimer);
  if (statsTimer) clearInterval(statsTimer);

  // Close database
  if (txQueue) txQueue.close();

  logger.info('Relayer shutdown complete');
  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║         LitVM Bridge Relayer              ║
  ║   LiteForge (zkLTC) ↔ Sepolia (wzkLTC)   ║
  ╚═══════════════════════════════════════════╝
  `);

  // Validate configuration
  try {
    validateConfig();
  } catch (error) {
    logger.error(error.message);
    logger.error('Please copy .env.example to .env and fill in the values');
    process.exit(1);
  }

  logger.info('Configuration validated');

  // Check relayer balances
  try {
    await checkBalances();
  } catch (error) {
    logger.error(`Failed to check balances: ${error.message}`);
    logger.warn('Continuing anyway - RPC might be temporarily unavailable');
  }

  // Initialize transaction queue
  txQueue = new TxQueue();

  // Initialize listeners
  liteforgeListener = new LiteforgeListener(txQueue);
  sepoliaListener = new SepoliaListener(txQueue);

  // Initialize executors
  mintExecutor = new MintExecutor(txQueue);
  unlockExecutor = new UnlockExecutor(txQueue);

  // Start listeners
  logger.info('Starting event listeners...');
  await Promise.all([
    liteforgeListener.start(),
    sepoliaListener.start(),
  ]);

  // Start queue processor (every 5 seconds)
  executorTimer = setInterval(processQueue, config.pollIntervalMs);

  // Start retry processor (every 30 seconds)
  retryTimer = setInterval(processRetries, 30000);

  // Log stats every 60 seconds
  statsTimer = setInterval(logStats, 60000);

  logger.info('Relayer is running!');
  logger.info(`Poll interval: ${config.pollIntervalMs}ms`);
  logger.info(`Confirmation blocks: ${config.confirmationBlocks}`);
  logger.info(`Max retries: ${config.maxRetries}`);
}

// Graceful shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

// Start
main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
