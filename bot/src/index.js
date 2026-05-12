import chalk from 'chalk';
import { ethers } from 'ethers';
import { config, validateConfig } from './config.js';
import { initWallets } from './wallet.js';
import { createWalletLogger, logger } from './logger.js';
import {
  bridgeLiteforgeToSepolia,
  bridgeSepoliaToLiteforge,
  bridgeBaseSepoliaToLiteforge,
  bridgeLiteforgeToBaseSepolia,
  sleep,
} from './bridge.js';

// ============================================================
//  Banner
// ============================================================
function printBanner() {
  console.log(chalk.hex('#FF6B9D').bold(`
  ╔═══════════════════════════════════════════════════════════╗
  ║           🌉  LitVM Auto Bridge Bot  🌉                  ║
  ║                                                           ║
  ║   LiteForge ↔ Sepolia  ·  LiteForge ↔ Base Sepolia        ║
  ║          3 Wallets  ·  Parallel  ·  Loop                  ║
  ╚═══════════════════════════════════════════════════════════╝
  `));
}

// ============================================================
//  Print wallet balances
// ============================================================
async function printBalances(wallets) {
  console.log(chalk.dim('\n  ┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.dim('  │') + chalk.bold.white('  Wallet Balances                                        ') + chalk.dim('│'));
  console.log(chalk.dim('  ├─────────────────────────────────────────────────────────┤'));

  for (const w of wallets) {
    try {
      const bal = await w.getBalances();
      const colors = [chalk.hex('#FF6B9D'), chalk.hex('#51CF66'), chalk.hex('#339AF0')];
      const c = colors[w.index % colors.length];

      console.log(chalk.dim('  │') + c(` W${w.index + 1}`) + chalk.gray(` ${w.address.slice(0, 10)}...${w.address.slice(-8)}`) + chalk.dim('        │'));
      console.log(chalk.dim('  │') + chalk.white(`    LiteForge:    ${bal.liteforgeFormatted.padEnd(20)} zkLTC`) + chalk.dim('  │'));
      console.log(chalk.dim('  │') + chalk.white(`    Sepolia:      ${bal.sepoliaFormatted.padEnd(20)} ETH`) + chalk.dim('    │'));
      console.log(chalk.dim('  │') + chalk.white(`    Base Sepolia: ${bal.baseSepoliaFormatted.padEnd(20)} ETH`) + chalk.dim('    │'));

      if (w.index < wallets.length - 1) {
        console.log(chalk.dim('  │─────────────────────────────────────────────────────────│'));
      }
    } catch (err) {
      console.log(chalk.dim('  │') + chalk.red(` W${w.index + 1} Error: ${err.message.slice(0, 48)}`) + chalk.dim('│'));
    }
  }

  console.log(chalk.dim('  └─────────────────────────────────────────────────────────┘\n'));
}

// ============================================================
//  Single wallet bridge loop
// ============================================================
async function walletBridgeLoop(walletSet, walletIndex) {
  const log = createWalletLogger(walletIndex);
  let cycle = 0;

  log.info(`🔄 Starting bridge loop for wallet ${walletSet.address.slice(0, 10)}...`);

  // Add a small stagger delay so wallets don't all hit RPC at the exact same time
  await sleep(walletIndex * 2000);

  while (true) {
    cycle++;
    log.divider();
    log.info(`🔄 === CYCLE ${cycle} START ===`);

    // Route 1: LiteForge → Sepolia
    try {
      log.info(`📍 Route 1/4: LiteForge → Sepolia`);
      const ok = await bridgeLiteforgeToSepolia(walletSet, log);
      if (ok) {
        log.success(`Route 1 completed successfully!`);
      } else {
        log.warn(`Route 1 skipped or timed out`);
      }
    } catch (err) {
      log.error(`Route 1 failed: ${err.message}`);
    }

    await sleep(config.delayBetweenRoutesMs);

    // Route 2: Sepolia → LiteForge
    try {
      log.info(`📍 Route 2/4: Sepolia → LiteForge`);
      const ok = await bridgeSepoliaToLiteforge(walletSet, log);
      if (ok) {
        log.success(`Route 2 completed successfully!`);
      } else {
        log.warn(`Route 2 skipped or timed out`);
      }
    } catch (err) {
      log.error(`Route 2 failed: ${err.message}`);
    }

    await sleep(config.delayBetweenRoutesMs);

    // Route 3: LiteForge → Base Sepolia
    try {
      log.info(`📍 Route 3/4: LiteForge → Base Sepolia`);
      const ok = await bridgeLiteforgeToBaseSepolia(walletSet, log);
      if (ok) {
        log.success(`Route 3 completed successfully!`);
      } else {
        log.warn(`Route 3 skipped or timed out`);
      }
    } catch (err) {
      log.error(`Route 3 failed: ${err.message}`);
    }

    await sleep(config.delayBetweenRoutesMs);

    // Route 4: Base Sepolia → LiteForge
    try {
      log.info(`📍 Route 4/4: Base Sepolia → LiteForge`);
      const ok = await bridgeBaseSepoliaToLiteforge(walletSet, log);
      if (ok) {
        log.success(`Route 4 completed successfully!`);
      } else {
        log.warn(`Route 4 skipped or timed out`);
      }
    } catch (err) {
      log.error(`Route 4 failed: ${err.message}`);
    }

    log.success(`🔄 === CYCLE ${cycle} COMPLETE ===`);

    // Delay before next loop
    log.info(`💤 Sleeping ${config.delayBetweenLoopsMs / 1000}s before next cycle...`);
    await sleep(config.delayBetweenLoopsMs);
  }
}

// ============================================================
//  Main
// ============================================================
async function main() {
  printBanner();

  // Validate config
  try {
    validateConfig();
    logger.success('Configuration validated');
  } catch (err) {
    logger.error(err.message);
    logger.error('Copy .env.example to .env and fill in your wallet private keys');
    process.exit(1);
  }

  // Config summary
  logger.info(`Wallets configured: ${config.wallets.length}`);
  logger.info(`Bridge amount: ${config.bridgeAmountMin} - ${config.bridgeAmountMax} (random)`);
  logger.info(`Relayer wait timeout: ${config.relayerWaitTimeoutMs / 1000}s`);
  logger.info(`Delay between routes: ${config.delayBetweenRoutesMs / 1000}s`);
  logger.info(`Delay between loops: ${config.delayBetweenLoopsMs / 1000}s`);

  // Initialize wallets
  const wallets = initWallets();
  logger.success(`Initialized ${wallets.length} wallet(s)`);

  // Print balances
  await printBalances(wallets);

  // Launch parallel workers
  logger.info(chalk.bold('🚀 Launching parallel bridge workers...\n'));

  const workers = wallets.map((w, i) => walletBridgeLoop(w, i));

  // Run all workers in parallel (they loop forever)
  await Promise.all(workers);
}

// ============================================================
//  Graceful shutdown
// ============================================================
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${chalk.yellow(`⚠ ${signal} received, shutting down...`)}`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

// Start
main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
