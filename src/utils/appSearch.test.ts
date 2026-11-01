import { describe, expect, test, vi } from 'vitest'
import * as storyRepository from '../data/storyRepository'
import * as libraryRepository from '../data/libraryRepository'
import { getBaniDiscovery } from '../content/baniDiscovery'
import { BANI_SCRIPT_NAMES } from '../content/baniScriptNames'
import { READ_BANIDB_CATALOG_IDS } from '../data/banis'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
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
    expect.objectContaining({ label: 'Ardaas (Prayer of Supplication)', path: '/study?baniDbId=24&bani=Ardaas' }),
  ]))
  expect(getAppSearchMatches('Zafarnama')).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Zafarnama (Letter of Victory)', kind: 'read-route' }),
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

test.each([
  ['Chandi Charitar Ustat', 12],
  ['Seven Days in Gauri', 50],
  ['Seven Days in Bilaval', 51],
  ['Bhagat Bani in Raag Gauri', 56],
  ['Opening Chapter', 19],
  ['Ath Chandi Charitar', 12],
  ['Gauri Vaar Kabir', 50],
] as const)('finds discovery or legacy name %s with its exact route and researched context', (query, id) => {
  const entry = getBaniDiscovery(id)!
  const match = getAppSearchMatches(query).find(item => new URLSearchParams(item.path.split('?')[1]).get('baniDbId') === String(id))
  expect(match).toMatchObject({ label: entry.name, excerpt: entry.summary, kind: 'read-route' })
})

test.each([
  ['Tav Prasad Savaiye', [6, 7]],
  ['Sri Bhagauti Astotr', [25, 26]],
] as const)('preserves each distinct %s recension exactly once', (query, expectedIds) => {
  const matches = getAppSearchMatches(query)
  const ids = matches.map(match => Number(new URLSearchParams(match.path.split('?')[1]).get('baniDbId')))
  expect(ids.slice().sort((a, b) => a - b)).toEqual([...expectedIds])
  for (const match of matches) {
    const id = Number(new URLSearchParams(match.path.split('?')[1]).get('baniDbId'))
    expect(match.label).toBe(getBaniDiscovery(id)!.name)
  }
})

test.each(['gurmukhi', 'hindi'] as const)('finds all 104 exact readings once from their offline provider %s names', script => {
  for (const id of READ_BANIDB_CATALOG_IDS) {
    const query = BANI_SCRIPT_NAMES[id]![script]
    const matches = getAppSearchMatches(query).filter(match => new URLSearchParams(match.path.split('?')[1]).get('baniDbId') === String(id))
    expect(matches, `${query} should resolve exact reading ${id} once`).toHaveLength(1)
    expect(matches[0]).toMatchObject({ label: getBaniDiscovery(id)!.name, kind: 'read-route' })
  }
})

test.each([
  ['ਕੁਚਜੀ', 14],
  [BANI_SCRIPT_NAMES[6]!.gurmukhi, 6],
  [BANI_SCRIPT_NAMES[7]!.gurmukhi, 7],
  [BANI_SCRIPT_NAMES[6]!.hindi, 6],
  [BANI_SCRIPT_NAMES[7]!.hindi, 7],
] as const)('keeps the displayed script name %s specific to exact reading %s', (query, expectedId) => {
  const ids = getAppSearchMatches(query).map(match => Number(new URLSearchParams(match.path.split('?')[1]).get('baniDbId')))
  expect(ids).toEqual([expectedId])
})

test('uses the selected adjustable reading length without creating duplicate routes', () => {
  const previous = useSundarGutkaLengthStore.getState().lengths
  try {
    for (const length of ['short', 'medium', 'long', 'extralong'] as const) {
      useSundarGutkaLengthStore.getState().setLength('rehras-sahib', length)
      const matches = getAppSearchMatches('Rehras Sahib')
      expect(matches).toHaveLength(1)
      expect(new URLSearchParams(matches[0].path.split('?')[1]).get('sgLength')).toBe(length)
      expect(new URLSearchParams(matches[0].path.split('?')[1]).get('baniDbId')).toBe('21')
    }
  } finally { useSundarGutkaLengthStore.setState({ lengths: previous }) }
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

test('keeps readable chapter matches when a newly discovered book index is unavailable', async () => {
  const catalog = await libraryRepository.loadLibraryDiscoveryCatalog()
  const index = await libraryRepository.loadLibrarySearchIndex('panth-prakash-english')
  const newWork = { ...catalog.works[0], id: 'new-online-book', title: 'New Online Book', shortTitle: 'New Book' }
  const discovery = vi.spyOn(libraryRepository, 'loadLibraryDiscoveryCatalog').mockResolvedValue({
    works: [...catalog.works, newWork], workById: { ...catalog.workById, [newWork.id]: newWork },
  })
  const loader = vi.spyOn(libraryRepository, 'loadLibrarySearchIndex').mockImplementation(workId => workId === newWork.id
    ? Promise.reject(new Error('New book is not downloaded')) : Promise.resolve(index))
  try {
    await expect(getLibrarySearchMatches('Origin of the Khalsa')).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Origin of the Khalsa', kind: 'library-chapter' }),
    ]))
  } finally { loader.mockRestore(); discovery.mockRestore() }
})

test('missing catalog aliases do not suppress a readable chapter index', async () => {
  const index = await libraryRepository.loadLibrarySearchIndex('panth-prakash-english')
  const loader = vi.spyOn(libraryRepository, 'loadLibrarySearchIndex').mockImplementation(workId => workId
    ? Promise.resolve(index) : Promise.reject(new Error('Alias catalog unavailable')))
  try {
    await expect(getLibrarySearchMatches('Origin of the Khalsa')).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Origin of the Khalsa', kind: 'library-chapter' }),
    ]))
  } finally { loader.mockRestore() }
})

test('reports an unavailable search when every chapter index fails while retaining matching book routes', async () => {
  const loader = vi.spyOn(libraryRepository, 'loadLibrarySearchIndex').mockRejectedValue(new Error('Indexes unavailable'))
  try {
    await expect(getLibrarySearchMatches('zz-no-known-book')).rejects.toThrow('Indexes unavailable')
    await expect(getLibrarySearchMatches('Panth Prakash')).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/library/panth-prakash-english', kind: 'library-work' }),
    ]))
  } finally { loader.mockRestore() }
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

test('centres a book excerpt on the literal phrase even after punctuation changes normalized offsets', async () => {
  const index = await libraryRepository.loadLibrarySearchIndex('panth-prakash-english')
  const source = index.chapters![0]
  const loader = vi.spyOn(libraryRepository, 'loadLibrarySearchIndex').mockResolvedValue({
    ...index,
    chapters: [{ ...source, title: 'An unrelated title', searchText: `${'A— —'.repeat(400)} The exact phrase appears here.` }],
  })
  try {
    const [match] = await getLibrarySearchMatches('exact phrase')
    expect(match.excerpt).toContain('exact phrase')
    expect(match.path).toContain('?find=exact+phrase')
    expect(match.excerpt!.length).toBeLessThan(230)
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
