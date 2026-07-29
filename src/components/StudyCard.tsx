import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import type { ScriptureEntry, ScriptureLine, ScriptureVisraamMarker, UiLocale, Word } from '../types'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { formatGurbaniText, formatGurbaniWord, getLineMeaningText, getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { getHindiSourceLabels, getPunjabiSourceLabels, getVisraamSourceLabels } from '../utils/translations'
import { getSourceReaderUnit } from '../utils/sourceReaderMeta'
import WordPopover from './WordPopover'
import AudioPlayer from './AudioPlayer'
import { IconBookmark, IconBookmarkFilled, IconClose, IconMoreHorizontal, IconShare } from './icons'
import ModalSheet from './ModalSheet'

interface Props {
  entry: ScriptureEntry
  wordData?: Word[] | null
  showHeaderBlock?: boolean
  showAudioPlayer?: boolean
  sectionId?: string
  sectionEyebrow?: string | null
  onSavePhrase?: (line: ScriptureLine, entry: ScriptureEntry) => void
  onCopyLine?: (line: ScriptureLine, entry: ScriptureEntry) => void
  onShareLine?: (line: ScriptureLine, entry: ScriptureEntry, selectedText?: string) => void
  onBookmarkLine?: (line: ScriptureLine, entry: ScriptureEntry) => void
  isLineBookmarked?: (line: ScriptureLine, entry: ScriptureEntry) => boolean
  isPhraseSaved?: (line: ScriptureLine, entry: ScriptureEntry) => boolean
}

const STUDY_CARD_COPY: Record<UiLocale, {
  openActions: (line: number) => string
  actionsTitle: string
  actionsDescription: string
  dismissActions: string
  phraseSaved: string
  savePhrase: string
  copy: string
  share: string
  shareSelection: string
  selectedForSharing: string
  bookmark: string
  removeBookmark: string
  exploreWords: string
  hideWords: string
  wordDetails: (word: string) => string
  showSources: string
  hideSources: string
  punjabi: string
  hindi: string
  visraamSets: string
  selected: string
}> = {
  en: {
    openActions: line => `Open verse actions for line ${line}`,
    actionsTitle: 'Verse actions',
    actionsDescription: 'Save, copy, share, bookmark, explore words, or inspect source layers for this verse.',
    dismissActions: 'Dismiss verse actions',
    phraseSaved: 'Phrase saved',
    savePhrase: 'Save phrase',
    copy: 'Copy',
    share: 'Share',
    shareSelection: 'Share selection',
    selectedForSharing: 'Selected for sharing',
    bookmark: 'Bookmark',
    removeBookmark: 'Remove bookmark',
    exploreWords: 'Explore words',
    hideWords: 'Hide words',
    wordDetails: word => `Open word details for ${word}`,
    showSources: 'Show source layers',
    hideSources: 'Hide source layers',
    punjabi: 'Punjabi',
    hindi: 'Hindi',
    visraamSets: 'Visraam sets',
    selected: 'Selected',
  },
  pa: {
    openActions: line => `ਪੰਕਤੀ ${line} ਦੀਆਂ ਕਾਰਵਾਈਆਂ ਖੋਲ੍ਹੋ`,
    actionsTitle: 'ਪੰਕਤੀ ਕਾਰਵਾਈਆਂ',
    actionsDescription: 'ਇਸ ਪੰਕਤੀ ਨੂੰ ਸੰਭਾਲੋ, ਕਾਪੀ ਜਾਂ ਸਾਂਝਾ ਕਰੋ, ਬੁੱਕਮਾਰਕ ਕਰੋ, ਸ਼ਬਦ ਵੇਖੋ ਜਾਂ ਸਰੋਤ ਪਰਤਾਂ ਖੋਲ੍ਹੋ।',
    dismissActions: 'ਪੰਕਤੀ ਕਾਰਵਾਈਆਂ ਬੰਦ ਕਰੋ',
    phraseSaved: 'ਪੰਕਤੀ ਸੰਭਾਲੀ ਹੋਈ ਹੈ',
    savePhrase: 'ਪੰਕਤੀ ਸੰਭਾਲੋ',
    copy: 'ਕਾਪੀ ਕਰੋ',
    share: 'ਸਾਂਝਾ ਕਰੋ',
    shareSelection: 'ਚੁਣਿਆ ਹਿੱਸਾ ਸਾਂਝਾ ਕਰੋ',
    selectedForSharing: 'ਸਾਂਝਾ ਕਰਨ ਲਈ ਚੁਣਿਆ',
    bookmark: 'ਬੁੱਕਮਾਰਕ ਕਰੋ',
    removeBookmark: 'ਬੁੱਕਮਾਰਕ ਹਟਾਓ',
    exploreWords: 'ਸ਼ਬਦ ਵੇਖੋ',
    hideWords: 'ਸ਼ਬਦ ਲੁਕਾਓ',
    wordDetails: word => `${word} ਦੇ ਅਰਥ ਖੋਲ੍ਹੋ`,
    showSources: 'ਸਰੋਤ ਪਰਤਾਂ ਦਿਖਾਓ',
    hideSources: 'ਸਰੋਤ ਪਰਤਾਂ ਲੁਕਾਓ',
    punjabi: 'ਪੰਜਾਬੀ',
    hindi: 'ਹਿੰਦੀ',
    visraamSets: 'ਵਿਸ਼ਰਾਮ ਸਮੂਹ',
    selected: 'ਚੁਣਿਆ ਹੋਇਆ',
  },
  hi: {
    openActions: line => `पंक्ति ${line} की कार्रवाइयाँ खोलें`,
    actionsTitle: 'पंक्ति कार्रवाइयाँ',
    actionsDescription: 'इस पंक्ति को सेव, कॉपी, शेयर या बुकमार्क करें, शब्द देखें या स्रोत परतें खोलें।',
    dismissActions: 'पंक्ति कार्रवाइयाँ बंद करें',
    phraseSaved: 'पंक्ति सेव है',
    savePhrase: 'पंक्ति सेव करें',
    copy: 'कॉपी करें',
    share: 'शेयर करें',
    shareSelection: 'चुना हुआ अंश शेयर करें',
    selectedForSharing: 'शेयर करने के लिए चुना गया',
    bookmark: 'बुकमार्क करें',
    removeBookmark: 'बुकमार्क हटाएँ',
    exploreWords: 'शब्द देखें',
    hideWords: 'शब्द छिपाएँ',
    wordDetails: word => `${word} का विवरण खोलें`,
    showSources: 'स्रोत परतें दिखाएँ',
    hideSources: 'स्रोत परतें छिपाएँ',
    punjabi: 'पंजाबी',
    hindi: 'हिंदी',
    visraamSets: 'विश्राम समूह',
    selected: 'चुना हुआ',
  },
}

function fallbackLine(entry: ScriptureEntry): ScriptureLine {
  return {
    verseId: entry.verseIds?.[0] ?? 0,
    shabadId: entry.shabadId ?? 0,
    ang: entry.ang,
    gurmukhi: entry.gurmukhi,
    transliteration: entry.transliteration,
    translation_en: entry.translation_en,
    translations_en: { bdb: entry.translation_en },
    translation_hi: entry.translation_hi,
    translations_hi: { ss: entry.translation_hi },
    translation_pa: entry.translation_pa,
    translations_pa: { ss: entry.translation_pa },
  }
}

function ReaderChip({
  children,
  active = false,
}: {
  children: ReactNode
  active?: boolean
}) {
  return (
    <span className={`rounded-full border px-2.5 py-1 font-sans text-[10px] ${
      active
        ? 'border-saffron/25 bg-saffron/10 text-saffron dark:border-saffron/25 dark:bg-saffron/10 dark:text-saffron-light'
        : 'border-sand/12 bg-parchment-low/80 text-ink/68 dark:border-dark-text/10 dark:bg-dark-surface/70 dark:text-dark-text/64'
    }`}>
      {children}
    </span>
  )
}

function LineActionItem({
  label,
  onClick,
  icon,
  active = false,
}: {
  label: string
  onClick: () => void
  icon?: ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left font-sans text-sm transition-all duration-300 ${
        active
          ? 'bg-saffron/10 dark:bg-saffron/15 border-saffron/20 text-saffron dark:text-saffron-light'
          : 'bg-parchment-low dark:bg-dark-surface border-sand/10 dark:border-dark-text/10 text-ink dark:text-dark-text'
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {icon ? <span className="shrink-0">{icon}</span> : null}
      </span>
    </button>
  )
}

export default function StudyCard({
  entry,
  wordData,
  showHeaderBlock = true,
  showAudioPlayer = false,
  sectionId,
  sectionEyebrow = null,
  onSavePhrase,
  onCopyLine,
  onShareLine,
  onBookmarkLine,
  isLineBookmarked,
  isPhraseSaved,
}: Props) {
  const [activeWord, setActiveWord] = useState<Word | null>(null)
  const [activeLine, setActiveLine] = useState<ScriptureLine | null>(null)
  const [actionLine, setActionLine] = useState<ScriptureLine | null>(null)
  const [shareSelection, setShareSelection] = useState<{ verseId: number; text: string } | null>(null)
  const [sourceLayersOpen, setSourceLayersOpen] = useState(false)
  const [wordListOpen, setWordListOpen] = useState(false)
  const wordTriggerRef = useRef<HTMLElement | null>(null)
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const restoreWordFocusRef = useRef(false)
  const restoreActionFocusRef = useRef(false)
  const cardRef = useRef<HTMLElement | null>(null)
  const locale = useLocaleStore(s => s.locale)
  const cardCopy = STUDY_CARD_COPY[locale]
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const fontSize = useLanguageStore(s => s.fontSize)
  const englishSource = useLanguageStore(s => s.englishSource)
  const punjabiSource = useLanguageStore(s => s.punjabiSource)
  const hindiSource = useLanguageStore(s => s.hindiSource)
  const larivaar = useLanguageStore(s => s.larivaar)
  const showVishraam = useLanguageStore(s => s.showVishraam)
  const visraamSource = useLanguageStore(s => s.visraamSource)
  const lineSpacing = useLanguageStore(s => s.lineSpacing)
  const textAlign = useLanguageStore(s => s.textAlign)
  const punjabiSourceLabels = getPunjabiSourceLabels(locale)
  const hindiSourceLabels = getHindiSourceLabels(locale)
  const visraamSourceLabels = getVisraamSourceLabels(locale)

  const lines = useMemo(
    () => (entry.lines && entry.lines.length > 0 ? entry.lines : [fallbackLine(entry)]),
    [entry]
  )
  const firstNonHeaderIndex = lines.findIndex(line => !line.isHeader)
  const leadingHeaderCount = showHeaderBlock && lines[0]?.isHeader
    ? (firstNonHeaderIndex === -1 ? lines.length : firstNonHeaderIndex)
    : 0
  const leadingHeaderLines = lines.slice(0, leadingHeaderCount)
  const orderedBodyLines = lines.slice(leadingHeaderCount)
  const shouldRenderHeaderBlock = leadingHeaderLines.length > 0

  const cleanGurmukhi = (s: string) =>
    s.replace(/[;,।॥.\s]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '')

  const meaningAlignmentClass = textAlign === 'center' ? 'text-center' : 'text-left'
  const lineSpacingClass = lineSpacing === 'relaxed' ? 'leading-[2.15]' : 'leading-[1.7]'
  const actionMeaning = actionLine ? getLineMeaningText(actionLine, meaningLanguage, englishSource) : ''
  const actionSourceLayers = useMemo(() => {
    if (!actionLine) {
      return {
        punjabiVariants: [] as Array<[string, string]>,
        hindiVariants: [] as Array<[string, string]>,
        visraamVariants: [] as Array<[string, ScriptureVisraamMarker[]]>,
        hasExpandedSurface: false,
      }
    }

    const punjabiVariants = Object.entries(actionLine.translations_pa ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))
    const hindiVariants = Object.entries(actionLine.translations_hi ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))
    const visraamVariants = Object.entries(actionLine.visraam ?? {}).filter((entry): entry is [string, ScriptureVisraamMarker[]] => Array.isArray(entry[1]) && entry[1].length > 0)

    return {
      punjabiVariants,
      hindiVariants,
      visraamVariants,
      hasExpandedSurface: punjabiVariants.length > 1 || hindiVariants.length > 1 || visraamVariants.length > 0,
    }
  }, [actionLine])

  useEffect(() => {
    if (activeWord || !restoreWordFocusRef.current) return
    restoreWordFocusRef.current = false
    wordTriggerRef.current?.focus()
  }, [activeWord])

  useEffect(() => {
    if (actionLine || !restoreActionFocusRef.current) return
    restoreActionFocusRef.current = false
    actionTriggerRef.current?.focus()
  }, [actionLine])

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    const captureSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const startElement = range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement
      const endElement = range.endContainer instanceof Element
        ? range.endContainer
        : range.endContainer.parentElement
      const startLine = startElement?.closest<HTMLElement>('[data-testid="study-line"]') ?? null
      const endLine = endElement?.closest<HTMLElement>('[data-testid="study-line"]') ?? null

      if (!startLine || startLine !== endLine || !cardRef.current?.contains(startLine)) {
        setShareSelection(null)
        return
      }

      const verseId = Number(startLine.dataset.verseId)
      if (!Number.isFinite(verseId)) return

      const selectedWords = Array.from(startLine.querySelectorAll<HTMLElement>('[data-share-gurmukhi]'))
        .filter(word => selection.containsNode(word, true))
        .map(word => word.dataset.shareGurmukhi?.trim() ?? '')
        .filter(Boolean)
      const text = selectedWords.join(' ').replace(/\s+/g, ' ').trim()

      if (!text) return
      setShareSelection({ verseId, text })
    }

    document.addEventListener('selectionchange', captureSelection)
    return () => document.removeEventListener('selectionchange', captureSelection)
  }, [])

  const handleWordTap = (
    event: MouseEvent<HTMLElement>,
    originalGurmukhi: string,
    line: ScriptureLine
  ) => {
    const selection = typeof window !== 'undefined' ? window.getSelection() : null
    if (selection && !selection.isCollapsed && selection.toString().trim()) return

    event.stopPropagation()
    wordTriggerRef.current = event.currentTarget.tabIndex >= 0 ? event.currentTarget : null

    const wordsToSearch = wordData ?? entry.words ?? []
    const cleaned = cleanGurmukhi(originalGurmukhi)
    if (!cleaned) return

    if (wordsToSearch.length > 0) {
      const exact = wordsToSearch.find(w => cleanGurmukhi(w.gurmukhi) === cleaned)
      if (exact) { setActiveWord(exact); setActiveLine(line); return }
      const partial = wordsToSearch.find(w =>
        cleaned.includes(cleanGurmukhi(w.gurmukhi)) || cleanGurmukhi(w.gurmukhi).includes(cleaned)
      )
      if (partial) { setActiveWord(partial); setActiveLine(line); return }
    }

    setActiveWord({
      gurmukhi: originalGurmukhi,
      transliteration: '',
      meaning_en: '',
      meaning_hi: '',
      meaning_pa: '',
    })
    setActiveLine(line)
  }

  const closeActionSheet = () => {
    restoreActionFocusRef.current = true
    setActionLine(null)
    setSourceLayersOpen(false)
    setWordListOpen(false)
  }

  const closeWordPopover = () => {
    restoreWordFocusRef.current = true
    setActiveWord(null)
    setActiveLine(null)
  }

  const handleLineAction = (line: ScriptureLine, action?: (line: ScriptureLine, entry: ScriptureEntry) => void) => {
    action?.(line, entry)
    closeActionSheet()
  }

  const handleExploredWord = (
    event: MouseEvent<HTMLElement>,
    word: string,
    line: ScriptureLine
  ) => {
    handleWordTap(event, word, line)
    restoreActionFocusRef.current = false
    setActionLine(null)
    setSourceLayersOpen(false)
    setWordListOpen(false)
  }

  return (
    <>
      <section
        ref={cardRef}
        id={sectionId}
        data-testid="study-card"
        data-study-entry-id={entry.id}
        className="scroll-mt-24 section-shell rounded-lg px-4 py-5 sm:px-5"
      >
        <div className="mb-5">
          {sectionEyebrow ? (
            <p className="font-sans text-[11px] text-gold-dark dark:text-gold-light uppercase tracking-[0.2em] mb-2">
              {sectionEyebrow}
            </p>
          ) : null}
          <p className="font-sans text-[11px] text-gold-dark dark:text-gold-light uppercase tracking-[0.2em]">
            {entry.scripture} · {getSourceReaderUnit(entry.source, entry.scripture)} {entry.ang}
          </p>
          {(entry.raag || entry.writer || entry.sourceName) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.sourceName ? <ReaderChip>{entry.sourceName}</ReaderChip> : null}
              {entry.raag ? <ReaderChip>{entry.raag}</ReaderChip> : null}
              {entry.writer ? <ReaderChip>{entry.writer}</ReaderChip> : null}
            </div>
          )}
        </div>

        {showAudioPlayer && entry.shabadId ? (
          <div className="mb-4">
            <AudioPlayer shabadId={entry.shabadId} />
          </div>
        ) : null}

        {shouldRenderHeaderBlock && (
          <div data-testid="study-header-block" className="mb-5 section-shell-quiet rounded-lg px-4 py-4">
            <div className="space-y-3">
              {leadingHeaderLines.map((line, index) => {
                const introMeaning = getLineMeaningText(line, meaningLanguage, englishSource)
                const introAlignmentClass = line.headerLevel === 6 ? 'text-right' : 'text-center'
                const introFontScale = line.headerLevel === 6 ? 0.82 : line.headerLevel === 1 ? 1.15 : 1.08
                return (
                  <div
                    key={`intro-${line.verseId}-${index}`}
                    data-header-level={line.headerLevel ?? 0}
                  >
                    <p
                      lang={getScriptTextLang(scriptMode)}
                      className={`${getScriptTextFontClass(scriptMode)} font-semibold text-ink dark:text-dark-text ${lineSpacingClass} ${introAlignmentClass}`}
                      style={{ fontSize: `${fontSize * introFontScale}px` }}
                    >
                      {formatGurbaniText(line.gurmukhi, { scriptMode, larivaar, showVishraam, larivaarText: line.larivaar })}
                    </p>
                    {showTransliteration && line.transliteration && (
                      <p lang="pa-Latn" className={`font-sans text-sm italic text-ink/68 dark:text-dark-text/64 mt-2 leading-relaxed ${introAlignmentClass}`}>
                        {line.transliteration}
                      </p>
                    )}
                    {introMeaning && (
                      meaningLanguage === 'pa' ? (
                        <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink/75 dark:text-dark-text/75 mt-2 leading-relaxed ${introAlignmentClass}`}>
                          {renderScriptText(introMeaning, scriptMode)}
                        </p>
                      ) : (
                        <p lang={meaningLanguage === 'hi' ? 'hi' : 'en'} className={`font-sans text-sm text-ink/75 dark:text-dark-text/75 mt-2 leading-relaxed ${introAlignmentClass}`}>
                          {introMeaning}
                        </p>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {orderedBodyLines.length > 0 && (
          <>
            <div className="space-y-0">
              {orderedBodyLines.map((line, index) => {
                const meaningText = getLineMeaningText(line, meaningLanguage, englishSource)
                const sequenceIndex = leadingHeaderCount + index
                const isStructuralHeader = Boolean(line.isHeader)
                const lineMeaningAlignmentClass = isStructuralHeader
                  ? line.headerLevel === 6 ? 'text-right' : 'text-center'
                  : meaningAlignmentClass
                const lineFontScale = !isStructuralHeader
                  ? 1
                  : line.headerLevel === 6
                    ? 0.82
                    : line.headerLevel === 1
                      ? 1.15
                      : 1.08

                return (
                  <article
                    key={`${line.verseId}-${index}`}
                    data-testid="study-line"
                    data-verse-id={line.verseId}
                    data-line-kind={isStructuralHeader ? 'header' : 'verse'}
                    data-header-level={line.headerLevel ?? 0}
                    data-sequence-index={sequenceIndex}
                    className={`reader-divider relative px-1 pr-10 py-5 ${lineMeaningAlignmentClass} ${isStructuralHeader ? 'study-structural-line' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={event => {
                        actionTriggerRef.current = event.currentTarget
                        setActionLine(line)
                        setSourceLayersOpen(false)
                      }}
                      aria-label={cardCopy.openActions(sequenceIndex + 1)}
                      className={`absolute right-0 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-transparent text-ink/68 transition-colors duration-300 hover:border-sand/20 hover:text-ink/65 dark:text-dark-text/64 dark:hover:border-dark-text/10 dark:hover:text-dark-text/65 ${
                        isLineBookmarked?.(line, entry) ? 'text-saffron dark:text-saffron-light' : ''
                      }`}
                    >
                      <IconMoreHorizontal size={16} />
                    </button>

                    {larivaar ? (
                      <p
                        lang={getScriptTextLang(scriptMode)}
                        className={`${getScriptTextFontClass(scriptMode)} text-ink dark:text-dark-text ${lineSpacingClass} ${lineMeaningAlignmentClass} ${isStructuralHeader ? 'font-semibold' : ''}`}
                        style={{ fontSize: `${fontSize * lineFontScale}px` }}
                      >
                        {formatGurbaniText(line.gurmukhi, { scriptMode, larivaar: true, showVishraam, larivaarText: line.larivaar })}
                      </p>
                    ) : (
                      <p
                        lang={getScriptTextLang(scriptMode)}
                        data-testid="study-gurbani-line"
                        className={`study-gurbani-line ${getScriptTextFontClass(scriptMode)} text-ink dark:text-dark-text ${lineSpacingClass} ${lineMeaningAlignmentClass} ${isStructuralHeader ? 'font-semibold' : ''}`}
                        style={{ fontSize: `${fontSize * lineFontScale}px` }}
                      >
                        {line.gurmukhi.split(' ').filter(Boolean).map((word, wordIndex) => (
                          <span key={`${line.verseId}-${wordIndex}`}>
                            {wordIndex > 0 ? ' ' : null}
                            <span
                              data-reader-word
                              data-share-gurmukhi={word}
                              className="study-gurbani-word"
                              onClick={event => handleWordTap(event, word, line)}
                            >
                              {formatGurbaniWord(word, { scriptMode, showVishraam })}
                            </span>
                          </span>
                        ))}
                      </p>
                    )}

                    {showTransliteration && line.transliteration && (
                      <p lang="pa-Latn" className={`font-sans text-sm italic text-ink/68 dark:text-dark-text/64 mt-3 leading-relaxed ${lineMeaningAlignmentClass}`}>
                        {line.transliteration}
                      </p>
                    )}

                    {meaningText && (
                      meaningLanguage === 'pa' ? (
                        <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink/75 dark:text-dark-text/75 mt-3 leading-relaxed ${lineMeaningAlignmentClass}`}>
                          {renderScriptText(meaningText, scriptMode)}
                        </p>
                      ) : (
                        <p lang={meaningLanguage === 'hi' ? 'hi' : 'en'} className={`font-sans text-sm text-ink/85 dark:text-dark-text/85 mt-3 leading-relaxed ${lineMeaningAlignmentClass}`}>
                          {meaningText}
                        </p>
                      )
                    )}

                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      {activeWord && (
        <WordPopover
          word={activeWord}
          onClose={closeWordPopover}
          scripture={entry.scripture}
          sourceId={entry.source ?? entry.id.split('-')[0]}
          ang={activeLine?.ang ?? entry.ang}
          shabadId={activeLine?.shabadId ?? entry.shabadId}
          verseId={activeLine?.verseId}
          line={activeLine?.gurmukhi}
        />
      )}

      {actionLine && (
        <ModalSheet
          open
          onClose={closeActionSheet}
          title={cardCopy.actionsTitle}
          description={cardCopy.actionsDescription}
          testId="study-verse-actions-sheet"
          className="max-h-[min(72vh,38rem)] overflow-y-auto rounded-lg px-4 pb-5 pt-3"
        >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-sand/25 dark:bg-dark-text/15" />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                    {cardCopy.actionsTitle}
                  </p>
                  <p
                    lang={getScriptTextLang(scriptMode)}
                    className={`${getScriptTextFontClass(scriptMode)} mt-2 text-xl leading-relaxed text-ink dark:text-dark-text`}
                  >
                    {formatGurbaniText(actionLine.gurmukhi, { scriptMode, larivaar, showVishraam, larivaarText: actionLine.larivaar })}
                  </p>
                  {showTransliteration && actionLine.transliteration && (
                    <p className="mt-2 font-sans text-sm italic text-ink/68 dark:text-dark-text/64">
                      {actionLine.transliteration}
                    </p>
                  )}
                  {shareSelection?.verseId === actionLine.verseId ? (
                    <div className="mt-3 rounded-lg border border-saffron/20 bg-saffron/[0.07] px-3 py-2 text-left dark:bg-saffron/10">
                      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-saffron dark:text-saffron-light">
                        {cardCopy.selectedForSharing}
                      </p>
                      <p lang="pa-Guru" className="font-gurmukhi mt-1 text-sm leading-relaxed text-ink dark:text-dark-text">
                        {shareSelection.text}
                      </p>
                    </div>
                  ) : null}
                  {actionMeaning && (
                    <p
                      lang={meaningLanguage === 'pa' ? getScriptTextLang('gurmukhi') : undefined}
                      className={`mt-2 text-sm text-ink/70 dark:text-dark-text/70 ${
                        meaningLanguage === 'pa' ? getScriptTextFontClass('gurmukhi') : 'font-sans'
                      }`}
                    >
                      {actionMeaning}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeActionSheet}
                  aria-label={cardCopy.dismissActions}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-parchment-low text-ink/68 dark:bg-dark-surface dark:text-dark-text/64"
                >
                  <IconClose size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <LineActionItem
                  label={isPhraseSaved?.(actionLine, entry) ? cardCopy.phraseSaved : cardCopy.savePhrase}
                  onClick={() => handleLineAction(actionLine, onSavePhrase)}
                  active={Boolean(isPhraseSaved?.(actionLine, entry))}
                />
                <LineActionItem
                  label={cardCopy.copy}
                  onClick={() => handleLineAction(actionLine, onCopyLine)}
                />
                <LineActionItem
                  label={shareSelection?.verseId === actionLine.verseId ? cardCopy.shareSelection : cardCopy.share}
                  onClick={() => {
                    const selectedText = shareSelection?.verseId === actionLine.verseId
                      ? shareSelection.text
                      : undefined
                    restoreActionFocusRef.current = false
                    setActionLine(null)
                    setSourceLayersOpen(false)
                    setWordListOpen(false)
                    setShareSelection(null)
                    window.setTimeout(() => onShareLine?.(actionLine, entry, selectedText), 0)
                  }}
                  icon={<IconShare size={16} />}
                />
                <LineActionItem
                  label={isLineBookmarked?.(actionLine, entry) ? cardCopy.removeBookmark : cardCopy.bookmark}
                  onClick={() => handleLineAction(actionLine, onBookmarkLine)}
                  active={Boolean(isLineBookmarked?.(actionLine, entry))}
                  icon={isLineBookmarked?.(actionLine, entry) ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
                />
                <LineActionItem
                  label={wordListOpen ? cardCopy.hideWords : cardCopy.exploreWords}
                  onClick={() => {
                    setWordListOpen(open => !open)
                    setSourceLayersOpen(false)
                  }}
                  active={wordListOpen}
                />
                {actionSourceLayers.hasExpandedSurface ? (
                  <LineActionItem
                    label={sourceLayersOpen ? cardCopy.hideSources : cardCopy.showSources}
                    onClick={() => {
                      setSourceLayersOpen(open => !open)
                      setWordListOpen(false)
                    }}
                    active={sourceLayersOpen}
                  />
                ) : null}
              </div>

              {wordListOpen ? (
                <div className="mt-3 rounded-lg border border-sand/12 bg-parchment-low/75 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-surface/70" data-testid="study-word-explorer">
                  <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                    {cardCopy.exploreWords}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {actionLine.gurmukhi.split(' ').filter(Boolean).map((word, index) => (
                      <button
                        key={`${actionLine.verseId}-explore-${index}`}
                        type="button"
                        lang={getScriptTextLang(scriptMode)}
                        aria-label={cardCopy.wordDetails(renderScriptText(word, scriptMode))}
                        onClick={event => handleExploredWord(event, word, actionLine)}
                        className={`${getScriptTextFontClass(scriptMode)} min-h-[44px] rounded-lg border border-sand/15 bg-white/65 px-3 py-2 text-lg text-ink dark:border-dark-text/10 dark:bg-dark-card/60 dark:text-dark-text`}
                      >
                        {formatGurbaniWord(word, { scriptMode, showVishraam })}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {actionSourceLayers.hasExpandedSurface && sourceLayersOpen ? (
                <div
                  className="mt-3 space-y-3 rounded-lg border border-sand/12 bg-parchment-low/75 px-4 py-4 dark:border-dark-text/10 dark:bg-dark-surface/70"
                  data-testid="study-source-layers-sheet"
                >
                  {actionSourceLayers.punjabiVariants.length > 0 ? (
                    <div>
                      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                        {cardCopy.punjabi}
                      </p>
                      <div className="space-y-2">
                        {actionSourceLayers.punjabiVariants.map(([sourceKey, text]) => (
                          <div key={`pa-${sourceKey}`} className="rounded-lg border border-sand/10 bg-white/60 px-3 py-3 dark:border-dark-text/10 dark:bg-dark-card/55">
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              <ReaderChip active={sourceKey === punjabiSource}>
                                {punjabiSourceLabels[sourceKey] ?? sourceKey.toUpperCase()}
                              </ReaderChip>
                              {sourceKey === punjabiSource ? <ReaderChip active>{cardCopy.selected}</ReaderChip> : null}
                            </div>
                            <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm leading-relaxed text-ink dark:text-dark-text`}>
                              {renderScriptText(text, scriptMode)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {actionSourceLayers.hindiVariants.length > 0 ? (
                    <div>
                      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                        {cardCopy.hindi}
                      </p>
                      <div className="space-y-2">
                        {actionSourceLayers.hindiVariants.map(([sourceKey, text]) => (
                          <div key={`hi-${sourceKey}`} className="rounded-lg border border-sand/10 bg-white/60 px-3 py-3 dark:border-dark-text/10 dark:bg-dark-card/55">
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              <ReaderChip active={sourceKey === hindiSource}>
                                {hindiSourceLabels[sourceKey] ?? sourceKey.toUpperCase()}
                              </ReaderChip>
                              {sourceKey === hindiSource ? <ReaderChip active>{cardCopy.selected}</ReaderChip> : null}
                            </div>
                            <p className="font-sans text-sm leading-relaxed text-ink dark:text-dark-text">
                              {text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {actionSourceLayers.visraamVariants.length > 0 ? (
                    <div>
                      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                        {cardCopy.visraamSets}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {actionSourceLayers.visraamVariants.map(([sourceKey, markers]) => (
                          <ReaderChip key={`visraam-${sourceKey}`} active={sourceKey === visraamSource}>
                            {(visraamSourceLabels[sourceKey as keyof typeof visraamSourceLabels] ?? sourceKey.toUpperCase())} · {markers.length}
                          </ReaderChip>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
        </ModalSheet>
      )}
    </>
  )
}
