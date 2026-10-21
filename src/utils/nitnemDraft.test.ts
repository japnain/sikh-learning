import { beforeEach, expect, test, vi } from 'vitest'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS } from '../store/sundarGutkaLength'
import type { NitnemDraftValues } from './nitnemDraft'

const committed: NitnemDraftValues = { selectedIds: ['japji-sahib', 'rehras-sahib'], lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS }, weeklyDayGoal: 7, completionTrackingEnabled: true }
const draft: NitnemDraftValues = { ...committed, selectedIds: ['rehras-sahib', 'japji-sahib'], lengths: { ...committed.lengths, 'rehras-sahib': 'long' }, weeklyDayGoal: 4 }

beforeEach(() => { sessionStorage.clear(); vi.resetModules(); vi.restoreAllMocks() })

test('a persisted draft restores after module reload without changing the committed routine', async () => {
  const first = await import('./nitnemDraft')
  expect(first.rememberNitnemDraft(committed, draft)).toBe(true)
  vi.resetModules()
  const second = await import('./nitnemDraft')
  expect(second.readNitnemDraft(committed)).toEqual(draft)
  expect(committed.selectedIds).toEqual(['japji-sahib', 'rehras-sahib'])
  expect(second.readNitnemDraft({ ...committed, weeklyDayGoal: 3 })).toBeNull()
})

test('storage failure keeps only a bounded in-memory recovery and explicit discard clears it', async () => {
  const api = await import('./nitnemDraft')
  vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => { throw new Error('Unavailable') })
  expect(api.rememberNitnemDraft(committed, draft)).toBe(false)
  expect(api.readNitnemDraft(committed)).toEqual(draft)
  api.clearNitnemDraft()
  expect(api.readNitnemDraft(committed)).toBeNull()
})

test.each([
  { selectedIds: ['japji-sahib', 'japji-sahib'] },
  { selectedIds: ['unknown-bani'] },
  { selectedIds: [] },
  { weeklyDayGoal: 0 },
  { weeklyDayGoal: 8 },
  { weeklyDayGoal: 1.5 },
  { completionTrackingEnabled: 'true' },
  { lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS, 'rehras-sahib': 'invented' } },
  { lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS, unknown: 'short' } },
  { lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS, 'chaupai-sahib': 'extralong' } },
  { lengths: { ...DEFAULT_SUNDAR_GUTKA_LENGTHS, aarti: 'extralong' } },
])('rejects malformed session recovery %#', async patch => {
  const api = await import('./nitnemDraft')
  sessionStorage.setItem(api.NITNEM_DRAFT_KEY, JSON.stringify({ version: 1, baseline: api.nitnemDraftSignature(committed), updatedAt: Date.now(), values: { ...draft, ...patch } }))
  expect(api.readNitnemDraft(committed)).toBeNull()
})

test.each([
  { version: 2 },
  { updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 },
  { updatedAt: Date.now() + 60 * 60 * 1000 },
])('rejects obsolete, expired or future-dated recovery %#', async patch => {
  const api = await import('./nitnemDraft')
  sessionStorage.setItem(api.NITNEM_DRAFT_KEY, JSON.stringify({ version: 1, baseline: api.nitnemDraftSignature(committed), updatedAt: Date.now(), values: draft, ...patch }))
  expect(api.readNitnemDraft(committed)).toBeNull()
})

test('keeps an existing extra-long alias without changing its saved identity or creating a new band', async () => {
  const api = await import('./nitnemDraft')
  const legacyBase: NitnemDraftValues = { ...committed, lengths: { ...committed.lengths, 'chaupai-sahib': 'extralong', aarti: 'extralong' } }
  const legacyDraft = { ...legacyBase, weeklyDayGoal: 3 }
  expect(api.rememberNitnemDraft(legacyBase, legacyDraft)).toBe(true)
  vi.resetModules()
  const reloaded = await import('./nitnemDraft')
  expect(reloaded.readNitnemDraft(legacyBase)).toEqual(legacyDraft)
})
