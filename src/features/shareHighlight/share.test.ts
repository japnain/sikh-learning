import { describe, expect, it, vi } from 'vitest'
import {
  copyShareHighlightText,
  downloadShareHighlightFile,
  downloadShareHighlightFiles,
  isShareHighlightCancellation,
  SHARE_HIGHLIGHT_OBJECT_URL_REVOKE_DELAY_MS,
  shareHighlightFile,
  shareHighlightFiles,
  type ShareHighlightClipboardOptions,
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
  const scheduleRevoke = vi.fn((callback: () => void, delayMs: number) => {
    void delayMs
    callback()
  })
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

function makeClipboardEnvironment(execCommandResult: boolean | Error = true) {
  const textarea = document.createElement('textarea')
  const focus = vi.spyOn(textarea, 'focus').mockImplementation(() => undefined)
  const select = vi.spyOn(textarea, 'select').mockImplementation(() => undefined)
  const setSelectionRange = vi.spyOn(textarea, 'setSelectionRange').mockImplementation(() => undefined)
  const appendChild = vi.fn()
  const removeChild = vi.fn()
  const createElement = vi.fn(() => textarea)
  const execCommand = vi.fn(() => {
    if (execCommandResult instanceof Error) throw execCommandResult
    return execCommandResult
  })
  const options: ShareHighlightClipboardOptions = {
    navigator: {},
    document: {
      body: { appendChild, removeChild },
      createElement,
      execCommand,
      activeElement: null,
    },
  }

  return {
    textarea,
    focus,
    select,
    setSelectionRange,
    appendChild,
    removeChild,
    createElement,
    execCommand,
    options,
  }
}

describe('shareHighlightFile', () => {
  it('capability-checks and shares the exact payload including its semantic URL', async () => {
    const file = makeFile()
    const canShare = vi.fn(() => true)
    const share = vi.fn().mockResolvedValue(undefined)

    const result = await shareHighlightFile(file, {
      navigator: { canShare, share },
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight from naamras.xyz',
      url: 'https://naamras.xyz/study?shabadId=1&verseId=2',
    })

    const exactPayload = {
      files: [file],
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight from naamras.xyz',
      url: 'https://naamras.xyz/study?shabadId=1&verseId=2',
    }
    expect(canShare).toHaveBeenCalledTimes(1)
    expect(canShare).toHaveBeenCalledWith(exactPayload)
    expect(share).toHaveBeenCalledWith(exactPayload)
    expect(result).toEqual({ status: 'shared', method: 'web-share', payload: 'full' })
  })

  it('retries without the URL while preserving the share caption and title', async () => {
    const file = makeFile()
    const canShare = vi.fn((data: ShareData) => !data.url)
    const share = vi.fn().mockResolvedValue(undefined)

    const result = await shareHighlightFile(file, {
      navigator: { canShare, share },
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight',
      url: 'https://naamras.xyz/study?shabadId=1&verseId=2',
    })

    expect(canShare).toHaveBeenNthCalledWith(1, {
      files: [file],
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight',
      url: 'https://naamras.xyz/study?shabadId=1&verseId=2',
    })
    expect(canShare).toHaveBeenNthCalledWith(2, {
      files: [file],
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight',
    })
    expect(canShare).toHaveBeenCalledTimes(2)
    expect(share).toHaveBeenCalledWith({
      files: [file],
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight',
    })
    expect(result).toEqual({ status: 'shared', method: 'web-share', payload: 'without-url' })
  })

  it('falls back to a file-only native payload after both richer payloads are unsupported', async () => {
    const file = makeFile()
    const canShare = vi.fn((data: ShareData) => !data.title && !data.text && !data.url)
    const share = vi.fn().mockResolvedValue(undefined)

    const result = await shareHighlightFile(file, {
      navigator: { canShare, share },
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight',
      url: 'https://naamras.xyz/study?shabadId=1&verseId=2',
    })

    expect(canShare).toHaveBeenNthCalledWith(1, {
      files: [file],
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight',
      url: 'https://naamras.xyz/study?shabadId=1&verseId=2',
    })
    expect(canShare).toHaveBeenNthCalledWith(2, {
      files: [file],
      title: 'NaamRas highlight',
      text: 'A Gurbani highlight',
    })
    expect(canShare).toHaveBeenNthCalledWith(3, { files: [file] })
    expect(share).toHaveBeenCalledWith({ files: [file] })
    expect(result).toEqual({ status: 'shared', method: 'web-share', payload: 'file-only' })
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

  it('returns a native-share failure without starting an unwanted download', async () => {
    const download = makeDownloadEnvironment()
    const error = new Error('share unavailable')

    const result = await shareHighlightFile(makeFile(), {
      ...download.options,
      navigator: {
        canShare: () => true,
        share: vi.fn().mockRejectedValue(error),
      },
    })

    expect(download.anchor.click).not.toHaveBeenCalled()
    expect(download.createObjectURL).not.toHaveBeenCalled()
    expect(result).toEqual({ status: 'failed', method: 'web-share', error })
  })

  it('returns unsupported without downloading when the browser cannot share files', async () => {
    const download = makeDownloadEnvironment()
    const share = vi.fn()

    const result = await shareHighlightFile(makeFile(), {
      ...download.options,
      navigator: { canShare: () => false, share },
    })

    expect(share).not.toHaveBeenCalled()
    expect(download.anchor.click).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'unsupported',
      method: 'web-share',
      reason: 'file-share-unsupported',
    })
  })

  it('reports an unavailable API when share or its capability check is missing', async () => {
    const file = makeFile()
    const share = vi.fn()

    await expect(shareHighlightFile(file, {
      navigator: { share },
    })).resolves.toEqual({
      status: 'unsupported',
      method: 'web-share',
      reason: 'api-unavailable',
    })
    expect(share).not.toHaveBeenCalled()
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
      url: ' https://naamras.xyz/study?hukamnamaDate=2026-07-15 ',
    })

    expect(canShare).toHaveBeenCalledTimes(1)
    expect(canShare).toHaveBeenCalledWith({
      files,
      title: 'NaamRas Hukamnama',
      text: 'A complete Hukamnama set',
      url: 'https://naamras.xyz/study?hukamnamaDate=2026-07-15',
    })
    expect(share).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledWith({
      files,
      title: 'NaamRas Hukamnama',
      text: 'A complete Hukamnama set',
      url: 'https://naamras.xyz/study?hukamnamaDate=2026-07-15',
    })
    expect(result).toEqual({ status: 'shared', method: 'web-share', payload: 'full' })
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

  it('does not trigger multiple downloads when multi-file sharing is unsupported', async () => {
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
    expect(download.anchor.click).not.toHaveBeenCalled()
    expect(download.createObjectURL).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'unsupported',
      method: 'web-share',
      reason: 'file-share-unsupported',
    })
  })

  it('preserves a multi-file native-share error without downloading', async () => {
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
    expect(download.anchor.click).not.toHaveBeenCalled()
    expect(download.createObjectURL).not.toHaveBeenCalled()
    expect(result).toEqual({ status: 'failed', method: 'web-share', error })
  })

  it('preserves the latest capability error when no file payload is supported', async () => {
    const error = new TypeError('unsupported share data')
    const canShare = vi.fn(() => {
      throw error
    })

    const result = await shareHighlightFiles([
      new File(['first'], 'naamras-01.png', { type: 'image/png' }),
    ], {
      navigator: { canShare, share: vi.fn() },
      title: 'NaamRas Hukamnama',
    })

    expect(result).toEqual({
      status: 'unsupported',
      method: 'web-share',
      reason: 'file-share-unsupported',
      error,
    })
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
    expect(download.scheduleRevoke).toHaveBeenCalledWith(
      expect.any(Function),
      SHARE_HIGHLIGHT_OBJECT_URL_REVOKE_DELAY_MS
    )
    expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:naamras-highlight')
  })

  it('keeps the object URL alive for the WebKit-safe default delay', () => {
    vi.useFakeTimers()
    const download = makeDownloadEnvironment()

    try {
      downloadShareHighlightFile(makeFile(), {
        document: download.options.document,
        urlApi: download.options.urlApi,
      })

      expect(download.revokeObjectURL).not.toHaveBeenCalled()
      vi.advanceTimersByTime(SHARE_HIGHLIGHT_OBJECT_URL_REVOKE_DELAY_MS - 1)
      expect(download.revokeObjectURL).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:naamras-highlight')
    } finally {
      vi.useRealTimers()
    }
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

describe('copyShareHighlightText', () => {
  it('uses the asynchronous Clipboard API when it succeeds', async () => {
    const clipboard = makeClipboardEnvironment()
    const writeText = vi.fn().mockResolvedValue(undefined)

    const result = await copyShareHighlightText('ਸਤਿ ਨਾਮੁ', {
      ...clipboard.options,
      navigator: { clipboard: { writeText } },
    })

    expect(writeText).toHaveBeenCalledWith('ਸਤਿ ਨਾਮੁ')
    expect(clipboard.createElement).not.toHaveBeenCalled()
    expect(result).toEqual({ method: 'clipboard-api' })
  })

  it('uses the hidden-textarea fallback when the Clipboard API is missing', async () => {
    const clipboard = makeClipboardEnvironment()

    const result = await copyShareHighlightText('Daily Hukamnama', clipboard.options)

    expect(clipboard.textarea.value).toBe('Daily Hukamnama')
    expect(clipboard.textarea).toHaveAttribute('readonly')
    expect(clipboard.textarea).toHaveAttribute('aria-hidden', 'true')
    expect(clipboard.appendChild).toHaveBeenCalledWith(clipboard.textarea)
    expect(clipboard.focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(clipboard.select).toHaveBeenCalledTimes(1)
    expect(clipboard.setSelectionRange).toHaveBeenCalledWith(0, 'Daily Hukamnama'.length)
    expect(clipboard.execCommand).toHaveBeenCalledWith('copy')
    expect(clipboard.removeChild).toHaveBeenCalledWith(clipboard.textarea)
    expect(result).toEqual({ method: 'exec-command' })
  })

  it('keeps the legacy copy target inside a modal dialog and restores its originating focus', async () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    const copyButton = document.createElement('button')
    copyButton.textContent = 'Copy full text'
    dialog.appendChild(copyButton)
    document.body.appendChild(dialog)
    copyButton.focus()

    const focusGuard = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) copyButton.focus()
    }
    document.addEventListener('focusin', focusGuard)
    const execCommand = vi.fn(() => {
      expect(document.activeElement).toBeInstanceOf(HTMLTextAreaElement)
      expect(document.activeElement?.parentElement).toBe(dialog)
      return true
    })

    try {
      await expect(copyShareHighlightText('Daily Hukamnama', {
        navigator: {},
        document: {
          body: document.body,
          createElement: () => document.createElement('textarea'),
          execCommand,
          activeElement: document.activeElement,
        },
      })).resolves.toEqual({ method: 'exec-command' })

      expect(execCommand).toHaveBeenCalledWith('copy')
      expect(document.activeElement).toBe(copyButton)
      expect(dialog.querySelector('textarea')).toBeNull()
    } finally {
      document.removeEventListener('focusin', focusGuard)
      dialog.remove()
    }
  })

  it('restores dialog focus even when the legacy copy command is rejected', async () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const copyButton = document.createElement('button')
    dialog.appendChild(copyButton)
    document.body.appendChild(dialog)
    copyButton.focus()

    try {
      await expect(copyShareHighlightText('Daily Hukamnama', {
        navigator: {},
        document: {
          body: document.body,
          createElement: () => document.createElement('textarea'),
          execCommand: () => false,
          activeElement: document.activeElement,
        },
      })).rejects.toThrow('Copying share text is not supported in this browser.')

      expect(document.activeElement).toBe(copyButton)
      expect(dialog.querySelector('textarea')).toBeNull()
    } finally {
      dialog.remove()
    }
  })

  it('falls back and cleans up when Clipboard API permission is rejected', async () => {
    const clipboard = makeClipboardEnvironment()
    const writeError = Object.assign(new Error('permission denied'), { name: 'NotAllowedError' })
    const writeText = vi.fn().mockRejectedValue(writeError)

    await expect(copyShareHighlightText('NaamRas', {
      ...clipboard.options,
      navigator: { clipboard: { writeText } },
    })).resolves.toEqual({ method: 'exec-command' })

    expect(writeText).toHaveBeenCalledWith('NaamRas')
    expect(clipboard.execCommand).toHaveBeenCalledWith('copy')
    expect(clipboard.removeChild).toHaveBeenCalledWith(clipboard.textarea)
  })

  it('uses a captured modal trigger after an asynchronous clipboard rejection moves focus', async () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.tabIndex = -1
    const copyButton = document.createElement('button')
    copyButton.textContent = 'Copy full text'
    dialog.appendChild(copyButton)
    document.body.appendChild(dialog)
    copyButton.focus()
    const permissionError = Object.assign(new Error('permission denied'), {
      name: 'NotAllowedError',
    })
    const writeText = vi.fn(async () => {
      dialog.focus()
      throw permissionError
    })
    const execCommand = vi.fn(() => {
      expect(document.activeElement).toBeInstanceOf(HTMLTextAreaElement)
      expect(document.activeElement?.parentElement).toBe(dialog)
      return true
    })

    try {
      await expect(copyShareHighlightText('Daily Hukamnama', {
        navigator: { clipboard: { writeText } },
        focusTarget: copyButton,
        document: {
          body: document.body,
          createElement: () => document.createElement('textarea'),
          execCommand,
          activeElement: document.activeElement,
        },
      })).resolves.toEqual({ method: 'exec-command' })

      expect(execCommand).toHaveBeenCalledWith('copy')
      expect(document.activeElement).toBe(copyButton)
      expect(dialog.querySelector('textarea')).toBeNull()
    } finally {
      dialog.remove()
    }
  })

  it('rejects and still removes the textarea when the legacy command is rejected', async () => {
    const clipboard = makeClipboardEnvironment(false)

    await expect(copyShareHighlightText('NaamRas', clipboard.options)).rejects.toThrow(
      'Copying share text is not supported in this browser.'
    )

    expect(clipboard.appendChild).toHaveBeenCalledWith(clipboard.textarea)
    expect(clipboard.removeChild).toHaveBeenCalledWith(clipboard.textarea)
  })

  it('rejects and still removes the textarea when the legacy command throws', async () => {
    const clipboard = makeClipboardEnvironment(new Error('blocked'))

    await expect(copyShareHighlightText('NaamRas', clipboard.options)).rejects.toThrow(
      'Copying share text is not supported in this browser.'
    )

    expect(clipboard.removeChild).toHaveBeenCalledWith(clipboard.textarea)
  })

  it('rejects without creating a textarea when neither copy API exists', async () => {
    const clipboard = makeClipboardEnvironment()
    const documentWithoutCommand = {
      ...clipboard.options.document!,
      execCommand: undefined,
    }

    await expect(copyShareHighlightText('NaamRas', {
      navigator: {},
      document: documentWithoutCommand,
    })).rejects.toThrow('Copying share text is not supported in this browser.')

    expect(clipboard.createElement).not.toHaveBeenCalled()
    expect(clipboard.appendChild).not.toHaveBeenCalled()
    expect(clipboard.removeChild).not.toHaveBeenCalled()
  })
})

describe('isShareHighlightCancellation', () => {
  it('recognizes AbortError by name across browser realms', () => {
    expect(isShareHighlightCancellation({ name: 'AbortError' })).toBe(true)
    expect(isShareHighlightCancellation({ name: 'NotAllowedError' })).toBe(false)
    expect(isShareHighlightCancellation(null)).toBe(false)
  })
})
