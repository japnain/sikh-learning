import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, test } from 'vitest'

interface PublicationManifest {
  id: string
  volume: number
  episodeRange: [number, number]
  sourceFileName: string
  epubPath: string
  checksumSha256: string
  sourcePageCount: number
  readablePageCount: number
  firstChapterId: string
}

interface WorkManifest {
  id: string
  revision: string
  totalChapters: number
  totalPages: number
  totalSourcePages: number
  readablePages: number
  publications: PublicationManifest[]
  chapterIndexPath: string
  chapterPathTemplate: string
  searchIndexPath: string
  pageIndexPath?: string
}

interface ChapterIndexEntry {
  workId: string
  id: string
  chapterNumber: number
  episodeNumber: number
  kind: 'episode'
  title: string
  volume: number
  publicationId: string
  startSourcePage: number
  endSourcePage: number
  pageCount: number
  wordCount: number
  charCount: number
  startPosition: number
  path: string
}

interface TextBlock {
  id: string
  text: string
  type: 'heading' | 'meter' | 'verse' | 'paragraph' | 'note'
  lines?: string[]
  number?: string
}

interface ChapterPayload extends ChapterIndexEntry {
  pages: Array<{
    sourcePageNumber: number
    fileName: string
    sourceHref: string
    blocks: TextBlock[]
  }>
  source: {
    type: 'epub'
    fileName: string
  }
}

interface ProvenanceManifest {
  workId: string
  profile: string
  generatedFrom: Array<{
    publicationId: string
    sourceFileName: string
    checksumSha256: string
    archivedEpubPath: string
  }>
  selection: {
    purpose: string
    rules: string[]
  }
  transformations: string[]
  locatorPolicy: string
}

interface ValidationManifest {
  status: string
  source: {
    rawPageCount: number
    readableEnglishPageCount: number
    sourceCountsMatch: boolean
    readableCountsMatch: boolean
    archivedChecksumsMatch: boolean
    volumes: Array<{
      publicationId: string
      readablePageCount: number
      readableRange: { first: number; last: number; step: number }
    }>
  }
  episodes: {
    total: number
    missing: number[]
    empty: number[]
  }
  semantics: {
    totalBlocks: number
    headings: number
    meters: number
    verses: number
    paragraphs: number
    notes: number
    largestBlockCharacters: number
    blocksOver600Characters: string[]
  }
}

const PROJECT_ROOT = process.cwd()
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public')
const LIBRARY_ROOT = path.join(PUBLIC_ROOT, 'data/library')
const WORK_ROOT = path.join(LIBRARY_ROOT, 'works/panth-prakash-english')
const EXPECTED_HASHES = {
  'volume-1': 'f9f801cc84551a8e895df8f9b812c634f5b9ecaf630e10f58ad5a99e90771768',
  'volume-2': '243827ebbb3a4152b1252834b5d9a1620bdf52478ce3021f3d1cdbd35d73d5bf',
} as const

function readWorkJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(WORK_ROOT, relativePath), 'utf8')) as T
}

function readLibraryJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(LIBRARY_ROOT, relativePath), 'utf8')) as T
}

function readChapterPayload(chapter: ChapterIndexEntry): ChapterPayload {
  return JSON.parse(
    fs.readFileSync(path.join(PUBLIC_ROOT, chapter.path.replace(/^\//, '')), 'utf8')
  ) as ChapterPayload
}

function sha256(filePath: string) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

describe('Panth Prakash EPUB library integrity', () => {
  test('publishes 169 ordered stable episode IDs across two volumes', () => {
    const work = readWorkJson<WorkManifest>('work.json')
    const chapters = readWorkJson<ChapterIndexEntry[]>('chapters.json')

    expect(work).toEqual(expect.objectContaining({
      id: 'panth-prakash-english',
      totalChapters: 169,
      totalPages: 1413,
      totalSourcePages: 1413,
      readablePages: 637,
      chapterIndexPath: '/data/library/works/panth-prakash-english/chapters.json',
      chapterPathTemplate: '/data/library/works/panth-prakash-english/chapters/:chapterId.json',
      searchIndexPath: '/data/library/works/panth-prakash-english/search-index.json',
    }))
    expect(work.pageIndexPath).toBeUndefined()
    expect(work.publications).toHaveLength(2)
    expect(work.publications.map(publication => publication.episodeRange)).toEqual([[1, 81], [82, 169]])
    expect(chapters).toHaveLength(169)
    expect(chapters.map(chapter => chapter.id)).toEqual(
      Array.from({ length: 169 }, (_value, index) => `episode-${String(index + 1).padStart(3, '0')}`)
    )
    expect(chapters.map(chapter => chapter.chapterNumber)).toEqual(
      Array.from({ length: 169 }, (_value, index) => index + 1)
    )
    expect(chapters.map(chapter => chapter.episodeNumber)).toEqual(
      Array.from({ length: 169 }, (_value, index) => index + 1)
    )
    expect(chapters.every(chapter => chapter.kind === 'episode')).toBe(true)
  })

  test('keeps all chapter files non-empty and retains exactly the 637 readable odd-facing pages', () => {
    const chapters = readWorkJson<ChapterIndexEntry[]>('chapters.json')
    const retainedPages = new Set<string>()
    const retainedByPublication = new Map<string, Set<number>>()

    for (const chapter of chapters) {
      const filePath = path.join(PUBLIC_ROOT, chapter.path.replace(/^\//, ''))
      expect(fs.existsSync(filePath), chapter.id).toBe(true)
      const payload = readChapterPayload(chapter)
      expect(payload.id).toBe(chapter.id)
      expect(payload.pages.length, chapter.id).toBe(chapter.pageCount)
      expect(payload.pages.length, chapter.id).toBeGreaterThan(0)
      expect(payload.pages.some(page => page.blocks.some(block => block.text.trim().length > 0)), chapter.id).toBe(true)

      for (const page of payload.pages) {
        expect(page.sourcePageNumber % 2, `${chapter.id}:${page.sourcePageNumber}`).toBe(1)
        retainedPages.add(`${chapter.publicationId}:${page.sourcePageNumber}`)
        const publicationPages = retainedByPublication.get(chapter.publicationId) ?? new Set<number>()
        publicationPages.add(page.sourcePageNumber)
        retainedByPublication.set(chapter.publicationId, publicationPages)
      }
    }

    expect(retainedPages).toHaveLength(637)
    expect(retainedByPublication.get('volume-1')).toHaveLength(245)
    expect(retainedByPublication.get('volume-2')).toHaveLength(392)

    const validation = readWorkJson<ValidationManifest>('validation.json')
    expect(validation.source.readableEnglishPageCount).toBe(637)
    expect(validation.source.volumes.map(volume => volume.readableRange.step)).toEqual([2, 2])
    expect(validation.source.volumes.map(volume => volume.readableRange.first)).toEqual([47, 57])
    expect(validation.source.volumes.map(volume => volume.readableRange.last)).toEqual([535, 839])
  })

  test('archives both supplied EPUBs with exact checksums and reproducible provenance', () => {
    const work = readWorkJson<WorkManifest>('work.json')
    const provenance = readWorkJson<ProvenanceManifest>('provenance.json')

    expect(work.revision).toContain('f9f801cc-243827eb')
    expect(provenance.workId).toBe(work.id)
    expect(provenance.profile).toBe('panth-prakash-english-v6')
    expect(provenance.generatedFrom).toHaveLength(2)

    for (const publication of work.publications) {
      const expectedHash = EXPECTED_HASHES[publication.id as keyof typeof EXPECTED_HASHES]
      const archivedPath = path.join(PUBLIC_ROOT, publication.epubPath.replace(/^\//, ''))
      const provenanceEntry = provenance.generatedFrom.find(entry => entry.publicationId === publication.id)

      expect(expectedHash).toBeTruthy()
      expect(fs.existsSync(archivedPath)).toBe(true)
      expect(publication.checksumSha256).toBe(expectedHash)
      expect(sha256(archivedPath)).toBe(expectedHash)
      expect(provenanceEntry).toEqual(expect.objectContaining({
        sourceFileName: publication.sourceFileName,
        checksumSha256: expectedHash,
        archivedEpubPath: publication.epubPath,
      }))
    }

    expect(provenance.selection.purpose).toBe('English reader edition')
    expect(provenance.selection.rules.join(' ')).toMatch(/corrupted source-language\/transliteration facing pages are excluded/i)
    expect(provenance.transformations.join(' ')).toMatch(/semantic blocks/i)
    expect(provenance.locatorPolicy).toMatch(/Page locators retain publication ID/i)
  })

  test('enforces semantic reading blocks and prevents giant OCR paragraphs', () => {
    const chapters = readWorkJson<ChapterIndexEntry[]>('chapters.json')
    const blocks = chapters.flatMap(chapter => readChapterPayload(chapter).pages.flatMap(page => page.blocks))
    const validation = readWorkJson<ValidationManifest>('validation.json')
    const blockTypes = new Set(blocks.map(block => block.type))
    const largestBlock = Math.max(...blocks.map(block => block.text.length))

    expect(blockTypes).toEqual(new Set(['heading', 'invocation', 'meter', 'verse', 'paragraph', 'note']))
    expect(blocks.filter(block => block.type === 'verse').length).toBeGreaterThan(5000)
    expect(blocks.filter(block => block.type === 'verse' && (block.lines?.length ?? 0) >= 2).length).toBeGreaterThan(4000)
    expect(blocks.every(block => block.text.trim().length > 0)).toBe(true)
    expect(blocks.every(block => block.text.length <= 600)).toBe(true)
    expect(blocks.every(block => !/<(?:script|iframe|style)\b/i.test(block.text))).toBe(true)

    expect(validation.status).toBe('passed')
    expect(validation.episodes).toEqual(expect.objectContaining({ total: 169, missing: [], empty: [] }))
    expect(validation.semantics.totalBlocks).toBe(blocks.length)
    expect(validation.semantics.largestBlockCharacters).toBe(largestBlock)
    expect(validation.semantics.largestBlockCharacters).toBeLessThanOrEqual(600)
    expect(validation.semantics.blocksOver600Characters).toEqual([])
  })

  test('starts episode one at the in-body book heading and preserves semantic verse lines', () => {
    const episodeOne = readWorkJson<ChapterPayload>('chapters/episode-001.json')
    const firstPage = episodeOne.pages[0]
    const firstText = firstPage.blocks.map(block => block.text).join(' ')
    const firstVerse = firstPage.blocks.find(block => block.type === 'verse')

    expect(episodeOne.startSourcePage).toBe(47)
    expect(episodeOne.pages[0].blocks[0]).toEqual(expect.objectContaining({
      type: 'invocation',
      text: 'Ik Onkar Satguru Prasad Sri Waheguru ji ki Fateh',
    }))
    expect(firstText).not.toContain('Now Sri Gur Panth Prakash Granth')
    expect(episodeOne.pages[0].blocks[1]).toEqual(expect.objectContaining({
      type: 'meter',
      text: 'Dohra:',
    }))
    expect(firstVerse).toEqual(expect.objectContaining({
      id: 'episode-001-p47-b003',
      number: '1',
      lines: expect.arrayContaining([
        'I bow my head in reverence at the lotus feet of Guru Nanak,',
      ]),
    }))
  })

  test('publishes lightweight catalog search separately from the 169-episode work index', () => {
    const catalogSearch = readLibraryJson<{
      works: Array<{ id: string }>
      chapters?: unknown[]
      metadata: { panthPrakash: { totalEpisodes: number; totalSourcePages: number; readablePages: number } }
    }>('search-index.json')
    const workSearch = readWorkJson<{
      chapters: Array<{ workId: string; chapterId: string; episodeNumber: number; path: string; searchText: string }>
    }>('search-index.json')

    expect(catalogSearch.works).toEqual([expect.objectContaining({ id: 'panth-prakash-english' })])
    expect(catalogSearch.chapters).toBeUndefined()
    expect(catalogSearch.metadata.panthPrakash).toEqual(expect.objectContaining({
      totalEpisodes: 169,
      totalSourcePages: 1413,
      readablePages: 637,
    }))
    expect(workSearch.chapters).toHaveLength(169)
    expect(workSearch.chapters[0]).toEqual(expect.objectContaining({
      chapterId: 'episode-001',
      path: '/library/panth-prakash-english/chapters/episode-001',
      searchText: expect.stringContaining('origin of the Khalsa'),
    }))
  })
})
