import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from './contracts'

export interface Token {
  symbol: string
  name: string
  decimals: number
  address: string | 'native'
  icon: string
  chainId: number
}

// LiteForge tokens
export const LITEFORGE_TOKENS: Token[] = [
  {
    symbol: 'zkLTC',
    name: 'zkLTC',
    decimals: 18,
    address: 'native',
    icon: '/ltc.png',
    chainId: LITEFORGE_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    address: '0xBD0d30231F3DFaaFF0DbE4ce5f68Ba976E934042',
    icon: '/eth.png',
    chainId: LITEFORGE_CHAIN_ID,
  },
  {
    symbol: 'MULTY',
    name: 'Multyra',
    decimals: 18,
    address: '0x4630632194D44BC7205BA41CBB0a2014AD36A4Fc',
    icon: '/multyra.png',
    chainId: LITEFORGE_CHAIN_ID,
  },
  {
    symbol: 'WDEX',
    name: 'Wolfdex',
    decimals: 18,
    address: '0xEa71393074fFCB6d132B8a2b6028CAF952af03A5',
    icon: '/wolfdex.jpg',
    chainId: LITEFORGE_CHAIN_ID,
  },
  {
    symbol: 'vzkLTC',
    name: 'vzkLTC',
    decimals: 18,
    address: '0x9E1F296300C73cF96489E5e5383B0e17c2c2De48',
    icon: '/vzkLTC.png',
    chainId: LITEFORGE_CHAIN_ID,
  },
]

// Sepolia tokens
export const SEPOLIA_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    address: 'native',
    icon: '/eth.png',
    chainId: SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'wzkLTC',
    name: 'Wrapped zkLTC',
    decimals: 18,
    address: '0x4320BB234A76f94F9eeDD0E81968668C6d29c39f',
    icon: '/ltc.png',
    chainId: SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    icon: '/eth.png',
    chainId: SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'MULTY',
    name: 'Multyra',
    decimals: 18,
    address: '0x12472B2115849f146c10Cc435bc329423A08FC19',
    icon: '/multyra.png',
    chainId: SEPOLIA_CHAIN_ID,
  },
]

// Base Sepolia tokens
export const BASE_SEPOLIA_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    address: 'native',
    icon: '/eth.png',
    chainId: BASE_SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'wzkLTC',
    name: 'Wrapped zkLTC',
    decimals: 18,
    address: '0xB378f0359815ECEC5Ae3c5aC4c49c12b70931688',
    icon: '/ltc.png',
    chainId: BASE_SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    address: '0x4200000000000000000000000000000000000006',
    icon: '/eth.png',
    chainId: BASE_SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'MULTY',
    name: 'Multyra',
    decimals: 18,
    address: '0x1cBbf0AC851414A95c82CAa9032778203398dCd7',
    icon: '/multyra.png',
    chainId: BASE_SEPOLIA_CHAIN_ID,
  },
]

export function getTokensByChain(chainId: number): Token[] {
  switch (chainId) {
    case LITEFORGE_CHAIN_ID:
      return LITEFORGE_TOKENS
    case SEPOLIA_CHAIN_ID:
      return SEPOLIA_TOKENS
    case BASE_SEPOLIA_CHAIN_ID:
      return BASE_SEPOLIA_TOKENS
    default:
      return []
  }
}

export function getToken(chainId: number, symbol: string): Token | undefined {
  return getTokensByChain(chainId).find((t) => t.symbol === symbol)
}
