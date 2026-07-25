import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { shareHighlightAssets } from '../../assets/share-highlights/manifest'
import { IconCheck, IconClose, IconShare } from '../../components/icons'
import ModalSheet from '../../components/ModalSheet'
import type { UiLocale } from '../../types'
import {
  exportShareHighlightPng,
  exportShareHighlightStoryPng,
  ShareHighlightContentOverflowError,
} from './renderer'
import { downloadShareHighlightFile, shareHighlightFile } from './share'
import type {
  ShareHighlightArtwork,
  ShareHighlightCardInput,
  ShareHighlightPassageInput,
  ShareHighlightPassageLine,
  ShareHighlightPngExport,
  ShareHighlightStoryPngExport,
  ShareHighlightTextPosition,
} from './types'
import { SHARE_HIGHLIGHT_CARD_HEIGHT, SHARE_HIGHLIGHT_STORY_HEIGHT } from './types'
import './ShareHighlightSheet.css'

const NO_ARTWORK_ID = 'none'
const SOCIAL_NOTE_LIMIT = 280
const EXPRESSIVE_PASSAGE_LIMIT = 8
type PassageSupport = 'transliteration' | 'meaning'

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
  quietPassageArtworkNote: string
  passageSupportOverflow: (support: PassageSupport) => string
  preparingBilingual: string
  bilingualReady: string
  passageShareTitle: string
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
    passageTitle: 'Create a Story image',
    passageTextLayersHelp: 'Gurmukhi is always included. Meaning places each complete English translation directly below its matching Gurbani line. Choose Transliteration instead for pronunciation.',
    quietPassageArtworkNote: 'Long Hukamnamas use a quiet manuscript background so the complete reading stays balanced and legible.',
    passageSupportOverflow: support => support === 'meaning'
      ? 'Meaning is too long to fit readably on one Story. Showing Gurmukhi only — the full translation is still available in Copy text.'
      : 'Transliteration is too long to fit readably on one Story. Showing Gurmukhi only — the full transliteration is still available in Copy text.',
    preparingBilingual: 'Preparing bilingual Story…',
    bilingualReady: 'Bilingual Story ready.',
    passageShareTitle: 'Hukamnama from NaamRas',
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
    passageTitle: 'ਸਟੋਰੀ ਤਸਵੀਰ ਬਣਾਓ',
    passageTextLayersHelp: 'ਗੁਰਮੁਖੀ ਹਮੇਸ਼ਾ ਸ਼ਾਮਲ ਹੈ। ਅਰਥ ਹਰ ਗੁਰਬਾਣੀ ਪੰਕਤੀ ਦੇ ਬਿਲਕੁਲ ਹੇਠਾਂ ਉਸ ਦਾ ਪੂਰਾ ਅੰਗਰੇਜ਼ੀ ਅਨੁਵਾਦ ਦਿਖਾਉਂਦਾ ਹੈ। ਉਚਾਰਨ ਲਈ ਇਸ ਦੀ ਥਾਂ ਲਿਪੀਅੰਤਰਨ ਚੁਣੋ।',
    quietPassageArtworkNote: 'ਲੰਮੇ ਹੁਕਮਨਾਮਿਆਂ ਲਈ ਸਾਦਾ ਹੱਥ-ਲਿਖਤ ਪਿਛੋਕੜ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ ਤਾਂ ਜੋ ਪੂਰਾ ਪਾਠ ਸੰਤੁਲਿਤ ਅਤੇ ਪੜ੍ਹਨਯੋਗ ਰਹੇ।',
    passageSupportOverflow: support => support === 'meaning'
      ? 'ਅਰਥ ਇੱਕ ਸਟੋਰੀ ਉੱਤੇ ਪੜ੍ਹਨਯੋਗ ਢੰਗ ਨਾਲ ਫਿੱਟ ਹੋਣ ਲਈ ਬਹੁਤ ਲੰਮੇ ਹਨ। ਸਿਰਫ਼ ਗੁਰਮੁਖੀ ਦਿਖਾਈ ਜਾ ਰਹੀ ਹੈ — ਪੂਰਾ ਅਨੁਵਾਦ “ਲਿਖਤ ਕਾਪੀ ਕਰੋ” ਵਿੱਚ ਉਪਲਬਧ ਹੈ।'
      : 'ਲਿਪੀਅੰਤਰਨ ਇੱਕ ਸਟੋਰੀ ਉੱਤੇ ਪੜ੍ਹਨਯੋਗ ਢੰਗ ਨਾਲ ਫਿੱਟ ਹੋਣ ਲਈ ਬਹੁਤ ਲੰਮਾ ਹੈ। ਸਿਰਫ਼ ਗੁਰਮੁਖੀ ਦਿਖਾਈ ਜਾ ਰਹੀ ਹੈ — ਪੂਰਾ ਲਿਪੀਅੰਤਰਨ “ਲਿਖਤ ਕਾਪੀ ਕਰੋ” ਵਿੱਚ ਉਪਲਬਧ ਹੈ।',
    preparingBilingual: 'ਦੋ-ਭਾਸ਼ਾਈ ਸਟੋਰੀ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ…',
    bilingualReady: 'ਦੋ-ਭਾਸ਼ਾਈ ਸਟੋਰੀ ਤਿਆਰ ਹੈ।',
    passageShareTitle: 'ਨਾਮਰਸ ਤੋਂ ਹੁਕਮਨਾਮਾ',
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
    passageTitle: 'स्टोरी छवि बनाएँ',
    passageTextLayersHelp: 'गुरमुखी हमेशा शामिल है। अर्थ हर गुरबाणी पंक्ति के ठीक नीचे उसका पूरा अंग्रेज़ी अनुवाद दिखाता है। उच्चारण के लिए इसकी जगह लिप्यंतरण चुनें।',
    quietPassageArtworkNote: 'लंबे हुकमनामों में शांत पांडुलिपि पृष्ठभूमि रहती है, ताकि पूरा पाठ संतुलित और पढ़ने योग्य रहे।',
    passageSupportOverflow: support => support === 'meaning'
      ? 'अर्थ एक स्टोरी पर पढ़ने योग्य रूप में फिट होने के लिए बहुत लंबा है। केवल गुरमुखी दिखाई जा रही है — पूरा अनुवाद “पाठ कॉपी करें” में उपलब्ध है।'
      : 'लिप्यंतरण एक स्टोरी पर पढ़ने योग्य रूप में फिट होने के लिए बहुत लंबा है। केवल गुरमुखी दिखाई जा रही है — पूरा लिप्यंतरण “पाठ कॉपी करें” में उपलब्ध है।',
    preparingBilingual: 'द्विभाषी स्टोरी तैयार हो रही है…',
    bilingualReady: 'द्विभाषी स्टोरी तैयार है।',
    passageShareTitle: 'नामरस से हुकमनामा',
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
  const artworkGroupId = useId()
  const positionGroupId = useId()
  const captionId = useId()
  const previewDescriptionId = useId()
  const passageLines = useMemo(
    () => content.passageLines?.filter(line => line.gurmukhi.trim()) ?? [],
    [content.passageLines]
  )
  const isPassage = passageLines.length > 0
  const usesQuietPassageLayout = (
    isPassage
    && passageLines.filter(line => !line.isHeader).length > EXPRESSIVE_PASSAGE_LIMIT
  )
  const [selectedArtworkId, setSelectedArtworkId] = useState(() => resolveInitialArtworkId(initialArtworkId))
  const [textPosition, setTextPosition] = useState<ShareHighlightTextPosition>('auto')
  const [showTransliteration, setShowTransliteration] = useState(() => (
    !isPassage
    && Boolean(content.transliteration?.trim())
    && !content.selectedExcerpt
    && (content.initialShowTransliteration ?? true)
  ))
  const [showMeaning, setShowMeaning] = useState(() => (
    !isPassage
    && Boolean(content.meaning?.trim())
    && !content.selectedExcerpt
    && (content.initialShowMeaning ?? true)
  ))
  const [socialNote, setSocialNote] = useState(() => (content.caption ?? '').slice(0, SOCIAL_NOTE_LIMIT))
  const [pngExport, setPngExport] = useState<ShareHighlightPngExport | ShareHighlightStoryPngExport | null>(null)
  const [status, setStatus] = useState(copy.preparing)
  const [renderFailed, setRenderFailed] = useState(false)
  const [rendering, setRendering] = useState(true)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const [busyAction, setBusyAction] = useState<'share' | 'save' | 'copy' | null>(null)
  const [passageSupportOverflow, setPassageSupportOverflow] = useState<PassageSupport | null>(null)

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
      !isPassage
      && Boolean(content.transliteration?.trim())
      && !content.selectedExcerpt
      && (content.initialShowTransliteration ?? true)
    )
    setShowMeaning(
      !isPassage
      && Boolean(content.meaning?.trim())
      && !content.selectedExcerpt
      && (content.initialShowMeaning ?? true)
    )
    setSocialNote((content.caption ?? '').slice(0, SOCIAL_NOTE_LIMIT))
    setBusyAction(null)
    setPngExport(null)
    setRenderFailed(false)
    setRendering(true)
    setPassageSupportOverflow(null)
    setStatus(copy.preparing)
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
    isPassage,
    open,
    copy.preparing,
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
      artwork: usesQuietPassageLayout ? null : selectedArtwork,
      content: {
        lines: passageLines.map(line => ({
          ...line,
          transliteration: showTransliteration && !showMeaning ? line.transliteration : null,
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
    usesQuietPassageLayout,
  ])
  const activePassageSupport: PassageSupport | null = showMeaning
    ? 'meaning'
    : showTransliteration
      ? 'transliteration'
      : null

  useEffect(() => {
    if (!open || !canvasElement) return

    const renderSequence = ++renderSequenceRef.current
    if (!passageInput) setPngExport(null)
    setRenderFailed(false)
    setRendering(true)
    setStatus(passageInput && activePassageSupport === 'meaning'
      ? copy.preparingBilingual
      : copy.preparing)

    const exportPromise = passageInput
      ? exportShareHighlightStoryPng(passageInput)
      : exportShareHighlightPng(cardInput, { canvas: canvasElement })

    void exportPromise
      .then(result => {
        if (renderSequenceRef.current !== renderSequence) return
        setPngExport(result)
        setRendering(false)
        if (passageInput && activePassageSupport) setPassageSupportOverflow(null)
        setStatus(passageInput && activePassageSupport === 'meaning'
          ? copy.bilingualReady
          : copy.ready)
      })
      .catch(error => {
        if (renderSequenceRef.current !== renderSequence) return
        if (
          passageInput
          && activePassageSupport
          && error instanceof ShareHighlightContentOverflowError
          && error.reason === 'support-overflow'
        ) {
          setPassageSupportOverflow(activePassageSupport)
          setShowTransliteration(false)
          setShowMeaning(false)
          setRenderFailed(false)
          setStatus(copy.passageSupportOverflow(activePassageSupport))
          return
        }
        setPngExport(null)
        setRenderFailed(true)
        setRendering(false)
        setStatus(copy.renderError)
      })

    return () => {
      if (renderSequenceRef.current === renderSequence) renderSequenceRef.current += 1
    }
  }, [activePassageSupport, canvasElement, cardInput, copy, open, passageInput])

  useEffect(() => {
    if (
      !canvasElement
      || !isPassage
      || !pngExport
      || pngExport.height !== SHARE_HIGHLIGHT_STORY_HEIGHT
      || pngExport.canvas === canvasElement
    ) return

    const context = canvasElement.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvasElement.width, canvasElement.height)
    context.drawImage(pngExport.canvas, 0, 0, canvasElement.width, canvasElement.height)
  }, [canvasElement, isPassage, pngExport])

  const announce = (message: string) => {
    setStatus(message)
    onNotice?.(message)
  }

  const handleShare = async () => {
    if (!pngExport || busyAction) return
    setBusyAction('share')
    try {
      const result = await shareHighlightFile(pngExport.file, {
        title: isPassage ? copy.passageShareTitle : copy.shareTitle,
        text: socialNote,
      })
      if (result.status === 'shared') announce(copy.shared)
      if (result.status === 'cancelled') announce(copy.cancelled)
      if (result.status === 'downloaded') announce(copy.downloaded)
    } catch {
      announce(copy.actionError)
    } finally {
      setBusyAction(null)
    }
  }

  const handleSave = async () => {
    if (!pngExport || busyAction) return
    setBusyAction('save')
    try {
      downloadShareHighlightFile(pngExport.file)
      announce(copy.downloaded)
    } catch {
      announce(copy.actionError)
    } finally {
      setBusyAction(null)
    }
  }

  const handleTransliterationToggle = () => {
    if (!isPassage) {
      setShowTransliteration(value => !value)
      return
    }

    const nextValue = !showTransliteration
    setRendering(true)
    setShowTransliteration(nextValue)
    if (nextValue) setShowMeaning(false)
  }

  const handleMeaningToggle = () => {
    if (!isPassage) {
      setShowMeaning(value => !value)
      return
    }

    const nextValue = !showMeaning
    setRendering(true)
    setShowMeaning(nextValue)
    if (nextValue) setShowTransliteration(false)
  }

  const handleCopy = async () => {
    if (busyAction) return
    setBusyAction('copy')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(buildCopiedText(
        content,
        isPassage ? hasTransliteration : showTransliteration,
        isPassage ? hasMeaning : showMeaning,
        socialNote
      ))
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

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={copy.dialogTitle}
      description={copy.dialogDescription}
      className={`share-highlight-sheet${isPassage ? ' share-highlight-sheet--passage' : ''}`}
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
              className={`share-highlight__preview-frame${isPassage ? ' share-highlight__preview-frame--story' : ''}`}
            >
              <canvas
                ref={setCanvasElement}
                role="img"
                aria-label={copy.preview}
                aria-describedby={previewDescriptionId}
                width={1080}
                height={isPassage ? SHARE_HIGHLIGHT_STORY_HEIGHT : SHARE_HIGHLIGHT_CARD_HEIGHT}
              />
              {!pngExport ? (
                <div
                  className={`share-highlight__preview-pending${renderFailed ? ' share-highlight__preview-pending--error' : ''}`}
                  aria-hidden="true"
                >
                  <span>{status}</span>
                </div>
              ) : null}
            </div>
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
                  onClick={handleTransliterationToggle}
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
                  onClick={handleMeaningToggle}
                >
                  {showMeaning ? <span className="share-highlight__pill-mark" aria-hidden="true"><IconCheck size={9} /></span> : null}
                  {copy.meaning}
                </button>
              </div>
              {isPassage && passageSupportOverflow ? (
                <p className="share-highlight__fit-note" role="note" aria-live="polite">
                  {copy.passageSupportOverflow(passageSupportOverflow)}
                </p>
              ) : null}
            </section>

            {usesQuietPassageLayout ? (
              <section className="share-highlight__quiet-layout-note" role="note">
                <p className="share-highlight__control-label">{copy.noArtwork}</p>
                <p className="share-highlight__control-help">{copy.quietPassageArtworkNote}</p>
              </section>
            ) : (
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
                      setRendering(true)
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
                      onChange={() => {
                        setRendering(true)
                        setSelectedArtworkId(asset.id)
                      }}
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
                          onChange={() => {
                            setRendering(true)
                            setTextPosition(position)
                          }}
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
            )}

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
            disabled={!pngExport || rendering || busyAction !== null}
            onClick={() => { void handleShare() }}
          >
            <IconShare size={17} />
            {copy.shareImage}
          </button>
          <button
            type="button"
            className="share-highlight__action share-highlight__action--secondary"
            disabled={!pngExport || rendering || busyAction !== null}
            onClick={() => { void handleSave() }}
          >
            <span aria-hidden="true">↓</span>
            {copy.saveImage}
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
