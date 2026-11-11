import { create } from 'zustand'
import { createLocalCollection } from '../utils/localCollection'
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
  restoreStory: (story: SavedStory) => boolean
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

type StoryRecord = { kind: 'saved'; id: string; value: SavedStory }
  | { kind: 'position'; id: string; value: StoryPosition }

function normalizeSaved(value: unknown): SavedStory | null {
  const summary = normalizeSummary(value)
  return summary && isRecord(value) && isDate(value.savedAt)
    ? { ...summary, savedAt: value.savedAt } : null
}

function normalizeRecord(value: unknown): StoryRecord | null {
  if (!isRecord(value) || !isId(value.id)) return null
  if (value.kind === 'saved') {
    const saved = normalizeSaved(value.value)
    return saved && saved.id === value.id ? { kind: 'saved', id: value.id, value: saved } : null
  }
  if (value.kind === 'position') {
    const position = normalizePosition(value.value)
    return position ? { kind: 'position', id: value.id, value: position } : null
  }
  return null
}

function stateToRecords(state: CachedStoryState): StoryRecord[] {
  return [
    ...Object.entries(state.saved).map(([id, value]): StoryRecord => ({ kind: 'saved', id, value })),
    ...Object.entries(state.positions).map(([id, value]): StoryRecord => ({ kind: 'position', id, value })),
  ]
}

function recordsToState(records: StoryRecord[]): CachedStoryState {
  const state = emptyState()
  for (const record of records) {
    if (record.kind === 'saved') state.saved[record.id] = record.value
    else state.positions[record.id] = record.value
  }
  return state
}

const storyCollection = createLocalCollection<StoryRecord>({
  storageKey: STORY_STATE_STORAGE_KEY,
  getId: record => `${record.kind}:${record.id}`,
  normalize: normalizeRecord,
  readLegacy: raw => {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!isRecord(value) || value.version !== 1) return []
    const records: StoryRecord[] = []
    for (const [kind, group] of [['saved', value.saved], ['position', value.positions]] as const) {
      if (!isRecord(group)) continue
      for (const [id, candidate] of Object.entries(group)) {
        const record = normalizeRecord({ kind, id, value: candidate })
        if (record) records.push(record)
      }
    }
    return records
  },
  serializeLegacy: records => JSON.stringify({ version: 1, ...recordsToState(records) }),
})

/** Story reading and saves stay on this device, independently of cloud bookmarks. */
export const useStoryStore = create<StoryState>()((set, get) => ({
  ...recordsToState(storyCollection.read()),
  hydrateCachedStories: () => {
    const state = recordsToState(storyCollection.read(stateToRecords(get())))
    if (JSON.stringify(state) !== JSON.stringify({ saved: get().saved, positions: get().positions })) set(state)
  },
  saveStory: (input) => {
    const summary = normalizeSummary(input)
    if (!summary) return false
    const current = storyCollection.read(stateToRecords(get()))
    const previous = recordsToState(current).saved[summary.id]
    const result = storyCollection.put({
      kind: 'saved', id: summary.id,
      value: { ...summary, savedAt: previous?.savedAt ?? new Date().toISOString() },
    }, current)
    set(recordsToState(result.items))
    return result.persisted
  },
  restoreStory: (input) => {
    const saved = normalizeSaved(input)
    if (!saved) return false
    const current = storyCollection.read(stateToRecords(get()))
    // A save made meanwhile in another tab takes precedence over an old Undo.
    const existing = recordsToState(current).saved[saved.id]
    const result = storyCollection.put({ kind: 'saved', id: saved.id, value: existing ?? saved }, current)
    set(recordsToState(result.items))
    return result.persisted
  },
  removeStory: (id) => {
    if (!isId(id)) return false
    const result = storyCollection.remove(`saved:${id}`, stateToRecords(get()))
    set(recordsToState(result.items))
    return result.persisted
  },
  savePosition: (id, input) => {
    if (!isId(id)) return false
    const position = normalizePosition({ ...input, updatedAt: new Date().toISOString() })
    if (!position) return false
    const result = storyCollection.put({ kind: 'position', id, value: position }, stateToRecords(get()))
    set(recordsToState(result.items))
    return result.persisted
  },
}))

const setMemory = useStoryStore.setState
useStoryStore.setState = ((...args: Parameters<typeof setMemory>) => {
  storyCollection.clearPending()
  setMemory(...args)
}) as typeof setMemory

const unsubscribeStories = storyCollection.subscribe(records => {
  const state = recordsToState(records)
  const current = useStoryStore.getState()
  if (JSON.stringify(state) !== JSON.stringify({ saved: current.saved, positions: current.positions })) {
    setMemory(state)
  }
})
if (import.meta.hot) import.meta.hot.dispose(unsubscribeStories)
