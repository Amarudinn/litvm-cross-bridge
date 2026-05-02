import { ethers } from 'ethers';
import { config } from '../config.js';
import { getLiteforgeWallet } from '../utils/provider.js';
import { logger } from '../utils/logger.js';
import BridgeVaultABI from '../abi/BridgeVault.json' with { type: 'json' };

/**
 * Unlock Executor
 * Executes unlock() on BridgeVault contract on LiteForge
 * when wzkLTC is burned on Sepolia.
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
   * Execute an unlock transaction
   * @param {Object} tx - Transaction from queue
   * @returns {string|null} - Destination tx hash or null on failure
   */
  async execute(tx) {
    const { id, source_tx_hash, source_nonce, recipient, amount } = tx;

    logger.info(`Executing UNLOCK`, {
      id,
      recipient: recipient.slice(0, 10) + '...',
      amount: ethers.formatEther(amount),
      sourceTxHash: source_tx_hash.slice(0, 10) + '...',
    });

    try {
      // Pre-flight check: verify not already processed on-chain
      const isProcessed = await this.contract.isProcessed(source_tx_hash, source_nonce);
      if (isProcessed) {
        logger.warn(`Unlock already processed on-chain, marking completed`, { id });
        this.txQueue.markCompleted(id, 'already_processed');
        return 'already_processed';
      }

      // Pre-flight check: verify vault has enough balance
      const available = await this.contract.availableBalance();
      if (BigInt(amount) > available) {
        throw new Error(`Insufficient vault balance: need ${ethers.formatEther(amount)}, available ${ethers.formatEther(available)}`);
      }

      // Mark as executing
      this.txQueue.markExecuting(id);

      // Execute unlock transaction
      const unlockTx = await this.contract.unlock(
        recipient,
        amount,
        source_tx_hash,
        source_nonce,
        {
          // Gas settings
          gasLimit: 100000,
        }
      );

      logger.info(`Unlock tx submitted`, { id, txHash: unlockTx.hash });

      // Wait for confirmation
      const receipt = await unlockTx.wait(1);

      if (receipt.status === 1) {
        this.txQueue.markCompleted(id, unlockTx.hash);
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
}
