import { lazy, Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { fetchAng, fetchShabad, type BaniFetchResult } from '../api/banidb'
import SurfaceStateCard from '../components/SurfaceStateCard'
import { useProgressStore, type Session } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useBani } from '../hooks/useBani'
import { useShabad } from '../hooks/useShabad'
import { useHukamnama } from '../hooks/useHukamnama'
import { useMultiShabadWordData } from '../hooks/useMultiShabadWordData'
import SoundscapeControls from '../components/SoundscapeControls'
import StudyCard from '../components/StudyCard'
import ReaderDock from '../components/ReaderDock'
import ReaderFinishPanel from '../components/ReaderFinishPanel'
import BaniLengthControl from '../components/BaniLengthControl'
import { getBaniLengthDestinationLabel } from '../components/baniLengthCopy'
import { useBaniLengthSelection } from '../hooks/useBaniLengthSelection'
import { useReaderWakeLock } from '../hooks/useReaderWakeLock'
import { useReaderHeaderLayout } from '../hooks/useReaderHeaderLayout'
import { getBaniLengthDestination, type BaniLengthDestination } from '../utils/baniLengthSelection'
import { getExactReadingKey, useReadingPlacesStore } from '../store/readingPlaces'
import { useNitemStore } from '../store/nitnem'
import { getSelectedNitnemReading } from '../utils/nitnemReadingIdentity'
import { useNitnemPracticeStore } from '../store/nitnemPractice'
import { isActiveNitnemPracticeReading } from '../utils/nitnemPractice'
import WordPopover from '../components/WordPopover'
import { useReaderInteraction, type ReaderWordContext } from '../hooks/useReaderInteraction'
import { useReaderPresentation, type ReaderPresentation } from '../hooks/useReaderPresentation'
import { captureReaderAnchor, findVisibleReaderLine, getReaderBodyLines, getReaderViewportTop, restoreReaderAnchor, type ReaderAnchor } from '../utils/readerAnchor'
import { getSavedReturnIdentity, isSafeSavedReturnPath, isScriptureBookmark, useBookmarksStore } from '../store/bookmarks'
import { resolveFavoriteRouteMode, useFavoritesStore } from '../store/favorites'
import { useReadingProgressStore } from '../store/readingProgress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import type {
  EnglishSource,
  HindiSource,
  MeaningLanguage,
  PunjabiSource,
  ScriptureEntry,
  ScriptureLine,
  SundarGutkaLength,
  UiLocale,
} from '../types'
import {
  getEnglishSourceLabels,
  getHindiSourceLabel,
  getHindiSourceLabels,
  getLineSpacingLabels,
  getMeaningLanguageLabels,
  getPunjabiSourceLabel,
  getPunjabiSourceLabels,
  getScriptModeLabels,
  getTextAlignmentLabels,
  getVisraamSourceLabels,
} from '../utils/translations'
import { useLanguageStore } from '../store/language'
import { formatGurbaniText, getEntryMeaningText, getLineMeaningText, getScriptTextFontClass, getScriptTextLang, isStructuralGurbaniHeadingLine, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { findCanonicalBaniById } from '../utils/baniRouteResolver'
import { IconArrowLeft, IconShare, IconBookmark, IconBookmarkFilled, IconClose, IconHeart, IconHeartFilled, IconMoreHorizontal } from '../components/icons'
import { isVocabEntryPersisted, useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'
import { useThemeStore } from '../store/theme'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import {
  ARDAAS_HUKAMNAMA_EDITORIAL_COPY,
  DAILY_HUKAMNAMA_EDITORIAL_COPY,
  PERSONAL_HUKAMNAMA_EDITORIAL_COPY,
  formatReaderEditorialDate,
  getReaderEditorialCopyForBani,
  getReaderEditorialCopyForBaniDbId,
  getReaderEditorialCopyForSource,
} from '../content/readerEditorialCopy'
import DisclosureSection from '../components/DisclosureSection'
import ModalSheet from '../components/ModalSheet'
import {
  SUNDAR_GUTKA_LENGTH_LABELS,
  SUNDAR_GUTKA_LENGTH_ORDER,
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  asSupportedSundarGutkaBaniId,
  getSupportedSundarGutkaBaniIdByBaniDbId,
  inferLegacySundarGutkaLength,
  normalizeSundarGutkaLength,
} from '../utils/sundarGutkaLength'
import {
  SOURCE_READER_META,
  getSourceReaderUnit,
  type SourceReaderId,
} from '../utils/sourceReaderMeta'
import {
  addAppScrollSettledListener,
  getAppScrollTop,
  getAppViewportBounds,
  getAppViewportHeight,
  scrollAppTo,
  scrollElementIntoAppView,
} from '../utils/appScroll'
import { buildPersonalHukamnamaShortPath } from '../utils/hukamnamaShareRoute'
import { canUseLegacySavedLocationFallback } from '../utils/savedRouteIdentity'
import { isSafeInternalAppPath } from '../utils/libraryReaderNavigation'

type BaniSource = SourceReaderId

type ShareHighlightSheetContent = {
  gurmukhi: string
  transliteration?: string
  meaning?: string
  sourceLabel: string
  passageLines?: Array<{
    id: string | number
    gurmukhi: string
    transliteration?: string
    meaning?: string
    isHeader?: boolean
  }>
  passageKind?: 'daily-hukamnama' | 'personal-hukamnama'
  seriesLabel?: string
  dateLabel?: string
  caption?: string
  verseId?: number
  sourcePath?: string
  sharePath?: string
  selectedExcerpt?: boolean
  initialShowTransliteration?: boolean
  initialShowMeaning?: boolean
  provenance?: {
    ceremonyLocation?: string
    scripture?: string
    raag?: string
    writer?: string
    translationLabel?: string
    translationLanguage?: 'en' | 'pa' | 'hi'
    dateIso?: string
  }
}

const ShareHighlightSheet = lazy(() => import('../features/shareHighlight/ShareHighlightSheet'))
const BaniLengthSheet = lazy(() => import('../components/BaniLengthSheet'))
const BaniFindPanel = lazy(() => import('../components/BaniFindPanel'))

const HUKAMNAMA_SHARE_SERIES: Record<UiLocale, { daily: string; personal: string }> = {
  en: { daily: 'Daily Hukamnama', personal: 'Personal Hukamnama' },
  pa: { daily: 'ਰੋਜ਼ਾਨਾ ਹੁਕਮਨਾਮਾ', personal: 'ਨਿੱਜੀ ਹੁਕਮਨਾਮਾ' },
  hi: { daily: 'दैनिक हुकमनामा', personal: 'व्यक्तिगत हुकमनामा' },
}

const HUKAMNAMA_CEREMONY_LOCATION: Record<UiLocale, string> = {
  en: 'Sri Harmandir Sahib, Amritsar',
  pa: 'ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ, ਅੰਮ੍ਰਿਤਸਰ',
  hi: 'श्री हरमंदिर साहिब, अमृतसर',
}

function getResolvedEnglishSource(line: ScriptureLine, preferred: EnglishSource): EnglishSource | null {
  const translations = line.translations_en
  if (translations?.[preferred]?.trim()) return preferred
  if (translations?.bdb?.trim()) return 'bdb'
  if (translations?.ms?.trim()) return 'ms'
  if (translations?.ssk?.trim()) return 'ssk'
  return null
}

function getResolvedMappedSource(
  translations: Record<string, string> | undefined,
  preferred: string,
): string | null {
  if (translations?.[preferred]?.trim()) return preferred

  return Object.entries(translations ?? {})
    .find(([, text]) => Boolean(text.trim()))?.[0] ?? null
}

function getResolvedMeaningSource(
  line: ScriptureLine,
  language: Exclude<MeaningLanguage, 'none'>,
  preferred: {
    english: EnglishSource
    punjabi: PunjabiSource
    hindi: HindiSource
  },
): string | null {
  if (language === 'en') return getResolvedEnglishSource(line, preferred.english)
  if (language === 'pa') return getResolvedMappedSource(line.translations_pa, preferred.punjabi)
  return getResolvedMappedSource(line.translations_hi, preferred.hindi)
}

function getEntrySourceDisplay(entry: ScriptureEntry | null, fallbackSource: BaniSource) {
  if (entry?.sourceName && entry.sourceName !== entry.scripture) return entry.sourceName
  const source = (entry?.source ?? fallbackSource) as BaniSource
  return SOURCE_READER_META[source]?.name ?? entry?.scripture ?? SOURCE_READER_META.G.name
}

function formatEntryReaderLocation(entry: ScriptureEntry, unit: string): string {
  const lineLocations = (entry.lines ?? [])
    .map(line => line.ang)
    .filter((value): value is number => Number.isSafeInteger(value) && value > 0)
  const locations = lineLocations.length > 0 ? lineLocations : [entry.ang]
  const first = Math.min(...locations)
  const last = Math.max(...locations)

  return `${unit} ${first}${last === first ? '' : `–${last}`}`
}

function readerControlOptionClass(selected: boolean, extra = '') {
  return [
    'rounded-lg px-3 py-2 font-sans text-xs font-medium min-h-[44px] transition-all duration-300 interactive-focus',
    selected
      ? 'bg-saffron text-white shadow-sm'
      : 'bg-parchment-card/78 dark:bg-dark-card/78 text-ink/72 dark:text-dark-text/76 border border-sand/15 dark:border-dark-text/10',
    extra,
  ].filter(Boolean).join(' ')
}

const MAX_ANG: Record<string, number> = {
  G: SOURCE_READER_META.G.max,
  D: SOURCE_READER_META.D.max,
  B: SOURCE_READER_META.B.max,
  A: SOURCE_READER_META.A.max,
}

function getRandomSggsAng(randomValue: number): number {
  return Math.floor(randomValue * MAX_ANG.G) + 1
}

function parseShabadId(entry: ScriptureEntry): number | null {
  if (typeof entry.shabadId === 'number') return entry.shabadId > 0 ? entry.shabadId : null
  const parts = entry.id.split('-')
  if (parts.length === 3) {
    const id = Number(parts[2])
    return Number.isFinite(id) && id > 0 ? id : null
  }
  return null
}

function hasExactLineIdentity(line: Pick<ScriptureLine, 'shabadId' | 'verseId'>) {
  return Number.isSafeInteger(line.shabadId)
    && line.shabadId > 0
    && Number.isSafeInteger(line.verseId)
    && line.verseId > 0
}

function sliceEntryToLines(entry: ScriptureEntry, lines: ScriptureLine[]): ScriptureEntry {
  const nextAng = lines.find(line => line.ang)?.ang ?? entry.ang

  return {
    ...entry,
    ang: nextAng,
    lines,
    verseIds: lines.map(line => line.verseId).filter(Boolean),
    gurmukhi: lines.map(line => line.gurmukhi).join(' '),
    transliteration: lines.map(line => line.transliteration).join(' '),
    translation_en: lines.map(line => line.translation_en).join(' '),
    translation_hi: lines.map(line => line.translation_hi).join(' '),
    translation_pa: lines.map(line => line.translation_pa).join(' '),
  }
}

function buildReaderTitle(line: string): string {
  const compact = line.replace(/\s+/g, ' ').trim()
  return compact.length > 44 ? `${compact.slice(0, 44).trim()}…` : compact
}

function findFirstRenderableLine(entries: ScriptureEntry[]): ScriptureLine | null {
  for (const entry of entries) {
    for (const line of entry.lines ?? []) {
      if (!line.isHeader && line.gurmukhi.trim()) {
        return line
      }
    }
  }

  return null
}

function truncateSavedText(value: string | undefined, maxLength = 700) {
  const compact = value?.replace(/\s+/g, ' ').trim() ?? ''
  return compact.length > maxLength ? `${compact.slice(0, maxLength).trim()}…` : compact
}

function buildSavedExcerptEntry(saved: {
  id: string
  title: string
  source: BaniSource
  ang: number
  shabadId?: number
  verseId?: number
  excerpt?: string
  transliteration?: string
  translation_en?: string
  translation_hi?: string
  translation_pa?: string
}): ScriptureEntry | null {
  const gurmukhi = saved.excerpt?.trim()
  if (!gurmukhi) return null

  // ScriptureLine requires numeric IDs, but canonical saves do not always have
  // an exact verse identity. Zero is an explicit non-routable sentinel; never
  // invent a valid-looking Gurbani ID for an offline excerpt.
  const shabadId = saved.shabadId ?? 0
  const verseId = saved.verseId ?? 0
  const transliteration = saved.transliteration?.trim() ?? ''
  const translationEn = saved.translation_en?.trim() ?? ''
  const translationHi = saved.translation_hi?.trim() ?? ''
  const translationPa = saved.translation_pa?.trim() ?? ''
  const line: ScriptureLine = {
    verseId,
    shabadId,
    ang: saved.ang,
    gurmukhi,
    transliteration,
    translation_en: translationEn,
    translations_en: translationEn ? { bdb: translationEn } : {},
    translation_hi: translationHi,
    translations_hi: translationHi ? { ss: translationHi } : undefined,
    translation_pa: translationPa,
    translations_pa: translationPa ? { ss: translationPa } : undefined,
  }

  return {
    id: `saved-${saved.id}`,
    scripture: saved.title,
    source: saved.source,
    ang: saved.ang,
    shabadId,
    verseIds: verseId > 0 ? [verseId] : [],
    lines: [line],
    gurmukhi,
    transliteration,
    translation_en: translationEn,
    translation_hi: translationHi,
    translation_pa: translationPa,
    words: [],
  }
}

function findStudyEntryTitle(entry: ScriptureEntry): string {
  const titleLine = entry.lines?.find(
    line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi)
  )?.gurmukhi
    ?? entry.lines?.find(line => !line.isHeader && line.gurmukhi.trim())?.gurmukhi
    ?? entry.gurmukhi

  return buildReaderTitle(titleLine)
}

function getStudyEntryLineCount(entry: ScriptureEntry): number {
  const mainLineCount = entry.lines?.filter(line => !line.isHeader).length ?? 0
  return mainLineCount > 0 ? mainLineCount : 1
}

const STUDY_EXPERIENCE_COPY: Record<UiLocale, {
  shareCopied: string
  shareOpened: string
  shareUnavailable: string
  bookmarkSaved: string
  bookmarkRemoved: string
  bookmarkExists: string
  storageUnavailable: string
  positionSessionOnly: string
  retryPosition: string
  savedOffline: string
  retainedReading: string
  tryLive: string
  favoriteAdded: string
  favoriteRemoved: string
  lineCopied: string
  lineBookmarked: string
  phraseSaved: string
  phraseAlreadySaved: string
  entryOutlineEyebrow: string
  entryOutlineBody: string
  hukamnamaEyebrow: string
  hukamnamaBody: string
  sectionLabel: (index: number, total: number) => string
  previousSection: string
  nextSection: string
  continueReading: string
  beginningOfReading: string
  endOfReading: string
  contextTitle: string
  contextSummary: string
}> = {
  en: {
    shareCopied: 'Copied to clipboard for sharing.',
    shareOpened: 'Share sheet opened.',
    shareUnavailable: 'Unable to open the share sheet. Copied to clipboard instead.',
    bookmarkSaved: 'Bookmark saved.',
    bookmarkRemoved: 'Bookmark removed.',
    bookmarkExists: 'This passage is already bookmarked.',
    storageUnavailable: 'Saved for this session, but device storage is unavailable. Free some space and try again.',
    positionSessionOnly: 'Your place is kept for this session. This device couldn’t save it.',
    retryPosition: 'Retry saving place',
    savedOffline: 'Showing the passage already saved on this device because the live source is unavailable.',
    retainedReading: 'The live source is unavailable. Your open reading is still here; saving it for offline use could not be confirmed.',
    tryLive: 'Try live copy',
    favoriteAdded: 'Added to favorites.',
    favoriteRemoved: 'Removed from favorites.',
    lineCopied: 'Verse copied to clipboard.',
    lineBookmarked: 'Verse bookmarked.',
    phraseSaved: 'Verse saved to review.',
    phraseAlreadySaved: 'This verse is already saved for review.',
    entryOutlineEyebrow: 'On This Ang',
    entryOutlineBody: 'Jump to a shabad while keeping the complete reading in view.',
    hukamnamaEyebrow: "Today's Hukamnama",
    hukamnamaBody: 'Receive the day through the Hukamnama first, then open the full source shabad when you want the wider context.',
    sectionLabel: (index, total) => `Shabad ${index} of ${total}`,
    previousSection: 'Previous shabad',
    nextSection: 'Next shabad',
    continueReading: 'Continue reading',
    beginningOfReading: 'Beginning of reading',
    endOfReading: 'End of reading',
    contextTitle: 'Context & sources',
    contextSummary: 'Historical, practice, and source notes for this reading.',
  },
  pa: {
    shareCopied: 'ਸਾਂਝਾ ਕਰਨ ਲਈ ਕਲਿੱਪਬੋਰਡ ਵਿੱਚ ਕਾਪੀ ਹੋ ਗਿਆ ਹੈ।',
    shareOpened: 'ਸ਼ੇਅਰ ਸ਼ੀਟ ਖੁਲ੍ਹ ਗਈ ਹੈ।',
    shareUnavailable: 'ਸ਼ੇਅਰ ਸ਼ੀਟ ਨਹੀਂ ਖੁੱਲੀ। ਇਸ ਦੀ ਥਾਂ ਕਲਿੱਪਬੋਰਡ ਵਿੱਚ ਕਾਪੀ ਕੀਤਾ ਗਿਆ ਹੈ।',
    bookmarkSaved: 'ਬੁੱਕਮਾਰਕ ਸੰਭਾਲਿਆ ਗਿਆ ਹੈ।',
    bookmarkRemoved: 'ਬੁੱਕਮਾਰਕ ਹਟਾਇਆ ਗਿਆ ਹੈ।',
    bookmarkExists: 'ਇਹ ਪਾਠ ਪਹਿਲਾਂ ਹੀ ਬੁੱਕਮਾਰਕ ਕੀਤਾ ਹੋਇਆ ਹੈ।',
    storageUnavailable: 'ਇਸ ਸੈਸ਼ਨ ਲਈ ਸੰਭਾਲਿਆ ਗਿਆ ਹੈ, ਪਰ ਡਿਵਾਈਸ ਸਟੋਰੇਜ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕੁਝ ਜਗ੍ਹਾ ਖਾਲੀ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    positionSessionOnly: 'ਪਾਠ ਵਿੱਚ ਤੁਹਾਡਾ ਸਥਾਨ ਇਸ ਸੈਸ਼ਨ ਲਈ ਰੱਖਿਆ ਹੈ। ਇਹ ਡਿਵਾਈਸ ਇਸਨੂੰ ਸੰਭਾਲ ਨਹੀਂ ਸਕਿਆ।',
    retryPosition: 'ਸਥਾਨ ਮੁੜ ਸੰਭਾਲੋ',
    savedOffline: 'ਲਾਈਵ ਸਰੋਤ ਉਪਲਬਧ ਨਾ ਹੋਣ ਕਰਕੇ ਇਸ ਡਿਵਾਈਸ ਤੇ ਪਹਿਲਾਂ ਸੰਭਾਲਿਆ ਪਾਠ ਦਿਖਾਇਆ ਜਾ ਰਿਹਾ ਹੈ।',
    retainedReading: 'ਲਾਈਵ ਸਰੋਤ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਤੁਹਾਡਾ ਖੁੱਲ੍ਹਾ ਪਾਠ ਮੌਜੂਦ ਹੈ; ਆਫ਼ਲਾਈਨ ਲਈ ਸੰਭਾਲੇ ਜਾਣ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਹੋ ਸਕੀ।',
    tryLive: 'ਲਾਈਵ ਕਾਪੀ ਅਜ਼ਮਾਓ',
    favoriteAdded: 'ਮਨਪਸੰਦ ਵਿੱਚ ਜੋੜਿਆ ਗਿਆ ਹੈ।',
    favoriteRemoved: 'ਮਨਪਸੰਦ ਤੋਂ ਹਟਾਇਆ ਗਿਆ ਹੈ।',
    lineCopied: 'ਪੰਕਤੀ ਕਲਿੱਪਬੋਰਡ ਵਿੱਚ ਕਾਪੀ ਹੋ ਗਈ ਹੈ।',
    lineBookmarked: 'ਪੰਕਤੀ ਬੁੱਕਮਾਰਕ ਹੋ ਗਈ ਹੈ।',
    phraseSaved: 'ਪੰਕਤੀ ਦੁਹਰਾਈ ਲਈ ਸੰਭਾਲੀ ਗਈ ਹੈ।',
    phraseAlreadySaved: 'ਇਹ ਪੰਕਤੀ ਪਹਿਲਾਂ ਹੀ ਦੁਹਰਾਈ ਲਈ ਸੰਭਾਲੀ ਹੋਈ ਹੈ।',
    entryOutlineEyebrow: 'ਇਸ ਅੰਗ ਵਿੱਚ',
    entryOutlineBody: 'ਲੰਬੀ ਲਗਾਤਾਰ ਸਕ੍ਰੋਲ ਦੀ ਥਾਂ ਸਿੱਧੇ ਵੱਖ-ਵੱਖ ਸ਼ਬਦਾਂ ਤੇ ਜਾਓ।',
    hukamnamaEyebrow: 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ',
    hukamnamaBody: 'ਦਿਨ ਦੀ ਸ਼ੁਰੂਆਤ ਹੁਕਮਨਾਮੇ ਨਾਲ ਕਰੋ, ਫਿਰ ਚਾਹੋ ਤਾਂ ਮੂਲ ਸ਼ਬਦ ਦਾ ਪੂਰਾ ਸੰਦਰਭ ਖੋਲ੍ਹੋ।',
    sectionLabel: (index, total) => `ਸ਼ਬਦ ${index} / ${total}`,
    previousSection: 'ਪਿਛਲਾ ਸ਼ਬਦ',
    nextSection: 'ਅਗਲਾ ਸ਼ਬਦ',
    continueReading: 'ਪਾਠ ਜਾਰੀ ਰੱਖੋ',
    beginningOfReading: 'ਪਾਠ ਦੀ ਸ਼ੁਰੂਆਤ',
    endOfReading: 'ਪਾਠ ਸਮਾਪਤ',
    contextTitle: 'ਸੰਦਰਭ ਅਤੇ ਸਰੋਤ',
    contextSummary: 'ਇਸ ਪਾਠ ਲਈ ਇਤਿਹਾਸਕ, ਅਭਿਆਸ ਅਤੇ ਸਰੋਤ ਨੋਟ।',
  },
  hi: {
    shareCopied: 'शेयर करने के लिए क्लिपबोर्ड में कॉपी हो गया।',
    shareOpened: 'शेयर शीट खुल गई है।',
    shareUnavailable: 'शेयर शीट नहीं खुली। इसकी जगह क्लिपबोर्ड में कॉपी किया गया है।',
    bookmarkSaved: 'बुकमार्क सेव हो गया।',
    bookmarkRemoved: 'बुकमार्क हटा दिया गया।',
    bookmarkExists: 'यह अंश पहले से बुकमार्क किया हुआ है।',
    storageUnavailable: 'इस सत्र के लिए सेव है, लेकिन डिवाइस स्टोरेज उपलब्ध नहीं है। कुछ जगह खाली करके फिर कोशिश करें।',
    positionSessionOnly: 'आपका स्थान इस सत्र के लिए रखा है। यह डिवाइस उसे सहेज नहीं सका।',
    retryPosition: 'स्थान फिर सहेजें',
    savedOffline: 'लाइव स्रोत उपलब्ध न होने के कारण इस डिवाइस पर पहले से सहेजा पाठ दिखाया जा रहा है।',
    retainedReading: 'लाइव स्रोत उपलब्ध नहीं है। आपका खुला पाठ मौजूद है; ऑफ़लाइन सहेजे जाने की पुष्टि नहीं हो सकी।',
    tryLive: 'लाइव प्रति आज़माएँ',
    favoriteAdded: 'पसंदीदा में जोड़ दिया गया।',
    favoriteRemoved: 'पसंदीदा से हटा दिया गया।',
    lineCopied: 'पंक्ति क्लिपबोर्ड में कॉपी हो गई।',
    lineBookmarked: 'पंक्ति बुकमार्क हो गई।',
    phraseSaved: 'पंक्ति रिव्यू के लिए सेव हो गई।',
    phraseAlreadySaved: 'यह पंक्ति पहले से रिव्यू के लिए सेव है।',
    entryOutlineEyebrow: 'इस अंग पर',
    entryOutlineBody: 'एक लंबी लगातार स्क्रॉल के बजाय अलग-अलग शबदों के बीच सीधे जाएँ।',
    hukamnamaEyebrow: 'आज का हुकमनामा',
    hukamnamaBody: 'दिन को पहले हुकमनामे से ग्रहण करें, फिर चाहें तो मूल शबद का पूरा संदर्भ खोलें।',
    sectionLabel: (index, total) => `शबद ${index} / ${total}`,
    previousSection: 'पिछला शबद',
    nextSection: 'अगला शबद',
    continueReading: 'पाठ जारी रखें',
    beginningOfReading: 'पाठ की शुरुआत',
    endOfReading: 'पाठ समाप्त',
    contextTitle: 'संदर्भ और स्रोत',
    contextSummary: 'इस पाठ के ऐतिहासिक, अभ्यास और स्रोत नोट।',
  },
}

const BANI_SEQUENCE_COPY: Record<UiLocale, {
  entryOutlineEyebrow: string
  entryOutlineBody: string
  sectionLabel: (index: number, total: number) => string
  previousSection: string
  nextSection: string
}> = {
  en: {
    entryOutlineEyebrow: 'Reading Parts',
    entryOutlineBody: 'Move between the ordered parts of this bani while preserving the source sequence.',
    sectionLabel: (index, total) => `Part ${index} of ${total}`,
    previousSection: 'Previous part',
    nextSection: 'Next part',
  },
  pa: {
    entryOutlineEyebrow: 'ਪਾਠ ਦੇ ਭਾਗ',
    entryOutlineBody: 'ਇਸ ਬਾਣੀ ਦੇ ਮੂਲ ਕ੍ਰਮ ਨੂੰ ਕਾਇਮ ਰੱਖਦਿਆਂ ਇਸ ਦੇ ਭਾਗਾਂ ਵਿਚ ਜਾਓ।',
    sectionLabel: (index, total) => `ਭਾਗ ${index} / ${total}`,
    previousSection: 'ਪਿਛਲਾ ਭਾਗ',
    nextSection: 'ਅਗਲਾ ਭਾਗ',
  },
  hi: {
    entryOutlineEyebrow: 'पाठ के भाग',
    entryOutlineBody: 'स्रोत क्रम को बनाए रखते हुए इस बाणी के अलग-अलग भागों में जाएँ।',
    sectionLabel: (index, total) => `भाग ${index} / ${total}`,
    previousSection: 'पिछला भाग',
    nextSection: 'अगला भाग',
  },
}

const VAAR_SEQUENCE_COPY: typeof BANI_SEQUENCE_COPY = {
  en: {
    entryOutlineEyebrow: 'On This Vaar',
    entryOutlineBody: 'Jump to a Pauri in this continuous Vaar.',
    sectionLabel: (index, total) => `Pauri ${index} of ${total}`,
    previousSection: 'Previous Pauri',
    nextSection: 'Next Pauri',
  },
  pa: {
    entryOutlineEyebrow: 'ਇਸ ਵਾਰ ਵਿੱਚ',
    entryOutlineBody: 'ਲੰਬੀ ਲਗਾਤਾਰ ਸਕ੍ਰੋਲ ਦੀ ਥਾਂ ਇਸ ਵਾਰ ਦੀਆਂ ਪਉੜੀਆਂ ਵਿਚਕਾਰ ਜਾਓ।',
    sectionLabel: (index, total) => `ਪਉੜੀ ${index} / ${total}`,
    previousSection: 'ਪਿਛਲੀ ਪਉੜੀ',
    nextSection: 'ਅਗਲੀ ਪਉੜੀ',
  },
  hi: {
    entryOutlineEyebrow: 'इस वार में',
    entryOutlineBody: 'एक लंबी लगातार स्क्रॉल के बजाय इस वार की पौड़ियों के बीच जाएँ।',
    sectionLabel: (index, total) => `पौड़ी ${index} / ${total}`,
    previousSection: 'पिछली पौड़ी',
    nextSection: 'अगली पौड़ी',
  },
}

const FOCUSED_READER_COPY: Record<UiLocale, {
  openSettings: string
  closeSettings: string
  settingsDescription: string
  customize: string
  currentSettings: string
  length: string
  script: string
  readingLayers: string
  meaning: string
  punjabiSource: string
  hindiSource: string
  layout: string
  fontSize: string
  englishSource: string
  bookmarkDescription: string
  bookmarkNote: string
  cancel: string
  readingProgress: string
  gurbani: string
  hukamnama: string
  share: string
  addFavorite: string
  removeFavorite: string
  addBookmark: string
  removeBookmark: string
  presets: string
  textOnly: string
  studySupport: string
  largeType: string
}> = {
  en: {
    openSettings: 'Show reader controls',
    closeSettings: 'Close reader settings',
    settingsDescription: 'Adjust text size, script, translations, reading layers, and layout without leaving your place.',
    customize: 'Customize',
    currentSettings: 'Current reader settings',
    length: 'Length',
    script: 'Script',
    readingLayers: 'Reading layers',
    meaning: 'Meaning',
    punjabiSource: 'Punjabi teeka/source',
    hindiSource: 'Hindi source',
    layout: 'Layout',
    fontSize: 'Gurbani text size',
    englishSource: 'English translation source',
    bookmarkDescription: 'Add an optional note and save this passage without losing your reading position.',
    bookmarkNote: 'Bookmark note',
    cancel: 'Cancel',
    readingProgress: 'Reading progress',
    gurbani: 'Gurbani',
    hukamnama: 'Hukamnama',
    share: 'Share',
    addFavorite: 'Add favorite',
    removeFavorite: 'Remove favorite',
    addBookmark: 'Add bookmark',
    removeBookmark: 'Remove bookmark',
    presets: 'Quick reading presets',
    textOnly: 'Text only',
    studySupport: 'Study support',
    largeType: 'Large type',
  },
  pa: {
    openSettings: 'ਪਾਠਕ ਸੈਟਿੰਗਾਂ ਖੋਲ੍ਹੋ',
    closeSettings: 'ਪਾਠਕ ਸੈਟਿੰਗਾਂ ਬੰਦ ਕਰੋ',
    settingsDescription: 'ਆਪਣੀ ਥਾਂ ਗੁਆਏ ਬਿਨਾਂ ਲਿਖਤ ਦਾ ਆਕਾਰ, ਲਿਪੀ, ਅਰਥ, ਪਾਠ ਪਰਤਾਂ ਅਤੇ ਬਣਤਰ ਬਦਲੋ।',
    customize: 'ਬਦਲੋ',
    currentSettings: 'ਮੌਜੂਦਾ ਪਾਠਕ ਸੈਟਿੰਗਾਂ',
    length: 'ਲੰਬਾਈ',
    script: 'ਲਿਪੀ',
    readingLayers: 'ਪਾਠ ਪਰਤਾਂ',
    meaning: 'ਅਰਥ',
    punjabiSource: 'ਪੰਜਾਬੀ ਟੀਕਾ/ਸਰੋਤ',
    hindiSource: 'ਹਿੰਦੀ ਸਰੋਤ',
    layout: 'ਬਣਤਰ',
    fontSize: 'ਗੁਰਬਾਣੀ ਲਿਖਤ ਦਾ ਆਕਾਰ',
    englishSource: 'ਅੰਗਰੇਜ਼ੀ ਅਨੁਵਾਦ ਸਰੋਤ',
    bookmarkDescription: 'ਆਪਣੀ ਪੜ੍ਹਨ ਵਾਲੀ ਥਾਂ ਗੁਆਏ ਬਿਨਾਂ ਚਾਹੋ ਤਾਂ ਨੋਟ ਲਿਖ ਕੇ ਇਹ ਪਾਠ ਸੰਭਾਲੋ।',
    bookmarkNote: 'ਬੁੱਕਮਾਰਕ ਨੋਟ',
    cancel: 'ਰੱਦ ਕਰੋ',
    readingProgress: 'ਪਾਠ ਦੀ ਤਰੱਕੀ',
    gurbani: 'ਗੁਰਬਾਣੀ',
    hukamnama: 'ਹੁਕਮਨਾਮਾ',
    share: 'ਪਾਠ ਸਾਂਝਾ ਕਰੋ',
    addFavorite: 'ਮਨਪਸੰਦ ਵਿੱਚ ਜੋੜੋ',
    removeFavorite: 'ਮਨਪਸੰਦ ਤੋਂ ਹਟਾਓ',
    addBookmark: 'ਬੁੱਕਮਾਰਕ ਜੋੜੋ',
    removeBookmark: 'ਬੁੱਕਮਾਰਕ ਹਟਾਓ',
    presets: 'ਝਟਪਟ ਪਾਠ ਚੋਣਾਂ',
    textOnly: 'ਸਿਰਫ਼ ਪਾਠ',
    studySupport: 'ਸਿੱਖਣ ਸਹਾਇਤਾ',
    largeType: 'ਵੱਡੀ ਲਿਖਤ',
  },
  hi: {
    openSettings: 'रीडर सेटिंग खोलें',
    closeSettings: 'रीडर सेटिंग बंद करें',
    settingsDescription: 'अपनी जगह खोए बिना टेक्स्ट का आकार, लिपि, अनुवाद, पढ़ने की परतें और लेआउट बदलें।',
    customize: 'बदलें',
    currentSettings: 'मौजूदा रीडर सेटिंग',
    length: 'लंबाई',
    script: 'लिपि',
    readingLayers: 'पढ़ने की परतें',
    meaning: 'अर्थ',
    punjabiSource: 'पंजाबी टीका/स्रोत',
    hindiSource: 'हिंदी स्रोत',
    layout: 'लेआउट',
    fontSize: 'गुरबाणी टेक्स्ट का आकार',
    englishSource: 'अंग्रेज़ी अनुवाद स्रोत',
    bookmarkDescription: 'अपनी पढ़ने की जगह खोए बिना चाहें तो नोट जोड़कर यह अंश सेव करें।',
    bookmarkNote: 'बुकमार्क नोट',
    cancel: 'रद्द करें',
    readingProgress: 'पढ़ने की प्रगति',
    gurbani: 'गुरबाणी',
    hukamnama: 'हुकमनामा',
    share: 'पाठ शेयर करें',
    addFavorite: 'पसंदीदा जोड़ें',
    removeFavorite: 'पसंदीदा हटाएँ',
    addBookmark: 'बुकमार्क जोड़ें',
    removeBookmark: 'बुकमार्क हटाएँ',
    presets: 'त्वरित पढ़ने के विकल्प',
    textOnly: 'केवल पाठ',
    studySupport: 'अध्ययन सहायता',
    largeType: 'बड़ा टेक्स्ट',
  },
}

export default function Study() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { scriptureId } = useParams<{ scriptureId: string }>()
  const locale = useLocaleStore(s => s.locale)
  const copy = getUiCopy(locale)
  const editorial = getEditorialCopy(locale)
  const commonCopy = copy.common
  const studyCopy = copy.study
  const lineSpacingLabels = getLineSpacingLabels(locale)
  const englishSourceLabels = getEnglishSourceLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const punjabiSourceLabels = getPunjabiSourceLabels(locale)
  const hindiSourceLabels = getHindiSourceLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)
  const readerScriptModeLabels = {
    ...scriptModeLabels,
    devanagari: locale === 'pa' ? 'ਦੇਵਨਾਗਰੀ' : locale === 'hi' ? 'देवनागरी' : 'Devanagari',
  }
  const textAlignmentLabels = getTextAlignmentLabels(locale)
  const visraamSourceLabels = getVisraamSourceLabels(locale)
  const focusedReaderCopy = FOCUSED_READER_COPY[locale]
  const themeMode = useThemeStore(state => state.mode)
  const setThemeMode = useThemeStore(state => state.setMode)

  let source = searchParams.get('source') as BaniSource | null
  let angParam = Number(searchParams.get('ang')) || null
  const baniName = searchParams.get('bani')
  const baniIdParam = searchParams.get('baniId')
  const sgLengthParam = normalizeSundarGutkaLength(searchParams.get('sgLength'))
  const startAngParam = Number(searchParams.get('startAng')) || null
  const endAngParam = Number(searchParams.get('endAng')) || null
  const shabadIdParam = Number(searchParams.get('shabadId')) || null
  const verseIdParam = Number(searchParams.get('verseId')) || null
  const resumeVerseIdParam = Number(searchParams.get('resumeVerseId')) || null
  const resumeVerseSourceParam = searchParams.get('resumeSource')
  const baniDbIdParam = Number(searchParams.get('baniDbId')) || null
  const hukamnamaDateParam = searchParams.get('hukamnamaDate')
  const flowParam = searchParams.get('flow')
  const randomHukamnamaAngParam = Number(searchParams.get('randomHukamnamaAng')) || null
  const fromParam = searchParams.get('from')
  const akHeaderIdParam = Number(searchParams.get('akHeaderId')) || null
  const akSectionParam = Number(searchParams.get('akSection')) || null
  const akItemParam = Number(searchParams.get('akItem')) || null
  const akPageParam = Number(searchParams.get('akPage')) || null

  if ((!source || !angParam) && scriptureId && !shabadIdParam && !baniDbIdParam) {
    const parts = scriptureId.split('-')
    if (parts.length >= 2) {
      source = parts[0] as BaniSource
      angParam = Number(parts[1]) || null
    }
  }

  const supportedSundarGutkaBaniId =
    asSupportedSundarGutkaBaniId(baniIdParam)
    ?? getSupportedSundarGutkaBaniIdByBaniDbId(baniDbIdParam)
  const supportedSundarGutkaBani = supportedSundarGutkaBaniId
    ? findCanonicalBaniById(supportedSundarGutkaBaniId)
    : null
  const sundarGutkaLengths = useSundarGutkaLengthStore(state => state.lengths)
  const setSundarGutkaLength = useSundarGutkaLengthStore(state => state.setLength)
  const rememberedSgLength = supportedSundarGutkaBaniId
    ? sundarGutkaLengths[supportedSundarGutkaBaniId]
    : null
  const legacySgLength = inferLegacySundarGutkaLength({
    baniId: supportedSundarGutkaBaniId,
    baniName,
  })
  const requestedSgLength = supportedSundarGutkaBaniId
    ? (sgLengthParam
      ?? legacySgLength
      ?? rememberedSgLength
      ?? SUNDAR_GUTKA_SUPPORTED_BANIS[supportedSundarGutkaBaniId].defaultLength)
    : null

  const isExactShabadMode = shabadIdParam !== null
  const isBaniDbMode = baniDbIdParam !== null
  const isHukamnamaMode = Boolean(hukamnamaDateParam)
  const isArdaasHukamnamaFlow = flowParam === 'ardaas-hukamnama'
  const isRandomHukamnamaMode =
    isArdaasHukamnamaFlow
    && isExactShabadMode
    && randomHukamnamaAngParam !== null
  const isArdaasReaderFlow =
    isArdaasHukamnamaFlow
    && isBaniDbMode
    && baniDbIdParam === 24
    && !isRandomHukamnamaMode
  const isBaniRangeMode = baniName !== null && endAngParam !== null && source !== null && angParam !== null
  const isAngMode = source !== null && angParam !== null && !isExactShabadMode && !isBaniDbMode && !isHukamnamaMode
  const isApiMode = isAngMode || isExactShabadMode || isBaniDbMode || isHukamnamaMode
  const shouldTrackProgress = !isArdaasHukamnamaFlow
  const searchParamsString = searchParams.toString()
  const resumeSettledRef = useRef<string | null>(null)
  const fallbackRetryAnchorRef = useRef<{ route: string; verseId: number; source?: string; anchor: ReaderAnchor } | null>(null)

  useEffect(() => {
    if (!isApiMode) navigate('/banis', { replace: true })
  }, [isApiMode, navigate])

  const angResult = useAng(
    isAngMode ? angParam! : 1,
    isAngMode ? source! : 'G'
  )
  const beforeBaniRefresh = useRef<(() => void) | null>(null)
  const lengthSelection = useBaniLengthSelection(searchParamsString)
  const baniResult = useBani(isBaniDbMode ? baniDbIdParam! : null, requestedSgLength, () => beforeBaniRefresh.current?.(), lengthSelection.preparedReading)
  const shabadResult = useShabad(isExactShabadMode ? shabadIdParam! : null)
  const hukamnamaResult = useHukamnama(hukamnamaDateParam, isHukamnamaMode)
  const { addBookmark, removeBookmark, bookmarks, hasBookmark } = useBookmarksStore()
  const { addFavorite, removeFavorite, favorites } = useFavoritesStore()
  const effectiveSgLength = supportedSundarGutkaBaniId
    ? (baniResult.resolvedLength ?? requestedSgLength)
    : null

  useEffect(() => {
    if (!isBaniDbMode || isExactShabadMode || isHukamnamaMode || !supportedSundarGutkaBaniId || !supportedSundarGutkaBani || !effectiveSgLength) return

    const nextParams = new URLSearchParams(searchParamsString)
    const currentAng = angParam ?? startAngParam ?? supportedSundarGutkaBani.startAng
    const nextName = SUNDAR_GUTKA_SUPPORTED_BANIS[supportedSundarGutkaBaniId].name
    const nextBaniDbId = String(SUNDAR_GUTKA_SUPPORTED_BANIS[supportedSundarGutkaBaniId].baniDbId)

    nextParams.set('source', supportedSundarGutkaBani.source)
    nextParams.set('ang', String(currentAng))
    nextParams.set('startAng', String(supportedSundarGutkaBani.startAng))
    nextParams.set('endAng', String(supportedSundarGutkaBani.endAng))
    nextParams.set('bani', nextName)
    nextParams.set('baniId', supportedSundarGutkaBaniId)
    nextParams.set('baniDbId', nextBaniDbId)
    nextParams.set('exactBani', '1')
    nextParams.set('sgLength', effectiveSgLength)

    if (nextParams.toString() !== searchParamsString) {
      setSearchParams(nextParams, { replace: true, state: location.state })
    }
  }, [
    angParam,
    effectiveSgLength,
    isBaniDbMode,
    isExactShabadMode,
    isHukamnamaMode,
    location.state,
    searchParamsString,
    setSearchParams,
    startAngParam,
    supportedSundarGutkaBani,
    supportedSundarGutkaBaniId,
  ])

  const baniPageEntries = useMemo(() => {
    if (!isBaniDbMode || baniResult.entries.length === 0) return []
    return baniResult.entries
  }, [baniResult.entries, isBaniDbMode])
  const availableSundarGutkaLengths = useMemo(() => {
    if (!supportedSundarGutkaBaniId || !effectiveSgLength) return []

    const available = baniResult.availableLengths.length > 0
      ? baniResult.availableLengths
      : [effectiveSgLength]

    return SUNDAR_GUTKA_LENGTH_ORDER.filter(length => available.includes(length))
  }, [baniResult.availableLengths, effectiveSgLength, supportedSundarGutkaBaniId])
  const currentSundarGutkaLengthLabel = supportedSundarGutkaBaniId && effectiveSgLength
    ? SUNDAR_GUTKA_LENGTH_LABELS[effectiveSgLength]
    : null

  const requestedSavedPath = searchParamsString ? `/study?${searchParamsString}` : '/study'
  const requestedSavedIdentity = getSavedReturnIdentity(requestedSavedPath)
  const savedFallback = useMemo(() => {
    const candidates = [
      ...bookmarks.filter(isScriptureBookmark),
      ...favorites,
    ].sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))

    const saved = candidates.find(item => {
      const savedIdentity = getSavedReturnIdentity(item.returnPath)
      if (savedIdentity && requestedSavedIdentity) return savedIdentity === requestedSavedIdentity
      if (requestedSavedIdentity && !canUseLegacySavedLocationFallback(requestedSavedPath)) return false

      if (shabadIdParam) {
        if (item.shabadId !== shabadIdParam) return false
        return !verseIdParam || item.verseId === verseIdParam
      }

      return Boolean(source && angParam && item.source === source && item.ang === angParam)
    })

    if (!saved) return null
    const entry = buildSavedExcerptEntry(saved)
    if (!entry) return null

    return {
      entry,
      returnPath: isSafeSavedReturnPath(saved.returnPath) ? saved.returnPath : requestedSavedPath,
    }
  }, [angParam, bookmarks, favorites, requestedSavedIdentity, requestedSavedPath, shabadIdParam, source, verseIdParam])
  const savedFallbackEntry = savedFallback?.entry ?? null
  const savedFallbackReturnPath = savedFallback?.returnPath ?? requestedSavedPath

  const fullShabadEntry = isExactShabadMode
    ? (shabadResult.entries[0] ?? (shabadResult.error ? savedFallbackEntry : null))
    : null
  const exactEntries = useMemo(() => {
    if (!isExactShabadMode || !fullShabadEntry) return []
    if (!verseIdParam) return [fullShabadEntry]

    const matchedLines = fullShabadEntry.lines?.filter(line => line.verseId === verseIdParam) ?? []
    if (matchedLines.length === 0) return [fullShabadEntry]

    return [sliceEntryToLines(fullShabadEntry, matchedLines)]
  }, [fullShabadEntry, isExactShabadMode, verseIdParam])

  const entries = useMemo(() => {
    if (isHukamnamaMode) return hukamnamaResult.data
      ? [hukamnamaResult.data.entry]
      : hukamnamaResult.error && savedFallbackEntry
        ? [savedFallbackEntry]
        : []
    if (isExactShabadMode) return exactEntries
    if (isBaniDbMode) return baniPageEntries.length > 0
      ? baniPageEntries
      : baniResult.error && savedFallbackEntry
        ? [savedFallbackEntry]
        : []
    if (isAngMode) return angResult.entries.length > 0
      ? angResult.entries
      : angResult.error && savedFallbackEntry
        ? [savedFallbackEntry]
        : []
    return []
  }, [angResult.entries, angResult.error, baniPageEntries, baniResult.error, exactEntries, hukamnamaResult.data, hukamnamaResult.error, isAngMode, isBaniDbMode, isExactShabadMode, isHukamnamaMode, savedFallbackEntry])

  const loading =
    isHukamnamaMode ? hukamnamaResult.loading :
    isExactShabadMode ? shabadResult.loading :
    isBaniDbMode ? baniResult.loading :
    angResult.loading

  const error =
    isHukamnamaMode ? hukamnamaResult.error :
    isExactShabadMode ? shabadResult.error :
    isBaniDbMode ? baniResult.error :
    angResult.error
  const liveReaderStatus =
    isHukamnamaMode ? hukamnamaResult.status :
    isExactShabadMode ? shabadResult.status :
    isBaniDbMode ? baniResult.status :
    angResult.status
  const usingSavedFallback = Boolean(savedFallbackEntry && entries.some(entry => entry.id === savedFallbackEntry.id))
  const readerStatus = usingSavedFallback ? 'degraded' : liveReaderStatus

  const [activeEntryIndex, setActiveEntryIndex] = useState(0)
  const safeActiveEntryIndex = Math.max(0, Math.min(activeEntryIndex, entries.length - 1))
  const currentEntry = entries[safeActiveEntryIndex] ?? null
  const renderedEntries = useMemo(() => entries.map((entry, entryIndex) => ({ entry, entryIndex })), [entries])

  useEffect(() => {
    const resumeIndex = resumeVerseIdParam
      ? entries.findIndex(entry => (!resumeVerseSourceParam || entry.source === resumeVerseSourceParam)
        && entry.lines?.some(line => line.verseId === resumeVerseIdParam))
      : -1
    setActiveEntryIndex(resumeIndex >= 0 ? resumeIndex : 0)
  }, [entries, resumeVerseIdParam, resumeVerseSourceParam, searchParamsString])

  const currentAng = currentEntry?.ang ?? angParam ?? baniResult.entries[0]?.ang ?? null
  const currentSource = (currentEntry?.source ?? source ?? 'G') as BaniSource
  // A composite bani can cross scriptures; its saved reading identity must remain canonical.
  const resumeSource = isBaniDbMode
    ? (supportedSundarGutkaBani?.source ?? source ?? baniResult.entries[0]?.source ?? currentSource)
    : currentSource
  const currentReadingUnit = getSourceReaderUnit(currentSource, currentEntry?.scripture)
  const currentShabadId = currentEntry ? (parseShabadId(currentEntry) ?? undefined) : undefined
  const englishSource = useLanguageStore(s => s.englishSource)
  const setEnglishSource = useLanguageStore(s => s.setEnglishSource)
  const fontSize = useLanguageStore(s => s.fontSize)
  const setFontSize = useLanguageStore(s => s.setFontSize)
  const supportTextSize = useLanguageStore(s => s.supportTextSize)
  const setSupportTextSize = useLanguageStore(s => s.setSupportTextSize)
  const punjabiSource = useLanguageStore(s => s.punjabiSource)
  const setPunjabiSource = useLanguageStore(s => s.setPunjabiSource)
  const hindiSource = useLanguageStore(s => s.hindiSource)
  const setHindiSource = useLanguageStore(s => s.setHindiSource)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const setScriptMode = useLanguageStore(s => s.setScriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const setShowTransliteration = useLanguageStore(s => s.setShowTransliteration)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const setMeaningLanguage = useLanguageStore(s => s.setMeaningLanguage)
  const larivaar = useLanguageStore(s => s.larivaar)
  const setLarivaar = useLanguageStore(s => s.setLarivaar)
  const showVishraam = useLanguageStore(s => s.showVishraam)
  const setShowVishraam = useLanguageStore(s => s.setShowVishraam)
  const visraamSource = useLanguageStore(s => s.visraamSource)
  const setVisraamSource = useLanguageStore(s => s.setVisraamSource)
  const lineSpacing = useLanguageStore(s => s.lineSpacing)
  const setLineSpacing = useLanguageStore(s => s.setLineSpacing)
  const textAlign = useLanguageStore(s => s.textAlign)
  const setTextAlign = useLanguageStore(s => s.setTextAlign)

  const updateSession = useProgressStore(state => state.updateSession)
  const [positionSessionOnly, setPositionSessionOnly] = useState(Boolean((location.state as { nitnemSessionOnly?: boolean } | null)?.nitnemSessionOnly))
  const explorationRef = useRef<{ route: string; anchor: ReaderAnchor } | null>(null)
  const [hasExploration, setHasExploration] = useState(false)
  const sectionsOriginRef = useRef<ReaderAnchor | null>(null)
  const persistReadingSession = useCallback((session: Session) => {
    if (explorationRef.current?.route === searchParamsString) return true
    const sessionPersisted = updateSession(session)
    let practicePersisted = true
    const practice = useNitnemPracticeStore.getState()
    if (practice.active && isActiveNitnemPracticeReading(session.resumePath, practice.active)) {
      const params = new URLSearchParams(session.resumePath.split('?')[1])
      if (session.resumeVerseId) params.set('resumeVerseId', String(session.resumeVerseId))
      practicePersisted = practice.updatePath(`/study?${params}`)
    }
    const persisted = sessionPersisted && practicePersisted
    if (!persisted) setPositionSessionOnly(true)
    else if (session.resumeVerseId && session.resumeVerseId > 0) setPositionSessionOnly(false)
    return persisted
  }, [searchParamsString, updateSession])
  const recordSwipeToday = useProgressStore(state => state.recordSwipeToday)
  const markStudied = useProgressStore(state => state.markStudied)
  const { addWord, vocab } = useVocabStore()
  const persistedPhraseWords = useMemo(() => new Set(vocab
    .filter(item => item.kind === 'phrase' && isVocabEntryPersisted(item.word, 'phrase'))
    .map(item => item.word)), [vocab])
  const { recordAng } = useReadingProgressStore()
  const studyExperienceCopy = STUDY_EXPERIENCE_COPY[locale]
  const entrySequenceCopy = isBaniDbMode
    ? BANI_SEQUENCE_COPY[locale]
    : currentSource === 'B'
      ? VAAR_SEQUENCE_COPY[locale]
      : studyExperienceCopy
  const [showBookmarkForm, setShowBookmarkForm] = useState(false)
  const [bookmarkText, setBookmarkText] = useState('')
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [shareHighlightContent, setShareHighlightContent] = useState<ShareHighlightSheetContent | null>(null)
  const [isTakingHukamnama, setIsTakingHukamnama] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [appearancePreview, setAppearancePreview] = useState<ScriptureLine | null>(null)
  const [readerMenuOpen, setReaderMenuOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(false)
  const contentsScrollRef = useRef<HTMLDivElement | null>(null)
  const contentsHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const findIdentity = JSON.stringify([
    source, baniIdParam, baniDbIdParam, startAngParam, endAngParam, sgLengthParam,
    shabadIdParam, hukamnamaDateParam, flowParam, randomHukamnamaAngParam,
    // The visible Ang and incoming verse can move within one bani.
    isBaniDbMode || isBaniRangeMode ? null : angParam,
  ])
  const findSession = useRef({ identity: findIdentity, scrollTop: 0 })
  const [findQuery, setFindQuery] = useState('')
  if (findSession.current.identity !== findIdentity) {
    findSession.current = { identity: findIdentity, scrollTop: 0 }
    setFindQuery('')
  }
  useEffect(() => {
    if (!sectionsOpen) return
    const frame = requestAnimationFrame(() => {
      const scroller = contentsScrollRef.current
      if (!scroller) return
      if (findQuery.trim()) {
        scroller.scrollTop = findSession.current.scrollTop
        return
      }
      const current = scroller.querySelector<HTMLElement>('[aria-current="location"]')
      if (!current) return
      const bounds = scroller.getBoundingClientRect()
      const row = current.getBoundingClientRect()
      // Move only this sheet's scroller, never the scripture behind it.
      scroller.scrollTop += row.top - bounds.top - Math.max(8, (bounds.height - row.height) / 2)
    })
    return () => cancelAnimationFrame(frame)
  }, [sectionsOpen, findQuery])
  const [lengthOpen, setLengthOpen] = useState(false)
  const lengthAnchorRef = useRef<ReaderAnchor | null>(null)
  const lengthDestinationRef = useRef<{ origin: string; reading: BaniFetchResult; destination: BaniLengthDestination } | null>(null)
  const lengthOpenerRef = useRef<HTMLElement | null>(null)
  const wakeLock = useReaderWakeLock(entries.length > 0)
  const [exploredWord, setExploredWord] = useState<ReaderWordContext | null>(null)
  const [interactionRoute, setInteractionRoute] = useState(searchParamsString)
  if (interactionRoute !== searchParamsString) {
    setInteractionRoute(searchParamsString)
    setExploredWord(null)
    setReaderMenuOpen(false)
    setSectionsOpen(false)
    setLengthOpen(false)
    setHasExploration(false)
    explorationRef.current = null
    setControlsOpen(false)
    setShowBookmarkForm(false)
    setShareHighlightContent(null)
  }
  const readerSheetOpen = controlsOpen || sectionsOpen || lengthOpen || readerMenuOpen || showBookmarkForm || Boolean(exploredWord) || Boolean(shareHighlightContent)
  const { presentation, changePresentation, rememberReadingPosition, discardReadingPosition } = useReaderPresentation(searchParamsString, readerSheetOpen, isBaniDbMode ? baniResult.entries : null)
  useEffect(() => { beforeBaniRefresh.current = () => {
    // The cached opening viewport must not replace an authoritative incoming verse.
    if (resumeVerseIdParam && resumeSettledRef.current !== searchParamsString) return
    rememberReadingPosition()
  } })
  const readerInteraction = useReaderInteraction(searchParamsString, readerSheetOpen)
  const changeReaderPresentation = (mode: ReaderPresentation) => { readerInteraction.clearWord(); changePresentation(mode) }
  const presentationCopy = locale === 'pa'
    ? { read: 'ਪਾਠ', study: 'ਅਧਿਐਨ', sections: 'ਪਾਠ ਦੇ ਭਾਗ', jump: 'ਪਾਠ ਦੇ ਭਾਗ', tools: 'ਪਾਠ ਦੇ ਸਾਧਨ', listen: 'ਸੁਣੋ', close: 'ਬੰਦ ਕਰੋ', position: 'ਪਾਠ ਵਿੱਚ ਸਥਾਨ' }
    : locale === 'hi'
      ? { read: 'पाठ', study: 'अध्ययन', sections: 'पाठ के भाग', jump: 'पाठ के भाग', tools: 'पाठ के साधन', listen: 'सुनें', close: 'बंद करें', position: 'पाठ में स्थान' }
      : { read: 'Read', study: 'Study', sections: 'Contents', jump: 'Contents', tools: 'Reading tools', listen: 'Listen', close: 'Close', position: 'Reading position' }
  const readerMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const readerToolsOpenerRef = useRef<HTMLButtonElement | null>(null)
  const openReaderTools = (trigger: HTMLButtonElement) => {
    readerToolsOpenerRef.current = trigger
    setReaderMenuOpen(true)
  }
  const readerFocusFrames = useRef(new Set<number>())
  useEffect(() => () => {
    readerFocusFrames.current.forEach(frame => cancelAnimationFrame(frame))
    readerFocusFrames.current.clear()
  }, [searchParamsString])
  const deferReaderFocus = (callback: () => void, frames = 1) => {
    const schedule = (remaining: number) => {
      const frame = requestAnimationFrame(() => {
        readerFocusFrames.current.delete(frame)
        if (remaining > 1) schedule(remaining - 1)
        else callback()
      })
      readerFocusFrames.current.add(frame)
    }
    schedule(frames)
  }
  const closeReaderAppearance = () => {
    setControlsOpen(false)
    deferReaderFocus(() => {
      const active = document.activeElement
      if (active instanceof HTMLElement && active !== document.body && !active.closest('[inert],[hidden]')) return
      const target = document.querySelector<HTMLButtonElement>('.reader-dock:not([hidden]) .reader-dock__actions button')
        ?? document.querySelector<HTMLButtonElement>('.study-reader-topbar .study-reader-settings-action')
      target?.focus({ preventScroll: true })
    }, 2)
  }
  const bookmarkInputRef = useRef<HTMLInputElement | null>(null)
  const shareHighlightReturnFocusRef = useRef<HTMLElement | null>(null)
  const actionNoticeTimeoutRef = useRef<number | null>(null)
  const latestResumeVerseIdRef = useRef<number | null>(null)
  const syncReadingPlaceRef = useRef<((force?: boolean) => boolean | undefined) | null>(null)
  const readerProgressTrackRef = useRef<HTMLDivElement | null>(null)
  const readerProgressBarRef = useRef<HTMLSpanElement | null>(null)
  const canonicalResumePath = useMemo(() => {
    if (!shouldTrackProgress) return null

    if (isHukamnamaMode && hukamnamaDateParam) {
      return `/study?hukamnamaDate=${hukamnamaDateParam}`
    }

    if (!currentAng) return null

    const nextParams = new URLSearchParams()
    nextParams.set('source', resumeSource)
    nextParams.set('ang', String(currentAng))

    if (isBaniDbMode || isBaniRangeMode) {
      const startAng = startAngParam ?? angParam ?? currentAng

      nextParams.set('startAng', String(startAng))

      if (endAngParam) nextParams.set('endAng', String(endAngParam))
      if (baniName) nextParams.set('bani', baniName)
      if (baniIdParam) nextParams.set('baniId', baniIdParam)
      if (baniDbIdParam) nextParams.set('baniDbId', String(baniDbIdParam))
      if (isBaniDbMode) nextParams.set('exactBani', '1')
      if (effectiveSgLength) nextParams.set('sgLength', effectiveSgLength)
      if (isBaniDbMode && currentEntry?.source) nextParams.set('resumeSource', currentEntry.source)
      const practiceMarker = new URLSearchParams(searchParamsString).get('nitnemPractice')
      if (practiceMarker) nextParams.set('nitnemPractice', practiceMarker)
    }

    const nextSearch = nextParams.toString()
    return nextSearch ? `/study?${nextSearch}` : '/study'
  }, [
    angParam,
    baniDbIdParam,
    baniIdParam,
    baniName,
    currentAng,
    resumeSource,
    effectiveSgLength,
    endAngParam,
    hukamnamaDateParam,
    isBaniDbMode,
    isBaniRangeMode,
    isHukamnamaMode,
    shouldTrackProgress,
    startAngParam,
    searchParamsString,
    currentEntry,
  ])

  const baseSession = useMemo(() => {
    if (!shouldTrackProgress || !currentAng || !canonicalResumePath) return null

    return {
      scriptureId: `${currentSource}-${currentAng}`,
      resumePath: canonicalResumePath,
    }
  }, [canonicalResumePath, currentAng, currentSource, shouldTrackProgress])

  const latestBaseSessionRef = useRef(baseSession)
  latestBaseSessionRef.current = baseSession
  useEffect(() => { latestResumeVerseIdRef.current = null; resumeSettledRef.current = null; fallbackRetryAnchorRef.current = null }, [searchParamsString])

  useEffect(() => {
    if (!baseSession || (resumeVerseIdParam && resumeSettledRef.current !== searchParamsString)) return

    persistReadingSession({
      ...baseSession,
      ...(latestResumeVerseIdRef.current ? { resumeVerseId: latestResumeVerseIdRef.current } : {}),
      updatedAt: new Date().toISOString(),
    })
  }, [baseSession, resumeVerseIdParam, searchParamsString, persistReadingSession])

  useEffect(() => {
    if (!shouldTrackProgress || (loading && entries.length === 0) || typeof window === 'undefined') return

    const verseElements = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="study-line"][data-verse-id]')).filter(element => Number(element.dataset.verseId) > 0)
    let initialSyncFrame: number | null = null
    let resizeIdleTimeout: number | null = null

    const syncVisibleVerse = (force = false) => {
      if (resumeVerseIdParam && resumeSettledRef.current !== searchParamsString) return
      const session = latestBaseSessionRef.current
      if (!session || verseElements.length === 0) return
      const topOffset = getReaderViewportTop()
      // Measure settled geometry directly so a stale observer or preceding heading cannot win a section jump.
      const target = findVisibleReaderLine(verseElements)
        ?? getReaderBodyLines(verseElements).find(element => element.getBoundingClientRect().bottom > topOffset)
        ?? getReaderBodyLines(verseElements)[0]
      if (!target) return
      const entryId = target.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId
      const visibleEntryIndex = entries.findIndex(entry => entry.id === entryId)
      if (visibleEntryIndex >= 0) setActiveEntryIndex(visibleEntryIndex)
      const nextVerseId = Number(target.dataset.verseId) || null

      if (!nextVerseId || (!force && nextVerseId === latestResumeVerseIdRef.current)) return

      const previousVerseId = latestResumeVerseIdRef.current
      latestResumeVerseIdRef.current = nextVerseId
      const visibleEntry = visibleEntryIndex >= 0 ? entries[visibleEntryIndex] : null
      const resumeParams = new URLSearchParams(session.resumePath.split('?')[1] ?? '')
      if (visibleEntry && !isHukamnamaMode) {
        resumeParams.set('ang', String(visibleEntry.ang))
        if (!isBaniDbMode) resumeParams.set('source', visibleEntry.source ?? currentSource)
        else if (visibleEntry.source) resumeParams.set('resumeSource', visibleEntry.source)
      }
      const persisted = persistReadingSession({
        ...session,
        ...(visibleEntry ? { scriptureId: `${visibleEntry.source ?? currentSource}-${visibleEntry.ang}`, resumePath: `/study?${resumeParams.toString()}` } : {}),
        resumeVerseId: nextVerseId,
        updatedAt: new Date().toISOString(),
      })

      if (previousVerseId !== null && previousVerseId !== nextVerseId) {
        const entryId = target.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId
        const studiedEntry = entries.find(entry => entry.id === entryId)
        if (studiedEntry) {
          const cache = useScriptureCacheStore.getState()
          try {
            cache.setStudyEntry(studiedEntry)
          } catch { /* Optional recent-reading persistence must not interrupt reading or leaving the reader. */ }
          markStudied(studiedEntry.id)
        }
      }
      return persisted
    }
    syncReadingPlaceRef.current = syncVisibleVerse

    const syncAfterResizeSettles = () => {
      if (resizeIdleTimeout !== null) window.clearTimeout(resizeIdleTimeout)
      resizeIdleTimeout = window.setTimeout(() => {
        resizeIdleTimeout = null
        syncVisibleVerse()
      }, 180)
    }

    initialSyncFrame = window.requestAnimationFrame(() => {
      initialSyncFrame = null
      syncVisibleVerse()
    })
    const removeSettledScrollListener = addAppScrollSettledListener(() => { syncVisibleVerse() })
    window.addEventListener('resize', syncAfterResizeSettles)
    const syncBeforeSuspension = () => {
      if (document.visibilityState === 'hidden') syncVisibleVerse()
    }
    const syncBeforePageHide = () => { syncVisibleVerse() }
    // Suspension may stop momentum, timers, and animation frames before scrollend.
    window.addEventListener('pagehide', syncBeforePageHide)
    document.addEventListener('visibilitychange', syncBeforeSuspension)

    return () => {
      if (initialSyncFrame !== null) window.cancelAnimationFrame(initialSyncFrame)
      if (resizeIdleTimeout !== null) window.clearTimeout(resizeIdleTimeout)
      removeSettledScrollListener()
      if (syncReadingPlaceRef.current === syncVisibleVerse) syncReadingPlaceRef.current = null
      window.removeEventListener('resize', syncAfterResizeSettles)
      window.removeEventListener('pagehide', syncBeforePageHide)
      document.removeEventListener('visibilitychange', syncBeforeSuspension)
    }
  }, [currentSource, entries, isBaniDbMode, isHukamnamaMode, loading, markStudied, resumeVerseIdParam, searchParamsString, shouldTrackProgress, persistReadingSession])

  useEffect(() => {
    const retryAnchor = fallbackRetryAnchorRef.current?.route === searchParamsString ? fallbackRetryAnchorRef.current : null
    const requestedResumeVerseId = retryAnchor?.verseId ?? resumeVerseIdParam
    const requestedResumeSource = retryAnchor?.source ?? resumeVerseSourceParam
    if (!requestedResumeVerseId || loading || entries.length === 0 || typeof window === 'undefined' || resumeSettledRef.current === searchParamsString) return

    let cancelled = false
    let userInteracted = false
    let timeoutId: number | null = null
    let fontFrameId: number | null = null
    let frameId: number | null = null
    const intentEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    const removeIntentListeners = () => {
      for (const type of intentEvents) window.removeEventListener(type, cancelFontAlignment, true)
    }
    const cancelFontAlignment = (event: Event) => {
      // Retry and leaving the reader preserve an incoming place that has not aligned yet.
      if (resumeSettledRef.current !== searchParamsString && event.target instanceof Element
        && event.target.closest('[data-ai-action="retry-study"], [data-ai-action="retry-reading-position"], [data-reader-back]')) return
      userInteracted = true
      resumeSettledRef.current = searchParamsString
      fallbackRetryAnchorRef.current = null
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = null
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      timeoutId = null
      if (fontFrameId !== null) window.cancelAnimationFrame(fontFrameId)
      fontFrameId = null
      removeIntentListeners()
      syncReadingPlaceRef.current?.()
    }
    for (const type of intentEvents) window.addEventListener(type, cancelFontAlignment, { capture: true, passive: true })

    const scrollToResumeVerse = () => {
      if (cancelled || userInteracted) return false
      const targets = Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="study-line"][data-verse-id="${requestedResumeVerseId}"]`))
      const target = requestedResumeSource ? targets.find(element => {
        const entryId = element.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId
        return entries.find(entry => entry.id === entryId)?.source === requestedResumeSource
      }) : targets[0]
      if (!target) return false

      const alignTarget = () => {
        discardReadingPosition()
        if (retryAnchor && target.dataset.readerAnchor) restoreReaderAnchor({ ...retryAnchor.anchor, key: target.dataset.readerAnchor })
        else {
          scrollElementIntoAppView(target, { behavior: 'auto', block: 'start' })
          const toolbar = document.querySelector<HTMLElement>('.study-reader-topbar')
          // Touch headers scroll with the document. Native scroll-margin still
          // reserves their old height; resume against the actual reading edge
          // once that header is outside the viewport.
          if (target.dataset.readerAnchor && toolbar && getComputedStyle(toolbar).position === 'absolute'
            && toolbar.getBoundingClientRect().bottom <= getAppViewportBounds().top) {
            restoreReaderAnchor({ key: target.dataset.readerAnchor, fraction: 0, viewportTop: getReaderViewportTop() })
          }
        }
      }
      alignTarget()
      const finishAlignment = () => {
        if (cancelled || userInteracted) return
        // A short saved excerpt may align now, but full scripture still has to
        // restore the same verse later. Until font/header reflow settles, the
        // incoming verse remains authoritative over automatic scroll events.
        if (!usingSavedFallback) {
          resumeSettledRef.current = searchParamsString
          fallbackRetryAnchorRef.current = null
          removeIntentListeners()
        }
      }
      const entryId = target.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId
      const entryIndex = entries.findIndex(entry => entry.id === entryId)
      const entry = entries[entryIndex]
      const session = latestBaseSessionRef.current
      if (shouldTrackProgress && entry && session) {
        latestResumeVerseIdRef.current = requestedResumeVerseId
        setActiveEntryIndex(entryIndex)
        const params = new URLSearchParams(session.resumePath.split('?')[1] ?? '')
        if (!isHukamnamaMode) {
          params.set('ang', String(entry.ang))
          if (!isBaniDbMode) params.set('source', entry.source ?? currentSource)
          else if (entry.source) params.set('resumeSource', entry.source)
        }
        persistReadingSession({
          ...session,
          scriptureId: `${entry.source ?? currentSource}-${entry.ang}`,
          resumePath: `/study?${params.toString()}`,
          resumeVerseId: requestedResumeVerseId,
          updatedAt: new Date().toISOString(),
        })
      }
      // Read this promise after mounting and measuring the actual scripture.
      // An earlier fonts.ready may have resolved before Gurmukhi was requested.
      const mountedFontsReady = document.fonts?.ready
      if (!mountedFontsReady) { finishAlignment(); return true }
      void mountedFontsReady.then(() => {
        if (cancelled || userInteracted) return
        fontFrameId = window.requestAnimationFrame(() => {
          fontFrameId = null
          if (cancelled || userInteracted || !target.isConnected) return
          alignTarget()
          // Header measurement can update reserved space on the same frame as
          // font completion. Align once more after that layout has committed.
          fontFrameId = window.requestAnimationFrame(() => {
            fontFrameId = null
            if (cancelled || userInteracted || !target.isConnected) return
            alignTarget()
            finishAlignment()
          })
        })
      }).catch(finishAlignment)
      return true
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = null
      if (!scrollToResumeVerse()) {
        timeoutId = window.setTimeout(() => {
          timeoutId = null
          if (scrollToResumeVerse() || cancelled || userInteracted || usingSavedFallback) return
          // An absent saved verse must release normal reading instead of leaving progress pending forever.
          resumeSettledRef.current = searchParamsString
          fallbackRetryAnchorRef.current = null
          removeIntentListeners()
          syncReadingPlaceRef.current?.()
        }, 160)
      }
    })

    return () => {
      cancelled = true
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      if (fontFrameId !== null) window.cancelAnimationFrame(fontFrameId)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      removeIntentListeners()
    }
  }, [currentSource, discardReadingPosition, entries, isBaniDbMode, isHukamnamaMode, loading, resumeVerseIdParam, resumeVerseSourceParam, searchParamsString, shouldTrackProgress, persistReadingSession, usingSavedFallback])

  const announceAction = (message: string) => {
    setActionNotice(message)

    if (typeof window === 'undefined') return

    if (actionNoticeTimeoutRef.current !== null) {
      window.clearTimeout(actionNoticeTimeoutRef.current)
    }

    actionNoticeTimeoutRef.current = window.setTimeout(() => {
      setActionNotice(null)
      actionNoticeTimeoutRef.current = null
    }, 2400)
  }

  useEffect(() => () => {
    if (actionNoticeTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(actionNoticeTimeoutRef.current)
    }
  }, [])

  const copyText = async (text: string) => {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard is not available.')
    }

    await navigator.clipboard.writeText(text)
  }

  useEffect(() => {
    if (shouldTrackProgress && currentAng) {
      try {
        recordAng(currentSource, currentAng)
      } catch { /* Optional reading statistics must not unmount an otherwise usable reading. */ }
    }
  }, [currentAng, currentSource, recordAng, shouldTrackProgress])

  useEffect(() => {
    if (!shouldTrackProgress || loading || error || entries.length === 0) return
    recordSwipeToday()
  }, [entries.length, error, loading, recordSwipeToday, shouldTrackProgress])

  useEffect(() => {
    if (loading || typeof window === 'undefined') return

    const reading = document.querySelector<HTMLElement>('[data-testid="study-entry-list"]')
    const progressTrack = readerProgressTrackRef.current
    const progressBar = readerProgressBarRef.current
    if (!reading || !progressTrack || !progressBar) return

    let resizeIdleTimeout: number | null = null
    let readingTop = 0
    let readableDistance = 1

    const updateReaderProgress = () => {
      const localProgress = Math.max(0, Math.min(1, (getAppScrollTop() - readingTop + 96) / readableDistance))
      const overallProgress = localProgress
      const progressValue = String(Math.round(overallProgress * 100))

      progressBar.style.transform = `scaleX(${overallProgress})`
      if (progressTrack.getAttribute('aria-valuenow') !== progressValue) {
        progressTrack.setAttribute('aria-valuenow', progressValue)
      }
    }

    const measureReading = () => {
      const rect = reading.getBoundingClientRect()
      readingTop = getAppScrollTop() + rect.top - getAppViewportBounds().top
      readableDistance = Math.max(1, reading.scrollHeight - getAppViewportHeight() + 120)
      updateReaderProgress()
    }

    const measureAfterResizeSettles = () => {
      if (resizeIdleTimeout !== null) window.clearTimeout(resizeIdleTimeout)
      resizeIdleTimeout = window.setTimeout(() => {
        resizeIdleTimeout = null
        measureReading()
      }, 180)
    }

    measureReading()
    const removeSettledScrollListener = addAppScrollSettledListener(updateReaderProgress)
    window.addEventListener('resize', measureAfterResizeSettles)

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measureAfterResizeSettles)
    resizeObserver?.observe(reading)

    return () => {
      if (resizeIdleTimeout !== null) window.clearTimeout(resizeIdleTimeout)
      resizeObserver?.disconnect()
      removeSettledScrollListener()
      window.removeEventListener('resize', measureAfterResizeSettles)
    }
  }, [entries.length, loading, searchParamsString, presentation, fontSize, supportTextSize, lineSpacing, meaningLanguage, showTransliteration, scriptMode, larivaar])

  const buildShareHighlightContent = (
    line: ScriptureLine,
    entry: ScriptureEntry,
    selectedText?: string
  ): ShareHighlightSheetContent => {
    const selectedExcerpt = Boolean(selectedText?.trim()) && selectedText?.trim() !== line.gurmukhi.trim()
    const gurmukhi = selectedExcerpt ? selectedText!.trim() : line.gurmukhi.trim()
    const transliteration = selectedExcerpt ? '' : line.transliteration.trim()
    const meaning = selectedExcerpt ? '' : getLineMeaningText(line, meaningLanguage, englishSource).trim()
    const sourceName = baniName || entry.scripture
    const sourceLabel = `${sourceName} · ${getSourceReaderUnit(entry.source, entry.scripture)} ${line.ang}`
    const hasExactPassageIdentity = hasExactLineIdentity(line)
    const exactPassageParams = hasExactPassageIdentity
      ? new URLSearchParams({
          shabadId: String(line.shabadId),
          verseId: String(line.verseId),
        })
      : null
    if (exactPassageParams && baniName?.trim()) exactPassageParams.set('baniName', baniName.trim())
    const baniPassageParams = isBaniDbMode && canonicalResumePath
      ? new URLSearchParams(canonicalResumePath.split('?')[1])
      : null
    if (baniPassageParams && Number.isSafeInteger(line.verseId) && line.verseId > 0) {
      baniPassageParams.set('resumeVerseId', String(line.verseId))
      if (entry.source) baniPassageParams.set('resumeSource', entry.source)
    }

    return {
      gurmukhi,
      transliteration: transliteration || undefined,
      meaning: meaning || undefined,
      sourceLabel,
      verseId: hasExactPassageIdentity ? line.verseId : undefined,
      sourcePath: exactPassageParams
        ? `/study?${exactPassageParams.toString()}`
        : baniPassageParams ? `/study?${baniPassageParams.toString()}` : savedFallbackReturnPath,
      selectedExcerpt,
      initialShowTransliteration: !selectedExcerpt && showTransliteration && Boolean(transliteration),
      initialShowMeaning: !selectedExcerpt && Boolean(meaning),
    }
  }

  const rememberShareHighlightOpener = () => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      shareHighlightReturnFocusRef.current = activeElement
    }
  }

  const closeShareHighlight = () => {
    const returnTarget = shareHighlightReturnFocusRef.current
    setShareHighlightContent(null)
    if (!returnTarget?.isConnected) return

    window.requestAnimationFrame(() => {
      if (!returnTarget.isConnected) return
      try {
        returnTarget.focus({ preventScroll: true })
      } catch {
        returnTarget.focus()
      }
    })
  }

  const handleShare = (returnFocusTarget?: HTMLElement | null) => {
    if (!currentEntry) return
    if (returnFocusTarget) {
      shareHighlightReturnFocusRef.current = returnFocusTarget
    } else {
      rememberShareHighlightOpener()
    }

    if (isHukamnamaMode || isRandomHukamnamaMode) {
      const shareMeaningLanguage = meaningLanguage === 'none' ? 'en' : meaningLanguage
      const passageLines = (currentEntry.lines ?? [])
        .map((line, index) => {
          const gurmukhi = line.gurmukhi.trim()
          if (!gurmukhi) return null

          const transliteration = line.transliteration.trim()
          // Share the reader's selected meaning language. When meaning is off,
          // English remains available so a shared Hukamnama is never stripped
          // of all translation support merely because the reader hid it.
          const meaning = getLineMeaningText(line, shareMeaningLanguage, englishSource).trim()
          return {
            id: `${line.shabadId}-${line.verseId}-${index}`,
            gurmukhi,
            transliteration: transliteration || undefined,
            meaning: meaning || undefined,
            isHeader: (line.isHeader || isStructuralGurbaniHeadingLine(gurmukhi)) || undefined,
          }
        })
        .filter((line): line is NonNullable<typeof line> => line !== null)

      if (passageLines.length > 0) {
        const transliteration = passageLines
          .map(line => line.transliteration)
          .filter(Boolean)
          .join('\n')
        const meaning = passageLines
          .map(line => line.meaning)
          .filter(Boolean)
          .join('\n')
        const scriptureLabel = getEntrySourceDisplay(currentEntry, currentSource)
        const sourceLabel = `${scriptureLabel} · ${formatEntryReaderLocation(currentEntry, currentReadingUnit)}`
        const dateIso = isHukamnamaMode
          ? (hukamnamaResult.data?.date ?? hukamnamaDateParam)
          : null
        const dateLabel = isHukamnamaMode
          ? formatReaderEditorialDate(dateIso, locale)
          : null
        const translationSources = Array.from(new Set(
          (currentEntry.lines ?? [])
            .map(line => getResolvedMeaningSource(line, shareMeaningLanguage, {
              english: englishSource,
              punjabi: punjabiSource,
              hindi: hindiSource,
            }))
            .filter((source): source is string => source !== null)
        ))
        const translationProviderLabels = translationSources.map(source => (
          shareMeaningLanguage === 'en'
            ? englishSourceLabels[source as EnglishSource]
            : shareMeaningLanguage === 'pa'
              ? getPunjabiSourceLabel(locale, source as PunjabiSource)
              : getHindiSourceLabel(locale, source as HindiSource)
        ))
        const translationLabel = [
          meaningLanguageLabels[shareMeaningLanguage],
          translationProviderLabels.filter(Boolean).join(' / '),
        ].filter(Boolean).join(' · ')
        const exactSourcePath = isHukamnamaMode && dateIso
          ? `/study?hukamnamaDate=${encodeURIComponent(dateIso)}`
          : (() => {
              const exactParams = new URLSearchParams()
              if (shabadIdParam) exactParams.set('shabadId', String(shabadIdParam))
              exactParams.set('flow', 'ardaas-hukamnama')
              if (randomHukamnamaAngParam) {
                exactParams.set('randomHukamnamaAng', String(randomHukamnamaAngParam))
              }
              if (resumeVerseIdParam) exactParams.set('resumeVerseId', String(resumeVerseIdParam))
              return `/study?${exactParams.toString()}`
            })()

        setShareHighlightContent({
          gurmukhi: passageLines.map(line => line.gurmukhi).join('\n'),
          transliteration: transliteration || undefined,
          meaning: meaning || undefined,
          sourceLabel,
          passageLines,
          passageKind: isHukamnamaMode ? 'daily-hukamnama' : 'personal-hukamnama',
          seriesLabel: isHukamnamaMode
            ? HUKAMNAMA_SHARE_SERIES[locale].daily
            : HUKAMNAMA_SHARE_SERIES[locale].personal,
          dateLabel: dateLabel || undefined,
          sourcePath: exactSourcePath,
          sharePath: isRandomHukamnamaMode && shabadIdParam && randomHukamnamaAngParam
            ? buildPersonalHukamnamaShortPath(
                shabadIdParam,
                randomHukamnamaAngParam,
                resumeVerseIdParam,
              )
            : undefined,
          initialShowTransliteration: showTransliteration && Boolean(transliteration),
          initialShowMeaning: Boolean(meaning),
          provenance: {
            ceremonyLocation: isHukamnamaMode
              ? HUKAMNAMA_CEREMONY_LOCATION[locale]
              : undefined,
            scripture: scriptureLabel,
            raag: currentEntry.raag || undefined,
            writer: currentEntry.writer || undefined,
            translationLabel: translationLabel || undefined,
            translationLanguage: shareMeaningLanguage,
            dateIso: dateIso || undefined,
          },
        })
        return
      }
    }

    const line = findFirstRenderableLine([currentEntry])
    if (line) {
      setShareHighlightContent(buildShareHighlightContent(line, currentEntry))
      return
    }

    const sourceLabel = baniName
      ? `${baniName} · ${currentReadingUnit} ${currentEntry.ang}`
      : `${currentEntry.scripture} · ${currentReadingUnit} ${currentEntry.ang}`
    const meaning = getEntryMeaningText(currentEntry, meaningLanguage, englishSource).trim()
    setShareHighlightContent({
      gurmukhi: currentEntry.gurmukhi.trim(),
      transliteration: currentEntry.transliteration.trim() || undefined,
      meaning: meaning || undefined,
      sourceLabel,
      initialShowTransliteration: showTransliteration && Boolean(currentEntry.transliteration.trim()),
      initialShowMeaning: Boolean(meaning),
    })
  }

  const shabadIds = useMemo(
    () => entries.slice(Math.max(0, safeActiveEntryIndex - 1), safeActiveEntryIndex + 2).map(parseShabadId),
    [entries, safeActiveEntryIndex]
  )
  const { wordDataMap } = useMultiShabadWordData(isApiMode ? shabadIds : [])
  const isExactSearchResult = isExactShabadMode && verseIdParam !== null
  const currentFavoriteRouteMode = isExactSearchResult
    ? 'verse'
    : isExactShabadMode
      ? 'shabad'
      : 'canonical'

  const currentSavedLine = currentEntry ? findFirstRenderableLine([currentEntry]) : null
  const currentSavedReturnPath = useMemo(() => {
    const params = new URLSearchParams(searchParamsString)
    if (currentAng) params.set('ang', String(currentAng))
    params.set('source', isBaniDbMode ? resumeSource : currentSource)
    if (currentSavedLine?.verseId && !verseIdParam) {
      params.set('resumeVerseId', String(currentSavedLine.verseId))
      if (isBaniDbMode) params.set('resumeSource', currentSource)
    }
    const nextSearch = params.toString()
    return nextSearch ? `/study?${nextSearch}` : '/study'
  }, [currentAng, currentSavedLine?.verseId, currentSource, isBaniDbMode, resumeSource, searchParamsString, verseIdParam])
  const currentSavedIdentity = getSavedReturnIdentity(currentSavedReturnPath)

  const currentBookmark = currentEntry && currentAng
    ? bookmarks.find(bookmark => {
      if (!isScriptureBookmark(bookmark)) return false
      const savedIdentity = getSavedReturnIdentity(bookmark.returnPath)
      if (savedIdentity && currentSavedIdentity) return savedIdentity === currentSavedIdentity
      if (currentSavedIdentity && !canUseLegacySavedLocationFallback(currentSavedReturnPath)) return false
      if (bookmark.source !== currentSource || bookmark.ang !== currentAng) return false
      if (isExactSearchResult) return bookmark.verseId === verseIdParam
      if (isExactShabadMode) {
        return !bookmark.verseId && bookmark.shabadId === currentShabadId
      }
      return !bookmark.verseId && !bookmark.shabadId
    }) ?? null
    : null
  const isBookmarked = Boolean(currentBookmark)
  const currentFavorite = currentEntry && currentAng
    ? favorites.find(favorite => {
      const savedIdentity = getSavedReturnIdentity(favorite.returnPath)
      if (savedIdentity && currentSavedIdentity) return savedIdentity === currentSavedIdentity
      if (currentSavedIdentity && !canUseLegacySavedLocationFallback(currentSavedReturnPath)) return false
      const routeMode = resolveFavoriteRouteMode(favorite)

      if (
        favorite.source !== currentSource
        || favorite.ang !== currentAng
        || routeMode !== currentFavoriteRouteMode
      ) {
        return false
      }

      if (routeMode === 'verse') {
        return favorite.shabadId === currentShabadId && favorite.verseId === verseIdParam
      }

      if (routeMode === 'shabad') {
        return favorite.shabadId === currentShabadId
      }

      return true
    }) ?? null
    : null
  const isFavorited = Boolean(currentFavorite)

  const handleSaveBookmark = () => {
    if (!currentEntry || !currentAng) return
    const savedLine = currentSavedLine
    const result = addBookmark({
      type: currentFavoriteRouteMode === 'verse'
        ? 'verse'
        : currentFavoriteRouteMode === 'shabad'
          ? 'shabad'
          : 'bani',
      title: baniName
        ? `${baniName} · ${currentReadingUnit} ${currentAng}`
        : `${currentEntry.scripture} · ${currentReadingUnit} ${currentAng}`,
      source: currentSource,
      ang: currentAng,
      shabadId: currentFavoriteRouteMode === 'canonical' ? undefined : currentShabadId,
      verseId: currentFavoriteRouteMode === 'verse' ? verseIdParam ?? undefined : undefined,
      excerpt: truncateSavedText(savedLine?.gurmukhi ?? currentEntry.gurmukhi),
      transliteration: truncateSavedText(savedLine?.transliteration ?? currentEntry.transliteration),
      translation_en: truncateSavedText(savedLine?.translation_en ?? currentEntry.translation_en),
      translation_hi: truncateSavedText(savedLine?.translation_hi ?? currentEntry.translation_hi),
      translation_pa: truncateSavedText(savedLine?.translation_pa ?? currentEntry.translation_pa),
      returnPath: currentSavedReturnPath,
      description: bookmarkText || undefined,
    })
    setShowBookmarkForm(false)
    setBookmarkText('')
    announceAction(result.persisted ? studyExperienceCopy.bookmarkSaved : studyExperienceCopy.storageUnavailable)
  }

  const toggleFavorite = () => {
    if (!currentEntry || !currentAng) return
    if (currentFavorite) {
      const result = removeFavorite(currentFavorite.id)
      announceAction(result.persisted ? studyExperienceCopy.favoriteRemoved : studyExperienceCopy.storageUnavailable)
      return
    }
    const savedLine = currentSavedLine
    const result = addFavorite({
      title: baniName
        ? `${baniName} · ${currentReadingUnit} ${currentAng}`
        : `${currentEntry.scripture} · ${currentReadingUnit} ${currentAng}`,
      source: currentSource,
      ang: currentAng,
      shabadId: currentFavoriteRouteMode === 'canonical' ? undefined : currentShabadId,
      verseId: currentFavoriteRouteMode === 'verse' ? verseIdParam ?? undefined : undefined,
      type: currentFavoriteRouteMode === 'canonical' ? 'ang' : 'shabad',
      routeMode: currentFavoriteRouteMode,
      excerpt: truncateSavedText(savedLine?.gurmukhi ?? currentEntry.gurmukhi),
      transliteration: truncateSavedText(savedLine?.transliteration ?? currentEntry.transliteration),
      translation_en: truncateSavedText(savedLine?.translation_en ?? currentEntry.translation_en),
      translation_hi: truncateSavedText(savedLine?.translation_hi ?? currentEntry.translation_hi),
      translation_pa: truncateSavedText(savedLine?.translation_pa ?? currentEntry.translation_pa),
      returnPath: currentSavedReturnPath,
    })
    announceAction(result.persisted ? studyExperienceCopy.favoriteAdded : studyExperienceCopy.storageUnavailable)
  }

  const buildLineText = (entry: ScriptureEntry, line: ScriptureLine) => [
    line.gurmukhi,
    showTransliteration ? line.transliteration : '',
    getLineMeaningText(line, meaningLanguage, englishSource),
    `— ${entry.scripture} · ${getSourceReaderUnit(entry.source, entry.scripture)} ${line.ang}`,
    editorial?.brand.attribution ?? 'via NaamRas',
  ].filter(Boolean).join('\n')

  const handleCopyLine = async (line: ScriptureLine, entry: ScriptureEntry) => {
    await copyText(buildLineText(entry, line))
    announceAction(studyExperienceCopy.lineCopied)
  }

  const handleShareLine = (
    line: ScriptureLine,
    entry: ScriptureEntry,
    selectedText?: string,
    returnFocusTarget?: HTMLElement | null,
  ) => {
    if (returnFocusTarget) {
      shareHighlightReturnFocusRef.current = returnFocusTarget
    } else {
      rememberShareHighlightOpener()
    }
    setShareHighlightContent(buildShareHighlightContent(line, entry, selectedText))
  }

  const handleBookmarkLine = (line: ScriptureLine, entry: ScriptureEntry) => {
    if (!hasExactLineIdentity(line)) {
      if (!usingSavedFallback) return

      // An offline excerpt without exact IDs still owns its canonical saved
      // route. Toggle that passage-level bookmark instead of manufacturing a
      // verse bookmark that would reopen unrelated Gurbani.
      if (currentBookmark) {
        const result = removeBookmark(currentBookmark.id)
        announceAction(result.persisted ? studyExperienceCopy.bookmarkRemoved : studyExperienceCopy.storageUnavailable)
      } else {
        handleSaveBookmark()
      }
      return
    }

    const entrySource = (entry.source ?? currentSource) as BaniSource
    const existingBookmark = bookmarks.find(bookmark =>
      isScriptureBookmark(bookmark)
      && bookmark.source === entrySource
      && bookmark.ang === line.ang
      && bookmark.verseId === line.verseId
    )
    if (existingBookmark) {
      const result = removeBookmark(existingBookmark.id)
      announceAction(result.persisted ? studyExperienceCopy.bookmarkRemoved : studyExperienceCopy.storageUnavailable)
      return
    }
    const exactParams = new URLSearchParams({
      shabadId: String(line.shabadId),
      verseId: String(line.verseId),
    })
    if (baniName?.trim()) exactParams.set('baniName', baniName.trim())
    const result = addBookmark({
      type: 'verse',
      title: `${entry.scripture} · ${getSourceReaderUnit(entry.source, entry.scripture)} ${line.ang}`,
      source: entrySource,
      ang: line.ang,
      shabadId: line.shabadId,
      verseId: line.verseId,
      excerpt: truncateSavedText(line.gurmukhi),
      transliteration: truncateSavedText(line.transliteration),
      translation_en: truncateSavedText(line.translation_en),
      translation_hi: truncateSavedText(line.translation_hi),
      translation_pa: truncateSavedText(line.translation_pa),
      returnPath: `/study?${exactParams.toString()}`,
    })
    announceAction(result.persisted ? studyExperienceCopy.lineBookmarked : studyExperienceCopy.storageUnavailable)
  }

  const handleSavePhrase = (line: ScriptureLine, entry: ScriptureEntry) => {
    if (persistedPhraseWords.has(line.gurmukhi)) {
      announceAction(studyExperienceCopy.phraseAlreadySaved)
      return
    }
    const result = addWord({
      kind: 'phrase',
      word: line.gurmukhi,
      transliteration: line.transliteration,
      meaning_en: getLineMeaningText(line, 'en', englishSource),
      meaning_hi: line.translation_hi,
      meaning_pa: line.translation_pa,
      scripture: entry.scripture,
      sourceId: entry.sourceAttribution === 'unavailable' ? '' : entry.source ?? currentSource,
      savedAt: new Date().toISOString(),
      context: {
        scripture: entry.scripture,
        sourceId: entry.sourceAttribution === 'unavailable' ? '' : entry.source ?? currentSource,
        ang: line.ang,
        ...(hasExactLineIdentity(line) ? { shabadId: line.shabadId, verseId: line.verseId } : {}),
        line: line.gurmukhi,
      },
    })
    announceAction(result.persisted ? studyExperienceCopy.phraseSaved : studyExperienceCopy.storageUnavailable)
  }

  const handleTakeHukamnama = async () => {
    if (isTakingHukamnama) return

    setIsTakingHukamnama(true)

    try {
      const randomAng = getRandomSggsAng(Math.random())
      const angEntries = await fetchAng(randomAng, 'G')
      const firstLine = findFirstRenderableLine(angEntries)

      if (!firstLine?.shabadId || !firstLine.verseId) {
        throw new Error('No Hukamnama verse found on selected ang')
      }

      const shabad = await fetchShabad(firstLine.shabadId)
      if (!shabad) {
        throw new Error('No Hukamnama shabad found for selected verse')
      }

      navigate(
        `/study?shabadId=${firstLine.shabadId}&flow=ardaas-hukamnama&randomHukamnamaAng=${randomAng}&resumeVerseId=${firstLine.verseId}`
      )
    } catch {
      navigate('/banis', { replace: true })
    } finally {
      setIsTakingHukamnama(false)
    }
  }

  const canChangeBaniLength = isBaniDbMode && !isExactShabadMode && !isHukamnamaMode && Boolean(supportedSundarGutkaBaniId && effectiveSgLength)
  const openBaniLengths = () => {
    lengthOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    syncReadingPlaceRef.current?.()
    lengthAnchorRef.current = captureReaderAnchor()
    lengthDestinationRef.current = null
    rememberReadingPosition(lengthAnchorRef.current?.key)
    readerInteraction.clearWord()
    setLengthOpen(true)
  }
  const closeBaniLengths = () => {
    lengthSelection.cancel()
    lengthDestinationRef.current = null
    setLengthOpen(false)
    deferReaderFocus(() => {
      const opener = lengthOpenerRef.current
      const target = opener?.isConnected && !opener.closest('[hidden],[inert]') ? opener
        : document.querySelector<HTMLButtonElement>('.reader-dock:not([hidden]) [data-testid="bani-length-control"]')
          ?? document.querySelector<HTMLButtonElement>('.study-reader-topbar [data-testid="bani-length-control"]')
      target?.focus({ preventScroll: true })
    }, 2)
  }
  const resolveBaniLengthDestination = (reading: BaniFetchResult) => {
    const currentPath = `${location.pathname}?${searchParamsString}`
    const anchor = lengthAnchorRef.current ?? captureReaderAnchor()
    const separator = anchor?.key.lastIndexOf(':') ?? -1
    const entry = separator >= 0 ? entries.find(item => item.id === anchor!.key.slice(0, separator)) : currentEntry
    const lineIndex = separator >= 0 ? Number(anchor!.key.slice(separator + 1)) : 0
    const line = entry?.lines?.[lineIndex]
    return getBaniLengthDestination(currentPath, reading, useReadingPlacesStore.getState().places,
      line?.verseId ? { verseId: line.verseId, source: entry?.source } : null)
  }
  const describeBaniLengthDestination = (reading: BaniFetchResult) => {
    const destination = resolveBaniLengthDestination(reading)
    lengthDestinationRef.current = { origin: `${location.pathname}?${searchParamsString}`, reading, destination }
    return getBaniLengthDestinationLabel(destination.destination, locale)
  }
  const handleSundarGutkaLengthChange = async (nextLength: SundarGutkaLength, remember = false, preparedReading?: BaniFetchResult) => {
    if (!canChangeBaniLength || !supportedSundarGutkaBaniId || !baniDbIdParam) return
    const currentPath = `${location.pathname}?${searchParamsString}`
    syncReadingPlaceRef.current?.()
    const reading = await lengthSelection.prepare(baniDbIdParam, nextLength, preparedReading)
    const preview = lengthDestinationRef.current
    const destination = preview?.origin === currentPath && preview.reading === reading ? preview.destination : resolveBaniLengthDestination(reading)
    if (remember) {
      const previous = useSundarGutkaLengthStore.getState().lengths[supportedSundarGutkaBaniId]
      try { setSundarGutkaLength(supportedSundarGutkaBaniId, reading.resolvedLength ?? nextLength) }
      catch {
        try { setSundarGutkaLength(supportedSundarGutkaBaniId, previous) } catch { /* Keep the prior preference in memory. */ }
        throw new Error(locale === 'pa' ? 'ਪਸੰਦ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ। ਤੁਹਾਡਾ ਪਾਠ ਨਹੀਂ ਬਦਲਿਆ।' : locale === 'hi' ? 'पसंद सहेजी नहीं जा सकी। आपका पाठ नहीं बदला।' : 'Your usual length could not be saved. Your reading is unchanged.')
      }
    }
    const practice = useNitnemPracticeStore.getState()
    if (practice.active && isActiveNitnemPracticeReading(currentPath, practice.active)) {
      if (!practice.switchReading(practice.active.optionId, destination.path)) setPositionSessionOnly(true)
    }
    setLengthOpen(false)
    readerInteraction.clearWord()
    setSearchParams(new URLSearchParams(destination.path.split('?')[1]), { replace: true, state: location.state })
    if (destination.destination === 'beginning') {
      resetReaderViewport()
      announceAction(locale === 'pa' ? 'ਚੁਣੀ ਲੰਬਾਈ ਸ਼ੁਰੂ ਤੋਂ ਖੁੱਲ੍ਹੀ ਹੈ।' : locale === 'hi' ? 'चुनी लंबाई शुरुआत से खुली है।' : 'This length opens at its beginning.')
    } else if (destination.destination === 'saved-place') {
      announceAction(locale === 'pa' ? 'ਇਸ ਲੰਬਾਈ ਦੀ ਸੰਭਾਲੀ ਥਾਂ ਖੁੱਲ੍ਹੀ ਹੈ।' : locale === 'hi' ? 'इस लंबाई की सहेजी जगह खुली है।' : 'Returned to this length’s saved place.')
    }
  }

  const isLineBookmarked = (line: ScriptureLine, entry: ScriptureEntry) => (
    usingSavedFallback && !hasExactLineIdentity(line)
      ? Boolean(currentBookmark)
      : hasBookmark((entry.source ?? currentSource) as BaniSource, line.ang, line.verseId)
  )
  const isPhraseSaved = (line: ScriptureLine) =>
    persistedPhraseWords.has(line.gurmukhi)

  const titleLine = currentEntry?.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))?.gurmukhi
    ?? currentEntry?.lines?.find(line => !line.isHeader && line.gurmukhi.trim())?.gurmukhi
    ?? currentEntry?.gurmukhi
    ?? ''
  const mappedReaderEditorialCopy = isHukamnamaMode
    ? DAILY_HUKAMNAMA_EDITORIAL_COPY
    : isRandomHukamnamaMode
      ? PERSONAL_HUKAMNAMA_EDITORIAL_COPY
    : isArdaasReaderFlow
      ? ARDAAS_HUKAMNAMA_EDITORIAL_COPY
      : getReaderEditorialCopyForBaniDbId(baniDbIdParam, currentSource) ?? getReaderEditorialCopyForBani(baniIdParam)
  const readerEditorialCopy = mappedReaderEditorialCopy
    ?? (fromParam === 'amrit-keertan' ? getReaderEditorialCopyForBani('amrit-keertan') : null)
    ?? getReaderEditorialCopyForSource(currentSource, currentAng, { exactShabad: isExactShabadMode })
  const hukamnamaDateLabel = isHukamnamaMode
    ? formatReaderEditorialDate(hukamnamaResult.data?.date ?? hukamnamaDateParam, locale)
    : null
  const stableReaderTitle = isHukamnamaMode
    ? DAILY_HUKAMNAMA_EDITORIAL_COPY.title
    : isRandomHukamnamaMode
      ? PERSONAL_HUKAMNAMA_EDITORIAL_COPY.title
      : isArdaasReaderFlow
        ? ARDAAS_HUKAMNAMA_EDITORIAL_COPY.title
        : (baniName ?? mappedReaderEditorialCopy?.title ?? null)
  const readerTitleUsesScript = !stableReaderTitle && isExactShabadMode && Boolean(titleLine)
  const readerTitle = stableReaderTitle
    ?? (readerTitleUsesScript ? renderScriptText(buildReaderTitle(titleLine), scriptMode) : null)
    ?? (currentAng ? `${currentReadingUnit} ${currentAng}` : null)
    ?? currentEntry?.scripture
    ?? focusedReaderCopy.gurbani
  const entrySourceDisplay = isHukamnamaMode
    ? 'Sri Harmandir Sahib, Amritsar · Sri Guru Granth Sahib Ji'
    : fromParam === 'amrit-keertan'
      ? `Amrit Keertan · ${getEntrySourceDisplay(currentEntry, currentSource)}`
      : getEntrySourceDisplay(currentEntry, currentSource)
  const readerMeta = readerEditorialCopy?.sourceLine ?? [
    currentSundarGutkaLengthLabel,
    entrySourceDisplay,
    currentAng ? `${currentReadingUnit} ${currentAng}` : null,
    currentEntry?.raag,
    currentEntry?.writer,
  ].filter(Boolean).join(' · ')
  const readerIntroBody = readerEditorialCopy?.dek ?? studyCopy.introBody
  const isAmritKeertanContext = fromParam === 'amrit-keertan' && akHeaderIdParam !== null
  const amritKeertanContextMeta = [
    akSectionParam ? `Section ${akSectionParam}` : null,
    akPageParam ? `AK Page ${akPageParam}` : null,
    akItemParam ? `Item ${akItemParam}` : null,
  ].filter(Boolean).join(' · ')
  const readerOriginCandidate = (location.state as { readerOrigin?: unknown } | null)?.readerOrigin
  const readerOrigin = isSafeInternalAppPath(readerOriginCandidate)
    && readerOriginCandidate !== '/study'
    && !readerOriginCandidate.startsWith('/study?')
    && !readerOriginCandidate.startsWith('/study#')
    && !readerOriginCandidate.startsWith('/study/')
      ? readerOriginCandidate
      : null
  const handleReaderBack = () => {
    syncReadingPlaceRef.current?.()
    if (readerOrigin) {
      navigate(readerOrigin)
      return
    }

    if (isAmritKeertanContext) {
      navigate(`/banis/amrit-keertan/${akHeaderIdParam}`)
      return
    }

    navigate('/banis')
  }
  const openReaderSettingsAt = (sourceAnchorKey?: string) => {
    const anchorKey = sourceAnchorKey ?? captureReaderAnchor()?.key
    rememberReadingPosition(anchorKey)
    const separator = anchorKey?.lastIndexOf(':') ?? -1
    const previewEntry = separator >= 0 ? entries.find(entry => entry.id === anchorKey?.slice(0, separator)) : currentEntry
    const previewIndex = separator >= 0 ? Number(anchorKey?.slice(separator + 1)) : 0
    setAppearancePreview(previewEntry?.lines?.[previewIndex] ?? findFirstRenderableLine(previewEntry ? [previewEntry] : []) ?? null)
    setShowBookmarkForm(false)
    setControlsOpen(true)
  }
  const openReaderSettings = () => openReaderSettingsAt()
  const entryOutline = useMemo(() => entries.map((entry, index) => {
    const sectionId = `study-entry-${index + 1}`
    const detailBits = [entry.raag, entry.writer, entry.sourceName].filter(Boolean)

    return {
      entry,
      sectionId,
      title: findStudyEntryTitle(entry),
      lineCount: getStudyEntryLineCount(entry),
      detail: detailBits[0] ?? `${entry.scripture} · ${getSourceReaderUnit(entry.source, entry.scripture)} ${entry.ang}`,
      eyebrow: entrySequenceCopy.sectionLabel(index + 1, entries.length),
    }
  }), [entries, entrySequenceCopy])

  const rangeEntries = isBaniDbMode ? baniResult.entries : entries
  const navMinAng = isBaniDbMode
      ? (rangeEntries[0]?.ang ?? null)
    : isBaniRangeMode
      ? (startAngParam ?? angParam)
      : isAngMode
        ? 1
        : null
  const navMaxAng = isBaniDbMode
    ? (rangeEntries[rangeEntries.length - 1]?.ang ?? null)
    : isBaniRangeMode
      ? endAngParam
      : isAngMode
        ? (MAX_ANG[source!] ?? 1)
        : null
  const previousNavAng =
    currentAng !== null && navMinAng !== null
      ? Math.max(navMinAng, currentAng - 1)
      : null
  const nextNavAng =
    currentAng !== null && navMaxAng !== null
      ? Math.min(navMaxAng, currentAng + 1)
      : null

  const resetReaderViewport = () => {
    if (typeof window === 'undefined') return

    window.requestAnimationFrame(() => {
      scrollAppTo({ top: 0, left: 0, behavior: 'auto' })
      document.getElementById('main-content')?.focus({ preventScroll: true })
    })
  }

  const navTo = (newAng: number) => {
    if (isBaniDbMode) {
      const params: Record<string, string> = {
        baniDbId: String(baniDbIdParam!),
        ang: String(newAng),
      }
      if (baniName) params.bani = baniName
      if (baniIdParam) params.baniId = baniIdParam
      if (effectiveSgLength) params.sgLength = effectiveSgLength
      setSearchParams(params)
      resetReaderViewport()
      return
    }

    const params: Record<string, string> = { source: source!, ang: String(newAng) }
    if (baniName) params.bani = baniName
    if (baniIdParam) params.baniId = baniIdParam
    if (isBaniRangeMode) params.startAng = String(startAngParam ?? angParam!)
    if (endAngParam) params.endAng = String(endAngParam)
    setSearchParams(params)
    resetReaderViewport()
  }

  const openReaderSections = () => {
    syncReadingPlaceRef.current?.()
    sectionsOriginRef.current = captureReaderAnchor()
    readerInteraction.clearWord()
    setSectionsOpen(true)
  }
  const jumpToLine = (entryIndex: number, lineIndex?: number) => {
    discardReadingPosition()
    const nextIndex = Math.max(0, Math.min(entryIndex, entries.length - 1))
    const anchor = sectionsOriginRef.current ?? captureReaderAnchor()
    if (!explorationRef.current && anchor) {
      explorationRef.current = { route: searchParamsString, anchor }
      setHasExploration(true)
    }
    setSectionsOpen(false)
    setActiveEntryIndex(nextIndex)
    deferReaderFocus(() => {
      const section = document.getElementById(`study-entry-${nextIndex + 1}`)
      if (!section) return
      const exactKey = lineIndex === undefined ? null : `${entries[nextIndex].id}:${lineIndex}`
      const exactLine = exactKey ? Array.from(section.querySelectorAll<HTMLElement>('[data-reader-anchor]')).find(element => element.dataset.readerAnchor === exactKey) : null
      const bodyLines = getReaderBodyLines(Array.from(section.querySelectorAll<HTMLElement>('[data-testid="study-line"][data-verse-id]')))
      const target = exactLine ?? bodyLines.find(line => Number(line.dataset.verseId) > 0) ?? bodyLines[0] ?? section
      scrollElementIntoAppView(target, { behavior: 'auto', block: 'start' })
      section.focus({ preventScroll: true })
      readerInteraction.reveal()
    }, 2)
  }
  const jumpToEntry = (entryIndex: number) => jumpToLine(entryIndex)
  const returnToReading = () => {
    discardReadingPosition()
    const saved = explorationRef.current
    explorationRef.current = null
    setHasExploration(false)
    if (saved?.route !== searchParamsString) return
    deferReaderFocus(() => {
      restoreReaderAnchor(saved.anchor)
      syncReadingPlaceRef.current?.(true)
      readerInteraction.reveal()
    }, 2)
  }
  const continueHere = () => {
    discardReadingPosition()
    explorationRef.current = null
    setHasExploration(false)
    syncReadingPlaceRef.current?.(true)
  }

  const showAngNavigation = !isExactShabadMode
    && !isHukamnamaMode
    && !isArdaasHukamnamaFlow
    && !isBaniDbMode
    && Boolean(currentAng)
    && navMinAng !== null
    && navMaxAng !== null
  const retryLiveReader = isHukamnamaMode
    ? hukamnamaResult.retry
    : isExactShabadMode
      ? shabadResult.retry
      : isBaniDbMode
        ? baniResult.retry
        : angResult.refetch
  const retryReader = () => {
    // After deliberate excerpt reading, Retry keeps that actual verse and point as the document grows.
    if (usingSavedFallback && resumeVerseIdParam && resumeSettledRef.current === searchParamsString) {
      const anchor = captureReaderAnchor()
      const line = anchor ? Array.from(document.querySelectorAll<HTMLElement>('[data-reader-anchor]'))
        .find(element => element.dataset.readerAnchor === anchor.key) : null
      const verseId = Number(line?.dataset.verseId)
      if (anchor && verseId > 0) {
        const entryId = line?.closest<HTMLElement>('[data-study-entry-id]')?.dataset.studyEntryId
        const entry = entries.find(item => item.id === entryId)
        fallbackRetryAnchorRef.current = { route: searchParamsString, verseId, source: entry?.source, anchor }
        resumeSettledRef.current = null
      }
    }
    retryLiveReader()
  }
  const readerPageRef = useReaderHeaderLayout(searchParamsString, `${readerStatus}:${readerTitle}:${canChangeBaniLength}`)
  const previewMeaning = appearancePreview ? getLineMeaningText(appearancePreview, meaningLanguage, englishSource) : ''
  const readerStateTopbar = (
    <div className="study-reader-topbar" data-testid="study-reader-topbar">
      <button
        onClick={handleReaderBack}
        className="study-reader-back"
        data-ai-action="study-back"
        data-reader-back="true"
      >
        <IconArrowLeft size={18} /> {commonCopy.back}
      </button>
      <div className="study-reader-topbar__identity">
        <h1
          id="study-reader-title"
          lang={readerTitleUsesScript ? getScriptTextLang(scriptMode) : undefined}
          className={readerTitleUsesScript ? getScriptTextFontClass(scriptMode) : 'font-display'}
          title={readerTitle}
        >
          {readerTitle}
        </h1>
        <span>{entrySourceDisplay}</span>
      </div>
      <div className="study-reader-topbar__state-spacer" aria-hidden="true" />
    </div>
  )

  if (!isApiMode) return null

  if (loading && entries.length === 0) {
    return (
      <div
        ref={readerPageRef}
        className="page-shell"
        data-testid="page-study"
        data-page="study"
        data-ai-surface="study-reader"
        data-ai-state="loading"
        data-ai-flow={isHukamnamaMode ? 'hukamnama' : isExactShabadMode ? 'exact-shabad' : isBaniDbMode ? 'bani' : 'ang'}
      >
        {readerStateTopbar}
        <div className="section-shell p-6 min-h-[300px] animate-pulse" data-ai-surface="study-reader-body" data-ai-state="loading">
          <div className="h-3 bg-sand/30 dark:bg-dark-text/10 rounded w-1/4 mb-4" />
          <div className="h-8 bg-sand/30 dark:bg-dark-text/10 rounded w-full mb-3" />
          <div className="h-8 bg-sand/30 dark:bg-dark-text/10 rounded w-4/5 mb-3" />
          <div className="h-4 bg-sand/30 dark:bg-dark-text/10 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (readerStatus === 'degraded' && entries.length === 0) {
    return (
      <div ref={readerPageRef} className="page-shell" data-testid="page-study" data-page="study" data-ai-surface="study-reader" data-ai-state="degraded">
        {readerStateTopbar}
        <SurfaceStateCard
          surface="study-reader"
          state="degraded"
          eyebrow={isHukamnamaMode ? "Today's Hukamnama" : 'Reader'}
          title="This reading couldn’t be loaded."
          body="Check your connection and try again. Readings saved on this device remain available offline."
          pageShell={false}
          headingLevel={2}
          errorCode={error ?? 'unavailable'}
          actions={[
            {
              label: 'Try Again',
              onClick: retryReader,
              aiAction: 'retry-study',
            },
            {
              label: 'Back',
              onClick: handleReaderBack,
              aiAction: 'study-back',
              emphasis: 'secondary',
            },
          ]}
        />
      </div>
    )
  }

  if (readerStatus === 'empty' || entries.length === 0) {
    return (
      <div ref={readerPageRef} className="page-shell" data-testid="page-study" data-page="study" data-ai-surface="study-reader" data-ai-state="empty">
        {readerStateTopbar}
        <SurfaceStateCard
          surface="study-reader"
          state="empty"
          eyebrow={isHukamnamaMode ? "Today's Hukamnama" : 'Reader'}
          title="This passage isn’t available."
          body={`Open another Ang, bani or saved passage${baniName ? `, or return to ${baniName} from your reading list` : ''}.`}
          pageShell={false}
          headingLevel={2}
          actions={[
            {
              label: 'Back',
              onClick: handleReaderBack,
              aiAction: 'study-back',
            },
            {
              label: 'Browse Read',
              onClick: () => navigate('/banis'),
              aiAction: 'browse-read',
              emphasis: 'secondary',
            },
          ]}
        />
      </div>
    )
  }

  return (
    <div
      ref={readerPageRef}
      className="page-shell"
      data-testid="page-study"
      data-page="study"
      data-ai-surface="study-reader"
      data-ai-state={readerStatus === 'degraded' ? 'degraded' : 'ready'}
      data-reader-presentation={presentation}
      data-support-text-size={supportTextSize}
      data-reader-controls={readerInteraction.visible ? 'visible' : 'hidden'}
      data-reader-has-length={canChangeBaniLength ? 'true' : undefined}
      data-has-ang-navigation={showAngNavigation ? 'true' : undefined}
      data-ai-flow={isHukamnamaMode ? 'hukamnama' : isRandomHukamnamaMode ? 'personal-hukamnama' : isExactShabadMode ? 'exact-shabad' : isBaniDbMode ? 'bani' : 'ang'}
    >
      <div className="study-reader-topbar" data-testid="study-reader-topbar" inert={!readerInteraction.visible}>
        <button
          onClick={handleReaderBack}
          className="study-reader-back"
          data-ai-action="study-back"
          data-reader-back="true"
        >
          <IconArrowLeft size={18} /> {commonCopy.back}
        </button>
        <div className="study-reader-topbar__identity">
          <h1
            id="study-reader-title"
            lang={readerTitleUsesScript ? getScriptTextLang(scriptMode) : undefined}
            className={readerTitleUsesScript ? getScriptTextFontClass(scriptMode) : 'font-display'}
            title={readerTitle}
          >
            {readerTitle}
          </h1>
          <span>{entrySourceDisplay}</span>
          {canChangeBaniLength && effectiveSgLength ? <BaniLengthControl value={effectiveSgLength} onClick={openBaniLengths} className="study-reader-length-control" /> : null}
        </div>
        <div className="study-reader-topbar__actions">
          <button type="button" onClick={openReaderSections} aria-label={presentationCopy.sections} title={presentationCopy.sections} aria-haspopup="dialog" className="study-reader-settings-action study-reader-contents-action"><span className="reader-dock__contents" aria-hidden="true">☷</span></button>
          <button type="button" onClick={openReaderSettings} aria-label={studyCopy.readerControls} title={studyCopy.readerControls} className="study-reader-settings-action" data-ai-action="open-reader-settings"><span className="study-reader-aa" aria-hidden="true">Aa</span></button>
          <button ref={readerMenuButtonRef} type="button" onClick={event => openReaderTools(event.currentTarget)} aria-label={presentationCopy.tools} aria-haspopup="dialog" className="study-reader-settings-action"><IconMoreHorizontal size={21} /></button>
        </div>
        <div
          ref={readerProgressTrackRef}
          className="study-reader-topbar__progress"
          role="progressbar"
          aria-label={presentationCopy.position}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
        >
          <span ref={readerProgressBarRef} />
        </div>
      </div>

      <div className="study-reader-presentation-bar" inert={!readerInteraction.visible}>
        <fieldset className="study-reader-mode"><legend className="sr-only">{locale === 'en' ? 'Reading presentation' : studyCopy.readerControls}</legend>
          {(['read', 'study'] as const).map(mode => <label key={mode}><input type="radio" name="reader-presentation-top" value={mode} checked={presentation === mode} onChange={() => changeReaderPresentation(mode)} /><span>{presentationCopy[mode]}</span></label>)}
        </fieldset>
        <button className="study-reader-section-trigger" type="button" aria-label={presentationCopy.jump} aria-haspopup="dialog" onClick={openReaderSections}><span>{presentationCopy.sections}</span><small>{currentReadingUnit} {currentAng}</small><span aria-hidden="true">⌄</span></button>
      </div>


      <ReaderDock
        visible={readerInteraction.visible && (readerInteraction.deep || Boolean(readerInteraction.word) || positionSessionOnly || hasExploration) && !controlsOpen && !lengthOpen && !sectionsOpen && !readerMenuOpen && !exploredWord && !showBookmarkForm && !shareHighlightContent}
        title={readerTitle}
        location={`${currentReadingUnit} ${currentAng}`}
        word={readerInteraction.word}
        notice={positionSessionOnly || hasExploration ? <>
          {positionSessionOnly ? <div role="note" aria-label={presentationCopy.position} data-testid="study-position-recovery"><p>{studyExperienceCopy.positionSessionOnly}</p><button type="button" data-ai-action="retry-reading-position" onClick={() => { syncReadingPlaceRef.current?.(true) }}>{studyExperienceCopy.retryPosition}</button></div> : null}
          {hasExploration ? <div className="study-reader-return"><button type="button" onClick={returnToReading}>{locale === 'pa' ? 'ਪਿਛਲੀ ਥਾਂ ਵਾਪਸ ਜਾਓ' : locale === 'hi' ? 'पिछली जगह पर लौटें' : 'Return to previous place'}</button><button type="button" onClick={continueHere}>{locale === 'pa' ? 'ਇੱਥੋਂ ਜਾਰੀ ਰੱਖੋ' : locale === 'hi' ? 'यहाँ से जारी रखें' : 'Continue here'}</button></div> : null}
        </> : undefined}
        onBack={handleReaderBack}
        onSections={openReaderSections}
        length={canChangeBaniLength ? effectiveSgLength : null}
        onLength={openBaniLengths}
        onAppearance={openReaderSettings}
        onMore={openReaderTools}
        onHide={() => {
          readerInteraction.hide()
          deferReaderFocus(() => document.querySelector<HTMLButtonElement>('.reader-controls-reveal')?.focus({ preventScroll: true }))
        }}
        onExplore={() => { rememberReadingPosition(); setExploredWord(readerInteraction.word) }}
      />
      <span aria-live="polite" aria-atomic="true" className="sr-only" data-testid="study-position-announcement">{positionSessionOnly ? studyExperienceCopy.positionSessionOnly : ''}</span>
      {!readerInteraction.visible && !readerInteraction.selectionActive ? <button type="button" className="reader-controls-reveal" onClick={() => {
        readerInteraction.reveal()
        deferReaderFocus(() => {
          const target = document.querySelector<HTMLButtonElement>('.reader-dock:not([hidden]) .reader-dock__actions button')
            ?? document.querySelector<HTMLButtonElement>('.study-reader-topbar button')
          target?.focus({ preventScroll: true })
        })
      }} aria-label={locale === 'en' ? 'Show reader controls' : studyCopy.readerControls}><IconMoreHorizontal size={20} /><span>{locale === 'pa' ? 'ਕੰਟਰੋਲ' : locale === 'hi' ? 'नियंत्रण' : 'Controls'}</span></button> : null}
      {exploredWord ? <WordPopover word={exploredWord.word} scripture={exploredWord.entry.scripture} sourceId={exploredWord.entry.sourceAttribution === 'unavailable' ? undefined : exploredWord.entry.source} ang={exploredWord.line.ang} shabadId={hasExactLineIdentity(exploredWord.line) ? exploredWord.line.shabadId : undefined} verseId={hasExactLineIdentity(exploredWord.line) ? exploredWord.line.verseId : undefined} line={exploredWord.line.gurmukhi} onClose={() => {
        const returnTarget = document.querySelector<HTMLButtonElement>('.reader-dock__word-heading button')
        setExploredWord(null)
        // Re-enable the nonmodal controls after the dialog releases its focus
        // scope and document lock, then return to the exact word action.
        deferReaderFocus(() => {
          const target = returnTarget?.isConnected ? returnTarget : document.querySelector<HTMLButtonElement>('.reader-dock:not([hidden]) .reader-dock__actions button')
          target?.focus({ preventScroll: true })
        }, 2)
      }} /> : null}

      <ModalSheet open={readerMenuOpen} onClose={() => setReaderMenuOpen(false)} title={presentationCopy.tools} description={locale === 'en' ? 'Save, share and explore this reading.' : presentationCopy.tools} className="study-reader-tools-sheet max-h-[82dvh] overflow-y-auto rounded-lg p-5" testId="study-reader-tools-sheet">
        <div className="study-reader-sheet__heading"><h2>{presentationCopy.tools}</h2><button type="button" aria-label={presentationCopy.close} onClick={() => setReaderMenuOpen(false)}><IconClose size={18} /></button></div>
        <fieldset className="study-reader-tools-mode"><legend>{locale === 'en' ? 'Reading presentation' : studyCopy.readerControls}</legend><div className="study-reader-mode">{(['read', 'study'] as const).map(mode => <label key={mode}><input type="radio" name="reader-presentation-tools" value={mode} checked={presentation === mode} onChange={() => changeReaderPresentation(mode)} /><span>{presentationCopy[mode]}</span></label>)}</div></fieldset>
        <div className="study-reader-awake">
          <label><input type="checkbox" checked={wakeLock.enabled} disabled={!wakeLock.supported} onChange={event => wakeLock.setEnabled(event.target.checked)} />{locale === 'pa' ? 'ਪੜ੍ਹਦੇ ਸਮੇਂ ਸਕ੍ਰੀਨ ਚਾਲੂ ਰੱਖੋ' : locale === 'hi' ? 'पढ़ते समय स्क्रीन चालू रखें' : 'Keep screen awake while reading'}</label>
          {!wakeLock.supported || wakeLock.error ? <p role="status">{locale === 'pa' ? 'ਇਹ ਬ੍ਰਾਊਜ਼ਰ ਇਸ ਵੇਲੇ ਸਕ੍ਰੀਨ ਚਾਲੂ ਨਹੀਂ ਰੱਖ ਸਕਦਾ।' : locale === 'hi' ? 'यह ब्राउज़र अभी स्क्रीन चालू नहीं रख सकता।' : 'Screen awake is unavailable in this browser right now.'}</p> : null}
        </div>
        <div className="study-reader-tools-list">
          <button type="button" aria-haspopup="dialog" onClick={() => {
            setReaderMenuOpen(false)
            deferReaderFocus(openReaderSections, 2)
          }}><span className="reader-dock__contents" aria-hidden="true">☷</span><span>{presentationCopy.sections}</span></button>
          <button
            onClick={() => {
              setReaderMenuOpen(false)
              handleShare(readerToolsOpenerRef.current ?? readerMenuButtonRef.current)
            }}
            className="text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-300 active:scale-95 transition-transform duration-150"
            aria-label={focusedReaderCopy.share}
            data-ai-action="study-share"
          >
            <IconShare size={20} /><span>{focusedReaderCopy.share}</span>
          </button>
          <button
            onClick={() => {
              toggleFavorite()
              setReaderMenuOpen(false)
            }}
            aria-label={isFavorited ? focusedReaderCopy.removeFavorite : focusedReaderCopy.addFavorite}
            className={`text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isFavorited ? 'text-saffron dark:text-saffron-light' : ''}`}
            data-ai-action="toggle-favorite"
          >
            {isFavorited ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}<span>{isFavorited ? focusedReaderCopy.removeFavorite : focusedReaderCopy.addFavorite}</span>
          </button>
          <button
            onClick={() => {
              setReaderMenuOpen(false)
              if (isBookmarked) {
                if (currentBookmark) {
                  const result = removeBookmark(currentBookmark.id)
                  announceAction(result.persisted ? studyExperienceCopy.bookmarkRemoved : studyExperienceCopy.storageUnavailable)
                }
                return
              }

              setControlsOpen(false)
              setShowBookmarkForm(true)
            }}
            aria-label={isBookmarked ? focusedReaderCopy.removeBookmark : focusedReaderCopy.addBookmark}
            className={`text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isBookmarked ? 'text-saffron dark:text-saffron-light' : ''}`}
            data-ai-action="toggle-bookmark"
          >
            {isBookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}<span>{isBookmarked ? focusedReaderCopy.removeBookmark : focusedReaderCopy.addBookmark}</span>
          </button>
        </div>

        <details className="study-reader-about"><summary>{locale === 'pa' ? 'ਇਸ ਪਾਠ ਬਾਰੇ' : locale === 'hi' ? 'इस पाठ के बारे में' : 'About this reading'}<span aria-hidden="true">⌄</span></summary><div className="study-reader-about__body">
      <div
        className={`study-reader-hero ${isHukamnamaMode ? 'study-reader-hero--hukamnama' : 'study-reader-hero--bani'} px-4 py-4 mb-4`}
        aria-labelledby="study-reader-title"
        data-testid="study-reader-header"
      >
        <div className="study-reader-hero__kicker-row">
          <p className="eyebrow mb-0">
            {isHukamnamaMode ? 'Daily Hukamnama' : isRandomHukamnamaMode ? 'Personal Hukamnama' : studyCopy.eyebrow}
          </p>
          {hukamnamaDateLabel ? (
            <p className="study-reader-hero__date">{hukamnamaDateLabel}</p>
          ) : null}
        </div>
        {readerMeta ? (
          <p className="study-reader-hero__meta">
            {readerMeta}
          </p>
        ) : null}
        <p className="study-reader-hero__body">
          {readerIntroBody}
        </p>
        {currentEntry ? (
          <p className="study-reader-source-detail">
            {[`${currentReadingUnit} ${currentEntry.ang}`, currentEntry.raag, currentEntry.writer].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {isHukamnamaMode && hukamnamaResult.data?.shabadId ? (
          <button
            onClick={() => navigate(`/study?shabadId=${hukamnamaResult.data?.shabadId}`)}
            className="study-reader-hero__cta"
          >
            {studyCopy.goToSourceShabad}
          </button>
        ) : null}
      </div>

      {(readerEditorialCopy?.historicalNote || readerEditorialCopy?.practiceNote || readerEditorialCopy?.sourceRefs.length) ? (
        <DisclosureSection
          storageKey={`study-reader-context-${baniIdParam ?? baniDbIdParam ?? currentSource}`}
          title={studyExperienceCopy.contextTitle}
          summary={studyExperienceCopy.contextSummary}
          defaultOpen={false}
          className="section-shell-quiet mb-4 px-4 py-3"
          bodyClassName="mt-4 grid gap-3 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/72"
          sectionId="study-reader-context"
          testId="study-reader-context"
        >
            {readerEditorialCopy.historicalNote ? (
              <p>
                <span className="font-semibold text-ink dark:text-dark-text">Context: </span>
                {readerEditorialCopy.historicalNote}
              </p>
            ) : null}
            {readerEditorialCopy.practiceNote ? (
              <p>
                <span className="font-semibold text-ink dark:text-dark-text">Practice: </span>
                {readerEditorialCopy.practiceNote}
              </p>
            ) : null}
            {readerEditorialCopy.sourceRefs.length > 0 ? (
              <div>
                <p className="font-semibold text-ink dark:text-dark-text">Provenance</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {readerEditorialCopy.sourceRefs.map(ref => (
                    <li key={`${ref.label}-${ref.note}`}>
                      {ref.url ? (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="interactive-focus rounded-sm font-medium text-gold-dark underline decoration-gold/35 underline-offset-2 dark:text-gold-light"
                        >
                          {ref.label}
                        </a>
                      ) : (
                        <span className="font-medium">{ref.label}</span>
                      )}
                      {': '}
                      {ref.note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
        </DisclosureSection>
      ) : null}

      {isAmritKeertanContext && (
        <div className="section-shell-quiet px-4 py-4 mb-4" data-testid="study-amrit-keertan-context">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">From Amrit Keertan</p>
              <p className="mt-2 font-sans text-sm font-semibold text-ink dark:text-dark-text">
                {amritKeertanContextMeta || 'Book index'}
              </p>
              <p className="mt-1 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/66">
                This shabad opened from the Amrit Keertan book order; source Ang below shows where the shabad appears in scripture.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/banis/amrit-keertan/${akHeaderIdParam}`)}
              className="interactive-focus rounded-full border border-gold/20 bg-gold/[0.08] px-4 py-2 font-sans text-xs font-semibold text-gold-dark dark:border-gold/25 dark:bg-gold/10 dark:text-gold-light"
            >
              Back to Section
            </button>
          </div>
        </div>
      )}

</div></details>
        <div className="study-reader-secondary-tools"><SoundscapeControls context="study" variant="compact" /></div>
      </ModalSheet>

      {lengthOpen && supportedSundarGutkaBaniId && effectiveSgLength ? <Suspense fallback={<div role="status" className="sr-only">{locale === 'pa' ? 'ਲੰਬਾਈ ਚੋਣਾਂ ਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ…' : locale === 'hi' ? 'लंबाई विकल्प खुल रहे हैं…' : 'Opening Bani lengths…'}</div>}><BaniLengthSheet open onClose={closeBaniLengths} baniId={supportedSundarGutkaBaniId} currentLength={effectiveSgLength} usualLength={rememberedSgLength ?? effectiveSgLength} availableLengths={availableSundarGutkaLengths} describeDestination={describeBaniLengthDestination} onSelect={handleSundarGutkaLengthChange} pending={lengthSelection.pending} /></Suspense> : null}

      <ModalSheet open={sectionsOpen} onClose={() => setSectionsOpen(false)} title={presentationCopy.sections} description={entrySequenceCopy.entryOutlineBody} className="study-reader-sections-sheet rounded-lg" testId="study-reader-sections-sheet" initialFocusRef={contentsHeadingRef}>
        <div className="study-reader-sheet__heading"><h2 ref={contentsHeadingRef} tabIndex={-1}>{presentationCopy.sections}</h2><button type="button" aria-label={presentationCopy.close} onClick={() => setSectionsOpen(false)}><IconClose size={18} /></button></div>
        <div ref={contentsScrollRef} className="study-reader-sections-sheet__scroll" onScroll={event => { if (findQuery.trim()) findSession.current.scrollTop = event.currentTarget.scrollTop }}>
        {sectionsOpen ? <Suspense fallback={null}><BaniFindPanel entries={entries} onJump={jumpToLine} currentEntryIndex={safeActiveEntryIndex} query={findQuery} onQueryChange={query => { findSession.current.scrollTop = 0; setFindQuery(query) }} /></Suspense> : null}
        <h3 className="study-reader-section-list__title">{presentationCopy.sections}</h3>
        <ol className="study-reader-section-list">{entryOutline.map((item, index) => <li key={item.sectionId}><button type="button" aria-current={index === safeActiveEntryIndex ? 'location' : undefined} onClick={() => jumpToEntry(index)}><span className="study-reader-section-number">{String(index + 1).padStart(2, '0')}</span><span><span className={getScriptTextFontClass(scriptMode)} lang={getScriptTextLang(scriptMode)}>{renderScriptText(item.title, scriptMode)}</span><small>{getSourceReaderUnit(item.entry.source, item.entry.scripture)} {item.entry.ang}{item.entry.writer ? ` · ${item.entry.writer}` : ''}</small></span></button></li>)}</ol>
        </div>
      </ModalSheet>

      {readerStatus === 'degraded' ? (
        <div
          role="status"
          className="section-shell-quiet mb-4 flex items-start justify-between gap-3 px-4 py-3"
          data-testid="study-reader-saved-copy"
          data-ai-surface="study-reader-saved-copy"
          data-ai-state="degraded"
        >
          <p className="font-sans text-xs leading-5 text-ink/75 dark:text-dark-text/76">
            {isBaniDbMode && !baniResult.isCached && !usingSavedFallback ? studyExperienceCopy.retainedReading : studyExperienceCopy.savedOffline}
          </p>
          <button
            type="button"
            onClick={retryReader}
            className="shrink-0 rounded-full border border-saffron/30 px-3 py-2 font-sans text-xs font-medium text-saffron dark:text-saffron-light"
            data-ai-action="retry-study"
          >
            {studyExperienceCopy.tryLive}
          </button>
        </div>
      ) : null}

      <div aria-live="polite" aria-atomic="true" className="study-reader-action-status">
        {actionNotice ? (
          <div role="status" className="inline-flex rounded-full bg-saffron/10 px-3 py-1.5 font-sans text-xs font-medium text-saffron dark:bg-gold/12 dark:text-gold-light">
            {actionNotice}
          </div>
        ) : null}
      </div>

      {shareHighlightContent ? (
        <Suspense
          fallback={(
            <div role="status" className="sr-only">
              Preparing share highlight.
            </div>
          )}
        >
          <ShareHighlightSheet
            open
            onClose={closeShareHighlight}
            content={shareHighlightContent}
            locale={locale}
            onNotice={announceAction}
          />
        </Suspense>
      ) : null}

      <div className="study-reader-layout">
      <ModalSheet
        open={controlsOpen}
        onClose={closeReaderAppearance}
        title={studyCopy.readerControls}
        description={focusedReaderCopy.settingsDescription}
        testId="study-reader-settings-sheet"
        className="study-reader-settings-sheet max-h-[min(88dvh,48rem)] rounded-lg"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-sand/25 dark:bg-dark-text/15" />
        <div className="study-reader-sheet__header">
          <div>
            <h2 className="study-reader-sheet__title">{locale === 'en' ? 'Reading appearance' : studyCopy.readerControls}</h2>
          </div>
          <button
            type="button"
            onClick={closeReaderAppearance}
            aria-label={focusedReaderCopy.closeSettings}
            className="study-reader-sheet__close"
          >
            <IconClose size={17} />
          </button>
        </div>

        <div className="study-reader-settings-sheet__scroll">
          <div id="study-reader-controls-panel" className="study-reader-controls__panel">
            <fieldset className="study-reader-controls__group">
              <legend>{focusedReaderCopy.fontSize}</legend>
              <div className="study-reader-controls__font-size">
                <span aria-hidden="true">A</span>
                <input
                  type="range"
                  min="18"
                  max="34"
                  step="1"
                  value={fontSize}
                  onChange={event => setFontSize(Number(event.target.value))}
                  aria-label={focusedReaderCopy.fontSize}
                  aria-valuetext={`${fontSize}px`}
                />
                <span className="study-reader-controls__font-size-large" aria-hidden="true">A</span>
                <output>{fontSize}px</output>
              </div>
            </fieldset>
            {appearancePreview ? <div className="study-reader-preview" data-support-text-size={supportTextSize} role="region" aria-label={locale === 'en' ? 'Text preview' : focusedReaderCopy.fontSize} tabIndex={0}>
              <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} study-reader-preview__text`} style={{ fontSize: `${fontSize}px`, textAlign, lineHeight: lineSpacing === 'relaxed' ? 1.85 : 1.6 }}>{formatGurbaniText(appearancePreview.gurmukhi, { scriptMode, larivaar, showVishraam: true, larivaarText: appearancePreview.larivaar })}</p>
              {presentation === 'study' && showTransliteration && appearancePreview.transliteration ? <p data-reader-support="transliteration" lang="pa-Latn">{appearancePreview.transliteration}</p> : null}
              {presentation === 'study' && previewMeaning ? <p data-reader-support="meaning" lang={meaningLanguage === 'pa' ? getScriptTextLang(scriptMode) : meaningLanguage === 'hi' ? 'hi' : 'en'} className={meaningLanguage === 'pa' ? getScriptTextFontClass(scriptMode) : meaningLanguage === 'hi' ? getScriptTextFontClass('devanagari') : undefined}>{meaningLanguage === 'pa' ? renderScriptText(previewMeaning, scriptMode) : previewMeaning}</p> : null}
              <p className="study-reader-preview__caption">{locale === 'en' ? 'Preview' : focusedReaderCopy.fontSize} · {currentReadingUnit} {appearancePreview.ang}</p>
            </div> : null}
<fieldset className="study-reader-controls__group"><legend>{locale === 'en' ? 'Reading presentation' : studyCopy.readerControls}</legend><div className="study-reader-mode">{(['read', 'study'] as const).map(mode => <label key={mode}><input type="radio" name="reader-presentation-settings" value={mode} checked={presentation === mode} onChange={() => changeReaderPresentation(mode)} /><span>{presentationCopy[mode]}</span></label>)}</div></fieldset><fieldset className="study-reader-controls__group">
              <legend>{locale === 'pa' ? 'ਪੰਕਤੀ ਵਿੱਥ' : locale === 'hi' ? 'पंक्ति का अंतर' : 'Spacing'}</legend>
              <div className="study-reader-controls__grid study-reader-controls__grid--two">
                {(['compact', 'relaxed'] as const).map(option => {
                  const selected = lineSpacing === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setLineSpacing(option)}
                      aria-pressed={selected}
                      className={readerControlOptionClass(selected)}
                    >
                      {lineSpacingLabels[option]}
                    </button>
                  )
                })}
              </div>
            </fieldset><fieldset className="study-reader-controls__group"><legend>{locale === 'pa' ? 'ਲਿਖਤ ਦਾ ਮਿਲਾਨ' : locale === 'hi' ? 'संरेखण' : 'Alignment'}</legend><div className="study-reader-controls__grid study-reader-controls__grid--two">                {(['left', 'center'] as const).map(option => {
                  const selected = textAlign === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTextAlign(option)}
                      aria-pressed={selected}
                      className={readerControlOptionClass(selected)}
                    >
                      {textAlignmentLabels[option]}
                    </button>
                  )
                })}
              </div>
            </fieldset><fieldset className="study-reader-controls__group"><legend>{locale === 'pa' ? 'ਦਿੱਖ' : locale === 'hi' ? 'दिखावट' : 'Appearance'}</legend><div className="study-reader-controls__grid study-reader-controls__grid--three">{(['light', 'dark', 'system'] as const).map(mode => <button key={mode} type="button" aria-pressed={themeMode === mode} onClick={() => setThemeMode(mode)} className={readerControlOptionClass(themeMode === mode)}>{locale === 'pa' ? ({ light: 'ਹਲਕੀ', dark: 'ਗੂੜ੍ਹੀ', system: 'ਡਿਵਾਈਸ' }[mode]) : locale === 'hi' ? ({ light: 'हल्की', dark: 'गहरी', system: 'डिवाइस' }[mode]) : ({ light: 'Light', dark: 'Dark', system: 'System' }[mode])}</button>)}</div></fieldset>
            <fieldset className="study-reader-controls__group">
              <legend>{locale === 'en' ? 'Pause marks' : studyCopy.vishraam}</legend>
              <p className="study-reader-settings-note">{locale === 'pa' ? 'ਪਾਠ ਵਿੱਚ ਠਹਿਰਾਓ ਲਈ ਦ੍ਰਿਸ਼ ਸੰਕੇਤ। ਗੁਰਬਾਣੀ ਦੇ ਮੂਲ ਵਿਸ਼ਰਾਮ ਚਿੰਨ੍ਹ ਦਿਸਦੇ ਰਹਿੰਦੇ ਹਨ।' : locale === 'hi' ? 'पाठ में विराम के दृश्य संकेत। मूल गुरबाणी के विराम चिह्न दिखाई देते रहते हैं।' : 'Visual pause guidance; scripture punctuation stays visible.'}</p>
                <button
                  type="button"
                  onClick={() => setShowVishraam(!showVishraam)}
                  aria-pressed={showVishraam}
                  className={readerControlOptionClass(showVishraam)}
                >
                  {locale === 'en' ? 'Show pause guidance' : studyCopy.vishraam}: {showVishraam ? commonCopy.on : commonCopy.off}
                </button>
              {showVishraam && (
                <div className="study-reader-controls__subgrid" aria-label="Vishraam source">
                  {Object.entries(visraamSourceLabels).map(([key, label]) => {
                    const selected = visraamSource === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setVisraamSource(key as typeof visraamSource)}
                        aria-pressed={selected}
                        className={readerControlOptionClass(selected)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </fieldset>
            <details className="study-reader-settings-disclosure"><summary><span>{locale === 'en' ? 'Study layers' : focusedReaderCopy.readingLayers}</span><small>{meaningLanguageLabels[meaningLanguage]} · {studyCopy.transliteration} {showTransliteration ? commonCopy.on : commonCopy.off}</small><span aria-hidden="true">⌄</span></summary><div className="study-reader-settings-disclosure__body"><p className="study-reader-settings-note">{locale === 'en' ? 'These layers appear in Study. Your choices stay saved when you switch to Read.' : focusedReaderCopy.settingsDescription}</p>
            <fieldset className="study-reader-controls__group"><legend>{locale === 'pa' ? 'ਅਰਥ ਅਤੇ ਲਿਪੀਅੰਤਰਨ ਦਾ ਆਕਾਰ' : locale === 'hi' ? 'अर्थ और लिप्यंतरण का आकार' : 'Meaning and transliteration size'}</legend><div className="study-reader-controls__grid study-reader-controls__grid--three">{(['standard', 'large', 'extra-large'] as const).map(size => <button key={size} type="button" aria-pressed={supportTextSize === size} onClick={() => setSupportTextSize(size)} className={readerControlOptionClass(supportTextSize === size)}>{locale === 'pa' ? ({ standard: 'ਆਮ', large: 'ਵੱਡਾ', 'extra-large': 'ਹੋਰ ਵੱਡਾ' }[size]) : locale === 'hi' ? ({ standard: 'सामान्य', large: 'बड़ा', 'extra-large': 'और बड़ा' }[size]) : ({ standard: 'Standard', large: 'Large', 'extra-large': 'Extra large' }[size])}</button>)}</div></fieldset>
            <fieldset className="study-reader-controls__group">
              <legend>{focusedReaderCopy.meaning}</legend>
              <div className="study-reader-controls__grid study-reader-controls__grid--four">
                {(['none', 'en', 'pa', 'hi'] as const).map(option => {
                  const selected = meaningLanguage === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMeaningLanguage(option)}
                      aria-pressed={selected}
                      className={readerControlOptionClass(selected, 'px-2 text-[11px]')}
                    >
                      {meaningLanguageLabels[option]}
                    </button>
                  )
                })}
              </div>
            </fieldset><fieldset className="study-reader-controls__group"><legend>{studyCopy.transliteration}</legend><div className="study-reader-controls__grid study-reader-controls__grid--two">                <button
                  type="button"
                  onClick={() => setShowTransliteration(!showTransliteration)}
                  aria-pressed={showTransliteration}
                  className={readerControlOptionClass(showTransliteration)}
                >
                  {studyCopy.transliteration} {showTransliteration ? commonCopy.on : commonCopy.off}
                </button></div></fieldset>            {meaningLanguage === 'en' ? (
              <fieldset className="study-reader-controls__group">
                <legend>{focusedReaderCopy.englishSource}</legend>
                <div className="study-reader-controls__grid study-reader-controls__grid--three">
                  {Object.entries(englishSourceLabels).map(([key, label]) => {
                    const selected = englishSource === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEnglishSource(key as typeof englishSource)}
                        aria-pressed={selected}
                        className={readerControlOptionClass(selected)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            {meaningLanguage === 'pa' ? (
              <fieldset className="study-reader-controls__group">
                <legend>{focusedReaderCopy.punjabiSource}</legend>
                <div className="study-reader-controls__grid study-reader-controls__grid--two">
                  {Object.entries(punjabiSourceLabels).map(([key, label]) => {
                    const selected = punjabiSource === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPunjabiSource(key as typeof punjabiSource)}
                        aria-pressed={selected}
                        className={readerControlOptionClass(selected)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            {meaningLanguage === 'hi' ? (
              <fieldset className="study-reader-controls__group">
                <legend>{focusedReaderCopy.hindiSource}</legend>
                <div className="study-reader-controls__grid study-reader-controls__grid--two">
                  {Object.entries(hindiSourceLabels).map(([key, label]) => {
                    const selected = hindiSource === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setHindiSource(key as typeof hindiSource)}
                        aria-pressed={selected}
                        className={readerControlOptionClass(selected)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

</div></details>

            <details className="study-reader-settings-disclosure"><summary><span>{locale === 'en' ? 'Text options' : focusedReaderCopy.script}</span><small>{readerScriptModeLabels[scriptMode]}</small><span aria-hidden="true">⌄</span></summary><div className="study-reader-settings-disclosure__body"><fieldset className="study-reader-controls__group">
              <legend>{focusedReaderCopy.script}</legend>
              <div className="study-reader-controls__grid study-reader-controls__grid--two">
                {(['gurmukhi', 'devanagari'] as const).map(mode => {
                  const selected = scriptMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setScriptMode(mode)}
                      aria-pressed={selected}
                      className={readerControlOptionClass(selected)}
                    >
                      {readerScriptModeLabels[mode]}
                    </button>
                  )
                })}
              </div>
            </fieldset><fieldset className="study-reader-controls__group">
              <legend>{focusedReaderCopy.readingLayers}</legend>
              <div className="study-reader-controls__grid study-reader-controls__grid--three">

                <button
                  type="button"
                  onClick={() => setLarivaar(!larivaar)}
                  aria-pressed={larivaar}
                  className={readerControlOptionClass(larivaar)}
                >
                  {studyCopy.larivaar}: {larivaar ? commonCopy.on : commonCopy.off}
                </button>
              </div>
            </fieldset>            </div></details>
          </div>
        </div>
      </ModalSheet>

      <ModalSheet
        open={showBookmarkForm}
        onClose={() => setShowBookmarkForm(false)}
        title={studyCopy.saveBookmark}
        description={focusedReaderCopy.bookmarkDescription}
        testId="study-bookmark-form"
        initialFocusRef={bookmarkInputRef}
        className="study-reader-bookmark-sheet rounded-lg p-4"
      >
        <form onSubmit={event => {
          event.preventDefault()
          handleSaveBookmark()
        }}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-dark-text">{studyCopy.saveBookmark}</h2>
              <p className="mt-1 font-sans text-xs leading-5 text-ink/68 dark:text-dark-text/68">
                {focusedReaderCopy.bookmarkDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBookmarkForm(false)}
              aria-label={commonCopy.close}
              className="study-reader-sheet__close"
            >
              <IconClose size={17} />
            </button>
          </div>
          <label htmlFor="study-bookmark-note" className="font-sans text-xs font-semibold text-ink dark:text-dark-text">
            {focusedReaderCopy.bookmarkNote}
          </label>
          <input
            ref={bookmarkInputRef}
            id="study-bookmark-note"
            name="study-bookmark-note"
            type="text"
            aria-label={focusedReaderCopy.bookmarkNote}
            value={bookmarkText}
            onChange={e => setBookmarkText(e.target.value)}
            placeholder={studyCopy.addNote}
            className="mt-2 w-full rounded-lg border border-sand/15 bg-parchment-low px-3 py-2 font-sans text-sm text-ink outline-none transition-colors duration-300 focus:border-saffron/30 dark:border-dark-text/10 dark:bg-dark-surface dark:text-dark-text"
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowBookmarkForm(false)}
              className="min-h-[44px] rounded-lg border border-sand/15 font-sans text-sm font-semibold text-ink dark:border-dark-text/10 dark:text-dark-text"
            >
              {focusedReaderCopy.cancel}
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-lg bg-saffron py-2 font-sans text-sm font-semibold text-white transition-colors duration-300"
            >
              {studyCopy.saveBookmark}
            </button>
          </div>
        </form>
      </ModalSheet>

        <div className="study-reader-body">

      {isRandomHukamnamaMode && currentEntry && randomHukamnamaAngParam && (
        <div className="section-shell p-4 mb-4">
          <p className="font-sans font-semibold text-saffron dark:text-gold-light text-sm">
            Hukamnama after Ardaas
          </p>
          <p className="font-sans text-ink/68 dark:text-dark-text/64 text-xs">
            Selected from Sri Guru Granth Sahib Ji · Ang {randomHukamnamaAngParam}
            {currentEntry.ang !== randomHukamnamaAngParam
              ? `; this shabad begins on Ang ${currentEntry.ang}.`
              : '.'}
          </p>
          <p className="mt-2 font-sans text-xs text-ink/68 dark:text-dark-text/64">
            {ARDAAS_HUKAMNAMA_EDITORIAL_COPY.practiceNote}
          </p>
        </div>
      )}

      {isExactSearchResult && currentEntry && (
        <div className="section-shell p-4 mb-4">
          <p className="font-sans font-semibold text-saffron dark:text-gold-light text-sm">{studyCopy.exactSearchResult}</p>
          <p className="font-sans text-ink/68 dark:text-dark-text/64 text-xs">
            {currentEntry.scripture} · {getSourceReaderUnit(currentEntry.source, currentEntry.scripture)} {currentEntry.ang}{verseIdParam ? ` · ${studyCopy.verse} ${verseIdParam}` : ''}
          </p>
          {verseIdParam && fullShabadEntry && (currentEntry.lines?.length ?? 0) < (fullShabadEntry.lines?.length ?? 0) && (
            <button
              onClick={() => navigate(`/study?shabadId=${shabadIdParam}`)}
              className="mt-2 font-sans text-xs text-saffron dark:text-gold-light underline underline-offset-2"
            >
              {studyCopy.openFullShabad}
            </button>
          )}
        </div>
      )}

      {baniName && !isExactShabadMode && !isBaniDbMode && isBaniRangeMode && (
        <div className="section-shell p-4 mb-4" aria-label="Reading range">
          <p className="font-sans text-ink/68 dark:text-dark-text/64 text-xs">
            {currentReadingUnit} {currentAng} of {startAngParam ?? angParam}–{endAngParam}
          </p>
        </div>
      )}

      <div id="study-reading-content" aria-label={presentationCopy[presentation]} className="study-reading-content" data-testid="study-entry-list" onPointerDown={readerInteraction.onPointerDown} onClick={readerInteraction.onContentClick}>
        {renderedEntries.map(({ entry, entryIndex }) => {
          const shabadId = parseShabadId(entry)
          return (
            <StudyCard
              key={entry.id}
              entry={entry}
              sectionId={entryOutline[entryIndex]?.sectionId}
              sectionEyebrow={`${getSourceReaderUnit(entry.source, entry.scripture)} ${entry.ang}`}
              firstPassage={entryIndex === 0}
              wordData={shabadId ? wordDataMap[shabadId] ?? null : null}
              showHeaderBlock
              presentation={presentation}
              onOpenReaderAppearance={openReaderSettingsAt}
              onOpenSections={openReaderSections}
              onPreviewWord={readerInteraction.previewWord}
              showAudioPlayer={false}
              onSavePhrase={handleSavePhrase}
              onCopyLine={handleCopyLine}
              onShareLine={handleShareLine}
              onBookmarkLine={handleBookmarkLine}
              isLineBookmarked={(line, item) => isLineBookmarked(line, item)}
              isPhraseSaved={(line) => isPhraseSaved(line)}
            />
          )
        })}
      </div>

      <ReaderFinishPanel readingPath={usingSavedFallback ? '' : `${location.pathname}${location.search}`} onBack={handleReaderBack} onReadAgain={() => {
        const params = new URLSearchParams(searchParamsString)
        params.delete('resumeVerseId')
        params.delete('resumeSource')
        if (entries[0]?.ang) params.set('ang', String(entries[0].ang))
        const practice = useNitnemPracticeStore.getState()
        const option = getSelectedNitnemReading(`${location.pathname}?${params}`, useNitemStore.getState().selectedIds)
        let sessionOnly = false
        if (option && practice.active && params.get('nitnemPractice') === practice.active.startedAt
          && getExactReadingKey(`${location.pathname}?${params}`) === getExactReadingKey(practice.active.readingPath)) {
          sessionOnly = !practice.start(option.id, `${location.pathname}?${params}`)
          const fresh = useNitnemPracticeStore.getState().active
          if (fresh) params.set('nitnemPractice', fresh.startedAt)
        }
        setSearchParams(params, { replace: true, state: { ...(location.state as object ?? {}), nitnemSessionOnly: sessionOnly } })
        readerInteraction.reveal()
        resetReaderViewport()
      }} />

      {isArdaasReaderFlow && (
        <div className="section-shell p-4 mt-4">
          <p className="eyebrow">Ardaas + Hukamnama</p>
          <p className="mt-2 font-sans text-sm text-ink/65 dark:text-dark-text/65">
            {ARDAAS_HUKAMNAMA_EDITORIAL_COPY.practiceNote}
          </p>
          <button
            type="button"
            onClick={handleTakeHukamnama}
            disabled={isTakingHukamnama}
            className="mt-4 w-full rounded-lg bg-saffron px-4 py-3 font-sans text-sm font-semibold text-white disabled:opacity-70"
          >
            {isTakingHukamnama ? 'Taking Hukamnama...' : 'Take Hukamnama'}
          </button>
        </div>
      )}

      {showAngNavigation && currentAng && navMinAng !== null && navMaxAng !== null && (
        <nav className="study-reader-ang-navigation" aria-label={`${currentReadingUnit} navigation`} data-testid="study-ang-navigation">
          <button
            onClick={() => navTo(currentAng - 1)}
            disabled={currentAng <= navMinAng}
            className="study-reader-ang-navigation__button"
          >&#8592; {currentReadingUnit} {previousNavAng ?? navMinAng}</button>
          <button
            onClick={() => navTo(currentAng + 1)}
            disabled={currentAng >= navMaxAng}
            className="study-reader-ang-navigation__button study-reader-ang-navigation__button--next"
          >{currentReadingUnit} {nextNavAng ?? navMaxAng} &#8594;</button>
        </nav>
      )}

        </div>
      </div>
    </div>
  )
}
