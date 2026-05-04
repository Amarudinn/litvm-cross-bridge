import { ethers } from 'ethers';
import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * RPC Fallback Provider — wraps multiple RPC URLs for a single chain.
 * Always tries the current (active) RPC first. On error, rotates to the next one.
 */
class FallbackRpcProvider {
  constructor(chainName, chainId, rpcUrls) {
    this.chainName = chainName;
    this.chainId = chainId;
    this.rpcUrls = rpcUrls;
    this.currentIndex = 0;
    this.providers = rpcUrls.map(url =>
      new ethers.JsonRpcProvider(url, { name: chainName.toLowerCase(), chainId })
    );
    logger.info(`[${chainName}] RPC fallback initialized with ${rpcUrls.length} endpoint(s): ${rpcUrls.join(', ')}`);
  }

  /** Get the currently active provider */
  getProvider() {
    return this.providers[this.currentIndex];
  }

  /** Get the currently active RPC URL */
  getCurrentUrl() {
    return this.rpcUrls[this.currentIndex];
  }

  /**
   * Rotate to the next RPC. Returns true if rotated, false if already tried all.
   */
  rotate() {
    const nextIndex = (this.currentIndex + 1) % this.rpcUrls.length;
    if (nextIndex === this.currentIndex) return false; // only 1 RPC
    this.currentIndex = nextIndex;
    logger.warn(`[${this.chainName}] Rotated RPC to: ${this.getCurrentUrl()}`);
    return true;
  }

  /**
   * Execute an async operation with fallback rotation.
   * Tries each RPC once. If all fail, throws the last error.
   */
  async withFallback(operation) {
    let lastError;
    const startIndex = this.currentIndex;

    for (let attempt = 0; attempt < this.rpcUrls.length; attempt++) {
      try {
        return await operation(this.getProvider());
      } catch (err) {
        lastError = err;
        const errMsg = err.message || String(err);
        const isRpcError =
          errMsg.includes('socket hang up') ||
          errMsg.includes('ECONNREFUSED') ||
          errMsg.includes('ETIMEDOUT') ||
          errMsg.includes('ENOTFOUND') ||
          errMsg.includes('network error') ||
          errMsg.includes('missing response') ||
          errMsg.includes('connection error') ||
          errMsg.includes('server error') ||
          errMsg.includes('bad response') ||
          errMsg.includes('timeout') ||
          err.code === 'NETWORK_ERROR' ||
          err.code === 'SERVER_ERROR' ||
          err.code === 'TIMEOUT';

        if (isRpcError && this.rpcUrls.length > 1) {
          logger.warn(`[${this.chainName}] RPC error on ${this.getCurrentUrl()}: ${errMsg.slice(0, 100)}`);
          this.rotate();
        } else {
          // Not an RPC error (e.g. revert, insufficient funds) — don't rotate, just throw
          throw err;
        }
      }
    }

    // All RPCs failed
    logger.error(`[${this.chainName}] All ${this.rpcUrls.length} RPCs failed`);
    throw lastError;
  }
}

// Singleton instances
let liteforgeRpc = null;
let sepoliaRpc = null;
let liteforgeWallet = null;
let sepoliaWallet = null;

/**
 * Get LiteForge fallback RPC instance
 */
export function getLiteforgeRpc() {
  if (!liteforgeRpc) {
    liteforgeRpc = new FallbackRpcProvider('LiteForge', config.liteforge.chainId, config.liteforge.rpcUrls);
  }
  return liteforgeRpc;
}

/**
 * Get Sepolia fallback RPC instance
 */
export function getSepoliaRpc() {
  if (!sepoliaRpc) {
    sepoliaRpc = new FallbackRpcProvider('Sepolia', config.sepolia.chainId, config.sepolia.rpcUrls);
  }
  return sepoliaRpc;
}

/**
 * Get LiteForge JSON-RPC provider (current active)
 */
export function getLiteforgeProvider() {
  return getLiteforgeRpc().getProvider();
}

/**
 * Get Sepolia JSON-RPC provider (current active)
 */
export function getSepoliaProvider() {
  return getSepoliaRpc().getProvider();
}

/**
 * Get relayer wallet connected to LiteForge (reconnects on RPC rotation)
 */
export function getLiteforgeWallet() {
  const provider = getLiteforgeProvider();
  if (!liteforgeWallet || liteforgeWallet.provider !== provider) {
    liteforgeWallet = new ethers.Wallet(config.relayerPrivateKey, provider);
    logger.info(`Relayer wallet (LiteForge): ${liteforgeWallet.address}`);
  }
  return liteforgeWallet;
}

/**
 * Get relayer wallet connected to Sepolia (reconnects on RPC rotation)
 */
export function getSepoliaWallet() {
  const provider = getSepoliaProvider();
  if (!sepoliaWallet || sepoliaWallet.provider !== provider) {
    sepoliaWallet = new ethers.Wallet(config.relayerPrivateKey, provider);
    logger.info(`Relayer wallet (Sepolia): ${sepoliaWallet.address}`);
  }
  return sepoliaWallet;
}

/**
 * Check relayer balances on both chains (with fallback)
 */
export async function checkBalances() {
  const lfRpc = getLiteforgeRpc();
  const sepRpc = getSepoliaRpc();

  const lfWalletAddr = getLiteforgeWallet().address;

  const [lfBalance, sepBalance] = await Promise.all([
    lfRpc.withFallback(p => p.getBalance(lfWalletAddr)),
    sepRpc.withFallback(p => p.getBalance(lfWalletAddr)),
  ]);

  const lfBalanceEth = ethers.formatEther(lfBalance);
  const sepBalanceEth = ethers.formatEther(sepBalance);

  logger.info(`Relayer balance - LiteForge: ${lfBalanceEth} zkLTC, Sepolia: ${sepBalanceEth} ETH`);

  return {
    liteforge: lfBalance,
    sepolia: sepBalance,
  };
}
