import { ethers } from 'ethers';
import { config } from '../config.js';
import { getLiteforgeWallet } from '../utils/provider.js';
import { logger } from '../utils/logger.js';
import { completeBridgeTransaction } from '../utils/supabase.js';
import BridgeVaultABI from '../abi/BridgeVault.json' with { type: 'json' };

/**
 * Unlock Executor
 * Executes unlock() on BridgeVault contract on LiteForge
 * when wzkLTC is burned on Sepolia.
 *
 * Supports batch execution with manual nonce management for concurrency.
 */
export class UnlockExecutor {
  constructor(txQueue) {
    this.txQueue = txQueue;
    this.wallet = getLiteforgeWallet();
    this.contract = new ethers.Contract(
      config.liteforge.bridgeVaultAddress,
      BridgeVaultABI,
      this.wallet
    );
  }

  /**
   * Execute a batch of unlock transactions in parallel with manual nonce management
   * @param {Object[]} txs - Array of transactions from queue
   */
  async executeBatch(txs) {
    if (!txs.length) return;

    // Get base nonce once for the whole batch
    const baseNonce = await this.wallet.getNonce('pending');

    logger.info(`[UNLOCK Worker] Processing batch of ${txs.length} transactions (baseNonce: ${baseNonce})`);

    const results = await Promise.allSettled(
      txs.map((tx, i) => this._executeSingle(tx, baseNonce + i))
    );

    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        logger.error(`[UNLOCK Worker] Batch item failed`, { id: txs[i].id, error: result.reason?.message });
      }
    });
  }

  /**
   * Execute a single unlock transaction with a specific nonce
   */
  async _executeSingle(tx, nonce) {
    const { id, source_tx_hash, source_nonce, recipient, amount } = tx;

    logger.info(`Executing UNLOCK`, {
      id,
      recipient: recipient.slice(0, 10) + '...',
      amount: ethers.formatEther(amount),
      nonce,
    });

    try {
      // Pre-flight check: verify not already processed on-chain
      const isProcessed = await this.contract.isProcessed(source_tx_hash, source_nonce);
      if (isProcessed) {
        logger.warn(`Unlock already processed on-chain, marking completed`, { id });
        this.txQueue.markCompleted(id, 'already_processed');
        await completeBridgeTransaction(source_tx_hash, source_nonce, 'already_processed');
        return 'already_processed';
      }

      // Pre-flight check: verify vault has enough balance
      const available = await this.contract.availableBalance();
      if (BigInt(amount) > available) {
        throw new Error(`Insufficient vault balance: need ${ethers.formatEther(amount)}, available ${ethers.formatEther(available)}`);
      }

      // Mark as executing
      this.txQueue.markExecuting(id);

      // Execute unlock transaction with manual nonce
      const unlockTx = await this.contract.unlock(
        recipient,
        amount,
        source_tx_hash,
        source_nonce,
        {
          gasLimit: 100000,
          nonce,
        }
      );

      logger.info(`Unlock tx submitted`, { id, txHash: unlockTx.hash });

      // Wait for confirmation
      const receipt = await unlockTx.wait(1);

      if (receipt.status === 1) {
        this.txQueue.markCompleted(id, unlockTx.hash);
        await completeBridgeTransaction(source_tx_hash, source_nonce, unlockTx.hash);
        logger.info(`Unlock CONFIRMED`, {
          id,
          txHash: unlockTx.hash,
          gasUsed: receipt.gasUsed.toString(),
        });
        return unlockTx.hash;
      } else {
        throw new Error('Transaction reverted');
      }
    } catch (error) {
      const errorMsg = error.reason || error.message || 'Unknown error';
      logger.error(`Unlock FAILED`, { id, error: errorMsg });
      this.txQueue.markFailed(id, errorMsg);
      return null;
    }
  }

  /**
   * Backward-compatible single execute method
   */
  async execute(tx) {
    const nonce = await this.wallet.getNonce('pending');
    return this._executeSingle(tx, nonce);
  }
}
