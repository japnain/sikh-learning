import { expect, test } from 'vitest'
import { buildLibrarySearchPath, findLibraryBlockMatches, findLibraryChapterMatches } from './librarySearch'
import type { LibrarySearchIndex, LibraryTextBlock } from '../types'

test('all matching chapters and occurrence counts are retained beyond the first page', () => {
  const index: LibrarySearchIndex = { works: [], chapters: Array.from({ length: 25 }, (_, i) => ({
    workId: 'book', chapterId: `chapter-${i}`, chapterNumber: i + 1, kind: 'episode', title: `Chapter ${i + 1}`,
    volume: 1, startSourcePage: 1, endSourcePage: 2, pageCount: 2, path: '', snippet: '', searchText: 'The Khalsa. The Khalsa returns.',
  })) }
  const matches = findLibraryChapterMatches(index, 'Khalsa', 'book')
  expect(matches).toHaveLength(25)
  expect(matches.every(match => match.matchCount === 2)).toBe(true)
  expect(findLibraryChapterMatches(index, 'absent')).toEqual([])
})

test('result URLs preserve a safely encoded query and reader matches use stable block identities', () => {
  expect(buildLibrarySearchPath('book', 'episode-001', ' Guru & disciple ')).toBe('/library/book/chapters/episode-001?find=Guru+%26+disciple')
  const blocks: LibraryTextBlock[] = [{ id: 'first', type: 'paragraph', text: 'Beginning' }, { id: 'second', type: 'verse', text: '', lines: ['The Guru', 'and the disciple.'] }]
  expect(findLibraryBlockMatches(blocks, 'guru and')).toEqual([{ blockId: 'second', count: 1 }])
  expect(findLibraryBlockMatches(blocks, 'Beginning The Guru')).toEqual([{ blockId: 'first', count: 1 }, { blockId: 'second', count: 1 }])
})
