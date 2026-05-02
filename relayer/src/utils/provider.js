import { ethers } from 'ethers';
import { config } from '../config.js';
import { logger } from './logger.js';

let liteforgeProvider = null;
let sepoliaProvider = null;
let liteforgeWallet = null;
let sepoliaWallet = null;

/**
 * Get LiteForge JSON-RPC provider
 */
export function getLiteforgeProvider() {
  if (!liteforgeProvider) {
    liteforgeProvider = new ethers.JsonRpcProvider(
      config.liteforge.rpcUrl,
      {
        name: 'liteforge',
        chainId: config.liteforge.chainId,
      }
    );
    logger.info(`Provider connected: LiteForge (chainId: ${config.liteforge.chainId})`);
  }
  return liteforgeProvider;
}

/**
 * Get Sepolia JSON-RPC provider
 */
export function getSepoliaProvider() {
  if (!sepoliaProvider) {
    sepoliaProvider = new ethers.JsonRpcProvider(
      config.sepolia.rpcUrl,
      {
        name: 'sepolia',
        chainId: config.sepolia.chainId,
      }
    );
    logger.info(`Provider connected: Sepolia (chainId: ${config.sepolia.chainId})`);
  }
  return sepoliaProvider;
}

/**
 * Get relayer wallet connected to LiteForge
 */
export function getLiteforgeWallet() {
  if (!liteforgeWallet) {
    liteforgeWallet = new ethers.Wallet(config.relayerPrivateKey, getLiteforgeProvider());
    logger.info(`Relayer wallet (LiteForge): ${liteforgeWallet.address}`);
  }
  return liteforgeWallet;
}

/**
 * Get relayer wallet connected to Sepolia
 */
export function getSepoliaWallet() {
  if (!sepoliaWallet) {
    sepoliaWallet = new ethers.Wallet(config.relayerPrivateKey, getSepoliaProvider());
    logger.info(`Relayer wallet (Sepolia): ${sepoliaWallet.address}`);
  }
  return sepoliaWallet;
}

/**
 * Check relayer balances on both chains
 */
export async function checkBalances() {
  const lfWallet = getLiteforgeWallet();
  const sepWallet = getSepoliaWallet();

  const [lfBalance, sepBalance] = await Promise.all([
    getLiteforgeProvider().getBalance(lfWallet.address),
    getSepoliaProvider().getBalance(sepWallet.address),
  ]);

  const lfBalanceEth = ethers.formatEther(lfBalance);
  const sepBalanceEth = ethers.formatEther(sepBalance);

  logger.info(`Relayer balance - LiteForge: ${lfBalanceEth} zkLTC, Sepolia: ${sepBalanceEth} ETH`);

  return {
    liteforge: lfBalance,
    sepolia: sepBalance,
  };
}
