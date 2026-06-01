import { create } from 'zustand'

export type SavedFeedbackKind = 'bookmark' | 'favorite' | 'review'

export interface SavedFeedback {
  kind: SavedFeedbackKind
  targetId: string
  surfacedAt: string
}

interface SavedFeedbackState {
  lastSaved: SavedFeedback | null
  recordSaved: (feedback: SavedFeedback) => void
  clearSaved: () => void
}

export const SAVED_FEEDBACK_TTL_MS = 2800

let clearTimer: number | null = null

function resetClearTimer() {
  if (typeof window === 'undefined' || clearTimer === null) return
  window.clearTimeout(clearTimer)
  clearTimer = null
}

export function buildVocabFeedbackId(entry: { word: string; kind?: string }): string {
  return `${entry.kind ?? 'word'}:${entry.word}`
}

export const useSavedFeedbackStore = create<SavedFeedbackState>()((set, get) => ({
  lastSaved: null,
  recordSaved: (feedback) => {
    set({ lastSaved: feedback })

    if (typeof window === 'undefined') return

    resetClearTimer()
    clearTimer = window.setTimeout(() => {
      const current = get().lastSaved
      if (
        current
        && current.kind === feedback.kind
        && current.targetId === feedback.targetId
        && current.surfacedAt === feedback.surfacedAt
      ) {
        set({ lastSaved: null })
      }
      clearTimer = null
    }, SAVED_FEEDBACK_TTL_MS)
  },
  clearSaved: () => {
    resetClearTimer()
    set({ lastSaved: null })
  },
}))
