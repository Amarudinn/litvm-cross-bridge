import { ethers } from 'ethers';
import { config } from '../config.js';
import { getBaseSepoliaProvider, getBaseSepoliaRpc } from '../utils/provider.js';
import { logger } from '../utils/logger.js';
import { saveBridgeTransaction } from '../utils/supabase.js';
import WrappedZkLTCABI from '../abi/WrappedZkLTC.json' with { type: 'json' };

/**
 * Base Sepolia Listener
 * Polls for Burned events on WrappedZkLTC contract on Base Sepolia.
 * When a Burned event is detected, it queues an unlock operation on LiteForge.
 */
export class BaseSepoliaListener {
  constructor(txQueue) {
    this.txQueue = txQueue;
    this.rpc = getBaseSepoliaRpc();
    this.running = false;
    this.pollTimer = null;
  }

  /** Get a fresh contract instance using the current active provider */
  _getContract() {
    return new ethers.Contract(
      config.baseSepolia.wrappedZkLTCAddress,
      WrappedZkLTCABI,
      this.rpc.getProvider()
    );
  }

  /**
   * Start polling for Burned events
   */
  async start() {
    this.running = true;

    let fromBlock = this.txQueue.getCheckpoint('basesepolia');
    if (!fromBlock) {
      fromBlock = await this.rpc.withFallback(p => p.getBlockNumber());
      this.txQueue.setCheckpoint('basesepolia', fromBlock);
      logger.info(`Base Sepolia listener starting from current block: ${fromBlock}`);
    } else {
      logger.info(`Base Sepolia listener resuming from block: ${fromBlock}`);
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
    logger.info('Base Sepolia listener stopped');
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
        this.pollTimer = setTimeout(() => this._poll(fromBlock), config.pollIntervalMs);
        return;
      }

      const toBlock = Math.min(fromBlock + 1000, safeBlock);

      logger.debug(`Base Sepolia: scanning blocks ${fromBlock} - ${toBlock}`);

      const contract = this._getContract();
      const events = await this.rpc.withFallback(async () => {
        return contract.queryFilter(contract.filters.Burned(), fromBlock, toBlock);
      });

      for (const event of events) {
        await this._handleBurnedEvent(event);
      }

      const nextBlock = toBlock + 1;
      this.txQueue.setCheckpoint('basesepolia', nextBlock);

      this.pollTimer = setTimeout(() => this._poll(nextBlock), config.pollIntervalMs);
    } catch (error) {
      logger.error(`Base Sepolia listener error: ${error.message}`);
      this.pollTimer = setTimeout(() => this._poll(fromBlock), config.pollIntervalMs * 3);
    }
  }

  /**
   * Handle a Burned event - queue an unlock operation on LiteForge
   */
  async _handleBurnedEvent(event) {
    const { sender, recipient, amount, fee, nonce } = event.args;
    const txHash = event.transactionHash;
    const blockNumber = event.blockNumber;

    logger.info(`Base Sepolia Burned event detected`, {
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
      sourceChain: 'basesepolia',
      sourceBlock: blockNumber,
      sourceNonce: Number(nonce),
      recipient,
      amount: amount.toString(),
    });

    // Save to Supabase as pending
    await saveBridgeTransaction({
      direction: 'basesepolia_to_liteforge',
      source_tx_hash: txHash,
      source_chain_id: 84532,
      source_block: blockNumber,
      source_nonce: Number(nonce),
      dest_chain_id: 4441,
      sender: sender,
      recipient: recipient,
      amount: amount.toString(),
      fee: fee.toString(),
      status: 'pending',
    });
  }
}
