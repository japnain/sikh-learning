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

  test('uses the exact saved reading route before source and Ang', () => {
    const genericAng = buildBookmarkNaturalKey({
      source: 'G', ang: 1, returnPath: '/study?source=G&ang=1',
    })
    const japji = buildBookmarkNaturalKey({
      source: 'G', ang: 1, returnPath: '/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib',
    })
    const daily = buildFavoriteNaturalKey({
      source: 'G', ang: 1, returnPath: '/study?hukamnamaDate=2026-08-10',
    })
    const personal = buildFavoriteNaturalKey({
      source: 'G', ang: 1, shabadId: 50, returnPath: '/study?shabadId=50&flow=ardaas-hukamnama',
    })

    expect(new Set([genericAng, japji, daily, personal]).size).toBe(4)
    expect(japji).toContain('bookmark:route:')
    expect(daily).toContain('favorite:route:')
  })

  test('builds a stable cloud key for a book chapter', () => {
    expect(buildBookmarkNaturalKey({
      type: 'book',
      workId: 'panth-prakash-english',
      chapterId: 'episode-001',
    })).toBe('bookmark:book:panth-prakash-english:chapter:episode-001')
  })
})
