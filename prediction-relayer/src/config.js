import 'dotenv/config';

const config = {
  // RPC
  rpcUrlPrimary: process.env.RPC_URL_PRIMARY || 'https://rpc.liteforge.network',
  rpcUrlFallback: process.env.RPC_URL_FALLBACK || '',

  // Contract
  contractAddress: process.env.CONTRACT_ADDRESS,
  contractDeployBlock: parseInt(process.env.CONTRACT_DEPLOY_BLOCK || '0'),

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

  // Relayer
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000'),
  blockChunkSize: parseInt(process.env.BLOCK_CHUNK_SIZE || '50'),
  autoCloseCheckIntervalMs: parseInt(process.env.AUTO_CLOSE_CHECK_INTERVAL_MS || '30000'),

  // Admin API
  adminPort: parseInt(process.env.ADMIN_PORT || '3002'),
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
  adminPassphrase: process.env.ADMIN_PASSPHRASE || '',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || './logs',
};

export default config;
