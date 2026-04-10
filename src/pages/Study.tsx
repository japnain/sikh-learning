import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { fetchAng, fetchShabad } from '../api/banidb'
import { useProgressStore } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useBani } from '../hooks/useBani'
import { useShabad } from '../hooks/useShabad'
import { useHukamnama } from '../hooks/useHukamnama'
import { useMultiShabadWordData } from '../hooks/useMultiShabadWordData'
import SoundscapeControls from '../components/SoundscapeControls'
import StudyCard from '../components/StudyCard'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useReadingProgressStore } from '../store/readingProgress'
import { useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { LEARN_MODULE_BY_ID, LEARN_PROGRAMS } from '../data/learningCurriculum'
import type { ScriptureEntry, ScriptureLine, SundarGutkaLength } from '../types'
import { getLineSpacingLabels, getMeaningLanguageLabels, getScriptModeLabels, getTextAlignmentLabels } from '../utils/translations'
import { useLanguageStore } from '../store/language'
import { getEntryMeaningText, getLineMeaningText, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { findCanonicalBaniById } from '../utils/baniRouteResolver'
import { IconArrowLeft, IconShare, IconBookmark, IconBookmarkFilled, IconHeart, IconHeartFilled } from '../components/icons'
import { useVocabStore } from '../store/vocab'
import { useLocaleStore } from '../store/locale'
import { getUiCopy } from '../utils/uiCopy'
import {
  SUNDAR_GUTKA_LENGTH_LABELS,
  SUNDAR_GUTKA_LENGTH_ORDER,
  SUNDAR_GUTKA_SUPPORTED_BANIS,
  asSupportedSundarGutkaBaniId,
  getSupportedSundarGutkaBaniIdByBaniDbId,
  inferLegacySundarGutkaLength,
  normalizeSundarGutkaLength,
} from '../utils/sundarGutkaLength'

type BaniSource = 'G' | 'D' | 'B' | 'A'

const MAX_ANG: Record<string, number> = {
  G: 1430, D: 1428, B: 628, A: 1430,
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

export default function Study() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { scriptureId } = useParams<{ scriptureId: string }>()
  const locale = useLocaleStore(s => s.locale)
  const copy = getUiCopy(locale)
  const commonCopy = copy.common
  const studyCopy = copy.study
  const lineSpacingLabels = getLineSpacingLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
  const scriptModeLabels = getScriptModeLabels(locale)
  const textAlignmentLabels = getTextAlignmentLabels(locale)

  let source = searchParams.get('source') as BaniSource | null
  let angParam = Number(searchParams.get('ang')) || null
  const baniName = searchParams.get('bani')
  const baniIdParam = searchParams.get('baniId')
  const sgLengthParam = normalizeSundarGutkaLength(searchParams.get('sgLength'))
  const startAngParam = Number(searchParams.get('startAng')) || null
  const endAngParam = Number(searchParams.get('endAng')) || null
  const shabadIdParam = Number(searchParams.get('shabadId')) || null
  const verseIdParam = Number(searchParams.get('verseId')) || null
  const baniDbIdParam = Number(searchParams.get('baniDbId')) || null
  const hukamnamaDateParam = searchParams.get('hukamnamaDate')
  const flowParam = searchParams.get('flow')
  const randomHukamnamaAngParam = Number(searchParams.get('randomHukamnamaAng')) || null
  const learnProgramParam = searchParams.get('learnProgram')
  const learnModuleParam = searchParams.get('learnModule')

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
  const resolvedSgLength = supportedSundarGutkaBaniId
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
  const learnModule = learnModuleParam ? LEARN_MODULE_BY_ID[learnModuleParam] : null
  const learnProgram = learnProgramParam
    ? LEARN_PROGRAMS.find(program => program.id === learnProgramParam) ?? null
    : null
  const searchParamsString = searchParams.toString()

  useEffect(() => {
    if (!isApiMode) navigate('/library', { replace: true })
  }, [isApiMode, navigate])

  useEffect(() => {
    if (!supportedSundarGutkaBaniId || !supportedSundarGutkaBani || !resolvedSgLength) return

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
    nextParams.set('sgLength', resolvedSgLength)

    if (nextParams.toString() !== searchParamsString) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [
    angParam,
    resolvedSgLength,
    searchParamsString,
    setSearchParams,
    startAngParam,
    supportedSundarGutkaBani,
    supportedSundarGutkaBaniId,
  ])

  const angResult = useAng(
    isAngMode ? angParam! : 1,
    isAngMode ? source! : 'G'
  )
  const baniResult = useBani(isBaniDbMode ? baniDbIdParam! : null, resolvedSgLength)
  const shabadResult = useShabad(isExactShabadMode ? shabadIdParam! : null)
  const hukamnamaResult = useHukamnama(hukamnamaDateParam, isHukamnamaMode)

  const baniPageEntries = useMemo(() => {
    if (!isBaniDbMode || baniResult.entries.length === 0) return []
    return baniResult.entries
  }, [baniResult.entries, isBaniDbMode])
  const availableSundarGutkaLengths = useMemo(() => {
    if (!supportedSundarGutkaBaniId || !resolvedSgLength) return []

    const available = baniResult.availableLengths.length > 0
      ? baniResult.availableLengths
      : [resolvedSgLength]

    return SUNDAR_GUTKA_LENGTH_ORDER.filter(length => available.includes(length))
  }, [baniResult.availableLengths, resolvedSgLength, supportedSundarGutkaBaniId])
  const currentSundarGutkaLengthLabel = supportedSundarGutkaBaniId && resolvedSgLength
    ? SUNDAR_GUTKA_LENGTH_LABELS[resolvedSgLength]
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

  const currentEntry = entries[0] ?? null
  const currentAng = currentEntry?.ang ?? angParam ?? baniResult.entries[0]?.ang ?? null
  const currentSource = (currentEntry?.source ?? source ?? 'G') as BaniSource
  const englishSource = useLanguageStore(s => s.englishSource)
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
  const lineSpacing = useLanguageStore(s => s.lineSpacing)
  const setLineSpacing = useLanguageStore(s => s.setLineSpacing)
  const textAlign = useLanguageStore(s => s.textAlign)
  const setTextAlign = useLanguageStore(s => s.setTextAlign)

  const updateSession = useProgressStore(state => state.updateSession)
  const recordSwipeToday = useProgressStore(state => state.recordSwipeToday)

  useEffect(() => {
    if (shouldTrackProgress && currentAng) {
      updateSession({ scriptureId: `${currentSource}-${currentAng}`, lastCardIndex: 0 })
    }
  }, [currentAng, currentSource, shouldTrackProgress, updateSession])

  const { addBookmark, hasBookmark } = useBookmarksStore()
  const { addFavorite, removeFavorite, isFavorite, favorites } = useFavoritesStore()
  const { addWord, vocab } = useVocabStore()
  const { recordAng } = useReadingProgressStore()
  const [showBookmarkForm, setShowBookmarkForm] = useState(false)
  const [bookmarkText, setBookmarkText] = useState('')
  const [showCopied, setShowCopied] = useState(false)
  const [isTakingHukamnama, setIsTakingHukamnama] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const readerControlsRef = useRef<HTMLDivElement | null>(null)

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

  const handleShare = async () => {
    if (!currentEntry) return
    const text = [
      currentEntry.gurmukhi,
      currentEntry.transliteration,
      getEntryMeaningText(currentEntry, meaningLanguage, englishSource),
      baniName ? `— ${baniName} · Ang ${currentEntry.ang}` : `— ${currentEntry.scripture} · Ang ${currentEntry.ang}`,
      'via Nitnem App',
    ].filter(Boolean).join('\n')
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* user dismissed */ }
    } else {
      await navigator.clipboard.writeText(text)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const shabadIds = useMemo(
    () => entries.map(entry => parseShabadId(entry)),
    [entries]
  )
  const { wordDataMap } = useMultiShabadWordData(isApiMode ? shabadIds : [])

  const isBookmarked = currentAng
    ? hasBookmark(currentSource, currentAng)
    : false
  const currentFavorite = currentEntry && currentAng
    ? favorites.find(favorite =>
      favorite.source === currentSource
      && favorite.ang === currentAng
      && favorite.shabadId === (currentEntry.shabadId ?? undefined)
    ) ?? null
    : null
  const isFavorited = currentAng ? isFavorite(currentSource, currentAng, currentEntry?.shabadId) : false

  const handleSaveBookmark = () => {
    if (!currentEntry || !currentAng) return
    addBookmark({
      type: 'shabad',
      title: baniName
        ? `${baniName} · Ang ${currentAng}`
        : `${currentEntry.scripture} · Ang ${currentAng}`,
      source: currentSource,
      ang: currentAng,
      description: bookmarkText || undefined,
    })
    setShowBookmarkForm(false)
    setBookmarkText('')
  }

  const toggleFavorite = () => {
    if (!currentEntry || !currentAng) return
    if (currentFavorite) {
      removeFavorite(currentFavorite.id)
      return
    }
    addFavorite({
      title: baniName
        ? `${baniName} · Ang ${currentAng}`
        : `${currentEntry.scripture} · Ang ${currentAng}`,
      source: currentSource,
      ang: currentAng,
      shabadId: currentEntry.shabadId,
      type: currentEntry.shabadId ? 'shabad' : 'ang',
    })
  }

  const buildLineText = (entry: ScriptureEntry, line: ScriptureLine) => [
    line.gurmukhi,
    showTransliteration ? line.transliteration : '',
    getLineMeaningText(line, meaningLanguage, englishSource),
    `— ${entry.scripture} · Ang ${line.ang}`,
    'via Nitnem App',
  ].filter(Boolean).join('\n')

  const handleCopyLine = async (line: ScriptureLine, entry: ScriptureEntry) => {
    await navigator.clipboard.writeText(buildLineText(entry, line))
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  const handleShareLine = async (line: ScriptureLine, entry: ScriptureEntry) => {
    const text = buildLineText(entry, line)
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* user dismissed */ }
    } else {
      await navigator.clipboard.writeText(text)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const handleBookmarkLine = (line: ScriptureLine, entry: ScriptureEntry) => {
    const entrySource = (entry.source ?? currentSource) as BaniSource
    if (hasBookmark(entrySource, line.ang, line.verseId)) return
    addBookmark({
      type: 'verse',
      title: `${entry.scripture} · Ang ${line.ang}`,
      source: entrySource,
      ang: line.ang,
      shabadId: line.shabadId,
      verseId: line.verseId,
      excerpt: line.gurmukhi,
      description: line.transliteration || undefined,
    })
  }

  const handleSavePhrase = (line: ScriptureLine, entry: ScriptureEntry) => {
    if (vocab.some(item => item.word === line.gurmukhi && (item.kind ?? 'word') === 'phrase')) return
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
        `/study?shabadId=${firstLine.shabadId}&flow=ardaas-hukamnama&randomHukamnamaAng=${randomAng}`
      )
    } catch {
      navigate('/banis', { replace: true })
    } finally {
      setIsTakingHukamnama(false)
    }
  }

  const handleSundarGutkaLengthChange = (nextLength: SundarGutkaLength) => {
    if (!supportedSundarGutkaBaniId || !supportedSundarGutkaBani || nextLength === resolvedSgLength) return

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
  const isExactSearchResult = isExactShabadMode && verseIdParam !== null

  const titleLine = currentEntry?.lines?.find(line => !line.isHeader && line.gurmukhi.trim() && !isStructuralTitleLine(line.gurmukhi))?.gurmukhi
    ?? currentEntry?.lines?.find(line => !line.isHeader && line.gurmukhi.trim())?.gurmukhi
    ?? currentEntry?.gurmukhi
    ?? ''
  const readerTitleUsesScript = Boolean(titleLine) && !baniName && !isHukamnamaMode
  const readerTitle = readerTitleUsesScript
    ? renderScriptText(buildReaderTitle(titleLine), scriptMode)
    : (baniName ?? (isHukamnamaMode ? 'Hukamnama' : currentEntry?.scripture ?? 'Reader'))
  const readerMeta = [
    currentSundarGutkaLengthLabel,
    currentEntry?.scripture,
    currentAng ? `${currentEntry?.scripture === 'SGGS' || currentEntry?.scripture === 'DG' ? 'Ang' : 'Page'} ${currentAng}` : null,
    currentEntry?.raag,
    currentEntry?.writer,
  ].filter(Boolean).join(' · ')

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
      if (resolvedSgLength) params.sgLength = resolvedSgLength
      if (learnProgramParam) params.learnProgram = learnProgramParam
      if (learnModuleParam) params.learnModule = learnModuleParam
      setSearchParams(params)
      return
    }

    const params: Record<string, string> = { source: source!, ang: String(newAng) }
    if (baniName) params.bani = baniName
    if (baniIdParam) params.baniId = baniIdParam
    if (isBaniRangeMode) params.startAng = String(startAngParam ?? angParam!)
    if (endAngParam) params.endAng = String(endAngParam)
    if (learnProgramParam) params.learnProgram = learnProgramParam
    if (learnModuleParam) params.learnModule = learnModuleParam
    setSearchParams(params)
  }

  if (!isApiMode) return null

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px] flex items-center gap-1 active:scale-95 transition-transform duration-150"><IconArrowLeft size={18} /> Back</button>
        </div>
        <div className="section-shell p-6 min-h-[300px] animate-pulse">
          <div className="h-3 bg-sand/30 dark:bg-dark-text/10 rounded w-1/4 mb-4" />
          <div className="h-8 bg-sand/30 dark:bg-dark-text/10 rounded w-full mb-3" />
          <div className="h-8 bg-sand/30 dark:bg-dark-text/10 rounded w-4/5 mb-3" />
          <div className="h-4 bg-sand/30 dark:bg-dark-text/10 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (error || entries.length === 0) {
    return (
      <div className="page-shell text-center mt-20">
        <p className="font-sans text-ink/60 dark:text-dark-text/60 mb-2">
          No verses found{baniName ? ` for ${baniName}` : ''}.
        </p>
        <button onClick={() => navigate(-1)} className="font-sans text-saffron dark:text-saffron-light mt-4 flex items-center gap-1 mx-auto active:scale-95 transition-transform duration-150"><IconArrowLeft size={18} /> Back</button>
      </div>
    )
  }

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="font-sans text-saffron dark:text-saffron-light text-sm min-h-[44px] min-w-[44px] flex items-center gap-1 active:scale-95 transition-transform duration-150"><IconArrowLeft size={18} /> Back</button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="text-xl min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/30 dark:text-dark-text/30 transition-colors duration-300 active:scale-95 transition-transform duration-150"
            aria-label="Share"
          >
            {showCopied ? <span className="font-sans text-xs text-saffron dark:text-saffron-light">Copied!</span> : <IconShare size={20} />}
          </button>
          <button
            onClick={toggleFavorite}
            aria-label="Favorite"
            className={`text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isFavorited ? 'text-saffron dark:text-saffron-light' : 'text-ink/30 dark:text-dark-text/30'}`}
          >
            {isFavorited ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
          </button>
          <button
            onClick={() => { if (!isBookmarked) setShowBookmarkForm(v => !v) }}
            aria-label="Bookmark"
            className={`text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isBookmarked ? 'text-saffron dark:text-saffron-light' : 'text-ink/30 dark:text-dark-text/30'}`}
          >
            {isBookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
          </button>
        </div>
      </div>

      <div className="hero-surface p-5 mb-4">
        <p className="eyebrow mb-2">{studyCopy.eyebrow}</p>
        <h1
          lang={readerTitleUsesScript ? (scriptMode === 'devanagari' ? 'hi' : 'pa-Guru') : undefined}
          className={`leading-tight text-ink dark:text-dark-text ${
            readerTitleUsesScript
              ? `${scriptMode === 'devanagari' ? 'font-sans text-[2rem]' : 'font-gurmukhi text-[2.3rem]'}`
              : 'font-display text-4xl'
          }`}
        >
          {readerTitle}
        </h1>
        {readerMeta ? (
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold dark:text-gold-light mt-3">
            {readerMeta}
          </p>
        ) : null}
        <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 mt-2">
          {studyCopy.introBody}
        </p>
      </div>

      {(learnProgram || learnModule) && (
        <div className="section-shell-quiet p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{studyCopy.learnContext}</p>
              <p className="font-sans text-sm font-semibold text-ink dark:text-dark-text mt-2">
                {learnModule?.title ?? 'Return to your active Learn path'}
              </p>
              <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-2">
                {learnProgram?.name ?? 'Learn'}{learnModule ? ` · ${learnModule.estimatedMinutes} min module` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/learn?program=${learnProgramParam ?? ''}${learnModuleParam ? `&module=${learnModuleParam}` : ''}`)}
              className="rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 text-white font-sans text-xs font-semibold min-h-[44px]"
            >
              {studyCopy.returnToLearn}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <SoundscapeControls context="study" variant="compact" />
      </div>

      <div ref={readerControlsRef} className="mb-4 section-shell-quiet p-4 shadow-card">
        <button
          type="button"
          onClick={() => setControlsOpen(open => !open)}
          className="w-full flex items-center justify-between gap-3"
          aria-expanded={controlsOpen}
          aria-label={controlsOpen ? 'Hide reader controls' : 'Show reader controls'}
        >
          <div className="text-left">
            <p className="eyebrow">{studyCopy.readerControls}</p>
            <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 mt-1">
              {currentSundarGutkaLengthLabel ? `${currentSundarGutkaLengthLabel} · ` : ''}{scriptModeLabels[scriptMode]} · {meaningLanguageLabels[meaningLanguage]} · {studyCopy.transliteration} {showTransliteration ? commonCopy.on : commonCopy.off}
            </p>
          </div>
          <span className="text-gold dark:text-gold-light">
            {controlsOpen ? commonCopy.hide : commonCopy.show}
          </span>
        </button>

        {controlsOpen && (
          <div className="mt-4">
            {supportedSundarGutkaBaniId && availableSundarGutkaLengths.length > 0 && (
              <div className="mb-3">
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold dark:text-gold-light mb-2">
                  Length
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableSundarGutkaLengths.map(length => {
                    const selected = resolvedSgLength === length
                    return (
                      <button
                        key={length}
                        type="button"
                        onClick={() => handleSundarGutkaLengthChange(length)}
                        className={`rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
                          selected
                            ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                            : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                        }`}
                      >
                        {SUNDAR_GUTKA_LENGTH_LABELS[length]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-3">
          {(['gurmukhi', 'devanagari'] as const).map(mode => {
            const selected = scriptMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setScriptMode(mode)}
                className={`flex-1 rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                    : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                }`}
              >
                {scriptModeLabels[mode]}
              </button>
            )
          })}
            </div>

            <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setShowTransliteration(!showTransliteration)}
            className={`flex-1 rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
              showTransliteration
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {studyCopy.transliteration} {showTransliteration ? commonCopy.on : commonCopy.off}
          </button>
          <button
            type="button"
            onClick={() => setLarivaar(!larivaar)}
            className={`flex-1 rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
              larivaar
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {studyCopy.larivaar} {larivaar ? commonCopy.on : commonCopy.off}
          </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
          {(['none', 'en', 'pa', 'hi'] as const).map(option => {
            const selected = meaningLanguage === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => setMeaningLanguage(option)}
                className={`rounded-xl px-2 py-2 font-sans text-[11px] font-medium min-h-[42px] transition-all duration-300 ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                    : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                }`}
              >
                {meaningLanguageLabels[option]}
              </button>
            )
          })}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setShowVishraam(!showVishraam)}
            className={`rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
              showVishraam
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
            }`}
          >
            {studyCopy.vishraam} {showVishraam ? commonCopy.on : commonCopy.off}
          </button>

          <div className="grid grid-cols-2 gap-2">
            {(['compact', 'relaxed'] as const).map(option => {
              const selected = lineSpacing === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLineSpacing(option)}
                  className={`rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
                    selected
                      ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                      : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                  }`}
                >
                  {lineSpacingLabels[option]}
                </button>
              )
            })}
            </div>
          </div>

            <div className="grid grid-cols-2 gap-2">
          {(['left', 'center'] as const).map(option => {
            const selected = textAlign === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => setTextAlign(option)}
                className={`rounded-xl px-3 py-2 font-sans text-xs font-medium min-h-[42px] transition-all duration-300 ${
                  selected
                    ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                    : 'bg-parchment-card dark:bg-dark-card text-ink/70 dark:text-dark-text/70 border border-sand/15 dark:border-dark-text/10'
                }`}
              >
                {textAlignmentLabels[option]} {commonCopy.align}
              </button>
            )
          })}
            </div>
          </div>
        )}
      </div>

      {showBookmarkForm && (
        <div className="mb-4 section-shell p-4 transition-colors duration-300 shadow-card dark:shadow-gold">
          <input
            type="text"
            value={bookmarkText}
            onChange={e => setBookmarkText(e.target.value)}
            placeholder={studyCopy.addNote}
            className="w-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-2 font-sans text-ink dark:text-dark-text text-sm mb-2 outline-none focus:border-saffron/30 transition-colors duration-300"
          />
          <button
            onClick={handleSaveBookmark}
            className="w-full bg-gradient-to-r from-saffron to-saffron-light rounded-xl py-2 text-white font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300"
          >
            {studyCopy.saveBookmark}
          </button>
        </div>
      )}

      {isHukamnamaMode && currentEntry && (
        <div className="section-shell p-4 mb-4">
          <p className="font-sans font-semibold text-saffron dark:text-gold-light text-sm">
            Hukamnama{hukamnamaResult.data?.date ? ` · ${hukamnamaResult.data.date}` : ''}
          </p>
          <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">
            {currentEntry.raag ? `${currentEntry.raag} · ` : ''}{currentEntry.writer ? `${currentEntry.writer} · ` : ''}{currentEntry.scripture} · Ang {currentEntry.ang}
          </p>
          {hukamnamaResult.data?.shabadId ? (
            <button
              onClick={() => navigate(`/study?shabadId=${hukamnamaResult.data?.shabadId}`)}
              className="mt-2 font-sans text-xs text-saffron dark:text-gold-light underline underline-offset-2"
            >
              {studyCopy.goToSourceShabad}
            </button>
          ) : null}
        </div>
      )}

      {isRandomHukamnamaMode && currentEntry && randomHukamnamaAngParam && (
        <div className="section-shell p-4 mb-4">
          <p className="font-sans font-semibold text-saffron dark:text-gold-light text-sm">
            Hukamnama after Ardaas
          </p>
          <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">
            Randomly selected from Sri Guru Granth Sahib Ji · Ang {randomHukamnamaAngParam}
          </p>
          <p className="mt-2 font-sans text-xs text-ink/60 dark:text-dark-text/60">
            This opens the first shabad found on the selected ang.
          </p>
        </div>
      )}

      {isExactSearchResult && currentEntry && (
        <div className="section-shell p-4 mb-4">
          <p className="font-sans font-semibold text-saffron dark:text-gold-light text-sm">{studyCopy.exactSearchResult}</p>
          <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">
            {currentEntry.scripture} · Ang {currentEntry.ang}{verseIdParam ? ` · ${studyCopy.verse} ${verseIdParam}` : ''}
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
            <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">
              Ang {currentAng} of {startAngParam ?? angParam}–{endAngParam}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry, index) => {
          const shabadId = parseShabadId(entry)
          return (
            <StudyCard
              key={entry.id}
              entry={entry}
              wordData={shabadId ? wordDataMap[shabadId] ?? null : null}
              hideMainLines={isArdaasReaderFlow}
              showAudioPlayer={index === 0}
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

      {isArdaasReaderFlow && (
        <div className="section-shell p-4 mt-4">
          <p className="eyebrow">Ardaas + Hukamnama</p>
          <p className="mt-2 font-sans text-sm text-ink/65 dark:text-dark-text/65">
            After Ardaas, take a random Hukamnama from Sri Guru Granth Sahib Ji.
          </p>
          <button
            type="button"
            onClick={handleTakeHukamnama}
            disabled={isTakingHukamnama}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-saffron to-saffron-light px-4 py-3 font-sans text-sm font-semibold text-white disabled:opacity-70"
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
            className="flex-1 py-3 rounded-2xl section-shell-quiet text-ink/70 dark:text-dark-text/70 font-sans text-sm font-medium min-h-[44px] disabled:opacity-30 transition-colors duration-300"
          >&#8592; Ang {previousNavAng ?? navMinAng}</button>
          <button
            onClick={() => navTo(currentAng + 1)}
            disabled={currentAng >= navMaxAng}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30 transition-colors duration-300"
          >Ang {nextNavAng ?? navMaxAng} &#8594;</button>
        </div>
      )}
    </div>
  )
}
