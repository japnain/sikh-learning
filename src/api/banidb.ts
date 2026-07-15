import type {
  BanidbKoshDefinition,
  BanidbKoshWord,
  EnglishTranslations,
  HindiTranslations,
  PunjabiTranslations,
  RehatChapterContent,
  RehatChapterSummary,
  RehatSummary,
  ScriptureEntry,
  ScriptureLine,
  ScriptureRaagMeta,
  ScriptureSourceMeta,
  ScriptureVisraamMarker,
  ScriptureVisraamSets,
  ScriptureWriterMeta,
  SundarGutkaLength,
  VisraamSource,
  Word,
} from '../types'
import { requestBanidb } from '../supabase/banidb'
import { withQaControl } from '../qa/runtime'
import {
  SUNDAR_GUTKA_LENGTH_EXISTS_KEY,
  SUNDAR_GUTKA_LENGTH_ORDER,
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  getSupportedSundarGutkaBaniIdByBaniDbId,
  type SundarGutkaRawLength,
} from '../utils/sundarGutkaLength'

const API_PREFIX = '/v2'

type BaniSource = 'G' | 'D' | 'B' | 'A'
type SearchSource = BaniSource | 'R' | 'all'

interface BaniVerse {
  verseId: number
  shabadId: number
  verse: { gurmukhi?: string; unicode?: string }
  larivaar?: { gurmukhi?: string; unicode?: string }
  transliteration: {
    english?: string
    en?: string
    hindi?: string
    hi?: string
  }
  translation: Record<string, Record<string, string | Record<string, string>>>
  visraam?: Partial<Record<VisraamSource, Array<{ p?: number; t?: string }>>>
  pageNo: number
  source?: {
    id?: BaniSource
    sourceId?: BaniSource
    gurmukhi?: string
    unicode?: string
    english?: string
    pageNo?: number | null
  }
  raag?: {
    raagId?: number | null
    gurmukhi?: string
    unicode?: string
    english?: string
    raagWithPage?: string
  }
  writer?: {
    writerId?: number | null
    gurmukhi?: string
    unicode?: string
    english?: string
  }
}

interface BaniWord {
  word: { unicode: string }
  transliteration: {
    english?: string
    en?: string
  }
  translation: Record<string, Record<string, string | Record<string, string>>>
}

interface BaniShabadVerse {
  verseId?: number
  shabadId?: number
  verse?: { gurmukhi?: string; unicode?: string }
  larivaar?: { gurmukhi?: string; unicode?: string }
  transliteration?: {
    english?: string
    en?: string
    hindi?: string
    hi?: string
  }
  translation?: Record<string, Record<string, string | Record<string, string>>>
  visraam?: Partial<Record<VisraamSource, Array<{ p?: number; t?: string }>>>
  pageNo?: number
  source?: {
    id?: BaniSource
    sourceId?: BaniSource
    gurmukhi?: string
    unicode?: string
    english?: string
    pageNo?: number | null
  }
  raag?: {
    raagId?: number | null
    gurmukhi?: string
    unicode?: string
    english?: string
    raagWithPage?: string
  }
  writer?: {
    writerId?: number | null
    gurmukhi?: string
    unicode?: string
    english?: string
  }
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
    raag?: ShabadInfo['raag']
    writer?: ShabadInfo['writer']
  }
  pageNo?: number | null
  source?: { id?: BaniSource }
  raag?: ShabadInfo['raag']
  writer?: ShabadInfo['writer']
}

interface ShabadInfo {
  shabadId?: number
  pageNo?: number
  ang?: { ang?: number }
  source?: {
    sourceId?: BaniSource
    gurmukhi?: string
    unicode?: string
    english?: string
    pageNo?: number | null
  }
  raag?: {
    raagId?: number | null
    gurmukhi?: string
    unicode?: string
    english?: string
    raagWithPage?: string
  }
  writer?: {
    writerId?: number | null
    gurmukhi?: string
    unicode?: string
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
  IndexID?: number
  HeaderID?: number
  ShabadID: number
  GurmukhiUni: string
  Transliterations?: {
    en?: string
    english?: string
  }
  Translations?: Record<string, Record<string, string | Record<string, string>>>
  Ang?: number
  LineNo?: number
  SourceEnglish?: string
  SourceID?: string
  SourceGurmukhi?: string
  SourceUnicode?: string
  RaagEnglish?: string
  RaagGurmukhi?: string
  RaagUnicode?: string
  RaagWithPage?: string
  RaagID?: number
  WriterID?: number
  WriterEnglish?: string
  WriterGurmukhi?: string
  WriterUnicode?: string
  PageNo?: number
}

interface BanidbKoshWordResponse {
  id: number
  word: string
  wordUni: string
}

interface BanidbKoshDefinitionResponse extends BanidbKoshWordResponse {
  definition: string
  definitionUni: string
}

interface RehatSummaryResponse {
  rehatID: number
  rehatName: string
  alphabet: string
}

interface RehatChapterResponse {
  chapterID: number
  chapterName: string
  chapterContent?: string
  alphabet: string
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
  sourceMeta?: ScriptureSourceMeta | null
  gurmukhi: string
  larivaar?: string
  transliteration: string
  translation_en: string
  raag: string
  raagMeta?: ScriptureRaagMeta | null
  writer: string
  writerMeta?: ScriptureWriterMeta | null
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
  indexId: number
  headerId: number
  shabadId: number
  gurmukhi: string
  transliteration: string
  translationEn: string
  source: string
  sourceMeta?: ScriptureSourceMeta | null
  sourceAng: number | null
  raag: string
  raagMeta?: ScriptureRaagMeta | null
  writer: string
  writerMeta?: ScriptureWriterMeta | null
  lineNo: number | null
  amritPageNo: number
  pageNo: number
}

export interface BaniFetchResult {
  entries: ScriptureEntry[]
  availableLengths: SundarGutkaLength[]
  resolvedLength: SundarGutkaLength | null
}

function toScripture(source: BaniSource): string {
  const map: Record<BaniSource, string> = {
    G: 'SGGS', D: 'DG', B: 'BGV', A: 'AK',
  }
  return map[source]
}

function safeText(val: unknown): string {
  if (typeof val === 'string') {
    return val
      .replace(/<[^>]*>/g, '')
      .replace(/<\/?[^>]*$/g, '')
      .trim()
  }
  return ''
}

function safeNestedText(val: unknown): string {
  if (typeof val === 'string') return val
  if (!val || typeof val !== 'object') return ''

  const record = val as Record<string, unknown>
  return safeText(record.unicode ?? record.gurmukhi ?? record.english ?? record.en ?? record.hi)
}

function getEnglishTransliteration(val: unknown): string {
  if (!val || typeof val !== 'object') return ''
  const record = val as Record<string, unknown>
  return safeText(record.english ?? record.en)
}

function getVerseText(value: unknown): string {
  return safeNestedText(value)
}

function normalizeTranslationSourceMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}

  const next: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const text = safeNestedText(entry)
    if (text) next[key] = text
  }
  return next
}

function pickPreferredTranslation(
  map: Record<string, string>,
  preferredKeys: string[]
): string {
  for (const key of preferredKeys) {
    if (map[key]) return map[key]
  }

  return Object.values(map)[0] ?? ''
}

function getEnglishTranslations(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): EnglishTranslations {
  const en = normalizeTranslationSourceMap(t?.en)
  return {
    bdb: en.bdb,
    ms: en.ms,
    ssk: en.ssk,
  }
}

function getHindiTranslations(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): HindiTranslations {
  return normalizeTranslationSourceMap(t?.hi)
}

function getHindi(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): string {
  return pickPreferredTranslation(getHindiTranslations(t), ['ss', 'sts'])
}

function getEnglish(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): string {
  return getEnglishTranslations(t).bdb ?? ''
}

function getPunjabiTranslations(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): PunjabiTranslations {
  return normalizeTranslationSourceMap(t?.pu)
}

function getPunjabi(t: BaniVerse['translation'] | BaniShabadVerse['translation'] | undefined): string {
  return pickPreferredTranslation(getPunjabiTranslations(t), ['ss', 'ft', 'bdb', 'ms', 'pss'])
}

function normalizeVisraam(val: unknown): ScriptureVisraamSets {
  if (!val || typeof val !== 'object') return {}

  const next: ScriptureVisraamSets = {}
  for (const key of ['sttm', 'igurbani', 'sttm2'] as VisraamSource[]) {
    const rawMarkers = (val as Record<string, unknown>)[key]
    if (!Array.isArray(rawMarkers)) continue

    const markers = rawMarkers
      .map((marker): ScriptureVisraamMarker | null => {
        if (!marker || typeof marker !== 'object') return null
        const record = marker as Record<string, unknown>
        const p = typeof record.p === 'number' ? record.p : Number(record.p)
        const t = safeText(record.t)

        if (!Number.isFinite(p) || !t) return null
        return { p, t }
      })
      .filter((marker): marker is ScriptureVisraamMarker => Boolean(marker))

    if (markers.length > 0) next[key] = markers
  }

  return next
}

function normalizeSourceMeta(value: unknown): ScriptureSourceMeta | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const pageNo = typeof record.pageNo === 'number'
    ? record.pageNo
    : record.pageNo == null
      ? null
      : Number(record.pageNo)
  const next: ScriptureSourceMeta = {
    sourceId: safeText(record.sourceId ?? record.id) || null,
    gurmukhi: safeText(record.gurmukhi),
    unicode: safeText(record.unicode),
    english: safeText(record.english),
    pageNo: Number.isFinite(pageNo) ? pageNo : null,
  }

  if (!next.sourceId && !next.gurmukhi && !next.unicode && !next.english && next.pageNo == null) {
    return null
  }

  return next
}

function normalizeRaagMeta(value: unknown): ScriptureRaagMeta | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const raagId = typeof record.raagId === 'number'
    ? record.raagId
    : record.raagId == null
      ? null
      : Number(record.raagId)
  const next: ScriptureRaagMeta = {
    raagId: Number.isFinite(raagId) ? raagId : null,
    gurmukhi: safeText(record.gurmukhi),
    unicode: safeText(record.unicode),
    english: safeText(record.english),
    raagWithPage: safeText(record.raagWithPage),
  }

  if (next.raagId == null && !next.gurmukhi && !next.unicode && !next.english && !next.raagWithPage) {
    return null
  }

  return next
}

function normalizeWriterMeta(value: unknown): ScriptureWriterMeta | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const writerId = typeof record.writerId === 'number'
    ? record.writerId
    : record.writerId == null
      ? null
      : Number(record.writerId)
  const next: ScriptureWriterMeta = {
    writerId: Number.isFinite(writerId) ? writerId : null,
    gurmukhi: safeText(record.gurmukhi),
    unicode: safeText(record.unicode),
    english: safeText(record.english),
  }

  if (next.writerId == null && !next.gurmukhi && !next.unicode && !next.english) {
    return null
  }

  return next
}

function getSourceDisplay(meta: ScriptureSourceMeta | null | undefined, fallback: string): string {
  return meta?.english || meta?.unicode || meta?.gurmukhi || fallback
}

function getRaagDisplay(meta: ScriptureRaagMeta | null | undefined, fallback = ''): string {
  return meta?.english || meta?.raagWithPage || meta?.unicode || meta?.gurmukhi || fallback
}

function getWriterDisplay(meta: ScriptureWriterMeta | null | undefined, fallback = ''): string {
  return meta?.english || meta?.unicode || meta?.gurmukhi || fallback
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
  const translations_hi = getHindiTranslations(verse.translation)
  const translations_pa = getPunjabiTranslations(verse.translation)
  const visraam = normalizeVisraam(verse.visraam)
  const headerLevel = 'headerLevel' in verse && typeof verse.headerLevel === 'number'
    ? verse.headerLevel
    : undefined

  return {
    verseId,
    shabadId,
    ang,
    originalAng,
    isHeader: 'isHeader' in verse ? Boolean(verse.isHeader) : originalAng === null,
    headerLevel,
    gurmukhi: getVerseText(verse.verse),
    larivaar: getVerseText(verse.larivaar),
    transliteration: getEnglishTransliteration(verse.transliteration),
    translation_en: translations_en.bdb ?? '',
    translations_en,
    translation_hi: pickPreferredTranslation(translations_hi, ['ss', 'sts']),
    translations_hi,
    translation_pa: pickPreferredTranslation(translations_pa, ['ss', 'ft', 'bdb', 'ms', 'pss']),
    translations_pa,
    visraam,
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
  sourceMeta,
  raag,
  raagMeta,
  writer,
  writerMeta,
  hukamnamaDate,
}: {
  id: string
  scripture: string
  ang: number
  source: BaniSource
  shabadId?: number
  verses: Array<BaniVerse | BaniFlatVerse | BaniShabadVerse>
  sourceName?: string
  sourceMeta?: ScriptureSourceMeta | null
  raag?: string
  raagMeta?: ScriptureRaagMeta | null
  writer?: string
  writerMeta?: ScriptureWriterMeta | null
  hukamnamaDate?: string
}): ScriptureEntry {
  const resolvedAng = verses.find(verse => verse.pageNo !== null && verse.pageNo !== undefined)?.pageNo ?? ang
  const lines = verses.map(verse => buildLine(verse, resolvedAng, shabadId ?? verse.shabadId ?? 0))
  const firstVerse = verses[0]
  const resolvedSourceMeta = sourceMeta ?? normalizeSourceMeta(firstVerse?.source)
  const resolvedRaagMeta = raagMeta ?? normalizeRaagMeta(firstVerse?.raag)
  const resolvedWriterMeta = writerMeta ?? normalizeWriterMeta(firstVerse?.writer)

  return {
    id,
    scripture,
    ang: resolvedAng,
    source,
    shabadId,
    verseIds: lines.map(line => line.verseId).filter(Boolean),
    sourceName: sourceName ?? getSourceDisplay(resolvedSourceMeta, scripture),
    sourceMeta: resolvedSourceMeta,
    raag: raag ?? getRaagDisplay(resolvedRaagMeta),
    raagMeta: resolvedRaagMeta,
    writer: writer ?? getWriterDisplay(resolvedWriterMeta),
    writerMeta: resolvedWriterMeta,
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
  return withQaControl('study-ang', async () => {
    const { response: res, data } = await requestBanidb<Record<string, unknown>>(`${API_PREFIX}/angs/${ang}/${source}`)
    if (!res.ok) throw new Error(`BaniDB /angs error: ${res.status}`)

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
  }, {
    emptyValue: [],
  })
}

export async function fetchShabadWords(shabadId: number): Promise<Word[]> {
  const { response: res, data } = await requestBanidb<{ verses: BaniShabadVerse[] }>(`${API_PREFIX}/shabads/${shabadId}`)
  if (!res.ok) throw new Error(`BaniDB /shabads error: ${res.status}`)
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
  verse: { gurmukhi?: string; unicode?: string }
  larivaar?: { gurmukhi?: string; unicode?: string }
  transliteration: {
    english?: string
    en?: string
    hindi?: string
    hi?: string
  }
  translation: Record<string, Record<string, string | Record<string, string>>>
  visraam?: Partial<Record<VisraamSource, Array<{ p?: number; t?: string }>>>
  pageNo: number | null
  originalPageNo?: number | null
  source: {
    id?: string
    sourceId?: string
    gurmukhi?: string
    unicode?: string
    english?: string
    pageNo?: number | null
  }
  raag?: {
    raagId?: number | null
    gurmukhi?: string
    unicode?: string
    english?: string
    raagWithPage?: string
  }
  writer?: {
    writerId?: number | null
    gurmukhi?: string
    unicode?: string
    english?: string
  }
  isHeader?: boolean
  headerLevel?: number
}

interface NormalizedSundarGutkaLengthOption {
  band: SundarGutkaLength
  rawLengths: SundarGutkaRawLength[]
  signature: string
  lineCount: number
}

function hasSundarGutkaLengthFlags(item: BaniResponseVerse) {
  return (
    typeof item.existsSGPC !== 'undefined'
    || typeof item.existsMedium !== 'undefined'
    || typeof item.existsTaksal !== 'undefined'
    || typeof item.existsBuddhaDal !== 'undefined'
  )
}

function filterRawSundarGutkaVerses(
  rawArray: BaniResponseVerse[],
  rawLength: SundarGutkaRawLength
) {
  return rawArray.filter(item => {
    if (item.mangalPosition === 'above') return false
    if (!hasSundarGutkaLengthFlags(item)) return true

    const flag = item[SUNDAR_GUTKA_LENGTH_EXISTS_KEY[rawLength] as keyof BaniResponseVerse]
    return Boolean(flag)
  })
}

function buildSundarGutkaLengthSignature(rawArray: BaniResponseVerse[]) {
  return rawArray.map(item => {
    const nestedVerse = item.verse && typeof item.verse === 'object' && (
      'verseId' in item.verse || 'shabadId' in item.verse || 'translation' in item.verse || 'transliteration' in item.verse
    ) ? item.verse : null
    const inner = (nestedVerse ?? item) as BaniShabadVerse & {
      verseId?: number
      shabadId?: number
      pageNo?: number | null
    }

    return [
      inner.verseId ?? 0,
      inner.shabadId ?? 0,
      inner.pageNo ?? item.pageNo ?? 'x',
      item.header ? 'header' : 'line',
      safeText(inner.verse?.unicode),
    ].join(':')
  }).join('|')
}

function getNormalizedSundarGutkaLengthOptions(
  rawArray: BaniResponseVerse[]
): NormalizedSundarGutkaLengthOption[] {
  const distinctBySignature = new Map<string, {
    rawLengths: SundarGutkaRawLength[]
    signature: string
    lineCount: number
  }>()

  for (const rawLength of SUNDAR_GUTKA_LENGTH_ORDER) {
    const filtered = filterRawSundarGutkaVerses(rawArray, rawLength)
    if (filtered.length === 0) continue

    const signature = buildSundarGutkaLengthSignature(filtered)
    const existing = distinctBySignature.get(signature)
    if (existing) {
      existing.rawLengths.push(rawLength)
      continue
    }

    distinctBySignature.set(signature, {
      rawLengths: [rawLength],
      signature,
      lineCount: filtered.length,
    })
  }

  return Array.from(distinctBySignature.values())
    .sort((left, right) =>
      left.lineCount - right.lineCount
      || SUNDAR_GUTKA_LENGTH_ORDER.indexOf(left.rawLengths[0]!) - SUNDAR_GUTKA_LENGTH_ORDER.indexOf(right.rawLengths[0]!)
    )
    .map((option, index) => ({
      band: SUNDAR_GUTKA_LENGTH_ORDER[index]!,
      rawLengths: option.rawLengths,
      signature: option.signature,
      lineCount: option.lineCount,
    }))
}

function resolveNormalizedSundarGutkaLengthOption({
  options,
  requestedLength,
  defaultLength,
}: {
  options: NormalizedSundarGutkaLengthOption[]
  requestedLength?: SundarGutkaLength | null
  defaultLength: SundarGutkaLength
}) {
  if (options.length === 0) return null

  return options.find(option => option.band === requestedLength)
    ?? options.find(option => option.rawLengths.includes(requestedLength as SundarGutkaRawLength))
    ?? options.find(option => option.band === defaultLength)
    ?? options[0]
}

export async function fetchBani(
  baniDbId: number,
  sgLength?: SundarGutkaLength | null
): Promise<BaniFetchResult> {
  return withQaControl('study-bani', async () => {
    const { response: res, data } = await requestBanidb<Record<string, unknown>>(`${API_PREFIX}/banis/${baniDbId}`)
    if (!res.ok) throw new Error(`BaniDB /banis error: ${res.status}`)

    const rawArray = (data.verses ?? []) as BaniResponseVerse[]
    if (!rawArray.length) {
      return {
        entries: [],
        availableLengths: [],
        resolvedLength: null,
      }
    }

    const supportedBaniId = getSupportedSundarGutkaBaniIdByBaniDbId(baniDbId)
    const normalizedLengthOptions = supportedBaniId
      ? getNormalizedSundarGutkaLengthOptions(rawArray)
      : []
    const availableLengths = normalizedLengthOptions.map(option => option.band)
    const selectedLengthOption = supportedBaniId
      ? resolveNormalizedSundarGutkaLengthOption({
          options: normalizedLengthOptions,
          requestedLength: sgLength,
          defaultLength: SUNDAR_GUTKA_SUPPORTED_BANIS[supportedBaniId].defaultLength,
        })
      : null

    const filteredRawArray = supportedBaniId && selectedLengthOption
      ? filterRawSundarGutkaVerses(rawArray, selectedLengthOption.rawLengths[0]!)
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
      const headerLevel = typeof item.header === 'number' && item.header > 0
        ? item.header
        : undefined
      const flatVerse: BaniFlatVerse = {
        verseId: inner.verseId ?? 0,
        shabadId: inner.shabadId ?? 0,
        verse: inner.verse ?? { unicode: '' },
        larivaar: inner.larivaar,
        transliteration: inner.transliteration ?? { english: '' },
        translation: (inner.translation ?? {}) as BaniFlatVerse['translation'],
        visraam: inner.visraam,
        pageNo,
        originalPageNo: pageNo,
        source: (inner.source ?? item.source ?? { id: 'G' }) as BaniFlatVerse['source'],
        raag: (inner.raag ?? item.raag) as BaniFlatVerse['raag'],
        writer: (inner.writer ?? item.writer) as BaniFlatVerse['writer'],
        isHeader: headerLevel !== undefined,
        headerLevel,
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
          sourceMeta: normalizeSourceMeta(verses[0]?.source),
          sourceName: getSourceDisplay(normalizeSourceMeta(verses[0]?.source), sourceMap[srcId] ?? 'SGGS'),
          raagMeta: normalizeRaagMeta(verses[0]?.raag),
          writerMeta: normalizeWriterMeta(verses[0]?.writer),
        })
      }),
      availableLengths,
      resolvedLength: selectedLengthOption?.band ?? null,
    }
  }, {
    emptyValue: {
      entries: [],
      availableLengths: [],
      resolvedLength: null,
    },
  })
}

export async function fetchSearch(
  query: string,
  searchType: number = 0,
  source: SearchSource = 'all',
  context: 'home-search' | 'read-search' = 'read-search'
): Promise<SearchResult[]> {
  return withQaControl(context, async () => {
    const encoded = encodeURIComponent(query)
    const { response: res, data } = await requestBanidb<{ verses?: BaniVerse[] }>(`${API_PREFIX}/search/${encoded}`, {
      searchtype: searchType,
      source,
    })
    if (!res.ok) throw new Error(`BaniDB /search error: ${res.status}`)
    const verses = data.verses ?? []

    return verses.slice(0, 30).map(v => ({
      shabadId: v.shabadId,
      verseId: v.verseId,
      source: ((v as unknown as Record<string, unknown>).source as Record<string, string>)?.id ?? 'G',
      pageNo: v.pageNo ?? null,
      sourceName: getSourceDisplay(normalizeSourceMeta(v.source), v.source?.id ? toScripture(v.source.id) : ''),
      sourceMeta: normalizeSourceMeta(v.source),
      gurmukhi: getVerseText(v.verse),
      larivaar: getVerseText(v.larivaar),
      transliteration: getEnglishTransliteration(v.transliteration),
      translation_en: getEnglish(v.translation),
      raag: getRaagDisplay(normalizeRaagMeta(v.raag)),
      raagMeta: normalizeRaagMeta(v.raag),
      writer: getWriterDisplay(normalizeWriterMeta(v.writer)),
      writerMeta: normalizeWriterMeta(v.writer),
    }))
  }, {
    emptyValue: [],
  })
}

export async function fetchShabad(shabadId: number): Promise<ScriptureEntry | null> {
  return withQaControl('study-shabad', async () => {
    const { response: res, data } = await requestBanidb<{ shabadInfo?: ShabadInfo; verses?: BaniShabadVerse[] }>(`${API_PREFIX}/shabads/${shabadId}`)
    if (!res.ok) throw new Error(`BaniDB /shabads error: ${res.status}`)

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
      sourceMeta: normalizeSourceMeta(data.shabadInfo?.source),
      sourceName: getSourceDisplay(normalizeSourceMeta(data.shabadInfo?.source), toScripture(source)),
      raagMeta: normalizeRaagMeta(data.shabadInfo?.raag),
      raag: getRaagDisplay(normalizeRaagMeta(data.shabadInfo?.raag)),
      writerMeta: normalizeWriterMeta(data.shabadInfo?.writer),
      writer: getWriterDisplay(normalizeWriterMeta(data.shabadInfo?.writer)),
    })
  }, {
    emptyValue: null,
  })
}

export async function fetchShabadVerses(shabadId: number): Promise<ScriptureEntry[]> {
  const { response: res, data } = await requestBanidb<{ shabadInfo?: ShabadInfo; verses?: BaniShabadVerse[] }>(`${API_PREFIX}/shabads/${shabadId}`)
  if (!res.ok) throw new Error(`BaniDB /shabads error: ${res.status}`)

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
      sourceMeta: normalizeSourceMeta(data.shabadInfo?.source),
      sourceName: getSourceDisplay(normalizeSourceMeta(data.shabadInfo?.source), toScripture(source)),
      raagMeta: normalizeRaagMeta(data.shabadInfo?.raag),
      raag: getRaagDisplay(normalizeRaagMeta(data.shabadInfo?.raag)),
      writerMeta: normalizeWriterMeta(data.shabadInfo?.writer),
      writer: getWriterDisplay(normalizeWriterMeta(data.shabadInfo?.writer)),
    })
  )
}

export async function fetchBanisIndex(): Promise<BaniIndexItem[]> {
  const { response: res, data } = await requestBanidb<BaniInfoResponse[]>(`${API_PREFIX}/banis`)
  if (!res.ok) throw new Error(`BaniDB /banis error: ${res.status}`)

  return data.map(item => ({
    id: item.ID,
    gurmukhi: item.gurmukhiUni,
    transliteration: getEnglishTransliteration(item.transliterations),
  }))
}

export async function fetchAmritKeertanIndex(): Promise<AmritKeertanHeader[]> {
  const { response: res, data } = await requestBanidb<{ headers?: AmritKeertanHeaderResponse[] }>(`${API_PREFIX}/amritkeertan`)
  if (!res.ok) throw new Error(`BaniDB /amritkeertan error: ${res.status}`)

  return (data.headers ?? []).map(item => ({
    headerId: item.HeaderID,
    gurmukhi: item.GurmukhiUni,
    transliteration: getEnglishTransliteration(item.Transliterations),
  }))
}

export async function fetchAmritKeertanShabads(headerId: number): Promise<AmritKeertanShabad[]> {
  const { response: res, data } = await requestBanidb<{ index?: AmritKeertanIndexResponse[] }>(`${API_PREFIX}/amritkeertan/index/${headerId}`)
  if (!res.ok) throw new Error(`BaniDB /amritkeertan/index error: ${res.status}`)

  return (data.index ?? []).map(item => ({
    indexId: item.IndexID ?? 0,
    headerId: item.HeaderID ?? headerId,
    shabadId: item.ShabadID,
    gurmukhi: item.GurmukhiUni,
    transliteration: getEnglishTransliteration(item.Transliterations),
    translationEn: getEnglish(item.Translations),
    source: safeText(item.SourceEnglish),
    sourceMeta: item.SourceEnglish || item.SourceID || item.SourceGurmukhi || item.SourceUnicode || item.Ang
      ? {
          sourceId: safeText(item.SourceID) || null,
          gurmukhi: safeText(item.SourceGurmukhi),
          unicode: safeText(item.SourceUnicode),
          english: safeText(item.SourceEnglish),
          pageNo: item.Ang ?? null,
        }
      : null,
    sourceAng: item.Ang ?? null,
    raag: safeText(item.RaagEnglish),
    raagMeta: item.RaagEnglish || item.RaagID || item.RaagGurmukhi || item.RaagUnicode || item.RaagWithPage
      ? {
          raagId: item.RaagID ?? null,
          gurmukhi: safeText(item.RaagGurmukhi),
          unicode: safeText(item.RaagUnicode),
          english: safeText(item.RaagEnglish),
          raagWithPage: safeText(item.RaagWithPage),
        }
      : null,
    writer: safeText(item.WriterEnglish),
    writerMeta: item.WriterEnglish || item.WriterID || item.WriterGurmukhi || item.WriterUnicode
      ? {
          writerId: item.WriterID ?? null,
          gurmukhi: safeText(item.WriterGurmukhi),
          unicode: safeText(item.WriterUnicode),
          english: safeText(item.WriterEnglish),
        }
      : null,
    lineNo: item.LineNo ?? null,
    amritPageNo: item.PageNo ?? 0,
    pageNo: item.PageNo ?? 0,
  }))
}

export async function fetchAudio(shabadId: number): Promise<string | null> {
  try {
    // Try the shabad endpoint — it may include audio URLs in the response
    const { response: res, data } = await requestBanidb<Record<string, unknown>>(`${API_PREFIX}/shabads/${shabadId}`)
    if (!res.ok) return null
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
  return withQaControl('study-hukamnama', async () => {
    const targetDate = date ? new Date(`${date}T00:00:00`) : new Date()
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')

    let request = await requestBanidb<{
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
    }>(`${API_PREFIX}/hukamnamas/${year}/${month}/${day}`)
    if (!request.response.ok) {
      request = await requestBanidb<{
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
      }>(`${API_PREFIX}/hukamnamas`)
    }
    const { response: res, data } = request
    if (!res.ok) throw new Error(`BaniDB /hukamnamas error: ${res.status}`)

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
      sourceMeta: normalizeSourceMeta(shabadInfo?.source),
      sourceName: getSourceDisplay(normalizeSourceMeta(shabadInfo?.source), toScripture(sourceId)),
      raagMeta: normalizeRaagMeta(shabadInfo?.raag),
      raag: getRaagDisplay(normalizeRaagMeta(shabadInfo?.raag)),
      writerMeta: normalizeWriterMeta(shabadInfo?.writer),
      writer: getWriterDisplay(normalizeWriterMeta(shabadInfo?.writer)),
      hukamnamaDate: dateString,
    })

    return { date: dateString, entry, ang, source: sourceId, shabadId }
  })
}

export async function fetchKoshSuggestions(query: string): Promise<BanidbKoshWord[]> {
  const encoded = encodeURIComponent(query.trim())
  if (!encoded) return []

  const { response: res, data } = await requestBanidb<BanidbKoshWordResponse[]>(`${API_PREFIX}/kosh/${encoded}`)
  if (!res.ok) throw new Error(`BaniDB /kosh error: ${res.status}`)

  return data.map(item => ({
    id: item.id,
    word: item.word,
    wordUni: item.wordUni,
  }))
}

export async function fetchKoshEntries(query: string): Promise<BanidbKoshDefinition[]> {
  const encoded = encodeURIComponent(query.trim())
  if (!encoded) return []

  const { response: res, data } = await requestBanidb<BanidbKoshDefinitionResponse[]>(`${API_PREFIX}/kosh/search/${encoded}`)
  if (!res.ok) throw new Error(`BaniDB /kosh/search error: ${res.status}`)

  return data.map(item => ({
    id: item.id,
    word: item.word,
    wordUni: item.wordUni,
    definition: item.definition,
    definitionUni: item.definitionUni,
  }))
}

export async function fetchRehats(): Promise<RehatSummary[]> {
  const { response: res, data } = await requestBanidb<{ maryadas?: RehatSummaryResponse[] }>(`${API_PREFIX}/rehats`)
  if (!res.ok) throw new Error(`BaniDB /rehats error: ${res.status}`)

  return (data.maryadas ?? []).map(item => ({
    rehatId: item.rehatID,
    rehatName: item.rehatName,
    alphabet: item.alphabet,
  }))
}

export async function fetchRehatChapters(rehatId: number): Promise<RehatChapterSummary[]> {
  const { response: res, data } = await requestBanidb<{ chapters?: RehatChapterResponse[] }>(`${API_PREFIX}/rehats/${rehatId}`)
  if (!res.ok) throw new Error(`BaniDB /rehats/:rehatId error: ${res.status}`)

  return (data.chapters ?? []).map(item => ({
    chapterId: item.chapterID,
    chapterName: item.chapterName,
    alphabet: item.alphabet,
  }))
}

export async function fetchRehatChapter(rehatId: number, chapterId: number): Promise<RehatChapterContent | null> {
  const { response: res, data } = await requestBanidb<{ chapters?: RehatChapterResponse[] }>(`${API_PREFIX}/rehats/${rehatId}/chapters/${chapterId}`)
  if (!res.ok) throw new Error(`BaniDB /rehats/:rehatId/chapters/:chapterId error: ${res.status}`)

  const chapter = data.chapters?.[0]
  if (!chapter) return null

  return {
    rehatId,
    chapterId: chapter.chapterID,
    chapterName: chapter.chapterName,
    chapterContent: chapter.chapterContent ?? '',
    alphabet: chapter.alphabet,
  }
}

export async function fetchRehatSearch(query: string): Promise<SearchResult[]> {
  return fetchSearch(query, 3, 'R', 'read-search')
}
