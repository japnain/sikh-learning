import { describe, expect, test, vi } from 'vitest'
import * as storyRepository from '../data/storyRepository'
import * as libraryRepository from '../data/libraryRepository'
import {
  getAngTargets,
  getAvailableSearchMeta,
  getAppSearchMatches,
  getLibrarySearchMatches,
  getStorySearchMatches,
  isDirectLookupQuery,
} from './appSearch'

describe('getAngTargets', () => {
  test('accepts positive decimal integer digits', () => {
    expect(getAngTargets(' 1 ', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1',
    })])
    expect(getAngTargets('001', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1',
    })])
    expect(getAngTargets('੧੪੩੦', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1430',
    })])
    expect(getAngTargets('१४३०', 'G')).toEqual([expect.objectContaining({
      source: 'G',
      path: '/study?source=G&ang=1430',
    })])
  })

  test('offers only source readers backed by the BaniDB ang endpoint', () => {
    const targets = getAngTargets('12', 'all')

    expect(targets.map(target => target.source)).toEqual(['G', 'D', 'B'])
    expect(targets).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/study?source=A&ang=12' }),
    ]))
    expect(getAngTargets('12', 'A')).toEqual([])
  })

  test.each([
    '0',
    '-1',
    '+1',
    '1.5',
    '1e2',
    'Infinity',
    '12 ang',
    '੧.੫',
  ])('rejects non-positive or non-decimal-integer input %j', query => {
    expect(getAngTargets(query, 'all')).toEqual([])
  })
})

test.each(['12', '੧੨', '१२'])('recognizes %s as a direct lookup in auto-detect mode', query => {
  expect(isDirectLookupQuery(query)).toBe(true)
})

test('includes standalone and browse-only reading destinations', () => {
  expect(getAppSearchMatches('Ardaas')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Ardaas', path: '/study?baniDbId=24&bani=Ardaas' }),
  ]))
  expect(getAppSearchMatches('Zafarnama')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Zafarnama', kind: 'read-route' }),
  ]))
  expect(getAppSearchMatches('Bhai Gurdas')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Bhai Gurdas Ji Vaaran', kind: 'read-route' }),
  ]))
  expect(getAppSearchMatches('Amrit Keertan')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Amrit Keertan', path: '/banis/amrit-keertan' }),
  ]))
})

test('honors the selected source for app destinations', () => {
  expect(getAppSearchMatches('Amrit Keertan', 'G')).toEqual([])
  expect(getAppSearchMatches('Amrit Keertan', 'A')).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: '/banis/amrit-keertan' }),
  ]))
})

test('finds library works and matching Panth Prakash chapters', async () => {
  await expect(getLibrarySearchMatches('Panth Prakash')).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({
      label: 'Sri Gur Panth Prakash',
      path: '/library/panth-prakash-english',
      kind: 'library-work',
    }),
  ]))
  await expect(getLibrarySearchMatches('Origin of the Khalsa')).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({
      label: 'Origin of the Khalsa',
      path: '/library/panth-prakash-english/chapters/episode-001?find=Origin+of+the+Khalsa',
      kind: 'library-chapter',
    }),
  ]))
})

test('finds stories by title, description, people, themes and series', async () => {
  const catalog = vi.spyOn(storyRepository, 'loadStoryCatalog').mockResolvedValue({
    version: 1,
    collections: [],
    stories: [{
      id: 'shared-meal', title: 'A Shared Meal', subtitle: 'An open table',
      description: 'A reflection on service.', people: ['Guru Nanak'], themes: ['Equality'],
      series: { id: 'journeys', title: 'Journeys', order: 1 },
      collectionId: 'wisdom', artwork: 'bowl', wordCount: 20, readingMinutes: 1, revision: 1,
    }],
  })
  try {
    for (const query of ['shared meal', 'service', 'Guru Nanak', 'equality', 'journeys', 'NANAK équality']) {
      await expect(getStorySearchMatches(query)).resolves.toEqual([expect.objectContaining({
        label: 'A Shared Meal', kind: 'story', path: '/stories/shared-meal',
      })])
    }
    await expect(getStorySearchMatches('missing phrase')).resolves.toEqual([])
  } finally {
    catalog.mockRestore()
  }
})

test('book result queries are phrases the reader can highlight, not scattered independent terms', async () => {
  const index = await libraryRepository.loadLibrarySearchIndex('panth-prakash-english')
  const source = index.chapters![0]
  const loader = vi.spyOn(libraryRepository, 'loadLibrarySearchIndex').mockResolvedValue({
    ...index,
    chapters: [{ ...source, title: 'A chapter', searchText: 'A Guru journey ends in battle.' }],
  })
  try {
    await expect(getLibrarySearchMatches('Guru battle')).resolves.toEqual([])
    await expect(getLibrarySearchMatches('Guru journey')).resolves.toEqual([
      expect.objectContaining({ kind: 'library-chapter', path: expect.stringContaining('?find=Guru+journey') }),
    ])
  } finally {
    loader.mockRestore()
  }
})


test('does not silently cap library full-text matches before the view can expand them', async () => {
  const index = await libraryRepository.loadLibrarySearchIndex('panth-prakash-english')
  const source = index.chapters![0]
  const loader = vi.spyOn(libraryRepository, 'loadLibrarySearchIndex').mockResolvedValue({
    ...index,
    chapters: Array.from({ length: 19 }, (_, number) => ({ ...source, chapterId: `chapter-${number}`, title: `Matched chapter ${number}`, searchText: 'The unique searchable phrase appears here.' })),
  })
  try {
    expect(await getLibrarySearchMatches('unique searchable phrase')).toHaveLength(19)
  } finally { loader.mockRestore() }
})

test('every returned raag and writer remains available as a search facet', () => {
  const results = Array.from({ length: 14 }, (_, number) => ({
    shabadId: number + 1, verseId: number + 1, source: 'G', sourceName: 'SGGS', pageNo: 1,
    gurmukhi: 'ਪਾਠ', transliteration: '', translation_en: '', raag: `Raag ${number}`, writer: `Writer ${number}`,
  }))
  const facets = getAvailableSearchMeta(results)
  expect(facets.raags).toHaveLength(14)
  expect(facets.writers).toHaveLength(14)
  expect(facets.raags).toContain('Raag 13')
  expect(facets.writers).toContain('Writer 13')
})
