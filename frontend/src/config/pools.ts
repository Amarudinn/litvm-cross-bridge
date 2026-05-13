import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from './contracts'

export type FeeTier = 500 | 3000 | 10000 // 0.05%, 0.3%, 1%

export interface Pool {
  id: string
  token0: string
  token1: string
  feeTier: FeeTier
  chainId: number
  address: string
}

export interface Position {
  id: string
  poolId: string
  token0: string
  token1: string
  feeTier: FeeTier
  chainId: number
  liquidity: string
  tickLower: number
  tickUpper: number
  priceLower: string
  priceUpper: string
  amount0: string
  amount1: string
  uncollectedFees0: string
  uncollectedFees1: string
  inRange: boolean
}

// Real deployed pools
export const POOLS: Pool[] = [
  // LiteForge — fee tier 10000 (correct price)
  {
    id: 'lf-multy-weth',
    token0: 'MULTY',
    token1: 'WETH',
    feeTier: 10000,
    chainId: LITEFORGE_CHAIN_ID,
    address: '0x55f35443411fF7f37Bf2e0D5e4a8DcF06Acc9EA5',
  },
  // Sepolia — fee tier 10000 (correct price)
  {
    id: 'sep-wzkltc-multy',
    token0: 'wzkLTC',
    token1: 'MULTY',
    feeTier: 10000,
    chainId: SEPOLIA_CHAIN_ID,
    address: '0xE325cFe007023829E8ea78A84A6E62618eC75E8E',
  },
  {
    id: 'sep-wzkltc-weth',
    token0: 'wzkLTC',
    token1: 'WETH',
    feeTier: 500,
    chainId: SEPOLIA_CHAIN_ID,
    address: '0x7F2AB3b15504B930e413Db3aeb90B0aC6Bd10f52',
  },
  {
    id: 'sep-multy-weth',
    token0: 'MULTY',
    token1: 'WETH',
    feeTier: 10000,
    chainId: SEPOLIA_CHAIN_ID,
    address: '0x5b84a02af4B4f28e2cE85b4988984524FD65fA16',
  },
  // Base Sepolia — fee tier 10000 (correct price)
  {
    id: 'base-wzkltc-multy',
    token0: 'wzkLTC',
    token1: 'MULTY',
    feeTier: 10000,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    address: '0x87604c426f6cA5BFccB2521c80eF6B6A4e9c7F1B',
  },
  {
    id: 'base-wzkltc-weth',
    token0: 'wzkLTC',
    token1: 'WETH',
    feeTier: 500,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    address: '0xD5CDd380d04E172A57078F6416f6B9c011E12B6a',
  },
  {
    id: 'base-multy-weth',
    token0: 'MULTY',
    token1: 'WETH',
    feeTier: 10000,
    chainId: BASE_SEPOLIA_CHAIN_ID,
    address: '0xe6D2562D214D7a4Fd7bA72422713cA2A854dD1BA',
  },
]

export function getPoolsByChain(chainId: number): Pool[] {
  return POOLS.filter((p) => p.chainId === chainId)
}

export function getFeeTierLabel(tier: FeeTier): string {
  switch (tier) {
    case 500:
      return '0.05%'
    case 3000:
      return '0.3%'
    case 10000:
      return '1%'
  }
}
