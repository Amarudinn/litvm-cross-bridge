import { create } from 'zustand'

interface BalanceStore {
  version: number
  invalidate: () => void
}

export const useBalanceStore = create<BalanceStore>((set) => ({
  version: 0,
  invalidate: () => set((s) => ({ version: s.version + 1 })),
}))
