import { vi } from 'vitest'
import { useBookmarksStore } from './bookmarks'

beforeEach(() => {
  window.localStorage.clear()
  useBookmarksStore.setState({ bookmarks: [] })
})

test('addBookmark adds a bookmark', () => {
  useBookmarksStore.getState().addBookmark({
    type: 'bani',
    title: 'Japji Sahib',
    source: 'G',
    ang: 1,
    description: 'morning prayer',
  })
  const { bookmarks } = useBookmarksStore.getState()
  expect(bookmarks).toHaveLength(1)
  expect(bookmarks[0].title).toBe('Japji Sahib')
  expect(bookmarks[0].source).toBe('G')
  expect(bookmarks[0].ang).toBe(1)
  expect(bookmarks[0].id).toMatch(/^bookmark-/)
  expect(bookmarks[0].savedAt).toBeTruthy()
})

test('addBookmark with same source+ang is a no-op', () => {
  const store = useBookmarksStore.getState()
  store.addBookmark({ type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1 })
  store.addBookmark({ type: 'shabad', title: 'SGGS · Ang 1', source: 'G', ang: 1 })
  expect(useBookmarksStore.getState().bookmarks).toHaveLength(1)
})

test('removeBookmark removes by id', () => {
  useBookmarksStore.getState().addBookmark({ type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1 })
  const { bookmarks } = useBookmarksStore.getState()
  useBookmarksStore.getState().removeBookmark(bookmarks[0].id)
  expect(useBookmarksStore.getState().bookmarks).toHaveLength(0)
})

test('hasBookmark returns true when bookmark exists', () => {
  useBookmarksStore.getState().addBookmark({ type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1 })
  expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(true)
})

test('hasBookmark returns false when no bookmark exists', () => {
  expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(false)
})

test('hasBookmark distinguishes by source', () => {
  useBookmarksStore.getState().addBookmark({ type: 'bani', title: 'Jaap Sahib', source: 'D', ang: 1 })
  expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(false)
  expect(useBookmarksStore.getState().hasBookmark('D', 1)).toBe(true)
})

test('description is optional', () => {
  useBookmarksStore.getState().addBookmark({ type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1 })
  expect(useBookmarksStore.getState().bookmarks[0].description).toBeUndefined()
})

test('supports verse-level bookmarks without colliding with ang bookmarks', () => {
  const store = useBookmarksStore.getState()
  store.addBookmark({ type: 'shabad', title: 'Japji Sahib', source: 'G', ang: 1 })
  store.addBookmark({ type: 'verse', title: 'SGGS · Ang 1', source: 'G', ang: 1, verseId: 100, shabadId: 50 })

  expect(useBookmarksStore.getState().bookmarks).toHaveLength(2)
  expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(true)
  expect(useBookmarksStore.getState().hasBookmark('G', 1, 100)).toBe(true)
})

test('hydrateCachedBookmarks restores bookmarks from the legacy persisted shape', () => {
  window.localStorage.setItem('sikh-bookmarks', JSON.stringify({
    state: {
      bookmarks: [{
        id: 'bookmark-legacy',
        type: 'bani',
        title: 'Japji Sahib',
        source: 'G',
        ang: 1,
        savedAt: new Date().toISOString(),
      }],
    },
  }))

  useBookmarksStore.getState().hydrateCachedBookmarks()

  expect(useBookmarksStore.getState().bookmarks).toHaveLength(1)
  expect(useBookmarksStore.getState().bookmarks[0].id).toBe('bookmark-legacy')
})

test('hydrateCachedBookmarks drops malformed persisted records without breaking valid saves', () => {
  window.localStorage.setItem('sikh-bookmarks', JSON.stringify([
    {
      id: 'bookmark-valid',
      type: 'verse',
      title: 'SGGS · Ang 1',
      source: 'G',
      ang: 1,
      verseId: 100,
      savedAt: '2026-07-29T12:00:00.000Z',
    },
    {
      id: 'bookmark-invalid',
      type: 'verse',
      title: null,
      source: 'G',
      ang: -1,
      savedAt: 'not-a-date',
    },
  ]))

  useBookmarksStore.getState().hydrateCachedBookmarks()

  expect(useBookmarksStore.getState().bookmarks).toEqual([
    expect.objectContaining({ id: 'bookmark-valid', verseId: 100 }),
  ])
})

test('keeps exact Japji, generic Ang, and Hukamnama routes as distinct saves', () => {
  const store = useBookmarksStore.getState()
  store.addBookmark({
    type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1,
    returnPath: '/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib&exactBani=1',
  })
  store.addBookmark({
    type: 'bani', title: 'SGGS Ang 1', source: 'G', ang: 1,
    returnPath: '/study?source=G&ang=1',
  })
  store.addBookmark({
    type: 'bani', title: 'Daily Hukamnama', source: 'G', ang: 1,
    returnPath: '/study?hukamnamaDate=2026-08-10',
  })
  store.addBookmark({
    type: 'shabad', title: 'Personal Hukamnama', source: 'G', ang: 1, shabadId: 50,
    returnPath: '/study?shabadId=50&flow=ardaas-hukamnama&randomHukamnamaAng=1',
  })

  expect(useBookmarksStore.getState().bookmarks).toHaveLength(4)
})

test('does not let a legacy generic bookmark swallow an exact-context save', () => {
  const store = useBookmarksStore.getState()
  store.addBookmark({ type: 'bani', title: 'Legacy Ang 1', source: 'G', ang: 1 })
  store.addBookmark({
    type: 'bani', title: 'Daily Hukamnama', source: 'G', ang: 1,
    returnPath: '/study?hukamnamaDate=2026-08-10',
  })
  store.addBookmark({
    type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1,
    returnPath: '/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib',
  })

  expect(useBookmarksStore.getState().bookmarks).toHaveLength(3)
})

test('supports an intentional book chapter bookmark with an exact block return', () => {
  const result = useBookmarksStore.getState().addBookmark({
    type: 'book',
    title: 'Panth Prakash · Episode 1',
    workId: 'panth-prakash-english',
    chapterId: 'episode-001',
    chapterLabel: 'Episode 1',
    blockId: 'episode-001-p47-b003',
    excerpt: 'I bow my head in reverence.',
    returnPath: '/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003',
  })

  expect(result).toMatchObject({ changed: true, persisted: true })
  expect(useBookmarksStore.getState().getBookBookmark('panth-prakash-english', 'episode-001')).toEqual(
    expect.objectContaining({ blockId: 'episode-001-p47-b003' })
  )
})

test('reports when a bookmark cannot be persisted durably', () => {
  const storage = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  })

  const result = useBookmarksStore.getState().addBookmark({
    type: 'bani', title: 'Japji Sahib', source: 'G', ang: 1,
  })

  expect(result).toMatchObject({ changed: true, persisted: false })
  storage.mockRestore()
})
