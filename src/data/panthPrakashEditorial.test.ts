import { describe, expect, test } from 'vitest'
import episodes from '../../public/data/library/works/panth-prakash-english/episodes.json'
import pagesIndex from '../../public/data/library/works/panth-prakash-english/pages.json'
import searchIndexJson from '../../public/data/library/search-index.json'
import page210 from '../../public/data/library/works/panth-prakash-english/pages/210.json'
import page215 from '../../public/data/library/works/panth-prakash-english/pages/215.json'
import page225 from '../../public/data/library/works/panth-prakash-english/pages/225.json'
import type { LibraryEpisodeIndexEntry, LibraryPageIndexEntry, LibraryPagePayload, LibrarySearchIndex } from '../types'
import {
  buildPanthPrakashEditionDebtReport,
  getPanthPrakashEpisodeDisplayTitle,
  getPanthPrakashEpisodeEditorial,
  getPanthPrakashPageDisplayTitle,
  getPanthPrakashPrioritizedContextEpisodes,
} from './panthPrakashEditorial'

const episodeIndex = episodes as LibraryEpisodeIndexEntry[]
const pageIndex = pagesIndex as LibraryPageIndexEntry[]
const searchIndex = searchIndexJson as LibrarySearchIndex

describe('panthPrakashEditorial', () => {
  test('cleans weak generated episode titles at display time without mutating the source index', () => {
    const machhiwara = episodeIndex.find(episode => episode.episodeNumber === 20)!
    const banda = episodeIndex.find(episode => episode.episodeNumber === 31)!
    const parol = episodeIndex.find(episode => episode.episodeNumber === 116)!
    const headCount = episodeIndex.find(episode => episode.episodeNumber === 117)!

    expect(machhiwara.title).toMatch(/Machhiwara Nea/i)
    expect(getPanthPrakashEpisodeDisplayTitle(machhiwara)).toBe('Guru Gobind Singh at Machhiwara')
    expect(getPanthPrakashEpisodeDisplayTitle(banda)).toBe('Banda Singh Bahadur’s next movement')
    expect(getPanthPrakashEpisodeDisplayTitle(parol)).toBe('The Chhota Ghallughara at Parol and Kathuha')
    expect(getPanthPrakashEpisodeDisplayTitle(headCount)).toBe('Counting the Singhs after the massacre')
  })

  test('applies verified display-title overrides for the launch-blocking title artifacts', () => {
    const expectedTitles = [
      [24, 'Guru Gobind Singh at Talwandi Sabo'],
      [28, 'Guru Gobind Singh’s encounter with Banda Singh Bahadur'],
      [29, 'The Khalsa’s prayer and Banda Singh Bahadur’s mission'],
      [34, 'Banda Singh meets Aali Singh and Maali Singh of Salodi'],
      [48, 'Banda Singh Bahadur’s campaign against Kahloor and the Hill States'],
      [125, 'The Marathas and the Khalsa Panth at Sirhind'],
    ] as const
    const artifactPattern = /Rènion|\bBras\b|\bBanda nd\b|\.\.\.?$/i

    expectedTitles.forEach(([episodeNumber, expectedTitle]) => {
      const episode = episodeIndex.find(entry => entry.episodeNumber === episodeNumber)!
      const displayTitle = getPanthPrakashEpisodeDisplayTitle(episode)
      const editorial = getPanthPrakashEpisodeEditorial(episode)

      expect(displayTitle).toBe(expectedTitle)
      expect(editorial?.displayTitle).toBe(expectedTitle)
      expect(displayTitle).not.toMatch(artifactPattern)
      expect(episode.title).toBeTruthy()
    })

    expect(episodeIndex.find(entry => entry.episodeNumber === 24)?.title).toMatch(/Rènion/i)
    expect(episodeIndex.find(entry => entry.episodeNumber === 28)?.title).toMatch(/Banda nd/i)
    expect(episodeIndex.find(entry => entry.episodeNumber === 125)?.title).toMatch(/\.\.\./)
  })

  test('uses cleaned page display titles while keeping specific source-page titles when they are meaningful', () => {
    expect(getPanthPrakashPageDisplayTitle(page210 as LibraryPagePayload)).toBe('Guru Gobind Singh at Talwandi Sabo')
    expect(getPanthPrakashPageDisplayTitle(page225 as LibraryPagePayload)).toBe('Guru Gobind Singh’s encounter with Banda Singh Bahadur')
    expect(getPanthPrakashPageDisplayTitle(page215 as LibraryPagePayload)).toBe('Rain in Malwa: Source Verse Opening')
  })

  test('provides an expanded prioritized context set across major Panth Prakash arcs', () => {
    const prioritized = getPanthPrakashPrioritizedContextEpisodes()
    expect(prioritized.length).toBeGreaterThanOrEqual(25)
    expect(prioritized).toEqual(expect.arrayContaining([1, 15, 19, 20, 27, 37, 52, 100, 112, 115, 116, 119, 120, 123, 169]))

    for (const episodeNumber of prioritized.slice(0, 25)) {
      const episode = episodeIndex.find(entry => entry.episodeNumber === episodeNumber)!
      const editorial = getPanthPrakashEpisodeEditorial(episode)
      expect(editorial?.summary).toBeTruthy()
      expect(editorial?.whyItMatters).toBeTruthy()
    }
  })

  test('reports source mapping and review debt from the published Panth Prakash index', () => {
    const report = buildPanthPrakashEditionDebtReport(pageIndex, searchIndex)
    expect(report.totalPages).toBe(1417)
    expect(report.pagesMissingSourceMapping).toBe(0)
    expect(report.reviewStatusLabel).toBe('672 editorial reconstruction pages with raw source retained')
    expect(report.secondaryStatusLabel).toBe('745 source-backed reading pages')
    expect(report.nextActions).toEqual(expect.arrayContaining([
      'Review reconstruction pages episode-by-episode against retained raw OCR/source scans',
      'Promote source-backed pages to reviewed only after human spot-checking',
    ]))
  })

  test('publishes an episode-aware Panth Prakash search index for fast reader search', () => {
    expect(searchIndex.pages?.length).toBe(1417)
    expect(searchIndex.episodes?.length).toBe(169)
    expect(searchIndex.metadata?.panthPrakash?.editorialReconstructionPages).toBe(672)
    expect(searchIndex.metadata?.panthPrakash?.sourceBackedPages).toBe(745)

    const jujhar = searchIndex.pages?.find(page => page.pageNumber === 169)
    expect(jujhar?.episodeNumber).toBe(19)
    expect(jujhar?.episodeDisplayTitle).toMatch(/Sahibzadas/i)
    expect(jujhar?.searchText).toMatch(/Sahibzada Jujhar Singh/i)

    const chamba = searchIndex.episodes?.find(episode => episode.episodeNumber === 52)
    expect(chamba?.displayTitle).toMatch(/Chamba miracle/i)
    expect(chamba?.summary).toMatch(/Banda Singh Bahadur/i)
  })

  test('keeps search-index episode and page labels synced to the cleaned launch-blocking titles', () => {
    const expectedTitles = [
      [24, 'Guru Gobind Singh at Talwandi Sabo'],
      [28, 'Guru Gobind Singh’s encounter with Banda Singh Bahadur'],
      [29, 'The Khalsa’s prayer and Banda Singh Bahadur’s mission'],
      [34, 'Banda Singh meets Aali Singh and Maali Singh of Salodi'],
      [48, 'Banda Singh Bahadur’s campaign against Kahloor and the Hill States'],
      [125, 'The Marathas and the Khalsa Panth at Sirhind'],
    ] as const
    const staleArtifactPattern = /Rènion|\bBras\b|\bBanda nd\b|Prayer of the Khalsa\.\.\.|Village Salodi\.\.\.|Hill States\.\.\.|Khalsa Panth\.\.\./i

    expectedTitles.forEach(([episodeNumber, expectedTitle]) => {
      const indexedEpisode = searchIndex.episodes?.find(entry => entry.episodeNumber === episodeNumber)
      const indexedPages = searchIndex.pages?.filter(entry => entry.episodeNumber === episodeNumber) ?? []
      const indexedText = [
        indexedEpisode?.displayTitle,
        indexedEpisode?.summary,
        indexedEpisode?.searchText,
        ...indexedPages.map(page => `${page.episodeDisplayTitle ?? ''} ${page.searchText}`),
      ].join(' ')

      expect(indexedEpisode?.displayTitle).toBe(expectedTitle)
      expect(indexedPages.length).toBeGreaterThan(0)
      expect(indexedPages.every(page => page.episodeDisplayTitle === expectedTitle)).toBe(true)
      expect(indexedText).not.toMatch(staleArtifactPattern)
    })
  })

  test('curates every Panth Prakash episode with reader-facing title and summary metadata', () => {
    for (const episode of episodeIndex) {
      const displayTitle = getPanthPrakashEpisodeDisplayTitle(episode)
      const editorial = getPanthPrakashEpisodeEditorial(episode)
      expect(displayTitle).toBeTruthy()
      expect(displayTitle).not.toMatch(/\bNea\b|\bMm\b|\bTs\b|\.\.\.?$/i)
      expect(editorial?.summary).toBeTruthy()
      expect(editorial?.whyItMatters).toBeTruthy()
      expect(editorial?.arcLabel).toBeTruthy()
    }
  })

  test('maps every Panth Prakash app page to a source scan page within its volume', () => {
    expect(pageIndex.every(page => page.sourcePageNumber > 0)).toBe(true)
    expect(pageIndex.find(page => page.pageNumber === 1)?.sourcePageNumber).toBe(1)
    expect(pageIndex.find(page => page.pageNumber === 575)?.sourcePageNumber).toBe(575)
    expect(pageIndex.find(page => page.pageNumber === 576)?.sourcePageNumber).toBe(1)
    expect(pageIndex.find(page => page.pageNumber === 1417)?.sourcePageNumber).toBe(842)
  })
})
