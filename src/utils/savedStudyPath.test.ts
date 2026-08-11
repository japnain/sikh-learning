import { describe, expect, test } from 'vitest'
import { canUseLegacySavedLocationFallback } from './savedRouteIdentity'
import { buildSavedStudyPath } from './savedStudyPath'

describe('buildSavedStudyPath', () => {
  test('returns a safe exact reading context unchanged', () => {
    expect(buildSavedStudyPath({
      id: 'bookmark-1', type: 'bani', title: 'Japji', source: 'G', ang: 1,
      returnPath: '/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib',
      savedAt: '2026-08-10T12:00:00.000Z',
    })).toBe('/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib')
  })

  test('returns an exact book block and rejects an unsafe external route', () => {
    expect(buildSavedStudyPath({
      id: 'bookmark-book', type: 'book', title: 'Panth Prakash',
      workId: 'panth-prakash-english', chapterId: 'episode-001', chapterLabel: 'Episode 1',
      blockId: 'episode-001-p47-b003', returnPath: 'https://example.com/phish',
      savedAt: '2026-08-10T12:00:00.000Z',
    })).toBe('/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003')
  })

  test('rejects backslash and encoded-backslash return paths before opening a saved book', () => {
    const baseBookmark = {
      id: 'bookmark-book', type: 'book' as const, title: 'Panth Prakash',
      workId: 'panth-prakash-english', chapterId: 'episode-001', chapterLabel: 'Episode 1',
      blockId: 'episode-001-p47-b003', savedAt: '2026-08-10T12:00:00.000Z',
    }

    expect(buildSavedStudyPath({
      ...baseBookmark,
      returnPath: '/library/\\evil.example/redirect',
    })).toBe('/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003')

    expect(buildSavedStudyPath({
      ...baseBookmark,
      returnPath: '/library/%5Cevil.example/redirect',
    })).toBe('/library/panth-prakash-english/chapters/episode-001#episode-001-p47-b003')
  })
})

describe('legacy Saved identity compatibility', () => {
  test('allows only routes a legacy generic Ang, shabad, or verse could represent', () => {
    expect(canUseLegacySavedLocationFallback('/study?source=G&ang=1')).toBe(true)
    expect(canUseLegacySavedLocationFallback('/study?shabadId=50&verseId=100')).toBe(true)
    expect(canUseLegacySavedLocationFallback('/study?hukamnamaDate=2026-08-10')).toBe(false)
    expect(canUseLegacySavedLocationFallback('/study?shabadId=50&flow=ardaas-hukamnama')).toBe(false)
    expect(canUseLegacySavedLocationFallback('/study?source=G&ang=1&baniDbId=2&baniId=japji-sahib')).toBe(false)
  })
})
