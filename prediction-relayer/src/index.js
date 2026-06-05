import config from './config.js';
import logger from './utils/logger.js';
import { startListener, stopListener } from './listeners/market-listener.js';
import { startAutoClose, stopAutoClose } from './services/auto-close.js';
import { startAdminApi } from './admin/admin-api.js';

logger.info('=================================');
logger.info('  Rivalis Relayer Starting...');
logger.info('=================================');
logger.info(`Contract: ${config.contractAddress}`);
logger.info(`RPC: ${config.rpcUrlPrimary}`);
logger.info(`Poll interval: ${config.pollIntervalMs}ms`);
logger.info(`Block chunk size: ${config.blockChunkSize}`);

// Start all services
startListener();
startAutoClose();
startAdminApi();

// Graceful shutdown
function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  stopListener();
  stopAutoClose();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: reason?.message || reason });
});
