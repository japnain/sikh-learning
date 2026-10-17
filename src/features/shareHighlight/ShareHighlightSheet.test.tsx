import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ShareHighlightSheet, { type ShareHighlightContent } from './ShareHighlightSheet'
import { getCanonicalSourceUrl, getHukamnamaShareUrl } from './sourceUrl'
import type { ShareHighlightStorySelection } from './types'

const ARTWORK_PREFERENCE_KEY = 'naamras.share-highlight.hukamnama-artwork.v1'

const mocks = vi.hoisted(() => {
  return {
    exportPng: vi.fn(),
    exportStoryPng: vi.fn(),
    shareFile: vi.fn(),
    shareFiles: vi.fn(),
    downloadFile: vi.fn(),
    downloadFiles: vi.fn(),
    copyText: vi.fn(),
    isNative: vi.fn(),
    saveNative: vi.fn(),
    ImageTooLongError: class HukamnamaImageTooLongError extends RangeError {},
  }
})

vi.mock('./renderer', () => ({
  HukamnamaImageTooLongError: mocks.ImageTooLongError,
  exportShareHighlightPng: mocks.exportPng,
  exportShareHighlightHukamnamaPng: async (...args: unknown[]) => {
    const result = await mocks.exportStoryPng(...args)
    if (result && typeof result === 'object' && 'pages' in result) return result
    return {
      pages: [result],
      files: [result.file],
      totalLineCount: result.selection.totalLineCount,
    }
  },
}))

vi.mock('./share', () => ({
  shareHighlightFile: mocks.shareFile,
  shareHighlightFiles: mocks.shareFiles,
  downloadShareHighlightFile: mocks.downloadFile,
  downloadShareHighlightFiles: mocks.downloadFiles,
  copyShareHighlightText: mocks.copyText,
}))

vi.mock('./nativeShare', () => ({
  isNativeImagePlatform: mocks.isNative,
  saveNativeHighlightFiles: mocks.saveNative,
}))

const content: ShareHighlightContent = {
  gurmukhi: 'ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
  transliteration: 'sat naam kartaa purakh',
  meaning: 'True is the Name, the Creator.',
  sourceLabel: 'Sri Guru Granth Sahib Ji · Ang 1',
  caption: 'A line I am carrying today.',
  verseId: 101,
  sourcePath: '/study?source=G&ang=1&verseId=101',
  initialShowTransliteration: true,
  initialShowMeaning: true,
  provenance: {
    ceremonyLocation: 'Sri Harmandir Sahib, Amritsar',
    scripture: 'Sri Guru Granth Sahib Ji',
    raag: 'Raag Soohee',
    writer: 'Guru Arjan Dev Ji',
    translationLabel: 'Manmohan Singh',
    dateIso: '2026-07-15',
  },
}

const passageContent: ShareHighlightContent = {
  gurmukhi: 'ਸਲੋਕ ॥\nਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ॥\nਨਿਰਮਲ ਸੰਤ ਸੰਗੇਣ ॥',
  transliteration: 'salok\nsant udharan daiaalang\nnirmal sant sangen',
  meaning: 'Salok.\nThe Merciful Lord saves the Saints.\nOne becomes immaculate with the Saints.',
  sourceLabel: 'SGGS · Ang 709',
  sourcePath: '/study?hukamnama=daily&ang=709',
  passageKind: 'daily-hukamnama',
  seriesLabel: 'Daily Hukamnama',
  dateLabel: 'July 15, 2026',
  passageLines: [
    { id: 'header', gurmukhi: 'ਸਲੋਕ ॥', transliteration: 'salok', meaning: 'Salok.', isHeader: true },
    {
      id: 'verse-1',
      gurmukhi: 'ਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ॥',
      transliteration: 'sant udharan daiaalang',
      meaning: 'The Merciful Lord saves the Saints.',
    },
    {
      id: 'verse-2',
      gurmukhi: 'ਨਿਰਮਲ ਸੰਤ ਸੰਗੇਣ ॥',
      transliteration: 'nirmal sant sangen',
      meaning: 'One becomes immaculate with the Saints.',
    },
  ],
  initialShowTransliteration: true,
  initialShowMeaning: true,
  provenance: {
    ceremonyLocation: 'Sri Harmandir Sahib, Amritsar',
    scripture: 'Sri Guru Granth Sahib Ji',
    raag: 'Raag Soohee',
    writer: 'Guru Arjan Dev Ji',
    translationLabel: 'Manmohan Singh',
    dateIso: '2026-07-15',
  },
}

function makeStorySelection(
  includedSourceLineIds: Array<string | number> = ['header', 'verse-1', 'verse-2'],
  overrides: Partial<ShareHighlightStorySelection> = {},
): ShareHighlightStorySelection {
  const firstSourceLineId = includedSourceLineIds[0] ?? 'line-1'
  const lastSourceLineId = includedSourceLineIds.at(-1) ?? firstSourceLineId
  return {
    mode: 'complete',
    anchorSourceLineId: firstSourceLineId,
    includedLineCount: includedSourceLineIds.length,
    totalLineCount: includedSourceLineIds.length,
    includedSourceLineIds,
    firstSourceLineId,
    lastSourceLineId,
    previousSourceLineId: null,
    nextSourceLineId: null,
    ...overrides,
  }
}

function makePngExport(
  canvas?: HTMLCanvasElement,
  fileName = 'naamras-highlight-101.png',
  height: 1350 | 1920 = 1350,
  selection = makeStorySelection(),
) {
  const resolvedCanvas = canvas ?? document.createElement('canvas')
  const blob = new Blob(['png'], { type: 'image/png' })
  const file = new File([blob], fileName, { type: 'image/png' })
  const baseExport = {
    canvas: resolvedCanvas,
    blob,
    file,
    width: 1080 as const,
    height,
  }
  return height === 1920
    ? {
        ...baseExport,
        layout: {
          selection,
          composition: selection.mode === 'excerpt' || selection.totalLineCount > 8
            ? 'manuscript' as const
            : 'expressive' as const,
        },
        selection,
      }
    : baseExport
}

function makeStorySet(pages: Array<ReturnType<typeof makePngExport>>) {
  return {
    pages,
    files: pages.map(page => page.file),
    totalLineCount: pages[0]?.selection.totalLineCount ?? 0,
  }
}

function makeEncodedStorySet(height = 1920) {
  const rendered = makePngExport(undefined, 'naamras-hukamnama.png', 1920)
  const page = {
    blob: rendered.blob,
    file: rendered.file,
    width: rendered.width,
    height,
    layout: rendered.layout,
    selection: rendered.selection,
  }
  return { pages: [page], files: [page.file], totalLineCount: page.selection.totalLineCount }
}

function controlPreviewImageLoading() {
  const imageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image')
  const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
  const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
  const images: ControlledImage[] = []
  class ControlledImage {
    decoding = ''
    onload: ((event: Event) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    src = ''
    constructor() { images.push(this) }
  }
  const createObjectURL = vi.fn(() => `blob:controlled-preview-${images.length}`)
  const revokeObjectURL = vi.fn()
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: ControlledImage })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
  return {
    images,
    revokeObjectURL,
    restore() {
      if (imageDescriptor) Object.defineProperty(globalThis, 'Image', imageDescriptor)
      if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    },
  }
}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
})

beforeEach(() => {
  window.localStorage.removeItem(ARTWORK_PREFERENCE_KEY)
  mocks.exportPng.mockReset()
  mocks.exportPng.mockImplementation(async (_input, options) => makePngExport(options?.canvas))
  mocks.exportStoryPng.mockReset()
  mocks.exportStoryPng.mockImplementation(async (input: {
    content: { lines: Array<{ id: string | number }> }
  }) => {
    const sourceLineIds = input.content.lines.map(line => line.id)
    return makePngExport(
      undefined,
      'naamras-hukamnama-July-15-2026.png',
      1920,
      makeStorySelection(sourceLineIds),
    )
  })
  mocks.shareFile.mockReset()
  mocks.shareFile.mockResolvedValue({ status: 'shared', method: 'web-share', payload: 'full' })
  mocks.shareFiles.mockReset()
  mocks.shareFiles.mockResolvedValue({ status: 'shared', method: 'web-share', payload: 'full' })
  mocks.downloadFile.mockReset()
  mocks.downloadFiles.mockReset()
  mocks.isNative.mockReturnValue(false)
  mocks.saveNative.mockReset()
  mocks.saveNative.mockResolvedValue(undefined)
  mocks.copyText.mockReset()
  mocks.copyText.mockImplementation(async (text: string) => {
    await window.navigator.clipboard.writeText(text)
    return { method: 'clipboard-api' }
  })
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

afterEach(() => {
  window.localStorage.removeItem(ARTWORK_PREFERENCE_KEY)
  vi.useRealTimers()
})

it('keeps generated source links on the canonical NaamRas origin', () => {
  expect(getCanonicalSourceUrl('/study?shabadId=1&verseId=1')).toBe(
    'https://naamras.xyz/study?shabadId=1&verseId=1'
  )
  expect(getCanonicalSourceUrl('https://attacker.example/passage')).toBe(
    'https://naamras.xyz/'
  )
  expect(getCanonicalSourceUrl('/\\attacker.example/passage')).toBe(
    'https://naamras.xyz/'
  )
  expect(getHukamnamaShareUrl('2026-08-03')).toBe(
    'https://naamras.xyz/h/2026-08-03'
  )
  expect(getHukamnamaShareUrl('2026-02-30')).toBeNull()
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('ShareHighlightSheet', () => {
  it('saves to Photos in the installed iPhone app without starting a browser download', async () => {
    mocks.isNative.mockReturnValue(true)
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const save = screen.getByRole('button', { name: 'Save to Photos' })
    await waitFor(() => expect(save).toBeEnabled())
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved to Photos.'))
    expect(mocks.saveNative).toHaveBeenCalledOnce()
    expect(mocks.saveNative.mock.calls[0]?.[0]).toHaveLength(1)
    expect(mocks.downloadFile).not.toHaveBeenCalled()
    expect(mocks.downloadFiles).not.toHaveBeenCalled()
  })

  it('shows recovery advice instead of a successful save when Photos access fails', async () => {
    mocks.isNative.mockReturnValue(true)
    mocks.saveNative.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'PHOTO_PERMISSION' }))
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const save = screen.getByRole('button', { name: 'Save to Photos' })
    await waitFor(() => expect(save).toBeEnabled())
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('The image was not saved.'))
    expect(screen.getByRole('status')).toHaveTextContent('Share image to save to Files')
    expect(screen.getByRole('status')).toHaveTextContent('Allow NaamRas to add photos in Settings')
    expect(save).toBeEnabled()
  })

  it('does not blame Photos permission when native saving fails for another reason', async () => {
    mocks.isNative.mockReturnValue(true)
    mocks.saveNative.mockRejectedValue(Object.assign(new Error('storage unavailable'), { code: 'SAVE_FAILED' }))
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const save = screen.getByRole('button', { name: 'Save to Photos' })
    await waitFor(() => expect(save).toBeEnabled())
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
      'The image was not saved. Try again, or use Share image to save to Files.',
    ))
    expect(screen.getByRole('status')).not.toHaveTextContent('Settings')
    expect(screen.getByRole('status')).not.toHaveTextContent('Saved to Photos.')
    expect(save).toBeEnabled()
    expect(mocks.downloadFile).not.toHaveBeenCalled()
  })

  it.each([
    ['share', 'close'], ['save', 'close'],
    ['share', 'content'], ['save', 'content'],
    ['share', 'locale'], ['save', 'locale'],
  ] as const)('cancels pending native %s preparation and ignores its result after a %s change', async (action, change) => {
    mocks.isNative.mockReturnValue(true)
    let complete!: () => void
    const pending = new Promise<unknown>(resolve => {
      complete = () => resolve(action === 'share'
        ? { status: 'shared', method: 'native-share', payload: 'full' }
        : undefined)
    })
    const nativeAction = action === 'share' ? mocks.shareFile : mocks.saveNative
    nativeAction.mockReturnValueOnce(pending)
    const onNotice = vi.fn()
    const view = render(
      <ShareHighlightSheet open onClose={vi.fn()} content={passageContent} onNotice={onNotice} />,
    )
    const button = screen.getByRole('button', { name: action === 'share' ? 'Share image' : 'Save to Photos' })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    const signal = nativeAction.mock.calls[0]?.[1]?.signal as AbortSignal
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)

    view.rerender(
      <ShareHighlightSheet
        open={change !== 'close'}
        onClose={vi.fn()}
        content={change === 'content' ? { ...passageContent, dateLabel: 'July 16, 2026' } : passageContent}
        locale={change === 'locale' ? 'pa' : 'en'}
        onNotice={onNotice}
      />,
    )
    expect(signal.aborted).toBe(true)
    if (change === 'close') {
      view.rerender(
        <ShareHighlightSheet open onClose={vi.fn()} content={passageContent} onNotice={onNotice} />,
      )
    }

    await act(async () => {
      complete()
      await pending
    })
    expect(onNotice).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', {
      name: change === 'locale' ? 'ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ' : 'Share image',
    })).toBeEnabled())
  })

  it.each([
    { locale: 'en', explanation: 'too long for one readable image with Meaning', meaning: 'Meaning', share: 'Share image', retry: 'Retry image', noArt: 'Use No art', copy: 'Copy full text' },
    { locale: 'pa', explanation: 'ਇੱਕ ਪੜ੍ਹਨਯੋਗ ਤਸਵੀਰ ਲਈ ਬਹੁਤ ਲੰਮਾ', meaning: 'ਅਰਥ', share: 'ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ', retry: 'ਤਸਵੀਰ ਦੁਬਾਰਾ ਬਣਾਓ', noArt: 'ਕੋਈ ਕਲਾ ਨਾ ਵਰਤੋ', copy: 'ਪੂਰੀ ਲਿਖਤ ਕਾਪੀ ਕਰੋ' },
    { locale: 'hi', explanation: 'एक पठनीय छवि के लिए बहुत लंबा', meaning: 'अर्थ', share: 'छवि साझा करें', retry: 'छवि फिर बनाएँ', noArt: 'कोई कला न रखें', copy: 'पूरा पाठ कॉपी करें' },
  ] as const)('offers useful $locale recovery when support makes a passage too tall', async labels => {
    mocks.exportStoryPng.mockRejectedValueOnce(new mocks.ImageTooLongError())
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} locale={labels.locale} />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(labels.explanation))
    expect(screen.getByRole('button', { name: labels.share })).toBeDisabled()
    expect(screen.getByRole('button', { name: labels.copy })).toBeEnabled()
    expect(screen.queryByRole('button', { name: labels.retry })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: labels.noArt })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: labels.meaning }))
    await waitFor(() => expect(screen.getByRole('button', { name: labels.share })).toBeEnabled())
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].content.lines.every(
      (line: { meaning?: string | null }) => !line.meaning,
    )).toBe(true)
  })

  it('keeps the complete text copyable when even Gurmukhi alone exceeds one readable image', async () => {
    mocks.exportStoryPng.mockRejectedValueOnce(new mocks.ImageTooLongError())
    render(<ShareHighlightSheet open onClose={vi.fn()} content={{
      ...passageContent, initialShowMeaning: false, initialShowTransliteration: false,
    }} />)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(
      'This passage is too long for one readable image. Use Copy full text to share every line.',
    ))
    expect(screen.queryByRole('button', { name: 'Retry image' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use No art' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy full text' }))
    await waitFor(() => expect(window.navigator.clipboard.writeText).toHaveBeenCalled())
    const copied = mocks.copyText.mock.calls[0]?.[0] as string
    for (const line of passageContent.passageLines!) expect(copied).toContain(line.gurmukhi)
    expect(mocks.shareFile).not.toHaveBeenCalled()
    expect(mocks.downloadFile).not.toHaveBeenCalled()
  })

  it('explains an overflow after an earlier preview without offering ineffective artwork retries', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share image' })).toBeEnabled())
    mocks.exportStoryPng.mockRejectedValueOnce(new mocks.ImageTooLongError())
    fireEvent.click(screen.getByRole('button', { name: 'Transliteration' }))
    await waitFor(() => expect(screen.getByRole('note')).toHaveTextContent(
      'Turn off Transliteration, or use Copy full text to share every line.',
    ))
    expect(screen.queryByRole('button', { name: 'Retry image' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use No art' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share image' })).toBeDisabled()
  })

  it('presents immutable scripture, a live preview, and every artwork choice accessibly', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)

    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    expect(within(dialog).getByText('Share a line for remembrance')).toBeInTheDocument()
    expect(within(dialog).getByRole('img', { name: 'Share image preview' })).toHaveAttribute('width', '1080')
    expect(within(dialog).getAllByText(content.sourceLabel).length).toBeGreaterThanOrEqual(1)
    expect(within(dialog).getByText('naamras.xyz')).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Text shown in the image' }))
      .toHaveTextContent(content.gurmukhi)
    expect(within(dialog).getByRole('radio', {
      name: 'Court mural',
      description: /court scene with riders/i,
    })).toBeInTheDocument()
    const note = within(dialog).getByRole('textbox', { name: /Social note/i })
    const describedByIds = note.getAttribute('aria-describedby')?.split(' ') ?? []
    expect(describedByIds).toHaveLength(2)
    describedByIds.forEach(id => expect(document.getElementById(id)).toBeInTheDocument())

    const gurmukhi = within(dialog).getByRole('button', { name: /Gurmukhi.*Always included/i })
    expect(gurmukhi).toBeDisabled()
    expect(gurmukhi).toHaveAttribute('aria-pressed', 'true')

    const artworkGroup = within(dialog).getByRole('group', { name: 'Artwork' })
    const artworkChoices = within(artworkGroup).getAllByRole('radio')
    expect(artworkChoices).toHaveLength(16)
    expect(within(dialog).getByRole('radio', { name: /No art/i })).not.toBeChecked()

    await waitFor(() => expect(mocks.exportPng).toHaveBeenCalled())
    await waitFor(() => expect(within(dialog).getByRole('status')).toHaveTextContent('Image ready.'))
    expect(within(dialog).getByRole('button', { name: 'Share image' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Download image' })).toBeEnabled()
  })

  it('builds the full Hukamnama as one ordered Story and exposes only the existing artwork set', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    expect(within(dialog).getByRole('heading', { name: "Share today's Hukamnama" })).toBeInTheDocument()
    expect(within(dialog).getByText('Gurmukhi is always included. Add meaning or pronunciation below each line.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('radiogroup', { name: 'Text position' })).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/Page \d+ of \d+/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Previous image|Next image/i })).not.toBeInTheDocument()

    const preview = within(dialog).getByRole('img', { name: 'Share image preview' })
    expect(preview).toHaveAttribute('width', '1080')
    expect(preview).toHaveAttribute('height', '1920')
    expect(preview.parentElement).toHaveClass('share-highlight__preview-frame--story')

    const artworkGroup = within(dialog).getByRole('group', { name: 'Artwork' })
    const readingControls = within(dialog).getByRole('region', { name: 'Text on the card' })
    expect(artworkGroup.compareDocumentPosition(readingControls) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
    expect(within(artworkGroup).getAllByRole('radio')).toHaveLength(15)
    expect(within(artworkGroup).getByRole('radio', {
      name: 'No art',
      description: 'A plain reading surface without a picture.',
    })).not.toBeChecked()
    expect(within(artworkGroup).getByRole('radio', { name: 'Interior audience' })).toBeChecked()
    expect(within(artworkGroup).getByRole('radio', {
      name: 'Court mural',
      description: /court scene with riders/i,
    })).toBeInTheDocument()
    expect(within(artworkGroup).getByRole('radio', {
      name: 'Waterside temple',
      description: /conflict scenes/i,
    })).toBeInTheDocument()
    expect(within(artworkGroup).queryByRole('radio', { name: /Quiet parchment/i }))
      .not.toBeInTheDocument()
    expect(dialog.querySelector('.share-highlight__selected-artwork-description'))
      .not.toHaveTextContent('A plain reading surface without a picture.')
    expect(within(dialog).getByRole('button', { name: 'Transliteration' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(dialog).getByRole('button', { name: 'Meaning' })).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => expect(mocks.exportStoryPng).toHaveBeenCalled())
    expect(await within(dialog).findByText('Complete Hukamnama')).toBeInTheDocument()
    expect(within(dialog).getByText('3 of 3 lines in this image')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', {
      name: 'Read this exact passage on NaamRas',
    })).toHaveAttribute('href', 'https://naamras.xyz/h/2026-07-15')
    const initialInput = mocks.exportStoryPng.mock.calls.at(-1)?.[0]
    expect(initialInput.content.lines.map((line: { id: string }) => line.id)).toEqual([
      'header',
      'verse-1',
      'verse-2',
    ])
    expect(initialInput.content.lines[0]).toMatchObject({
      isHeader: true,
      transliteration: null,
      meaning: 'Salok.',
    })
    expect(initialInput.content.lines.every((line: { transliteration: null; meaning?: string }) => (
      line.transliteration === null && Boolean(line.meaning)
    ))).toBe(true)
    expect(initialInput.content).toMatchObject({
      sourceLabel: 'SGGS · Ang 709',
      seriesLabel: 'Daily Hukamnama',
      dateLabel: 'July 15, 2026',
      shareUrl: 'https://naamras.xyz/h/2026-07-15',
      supportLabel: 'Manmohan Singh',
      scopeCopy: expect.objectContaining({
        complete: 'Complete Hukamnama',
        excerpt: "Excerpt from today's Hukamnama",
        coverageTemplate: '{included} of {total} lines',
      }),
    })
    expect(initialInput.artwork?.id).toBe('interior-audience')
    expect(window.localStorage.getItem(ARTWORK_PREFERENCE_KEY)).toBeNull()
    expect(initialInput.fileNameBase).toBe('naamras-hukamnama-2026-07-15')
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[1]).toEqual({
      signal: expect.any(AbortSignal),
    })
    expect(mocks.exportPng).not.toHaveBeenCalled()
  })

  it('remembers the chosen Hukamnama background across closing and remounting', async () => {
    const view = render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Court mural' }))
    expect(window.localStorage.getItem(ARTWORK_PREFERENCE_KEY)).toBe('court-mural')
    view.rerender(<ShareHighlightSheet open={false} onClose={vi.fn()} content={passageContent} />)
    view.rerender(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    expect(screen.getByRole('radio', { name: 'Court mural' })).toBeChecked()
    view.unmount()
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    expect(screen.getByRole('radio', { name: 'Court mural' })).toBeChecked()
    await waitFor(() => expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].artwork?.id).toBe('court-mural'))
  })

  it('previews a taller complete Hukamnama at its actual aspect ratio with single-image actions', async () => {
    const page = makePngExport(undefined, 'naamras-hukamnama.png', 1920)
    mocks.exportStoryPng.mockResolvedValueOnce(makeStorySet([{ ...page, height: 2600 } as typeof page]))
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const preview = screen.getByRole('img', { name: 'Share image preview' })
    await waitFor(() => expect(preview).toHaveAttribute('height', '2600'))
    expect(preview.parentElement).toHaveStyle({ aspectRatio: '1080 / 2600' })
    expect(screen.getByText('One taller image keeps every line readable. Check that the full image is visible before posting.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download image', exact: true })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Share image', exact: true })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Download \d+ images/ })).not.toBeInTheDocument()
  })

  it('keeps the prior preview and disables image actions until the latest taller PNG is painted', async () => {
    const loading = controlPreviewImageLoading()
    const view = render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    try {
      const share = screen.getByRole('button', { name: 'Share image', exact: true })
      const download = screen.getByRole('button', { name: 'Download image', exact: true })
      const preview = screen.getByRole('img', { name: 'Share image preview' })
      await waitFor(() => expect(share).toBeEnabled())
      mocks.exportStoryPng.mockResolvedValueOnce(makeEncodedStorySet(2600))
      fireEvent.click(screen.getByRole('radio', { name: 'Court mural' }))
      await waitFor(() => expect(loading.images).toHaveLength(1))

      expect(share).toBeDisabled()
      expect(download).toBeDisabled()
      expect(preview).toHaveAttribute('height', '1920')
      expect(preview.parentElement).toHaveStyle({ aspectRatio: '1080 / 1920' })
      expect(screen.getByRole('status')).toHaveTextContent('Applying Court mural')
      fireEvent.click(share)
      fireEvent.click(download)
      expect(mocks.shareFile).not.toHaveBeenCalled()
      expect(mocks.downloadFile).not.toHaveBeenCalled()

      act(() => loading.images[0]!.onload?.(new Event('load')))

      expect(preview).toHaveAttribute('height', '2600')
      expect(preview.parentElement).toHaveStyle({ aspectRatio: '1080 / 2600' })
      expect(share).toBeEnabled()
      expect(download).toBeEnabled()
      expect(screen.getByRole('status')).toHaveTextContent('Court mural applied. Image ready.')
      expect(loading.revokeObjectURL).toHaveBeenCalledTimes(1)
    } finally {
      view.unmount()
      loading.restore()
    }
  })

  it('ignores a stale preview decode and visibly recovers from the latest decode failure', async () => {
    const loading = controlPreviewImageLoading()
    mocks.exportStoryPng.mockImplementation(async () => makeEncodedStorySet())
    const view = render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    try {
      await waitFor(() => expect(loading.images).toHaveLength(1))
      const staleLoad = loading.images[0]!.onload!
      fireEvent.click(screen.getByRole('radio', { name: 'Court mural' }))
      await waitFor(() => expect(loading.images).toHaveLength(2))
      expect(loading.images[0]!.src).toBe('')
      act(() => staleLoad(new Event('load')))
      expect(screen.getByRole('button', { name: 'Share image', exact: true })).toBeDisabled()
      expect(screen.getByRole('status')).toHaveTextContent('Applying Court mural')

      act(() => loading.images[1]!.onerror?.(new Event('error')))
      expect(screen.getByRole('status')).toHaveTextContent('The image could not be prepared.')
      expect(screen.getByRole('button', { name: 'Share image', exact: true })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Download image', exact: true })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Retry image' }))
      await waitFor(() => expect(loading.images).toHaveLength(3))
      act(() => loading.images[2]!.onload?.(new Event('load')))
      expect(screen.getByRole('button', { name: 'Share image', exact: true })).toBeEnabled()
      expect(screen.queryByRole('button', { name: 'Retry image' })).not.toBeInTheDocument()
      expect(loading.revokeObjectURL).toHaveBeenCalledTimes(3)
    } finally {
      view.unmount()
      loading.restore()
    }
  })

  it('surfaces a failed preview draw and allows a successful retry', async () => {
    const context = document.createElement('canvas').getContext('2d')!
    vi.mocked(context.drawImage).mockImplementationOnce(() => { throw new Error('canvas draw failed') })
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const retry = await screen.findByRole('button', { name: 'Retry image' })
    expect(screen.getByRole('button', { name: 'Share image', exact: true })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('The image could not be prepared.')
    fireEvent.click(retry)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share image', exact: true })).toBeEnabled())
    expect(screen.queryByRole('button', { name: 'Retry image' })).not.toBeInTheDocument()
  })

  it('times out a stalled preview decode without making the image shareable', async () => {
    const loading = controlPreviewImageLoading()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mocks.exportStoryPng.mockResolvedValueOnce(makeEncodedStorySet())
    const view = render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    try {
      await act(async () => { await vi.advanceTimersByTimeAsync(100) })
      expect(loading.images).toHaveLength(1)
      await act(async () => { await vi.advanceTimersByTimeAsync(12_000) })
      expect(screen.getByRole('status')).toHaveTextContent('The image could not be prepared.')
      expect(screen.getByRole('button', { name: 'Share image', exact: true })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Retry image' })).toBeInTheDocument()
      expect(loading.images[0]!.src).toBe('')
      expect(loading.revokeObjectURL).toHaveBeenCalledTimes(1)
    } finally {
      view.unmount()
      loading.restore()
      vi.useRealTimers()
    }
  })

  it('remembers the plain option after a previously chosen background', () => {
    window.localStorage.setItem(ARTWORK_PREFERENCE_KEY, 'court-mural')
    const view = render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    fireEvent.click(screen.getByRole('radio', { name: 'No art' }))
    expect(window.localStorage.getItem(ARTWORK_PREFERENCE_KEY)).toBe('none')
    view.unmount()
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    expect(screen.getByRole('radio', { name: 'No art' })).toBeChecked()
  })

  it.each([
    { initialArtworkId: null, name: 'No art' },
    { initialArtworkId: 'waterside-temple', name: 'Waterside temple' },
  ])('honors explicit initial artwork over the saved choice: $name', ({ initialArtworkId, name }) => {
    window.localStorage.setItem(ARTWORK_PREFERENCE_KEY, 'court-mural')
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} initialArtworkId={initialArtworkId} />)
    expect(screen.getByRole('radio', { name })).toBeChecked()
    expect(window.localStorage.getItem(ARTWORK_PREFERENCE_KEY)).toBe('court-mural')
  })

  it.each(['removed-artwork', 'quiet-parchment'])('ignores unavailable saved artwork: %s', savedId => {
    window.localStorage.setItem(ARTWORK_PREFERENCE_KEY, savedId)
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    expect(screen.getByRole('radio', { name: 'Interior audience' })).toBeChecked()
  })

  it('keeps artwork selection and export usable when browser storage is denied', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage denied') })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage denied') })
    try {
      render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
      expect(screen.getByRole('radio', { name: 'Interior audience' })).toBeChecked()
      fireEvent.click(screen.getByRole('radio', { name: 'Court mural' }))
      expect(screen.getByRole('radio', { name: 'Court mural' })).toBeChecked()
      await waitFor(() => expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].artwork?.id).toBe('court-mural'))
    } finally {
      getItem.mockRestore()
      setItem.mockRestore()
    }
  })

  it('uses native radio-key navigation across the persistent Hukamnama artwork picker', async () => {
    const user = userEvent.setup()
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const artworkGroup = within(dialog).getByRole('group', { name: 'Artwork' })
    const noArtwork = within(artworkGroup).getByRole('radio', { name: 'No art' })
    const courtMural = within(artworkGroup).getByRole('radio', { name: 'Court mural' })

    noArtwork.focus()
    await user.keyboard('{ArrowRight}')

    expect(courtMural).toBeChecked()
    expect(courtMural).toHaveFocus()
    await waitFor(() => {
      expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].artwork?.id).toBe('court-mural')
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        'Court mural applied. Image ready.',
      )
    })
    expect(courtMural).toHaveFocus()
  })

  it('serializes full-set exports and coalesces queued artwork selections to the latest choice', async () => {
    const user = userEvent.setup()
    type StoryExport = ReturnType<typeof makePngExport>
    let resolveCourtMural!: (value: StoryExport) => void
    let resolveWatersideTemple!: (value: StoryExport) => void
    const courtMuralExport = new Promise<StoryExport>(resolve => {
      resolveCourtMural = resolve
    })
    const watersideTempleExport = new Promise<StoryExport>(resolve => {
      resolveWatersideTemple = resolve
    })
    const invokedArtworkIds: Array<string | null> = []
    const abortedArtworkIds: Array<string | null> = []
    let activeExports = 0
    let maxActiveExports = 0

    mocks.exportStoryPng.mockImplementation((input: {
      artwork?: { id: string } | null
      content: { lines: Array<{ id: string | number }> }
    }, options?: { signal?: AbortSignal }) => {
      const artworkId = input.artwork?.id ?? null
      invokedArtworkIds.push(artworkId)
      activeExports += 1
      maxActiveExports = Math.max(maxActiveExports, activeExports)
      const sourceLineIds = input.content.lines.map(line => line.id)
      const immediateExport = makePngExport(
        undefined,
        'naamras-hukamnama-2026-07-15.png',
        1920,
        makeStorySelection(sourceLineIds),
      )
      const exportPromise = artworkId === 'court-mural'
        ? courtMuralExport
        : artworkId === 'waterside-temple'
          ? watersideTempleExport
          : Promise.resolve(immediateExport)

      const abortableExport = new Promise<StoryExport>((resolve, reject) => {
        const handleAbort = () => {
          abortedArtworkIds.push(artworkId)
          const error = new Error('Share image rendering was cancelled.')
          error.name = 'AbortError'
          reject(error)
        }
        const cleanup = () => options?.signal?.removeEventListener('abort', handleAbort)

        if (options?.signal?.aborted) {
          handleAbort()
          return
        }
        options?.signal?.addEventListener('abort', handleAbort, { once: true })
        void exportPromise.then(
          value => {
            cleanup()
            resolve(value)
          },
          error => {
            cleanup()
            reject(error)
          },
        )
      })

      return abortableExport.finally(() => {
        activeExports -= 1
      })
    })

    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} initialArtworkId={null} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })
    await waitFor(() => {
      expect(shareButton).toBeEnabled()
      expect(invokedArtworkIds).toEqual([null])
      expect(activeExports).toBe(0)
    })

    const artworkGroup = within(dialog).getByRole('group', { name: 'Artwork' })
    const courtMural = within(artworkGroup).getByRole('radio', { name: 'Court mural' })
    const interiorAudience = within(artworkGroup).getByRole('radio', { name: 'Interior audience' })
    const watersideTemple = within(artworkGroup).getByRole('radio', { name: 'Waterside temple' })

    await user.click(courtMural)
    await waitFor(() => {
      expect(invokedArtworkIds).toEqual([null, 'court-mural'])
      expect(activeExports).toBe(1)
      expect(shareButton).toBeDisabled()
    })

    await user.click(interiorAudience)
    await user.click(watersideTemple)

    expect(watersideTemple).toBeChecked()
    expect(watersideTemple).toHaveFocus()
    expect(within(dialog).getByText('Complete Hukamnama')).toBeInTheDocument()
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Applying Waterside temple behind the reading…',
    )

    await waitFor(() => {
      expect(invokedArtworkIds).toEqual([null, 'court-mural', 'waterside-temple'])
      expect(activeExports).toBe(1)
      expect(abortedArtworkIds).toContain('court-mural')
    })
    expect(invokedArtworkIds).not.toContain('interior-audience')
    expect(maxActiveExports).toBe(1)
    expect(watersideTemple).toHaveFocus()

    const watersideResult = makePngExport(
      undefined,
      'waterside-temple.png',
      1920,
      makeStorySelection(),
    )
    await act(async () => {
      resolveWatersideTemple(watersideResult)
      await watersideTempleExport
    })

    resolveCourtMural(makePngExport(
      undefined,
      'court-mural.png',
      1920,
      makeStorySelection(),
    ))

    await waitFor(() => {
      expect(activeExports).toBe(0)
      expect(shareButton).toBeEnabled()
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        'Waterside temple applied. Image ready.',
      )
    })
    expect(watersideTemple).toHaveFocus()
    expect(maxActiveExports).toBe(1)
  })

  it('aborts active Hukamnama rendering when the composer closes', async () => {
    let activeSignal: AbortSignal | undefined
    let resolveAbortObserved!: () => void
    const abortObserved = new Promise<void>(resolve => {
      resolveAbortObserved = resolve
    })
    mocks.exportStoryPng.mockImplementation((_input, options?: { signal?: AbortSignal }) => (
      new Promise((_resolve, reject) => {
        activeSignal = options?.signal
        const handleAbort = () => {
          const error = new Error('Share image rendering was cancelled.')
          error.name = 'AbortError'
          resolveAbortObserved()
          reject(error)
        }
        if (activeSignal?.aborted) handleAbort()
        else activeSignal?.addEventListener('abort', handleAbort, { once: true })
      })
    ))

    const { rerender } = render(
      <ShareHighlightSheet
        open
        onClose={vi.fn()}
        content={passageContent}
        initialArtworkId="court-mural"
      />
    )

    await waitFor(() => expect(activeSignal).toBeInstanceOf(AbortSignal))
    rerender(
      <ShareHighlightSheet
        open={false}
        onClose={vi.fn()}
        content={passageContent}
        initialArtworkId="court-mural"
      />
    )
    await abortObserved

    expect(activeSignal?.aborted).toBe(true)
    expect(screen.queryByRole('dialog', { name: 'Share highlight' })).not.toBeInTheDocument()
  })

  it.each([
    {
      locale: 'pa' as const,
      dialogName: 'ਝਲਕ ਸਾਂਝੀ ਕਰੋ',
      groupName: 'ਕਲਾ',
      noArtworkName: 'ਕੋਈ ਕਲਾ ਨਹੀਂ',
      noArtworkDescription: 'ਤਸਵੀਰ ਤੋਂ ਬਿਨਾਂ ਸਾਦੀ ਪਾਠ ਸਤ੍ਹਾ।',
      artworkName: 'ਦਰਬਾਰੀ ਭਿੱਤ-ਚਿੱਤਰ',
      artworkDescription: 'ਸਵਾਰਾਂ, ਸੇਵਾਦਾਰਾਂ, ਫੁੱਲਦਾਰ ਹਾਸ਼ੀਆਂ ਅਤੇ ਗੁਰਮੁਖੀ ਲਿਖਤ ਵਾਲਾ ਦਰਬਾਰੀ ਦ੍ਰਿਸ਼।',
    },
    {
      locale: 'hi' as const,
      dialogName: 'अंश साझा करें',
      groupName: 'कलाकृति',
      noArtworkName: 'बिना कला',
      noArtworkDescription: 'बिना किसी चित्र के सादा पठन क्षेत्र।',
      artworkName: 'दरबारी भित्तिचित्र',
      artworkDescription: 'सवारों, परिचारकों, पुष्प किनारों और गुरमुखी लेखों वाला दरबारी दृश्य।',
    },
  ])('uses active-locale artwork names and descriptions in $locale', async ({
    locale,
    dialogName,
    groupName,
    noArtworkName,
    noArtworkDescription,
    artworkName,
    artworkDescription,
  }) => {
    const user = userEvent.setup()
    render(
      <ShareHighlightSheet
        open
        onClose={vi.fn()}
        content={passageContent}
        locale={locale}
      />
    )
    const dialog = screen.getByRole('dialog', { name: dialogName })
    const artworkGroup = within(dialog).getByRole('group', { name: groupName })
    expect(within(artworkGroup).getAllByRole('radio')).toHaveLength(15)
    expect(within(artworkGroup).getByRole('radio', {
      name: noArtworkName,
      description: noArtworkDescription,
    })).not.toBeChecked()
    expect(within(artworkGroup).getByRole('radio', { checked: true })).toHaveAttribute('value', 'interior-audience')
    const courtMural = within(artworkGroup).getByRole('radio', {
      name: artworkName,
      description: artworkDescription,
    })

    await user.click(courtMural)

    expect(courtMural).toHaveFocus()
    expect(dialog.querySelector('.share-highlight__selected-artwork'))
      .toHaveTextContent(`${artworkName}${artworkDescription}`)
  })

  it('falls back to the exact reading route when dated short-link metadata is invalid', async () => {
    const exactPath = '/study?hukamnamaDate=2026-07-15'
    render(
      <ShareHighlightSheet
        open
        onClose={vi.fn()}
        content={{
          ...passageContent,
          sourcePath: exactPath,
          provenance: {
            ...passageContent.provenance,
            dateIso: '2026-02-30',
          },
        }}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    await waitFor(() => expect(mocks.exportStoryPng).toHaveBeenCalled())
    expect(within(dialog).getByRole('link', { name: /Read this exact passage/i }))
      .toHaveAttribute('href', `https://naamras.xyz${exactPath}`)
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].content.shareUrl)
      .toBe(`https://naamras.xyz${exactPath}`)
  })

  it('keeps all existing artwork choices mounted and focused through manuscript preflight', async () => {
    const user = userEvent.setup()
    const longPassageContent: ShareHighlightContent = {
      ...passageContent,
      passageLines: [
        passageContent.passageLines![0],
        ...Array.from({ length: 9 }, (_, index) => ({
          id: `long-verse-${index + 1}`,
          gurmukhi: `ਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ॥ ${index + 1}`,
          meaning: `The Merciful Lord saves the Saints. ${index + 1}`,
        })),
      ],
    }

    render(<ShareHighlightSheet open onClose={vi.fn()} content={longPassageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    await waitFor(() => expect(mocks.exportStoryPng).toHaveBeenCalled())
    const artworkGroup = within(dialog).getByRole('group', { name: 'Artwork' })
    expect(within(artworkGroup).getAllByRole('radio')).toHaveLength(15)
    expect(within(artworkGroup).getByRole('radio', { name: 'Interior audience' })).toBeChecked()
    const courtMural = within(artworkGroup).getByRole('radio', { name: 'Court mural' })

    await user.click(courtMural)

    expect(courtMural).toHaveFocus()
    await waitFor(() => {
      expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].artwork?.id).toBe('court-mural')
      expect(courtMural).toBeChecked()
      expect(within(dialog).getByRole('group', { name: 'Artwork' })).toBeInTheDocument()
    })
    expect(courtMural).toHaveFocus()
  })

  it('reports incomplete supports instead of silently presenting a partial visual layer', async () => {
    const partialPassage: ShareHighlightContent = {
      ...passageContent,
      initialShowMeaning: false,
      passageLines: passageContent.passageLines!.map((line, index) => (
        index === 1 ? { ...line, meaning: undefined } : line
      )),
    }
    render(<ShareHighlightSheet open onClose={vi.fn()} content={partialPassage} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const meaning = within(dialog).getByRole('button', { name: /Meaning.*1 of 2 lines available/i })

    expect(meaning).toBeDisabled()
    expect(within(dialog).getByRole('note')).toHaveTextContent('Meaning: 1 of 2 lines available')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy full text' }))
    await waitFor(() => {
      expect(mocks.copyText).toHaveBeenCalledWith(
        expect.stringContaining('Salok.'),
        expect.objectContaining({ focusTarget: expect.any(HTMLButtonElement) })
      )
      expect(mocks.copyText).toHaveBeenCalledWith(
        expect.stringContaining('One becomes immaculate with the Saints.'),
        expect.objectContaining({ focusTarget: expect.any(HTMLButtonElement) })
      )
    })
  })

  it('shares and downloads one Story PNG and allows at most one reading support', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: 'Share image' })).toBeEnabled()
      expect(within(dialog).getByRole('status')).toHaveTextContent('Interior audience applied. Image ready.')
    })
    const storyExport = await mocks.exportStoryPng.mock.results.at(-1)?.value
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(mocks.shareFile).toHaveBeenCalledTimes(1)
      expect(mocks.shareFile.mock.calls[0][0]).toBe(storyExport.file)
      expect(mocks.shareFile.mock.calls[0][1]).toMatchObject({
        title: 'Hukamnama from NaamRas',
        url: 'https://naamras.xyz/h/2026-07-15',
        text: expect.stringContaining('Daily Hukamnama'),
      })
      expect(mocks.shareFile.mock.calls[0][1].text).toContain('The attached image contains the complete Hukamnama')
      expect(mocks.shareFile.mock.calls[0][1].text).toContain('Read this exact passage on NaamRas')
    })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Download image' }))
    await waitFor(() => {
      expect(mocks.downloadFile).toHaveBeenCalledWith(storyExport.file)
      expect(within(dialog).getByRole('status')).toHaveTextContent('Download started.')
    })

    const transliteration = within(dialog).getByRole('button', { name: 'Transliteration' })
    const meaning = within(dialog).getByRole('button', { name: 'Meaning' })
    fireEvent.click(transliteration)
    await waitFor(() => {
      const lastInput = mocks.exportStoryPng.mock.calls.at(-1)?.[0]
      expect(lastInput.content.lines.every((line: { transliteration?: string; meaning: null }) => (
        Boolean(line.transliteration) && line.meaning === null
      ))).toBe(true)
      expect(lastInput.content.supportLabel).toBe('Transliteration')
    })
    expect(transliteration).toHaveAttribute('aria-pressed', 'true')
    expect(meaning).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(meaning)
    await waitFor(() => {
      const lastInput = mocks.exportStoryPng.mock.calls.at(-1)?.[0]
      expect(lastInput.content.lines.every((line: { transliteration: null; meaning?: string }) => (
        line.transliteration === null && Boolean(line.meaning)
      ))).toBe(true)
      expect(lastInput.content.supportLabel).toBe('Manmohan Singh')
      expect(within(dialog).getByRole('status')).toHaveTextContent('Interior audience applied. Image ready.')
    })
    expect(transliteration).toHaveAttribute('aria-pressed', 'false')
    expect(meaning).toHaveAttribute('aria-pressed', 'true')

    expect(storyExport).toMatchObject({ height: 1920 })
  })

  it('retains the valid preview but pauses Share and Save while preparing bilingual mode', async () => {
    render(
      <ShareHighlightSheet
        open
        onClose={vi.fn()}
        content={{
          ...passageContent,
          initialShowMeaning: false,
          initialShowTransliteration: false,
        }}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })
    const saveButton = within(dialog).getByRole('button', { name: 'Download image' })
    const copyButton = within(dialog).getByRole('button', { name: 'Copy full text' })

    await waitFor(() => expect(shareButton).toBeEnabled())
    let resolveBilingual!: (value: ReturnType<typeof makePngExport>) => void
    const bilingualRender = new Promise<ReturnType<typeof makePngExport>>(resolve => {
      resolveBilingual = resolve
    })
    mocks.exportStoryPng.mockReturnValueOnce(bilingualRender)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Meaning' }))

    expect(within(dialog).getByRole('status')).toHaveTextContent('Applying Interior audience behind the reading…')
    expect(shareButton).toBeDisabled()
    expect(saveButton).toBeDisabled()
    expect(copyButton).toBeEnabled()
    expect(dialog.querySelector('.share-highlight__preview-pending')).not.toBeInTheDocument()

    fireEvent.click(copyButton)
    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('The Merciful Lord saves the Saints.')
      )
    })

    const bilingualExport = makePngExport(
      undefined,
      'naamras-hukamnama-July-15-2026.png',
      1920
    )
    await act(async () => {
      resolveBilingual(bilingualExport)
      await bilingualRender
    })

    await waitFor(() => {
      expect(within(dialog).getByRole('status')).toHaveTextContent('Text copied.')
      expect(shareButton).toBeEnabled()
      expect(saveButton).toBeEnabled()
    })
    fireEvent.click(shareButton)
    await waitFor(() => {
      expect(mocks.shareFile).toHaveBeenCalledWith(
        bilingualExport.file,
        expect.objectContaining({ title: 'Hukamnama from NaamRas' })
      )
    })
  })

  it('previews and shares a complete long Hukamnama as one ordered local image set', async () => {
    const user = userEvent.setup()
    const longPassageLines = [
      passageContent.passageLines![0],
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `verse-${index + 1}`,
        gurmukhi: `ਗੁਰਬਾਣੀ ਪੰਕਤੀ ${index + 1} ॥`,
        transliteration: `gurbani line ${index + 1}`,
        meaning: `Meaning line ${index + 1}.`,
      })),
    ]
    const pages = [
      makePngExport(
        undefined,
        'naamras-hukamnama-2026-07-15-01-of-03.png',
        1920,
        makeStorySelection(['header', 'verse-1', 'verse-2'], {
          mode: 'excerpt',
          anchorSourceLineId: 'header',
          includedLineCount: 3,
          totalLineCount: longPassageLines.length,
          previousSourceLineId: null,
          nextSourceLineId: 'verse-3',
        }),
      ),
      makePngExport(
        undefined,
        'naamras-hukamnama-2026-07-15-02-of-03.png',
        1920,
        makeStorySelection(['verse-3', 'verse-4'], {
          mode: 'excerpt',
          anchorSourceLineId: 'verse-3',
          includedLineCount: 2,
          totalLineCount: longPassageLines.length,
          previousSourceLineId: 'header',
          nextSourceLineId: 'verse-5',
        }),
      ),
      makePngExport(
        undefined,
        'naamras-hukamnama-2026-07-15-03-of-03.png',
        1920,
        makeStorySelection(['verse-5', 'verse-6'], {
          mode: 'excerpt',
          anchorSourceLineId: 'verse-5',
          includedLineCount: 2,
          totalLineCount: longPassageLines.length,
          previousSourceLineId: 'verse-3',
          nextSourceLineId: null,
        }),
      ),
    ]
    const storySet = makeStorySet(pages)
    mocks.exportStoryPng.mockResolvedValue(storySet)

    render(
      <ShareHighlightSheet
        open
        onClose={vi.fn()}
        content={{
          ...passageContent,
          passageLines: longPassageLines,
          initialShowMeaning: true,
          initialShowTransliteration: false,
        }}
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const meaning = within(dialog).getByRole('button', { name: 'Meaning' })
    const initialShareButton = within(dialog).getByRole('button', { name: 'Share image' })

    await waitFor(() => expect(initialShareButton).toBeEnabled())
    const shareButton = within(dialog).getByRole('button', { name: 'Share 3 images' })
    const saveButton = within(dialog).getByRole('button', { name: 'Download 3 images' })
    expect(meaning).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).getByText('Complete Hukamnama')).toBeInTheDocument()
    expect(within(dialog).getByText('Image 1 of 3 · 3 of 7 lines in this image')).toBeInTheDocument()
    expect(within(dialog).getByRole('status')).toHaveTextContent('3 ordered images ready.')
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].content.lines.every(
      (line: { meaning?: string | null }) => Boolean(line.meaning)
    )).toBe(true)

    const previousButton = within(dialog).getByRole('button', { name: 'Previous image' })
    const nextButton = within(dialog).getByRole('button', { name: 'Next image' })
    expect(previousButton).toBeDisabled()
    expect(nextButton).toBeEnabled()
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(within(dialog).getByText('Image 2 of 3 · 2 of 7 lines in this image')).toBeInTheDocument()
      expect(previousButton).toBeEnabled()
      expect(nextButton).toBeEnabled()
      expect(meaning).toHaveAttribute('aria-pressed', 'true')
    })
    const imageText = within(dialog).getByRole('region', { name: 'Text shown in the image' })
    expect(imageText).toHaveTextContent('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 3 ॥')
    expect(imageText).not.toHaveTextContent('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 1 ॥')

    fireEvent.click(nextButton)
    await waitFor(() => {
      expect(within(dialog).getByText('Image 3 of 3 · 2 of 7 lines in this image')).toBeInTheDocument()
      expect(imageText).toHaveTextContent('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 6 ॥')
      expect(nextButton).toBeDisabled()
    })
    fireEvent.click(previousButton)
    await waitFor(() => {
      expect(within(dialog).getByText('Image 2 of 3 · 2 of 7 lines in this image')).toBeInTheDocument()
      expect(imageText).toHaveTextContent('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 4 ॥')
      expect(imageText).not.toHaveTextContent('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 6 ॥')
    })
    const artworkGroup = within(dialog).getByRole('group', { name: 'Artwork' })
    const courtMural = within(artworkGroup).getByRole('radio', { name: 'Court mural' })
    await user.click(courtMural)

    expect(courtMural).toHaveFocus()
    expect(shareButton).toBeDisabled()
    expect(within(dialog).getByRole('img', { name: 'Share image preview' })).toBeInTheDocument()
    expect(within(dialog).getByText('Image 2 of 3 · 2 of 7 lines in this image')).toBeInTheDocument()

    await waitFor(() => {
      expect(mocks.exportStoryPng).toHaveBeenCalledTimes(2)
      expect(shareButton).toBeEnabled()
      expect(within(dialog).getByText('Image 2 of 3 · 2 of 7 lines in this image')).toBeInTheDocument()
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        'Court mural applied. 3 ordered images ready.',
      )
    })
    expect(courtMural).toHaveFocus()
    expect(within(dialog).getByText('Used on all 3 images.'))
      .toBeInTheDocument()

    fireEvent.click(shareButton)
    await waitFor(() => {
      expect(mocks.shareFiles).toHaveBeenCalledWith(
        storySet.files,
        expect.objectContaining({
          title: 'Hukamnama from NaamRas',
          url: 'https://naamras.xyz/h/2026-07-15',
        })
      )
      const shareText = mocks.shareFiles.mock.calls.at(-1)?.[1]?.text as string
      expect(shareText).toContain('Complete Hukamnama · 7 lines across 3 images')
      expect(shareText).toContain('The 3 attached images contain the complete Hukamnama in order.')
      expect(shareText).not.toContain("Excerpt from today's Hukamnama")
      expect(within(dialog).getByRole('status')).toHaveTextContent('Shared successfully.')
    })
    expect(mocks.shareFile).not.toHaveBeenCalled()

    fireEvent.click(saveButton)
    expect(mocks.downloadFiles).toHaveBeenCalledWith(storySet.files)
    expect(mocks.downloadFile).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('status')).toHaveTextContent('3 image downloads started in order.')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy full text' }))
    await waitFor(() => {
      const copiedText = mocks.copyText.mock.calls.at(-1)?.[0] as string
      expect(copiedText).toContain('Complete Hukamnama · 7 lines across 3 images')
      expect(copiedText).not.toContain('The complete Hukamnama text follows.')
      expect(copiedText).toContain('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 1 ॥')
      expect(copiedText).toContain('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 6 ॥')
      expect(copiedText).toContain('Meaning line 1.')
      expect(copiedText).toContain('Meaning line 6.')
      expect(copiedText).toContain('https://naamras.xyz/h/2026-07-15')
    })
  })

  it('previews encoded passage pages without retaining their render canvases', async () => {
    const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const imageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image')
    const createObjectURL = vi.fn(() => 'blob:naamras-passage-preview')
    const revokeObjectURL = vi.fn()

    class LoadedImage {
      decoding = ''
      onload: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      private value = ''

      get src() {
        return this.value
      }

      set src(value: string) {
        this.value = value
        if (value) queueMicrotask(() => this.onload?.(new Event('load')))
      }
    }

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: LoadedImage,
    })

    try {
      const renderedPage = makePngExport(
        undefined,
        'naamras-hukamnama-2026-07-15.png',
        1920,
      )
      const encodedPage = {
        blob: renderedPage.blob,
        file: renderedPage.file,
        width: renderedPage.width,
        height: renderedPage.height,
        layout: renderedPage.layout,
        selection: renderedPage.selection,
      }
      mocks.exportStoryPng.mockResolvedValueOnce({
        pages: [encodedPage],
        files: [encodedPage.file],
        totalLineCount: encodedPage.selection.totalLineCount,
      })

      render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)

      await waitFor(() => {
        expect(createObjectURL).toHaveBeenCalledWith(encodedPage.blob)
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:naamras-passage-preview')
      })
      expect(screen.getByRole('button', { name: 'Share image' })).toBeEnabled()
    } finally {
      if (createObjectUrlDescriptor) {
        Object.defineProperty(URL, 'createObjectURL', createObjectUrlDescriptor)
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL')
      }
      if (revokeObjectUrlDescriptor) {
        Object.defineProperty(URL, 'revokeObjectURL', revokeObjectUrlDescriptor)
      } else {
        Reflect.deleteProperty(URL, 'revokeObjectURL')
      }
      if (imageDescriptor) Object.defineProperty(globalThis, 'Image', imageDescriptor)
    }
  })

  it('labels a personal Hukamnama and its exact companion text without calling it today\'s reading', async () => {
    const personalContent: ShareHighlightContent = {
      ...passageContent,
      passageKind: 'personal-hukamnama',
      seriesLabel: 'Personal Hukamnama',
      dateLabel: undefined,
      sourcePath: '/study?shabadId=2591&flow=ardaas-hukamnama&randomHukamnamaAng=680',
      sharePath: '/p/2591/680',
      provenance: {
        ...passageContent.provenance,
        dateIso: undefined,
      },
    }
    mocks.exportStoryPng.mockImplementationOnce(async () => makePngExport(
      undefined,
      'naamras-hukamnama.png',
      1920,
      makeStorySelection(['header', 'verse-1'], {
        mode: 'excerpt',
        includedLineCount: 2,
        totalLineCount: 3,
        nextSourceLineId: 'verse-2',
      }),
    ))

    render(<ShareHighlightSheet open onClose={vi.fn()} content={personalContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    expect(within(dialog).getByText('Share this personal Hukamnama')).toBeInTheDocument()
    await within(dialog).findByText('Personal Hukamnama excerpt')
    expect(within(dialog).queryByText(/today's Hukamnama/i)).not.toBeInTheDocument()
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].content.scopeCopy.excerpt)
      .toBe('Personal Hukamnama excerpt')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy full text' }))
    await waitFor(() => {
      const copiedText = mocks.copyText.mock.calls.at(-1)?.[0] as string
      expect(copiedText).toContain('Personal Hukamnama excerpt · 2 of 3 lines in this image')
      expect(copiedText).not.toContain("today's Hukamnama")
      expect(copiedText).toContain('https://naamras.xyz/p/2591/680')
    })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Share image' }))
    await waitFor(() => {
      const shareData = mocks.shareFile.mock.calls.at(-1)?.[1]
      expect(shareData.text).toContain('The attached image contains an excerpt from this personal Hukamnama.')
      expect(shareData.text).not.toContain("today's Hukamnama")
      expect(shareData.url).toBe('https://naamras.xyz/p/2591/680')
    })
  })

  it('uses pill and artwork controls to update the exact renderer input', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    await waitFor(() => expect(mocks.exportPng).toHaveBeenCalled())
    const transliteration = within(dialog).getByRole('button', { name: 'Transliteration' })
    const meaning = within(dialog).getByRole('button', { name: 'Meaning' })
    expect(transliteration).toHaveAttribute('aria-pressed', 'true')
    expect(meaning).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(transliteration)
    fireEvent.click(meaning)
    fireEvent.click(within(dialog).getByRole('radio', { name: /No art/i }))

    await waitFor(() => {
      const lastInput = mocks.exportPng.mock.calls.at(-1)?.[0]
      expect(lastInput.artwork).toBeNull()
      expect(lastInput.textPosition).toBe('auto')
      expect(lastInput.content.transliteration).toBeNull()
      expect(lastInput.content.meaning).toBeNull()
    })
  })

  it('defaults to Auto and applies a one-tap text position choice', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const positionGroup = within(dialog).getByRole('radiogroup', { name: 'Text position' })
    const auto = within(positionGroup).getByRole('radio', { name: 'Auto' })

    expect(auto).toBeChecked()
    expect(within(positionGroup).getByRole('radio', { name: 'Top' })).not.toBeChecked()
    expect(within(positionGroup).getByRole('radio', { name: 'Middle' })).not.toBeChecked()
    expect(within(positionGroup).getByRole('radio', { name: 'Bottom' })).not.toBeChecked()

    await waitFor(() => {
      expect(mocks.exportPng.mock.calls.at(-1)?.[0].textPosition).toBe('auto')
    })

    fireEvent.click(within(positionGroup).getByRole('radio', { name: 'Bottom' }))

    await waitFor(() => {
      expect(mocks.exportPng.mock.calls.at(-1)?.[0].textPosition).toBe('bottom')
    })
  })

  it('resets text position for new content and each reopened composer', async () => {
    const view = render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const choosePosition = (name: 'Top' | 'Bottom') => {
      const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
      const group = within(dialog).getByRole('radiogroup', { name: 'Text position' })
      fireEvent.click(within(group).getByRole('radio', { name }))
    }

    choosePosition('Bottom')
    await waitFor(() => {
      expect(mocks.exportPng.mock.calls.at(-1)?.[0].textPosition).toBe('bottom')
    })

    const nextContent = { ...content, gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ', verseId: 102 }
    view.rerender(<ShareHighlightSheet open onClose={vi.fn()} content={nextContent} />)

    await waitFor(() => {
      const group = within(screen.getByRole('dialog', { name: 'Share highlight' }))
        .getByRole('radiogroup', { name: 'Text position' })
      expect(within(group).getByRole('radio', { name: 'Auto' })).toBeChecked()
      expect(mocks.exportPng.mock.calls.at(-1)?.[0].textPosition).toBe('auto')
    })

    choosePosition('Top')
    await waitFor(() => {
      expect(mocks.exportPng.mock.calls.at(-1)?.[0].textPosition).toBe('top')
    })

    view.rerender(<ShareHighlightSheet open={false} onClose={vi.fn()} content={nextContent} />)
    view.rerender(<ShareHighlightSheet open onClose={vi.fn()} content={nextContent} />)

    await waitFor(() => {
      const group = within(screen.getByRole('dialog', { name: 'Share highlight' }))
        .getByRole('radiogroup', { name: 'Text position' })
      expect(within(group).getByRole('radio', { name: 'Auto' })).toBeChecked()
      expect(mocks.exportPng.mock.calls.at(-1)?.[0].textPosition).toBe('auto')
    })
  })

  it('hides placement for no-art and returns to a centered automatic state', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const positionGroup = within(dialog).getByRole('radiogroup', { name: 'Text position' })
    fireEvent.click(within(positionGroup).getByRole('radio', { name: 'Top' }))

    const artworkGroup = within(dialog).getByRole('group', { name: 'Artwork' })
    fireEvent.click(within(artworkGroup).getByRole('radio', { name: /No art/i }))

    expect(within(dialog).queryByRole('radiogroup', { name: 'Text position' })).not.toBeInTheDocument()
    await waitFor(() => {
      const lastInput = mocks.exportPng.mock.calls.at(-1)?.[0]
      expect(lastInput.artwork).toBeNull()
      expect(lastInput.textPosition).toBe('auto')
    })

    fireEvent.click(within(artworkGroup).getAllByRole('radio')[1])
    const restoredGroup = within(dialog).getByRole('radiogroup', { name: 'Text position' })
    expect(within(restoredGroup).getByRole('radio', { name: 'Auto' })).toBeChecked()
  })

  it('shares, saves, and copies through the dedicated actions with visible status', async () => {
    const onNotice = vi.fn()
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} onNotice={onNotice} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })

    await waitFor(() => expect(shareButton).toBeEnabled())
    fireEvent.click(shareButton)
    await waitFor(() => {
      expect(mocks.shareFile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'naamras-highlight-101.png' }),
        expect.objectContaining({
          text: expect.stringContaining(content.caption!),
        })
      )
      expect(mocks.shareFile.mock.calls.at(-1)?.[1]?.text).toContain(
        'https://naamras.xyz/study?source=G&ang=1&verseId=101',
      )
      expect(mocks.shareFile.mock.calls.at(-1)?.[1]).toMatchObject({
        url: 'https://naamras.xyz/study?source=G&ang=1&verseId=101',
      })
      expect(mocks.shareFile.mock.calls.at(-1)?.[1]?.text).toContain(
        'Personal reflection:\nA line I am carrying today.\n——'
      )
      expect(mocks.shareFile.mock.calls.at(-1)?.[1]?.text).toContain('Sri Harmandir Sahib, Amritsar')
      expect(mocks.shareFile.mock.calls.at(-1)?.[1]?.text).toContain('Translation: Manmohan Singh')
      expect(within(dialog).getByRole('status')).toHaveTextContent('Shared successfully.')
    })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Download image' }))
    expect(mocks.downloadFile).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/png' }))
    expect(within(dialog).getByRole('status')).toHaveTextContent('Download started.')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy text' }))
    await waitFor(() => {
      expect(mocks.copyText).toHaveBeenCalledWith(
        expect.stringContaining(content.gurmukhi),
        expect.objectContaining({ focusTarget: expect.any(HTMLButtonElement) })
      )
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining(content.gurmukhi))
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('https://naamras.xyz/study?source=G&ang=1&verseId=101'),
      )
      expect(onNotice).toHaveBeenCalledWith('Text copied.')
    })
  })

  it('restores the Copy trigger after an asynchronous fallback moves modal focus', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const copyButton = within(dialog).getByRole('button', { name: 'Copy text' })
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Share image' })).toBeEnabled())
    mocks.copyText.mockImplementationOnce(async (_text: string, options: { focusTarget?: HTMLElement }) => {
      expect(options.focusTarget).toBe(copyButton)
      dialog.focus()
      return { method: 'exec-command' }
    })

    copyButton.focus()
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(copyButton).toBeEnabled()
      expect(document.activeElement).toBe(copyButton)
    })
  })

  it('never turns unsupported or failed native sharing into a surprise download', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })

    await waitFor(() => expect(shareButton).toBeEnabled())
    mocks.shareFile.mockResolvedValueOnce({
      status: 'unsupported',
      method: 'web-share',
      reason: 'file-share-unsupported',
    })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        'Native sharing is unavailable here.'
      )
      expect(shareButton).toBeEnabled()
    })
    expect(mocks.downloadFile).not.toHaveBeenCalled()

    mocks.shareFile.mockResolvedValueOnce({
      status: 'failed',
      method: 'web-share',
      error: new Error('target failed'),
    })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        'The share sheet could not open.'
      )
    })
    expect(mocks.downloadFile).not.toHaveBeenCalled()
  })

  it('discloses when a share target accepts only the image payload', async () => {
    mocks.shareFile.mockResolvedValueOnce({
      status: 'shared',
      method: 'web-share',
      payload: 'file-only',
    })
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })

    await waitFor(() => expect(shareButton).toBeEnabled())
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(within(dialog).getByRole('status')).toHaveTextContent('Image shared.')
      expect(within(dialog).getByRole('status')).toHaveTextContent('Copy full text')
      expect(within(dialog).getByRole('status')).not.toHaveTextContent('Shared successfully.')
    })
  })

  it('cancels a pending native-share timeout when the composer closes', async () => {
    let resolveShare!: (result: {
      status: 'shared'
      method: 'web-share'
      payload: 'full'
    }) => void
    const pendingShare = new Promise<{
      status: 'shared'
      method: 'web-share'
      payload: 'full'
    }>(resolve => {
      resolveShare = resolve
    })
    mocks.shareFile.mockReturnValueOnce(pendingShare)
    const onNotice = vi.fn()
    const view = render(
      <ShareHighlightSheet open onClose={vi.fn()} content={content} onNotice={onNotice} />
    )
    const shareButton = within(screen.getByRole('dialog', { name: 'Share highlight' }))
      .getByRole('button', { name: 'Share image' })
    await waitFor(() => expect(shareButton).toBeEnabled())

    vi.useFakeTimers()
    fireEvent.click(shareButton)
    view.rerender(
      <ShareHighlightSheet open={false} onClose={vi.fn()} content={content} onNotice={onNotice} />
    )

    await act(async () => {
      vi.advanceTimersByTime(45_000)
      await Promise.resolve()
    })
    expect(onNotice).not.toHaveBeenCalled()

    await act(async () => {
      resolveShare({ status: 'shared', method: 'web-share', payload: 'full' })
      await pendingShare
    })
    expect(onNotice).not.toHaveBeenCalled()
  })

  it('locks rapid Share taps to one native invocation and recovers when it settles', async () => {
    let resolveShare!: (result: { status: 'shared'; method: 'web-share'; payload: 'full' }) => void
    const pendingShare = new Promise<{ status: 'shared'; method: 'web-share'; payload: 'full' }>(resolve => {
      resolveShare = resolve
    })
    mocks.shareFile.mockReturnValueOnce(pendingShare)

    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })
    await waitFor(() => expect(shareButton).toBeEnabled())

    fireEvent.click(shareButton)
    fireEvent.click(shareButton)

    expect(mocks.shareFile).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: 'Opening share sheet…' })).toBeDisabled()

    await act(async () => {
      resolveShare({ status: 'shared', method: 'web-share', payload: 'full' })
      await pendingShare
    })
    await waitFor(() => expect(shareButton).toBeEnabled())
  })

  it('ignores stale render results and offers an exact retry after a render failure', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const artworkGroup = within(dialog).getByRole('group', { name: 'Artwork' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })
    await waitFor(() => expect(shareButton).toBeEnabled())

    let resolveStale!: (value: ReturnType<typeof makePngExport>) => void
    let resolveLatest!: (value: ReturnType<typeof makePngExport>) => void
    const staleRender = new Promise<ReturnType<typeof makePngExport>>(resolve => { resolveStale = resolve })
    const latestRender = new Promise<ReturnType<typeof makePngExport>>(resolve => { resolveLatest = resolve })
    mocks.exportPng
      .mockReturnValueOnce(staleRender)
      .mockReturnValueOnce(latestRender)

    fireEvent.click(within(artworkGroup).getByRole('radio', { name: /No art/i }))
    await waitFor(() => expect(mocks.exportPng).toHaveBeenCalledTimes(2))
    fireEvent.click(within(artworkGroup).getAllByRole('radio')[2])
    await new Promise(resolve => window.setTimeout(resolve, 120))
    expect(mocks.exportPng).toHaveBeenCalledTimes(2)

    const latestExport = makePngExport(undefined, 'latest-share.png')
    const staleExport = makePngExport(undefined, 'stale-share.png')
    await act(async () => {
      resolveStale(staleExport)
      await staleRender
    })
    await waitFor(() => expect(mocks.exportPng).toHaveBeenCalledTimes(3))
    await act(async () => {
      resolveLatest(latestExport)
      await latestRender
    })
    await waitFor(() => expect(shareButton).toBeEnabled())
    fireEvent.click(shareButton)
    await waitFor(() => expect(mocks.shareFile).toHaveBeenCalledWith(
      latestExport.file,
      expect.any(Object)
    ))

    mocks.exportPng.mockRejectedValueOnce(new Error('canvas failed'))
    fireEvent.click(within(artworkGroup).getByRole('radio', { name: /No art/i }))
    const retryButton = await within(dialog).findByRole('button', { name: 'Retry image' })
    expect(shareButton).toBeDisabled()

    fireEvent.click(retryButton)
    await waitFor(() => {
      expect(within(dialog).queryByRole('button', { name: 'Retry image' })).not.toBeInTheDocument()
      expect(shareButton).toBeEnabled()
    })
  })

  it('offers a focus-safe No art fallback when a selected Hukamnama artwork fails', async () => {
    const user = userEvent.setup()
    mocks.exportStoryPng.mockRejectedValueOnce(new Error('artwork decode failed'))
    render(
      <ShareHighlightSheet
        open
        onClose={vi.fn()}
        content={passageContent}
        initialArtworkId="court-mural"
      />
    )
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const useNoArtwork = await within(dialog).findByRole('button', { name: 'Use No art' })

    await user.click(useNoArtwork)

    const noArtwork = within(dialog).getByRole('radio', { name: 'No art' })
    await waitFor(() => {
      expect(noArtwork).toBeChecked()
      expect(noArtwork).toHaveFocus()
      expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].artwork).toBeNull()
      expect(within(dialog).queryByRole('button', { name: 'Use No art' }))
        .not.toBeInTheDocument()
    })
  })

  it('localizes visible controls and suppresses full-line supports for selected excerpts', async () => {
    render(
      <ShareHighlightSheet
        open
        onClose={vi.fn()}
        locale="pa"
        content={{
          ...content,
          selectedExcerpt: true,
        }}
      />
    )

    const dialog = screen.getByRole('dialog', { name: 'ਝਲਕ ਸਾਂਝੀ ਕਰੋ' })
    expect(within(dialog).getByText('ਯਾਦ ਲਈ ਇੱਕ ਪੰਕਤੀ ਸਾਂਝੀ ਕਰੋ')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'ਤਸਵੀਰ ਸਾਂਝੀ ਕਰੋ' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /ਲਿਪੀਅੰਤਰਨ.*ਉਪਲਬਧ ਨਹੀਂ/i })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: /ਅਰਥ.*ਉਪਲਬਧ ਨਹੀਂ/i })).toBeDisabled()
    expect(within(dialog).getByRole('radiogroup', { name: 'ਲਿਖਤ ਦੀ ਥਾਂ' })).toBeInTheDocument()

    await waitFor(() => {
      const lastInput = mocks.exportPng.mock.calls.at(-1)?.[0]
      expect(lastInput.content.transliteration).toBeNull()
      expect(lastInput.content.meaning).toBeNull()
    })
  })
})
