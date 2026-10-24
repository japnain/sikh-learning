import type { LibrarySearchChapterEntry, LibrarySearchIndex, LibraryTextBlock } from '../types'

export function normalizeLibraryQuery(query: string): string {
  return query.trim().replace(/\s+/gu, ' ').slice(0, 200)
}

export function buildLibrarySearchPath(workId: string, chapterId: string, query: string): string {
  const path = `/library/${encodeURIComponent(workId)}/chapters/${encodeURIComponent(chapterId)}`
  const normalized = normalizeLibraryQuery(query)
  return normalized ? `${path}?${new URLSearchParams({ find: normalized })}` : path
}

export interface LibraryChapterMatch extends LibrarySearchChapterEntry {
  matchCount: number
}

export function libraryMatchRanges(text: string, query: string): Array<{ start: number; end: number }> {
  const needle = normalizeLibraryQuery(query).toLowerCase()
  if (!needle) return []
  const haystack = text.toLowerCase()
  const matches: Array<{ start: number; end: number }> = []
  let from = 0
  while (from < haystack.length) {
    const start = haystack.indexOf(needle, from)
    if (start < 0) break
    matches.push({ start, end: start + needle.length })
    from = start + needle.length
  }
  return matches
}

/** Keep every matching chapter; the UI paginates without discarding results. */
export function findLibraryChapterMatches(index: LibrarySearchIndex, query: string, workId?: string): LibraryChapterMatch[] {
  return (index.chapters ?? []).flatMap(entry => {
    if (workId && entry.workId !== workId) return []
    const ranges = libraryMatchRanges(entry.searchText, query)
    if (!ranges.length) return []
    const first = ranges[0]
    return [{ ...entry, matchCount: ranges.length, snippet: entry.searchText.slice(Math.max(0, first.start - 80), first.end + 150).replace(/\s+/gu, ' ').trim() }]
  })
}

export function findLibraryBlockMatches(blocks: LibraryTextBlock[], query: string): Array<{ blockId: string; count: number }> {
  let offset = 0
  const spans = blocks.map(block => {
    const text = block.lines?.join(' ') || block.text
    const span = { blockId: block.id, text, start: offset, end: offset + text.length }
    offset = span.end + 1
    return span
  })
  const ranges = libraryMatchRanges(spans.map(span => span.text).join(' '), query)
  return spans.flatMap(span => {
    const count = ranges.filter(range => range.start < span.end && range.end > span.start).length
    return count ? [{ blockId: span.blockId, count }] : []
  })
}
