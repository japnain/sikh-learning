import type { MahanKoshEntry } from '../types'
import { buildMahanKoshUrl, normalizeLookupWord } from '../utils/wordLookup'

const BASE = 'https://backend.searchgurbani.com/api/res/mahan-kosh/view'

interface MahanKoshApiLine {
  ID: number
  srch: string
  translit: string
  word: string
  roman: string
  hindi: string
  description: string | null
  roman_desc: string | null
  hindi_desc: string | null
}

interface MahanKoshApiResponse {
  lines?: MahanKoshApiLine[]
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toEntry(line: MahanKoshApiLine, normalizedWord: string): MahanKoshEntry {
  const normalizedEntryWord = normalizeLookupWord(line.word)
  const normalizedSearchKey = normalizeLookupWord(line.srch)

  return {
    id: line.ID,
    word: safeText(line.word),
    searchKey: safeText(line.srch),
    transliteration: safeText(line.translit),
    roman: safeText(line.roman),
    hindi: safeText(line.hindi),
    description: safeText(line.description),
    description_hi: safeText(line.hindi_desc ?? line.roman_desc),
    exactMatch: normalizedEntryWord === normalizedWord || normalizedSearchKey === normalizedWord,
    sourceUrl: buildMahanKoshUrl(line.word),
  }
}

function compareEntries(a: MahanKoshEntry, b: MahanKoshEntry): number {
  if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1
  if (a.word.length !== b.word.length) return a.word.length - b.word.length
  return a.id - b.id
}

export async function fetchMahanKoshEntries(word: string): Promise<MahanKoshEntry[]> {
  const normalizedWord = normalizeLookupWord(word)
  if (!normalizedWord) return []

  const params = new URLSearchParams({
    keyword: normalizedWord,
    alpha: 'alpha',
    page: '0',
  })

  const response = await fetch(`${BASE}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Mahankosh lookup failed: ${response.status}`)
  }

  const data = await response.json() as MahanKoshApiResponse

  return (data.lines ?? [])
    .map(line => toEntry(line, normalizedWord))
    .filter(entry => Boolean(entry.word))
    .sort(compareEntries)
}
