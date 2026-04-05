import type { ScriptureEntry, Word } from '../types'

const BASE = 'https://api.banidb.com/v2'

type BaniSource = 'G' | 'D' | 'B' | 'A'

interface BaniVerse {
  verseId: number
  shabadId: number
  verse: { unicode: string }
  transliteration: { english: string }
  translation: Record<string, Record<string, string | Record<string, string>>>
  pageNo: number
}

interface BaniWord {
  word: { unicode: string }
  transliteration: { english: string }
  translation: Record<string, Record<string, string | Record<string, string>>>
}

interface BaniShabadVerse {
  words: BaniWord[]
}

export interface HukamnamaResult {
  gurmukhi: string
  transliteration: string
  translation_en: string
  translation_hi: string
  translation_pa: string
  ang: number
  source: string
  shabadId: number
}

export interface SearchResult {
  shabadId: number
  verseId: number
  source: string
  pageNo: number
  gurmukhi: string
  transliteration: string
  translation_en: string
}

function toScripture(source: BaniSource): string {
  const map: Record<BaniSource, string> = {
    G: 'SGGS', D: 'DG', B: 'BGV', A: 'AK',
  }
  return map[source]
}

function safeText(val: unknown): string {
  if (typeof val === 'string') return val
  return ''
}

function getHindi(t: BaniVerse['translation'] | undefined): string {
  if (!t?.hi) return ''
  const hi = t.hi as Record<string, unknown>
  // BaniDB may return hi.ss as string or hi.ss.unicode as string
  if (typeof hi.ss === 'string') return hi.ss
  if (hi.ss && typeof (hi.ss as Record<string, string>).unicode === 'string') return (hi.ss as Record<string, string>).unicode
  return ''
}

function getEnglish(t: BaniVerse['translation'] | undefined): string {
  if (!t?.en) return ''
  const en = t.en as Record<string, string>
  return safeText(en.bdb)
}

function getPunjabi(t: BaniVerse['translation'] | undefined): string {
  if (!t?.pu) return ''
  const pu = t.pu as Record<string, unknown>
  if (typeof pu.ss === 'string') return pu.ss
  if (pu.ss && typeof (pu.ss as Record<string, string>).unicode === 'string') return (pu.ss as Record<string, string>).unicode
  return ''
}

export async function fetchAng(ang: number, source: BaniSource): Promise<ScriptureEntry[]> {
  const res = await fetch(`${BASE}/angs/${ang}/${source}`)
  if (!res.ok) throw new Error(`BaniDB /angs error: ${res.status}`)
  const data = await res.json() as Record<string, unknown>

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
    translation_en: verses.map(v => getEnglish(v.translation)).join(' '),
    translation_hi: verses.map(v => getHindi(v.translation)).join(' '),
    translation_pa: verses.map(v => getPunjabi(v.translation)).join(' '),
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
      const key = safeText(w.word?.unicode)
      if (!key || seen.has(key)) continue
      seen.add(key)
      words.push({
        gurmukhi: key,
        transliteration: safeText(w.transliteration?.english),
        meaning_en: getEnglish(w.translation),
        meaning_hi: getHindi(w.translation),
        meaning_pa: getPunjabi(w.translation),
      })
    }
  }
  return words
}

interface BaniFlatVerse {
  verseId: number
  shabadId: number
  verse: { unicode: string }
  transliteration: { english: string }
  translation: Record<string, Record<string, string | Record<string, string>>>
  pageNo: number
  source: { id: string }
}

export async function fetchBani(baniDbId: number): Promise<ScriptureEntry[]> {
  const res = await fetch(`${BASE}/banis/${baniDbId}`)
  if (!res.ok) throw new Error(`BaniDB /banis error: ${res.status}`)
  const data = await res.json() as Record<string, unknown>

  const rawArray = (data.verses ?? []) as Array<Record<string, unknown>>
  if (!rawArray.length) return []

  // BaniDB may return verses flat or nested inside a "verse" property
  const flatVerses: BaniFlatVerse[] = rawArray.map(item => {
    // If nested: { verse: { verseId, verse: {unicode}, ... }, ... }
    const inner = (item.verse as Record<string, unknown>) ?? item
    return {
      verseId: (inner.verseId ?? item.verseId ?? 0) as number,
      shabadId: (inner.shabadId ?? item.shabadId ?? 0) as number,
      verse: (inner.verse as { unicode: string }) ?? { unicode: '' },
      transliteration: (inner.transliteration as { english: string }) ?? { english: '' },
      translation: (inner.translation ?? {}) as BaniFlatVerse['translation'],
      pageNo: (inner.pageNo ?? item.pageNo ?? 0) as number,
      source: (inner.source as { id: string }) ?? { id: 'G' },
    }
  })

  const sourceMap: Record<string, string> = { G: 'SGGS', D: 'DG', B: 'BGV', A: 'AK' }

  // Group by pageNo so each card = one ang's worth of content
  const grouped = new Map<number, BaniFlatVerse[]>()
  for (const v of flatVerses) {
    const list = grouped.get(v.pageNo) ?? []
    list.push(v)
    grouped.set(v.pageNo, list)
  }

  return Array.from(grouped.entries()).map(([pageNo, verses]) => {
    const srcId = verses[0]?.source?.id ?? 'G'
    return {
      id: `bani-${baniDbId}-${pageNo}`,
      scripture: sourceMap[srcId] ?? 'SGGS',
      ang: pageNo,
      gurmukhi: verses.map(v => safeText(v.verse?.unicode)).join(' '),
      transliteration: verses.map(v => safeText(v.transliteration?.english)).join(' '),
      translation_en: verses.map(v => getEnglish(v.translation)).join(' '),
      translation_hi: verses.map(v => getHindi(v.translation)).join(' '),
      translation_pa: verses.map(v => getPunjabi(v.translation)).join(' '),
      words: [],
    }
  })
}

export async function fetchSearch(query: string, searchType: number = 1): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query)
  const res = await fetch(`${BASE}/search/${encoded}?searchtype=${searchType}&source=all`)
  if (!res.ok) throw new Error(`BaniDB /search error: ${res.status}`)
  const data = await res.json() as { verses?: BaniVerse[] }
  const verses = data.verses ?? []

  return verses.slice(0, 30).map(v => ({
    shabadId: v.shabadId,
    verseId: v.verseId,
    source: ((v as unknown as Record<string, unknown>).source as Record<string, string>)?.id ?? 'G',
    pageNo: v.pageNo,
    gurmukhi: safeText(v.verse?.unicode),
    transliteration: safeText(v.transliteration?.english),
    translation_en: getEnglish(v.translation),
  }))
}

export async function fetchAudio(shabadId: number): Promise<string | null> {
  try {
    // Try the shabad endpoint — it may include audio URLs in the response
    const res = await fetch(`${BASE}/shabads/${shabadId}`)
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>
    // Check various possible audio field locations
    const shabadInfo = data.shabadInfo as Record<string, unknown> | undefined
    if (shabadInfo?.audio) {
      const audio = shabadInfo.audio as Record<string, unknown>
      const url = audio.url ?? audio.fileUrl
      if (typeof url === 'string') return url
    }
    // Check top-level audio field
    if (data.audio) {
      if (typeof data.audio === 'string') return data.audio
      const audioArr = data.audio as Array<{ url?: string; fileUrl?: string }>
      return audioArr?.[0]?.url ?? audioArr?.[0]?.fileUrl ?? null
    }
    return null
  } catch {
    return null
  }
}

export async function fetchHukamnama(): Promise<HukamnamaResult> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  let res = await fetch(`${BASE}/hukamnamas/${year}/${month}/${day}`)
  if (!res.ok) res = await fetch(`${BASE}/hukamnamas`)
  if (!res.ok) throw new Error(`BaniDB /hukamnamas error: ${res.status}`)

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
    translation_en: allVerses.map(v => getEnglish(v.translation)).join(' '),
    translation_hi: allVerses.map(v => getHindi(v.translation)).join(' '),
    translation_pa: allVerses.map(v => getPunjabi(v.translation)).join(' '),
    ang,
    source: sourceId,
    shabadId,
  }
}
