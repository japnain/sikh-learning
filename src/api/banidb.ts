import type { EnglishTranslations, ScriptureEntry, ScriptureLine, SundarGutkaLength, Word } from '../types'
import {
  SUNDAR_GUTKA_LENGTH_EXISTS_KEY,
  SUNDAR_GUTKA_LENGTH_ORDER,
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  getSupportedSundarGutkaBaniIdByBaniDbId,
} from '../utils/sundarGutkaLength'

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
  raag?: { english?: string }
  writer?: { english?: string }
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

interface BaniResponseVerse {
  header?: number
  paragraph?: number
  mangalPosition?: 'above' | 'current' | null
  existsSGPC?: number
  existsMedium?: number
  existsTaksal?: number
  existsBuddhaDal?: number
  verse?: BaniShabadVerse & {
    verseId?: number
    shabadId?: number
    pageNo?: number | null
    source?: { id?: BaniSource }
  }
  pageNo?: number | null
  source?: { id?: BaniSource }
}

interface ShabadInfo {
  shabadId?: number
  pageNo?: number
  ang?: { ang?: number }
  source?: {
    sourceId?: BaniSource
    english?: string
  }
  raag?: {
    english?: string
  }
  writer?: {
    english?: string
  }
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
  date: string
  entry: ScriptureEntry
  ang: number
  source: BaniSource
  shabadId: number
}

export interface SearchResult {
  shabadId: number
  verseId: number
  source: string
  pageNo: number | null
  sourceName: string
  gurmukhi: string
  transliteration: string
  translation_en: string
  raag: string
  writer: string
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

export interface BaniFetchResult {
  entries: ScriptureEntry[]
  availableLengths: SundarGutkaLength[]
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

function getEnglishTranslations(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): EnglishTranslations {
  if (!t?.en) return {}
  const en = t.en as Record<string, unknown>
  return {
    bdb: safeText(en.bdb),
    ms: safeText(en.ms),
    ssk: safeText(en.ssk),
  }
}

function getHindi(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): string {
  if (!t?.hi) return ''
  const hi = t.hi as Record<string, unknown>
  // BaniDB may return hi.ss as string or hi.ss.unicode as string
  if (typeof hi.ss === 'string') return hi.ss
  if (hi.ss && typeof (hi.ss as Record<string, string>).unicode === 'string') return (hi.ss as Record<string, string>).unicode
  return ''
}

function getEnglish(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): string {
  return getEnglishTranslations(t).bdb ?? ''
}

function getPunjabi(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): string {
  if (!t?.pu) return ''
  const pu = t.pu as Record<string, unknown>
  if (typeof pu.ss === 'string') return pu.ss
  if (pu.ss && typeof (pu.ss as Record<string, string>).unicode === 'string') return (pu.ss as Record<string, string>).unicode
  return ''
}

function buildLine(
  verse: BaniVerse | BaniFlatVerse | BaniShabadVerse,
  fallbackAng: number,
  fallbackShabadId: number
): ScriptureLine {
  const originalAng = 'originalPageNo' in verse ? verse.originalPageNo ?? null : verse.pageNo ?? null
  const ang = originalAng ?? fallbackAng
  const verseId = verse.verseId ?? 0
  const shabadId = verse.shabadId ?? fallbackShabadId
  const translations_en = getEnglishTranslations(verse.translation)

  return {
    verseId,
    shabadId,
    ang,
    originalAng,
    isHeader: 'isHeader' in verse ? Boolean(verse.isHeader) : originalAng === null,
    gurmukhi: safeText(verse.verse?.unicode),
    transliteration: safeText(verse.transliteration?.english),
    translation_en: translations_en.bdb ?? '',
    translations_en,
    translation_hi: getHindi(verse.translation),
    translation_pa: getPunjabi(verse.translation),
  }
}

function buildEntry({
  id,
  scripture,
  ang,
  source,
  shabadId,
  verses,
  sourceName,
  raag,
  writer,
  hukamnamaDate,
}: {
  id: string
  scripture: string
  ang: number
  source: BaniSource
  shabadId?: number
  verses: Array<BaniVerse | BaniFlatVerse | BaniShabadVerse>
  sourceName?: string
  raag?: string
  writer?: string
  hukamnamaDate?: string
}): ScriptureEntry {
  const resolvedAng = verses.find(verse => verse.pageNo !== null && verse.pageNo !== undefined)?.pageNo ?? ang
  const lines = verses.map(verse => buildLine(verse, resolvedAng, shabadId ?? verse.shabadId ?? 0))

  return {
    id,
    scripture,
    ang: resolvedAng,
    source,
    shabadId,
    verseIds: lines.map(line => line.verseId).filter(Boolean),
    sourceName,
    raag,
    writer,
    hukamnamaDate,
    lines,
    gurmukhi: lines.map(line => line.gurmukhi).join(' '),
    transliteration: lines.map(line => line.transliteration).join(' '),
    translation_en: lines.map(line => line.translation_en).join(' '),
    translation_hi: lines.map(line => line.translation_hi).join(' '),
    translation_pa: lines.map(line => line.translation_pa).join(' '),
    words: [],
  }
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
  return Array.from(grouped.entries()).map(([shabadId, verses]) =>
    buildEntry({
      id: `${source}-${ang}-${shabadId}`,
      scripture,
      ang,
      source,
      shabadId,
      verses,
      sourceName: verses[0]?.source?.id ? toScripture(verses[0].source.id) : scripture,
      raag: safeText(verses[0]?.raag?.english),
      writer: safeText(verses[0]?.writer?.english),
    })
  )
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
  pageNo: number | null
  originalPageNo?: number | null
  source: { id: string }
  isHeader?: boolean
}

function getAvailableSundarGutkaLengths(rawArray: BaniResponseVerse[]): SundarGutkaLength[] {
  return SUNDAR_GUTKA_LENGTH_ORDER.filter(length =>
    rawArray.some(item => {
      const flag = item[SUNDAR_GUTKA_LENGTH_EXISTS_KEY[length] as keyof BaniResponseVerse]
      return Boolean(flag)
    })
  )
}

export async function fetchBani(
  baniDbId: number,
  sgLength?: SundarGutkaLength | null
): Promise<BaniFetchResult> {
  const res = await fetch(`${BASE}/banis/${baniDbId}`)
  if (!res.ok) throw new Error(`BaniDB /banis error: ${res.status}`)
  const data = await res.json() as Record<string, unknown>

  const rawArray = (data.verses ?? []) as BaniResponseVerse[]
  if (!rawArray.length) {
    return {
      entries: [],
      availableLengths: [],
    }
  }

  const supportedBaniId = getSupportedSundarGutkaBaniIdByBaniDbId(baniDbId)
  const availableLengths = supportedBaniId
    ? getAvailableSundarGutkaLengths(rawArray)
    : []
  const selectedLength = supportedBaniId
    ? (sgLength ?? SUNDAR_GUTKA_SUPPORTED_BANIS[supportedBaniId].defaultLength)
    : null

  const filteredRawArray = supportedBaniId && selectedLength
    ? rawArray.filter(item => {
        if (item.mangalPosition === 'above') return false
        const flag = item[SUNDAR_GUTKA_LENGTH_EXISTS_KEY[selectedLength] as keyof BaniResponseVerse]
        const hasLengthFlags =
          typeof item.existsSGPC !== 'undefined'
          || typeof item.existsMedium !== 'undefined'
          || typeof item.existsTaksal !== 'undefined'
          || typeof item.existsBuddhaDal !== 'undefined'

        if (!hasLengthFlags) return true
        return Boolean(flag)
      })
    : rawArray

  const flatVerses: BaniFlatVerse[] = []
  const pendingHeaderLines: BaniFlatVerse[] = []
  let currentPageNo: number | null = null

  for (const item of filteredRawArray) {
    const nestedVerse = item.verse && typeof item.verse === 'object' && (
      'verseId' in item.verse || 'shabadId' in item.verse || 'translation' in item.verse || 'transliteration' in item.verse
    ) ? item.verse : null
    const inner = (nestedVerse ?? item) as BaniShabadVerse & {
      verseId?: number
      shabadId?: number
      pageNo?: number | null
      source?: { id?: string }
    }
    const pageNo = inner.pageNo ?? item.pageNo ?? null
    const flatVerse: BaniFlatVerse = {
      verseId: inner.verseId ?? 0,
      shabadId: inner.shabadId ?? 0,
      verse: inner.verse ?? { unicode: '' },
      transliteration: inner.transliteration ?? { english: '' },
      translation: (inner.translation ?? {}) as BaniFlatVerse['translation'],
      pageNo,
      originalPageNo: pageNo,
      source: (inner.source ?? item.source ?? { id: 'G' }) as { id: string },
      isHeader: Boolean(item.header) || pageNo === null,
    }

    if (pageNo === null && currentPageNo === null) {
      pendingHeaderLines.push(flatVerse)
      continue
    }

    if (pageNo !== null) {
      currentPageNo = pageNo
      if (pendingHeaderLines.length > 0) {
        flatVerses.push(
          ...pendingHeaderLines.map(headerLine => ({
            ...headerLine,
            pageNo,
          }))
        )
        pendingHeaderLines.length = 0
      }
    }

    flatVerses.push({
      ...flatVerse,
      pageNo: pageNo ?? currentPageNo,
    })
  }

  const sourceMap: Record<string, string> = { G: 'SGGS', D: 'DG', B: 'BGV', A: 'AK' }

  // Group by page + shabad so the reader can render one section per shabad.
  const grouped = new Map<string, BaniFlatVerse[]>()
  for (const v of flatVerses) {
    const key = `${v.pageNo ?? currentPageNo ?? 1}-${v.shabadId}`
    const list = grouped.get(key) ?? []
    list.push(v)
    grouped.set(key, list)
  }

  return {
    entries: Array.from(grouped.entries()).map(([key, verses]) => {
      const [pageNoString] = key.split('-')
      const pageNo = Number(pageNoString)
      const srcId = verses[0]?.source?.id ?? 'G'
      return buildEntry({
        id: `bani-${baniDbId}-${pageNo}-${verses[0]?.shabadId ?? 0}`,
        scripture: sourceMap[srcId] ?? 'SGGS',
        ang: pageNo,
        source: (srcId as BaniSource) ?? 'G',
        shabadId: verses[0]?.shabadId,
        verses,
        sourceName: sourceMap[srcId] ?? 'SGGS',
      })
    }),
    availableLengths,
  }
}

export async function fetchSearch(
  query: string,
  searchType: number = 0,
  source: BaniSource | 'all' = 'all'
): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query)
  const res = await fetch(`${BASE}/search/${encoded}?searchtype=${searchType}&source=${source}`)
  if (!res.ok) throw new Error(`BaniDB /search error: ${res.status}`)
  const data = await res.json() as { verses?: BaniVerse[] }
  const verses = data.verses ?? []

  return verses.slice(0, 30).map(v => ({
    shabadId: v.shabadId,
    verseId: v.verseId,
    source: ((v as unknown as Record<string, unknown>).source as Record<string, string>)?.id ?? 'G',
    pageNo: v.pageNo ?? null,
    sourceName: safeText(((v.source as { english?: string } | undefined)?.english)) || (v.source?.id ? toScripture(v.source.id) : ''),
    gurmukhi: safeText(v.verse?.unicode),
    transliteration: safeText(v.transliteration?.english),
    translation_en: getEnglish(v.translation),
    raag: safeText(v.raag?.english),
    writer: safeText(v.writer?.english),
  }))
}

export async function fetchShabad(shabadId: number): Promise<ScriptureEntry | null> {
  const res = await fetch(`${BASE}/shabads/${shabadId}`)
  if (!res.ok) throw new Error(`BaniDB /shabads error: ${res.status}`)
  const data = await res.json() as { shabadInfo?: ShabadInfo; verses?: BaniShabadVerse[] }

  const verses = data.verses ?? []
  if (!verses.length) return null

  const source = data.shabadInfo?.source?.sourceId ?? 'G'
  const ang = data.shabadInfo?.pageNo ?? verses[0]?.pageNo ?? 1
  const resolvedShabadId = data.shabadInfo?.shabadId ?? shabadId

  const id = verses.length === 1
    ? `${source}-${ang}-${resolvedShabadId}-${verses[0]?.verseId ?? 0}`
    : `${source}-${ang}-${resolvedShabadId}`

  return buildEntry({
    id,
    scripture: toScripture(source),
    ang,
    source,
    shabadId: resolvedShabadId,
    verses,
    sourceName: safeText(data.shabadInfo?.source?.english) || toScripture(source),
    raag: safeText(data.shabadInfo?.raag?.english),
    writer: safeText(data.shabadInfo?.writer?.english),
  })
}

export async function fetchShabadVerses(shabadId: number): Promise<ScriptureEntry[]> {
  const res = await fetch(`${BASE}/shabads/${shabadId}`)
  if (!res.ok) throw new Error(`BaniDB /shabads error: ${res.status}`)
  const data = await res.json() as { shabadInfo?: ShabadInfo; verses?: BaniShabadVerse[] }

  const verses = data.verses ?? []
  if (!verses.length) return []

  const source = data.shabadInfo?.source?.sourceId ?? 'G'
  const fallbackAng = data.shabadInfo?.pageNo ?? verses[0]?.pageNo ?? 1
  const resolvedShabadId = data.shabadInfo?.shabadId ?? shabadId

  return verses.map(verse =>
    buildEntry({
      id: `${source}-${verse.pageNo ?? fallbackAng}-${resolvedShabadId}-${verse.verseId ?? 0}`,
      scripture: toScripture(source),
      ang: verse.pageNo ?? fallbackAng,
      source,
      shabadId: resolvedShabadId,
      verses: [verse],
      sourceName: safeText(data.shabadInfo?.source?.english) || toScripture(source),
      raag: safeText(data.shabadInfo?.raag?.english),
      writer: safeText(data.shabadInfo?.writer?.english),
    })
  )
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

export async function fetchHukamnama(date?: string): Promise<HukamnamaResult> {
  const targetDate = date ? new Date(`${date}T00:00:00`) : new Date()
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')

  let res = await fetch(`${BASE}/hukamnamas/${year}/${month}/${day}`)
  if (!res.ok) res = await fetch(`${BASE}/hukamnamas`)
  if (!res.ok) throw new Error(`BaniDB /hukamnamas error: ${res.status}`)

  const data = await res.json() as {
    isLatest?: boolean
    date?: { gregorian?: { year?: number; month?: number; date?: number } }
    hukamnamaInfo?: { ang?: number; source?: { id?: BaniSource } }
    shabads?: Array<{
      shabadInfo?: ShabadInfo
      verses?: BaniVerse[]
      shabad?: {
        shabadInfo?: ShabadInfo & { ang?: { ang?: number } }
        verses?: BaniVerse[]
      }
    }>
  }

  const allShabads = data.shabads ?? []
  const firstShabad = allShabads[0]
  const shabadInfo = firstShabad?.shabadInfo ?? firstShabad?.shabad?.shabadInfo
  const allVerses = allShabads.flatMap(s => s.verses ?? s.shabad?.verses ?? [])
  const ang = data.hukamnamaInfo?.ang ?? shabadInfo?.pageNo ?? shabadInfo?.ang?.ang ?? 1
  const sourceId = data.hukamnamaInfo?.source?.id ?? shabadInfo?.source?.sourceId ?? 'G'
  const shabadId = shabadInfo?.shabadId ?? 0
  const dateString = [
    data.date?.gregorian?.year ?? year,
    String(data.date?.gregorian?.month ?? month).padStart(2, '0'),
    String(data.date?.gregorian?.date ?? day).padStart(2, '0'),
  ].join('-')

  const entry = buildEntry({
    id: `hukamnama-${dateString}-${sourceId}-${shabadId}`,
    scripture: toScripture(sourceId),
    ang,
    source: sourceId,
    shabadId,
    verses: allVerses,
    sourceName: safeText(shabadInfo?.source?.english) || toScripture(sourceId),
    raag: safeText(shabadInfo?.raag?.english),
    writer: safeText(shabadInfo?.writer?.english),
    hukamnamaDate: dateString,
  })

  return { date: dateString, entry, ang, source: sourceId, shabadId }
}
