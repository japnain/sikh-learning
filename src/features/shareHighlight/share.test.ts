import { describe, expect, it, vi } from 'vitest'
import {
  createShareHighlightZip,
  downloadShareHighlightFile,
  downloadShareHighlightFiles,
  isShareHighlightCancellation,
  shareHighlightFile,
  shareHighlightFiles,
  type ShareHighlightDownloadOptions,
} from './share'

function makeFile() {
  return new File([new Blob(['png'], { type: 'image/png' })], 'naamras-highlight.png', { type: 'image/png' })
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer())

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.readAsArrayBuffer(blob)
  })
}

async function parseStoredZip(file: File) {
  const bytes = await readBlobBytes(file)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const decoder = new TextDecoder()
  const localEntries: Array<{
    name: string
    data: Uint8Array
    crc32: number
    method: number
    offset: number
  }> = []
  let offset = 0

  while (view.getUint32(offset, true) === 0x04034b50) {
    const entryOffset = offset
    const method = view.getUint16(offset + 8, true)
    const crc = view.getUint32(offset + 14, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const nameStart = offset + 30
    const dataStart = nameStart + nameLength + extraLength
    localEntries.push({
      name: decoder.decode(bytes.slice(nameStart, nameStart + nameLength)),
      data: bytes.slice(dataStart, dataStart + compressedSize),
      crc32: crc,
      method,
      offset: entryOffset,
    })
    offset = dataStart + compressedSize
  }

  const centralDirectoryOffset = offset
  const centralEntries: Array<{ name: string; localHeaderOffset: number; method: number }> = []
  while (view.getUint32(offset, true) === 0x02014b50) {
    const method = view.getUint16(offset + 10, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const nameStart = offset + 46
    centralEntries.push({
      name: decoder.decode(bytes.slice(nameStart, nameStart + nameLength)),
      localHeaderOffset,
      method,
    })
    offset = nameStart + nameLength + extraLength + commentLength
  }

  const endRecordOffset = offset
  return {
    bytes,
    localEntries,
    centralEntries,
    centralDirectoryOffset,
    endRecordOffset,
    endSignature: view.getUint32(endRecordOffset, true),
    entryCount: view.getUint16(endRecordOffset + 10, true),
    recordedDirectoryOffset: view.getUint32(endRecordOffset + 16, true),
  }
}

function makeDownloadEnvironment() {
  const anchor = {
    href: '',
    download: '',
    rel: '',
    style: { display: '' },
    click: vi.fn(),
  } as unknown as HTMLAnchorElement
  const appendChild = vi.fn()
  const removeChild = vi.fn()
  const createObjectURL = vi.fn(() => 'blob:naamras-highlight')
  const revokeObjectURL = vi.fn()
  const scheduleRevoke = vi.fn((callback: () => void) => callback())
  const options: ShareHighlightDownloadOptions = {
    document: {
      body: { appendChild, removeChild },
      createElement: vi.fn(() => anchor),
    },
    urlApi: { createObjectURL, revokeObjectURL },
    scheduleRevoke,
  }

  return {
    anchor,
    appendChild,
    removeChild,
    createObjectURL,
    revokeObjectURL,
    scheduleRevoke,
    options,
  }
}

describe('shareHighlightFile', () => {
  it('uses Web Share only after canShare confirms file support', async () => {
    const file = makeFile()
    const canShare = vi.fn(() => true)
    const share = vi.fn().mockResolvedValue(undefined)

    const result = await shareHighlightFile(file, {
      navigator: { canShare, share },
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight from naamras.xyz',
    })

    expect(canShare).toHaveBeenCalledWith({ files: [file] })
    expect(share).toHaveBeenCalledWith({
      files: [file],
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight from naamras.xyz',
    })
    expect(result).toEqual({ status: 'shared', method: 'web-share' })
  })

  it('returns cancellation without triggering an unwanted download', async () => {
    const error = Object.assign(new Error('dismissed'), { name: 'AbortError' })
    const result = await shareHighlightFile(makeFile(), {
      navigator: {
        canShare: () => true,
        share: vi.fn().mockRejectedValue(error),
      },
    })

    expect(result).toEqual({ status: 'cancelled', method: 'web-share' })
  })

  it('falls back to an object-URL download when native sharing fails', async () => {
    const download = makeDownloadEnvironment()
    const error = new Error('share unavailable')

    const result = await shareHighlightFile(makeFile(), {
      ...download.options,
      navigator: {
        canShare: () => true,
        share: vi.fn().mockRejectedValue(error),
      },
    })

    expect(download.anchor.click).toHaveBeenCalledTimes(1)
    expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:naamras-highlight')
    expect(result).toEqual({ status: 'downloaded', method: 'download', shareError: error })
  })

  it('downloads directly when the browser cannot share files', async () => {
    const download = makeDownloadEnvironment()
    const share = vi.fn()

    const result = await shareHighlightFile(makeFile(), {
      ...download.options,
      navigator: { canShare: () => false, share },
    })

    expect(share).not.toHaveBeenCalled()
    expect(download.anchor.click).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ status: 'downloaded', method: 'download' })
  })
})

describe('shareHighlightFiles', () => {
  it('checks and shares the exact ordered file set in one invocation', async () => {
    const files = [
      new File(['first'], 'naamras-01.png', { type: 'image/png' }),
      new File(['second'], 'naamras-02.png', { type: 'image/png' }),
      new File(['third'], 'naamras-03.png', { type: 'image/png' }),
    ]
    const canShare = vi.fn(() => true)
    const share = vi.fn().mockResolvedValue(undefined)

    const result = await shareHighlightFiles(files, {
      navigator: { canShare, share },
      title: ' NaamRas Hukamnama ',
      text: ' A complete Hukamnama set ',
    })

    expect(canShare).toHaveBeenCalledTimes(1)
    expect(canShare).toHaveBeenCalledWith({ files })
    expect(share).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledWith({
      files,
      title: 'NaamRas Hukamnama',
      text: 'A complete Hukamnama set',
    })
    expect(result).toEqual({ status: 'shared', method: 'web-share' })
  })

  it('treats cancellation as final without creating a fallback archive', async () => {
    const download = makeDownloadEnvironment()
    const error = Object.assign(new Error('dismissed'), { name: 'AbortError' })
    const files = [
      new File(['first'], 'naamras-01.png', { type: 'image/png' }),
      new File(['second'], 'naamras-02.png', { type: 'image/png' }),
    ]

    const result = await shareHighlightFiles(files, {
      ...download.options,
      navigator: {
        canShare: () => true,
        share: vi.fn().mockRejectedValue(error),
      },
    })

    expect(result).toEqual({ status: 'cancelled', method: 'web-share' })
    expect(download.createObjectURL).not.toHaveBeenCalled()
    expect(download.anchor.click).not.toHaveBeenCalled()
  })

  it('downloads one ordered ZIP when multi-file sharing is unsupported', async () => {
    const download = makeDownloadEnvironment()
    const files = [
      new File(['first'], 'naamras-01.png', { type: 'image/png' }),
      new File(['second'], 'naamras-02.png', { type: 'image/png' }),
    ]
    const share = vi.fn()

    const result = await shareHighlightFiles(files, {
      ...download.options,
      archiveName: 'naamras-hukamnama.zip',
      navigator: { canShare: () => false, share },
    })

    expect(share).not.toHaveBeenCalled()
    expect(download.anchor.click).toHaveBeenCalledTimes(1)
    expect(download.anchor.download).toBe('naamras-hukamnama.zip')
    const archive = download.createObjectURL.mock.calls[0]?.[0] as File
    expect(archive).toBeInstanceOf(File)
    expect(archive.type).toBe('application/zip')
    expect((await parseStoredZip(archive)).localEntries.map(entry => entry.name)).toEqual([
      'naamras-01.png',
      'naamras-02.png',
    ])
    expect(result).toEqual({ status: 'downloaded', method: 'download' })
  })

  it('downloads one ZIP and preserves the error when multi-file sharing fails', async () => {
    const download = makeDownloadEnvironment()
    const error = Object.assign(new Error('share target failed'), { name: 'DataError' })
    const files = [
      new File(['first'], 'naamras-01.png', { type: 'image/png' }),
      new File(['second'], 'naamras-02.png', { type: 'image/png' }),
    ]
    const share = vi.fn().mockRejectedValue(error)

    const result = await shareHighlightFiles(files, {
      ...download.options,
      navigator: { canShare: () => true, share },
    })

    expect(share).toHaveBeenCalledTimes(1)
    expect(download.anchor.click).toHaveBeenCalledTimes(1)
    expect(download.anchor.download).toBe('naamras-highlights.zip')
    expect(result).toEqual({ status: 'downloaded', method: 'download', shareError: error })
  })
})

describe('createShareHighlightZip', () => {
  it('creates a deterministic, valid stored ZIP with ordered filenames and records', async () => {
    const files = [
      new File(['123456789'], 'first.png', { type: 'image/png' }),
      new File(['second'], 'second.png', { type: 'image/png' }),
    ]
    const archive = await createShareHighlightZip(files)
    const parsed = await parseStoredZip(archive)

    expect(archive.name).toBe('naamras-highlights.zip')
    expect(archive.type).toBe('application/zip')
    expect(Array.from(parsed.bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
    expect(parsed.endSignature).toBe(0x06054b50)
    expect(parsed.entryCount).toBe(2)
    expect(parsed.recordedDirectoryOffset).toBe(parsed.centralDirectoryOffset)
    expect(parsed.endRecordOffset).toBe(parsed.bytes.length - 22)
    expect(parsed.localEntries.map(entry => entry.name)).toEqual(['first.png', 'second.png'])
    expect(parsed.centralEntries.map(entry => entry.name)).toEqual(['first.png', 'second.png'])
    expect(parsed.centralEntries.map(entry => entry.localHeaderOffset)).toEqual(
      parsed.localEntries.map(entry => entry.offset)
    )
    expect(parsed.localEntries.every(entry => entry.method === 0)).toBe(true)
    expect(parsed.centralEntries.every(entry => entry.method === 0)).toBe(true)
    expect(parsed.localEntries[0]?.crc32).toBe(0xcbf43926)
    expect(new TextDecoder().decode(parsed.localEntries[0]?.data)).toBe('123456789')
    expect(new TextDecoder().decode(parsed.localEntries[1]?.data)).toBe('second')
  })

  it('sanitizes paths, disambiguates duplicate names, and respects the archive name', async () => {
    const archive = await createShareHighlightZip([
      new File(['one'], '../card.png', { type: 'image/png' }),
      new File(['two'], 'CARD.PNG', { type: 'image/png' }),
    ], { archiveName: '../daily-hukamnama' })

    expect(archive.name).toBe('daily-hukamnama.zip')
    expect((await parseStoredZip(archive)).localEntries.map(entry => entry.name)).toEqual([
      'card.png',
      'CARD-2.PNG',
    ])
  })
})

describe('downloadShareHighlightFile', () => {
  it('uses the file name, removes the temporary anchor, and revokes the URL', () => {
    const download = makeDownloadEnvironment()
    const file = makeFile()

    downloadShareHighlightFile(file, download.options)

    expect(download.createObjectURL).toHaveBeenCalledWith(file)
    expect(download.anchor.download).toBe('naamras-highlight.png')
    expect(download.appendChild).toHaveBeenCalledWith(download.anchor)
    expect(download.removeChild).toHaveBeenCalledWith(download.anchor)
    expect(download.scheduleRevoke).toHaveBeenCalledTimes(1)
    expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:naamras-highlight')
  })

  it('keeps the original single file when using the multi-file download helper', async () => {
    const download = makeDownloadEnvironment()
    const file = makeFile()

    const downloaded = await downloadShareHighlightFiles([file], download.options)

    expect(downloaded).toBe(file)
    expect(download.createObjectURL).toHaveBeenCalledWith(file)
    expect(download.anchor.download).toBe(file.name)
  })
})

describe('isShareHighlightCancellation', () => {
  it('recognizes AbortError by name across browser realms', () => {
    expect(isShareHighlightCancellation({ name: 'AbortError' })).toBe(true)
    expect(isShareHighlightCancellation({ name: 'NotAllowedError' })).toBe(false)
    expect(isShareHighlightCancellation(null)).toBe(false)
  })
})
