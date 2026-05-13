import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from './contracts'

// MultyraRouter (Aggregator) addresses per chain
export const MULTYRA_ROUTER_ADDRESS: Record<number, string> = {
  [LITEFORGE_CHAIN_ID]: '0x9D2aD458a789723b8848AeD51c05F4D1fBdB1111',
  [SEPOLIA_CHAIN_ID]: '0x4A16218cb6b39cE2a0Cb2c596C33e4B6957265E0',
  [BASE_SEPOLIA_CHAIN_ID]: '0xDfAb13959371EFF8fdd71aecD1403FD78b743eE0',
}

// UniswapV3 Factory addresses per chain
export const UNISWAP_V3_FACTORY: Record<number, string> = {
  [LITEFORGE_CHAIN_ID]: '0x2305fd1Ebc0f5F3b59bdD06cda6090a4EBe7714D',
  [SEPOLIA_CHAIN_ID]: '0x38aE7cDAA138Df4da2b228CAB81bd3b0ea8923E6',
  [BASE_SEPOLIA_CHAIN_ID]: '0x622C7B14fF74bFeC9B82459F3dab954f82b47d7a',
}

// UniswapV3 SwapRouter addresses per chain
export const UNISWAP_V3_ROUTER: Record<number, string> = {
  [LITEFORGE_CHAIN_ID]: '0x97A0A49BF8B5EF5033F18855bE7ff6F0dA34a913',
  [SEPOLIA_CHAIN_ID]: '0xb585F4f0ac1537D3e5fb69e7FB8726b4AAe1B2f9',
  [BASE_SEPOLIA_CHAIN_ID]: '0x42fF1a3dD7C9384E6955394e297b2Aaa4399535f',
}

// NonfungiblePositionManager addresses per chain
export const POSITION_MANAGER: Record<number, string> = {
  [LITEFORGE_CHAIN_ID]: '0x660b3ad887486F30cc43f7e57280C96590637077',
  [SEPOLIA_CHAIN_ID]: '0x805BfFBa7dfCAf725Fcc8Bb56630333aA8241449',
  [BASE_SEPOLIA_CHAIN_ID]: '0x5e04Ca8bD75daf0418bb1abd95c6C35F6e46D814',
}

// QuoterV2 addresses per chain
export const QUOTER_V2: Record<number, string> = {
  [LITEFORGE_CHAIN_ID]: '0x344bBD93f45f906c44A426C396C9E64F0f686c44',
  [SEPOLIA_CHAIN_ID]: '0xe168E339fd38bfEd7653a251879180A176312a2C',
  [BASE_SEPOLIA_CHAIN_ID]: '0xCAbe1099fC87Ca2E2e9126c0Da1A592ab9a5D0Bc',
}

// WETH addresses per chain
export const WETH_ADDRESS: Record<number, string> = {
  [LITEFORGE_CHAIN_ID]: '0xBD0d30231F3DFaaFF0DbE4ce5f68Ba976E934042',
  [SEPOLIA_CHAIN_ID]: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  [BASE_SEPOLIA_CHAIN_ID]: '0x4200000000000000000000000000000000000006',
}

// Aggregator fee: 0.1% (10 basis points)
export const AGGREGATOR_FEE_BPS = 10
export const FEE_DENOMINATOR = 10000

// Supported chains for swap
export const SWAP_CHAINS = [
  { chainId: LITEFORGE_CHAIN_ID, name: 'LiteForge', icon: '/litvm.png' },
  { chainId: SEPOLIA_CHAIN_ID, name: 'Ethereum Sepolia', icon: '/eth.png' },
  { chainId: BASE_SEPOLIA_CHAIN_ID, name: 'Base Sepolia', icon: '/base.jpeg' },
] as const
