import { create } from 'zustand'
import type { StorySummary } from '../types/stories'
import { parseSummary } from '../data/storyValidation'

export const STORY_STATE_STORAGE_KEY = 'naamras-story-state-v1'

export interface StoryPosition {
  paragraphId: string
  progress: number
  revision: number
  updatedAt: string
  finishedAt?: string
}

export type SavedStory = StorySummary & { savedAt: string }
type PositionInput = Omit<StoryPosition, 'updatedAt'>

interface CachedStoryState {
  saved: Record<string, SavedStory>
  positions: Record<string, StoryPosition>
}

interface StoryState extends CachedStoryState {
  hydrateCachedStories: () => void
  saveStory: (summary: StorySummary) => boolean
  removeStory: (id: string) => boolean
  savePosition: (id: string, position: PositionInput) => boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 120
    && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
    && value !== 'constructor' && value !== 'prototype'
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function normalizeSummary(value: unknown): StorySummary | null {
  return parseSummary(value)
}

function normalizePosition(value: unknown): StoryPosition | null {
  if (!isRecord(value) || !isId(value.paragraphId)
    || typeof value.progress !== 'number' || !Number.isFinite(value.progress)
    || value.progress < 0 || value.progress > 1 || !isPositiveInteger(value.revision)
    || !isDate(value.updatedAt)
    || (value.finishedAt !== undefined && !isDate(value.finishedAt))) return null
  return {
    paragraphId: value.paragraphId, progress: value.progress,
    revision: value.revision, updatedAt: value.updatedAt,
    ...(value.finishedAt === undefined ? {} : { finishedAt: value.finishedAt }),
  }
}

function emptyState(): CachedStoryState {
  return { saved: {}, positions: {} }
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage ?? null
  } catch {
    return null
  }
}

function readCachedState(): CachedStoryState {
  const result = emptyState()
  try {
    const raw = storage()?.getItem(STORY_STATE_STORAGE_KEY)
    if (!raw) return result
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || value.version !== 1) return result
    if (isRecord(value.saved)) {
      for (const [id, candidate] of Object.entries(value.saved)) {
        const summary = normalizeSummary(candidate)
        if (summary && id === summary.id && isRecord(candidate) && isDate(candidate.savedAt)) {
          result.saved[id] = { ...summary, savedAt: candidate.savedAt }
        }
      }
    }
    if (isRecord(value.positions)) {
      for (const [id, candidate] of Object.entries(value.positions)) {
        const position = normalizePosition(candidate)
        if (isId(id) && position) result.positions[id] = position
      }
    }
  } catch {
    // Malformed or inaccessible local state never prevents reading.
  }
  return result
}

function persistState(state: CachedStoryState): boolean {
  try {
    const target = storage()
    if (!target) return false
    const serialized = JSON.stringify({ version: 1, saved: state.saved, positions: state.positions })
    target.setItem(STORY_STATE_STORAGE_KEY, serialized)
    return target.getItem(STORY_STATE_STORAGE_KEY) === serialized
  } catch {
    return false
  }
}

/** Story reading and saves stay on this device, independently of cloud bookmarks. */
export const useStoryStore = create<StoryState>()((set, get) => ({
  ...readCachedState(),
  hydrateCachedStories: () => set(readCachedState()),
  saveStory: (input) => {
    const summary = normalizeSummary(input)
    if (!summary) return false
    const previous = get().saved[summary.id]
    const saved = {
      ...get().saved,
      [summary.id]: { ...summary, savedAt: previous?.savedAt ?? new Date().toISOString() },
    }
    set({ saved })
    return persistState({ saved, positions: get().positions })
  },
  removeStory: (id) => {
    if (!isId(id)) return false
    const saved = { ...get().saved }
    delete saved[id]
    set({ saved })
    return persistState({ saved, positions: get().positions })
  },
  savePosition: (id, input) => {
    if (!isId(id)) return false
    const position = normalizePosition({ ...input, updatedAt: new Date().toISOString() })
    if (!position) return false
    const positions = { ...get().positions, [id]: position }
    set({ positions })
    return persistState({ saved: get().saved, positions })
  },
}))
