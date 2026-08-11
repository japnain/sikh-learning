import { beforeEach, expect, test, vi } from 'vitest'
import { useFavoritesStore } from './favorites'

beforeEach(() => {
  localStorage.clear()
  useFavoritesStore.setState({ favorites: [] })
})

test('adds and removes favorites by id', () => {
  useFavoritesStore.getState().addFavorite({
    title: 'Japji Sahib · Ang 1',
    source: 'G',
    ang: 1,
    shabadId: 10,
    type: 'shabad',
  })

  const favorite = useFavoritesStore.getState().favorites[0]
  expect(favorite).toBeTruthy()
  expect(useFavoritesStore.getState().isFavorite('G', 1, 10)).toBe(true)

  useFavoritesStore.getState().removeFavorite(favorite.id)
  expect(useFavoritesStore.getState().favorites).toHaveLength(0)
})

test('prevents duplicate favorites for the same location', () => {
  const state = useFavoritesStore.getState()
  state.addFavorite({
    title: 'Japji Sahib · Ang 1',
    source: 'G',
    ang: 1,
    shabadId: 10,
    type: 'shabad',
  })
  state.addFavorite({
    title: 'Japji Sahib · Ang 1',
    source: 'G',
    ang: 1,
    shabadId: 10,
    type: 'shabad',
  })

  expect(useFavoritesStore.getState().favorites).toHaveLength(1)
})

test('keeps exact verses in the same shabad as distinct favorites', () => {
  const state = useFavoritesStore.getState()
  state.addFavorite({
    title: 'Shabad · Verse 100',
    source: 'G',
    ang: 1,
    shabadId: 10,
    verseId: 100,
    type: 'shabad',
    routeMode: 'verse',
  })
  state.addFavorite({
    title: 'Shabad · Verse 101',
    source: 'G',
    ang: 1,
    shabadId: 10,
    verseId: 101,
    type: 'shabad',
    routeMode: 'verse',
  })
  state.addFavorite({
    title: 'Shabad · Verse 101 duplicate',
    source: 'G',
    ang: 1,
    shabadId: 10,
    verseId: 101,
    type: 'shabad',
    routeMode: 'verse',
  })

  expect(useFavoritesStore.getState().favorites).toHaveLength(2)
  expect(useFavoritesStore.getState().isFavorite('G', 1, 10, 100, 'verse')).toBe(true)
  expect(useFavoritesStore.getState().isFavorite('G', 1, 10, 101, 'verse')).toBe(true)
})

test('migrates legacy route modes and drops malformed persisted favorites', () => {
  localStorage.setItem('sikh-favorites', JSON.stringify({
    state: {
      favorites: [
        {
          id: 'favorite-legacy', title: 'Legacy shabad', source: 'G', ang: 1,
          shabadId: 10, type: 'shabad', savedAt: '2026-08-10T12:00:00.000Z',
        },
        null,
        { id: 'broken', title: null, source: 'G', ang: -1 },
      ],
    },
  }))

  useFavoritesStore.getState().hydrateCachedFavorites()

  expect(useFavoritesStore.getState().favorites).toEqual([
    expect.objectContaining({ id: 'favorite-legacy', routeMode: 'shabad' }),
  ])
  expect(useFavoritesStore.getState().isFavorite('G', 1, 10, undefined, 'shabad')).toBe(true)
})

test('keeps canonical Japji, generic Ang, Daily and Personal Hukamnama identities separate', () => {
  const store = useFavoritesStore.getState()
  store.addFavorite({ title: 'Japji', source: 'G', ang: 1, type: 'bani', returnPath: '/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib' })
  store.addFavorite({ title: 'Ang 1', source: 'G', ang: 1, type: 'ang', returnPath: '/study?source=G&ang=1' })
  store.addFavorite({ title: 'Daily', source: 'G', ang: 1, type: 'ang', returnPath: '/study?hukamnamaDate=2026-08-10' })
  store.addFavorite({ title: 'Personal', source: 'G', ang: 1, type: 'shabad', shabadId: 50, returnPath: '/study?shabadId=50&flow=ardaas-hukamnama' })

  expect(useFavoritesStore.getState().favorites).toHaveLength(4)
})

test('does not let a legacy generic favorite swallow an exact-context save', () => {
  const store = useFavoritesStore.getState()
  store.addFavorite({ title: 'Legacy Ang 1', source: 'G', ang: 1, type: 'ang' })
  store.addFavorite({
    title: 'Daily Hukamnama', source: 'G', ang: 1, type: 'ang',
    returnPath: '/study?hukamnamaDate=2026-08-10',
  })
  store.addFavorite({
    title: 'Japji Sahib', source: 'G', ang: 1, type: 'bani',
    returnPath: '/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib',
  })

  expect(useFavoritesStore.getState().favorites).toHaveLength(3)
})

test('reports when a favorite cannot be persisted durably', () => {
  const storage = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  })
  const result = useFavoritesStore.getState().addFavorite({ title: 'Japji', source: 'G', ang: 1, type: 'bani' })

  expect(result).toMatchObject({ changed: true, persisted: false })
  storage.mockRestore()
})
