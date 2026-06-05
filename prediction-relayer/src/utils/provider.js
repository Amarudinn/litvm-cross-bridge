import { ethers } from 'ethers';
import config from '../config.js';
import logger from './logger.js';

let provider = null;
let providerUrl = null;

const LITEFORGE_NETWORK = { chainId: 4441, name: 'LiteForge' };

function createJsonRpcProvider(url) {
  // Pass static network so ethers does not need to auto-detect the chain on startup.
  // This avoids repeated "failed to detect network" retries when the RPC has intermittent resets.
  return new ethers.JsonRpcProvider(url, LITEFORGE_NETWORK, { staticNetwork: true });
}

function createProvider() {
  const urls = [config.rpcUrlPrimary, config.rpcUrlFallback].filter(Boolean);
  if (urls.length === 0) {
    throw new Error('No RPC URL configured');
  }

  const url = urls[0];
  provider = createJsonRpcProvider(url);
  providerUrl = url;
  logger.info(`RPC provider initialized: ${url}`);
  return provider;
}

export function getProvider() {
  if (!provider) {
    return createProvider();
  }
  return provider;
}

export async function getBlockNumber() {
  try {
    const p = getProvider();
    return await p.getBlockNumber();
  } catch (err) {
    logger.warn(`RPC getBlockNumber failed on ${providerUrl}: ${err.message}`);

    if (config.rpcUrlFallback && providerUrl !== config.rpcUrlFallback) {
      logger.info(`Switching RPC provider to fallback: ${config.rpcUrlFallback}`);
      provider = createJsonRpcProvider(config.rpcUrlFallback);
      providerUrl = config.rpcUrlFallback;
      return await provider.getBlockNumber();
    }

    provider = null;
    providerUrl = null;
    throw err;
  }
}

export default { getProvider, getBlockNumber };
