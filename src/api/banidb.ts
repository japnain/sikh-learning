import type { ScriptureEntry, Word } from '../types'

const BASE = 'https://api.banidb.com/v2'

type BaniSource = 'G' | 'D'

interface BaniVerse {
  verseId: number
  shabadId: number
  verse: { unicode: string }
  transliteration: { english: string }
  translation: { en: { bdb: string }; pu: { ss: { unicode: string } } }
  pageNo: number
}

interface BaniWord {
  word: { unicode: string }
  transliteration: { english: string }
  translation: { en: { bdb: string }; pu: { ss: { unicode: string } } }
}

interface BaniShabadVerse {
  words: BaniWord[]
}

function toScripture(source: BaniSource): string {
  return source === 'G' ? 'SGGS' : 'DG'
}

export async function fetchAng(ang: number, source: BaniSource): Promise<ScriptureEntry[]> {
  const res = await fetch(`${BASE}/angs/${ang}/${source}`)
  if (!res.ok) throw new Error(`BaniDB /angs error: ${res.status}`)
  const data: { page: BaniVerse[] } = await res.json()
  if (!data.page?.length) return []

  const grouped = new Map<number, BaniVerse[]>()
  for (const v of data.page) {
    const list = grouped.get(v.shabadId) ?? []
    list.push(v)
    grouped.set(v.shabadId, list)
  }

  const scripture = toScripture(source)
  return Array.from(grouped.entries()).map(([shabadId, verses]) => ({
    id: `${source}-${ang}-${shabadId}`,
    scripture,
    ang,
    gurmukhi: verses.map(v => v.verse.unicode).join(' '),
    transliteration: verses.map(v => v.transliteration.english).join(' '),
    translation_en: verses.map(v => v.translation.en.bdb).join(' '),
    translation_pa: verses.map(v => v.translation.pu.ss.unicode).join(' '),
    words: [],
  }))
}

export async function fetchShabadWords(shabadId: number): Promise<Word[]> {
  const res = await fetch(`${BASE}/shabads/${shabadId}`)
  if (!res.ok) throw new Error(`BaniDB /shabads error: ${res.status}`)
  const data: { verses: BaniShabadVerse[] } = await res.json()
  if (!data.verses?.length) return []

  const seen = new Set<string>()
  const words: Word[] = []
  for (const verse of data.verses) {
    for (const w of verse.words ?? []) {
      const key = w.word.unicode
      if (seen.has(key)) continue
      seen.add(key)
      words.push({
        gurmukhi: w.word.unicode,
        transliteration: w.transliteration.english,
        meaning_en: w.translation.en.bdb,
        meaning_pa: w.translation.pu.ss.unicode,
      })
    }
  }
  return words
}
