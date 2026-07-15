import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { shareHighlightAssets } from '../../assets/share-highlights/manifest'
import { IconArrowLeft, IconArrowRight, IconCheck, IconClose, IconShare } from '../../components/icons'
import ModalSheet from '../../components/ModalSheet'
import type { UiLocale } from '../../types'
import { exportShareHighlightPng, exportShareHighlightPngSet } from './renderer'
import {
  downloadShareHighlightFile,
  downloadShareHighlightFiles,
  shareHighlightFile,
  shareHighlightFiles,
} from './share'
import type {
  ShareHighlightArtwork,
  ShareHighlightCardInput,
  ShareHighlightPassageInput,
  ShareHighlightPassageLine,
  ShareHighlightPngExport,
  ShareHighlightTextPosition,
} from './types'
import './ShareHighlightSheet.css'

const NO_ARTWORK_ID = 'none'
const SOCIAL_NOTE_LIMIT = 280

export interface ShareHighlightContent {
  gurmukhi: string
  transliteration?: string
  meaning?: string
  sourceLabel: string
  caption?: string
  verseId?: number
  selectedExcerpt?: boolean
  initialShowTransliteration?: boolean
  initialShowMeaning?: boolean
  /** Ordered, line-safe content for a full Hukamnama or other long passage. */
  passageLines?: ShareHighlightPassageLine[]
  seriesLabel?: string
  dateLabel?: string
}

export interface ShareHighlightSheetProps {
  open: boolean
  onClose: () => void
  content: ShareHighlightContent
  initialArtworkId?: string | null
  locale?: UiLocale
  onNotice?: (message: string) => void
}

interface ShareHighlightSheetCopy {
  dialogTitle: string
  dialogDescription: string
  preface: string
  title: string
  close: string
  preview: string
  citation: string
  brand: string
  textLayers: string
  textLayersHelp: string
  gurmukhi: string
  alwaysIncluded: string
  transliteration: string
  meaning: string
  unavailable: string
  artwork: string
  artworkHelp: string
  noArtwork: string
  artworkNumber: (index: number) => string
  textPosition: string
  textPositionHelp: string
  positionAuto: string
  positionTop: string
  positionMiddle: string
  positionBottom: string
  socialNote: string
  socialNoteHelp: string
  socialPlaceholder: string
  selectedExcerpt: string
  passagePreface: string
  passageTitle: string
  passageTextLayersHelp: string
  pagePosition: (page: number, total: number) => string
  previousPage: string
  nextPage: string
  shareImages: (count: number) => string
  saveSet: string
  setReady: (count: number) => string
  shareSetTitle: string
  setDownloaded: string
  shareImage: string
  saveImage: string
  copyText: string
  preparing: string
  ready: string
  shareTitle: string
  shared: string
  cancelled: string
  downloaded: string
  copied: string
  renderError: string
  actionError: string
  characters: (count: number) => string
}

const SHEET_COPY: Record<UiLocale, ShareHighlightSheetCopy> = {
  en: {
    dialogTitle: 'Share highlight',
    dialogDescription: 'Preview a branded image, choose its artwork and reading supports, then share or save it.',
    preface: 'Share a line for remembrance',
    title: 'Create a share image',
    close: 'Close share image',
    preview: 'Share image preview',
    citation: 'Citation',
    brand: 'Brand',
    textLayers: 'Text on the card',
    textLayersHelp: 'Gurbani stays unchanged. Add only the reading supports you want to share.',
    gurmukhi: 'Gurmukhi',
    alwaysIncluded: 'Always included and cannot be edited',
    transliteration: 'Transliteration',
    meaning: 'Meaning',
    unavailable: 'Not available for this selection',
    artwork: 'Artwork',
    artworkHelp: 'Choose one visual treatment, or keep the card quiet.',
    noArtwork: 'No art',
    artworkNumber: index => `Artwork ${index}`,
    textPosition: 'Text position',
    textPositionHelp: 'Auto finds the clearest space on the artwork.',
    positionAuto: 'Auto',
    positionTop: 'Top',
    positionMiddle: 'Middle',
    positionBottom: 'Bottom',
    socialNote: 'Social note (optional)',
    socialNoteHelp: 'Shared alongside the image. It never changes the Gurbani.',
    socialPlaceholder: 'Add a short reflection…',
    selectedExcerpt: 'This card contains only the Gurmukhi words you selected.',
    passagePreface: 'Share the full Hukamnama',
    passageTitle: 'Create a share set',
    passageTextLayersHelp: 'Every Gurbani line stays in order. NaamRas creates as many readable pages as needed.',
    pagePosition: (page, total) => `Page ${page} of ${total}`,
    previousPage: 'Previous image',
    nextPage: 'Next image',
    shareImages: count => count === 1 ? 'Share image' : `Share ${count} images`,
    saveSet: 'Save set',
    setReady: count => count === 1 ? 'Image ready.' : `${count} images ready.`,
    shareSetTitle: 'Hukamnama from NaamRas',
    setDownloaded: 'The full set was downloaded as a ZIP.',
    shareImage: 'Share image',
    saveImage: 'Save image',
    copyText: 'Copy text',
    preparing: 'Preparing image…',
    ready: 'Image ready.',
    shareTitle: 'A line from NaamRas',
    shared: 'Share sheet opened.',
    cancelled: 'Sharing cancelled.',
    downloaded: 'Image saved.',
    copied: 'Text copied.',
    renderError: 'The image could not be prepared. Try another artwork.',
    actionError: 'That action did not complete. Please try again.',
    characters: count => `${count} / ${SOCIAL_NOTE_LIMIT}`,
  },
  pa: {
    dialogTitle: 'ਝਲਕ ਸਾਂਝੀ ਕਰੋ',
    dialogDescription: 'ਬ੍ਰਾਂਡ ਵਾਲੀ ਤਸਵੀਰ ਦੀ ਝਲਕ ਵੇਖੋ, ਕਲਾ ਅਤੇ ਪਾਠ ਸਹਾਇਤਾ ਚੁਣੋ, ਫਿਰ ਸਾਂਝੀ ਜਾਂ ਸੰਭਾਲੋ।',
    preface: 'ਯਾਦ ਲਈ ਇੱਕ ਪੰਕਤੀ ਸਾਂਝੀ ਕਰੋ',
    title: 'ਸਾਂਝੀ ਕਰਨ ਲਈ ਤਸਵੀਰ ਬਣਾਓ',
    close: 'ਸਾਂਝੀ ਤਸਵੀਰ ਬੰਦ ਕਰੋ',
    preview: 'ਸਾਂਝੀ ਤਸਵੀਰ ਦੀ ਝਲਕ',
    citation: 'ਹਵਾਲਾ',
    brand: 'ਬ੍ਰਾਂਡ',
    textLayers: 'ਕਾਰਡ ਉੱਤੇ ਲਿਖਤ',
    textLayersHelp: 'ਗੁਰਬਾਣੀ ਬਦਲਦੀ ਨਹੀਂ। ਸਿਰਫ਼ ਉਹ ਪਾਠ ਸਹਾਇਤਾ ਜੋੜੋ ਜੋ ਤੁਸੀਂ ਸਾਂਝੀ ਕਰਨੀ ਚਾਹੁੰਦੇ ਹੋ।',
    gurmukhi: 'ਗੁਰਮੁਖੀ',
    alwaysIncluded: 'ਹਮੇਸ਼ਾ ਸ਼ਾਮਲ ਹੈ ਅਤੇ ਬਦਲੀ ਨਹੀਂ ਜਾ ਸਕਦੀ',
    transliteration: 'ਲਿਪੀਅੰਤਰਨ',
    meaning: 'ਅਰਥ',
    unavailable: 'ਇਸ ਚੋਣ ਲਈ ਉਪਲਬਧ ਨਹੀਂ',
    artwork: 'ਕਲਾ',
    artworkHelp: 'ਇੱਕ ਦ੍ਰਿਸ਼ ਚੁਣੋ ਜਾਂ ਕਾਰਡ ਨੂੰ ਸਾਦਾ ਰੱਖੋ।',
    noArtwork: 'ਕੋਈ ਕਲਾ ਨਹੀਂ',
    artworkNumber: index => `ਕਲਾ ${index}`,
    textPosition: 'ਲਿਖਤ ਦੀ ਥਾਂ',
    textPositionHelp: 'ਆਟੋ ਕਲਾ ਵਿੱਚ ਸਭ ਤੋਂ ਸਾਫ਼ ਥਾਂ ਲੱਭਦਾ ਹੈ।',
    positionAuto: 'ਆਟੋ',
    positionTop: 'ਉੱਪਰ',
    positionMiddle: 'ਵਿਚਕਾਰ',
    positionBottom: 'ਹੇਠਾਂ',
    socialNote: 'ਸਾਂਝਾ ਨੋਟ (ਵਿਕਲਪਿਕ)',
    socialNoteHelp: 'ਇਹ ਤਸਵੀਰ ਦੇ ਨਾਲ ਸਾਂਝਾ ਹੁੰਦਾ ਹੈ। ਗੁਰਬਾਣੀ ਕਦੇ ਨਹੀਂ ਬਦਲਦੀ।',
    socialPlaceholder: 'ਛੋਟਾ ਵਿਚਾਰ ਲਿਖੋ…',
    selectedExcerpt: 'ਇਸ ਕਾਰਡ ਵਿੱਚ ਸਿਰਫ਼ ਤੁਹਾਡੇ ਚੁਣੇ ਗੁਰਮੁਖੀ ਸ਼ਬਦ ਹਨ।',
    passagePreface: 'ਪੂਰਾ ਹੁਕਮਨਾਮਾ ਸਾਂਝਾ ਕਰੋ',
    passageTitle: 'ਸਾਂਝੀਆਂ ਤਸਵੀਰਾਂ ਬਣਾਓ',
    passageTextLayersHelp: 'ਹਰ ਗੁਰਬਾਣੀ ਪੰਕਤੀ ਕ੍ਰਮ ਵਿੱਚ ਰਹਿੰਦੀ ਹੈ। ਨਾਮਰਸ ਪੜ੍ਹਨਯੋਗ ਸਫ਼ੇ ਆਪਣੇ ਆਪ ਬਣਾਉਂਦਾ ਹੈ।',
    pagePosition: (page, total) => `ਸਫ਼ਾ ${page} / ${total}`,
    previousPage: 'ਪਿਛਲੀ ਤਸਵੀਰ',
    nextPage: 'ਅਗਲੀ ਤਸਵੀਰ',
    shareImages: count => count === 1 ? 'ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ' : `${count} ਤਸਵੀਰਾਂ ਸਾਂਝੀਆਂ ਕਰੋ`,
    saveSet: 'ਸੈੱਟ ਸੰਭਾਲੋ',
    setReady: count => count === 1 ? 'ਤਸਵੀਰ ਤਿਆਰ ਹੈ।' : `${count} ਤਸਵੀਰਾਂ ਤਿਆਰ ਹਨ।`,
    shareSetTitle: 'ਨਾਮਰਸ ਤੋਂ ਹੁਕਮਨਾਮਾ',
    setDownloaded: 'ਪੂਰਾ ਸੈੱਟ ZIP ਵਜੋਂ ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ।',
    shareImage: 'ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ',
    saveImage: 'ਤਸਵੀਰ ਸੰਭਾਲੋ',
    copyText: 'ਲਿਖਤ ਕਾਪੀ ਕਰੋ',
    preparing: 'ਤਸਵੀਰ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ…',
    ready: 'ਤਸਵੀਰ ਤਿਆਰ ਹੈ।',
    shareTitle: 'ਨਾਮਰਸ ਤੋਂ ਇੱਕ ਪੰਕਤੀ',
    shared: 'ਸਾਂਝਾ ਪੰਨਾ ਖੁੱਲ੍ਹ ਗਿਆ ਹੈ।',
    cancelled: 'ਸਾਂਝਾ ਕਰਨਾ ਰੱਦ ਕੀਤਾ ਗਿਆ।',
    downloaded: 'ਤਸਵੀਰ ਸੰਭਾਲੀ ਗਈ।',
    copied: 'ਲਿਖਤ ਕਾਪੀ ਹੋ ਗਈ।',
    renderError: 'ਤਸਵੀਰ ਤਿਆਰ ਨਹੀਂ ਹੋ ਸਕੀ। ਹੋਰ ਕਲਾ ਚੁਣ ਕੇ ਵੇਖੋ।',
    actionError: 'ਇਹ ਕਾਰਵਾਈ ਪੂਰੀ ਨਹੀਂ ਹੋਈ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    characters: count => `${count} / ${SOCIAL_NOTE_LIMIT}`,
  },
  hi: {
    dialogTitle: 'अंश साझा करें',
    dialogDescription: 'ब्रांड वाली छवि का पूर्वावलोकन करें, कला और पाठ सहायता चुनें, फिर साझा या सेव करें।',
    preface: 'स्मरण के लिए एक पंक्ति साझा करें',
    title: 'साझा करने की छवि बनाएँ',
    close: 'साझा छवि बंद करें',
    preview: 'साझा छवि का पूर्वावलोकन',
    citation: 'संदर्भ',
    brand: 'ब्रांड',
    textLayers: 'कार्ड पर पाठ',
    textLayersHelp: 'गुरबाणी नहीं बदलती। केवल वही पाठ सहायता जोड़ें जिसे आप साझा करना चाहते हैं।',
    gurmukhi: 'गुरमुखी',
    alwaysIncluded: 'हमेशा शामिल है और बदली नहीं जा सकती',
    transliteration: 'लिप्यंतरण',
    meaning: 'अर्थ',
    unavailable: 'इस चयन के लिए उपलब्ध नहीं',
    artwork: 'कलाकृति',
    artworkHelp: 'एक दृश्य चुनें या कार्ड को सादा रखें।',
    noArtwork: 'बिना कला',
    artworkNumber: index => `कलाकृति ${index}`,
    textPosition: 'पाठ की जगह',
    textPositionHelp: 'ऑटो कलाकृति में सबसे साफ़ जगह ढूँढता है।',
    positionAuto: 'ऑटो',
    positionTop: 'ऊपर',
    positionMiddle: 'बीच',
    positionBottom: 'नीचे',
    socialNote: 'सोशल नोट (वैकल्पिक)',
    socialNoteHelp: 'यह छवि के साथ साझा होता है। यह गुरबाणी को कभी नहीं बदलता।',
    socialPlaceholder: 'एक छोटा विचार लिखें…',
    selectedExcerpt: 'इस कार्ड में केवल आपके चुने हुए गुरमुखी शब्द हैं।',
    passagePreface: 'पूरा हुकमनामा साझा करें',
    passageTitle: 'साझा छवियों का सेट बनाएँ',
    passageTextLayersHelp: 'हर गुरबाणी पंक्ति क्रम में रहती है। नामरस अपने आप पढ़ने योग्य पृष्ठ बनाता है।',
    pagePosition: (page, total) => `पृष्ठ ${page} / ${total}`,
    previousPage: 'पिछली छवि',
    nextPage: 'अगली छवि',
    shareImages: count => count === 1 ? 'छवि साझा करें' : `${count} छवियाँ साझा करें`,
    saveSet: 'सेट सेव करें',
    setReady: count => count === 1 ? 'छवि तैयार है।' : `${count} छवियाँ तैयार हैं।`,
    shareSetTitle: 'नामरस से हुकमनामा',
    setDownloaded: 'पूरा सेट ZIP के रूप में डाउनलोड हो गया।',
    shareImage: 'छवि साझा करें',
    saveImage: 'छवि सेव करें',
    copyText: 'पाठ कॉपी करें',
    preparing: 'छवि तैयार हो रही है…',
    ready: 'छवि तैयार है।',
    shareTitle: 'नामरस से एक पंक्ति',
    shared: 'शेयर शीट खुल गई है।',
    cancelled: 'साझा करना रद्द किया गया।',
    downloaded: 'छवि सेव हो गई।',
    copied: 'पाठ कॉपी हो गया।',
    renderError: 'छवि तैयार नहीं हो सकी। दूसरी कलाकृति चुनकर देखें।',
    actionError: 'यह कार्रवाई पूरी नहीं हुई। फिर से प्रयास करें।',
    characters: count => `${count} / ${SOCIAL_NOTE_LIMIT}`,
  },
}

function resolveInitialArtworkId(initialArtworkId: string | null | undefined) {
  if (initialArtworkId === null) return NO_ARTWORK_ID
  if (initialArtworkId && shareHighlightAssets.some(asset => asset.id === initialArtworkId)) {
    return initialArtworkId
  }
  return shareHighlightAssets[0]?.id ?? NO_ARTWORK_ID
}

function buildCopiedText(
  content: ShareHighlightContent,
  showTransliteration: boolean,
  showMeaning: boolean,
  socialNote: string
) {
  const passageText = content.passageLines?.length
    ? content.passageLines.flatMap(line => [
        line.gurmukhi.trim(),
        showTransliteration ? line.transliteration?.trim() : '',
        showMeaning ? line.meaning?.trim() : '',
      ].filter(Boolean)).join('\n')
    : ''

  return [
    socialNote.trim(),
    content.seriesLabel?.trim(),
    content.dateLabel?.trim(),
    passageText || content.gurmukhi.trim(),
    passageText ? '' : (showTransliteration ? content.transliteration?.trim() : ''),
    passageText ? '' : (showMeaning ? content.meaning?.trim() : ''),
    `— ${content.sourceLabel.trim()}`,
    'naamras.xyz',
  ].filter(Boolean).join('\n')
}

function makeFileName(verseId?: number) {
  return verseId ? `naamras-highlight-${verseId}.png` : 'naamras-highlight.png'
}

export default function ShareHighlightSheet({
  open,
  onClose,
  content,
  initialArtworkId,
  locale = 'en',
  onNotice,
}: ShareHighlightSheetProps) {
  const copy = SHEET_COPY[locale]
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const renderSequenceRef = useRef(0)
  const previewTouchStartXRef = useRef<number | null>(null)
  const artworkGroupId = useId()
  const positionGroupId = useId()
  const captionId = useId()
  const previewDescriptionId = useId()
  const passageLines = useMemo(
    () => content.passageLines?.filter(line => line.gurmukhi.trim()) ?? [],
    [content.passageLines]
  )
  const isPassage = passageLines.length > 0
  const [selectedArtworkId, setSelectedArtworkId] = useState(() => resolveInitialArtworkId(initialArtworkId))
  const [textPosition, setTextPosition] = useState<ShareHighlightTextPosition>('auto')
  const [showTransliteration, setShowTransliteration] = useState(() => (
    Boolean(content.transliteration?.trim())
    && !content.selectedExcerpt
    && (content.initialShowTransliteration ?? true)
  ))
  const [showMeaning, setShowMeaning] = useState(() => (
    Boolean(content.meaning?.trim())
    && !content.selectedExcerpt
    && (content.initialShowMeaning ?? true)
  ))
  const [socialNote, setSocialNote] = useState(() => (content.caption ?? '').slice(0, SOCIAL_NOTE_LIMIT))
  const [pngExports, setPngExports] = useState<ShareHighlightPngExport[]>([])
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [status, setStatus] = useState(copy.preparing)
  const [renderFailed, setRenderFailed] = useState(false)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const [busyAction, setBusyAction] = useState<'share' | 'save' | 'copy' | null>(null)

  const hasTransliteration = (
    isPassage
      ? passageLines.some(line => Boolean(line.transliteration?.trim()))
      : Boolean(content.transliteration?.trim())
  ) && !content.selectedExcerpt
  const hasMeaning = (
    isPassage
      ? passageLines.some(line => Boolean(line.meaning?.trim()))
      : Boolean(content.meaning?.trim())
  ) && !content.selectedExcerpt
  const selectedArtwork = useMemo<ShareHighlightArtwork | null>(() => (
    selectedArtworkId === NO_ARTWORK_ID
      ? null
      : shareHighlightAssets.find(asset => asset.id === selectedArtworkId) ?? null
  ), [selectedArtworkId])

  useEffect(() => {
    if (!open) return
    setSelectedArtworkId(resolveInitialArtworkId(initialArtworkId))
    setTextPosition('auto')
    setShowTransliteration(
      Boolean(content.transliteration?.trim())
      && !content.selectedExcerpt
      && (content.initialShowTransliteration ?? true)
    )
    setShowMeaning(
      Boolean(content.meaning?.trim())
      && !content.selectedExcerpt
      && (content.initialShowMeaning ?? true)
    )
    setSocialNote((content.caption ?? '').slice(0, SOCIAL_NOTE_LIMIT))
    setBusyAction(null)
    setActivePageIndex(0)
  }, [
    content.caption,
    content.gurmukhi,
    content.initialShowMeaning,
    content.initialShowTransliteration,
    content.meaning,
    content.passageLines,
    content.seriesLabel,
    content.dateLabel,
    content.selectedExcerpt,
    content.sourceLabel,
    content.transliteration,
    content.verseId,
    initialArtworkId,
    open,
  ])

  const cardInput = useMemo<ShareHighlightCardInput>(() => ({
    artwork: selectedArtwork,
    textPosition: selectedArtwork ? textPosition : 'auto',
    content: {
      gurmukhi: content.gurmukhi,
      transliteration: showTransliteration ? content.transliteration : null,
      meaning: showMeaning ? content.meaning : null,
      sourceLabel: content.sourceLabel,
    },
    fileName: makeFileName(content.verseId),
  }), [
    content.gurmukhi,
    content.meaning,
    content.sourceLabel,
    content.transliteration,
    content.verseId,
    selectedArtwork,
    showMeaning,
    showTransliteration,
    textPosition,
  ])

  const passageInput = useMemo<ShareHighlightPassageInput | null>(() => {
    if (!isPassage) return null
    return {
      artwork: selectedArtwork,
      content: {
        lines: passageLines.map(line => ({
          ...line,
          transliteration: showTransliteration ? line.transliteration : null,
          meaning: showMeaning ? line.meaning : null,
        })),
        sourceLabel: content.sourceLabel,
        seriesLabel: content.seriesLabel?.trim() || 'Hukamnama',
        dateLabel: content.dateLabel?.trim() || null,
      },
      fileNameBase: content.dateLabel?.trim()
        ? `naamras-hukamnama-${content.dateLabel}`
        : 'naamras-hukamnama',
    }
  }, [
    content.dateLabel,
    content.seriesLabel,
    content.sourceLabel,
    isPassage,
    passageLines,
    selectedArtwork,
    showMeaning,
    showTransliteration,
  ])

  useEffect(() => {
    if (!open || !canvasElement) return

    const renderSequence = ++renderSequenceRef.current
    setPngExports([])
    setActivePageIndex(0)
    setRenderFailed(false)
    setStatus(copy.preparing)

    const exportPromise = passageInput
      ? exportShareHighlightPngSet(passageInput)
      : exportShareHighlightPng(cardInput, { canvas: canvasElement }).then(result => ({
          pages: [result],
          files: [result.file],
          totalPages: 1,
        }))

    void exportPromise
      .then(result => {
        if (renderSequenceRef.current !== renderSequence) return
        setPngExports(result.pages)
        setStatus(passageInput ? copy.setReady(result.pages.length) : copy.ready)
      })
      .catch(() => {
        if (renderSequenceRef.current !== renderSequence) return
        setPngExports([])
        setRenderFailed(true)
        setStatus(copy.renderError)
      })

    return () => {
      if (renderSequenceRef.current === renderSequence) renderSequenceRef.current += 1
    }
  }, [canvasElement, cardInput, copy, open, passageInput])

  const activeExport = pngExports[activePageIndex] ?? null
  const exportFiles = useMemo(() => pngExports.map(item => item.file), [pngExports])

  useEffect(() => {
    if (!canvasElement || !activeExport?.canvas || activeExport.canvas === canvasElement) return
    const context = canvasElement.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvasElement.width, canvasElement.height)
    context.drawImage(activeExport.canvas, 0, 0, canvasElement.width, canvasElement.height)
  }, [activeExport, canvasElement])

  const announce = (message: string) => {
    setStatus(message)
    onNotice?.(message)
  }

  const handleShare = async () => {
    if (!activeExport || exportFiles.length === 0 || busyAction) return
    setBusyAction('share')
    try {
      const result = isPassage
        ? await shareHighlightFiles(exportFiles, {
            title: copy.shareSetTitle,
            text: socialNote,
            archiveName: 'naamras-hukamnama.zip',
          })
        : await shareHighlightFile(activeExport.file, {
            title: copy.shareTitle,
            text: socialNote,
          })
      if (result.status === 'shared') announce(copy.shared)
      if (result.status === 'cancelled') announce(copy.cancelled)
      if (result.status === 'downloaded') {
        announce(isPassage && exportFiles.length > 1 ? copy.setDownloaded : copy.downloaded)
      }
    } catch {
      announce(copy.actionError)
    } finally {
      setBusyAction(null)
    }
  }

  const handleSave = async () => {
    if (!activeExport || exportFiles.length === 0 || busyAction) return
    setBusyAction('save')
    try {
      if (isPassage) {
        await downloadShareHighlightFiles(exportFiles, { archiveName: 'naamras-hukamnama.zip' })
        announce(exportFiles.length > 1 ? copy.setDownloaded : copy.downloaded)
      } else {
        downloadShareHighlightFile(activeExport.file)
        announce(copy.downloaded)
      }
    } catch {
      announce(copy.actionError)
    } finally {
      setBusyAction(null)
    }
  }

  const handleCopy = async () => {
    if (busyAction) return
    setBusyAction('copy')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(buildCopiedText(content, showTransliteration, showMeaning, socialNote))
      announce(copy.copied)
    } catch {
      announce(copy.actionError)
    } finally {
      setBusyAction(null)
    }
  }

  const previewSupportingDescription = [
    isPassage
      ? passageLines.map(line => line.gurmukhi).join('. ')
      : content.gurmukhi,
    content.sourceLabel,
    'naamras.xyz',
  ].filter(Boolean).join('. ')

  const movePreviewPage = (direction: -1 | 1) => {
    setActivePageIndex(current => Math.min(
      Math.max(current + direction, 0),
      Math.max(pngExports.length - 1, 0)
    ))
  }

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={copy.dialogTitle}
      description={copy.dialogDescription}
      className="share-highlight-sheet"
      testId="share-highlight-sheet"
      initialFocusRef={closeButtonRef}
    >
      <header className="share-highlight__header">
        <div>
          <p className="share-highlight__preface">{isPassage ? copy.passagePreface : copy.preface}</p>
          <h2 className="share-highlight__title">{isPassage ? copy.passageTitle : copy.title}</h2>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="share-highlight__close"
        >
          <IconClose size={17} />
        </button>
      </header>

      <div className="share-highlight__scroll">
        <div className="share-highlight__workspace">
          <section className="share-highlight__preview-column" aria-label={copy.preview}>
            <div
              className="share-highlight__preview-frame"
              onTouchStart={event => {
                previewTouchStartXRef.current = event.changedTouches[0]?.clientX ?? null
              }}
              onTouchEnd={event => {
                const startX = previewTouchStartXRef.current
                const endX = event.changedTouches[0]?.clientX
                previewTouchStartXRef.current = null
                if (startX == null || endX == null || Math.abs(endX - startX) < 40) return
                movePreviewPage(endX < startX ? 1 : -1)
              }}
            >
              <canvas
                ref={setCanvasElement}
                role="img"
                aria-label={copy.preview}
                aria-describedby={previewDescriptionId}
                width={1080}
                height={1350}
              />
              {!activeExport ? (
                <div
                  className={`share-highlight__preview-pending${renderFailed ? ' share-highlight__preview-pending--error' : ''}`}
                  aria-hidden="true"
                >
                  <span>{status}</span>
                </div>
              ) : null}
            </div>
            {isPassage && pngExports.length > 0 ? (
              <nav
                className="share-highlight__page-navigation"
                aria-label={copy.pagePosition(activePageIndex + 1, pngExports.length)}
              >
                <button
                  type="button"
                  className="share-highlight__page-button"
                  aria-label={copy.previousPage}
                  disabled={activePageIndex === 0}
                  onClick={() => movePreviewPage(-1)}
                >
                  <IconArrowLeft size={16} />
                </button>
                <div className="share-highlight__page-position" aria-live="polite">
                  <span>{copy.pagePosition(activePageIndex + 1, pngExports.length)}</span>
                  {pngExports.length <= 8 ? (
                    <span className="share-highlight__page-dots" aria-hidden="true">
                      {pngExports.map((page, index) => (
                        <span
                          key={page.file.name}
                          className={`share-highlight__page-dot${index === activePageIndex ? ' share-highlight__page-dot--active' : ''}`}
                        />
                      ))}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="share-highlight__page-button"
                  aria-label={copy.nextPage}
                  disabled={activePageIndex === pngExports.length - 1}
                  onClick={() => movePreviewPage(1)}
                >
                  <IconArrowRight size={16} />
                </button>
              </nav>
            ) : null}
            <p id={previewDescriptionId} className="sr-only">
              <span lang="pa-Guru">{previewSupportingDescription}</span>
            </p>
            <div className="share-highlight__provenance">
              <span>
                {copy.citation}
                <strong>{content.sourceLabel}</strong>
              </span>
              <span className="share-highlight__domain" aria-label={`${copy.brand}: naamras.xyz`}>
                naamras.xyz
              </span>
            </div>
          </section>

          <div className="share-highlight__controls-column">
            <section className="share-highlight__control-group" aria-labelledby={`${artworkGroupId}-layers`}>
              <p id={`${artworkGroupId}-layers`} className="share-highlight__control-label">{copy.textLayers}</p>
              <p className="share-highlight__control-help">
                {isPassage ? copy.passageTextLayersHelp : copy.textLayersHelp}
              </p>
              {content.selectedExcerpt ? (
                <p className="share-highlight__control-help">{copy.selectedExcerpt}</p>
              ) : null}
              <div className="share-highlight__pills">
                <button
                  type="button"
                  className="share-highlight__pill"
                  aria-pressed="true"
                  aria-label={`${copy.gurmukhi}. ${copy.alwaysIncluded}`}
                  title={copy.alwaysIncluded}
                  disabled
                >
                  <span className="share-highlight__pill-mark" aria-hidden="true"><IconCheck size={9} /></span>
                  {copy.gurmukhi}
                </button>
                <button
                  type="button"
                  className="share-highlight__pill"
                  aria-pressed={showTransliteration}
                  aria-label={hasTransliteration ? copy.transliteration : `${copy.transliteration}. ${copy.unavailable}`}
                  title={hasTransliteration ? undefined : copy.unavailable}
                  disabled={!hasTransliteration}
                  onClick={() => setShowTransliteration(value => !value)}
                >
                  {showTransliteration ? <span className="share-highlight__pill-mark" aria-hidden="true"><IconCheck size={9} /></span> : null}
                  {copy.transliteration}
                </button>
                <button
                  type="button"
                  className="share-highlight__pill"
                  aria-pressed={showMeaning}
                  aria-label={hasMeaning ? copy.meaning : `${copy.meaning}. ${copy.unavailable}`}
                  title={hasMeaning ? undefined : copy.unavailable}
                  disabled={!hasMeaning}
                  onClick={() => setShowMeaning(value => !value)}
                >
                  {showMeaning ? <span className="share-highlight__pill-mark" aria-hidden="true"><IconCheck size={9} /></span> : null}
                  {copy.meaning}
                </button>
              </div>
            </section>

            <fieldset className="share-highlight__control-group">
              <legend className="share-highlight__control-label">{copy.artwork}</legend>
              <p className="share-highlight__control-help">{copy.artworkHelp}</p>
              <div className="share-highlight__art-strip" role="radiogroup" aria-label={copy.artwork}>
                <div className="share-highlight__art-choice">
                  <input
                    id={`${artworkGroupId}-none`}
                    className="share-highlight__art-input"
                    type="radio"
                    name={artworkGroupId}
                    value={NO_ARTWORK_ID}
                    checked={selectedArtworkId === NO_ARTWORK_ID}
                    onChange={() => {
                      setSelectedArtworkId(NO_ARTWORK_ID)
                      setTextPosition('auto')
                    }}
                  />
                  <label className="share-highlight__art-option" htmlFor={`${artworkGroupId}-none`}>
                    <span className="share-highlight__art-thumb share-highlight__no-art" aria-hidden="true">∅</span>
                    <span className="share-highlight__art-name">{copy.noArtwork}</span>
                  </label>
                </div>
                {shareHighlightAssets.map((asset, index) => (
                  <div className="share-highlight__art-choice" key={asset.id}>
                    <input
                      id={`${artworkGroupId}-${asset.id}`}
                      className="share-highlight__art-input"
                      type="radio"
                      name={artworkGroupId}
                      value={asset.id}
                      checked={selectedArtworkId === asset.id}
                      onChange={() => setSelectedArtworkId(asset.id)}
                    />
                    <label className="share-highlight__art-option" htmlFor={`${artworkGroupId}-${asset.id}`}>
                      <span className="share-highlight__art-thumb">
                        <img src={asset.thumbnail} alt={asset.description} loading="lazy" decoding="async" />
                      </span>
                      <span className="share-highlight__art-name">{copy.artworkNumber(index + 1)}</span>
                    </label>
                  </div>
                ))}
              </div>
              {selectedArtwork && !isPassage ? (
                <div className="share-highlight__position-control">
                  <p id={`${positionGroupId}-label`} className="share-highlight__control-label">
                    {copy.textPosition}
                  </p>
                  <p id={`${positionGroupId}-help`} className="share-highlight__control-help">
                    {copy.textPositionHelp}
                  </p>
                  <div
                    className="share-highlight__position-options"
                    role="radiogroup"
                    aria-labelledby={`${positionGroupId}-label`}
                    aria-describedby={`${positionGroupId}-help`}
                  >
                    {([
                      ['auto', copy.positionAuto],
                      ['top', copy.positionTop],
                      ['middle', copy.positionMiddle],
                      ['bottom', copy.positionBottom],
                    ] as const).map(([position, label]) => (
                      <label className="share-highlight__position-option" key={position}>
                        <input
                          className="share-highlight__position-input"
                          type="radio"
                          name={positionGroupId}
                          value={position}
                          checked={textPosition === position}
                          onChange={() => setTextPosition(position)}
                        />
                        <span className="share-highlight__position-choice">
                          <span
                            className={`share-highlight__position-icon share-highlight__position-icon--${position}`}
                            aria-hidden="true"
                          >
                            <span />
                          </span>
                          <span className="share-highlight__position-name">{label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </fieldset>

            <section className="share-highlight__control-group">
              <label className="share-highlight__caption-label" htmlFor={captionId}>
                <span className="share-highlight__control-label">{copy.socialNote}</span>
                <span className="share-highlight__control-help">{copy.socialNoteHelp}</span>
              </label>
              <textarea
                id={captionId}
                className="share-highlight__caption"
                value={socialNote}
                maxLength={SOCIAL_NOTE_LIMIT}
                placeholder={copy.socialPlaceholder}
                onChange={event => setSocialNote(event.target.value)}
              />
              <span className="share-highlight__caption-count" aria-hidden="true">
                {copy.characters(socialNote.length)}
              </span>
            </section>
          </div>
        </div>
      </div>

      <footer className="share-highlight__action-bar">
        <div className="share-highlight__primary-actions">
          <button
            type="button"
            className="share-highlight__action share-highlight__action--primary"
            disabled={!activeExport || busyAction !== null}
            onClick={() => { void handleShare() }}
          >
            <IconShare size={17} />
            {isPassage ? copy.shareImages(pngExports.length) : copy.shareImage}
          </button>
          <button
            type="button"
            className="share-highlight__action share-highlight__action--secondary"
            disabled={!activeExport || busyAction !== null}
            onClick={() => { void handleSave() }}
          >
            <span aria-hidden="true">↓</span>
            {isPassage && pngExports.length > 1 ? copy.saveSet : copy.saveImage}
          </button>
        </div>
        <button
          type="button"
          className="share-highlight__copy"
          disabled={busyAction !== null}
          onClick={() => { void handleCopy() }}
        >
          {copy.copyText}
        </button>
        <p className="share-highlight__status" role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
      </footer>
    </ModalSheet>
  )
}
