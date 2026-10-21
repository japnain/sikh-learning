import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getNitnemHistorySummary, useNitnemHistoryStore } from './nitnemHistory'
import { useActivityEventsStore } from './activityEvents'
import {
  buildNitnemStudyPath,
  DEFAULT_NITNEM_OPTION_IDS,
  NITNEM_ROUTE_OPTIONS,
  getNitnemOption,
  normalizePersistedNitnemIds,
  setNitnemCompletionSafely,
  useNitemStore,
} from './nitnem'
import { useSundarGutkaLengthStore } from './sundarGutkaLength'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 8))
  localStorage.clear()
  useNitnemHistoryStore.setState({ events: [] })
  useActivityEventsStore.setState({ pendingEvents: [] })
  useSundarGutkaLengthStore.setState({
    lengths: {
      'chaupai-sahib': 'short',
      'rehras-sahib': 'short',
      aarti: 'short',
      'kirtan-sohila': 'short',
    },
  })
  useNitemStore.setState({
    completedDate: '2026-04-08',
    completedIds: [],
    selectedIds: [...DEFAULT_NITNEM_OPTION_IDS],
    completionTrackingEnabled: true,
    weeklyDayGoal: 7,
  })
})

test('keeps the default daily nitnem selection', () => {
  expect(useNitemStore.getState().selectedIds).toEqual([...DEFAULT_NITNEM_OPTION_IDS])
})

afterEach(() => vi.useRealTimers())

test('starts with completion tracking enabled and preserves an explicit later opt-out', () => {
  expect(useNitemStore.getState().completionTrackingEnabled).toBe(true)
  useNitemStore.getState().setCompletionTrackingEnabled(false)
  expect(useNitemStore.getState().completionTrackingEnabled).toBe(false)
})

test('keeps the additional banis grouped under Additional with clean card copy', () => {
  const additionalOptions = NITNEM_ROUTE_OPTIONS.filter(option => option.group === 'Additional')

  expect(additionalOptions.map(option => option.id)).toEqual([
    'salok-mahalla-9',
    'sukhmani-sahib',
    'asa-di-var',
    'aarti',
    'laavan',
  ])
  expect(DEFAULT_NITNEM_OPTION_IDS).not.toEqual(
    expect.arrayContaining(additionalOptions.map(option => option.id))
  )

  const aarti = getNitnemOption('aarti')
  expect(aarti).not.toBeNull()
  expect(aarti?.gurmukhiTitle).toBe('ਆਰਤੀ')
  expect(aarti?.romanizedTitle).toBe('Aarti')
  expect(aarti?.supportsLengthAdjustment).toBe(true)

  const salokMahalla9 = getNitnemOption('salok-mahalla-9')
  expect(salokMahalla9).not.toBeNull()
  expect(salokMahalla9?.gurmukhiTitle).toBe('ਸਲੋਕ ਮਹਲਾ ੯')
  expect(salokMahalla9?.romanizedTitle).toBe('Salok Mahalla 9')
  expect(salokMahalla9?.supportsLengthAdjustment).toBe(false)
  expect(additionalOptions.map(option => option.detail)).not.toContain('Optional Sundar Gutka bani.')
})

test('normalizes legacy focused selections onto the single supported bani route', () => {
  expect(normalizePersistedNitnemIds(['rehras-sahib-focused', 'rehras-sahib'])).toEqual(['rehras-sahib'])
})

test('appends newly selected banis and preserves ritual order moves', () => {
  useNitemStore.setState({
    selectedIds: ['japji-sahib', 'rehras-sahib'],
  })

  useNitemStore.getState().toggleSelected('salok-mahalla-9')
  expect(useNitemStore.getState().selectedIds).toEqual(['japji-sahib', 'rehras-sahib', 'salok-mahalla-9'])

  useNitemStore.getState().moveSelected('salok-mahalla-9', 'up')
  expect(useNitemStore.getState().selectedIds).toEqual(['japji-sahib', 'salok-mahalla-9', 'rehras-sahib'])

  useNitemStore.getState().moveSelected('japji-sahib', 'up')
  expect(useNitemStore.getState().selectedIds).toEqual(['japji-sahib', 'salok-mahalla-9', 'rehras-sahib'])
})

test('prevents removing the final selected bani', () => {
  useNitemStore.setState({ selectedIds: ['japji-sahib'] })

  useNitemStore.getState().toggleSelected('japji-sahib')

  expect(useNitemStore.getState().selectedIds).toEqual(['japji-sahib'])
})

test('builds an exact study path with sgLength for adjustable Rehras Sahib', () => {
  const option = getNitnemOption('rehras-sahib')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=G&ang=8&startAng=8&endAng=12&bani=Rehras+Sahib&baniDbId=21&exactBani=1&baniId=rehras-sahib&sgLength=short'
  )
})

test('builds an adjustable exact route for Benati Chaupai Sahib', () => {
  const option = getNitnemOption('chaupai-sahib')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=D&ang=1386&startAng=1386&endAng=1388&bani=Benati+Chaupai+Sahib&baniDbId=9&exactBani=1&baniId=chaupai-sahib&sgLength=short'
  )
})

test('builds the real exact route for the Dheenan Ki Savaiye variant', () => {
  const option = getNitnemOption('tav-prasad-savaiye-dheenan-ki')
  expect(option).not.toBeNull()

  expect(buildNitnemStudyPath(option!)).toBe(
    '/study?source=D&ang=11&startAng=11&endAng=37&bani=Tav+Prasad+Savaiye+%28Dheenan+Ki%29&baniDbId=7&exactBani=1&baniId=tav-prasad-savaiye'
  )
})

test('distinguishes the source-verified Dheenan Ki title from the Sraavag Suddh selection', () => {
  const dheenanKi = getNitnemOption('tav-prasad-savaiye-dheenan-ki')
  const sraavagSuddh = getNitnemOption('tav-prasad-savaiye')
  // BaniDB's /v2/banis index and /v2/banis/7 baniInfo agree on this exact title.
  expect(dheenanKi).toMatchObject({
    gurmukhiTitle: 'ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸਵੱਯੇ (ਦੀਨਨ ਕੀ)',
    baniDbId: 7, source: 'D', baseBaniId: 'tav-prasad-savaiye',
  })
  expect(dheenanKi?.gurmukhiTitle).not.toContain('ਸ੍ਰਾਵਗ ਸੁੱਧ')
  expect(sraavagSuddh?.gurmukhiTitle).toContain('ਸ੍ਰਾਵਗ ਸੁੱਧ')
  expect(sraavagSuddh?.baniDbId).toBe(6)
})


test('keeps completion history when a bani is removed and re-added', () => {
  useNitemStore.getState().markComplete('japji-sahib')
  useNitemStore.getState().toggleSelected('japji-sahib')
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(true)
  expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).currentStreak).toBe(1)
  useNitemStore.getState().toggleSelected('japji-sahib')
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(true)
})

test('records idempotent complete and undo events even within one clock millisecond', () => {
  const store = useNitemStore.getState()
  store.markComplete('japji-sahib')
  store.markComplete('japji-sahib')
  expect(useActivityEventsStore.getState().pendingEvents).toHaveLength(1)
  store.unmarkComplete('japji-sahib')
  store.unmarkComplete('japji-sahib')
  expect(useActivityEventsStore.getState().pendingEvents).toHaveLength(2)
  expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).currentStreak).toBe(0)
  store.markComplete('japji-sahib')
  expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).currentStreak).toBe(1)
  expect(useNitnemHistoryStore.getState().events).toHaveLength(3)
})

test('retains local history after the cloud pending queue is acknowledged', () => {
  useNitemStore.getState().markComplete('japji-sahib')
  useActivityEventsStore.getState().clearPendingEvents()
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
})

test('only completes known selected exact options', () => {
  useNitemStore.getState().setSelectedIds(['tav-prasad-savaiye-dheenan-ki'])
  useNitemStore.getState().markComplete('tav-prasad-savaiye')
  useNitemStore.getState().markComplete('unknown')
  expect(useNitnemHistoryStore.getState().events).toEqual([])
  useNitemStore.getState().markComplete('tav-prasad-savaiye-dheenan-ki')
  expect(useNitemStore.getState().completedIds).toEqual(['tav-prasad-savaiye-dheenan-ki'])
})

test('atomically replaces a valid routine and rejects an empty or invalid one', () => {
  useNitemStore.getState().setSelectedIds(['rehras-sahib', 'japji-sahib', 'rehras-sahib', 'unknown'])
  expect(useNitemStore.getState().selectedIds).toEqual(['rehras-sahib', 'japji-sahib'])
  useNitemStore.getState().setSelectedIds([])
  useNitemStore.getState().setSelectedIds(['unknown'])
  expect(useNitemStore.getState().selectedIds).toEqual(['rehras-sahib', 'japji-sahib'])
})

test('rolls today over without removing yesterday from the retained ledger', () => {
  useNitemStore.getState().markComplete('japji-sahib')
  vi.setSystemTime(new Date(2026, 9, 18, 1))
  useNitemStore.getState().resetIfNewDay()
  expect(useNitemStore.getState().completedIds).toEqual([])
  expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).currentStreak).toBe(1)
  useNitemStore.getState().markComplete('jaap-sahib')
  expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).currentStreak).toBe(2)
})

test('migrates tracking on once, preserves order and confirmed completion, then honors opt-out', async () => {
  localStorage.setItem('sikh-nitnem', JSON.stringify({ version: 4, state: {
    selectedIds: ['rehras-sahib', 'japji-sahib'], completedDate: '2026-10-16',
    completedIds: ['japji-sahib'], completionTrackingEnabled: false,
  } }))
  await useNitemStore.persist.rehydrate()
  expect(useNitemStore.getState()).toMatchObject({ selectedIds: ['rehras-sahib', 'japji-sahib'], completedIds: ['japji-sahib'], completionTrackingEnabled: true, weeklyDayGoal: 7 })
  expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).successfulDays).toEqual(['2026-10-16'])
  useNitemStore.getState().setCompletionTrackingEnabled(false)
  await useNitemStore.persist.rehydrate()
  expect(useNitemStore.getState().completionTrackingEnabled).toBe(false)
  expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
})

test.each(['sikh-nitnem', 'naamras-nitnem-history', 'naamras-cloud-activity-events'])(
  'failed completion at %s restores memory and persisted history without a duplicate on retry', failedKey => {
    const keys = ['sikh-nitnem', 'naamras-nitnem-history', 'naamras-cloud-activity-events']
    const previous = keys.map(key => localStorage.getItem(key))
    const realWrite = localStorage.setItem.bind(localStorage)
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === failedKey) throw new Error('Storage unavailable')
      realWrite(key, value)
    })
    expect(setNitnemCompletionSafely('japji-sahib', true)).toBe('failed')
    expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(false)
    expect(useNitnemHistoryStore.getState().events).toEqual([])
    expect(useActivityEventsStore.getState().pendingEvents).toEqual([])
    expect(keys.map(key => localStorage.getItem(key))).toEqual(previous)
    write.mockRestore()
    expect(setNitnemCompletionSafely('japji-sahib', true)).toBe('changed')
    expect(setNitnemCompletionSafely('japji-sahib', true)).toBe('unchanged')
    expect(useNitnemHistoryStore.getState().events).toHaveLength(1)
    expect(useActivityEventsStore.getState().pendingEvents).toHaveLength(1)
  },
)

test('failed undo leaves the confirmed completion and its event intact', () => {
  expect(setNitnemCompletionSafely('japji-sahib', true)).toBe('changed')
  const events = useNitnemHistoryStore.getState().events
  const activity = useActivityEventsStore.getState().pendingEvents
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Full') })
  expect(setNitnemCompletionSafely('japji-sahib', false)).toBe('failed')
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(true)
  expect(useNitnemHistoryStore.getState().events).toEqual(events)
  expect(useActivityEventsStore.getState().pendingEvents).toEqual(activity)
  write.mockRestore()
})

test('storage access failure does not mutate a completion in memory', () => {
  const read = vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
  expect(setNitnemCompletionSafely('japji-sahib', true)).toBe('failed')
  expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(false)
  expect(useNitnemHistoryStore.getState().events).toEqual([])
  expect(useActivityEventsStore.getState().pendingEvents).toEqual([])
  read.mockRestore()
})

test('safe completion respects an opt-out and resolves the local day at the action', () => {
  useNitemStore.getState().setCompletionTrackingEnabled(false)
  expect(setNitnemCompletionSafely('japji-sahib', true)).toBe('unavailable')
  expect(useNitnemHistoryStore.getState().events).toEqual([])
  useNitemStore.getState().setCompletionTrackingEnabled(true)
  vi.setSystemTime(new Date(2026, 9, 18, 0, 1))
  expect(setNitnemCompletionSafely('japji-sahib', true)).toBe('changed')
  expect(useNitemStore.getState().completedDate).toBe('2026-10-18')
  expect(useNitnemHistoryStore.getState().events[0].date).toBe('2026-10-18')
})
