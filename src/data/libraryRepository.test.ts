import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, expect, test } from 'vitest'
import {
  loadLibraryChapter,
  loadLibraryChapterIndex,
  loadLibraryManifest,
  loadLibraryPage,
  loadLibraryPageIndex,
  loadLibrarySearchIndex,
  loadLibraryWorkCatalog,
  resetLibraryRepositoryCache,
} from './libraryRepository'

const PROJECT_ROOT = process.cwd()

function readPublicLibraryJson<T>(resourcePath: string) {
  const normalizedPath = resourcePath.startsWith('/')
    ? resourcePath.slice(1)
    : resourcePath
  const filePath = path.join(PROJECT_ROOT, 'public', normalizedPath)
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

beforeEach(() => {
  resetLibraryRepositoryCache()
})

test('loads the catalog as one EPUB work with two publications', async () => {
  const manifest = await loadLibraryManifest()
  const catalog = await loadLibraryWorkCatalog()
  const work = catalog.workById['panth-prakash-english']

  expect(manifest.searchIndexPath).toBe('/data/library/search-index.json')
  expect(work).toEqual(expect.objectContaining({
    title: expect.stringMatching(/Panth Prakash/i),
    source: 'epub',
    totalChapters: 169,
    readablePages: 637,
    chapterIndexPath: '/data/library/works/panth-prakash-english/chapters.json',
    searchIndexPath: '/data/library/works/panth-prakash-english/search-index.json',
  }))
  expect(work?.publications).toHaveLength(2)
  expect(work?.publications?.map(publication => publication.firstChapterId)).toEqual([
    'episode-001',
    'episode-082',
  ])
  expect(work?.pageIndexPath).toBeUndefined()
})

test('loads stable episode chapter payloads from the cleaned EPUB corpus', async () => {
  const chapters = await loadLibraryChapterIndex('panth-prakash-english')
  const chapter = await loadLibraryChapter('panth-prakash-english', 'episode-001')

  expect(chapters).toHaveLength(169)
  expect(chapters[0]?.id).toBe('episode-001')
  expect(chapters[168]?.id).toBe('episode-169')
  expect(chapter).toEqual(expect.objectContaining({
    workId: 'panth-prakash-english',
    id: 'episode-001',
    episodeNumber: 1,
    publicationId: 'volume-1',
  }))
  expect(chapter?.pages.length).toBeGreaterThan(0)
  expect(chapter?.pages[0]?.blocks.some(block => block.text.includes('lotus feet of Guru Nanak'))).toBe(true)
})

test('resolves retired episode slugs and front-matter aliases to stable episode IDs', async () => {
  const legacyEpisode = await loadLibraryChapter(
    'panth-prakash-english',
    'episode-001-the-episode-about-the-origin-of-the-khalsa'
  )
  const volumeOneFrontMatter = await loadLibraryChapter('panth-prakash-english', 'vol-1-front-matter')
  const volumeTwoFrontMatter = await loadLibraryChapter('panth-prakash-english', 'vol-2-front-matter')

  expect(legacyEpisode?.id).toBe('episode-001')
  expect(volumeOneFrontMatter?.id).toBe('episode-001')
  expect(volumeTwoFrontMatter?.id).toBe('episode-082')
})

test('loads full text from the work-specific index while the catalog index stays lightweight', async () => {
  const catalogSearch = await loadLibrarySearchIndex()
  const workSearch = await loadLibrarySearchIndex('panth-prakash-english')

  expect(catalogSearch.works).toHaveLength(1)
  expect(catalogSearch.chapters).toBeUndefined()
  expect(workSearch.chapters).toHaveLength(169)
  expect(workSearch.chapters?.[0]).toEqual(expect.objectContaining({
    workId: 'panth-prakash-english',
    chapterId: 'episode-001',
    episodeNumber: 1,
  }))
  expect(workSearch.chapters?.[0]?.searchText).toContain('origin of the Khalsa')
})

test('does not expose the retired Panth Prakash page index or page payloads', async () => {
  await expect(loadLibraryPageIndex('panth-prakash-english')).rejects.toThrow(/Unknown page-indexed library work/)
  await expect(loadLibraryPage('panth-prakash-english', 565)).resolves.toBeNull()
})

test('all stable chapter index paths resolve to existing JSON files', () => {
  const chapters = readPublicLibraryJson<Array<{ id: string; path: string }>>(
    '/data/library/works/panth-prakash-english/chapters.json'
  )

  expect(chapters).toHaveLength(169)
  expect(chapters.map(chapter => chapter.id)).toEqual(
    Array.from({ length: 169 }, (_value, index) => `episode-${String(index + 1).padStart(3, '0')}`)
  )
  for (const chapter of chapters) {
    const filePath = path.join(PROJECT_ROOT, 'public', chapter.path.replace(/^\//, ''))
    expect(fs.existsSync(filePath), chapter.id).toBe(true)
  }
})
