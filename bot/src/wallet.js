import { ethers } from 'ethers';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * FallbackRpcProvider — tries multiple RPC endpoints with automatic rotation.
 * Mirrors the relayer's proven pattern.
 */
class FallbackRpcProvider {
  constructor(chainName, chainId, rpcUrls) {
    this.chainName = chainName;
    this.chainId = chainId;
    this.rpcUrls = rpcUrls;
    this.currentIndex = 0;
    this._provider = null;
    this._staticNetwork = new ethers.Network(chainName.toLowerCase(), chainId);
    logger.info(`[${chainName}] RPC fallback: ${rpcUrls.length} endpoint(s)`);
  }

  _createProvider(url) {
    return new ethers.JsonRpcProvider(url, this._staticNetwork, { staticNetwork: this._staticNetwork });
  }

  getProvider() {
    if (!this._provider) {
      this._provider = this._createProvider(this.rpcUrls[this.currentIndex]);
    }
    return this._provider;
  }

  getCurrentUrl() {
    return this.rpcUrls[this.currentIndex];
  }

  rotate() {
    if (this.rpcUrls.length <= 1) return false;
    if (this._provider) {
      try { this._provider.destroy(); } catch (_) { /* ignore */ }
      this._provider = null;
    }
    this.currentIndex = (this.currentIndex + 1) % this.rpcUrls.length;
    logger.warn(`[${this.chainName}] Rotated RPC → ${this.getCurrentUrl()}`);
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
          errMsg.includes('usage limit') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('-32001') ||
          errMsg.includes('server response 404') ||
          errMsg.includes('server response 5') ||
          err.code === 'NETWORK_ERROR' ||
          err.code === 'SERVER_ERROR' ||
          err.code === 'TIMEOUT' ||
          err.code === 'BAD_DATA';

        if (isRpcError && this.rpcUrls.length > 1) {
          this.rotate();
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  }
}

// Singleton RPC instances
let liteforgeRpc = null;
let sepoliaRpc = null;
let baseSepoliaRpc = null;

export function getLiteforgeRpc() {
  if (!liteforgeRpc) {
    liteforgeRpc = new FallbackRpcProvider('LiteForge', config.liteforge.chainId, config.liteforge.rpcUrls);
  }
  return liteforgeRpc;
}

export function getSepoliaRpc() {
  if (!sepoliaRpc) {
    sepoliaRpc = new FallbackRpcProvider('Sepolia', config.sepolia.chainId, config.sepolia.rpcUrls);
  }
  return sepoliaRpc;
}

export function getBaseSepoliaRpc() {
  if (!baseSepoliaRpc) {
    baseSepoliaRpc = new FallbackRpcProvider('BaseSepolia', config.baseSepolia.chainId, config.baseSepolia.rpcUrls);
  }
  return baseSepoliaRpc;
}

/**
 * Get providers object (for balance checks etc.)
 */
export function getProviders() {
  return {
    liteforge: getLiteforgeRpc(),
    sepolia: getSepoliaRpc(),
    baseSepolia: getBaseSepoliaRpc(),
  };
}

/**
 * WalletSet — a single user's wallets across all 3 chains.
 * Reconnects wallet to current active provider on each call.
 */
export class WalletSet {
  constructor(privateKey, index) {
    this.index = index;
    this._privateKey = privateKey;

    // Create initial wallets
    this.address = new ethers.Wallet(privateKey).address;
  }

  /** Get wallet connected to the currently active LiteForge RPC */
  get liteforge() {
    return new ethers.Wallet(this._privateKey, getLiteforgeRpc().getProvider());
  }

  /** Get wallet connected to the currently active Sepolia RPC */
  get sepolia() {
    return new ethers.Wallet(this._privateKey, getSepoliaRpc().getProvider());
  }

  /** Get wallet connected to the currently active Base Sepolia RPC */
  get baseSepolia() {
    return new ethers.Wallet(this._privateKey, getBaseSepoliaRpc().getProvider());
  }

  /**
   * Get balances across all chains (with RPC fallback)
   */
  async getBalances() {
    const lfRpc = getLiteforgeRpc();
    const sepRpc = getSepoliaRpc();
    const bsRpc = getBaseSepoliaRpc();

    const [lfBal, sepBal, bsBal] = await Promise.all([
      lfRpc.withFallback(p => p.getBalance(this.address)),
      sepRpc.withFallback(p => p.getBalance(this.address)),
      bsRpc.withFallback(p => p.getBalance(this.address)),
    ]);

    return {
      liteforge: lfBal,
      sepolia: sepBal,
      baseSepolia: bsBal,
      liteforgeFormatted: ethers.formatEther(lfBal),
      sepoliaFormatted: ethers.formatEther(sepBal),
      baseSepoliaFormatted: ethers.formatEther(bsBal),
    };
  }
}

/**
 * Initialize all wallet sets from config
 */
export function initWallets() {
  return config.wallets.map((pk, i) => new WalletSet(pk, i));
}
