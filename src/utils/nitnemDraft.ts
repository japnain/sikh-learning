import { getNitnemOption, NITNEM_ROUTE_OPTIONS } from '../store/nitnem'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS } from '../store/sundarGutkaLength'
import { SUNDAR_GUTKA_SUPPORTED_BANI_IDS, normalizeSundarGutkaLength } from './sundarGutkaLength'

export const NITNEM_DRAFT_KEY = 'naamras-nitnem-draft'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const MAX_BYTES = 8000

export interface NitnemDraftValues {
  selectedIds: string[]
  lengths: typeof DEFAULT_SUNDAR_GUTKA_LENGTHS
  weeklyDayGoal: number
  completionTrackingEnabled: boolean
}

interface StoredDraft {
  version: 1
  baseline: string
  updatedAt: number
  values: NitnemDraftValues
}

// One bounded tab-session fallback; no reading places, scripture or completion
// history belong to this draft. It cannot promise recovery after a reload.
let memoryDraft: StoredDraft | null = null
let ignorePreviousSessionCopy = false
let storageAvailable = true
const storageListeners = new Set<() => void>()

function reportStorageAvailable(available: boolean): boolean {
  if (storageAvailable !== available) {
    storageAvailable = available
    storageListeners.forEach(listener => listener())
  }
  return available
}

export function subscribeNitnemDraftStorage(listener: () => void): () => void {
  storageListeners.add(listener)
  return () => { storageListeners.delete(listener) }
}

export const isNitnemDraftStorageAvailable = () => storageAvailable

function sessionStorageOrNull(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage } catch { return null }
}

export function nitnemDraftSignature(values: NitnemDraftValues): string {
  return JSON.stringify({
    selectedIds: values.selectedIds,
    lengths: SUNDAR_GUTKA_SUPPORTED_BANI_IDS.map(id => [id, values.lengths[id]]),
    weeklyDayGoal: values.weeklyDayGoal,
    completionTrackingEnabled: values.completionTrackingEnabled,
  })
}

function validateDraft(input: unknown, committed: NitnemDraftValues, now: number): StoredDraft | null {
  const baseline = nitnemDraftSignature(committed)
  if (!input || typeof input !== 'object') return null
  const stored = input as Partial<StoredDraft>
  const values = stored.values
  if (stored.version !== 1 || stored.baseline !== baseline || baseline.length > MAX_BYTES
    || typeof stored.updatedAt !== 'number' || !Number.isFinite(stored.updatedAt)
    || stored.updatedAt > now + 5 * 60 * 1000 || now - stored.updatedAt > MAX_AGE_MS
    || !values || typeof values !== 'object'
    || !Array.isArray(values.selectedIds) || values.selectedIds.length < 1 || values.selectedIds.length > NITNEM_ROUTE_OPTIONS.length
    || values.selectedIds.some(id => typeof id !== 'string' || !getNitnemOption(id))
    || new Set(values.selectedIds).size !== values.selectedIds.length
    || !Number.isInteger(values.weeklyDayGoal) || values.weeklyDayGoal < 1 || values.weeklyDayGoal > 7
    || typeof values.completionTrackingEnabled !== 'boolean'
    || !values.lengths || typeof values.lengths !== 'object' || Array.isArray(values.lengths)
    || Object.keys(values.lengths).length !== SUNDAR_GUTKA_SUPPORTED_BANI_IDS.length
    || SUNDAR_GUTKA_SUPPORTED_BANI_IDS.some(id => {
      const length = normalizeSundarGutkaLength(values.lengths[id])
      if (!length) return true
      // These readings have three canonical bands. Preserve an existing saved
      // extra-long alias, without letting a new draft invent a fourth band.
      return (id === 'chaupai-sahib' || id === 'aarti') && length === 'extralong'
        && committed.lengths[id] !== 'extralong'
    })) return null
  const normalized: NitnemDraftValues = {
    selectedIds: [...values.selectedIds],
    lengths: { ...values.lengths },
    weeklyDayGoal: values.weeklyDayGoal,
    completionTrackingEnabled: values.completionTrackingEnabled,
  }
  if (nitnemDraftSignature(normalized) === baseline) return null
  return { version: 1, baseline, updatedAt: stored.updatedAt, values: normalized }
}

export function readNitnemDraft(committed: NitnemDraftValues): NitnemDraftValues | null {
  const now = Date.now()
  const inMemory = validateDraft(memoryDraft, committed, now)
  if (inMemory) return inMemory.values
  if (ignorePreviousSessionCopy) return null
  try {
    const raw = sessionStorageOrNull()?.getItem(NITNEM_DRAFT_KEY)
    if (!raw || raw.length > MAX_BYTES) return null
    return validateDraft(JSON.parse(raw), committed, now)?.values ?? null
  } catch { return null }
}

export function rememberNitnemDraft(committed: NitnemDraftValues, values: NitnemDraftValues): boolean {
  const baseline = nitnemDraftSignature(committed)
  const stored: StoredDraft = { version: 1, baseline, updatedAt: Date.now(), values }
  const valid = validateDraft(stored, committed, Date.now())
  if (!valid) return false
  memoryDraft = valid
  ignorePreviousSessionCopy = false
  try {
    const storage = sessionStorageOrNull()
    if (!storage) return reportStorageAvailable(false)
    storage.setItem(NITNEM_DRAFT_KEY, JSON.stringify(valid))
    return reportStorageAvailable(true)
  } catch { return reportStorageAvailable(false) }
}

export function clearNitnemDraft(): void {
  memoryDraft = null
  ignorePreviousSessionCopy = true
  try { sessionStorageOrNull()?.removeItem(NITNEM_DRAFT_KEY) } catch { /* The current in-memory draft is still discarded. */ }
}
