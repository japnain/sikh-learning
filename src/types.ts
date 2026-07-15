export interface Word {
  gurmukhi: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
}

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'degraded'
export type AsyncIssueCode = 'qa-fault' | 'missing' | 'offline' | 'unavailable'

export interface AsyncIssue {
  code: AsyncIssueCode
  detail?: string | null
}

export interface MahanKoshEntry {
  id: number
  word: string
  searchKey: string
  transliteration: string
  roman: string
  hindi: string
  description: string
  description_hi: string
  exactMatch: boolean
  sourceUrl: string
}

export interface MahanKoshEnglishGloss {
  gloss: string
  source: 'bdb' | 'generated'
}

export type EnglishSource = 'bdb' | 'ms' | 'ssk'
export type PunjabiSource = 'ss' | 'ft' | 'bdb' | 'ms' | 'pss' | (string & {})
export type HindiSource = 'ss' | 'sts' | (string & {})
export type VisraamSource = 'sttm' | 'igurbani' | 'sttm2'
export type ScriptMode = 'gurmukhi' | 'devanagari'
export type MeaningLanguage = 'none' | 'en' | 'pa' | 'hi'
export type ReaderLineSpacing = 'compact' | 'relaxed'
export type ReaderAlignment = 'left' | 'center'
export type SundarGutkaLength = 'short' | 'medium' | 'long' | 'extralong'
export type SearchMode =
  | 'first-letters'
  | 'first-letters-anywhere'
  | 'gurmukhi'
  | 'english'
  | 'transliteration'
  | 'ang'
  | 'auto-detect'
export type LearningLevel = 'beginner' | 'familiar' | 'daily-reader'
export type VocabKind = 'word' | 'phrase'
export type UiLocale = 'en' | 'pa' | 'hi'
export type OnboardingAudience = 'child' | 'teen' | 'adult'
export type LearningGoal = 'read' | 'understand' | 'habit'
export type OnboardingPresentationMode = 'first-run' | 'overlay'
export type SoundCategory = 'rain' | 'water' | 'wind' | 'night' | 'sanctuary'
export type FocusContext = 'study' | 'review'
export type FocusPresetId = 'settle' | 'focus' | 'night'

export interface EnglishTranslations {
  bdb?: string
  ms?: string
  ssk?: string
}

export type PunjabiTranslations = Record<string, string>
export type HindiTranslations = Record<string, string>

export interface ScriptureVisraamMarker {
  p: number
  t: string
}

export type ScriptureVisraamSets = Partial<Record<VisraamSource, ScriptureVisraamMarker[]>>

export interface ScriptureSourceMeta {
  sourceId?: string | null
  gurmukhi?: string
  unicode?: string
  english?: string
  pageNo?: number | null
}

export interface ScriptureRaagMeta {
  raagId?: number | null
  gurmukhi?: string
  unicode?: string
  english?: string
  raagWithPage?: string
}

export interface ScriptureWriterMeta {
  writerId?: number | null
  gurmukhi?: string
  unicode?: string
  english?: string
}

export interface ScriptureLine {
  verseId: number
  shabadId: number
  ang: number
  originalAng?: number | null
  isHeader?: boolean
  headerLevel?: number
  gurmukhi: string
  larivaar?: string
  transliteration: string
  translation_en: string
  translations_en: EnglishTranslations
  translation_hi: string
  translations_hi?: HindiTranslations
  translation_pa: string
  translations_pa?: PunjabiTranslations
  visraam?: ScriptureVisraamSets
}

export interface ScriptureEntry {
  id: string
  scripture: string
  ang: number
  source?: 'G' | 'D' | 'B' | 'A'
  shabadId?: number
  verseIds?: number[]
  sourceName?: string
  sourceMeta?: ScriptureSourceMeta | null
  raag?: string
  raagMeta?: ScriptureRaagMeta | null
  writer?: string
  writerMeta?: ScriptureWriterMeta | null
  hukamnamaDate?: string
  lines?: ScriptureLine[]
  gurmukhi: string
  transliteration: string
  translation_en: string
  translation_hi: string
  translation_pa: string
  words: Word[]
}

export interface VocabEntry {
  kind?: VocabKind
  word: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
  scripture: string
  sourceId: string
  savedAt: string
  context?: VocabContext
  review?: VocabReviewState
}

export interface StudiedEntry {
  id: string
  swipedAt: string
}

export interface Scripture {
  id: string
  name: string
  shortName: string
  sourceId: 'G' | 'D' | 'B' | 'A'
}

export interface BanidbKoshWord {
  id: number
  word: string
  wordUni: string
}

export interface BanidbKoshDefinition extends BanidbKoshWord {
  definition: string
  definitionUni: string
}

export interface RehatSummary {
  rehatId: number
  rehatName: string
  alphabet: string
}

export interface RehatChapterSummary {
  chapterId: number
  chapterName: string
  alphabet: string
}

export interface RehatChapterContent {
  rehatId: number
  chapterId: number
  chapterName: string
  chapterContent: string
  alphabet: string
}

export interface VocabContext {
  scripture: string
  sourceId: string
  ang?: number
  shabadId?: number
  verseId?: number
  line?: string
}

export interface VocabReviewState {
  dueAt: string
  intervalDays: number
  reviewCount: number
  lastReviewedAt?: string
}

export interface FocusPreset {
  id: FocusPresetId
  name: string
  description: string
  soundId: string
  recommendedContexts: FocusContext[]
  defaultVolume: number
}

export interface WordFamily {
  id: string
  root: string
  rootTransliteration: string
  rootMeaning: string
  theme: string
  members: Array<{
    gurmukhi: string
    transliteration: string
    meaning: string
    exampleLine?: string
    exampleAng?: number
  }>
}

export interface LibraryTextBlock {
  id: string
  type: 'line' | 'heading' | 'paragraph'
  text: string
}

export type LibraryPageQuality = 'clean' | 'readable' | 'fragment' | 'unreadable'
export type LibraryPageReviewStatus = 'ocr' | 'machine-cleaned' | 'reviewed'
export type LibraryPageTextState = 'source-translation' | 'cleaned-ocr' | 'editorial-reconstruction' | 'contents-navigation'

export interface LibraryEditorialNavigationLink {
  id: string
  label: string
  description: string
  pageNumber: number
}

export interface LibraryPagePayload {
  workId: string
  pageNumber: number
  volume: number
  sourcePageNumber: number
  title: string
  blocks: LibraryTextBlock[]
  rawBlocks?: LibraryTextBlock[]
  editorialNavigation?: LibraryEditorialNavigationLink[]
  quality?: LibraryPageQuality
  sourceFile: string
  review: {
    status: LibraryPageReviewStatus
  }
  episode?: {
    number: number
    title: string
    startPage: number
    endPage: number
  }
}

export interface LibraryPageIndexEntry {
  pageNumber: number
  volume: number
  sourcePageNumber: number
  title: string
  path: string
}

export interface LibraryChapterIndexEntry {
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

export interface LibraryWork {
  id: string
  title: string
  shortTitle: string
  description: string
  language: string
  source?: 'epub' | 'page-json'
  totalPages: number
  totalChapters?: number
  totalSourcePages?: number
  pageIndexPath?: string
  provenancePath: string
  pagePathTemplate?: string
  episodeIndexPath?: string
  chapterIndexPath?: string
  chapterPathTemplate?: string
}

export interface LibrarySearchPageEntry {
  workId: string
  pageNumber: number
  volume: number
  sourcePageNumber: number
  title: string
  path: string
  quality?: LibraryPageQuality
  reviewStatus?: LibraryPageReviewStatus
  textState: LibraryPageTextState
  textStateLabel: string
  rawSourceRetained: boolean
  episodeNumber?: number
  episodeTitle?: string
  episodeDisplayTitle?: string
  episodeStartPage?: number
  episodeEndPage?: number
  snippet: string
  searchText: string
}

export interface LibrarySearchEpisodeEntry {
  workId: string
  episodeNumber: number
  volume: number
  title: string
  displayTitle: string
  summary: string
  arcLabel: string
  startPage: number
  endPage: number
  pageCount: number
  searchText: string
}

export interface LibrarySearchChapterEntry {
  workId: string
  chapterId: string
  chapterNumber: number
  episodeNumber?: number
  kind: 'front-matter' | 'episode' | 'back-matter'
  volume: number
  title: string
  startSourcePage: number
  endSourcePage: number
  pageCount: number
  path: string
  snippet: string
  searchText: string
}

export interface LibrarySearchIndex {
  works: Array<{
    id: string
    title: string
    aliases: string[]
  }>
  pages?: LibrarySearchPageEntry[]
  episodes?: LibrarySearchEpisodeEntry[]
  chapters?: LibrarySearchChapterEntry[]
  metadata?: {
    panthPrakash?: {
      totalPages?: number
      totalEpisodes?: number
      totalChapters?: number
      totalSourcePages?: number
      pagesMissingSourceMapping?: number
      sourceBackedPages?: number
      editorialReconstructionPages?: number
      contentsNavigationPages?: number
      rawSourceRetainedPages?: number
      source: 'epub' | 'page-json'
      generatedAt: string
    }
  }
}

export interface LibraryManifest {
  version: string
  generatedAt: string
  workCatalogPath: string
  searchIndexPath: string
}

export interface LibraryWorkCatalog {
  works: LibraryWork[]
  workById: Record<string, LibraryWork>
}

export interface LibraryEpisodeIndexEntry {
  episodeNumber: number
  title: string
  startPage: number
  endPage: number
  volume: number
}

export interface LibraryChapterPagePayload {
  sourcePageNumber: number
  fileName: string
  blocks: LibraryTextBlock[]
}

export interface LibraryChapterPayload {
  workId: string
  id: string
  chapterNumber: number
  episodeNumber?: number
  kind: 'front-matter' | 'episode' | 'back-matter'
  title: string
  volume: number
  startSourcePage: number
  endSourcePage: number
  pages: LibraryChapterPagePayload[]
  previousChapterId?: string
  nextChapterId?: string
  source: {
    type: 'epub'
    fileName: string
  }
}
