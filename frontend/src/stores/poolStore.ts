import { create } from 'zustand'
import { SEPOLIA_CHAIN_ID } from '@/config/contracts'
import type { FeeTier, Position } from '@/config/pools'

export type PoolView = 'list' | 'add' | 'remove'

export interface PoolStore {
  // View state
  view: PoolView
  selectedChainId: number

  // Add liquidity
  token0Symbol: string
  token1Symbol: string
  feeTier: FeeTier
  amount0: string
  amount1: string
  priceLower: string
  priceUpper: string
  fullRange: boolean

  // Remove liquidity
  selectedPosition: Position | null
  selectedTokenId: string | null
  removePercent: number

  // Actions
  setView: (view: PoolView) => void
  setSelectedChainId: (chainId: number) => void
  setToken0Symbol: (symbol: string) => void
  setToken1Symbol: (symbol: string) => void
  setFeeTier: (tier: FeeTier) => void
  setAmount0: (amount: string) => void
  setAmount1: (amount: string) => void
  setPriceLower: (price: string) => void
  setPriceUpper: (price: string) => void
  setFullRange: (full: boolean) => void
  setSelectedPosition: (position: Position | null) => void
  setSelectedTokenId: (tokenId: string | null) => void
  setRemovePercent: (percent: number) => void
  resetAddForm: () => void
  resetRemoveForm: () => void
}

export const usePoolStore = create<PoolStore>((set) => ({
  view: 'list',
  selectedChainId: SEPOLIA_CHAIN_ID,

  token0Symbol: '',
  token1Symbol: '',
  feeTier: 3000,
  amount0: '',
  amount1: '',
  priceLower: '',
  priceUpper: '',
  fullRange: true,

  selectedPosition: null,
  selectedTokenId: null,
  removePercent: 100,

  setView: (view) => set({ view }),
  setSelectedChainId: (chainId) => set({ selectedChainId: chainId }),
  setToken0Symbol: (symbol) => set({ token0Symbol: symbol }),
  setToken1Symbol: (symbol) => set({ token1Symbol: symbol }),
  setFeeTier: (tier) => set({ feeTier: tier }),
  setAmount0: (amount) => set({ amount0: amount }),
  setAmount1: (amount) => set({ amount1: amount }),
  setPriceLower: (price) => set({ priceLower: price }),
  setPriceUpper: (price) => set({ priceUpper: price }),
  setFullRange: (full) => set({ fullRange: full }),
  setSelectedPosition: (position) => set({ selectedPosition: position }),
  setSelectedTokenId: (tokenId) => set({ selectedTokenId: tokenId }),
  setRemovePercent: (percent) => set({ removePercent: percent }),
  resetAddForm: () =>
    set({
      token0Symbol: '',
      token1Symbol: '',
      feeTier: 3000,
      amount0: '',
      amount1: '',
      priceLower: '',
      priceUpper: '',
      fullRange: true,
    }),
  resetRemoveForm: () =>
    set({
      selectedPosition: null,
      removePercent: 100,
    }),
}))
