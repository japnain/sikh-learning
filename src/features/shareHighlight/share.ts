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

export interface ShareHighlightArchiveOptions {
  archiveName?: string
}

export interface ShareHighlightFilesDownloadOptions
  extends ShareHighlightDownloadOptions, ShareHighlightArchiveOptions {}

export interface ShareHighlightFilesShareOptions
  extends ShareHighlightShareOptions, ShareHighlightArchiveOptions {}

const DEFAULT_ARCHIVE_NAME = 'naamras-highlights.zip'
const ZIP_UTF8_FLAG = 0x0800
const ZIP_STORED_METHOD = 0
const ZIP_VERSION = 20
const ZIP_DOS_EPOCH_DATE = 0x0021
const ZIP_LOCAL_FILE_HEADER_LENGTH = 30
const ZIP_CENTRAL_DIRECTORY_HEADER_LENGTH = 46
const ZIP_END_OF_CENTRAL_DIRECTORY_LENGTH = 22
const ZIP_MAX_UINT16 = 0xffff
const ZIP_MAX_UINT32 = 0xffffffff

interface ShareHighlightZipEntry {
  nameBytes: Uint8Array<ArrayBuffer>
  data: Uint8Array<ArrayBuffer>
  crc32: number
  localHeaderOffset: number
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

function requireFiles(files: readonly File[]): File[] {
  if (files.length === 0) throw new Error('At least one share highlight file is required.')
  if (files.length > ZIP_MAX_UINT16) throw new Error('Too many share highlight files to archive.')
  return Array.from(files)
}

function sanitizeFileName(value: string, fallback: string): string {
  const baseName = value
    .replaceAll('\\', '/')
    .split('/')
    .at(-1)
    ?.split('')
    .filter(character => {
      const codePoint = character.charCodeAt(0)
      return codePoint > 0x1f && codePoint !== 0x7f
    })
    .join('')
    .trim()

  return baseName && baseName !== '.' && baseName !== '..' ? baseName : fallback
}

function makeUniqueEntryName(file: File, index: number, usedNames: Set<string>): string {
  const fallback = `naamras-highlight-${String(index + 1).padStart(2, '0')}.png`
  const initialName = sanitizeFileName(file.name, fallback)
  let candidate = initialName
  let duplicateIndex = 2

  while (usedNames.has(candidate.toLocaleLowerCase('en-US'))) {
    const extensionIndex = initialName.lastIndexOf('.')
    const stem = extensionIndex > 0 ? initialName.slice(0, extensionIndex) : initialName
    const extension = extensionIndex > 0 ? initialName.slice(extensionIndex) : ''
    candidate = `${stem}-${duplicateIndex}${extension}`
    duplicateIndex += 1
  }

  usedNames.add(candidate.toLocaleLowerCase('en-US'))
  return candidate
}

function resolveArchiveName(value?: string): string {
  const sanitized = sanitizeFileName(value ?? '', DEFAULT_ARCHIVE_NAME)
  return sanitized.toLocaleLowerCase('en-US').endsWith('.zip') ? sanitized : `${sanitized}.zip`
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer())
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error ?? new Error('Could not read share highlight file.'))
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
      reader.readAsArrayBuffer(blob)
    })
  }

  throw new Error('Reading share highlight files requires Blob arrayBuffer or FileReader support.')
}

function crc32(bytes: Uint8Array): number {
  let crc = ZIP_MAX_UINT32

  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }

  return (crc ^ ZIP_MAX_UINT32) >>> 0
}

function setZipUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function setZipUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true)
}

function createLocalFileHeader(entry: ShareHighlightZipEntry): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(ZIP_LOCAL_FILE_HEADER_LENGTH + entry.nameBytes.length)
  const view = new DataView(header.buffer)
  setZipUint32(view, 0, 0x04034b50)
  setZipUint16(view, 4, ZIP_VERSION)
  setZipUint16(view, 6, ZIP_UTF8_FLAG)
  setZipUint16(view, 8, ZIP_STORED_METHOD)
  setZipUint16(view, 10, 0)
  setZipUint16(view, 12, ZIP_DOS_EPOCH_DATE)
  setZipUint32(view, 14, entry.crc32)
  setZipUint32(view, 18, entry.data.length)
  setZipUint32(view, 22, entry.data.length)
  setZipUint16(view, 26, entry.nameBytes.length)
  setZipUint16(view, 28, 0)
  header.set(entry.nameBytes, ZIP_LOCAL_FILE_HEADER_LENGTH)
  return header
}

function createCentralDirectoryHeader(entry: ShareHighlightZipEntry): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(ZIP_CENTRAL_DIRECTORY_HEADER_LENGTH + entry.nameBytes.length)
  const view = new DataView(header.buffer)
  setZipUint32(view, 0, 0x02014b50)
  setZipUint16(view, 4, ZIP_VERSION)
  setZipUint16(view, 6, ZIP_VERSION)
  setZipUint16(view, 8, ZIP_UTF8_FLAG)
  setZipUint16(view, 10, ZIP_STORED_METHOD)
  setZipUint16(view, 12, 0)
  setZipUint16(view, 14, ZIP_DOS_EPOCH_DATE)
  setZipUint32(view, 16, entry.crc32)
  setZipUint32(view, 20, entry.data.length)
  setZipUint32(view, 24, entry.data.length)
  setZipUint16(view, 28, entry.nameBytes.length)
  setZipUint16(view, 30, 0)
  setZipUint16(view, 32, 0)
  setZipUint16(view, 34, 0)
  setZipUint16(view, 36, 0)
  setZipUint32(view, 38, 0)
  setZipUint32(view, 42, entry.localHeaderOffset)
  header.set(entry.nameBytes, ZIP_CENTRAL_DIRECTORY_HEADER_LENGTH)
  return header
}

function createEndOfCentralDirectory(entryCount: number, directorySize: number, directoryOffset: number) {
  const record = new Uint8Array(ZIP_END_OF_CENTRAL_DIRECTORY_LENGTH)
  const view = new DataView(record.buffer)
  setZipUint32(view, 0, 0x06054b50)
  setZipUint16(view, 4, 0)
  setZipUint16(view, 6, 0)
  setZipUint16(view, 8, entryCount)
  setZipUint16(view, 10, entryCount)
  setZipUint32(view, 12, directorySize)
  setZipUint32(view, 16, directoryOffset)
  setZipUint16(view, 20, 0)
  return record
}

export async function createShareHighlightZip(
  files: readonly File[],
  options: ShareHighlightArchiveOptions = {}
): Promise<File> {
  const orderedFiles = requireFiles(files)
  const textEncoder = new TextEncoder()
  const usedNames = new Set<string>()
  const entries: ShareHighlightZipEntry[] = []
  let localHeaderOffset = 0

  for (const [index, file] of orderedFiles.entries()) {
    const data = await readBlobBytes(file)
    if (data.length > ZIP_MAX_UINT32) throw new Error('A share highlight file is too large to archive.')

    const entryName = makeUniqueEntryName(file, index, usedNames)
    const nameBytes = textEncoder.encode(entryName)
    if (nameBytes.length > ZIP_MAX_UINT16) throw new Error('A share highlight file name is too long to archive.')

    const entry: ShareHighlightZipEntry = {
      nameBytes,
      data,
      crc32: crc32(data),
      localHeaderOffset,
    }
    entries.push(entry)
    localHeaderOffset += ZIP_LOCAL_FILE_HEADER_LENGTH + nameBytes.length + data.length
    if (localHeaderOffset > ZIP_MAX_UINT32) throw new Error('Share highlight archive is too large.')
  }

  const localParts = entries.flatMap(entry => [createLocalFileHeader(entry), entry.data])
  const centralParts = entries.map(createCentralDirectoryHeader)
  const directorySize = centralParts.reduce((size, part) => size + part.length, 0)
  if (directorySize > ZIP_MAX_UINT32 || localHeaderOffset + directorySize > ZIP_MAX_UINT32) {
    throw new Error('Share highlight archive is too large.')
  }

  const endRecord = createEndOfCentralDirectory(entries.length, directorySize, localHeaderOffset)
  return new File(
    [...localParts, ...centralParts, endRecord],
    resolveArchiveName(options.archiveName),
    { type: 'application/zip' }
  )
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

export async function downloadShareHighlightFiles(
  files: readonly File[],
  options: ShareHighlightFilesDownloadOptions = {}
): Promise<File> {
  const orderedFiles = requireFiles(files)
  const downloadFile = orderedFiles.length === 1
    ? orderedFiles[0]
    : await createShareHighlightZip(orderedFiles, options)
  downloadShareHighlightFile(downloadFile, options)
  return downloadFile
}

export async function shareHighlightFiles(
  files: readonly File[],
  options: ShareHighlightFilesShareOptions = {}
): Promise<ShareHighlightShareResult> {
  const orderedFiles = requireFiles(files)
  const navigatorRef = options.navigator ?? defaultNavigator()
  const shareData: ShareData = {
    files: orderedFiles,
    ...(options.title?.trim() ? { title: options.title.trim() } : {}),
    ...(options.text?.trim() ? { text: options.text.trim() } : {}),
  }
  let shareError: unknown

  if (navigatorRef?.share && navigatorRef.canShare) {
    let supportsFileShare = false
    try {
      supportsFileShare = navigatorRef.canShare({ files: orderedFiles })
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

  await downloadShareHighlightFiles(orderedFiles, options)
  return {
    status: 'downloaded',
    method: 'download',
    ...(shareError === undefined ? {} : { shareError }),
  }
}

export async function shareHighlightFile(
  file: File,
  options: ShareHighlightShareOptions = {}
): Promise<ShareHighlightShareResult> {
  return shareHighlightFiles([file], options)
}
