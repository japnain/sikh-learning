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
