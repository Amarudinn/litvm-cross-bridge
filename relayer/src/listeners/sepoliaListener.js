import { ethers } from 'ethers';
import { config } from '../config.js';
import { getSepoliaProvider } from '../utils/provider.js';
import { logger } from '../utils/logger.js';
import WrappedZkLTCABI from '../abi/WrappedZkLTC.json' with { type: 'json' };

/**
 * Sepolia Listener
 * Polls for Burned events on WrappedZkLTC contract.
 * When a Burned event is detected, it queues an unlock operation on LiteForge.
 */
export class SepoliaListener {
  constructor(txQueue) {
    this.txQueue = txQueue;
    this.provider = getSepoliaProvider();
    this.contract = new ethers.Contract(
      config.sepolia.wrappedZkLTCAddress,
      WrappedZkLTCABI,
      this.provider
    );
    this.running = false;
    this.pollTimer = null;
  }

  /**
   * Start polling for Burned events
   */
  async start() {
    this.running = true;

    // Get last processed block from DB, or start from current block
    let fromBlock = this.txQueue.getCheckpoint('sepolia');
    if (!fromBlock) {
      fromBlock = await this.provider.getBlockNumber();
      this.txQueue.setCheckpoint('sepolia', fromBlock);
      logger.info(`Sepolia listener starting from current block: ${fromBlock}`);
    } else {
      logger.info(`Sepolia listener resuming from block: ${fromBlock}`);
    }

    this._poll(fromBlock);
  }

  /**
   * Stop polling
   */
  stop() {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info('Sepolia listener stopped');
  }

  /**
   * Poll loop
   */
  async _poll(fromBlock) {
    if (!this.running) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const safeBlock = currentBlock - config.confirmationBlocks;

      if (fromBlock > safeBlock) {
        // No new confirmed blocks yet
        this.pollTimer = setTimeout(() => this._poll(fromBlock), config.pollIntervalMs);
        return;
      }

      // Query in chunks to avoid RPC limits
      const toBlock = Math.min(fromBlock + 1000, safeBlock);

      logger.debug(`Sepolia: scanning blocks ${fromBlock} - ${toBlock}`);

      const events = await this.contract.queryFilter(
        this.contract.filters.Burned(),
        fromBlock,
        toBlock
      );

      for (const event of events) {
        await this._handleBurnedEvent(event);
      }

      // Update checkpoint
      const nextBlock = toBlock + 1;
      this.txQueue.setCheckpoint('sepolia', nextBlock);

      // Continue polling
      this.pollTimer = setTimeout(() => this._poll(nextBlock), config.pollIntervalMs);
    } catch (error) {
      logger.error(`Sepolia listener error: ${error.message}`);
      // Retry after a longer delay on error
      this.pollTimer = setTimeout(() => this._poll(fromBlock), config.pollIntervalMs * 3);
    }
  }

  /**
   * Handle a Burned event - queue an unlock operation
   */
  async _handleBurnedEvent(event) {
    const { sender, recipient, amount, fee, nonce } = event.args;
    const txHash = event.transactionHash;
    const blockNumber = event.blockNumber;

    logger.info(`Burned event detected`, {
      txHash,
      blockNumber,
      sender,
      recipient,
      amount: ethers.formatEther(amount),
      fee: ethers.formatEther(fee),
      nonce: nonce.toString(),
    });

    // Queue unlock operation
    this.txQueue.addTransaction({
      type: 'UNLOCK',
      sourceTxHash: txHash,
      sourceChain: 'sepolia',
      sourceBlock: blockNumber,
      sourceNonce: Number(nonce),
      recipient,
      amount: amount.toString(),
    });
  }
}
