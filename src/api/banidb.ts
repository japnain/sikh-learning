import type { ScriptureEntry, Word } from '../types'

const BASE = 'https://api.banidb.com/v2'

type BaniSource = 'G' | 'D' | 'B' | 'N' | 'A' | 'R'

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

export interface HukamnamaResult {
  gurmukhi: string
  transliteration: string
  translation_en: string
  translation_pa: string
  ang: number
  source: string
  shabadId: number
}

function toScripture(source: BaniSource): string {
  const map: Record<BaniSource, string> = {
    G: 'SGGS', D: 'DG', B: 'BGV', N: 'BNL', A: 'AK', R: 'PS',
  }
  return map[source]
}

function safeText(val: string | undefined | null): string {
  return val ?? ''
}

export async function fetchAng(ang: number, source: BaniSource): Promise<ScriptureEntry[]> {
  if (source === 'R') return []
  const res = await fetch(`${BASE}/angs/${ang}/${source}`)
  if (!res.ok) throw new Error(`BaniDB /angs error: ${res.status}`)
  const data = await res.json() as Record<string, unknown>

  // BaniDB returns verses under `page`; fall back to alternative keys if needed
  const rawPage = (data.page ?? data.verses ?? data.shabads) as BaniVerse[] | undefined
  if (!rawPage?.length) return []

  const grouped = new Map<number, BaniVerse[]>()
  for (const v of rawPage) {
    const list = grouped.get(v.shabadId) ?? []
    list.push(v)
    grouped.set(v.shabadId, list)
  }

  const scripture = toScripture(source)
  return Array.from(grouped.entries()).map(([shabadId, verses]) => ({
    id: `${source}-${ang}-${shabadId}`,
    scripture,
    ang,
    gurmukhi: verses.map(v => safeText(v.verse?.unicode)).join(' '),
    transliteration: verses.map(v => safeText(v.transliteration?.english)).join(' '),
    translation_en: verses.map(v => safeText(v.translation?.en?.bdb)).join(' '),
    translation_pa: verses.map(v => safeText(v.translation?.pu?.ss?.unicode)).join(' '),
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
      const key = w.word?.unicode
      if (!key || seen.has(key)) continue
      seen.add(key)
      words.push({
        gurmukhi: safeText(w.word?.unicode),
        transliteration: safeText(w.transliteration?.english),
        meaning_en: safeText(w.translation?.en?.bdb),
        meaning_pa: safeText(w.translation?.pu?.ss?.unicode),
      })
    }
  }
  return words
}

export async function fetchHukamnama(): Promise<HukamnamaResult> {
  // Try /today first, fall back to base hukamnama endpoint
  let res = await fetch(`${BASE}/hukamnama/today`)
  if (!res.ok) res = await fetch(`${BASE}/hukamnama`)
  if (!res.ok) throw new Error(`BaniDB /hukamnama error: ${res.status}`)

  const data = await res.json() as {
    hukamnamaInfo?: { ang?: number; source?: { id?: string } }
    shabads?: Array<{
      shabad?: {
        shabadInfo?: { shabadId?: number; ang?: { ang?: number } }
        verses?: BaniVerse[]
      }
    }>
  }

  const allShabads = data.shabads ?? []
  // ang can live at hukamnamaInfo.ang or inside the first shabad's shabadInfo
  const ang =
    data.hukamnamaInfo?.ang ??
    allShabads[0]?.shabad?.shabadInfo?.ang?.ang ??
    1
  const sourceId = data.hukamnamaInfo?.source?.id ?? 'G'
  const shabadId = allShabads[0]?.shabad?.shabadInfo?.shabadId ?? 0
  const allVerses = allShabads.flatMap(s => s.shabad?.verses ?? [])

  return {
    gurmukhi: allVerses.map(v => safeText(v.verse?.unicode)).join(' '),
    transliteration: allVerses.map(v => safeText(v.transliteration?.english)).join(' '),
    translation_en: allVerses.map(v => safeText(v.translation?.en?.bdb)).join(' '),
    translation_pa: allVerses.map(v => safeText(v.translation?.pu?.ss?.unicode)).join(' '),
    ang,
    source: sourceId,
    shabadId,
  }
}
