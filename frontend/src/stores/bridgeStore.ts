import { create } from 'zustand'

export type DestChain = 'sepolia' | 'baseSepolia'

export interface BridgeStore {
  direction: 'lock' | 'burn'
  destChain: DestChain
  amount: string
  recipient: string

  activeTx: {
    hash: `0x${string}` | null
    status: 'idle' | 'signing' | 'confirming' | 'relaying' | 'completed' | 'failed'
    error?: string
    sourceNonce?: bigint
    startedAt?: number    // timestamp when tx submitted (confirming starts)
    completedAt?: number  // timestamp when relay completed
  }

  setDirection: (d: 'lock' | 'burn') => void
  toggleDirection: () => void
  setDestChain: (c: DestChain) => void
  setAmount: (a: string) => void
  setRecipient: (r: string) => void
  setActiveTx: (tx: Partial<BridgeStore['activeTx']>) => void
  resetActiveTx: () => void
  resetForm: () => void
}

export const useBridgeStore = create<BridgeStore>((set) => ({
  direction: 'lock',
  destChain: 'sepolia',
  amount: '',
  recipient: '',

  activeTx: {
    hash: null,
    status: 'idle',
  },

  setDirection: (d) => set({ direction: d }),
  toggleDirection: () =>
    set((state) => ({
      direction: state.direction === 'lock' ? 'burn' : 'lock',
      amount: '',
    })),
  setDestChain: (c) => set({ destChain: c }),
  setAmount: (a) => set({ amount: a }),
  setRecipient: (r) => set({ recipient: r }),
  setActiveTx: (tx) =>
    set((state) => ({
      activeTx: { ...state.activeTx, ...tx },
    })),
  resetActiveTx: () =>
    set({
      activeTx: { hash: null, status: 'idle' },
    }),
  resetForm: () =>
    set({
      amount: '',
      recipient: '',
      activeTx: { hash: null, status: 'idle' },
    }),
}))
