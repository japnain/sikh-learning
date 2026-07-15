import { beforeEach, expect, test } from 'vitest'
import { buildSessionResumePath, useProgressStore } from './progress'

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
