import { ethers } from 'ethers';
import { config } from '../config.js';
import { getSepoliaWallet } from '../utils/provider.js';
import { logger } from '../utils/logger.js';
import { completeBridgeTransaction } from '../utils/supabase.js';
import WrappedZkLTCABI from '../abi/WrappedZkLTC.json' with { type: 'json' };

/**
 * Mint Executor
 * Executes mint() on WrappedZkLTC contract on Sepolia
 * when zkLTC is locked on LiteForge.
 *
 * Supports batch execution with manual nonce management for concurrency.
 */
export class MintExecutor {
  constructor(txQueue) {
    this.txQueue = txQueue;
    this.wallet = getSepoliaWallet();
    this.contract = new ethers.Contract(
      config.sepolia.wrappedZkLTCAddress,
      WrappedZkLTCABI,
      this.wallet
    );
  }

  /**
   * Execute a batch of mint transactions in parallel with manual nonce management
   * @param {Object[]} txs - Array of transactions from queue
   */
  async executeBatch(txs) {
    if (!txs.length) return;

    // Get base nonce once for the whole batch
    const baseNonce = await this.wallet.getNonce('pending');

    logger.info(`[MINT Worker] Processing batch of ${txs.length} transactions (baseNonce: ${baseNonce})`);

    const results = await Promise.allSettled(
      txs.map((tx, i) => this._executeSingle(tx, baseNonce + i))
    );

    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        logger.error(`[MINT Worker] Batch item failed`, { id: txs[i].id, error: result.reason?.message });
      }
    });
  }

  /**
   * Execute a single mint transaction with a specific nonce
   */
  async _executeSingle(tx, nonce) {
    const { id, source_tx_hash, source_nonce, recipient, amount } = tx;

    logger.info(`Executing MINT`, {
      id,
      recipient: recipient.slice(0, 10) + '...',
      amount: ethers.formatEther(amount),
      nonce,
    });

    try {
      // Pre-flight check: verify not already processed on-chain
      const isProcessed = await this.contract.isProcessed(source_tx_hash, source_nonce);
      if (isProcessed) {
        logger.warn(`Mint already processed on-chain, marking completed`, { id });
        this.txQueue.markCompleted(id, 'already_processed');
        await completeBridgeTransaction(source_tx_hash, source_nonce, 'already_processed');
        return 'already_processed';
      }

      // Mark as executing
      this.txQueue.markExecuting(id);

      // Execute mint transaction with manual nonce
      const mintTx = await this.contract.mint(
        recipient,
        amount,
        source_tx_hash,
        source_nonce,
        {
          gasLimit: 200000,
          nonce,
        }
      );

      logger.info(`Mint tx submitted`, { id, txHash: mintTx.hash });

      // Wait for confirmation
      const receipt = await mintTx.wait(1);

      if (receipt.status === 1) {
        this.txQueue.markCompleted(id, mintTx.hash);
        await completeBridgeTransaction(source_tx_hash, source_nonce, mintTx.hash);
        logger.info(`Mint CONFIRMED`, {
          id,
          txHash: mintTx.hash,
          gasUsed: receipt.gasUsed.toString(),
        });
        return mintTx.hash;
      } else {
        throw new Error('Transaction reverted');
      }
    } catch (error) {
      const errorMsg = error.reason || error.message || 'Unknown error';
      logger.error(`Mint FAILED`, { id, error: errorMsg });
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
