import 'dotenv/config';

/**
 * Parse comma-separated RPC URLs with fallback to single URL
 */
function parseRpcUrls(envKey, defaults) {
  const raw = process.env[envKey] || '';
  const urls = raw.split(',').map(u => u.trim()).filter(Boolean);
  return urls.length > 0 ? urls : defaults;
}

export const config = {
  // Wallet private keys
  wallets: [
    process.env.WALLET_1_PRIVATE_KEY,
    process.env.WALLET_2_PRIVATE_KEY,
    process.env.WALLET_3_PRIVATE_KEY,
  ].filter(Boolean),

  // Bridge amount range (in ether)
  bridgeAmountMin: parseFloat(process.env.BRIDGE_AMOUNT_MIN || '0.011'),
  bridgeAmountMax: parseFloat(process.env.BRIDGE_AMOUNT_MAX || '0.1'),

  // Delays (ms)
  relayerWaitPollMs: parseInt(process.env.RELAYER_WAIT_POLL_MS || '10000'),
  relayerWaitTimeoutMs: parseInt(process.env.RELAYER_WAIT_TIMEOUT_MS || '300000'),
  delayBetweenRoutesMs: parseInt(process.env.DELAY_BETWEEN_ROUTES_MS || '5000'),
  delayBetweenLoopsMs: parseInt(process.env.DELAY_BETWEEN_LOOPS_MS || '10000'),

  // Chains (multiple RPCs with fallback)
  liteforge: {
    name: 'LiteForge',
    chainId: 4441,
    rpcUrls: parseRpcUrls('LITEFORGE_RPC_URLS', ['https://liteforge.rpc.caldera.xyz/http']),
  },
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrls: parseRpcUrls('SEPOLIA_RPC_URLS', [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://rpc.sepolia.org',
      'https://sepolia.drpc.org',
      'https://1rpc.io/sepolia',
    ]),
  },
  baseSepolia: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrls: parseRpcUrls('BASE_SEPOLIA_RPC_URLS', [
      'https://sepolia.base.org',
      'https://base-sepolia-rpc.publicnode.com',
      'https://base-sepolia.drpc.org',
    ]),
  },

  // Contracts
  contracts: {
    bridgeVault: process.env.BRIDGE_VAULT_ADDRESS || '0x9929ED0EdA9ecF57BDAB6423B4b12cDe3317196d',
    wrappedZkLTCSepolia: process.env.WRAPPED_ZKLTC_SEPOLIA_ADDRESS || '0x4320BB234A76f94F9eeDD0E81968668C6d29c39f',
    wrappedZkLTCBaseSepolia: process.env.WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS || '0xB378f0359815ECEC5Ae3c5aC4c49c12b70931688',
  },
};

/**
 * Validate required configuration
 */
export function validateConfig() {
  if (config.wallets.length === 0) {
    throw new Error('No wallet private keys configured. Set WALLET_1_PRIVATE_KEY, WALLET_2_PRIVATE_KEY, WALLET_3_PRIVATE_KEY in .env');
  }

  if (config.bridgeAmountMin <= 0 || config.bridgeAmountMax <= 0) {
    throw new Error('Bridge amount min/max must be positive');
  }

  if (config.bridgeAmountMin > config.bridgeAmountMax) {
    throw new Error('BRIDGE_AMOUNT_MIN must be <= BRIDGE_AMOUNT_MAX');
  }

  return true;
}
