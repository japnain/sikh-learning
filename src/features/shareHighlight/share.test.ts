import { describe, expect, it, vi } from 'vitest'
import {
  downloadShareHighlightFile,
  isShareHighlightCancellation,
  shareHighlightFile,
  type ShareHighlightDownloadOptions,
} from './share'

function makeFile() {
  return new File([new Blob(['png'], { type: 'image/png' })], 'naamras-highlight.png', { type: 'image/png' })
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
})

describe('isShareHighlightCancellation', () => {
  it('recognizes AbortError by name across browser realms', () => {
    expect(isShareHighlightCancellation({ name: 'AbortError' })).toBe(true)
    expect(isShareHighlightCancellation({ name: 'NotAllowedError' })).toBe(false)
    expect(isShareHighlightCancellation(null)).toBe(false)
  })
})
