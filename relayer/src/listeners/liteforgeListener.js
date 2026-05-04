import { ethers } from 'ethers';
import { config } from '../config.js';
import { getLiteforgeProvider, getLiteforgeRpc } from '../utils/provider.js';
import { logger } from '../utils/logger.js';
import { saveBridgeTransaction } from '../utils/supabase.js';
import BridgeVaultABI from '../abi/BridgeVault.json' with { type: 'json' };

/**
 * LiteForge Listener
 * Polls for Locked events on BridgeVault contract.
 * When a Locked event is detected, it queues a mint operation on Sepolia.
 */
export class LiteforgeListener {
  constructor(txQueue) {
    this.txQueue = txQueue;
    this.rpc = getLiteforgeRpc();
    this.running = false;
    this.pollTimer = null;
  }

  /** Get a fresh contract instance using the current active provider */
  _getContract() {
    return new ethers.Contract(
      config.liteforge.bridgeVaultAddress,
      BridgeVaultABI,
      this.rpc.getProvider()
    );
  }

  /**
   * Start polling for Locked events
   */
  async start() {
    this.running = true;

    // Get last processed block from DB, or start from current block
    let fromBlock = this.txQueue.getCheckpoint('liteforge');
    if (!fromBlock) {
      fromBlock = await this.rpc.withFallback(p => p.getBlockNumber());
      this.txQueue.setCheckpoint('liteforge', fromBlock);
      logger.info(`LiteForge listener starting from current block: ${fromBlock}`);
    } else {
      logger.info(`LiteForge listener resuming from block: ${fromBlock}`);
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
    logger.info('LiteForge listener stopped');
  }

  /**
   * Poll loop
   */
  async _poll(fromBlock) {
    if (!this.running) return;

    try {
      const currentBlock = await this.rpc.withFallback(p => p.getBlockNumber());
      const safeBlock = currentBlock - config.confirmationBlocks;

      if (fromBlock > safeBlock) {
        // No new confirmed blocks yet
        this.pollTimer = setTimeout(() => this._poll(fromBlock), config.pollIntervalMs);
        return;
      }

      // Query in chunks to avoid RPC limits
      const toBlock = Math.min(fromBlock + 1000, safeBlock);

      logger.debug(`LiteForge: scanning blocks ${fromBlock} - ${toBlock}`);

      const contract = this._getContract();
      const events = await this.rpc.withFallback(async () => {
        return contract.queryFilter(contract.filters.Locked(), fromBlock, toBlock);
      });

      for (const event of events) {
        await this._handleLockedEvent(event);
      }

      // Update checkpoint
      const nextBlock = toBlock + 1;
      this.txQueue.setCheckpoint('liteforge', nextBlock);

      // Continue polling
      this.pollTimer = setTimeout(() => this._poll(nextBlock), config.pollIntervalMs);
    } catch (error) {
      logger.error(`LiteForge listener error: ${error.message}`);
      // Retry after a longer delay on error
      this.pollTimer = setTimeout(() => this._poll(fromBlock), config.pollIntervalMs * 3);
    }
  }

  /**
   * Handle a Locked event - queue a mint operation
   */
  async _handleLockedEvent(event) {
    const { sender, recipient, amount, fee, nonce } = event.args;
    const txHash = event.transactionHash;
    const blockNumber = event.blockNumber;

    logger.info(`Locked event detected`, {
      txHash,
      blockNumber,
      sender,
      recipient,
      amount: ethers.formatEther(amount),
      fee: ethers.formatEther(fee),
      nonce: nonce.toString(),
    });

    // Queue mint operation
    this.txQueue.addTransaction({
      type: 'MINT',
      sourceTxHash: txHash,
      sourceChain: 'liteforge',
      sourceBlock: blockNumber,
      sourceNonce: Number(nonce),
      recipient,
      amount: amount.toString(),
    });

    // Save to Supabase as pending
    await saveBridgeTransaction({
      direction: 'liteforge_to_sepolia',
      source_tx_hash: txHash,
      source_chain_id: 4441,
      source_block: blockNumber,
      source_nonce: Number(nonce),
      dest_chain_id: 11155111,
      sender: sender,
      recipient: recipient,
      amount: amount.toString(),
      fee: fee.toString(),
      status: 'pending',
    });
  }
}
