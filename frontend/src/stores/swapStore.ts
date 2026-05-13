import { create } from 'zustand'
import { LITEFORGE_CHAIN_ID } from '@/config/contracts'
import type { Token } from '@/config/tokens'

export type SlippagePreset = '0.1' | '0.5' | '1.0' | 'custom'

export interface SwapRoute {
  path: string[] // token symbols in order
  pools: string[] // pool IDs used
  estimatedOutput: string
  priceImpact: string
  isCrossChain: boolean
  bridgeFee?: string
}

export interface SwapStore {
  // Chain selection
  fromChainId: number
  toChainId: number

  // Token selection
  tokenIn: Token | null
  tokenOut: Token | null

  // Amounts
  amountIn: string
  amountOut: string

  // Settings
  slippage: string
  slippagePreset: SlippagePreset
  deadline: number // minutes

  // Route
  route: SwapRoute | null
  isLoadingRoute: boolean

  // Actions
  setFromChainId: (chainId: number) => void
  setToChainId: (chainId: number) => void
  setTokenIn: (token: Token | null) => void
  setTokenOut: (token: Token | null) => void
  setAmountIn: (amount: string) => void
  setAmountOut: (amount: string) => void
  setSlippage: (slippage: string) => void
  setSlippagePreset: (preset: SlippagePreset) => void
  setDeadline: (minutes: number) => void
  setRoute: (route: SwapRoute | null) => void
  setIsLoadingRoute: (loading: boolean) => void
  switchTokens: () => void
  resetSwap: () => void
}

export const useSwapStore = create<SwapStore>((set) => ({
  fromChainId: LITEFORGE_CHAIN_ID,
  toChainId: LITEFORGE_CHAIN_ID,

  tokenIn: null,
  tokenOut: null,

  amountIn: '',
  amountOut: '',

  slippage: '0.5',
  slippagePreset: '0.5',
  deadline: 20,

  route: null,
  isLoadingRoute: false,

  setFromChainId: (chainId) => set({ fromChainId: chainId, tokenIn: null, amountIn: '', amountOut: '', route: null }),
  setToChainId: (chainId) => set({ toChainId: chainId, tokenOut: null, amountIn: '', amountOut: '', route: null }),
  setTokenIn: (token) => set({ tokenIn: token, amountIn: '', amountOut: '', route: null }),
  setTokenOut: (token) => set({ tokenOut: token, amountIn: '', amountOut: '', route: null }),
  setAmountIn: (amount) => set({ amountIn: amount }),
  setAmountOut: (amount) => set({ amountOut: amount }),
  setSlippage: (slippage) => set({ slippage }),
  setSlippagePreset: (preset) => set({ slippagePreset: preset, slippage: preset === 'custom' ? '' : preset }),
  setDeadline: (minutes) => set({ deadline: minutes }),
  setRoute: (route) => set({ route }),
  setIsLoadingRoute: (loading) => set({ isLoadingRoute: loading }),
  switchTokens: () =>
    set((state) => ({
      tokenIn: state.tokenOut,
      tokenOut: state.tokenIn,
      fromChainId: state.toChainId,
      toChainId: state.fromChainId,
      amountIn: '',
      amountOut: '',
      route: null,
    })),
  resetSwap: () =>
    set({
      amountIn: '',
      amountOut: '',
      route: null,
      isLoadingRoute: false,
    }),
}))
