import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
  shareHighlightAssets,
  shareHighlightHukamnamaAssets,
} from '../../assets/share-highlights/manifest'
import { IconCheck, IconClose, IconShare } from '../../components/icons'
import ModalSheet from '../../components/ModalSheet'
import type { UiLocale } from '../../types'
import { focusElementWithoutAppScroll } from '../../utils/appScroll'
import {
  exportShareHighlightPng,
  exportShareHighlightHukamnamaPng,
  HukamnamaImageTooLongError,
} from './renderer'
import {
  copyShareHighlightText,
  downloadShareHighlightFile,
  downloadShareHighlightFiles,
  shareHighlightFile,
  shareHighlightFiles,
} from './share'
import { getCanonicalSourceUrl, getHukamnamaShareUrl } from './sourceUrl'
import { isNativeImagePlatform, saveNativeHighlightFiles } from './nativeShare'
import type {
  ShareHighlightCardInput,
  ShareHighlightPassageInput,
  ShareHighlightPassageLine,
  ShareHighlightPngExport,
  ShareHighlightStoryPngExport,
  ShareHighlightStoryPngSet,
  ShareHighlightStoryScopeCopy,
  ShareHighlightStorySelection,
  ShareHighlightTextPosition,
} from './types'
import { SHARE_HIGHLIGHT_CARD_HEIGHT, SHARE_HIGHLIGHT_STORY_HEIGHT } from './types'
import './ShareHighlightSheet.css'

const NO_ARTWORK_ID = 'none'
const DEFAULT_HUKAMNAMA_ARTWORK_ID = 'interior-audience'
const HUKAMNAMA_ARTWORK_PREFERENCE_KEY = 'naamras.share-highlight.hukamnama-artwork.v1'
const SOCIAL_NOTE_LIMIT = 280
const RENDER_DEBOUNCE_MS = 90
const PREVIEW_DECODE_TIMEOUT_MS = 12_000
const SHARE_ACTION_TIMEOUT_MS = 45_000

const NATIVE_SAVE_COPY = {
  en: { label: 'Save to Photos', saving: 'Saving to Photos…', saved: 'Saved to Photos.', failed: 'The image was not saved. Try again, or use Share image to save to Files.', permissionFailed: 'The image was not saved. Allow NaamRas to add photos in Settings, or use Share image to save to Files.' },
  pa: { label: 'ਫ਼ੋਟੋਆਂ ਵਿੱਚ ਸੰਭਾਲੋ', saving: 'ਫ਼ੋਟੋਆਂ ਵਿੱਚ ਸੰਭਾਲਿਆ ਜਾ ਰਿਹਾ ਹੈ…', saved: 'ਫ਼ੋਟੋਆਂ ਵਿੱਚ ਸੰਭਾਲਿਆ ਗਿਆ।', failed: 'ਤਸਵੀਰ ਸੰਭਾਲੀ ਨਹੀਂ ਗਈ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਫ਼ਾਈਲਾਂ ਵਿੱਚ ਸੰਭਾਲਣ ਲਈ ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ।', permissionFailed: 'ਤਸਵੀਰ ਸੰਭਾਲੀ ਨਹੀਂ ਗਈ। ਸੈਟਿੰਗਾਂ ਵਿੱਚ NaamRas ਨੂੰ ਫ਼ੋਟੋਆਂ ਜੋੜਨ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ ਜਾਂ ਫ਼ਾਈਲਾਂ ਵਿੱਚ ਸੰਭਾਲਣ ਲਈ ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ।' },
  hi: { label: 'फ़ोटो में सहेजें', saving: 'फ़ोटो में सहेजा जा रहा है…', saved: 'फ़ोटो में सहेजा गया।', failed: 'छवि सहेजी नहीं गई। फिर कोशिश करें या फ़ाइलों में सहेजने के लिए छवि साझा करें।', permissionFailed: 'छवि सहेजी नहीं गई। सेटिंग्स में NaamRas को फ़ोटो जोड़ने की अनुमति दें या फ़ाइलों में सहेजने के लिए छवि साझा करें।' },
} satisfies Record<UiLocale, { label: string; saving: string; saved: string; failed: string; permissionFailed: string }>

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
  /** Distinguishes a dated daily Hukamnama from one received after Ardaas. */
  passageKind?: 'daily-hukamnama' | 'personal-hukamnama'
  seriesLabel?: string
  dateLabel?: string
  /** App-relative route that reopens this exact passage. Defaults to the current route. */
  sourcePath?: string
  /** Optional compact app-relative route that redirects to `sourcePath`. */
  sharePath?: string
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
  passageArtworkHelp: (count: number) => string
  noArtwork: string
  noArtworkDescription: string
  selectedArtwork: string
  artworkAppliesToSet: (count: number) => string
  applyingArtwork: (name: string) => string
  artworkReady: (name: string) => string
  artworkSetReady: (name: string, count: number) => string
  useNoArtwork: string
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
  personalPassagePreface: string
  passageTextLayersHelp: string
  passageComplete: string
  tallImageHint: string
  passageExcerpt: string
  personalPassageExcerpt: string
  passageImageCoverage: (included: number, total: number) => string
  passageSetCoverage: (lines: number, images: number) => string
  passageImagePosition: (current: number, total: number) => string
  passageFullTextFollows: string
  changePassage: string
  previousPassage: string
  nextPassage: string
  passageNavigationHelp: string
  passageSetNavigationHelp: (count: number) => string
  storyScopeCopy: ShareHighlightStoryScopeCopy
  personalStoryScopeCopy: ShareHighlightStoryScopeCopy
  preparingBilingual: string
  bilingualReady: string
  passageShareTitle: string
  shareImage: string
  shareImages: (count: number) => string
  saveImage: string
  saveImages: (count: number) => string
  copyText: string
  copyFullText: string
  reflectionLabel: string
  imageTextAlternative: string
  completeImageNote: string
  completeImageSetNote: (count: number) => string
  excerptImageNote: string
  personalExcerptImageNote: string
  readOnline: string
  raagCredit: (value: string) => string
  writerCredit: (value: string) => string
  translationCredit: (value: string) => string
  previewSummary: (kind: 'passage' | 'line', layers: string) => string
  supportCoverage: (available: number, total: number) => string
  preparing: string
  preparingSet: string
  ready: string
  setReady: (count: number) => string
  shareTitle: string
  sharing: string
  downloading: string
  copying: string
  shared: string
  sharedFileOnly: string
  sharedFilesOnly: (count: number) => string
  cancelled: string
  shareUnavailable: string
  shareFailed: string
  shareTimedOut: string
  downloaded: string
  downloadedSet: (count: number) => string
  copied: string
  renderError: string
  imageTooLong: (supportLabel?: string) => string
  retry: string
  actionError: string
  characters: (count: number) => string
}

const SHEET_COPY: Record<UiLocale, ShareHighlightSheetCopy> = {
  en: {
    dialogTitle: 'Share highlight',
    dialogDescription: 'Choose artwork and reading supports, then share or save your image.',
    preface: 'Share a line for remembrance',
    title: 'Create a share image',
    close: 'Close share image',
    preview: 'Share image preview',
    citation: 'Citation',
    brand: 'Brand',
    textLayers: 'Text on the card',
    textLayersHelp: 'Gurmukhi is always included. Add reading support below.',
    gurmukhi: 'Gurmukhi',
    alwaysIncluded: 'Always included and cannot be edited',
    transliteration: 'Transliteration',
    meaning: 'Meaning',
    unavailable: 'Not available for this selection',
    artwork: 'Artwork',
    artworkHelp: 'Choose a background, or keep it plain.',
    passageArtworkHelp: count => `${count} backgrounds, or keep it plain.`,
    noArtwork: 'No art',
    noArtworkDescription: 'A plain reading surface without a picture.',
    selectedArtwork: 'Selected artwork',
    artworkAppliesToSet: count => `Used on all ${count} images.`,
    applyingArtwork: name => `Applying ${name} behind the reading…`,
    artworkReady: name => `${name} applied. Image ready.`,
    artworkSetReady: (name, count) => `${name} applied. ${count} ordered images ready.`,
    useNoArtwork: 'Use No art',
    textPosition: 'Text position',
    textPositionHelp: 'Auto finds the clearest space on the artwork.',
    positionAuto: 'Auto',
    positionTop: 'Top',
    positionMiddle: 'Middle',
    positionBottom: 'Bottom',
    socialNote: 'Social note (optional)',
    socialNoteHelp: 'Shared with your image, never printed on it.',
    socialPlaceholder: 'Add a short reflection…',
    selectedExcerpt: 'This card contains only the Gurmukhi words you selected.',
    passagePreface: "Share today's Hukamnama",
    personalPassagePreface: 'Share this personal Hukamnama',
    passageTextLayersHelp: 'Gurmukhi is always included. Add meaning or pronunciation below each line.',
    passageComplete: 'Complete Hukamnama',
    tallImageHint: 'One taller image keeps every line readable. Check that the full image is visible before posting.',
    passageExcerpt: "Excerpt from today's Hukamnama",
    personalPassageExcerpt: 'Personal Hukamnama excerpt',
    passageImageCoverage: (included, total) => `${included} of ${total} lines in this image`,
    passageSetCoverage: (lines, images) => `${lines} lines across ${images} images`,
    passageImagePosition: (current, total) => `Image ${current} of ${total}`,
    passageFullTextFollows: 'The complete Hukamnama text follows.',
    changePassage: 'Change passage',
    previousPassage: 'Previous image',
    nextPassage: 'Next image',
    passageNavigationHelp: 'Choose another contiguous passage. Copy full text always includes the complete Hukamnama.',
    passageSetNavigationHelp: count => `All ${count} images are shared in order.`,
    storyScopeCopy: {
      complete: 'Complete Hukamnama',
      excerpt: "Excerpt from today's Hukamnama",
      coverageTemplate: '{included} of {total} lines',
      readComplete: 'Read complete Hukamnama',
      openInNaamras: 'Open in NaamRas',
    },
    personalStoryScopeCopy: {
      complete: 'Complete Hukamnama',
      excerpt: 'Personal Hukamnama excerpt',
      coverageTemplate: '{included} of {total} lines',
      readComplete: 'Read complete Hukamnama',
      openInNaamras: 'Open in NaamRas',
    },
    preparingBilingual: 'Preparing bilingual image…',
    bilingualReady: 'Bilingual image ready.',
    passageShareTitle: 'Hukamnama from NaamRas',
    shareImage: 'Share image',
    shareImages: count => `Share ${count} images`,
    saveImage: 'Download image',
    saveImages: count => `Download ${count} images`,
    copyText: 'Copy text',
    copyFullText: 'Copy full text',
    reflectionLabel: 'Personal reflection',
    imageTextAlternative: 'Text shown in the image',
    completeImageNote: 'The attached image contains the complete Hukamnama.',
    completeImageSetNote: count => `The ${count} attached images contain the complete Hukamnama in order.`,
    excerptImageNote: "The attached image contains an excerpt from today's Hukamnama.",
    personalExcerptImageNote: 'The attached image contains an excerpt from this personal Hukamnama.',
    readOnline: 'Read this exact passage on NaamRas',
    raagCredit: value => `Raag: ${value}`,
    writerCredit: value => `Writer: ${value}`,
    translationCredit: value => `Translation: ${value}`,
    previewSummary: (kind, layers) => `${kind === 'passage' ? 'Hukamnama image' : 'Gurbani card'} preview. Includes ${layers}`,
    supportCoverage: (available, total) => `${available} of ${total} lines available`,
    preparing: 'Preparing image…',
    preparingSet: 'Preparing one complete image…',
    ready: 'Image ready.',
    setReady: count => `${count} ordered images ready.`,
    shareTitle: 'A line from NaamRas',
    sharing: 'Opening share sheet…',
    downloading: 'Starting download…',
    copying: 'Copying full text…',
    shared: 'Shared successfully.',
    sharedFileOnly: 'Image shared. This app may not have included your reflection or source details — use Copy full text if you need to paste them too.',
    sharedFilesOnly: count => `${count} images shared. This app may not have included your reflection or source details — use Copy full text if you need to paste them too.`,
    cancelled: 'Sharing cancelled.',
    shareUnavailable: 'Native sharing is unavailable here. Download the image or copy the full text instead.',
    shareFailed: 'The share sheet could not open. Try again, download the image, or copy the full text.',
    shareTimedOut: 'The share sheet did not respond. You can try again, download the image, or copy the full text.',
    downloaded: 'Download started. Your browser will confirm where the image is stored.',
    downloadedSet: count => `${count} image downloads started in order. Your browser will confirm where they are stored.`,
    copied: 'Text copied.',
    renderError: 'The image could not be prepared. Retry without changing the Gurbani.',
    imageTooLong: support => support
      ? `This passage is too long for one readable image with ${support}. Turn off ${support}, or use Copy full text to share every line.`
      : 'This passage is too long for one readable image. Use Copy full text to share every line.',
    retry: 'Retry image',
    actionError: 'That action did not complete. Please try again.',
    characters: count => `${count} / ${SOCIAL_NOTE_LIMIT}`,
  },
  pa: {
    dialogTitle: 'ਝਲਕ ਸਾਂਝੀ ਕਰੋ',
    dialogDescription: 'ਕਲਾ ਅਤੇ ਪਾਠ ਸਹਾਇਤਾ ਚੁਣੋ, ਫਿਰ ਤਸਵੀਰ ਸਾਂਝੀ ਜਾਂ ਸੰਭਾਲੋ।',
    preface: 'ਯਾਦ ਲਈ ਇੱਕ ਪੰਕਤੀ ਸਾਂਝੀ ਕਰੋ',
    title: 'ਸਾਂਝੀ ਕਰਨ ਲਈ ਤਸਵੀਰ ਬਣਾਓ',
    close: 'ਸਾਂਝੀ ਤਸਵੀਰ ਬੰਦ ਕਰੋ',
    preview: 'ਸਾਂਝੀ ਤਸਵੀਰ ਦੀ ਝਲਕ',
    citation: 'ਹਵਾਲਾ',
    brand: 'ਬ੍ਰਾਂਡ',
    textLayers: 'ਕਾਰਡ ਉੱਤੇ ਲਿਖਤ',
    textLayersHelp: 'ਗੁਰਮੁਖੀ ਹਮੇਸ਼ਾ ਸ਼ਾਮਲ ਹੈ। ਹੇਠਾਂ ਪਾਠ ਸਹਾਇਤਾ ਜੋੜੋ।',
    gurmukhi: 'ਗੁਰਮੁਖੀ',
    alwaysIncluded: 'ਹਮੇਸ਼ਾ ਸ਼ਾਮਲ ਹੈ ਅਤੇ ਬਦਲੀ ਨਹੀਂ ਜਾ ਸਕਦੀ',
    transliteration: 'ਲਿਪੀਅੰਤਰਨ',
    meaning: 'ਅਰਥ',
    unavailable: 'ਇਸ ਚੋਣ ਲਈ ਉਪਲਬਧ ਨਹੀਂ',
    artwork: 'ਕਲਾ',
    artworkHelp: 'ਇੱਕ ਪਿਛੋਕੜ ਚੁਣੋ ਜਾਂ ਸਾਦਾ ਰੱਖੋ।',
    passageArtworkHelp: count => `${count} ਪਿਛੋਕੜਾਂ ਵਿੱਚੋਂ ਚੁਣੋ ਜਾਂ ਸਾਦਾ ਰੱਖੋ।`,
    noArtwork: 'ਕੋਈ ਕਲਾ ਨਹੀਂ',
    noArtworkDescription: 'ਤਸਵੀਰ ਤੋਂ ਬਿਨਾਂ ਸਾਦੀ ਪਾਠ ਸਤ੍ਹਾ।',
    selectedArtwork: 'ਚੁਣੀ ਕਲਾ',
    artworkAppliesToSet: count => `ਸਾਰੀਆਂ ${count} ਤਸਵੀਰਾਂ ਉੱਤੇ ਲਾਗੂ ਹੈ।`,
    applyingArtwork: name => `${name} ਨੂੰ ਪਾਠ ਦੇ ਪਿੱਛੇ ਲਗਾਇਆ ਜਾ ਰਿਹਾ ਹੈ…`,
    artworkReady: name => `${name} ਲਾਗੂ ਹੋ ਗਈ। ਤਸਵੀਰ ਤਿਆਰ ਹੈ।`,
    artworkSetReady: (name, count) => `${name} ਲਾਗੂ ਹੋ ਗਈ। ${count} ਕ੍ਰਮਵਾਰ ਤਸਵੀਰਾਂ ਤਿਆਰ ਹਨ।`,
    useNoArtwork: 'ਕੋਈ ਕਲਾ ਨਾ ਵਰਤੋ',
    textPosition: 'ਲਿਖਤ ਦੀ ਥਾਂ',
    textPositionHelp: 'ਆਟੋ ਕਲਾ ਵਿੱਚ ਸਭ ਤੋਂ ਸਾਫ਼ ਥਾਂ ਲੱਭਦਾ ਹੈ।',
    positionAuto: 'ਆਟੋ',
    positionTop: 'ਉੱਪਰ',
    positionMiddle: 'ਵਿਚਕਾਰ',
    positionBottom: 'ਹੇਠਾਂ',
    socialNote: 'ਸਾਂਝਾ ਨੋਟ (ਵਿਕਲਪਿਕ)',
    socialNoteHelp: 'ਤਸਵੀਰ ਨਾਲ ਸਾਂਝਾ ਹੁੰਦਾ ਹੈ, ਪਰ ਉਸ ਉੱਤੇ ਨਹੀਂ ਲਿਖਿਆ ਜਾਂਦਾ।',
    socialPlaceholder: 'ਛੋਟਾ ਵਿਚਾਰ ਲਿਖੋ…',
    selectedExcerpt: 'ਇਸ ਕਾਰਡ ਵਿੱਚ ਸਿਰਫ਼ ਤੁਹਾਡੇ ਚੁਣੇ ਗੁਰਮੁਖੀ ਸ਼ਬਦ ਹਨ।',
    passagePreface: 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ ਸਾਂਝਾ ਕਰੋ',
    personalPassagePreface: 'ਇਹ ਨਿੱਜੀ ਹੁਕਮਨਾਮਾ ਸਾਂਝਾ ਕਰੋ',
    passageTextLayersHelp: 'ਗੁਰਮੁਖੀ ਹਮੇਸ਼ਾ ਸ਼ਾਮਲ ਹੈ। ਹਰ ਪੰਕਤੀ ਹੇਠਾਂ ਅਰਥ ਜਾਂ ਉਚਾਰਨ ਜੋੜੋ।',
    passageComplete: 'ਪੂਰਾ ਹੁਕਮਨਾਮਾ',
    tallImageHint: 'ਇੱਕ ਲੰਮੀ ਤਸਵੀਰ ਵਿੱਚ ਹਰ ਪੰਕਤੀ ਪੜ੍ਹਨਯੋਗ ਰਹਿੰਦੀ ਹੈ। ਪੋਸਟ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਦੇਖੋ ਕਿ ਪੂਰੀ ਤਸਵੀਰ ਦਿਸ ਰਹੀ ਹੈ।',
    passageExcerpt: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਦਾ ਅੰਸ਼',
    personalPassageExcerpt: 'ਨਿੱਜੀ ਹੁਕਮਨਾਮੇ ਦਾ ਅੰਸ਼',
    passageImageCoverage: (included, total) => `${total} ਵਿੱਚੋਂ ${included} ਪੰਕਤੀਆਂ ਇਸ ਤਸਵੀਰ ਵਿੱਚ`,
    passageSetCoverage: (lines, images) => `${lines} ਪੰਕਤੀਆਂ ${images} ਤਸਵੀਰਾਂ ਵਿੱਚ`,
    passageImagePosition: (current, total) => `${total} ਵਿੱਚੋਂ ਤਸਵੀਰ ${current}`,
    passageFullTextFollows: 'ਪੂਰੇ ਹੁਕਮਨਾਮੇ ਦੀ ਲਿਖਤ ਹੇਠਾਂ ਹੈ।',
    changePassage: 'ਅੰਸ਼ ਬਦਲੋ',
    previousPassage: 'ਪਿਛਲੀ ਤਸਵੀਰ',
    nextPassage: 'ਅਗਲੀ ਤਸਵੀਰ',
    passageNavigationHelp: 'ਨਾਲ ਲੱਗਦਾ ਹੋਰ ਅੰਸ਼ ਚੁਣੋ। “ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ” ਵਿੱਚ ਹਮੇਸ਼ਾ ਪੂਰਾ ਹੁਕਮਨਾਮਾ ਹੁੰਦਾ ਹੈ।',
    passageSetNavigationHelp: count => `ਸਾਰੀਆਂ ${count} ਤਸਵੀਰਾਂ ਕ੍ਰਮ ਵਿੱਚ ਸਾਂਝੀਆਂ ਹੁੰਦੀਆਂ ਹਨ।`,
    storyScopeCopy: {
      complete: 'ਪੂਰਾ ਹੁਕਮਨਾਮਾ',
      excerpt: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਦਾ ਅੰਸ਼',
      coverageTemplate: '{total} ਵਿੱਚੋਂ {included} ਪੰਕਤੀਆਂ',
      readComplete: 'ਪੂਰਾ ਹੁਕਮਨਾਮਾ ਪੜ੍ਹੋ',
      openInNaamras: 'ਨਾਮਰਸ ਵਿੱਚ ਖੋਲ੍ਹੋ',
    },
    personalStoryScopeCopy: {
      complete: 'ਪੂਰਾ ਹੁਕਮਨਾਮਾ',
      excerpt: 'ਨਿੱਜੀ ਹੁਕਮਨਾਮੇ ਦਾ ਅੰਸ਼',
      coverageTemplate: '{total} ਵਿੱਚੋਂ {included} ਪੰਕਤੀਆਂ',
      readComplete: 'ਪੂਰਾ ਹੁਕਮਨਾਮਾ ਪੜ੍ਹੋ',
      openInNaamras: 'ਨਾਮਰਸ ਵਿੱਚ ਖੋਲ੍ਹੋ',
    },
    preparingBilingual: 'ਦੋ-ਭਾਸ਼ਾਈ ਤਸਵੀਰ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ…',
    bilingualReady: 'ਦੋ-ਭਾਸ਼ਾਈ ਤਸਵੀਰ ਤਿਆਰ ਹੈ।',
    passageShareTitle: 'ਨਾਮਰਸ ਤੋਂ ਹੁਕਮਨਾਮਾ',
    shareImage: 'ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ',
    shareImages: count => `${count} ਤਸਵੀਰਾਂ ਸਾਂਝੀਆਂ ਕਰੋ`,
    saveImage: 'ਤਸਵੀਰ ਡਾਊਨਲੋਡ ਕਰੋ',
    saveImages: count => `${count} ਤਸਵੀਰਾਂ ਡਾਊਨਲੋਡ ਕਰੋ`,
    copyText: 'ਲਿਖਤ ਕਾਪੀ ਕਰੋ',
    copyFullText: 'ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ',
    reflectionLabel: 'ਨਿੱਜੀ ਵਿਚਾਰ',
    imageTextAlternative: 'ਤਸਵੀਰ ਵਿੱਚ ਦਿਖਾਈ ਲਿਖਤ',
    completeImageNote: 'ਨੱਥੀ ਤਸਵੀਰ ਵਿੱਚ ਪੂਰਾ ਹੁਕਮਨਾਮਾ ਹੈ।',
    completeImageSetNote: count => `ਨੱਥੀਆਂ ${count} ਤਸਵੀਰਾਂ ਵਿੱਚ ਪੂਰਾ ਹੁਕਮਨਾਮਾ ਕ੍ਰਮ ਵਿੱਚ ਹੈ।`,
    excerptImageNote: 'ਨੱਥੀ ਤਸਵੀਰ ਵਿੱਚ ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਦਾ ਇੱਕ ਅੰਸ਼ ਹੈ।',
    personalExcerptImageNote: 'ਨੱਥੀ ਤਸਵੀਰ ਵਿੱਚ ਨਿੱਜੀ ਹੁਕਮਨਾਮੇ ਦਾ ਇੱਕ ਅੰਸ਼ ਹੈ।',
    readOnline: 'ਨਾਮਰਸ ਉੱਤੇ ਇਹੀ ਪਾਠ ਪੜ੍ਹੋ',
    raagCredit: value => `ਰਾਗ: ${value}`,
    writerCredit: value => `ਰਚਨਾਕਾਰ: ${value}`,
    translationCredit: value => `ਅਨੁਵਾਦ: ${value}`,
    previewSummary: (kind, layers) => `${kind === 'passage' ? 'ਹੁਕਮਨਾਮੇ ਦੀ ਤਸਵੀਰ' : 'ਗੁਰਬਾਣੀ ਕਾਰਡ'} ਦੀ ਝਲਕ। ਇਸ ਵਿੱਚ ${layers} ਸ਼ਾਮਲ ਹੈ`,
    supportCoverage: (available, total) => `${total} ਵਿੱਚੋਂ ${available} ਪੰਕਤੀਆਂ ਉਪਲਬਧ`,
    preparing: 'ਤਸਵੀਰ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ…',
    preparingSet: 'ਇੱਕ ਪੂਰੀ ਤਸਵੀਰ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ…',
    ready: 'ਤਸਵੀਰ ਤਿਆਰ ਹੈ।',
    setReady: count => `${count} ਕ੍ਰਮਵਾਰ ਤਸਵੀਰਾਂ ਤਿਆਰ ਹਨ।`,
    shareTitle: 'ਨਾਮਰਸ ਤੋਂ ਇੱਕ ਪੰਕਤੀ',
    sharing: 'ਸਾਂਝਾ ਪੰਨਾ ਖੁੱਲ੍ਹ ਰਿਹਾ ਹੈ…',
    downloading: 'ਡਾਊਨਲੋਡ ਸ਼ੁਰੂ ਹੋ ਰਿਹਾ ਹੈ…',
    copying: 'ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਹੋ ਰਹੀ ਹੈ…',
    shared: 'ਸਫਲਤਾਪੂਰਵਕ ਸਾਂਝਾ ਹੋ ਗਿਆ।',
    sharedFileOnly: 'ਤਸਵੀਰ ਸਾਂਝੀ ਹੋ ਗਈ। ਹੋ ਸਕਦਾ ਹੈ ਇਸ ਐਪ ਨੇ ਤੁਹਾਡਾ ਵਿਚਾਰ ਜਾਂ ਸਰੋਤ ਵੇਰਵੇ ਸ਼ਾਮਲ ਨਾ ਕੀਤੇ ਹੋਣ — ਉਹਨਾਂ ਨੂੰ ਵੀ ਪਾਉਣ ਲਈ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    sharedFilesOnly: count => `${count} ਤਸਵੀਰਾਂ ਸਾਂਝੀਆਂ ਹੋ ਗਈਆਂ। ਹੋ ਸਕਦਾ ਹੈ ਐਪ ਨੇ ਤੁਹਾਡਾ ਵਿਚਾਰ ਜਾਂ ਸਰੋਤ ਵੇਰਵੇ ਸ਼ਾਮਲ ਨਾ ਕੀਤੇ ਹੋਣ — ਉਹਨਾਂ ਲਈ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।`,
    cancelled: 'ਸਾਂਝਾ ਕਰਨਾ ਰੱਦ ਕੀਤਾ ਗਿਆ।',
    shareUnavailable: 'ਇੱਥੇ ਮੂਲ ਸਾਂਝਾ ਸਹੂਲਤ ਉਪਲਬਧ ਨਹੀਂ। ਤਸਵੀਰ ਡਾਊਨਲੋਡ ਕਰੋ ਜਾਂ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    shareFailed: 'ਸਾਂਝਾ ਪੰਨਾ ਨਹੀਂ ਖੁੱਲ੍ਹਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ, ਤਸਵੀਰ ਡਾਊਨਲੋਡ ਕਰੋ ਜਾਂ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    shareTimedOut: 'ਸਾਂਝਾ ਪੰਨੇ ਨੇ ਜਵਾਬ ਨਹੀਂ ਦਿੱਤਾ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ, ਤਸਵੀਰ ਡਾਊਨਲੋਡ ਕਰੋ ਜਾਂ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    downloaded: 'ਡਾਊਨਲੋਡ ਸ਼ੁਰੂ ਹੋ ਗਿਆ ਹੈ। ਤਸਵੀਰ ਕਿੱਥੇ ਸੰਭਾਲੀ ਗਈ ਹੈ, ਇਹ ਬ੍ਰਾਊਜ਼ਰ ਦੱਸੇਗਾ।',
    downloadedSet: count => `${count} ਤਸਵੀਰਾਂ ਦੇ ਡਾਊਨਲੋਡ ਕ੍ਰਮ ਵਿੱਚ ਸ਼ੁਰੂ ਹੋ ਗਏ ਹਨ। ਬ੍ਰਾਊਜ਼ਰ ਉਹਨਾਂ ਦੀ ਥਾਂ ਦੱਸੇਗਾ।`,
    copied: 'ਲਿਖਤ ਕਾਪੀ ਹੋ ਗਈ।',
    renderError: 'ਤਸਵੀਰ ਤਿਆਰ ਨਹੀਂ ਹੋ ਸਕੀ। ਗੁਰਬਾਣੀ ਬਦਲੇ ਬਿਨਾਂ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    imageTooLong: support => support
      ? `ਇਹ ਪਾਠ ${support} ਨਾਲ ਇੱਕ ਪੜ੍ਹਨਯੋਗ ਤਸਵੀਰ ਲਈ ਬਹੁਤ ਲੰਮਾ ਹੈ। ${support} ਬੰਦ ਕਰੋ ਜਾਂ ਹਰ ਪੰਕਤੀ ਸਾਂਝੀ ਕਰਨ ਲਈ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।`
      : 'ਇਹ ਪਾਠ ਇੱਕ ਪੜ੍ਹਨਯੋਗ ਤਸਵੀਰ ਲਈ ਬਹੁਤ ਲੰਮਾ ਹੈ। ਹਰ ਪੰਕਤੀ ਸਾਂਝੀ ਕਰਨ ਲਈ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    retry: 'ਤਸਵੀਰ ਦੁਬਾਰਾ ਬਣਾਓ',
    actionError: 'ਇਹ ਕਾਰਵਾਈ ਪੂਰੀ ਨਹੀਂ ਹੋਈ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    characters: count => `${count} / ${SOCIAL_NOTE_LIMIT}`,
  },
  hi: {
    dialogTitle: 'अंश साझा करें',
    dialogDescription: 'कला और पाठ सहायता चुनें, फिर छवि साझा या सेव करें।',
    preface: 'स्मरण के लिए एक पंक्ति साझा करें',
    title: 'साझा करने की छवि बनाएँ',
    close: 'साझा छवि बंद करें',
    preview: 'साझा छवि का पूर्वावलोकन',
    citation: 'संदर्भ',
    brand: 'ब्रांड',
    textLayers: 'कार्ड पर पाठ',
    textLayersHelp: 'गुरमुखी हमेशा शामिल है। नीचे पाठ सहायता जोड़ें।',
    gurmukhi: 'गुरमुखी',
    alwaysIncluded: 'हमेशा शामिल है और बदली नहीं जा सकती',
    transliteration: 'लिप्यंतरण',
    meaning: 'अर्थ',
    unavailable: 'इस चयन के लिए उपलब्ध नहीं',
    artwork: 'कलाकृति',
    artworkHelp: 'एक पृष्ठभूमि चुनें या सादा रखें।',
    passageArtworkHelp: count => `${count} पृष्ठभूमियों में से चुनें या सादा रखें।`,
    noArtwork: 'बिना कला',
    noArtworkDescription: 'बिना किसी चित्र के सादा पठन क्षेत्र।',
    selectedArtwork: 'चुनी गई कलाकृति',
    artworkAppliesToSet: count => `सभी ${count} छवियों पर लागू है।`,
    applyingArtwork: name => `${name} को पाठ के पीछे लगाया जा रहा है…`,
    artworkReady: name => `${name} लागू हो गई। छवि तैयार है।`,
    artworkSetReady: (name, count) => `${name} लागू हो गई। ${count} क्रमबद्ध छवियाँ तैयार हैं।`,
    useNoArtwork: 'कोई कला न रखें',
    textPosition: 'पाठ की जगह',
    textPositionHelp: 'ऑटो कलाकृति में सबसे साफ़ जगह ढूँढता है।',
    positionAuto: 'ऑटो',
    positionTop: 'ऊपर',
    positionMiddle: 'बीच',
    positionBottom: 'नीचे',
    socialNote: 'सोशल नोट (वैकल्पिक)',
    socialNoteHelp: 'छवि के साथ साझा होता है, लेकिन उस पर नहीं छपता।',
    socialPlaceholder: 'एक छोटा विचार लिखें…',
    selectedExcerpt: 'इस कार्ड में केवल आपके चुने हुए गुरमुखी शब्द हैं।',
    passagePreface: 'आज का हुकमनामा साझा करें',
    personalPassagePreface: 'यह व्यक्तिगत हुकमनामा साझा करें',
    passageTextLayersHelp: 'गुरमुखी हमेशा शामिल है। हर पंक्ति के नीचे अर्थ या उच्चारण जोड़ें।',
    passageComplete: 'पूरा हुकमनामा',
    tallImageHint: 'एक लंबी छवि में हर पंक्ति पढ़ने योग्य रहती है। पोस्ट करने से पहले देखें कि पूरी छवि दिखाई दे रही है।',
    passageExcerpt: 'आज के हुकमनामे का अंश',
    personalPassageExcerpt: 'व्यक्तिगत हुकमनामे का अंश',
    passageImageCoverage: (included, total) => `${total} में से ${included} पंक्तियाँ इस छवि में`,
    passageSetCoverage: (lines, images) => `${lines} पंक्तियाँ ${images} छवियों में`,
    passageImagePosition: (current, total) => `${total} में से छवि ${current}`,
    passageFullTextFollows: 'पूरा हुकमनामा पाठ नीचे है।',
    changePassage: 'अंश बदलें',
    previousPassage: 'पिछली छवि',
    nextPassage: 'अगली छवि',
    passageNavigationHelp: 'साथ वाला दूसरा अंश चुनें। “पूरा पाठ कॉपी करें” में हमेशा पूरा हुकमनामा होता है।',
    passageSetNavigationHelp: count => `सभी ${count} छवियाँ क्रम में साझा होती हैं।`,
    storyScopeCopy: {
      complete: 'पूरा हुकमनामा',
      excerpt: 'आज के हुकमनामे का अंश',
      coverageTemplate: '{total} में से {included} पंक्तियाँ',
      readComplete: 'पूरा हुकमनामा पढ़ें',
      openInNaamras: 'नामरस में खोलें',
    },
    personalStoryScopeCopy: {
      complete: 'पूरा हुकमनामा',
      excerpt: 'व्यक्तिगत हुकमनामे का अंश',
      coverageTemplate: '{total} में से {included} पंक्तियाँ',
      readComplete: 'पूरा हुकमनामा पढ़ें',
      openInNaamras: 'नामरस में खोलें',
    },
    preparingBilingual: 'द्विभाषी छवि तैयार हो रही है…',
    bilingualReady: 'द्विभाषी छवि तैयार है।',
    passageShareTitle: 'नामरस से हुकमनामा',
    shareImage: 'छवि साझा करें',
    shareImages: count => `${count} छवियाँ साझा करें`,
    saveImage: 'छवि डाउनलोड करें',
    saveImages: count => `${count} छवियाँ डाउनलोड करें`,
    copyText: 'पाठ कॉपी करें',
    copyFullText: 'पूरा पाठ कॉपी करें',
    reflectionLabel: 'व्यक्तिगत विचार',
    imageTextAlternative: 'छवि में दिखाया गया पाठ',
    completeImageNote: 'संलग्न छवि में पूरा हुकमनामा है।',
    completeImageSetNote: count => `संलग्न ${count} छवियों में पूरा हुकमनामा क्रम से है।`,
    excerptImageNote: 'संलग्न छवि में आज के हुकमनामे का एक अंश है।',
    personalExcerptImageNote: 'संलग्न छवि में व्यक्तिगत हुकमनामे का एक अंश है।',
    readOnline: 'नामरस पर यही पाठ पढ़ें',
    raagCredit: value => `राग: ${value}`,
    writerCredit: value => `रचनाकार: ${value}`,
    translationCredit: value => `अनुवाद: ${value}`,
    previewSummary: (kind, layers) => `${kind === 'passage' ? 'हुकमनामे की छवि' : 'गुरबाणी कार्ड'} का पूर्वावलोकन। इसमें ${layers} शामिल है`,
    supportCoverage: (available, total) => `${total} में से ${available} पंक्तियाँ उपलब्ध`,
    preparing: 'छवि तैयार हो रही है…',
    preparingSet: 'एक पूरी छवि तैयार हो रही है…',
    ready: 'छवि तैयार है।',
    setReady: count => `${count} क्रमबद्ध छवियाँ तैयार हैं।`,
    shareTitle: 'नामरस से एक पंक्ति',
    sharing: 'शेयर शीट खुल रही है…',
    downloading: 'डाउनलोड शुरू हो रहा है…',
    copying: 'पूरा पाठ कॉपी हो रहा है…',
    shared: 'सफलतापूर्वक साझा हो गया।',
    sharedFileOnly: 'छवि साझा हो गई। हो सकता है इस ऐप ने आपका विचार या स्रोत विवरण शामिल न किया हो — उन्हें भी जोड़ने के लिए पूरा पाठ कॉपी करें।',
    sharedFilesOnly: count => `${count} छवियाँ साझा हो गईं। हो सकता है ऐप ने आपका विचार या स्रोत विवरण शामिल न किया हो — उनके लिए पूरा पाठ कॉपी करें।`,
    cancelled: 'साझा करना रद्द किया गया।',
    shareUnavailable: 'यहाँ मूल शेयर सुविधा उपलब्ध नहीं है। छवि डाउनलोड करें या पूरा पाठ कॉपी करें।',
    shareFailed: 'शेयर शीट नहीं खुली। फिर कोशिश करें, छवि डाउनलोड करें या पूरा पाठ कॉपी करें।',
    shareTimedOut: 'शेयर शीट ने जवाब नहीं दिया। फिर कोशिश करें, छवि डाउनलोड करें या पूरा पाठ कॉपी करें।',
    downloaded: 'डाउनलोड शुरू हो गया है। छवि कहाँ रखी गई है, इसकी पुष्टि ब्राउज़र करेगा।',
    downloadedSet: count => `${count} छवियों के डाउनलोड क्रम से शुरू हो गए हैं। ब्राउज़र बताएगा कि वे कहाँ रखी गई हैं।`,
    copied: 'पाठ कॉपी हो गया।',
    renderError: 'छवि तैयार नहीं हो सकी। गुरबाणी बदले बिना फिर कोशिश करें।',
    imageTooLong: support => support
      ? `यह पाठ ${support} के साथ एक पठनीय छवि के लिए बहुत लंबा है। ${support} बंद करें या हर पंक्ति साझा करने के लिए पूरा पाठ कॉपी करें।`
      : 'यह पाठ एक पठनीय छवि के लिए बहुत लंबा है। हर पंक्ति साझा करने के लिए पूरा पाठ कॉपी करें।',
    retry: 'छवि फिर बनाएँ',
    actionError: 'यह कार्रवाई पूरी नहीं हुई। फिर से प्रयास करें।',
    characters: count => `${count} / ${SOCIAL_NOTE_LIMIT}`,
  },
}

function resolveInitialArtworkId(
  initialArtworkId: string | null | undefined,
  isPassage: boolean,
) {
  if (initialArtworkId === null) return NO_ARTWORK_ID
  const availableArtwork = isPassage
    ? shareHighlightHukamnamaAssets
    : shareHighlightAssets
  if (initialArtworkId && availableArtwork.some(asset => asset.id === initialArtworkId)) {
    return initialArtworkId
  }
  if (isPassage) {
    if (initialArtworkId === undefined && typeof window !== 'undefined') {
      try {
        const savedId = window.localStorage.getItem(HUKAMNAMA_ARTWORK_PREFERENCE_KEY)
        if (savedId && (savedId === NO_ARTWORK_ID || availableArtwork.some(asset => asset.id === savedId))) {
          return savedId
        }
      } catch {
        // Private/embedded browsers may deny storage. Sharing still works.
      }
    }
    return availableArtwork.find(asset => asset.id === DEFAULT_HUKAMNAMA_ARTWORK_ID)?.id
      ?? availableArtwork[0]?.id
      ?? NO_ARTWORK_ID
  }
  return availableArtwork[0]?.id ?? NO_ARTWORK_ID
}

class ShareHighlightActionTimeoutError extends Error {
  constructor() {
    super('The native share action did not settle in time.')
    this.name = 'ShareHighlightActionTimeoutError'
  }
}

class ShareHighlightActionDismissedError extends Error {
  constructor() {
    super('The share composer closed before the native share action settled.')
    this.name = 'ShareHighlightActionDismissedError'
  }
}

function withActionTimeout<T>(promise: Promise<T>, timeoutMs = SHARE_ACTION_TIMEOUT_MS) {
  let settled = false
  let timeoutId: number | null = null
  let rejectAction: ((reason?: unknown) => void) | null = null

  const clearActionTimeout = () => {
    if (timeoutId !== null) window.clearTimeout(timeoutId)
    timeoutId = null
  }

  const timedPromise = new Promise<T>((resolve, reject) => {
    rejectAction = reject
    if (timeoutMs > 0) timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      timeoutId = null
      reject(new ShareHighlightActionTimeoutError())
    }, timeoutMs)

    void promise.then(
      value => {
        if (settled) return
        settled = true
        clearActionTimeout()
        resolve(value)
      },
      error => {
        if (settled) return
        settled = true
        clearActionTimeout()
        reject(error)
      }
    )
  })

  return {
    promise: timedPromise,
    cancel: () => {
      if (settled) return
      settled = true
      clearActionTimeout()
      rejectAction?.(new ShareHighlightActionDismissedError())
    },
  }
}

function getProvenanceLines(content: ShareHighlightContent, copy: ShareHighlightSheetCopy) {
  return [
    content.provenance?.ceremonyLocation?.trim(),
    content.provenance?.raag?.trim()
      ? copy.raagCredit(content.provenance.raag.trim())
      : '',
    content.provenance?.writer?.trim()
      ? copy.writerCredit(content.provenance.writer.trim())
      : '',
    content.provenance?.translationLabel?.trim()
      ? copy.translationCredit(content.provenance.translationLabel.trim())
      : '',
  ].filter(Boolean)
}

function getPassagePresentationCopy(
  content: ShareHighlightContent,
  copy: ShareHighlightSheetCopy,
) {
  const isPersonal = content.passageKind === 'personal-hukamnama'
  return {
    preface: isPersonal ? copy.personalPassagePreface : copy.passagePreface,
    excerpt: isPersonal ? copy.personalPassageExcerpt : copy.passageExcerpt,
    excerptImageNote: isPersonal ? copy.personalExcerptImageNote : copy.excerptImageNote,
    storyScopeCopy: isPersonal ? copy.personalStoryScopeCopy : copy.storyScopeCopy,
  }
}

function getPassageStatusLines(
  selection: ShareHighlightStorySelection,
  content: ShareHighlightContent,
  copy: ShareHighlightSheetCopy,
) {
  const passageCopy = getPassagePresentationCopy(content, copy)
  return [
    selection.mode === 'complete' ? copy.passageComplete : passageCopy.excerpt,
    copy.passageImageCoverage(selection.includedLineCount, selection.totalLineCount),
  ]
}

function getPassageSetStatusLines(
  lineCount: number,
  imageCount: number,
  copy: ShareHighlightSheetCopy,
) {
  return [
    copy.passageComplete,
    copy.passageSetCoverage(lineCount, imageCount),
  ]
}

function getPassageImageLines(
  content: ShareHighlightContent,
  selection?: ShareHighlightStorySelection | null,
) {
  const sourceLines = content.passageLines?.filter(line => line.gurmukhi.trim()) ?? []
  if (!selection) return sourceLines
  const includedIds = new Set(selection.includedSourceLineIds)
  return sourceLines.filter(line => includedIds.has(line.id))
}

function buildCopiedText(
  content: ShareHighlightContent,
  showTransliteration: boolean,
  showMeaning: boolean,
  socialNote: string,
  sourceUrl: string,
  copy: ShareHighlightSheetCopy,
  passageSelection?: ShareHighlightStorySelection | null,
  passagePageCount = 1,
) {
  const passageText = content.passageLines?.length
    ? content.passageLines.flatMap(line => [
        line.gurmukhi.trim(),
        showTransliteration ? line.transliteration?.trim() : '',
        showMeaning ? line.meaning?.trim() : '',
      ].filter(Boolean)).join('\n')
    : ''

  return [
    socialNote.trim() ? `${copy.reflectionLabel}:\n${socialNote.trim()}\n——` : '',
    content.seriesLabel?.trim(),
    content.dateLabel?.trim(),
    passageSelection
      ? passagePageCount > 1
        ? getPassageSetStatusLines(
            passageSelection.totalLineCount,
            passagePageCount,
            copy,
          ).join(' · ')
        : getPassageStatusLines(passageSelection, content, copy).join(' · ')
      : '',
    passageSelection?.mode === 'excerpt' && passagePageCount === 1
      ? copy.passageFullTextFollows
      : '',
    passageText || content.gurmukhi.trim(),
    passageText ? '' : (showTransliteration ? content.transliteration?.trim() : ''),
    passageText ? '' : (showMeaning ? content.meaning?.trim() : ''),
    `— ${content.sourceLabel.trim()}`,
    ...getProvenanceLines(content, copy),
    `${copy.readOnline}: ${sourceUrl}`,
  ].filter(Boolean).join('\n')
}

function buildShareCompanionText(
  content: ShareHighlightContent,
  socialNote: string,
  sourceUrl: string,
  copy: ShareHighlightSheetCopy,
  passageSelection?: ShareHighlightStorySelection | null,
  passagePageCount = 1,
) {
  const sharesCompleteSet = Boolean(passageSelection && passagePageCount > 1)
  const lines = (content.passageLines?.length
    ? getPassageImageLines(
        content,
        sharesCompleteSet ? null : passageSelection,
      ).map(line => line.gurmukhi)
    : content.gurmukhi.split('\n'))
    .map(line => line.trim())
    .filter(Boolean)
  const excerpt = lines.slice(0, 2).join('\n')
  const hasMore = lines.length > 2

  return [
    socialNote.trim() ? `${copy.reflectionLabel}:\n${socialNote.trim()}\n——` : '',
    content.seriesLabel?.trim(),
    content.dateLabel?.trim(),
    passageSelection
      ? sharesCompleteSet
        ? getPassageSetStatusLines(
            passageSelection.totalLineCount,
            passagePageCount,
            copy,
          ).join(' · ')
        : getPassageStatusLines(passageSelection, content, copy).join(' · ')
      : '',
    excerpt ? `${excerpt}${hasMore ? '\n…' : ''}` : '',
    passageSelection
      ? sharesCompleteSet
        ? copy.completeImageSetNote(passagePageCount)
        : passageSelection.mode === 'complete'
        ? copy.completeImageNote
        : getPassagePresentationCopy(content, copy).excerptImageNote
      : '',
    `— ${content.sourceLabel.trim()}`,
    ...getProvenanceLines(content, copy),
    `${copy.readOnline}: ${sourceUrl}`,
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
  const nativeImagePlatform = isNativeImagePlatform()
  const nativeSaveCopy = NATIVE_SAVE_COPY[locale]
  const passageCopy = getPassagePresentationCopy(content, copy)
  const meaningLanguage = content.provenance?.translationLanguage === 'pa'
    ? 'pa-Guru'
    : content.provenance?.translationLanguage === 'hi'
      ? 'hi'
      : 'en'
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const noArtworkInputRef = useRef<HTMLInputElement | null>(null)
  const renderSequenceRef = useRef(0)
  const renderQueueRef = useRef<Promise<void>>(Promise.resolve())
  const renderAbortControllerRef = useRef<AbortController | null>(null)
  const busyActionRef = useRef<'share' | 'save' | 'copy' | null>(null)
  const shareActionCancelRef = useRef<(() => void) | null>(null)
  const shareActionAbortControllerRef = useRef<AbortController | null>(null)
  const shareActionGenerationRef = useRef(0)
  const cancelPendingDelivery = useCallback(() => {
    shareActionGenerationRef.current += 1
    shareActionAbortControllerRef.current?.abort()
    shareActionAbortControllerRef.current = null
    shareActionCancelRef.current?.()
    shareActionCancelRef.current = null
  }, [])
  const artworkGroupId = useId()
  const artworkHelpId = useId()
  const selectedArtworkLabelId = useId()
  const positionGroupId = useId()
  const captionId = useId()
  const captionHelpId = useId()
  const captionCountId = useId()
  const previewDescriptionId = useId()
  const previewTextAlternativeId = useId()
  const sourceUrl = useMemo(
    () => {
      const exactSourceUrl = getCanonicalSourceUrl(content.sourcePath)
      const compactSourceUrl = content.sharePath?.trim()
        ? getCanonicalSourceUrl(content.sharePath)
        : exactSourceUrl
      return content.passageLines?.length && content.provenance?.dateIso
        ? getHukamnamaShareUrl(content.provenance.dateIso) ?? exactSourceUrl
        : compactSourceUrl
    },
    [
      content.passageLines?.length,
      content.provenance?.dateIso,
      content.sharePath,
      content.sourcePath,
    ],
  )
  const passageLines = useMemo(
    () => content.passageLines?.filter(line => line.gurmukhi.trim()) ?? [],
    [content.passageLines]
  )
  const isPassage = passageLines.length > 0
  const passageSupportLines = passageLines.filter(line => !line.isHeader)
  const passageSupportLineCount = passageSupportLines.length
  const passageTransliterationCount = passageSupportLines.filter(line => Boolean(line.transliteration?.trim())).length
  const passageMeaningCount = passageSupportLines.filter(line => Boolean(line.meaning?.trim())).length
  const hasCompletePassageTransliteration = (
    passageSupportLineCount > 0
    && passageTransliterationCount === passageSupportLineCount
  )
  const hasCompletePassageMeaning = (
    passageSupportLineCount > 0
    && passageMeaningCount === passageSupportLineCount
  )
  const initiallyShowPassageMeaning = (
    hasCompletePassageMeaning
    && !content.selectedExcerpt
    && Boolean(content.initialShowMeaning)
  )
  const initiallyShowPassageTransliteration = (
    hasCompletePassageTransliteration
    && !content.selectedExcerpt
    && !initiallyShowPassageMeaning
    && Boolean(content.initialShowTransliteration)
  )
  const availableArtwork = isPassage
    ? shareHighlightHukamnamaAssets
    : shareHighlightAssets
  const [selectedArtworkId, setSelectedArtworkId] = useState(() => (
    resolveInitialArtworkId(initialArtworkId, isPassage)
  ))
  const [textPosition, setTextPosition] = useState<ShareHighlightTextPosition>('auto')
  const [showTransliteration, setShowTransliteration] = useState(() => (
    isPassage
      ? initiallyShowPassageTransliteration
      : Boolean(content.transliteration?.trim())
        && !content.selectedExcerpt
        && (content.initialShowTransliteration ?? true)
  ))
  const [showMeaning, setShowMeaning] = useState(() => (
    isPassage
      ? initiallyShowPassageMeaning
      : Boolean(content.meaning?.trim())
        && !content.selectedExcerpt
        && (content.initialShowMeaning ?? true)
  ))
  const [socialNote, setSocialNote] = useState(() => (content.caption ?? '').slice(0, SOCIAL_NOTE_LIMIT))
  const [pngExport, setPngExport] = useState<ShareHighlightPngExport | ShareHighlightStoryPngExport | null>(null)
  const [passagePngSet, setPassagePngSet] = useState<ShareHighlightStoryPngSet | null>(null)
  const [paintedPngExport, setPaintedPngExport] = useState<
    ShareHighlightPngExport | ShareHighlightStoryPngSet['pages'][number] | null
  >(null)
  const [pendingPreview, setPendingPreview] = useState<{
    renderSequence: number
    signal: AbortSignal
    readyStatus: string
  } | null>(null)
  const [activePassagePageIndex, setActivePassagePageIndex] = useState(0)
  const [renderStatus, setRenderStatus] = useState(copy.preparing)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [renderFailed, setRenderFailed] = useState(false)
  const [renderTooLong, setRenderTooLong] = useState(false)
  const [rendering, setRendering] = useState(true)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const [busyAction, setBusyAction] = useState<'share' | 'save' | 'copy' | null>(null)
  const [renderRetryNonce, setRenderRetryNonce] = useState(0)

  const hasTransliteration = (
    isPassage
      ? hasCompletePassageTransliteration
      : Boolean(content.transliteration?.trim())
  ) && !content.selectedExcerpt
  const hasMeaning = (
    isPassage
      ? hasCompletePassageMeaning
      : Boolean(content.meaning?.trim())
  ) && !content.selectedExcerpt
  const selectedArtwork = useMemo(() => (
    selectedArtworkId === NO_ARTWORK_ID
      ? null
      : availableArtwork.find(asset => asset.id === selectedArtworkId) ?? null
  ), [availableArtwork, selectedArtworkId])
  const selectedArtworkName = selectedArtwork?.displayName[locale] ?? copy.noArtwork
  const selectedArtworkDescription = selectedArtwork?.localizedDescription[locale]
    ?? copy.noArtworkDescription

  useEffect(() => {
    if (open) return
    renderAbortControllerRef.current?.abort()
    renderAbortControllerRef.current = null
    cancelPendingDelivery()
    busyActionRef.current = null
    setBusyAction(null)
  }, [open, cancelPendingDelivery])

  useEffect(() => () => {
    renderAbortControllerRef.current?.abort()
    renderAbortControllerRef.current = null
    cancelPendingDelivery()
  }, [cancelPendingDelivery])

  useEffect(() => {
    if (!open) return
    cancelPendingDelivery()
    setSelectedArtworkId(resolveInitialArtworkId(initialArtworkId, isPassage))
    setTextPosition('auto')
    setShowTransliteration(
      isPassage
        ? initiallyShowPassageTransliteration
        : Boolean(content.transliteration?.trim())
          && !content.selectedExcerpt
          && (content.initialShowTransliteration ?? true)
    )
    setShowMeaning(
      isPassage
        ? initiallyShowPassageMeaning
        : Boolean(content.meaning?.trim())
          && !content.selectedExcerpt
          && (content.initialShowMeaning ?? true)
    )
    setSocialNote((content.caption ?? '').slice(0, SOCIAL_NOTE_LIMIT))
    busyActionRef.current = null
    setBusyAction(null)
    setPngExport(null)
    setPassagePngSet(null)
    setPaintedPngExport(null)
    setPendingPreview(null)
    setActivePassagePageIndex(0)
    setRenderFailed(false)
    setRenderTooLong(false)
    setRendering(true)
    setRenderRetryNonce(0)
    setRenderStatus(copy.preparing)
    setActionStatus(null)
  }, [
    content.caption,
    content.gurmukhi,
    content.initialShowMeaning,
    content.initialShowTransliteration,
    content.meaning,
    content.passageKind,
    content.passageLines,
    content.provenance?.dateIso,
    content.provenance?.translationLanguage,
    content.provenance?.translationLabel,
    content.seriesLabel,
    content.sharePath,
    content.sourcePath,
    content.dateLabel,
    content.selectedExcerpt,
    content.sourceLabel,
    content.transliteration,
    content.verseId,
    initialArtworkId,
    initiallyShowPassageMeaning,
    initiallyShowPassageTransliteration,
    isPassage,
    open,
    copy.preparing,
    cancelPendingDelivery,
    locale,
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
          transliteration: showTransliteration && !showMeaning ? line.transliteration : null,
          meaning: showMeaning ? line.meaning : null,
        })),
        sourceLabel: content.sourceLabel,
        seriesLabel: content.seriesLabel?.trim() || 'Hukamnama',
        dateLabel: content.dateLabel?.trim() || null,
        shareUrl: sourceUrl,
        supportLabel: showMeaning
          ? content.provenance?.translationLabel?.trim() || null
          : showTransliteration
            ? copy.transliteration
            : null,
        scopeCopy: passageCopy.storyScopeCopy,
        anchorLineId: null,
      },
      fileNameBase: content.provenance?.dateIso?.trim()
        ? `naamras-hukamnama-${content.provenance.dateIso.trim()}`
        : 'naamras-hukamnama',
    }
  }, [
    content.dateLabel,
    content.provenance?.dateIso,
    content.provenance?.translationLabel,
    content.seriesLabel,
    content.sourceLabel,
    isPassage,
    passageLines,
    copy.transliteration,
    passageCopy.storyScopeCopy,
    selectedArtwork,
    showMeaning,
    showTransliteration,
    sourceUrl,
  ])
  const activePassageSupport = showMeaning
    ? 'meaning'
    : showTransliteration
      ? 'transliteration'
      : null
  const imageTooLongMessage = copy.imageTooLong(activePassageSupport === 'meaning'
    ? copy.meaning
    : activePassageSupport === 'transliteration'
      ? copy.transliteration
      : undefined)

  useEffect(() => {
    if (!open || !canvasElement) return

    const renderSequence = ++renderSequenceRef.current
    renderAbortControllerRef.current?.abort()
    const renderAbortController = new AbortController()
    renderAbortControllerRef.current = renderAbortController
    setRenderFailed(false)
    setRenderTooLong(false)
    setRendering(true)
    setActionStatus(null)
    setRenderStatus(
      passageInput && selectedArtwork
        ? copy.applyingArtwork(selectedArtworkName)
        : passageInput
          ? copy.preparingSet
          : copy.preparing,
    )

    const renderTimeout = window.setTimeout(() => {
      const runQueuedRender = async () => {
        if (renderSequenceRef.current !== renderSequence) return

        try {
          const result = await (passageInput
            ? exportShareHighlightHukamnamaPng(passageInput, {
                signal: renderAbortController.signal,
              }).then(passageSet => ({
                primary: passageSet.pages[0]!,
                passageSet,
              }))
            : exportShareHighlightPng(cardInput, {
                signal: renderAbortController.signal,
              }).then(primary => ({
                primary,
                passageSet: null,
              })))

          if (renderSequenceRef.current !== renderSequence) return
          if (renderAbortControllerRef.current === renderAbortController) {
            renderAbortControllerRef.current = null
          }
          setPendingPreview({
            renderSequence,
            signal: renderAbortController.signal,
            readyStatus: result.passageSet && result.passageSet.pages.length > 1
              ? selectedArtwork
                ? copy.artworkSetReady(selectedArtworkName, result.passageSet.pages.length)
                : copy.setReady(result.passageSet.pages.length)
              : passageInput && selectedArtwork
                ? copy.artworkReady(selectedArtworkName)
                : passageInput && activePassageSupport === 'meaning'
                  ? copy.bilingualReady
                  : copy.ready,
          })
          if (result.passageSet) {
            setPngExport(null)
            setPassagePngSet(result.passageSet)
          } else {
            setPngExport(result.primary)
            setPassagePngSet(null)
          }
          setActivePassagePageIndex(current => (
            result.passageSet
              ? Math.min(current, Math.max(0, result.passageSet.pages.length - 1))
              : 0
          ))
        } catch (error) {
          if (renderSequenceRef.current !== renderSequence) return
          if (renderAbortController.signal.aborted) return
          if (renderAbortControllerRef.current === renderAbortController) {
            renderAbortControllerRef.current = null
          }
          setRenderFailed(true)
          const tooLong = error instanceof HukamnamaImageTooLongError
          setRenderTooLong(tooLong)
          setRendering(false)
          setRenderStatus(tooLong ? imageTooLongMessage : copy.renderError)
        }
      }

      renderQueueRef.current = renderQueueRef.current.then(
        runQueuedRender,
        runQueuedRender,
      )
    }, RENDER_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(renderTimeout)
      renderAbortController.abort()
      if (renderAbortControllerRef.current === renderAbortController) {
        renderAbortControllerRef.current = null
      }
      if (renderSequenceRef.current === renderSequence) renderSequenceRef.current += 1
    }
  }, [
    activePassageSupport,
    canvasElement,
    cardInput,
    copy,
    imageTooLongMessage,
    open,
    passageInput,
    renderRetryNonce,
    selectedArtwork,
    selectedArtworkName,
  ])

  const passagePages = passagePngSet?.pages ?? []
  const passagePageCount = passagePages.length
  const safeActivePassagePageIndex = passagePageCount > 0
    ? Math.min(activePassagePageIndex, passagePageCount - 1)
    : 0
  const passageExport = isPassage
    ? passagePages[safeActivePassagePageIndex] ?? null
    : null
  const displayedPngExport = passageExport ?? pngExport
  const passageSelection = passageExport?.selection ?? null
  const sharesCompletePassageSet = passagePageCount > 1

  useEffect(() => {
    if (!open || !canvasElement || !displayedPngExport || !pendingPreview) return
    let cancelled = false
    const isCurrent = () => !cancelled
      && !pendingPreview.signal.aborted
      && renderSequenceRef.current === pendingPreview.renderSequence
    if (!isCurrent()) return

    const failPreview = () => {
      if (!isCurrent()) return
      setRenderFailed(true)
      setRendering(false)
      setRenderStatus(copy.renderError)
    }
    const drawPreview = (source: CanvasImageSource) => {
      if (!isCurrent()) return
      try {
        const context = canvasElement.getContext('2d')
        if (!context) throw new Error('The image preview canvas is unavailable.')
        if (source !== canvasElement) {
          // Keep the prior preview intact while decoding. Resize only when the
          // replacement is ready to paint, including a taller complete image.
          if (canvasElement.width !== displayedPngExport.width) canvasElement.width = displayedPngExport.width
          if (canvasElement.height !== displayedPngExport.height) canvasElement.height = displayedPngExport.height
          context.clearRect(0, 0, canvasElement.width, canvasElement.height)
          context.drawImage(source, 0, 0, canvasElement.width, canvasElement.height)
        }
        setPaintedPngExport(displayedPngExport)
        setRenderFailed(false)
        setRendering(false)
        setRenderStatus(pendingPreview.readyStatus)
      } catch {
        failPreview()
      }
    }

    let disposeImage = () => {}
    try {
      if ('canvas' in displayedPngExport) {
        drawPreview(displayedPngExport.canvas)
        return
      }

      const image = new Image()
      const objectUrl = URL.createObjectURL(displayedPngExport.blob)
      let disposed = false
      const timeout = window.setTimeout(() => {
        failPreview()
        disposeImage()
      }, PREVIEW_DECODE_TIMEOUT_MS)
      disposeImage = () => {
        if (disposed) return
        disposed = true
        window.clearTimeout(timeout)
        pendingPreview.signal.removeEventListener('abort', disposeImage)
        image.onload = null
        image.onerror = null
        image.src = ''
        URL.revokeObjectURL(objectUrl)
      }
      image.decoding = 'async'
      image.onload = () => {
        drawPreview(image)
        disposeImage()
      }
      image.onerror = () => {
        failPreview()
        disposeImage()
      }
      pendingPreview.signal.addEventListener('abort', disposeImage, { once: true })
      image.src = objectUrl
    } catch {
      failPreview()
      disposeImage()
    }

    return () => {
      cancelled = true
      disposeImage()
    }
  }, [canvasElement, copy.renderError, displayedPngExport, open, pendingPreview])

  const imagePassageLines = isPassage
    ? getPassageImageLines(content, passageSelection)
    : []
  const passageStatusTitle = sharesCompletePassageSet
    ? copy.passageComplete
    : passageSelection?.mode === 'complete'
    ? copy.passageComplete
    : passageSelection?.mode === 'excerpt'
      ? passageCopy.excerpt
      : null
  const passageCoverage = passageSelection
    ? [
        sharesCompletePassageSet
          ? copy.passageImagePosition(safeActivePassagePageIndex + 1, passagePageCount)
          : '',
        copy.passageImageCoverage(
          passageSelection.includedLineCount,
          passageSelection.totalLineCount,
        ),
      ].filter(Boolean).join(' · ')
    : null

  const announce = (message: string) => {
    setActionStatus(message)
    onNotice?.(message)
  }

  const beginAction = (action: 'share' | 'save' | 'copy', message: string) => {
    if (busyActionRef.current) return false
    busyActionRef.current = action
    setBusyAction(action)
    setActionStatus(message)
    return true
  }

  const finishAction = (action: 'share' | 'save' | 'copy') => {
    if (busyActionRef.current !== action) return
    busyActionRef.current = null
    setBusyAction(null)
  }

  const handleShare = async () => {
    if (rendering || renderFailed || paintedPngExport !== displayedPngExport) return
    const files = passagePngSet?.files ?? (displayedPngExport ? [displayedPngExport.file] : [])
    if (files.length === 0 || !beginAction('share', copy.sharing)) return
    const actionGeneration = ++shareActionGenerationRef.current
    const abortController = new AbortController()
    shareActionAbortControllerRef.current = abortController
    const shareOptions = {
      title: isPassage ? copy.passageShareTitle : copy.shareTitle,
      text: buildShareCompanionText(
        content,
        socialNote,
        sourceUrl,
        copy,
        passageSelection,
        passagePageCount,
      ),
      url: sourceUrl,
      signal: abortController.signal,
    }
    const timedAction = withActionTimeout(files.length > 1
      ? shareHighlightFiles(files, shareOptions)
      : shareHighlightFile(files[0]!, shareOptions), nativeImagePlatform ? 0 : SHARE_ACTION_TIMEOUT_MS)
    shareActionCancelRef.current = timedAction.cancel
    try {
      const result = await timedAction.promise
      if (shareActionGenerationRef.current !== actionGeneration) return
      if (result.status === 'shared') {
        announce(result.payload === 'file-only'
          ? files.length > 1
            ? copy.sharedFilesOnly(files.length)
            : copy.sharedFileOnly
          : copy.shared)
      }
      if (result.status === 'cancelled') announce(copy.cancelled)
      if (result.status === 'unsupported') announce(copy.shareUnavailable)
      if (result.status === 'failed') announce(copy.shareFailed)
    } catch (error) {
      if (
        shareActionGenerationRef.current !== actionGeneration
        || error instanceof ShareHighlightActionDismissedError
      ) return
      announce(error instanceof ShareHighlightActionTimeoutError
        ? copy.shareTimedOut
        : copy.shareFailed)
    } finally {
      if (shareActionGenerationRef.current === actionGeneration) {
        shareActionCancelRef.current = null
        shareActionAbortControllerRef.current = null
        finishAction('share')
      }
    }
  }

  const handleSave = async () => {
    if (rendering || renderFailed || paintedPngExport !== displayedPngExport) return
    const files = passagePngSet?.files ?? (displayedPngExport ? [displayedPngExport.file] : [])
    if (files.length === 0 || !beginAction('save', nativeImagePlatform ? nativeSaveCopy.saving : copy.downloading)) return
    const actionGeneration = ++shareActionGenerationRef.current
    const abortController = new AbortController()
    shareActionAbortControllerRef.current = abortController
    try {
      if (nativeImagePlatform) {
        await saveNativeHighlightFiles(files, { signal: abortController.signal })
        if (shareActionGenerationRef.current === actionGeneration) announce(nativeSaveCopy.saved)
      } else if (files.length > 1) {
        downloadShareHighlightFiles(files)
        announce(copy.downloadedSet(files.length))
      } else {
        downloadShareHighlightFile(files[0]!)
        announce(copy.downloaded)
      }
    } catch (error) {
      if (shareActionGenerationRef.current === actionGeneration) {
        const permissionDenied = error && typeof error === 'object'
          && 'code' in error && error.code === 'PHOTO_PERMISSION'
        announce(nativeImagePlatform
          ? permissionDenied ? nativeSaveCopy.permissionFailed : nativeSaveCopy.failed
          : copy.actionError)
      }
    } finally {
      if (shareActionGenerationRef.current === actionGeneration) {
        shareActionAbortControllerRef.current = null
        finishAction('save')
      }
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

  const handleArtworkChange = (artworkId: string) => {
    if (artworkId === selectedArtworkId) return
    setRendering(true)
    setSelectedArtworkId(artworkId)
    if (isPassage) {
      try {
        // Remember only the artwork choice, never the scripture or reflection.
        window.localStorage.setItem(HUKAMNAMA_ARTWORK_PREFERENCE_KEY, artworkId)
      } catch {
        // A storage failure must not interrupt selection or image export.
      }
    }
    if (artworkId === NO_ARTWORK_ID) setTextPosition('auto')
  }

  const handleUseNoArtwork = () => {
    handleArtworkChange(NO_ARTWORK_ID)
    window.requestAnimationFrame(() => {
      if (noArtworkInputRef.current?.isConnected) noArtworkInputRef.current.focus()
    })
  }

  const handlePassageNavigation = (offset: -1 | 1) => {
    if (rendering || passagePageCount <= 1) return
    setActionStatus(null)
    setRendering(true)
    setRenderStatus(copy.preparing)
    setActivePassagePageIndex(current => Math.min(
      passagePageCount - 1,
      Math.max(0, current + offset),
    ))
  }

  const handleCopy = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    const returnFocusTarget = event.currentTarget
    if (!beginAction('copy', copy.copying)) return
    try {
      await copyShareHighlightText(buildCopiedText(
        content,
        isPassage ? passageTransliterationCount > 0 : showTransliteration,
        isPassage ? passageMeaningCount > 0 : showMeaning,
        socialNote,
        sourceUrl,
        copy,
        passageSelection,
        passagePageCount,
      ), { focusTarget: returnFocusTarget })
      announce(copy.copied)
    } catch {
      announce(copy.actionError)
    } finally {
      finishAction('copy')
      window.requestAnimationFrame(() => {
        if (returnFocusTarget.isConnected) focusElementWithoutAppScroll(returnFocusTarget)
      })
    }
  }

  const visibleLayers = [
    copy.gurmukhi,
    showTransliteration ? copy.transliteration : '',
    showMeaning ? copy.meaning : '',
  ].filter(Boolean).join(', ')
  const status = actionStatus ?? renderStatus
  const previewSupportingDescription = [
    copy.previewSummary(isPassage ? 'passage' : 'line', visibleLayers),
    isPassage ? `${copy.artwork}: ${selectedArtworkName}` : '',
    passageStatusTitle,
    passageCoverage,
    content.dateLabel,
    content.sourceLabel,
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
          {!isPassage ? <p className="share-highlight__preface">{copy.preface}</p> : null}
          <h2 className="share-highlight__title">{isPassage ? passageCopy.preface : copy.title}</h2>
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
              aria-busy={rendering}
              style={isPassage ? { aspectRatio: `1080 / ${paintedPngExport?.height ?? SHARE_HIGHLIGHT_STORY_HEIGHT}` } : undefined}
            >
              <canvas
                ref={setCanvasElement}
                role="img"
                aria-label={copy.preview}
                aria-describedby={previewDescriptionId}
                width={1080}
                height={isPassage ? SHARE_HIGHLIGHT_STORY_HEIGHT : SHARE_HIGHLIGHT_CARD_HEIGHT}
              />
              {!displayedPngExport ? (
                <div
                  className={`share-highlight__preview-pending${renderFailed ? ' share-highlight__preview-pending--error' : ''}`}
                  aria-hidden={renderFailed ? undefined : 'true'}
                >
                  <span>{status}</span>
                  {renderFailed && !renderTooLong ? (
                    <div className="share-highlight__preview-recovery-actions">
                      <button
                        type="button"
                        className="share-highlight__retry"
                        onClick={() => setRenderRetryNonce(value => value + 1)}
                      >
                        {copy.retry}
                      </button>
                      {selectedArtwork ? (
                        <button
                          type="button"
                          className="share-highlight__retry"
                          onClick={handleUseNoArtwork}
                        >
                          {copy.useNoArtwork}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {passageSelection ? (
              <section
                className={`share-highlight__passage-status share-highlight__passage-status--${passageSelection.mode}`}
              >
                <div
                  className="share-highlight__passage-status-copy"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <strong>{passageStatusTitle}</strong>
                  <span>{passageCoverage}</span>
                  {paintedPngExport && paintedPngExport.height > SHARE_HIGHLIGHT_STORY_HEIGHT
                    ? <span>{copy.tallImageHint}</span> : null}
                </div>
                {passagePageCount > 1 ? (
                  <>
                    <div
                      className="share-highlight__passage-navigation"
                      role="group"
                      aria-label={copy.changePassage}
                    >
                      <button
                        type="button"
                        onClick={() => handlePassageNavigation(-1)}
                        disabled={
                          safeActivePassagePageIndex === 0
                          || rendering
                          || busyAction !== null
                        }
                      >
                        <span aria-hidden="true">←</span>
                        {copy.previousPassage}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePassageNavigation(1)}
                        disabled={
                          safeActivePassagePageIndex >= passagePageCount - 1
                          || rendering
                          || busyAction !== null
                        }
                      >
                        {copy.nextPassage}
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                    <p>{copy.passageSetNavigationHelp(passagePageCount)}</p>
                  </>
                ) : null}
              </section>
            ) : null}
            <p id={previewDescriptionId} className="sr-only">
              {previewSupportingDescription}
            </p>
            <section className="sr-only" aria-labelledby={previewTextAlternativeId}>
              <h3 id={previewTextAlternativeId}>{copy.imageTextAlternative}</h3>
              {isPassage ? imagePassageLines.map(line => (
                <div key={line.id}>
                  <p lang="pa-Guru">{line.gurmukhi}</p>
                  {showTransliteration && line.transliteration ? (
                    <p lang="en-Latn">{line.transliteration}</p>
                  ) : null}
                  {showMeaning && line.meaning ? <p lang={meaningLanguage}>{line.meaning}</p> : null}
                </div>
              )) : (
                <>
                  <p lang="pa-Guru">{content.gurmukhi}</p>
                  {showTransliteration && content.transliteration ? (
                    <p lang="en-Latn">{content.transliteration}</p>
                  ) : null}
                  {showMeaning && content.meaning ? <p lang={meaningLanguage}>{content.meaning}</p> : null}
                </>
              )}
              <p>{content.sourceLabel}</p>
            </section>
            <div className="share-highlight__provenance">
              <span>
                {copy.citation}
                <strong>{content.sourceLabel}</strong>
              </span>
              <span className="share-highlight__domain">
                <span aria-hidden="true">naamras.xyz</span>
                <span className="sr-only">{copy.brand}: naamras.xyz</span>
              </span>
              <a className="share-highlight__source-link" href={sourceUrl}>
                {copy.readOnline} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </section>

          <div className="share-highlight__controls-column">
            <fieldset
              className="share-highlight__control-group"
              aria-describedby={artworkHelpId}
            >
              <legend className="share-highlight__control-label">{copy.artwork}</legend>
              <p id={artworkHelpId} className="share-highlight__control-help">
                {isPassage
                  ? copy.passageArtworkHelp(availableArtwork.length)
                  : copy.artworkHelp}
              </p>
              <div className="share-highlight__art-grid">
                <div className="share-highlight__art-choice">
                  <input
                    ref={noArtworkInputRef}
                    id={`${artworkGroupId}-none`}
                    className="share-highlight__art-input"
                    type="radio"
                    name={artworkGroupId}
                    value={NO_ARTWORK_ID}
                    aria-describedby={`${artworkGroupId}-none-description`}
                    checked={selectedArtworkId === NO_ARTWORK_ID}
                    onChange={() => handleArtworkChange(NO_ARTWORK_ID)}
                  />
                  <label className="share-highlight__art-option" htmlFor={`${artworkGroupId}-none`}>
                    <span className="share-highlight__art-selected-mark" aria-hidden="true">
                      <IconCheck size={12} />
                    </span>
                    <span className="share-highlight__art-thumb share-highlight__no-art" aria-hidden="true">
                      <span className="share-highlight__no-art-page" />
                    </span>
                    <span className="share-highlight__art-name">{copy.noArtwork}</span>
                  </label>
                  <span id={`${artworkGroupId}-none-description`} className="sr-only">
                    {copy.noArtworkDescription}
                  </span>
                </div>
                {availableArtwork.map(asset => {
                  const artworkName = asset.displayName[locale]
                  const artworkDescription = asset.localizedDescription[locale]
                  const descriptionId = `${artworkGroupId}-${asset.id}-description`

                  return (
                    <div className="share-highlight__art-choice" key={asset.id}>
                      <input
                        id={`${artworkGroupId}-${asset.id}`}
                        className="share-highlight__art-input"
                        type="radio"
                        name={artworkGroupId}
                        value={asset.id}
                        aria-describedby={descriptionId}
                        checked={selectedArtworkId === asset.id}
                        onChange={() => handleArtworkChange(asset.id)}
                      />
                      <label className="share-highlight__art-option" htmlFor={`${artworkGroupId}-${asset.id}`}>
                        <span className="share-highlight__art-selected-mark" aria-hidden="true">
                          <IconCheck size={12} />
                        </span>
                        <span className="share-highlight__art-thumb" aria-hidden="true">
                          <img src={asset.thumbnail} alt="" loading="lazy" decoding="async" />
                        </span>
                        <span className="share-highlight__art-name">{artworkName}</span>
                      </label>
                      <span id={descriptionId} className="sr-only">{artworkDescription}</span>
                    </div>
                  )
                })}
              </div>

              <section
                className="share-highlight__selected-artwork"
                aria-labelledby={selectedArtworkLabelId}
              >
                <p id={selectedArtworkLabelId} className="sr-only">
                  {copy.selectedArtwork}
                </p>
                <strong>{selectedArtworkName}</strong>
                <p className="share-highlight__selected-artwork-description sr-only">
                  {selectedArtworkDescription}
                </p>
                {isPassage && selectedArtwork && passagePageCount > 1 ? (
                  <p>{copy.artworkAppliesToSet(passagePageCount)}</p>
                ) : null}
              </section>
            </fieldset>

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
                  aria-label={hasTransliteration
                    ? copy.transliteration
                    : `${copy.transliteration}. ${isPassage && passageTransliterationCount > 0
                        ? copy.supportCoverage(passageTransliterationCount, passageSupportLineCount)
                        : copy.unavailable}`}
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
                  aria-label={hasMeaning
                    ? copy.meaning
                    : `${copy.meaning}. ${isPassage && passageMeaningCount > 0
                        ? copy.supportCoverage(passageMeaningCount, passageSupportLineCount)
                        : copy.unavailable}`}
                  title={hasMeaning ? undefined : copy.unavailable}
                  disabled={!hasMeaning}
                  onClick={handleMeaningToggle}
                >
                  {showMeaning ? <span className="share-highlight__pill-mark" aria-hidden="true"><IconCheck size={9} /></span> : null}
                  {copy.meaning}
                </button>
              </div>
              {isPassage && (
                (passageTransliterationCount > 0 && !hasCompletePassageTransliteration)
                || (passageMeaningCount > 0 && !hasCompletePassageMeaning)
              ) ? (
                <p className="share-highlight__control-help" role="note">
                  {[
                    passageTransliterationCount > 0 && !hasCompletePassageTransliteration
                      ? `${copy.transliteration}: ${copy.supportCoverage(passageTransliterationCount, passageSupportLineCount)}`
                      : '',
                    passageMeaningCount > 0 && !hasCompletePassageMeaning
                      ? `${copy.meaning}: ${copy.supportCoverage(passageMeaningCount, passageSupportLineCount)}`
                      : '',
                  ].filter(Boolean).join('. ')}
                </p>
              ) : null}
            </section>

            {selectedArtwork && !isPassage ? (
              <section className="share-highlight__control-group share-highlight__position-control">
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
              </section>
            ) : null}

            <section className="share-highlight__control-group">
              <label className="share-highlight__caption-label" htmlFor={captionId}>
                <span className="share-highlight__control-label">{copy.socialNote}</span>
                <span id={captionHelpId} className="share-highlight__control-help">{copy.socialNoteHelp}</span>
              </label>
              <textarea
                id={captionId}
                className="share-highlight__caption"
                aria-describedby={`${captionHelpId} ${captionCountId}`}
                value={socialNote}
                maxLength={SOCIAL_NOTE_LIMIT}
                placeholder={copy.socialPlaceholder}
                onChange={event => setSocialNote(event.target.value)}
              />
              <span id={captionCountId} className="share-highlight__caption-count">
                {copy.characters(socialNote.length)}
              </span>
            </section>
          </div>
        </div>
      </div>

      <footer className="share-highlight__action-bar">
        {renderFailed && displayedPngExport ? (
          <div className="share-highlight__recovery" role="note">
            <span>{renderTooLong ? imageTooLongMessage : copy.renderError}</span>
            {!renderTooLong ? (
              <div className="share-highlight__recovery-actions">
                <button type="button" onClick={() => setRenderRetryNonce(value => value + 1)}>
                  {copy.retry}
                </button>
                {selectedArtwork ? (
                  <button type="button" onClick={handleUseNoArtwork}>
                    {copy.useNoArtwork}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="share-highlight__primary-actions">
          <button
            type="button"
            className="share-highlight__action share-highlight__action--primary"
            disabled={!displayedPngExport || paintedPngExport !== displayedPngExport || rendering || renderFailed || busyAction !== null}
            aria-busy={busyAction === 'share'}
            onClick={() => { void handleShare() }}
          >
            <IconShare size={17} />
            {busyAction === 'share'
              ? copy.sharing
              : passagePageCount > 1
                ? copy.shareImages(passagePageCount)
                : copy.shareImage}
          </button>
          <button
            type="button"
            className="share-highlight__action share-highlight__action--secondary"
            disabled={!displayedPngExport || paintedPngExport !== displayedPngExport || rendering || renderFailed || busyAction !== null}
            aria-busy={busyAction === 'save'}
            onClick={() => { void handleSave() }}
          >
            <span aria-hidden="true">↓</span>
            {busyAction === 'save'
              ? nativeImagePlatform ? nativeSaveCopy.saving : copy.downloading
              : nativeImagePlatform ? nativeSaveCopy.label : passagePageCount > 1
                ? copy.saveImages(passagePageCount)
                : copy.saveImage}
          </button>
        </div>
        <button
          type="button"
          className="share-highlight__copy"
          disabled={busyAction !== null}
          aria-busy={busyAction === 'copy'}
          onClick={event => { void handleCopy(event) }}
        >
          {busyAction === 'copy'
            ? copy.copying
            : isPassage
              ? copy.copyFullText
              : copy.copyText}
        </button>
        <p className="share-highlight__status" role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
      </footer>
    </ModalSheet>
  )
}
