import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, expect, test } from 'vitest'
import {
  loadLibraryChapter,
  loadLibraryChapterIndex,
  loadLibraryManifest,
  loadLibraryPage,
  loadLibraryPageIndex,
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

test('loads the published library manifest and EPUB work catalog', async () => {
  const manifest = await loadLibraryManifest()
  const catalog = await loadLibraryWorkCatalog()
  const work = catalog.workById['panth-prakash-english']

  expect(manifest.searchIndexPath).toBe('/data/library/search-index.json')
  expect(work?.title).toMatch(/Panth Prakash/i)
  expect(work?.source).toBe('epub')
  expect(work?.chapterIndexPath).toBe('/data/library/works/panth-prakash-english/chapters.json')
  expect(work?.pageIndexPath).toBeUndefined()
})

test('loads a Panth Prakash chapter payload from the EPUB corpus', async () => {
  const chapters = await loadLibraryChapterIndex('panth-prakash-english')
  const chapter = await loadLibraryChapter('panth-prakash-english', 'episode-001-the-episode-about-the-origin-of-the-khalsa')

  expect(chapters).toHaveLength(171)
  expect(chapter).not.toBeNull()
  expect(chapter?.workId).toBe('panth-prakash-english')
  expect(chapter?.id).toBe('episode-001-the-episode-about-the-origin-of-the-khalsa')
  expect(chapter?.pages.length).toBeGreaterThan(0)
  expect(chapter?.pages[0]?.blocks.some(block => block.text.includes('lotus feet of Guru Nanak'))).toBe(true)
})

test('does not expose the retired Panth Prakash page index or page payloads', async () => {
  await expect(loadLibraryPageIndex('panth-prakash-english')).rejects.toThrow(/Unknown page-indexed library work/)
  await expect(loadLibraryPage('panth-prakash-english', 565)).resolves.toBeNull()
})

test('published Panth chapter index paths resolve to existing JSON files', () => {
  const chapters = readPublicLibraryJson<Array<{ path: string }>>('/data/library/works/panth-prakash-english/chapters.json')

  expect(chapters).toHaveLength(171)
  for (const chapter of chapters) {
    const filePath = path.join(PROJECT_ROOT, 'public', chapter.path.replace(/^\//, ''))
    expect(fs.existsSync(filePath)).toBe(true)
  }
})
