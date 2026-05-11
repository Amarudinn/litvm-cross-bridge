import { ethers } from 'ethers';
import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * RPC Fallback Provider — wraps multiple RPC URLs for a single chain.
 * Always tries the current (active) RPC first. On error, rotates to the next one.
 *
 * Uses staticNetwork to prevent ethers.js from auto-detecting the network
 * (which causes infinite "failed to detect network" retry loops on bad RPCs).
 */
class FallbackRpcProvider {
  constructor(chainName, chainId, rpcUrls) {
    this.chainName = chainName;
    this.chainId = chainId;
    this.rpcUrls = rpcUrls;
    this.currentIndex = 0;
    this._provider = null;
    // Pre-build a static network so ethers never tries auto-detection
    this._staticNetwork = new ethers.Network(chainName.toLowerCase(), chainId);
    logger.info(`[${chainName}] RPC fallback initialized with ${rpcUrls.length} endpoint(s): ${rpcUrls.join(', ')}`);
  }

  /** Create a provider for the given URL using staticNetwork */
  _createProvider(url) {
    return new ethers.JsonRpcProvider(url, this._staticNetwork, { staticNetwork: this._staticNetwork });
  }

  /** Get the currently active provider (lazy creation) */
  getProvider() {
    if (!this._provider) {
      this._provider = this._createProvider(this.rpcUrls[this.currentIndex]);
    }
    return this._provider;
  }

  /** Get the currently active RPC URL */
  getCurrentUrl() {
    return this.rpcUrls[this.currentIndex];
  }

  /**
   * Rotate to the next RPC. Destroys old provider to stop retry loops.
   * Returns true if rotated, false if only 1 RPC available.
   */
  rotate() {
    if (this.rpcUrls.length <= 1) return false;

    // Destroy the old provider to stop any internal retry loops
    if (this._provider) {
      try { this._provider.destroy(); } catch (_) { /* ignore */ }
      this._provider = null;
    }

    this.currentIndex = (this.currentIndex + 1) % this.rpcUrls.length;
    logger.warn(`[${this.chainName}] Rotated RPC to: ${this.getCurrentUrl()}`);
    // Lazily create the new provider on next getProvider() call
    return true;
  }

  /**
   * Execute an async operation with fallback rotation.
   * Tries each RPC once. If all fail, throws the last error.
   */
  async withFallback(operation) {
    let lastError;

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
          errMsg.includes('Request timeout') ||
          errMsg.includes('server response 404') ||
          errMsg.includes('server response 5') ||
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
let baseSepoliaRpc = null;
let liteforgeWallet = null;
let sepoliaWallet = null;
let baseSepoliaWallet = null;

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
 * Get Base Sepolia fallback RPC instance
 */
export function getBaseSepoliaRpc() {
  if (!baseSepoliaRpc) {
    baseSepoliaRpc = new FallbackRpcProvider('BaseSepolia', config.baseSepolia.chainId, config.baseSepolia.rpcUrls);
  }
  return baseSepoliaRpc;
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
 * Get Base Sepolia JSON-RPC provider (current active)
 */
export function getBaseSepoliaProvider() {
  return getBaseSepoliaRpc().getProvider();
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
 * Get relayer wallet connected to Base Sepolia (reconnects on RPC rotation)
 */
export function getBaseSepoliaWallet() {
  const provider = getBaseSepoliaProvider();
  if (!baseSepoliaWallet || baseSepoliaWallet.provider !== provider) {
    baseSepoliaWallet = new ethers.Wallet(config.relayerPrivateKey, provider);
    logger.info(`Relayer wallet (Base Sepolia): ${baseSepoliaWallet.address}`);
  }
  return baseSepoliaWallet;
}

/**
 * Check relayer balances on all chains (with fallback)
 */
export async function checkBalances() {
  const lfRpc = getLiteforgeRpc();
  const sepRpc = getSepoliaRpc();
  const bsRpc = getBaseSepoliaRpc();

  const lfWalletAddr = getLiteforgeWallet().address;

  const [lfBalance, sepBalance, bsBalance] = await Promise.all([
    lfRpc.withFallback(p => p.getBalance(lfWalletAddr)),
    sepRpc.withFallback(p => p.getBalance(lfWalletAddr)),
    bsRpc.withFallback(p => p.getBalance(lfWalletAddr)),
  ]);

  const lfBalanceEth = ethers.formatEther(lfBalance);
  const sepBalanceEth = ethers.formatEther(sepBalance);
  const bsBalanceEth = ethers.formatEther(bsBalance);

  logger.info(`Relayer balance - LiteForge: ${lfBalanceEth} zkLTC, Sepolia: ${sepBalanceEth} ETH, Base Sepolia: ${bsBalanceEth} ETH`);

  return {
    liteforge: lfBalance,
    sepolia: sepBalance,
    baseSepolia: bsBalance,
  };
}

