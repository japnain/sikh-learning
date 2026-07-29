import { beforeEach, expect, test } from 'vitest'
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
