import { ethers } from 'ethers';
import { config } from '../config.js';
import { getSepoliaWallet } from '../utils/provider.js';
import { logger } from '../utils/logger.js';
import WrappedZkLTCABI from '../abi/WrappedZkLTC.json' with { type: 'json' };

/**
 * Mint Executor
 * Executes mint() on WrappedZkLTC contract on Sepolia
 * when zkLTC is locked on LiteForge.
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
   * Execute a mint transaction
   * @param {Object} tx - Transaction from queue
   * @returns {string|null} - Destination tx hash or null on failure
   */
  async execute(tx) {
    const { id, source_tx_hash, source_nonce, recipient, amount } = tx;

    logger.info(`Executing MINT`, {
      id,
      recipient: recipient.slice(0, 10) + '...',
      amount: ethers.formatEther(amount),
      sourceTxHash: source_tx_hash.slice(0, 10) + '...',
    });

    try {
      // Pre-flight check: verify not already processed on-chain
      const isProcessed = await this.contract.isProcessed(source_tx_hash, source_nonce);
      if (isProcessed) {
        logger.warn(`Mint already processed on-chain, marking completed`, { id });
        this.txQueue.markCompleted(id, 'already_processed');
        return 'already_processed';
      }

      // Mark as executing
      this.txQueue.markExecuting(id);

      // Execute mint transaction
      const mintTx = await this.contract.mint(
        recipient,
        amount,
        source_tx_hash,
        source_nonce,
        {
          // Gas settings
          gasLimit: 200000,
        }
      );

      logger.info(`Mint tx submitted`, { id, txHash: mintTx.hash });

      // Wait for confirmation
      const receipt = await mintTx.wait(1);

      if (receipt.status === 1) {
        this.txQueue.markCompleted(id, mintTx.hash);
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
}
