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
  source?: { id: BaniSource }
}

interface BaniWord {
  word: { unicode: string }
  transliteration: { english: string }
  translation: Record<string, Record<string, string | Record<string, string>>>
}

interface BaniShabadVerse {
  verseId?: number
  shabadId?: number
  verse?: { unicode: string }
  transliteration?: { english: string }
  translation?: Record<string, Record<string, string | Record<string, string>>>
  pageNo?: number
  words: BaniWord[]
}

interface BaniInfoResponse {
  ID: number
  gurmukhiUni: string
  transliterations?: {
    english?: string
    en?: string
  }
}

interface AmritKeertanHeaderResponse {
  HeaderID: number
  GurmukhiUni: string
  Transliterations?: {
    en?: string
    english?: string
  }
}

interface AmritKeertanIndexResponse {
  ShabadID: number
  GurmukhiUni: string
  Transliterations?: {
    en?: string
    english?: string
  }
  SourceEnglish?: string
  RaagEnglish?: string
  PageNo?: number
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

export interface BaniIndexItem {
  id: number
  gurmukhi: string
  transliteration: string
}

export interface AmritKeertanHeader {
  headerId: number
  gurmukhi: string
  transliteration: string
}

export interface AmritKeertanShabad {
  shabadId: number
  gurmukhi: string
  transliteration: string
  source: string
  raag: string
  pageNo: number
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

function getEnglishTransliteration(val: unknown): string {
  if (!val || typeof val !== 'object') return ''
  const record = val as Record<string, unknown>
  return safeText(record.english ?? record.en)
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
    source,
    shabadId,
    verseIds: verses.map(v => v.verseId),
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
      source: (srcId as BaniSource) ?? 'G',
      shabadId: verses[0]?.shabadId,
      verseIds: verses.map(v => v.verseId),
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

export async function fetchShabad(shabadId: number): Promise<ScriptureEntry | null> {
  const res = await fetch(`${BASE}/shabads/${shabadId}`)
  if (!res.ok) throw new Error(`BaniDB /shabads error: ${res.status}`)
  const data = await res.json() as {
    shabadInfo?: {
      shabadId?: number
      pageNo?: number
      source?: { sourceId?: BaniSource }
    }
    verses?: BaniShabadVerse[]
  }

  const verses = data.verses ?? []
  if (!verses.length) return null

  const source = data.shabadInfo?.source?.sourceId ?? 'G'
  const ang = data.shabadInfo?.pageNo ?? verses[0]?.pageNo ?? 1
  const resolvedShabadId = data.shabadInfo?.shabadId ?? shabadId

  if (verses.length === 1) {
    const verse = verses[0]
    return {
      id: `${source}-${ang}-${resolvedShabadId}-${verse.verseId ?? 0}`,
      scripture: toScripture(source),
      ang,
      source,
      shabadId: resolvedShabadId,
      verseIds: verse.verseId ? [verse.verseId] : [],
      gurmukhi: safeText(verse.verse?.unicode),
      transliteration: safeText(verse.transliteration?.english),
      translation_en: getEnglish(verse.translation),
      translation_hi: getHindi(verse.translation),
      translation_pa: getPunjabi(verse.translation),
      words: [],
    }
  }

  return {
    id: `${source}-${ang}-${resolvedShabadId}`,
    scripture: toScripture(source),
    ang,
    source,
    shabadId: resolvedShabadId,
    verseIds: verses.map(v => v.verseId ?? 0).filter(Boolean),
    gurmukhi: verses.map(v => safeText(v.verse?.unicode)).join(' '),
    transliteration: verses.map(v => safeText(v.transliteration?.english)).join(' '),
    translation_en: verses.map(v => getEnglish(v.translation)).join(' '),
    translation_hi: verses.map(v => getHindi(v.translation)).join(' '),
    translation_pa: verses.map(v => getPunjabi(v.translation)).join(' '),
    words: [],
  }
}

export async function fetchShabadVerses(shabadId: number): Promise<ScriptureEntry[]> {
  const res = await fetch(`${BASE}/shabads/${shabadId}`)
  if (!res.ok) throw new Error(`BaniDB /shabads error: ${res.status}`)
  const data = await res.json() as {
    shabadInfo?: {
      shabadId?: number
      pageNo?: number
      source?: { sourceId?: BaniSource }
    }
    verses?: BaniShabadVerse[]
  }

  const verses = data.verses ?? []
  if (!verses.length) return []

  const source = data.shabadInfo?.source?.sourceId ?? 'G'
  const fallbackAng = data.shabadInfo?.pageNo ?? verses[0]?.pageNo ?? 1
  const resolvedShabadId = data.shabadInfo?.shabadId ?? shabadId

  return verses.map(verse => ({
    id: `${source}-${verse.pageNo ?? fallbackAng}-${resolvedShabadId}-${verse.verseId ?? 0}`,
    scripture: toScripture(source),
    ang: verse.pageNo ?? fallbackAng,
    source,
    shabadId: resolvedShabadId,
    verseIds: verse.verseId ? [verse.verseId] : [],
    gurmukhi: safeText(verse.verse?.unicode),
    transliteration: safeText(verse.transliteration?.english),
    translation_en: getEnglish(verse.translation),
    translation_hi: getHindi(verse.translation),
    translation_pa: getPunjabi(verse.translation),
    words: [],
  }))
}

export async function fetchBanisIndex(): Promise<BaniIndexItem[]> {
  const res = await fetch(`${BASE}/banis`)
  if (!res.ok) throw new Error(`BaniDB /banis error: ${res.status}`)
  const data = await res.json() as BaniInfoResponse[]

  return data.map(item => ({
    id: item.ID,
    gurmukhi: item.gurmukhiUni,
    transliteration: getEnglishTransliteration(item.transliterations),
  }))
}

export async function fetchAmritKeertanIndex(): Promise<AmritKeertanHeader[]> {
  const res = await fetch(`${BASE}/amritkeertan`)
  if (!res.ok) throw new Error(`BaniDB /amritkeertan error: ${res.status}`)
  const data = await res.json() as { headers?: AmritKeertanHeaderResponse[] }

  return (data.headers ?? []).map(item => ({
    headerId: item.HeaderID,
    gurmukhi: item.GurmukhiUni,
    transliteration: getEnglishTransliteration(item.Transliterations),
  }))
}

export async function fetchAmritKeertanShabads(headerId: number): Promise<AmritKeertanShabad[]> {
  const res = await fetch(`${BASE}/amritkeertan/index/${headerId}`)
  if (!res.ok) throw new Error(`BaniDB /amritkeertan/index error: ${res.status}`)
  const data = await res.json() as { index?: AmritKeertanIndexResponse[] }

  return (data.index ?? []).map(item => ({
    shabadId: item.ShabadID,
    gurmukhi: item.GurmukhiUni,
    transliteration: getEnglishTransliteration(item.Transliterations),
    source: safeText(item.SourceEnglish),
    raag: safeText(item.RaagEnglish),
    pageNo: item.PageNo ?? 0,
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
