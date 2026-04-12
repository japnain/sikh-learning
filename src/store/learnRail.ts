import { create } from 'zustand'

interface LearnRailState {
  activeSectionId: string | null
  setActiveSectionId: (sectionId: string | null) => void
  reset: () => void
}

export const useLearnRailStore = create<LearnRailState>(set => ({
  activeSectionId: null,
  setActiveSectionId: (activeSectionId) => set({ activeSectionId }),
  reset: () => set({ activeSectionId: null }),
}))
