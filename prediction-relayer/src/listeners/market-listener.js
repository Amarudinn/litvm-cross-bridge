import { ethers } from 'ethers';
import { getProvider } from '../utils/provider.js';
import { getLastProcessedBlock, setLastProcessedBlock } from '../db/checkpoint.js';
import config from '../config.js';
import logger from '../utils/logger.js';

import { handleMarketCreated } from '../handlers/market-created.js';
import { handleTicketPurchased } from '../handlers/ticket-purchased.js';
import { handleMarketResolved } from '../handlers/market-resolved.js';
import { handleMarketCancelled } from '../handlers/market-cancelled.js';
import { handleMarketPaused, handleMarketUnpaused } from '../handlers/market-paused.js';
import { handleClaimed } from '../handlers/claimed.js';
import { handleRefundClaimed } from '../handlers/refund-claimed.js';
import { handleCloseTimeUpdated } from '../handlers/close-time-updated.js';
import { handleFeeUpdated } from '../handlers/fee-updated.js';

const ABI = [
  "event MarketCreated(uint256 indexed marketId, string title, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime)",
  "event TicketPurchased(uint256 indexed marketId, address indexed user, uint256 outcomeIndex, uint256 quantity, uint256 totalPaid)",
  "event MarketResolved(uint256 indexed marketId, uint256 winningOutcome, bool isRefund)",
  "event MarketCancelled(uint256 indexed marketId)",
  "event MarketPaused(uint256 indexed marketId)",
  "event MarketUnpaused(uint256 indexed marketId)",
  "event CloseTimeUpdated(uint256 indexed marketId, uint256 oldCloseTime, uint256 newCloseTime)",
  "event FeeUpdated(uint256 indexed marketId, uint256 oldFee, uint256 newFee)",
  "event Claimed(uint256 indexed marketId, address indexed user, uint256 amount)",
  "event RefundClaimed(uint256 indexed marketId, address indexed user, uint256 amount)",
  "event FeesWithdrawn(address indexed owner, uint256 amount)",
];

const EVENT_HANDLERS = {
  MarketCreated: handleMarketCreated,
  TicketPurchased: handleTicketPurchased,
  MarketResolved: handleMarketResolved,
  MarketCancelled: handleMarketCancelled,
  MarketPaused: handleMarketPaused,
  MarketUnpaused: handleMarketUnpaused,
  CloseTimeUpdated: handleCloseTimeUpdated,
  FeeUpdated: handleFeeUpdated,
  Claimed: handleClaimed,
  RefundClaimed: handleRefundClaimed,
};

let contract = null;
let isProcessing = false;

function getContract() {
  if (!contract) {
    const provider = getProvider();
    contract = new ethers.Contract(config.contractAddress, ABI, provider);
  }
  return contract;
}

async function processEvents() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const provider = getProvider();
    const currentBlock = await provider.getBlockNumber();
    const lastBlock = getLastProcessedBlock(config.contractDeployBlock);

    if (lastBlock >= currentBlock) {
      isProcessing = false;
      return;
    }

    const fromBlock = lastBlock + 1;
    const toBlock = Math.min(fromBlock + config.blockChunkSize - 1, currentBlock);

    logger.debug(`Processing blocks ${fromBlock} to ${toBlock}`);

    const c = getContract();

    // Query each event type separately and merge
    const allEvents = [];
    const eventNames = Object.keys(EVENT_HANDLERS).concat(['FeesWithdrawn']);

    for (const eventName of eventNames) {
      try {
        const filter = c.filters[eventName]();
        const events = await c.queryFilter(filter, fromBlock, toBlock);
        for (const event of events) {
          allEvents.push({ event, eventName });
        }
      } catch (err) {
        logger.debug(`No filter for ${eventName}: ${err.message}`);
      }
    }

    // Sort by block number then log index
    allEvents.sort((a, b) => {
      if (a.event.blockNumber !== b.event.blockNumber) {
        return a.event.blockNumber - b.event.blockNumber;
      }
      return a.event.index - b.event.index;
    });

    for (const { event, eventName } of allEvents) {
      const handler = EVENT_HANDLERS[eventName];

      if (handler) {
        const block = await event.getBlock();
        try {
          await handler(event, block);
        } catch (err) {
          logger.error(`Error handling ${eventName} at block ${event.blockNumber}`, { error: err.message });
        }
      } else if (eventName === 'FeesWithdrawn') {
        logger.info(`FeesWithdrawn: ${event.args.owner}, amount: ${event.args.amount}`);
      }
    }

    setLastProcessedBlock(toBlock);
    logger.debug(`Checkpoint updated to block ${toBlock}`);
  } catch (err) {
    logger.error('Error in processEvents', { error: err.message });
  } finally {
    isProcessing = false;
  }
}

let pollInterval = null;

export function startListener() {
  logger.info('Starting market event listener...');
  logger.info(`Contract: ${config.contractAddress}`);
  logger.info(`Poll interval: ${config.pollIntervalMs}ms, chunk size: ${config.blockChunkSize}`);

  // Process immediately on start
  processEvents();

  // Then poll at interval
  pollInterval = setInterval(processEvents, config.pollIntervalMs);
}

export function stopListener() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    logger.info('Market listener stopped');
  }
}

export default { startListener, stopListener };
