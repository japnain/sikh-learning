import type { ShareHighlightShareResult } from './types'

interface ShareHighlightNavigator {
  canShare?: (data: ShareData) => boolean
  share?: (data: ShareData) => Promise<void>
}

interface ShareHighlightClipboardNavigator {
  clipboard?: Pick<Clipboard, 'writeText'>
}

interface ShareHighlightUrlApi {
  createObjectURL: (value: Blob) => string
  revokeObjectURL: (url: string) => void
}

interface ShareHighlightDownloadDocument {
  body: Pick<HTMLElement, 'appendChild' | 'removeChild'>
  createElement: (tagName: 'a') => HTMLAnchorElement
}

interface ShareHighlightClipboardDocument {
  body: Pick<HTMLElement, 'appendChild' | 'removeChild'>
  createElement: (tagName: 'textarea') => HTMLTextAreaElement
  execCommand?: (commandId: string) => boolean
  activeElement?: Element | null
}

export const SHARE_HIGHLIGHT_OBJECT_URL_REVOKE_DELAY_MS = 60_000

export interface ShareHighlightDownloadOptions {
  document?: ShareHighlightDownloadDocument
  urlApi?: ShareHighlightUrlApi
  scheduleRevoke?: (callback: () => void, delayMs: number) => void
}

export interface ShareHighlightShareOptions extends ShareHighlightDownloadOptions {
  navigator?: ShareHighlightNavigator
  title?: string
  text?: string
  url?: string
}

export interface ShareHighlightClipboardOptions {
  navigator?: ShareHighlightClipboardNavigator
  document?: ShareHighlightClipboardDocument
  /** Capture the invoking control before any pending UI state can move focus. */
  focusTarget?: HTMLElement | null
}

export interface ShareHighlightClipboardResult {
  method: 'clipboard-api' | 'exec-command'
}

function defaultNavigator(): ShareHighlightNavigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator
}

function defaultDocument(): ShareHighlightDownloadDocument | undefined {
  return typeof document === 'undefined' ? undefined : document
}

function defaultClipboardNavigator(): ShareHighlightClipboardNavigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator
}

function defaultClipboardDocument(): ShareHighlightClipboardDocument | undefined {
  return typeof document === 'undefined'
    ? undefined
    : document as ShareHighlightClipboardDocument
}

function defaultUrlApi(): ShareHighlightUrlApi | undefined {
  return typeof URL === 'undefined' ? undefined : URL
}

export function isShareHighlightCancellation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
}

function requireFiles(files: readonly File[]): File[] {
  if (files.length === 0) throw new Error('At least one share highlight file is required.')
  return Array.from(files)
}

export function downloadShareHighlightFile(
  file: File,
  options: ShareHighlightDownloadOptions = {}
): void {
  const documentRef = options.document ?? defaultDocument()
  const urlApi = options.urlApi ?? defaultUrlApi()
  if (!documentRef || !urlApi) {
    throw new Error('Downloading a share highlight requires browser document and URL APIs.')
  }

  const objectUrl = urlApi.createObjectURL(file)
  const anchor = documentRef.createElement('a')
  anchor.href = objectUrl
  anchor.download = file.name || 'naamras-highlight.png'
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  documentRef.body.appendChild(anchor)

  try {
    anchor.click()
  } finally {
    documentRef.body.removeChild(anchor)
    const scheduleRevoke = options.scheduleRevoke ?? ((callback, delayMs) => {
      setTimeout(callback, delayMs)
    })
    scheduleRevoke(
      () => urlApi.revokeObjectURL(objectUrl),
      SHARE_HIGHLIGHT_OBJECT_URL_REVOKE_DELAY_MS
    )
  }
}

export function downloadShareHighlightFiles(
  files: readonly File[],
  options: ShareHighlightDownloadOptions = {}
): File[] {
  const orderedFiles = requireFiles(files)
  orderedFiles.forEach(file => downloadShareHighlightFile(file, options))
  return orderedFiles
}

function makeShareData(files: File[], options: ShareHighlightShareOptions): ShareData {
  return {
    files,
    ...(options.title?.trim() ? { title: options.title.trim() } : {}),
    ...(options.text?.trim() ? { text: options.text.trim() } : {}),
    ...(options.url?.trim() ? { url: options.url.trim() } : {}),
  }
}

function fileOnlyShareData(files: File[]): ShareData {
  return { files }
}

function withoutUrlShareData(shareData: ShareData): ShareData {
  const shareDataWithoutUrl = { ...shareData }
  delete shareDataWithoutUrl.url
  return shareDataWithoutUrl
}

function sameShareData(left: ShareData, right: ShareData) {
  return left.title === right.title
    && left.text === right.text
    && left.url === right.url
    && left.files === right.files
}

interface ShareCandidate {
  data: ShareData
  payload: Extract<ShareHighlightShareResult, { status: 'shared' }>['payload']
}

export async function shareHighlightFiles(
  files: readonly File[],
  options: ShareHighlightShareOptions = {}
): Promise<ShareHighlightShareResult> {
  const orderedFiles = requireFiles(files)
  const navigatorRef = options.navigator ?? defaultNavigator()
  if (!navigatorRef?.share || !navigatorRef.canShare) {
    return {
      status: 'unsupported',
      method: 'web-share',
      reason: 'api-unavailable',
    }
  }

  const exactShareData = makeShareData(orderedFiles, options)
  const candidates = ([
    { data: exactShareData, payload: 'full' },
    { data: withoutUrlShareData(exactShareData), payload: 'without-url' },
    { data: fileOnlyShareData(orderedFiles), payload: 'file-only' },
  ] satisfies ShareCandidate[]).filter((candidate, index, allCandidates) => (
    allCandidates.findIndex(existing => sameShareData(existing.data, candidate.data)) === index
  ))
  let capabilityError: unknown
  let supportedCandidate: ShareCandidate | null = null

  for (const candidate of candidates) {
    try {
      if (navigatorRef.canShare(candidate.data)) {
        supportedCandidate = candidate
        break
      }
    } catch (error) {
      capabilityError = error
    }
  }

  if (!supportedCandidate) {
    return {
      status: 'unsupported',
      method: 'web-share',
      reason: 'file-share-unsupported',
      ...(capabilityError === undefined ? {} : { error: capabilityError }),
    }
  }

  try {
    await navigatorRef.share(supportedCandidate.data)
    return {
      status: 'shared',
      method: 'web-share',
      payload: supportedCandidate.payload,
    }
  } catch (error) {
    if (isShareHighlightCancellation(error)) {
      return { status: 'cancelled', method: 'web-share' }
    }
    return { status: 'failed', method: 'web-share', error }
  }
}

export async function shareHighlightFile(
  file: File,
  options: ShareHighlightShareOptions = {}
): Promise<ShareHighlightShareResult> {
  return shareHighlightFiles([file], options)
}

function makeClipboardFallbackError(clipboardError: unknown, fallbackError: unknown) {
  const error = new Error('Copying share text is not supported in this browser.')
  Object.defineProperty(error, 'cause', {
    configurable: true,
    value: fallbackError ?? clipboardError,
  })
  return error
}

function copyWithHiddenTextarea(
  text: string,
  documentRef: ShareHighlightClipboardDocument,
  focusTarget?: HTMLElement | null,
): ShareHighlightClipboardResult {
  if (!documentRef.body || typeof documentRef.execCommand !== 'function') {
    throw new Error('The legacy browser copy command is unavailable.')
  }

  const textarea = documentRef.createElement('textarea')
  const previouslyFocused = focusTarget ?? documentRef.activeElement
  const dialogContainer = previouslyFocused?.closest?.('[role="dialog"]')
  const container = dialogContainer && 'appendChild' in dialogContainer && 'removeChild' in dialogContainer
    ? dialogContainer
    : documentRef.body
  let appended = false

  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.tabIndex = -1
  textarea.style.position = 'fixed'
  textarea.style.inset = '0 auto auto -9999px'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  textarea.style.fontSize = '16px'

  try {
    // Keep the temporary focus target inside a modal dialog's focus scope. Radix
    // otherwise immediately pulls focus away from a body-level textarea, which
    // makes execCommand('copy') unreliable in older iOS/WebKit browsers.
    container.appendChild(textarea)
    appended = true
    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    if (!documentRef.execCommand('copy')) {
      throw new Error('The legacy browser copy command was rejected.')
    }
    return { method: 'exec-command' }
  } finally {
    if (appended) container.removeChild(textarea)
    if (
      typeof HTMLElement !== 'undefined'
      && previouslyFocused instanceof HTMLElement
      && previouslyFocused.isConnected
    ) {
      previouslyFocused.focus({ preventScroll: true })
    }
  }
}

export async function copyShareHighlightText(
  text: string,
  options: ShareHighlightClipboardOptions = {}
): Promise<ShareHighlightClipboardResult> {
  const navigatorRef = options.navigator ?? defaultClipboardNavigator()
  let clipboardError: unknown

  if (navigatorRef?.clipboard?.writeText) {
    try {
      await navigatorRef.clipboard.writeText(text)
      return { method: 'clipboard-api' }
    } catch (error) {
      clipboardError = error
    }
  }

  const documentRef = options.document ?? defaultClipboardDocument()
  if (!documentRef) {
    throw makeClipboardFallbackError(
      clipboardError,
      new Error('A browser document is unavailable.')
    )
  }

  try {
    return copyWithHiddenTextarea(text, documentRef, options.focusTarget)
  } catch (fallbackError) {
    throw makeClipboardFallbackError(clipboardError, fallbackError)
  }
}
