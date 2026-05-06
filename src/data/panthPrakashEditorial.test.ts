import { describe, expect, test } from 'vitest'
import episodes from '../../public/data/library/works/panth-prakash-english/episodes.json'
import pagesIndex from '../../public/data/library/works/panth-prakash-english/pages.json'
import searchIndexJson from '../../public/data/library/search-index.json'
import type { LibraryEpisodeIndexEntry, LibraryPageIndexEntry, LibrarySearchIndex } from '../types'
import {
  buildPanthPrakashEditionDebtReport,
  getPanthPrakashEpisodeDisplayTitle,
  getPanthPrakashEpisodeEditorial,
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
