import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export type HomeArtworkMode = 'fixed' | 'daily' | 'visit'

// Kept lightweight so the default Home never downloads the gallery module.
// The catalog test checks this boundary against the existing artwork manifest.
export const HOME_ARTWORK_COLLECTION_IDS = [
  'court-mural', 'interior-audience', 'court-assembly', 'fort-procession',
  'string-and-tabla', 'devotional-interior', 'waterside-temple', 'miniature-collage',
  'rider-and-attendants', 'falconer-on-horseback', 'floral-teacher-mural',
  'golden-court-assembly', 'gurmukhi-floral-medallion', 'ceremonial-arms-display',
] as const

export const HOME_ARTWORK_STORAGE_KEY = 'naamras-home-artwork'

export interface HomeArtworkPreference {
  mode: HomeArtworkMode
  selectedId: string
}

export interface HomeArtworkState extends HomeArtworkPreference {
  visitIndex: number
  pendingVisit: boolean
  activeVisitToken: string | null
  lastVisitToken: string | null
  applyRevision: number
  applyPreferences: (preference: HomeArtworkPreference) => boolean
  beginVisit: (token: string) => void
  endVisit: (token: string) => void
}

export function isHomeArtworkId(id: unknown): id is string {
  return id === 'eclipse' || HOME_ARTWORK_COLLECTION_IDS.some(candidate => candidate === id)
}

export function normalizeHomeArtworkPreference(input: unknown): HomeArtworkPreference {
  const value = (input ?? {}) as Partial<HomeArtworkPreference>
  return {
    mode: value.mode === 'daily' || value.mode === 'visit' ? value.mode : 'fixed',
    selectedId: isHomeArtworkId(value.selectedId) ? value.selectedId : 'eclipse',
  }
}

export function getHomeArtworkId(
  preference: HomeArtworkPreference & { visitIndex?: number },
  date = new Date(),
): string {
  if (preference.mode === 'daily') {
    // Calendar dates, rather than elapsed local milliseconds, remain stable over DST.
    const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
    return HOME_ARTWORK_COLLECTION_IDS[((day % HOME_ARTWORK_COLLECTION_IDS.length) + HOME_ARTWORK_COLLECTION_IDS.length) % HOME_ARTWORK_COLLECTION_IDS.length]
  }
  if (preference.mode === 'visit') {
    const index = Math.max(0, preference.visitIndex ?? 0) % HOME_ARTWORK_COLLECTION_IDS.length
    return HOME_ARTWORK_COLLECTION_IDS[index]
  }
  return isHomeArtworkId(preference.selectedId) ? preference.selectedId : 'eclipse'
}

let storageWriteFailed = false
const safeStorage: StateStorage = {
  getItem: (key) => {
    try { return window.localStorage.getItem(key) } catch { return null }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(key, value) } catch { storageWriteFailed = true }
  },
  removeItem: (key) => {
    try { window.localStorage.removeItem(key) } catch { storageWriteFailed = true }
  },
}

export const useHomeArtworkStore = create<HomeArtworkState>()(
  persist(
    (set, get) => ({
      mode: 'fixed',
      selectedId: 'eclipse',
      visitIndex: -1,
      pendingVisit: false,
      activeVisitToken: null,
      lastVisitToken: null,
      applyRevision: 0,
      applyPreferences: (preference) => {
        const next = normalizeHomeArtworkPreference(preference)
        const current = get()
        const enteringVisit = next.mode === 'visit' && current.mode !== 'visit'
        storageWriteFailed = false
        set({
          ...next,
          applyRevision: current.applyRevision + 1,
          ...(enteringVisit ? {
            visitIndex: (current.visitIndex + 1) % HOME_ARTWORK_COLLECTION_IDS.length,
            pendingVisit: current.activeVisitToken === null,
          } : {}),
        })
        return !storageWriteFailed
      },
      beginVisit: (token) => {
        const state = get()
        if (state.lastVisitToken === token) {
          if (state.activeVisitToken !== token) set({ activeVisitToken: token })
          return
        }
        set({
          activeVisitToken: token,
          lastVisitToken: token,
          ...(state.mode === 'visit' ? {
            visitIndex: state.pendingVisit ? state.visitIndex : (state.visitIndex + 1) % HOME_ARTWORK_COLLECTION_IDS.length,
            pendingVisit: false,
          } : {}),
        })
      },
      endVisit: (token) => {
        if (get().activeVisitToken === token) set({ activeVisitToken: null })
      },
    }),
    {
      name: HOME_ARTWORK_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ mode, selectedId, visitIndex, pendingVisit }) => ({ mode, selectedId, visitIndex, pendingVisit }),
      merge: (persisted, current) => {
        const value = (persisted ?? {}) as Partial<HomeArtworkState>
        return {
          ...current,
          ...normalizeHomeArtworkPreference(value),
          visitIndex: typeof value.visitIndex === 'number' && Number.isInteger(value.visitIndex) && value.visitIndex >= -1
            ? value.visitIndex % HOME_ARTWORK_COLLECTION_IDS.length : -1,
          pendingVisit: value.pendingVisit === true,
        }
      },
    },
  ),
)
