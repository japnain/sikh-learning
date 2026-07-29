import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useActivityEventsStore } from '../store/activityEvents'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useThemeStore } from '../store/theme'
import { useVocabStore } from '../store/vocab'
import { applyRemoteSnapshot, exportLocalSnapshot } from './snapshot'
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
  useThemeStore.setState({ dark: false })
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
})

describe('cloud snapshot v2', () => {
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

    expect(snapshot.version).toBe(2)
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
})
