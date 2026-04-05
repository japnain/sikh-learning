import { useBookmarksStore } from './bookmarks'

beforeEach(() => {
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
