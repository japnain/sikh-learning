import { describe, expect, test } from 'vitest'
import { buildBookmarkNaturalKey, buildFavoriteNaturalKey } from './savedItemKeys'

describe('saved-item cloud identity', () => {
  test('distinguishes exact favorite verses inside one shabad', () => {
    const first = buildFavoriteNaturalKey({
      source: 'G',
      ang: 1,
      shabadId: 10,
      verseId: 100,
      routeMode: 'verse',
    })
    const second = buildFavoriteNaturalKey({
      source: 'G',
      ang: 1,
      shabadId: 10,
      verseId: 101,
      routeMode: 'verse',
    })

    expect(first).toBe('favorite:G:1:verse:100')
    expect(second).toBe('favorite:G:1:verse:101')
    expect(second).not.toBe(first)
  })

  test('keeps canonical, shabad, and verse identities separate', () => {
    expect(buildFavoriteNaturalKey({
      source: 'G',
      ang: 1,
      routeMode: 'canonical',
    })).toBe('favorite:G:1:canonical')
    expect(buildFavoriteNaturalKey({
      source: 'G',
      ang: 1,
      shabadId: 10,
      routeMode: 'shabad',
    })).toBe('favorite:G:1:shabad:10')
    expect(buildBookmarkNaturalKey({
      source: 'G',
      ang: 1,
      shabadId: 10,
      verseId: 100,
    })).toBe('bookmark:G:1:verse:100')
  })
})
