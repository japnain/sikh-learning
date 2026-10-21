import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { buildSessionResumePath, useProgressStore } from './progress'
import { getExactReadingKey, useReadingPlacesStore } from './readingPlaces'

afterEach(() => { vi.restoreAllMocks() })

beforeEach(() => {
  localStorage.clear()
  useProgressStore.setState({
    streak: 0,
    currentSession: null,
    studied: [],
    reviewQueue: [],
    lastStudied: null,
  })
})

test('migrates legacy progress sessions into resume metadata', async () => {
  localStorage.setItem('sikh-progress', JSON.stringify({
    state: {
      studied: [],
      reviewQueue: [],
      lastStudied: null,
      streak: 3,
      currentSession: {
        scriptureId: 'G-21',
        lastCardIndex: 0,
      },
    },
    version: 0,
  }))

  await useProgressStore.persist.rehydrate()

  expect(useProgressStore.getState().currentSession).toEqual(expect.objectContaining({
    scriptureId: 'G-21',
    resumePath: '/study?source=G&ang=21',
  }))
  expect(useProgressStore.getState().currentSession?.updatedAt).toBeTruthy()
})

test('builds a deep resume url when a resume verse is stored', () => {
  expect(buildSessionResumePath({
    scriptureId: 'G-21',
    resumePath: '/study?source=G&ang=21',
    resumeVerseId: 55,
    updatedAt: '2026-04-15T16:00:00.000Z',
  })).toBe('/study?source=G&ang=21&resumeVerseId=55')
})

test('keeps exact verse routes intact when the resume path is already specific', () => {
  expect(buildSessionResumePath({
    scriptureId: 'G-21',
    resumePath: '/study?shabadId=50&verseId=100',
    resumeVerseId: 100,
    updatedAt: '2026-04-15T16:00:00.000Z',
  })).toBe('/study?shabadId=50&verseId=100')
})

test('builds an exact EPUB resume hash from a persisted block locator', () => {
  expect(buildSessionResumePath({
    scriptureId: 'panth-prakash-english-episode-001',
    resumePath: '/library/panth-prakash-english/chapters/episode-001',
    readerLocator: {
      revision: 'panth-prakash-english-v3-f9f801cc-243827eb',
      href: '/library/panth-prakash-english/chapters/episode-001',
      type: 'application/xhtml+xml',
      title: 'The Episode of the origin of the Khalsa',
      locations: {
        progression: 0.08,
        totalProgression: 0.004,
        position: 9,
        blockId: 'episode-001-p47-b003',
      },
    },
    updatedAt: '2026-07-15T16:00:00.000Z',
  })).toBe('/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003')
})

test('bounds Reading History while keeping the most recent reading units', () => {
  const { markStudied } = useProgressStore.getState()

  for (let index = 1; index <= 55; index += 1) {
    markStudied(`entry-${index}`)
  }

  const history = useProgressStore.getState().studied
  expect(history).toHaveLength(50)
  expect(history[0]?.id).toBe('entry-6')
  expect(history.at(-1)?.id).toBe('entry-55')
})

test('keeps an exact reading usable in memory when both progress stores cannot persist', () => {
  useReadingPlacesStore.setState({ places: {} })
  const storedProgress = localStorage.getItem('sikh-progress')
  const storedPlaces = localStorage.getItem('naamras-reading-places')
  const session = {
    scriptureId: 'G-1',
    resumePath: '/study?source=G&ang=1&startAng=1&endAng=8&baniId=japji-sahib&baniDbId=1&exactBani=1',
    resumeVerseId: 55,
    updatedAt: '2026-10-18T03:00:00.000Z',
  }
  const write = localStorage.setItem.bind(localStorage)
  vi.spyOn(localStorage, 'setItem').mockImplementation(function (key, value) {
    if (key === 'sikh-progress' || key === 'naamras-reading-places') throw new DOMException('Storage is full', 'QuotaExceededError')
    write(key, value)
  })

  expect(useProgressStore.getState().updateSession(session)).toBe(false)
  expect(useProgressStore.getState().currentSession).toEqual(session)
  expect(useReadingPlacesStore.getState().places[getExactReadingKey(session.resumePath)!]).toEqual(session)
  expect(localStorage.getItem('sikh-progress')).toBe(storedProgress)
  expect(localStorage.getItem('naamras-reading-places')).toBe(storedPlaces)
})

test.each(['markStudied', 'addToReview', 'recordSwipeToday', 'clearSession'] as const)('reading action %s does not interrupt scripture when storage and activity persistence are blocked', action => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Storage is unavailable', 'SecurityError') })

  expect((() => {
    const store = useProgressStore.getState()
    if (action === 'markStudied') return store.markStudied('entry-55')
    if (action === 'addToReview') return store.addToReview('entry-55')
    if (action === 'recordSwipeToday') return store.recordSwipeToday()
    return store.clearSession()
  })()).toBe(false)

  const state = useProgressStore.getState()
  if (action === 'markStudied') expect(state.studied.at(-1)?.id).toBe('entry-55')
  else if (action === 'addToReview') expect(state.reviewQueue).toContain('entry-55')
  else if (action === 'recordSwipeToday') expect(state.lastStudied).toBeTruthy()
  else expect(state.currentSession).toBeNull()
})

test.each(['sikh-progress', 'naamras-reading-places'])('retries the same exact verse after an independent %s write fails', key => {
  useReadingPlacesStore.setState({ places: {} })
  const session = {
    scriptureId: 'G-1',
    resumePath: '/study?source=G&ang=1&startAng=1&endAng=8&baniId=japji-sahib&baniDbId=1&exactBani=1',
    resumeVerseId: 55, updatedAt: '2026-10-18T03:00:00.000Z',
  }
  const write = localStorage.setItem.bind(localStorage)
  const failure = vi.spyOn(localStorage, 'setItem').mockImplementation((storageKey, value) => {
    if (storageKey === key) throw new DOMException('Storage is full', 'QuotaExceededError')
    write(storageKey, value)
  })
  expect(useProgressStore.getState().updateSession(session)).toBe(false)
  expect(useProgressStore.getState().currentSession).toEqual(session)
  expect(useReadingPlacesStore.getState().places[getExactReadingKey(session.resumePath)!]).toEqual(session)
  failure.mockRestore()

  expect(useProgressStore.getState().updateSession(session)).toBe(true)
  expect(JSON.parse(localStorage.getItem('sikh-progress')!).state.currentSession).toEqual(session)
  expect(Object.values(JSON.parse(localStorage.getItem('naamras-reading-places')!).state.places)).toEqual([session])
})

test('an optional activity failure does not invalidate the saved study day', () => {
  const write = localStorage.setItem.bind(localStorage)
  vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === 'naamras-cloud-activity-events') throw new Error('Activity unavailable')
    write(key, value)
  })
  expect(useProgressStore.getState().recordSwipeToday()).toBe(true)
  expect(JSON.parse(localStorage.getItem('sikh-progress')!).state.lastStudied).toBe(useProgressStore.getState().lastStudied)
})

test('unavailable storage at initialization keeps sessions usable without claiming persistence', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Blocked', 'SecurityError') } })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.resetModules()
  try {
    const { useProgressStore: unavailableStore } = await import('./progress')
    const session = { scriptureId: 'G-21', resumePath: '/study?source=G&ang=21', updatedAt: '2026-10-18T03:00:00.000Z' }
    expect(unavailableStore.getState().updateSession(session)).toBe(false)
    expect(unavailableStore.getState().currentSession).toEqual(session)
    expect(unavailableStore.getState().markStudied('entry-55')).toBe(false)
    expect(unavailableStore.getState().studied.at(-1)?.id).toBe('entry-55')
  } finally {
    Object.defineProperty(window, 'localStorage', descriptor)
    vi.resetModules()
  }
})
