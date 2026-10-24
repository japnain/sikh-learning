import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useActivityEventsStore } from '../store/activityEvents'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { buildNitnemStudyPath, getNitnemOption, setNitnemCompletionSafely, useNitemStore } from '../store/nitnem'
import { getNitnemCompletionForDay, getNitnemHistorySummary, useNitnemHistoryStore } from '../store/nitnemHistory'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useNitnemPracticeStore } from '../store/nitnemPractice'
import { getNitnemPracticeResume } from '../utils/nitnemPractice'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useThemeStore } from '../store/theme'
import { useVocabStore } from '../store/vocab'
import { applyRemoteSnapshot, exportLocalSnapshot, reconcileRemoteSnapshotWithLocalChanges } from './snapshot'
import type { CloudRemoteSnapshot } from './types'

const SAVED_AT = '2026-04-17T12:00:00.000Z'

function asRemoteSnapshot(
  snapshot: ReturnType<typeof exportLocalSnapshot>,
  generatedAt = '2026-04-17T13:00:00.000Z'
): CloudRemoteSnapshot {
  return {
    ...snapshot,
    generatedAt,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-04-17T13:00:00.000Z'))

  useBookmarksStore.setState({ bookmarks: [] })
  useFavoritesStore.setState({ favorites: [] })
  useVocabStore.setState({ vocab: [] })
  useActivityEventsStore.setState({ pendingEvents: [] })
  useNitnemHistoryStore.setState({ events: [], remoteDays: {} })
  useNitnemPracticeStore.setState({ active: null })
  useProgressStore.setState({
    studied: [],
    reviewQueue: [],
    lastStudied: null,
    streak: 0,
    currentSession: null,
  })
  useReadingProgressStore.setState({ progress: {} })
  useNitemStore.setState({
    completedDate: '2026-04-17',
    completedIds: [],
    selectedIds: ['japji-sahib'],
  })
  useLocaleStore.setState({ locale: 'en' })
  useThemeStore.getState().setMode('light')
  useLanguageStore.setState({
    scriptMode: 'gurmukhi',
    showTransliteration: false,
    meaningLanguage: 'en',
    larivaar: false,
    showVishraam: true,
    lineSpacing: 'relaxed',
    textAlign: 'left',
    fontSize: 22,
    englishSource: 'bdb',
    punjabiSource: 'ss',
    hindiSource: 'ss',
    visraamSource: 'sttm',
  })
  useOnboardingStore.setState({
    hasCompletedOnboarding: true,
    isOnboardingOpen: false,
    presentationMode: 'overlay',
    learningLevel: 'beginner',
    audience: 'adult',
    learningGoal: 'read',
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('cloud snapshot v3', () => {
  test('rolls back earlier profile and saved domains when a later cloud write fails', () => {
    const remote = asRemoteSnapshot(exportLocalSnapshot())
    remote.profile!.reader.fontSize = 34
    remote.profile!.locale = 'pa'
    remote.profile!.themeMode = 'dark'
    const before = new Map(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))
    const originalLanguage = useLanguageStore.getState()
    const originalTheme = useThemeStore.getState()
    const write = localStorage.setItem.bind(localStorage)
    let failed = false
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (!failed && key === 'sikh-vocab') { failed = true; throw new DOMException('Full', 'QuotaExceededError') }
      write(key, value)
    })
    expect(() => applyRemoteSnapshot(remote)).toThrow('Full')
    expect(useLanguageStore.getState()).toEqual(originalLanguage)
    expect(useThemeStore.getState()).toEqual(originalTheme)
    expect(useLocaleStore.getState().locale).toBe('en')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(new Map(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))).toEqual(before)
  })

  test('cloud restoration cannot replace the intentional local practice with a restored general Study session', () => {
    const rehras = getNitnemOption('rehras-sahib')!
    const short = buildNitnemStudyPath(rehras)
    const long = `${short.replace(/sgLength=[^&]+/, 'sgLength=long')}&resumeVerseId=440`
    useNitemStore.setState({ selectedIds: [rehras.id] })
    useNitnemPracticeStore.getState().start(rehras.id, long)
    const active = useNitnemPracticeStore.getState().active!
    const japjiPath = buildNitnemStudyPath(getNitnemOption('japji-sahib')!)
    useProgressStore.setState({ currentSession: { scriptureId: 'G-1', resumePath: japjiPath, resumeVerseId: 99, updatedAt: SAVED_AT } })
    const snapshot = asRemoteSnapshot(exportLocalSnapshot())
    useProgressStore.setState({ currentSession: null })
    applyRemoteSnapshot(snapshot)
    expect(useProgressStore.getState().currentSession?.resumePath).toBe(japjiPath)
    expect(useNitnemPracticeStore.getState().active).toEqual(active)
    expect(getNitnemPracticeResume(rehras, useNitnemPracticeStore.getState().active, {}, useProgressStore.getState().currentSession)).toBe(active.readingPath)
    expect(active.readingPath).toContain('sgLength=long')
    expect(active.readingPath).toContain('resumeVerseId=440')
  })

  test('a metadata-aware snapshot enriches a previously restored legacy completion without reversing later Undo', () => {
    useNitemStore.setState({ selectedIds: ['rehras-sahib'], completionTrackingEnabled: true })
    useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'short')
    const short = buildNitnemStudyPath(getNitnemOption('rehras-sahib')!)
    setNitnemCompletionSafely('rehras-sahib', true, short)
    const exact = asRemoteSnapshot(exportLocalSnapshot())
    const legacy = structuredClone(exact)
    delete legacy.learningProgress!.find(record => record.scope === 'nitnem-state')!.payload.completionEvents
    useNitnemHistoryStore.setState({ events: [], remoteDays: {} })
    useNitemStore.setState({ completedIds: [] })
    vi.setSystemTime(new Date('2026-04-17T14:00:00.000Z'))
    applyRemoteSnapshot(legacy)
    const projected = getNitnemCompletionForDay(useNitnemHistoryStore.getState().events, '2026-04-17', 'rehras-sahib')!
    expect(projected.readingPath).toBeUndefined()
    applyRemoteSnapshot(exact)
    expect(getNitnemCompletionForDay(useNitnemHistoryStore.getState().events, '2026-04-17', 'rehras-sahib')).toMatchObject({
      id: projected.id, occurredAt: projected.occurredAt, readingPath: short, readingKey: expect.any(String),
    })
    expect(useNitemStore.getState().completedIds).toEqual(['rehras-sahib'])
    setNitnemCompletionSafely('rehras-sahib', false, short)
    applyRemoteSnapshot(exact)
    expect(getNitnemCompletionForDay(useNitnemHistoryStore.getState().events, '2026-04-17', 'rehras-sahib')).toBeNull()
    expect(useNitemStore.getState().completedIds).toEqual([])
  })

  test('round-trips the actual completed reading without guessing legacy versions', () => {
    useNitemStore.setState({ selectedIds: ['rehras-sahib'], completionTrackingEnabled: true })
    useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'short')
    const short = buildNitnemStudyPath(getNitnemOption('rehras-sahib')!)
    setNitnemCompletionSafely('rehras-sahib', true, short)
    const original = getNitnemCompletionForDay(useNitnemHistoryStore.getState().events, '2026-04-17', 'rehras-sahib')!
    const snapshot = asRemoteSnapshot(exportLocalSnapshot())
    useNitnemHistoryStore.setState({ events: [], remoteDays: {} })
    useNitemStore.setState({ completedIds: [] })
    applyRemoteSnapshot(snapshot)
    useSundarGutkaLengthStore.getState().setLength('rehras-sahib', 'long')
    expect(getNitnemCompletionForDay(useNitnemHistoryStore.getState().events, '2026-04-17', 'rehras-sahib')).toMatchObject({ id: original.id, readingPath: short, readingKey: original.readingKey })
    expect(useNitemStore.getState().isComplete('rehras-sahib')).toBe(true)
    applyRemoteSnapshot(snapshot)
    expect(useNitnemHistoryStore.getState().events).toHaveLength(1)

    const legacy = asRemoteSnapshot(exportLocalSnapshot())
    delete legacy.learningProgress!.find(record => record.scope === 'nitnem-state')!.payload.completionEvents
    useNitnemHistoryStore.setState({ events: [], remoteDays: {} })
    useNitemStore.setState({ completedIds: [] })
    applyRemoteSnapshot(legacy)
    expect(getNitnemCompletionForDay(useNitnemHistoryStore.getState().events, '2026-04-17', 'rehras-sahib')?.readingPath).toBeUndefined()
    expect(useNitemStore.getState().isComplete('rehras-sahib')).toBe(true)
  })

  test('mirrors current-day remote completion and undo once while retaining earlier history', () => {
    useNitnemHistoryStore.getState().importLegacy('2026-04-16', ['japji-sahib'])
    const snapshot = asRemoteSnapshot(exportLocalSnapshot())
    const nitnem = snapshot.learningProgress!.find(record => record.scope === 'nitnem-state')!
    nitnem.clientUpdatedAt = '2026-04-17T12:00:00.000Z'
    nitnem.payload.completedIds = ['japji-sahib']
    applyRemoteSnapshot(snapshot)
    expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(true)
    expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).currentStreak).toBe(2)
    expect(useNitnemHistoryStore.getState().events).toHaveLength(2)
    applyRemoteSnapshot(snapshot)
    expect(useNitnemHistoryStore.getState().events).toHaveLength(2)

    nitnem.clientUpdatedAt = '2026-04-17T13:01:00.000Z'
    nitnem.payload.completedIds = []
    applyRemoteSnapshot(snapshot)
    expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(false)
    expect(getNitnemHistorySummary(useNitnemHistoryStore.getState().events).successfulDays).toEqual(['2026-04-16'])
    expect(useNitnemHistoryStore.getState().events).toHaveLength(3)
    applyRemoteSnapshot(snapshot)
    expect(useNitnemHistoryStore.getState().events).toHaveLength(3)

    vi.setSystemTime(new Date('2026-04-17T13:02:00.000Z'))
    useNitemStore.getState().markComplete('japji-sahib')
    applyRemoteSnapshot(snapshot)
    expect(useNitemStore.getState().isComplete('japji-sahib')).toBe(true)
    expect(useNitnemHistoryStore.getState().events).toHaveLength(4)
    expect(useActivityEventsStore.getState().pendingEvents).toHaveLength(1)
  })

  test('round-trips System appearance independently of the resolved dark boolean', () => {
    useThemeStore.getState().setMode('system')
    const snapshot = exportLocalSnapshot()
    expect(snapshot.profile.themeMode).toBe('system')
    useThemeStore.getState().setMode('dark')
    applyRemoteSnapshot(asRemoteSnapshot(snapshot))
    expect(useThemeStore.getState().mode).toBe('system')
  })

  test('a legacy boolean-only profile does not erase a local System preference', () => {
    const snapshot = exportLocalSnapshot()
    delete snapshot.profile.themeMode
    snapshot.profile.darkMode = true
    useThemeStore.getState().setMode('system')
    applyRemoteSnapshot(asRemoteSnapshot(snapshot))
    expect(useThemeStore.getState().mode).toBe('system')
  })

  test('exports favorites, phrase review, preferences, activity, and reading Ang arrays', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1',
        type: 'verse',
        title: 'Saved verse',
        source: 'G',
        ang: 1,
        shabadId: 10,
        verseId: 100,
        savedAt: SAVED_AT,
      }],
    })
    useFavoritesStore.setState({
      favorites: [
        {
          id: 'favorite-100',
          title: 'Verse 100',
          source: 'G',
          ang: 1,
          shabadId: 10,
          verseId: 100,
          type: 'shabad',
          routeMode: 'verse',
          savedAt: SAVED_AT,
        },
        {
          id: 'favorite-101',
          title: 'Verse 101',
          source: 'G',
          ang: 1,
          shabadId: 10,
          verseId: 101,
          type: 'shabad',
          routeMode: 'verse',
          savedAt: SAVED_AT,
        },
      ],
    })
    useVocabStore.setState({
      vocab: [{
        kind: 'phrase',
        word: 'ਸਤਿ ਨਾਮੁ',
        transliteration: 'sat naam',
        meaning_en: 'True Name',
        meaning_hi: '',
        meaning_pa: '',
        scripture: 'SGGS',
        sourceId: 'G-1',
        savedAt: SAVED_AT,
        review: {
          dueAt: '2026-04-20T12:00:00.000Z',
          intervalDays: 3,
          reviewCount: 1,
          lastReviewedAt: SAVED_AT,
        },
      }],
    })
    useReadingProgressStore.setState({
      progress: {
        'japji-sahib': [1, 2, 3],
      },
    })
    useActivityEventsStore.setState({
      pendingEvents: [{
        id: 'event-1',
        userId: null,
        deviceId: 'device-test',
        eventType: 'vocab.entry.reviewed',
        occurredAt: SAVED_AT,
        clientUpdatedAt: SAVED_AT,
        deletedAt: null,
        payload: { kind: 'phrase' },
      }],
    })
    useLocaleStore.setState({ locale: 'pa' })
    useLanguageStore.setState({
      showTransliteration: true,
      fontSize: 26,
    })

    const snapshot = exportLocalSnapshot()

    expect(snapshot.version).toBe(3)
    expect(snapshot.profile.locale).toBe('pa')
    expect(snapshot.profile.reader).toMatchObject({
      showTransliteration: true,
      fontSize: 26,
    })
    expect(snapshot.savedItems.filter(record => record.kind === 'favorite')).toHaveLength(2)
    expect(snapshot.savedItems.map(record => record.naturalKey)).toEqual(expect.arrayContaining([
      'favorite:G:1:verse:100',
      'favorite:G:1:verse:101',
      'bookmark:G:1:verse:100',
    ]))
    expect(snapshot.vocabEntries[0]?.payload?.review?.dueAt).toBe('2026-04-20T12:00:00.000Z')
    expect(snapshot.learningProgress.find(record => record.scope === 'reading-progress')?.payload).toEqual({
      progress: {
        'japji-sahib': [1, 2, 3],
      },
    })
    expect(snapshot.activityEvents.map(event => event.id)).toEqual(['event-1'])
  })

  test('emits a server-based tombstone and applies it without resurrecting the item', () => {
    const bookmark = {
      id: 'bookmark-1',
      type: 'verse' as const,
      title: 'Saved verse',
      source: 'G' as const,
      ang: 1,
      shabadId: 10,
      verseId: 100,
      savedAt: SAVED_AT,
    }
    useBookmarksStore.setState({ bookmarks: [bookmark] })

    const firstSnapshot = exportLocalSnapshot()
    const liveRecord = firstSnapshot.savedItems.find(record => record.kind === 'bookmark')
    expect(liveRecord?.baseUpdatedAt).toBeNull()
    applyRemoteSnapshot(asRemoteSnapshot(firstSnapshot))

    useBookmarksStore.setState({ bookmarks: [] })
    vi.setSystemTime(new Date('2026-04-18T13:00:00.000Z'))
    const deletedSnapshot = exportLocalSnapshot()
    const tombstone = deletedSnapshot.savedItems.find(record => record.kind === 'bookmark')

    expect(tombstone).toMatchObject({
      naturalKey: 'bookmark:G:1:verse:100',
      payload: null,
      baseUpdatedAt: liveRecord?.clientUpdatedAt,
      deletedAt: '2026-04-18T13:00:00.000Z',
      clientUpdatedAt: '2026-04-18T13:00:00.000Z',
    })

    useBookmarksStore.setState({ bookmarks: [bookmark] })
    applyRemoteSnapshot(asRemoteSnapshot(
      deletedSnapshot,
      '2026-04-18T13:00:01.000Z'
    ))
    expect(useBookmarksStore.getState().bookmarks).toEqual([])
  })

  test('round-trips route-backed saves that share an Ang without cloud collisions', () => {
    useBookmarksStore.setState({ bookmarks: [
      {
        id: 'bookmark-japji', type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1,
        returnPath: '/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib', savedAt: SAVED_AT,
      },
      {
        id: 'bookmark-ang', type: 'bani', title: 'Generic Ang 1', source: 'G', ang: 1,
        returnPath: '/study?source=G&ang=1', savedAt: SAVED_AT,
      },
      {
        id: 'bookmark-book', type: 'book', title: 'Panth Prakash · Episode 1',
        workId: 'panth-prakash-english', chapterId: 'episode-001', chapterLabel: 'Episode 1',
        returnPath: '/library/panth-prakash-english/chapters/episode-001', savedAt: SAVED_AT,
      },
    ] })
    useFavoritesStore.setState({ favorites: [
      {
        id: 'favorite-daily', type: 'ang', routeMode: 'canonical', title: 'Daily Hukamnama',
        source: 'G', ang: 1, returnPath: '/study?hukamnamaDate=2026-08-10', savedAt: SAVED_AT,
      },
      {
        id: 'favorite-personal', type: 'shabad', routeMode: 'shabad', title: 'Personal Hukamnama',
        source: 'G', ang: 1, shabadId: 50,
        returnPath: '/study?shabadId=50&flow=ardaas-hukamnama', savedAt: SAVED_AT,
      },
    ] })

    const snapshot = exportLocalSnapshot()
    expect(new Set(snapshot.savedItems.map(item => item.naturalKey)).size).toBe(5)

    useBookmarksStore.setState({ bookmarks: [] })
    useFavoritesStore.setState({ favorites: [] })
    applyRemoteSnapshot(asRemoteSnapshot(snapshot))

    expect(useBookmarksStore.getState().bookmarks.map(item => item.id)).toEqual([
      'bookmark-japji', 'bookmark-ang', 'bookmark-book',
    ])
    expect(useFavoritesStore.getState().favorites.map(item => item.id)).toEqual([
      'favorite-daily', 'favorite-personal',
    ])
  })

  test('rejects a remote Saved apply when either device cache is not durable', () => {
    useBookmarksStore.setState({ bookmarks: [{
      id: 'bookmark-remote', type: 'bani', title: 'Remote Japji Sahib', source: 'G', ang: 1,
      returnPath: '/study?baniDbId=2&baniId=japji-sahib', savedAt: SAVED_AT,
    }] })
    useFavoritesStore.setState({ favorites: [{
      id: 'favorite-remote', type: 'ang', routeMode: 'canonical', title: 'Remote Ang',
      source: 'G', ang: 2, returnPath: '/study?source=G&ang=2', savedAt: SAVED_AT,
    }] })
    const remoteSnapshot = asRemoteSnapshot(exportLocalSnapshot())

    localStorage.clear()
    useBookmarksStore.setState({ bookmarks: [] })
    useFavoritesStore.setState({ favorites: [] })
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === 'sikh-favorites') {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      }
      originalSetItem(key, value)
    })

    expect(() => applyRemoteSnapshot(remoteSnapshot)).toThrow(/saved items could not be persisted/i)
    expect(useBookmarksStore.getState().bookmarks).toEqual([])
    expect(useFavoritesStore.getState().favorites).toEqual([])
    expect(localStorage.getItem('naamras-cloud-sync-export-metadata')).toBeNull()

    setItem.mockRestore()
  })
})


test('an unchanged profile retains its clock after a remote snapshot round trip', () => {
  const snapshot = exportLocalSnapshot()
  const clock = '2024-01-01T12:00:00.000Z'
  snapshot.profile.clientUpdatedAt = clock
  applyRemoteSnapshot({ ...snapshot, generatedAt: clock })
  const next = exportLocalSnapshot()
  expect(next.profile.clientUpdatedAt).toBe(clock)
  expect(next.profile.baseUpdatedAt).toBe(clock)
})


test('rebases unsent local edits without deleting new remote saves or falsely acknowledging the edits', () => {
  useLanguageStore.getState().setFontSize(22)
  const sent = exportLocalSnapshot()
  useBookmarksStore.getState().addBookmark({ type: 'bani', title: 'Remote reading', source: 'G', ang: 2 })
  const remote = asRemoteSnapshot(exportLocalSnapshot())
  useBookmarksStore.getState().replaceBookmarks([])
  vi.advanceTimersByTime(1000)
  useLanguageStore.getState().setFontSize(34)
  useBookmarksStore.getState().addBookmark({ type: 'bani', title: 'Local reading', source: 'G', ang: 3 })
  const current = exportLocalSnapshot()
  // A remote-only record is not part of the originally exported local metadata.
  current.savedItems = current.savedItems.filter(record => record.payload?.title !== 'Remote reading' && record.naturalKey !== remote.savedItems![0].naturalKey)
  const merged = reconcileRemoteSnapshotWithLocalChanges(remote, sent, current)
  applyRemoteSnapshot(merged, remote)
  expect(useLanguageStore.getState().fontSize).toBe(34)
  expect(useBookmarksStore.getState().bookmarks.map(item => item.title)).toEqual(expect.arrayContaining(['Remote reading', 'Local reading']))
  vi.advanceTimersByTime(1000)
  const pending = exportLocalSnapshot()
  expect(pending.profile.reader.fontSize).toBe(34)
  expect(pending.profile.baseUpdatedAt).toBe(remote.profile!.clientUpdatedAt)
  expect(pending.profile.clientUpdatedAt).not.toBe(remote.profile!.clientUpdatedAt)
  expect(pending.savedItems.find(record => record.payload?.title === 'Local reading')?.deletedAt).toBeNull()
})
