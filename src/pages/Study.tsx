import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useProgressStore } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useBani } from '../hooks/useBani'
import { useShabad } from '../hooks/useShabad'
import { useHukamnama } from '../hooks/useHukamnama'
import { useMultiShabadWordData } from '../hooks/useMultiShabadWordData'
import StudyCard from '../components/StudyCard'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useReadingProgressStore } from '../store/readingProgress'
import type { ScriptureEntry, ScriptureLine } from '../types'
import { LINE_SPACING_LABELS, MEANING_LANGUAGE_LABELS, SCRIPT_MODE_LABELS, TEXT_ALIGNMENT_LABELS } from '../utils/translations'
import { useLanguageStore } from '../store/language'
import { getEntryMeaningText, getLineMeaningText, isStructuralTitleLine, renderScriptText } from '../utils/readerDisplay'
import { IconArrowLeft, IconShare, IconBookmark, IconBookmarkFilled, IconHeart, IconHeartFilled } from '../components/icons'
import { useVocabStore } from '../store/vocab'

type BaniSource = 'G' | 'D' | 'B' | 'A'

const MAX_ANG: Record<string, number> = {
  G: 1430, D: 1428, B: 628, A: 1430,
}

function parseShabadId(entry: ScriptureEntry): number | null {
  if (typeof entry.shabadId === 'number') return entry.shabadId
  const parts = entry.id.split('-')
  if (parts.length === 3) {
    const id = Number(parts[2])
    return Number.isFinite(id) ? id : null
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

export default function Study() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { scriptureId } = useParams<{ scriptureId: string }>()

  let source = searchParams.get('source') as BaniSource | null
  let angParam = Number(searchParams.get('ang')) || null
  const baniName = searchParams.get('bani')
  const startAngParam = Number(searchParams.get('startAng')) || null
  const endAngParam = Number(searchParams.get('endAng')) || null
  const shabadIdParam = Number(searchParams.get('shabadId')) || null
  const verseIdParam = Number(searchParams.get('verseId')) || null
  const baniDbIdParam = Number(searchParams.get('baniDbId')) || null
  const hukamnamaDateParam = searchParams.get('hukamnamaDate')

  if ((!source || !angParam) && scriptureId && !shabadIdParam && !baniDbIdParam) {
    const parts = scriptureId.split('-')
    if (parts.length >= 2) {
      source = parts[0] as BaniSource
      angParam = Number(parts[1]) || null
    }
  }

  const isExactShabadMode = shabadIdParam !== null
  const isBaniDbMode = baniDbIdParam !== null
  const isHukamnamaMode = Boolean(hukamnamaDateParam)
  const isBaniRangeMode = baniName !== null && endAngParam !== null && source !== null && angParam !== null
  const isAngMode = source !== null && angParam !== null && !isExactShabadMode && !isBaniDbMode && !isHukamnamaMode
  const isApiMode = isAngMode || isExactShabadMode || isBaniDbMode || isHukamnamaMode

  useEffect(() => {
    if (!isApiMode) navigate('/library', { replace: true })
  }, [isApiMode, navigate])

  const angResult = useAng(
    isAngMode ? angParam! : 1,
    isAngMode ? source! : 'G'
  )
  const baniResult = useBani(isBaniDbMode ? baniDbIdParam! : null)
  const shabadResult = useShabad(isExactShabadMode ? shabadIdParam! : null)
  const hukamnamaResult = useHukamnama(hukamnamaDateParam, isHukamnamaMode)

  const baniPageEntries = useMemo(() => {
    if (!isBaniDbMode || baniResult.entries.length === 0) return []
    const targetAng = angParam ?? baniResult.entries[0]?.ang ?? null
    if (targetAng === null) return []
    return baniResult.entries.filter(entry => entry.ang === targetAng)
  }, [angParam, baniResult.entries, isBaniDbMode])

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

  const { updateSession } = useProgressStore()

  useEffect(() => {
    if (currentAng) {
      updateSession({ scriptureId: `${currentSource}-${currentAng}`, lastCardIndex: 0 })
    }
  }, [currentAng, currentSource, updateSession])

  const { addBookmark, hasBookmark } = useBookmarksStore()
  const { addFavorite, removeFavorite, isFavorite, favorites } = useFavoritesStore()
  const { addWord, vocab } = useVocabStore()
  const { recordAng } = useReadingProgressStore()
  const [showBookmarkForm, setShowBookmarkForm] = useState(false)
  const [bookmarkText, setBookmarkText] = useState('')
  const [showCopied, setShowCopied] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)

  useEffect(() => {
    if (currentAng) {
      recordAng(currentSource, currentAng)
    }
  }, [currentAng, currentSource, recordAng])

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

  const navTo = (newAng: number) => {
    if (isBaniDbMode) {
      const params: Record<string, string> = {
        baniDbId: String(baniDbIdParam!),
        ang: String(newAng),
      }
      if (baniName) params.bani = baniName
      setSearchParams(params)
      return
    }

    const params: Record<string, string> = { source: source!, ang: String(newAng) }
    if (baniName) params.bani = baniName
    if (isBaniRangeMode) params.startAng = String(startAngParam ?? angParam!)
    if (endAngParam) params.endAng = String(endAngParam)
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
        <p className="eyebrow mb-2">Understand</p>
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
          Comfortable reading first. Controls stay close, the text stays primary, and audio remains clearly marked until it is real.
        </p>
      </div>

      <div className="mb-4 section-shell-quiet p-4 shadow-card">
        <button
          type="button"
          onClick={() => setControlsOpen(open => !open)}
          className="w-full flex items-center justify-between gap-3"
          aria-expanded={controlsOpen}
          aria-label={controlsOpen ? 'Hide reader controls' : 'Show reader controls'}
        >
          <div className="text-left">
            <p className="eyebrow">Reader Controls</p>
            <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 mt-1">
              {SCRIPT_MODE_LABELS[scriptMode]} · {MEANING_LANGUAGE_LABELS[meaningLanguage]} · {showTransliteration ? 'Translit On' : 'Translit Off'}
            </p>
          </div>
          <span className="text-gold dark:text-gold-light">
            {controlsOpen ? 'Hide' : 'Show'}
          </span>
        </button>

        {controlsOpen && (
          <div className="mt-4">
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
                {SCRIPT_MODE_LABELS[mode]}
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
            Transliteration {showTransliteration ? 'On' : 'Off'}
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
            Larivaar {larivaar ? 'On' : 'Off'}
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
                {MEANING_LANGUAGE_LABELS[option]}
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
            Vishraam {showVishraam ? 'On' : 'Off'}
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
                  {LINE_SPACING_LABELS[option]}
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
                {TEXT_ALIGNMENT_LABELS[option]} Align
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
            placeholder="Add a note..."
            className="w-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-2 font-sans text-ink dark:text-dark-text text-sm mb-2 outline-none focus:border-saffron/30 transition-colors duration-300"
          />
          <button
            onClick={handleSaveBookmark}
            className="w-full bg-gradient-to-r from-saffron to-saffron-light rounded-xl py-2 text-white font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300"
          >
            Save Bookmark
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
              Go to source shabad
            </button>
          ) : null}
        </div>
      )}

      {isExactSearchResult && currentEntry && (
        <div className="section-shell p-4 mb-4">
          <p className="font-sans font-semibold text-saffron dark:text-gold-light text-sm">Exact Search Result</p>
          <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">
            {currentEntry.scripture} · Ang {currentEntry.ang}{verseIdParam ? ` · Verse ${verseIdParam}` : ''}
          </p>
          {verseIdParam && fullShabadEntry && (currentEntry.lines?.length ?? 0) < (fullShabadEntry.lines?.length ?? 0) && (
            <button
              onClick={() => navigate(`/study?shabadId=${shabadIdParam}`)}
              className="mt-2 font-sans text-xs text-saffron dark:text-gold-light underline underline-offset-2"
            >
              Open full shabad
            </button>
          )}
        </div>
      )}

      {baniName && !isExactShabadMode && (
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
        {entries.map(entry => {
          const shabadId = parseShabadId(entry)
          return (
            <StudyCard
              key={entry.id}
              entry={entry}
              wordData={shabadId ? wordDataMap[shabadId] ?? null : null}
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

      {!isExactShabadMode && !isHukamnamaMode && currentAng && navMinAng !== null && navMaxAng !== null && (
        <div className="flex gap-3 mt-4 pt-4 border-t border-sand/15 dark:border-dark-text/10">
          <button
            onClick={() => navTo(currentAng - 1)}
            disabled={currentAng <= navMinAng}
            className="flex-1 py-3 rounded-2xl section-shell-quiet text-ink/70 dark:text-dark-text/70 font-sans text-sm font-medium min-h-[44px] disabled:opacity-30 transition-colors duration-300"
          >&#8592; Ang {currentAng - 1}</button>
          <button
            onClick={() => navTo(currentAng + 1)}
            disabled={currentAng >= navMaxAng}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30 transition-colors duration-300"
          >Ang {currentAng + 1} &#8594;</button>
        </div>
      )}
    </div>
  )
}
