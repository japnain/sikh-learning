import { describe, expect, it, vi } from 'vitest'
import {
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

  it('treats cancellation as final without downloading any files', async () => {
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

  it('downloads the original PNGs in order when multi-file sharing is unsupported', async () => {
    const download = makeDownloadEnvironment()
    const files = [
      new File(['first'], 'naamras-01.png', { type: 'image/png' }),
      new File(['second'], 'naamras-02.png', { type: 'image/png' }),
    ]
    const share = vi.fn()

    const result = await shareHighlightFiles(files, {
      ...download.options,
      navigator: { canShare: () => false, share },
    })

    expect(share).not.toHaveBeenCalled()
    expect(download.anchor.click).toHaveBeenCalledTimes(2)
    expect(download.createObjectURL.mock.calls.map(([file]) => file)).toEqual(files)
    expect(download.scheduleRevoke).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ status: 'downloaded', method: 'download' })
  })

  it('downloads the original PNGs and preserves the error when multi-file sharing fails', async () => {
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
    expect(download.anchor.click).toHaveBeenCalledTimes(2)
    expect(download.createObjectURL.mock.calls.map(([file]) => file)).toEqual(files)
    expect(result).toEqual({ status: 'downloaded', method: 'download', shareError: error })
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

    const downloaded = downloadShareHighlightFiles([file], download.options)

    expect(downloaded).toEqual([file])
    expect(download.createObjectURL).toHaveBeenCalledWith(file)
    expect(download.anchor.download).toBe(file.name)
  })

  it('downloads every original PNG through the existing mechanism in order', () => {
    const download = makeDownloadEnvironment()
    const files = [
      new File(['one'], 'naamras-01.png', { type: 'image/png' }),
      new File(['two'], 'naamras-02.png', { type: 'image/png' }),
      new File(['three'], 'naamras-03.png', { type: 'image/png' }),
    ]

    const downloaded = downloadShareHighlightFiles(files, download.options)

    expect(downloaded).toEqual(files)
    expect(download.createObjectURL.mock.calls.map(([file]) => file)).toEqual(files)
    expect(download.anchor.click).toHaveBeenCalledTimes(3)
    expect(download.appendChild).toHaveBeenCalledTimes(3)
    expect(download.removeChild).toHaveBeenCalledTimes(3)
  })
})

describe('isShareHighlightCancellation', () => {
  it('recognizes AbortError by name across browser realms', () => {
    expect(isShareHighlightCancellation({ name: 'AbortError' })).toBe(true)
    expect(isShareHighlightCancellation({ name: 'NotAllowedError' })).toBe(false)
    expect(isShareHighlightCancellation(null)).toBe(false)
  })
})
