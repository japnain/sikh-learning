import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, test } from 'vitest'

interface WorkManifest {
  id: string
  totalPages: number
}

interface PageIndexEntry {
  pageNumber: number
  volume: number
  sourcePageNumber: number
  path: string
}

interface EpisodeIndexEntry {
  episodeNumber: number
  title: string
  startPage: number
  endPage: number
  volume: number
}

interface PagePayload {
  pageNumber: number
  title: string
  blocks: Array<{ id: string; text: string; type: string }>
  rawBlocks?: Array<{ id: string; text: string; type: string }>
  episode?: {
    number: number
    title: string
    startPage: number
    endPage: number
  }
}

const PROJECT_ROOT = process.cwd()
const WORK_ROOT = path.join(PROJECT_ROOT, 'public/data/library/works/panth-prakash-english')

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(WORK_ROOT, relativePath), 'utf8')) as T
}

const REPAIRED_READING_FIXTURES = [
  { pageNumber: 2, title: 'Publication Details and Imprint', anchor: 'ISBN 81-85815-28-3' },
  { pageNumber: 6, title: 'Contents: Banda Bahadur and the Khalsa Struggle', anchor: 'Banda Bahadur sequence' },
  { pageNumber: 7, title: 'Contents: Final Volume I Episodes', anchor: 'wrestling bout between Miri Singh and Sangat Singh' },
  { pageNumber: 43, title: 'Introduction References and Verse Notes', anchor: 'Hukamnamas edited by Dr Ganda Singh' },
  { pageNumber: 45, title: 'Transition from Preface to Episode One', anchor: 'hinge between the prefatory defense and Episode 1' },
  { pageNumber: 215, title: 'Rain in Malwa: Source Verse Opening', anchor: 'people of Malwa come to Guru Gobind Singh' },
  { pageNumber: 220, title: 'Southward Journey and Banda Bahadur Opening', anchor: 'Bhai Mohan, Bhagata, Bahlo, and Rupa' },
  { pageNumber: 298, title: 'Malerkotla Settlement and Doaba Transition', anchor: 'Bhai Fateh Singh is appointed commander' },
  { pageNumber: 428, title: 'Outnumbered Singhs Fight On', anchor: 'Every Singh who rushes forward' },
  { pageNumber: 450, title: 'Mughals Debate How to Capture Banda Singh', anchor: 'boiling cauldron' },
  { pageNumber: 472, title: 'Banda Singh’s Prophecy and Farukhsiyar’s Death', anchor: 'Farukhsiyar wishes to ride a favorite horse' },
  { pageNumber: 573, title: 'Index: A–F', anchor: 'Aali Singh' },
  { pageNumber: 574, title: 'Index: G–K', anchor: 'Guru Amar Das' },
  { pageNumber: 578, title: 'Publication Details and Imprint', anchor: 'ISBN 81-85815-31-3' },
  { pageNumber: 583, title: 'Contents: Episodes 156–169 and Back Matter', anchor: 'References, Quotable Quotes, and Index' },
  { pageNumber: 623, title: 'Introduction Notes: Martyrdom Quotations and References', anchor: 'J. S. Grewal’s Valorizing the Traditions' },
  { pageNumber: 627, title: 'Introduction Notes: Khalsa Authority and Kapoor Singh', anchor: 'robe of honor because his service' },
  { pageNumber: 630, title: 'Introduction Notes: Martyrdom and Citation Spillover', anchor: 'offered his head for the Guru' },
  { pageNumber: 634, title: 'Hindal’s Reverent Bow in the Langar', anchor: 'hands were covered with wheat flour' },
  { pageNumber: 640, title: 'Har Bhagat’s Betrayal of the Khalsa', anchor: 'twice caused the author’s own village to be plundered' },
  { pageNumber: 654, title: 'Tara Singh’s Companions Gather for Martyrdom', anchor: 'pledged themselves while eating from the same bowl' },
  { pageNumber: 726, title: 'Jassa Singh Blessed by Nawab Kapoor Singh', anchor: 'issue feed to thousands of horses' },
  { pageNumber: 822, title: 'Sukha Singh Honored by the Khalsa', anchor: 'offered Sukha Singh a horse each' },
  { pageNumber: 914, title: 'Mehtab Singh Resolves to Join Bhai Taru Singh', anchor: 'go toward Lahore and join him through sacrifice' },
  { pageNumber: 1091, title: 'Bangar Expedition and Mit Singh’s Proposal', anchor: 'ten thousand independent-minded Singhs should cross the Yamuna at dawn' },
  { pageNumber: 1102, title: 'Episode About Mathura and Koel', anchor: 'Najib Khan worried that Abdali would be trapped before Koel' },
  { pageNumber: 1150, title: 'Rift Between the Khalsa Panth and the Brars', anchor: 'The Majhail Singhs stayed mainly around Jaitu' },
  { pageNumber: 1222, title: 'Another Episode About the Taruna Dal', anchor: 'The Taruna Dal saw the region around Lahore lying open' },
  { pageNumber: 1260, title: 'Khalsa Occupation on Both Sides of Lahore', anchor: 'Majha remained common because it surrounded the sacred shrine at Amritsar' },
  { pageNumber: 1278, title: 'Nihang Gurbakhsh Singh’s Martyrdom', anchor: 'Gurbakhsh Singh kept moving forward rather than turn back' },
  { pageNumber: 1358, title: 'Baghel Singh and the Delhi Memorials', anchor: 'recanting would break trust with S. Baghel Singh' },
  { pageNumber: 1368, title: 'Baghel Singh Enters the Emperor’s Court', anchor: 'Dulcha Singh and Sadda Singh' },
  { pageNumber: 1402, title: 'Malwa Settlements and Ala Singh’s Appeal', anchor: 'six villages were established by the six brothers' },
]

describe('Panth Prakash native library integrity', () => {
  test('ships every declared page as native app-readable JSON with contiguous volume source pages', () => {
    const work = readJson<WorkManifest>('work.json')
    const pageIndex = readJson<PageIndexEntry[]>('pages.json')

    expect(work.id).toBe('panth-prakash-english')
    expect(pageIndex).toHaveLength(work.totalPages)

    const pageNumbers = pageIndex.map(page => page.pageNumber)
    expect(pageNumbers).toEqual(Array.from({ length: work.totalPages }, (_, index) => index + 1))

    const byVolume = new Map<number, PageIndexEntry[]>()
    pageIndex.forEach(page => {
      expect(fs.existsSync(path.join(PROJECT_ROOT, 'public', page.path.replace(/^\//, '')))).toBe(true)
      byVolume.set(page.volume, [...(byVolume.get(page.volume) ?? []), page])
    })

    expect(byVolume.get(1)?.map(page => page.sourcePageNumber)).toEqual(
      Array.from({ length: 575 }, (_, index) => index + 1),
    )
    expect(byVolume.get(2)?.map(page => page.sourcePageNumber)).toEqual(
      Array.from({ length: 842 }, (_, index) => index + 1),
    )
  })

  test('keeps episodes 1 through 169 monotonic, non-overlapping, and inside their source volume', () => {
    const pageIndex = readJson<PageIndexEntry[]>('pages.json')
    const episodes = readJson<EpisodeIndexEntry[]>('episodes.json')
    const pageByNumber = new Map(pageIndex.map(page => [page.pageNumber, page]))

    expect(episodes.map(episode => episode.episodeNumber)).toEqual(
      Array.from({ length: 169 }, (_, index) => index + 1),
    )

    for (const episode of episodes) {
      expect(episode.startPage, `episode ${episode.episodeNumber} starts after it ends`).toBeLessThanOrEqual(episode.endPage)

      const episodePages = pageIndex.filter(
        page => page.pageNumber >= episode.startPage && page.pageNumber <= episode.endPage,
      )

      expect(episodePages.length, `episode ${episode.episodeNumber} has no native pages`).toBeGreaterThan(0)
      expect(
        episodePages.every(page => page.volume === episode.volume),
        `episode ${episode.episodeNumber} crosses a volume boundary`,
      ).toBe(true)
      expect(pageByNumber.get(episode.startPage)?.volume, `episode ${episode.episodeNumber} start page volume`).toBe(
        episode.volume,
      )
      expect(pageByNumber.get(episode.endPage)?.volume, `episode ${episode.episodeNumber} end page volume`).toBe(
        episode.volume,
      )
    }

    const byVolume = new Map<number, EpisodeIndexEntry[]>()
    episodes.forEach(episode => byVolume.set(episode.volume, [...(byVolume.get(episode.volume) ?? []), episode]))

    Array.from(byVolume.entries()).forEach(([volume, volumeEpisodes]) => {
      for (let index = 1; index < volumeEpisodes.length; index += 1) {
        const previous = volumeEpisodes[index - 1]
        const current = volumeEpisodes[index]
        expect(
          current.startPage,
          `volume ${volume} episode ${current.episodeNumber} should begin immediately after episode ${previous.episodeNumber}`,
        ).toBe(previous.endPage + 1)
      }
    })
  })

  test('syncs retained page-level episode metadata with the canonical episode index', () => {
    const pageIndex = readJson<PageIndexEntry[]>('pages.json')
    const episodes = readJson<EpisodeIndexEntry[]>('episodes.json')
    const episodesByNumber = new Map(episodes.map(episode => [episode.episodeNumber, episode]))

    for (const pageIndexEntry of pageIndex) {
      const page = readJson<PagePayload>(`pages/${pageIndexEntry.pageNumber}.json`)

      if (!page.episode) continue

      const expectedEpisode = episodesByNumber.get(page.episode.number)
      expect(expectedEpisode, `page ${page.pageNumber} points at a known episode`).toBeDefined()
      expect(page.pageNumber, `page ${page.pageNumber} should not precede its page-level episode`).toBeGreaterThanOrEqual(expectedEpisode!.startPage)
      expect(page.pageNumber, `page ${page.pageNumber} should not exceed its page-level episode`).toBeLessThanOrEqual(expectedEpisode!.endPage)
      expect(page.episode).toEqual({
        number: expectedEpisode!.episodeNumber,
        title: expectedEpisode!.title,
        startPage: expectedEpisode!.startPage,
        endPage: expectedEpisode!.endPage,
      })
    }
  })

  test('keeps every manual readable page tied to retained raw source provenance', () => {
    const pageIndex = readJson<PageIndexEntry[]>('pages.json')

    for (const pageIndexEntry of pageIndex) {
      const page = readJson<PagePayload>(`pages/${pageIndexEntry.pageNumber}.json`)
      const isManualReadablePage = page.blocks.some(block => block.id.startsWith(`manual-${page.pageNumber}-`))

      if (!isManualReadablePage) continue

      expect(page.rawBlocks?.length ?? 0, `manual page ${page.pageNumber} should retain raw source/provenance blocks`).toBeGreaterThan(0)
    }
  })

  test('keeps repaired audit-queue pages readable with stable source-grounded anchors', () => {
    for (const fixture of REPAIRED_READING_FIXTURES) {
      const page = readJson<PagePayload>(`pages/${fixture.pageNumber}.json`)
      const displayText = page.blocks.map(block => block.text).join(' ')

      expect(page.title, `page ${fixture.pageNumber} title`).toBe(fixture.title)
      expect(
        page.blocks.every(block => block.id.startsWith(`manual-${fixture.pageNumber}-`)),
        `page ${fixture.pageNumber} should use curated readable blocks`,
      ).toBe(true)
      expect(displayText, `page ${fixture.pageNumber} readable anchor`).toContain(fixture.anchor)
      expect(page.rawBlocks?.length ?? 0, `page ${fixture.pageNumber} should retain raw source/provenance blocks`).toBeGreaterThan(0)
    }
  })
})
