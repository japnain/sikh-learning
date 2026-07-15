import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { fetchAng, fetchShabad } from '../api/banidb'
import SurfaceStateCard from '../components/SurfaceStateCard'
import { useProgressStore } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useBani } from '../hooks/useBani'
import { useShabad } from '../hooks/useShabad'
import { useHukamnama } from '../hooks/useHukamnama'
import { useMultiShabadWordData } from '../hooks/useMultiShabadWordData'
import SoundscapeControls from '../components/SoundscapeControls'
import StudyCard from '../components/StudyCard'
import StudyEntryNavigator from '../components/StudyEntryNavigator'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useReadingProgressStore } from '../store/readingProgress'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import type { ScriptureEntry, ScriptureLine, SundarGutkaLength, UiLocale } from '../types'
import {
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
import { getEntryMeaningText, getLineMeaningText, getScriptTextFontClass, getScriptTextLang, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { findCanonicalBaniById } from '../utils/baniRouteResolver'
import { IconArrowLeft, IconShare, IconBookmark, IconBookmarkFilled, IconHeart, IconHeartFilled, IconMoreHorizontal } from '../components/icons'
import { useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'
import { getUiCopy } from '../utils/uiCopy'
import { getEditorialCopy } from '../content/editorialCopy'
import {
  ARDAAS_HUKAMNAMA_EDITORIAL_COPY,
  DAILY_HUKAMNAMA_EDITORIAL_COPY,
  formatReaderEditorialDate,
  getReaderEditorialCopyForBani,
  getReaderEditorialCopyForBaniDbId,
} from '../content/readerEditorialCopy'
import DisclosureSection from '../components/DisclosureSection'
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

type BaniSource = SourceReaderId

const PAGINATED_ENTRY_THRESHOLD = 4

function getEntrySourceDisplay(entry: ScriptureEntry | null, fallbackSource: BaniSource) {
  if (entry?.sourceName && entry.sourceName !== entry.scripture) return entry.sourceName
  const source = (entry?.source ?? fallbackSource) as BaniSource
  return SOURCE_READER_META[source]?.name ?? entry?.scripture ?? SOURCE_READER_META.G.name
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
  bookmarkExists: string
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
    bookmarkExists: 'This passage is already bookmarked.',
    favoriteAdded: 'Added to favorites.',
    favoriteRemoved: 'Removed from favorites.',
    lineCopied: 'Verse copied to clipboard.',
    lineBookmarked: 'Verse bookmarked.',
    phraseSaved: 'Verse saved to review.',
    phraseAlreadySaved: 'This verse is already saved for review.',
    entryOutlineEyebrow: 'On This Ang',
    entryOutlineBody: 'Jump between shabads instead of working through one long continuous scroll.',
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
    bookmarkExists: 'ਇਹ ਪਾਠ ਪਹਿਲਾਂ ਹੀ ਬੁੱਕਮਾਰਕ ਕੀਤਾ ਹੋਇਆ ਹੈ।',
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
    bookmarkExists: 'यह अंश पहले से बुकमार्क किया हुआ है।',
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
    entryOutlineBody: 'Move between the Pauris in this Vaar without working through one long continuous scroll.',
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
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const punjabiSourceLabels = getPunjabiSourceLabels(locale)
  const hindiSourceLabels = getHindiSourceLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)
  const textAlignmentLabels = getTextAlignmentLabels(locale)
  const visraamSourceLabels = getVisraamSourceLabels(locale)

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

  useEffect(() => {
    if (!isApiMode) navigate('/library', { replace: true })
  }, [isApiMode, navigate])

  const angResult = useAng(
    isAngMode ? angParam! : 1,
    isAngMode ? source! : 'G'
  )
  const baniResult = useBani(isBaniDbMode ? baniDbIdParam! : null, requestedSgLength)
  const shabadResult = useShabad(isExactShabadMode ? shabadIdParam! : null)
  const hukamnamaResult = useHukamnama(hukamnamaDateParam, isHukamnamaMode)
  const effectiveSgLength = supportedSundarGutkaBaniId
    ? (baniResult.resolvedLength ?? requestedSgLength)
    : null

  useEffect(() => {
    if (!supportedSundarGutkaBaniId || !supportedSundarGutkaBani || !effectiveSgLength) return

    if (rememberedSgLength !== effectiveSgLength) {
      setSundarGutkaLength(supportedSundarGutkaBaniId, effectiveSgLength)
    }

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
      setSearchParams(nextParams, { replace: true })
    }
  }, [
    angParam,
    effectiveSgLength,
    rememberedSgLength,
    searchParamsString,
    setSearchParams,
    setSundarGutkaLength,
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

  const fullShabadEntry = isExactShabadMode ? (shabadResult.entries[0] ?? null) : null
  const exactEntries = useMemo(() => {
    if (!isExactShabadMode || !fullShabadEntry) return []
    if (!verseIdParam) return [fullShabadEntry]

    const matchedLines = fullShabadEntry.lines?.filter(line => line.verseId === verseIdParam) ?? []
    if (matchedLines.length === 0) return [fullShabadEntry]

    return [sliceEntryToLines(fullShabadEntry, matchedLines)]
  }, [fullShabadEntry, isExactShabadMode, verseIdParam])

  const entries = useMemo(() => {
    if (isHukamnamaMode) return hukamnamaResult.data ? [hukamnamaResult.data.entry] : []
    if (isExactShabadMode) return exactEntries
    if (isBaniDbMode) return baniPageEntries
    if (isAngMode) return angResult.entries
    return []
  }, [angResult.entries, baniPageEntries, exactEntries, hukamnamaResult.data, isAngMode, isBaniDbMode, isExactShabadMode, isHukamnamaMode])

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
  const readerStatus =
    isHukamnamaMode ? hukamnamaResult.status :
    isExactShabadMode ? shabadResult.status :
    isBaniDbMode ? baniResult.status :
    angResult.status

  const [activeEntryIndex, setActiveEntryIndex] = useState(0)
  const shouldPaginateEntries = entries.length > PAGINATED_ENTRY_THRESHOLD
  const safeActiveEntryIndex = shouldPaginateEntries
    ? Math.max(0, Math.min(activeEntryIndex, entries.length - 1))
    : 0
  const currentEntry = entries[safeActiveEntryIndex] ?? null
  const renderedEntries = useMemo(
    () => shouldPaginateEntries && currentEntry
      ? [{ entry: currentEntry, entryIndex: safeActiveEntryIndex }]
      : entries.map((entry, entryIndex) => ({ entry, entryIndex })),
    [currentEntry, entries, safeActiveEntryIndex, shouldPaginateEntries]
  )

  useEffect(() => {
    if (!shouldPaginateEntries) {
      setActiveEntryIndex(0)
      return
    }

    const resumeIndex = resumeVerseIdParam
      ? entries.findIndex(entry => entry.lines?.some(line => line.verseId === resumeVerseIdParam))
      : -1
    setActiveEntryIndex(resumeIndex >= 0 ? resumeIndex : 0)
  }, [entries, resumeVerseIdParam, searchParamsString, shouldPaginateEntries])

  const currentAng = currentEntry?.ang ?? angParam ?? baniResult.entries[0]?.ang ?? null
  const currentSource = (currentEntry?.source ?? source ?? 'G') as BaniSource
  const currentReadingUnit = getSourceReaderUnit(currentSource, currentEntry?.scripture)
  const currentShabadId = currentEntry ? (parseShabadId(currentEntry) ?? undefined) : undefined
  const englishSource = useLanguageStore(s => s.englishSource)
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
  const recordSwipeToday = useProgressStore(state => state.recordSwipeToday)
  const { addBookmark, hasBookmark } = useBookmarksStore()
  const { addFavorite, removeFavorite, favorites } = useFavoritesStore()
  const { addWord, vocab } = useVocabStore()
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
  const [isTakingHukamnama, setIsTakingHukamnama] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const readerControlsRef = useRef<HTMLDivElement | null>(null)
  const bookmarkFormRef = useRef<HTMLDivElement | null>(null)
  const bookmarkInputRef = useRef<HTMLInputElement | null>(null)
  const actionNoticeTimeoutRef = useRef<number | null>(null)
  const latestResumeVerseIdRef = useRef<number | null>(null)
  const resumeSyncFrameRef = useRef<number | null>(null)
  const canonicalResumePath = useMemo(() => {
    if (!shouldTrackProgress) return null

    if (isHukamnamaMode && hukamnamaDateParam) {
      return `/study?hukamnamaDate=${hukamnamaDateParam}`
    }

    if (!currentAng) return null

    const nextParams = new URLSearchParams()
    nextParams.set('source', currentSource)
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
    }

    const nextSearch = nextParams.toString()
    return nextSearch ? `/study?${nextSearch}` : '/study'
  }, [
    angParam,
    baniDbIdParam,
    baniIdParam,
    baniName,
    currentAng,
    currentSource,
    effectiveSgLength,
    endAngParam,
    hukamnamaDateParam,
    isBaniDbMode,
    isBaniRangeMode,
    isHukamnamaMode,
    shouldTrackProgress,
    startAngParam,
  ])

  const baseSession = useMemo(() => {
    if (!shouldTrackProgress || !currentAng || !canonicalResumePath) return null

    return {
      scriptureId: `${currentSource}-${currentAng}`,
      resumePath: canonicalResumePath,
    }
  }, [canonicalResumePath, currentAng, currentSource, shouldTrackProgress])

  useEffect(() => {
    if (!baseSession) return

    latestResumeVerseIdRef.current = null
    updateSession({
      ...baseSession,
      updatedAt: new Date().toISOString(),
    })
  }, [baseSession, updateSession])

  useEffect(() => {
    if (!baseSession || loading || typeof window === 'undefined') return

    const syncVisibleVerse = () => {
      resumeSyncFrameRef.current = null

      const verseElements = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="study-line"][data-verse-id]'))
      if (verseElements.length === 0) return

      const topOffset = 132
      const target =
        verseElements.find(element => element.getBoundingClientRect().top >= topOffset)
        ?? verseElements.find(element => element.getBoundingClientRect().bottom > topOffset)
        ?? verseElements[0]
      const nextVerseId = Number(target.dataset.verseId) || null

      if (!nextVerseId || nextVerseId === latestResumeVerseIdRef.current) return

      latestResumeVerseIdRef.current = nextVerseId
      updateSession({
        ...baseSession,
        resumeVerseId: nextVerseId,
        updatedAt: new Date().toISOString(),
      })
    }

    const scheduleSync = () => {
      if (resumeSyncFrameRef.current !== null) return
      resumeSyncFrameRef.current = window.requestAnimationFrame(syncVisibleVerse)
    }

    scheduleSync()
    window.addEventListener('scroll', scheduleSync, { passive: true })
    window.addEventListener('resize', scheduleSync)

    return () => {
      if (resumeSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(resumeSyncFrameRef.current)
        resumeSyncFrameRef.current = null
      }
      window.removeEventListener('scroll', scheduleSync)
      window.removeEventListener('resize', scheduleSync)
    }
  }, [baseSession, loading, updateSession, searchParamsString])

  useEffect(() => {
    if (!resumeVerseIdParam || loading || typeof window === 'undefined') return

    let timeoutId: number | null = null
    const scrollToResumeVerse = () => {
      const target = document.querySelector<HTMLElement>(`[data-verse-id="${resumeVerseIdParam}"]`)
      if (!target) return false

      target.scrollIntoView({ behavior: 'auto', block: 'start' })
      return true
    }

    const frameId = window.requestAnimationFrame(() => {
      if (!scrollToResumeVerse()) {
        timeoutId = window.setTimeout(() => {
          scrollToResumeVerse()
        }, 160)
      }
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [loading, resumeVerseIdParam, safeActiveEntryIndex, searchParamsString])

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

  const shareTextWithFallback = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text })
        announceAction(studyExperienceCopy.shareOpened)
        return
      } catch {
        try {
          await copyText(text)
          announceAction(studyExperienceCopy.shareUnavailable)
          return
        } catch {
          announceAction(studyExperienceCopy.shareCopied)
          return
        }
      }
    }

    await copyText(text)
    announceAction(studyExperienceCopy.shareCopied)
  }

  useEffect(() => {
    if (shouldTrackProgress && currentAng) {
      recordAng(currentSource, currentAng)
    }
  }, [currentAng, currentSource, recordAng, shouldTrackProgress])

  useEffect(() => {
    if (!shouldTrackProgress || loading || error || entries.length === 0) return
    recordSwipeToday()
  }, [entries.length, error, loading, recordSwipeToday, shouldTrackProgress])

  useEffect(() => {
    if (!controlsOpen || typeof window === 'undefined' || window.innerWidth > 640) return

    const frame = window.requestAnimationFrame(() => {
      const container = readerControlsRef.current
      if (!container) return

      const nav = document.querySelector('.app-nav')
      const navPadding = nav instanceof HTMLElement
        ? nav.getBoundingClientRect().height + 28
        : 120
      const visibleBottom = window.innerHeight - navPadding
      const rect = container.getBoundingClientRect()

      if (rect.bottom > visibleBottom) {
        window.scrollBy({
          top: rect.bottom - visibleBottom,
          behavior: 'smooth',
        })
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [controlsOpen])

  useEffect(() => {
    if (!showBookmarkForm || typeof window === 'undefined') return

    const frame = window.requestAnimationFrame(() => {
      bookmarkInputRef.current?.focus()
      bookmarkFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [showBookmarkForm])

  const handleShare = async () => {
    if (!currentEntry) return
    const text = [
      currentEntry.gurmukhi,
      currentEntry.transliteration,
      getEntryMeaningText(currentEntry, meaningLanguage, englishSource),
      baniName
        ? `— ${baniName} · ${currentReadingUnit} ${currentEntry.ang}`
        : `— ${currentEntry.scripture} · ${currentReadingUnit} ${currentEntry.ang}`,
      editorial?.brand.attribution ?? 'via NaamRas',
    ].filter(Boolean).join('\n')
    await shareTextWithFallback(text)
  }

  const shabadIds = useMemo(
    () => renderedEntries.map(({ entry }) => parseShabadId(entry)),
    [renderedEntries]
  )
  const { wordDataMap } = useMultiShabadWordData(isApiMode ? shabadIds : [])
  const isExactSearchResult = isExactShabadMode && verseIdParam !== null
  const currentFavoriteRouteMode = isExactSearchResult
    ? 'verse'
    : isExactShabadMode
      ? 'shabad'
      : 'canonical'

  const isBookmarked = currentAng
    ? hasBookmark(currentSource, currentAng)
    : false
  const currentFavorite = currentEntry && currentAng
    ? favorites.find(favorite => {
      const routeMode = favorite.routeMode ?? 'canonical'

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
    addBookmark({
      type: 'shabad',
      title: baniName
        ? `${baniName} · ${currentReadingUnit} ${currentAng}`
        : `${currentEntry.scripture} · ${currentReadingUnit} ${currentAng}`,
      source: currentSource,
      ang: currentAng,
      description: bookmarkText || undefined,
    })
    setShowBookmarkForm(false)
    setBookmarkText('')
    announceAction(studyExperienceCopy.bookmarkSaved)
  }

  const toggleFavorite = () => {
    if (!currentEntry || !currentAng) return
    if (currentFavorite) {
      removeFavorite(currentFavorite.id)
      announceAction(studyExperienceCopy.favoriteRemoved)
      return
    }
    addFavorite({
      title: baniName
        ? `${baniName} · ${currentReadingUnit} ${currentAng}`
        : `${currentEntry.scripture} · ${currentReadingUnit} ${currentAng}`,
      source: currentSource,
      ang: currentAng,
      shabadId: currentFavoriteRouteMode === 'canonical' ? undefined : currentShabadId,
      verseId: currentFavoriteRouteMode === 'verse' ? verseIdParam ?? undefined : undefined,
      type: currentFavoriteRouteMode === 'canonical' ? 'ang' : 'shabad',
      routeMode: currentFavoriteRouteMode,
    })
    announceAction(studyExperienceCopy.favoriteAdded)
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

  const handleShareLine = async (line: ScriptureLine, entry: ScriptureEntry) => {
    const text = buildLineText(entry, line)
    await shareTextWithFallback(text)
  }

  const handleBookmarkLine = (line: ScriptureLine, entry: ScriptureEntry) => {
    const entrySource = (entry.source ?? currentSource) as BaniSource
    if (hasBookmark(entrySource, line.ang, line.verseId)) {
      announceAction(studyExperienceCopy.bookmarkExists)
      return
    }
    addBookmark({
      type: 'verse',
      title: `${entry.scripture} · ${getSourceReaderUnit(entry.source, entry.scripture)} ${line.ang}`,
      source: entrySource,
      ang: line.ang,
      shabadId: line.shabadId,
      verseId: line.verseId,
      excerpt: line.gurmukhi,
      description: line.transliteration || undefined,
    })
    announceAction(studyExperienceCopy.lineBookmarked)
  }

  const handleSavePhrase = (line: ScriptureLine, entry: ScriptureEntry) => {
    if (vocab.some(item => item.word === line.gurmukhi && (item.kind ?? 'word') === 'phrase')) {
      announceAction(studyExperienceCopy.phraseAlreadySaved)
      return
    }
    addWord({
      kind: 'phrase',
      word: line.gurmukhi,
      transliteration: line.transliteration,
      meaning_en: getLineMeaningText(line, 'en', englishSource),
      meaning_hi: line.translation_hi,
      meaning_pa: line.translation_pa,
      scripture: entry.scripture,
      sourceId: entry.source ?? currentSource,
      savedAt: new Date().toISOString(),
      context: {
        scripture: entry.scripture,
        sourceId: entry.source ?? currentSource,
        ang: line.ang,
        shabadId: line.shabadId,
        verseId: line.verseId,
        line: line.gurmukhi,
      },
    })
    announceAction(studyExperienceCopy.phraseSaved)
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

  const handleSundarGutkaLengthChange = (nextLength: SundarGutkaLength) => {
    if (!supportedSundarGutkaBaniId || !supportedSundarGutkaBani || nextLength === effectiveSgLength) return

    setSundarGutkaLength(supportedSundarGutkaBaniId, nextLength)

    const nextParams = new URLSearchParams(searchParamsString)
    const currentAng = angParam ?? startAngParam ?? supportedSundarGutkaBani.startAng

    nextParams.set('source', supportedSundarGutkaBani.source)
    nextParams.set('ang', String(currentAng))
    nextParams.set('startAng', String(supportedSundarGutkaBani.startAng))
    nextParams.set('endAng', String(supportedSundarGutkaBani.endAng))
    nextParams.set('bani', SUNDAR_GUTKA_SUPPORTED_BANIS[supportedSundarGutkaBaniId].name)
    nextParams.set('baniId', supportedSundarGutkaBaniId)
    nextParams.set('baniDbId', String(SUNDAR_GUTKA_SUPPORTED_BANIS[supportedSundarGutkaBaniId].baniDbId))
    nextParams.set('exactBani', '1')
    nextParams.set('sgLength', nextLength)

    setSearchParams(nextParams, { replace: true })
  }

  const isLineBookmarked = (line: ScriptureLine, entry: ScriptureEntry) =>
    hasBookmark((entry.source ?? currentSource) as BaniSource, line.ang, line.verseId)
  const isPhraseSaved = (line: ScriptureLine) =>
    vocab.some(item => item.word === line.gurmukhi && (item.kind ?? 'word') === 'phrase')

  const titleLine = currentEntry?.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))?.gurmukhi
    ?? currentEntry?.lines?.find(line => !line.isHeader && line.gurmukhi.trim())?.gurmukhi
    ?? currentEntry?.gurmukhi
    ?? ''
  const readerEditorialCopy = isHukamnamaMode || isRandomHukamnamaMode
    ? DAILY_HUKAMNAMA_EDITORIAL_COPY
    : isArdaasReaderFlow
      ? ARDAAS_HUKAMNAMA_EDITORIAL_COPY
      : getReaderEditorialCopyForBani(baniIdParam) ?? getReaderEditorialCopyForBaniDbId(baniDbIdParam, currentSource)
  const hukamnamaDateLabel = isHukamnamaMode
    ? formatReaderEditorialDate(hukamnamaResult.data?.date ?? hukamnamaDateParam)
    : null
  const readerTitleUsesScript = Boolean(titleLine) && !baniName && !isHukamnamaMode
  const readerTitle = isHukamnamaMode
    ? DAILY_HUKAMNAMA_EDITORIAL_COPY.title
    : readerTitleUsesScript
      ? renderScriptText(buildReaderTitle(titleLine), scriptMode)
      : (readerEditorialCopy?.title ?? baniName ?? currentEntry?.scripture ?? 'Reader')
  const entrySourceDisplay = getEntrySourceDisplay(currentEntry, currentSource)
  const readerMeta = readerEditorialCopy?.sourceLine ?? [
    currentSundarGutkaLengthLabel,
    entrySourceDisplay,
    currentAng ? `${currentReadingUnit} ${currentAng}` : null,
    currentEntry?.raag,
    currentEntry?.writer,
  ].filter(Boolean).join(' · ')
  const readerIntroBody = readerEditorialCopy?.dek ?? studyCopy.introBody
  const readerControlSummaryChips = [
    currentSundarGutkaLengthLabel,
    scriptModeLabels[scriptMode],
    meaningLanguageLabels[meaningLanguage],
    meaningLanguage === 'pa' ? getPunjabiSourceLabel(locale, punjabiSource) : null,
    meaningLanguage === 'hi' ? getHindiSourceLabel(locale, hindiSource) : null,
    showVishraam ? visraamSourceLabels[visraamSource] : null,
    `Translit ${showTransliteration ? commonCopy.on : commonCopy.off}`,
  ].filter(Boolean)
  const isAmritKeertanContext = fromParam === 'amrit-keertan' && akHeaderIdParam !== null
  const amritKeertanContextMeta = [
    akSectionParam ? `Section ${akSectionParam}` : null,
    akPageParam ? `AK Page ${akPageParam}` : null,
    akItemParam ? `Item ${akItemParam}` : null,
  ].filter(Boolean).join(' · ')
  const readerOriginCandidate = (location.state as { readerOrigin?: unknown } | null)?.readerOrigin
  const readerOrigin = typeof readerOriginCandidate === 'string'
    && readerOriginCandidate.startsWith('/')
    && !readerOriginCandidate.startsWith('//')
    && readerOriginCandidate !== '/study'
    && !readerOriginCandidate.startsWith('/study/')
      ? readerOriginCandidate
      : null
  const handleReaderBack = () => {
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
  const openReaderSettings = () => {
    setControlsOpen(true)
    window.requestAnimationFrame(() => {
      readerControlsRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
  }
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
  const showEntryOutline = entries.length > 1

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
      return
    }

    const params: Record<string, string> = { source: source!, ang: String(newAng) }
    if (baniName) params.bani = baniName
    if (baniIdParam) params.baniId = baniIdParam
    if (isBaniRangeMode) params.startAng = String(startAngParam ?? angParam!)
    if (endAngParam) params.endAng = String(endAngParam)
    setSearchParams(params)
  }

  const jumpToEntry = (entryIndex: number) => {
    const nextIndex = Math.max(0, Math.min(entryIndex, entries.length - 1))
    setActiveEntryIndex(nextIndex)
    window.requestAnimationFrame(() => {
      document.getElementById(`study-entry-${nextIndex + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
  const entryNavigatorProps = shouldPaginateEntries && currentEntry ? {
    currentIndex: safeActiveEntryIndex,
    total: entries.length,
    currentLabel: entrySequenceCopy.sectionLabel(safeActiveEntryIndex + 1, entries.length),
    currentTitle: renderScriptText(entryOutline[safeActiveEntryIndex]?.title ?? currentEntry.gurmukhi, scriptMode),
    previousLabel: entrySequenceCopy.previousSection,
    nextLabel: entrySequenceCopy.nextSection,
    previousTitle: entryOutline[safeActiveEntryIndex - 1]?.title
      ? renderScriptText(entryOutline[safeActiveEntryIndex - 1]!.title, scriptMode)
      : null,
    nextTitle: entryOutline[safeActiveEntryIndex + 1]?.title
      ? renderScriptText(entryOutline[safeActiveEntryIndex + 1]!.title, scriptMode)
      : null,
    beginningLabel: studyExperienceCopy.beginningOfReading,
    endLabel: studyExperienceCopy.endOfReading,
    continueLabel: studyExperienceCopy.continueReading,
    navLabel: entrySequenceCopy.entryOutlineEyebrow,
    titleLang: getScriptTextLang(scriptMode),
    titleClassName: getScriptTextFontClass(scriptMode),
    onPrevious: () => jumpToEntry(safeActiveEntryIndex - 1),
    onNext: () => jumpToEntry(safeActiveEntryIndex + 1),
  } : null

  if (!isApiMode) return null

  if (loading) {
    return (
      <div
        className="page-shell"
        data-testid="page-study"
        data-page="study"
        data-ai-surface="study-reader"
        data-ai-state="loading"
        data-ai-flow={isHukamnamaMode ? 'hukamnama' : isExactShabadMode ? 'exact-shabad' : isBaniDbMode ? 'bani' : 'ang'}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleReaderBack}
            className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px] flex items-center gap-1 active:scale-95 transition-transform duration-150"
            data-ai-action="study-back"
          >
            <IconArrowLeft size={18} /> Back
          </button>
        </div>
        <div className="section-shell p-6 min-h-[300px] animate-pulse" data-ai-surface="study-reader-body" data-ai-state="loading">
          <div className="h-3 bg-sand/30 dark:bg-dark-text/10 rounded w-1/4 mb-4" />
          <div className="h-8 bg-sand/30 dark:bg-dark-text/10 rounded w-full mb-3" />
          <div className="h-8 bg-sand/30 dark:bg-dark-text/10 rounded w-4/5 mb-3" />
          <div className="h-4 bg-sand/30 dark:bg-dark-text/10 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (readerStatus === 'degraded') {
    return (
      <SurfaceStateCard
        surface="study-reader"
        state="degraded"
        eyebrow={isHukamnamaMode ? "Today's Hukamnama" : 'Reader'}
        title="This reading view needs another pass."
        body="The passage did not settle this time. Reload the reader or step back and open a different route."
        testId="page-study"
        page="study"
        errorCode={error ?? 'unavailable'}
        actions={[
          {
            label: 'Reload Reader',
            onClick: () => window.location.reload(),
            aiAction: 'reload-study',
          },
          {
            label: 'Back',
            onClick: handleReaderBack,
            aiAction: 'study-back',
            emphasis: 'secondary',
          },
        ]}
      />
    )
  }

  if (readerStatus === 'empty' || entries.length === 0) {
    return (
      <SurfaceStateCard
        surface="study-reader"
        state="empty"
        eyebrow={isHukamnamaMode ? "Today's Hukamnama" : 'Reader'}
        title="Nothing landed on this route yet."
        body={`Try another ang, bani, or saved passage${baniName ? ` instead of ${baniName}` : ''}.`}
        testId="page-study"
        page="study"
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
    )
  }

  return (
    <div
      className="page-shell animate-fade-in"
      data-testid="page-study"
      data-page="study"
      data-ai-surface="study-reader"
      data-ai-state="ready"
      data-ai-flow={isHukamnamaMode ? 'hukamnama' : isExactShabadMode ? 'exact-shabad' : isBaniDbMode ? 'bani' : 'ang'}
    >
      <div className="study-reader-topbar">
        <button
          onClick={handleReaderBack}
          className="study-reader-back"
          data-ai-action="study-back"
        >
          <IconArrowLeft size={18} /> Back
        </button>
        <div className="study-reader-topbar__identity">
          <p>{isHukamnamaMode ? 'Hukamnama' : 'Gurbani'}</p>
          <span>{entrySourceDisplay}</span>
        </div>
        <div className="study-reader-topbar__actions">
          <button
            onClick={handleShare}
            className="text-xl min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/30 dark:text-dark-text/30 transition-colors duration-300 active:scale-95 transition-transform duration-150"
            aria-label="Share"
            data-ai-action="study-share"
          >
            <IconShare size={20} />
          </button>
          <button
            onClick={toggleFavorite}
            aria-label={isFavorited ? 'Remove favorite' : 'Add favorite'}
            className={`text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isFavorited ? 'text-saffron dark:text-saffron-light' : 'text-ink/30 dark:text-dark-text/30'}`}
            data-ai-action="toggle-favorite"
          >
            {isFavorited ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
          </button>
          <button
            onClick={() => {
              if (isBookmarked) {
                announceAction(studyExperienceCopy.bookmarkExists)
                return
              }

              setShowBookmarkForm(v => !v)
            }}
            aria-label={isBookmarked ? 'Bookmark saved' : 'Add bookmark'}
            className={`text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isBookmarked ? 'text-saffron dark:text-saffron-light' : 'text-ink/30 dark:text-dark-text/30'}`}
            data-ai-action="toggle-bookmark"
          >
            {isBookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
          </button>
          <button
            type="button"
            onClick={openReaderSettings}
            aria-label="Open reader settings"
            title="Reader settings"
            className="study-reader-settings-action"
            data-ai-action="open-reader-settings"
          >
            <IconMoreHorizontal size={20} />
          </button>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="study-reader-action-status mb-4 min-h-[1.5rem]">
        {actionNotice ? (
          <div role="status" className="inline-flex rounded-full bg-saffron/10 px-3 py-1.5 font-sans text-xs font-medium text-saffron dark:bg-gold/12 dark:text-gold-light">
            {actionNotice}
          </div>
        ) : null}
      </div>

      <div className="study-reader-layout">
        <aside className="study-reader-rail" aria-label="Reading context and settings">
      <div
        className={`study-reader-hero ${isHukamnamaMode ? 'study-reader-hero--hukamnama' : 'study-reader-hero--bani'} px-4 py-4 mb-4`}
        aria-labelledby="study-reader-title"
        data-testid="study-reader-header"
      >
        <div className="study-reader-hero__kicker-row">
          <p className="eyebrow mb-0">{isHukamnamaMode ? 'Daily Hukamnama' : studyCopy.eyebrow}</p>
          {hukamnamaDateLabel ? (
            <p className="study-reader-hero__date">{hukamnamaDateLabel}</p>
          ) : null}
        </div>
        <h1
          id="study-reader-title"
          lang={readerTitleUsesScript ? getScriptTextLang(scriptMode) : undefined}
          className={`text-ink dark:text-dark-text ${
            readerTitleUsesScript
              ? `${getScriptTextFontClass(scriptMode)} ${scriptMode === 'devanagari' ? 'text-[1.75rem]' : 'text-[2.05rem]'}`
              : 'font-display text-3xl leading-tight'
          }`}
        >
          {readerTitle}
        </h1>
        {readerMeta ? (
          <p className="study-reader-hero__meta">
            {readerMeta}
          </p>
        ) : null}
        <p className="study-reader-hero__body">
          {readerIntroBody}
        </p>
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
                      <span className="font-medium">{ref.label}: </span>
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

      <div
        ref={readerControlsRef}
        className="study-reader-controls mb-4 section-shell-quiet p-4"
        data-testid="study-reader-controls"
        data-open={controlsOpen ? 'true' : 'false'}
      >
        <button
          type="button"
          onClick={() => setControlsOpen(open => !open)}
          className="study-reader-controls__summary"
          aria-expanded={controlsOpen}
          aria-controls="study-reader-controls-panel"
          aria-label={controlsOpen ? 'Hide reader controls' : 'Show reader controls'}
        >
          <div className="min-w-0 text-left">
            <p className="eyebrow">Reader settings</p>
            <p className="study-reader-controls__summary-line">
              {currentSundarGutkaLengthLabel ? `${currentSundarGutkaLengthLabel} · ${scriptModeLabels[scriptMode]}` : ''}
            </p>
            <div className="study-reader-controls__chips" aria-label="Current reader settings">
              {readerControlSummaryChips.map(chip => (
                <span key={String(chip)} className="study-reader-controls__chip">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <span className="study-reader-controls__toggle-label">
            {controlsOpen ? 'Done' : 'Customize'}
          </span>
        </button>

        {controlsOpen && (
          <div id="study-reader-controls-panel" className="study-reader-controls__panel">
            {supportedSundarGutkaBaniId && availableSundarGutkaLengths.length > 0 && (
              <fieldset className="study-reader-controls__group">
                <legend>Length</legend>
                <div className="study-reader-controls__grid study-reader-controls__grid--two">
                  {availableSundarGutkaLengths.map(length => {
                    const selected = effectiveSgLength === length
                    return (
                      <button
                        key={length}
                        type="button"
                        onClick={() => handleSundarGutkaLengthChange(length)}
                        aria-pressed={selected}
                        className={readerControlOptionClass(selected)}
                      >
                        {SUNDAR_GUTKA_LENGTH_LABELS[length]}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            <fieldset className="study-reader-controls__group">
              <legend>Script</legend>
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
                      {scriptModeLabels[mode]}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="study-reader-controls__group">
              <legend>Reading layers</legend>
              <div className="study-reader-controls__grid study-reader-controls__grid--three">
                <button
                  type="button"
                  onClick={() => setShowTransliteration(!showTransliteration)}
                  aria-pressed={showTransliteration}
                  className={readerControlOptionClass(showTransliteration)}
                >
                  Transliteration {showTransliteration ? commonCopy.on : commonCopy.off}
                </button>
                <button
                  type="button"
                  onClick={() => setLarivaar(!larivaar)}
                  aria-pressed={larivaar}
                  className={readerControlOptionClass(larivaar)}
                >
                  {studyCopy.larivaar}: {larivaar ? commonCopy.on : commonCopy.off}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVishraam(!showVishraam)}
                  aria-pressed={showVishraam}
                  className={readerControlOptionClass(showVishraam)}
                >
                  {studyCopy.vishraam}: {showVishraam ? commonCopy.on : commonCopy.off}
                </button>
              </div>
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

            <fieldset className="study-reader-controls__group">
              <legend>Meaning</legend>
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
            </fieldset>

            <fieldset className="study-reader-controls__group">
              <legend>Punjabi teeka/source</legend>
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

            <fieldset className="study-reader-controls__group">
              <legend>Hindi source</legend>
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

            <fieldset className="study-reader-controls__group">
              <legend>Layout</legend>
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
                {(['left', 'center'] as const).map(option => {
                  const selected = textAlign === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTextAlign(option)}
                      aria-pressed={selected}
                      className={readerControlOptionClass(selected)}
                    >
                      {textAlignmentLabels[option]} {commonCopy.align}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </div>
        )}
      </div>

      {showBookmarkForm && (
        <div
          ref={bookmarkFormRef}
          className="mb-4 section-shell rounded-lg border border-saffron/18 bg-parchment-card p-4 shadow-gold-strong transition-colors duration-300 dark:border-gold/18 dark:bg-dark-card"
          data-testid="study-bookmark-form"
        >
          <p className="eyebrow">{studyCopy.saveBookmark}</p>
          <input
            ref={bookmarkInputRef}
            id="study-bookmark-note"
            name="study-bookmark-note"
            type="text"
            aria-label="Bookmark note"
            value={bookmarkText}
            onChange={e => setBookmarkText(e.target.value)}
            placeholder={studyCopy.addNote}
            className="mt-3 w-full rounded-lg border border-sand/15 bg-parchment-card px-3 py-2 font-sans text-sm text-ink outline-none transition-colors duration-300 focus:border-saffron/30 dark:border-dark-text/10 dark:bg-dark-card dark:text-dark-text"
          />
          <button
            onClick={handleSaveBookmark}
            className="mt-3 w-full rounded-lg bg-saffron py-2 text-sm font-semibold text-white transition-colors duration-300 min-h-[44px]"
          >
            {studyCopy.saveBookmark}
          </button>
        </div>
      )}

        </aside>

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

      {baniName && !isExactShabadMode && !isBaniDbMode && (
        <div className="section-shell p-4 mb-4">
          <p className="font-sans font-semibold text-saffron dark:text-gold-light text-sm">{baniName}</p>
          {isBaniRangeMode && (
            <p className="font-sans text-ink/68 dark:text-dark-text/64 text-xs">
              {currentReadingUnit} {currentAng} of {startAngParam ?? angParam}–{endAngParam}
            </p>
          )}
        </div>
      )}

      {entryNavigatorProps ? (
        <StudyEntryNavigator
          placement="top"
          {...entryNavigatorProps}
        />
      ) : null}

      <div className="space-y-4" data-testid="study-entry-list">
        {renderedEntries.map(({ entry, entryIndex }) => {
          const shabadId = parseShabadId(entry)
          return (
            <StudyCard
              key={entry.id}
              entry={entry}
              sectionId={entryOutline[entryIndex]?.sectionId}
              sectionEyebrow={showEntryOutline ? entryOutline[entryIndex]?.eyebrow ?? null : null}
              wordData={shabadId ? wordDataMap[shabadId] ?? null : null}
              hideMainLines={isArdaasReaderFlow}
              showHeaderBlock={entryIndex === 0 || shouldPaginateEntries}
              showAudioPlayer={entryIndex === 0}
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

      {entryNavigatorProps ? (
        <StudyEntryNavigator
          placement="bottom"
          {...entryNavigatorProps}
        />
      ) : null}

      <div className="study-reader-secondary-tools mt-4">
        {showEntryOutline && (
          <DisclosureSection
            storageKey="study-entry-outline"
            title={entrySequenceCopy.entryOutlineEyebrow}
            summary={entrySequenceCopy.entryOutlineBody}
            defaultOpen={false}
            className="section-shell-quiet p-4"
            bodyClassName="mt-4"
            titleClassName="eyebrow"
            sectionId="study-entry-outline"
            testId="study-entry-outline"
          >
            <div className="grid gap-2">
              {entryOutline.map((item, index) => (
                <button
                  key={item.sectionId}
                  type="button"
                  onClick={() => jumpToEntry(index)}
                  aria-current={shouldPaginateEntries && index === safeActiveEntryIndex ? 'true' : undefined}
                  className="section-shell px-4 py-4 text-left"
                >
                  <p className="eyebrow">{item.eyebrow}</p>
                  <p
                    lang={getScriptTextLang(scriptMode)}
                    className={`mt-2 leading-tight text-ink dark:text-dark-text ${getScriptTextFontClass(scriptMode)} ${
                      scriptMode === 'devanagari' ? 'text-lg' : 'text-2xl'
                    }`}
                  >
                    {renderScriptText(item.title, scriptMode)}
                  </p>
                  <p className="mt-2 font-sans text-xs text-ink/68 dark:text-dark-text/64">
                    {item.lineCount} {studyCopy.verse} · {item.detail}
                  </p>
                </button>
              ))}
            </div>
          </DisclosureSection>
        )}

        <SoundscapeControls context="study" variant="compact" />
      </div>

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

      {!isExactShabadMode && !isHukamnamaMode && !isArdaasHukamnamaFlow && !isBaniDbMode && currentAng && navMinAng !== null && navMaxAng !== null && (
        <div className="flex gap-3 mt-4 pt-4 border-t border-sand/15 dark:border-dark-text/10">
          <button
            onClick={() => navTo(currentAng - 1)}
            disabled={currentAng <= navMinAng}
            className="flex-1 py-3 rounded-lg section-shell-quiet text-ink/70 dark:text-dark-text/70 font-sans text-sm font-medium min-h-[44px] disabled:opacity-30 transition-colors duration-300"
          >&#8592; {currentReadingUnit} {previousNavAng ?? navMinAng}</button>
          <button
            onClick={() => navTo(currentAng + 1)}
            disabled={currentAng >= navMaxAng}
            className="flex-1 py-3 rounded-lg bg-saffron text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30 transition-colors duration-300"
          >{currentReadingUnit} {nextNavAng ?? navMaxAng} &#8594;</button>
        </div>
      )}

        </div>
      </div>
    </div>
  )
}
