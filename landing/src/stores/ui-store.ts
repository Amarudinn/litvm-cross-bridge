import { create } from 'zustand'

type UiState = {
  isScrolled: boolean
  activeSection: string
  setScrolled: (value: boolean) => void
  setActiveSection: (section: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  isScrolled: false,
  activeSection: 'hero',
  setScrolled: (value) => set({ isScrolled: value }),
  setActiveSection: (section) => set({ activeSection: section }),
}))
