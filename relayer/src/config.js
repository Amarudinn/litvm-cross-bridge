import 'dotenv/config';

/**
 * Parse comma-separated RPC URLs, with fallback to legacy single URL env var.
 */
function parseRpcUrls(multiEnv, singleEnv, defaults) {
  const raw = process.env[multiEnv] || process.env[singleEnv] || '';
  const urls = raw.split(',').map(u => u.trim()).filter(Boolean);
  return urls.length > 0 ? urls : defaults;
}

export const config = {
  // Relayer wallet
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY,

  // Chain: LiteForge
  liteforge: {
    name: 'LiteForge',
    chainId: parseInt(process.env.LITEFORGE_CHAIN_ID || '4441'),
    rpcUrls: parseRpcUrls('LITEFORGE_RPC_URLS', 'LITEFORGE_RPC_URL', ['https://liteforge.rpc.caldera.xyz/http']),
    explorerUrl: 'https://liteforge.explorer.caldera.xyz',
    bridgeVaultAddress: process.env.BRIDGE_VAULT_ADDRESS,
  },

  // Chain: Sepolia
  sepolia: {
    name: 'Sepolia',
    chainId: parseInt(process.env.SEPOLIA_CHAIN_ID || '11155111'),
    rpcUrls: parseRpcUrls('SEPOLIA_RPC_URLS', 'SEPOLIA_RPC_URL', []),
    explorerUrl: 'https://sepolia.etherscan.io',
    wrappedZkLTCAddress: process.env.WRAPPED_ZKLTC_ADDRESS,
  },

  // Relayer settings
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000'),
  confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '3'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '5'),

  // Concurrency settings
  mintConcurrency: parseInt(process.env.MINT_CONCURRENCY || '3'),
  unlockConcurrency: parseInt(process.env.UNLOCK_CONCURRENCY || '3'),

  // Supabase (optional - for indexing)
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',

  // Database
  dbPath: process.env.DB_PATH || './data/relayer.db',

  // Admin API
  adminPort: parseInt(process.env.ADMIN_PORT || '3001'),
  adminApiKey: process.env.ADMIN_API_KEY || '',
};

/**
 * Validate required config values
 */
export function validateConfig() {
  const required = [
    ['RELAYER_PRIVATE_KEY', config.relayerPrivateKey],
    ['LITEFORGE_RPC_URLS', config.liteforge.rpcUrls.length > 0],
    ['SEPOLIA_RPC_URLS', config.sepolia.rpcUrls.length > 0],
    ['BRIDGE_VAULT_ADDRESS', config.liteforge.bridgeVaultAddress],
    ['WRAPPED_ZKLTC_ADDRESS', config.sepolia.wrappedZkLTCAddress],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
