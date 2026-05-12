import { ethers } from 'ethers';
import { config } from './config.js';
import { getProviders, getLiteforgeRpc, getSepoliaRpc, getBaseSepoliaRpc } from './wallet.js';
// Import ABIs
import BridgeVaultV2ABI from './abi/BridgeVaultV2.json' with { type: 'json' };
import WrappedZkLTCABI from './abi/WrappedZkLTC.json' with { type: 'json' };

/**
 * Generate a random bridge amount between min and max
 */
export function randomBridgeAmount() {
  const min = config.bridgeAmountMin;
  const max = config.bridgeAmountMax;
  const amount = min + Math.random() * (max - min);
  // Round to 4 decimal places to keep it clean
  const rounded = Math.round(amount * 10000) / 10000;
  return ethers.parseEther(rounded.toString());
}

/**
 * Sleep utility
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for relayer to process the transaction by polling destination balance/token balance.
 * Uses fallback RPC for resilience.
 */
export async function waitForRelayer({ type, chain, address, previousBalance, tokenAddress, log }) {
  const rpcMap = {
    liteforge: getLiteforgeRpc(),
    sepolia: getSepoliaRpc(),
    baseSepolia: getBaseSepoliaRpc(),
  };
  const rpc = rpcMap[chain];
  const startTime = Date.now();
  let attempts = 0;

  log(`⏳ Waiting for relayer to process (checking ${type} on ${chain})...`);

  while (Date.now() - startTime < config.relayerWaitTimeoutMs) {
    attempts++;
    await sleep(config.relayerWaitPollMs);

    try {
      let currentBalance;

      if (type === 'native') {
        currentBalance = await rpc.withFallback(p => p.getBalance(address));
      } else {
        // Check token balance with fallback
        currentBalance = await rpc.withFallback(p => {
          const token = new ethers.Contract(tokenAddress, WrappedZkLTCABI, p);
          return token.balanceOf(address);
        });
      }

      if (currentBalance > previousBalance) {
        const diff = currentBalance - previousBalance;
        log(`✅ Relayer confirmed! Balance increased by ${ethers.formatEther(diff)} (attempt ${attempts})`);
        return { success: true, newBalance: currentBalance, diff };
      }

      if (attempts % 3 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        log(`⏳ Still waiting... (${elapsed}s elapsed, attempt ${attempts})`);
      }
    } catch (err) {
      log(`⚠️ Poll error: ${err.message.slice(0, 80)}, retrying...`);
    }
  }

  log(`⏰ Timeout waiting for relayer after ${config.relayerWaitTimeoutMs / 1000}s`);
  return { success: false, newBalance: previousBalance, diff: 0n };
}

// ============================================================
//  Route 1: LiteForge → Sepolia
//  User calls lock() on BridgeVaultV2 with destChainId=11155111
// ============================================================
export async function bridgeLiteforgeToSepolia(walletSet, log) {
  const routeName = 'LiteForge → Sepolia';
  const amount = randomBridgeAmount();
  const amountFormatted = ethers.formatEther(amount);

  log.route(routeName, `🚀 Initiating bridge of ${amountFormatted} zkLTC`);

  const lfRpc = getLiteforgeRpc();
  const sepRpc = getSepoliaRpc();

  // Check source balance
  const srcBalance = await lfRpc.withFallback(p => p.getBalance(walletSet.address));
  if (srcBalance < amount + ethers.parseEther('0.001')) {
    log.warn(`Insufficient LiteForge balance: ${ethers.formatEther(srcBalance)} zkLTC, need ${amountFormatted}+gas`);
    return false;
  }

  // Get destination token balance before (with fallback)
  const prevTokenBal = await sepRpc.withFallback(p => {
    const token = new ethers.Contract(config.contracts.wrappedZkLTCSepolia, WrappedZkLTCABI, p);
    return token.balanceOf(walletSet.address);
  });

  // Execute lock
  const vault = new ethers.Contract(
    config.contracts.bridgeVault,
    BridgeVaultV2ABI,
    walletSet.liteforge
  );

  log.route(routeName, `📤 Sending lock() tx... amount=${amountFormatted} destChainId=11155111`);

  const tx = await vault.lock(walletSet.address, 11155111, {
    value: amount,
    gasLimit: 200000,
  });

  log.route(routeName, `📋 TX submitted: ${tx.hash}`);

  const receipt = await tx.wait(1);
  if (receipt.status !== 1) {
    log.error(`❌ Lock TX reverted!`);
    return false;
  }

  log.route(routeName, `✅ Lock confirmed! Gas used: ${receipt.gasUsed.toString()}`);

  // Wait for relayer to mint on Sepolia
  const result = await waitForRelayer({
    type: 'token',
    chain: 'sepolia',
    address: walletSet.address,
    previousBalance: prevTokenBal,
    tokenAddress: config.contracts.wrappedZkLTCSepolia,
    log: (msg) => log.route(routeName, msg),
  });

  return result.success;
}

// ============================================================
//  Route 2: Sepolia → LiteForge
//  User calls burn() on WrappedZkLTC Sepolia
// ============================================================
export async function bridgeSepoliaToLiteforge(walletSet, log) {
  const routeName = 'Sepolia → LiteForge';
  const sepRpc = getSepoliaRpc();
  const lfRpc = getLiteforgeRpc();

  // Check wzkLTC balance on Sepolia (with fallback)
  const tokenBalance = await sepRpc.withFallback(p => {
    const token = new ethers.Contract(config.contracts.wrappedZkLTCSepolia, WrappedZkLTCABI, p);
    return token.balanceOf(walletSet.address);
  });

  if (tokenBalance === 0n) {
    log.warn(`No wzkLTC balance on Sepolia, skipping burn`);
    return false;
  }

  // Use random amount, but cap at actual balance
  let amount = randomBridgeAmount();
  if (amount > tokenBalance) {
    amount = tokenBalance;
  }
  const amountFormatted = ethers.formatEther(amount);

  log.route(routeName, `🚀 Initiating bridge of ${amountFormatted} wzkLTC`);

  // Check ETH balance for gas
  const ethBalance = await sepRpc.withFallback(p => p.getBalance(walletSet.address));
  if (ethBalance < ethers.parseEther('0.001')) {
    log.warn(`Insufficient Sepolia ETH for gas: ${ethers.formatEther(ethBalance)}`);
    return false;
  }

  // Get LiteForge native balance before
  const prevNativeBal = await lfRpc.withFallback(p => p.getBalance(walletSet.address));

  // Execute burn (need fresh contract with current wallet provider)
  const wzkLTCSepolia = new ethers.Contract(
    config.contracts.wrappedZkLTCSepolia,
    WrappedZkLTCABI,
    walletSet.sepolia
  );

  log.route(routeName, `🔥 Sending burn() tx... amount=${amountFormatted}`);

  const tx = await wzkLTCSepolia.burn(amount, walletSet.address, {
    gasLimit: 200000,
  });

  log.route(routeName, `📋 TX submitted: ${tx.hash}`);

  const receipt = await tx.wait(1);
  if (receipt.status !== 1) {
    log.error(`❌ Burn TX reverted!`);
    return false;
  }

  log.route(routeName, `✅ Burn confirmed! Gas used: ${receipt.gasUsed.toString()}`);

  // Wait for relayer to unlock on LiteForge
  const result = await waitForRelayer({
    type: 'native',
    chain: 'liteforge',
    address: walletSet.address,
    previousBalance: prevNativeBal,
    log: (msg) => log.route(routeName, msg),
  });

  return result.success;
}

// ============================================================
//  Route 3: Base Sepolia → LiteForge
//  User calls burn() on WrappedZkLTC Base Sepolia
// ============================================================
export async function bridgeBaseSepoliaToLiteforge(walletSet, log) {
  const routeName = 'Base Sepolia → LiteForge';
  const bsRpc = getBaseSepoliaRpc();
  const lfRpc = getLiteforgeRpc();

  // Check wzkLTC balance on Base Sepolia (with fallback)
  const tokenBalance = await bsRpc.withFallback(p => {
    const token = new ethers.Contract(config.contracts.wrappedZkLTCBaseSepolia, WrappedZkLTCABI, p);
    return token.balanceOf(walletSet.address);
  });

  if (tokenBalance === 0n) {
    log.warn(`No wzkLTC balance on Base Sepolia, skipping burn`);
    return false;
  }

  // Use random amount, but cap at actual balance
  let amount = randomBridgeAmount();
  if (amount > tokenBalance) {
    amount = tokenBalance;
  }
  const amountFormatted = ethers.formatEther(amount);

  log.route(routeName, `🚀 Initiating bridge of ${amountFormatted} wzkLTC`);

  // Check ETH balance for gas
  const ethBalance = await bsRpc.withFallback(p => p.getBalance(walletSet.address));
  if (ethBalance < ethers.parseEther('0.0001')) {
    log.warn(`Insufficient Base Sepolia ETH for gas: ${ethers.formatEther(ethBalance)}`);
    return false;
  }

  // Get LiteForge native balance before
  const prevNativeBal = await lfRpc.withFallback(p => p.getBalance(walletSet.address));

  // Execute burn
  const wzkLTCBaseSep = new ethers.Contract(
    config.contracts.wrappedZkLTCBaseSepolia,
    WrappedZkLTCABI,
    walletSet.baseSepolia
  );

  log.route(routeName, `🔥 Sending burn() tx... amount=${amountFormatted}`);

  const tx = await wzkLTCBaseSep.burn(amount, walletSet.address, {
    gasLimit: 200000,
  });

  log.route(routeName, `📋 TX submitted: ${tx.hash}`);

  const receipt = await tx.wait(1);
  if (receipt.status !== 1) {
    log.error(`❌ Burn TX reverted!`);
    return false;
  }

  log.route(routeName, `✅ Burn confirmed! Gas used: ${receipt.gasUsed.toString()}`);

  // Wait for relayer to unlock on LiteForge
  const result = await waitForRelayer({
    type: 'native',
    chain: 'liteforge',
    address: walletSet.address,
    previousBalance: prevNativeBal,
    log: (msg) => log.route(routeName, msg),
  });

  return result.success;
}

// ============================================================
//  Route 4: LiteForge → Base Sepolia
//  User calls lock() on BridgeVaultV2 with destChainId=84532
// ============================================================
export async function bridgeLiteforgeToBaseSepolia(walletSet, log) {
  const routeName = 'LiteForge → Base Sepolia';
  const amount = randomBridgeAmount();
  const amountFormatted = ethers.formatEther(amount);

  log.route(routeName, `🚀 Initiating bridge of ${amountFormatted} zkLTC`);

  const lfRpc = getLiteforgeRpc();
  const bsRpc = getBaseSepoliaRpc();

  // Check source balance
  const srcBalance = await lfRpc.withFallback(p => p.getBalance(walletSet.address));
  if (srcBalance < amount + ethers.parseEther('0.001')) {
    log.warn(`Insufficient LiteForge balance: ${ethers.formatEther(srcBalance)} zkLTC, need ${amountFormatted}+gas`);
    return false;
  }

  // Get destination token balance before (with fallback)
  const prevTokenBal = await bsRpc.withFallback(p => {
    const token = new ethers.Contract(config.contracts.wrappedZkLTCBaseSepolia, WrappedZkLTCABI, p);
    return token.balanceOf(walletSet.address);
  });

  // Execute lock
  const vault = new ethers.Contract(
    config.contracts.bridgeVault,
    BridgeVaultV2ABI,
    walletSet.liteforge
  );

  log.route(routeName, `📤 Sending lock() tx... amount=${amountFormatted} destChainId=84532`);

  const tx = await vault.lock(walletSet.address, 84532, {
    value: amount,
    gasLimit: 200000,
  });

  log.route(routeName, `📋 TX submitted: ${tx.hash}`);

  const receipt = await tx.wait(1);
  if (receipt.status !== 1) {
    log.error(`❌ Lock TX reverted!`);
    return false;
  }

  log.route(routeName, `✅ Lock confirmed! Gas used: ${receipt.gasUsed.toString()}`);

  // Wait for relayer to mint on Base Sepolia
  const result = await waitForRelayer({
    type: 'token',
    chain: 'baseSepolia',
    address: walletSet.address,
    previousBalance: prevTokenBal,
    tokenAddress: config.contracts.wrappedZkLTCBaseSepolia,
    log: (msg) => log.route(routeName, msg),
  });

  return result.success;
}
