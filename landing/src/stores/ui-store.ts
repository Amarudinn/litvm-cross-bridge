import { create } from 'zustand'

type UiState = {
  isScrolled: boolean
  activeSection: string
  navVisible: boolean
  sections: string[]
  setScrolled: (value: boolean) => void
  setActiveSection: (section: string) => void
  setNavVisible: (value: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  isScrolled: false,
  activeSection: 'hero',
  navVisible: true,
  sections: ['hero', 'stats', 'features', 'how-it-works', 'chains'],
  setScrolled: (value) => set({ isScrolled: value }),
  setActiveSection: (section) => set({ activeSection: section }),
  setNavVisible: (value) => set({ navVisible: value }),
}))
