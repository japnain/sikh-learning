import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { StorySummary } from '../types/stories'
import { STORY_STATE_STORAGE_KEY, useStoryStore } from './stories'

const summary: StorySummary = {
  id: 'the-open-door', title: 'The Open Door', subtitle: 'A place for everyone',
  description: 'An English retelling.', collectionId: 'lives-of-service',
  themes: ['Service'], people: ['Guru Amar Das'], artwork: 'doorway',
  wordCount: 600, readingMinutes: 3, revision: 1,
}

beforeEach(() => {
  localStorage.clear()
  useStoryStore.setState({ saved: {}, positions: {} })
})

afterEach(() => vi.restoreAllMocks())

describe('local story state', () => {
  it('keeps series and source metadata updates without changing the reading revision', () => {
    const next = { ...summary, metadataRevision: 1, series: { id: 'shared-lives', title: 'Shared lives', order: 2 } }
    useStoryStore.getState().savePosition(summary.id, { paragraphId: 'p4', progress: 0.42, revision: 1 })
    expect(useStoryStore.getState().saveStory(next)).toBe(true)
    useStoryStore.setState({ saved: {}, positions: {} })
    useStoryStore.getState().hydrateCachedStories()
    expect(useStoryStore.getState().saved[summary.id]).toMatchObject(next)
    expect(useStoryStore.getState().positions[summary.id]).toMatchObject({ paragraphId: 'p4', progress: 0.42, revision: 1 })
    expect(useStoryStore.getState().saveStory({ ...next, metadataRevision: 2 })).toBe(true)
    expect(useStoryStore.getState().positions[summary.id].revision).toBe(1)
  })

  it('durably saves a story and precise reading position across hydration', () => {
    expect(useStoryStore.getState().saveStory(summary)).toBe(true)
    expect(useStoryStore.getState().savePosition(summary.id, {
      paragraphId: 'p4', progress: 0.42, revision: 1,
    })).toBe(true)
    const savedAt = useStoryStore.getState().saved[summary.id].savedAt
    useStoryStore.setState({ saved: {}, positions: {} })
    useStoryStore.getState().hydrateCachedStories()
    expect(useStoryStore.getState().saved[summary.id]).toEqual({ ...summary, savedAt })
    expect(useStoryStore.getState().positions[summary.id]).toMatchObject({
      paragraphId: 'p4', progress: 0.42, revision: 1,
    })
    expect(useStoryStore.getState().saveStory({ ...summary, title: 'An Open Door', revision: 2 })).toBe(true)
    expect(useStoryStore.getState().saved[summary.id]).toMatchObject({
      title: 'An Open Door', revision: 2, savedAt,
    })
  })

  it('keeps the reader position when a saved story is removed', () => {
    useStoryStore.getState().saveStory(summary)
    useStoryStore.getState().savePosition(summary.id, {
      paragraphId: 'p8', progress: 1, revision: 1, finishedAt: '2026-10-21T08:00:00.000Z',
    })
    expect(useStoryStore.getState().removeStory(summary.id)).toBe(true)
    useStoryStore.getState().hydrateCachedStories()
    expect(useStoryStore.getState().saved).toEqual({})
    expect(useStoryStore.getState().positions[summary.id].finishedAt).toBe('2026-10-21T08:00:00.000Z')
  })

  it('rejects malformed saved entries and positions without dropping valid entries', () => {
    const savedAt = '2026-10-21T08:00:00.000Z'
    localStorage.setItem(STORY_STATE_STORAGE_KEY, JSON.stringify({
      version: 1,
      saved: {
        [summary.id]: { ...summary, savedAt },
        wrong: { ...summary, id: 'wrong', savedAt: 'no-date' },
        constructor: { ...summary, id: 'constructor', savedAt },
      },
      positions: {
        [summary.id]: { paragraphId: 'p2', progress: 0.3, revision: 1, updatedAt: savedAt },
        broken: { paragraphId: '../unsafe', progress: 0.2, revision: 1, updatedAt: savedAt },
        overflow: { paragraphId: 'p2', progress: 2, revision: 1, updatedAt: savedAt },
      },
    }))
    useStoryStore.getState().hydrateCachedStories()
    expect(Object.keys(useStoryStore.getState().saved)).toEqual([summary.id])
    expect(Object.keys(useStoryStore.getState().positions)).toEqual([summary.id])
    localStorage.setItem(STORY_STATE_STORAGE_KEY, '{invalid json')
    expect(() => useStoryStore.getState().hydrateCachedStories()).not.toThrow()
    expect(useStoryStore.getState().saved).toEqual({})
    expect(useStoryStore.getState().positions).toEqual({})
  })

  it('reports quota failures while keeping useful session state and allows a retry', () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    expect(useStoryStore.getState().saveStory(summary)).toBe(false)
    expect(useStoryStore.getState().saved[summary.id].title).toBe(summary.title)
    expect(useStoryStore.getState().savePosition(summary.id, {
      paragraphId: 'p2', progress: 0.25, revision: 1,
    })).toBe(false)
    expect(useStoryStore.getState().positions[summary.id].progress).toBe(0.25)
    expect(localStorage.getItem(STORY_STATE_STORAGE_KEY)).toBeNull()
    setItem.mockRestore()
    expect(useStoryStore.getState().saveStory(summary)).toBe(true)
    useStoryStore.getState().hydrateCachedStories()
    expect(useStoryStore.getState().positions[summary.id].paragraphId).toBe('p2')
  })

  it('handles security-restricted storage and detects unsuccessful writes', () => {
    const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    expect(() => useStoryStore.getState().hydrateCachedStories()).not.toThrow()
    expect(useStoryStore.getState().saveStory(summary)).toBe(false)
    getItem.mockRestore()
    localStorage.clear()
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {})
    expect(useStoryStore.getState().saveStory(summary)).toBe(false)
    expect(useStoryStore.getState().removeStory(summary.id)).toBe(false)
    setItem.mockRestore()
  })

  it('rejects unsafe mutation input and never changes unrelated local keys', () => {
    localStorage.setItem('sikh-bookmarks', 'untouched')
    expect(useStoryStore.getState().saveStory({ ...summary, id: '../unsafe' })).toBe(false)
    expect(useStoryStore.getState().savePosition('constructor', {
      paragraphId: 'p1', progress: 0.1, revision: 1,
    })).toBe(false)
    expect(useStoryStore.getState().savePosition(summary.id, {
      paragraphId: 'p1', progress: Number.NaN, revision: 1,
    })).toBe(false)
    expect(useStoryStore.getState().saved).toEqual({})
    expect(useStoryStore.getState().positions).toEqual({})
    expect(localStorage.getItem('sikh-bookmarks')).toBe('untouched')
  })

  it('keeps mutations usable without a browser while reporting no persistence', () => {
    vi.stubGlobal('window', undefined)
    try {
      expect(() => useStoryStore.getState().hydrateCachedStories()).not.toThrow()
      expect(useStoryStore.getState().saveStory(summary)).toBe(false)
      expect(useStoryStore.getState().savePosition(summary.id, {
        paragraphId: 'p1', progress: 0.1, revision: 1,
      })).toBe(false)
      expect(useStoryStore.getState().saved[summary.id].title).toBe(summary.title)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
