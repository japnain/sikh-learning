import { create } from 'zustand'
import type { LearnDetailRailKey } from '../utils/learnRails'

interface LearnRailState {
  activeSectionId: string | null
  activeDetailSectionId: string | null
  visibleDetailRailKey: LearnDetailRailKey | null
  setActiveSectionId: (sectionId: string | null) => void
  setActiveDetailSectionId: (sectionId: string | null) => void
  setVisibleDetailRailKey: (key: LearnDetailRailKey | null) => void
  reset: () => void
}

export const useLearnRailStore = create<LearnRailState>(set => ({
  activeSectionId: null,
  activeDetailSectionId: null,
  visibleDetailRailKey: null,
  setActiveSectionId: (activeSectionId) => set({ activeSectionId }),
  setActiveDetailSectionId: (activeDetailSectionId) => set({ activeDetailSectionId }),
  setVisibleDetailRailKey: (visibleDetailRailKey) => set({ visibleDetailRailKey }),
  reset: () => set({ activeSectionId: null, activeDetailSectionId: null, visibleDetailRailKey: null }),
}))
