import type { ShareHighlightShareResult } from './types'

interface ShareHighlightNavigator {
  canShare?: (data: ShareData) => boolean
  share?: (data: ShareData) => Promise<void>
}

interface ShareHighlightUrlApi {
  createObjectURL: (value: Blob) => string
  revokeObjectURL: (url: string) => void
}

interface ShareHighlightDownloadDocument {
  body: Pick<HTMLElement, 'appendChild' | 'removeChild'>
  createElement: (tagName: 'a') => HTMLAnchorElement
}

export interface ShareHighlightDownloadOptions {
  document?: ShareHighlightDownloadDocument
  urlApi?: ShareHighlightUrlApi
  scheduleRevoke?: (callback: () => void) => void
}

export interface ShareHighlightShareOptions extends ShareHighlightDownloadOptions {
  navigator?: ShareHighlightNavigator
  title?: string
  text?: string
}

function defaultNavigator(): ShareHighlightNavigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator
}

function defaultDocument(): ShareHighlightDownloadDocument | undefined {
  return typeof document === 'undefined' ? undefined : document
}

function defaultUrlApi(): ShareHighlightUrlApi | undefined {
  return typeof URL === 'undefined' ? undefined : URL
}

export function isShareHighlightCancellation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
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
    const scheduleRevoke = options.scheduleRevoke ?? (callback => {
      setTimeout(callback, 0)
    })
    scheduleRevoke(() => urlApi.revokeObjectURL(objectUrl))
  }
}

export async function shareHighlightFile(
  file: File,
  options: ShareHighlightShareOptions = {}
): Promise<ShareHighlightShareResult> {
  const navigatorRef = options.navigator ?? defaultNavigator()
  const shareData: ShareData = {
    files: [file],
    ...(options.title?.trim() ? { title: options.title.trim() } : {}),
    ...(options.text?.trim() ? { text: options.text.trim() } : {}),
  }
  let shareError: unknown

  if (navigatorRef?.share && navigatorRef.canShare) {
    let supportsFileShare = false
    try {
      supportsFileShare = navigatorRef.canShare({ files: [file] })
    } catch (error) {
      shareError = error
    }

    if (supportsFileShare) {
      try {
        await navigatorRef.share(shareData)
        return { status: 'shared', method: 'web-share' }
      } catch (error) {
        if (isShareHighlightCancellation(error)) {
          return { status: 'cancelled', method: 'web-share' }
        }
        shareError = error
      }
    }
  }

  downloadShareHighlightFile(file, options)
  return {
    status: 'downloaded',
    method: 'download',
    ...(shareError === undefined ? {} : { shareError }),
  }
}
