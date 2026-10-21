import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import type { MeaningLanguage, ScriptureEntry, ScriptureLine, ScriptureVisraamMarker, UiLocale, Word } from '../types'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { formatGurbaniText, formatGurbaniWord, getLineMeaningDetails, getLineMeaningText, getScriptTextFontClass, getScriptTextLang, isStructuralGurbaniHeadingLine, renderScriptText } from '../utils/readerDisplay'
import { getEnglishSourceLabels, getHindiSourceLabels, getMeaningLanguageLabels, getPunjabiSourceLabels, getVisraamSourceLabels } from '../utils/translations'
import { getSourceReaderUnit } from '../utils/sourceReaderMeta'
import WordPopover from './WordPopover'
import AudioPlayer from './AudioPlayer'
import { IconBookmark, IconBookmarkFilled, IconClose, IconMoreHorizontal, IconShare } from './icons'
import ModalSheet from './ModalSheet'
import type { ReaderWordContext } from '../hooks/useReaderInteraction'

interface Props {
  entry: ScriptureEntry
  presentation?: 'read' | 'study'
  onOpenReaderAppearance?: (sourceAnchorKey: string) => void
  onOpenSections?: () => void
  onPreviewWord?: (context: ReaderWordContext, event: MouseEvent<HTMLElement>) => void
  firstPassage?: boolean
  wordData?: Word[] | null
  showHeaderBlock?: boolean
  showAudioPlayer?: boolean
  sectionId?: string
  sectionEyebrow?: string | null
  onSavePhrase?: (line: ScriptureLine, entry: ScriptureEntry) => void
  onCopyLine?: (line: ScriptureLine, entry: ScriptureEntry) => void
  onShareLine?: (
    line: ScriptureLine,
    entry: ScriptureEntry,
    selectedText?: string,
    returnFocusTarget?: HTMLElement | null,
  ) => void
  onBookmarkLine?: (line: ScriptureLine, entry: ScriptureEntry) => void
  isLineBookmarked?: (line: ScriptureLine, entry: ScriptureEntry) => boolean
  isPhraseSaved?: (line: ScriptureLine, entry: ScriptureEntry) => boolean
}

const STUDY_CARD_COPY: Record<UiLocale, {
  openActions: (line: number) => string
  actionsTitle: string
  readingAppearance: string
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
    readingAppearance: 'Reading appearance',
    actionsDescription: 'Save, copy, share, bookmark, explore words, or inspect source layers for this verse.',
    dismissActions: 'Dismiss verse actions',
    phraseSaved: 'Verse saved',
    savePhrase: 'Save verse',
    copy: 'Copy',
    share: 'Share verse',
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
    readingAppearance: 'ਪਾਠ ਦੀ ਦਿੱਖ',
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
    readingAppearance: 'पाठ की दिखावट',
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

const SUPPORT_COPY: Record<UiLocale, {
  missingMeaning: (language: string, all: boolean) => string
  missingTransliteration: (all: boolean) => string
  fallback: (preferred: string, actual: string) => string
  verseMissingMeaning: (language: string) => string
  verseMissingTransliteration: string
  preferredUnavailable: (preferred: string) => string
  unidentifiedSource: string
}> = {
  en: {
    missingMeaning: (language, all) => `${language} meanings are unavailable for ${all ? 'this passage' : 'some verses in this passage'}.`,
    missingTransliteration: all => `Transliteration is unavailable for ${all ? 'this passage' : 'some verses in this passage'}.`,
    fallback: (preferred, actual) => `${preferred} is unavailable for some verses. ${actual ? `Showing ${actual}.` : 'The available meaning has no identified source.'}`,
    verseMissingMeaning: language => `${language} meaning is unavailable for this verse.`,
    verseMissingTransliteration: 'Transliteration is unavailable for this verse.',
    preferredUnavailable: preferred => `${preferred} is unavailable for this verse.`,
    unidentifiedSource: 'Translation source not identified',
  },
  pa: {
    missingMeaning: (language, all) => `${all ? 'ਇਸ ਪਾਠ' : 'ਇਸ ਪਾਠ ਦੀਆਂ ਕੁਝ ਪੰਕਤੀਆਂ'} ਲਈ ${language} ਅਰਥ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।`,
    missingTransliteration: all => `${all ? 'ਇਸ ਪਾਠ' : 'ਇਸ ਪਾਠ ਦੀਆਂ ਕੁਝ ਪੰਕਤੀਆਂ'} ਲਈ ਰੋਮਨ ਲਿਪੀ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।`,
    fallback: (preferred, actual) => `ਕੁਝ ਪੰਕਤੀਆਂ ਲਈ ${preferred} ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ${actual ? `${actual} ਦੇ ਅਰਥ ਦਿਖਾਏ ਜਾ ਰਹੇ ਹਨ।` : 'ਉਪਲਬਧ ਅਰਥ ਦਾ ਸਰੋਤ ਪਤਾ ਨਹੀਂ ਹੈ।'}`,
    verseMissingMeaning: language => `ਇਸ ਪੰਕਤੀ ਲਈ ${language} ਅਰਥ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।`,
    verseMissingTransliteration: 'ਇਸ ਪੰਕਤੀ ਲਈ ਰੋਮਨ ਲਿਪੀ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
    preferredUnavailable: preferred => `ਇਸ ਪੰਕਤੀ ਲਈ ${preferred} ਉਪਲਬਧ ਨਹੀਂ ਹੈ।`,
    unidentifiedSource: 'ਅਨੁਵਾਦ ਦਾ ਸਰੋਤ ਪਤਾ ਨਹੀਂ ਹੈ',
  },
  hi: {
    missingMeaning: (language, all) => `${all ? 'इस पाठ' : 'इस पाठ की कुछ पंक्तियों'} के लिए ${language} अर्थ उपलब्ध नहीं हैं।`,
    missingTransliteration: all => `${all ? 'इस पाठ' : 'इस पाठ की कुछ पंक्तियों'} के लिए रोमन लिपि उपलब्ध नहीं है।`,
    fallback: (preferred, actual) => `कुछ पंक्तियों के लिए ${preferred} उपलब्ध नहीं है। ${actual ? `${actual} के अर्थ दिखाए जा रहे हैं।` : 'उपलब्ध अर्थ का स्रोत ज्ञात नहीं है।'}`,
    verseMissingMeaning: language => `इस पंक्ति के लिए ${language} अर्थ उपलब्ध नहीं है।`,
    verseMissingTransliteration: 'इस पंक्ति के लिए रोमन लिपि उपलब्ध नहीं है।',
    preferredUnavailable: preferred => `इस पंक्ति के लिए ${preferred} उपलब्ध नहीं है।`,
    unidentifiedSource: 'अनुवाद का स्रोत ज्ञात नहीं है',
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
    translations_en: {},
    translation_hi: entry.translation_hi,
    translations_hi: {},
    translation_pa: entry.translation_pa,
    translations_pa: {},
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
      className={`study-verse-tool${active ? ' is-active' : ''}`}
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
  presentation = 'study',
  onOpenReaderAppearance,
  onOpenSections,
  onPreviewWord,
  firstPassage = true,
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
  const [shareSelection, setShareSelection] = useState<{ verseId: number; lineIndex: number; text: string } | null>(null)
  const [sourceLayersOpen, setSourceLayersOpen] = useState(false)
  const [wordListOpen, setWordListOpen] = useState(false)
  const [moreToolsOpen, setMoreToolsOpen] = useState(true)
  const wordTriggerRef = useRef<HTMLElement | null>(null)
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const restoreWordFocusRef = useRef(false)
  const restoreActionFocusRef = useRef(false)
  const cardRef = useRef<HTMLElement | null>(null)
  const locale = useLocaleStore(s => s.locale)
  const cardCopy = STUDY_CARD_COPY[locale]
  const supportCopy = SUPPORT_COPY[locale]
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
  const englishSourceLabels = getEnglishSourceLabels(locale)
  const meaningLanguageLabels = getMeaningLanguageLabels(locale)
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

  const supportVisible = presentation === 'study'
  const meaningAlignmentClass = textAlign === 'center' ? 'text-center' : 'text-left'
  const lineSpacingClass = lineSpacing === 'relaxed' ? 'study-script-relaxed' : 'study-script-compact'
  const getMeaningSourceLabel = (language: MeaningLanguage, source: string) => {
    const labels: Record<string, string> = language === 'en' ? englishSourceLabels : language === 'hi' ? hindiSourceLabels : punjabiSourceLabels
    return labels[source] ?? source.toUpperCase()
  }
  const supportLines = lines.filter(line => !line.isHeader && !isStructuralGurbaniHeadingLine(line.gurmukhi))
  const supportMeanings = meaningLanguage === 'none' ? [] : supportLines.map(line => getLineMeaningDetails(line, meaningLanguage, englishSource))
  const missingMeanings = supportMeanings.filter(details => !details.text).length
  const fallbackMeanings = supportMeanings.filter(details => details.text && details.preferredUnavailable)
  const missingTransliterations = showTransliteration ? supportLines.filter(line => !line.transliteration?.trim()).length : 0
  const supportSummary: string[] = []
  if (missingMeanings > 0) supportSummary.push(supportCopy.missingMeaning(meaningLanguageLabels[meaningLanguage], missingMeanings === supportLines.length))
  if (fallbackMeanings.length > 0) {
    const preferred = fallbackMeanings[0].preferredSource!
    const actual = [...new Set(fallbackMeanings.flatMap(details => details.actualSource ? [getMeaningSourceLabel(meaningLanguage, details.actualSource)] : []))].join(' / ')
    supportSummary.push(supportCopy.fallback(getMeaningSourceLabel(meaningLanguage, preferred), actual))
  }
  if (missingTransliterations > 0) supportSummary.push(supportCopy.missingTransliteration(missingTransliterations === supportLines.length))
  const actionMeaningLanguage = meaningLanguage === 'none' ? 'en' : meaningLanguage
  const actionMeaningDetails = actionLine ? getLineMeaningDetails(actionLine, actionMeaningLanguage, englishSource) : null
  const actionMeaning = actionMeaningDetails?.text ?? ''
  const actionIsStructural = Boolean(actionLine && (actionLine.isHeader || isStructuralGurbaniHeadingLine(actionLine.gurmukhi)))
  const actionSourceLayers = useMemo(() => {
    if (!actionLine) {
      return {
        englishVariants: [] as Array<[string, string]>,
        punjabiVariants: [] as Array<[string, string]>,
        hindiVariants: [] as Array<[string, string]>,
        visraamVariants: [] as Array<[string, ScriptureVisraamMarker[]]>,
        hasExpandedSurface: false,
      }
    }

    const englishVariants = Object.entries(actionLine.translations_en ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
    const punjabiVariants = Object.entries(actionLine.translations_pa ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
    const hindiVariants = Object.entries(actionLine.translations_hi ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))
    const visraamVariants = Object.entries(actionLine.visraam ?? {}).filter((entry): entry is [string, ScriptureVisraamMarker[]] => Array.isArray(entry[1]) && entry[1].length > 0)

    return {
      englishVariants,
      punjabiVariants,
      hindiVariants,
      visraamVariants,
      hasExpandedSurface: englishVariants.length > 0 || punjabiVariants.length > 0 || hindiVariants.length > 0 || visraamVariants.length > 0,
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
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        if (!document.querySelector('[data-testid="study-verse-actions-sheet"]')) setShareSelection(null)
        return
      }

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

      const sourceText = startElement?.closest<HTMLElement>('[data-testid="study-gurbani-line"]')
      if (!sourceText || !sourceText.contains(endElement)) { setShareSelection(null); return }

      const verseId = Number(startLine.dataset.verseId)
      if (!Number.isFinite(verseId)) return

      const selectedWords = Array.from(startLine.querySelectorAll<HTMLElement>('[data-share-gurmukhi]'))
        .filter(word => selection.containsNode(word, true))
        .map(word => word.dataset.shareGurmukhi?.trim() ?? '')
        .filter(Boolean)
      const text = (selectedWords.length ? selectedWords.join(' ') : startLine.dataset.readerPlain === 'true' ? selection.toString() : '').replace(/\s+/g, ' ').trim()

      if (!text) return
      setShareSelection({ verseId, lineIndex: Number(startLine.dataset.sequenceIndex), text })
    }

    document.addEventListener('selectionchange', captureSelection)
    return () => document.removeEventListener('selectionchange', captureSelection)
  }, [])

  const handleWordTap = (
    event: MouseEvent<HTMLElement>,
    originalGurmukhi: string,
    line: ScriptureLine
  ) => {
    if (presentation !== 'study') return
    const selection = typeof window !== 'undefined' ? window.getSelection() : null
    if (selection && !selection.isCollapsed && selection.toString().trim()) return

    const wordsToSearch = wordData ?? entry.words ?? []
    const cleaned = cleanGurmukhi(originalGurmukhi)
    if (!cleaned || !/[\u0A05-\u0A39\u0A59-\u0A5Eੴ]/u.test(cleaned)) return
    event.stopPropagation()
    wordTriggerRef.current = event.currentTarget.tabIndex >= 0 ? event.currentTarget : null

    const openWord = (word: Word) => {
      if (onPreviewWord) { onPreviewWord({ word, line, entry }, event); return }
      setActiveWord(word)
      setActiveLine(line)
    }
    if (wordsToSearch.length > 0) {
      const exact = wordsToSearch.find(w => cleanGurmukhi(w.gurmukhi) === cleaned)
      if (exact) { openWord(exact); return }
    }

    openWord({
      gurmukhi: originalGurmukhi,
      transliteration: '',
      meaning_en: '',
      meaning_hi: '',
      meaning_pa: '',
    })
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
    // The explicit, keyboard-accessible explorer opens the complete dictionary.
    event.stopPropagation()
    wordTriggerRef.current = event.currentTarget
    setActiveWord((wordData ?? entry.words ?? []).find(item => cleanGurmukhi(item.gurmukhi) === cleanGurmukhi(word)) ?? {
      gurmukhi: word, transliteration: '', meaning_en: '', meaning_hi: '', meaning_pa: '',
    })
    setActiveLine(line)
    restoreActionFocusRef.current = false
    setActionLine(null)
    setSourceLayersOpen(false)
    setWordListOpen(false)
  }

  const openReadingAppearance = (lineIndex: number) => {
    const sourceAnchorKey = `${entry.id}:${lineIndex}`
    const trigger = cardRef.current?.querySelector<HTMLButtonElement>(`[data-sequence-index="${lineIndex}"] .study-line-action`) ?? null
    const fromSheet = Boolean(actionLine)
    if (fromSheet) closeActionSheet()
    setShareSelection(null)
    window.getSelection()?.removeAllRanges()
    const open = () => {
      trigger?.focus({ preventScroll: true })
      onOpenReaderAppearance?.(sourceAnchorKey)
    }
    if (fromSheet) window.setTimeout(open, 0)
    else open()
  }

  return (
    <>
      <section
        ref={cardRef}
        id={sectionId}
        data-testid="study-card"
        data-study-entry-id={entry.id}
        data-reader-presentation={presentation}
        tabIndex={-1}
        className="study-passage"
      >
        <header className={`study-passage-heading${firstPassage ? ' study-passage-heading--opening' : ''}`}>
          {firstPassage ? <p className="study-passage-source">{entry.sourceName || entry.scripture}</p> : <>
            <h2>{onOpenSections ? <button type="button" onClick={onOpenSections} aria-label={locale === 'en' ? `Jump to section: ${sectionEyebrow}` : sectionEyebrow ?? undefined}>{sectionEyebrow ?? `${getSourceReaderUnit(entry.source, entry.scripture)} ${entry.ang}`}<span aria-hidden="true">⌄</span></button> : sectionEyebrow ?? `${getSourceReaderUnit(entry.source, entry.scripture)} ${entry.ang}`}</h2>
            {onOpenReaderAppearance ? <button type="button" className="study-section-appearance" onClick={() => openReadingAppearance(0)} aria-label={cardCopy.readingAppearance}><span aria-hidden="true">Aa</span><span>{locale === 'en' ? 'Appearance' : cardCopy.readingAppearance}</span></button> : null}
          </>}
        </header>

        {showAudioPlayer && entry.shabadId ? (
          <div className="mb-4">
            <AudioPlayer shabadId={entry.shabadId} />
          </div>
        ) : null}

        {shouldRenderHeaderBlock && (
          <div data-testid="study-header-block" className="mb-5">
            <div className="study-intro-lines">
              {leadingHeaderLines.map((line, index) => {
                const introMeaning = getLineMeaningText(line, meaningLanguage, englishSource)
                const introAlignmentClass = line.headerLevel === 6 ? 'text-right' : 'text-center'
                const introFontScale = line.headerLevel === 6 ? 0.82 : line.headerLevel === 1 ? 1.15 : 1.08
                const introText = formatGurbaniText(line.gurmukhi, { scriptMode, larivaar, showVishraam: true, larivaarText: line.larivaar })
                const leadingSymbol = scriptMode === 'gurmukhi' && !larivaar ? introText.match(/^(\s*ੴ)([\s\S]*)$/u) : null
                return (
                  <article
                    key={`intro-${line.verseId}-${index}`}
                    data-testid="study-line"
                    data-verse-id={line.verseId}
                    data-line-kind="header"
                    data-reader-structural="true"
                    data-sequence-index={index}
                    data-header-level={line.headerLevel ?? 0}
                    data-reader-anchor={`${entry.id}:${index}`}
                    data-reader-plain={scriptMode === 'gurmukhi' ? 'true' : undefined}
                    className="relative"
                  >
                    <button type="button" className="study-line-action absolute right-0 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full" aria-label={cardCopy.openActions(index + 1)} onClick={event => { actionTriggerRef.current = event.currentTarget; setActionLine(line); setMoreToolsOpen(true); setSourceLayersOpen(false) }}><IconMoreHorizontal size={16} /></button>
                    <p
                      lang={getScriptTextLang(scriptMode)}
                      data-testid="study-gurbani-line"
                      className={`study-gurbani-line ${getScriptTextFontClass(scriptMode)} font-semibold text-ink dark:text-dark-text ${lineSpacingClass} ${introAlignmentClass}`}
                      style={{ fontSize: `${fontSize * introFontScale}px` }}
                    >
                      {leadingSymbol ? <><span className="study-leading-ik-onkar">{leadingSymbol[1]}</span>{leadingSymbol[2]}</> : introText}
                    </p>
                    {supportVisible && showTransliteration && line.transliteration && (
                      <p data-reader-support="transliteration" lang="pa-Latn" className={`font-sans text-sm italic text-ink/68 dark:text-dark-text/64 mt-2 leading-relaxed ${meaningAlignmentClass}`}>
                        {line.transliteration}
                      </p>
                    )}
                    {supportVisible && introMeaning && (
                      meaningLanguage === 'pa' ? (
                        <p data-reader-support="meaning" lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink/75 dark:text-dark-text/75 mt-2 leading-relaxed ${meaningAlignmentClass}`}>
                          {renderScriptText(introMeaning, scriptMode)}
                        </p>
                      ) : (
                        <p data-reader-support="meaning" lang={meaningLanguage === 'hi' ? 'hi' : 'en'} className={`font-sans text-sm text-ink/75 dark:text-dark-text/75 mt-2 leading-relaxed ${meaningAlignmentClass}`}>
                          {introMeaning}
                        </p>
                      )
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {supportVisible && supportSummary.length > 0 ? (
          <aside role="note" data-testid="study-support-status" className="mb-4 font-sans text-sm leading-relaxed text-ink/75 dark:text-dark-text/75">{supportSummary.join(' ')}</aside>
        ) : null}

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
                    data-reader-structural={isStructuralHeader || isStructuralGurbaniHeadingLine(line.gurmukhi) ? 'true' : undefined}
                    data-header-level={line.headerLevel ?? 0}
                    data-sequence-index={sequenceIndex}
                    data-reader-anchor={`${entry.id}:${sequenceIndex}`}
                    data-reader-plain={presentation === 'read' && scriptMode === 'gurmukhi' ? 'true' : undefined}
                    className={`reader-divider relative px-1 pr-10 py-5 ${lineMeaningAlignmentClass} ${isStructuralHeader ? 'study-structural-line' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={event => {
                        actionTriggerRef.current = event.currentTarget
                        setActionLine(line)
                        setMoreToolsOpen(true)
                        setSourceLayersOpen(false)
                      }}
                      aria-label={cardCopy.openActions(sequenceIndex + 1)}
                      className={`study-line-action absolute right-0 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-transparent text-ink/68 transition-colors duration-300 hover:border-sand/20 hover:text-ink/65 dark:text-dark-text/64 dark:hover:border-dark-text/10 dark:hover:text-dark-text/65 ${
                        isLineBookmarked?.(line, entry) ? 'text-saffron dark:text-saffron-light' : ''
                      }`}
                    >
                      <IconMoreHorizontal size={16} />
                    </button>

                    {larivaar || (presentation === 'read' && scriptMode === 'gurmukhi') ? (
                      <p
                        lang={getScriptTextLang(scriptMode)}
                        data-testid="study-gurbani-line"
                        className={`study-gurbani-line ${getScriptTextFontClass(scriptMode)} text-ink dark:text-dark-text ${lineSpacingClass} ${lineMeaningAlignmentClass} ${isStructuralHeader ? 'font-semibold' : ''}`}
                        style={{ fontSize: `${fontSize * lineFontScale}px` }}
                      >
                        {!larivaar && showVishraam && line.visraam?.[visraamSource]?.length ? (() => {
                          let wordIndex = -1
                          return line.gurmukhi.split(/(\s+)/u).map((token, tokenIndex) => {
                            if (/^\s+$/u.test(token)) return token
                            wordIndex += 1
                            const marker = line.visraam?.[visraamSource]?.find(item => item.p === wordIndex)
                            return marker ? <span key={tokenIndex} className="study-pause-marker" data-visraam={marker.t}>{renderScriptText(token, scriptMode)}</span> : renderScriptText(token, scriptMode)
                          })
                        })() : formatGurbaniText(line.gurmukhi, { scriptMode, larivaar, showVishraam: true, larivaarText: line.larivaar })}
                      </p>
                    ) : (
                      <p
                        lang={getScriptTextLang(scriptMode)}
                        data-testid="study-gurbani-line"
                        className={`study-gurbani-line ${getScriptTextFontClass(scriptMode)} text-ink dark:text-dark-text ${lineSpacingClass} ${lineMeaningAlignmentClass} ${isStructuralHeader ? 'font-semibold' : ''}`}
                        style={{ fontSize: `${fontSize * lineFontScale}px` }}
                      >
                        {line.gurmukhi.split(' ').filter(Boolean).map((word, wordIndex) => (
                          <Fragment key={`${line.verseId}-${wordIndex}`}>
                            {wordIndex > 0 ? ' ' : null}
                            <span
                              data-reader-word
                              data-share-gurmukhi={word}
                              data-visraam={showVishraam ? line.visraam?.[visraamSource]?.find(marker => marker.p === wordIndex)?.t : undefined}
                              className="study-gurbani-word"
                              onClick={event => handleWordTap(event, word, line)}
                            >
                              {formatGurbaniWord(word, { scriptMode, showVishraam: true })}
                            </span>
                          </Fragment>
                        ))}
                      </p>
                    )}

                    {supportVisible && showTransliteration && line.transliteration && (
                      <p data-reader-support="transliteration" lang="pa-Latn" className={`font-sans text-sm italic text-ink/68 dark:text-dark-text/64 mt-3 leading-relaxed ${lineMeaningAlignmentClass}`}>
                        {line.transliteration}
                      </p>
                    )}

                    {supportVisible && meaningText && (
                      meaningLanguage === 'pa' ? (
                        <p data-reader-support="meaning" lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink/75 dark:text-dark-text/75 mt-3 leading-relaxed ${lineMeaningAlignmentClass}`}>
                          {renderScriptText(meaningText, scriptMode)}
                        </p>
                      ) : (
                        <p data-reader-support="meaning" lang={meaningLanguage === 'hi' ? 'hi' : 'en'} className={`font-sans text-sm text-ink/85 dark:text-dark-text/85 mt-3 leading-relaxed ${lineMeaningAlignmentClass}`}>
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

      {shareSelection && !actionLine ? <div className="study-selection-tools" role="toolbar" aria-label={cardCopy.actionsTitle} onPointerDown={event => event.preventDefault()}>
        <button type="button" onClick={event => { const line = lines[shareSelection.lineIndex]; if (line) { actionTriggerRef.current = event.currentTarget; setMoreToolsOpen(false); setActionLine(line) } }}>{locale === 'en' ? 'Meaning' : cardCopy.actionsTitle}</button>
        <button type="button" onClick={() => { const line = lines[shareSelection.lineIndex]; if (line) onSavePhrase?.(line, entry); window.getSelection()?.removeAllRanges(); setShareSelection(null) }}>{cardCopy.savePhrase}</button>
        <button type="button" aria-label={cardCopy.shareSelection} onClick={() => { const line = lines[shareSelection.lineIndex]; if (line) onShareLine?.(line, entry, shareSelection.text, cardRef.current); window.getSelection()?.removeAllRanges(); setShareSelection(null) }}>{locale === 'en' ? 'Share' : cardCopy.shareSelection}</button>
        <button type="button" className="study-selection-tools__icon" aria-label={locale === 'en' ? 'More verse actions' : cardCopy.actionsTitle} onClick={event => { const line = lines[shareSelection.lineIndex]; if (line) { actionTriggerRef.current = event.currentTarget; setMoreToolsOpen(true); setActionLine(line) } }}><IconMoreHorizontal size={18} /></button>
        <button type="button" className="study-selection-tools__icon" aria-label={cardCopy.dismissActions} onClick={() => { window.getSelection()?.removeAllRanges(); setShareSelection(null) }}><IconClose size={16} /></button>
      </div> : null}

      {activeWord && (
        <WordPopover
          word={activeWord}
          onClose={closeWordPopover}
          scripture={entry.scripture}
          sourceId={entry.sourceAttribution === 'unavailable' ? undefined : entry.source ?? entry.id.split('-')[0]}
          ang={activeLine?.ang ?? entry.ang}
          shabadId={(activeLine?.shabadId ?? entry.shabadId ?? 0) > 0 ? activeLine?.shabadId ?? entry.shabadId : undefined}
          verseId={(activeLine?.shabadId ?? 0) > 0 ? activeLine?.verseId : undefined}
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
                    className={`study-verse-source ${getScriptTextFontClass(scriptMode)} mt-2`}
                  >
                    {formatGurbaniText(actionLine.gurmukhi, { scriptMode, larivaar, showVishraam: true, larivaarText: actionLine.larivaar })}
                  </p>
                  {showTransliteration && actionLine.transliteration && (
                    <p className="mt-2 font-sans text-sm italic text-ink/68 dark:text-dark-text/64">
                      {actionLine.transliteration}
                    </p>
                  )}
                  {showTransliteration && !actionLine.transliteration.trim() && !actionIsStructural ? <p className="mt-2 font-sans text-sm text-ink/75 dark:text-dark-text/75">{supportCopy.verseMissingTransliteration}</p> : null}
                  {shareSelection?.lineIndex === lines.indexOf(actionLine) ? (
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
                      className={`study-verse-meaning mt-2 ${
                        meaningLanguage === 'pa' ? getScriptTextFontClass('gurmukhi') : 'font-sans'
                      }`}
                    >
                      {actionMeaning}
                    </p>
                  )}
                  {actionMeaningDetails && actionMeaning ? (
                    <div data-testid="study-meaning-source" className="mt-2 font-sans text-sm leading-relaxed text-ink/75 dark:text-dark-text/75">
                      <p>{meaningLanguageLabels[actionMeaningLanguage]} · {actionMeaningDetails.actualSource ? getMeaningSourceLabel(actionMeaningLanguage, actionMeaningDetails.actualSource) : supportCopy.unidentifiedSource}</p>
                      {actionMeaningDetails.preferredUnavailable ? <p>{supportCopy.preferredUnavailable(getMeaningSourceLabel(actionMeaningLanguage, actionMeaningDetails.preferredSource!))}</p> : null}
                    </div>
                  ) : !actionIsStructural ? <p className="mt-2 font-sans text-sm text-ink/75 dark:text-dark-text/75">{supportCopy.verseMissingMeaning(meaningLanguageLabels[actionMeaningLanguage])}</p> : null}
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

              <div className="study-verse-primary-actions">
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
                  label={shareSelection?.lineIndex === lines.indexOf(actionLine) ? cardCopy.shareSelection : cardCopy.share}
                  onClick={() => {
                    const selectedText = shareSelection?.lineIndex === lines.indexOf(actionLine)
                      ? shareSelection.text
                      : undefined
                    const returnFocusTarget = actionTriggerRef.current
                    restoreActionFocusRef.current = false
                    setActionLine(null)
                    setSourceLayersOpen(false)
                    setWordListOpen(false)
                    setShareSelection(null)
                    window.setTimeout(() => {
                      onShareLine?.(actionLine, entry, selectedText, returnFocusTarget)
                    }, 0)
                  }}
                  icon={<IconShare size={16} />}
                />
              </div>
              <p className="study-verse-save-note">{locale === 'en' ? 'Saving keeps the complete verse. Sharing uses your selected excerpt when available.' : cardCopy.actionsDescription}</p>
              <details className="study-verse-more" open={moreToolsOpen} onToggle={event => setMoreToolsOpen(event.currentTarget.open)}><summary>{locale === 'en' ? 'More verse tools' : cardCopy.actionsTitle}<span aria-hidden="true">⌄</span></summary><div className="study-verse-secondary-actions">
                {onOpenReaderAppearance ? <LineActionItem label={cardCopy.readingAppearance} onClick={() => openReadingAppearance(lines.indexOf(actionLine))} /> : null}
                {(!actionLine.isHeader || (actionLine.verseId > 0 && actionLine.shabadId > 0)) ? <LineActionItem
                  label={isLineBookmarked?.(actionLine, entry) ? cardCopy.removeBookmark : cardCopy.bookmark}
                  onClick={() => handleLineAction(actionLine, onBookmarkLine)}
                  active={Boolean(isLineBookmarked?.(actionLine, entry))}
                  icon={isLineBookmarked?.(actionLine, entry) ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
                /> : null}
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
              </div></details>

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
                        className={`${getScriptTextFontClass(scriptMode)} min-h-[44px] rounded-lg border border-sand/15 bg-[rgb(var(--color-surface)/0.65)] px-3 py-2 text-lg text-ink dark:border-dark-text/10 dark:bg-dark-card/60 dark:text-dark-text`}
                      >
                        {formatGurbaniWord(word, { scriptMode, showVishraam: true })}
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
                  {actionSourceLayers.englishVariants.length > 0 ? (
                    <div>
                      <p className="mb-2 font-sans text-sm font-medium">{meaningLanguageLabels.en}</p>
                      <div className="space-y-2">
                        {actionSourceLayers.englishVariants.map(([sourceKey, text]) => (
                          <div key={`en-${sourceKey}`} className="rounded-lg border border-sand/10 px-3 py-3 dark:border-dark-text/10">
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              <ReaderChip active={sourceKey === englishSource}>{getMeaningSourceLabel('en', sourceKey)}</ReaderChip>
                              {sourceKey === englishSource ? <ReaderChip active>{cardCopy.selected}</ReaderChip> : null}
                            </div>
                            <p lang="en" className="font-sans text-sm leading-relaxed text-ink dark:text-dark-text">{text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {actionSourceLayers.punjabiVariants.length > 0 ? (
                    <div>
                      <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                        {cardCopy.punjabi}
                      </p>
                      <div className="space-y-2">
                        {actionSourceLayers.punjabiVariants.map(([sourceKey, text]) => (
                          <div key={`pa-${sourceKey}`} className="rounded-lg border border-sand/10 bg-[rgb(var(--color-surface)/0.6)] px-3 py-3 dark:border-dark-text/10 dark:bg-dark-card/55">
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
                          <div key={`hi-${sourceKey}`} className="rounded-lg border border-sand/10 bg-[rgb(var(--color-surface)/0.6)] px-3 py-3 dark:border-dark-text/10 dark:bg-dark-card/55">
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
