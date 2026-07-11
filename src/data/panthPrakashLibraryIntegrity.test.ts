import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, test } from 'vitest'

interface WorkManifest {
  id: string
  totalChapters: number
  totalSourcePages: number
  chapterIndexPath: string
  chapterPathTemplate: string
}

interface ChapterIndexEntry {
  id: string
  chapterNumber: number
  episodeNumber?: number
  kind: 'front-matter' | 'episode' | 'back-matter'
  title: string
  volume: number
  startSourcePage: number
  endSourcePage: number
  pageCount: number
  path: string
}

interface ChapterPayload extends ChapterIndexEntry {
  workId: string
  pages: Array<{
    sourcePageNumber: number
    fileName: string
    blocks: Array<{ id: string; text: string; type: string }>
  }>
}

const PROJECT_ROOT = process.cwd()
const LIBRARY_ROOT = path.join(PROJECT_ROOT, 'public/data/library')
const WORK_ROOT = path.join(LIBRARY_ROOT, 'works/panth-prakash-english')

function readWorkJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(WORK_ROOT, relativePath), 'utf8')) as T
}

function readLibraryJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(LIBRARY_ROOT, relativePath), 'utf8')) as T
}

describe('Panth Prakash EPUB library integrity', () => {
  test('ships a chapter-indexed work manifest instead of the retired page corpus', () => {
    const work = readWorkJson<WorkManifest>('work.json')
    const chapters = readWorkJson<ChapterIndexEntry[]>('chapters.json')

    expect(work.id).toBe('panth-prakash-english')
    expect(work.totalChapters).toBe(171)
    expect(work.totalSourcePages).toBe(1413)
    expect(work.chapterIndexPath).toBe('/data/library/works/panth-prakash-english/chapters.json')
    expect(work.chapterPathTemplate).toBe('/data/library/works/panth-prakash-english/chapters/:chapterId.json')
    expect(fs.existsSync(path.join(WORK_ROOT, 'pages.json'))).toBe(false)
    expect(fs.existsSync(path.join(WORK_ROOT, 'episodes.json'))).toBe(false)
    expect(fs.existsSync(path.join(WORK_ROOT, 'pages'))).toBe(false)
    expect(chapters).toHaveLength(work.totalChapters)
  })

  test('keeps chapter files present, ordered, and non-empty', () => {
    const chapters = readWorkJson<ChapterIndexEntry[]>('chapters.json')

    expect(chapters.map(chapter => chapter.chapterNumber)).toEqual(
      Array.from({ length: chapters.length }, (_value, index) => index + 1)
    )
    expect(chapters.filter(chapter => chapter.kind === 'front-matter')).toHaveLength(2)
    expect(chapters.filter(chapter => chapter.kind === 'episode')).toHaveLength(169)

    for (const chapter of chapters) {
      const filePath = path.join(PROJECT_ROOT, 'public', chapter.path.replace(/^\//, ''))
      expect(fs.existsSync(filePath), chapter.id).toBe(true)
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ChapterPayload
      expect(payload.id).toBe(chapter.id)
      expect(payload.pages.length, chapter.id).toBe(chapter.pageCount)
      expect(payload.pages.length, chapter.id).toBeGreaterThan(0)
      expect(payload.pages.some(page => page.blocks.some(block => block.text.trim().length > 0)), chapter.id).toBe(true)
    }
  })

  test('starts episode one from the EPUB page that contains the book heading', () => {
    const episodeOne = readWorkJson<ChapterPayload>('chapters/episode-001-the-episode-about-the-origin-of-the-khalsa.json')
    const firstText = episodeOne.pages[0].blocks.map(block => block.text).join(' ')

    expect(episodeOne.startSourcePage).toBe(47)
    expect(firstText).toContain('Now Sri Gur Panth Prakash Granth')
    expect(firstText).toContain('I bow my head in reverence at the lotus feet of Guru Nanak')
  })

  test('publishes chapter search metadata and validation status', () => {
    const searchIndex = readLibraryJson<{
      chapters: Array<{ chapterId: string; searchText: string; episodeNumber?: number }>
      metadata: { panthPrakash: { source: string; totalChapters: number; totalEpisodes: number; totalSourcePages: number } }
    }>('search-index.json')
    const validation = readWorkJson<{
      status: string
      chapters: { total: number; empty: string[] }
      fullText: Array<{ volume: number; provided: boolean; leadingSampleTokenCoverage: number }>
    }>('validation.json')

    expect(searchIndex.chapters).toHaveLength(171)
    expect(searchIndex.metadata.panthPrakash).toEqual(expect.objectContaining({
      source: 'epub',
      totalChapters: 171,
      totalEpisodes: 169,
      totalSourcePages: 1413,
    }))
    expect(searchIndex.chapters.find(chapter => chapter.episodeNumber === 1)?.searchText).toContain('origin of the Khalsa')
    expect(validation.status).toBe('validated')
    expect(validation.chapters.empty).toEqual([])
    expect(validation.fullText).toHaveLength(2)
    expect(validation.fullText.every(entry => entry.provided)).toBe(true)
    expect(validation.fullText.every(entry => entry.leadingSampleTokenCoverage >= 99)).toBe(true)
  })
})
