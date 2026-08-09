import { useEffect, useId, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { shareHighlightAssets } from '../../assets/share-highlights/manifest'
import { IconCheck, IconClose, IconShare } from '../../components/icons'
import ModalSheet from '../../components/ModalSheet'
import type { UiLocale } from '../../types'
import { focusElementWithoutAppScroll } from '../../utils/appScroll'
import {
  exportShareHighlightPng,
  exportShareHighlightStoryPng,
} from './renderer'
import { copyShareHighlightText, downloadShareHighlightFile, shareHighlightFile } from './share'
import { getCanonicalSourceUrl, getHukamnamaShareUrl } from './sourceUrl'
import type {
  ShareHighlightArtwork,
  ShareHighlightCardInput,
  ShareHighlightPassageInput,
  ShareHighlightPassageLine,
  ShareHighlightPngExport,
  ShareHighlightStoryPngExport,
  ShareHighlightStoryScopeCopy,
  ShareHighlightStorySelection,
  ShareHighlightTextPosition,
} from './types'
import { SHARE_HIGHLIGHT_CARD_HEIGHT, SHARE_HIGHLIGHT_STORY_HEIGHT } from './types'
import './ShareHighlightSheet.css'

const NO_ARTWORK_ID = 'none'
const SOCIAL_NOTE_LIMIT = 280
const RENDER_DEBOUNCE_MS = 90
const SHARE_ACTION_TIMEOUT_MS = 45_000

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
  personalPassagePreface: string
  passageTitle: string
  passageTextLayersHelp: string
  quietPassageArtworkNote: string
  passageComplete: string
  passageExcerpt: string
  personalPassageExcerpt: string
  passageImageCoverage: (included: number, total: number) => string
  passageFullTextFollows: string
  changePassage: string
  previousPassage: string
  nextPassage: string
  passageNavigationHelp: string
  storyScopeCopy: ShareHighlightStoryScopeCopy
  personalStoryScopeCopy: ShareHighlightStoryScopeCopy
  preparingBilingual: string
  bilingualReady: string
  passageShareTitle: string
  shareImage: string
  saveImage: string
  copyText: string
  copyFullText: string
  reflectionLabel: string
  imageTextAlternative: string
  completeImageNote: string
  excerptImageNote: string
  personalExcerptImageNote: string
  readOnline: string
  raagCredit: (value: string) => string
  writerCredit: (value: string) => string
  translationCredit: (value: string) => string
  previewSummary: (kind: 'passage' | 'line', layers: string) => string
  supportCoverage: (available: number, total: number) => string
  preparing: string
  ready: string
  shareTitle: string
  sharing: string
  downloading: string
  copying: string
  shared: string
  sharedFileOnly: string
  cancelled: string
  shareUnavailable: string
  shareFailed: string
  shareTimedOut: string
  downloaded: string
  copied: string
  renderError: string
  retry: string
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
    socialNoteHelp: 'Included with Share and copied text, but never printed on the image or mixed with Gurbani.',
    socialPlaceholder: 'Add a short reflection…',
    selectedExcerpt: 'This card contains only the Gurmukhi words you selected.',
    passagePreface: "Share today's Hukamnama",
    personalPassagePreface: 'Share this personal Hukamnama',
    passageTitle: 'Create a Story image',
    passageTextLayersHelp: 'Gurmukhi is always included. Meaning places each complete selected translation directly below its matching Gurbani line. Choose Transliteration instead for pronunciation.',
    quietPassageArtworkNote: 'Long Hukamnamas use a quiet manuscript background so the selected passage stays balanced and legible.',
    passageComplete: 'Complete Hukamnama',
    passageExcerpt: "Excerpt from today's Hukamnama",
    personalPassageExcerpt: 'Personal Hukamnama excerpt',
    passageImageCoverage: (included, total) => `${included} of ${total} lines in this image`,
    passageFullTextFollows: 'The complete Hukamnama text follows.',
    changePassage: 'Change passage',
    previousPassage: 'Previous passage',
    nextPassage: 'Next passage',
    passageNavigationHelp: 'Choose another contiguous passage. Copy full text always includes the complete Hukamnama.',
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
    preparingBilingual: 'Preparing bilingual Story…',
    bilingualReady: 'Bilingual Story ready.',
    passageShareTitle: 'Hukamnama from NaamRas',
    shareImage: 'Share image',
    saveImage: 'Download image',
    copyText: 'Copy text',
    copyFullText: 'Copy full text',
    reflectionLabel: 'Personal reflection',
    imageTextAlternative: 'Text shown in the image',
    completeImageNote: 'The attached image contains the complete Hukamnama.',
    excerptImageNote: "The attached image contains an excerpt from today's Hukamnama.",
    personalExcerptImageNote: 'The attached image contains an excerpt from this personal Hukamnama.',
    readOnline: 'Read this exact passage on NaamRas',
    raagCredit: value => `Raag: ${value}`,
    writerCredit: value => `Writer: ${value}`,
    translationCredit: value => `Translation: ${value}`,
    previewSummary: (kind, layers) => `${kind === 'passage' ? 'Hukamnama Story' : 'Gurbani card'} preview. Includes ${layers}`,
    supportCoverage: (available, total) => `${available} of ${total} lines available`,
    preparing: 'Preparing image…',
    ready: 'Image ready.',
    shareTitle: 'A line from NaamRas',
    sharing: 'Opening share sheet…',
    downloading: 'Starting download…',
    copying: 'Copying full text…',
    shared: 'Shared successfully.',
    sharedFileOnly: 'Image shared. This app may not have included your reflection or source details — use Copy full text if you need to paste them too.',
    cancelled: 'Sharing cancelled.',
    shareUnavailable: 'Native sharing is unavailable here. Download the image or copy the full text instead.',
    shareFailed: 'The share sheet could not open. Try again, download the image, or copy the full text.',
    shareTimedOut: 'The share sheet did not respond. You can try again, download the image, or copy the full text.',
    downloaded: 'Download started. Your browser will confirm where the image is stored.',
    copied: 'Text copied.',
    renderError: 'The image could not be prepared. Retry without changing the Gurbani.',
    retry: 'Retry image',
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
    socialNoteHelp: 'ਇਹ ਸਾਂਝਾ ਕਰਨ ਅਤੇ ਕਾਪੀ ਲਿਖਤ ਨਾਲ ਜਾਂਦਾ ਹੈ, ਪਰ ਤਸਵੀਰ ਉੱਤੇ ਨਹੀਂ ਲਿਖਿਆ ਜਾਂਦਾ ਅਤੇ ਗੁਰਬਾਣੀ ਨਾਲ ਨਹੀਂ ਮਿਲਾਇਆ ਜਾਂਦਾ।',
    socialPlaceholder: 'ਛੋਟਾ ਵਿਚਾਰ ਲਿਖੋ…',
    selectedExcerpt: 'ਇਸ ਕਾਰਡ ਵਿੱਚ ਸਿਰਫ਼ ਤੁਹਾਡੇ ਚੁਣੇ ਗੁਰਮੁਖੀ ਸ਼ਬਦ ਹਨ।',
    passagePreface: 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ ਸਾਂਝਾ ਕਰੋ',
    personalPassagePreface: 'ਇਹ ਨਿੱਜੀ ਹੁਕਮਨਾਮਾ ਸਾਂਝਾ ਕਰੋ',
    passageTitle: 'ਸਟੋਰੀ ਤਸਵੀਰ ਬਣਾਓ',
    passageTextLayersHelp: 'ਗੁਰਮੁਖੀ ਹਮੇਸ਼ਾ ਸ਼ਾਮਲ ਹੈ। ਅਰਥ ਹਰ ਗੁਰਬਾਣੀ ਪੰਕਤੀ ਦੇ ਬਿਲਕੁਲ ਹੇਠਾਂ ਉਸ ਦਾ ਪੂਰਾ ਚੁਣਿਆ ਅਨੁਵਾਦ ਦਿਖਾਉਂਦਾ ਹੈ। ਉਚਾਰਨ ਲਈ ਇਸ ਦੀ ਥਾਂ ਲਿਪੀਅੰਤਰਨ ਚੁਣੋ।',
    quietPassageArtworkNote: 'ਲੰਮੇ ਹੁਕਮਨਾਮਿਆਂ ਲਈ ਸਾਦਾ ਹੱਥ-ਲਿਖਤ ਪਿਛੋਕੜ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ ਤਾਂ ਜੋ ਚੁਣਿਆ ਪਾਠ ਸੰਤੁਲਿਤ ਅਤੇ ਪੜ੍ਹਨਯੋਗ ਰਹੇ।',
    passageComplete: 'ਪੂਰਾ ਹੁਕਮਨਾਮਾ',
    passageExcerpt: 'ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਦਾ ਅੰਸ਼',
    personalPassageExcerpt: 'ਨਿੱਜੀ ਹੁਕਮਨਾਮੇ ਦਾ ਅੰਸ਼',
    passageImageCoverage: (included, total) => `${total} ਵਿੱਚੋਂ ${included} ਪੰਕਤੀਆਂ ਇਸ ਤਸਵੀਰ ਵਿੱਚ`,
    passageFullTextFollows: 'ਪੂਰੇ ਹੁਕਮਨਾਮੇ ਦੀ ਲਿਖਤ ਹੇਠਾਂ ਹੈ।',
    changePassage: 'ਅੰਸ਼ ਬਦਲੋ',
    previousPassage: 'ਪਿਛਲਾ ਅੰਸ਼',
    nextPassage: 'ਅਗਲਾ ਅੰਸ਼',
    passageNavigationHelp: 'ਨਾਲ ਲੱਗਦਾ ਹੋਰ ਅੰਸ਼ ਚੁਣੋ। “ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ” ਵਿੱਚ ਹਮੇਸ਼ਾ ਪੂਰਾ ਹੁਕਮਨਾਮਾ ਹੁੰਦਾ ਹੈ।',
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
    preparingBilingual: 'ਦੋ-ਭਾਸ਼ਾਈ ਸਟੋਰੀ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ…',
    bilingualReady: 'ਦੋ-ਭਾਸ਼ਾਈ ਸਟੋਰੀ ਤਿਆਰ ਹੈ।',
    passageShareTitle: 'ਨਾਮਰਸ ਤੋਂ ਹੁਕਮਨਾਮਾ',
    shareImage: 'ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ',
    saveImage: 'ਤਸਵੀਰ ਡਾਊਨਲੋਡ ਕਰੋ',
    copyText: 'ਲਿਖਤ ਕਾਪੀ ਕਰੋ',
    copyFullText: 'ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ',
    reflectionLabel: 'ਨਿੱਜੀ ਵਿਚਾਰ',
    imageTextAlternative: 'ਤਸਵੀਰ ਵਿੱਚ ਦਿਖਾਈ ਲਿਖਤ',
    completeImageNote: 'ਨੱਥੀ ਤਸਵੀਰ ਵਿੱਚ ਪੂਰਾ ਹੁਕਮਨਾਮਾ ਹੈ।',
    excerptImageNote: 'ਨੱਥੀ ਤਸਵੀਰ ਵਿੱਚ ਅੱਜ ਦੇ ਹੁਕਮਨਾਮੇ ਦਾ ਇੱਕ ਅੰਸ਼ ਹੈ।',
    personalExcerptImageNote: 'ਨੱਥੀ ਤਸਵੀਰ ਵਿੱਚ ਨਿੱਜੀ ਹੁਕਮਨਾਮੇ ਦਾ ਇੱਕ ਅੰਸ਼ ਹੈ।',
    readOnline: 'ਨਾਮਰਸ ਉੱਤੇ ਇਹੀ ਪਾਠ ਪੜ੍ਹੋ',
    raagCredit: value => `ਰਾਗ: ${value}`,
    writerCredit: value => `ਰਚਨਾਕਾਰ: ${value}`,
    translationCredit: value => `ਅਨੁਵਾਦ: ${value}`,
    previewSummary: (kind, layers) => `${kind === 'passage' ? 'ਹੁਕਮਨਾਮਾ ਸਟੋਰੀ' : 'ਗੁਰਬਾਣੀ ਕਾਰਡ'} ਦੀ ਝਲਕ। ਇਸ ਵਿੱਚ ${layers} ਸ਼ਾਮਲ ਹੈ`,
    supportCoverage: (available, total) => `${total} ਵਿੱਚੋਂ ${available} ਪੰਕਤੀਆਂ ਉਪਲਬਧ`,
    preparing: 'ਤਸਵੀਰ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ…',
    ready: 'ਤਸਵੀਰ ਤਿਆਰ ਹੈ।',
    shareTitle: 'ਨਾਮਰਸ ਤੋਂ ਇੱਕ ਪੰਕਤੀ',
    sharing: 'ਸਾਂਝਾ ਪੰਨਾ ਖੁੱਲ੍ਹ ਰਿਹਾ ਹੈ…',
    downloading: 'ਡਾਊਨਲੋਡ ਸ਼ੁਰੂ ਹੋ ਰਿਹਾ ਹੈ…',
    copying: 'ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਹੋ ਰਹੀ ਹੈ…',
    shared: 'ਸਫਲਤਾਪੂਰਵਕ ਸਾਂਝਾ ਹੋ ਗਿਆ।',
    sharedFileOnly: 'ਤਸਵੀਰ ਸਾਂਝੀ ਹੋ ਗਈ। ਹੋ ਸਕਦਾ ਹੈ ਇਸ ਐਪ ਨੇ ਤੁਹਾਡਾ ਵਿਚਾਰ ਜਾਂ ਸਰੋਤ ਵੇਰਵੇ ਸ਼ਾਮਲ ਨਾ ਕੀਤੇ ਹੋਣ — ਉਹਨਾਂ ਨੂੰ ਵੀ ਪਾਉਣ ਲਈ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    cancelled: 'ਸਾਂਝਾ ਕਰਨਾ ਰੱਦ ਕੀਤਾ ਗਿਆ।',
    shareUnavailable: 'ਇੱਥੇ ਮੂਲ ਸਾਂਝਾ ਸਹੂਲਤ ਉਪਲਬਧ ਨਹੀਂ। ਤਸਵੀਰ ਡਾਊਨਲੋਡ ਕਰੋ ਜਾਂ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    shareFailed: 'ਸਾਂਝਾ ਪੰਨਾ ਨਹੀਂ ਖੁੱਲ੍ਹਿਆ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ, ਤਸਵੀਰ ਡਾਊਨਲੋਡ ਕਰੋ ਜਾਂ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    shareTimedOut: 'ਸਾਂਝਾ ਪੰਨੇ ਨੇ ਜਵਾਬ ਨਹੀਂ ਦਿੱਤਾ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ, ਤਸਵੀਰ ਡਾਊਨਲੋਡ ਕਰੋ ਜਾਂ ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ।',
    downloaded: 'ਡਾਊਨਲੋਡ ਸ਼ੁਰੂ ਹੋ ਗਿਆ ਹੈ। ਤਸਵੀਰ ਕਿੱਥੇ ਸੰਭਾਲੀ ਗਈ ਹੈ, ਇਹ ਬ੍ਰਾਊਜ਼ਰ ਦੱਸੇਗਾ।',
    copied: 'ਲਿਖਤ ਕਾਪੀ ਹੋ ਗਈ।',
    renderError: 'ਤਸਵੀਰ ਤਿਆਰ ਨਹੀਂ ਹੋ ਸਕੀ। ਗੁਰਬਾਣੀ ਬਦਲੇ ਬਿਨਾਂ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    retry: 'ਤਸਵੀਰ ਦੁਬਾਰਾ ਬਣਾਓ',
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
    socialNoteHelp: 'यह शेयर और कॉपी किए पाठ के साथ जाता है, पर छवि पर नहीं छपता और गुरबाणी में नहीं मिलता।',
    socialPlaceholder: 'एक छोटा विचार लिखें…',
    selectedExcerpt: 'इस कार्ड में केवल आपके चुने हुए गुरमुखी शब्द हैं।',
    passagePreface: 'आज का हुकमनामा साझा करें',
    personalPassagePreface: 'यह व्यक्तिगत हुकमनामा साझा करें',
    passageTitle: 'स्टोरी छवि बनाएँ',
    passageTextLayersHelp: 'गुरमुखी हमेशा शामिल है। अर्थ हर गुरबाणी पंक्ति के ठीक नीचे उसका पूरा चुना हुआ अनुवाद दिखाता है। उच्चारण के लिए इसकी जगह लिप्यंतरण चुनें।',
    quietPassageArtworkNote: 'लंबे हुकमनामों में शांत पांडुलिपि पृष्ठभूमि रहती है, ताकि चुना हुआ अंश संतुलित और पढ़ने योग्य रहे।',
    passageComplete: 'पूरा हुकमनामा',
    passageExcerpt: 'आज के हुकमनामे का अंश',
    personalPassageExcerpt: 'व्यक्तिगत हुकमनामे का अंश',
    passageImageCoverage: (included, total) => `${total} में से ${included} पंक्तियाँ इस छवि में`,
    passageFullTextFollows: 'पूरा हुकमनामा पाठ नीचे है।',
    changePassage: 'अंश बदलें',
    previousPassage: 'पिछला अंश',
    nextPassage: 'अगला अंश',
    passageNavigationHelp: 'साथ वाला दूसरा अंश चुनें। “पूरा पाठ कॉपी करें” में हमेशा पूरा हुकमनामा होता है।',
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
    preparingBilingual: 'द्विभाषी स्टोरी तैयार हो रही है…',
    bilingualReady: 'द्विभाषी स्टोरी तैयार है।',
    passageShareTitle: 'नामरस से हुकमनामा',
    shareImage: 'छवि साझा करें',
    saveImage: 'छवि डाउनलोड करें',
    copyText: 'पाठ कॉपी करें',
    copyFullText: 'पूरा पाठ कॉपी करें',
    reflectionLabel: 'व्यक्तिगत विचार',
    imageTextAlternative: 'छवि में दिखाया गया पाठ',
    completeImageNote: 'संलग्न छवि में पूरा हुकमनामा है।',
    excerptImageNote: 'संलग्न छवि में आज के हुकमनामे का एक अंश है।',
    personalExcerptImageNote: 'संलग्न छवि में व्यक्तिगत हुकमनामे का एक अंश है।',
    readOnline: 'नामरस पर यही पाठ पढ़ें',
    raagCredit: value => `राग: ${value}`,
    writerCredit: value => `रचनाकार: ${value}`,
    translationCredit: value => `अनुवाद: ${value}`,
    previewSummary: (kind, layers) => `${kind === 'passage' ? 'हुकमनामा स्टोरी' : 'गुरबाणी कार्ड'} का पूर्वावलोकन। इसमें ${layers} शामिल है`,
    supportCoverage: (available, total) => `${total} में से ${available} पंक्तियाँ उपलब्ध`,
    preparing: 'छवि तैयार हो रही है…',
    ready: 'छवि तैयार है।',
    shareTitle: 'नामरस से एक पंक्ति',
    sharing: 'शेयर शीट खुल रही है…',
    downloading: 'डाउनलोड शुरू हो रहा है…',
    copying: 'पूरा पाठ कॉपी हो रहा है…',
    shared: 'सफलतापूर्वक साझा हो गया।',
    sharedFileOnly: 'छवि साझा हो गई। हो सकता है इस ऐप ने आपका विचार या स्रोत विवरण शामिल न किया हो — उन्हें भी जोड़ने के लिए पूरा पाठ कॉपी करें।',
    cancelled: 'साझा करना रद्द किया गया।',
    shareUnavailable: 'यहाँ मूल शेयर सुविधा उपलब्ध नहीं है। छवि डाउनलोड करें या पूरा पाठ कॉपी करें।',
    shareFailed: 'शेयर शीट नहीं खुली। फिर कोशिश करें, छवि डाउनलोड करें या पूरा पाठ कॉपी करें।',
    shareTimedOut: 'शेयर शीट ने जवाब नहीं दिया। फिर कोशिश करें, छवि डाउनलोड करें या पूरा पाठ कॉपी करें।',
    downloaded: 'डाउनलोड शुरू हो गया है। छवि कहाँ रखी गई है, इसकी पुष्टि ब्राउज़र करेगा।',
    copied: 'पाठ कॉपी हो गया।',
    renderError: 'छवि तैयार नहीं हो सकी। गुरबाणी बदले बिना फिर कोशिश करें।',
    retry: 'छवि फिर बनाएँ',
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

function withActionTimeout<T>(promise: Promise<T>) {
  let settled = false
  let timeoutId: number | null = null
  let rejectAction: ((reason?: unknown) => void) | null = null

  const clearActionTimeout = () => {
    if (timeoutId !== null) window.clearTimeout(timeoutId)
    timeoutId = null
  }

  const timedPromise = new Promise<T>((resolve, reject) => {
    rejectAction = reject
    timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      timeoutId = null
      reject(new ShareHighlightActionTimeoutError())
    }, SHARE_ACTION_TIMEOUT_MS)

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
    passageSelection ? getPassageStatusLines(passageSelection, content, copy).join(' · ') : '',
    passageSelection?.mode === 'excerpt' ? copy.passageFullTextFollows : '',
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
) {
  const lines = (content.passageLines?.length
    ? getPassageImageLines(content, passageSelection).map(line => line.gurmukhi)
    : content.gurmukhi.split('\n'))
    .map(line => line.trim())
    .filter(Boolean)
  const excerpt = lines.slice(0, 2).join('\n')
  const hasMore = lines.length > 2

  return [
    socialNote.trim() ? `${copy.reflectionLabel}:\n${socialNote.trim()}\n——` : '',
    content.seriesLabel?.trim(),
    content.dateLabel?.trim(),
    passageSelection ? getPassageStatusLines(passageSelection, content, copy).join(' · ') : '',
    excerpt ? `${excerpt}${hasMore ? '\n…' : ''}` : '',
    passageSelection
      ? passageSelection.mode === 'complete'
        ? copy.completeImageNote
        : getPassagePresentationCopy(content, copy).excerptImageNote
      : '',
    `— ${content.sourceLabel.trim()}`,
    ...getProvenanceLines(content, copy),
    `${copy.readOnline}: ${sourceUrl}`,
  ].filter(Boolean).join('\n')
}

function getArtworkName(assetId: string) {
  return assetId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
  const passageCopy = getPassagePresentationCopy(content, copy)
  const meaningLanguage = content.provenance?.translationLanguage === 'pa'
    ? 'pa-Guru'
    : content.provenance?.translationLanguage === 'hi'
      ? 'hi'
      : 'en'
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const renderSequenceRef = useRef(0)
  const busyActionRef = useRef<'share' | 'save' | 'copy' | null>(null)
  const shareActionCancelRef = useRef<(() => void) | null>(null)
  const shareActionGenerationRef = useRef(0)
  const artworkGroupId = useId()
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
  const [selectedArtworkId, setSelectedArtworkId] = useState(() => resolveInitialArtworkId(initialArtworkId))
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
  const [renderStatus, setRenderStatus] = useState(copy.preparing)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [renderFailed, setRenderFailed] = useState(false)
  const [rendering, setRendering] = useState(true)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const [busyAction, setBusyAction] = useState<'share' | 'save' | 'copy' | null>(null)
  const [passageAnchorLineId, setPassageAnchorLineId] = useState<ShareHighlightPassageLine['id'] | null>(null)
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
  const selectedArtwork = useMemo<ShareHighlightArtwork | null>(() => (
    selectedArtworkId === NO_ARTWORK_ID
      ? null
      : shareHighlightAssets.find(asset => asset.id === selectedArtworkId) ?? null
  ), [selectedArtworkId])

  useEffect(() => {
    if (open) return
    shareActionGenerationRef.current += 1
    shareActionCancelRef.current?.()
    shareActionCancelRef.current = null
    busyActionRef.current = null
    setBusyAction(null)
  }, [open])

  useEffect(() => () => {
    shareActionGenerationRef.current += 1
    shareActionCancelRef.current?.()
    shareActionCancelRef.current = null
  }, [])

  useEffect(() => {
    if (!open) return
    setSelectedArtworkId(resolveInitialArtworkId(initialArtworkId))
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
    setRenderFailed(false)
    setRendering(true)
    setPassageAnchorLineId(null)
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
        anchorLineId: passageAnchorLineId,
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
    passageAnchorLineId,
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

  useEffect(() => {
    if (!open || !canvasElement) return

    const renderSequence = ++renderSequenceRef.current
    setRenderFailed(false)
    setRendering(true)
    setActionStatus(null)
    setRenderStatus(passageInput && activePassageSupport === 'meaning'
      ? copy.preparingBilingual
      : copy.preparing)

    const renderTimeout = window.setTimeout(() => {
      const exportPromise = passageInput
        ? exportShareHighlightStoryPng(passageInput)
        : exportShareHighlightPng(cardInput)

      void exportPromise
        .then(result => {
          if (renderSequenceRef.current !== renderSequence) return
          setPngExport(result)
          setRendering(false)
          setRenderStatus(passageInput && activePassageSupport === 'meaning'
            ? copy.bilingualReady
            : copy.ready)
        })
        .catch(() => {
          if (renderSequenceRef.current !== renderSequence) return
          setRenderFailed(true)
          setRendering(false)
          setRenderStatus(copy.renderError)
        })
    }, RENDER_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(renderTimeout)
      if (renderSequenceRef.current === renderSequence) renderSequenceRef.current += 1
    }
  }, [
    activePassageSupport,
    canvasElement,
    cardInput,
    copy,
    open,
    passageInput,
    renderRetryNonce,
  ])

  useEffect(() => {
    if (
      !canvasElement
      || !pngExport
      || pngExport.canvas === canvasElement
    ) return

    const context = canvasElement.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvasElement.width, canvasElement.height)
    context.drawImage(pngExport.canvas, 0, 0, canvasElement.width, canvasElement.height)
  }, [canvasElement, pngExport])

  const passageExport: ShareHighlightStoryPngExport | null = (
    isPassage
    && pngExport
    && 'selection' in pngExport
  ) ? pngExport : null
  const passageSelection = passageExport?.selection ?? null
  const usesQuietPassageLayout = passageExport?.layout.composition === 'manuscript'
  const imagePassageLines = isPassage
    ? getPassageImageLines(content, passageSelection)
    : []
  const passageStatusTitle = passageSelection?.mode === 'complete'
    ? copy.passageComplete
    : passageSelection?.mode === 'excerpt'
      ? passageCopy.excerpt
      : null
  const passageCoverage = passageSelection
    ? copy.passageImageCoverage(
        passageSelection.includedLineCount,
        passageSelection.totalLineCount,
      )
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
    if (!pngExport || !beginAction('share', copy.sharing)) return
    const actionGeneration = ++shareActionGenerationRef.current
    const timedAction = withActionTimeout(shareHighlightFile(pngExport.file, {
      title: isPassage ? copy.passageShareTitle : copy.shareTitle,
      text: buildShareCompanionText(content, socialNote, sourceUrl, copy, passageSelection),
      url: sourceUrl,
    }))
    shareActionCancelRef.current = timedAction.cancel
    try {
      const result = await timedAction.promise
      if (shareActionGenerationRef.current !== actionGeneration) return
      if (result.status === 'shared') {
        announce(result.payload === 'file-only' ? copy.sharedFileOnly : copy.shared)
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
        finishAction('share')
      }
    }
  }

  const handleSave = async () => {
    if (!pngExport || !beginAction('save', copy.downloading)) return
    try {
      downloadShareHighlightFile(pngExport.file)
      announce(copy.downloaded)
    } catch {
      announce(copy.actionError)
    } finally {
      finishAction('save')
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

  const handlePassageNavigation = (anchorLineId: ShareHighlightPassageLine['id'] | null) => {
    if (anchorLineId === null || rendering) return
    setRendering(true)
    setActionStatus(null)
    setPassageAnchorLineId(anchorLineId)
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
          <p className="share-highlight__preface">{isPassage ? passageCopy.preface : copy.preface}</p>
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
              aria-busy={rendering}
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
                  aria-hidden={renderFailed ? undefined : 'true'}
                >
                  <span>{status}</span>
                  {renderFailed ? (
                    <button
                      type="button"
                      className="share-highlight__retry"
                      onClick={() => setRenderRetryNonce(value => value + 1)}
                    >
                      {copy.retry}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {passageSelection ? (
              <section
                className={`share-highlight__passage-status share-highlight__passage-status--${passageSelection.mode}`}
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="share-highlight__passage-status-copy">
                  <strong>{passageStatusTitle}</strong>
                  <span>{passageCoverage}</span>
                </div>
                {passageSelection.mode === 'excerpt' && (
                  passageSelection.previousSourceLineId !== null
                  || passageSelection.nextSourceLineId !== null
                ) ? (
                  <>
                    <div
                      className="share-highlight__passage-navigation"
                      role="group"
                      aria-label={copy.changePassage}
                    >
                      <button
                        type="button"
                        onClick={() => handlePassageNavigation(passageSelection.previousSourceLineId)}
                        disabled={
                          passageSelection.previousSourceLineId === null
                          || rendering
                          || busyAction !== null
                        }
                      >
                        <span aria-hidden="true">←</span>
                        {copy.previousPassage}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePassageNavigation(passageSelection.nextSourceLineId)}
                        disabled={
                          passageSelection.nextSourceLineId === null
                          || rendering
                          || busyAction !== null
                        }
                      >
                        {copy.nextPassage}
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                    <p>{copy.passageNavigationHelp}</p>
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
                <span>{copy.readOnline}</span>
                <strong>{sourceUrl}</strong>
              </a>
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
                      aria-label={`${getArtworkName(asset.id)}. ${asset.description}`}
                      checked={selectedArtworkId === asset.id}
                      onChange={() => {
                        setRendering(true)
                        setSelectedArtworkId(asset.id)
                      }}
                    />
                    <label className="share-highlight__art-option" htmlFor={`${artworkGroupId}-${asset.id}`}>
                      <span className="share-highlight__art-thumb">
                        <img src={asset.thumbnail} alt="" loading="lazy" decoding="async" />
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
        {renderFailed && pngExport ? (
          <div className="share-highlight__recovery" role="note">
            <span>{copy.renderError}</span>
            <button type="button" onClick={() => setRenderRetryNonce(value => value + 1)}>
              {copy.retry}
            </button>
          </div>
        ) : null}
        <div className="share-highlight__primary-actions">
          <button
            type="button"
            className="share-highlight__action share-highlight__action--primary"
            disabled={!pngExport || rendering || renderFailed || busyAction !== null}
            aria-busy={busyAction === 'share'}
            onClick={() => { void handleShare() }}
          >
            <IconShare size={17} />
            {busyAction === 'share' ? copy.sharing : copy.shareImage}
          </button>
          <button
            type="button"
            className="share-highlight__action share-highlight__action--secondary"
            disabled={!pngExport || rendering || renderFailed || busyAction !== null}
            aria-busy={busyAction === 'save'}
            onClick={() => { void handleSave() }}
          >
            <span aria-hidden="true">↓</span>
            {busyAction === 'save' ? copy.downloading : copy.saveImage}
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
