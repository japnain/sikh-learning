import { describe, expect, test } from 'vitest'
import episodes from '../../public/data/library/works/panth-prakash-english/episodes.json'
import pagesIndex from '../../public/data/library/works/panth-prakash-english/pages.json'
import type { LibraryEpisodeIndexEntry, LibraryPageIndexEntry } from '../types'
import {
  buildPanthPrakashEditionDebtReport,
  getPanthPrakashEpisodeDisplayTitle,
  getPanthPrakashEpisodeEditorial,
  getPanthPrakashPrioritizedContextEpisodes,
} from './panthPrakashEditorial'

const episodeIndex = episodes as LibraryEpisodeIndexEntry[]
const pageIndex = pagesIndex as LibraryPageIndexEntry[]

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
    const report = buildPanthPrakashEditionDebtReport(pageIndex)
    expect(report.totalPages).toBe(1417)
    expect(report.pagesMissingSourceMapping).toBe(0)
    expect(report.reviewStatusLabel).toBe('1417 machine-cleaned pages awaiting human review')
    expect(report.nextActions).toEqual(expect.arrayContaining([
      'Human-review machine-cleaned pages before using verified-edition language',
      'Convert retained asterisk and uncertainty markers into fuller source notes over time',
    ]))
  })

  test('maps every Panth Prakash app page to a source scan page within its volume', () => {
    expect(pageIndex.every(page => page.sourcePageNumber > 0)).toBe(true)
    expect(pageIndex.find(page => page.pageNumber === 1)?.sourcePageNumber).toBe(1)
    expect(pageIndex.find(page => page.pageNumber === 575)?.sourcePageNumber).toBe(575)
    expect(pageIndex.find(page => page.pageNumber === 576)?.sourcePageNumber).toBe(1)
    expect(pageIndex.find(page => page.pageNumber === 1417)?.sourcePageNumber).toBe(842)
  })
})
