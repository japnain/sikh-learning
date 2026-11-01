import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface ReadingVisibilityState {
  hidden: Record<string, string>
  hide: (id: string, updatedAt: string) => void
  restore: (id: string) => void
  restoreAll: () => void
}

function normalizeHidden(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value)
    .filter(([id, date]) => id.length > 0 && id.length <= 500 && typeof date === 'string' && Number.isFinite(Date.parse(date)))
    .sort((a, b) => Date.parse(b[1] as string) - Date.parse(a[1] as string))
    .slice(0, 100))
}

// Hiding is a shelf preference, not deletion of a saved reading position.
// A newly updated position naturally becomes visible again.
export const useReadingVisibilityStore = create<ReadingVisibilityState>()(persist(
  set => ({
    hidden: {},
    hide: (id, updatedAt) => set(state => ({ hidden: normalizeHidden({ ...state.hidden, [id]: updatedAt }) })),
    restore: id => set(state => ({ hidden: Object.fromEntries(Object.entries(state.hidden).filter(([key]) => key !== id)) })),
    restoreAll: () => set({ hidden: {} }),
  }),
  {
    name: 'naamras-reading-visibility',
    version: 1,
    storage: createJSONStorage(() => ({
      getItem: key => { try { return localStorage.getItem(key) } catch { return null } },
      setItem: (key, value) => { try { localStorage.setItem(key, value) } catch { /* Keep reversible shelf choices usable for this session. */ } },
      removeItem: key => { try { localStorage.removeItem(key) } catch { /* In-memory state remains usable. */ } },
    })),
    partialize: state => ({ hidden: state.hidden }),
    merge: (persisted, current) => ({ ...current, hidden: normalizeHidden((persisted as { hidden?: unknown } | null)?.hidden) }),
  },
))
