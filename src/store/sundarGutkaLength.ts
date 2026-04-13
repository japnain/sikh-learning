import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SundarGutkaLength } from '../types'
import {
  SUNDAR_GUTKA_SUPPORTED_BANI_IDS,
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  asSupportedSundarGutkaBaniId,
  normalizeLegacyStoredSundarGutkaLength,
  type SupportedSundarGutkaBaniId,
} from '../utils/sundarGutkaLength'

type SundarGutkaLengthStateMap = Record<SupportedSundarGutkaBaniId, SundarGutkaLength>

interface SundarGutkaLengthState {
  lengths: SundarGutkaLengthStateMap
  setLength: (baniId: SupportedSundarGutkaBaniId, length: SundarGutkaLength) => void
  reset: () => void
}

function createDefaultLengths(): SundarGutkaLengthStateMap {
  return SUNDAR_GUTKA_SUPPORTED_BANI_IDS.reduce((defaults, baniId) => {
    defaults[baniId] = SUNDAR_GUTKA_SUPPORTED_BANIS[baniId].defaultLength
    return defaults
  }, {} as SundarGutkaLengthStateMap)
}

export const DEFAULT_SUNDAR_GUTKA_LENGTHS = createDefaultLengths()

export const useSundarGutkaLengthStore = create<SundarGutkaLengthState>()(
  persist(
    (set) => ({
      lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS },
      setLength: (baniId, length) => set(state => ({
        lengths: {
          ...state.lengths,
          [baniId]: length,
        },
      })),
      reset: () => set({ lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS } }),
    }),
    {
      name: 'sikh-sundar-gutka-lengths',
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<SundarGutkaLengthState>
        const nextLengths = { ...DEFAULT_SUNDAR_GUTKA_LENGTHS }
        const persistedLengths = state.lengths ?? {}

        for (const [key, value] of Object.entries(persistedLengths)) {
          const baniId = asSupportedSundarGutkaBaniId(key)
          if (!baniId) continue
          if (value === 'short' || value === 'medium' || value === 'long' || value === 'extralong') {
            nextLengths[baniId] = normalizeLegacyStoredSundarGutkaLength(baniId, value)
          }
        }

        return {
          lengths: nextLengths,
          setLength: () => undefined,
          reset: () => undefined,
        }
      },
    }
  )
)

export function getStoredSundarGutkaLength(
  baniId: string | null | undefined
): SundarGutkaLength | null {
  const supportedBaniId = asSupportedSundarGutkaBaniId(baniId)
  if (!supportedBaniId) return null
  return useSundarGutkaLengthStore.getState().lengths[supportedBaniId] ?? DEFAULT_SUNDAR_GUTKA_LENGTHS[supportedBaniId]
}
