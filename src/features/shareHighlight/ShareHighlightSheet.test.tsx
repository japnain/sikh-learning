import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ShareHighlightSheet, { type ShareHighlightContent } from './ShareHighlightSheet'

const mocks = vi.hoisted(() => {
  class ContentOverflowError extends Error {
    readonly code = 'share-highlight-content-overflow'
    readonly reason = 'support-overflow'
    readonly supportRoles = ['meaning']

    constructor() {
      super('The Story content does not fit.')
      this.name = 'ShareHighlightContentOverflowError'
    }
  }

  return {
    ContentOverflowError,
    exportPng: vi.fn(),
    exportStoryPng: vi.fn(),
    shareFile: vi.fn(),
    downloadFile: vi.fn(),
  }
})

vi.mock('./renderer', () => ({
  ShareHighlightContentOverflowError: mocks.ContentOverflowError,
  exportShareHighlightPng: mocks.exportPng,
  exportShareHighlightStoryPng: mocks.exportStoryPng,
}))

vi.mock('./share', () => ({
  shareHighlightFile: mocks.shareFile,
  downloadShareHighlightFile: mocks.downloadFile,
}))

const content: ShareHighlightContent = {
  gurmukhi: 'ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
  transliteration: 'sat naam kartaa purakh',
  meaning: 'True is the Name, the Creator.',
  sourceLabel: 'Sri Guru Granth Sahib Ji · Ang 1',
  caption: 'A line I am carrying today.',
  verseId: 101,
  initialShowTransliteration: true,
  initialShowMeaning: true,
}

const passageContent: ShareHighlightContent = {
  gurmukhi: 'ਸਲੋਕ ॥\nਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ॥\nਨਿਰਮਲ ਸੰਤ ਸੰਗੇਣ ॥',
  transliteration: 'salok\nsant udharan daiaalang\nnirmal sant sangen',
  meaning: 'Salok.\nThe Merciful Lord saves the Saints.\nOne becomes immaculate with the Saints.',
  sourceLabel: 'SGGS · Ang 709',
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
}

function makePngExport(
  canvas?: HTMLCanvasElement,
  fileName = 'naamras-highlight-101.png',
  height: 1350 | 1920 = 1350
) {
  const resolvedCanvas = canvas ?? document.createElement('canvas')
  const blob = new Blob(['png'], { type: 'image/png' })
  const file = new File([blob], fileName, { type: 'image/png' })
  return {
    canvas: resolvedCanvas,
    blob,
    file,
    width: 1080 as const,
    height,
  }
}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
})

beforeEach(() => {
  mocks.exportPng.mockReset()
  mocks.exportPng.mockImplementation(async (_input, options) => makePngExport(options?.canvas))
  mocks.exportStoryPng.mockReset()
  mocks.exportStoryPng.mockImplementation(async () => (
    makePngExport(undefined, 'naamras-hukamnama-July-15-2026.png', 1920)
  ))
  mocks.shareFile.mockReset()
  mocks.shareFile.mockResolvedValue({ status: 'shared', method: 'web-share' })
  mocks.downloadFile.mockReset()
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('ShareHighlightSheet', () => {
  it('presents immutable scripture, a live preview, and every artwork choice accessibly', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)

    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    expect(within(dialog).getByText('Share a line for remembrance')).toBeInTheDocument()
    expect(within(dialog).getByRole('img', { name: 'Share image preview' })).toHaveAttribute('width', '1080')
    expect(within(dialog).getByText(content.sourceLabel)).toBeInTheDocument()
    expect(within(dialog).getByText('naamras.xyz')).toBeInTheDocument()

    const gurmukhi = within(dialog).getByRole('button', { name: /Gurmukhi.*Always included/i })
    expect(gurmukhi).toBeDisabled()
    expect(gurmukhi).toHaveAttribute('aria-pressed', 'true')

    const artworkGroup = within(dialog).getByRole('radiogroup', { name: 'Artwork' })
    const artworkChoices = within(artworkGroup).getAllByRole('radio')
    expect(artworkChoices).toHaveLength(15)
    expect(within(dialog).getByRole('radio', { name: /No art/i })).not.toBeChecked()

    await waitFor(() => expect(mocks.exportPng).toHaveBeenCalled())
    expect(within(dialog).getByRole('status')).toHaveTextContent('Image ready.')
    expect(within(dialog).getByRole('button', { name: 'Share image' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Save image' })).toBeEnabled()
  })

  it('builds the full Hukamnama as one ordered, story-ready image with every artwork choice', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    expect(within(dialog).getByText('Share the full Hukamnama')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Create a Story image' })).toBeInTheDocument()
    expect(within(dialog).getByText(/Choose Meaning for a bilingual Story with the complete English translation beside it/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('radiogroup', { name: 'Text position' })).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/Page \d+ of \d+/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Previous image|Next image/i })).not.toBeInTheDocument()

    const preview = within(dialog).getByRole('img', { name: 'Share image preview' })
    expect(preview).toHaveAttribute('width', '1080')
    expect(preview).toHaveAttribute('height', '1920')
    expect(preview.parentElement).toHaveClass('share-highlight__preview-frame--story')

    const artworkGroup = within(dialog).getByRole('radiogroup', { name: 'Artwork' })
    expect(within(artworkGroup).getAllByRole('radio')).toHaveLength(15)
    expect(within(dialog).getByRole('button', { name: 'Transliteration' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(dialog).getByRole('button', { name: 'Meaning' })).toHaveAttribute('aria-pressed', 'false')

    await waitFor(() => expect(mocks.exportStoryPng).toHaveBeenCalled())
    const initialInput = mocks.exportStoryPng.mock.calls.at(-1)?.[0]
    expect(initialInput.content.lines.map((line: { id: string }) => line.id)).toEqual([
      'header',
      'verse-1',
      'verse-2',
    ])
    expect(initialInput.content.lines[0]).toMatchObject({
      isHeader: true,
      transliteration: null,
      meaning: null,
    })
    expect(initialInput.content.lines.every((line: { transliteration: null; meaning: null }) => (
      line.transliteration === null && line.meaning === null
    ))).toBe(true)
    expect(initialInput.content).toMatchObject({
      sourceLabel: 'SGGS · Ang 709',
      seriesLabel: 'Daily Hukamnama',
      dateLabel: 'July 15, 2026',
    })
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[1]).toBeUndefined()
    expect(mocks.exportPng).not.toHaveBeenCalled()
  })

  it('shares and downloads one Story PNG and allows at most one reading support', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: 'Share image' })).toBeEnabled()
      expect(within(dialog).getByRole('status')).toHaveTextContent('Image ready.')
    })
    const storyExport = await mocks.exportStoryPng.mock.results.at(-1)?.value
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(mocks.shareFile).toHaveBeenCalledTimes(1)
      expect(mocks.shareFile.mock.calls[0][0]).toBe(storyExport.file)
      expect(mocks.shareFile.mock.calls[0][1]).toEqual({
        title: 'Hukamnama from NaamRas',
        text: '',
      })
    })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save image' }))
    await waitFor(() => {
      expect(mocks.downloadFile).toHaveBeenCalledWith(storyExport.file)
      expect(within(dialog).getByRole('status')).toHaveTextContent('Image saved.')
    })

    const transliteration = within(dialog).getByRole('button', { name: 'Transliteration' })
    const meaning = within(dialog).getByRole('button', { name: 'Meaning' })
    fireEvent.click(transliteration)
    await waitFor(() => {
      const lastInput = mocks.exportStoryPng.mock.calls.at(-1)?.[0]
      expect(lastInput.content.lines.every((line: { transliteration?: string; meaning: null }) => (
        Boolean(line.transliteration) && line.meaning === null
      ))).toBe(true)
    })
    expect(transliteration).toHaveAttribute('aria-pressed', 'true')
    expect(meaning).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(meaning)
    await waitFor(() => {
      const lastInput = mocks.exportStoryPng.mock.calls.at(-1)?.[0]
      expect(lastInput.content.lines.every((line: { transliteration: null; meaning?: string }) => (
        line.transliteration === null && Boolean(line.meaning)
      ))).toBe(true)
      expect(within(dialog).getByRole('status')).toHaveTextContent('Bilingual Story ready.')
    })
    expect(transliteration).toHaveAttribute('aria-pressed', 'false')
    expect(meaning).toHaveAttribute('aria-pressed', 'true')

    expect(storyExport).toMatchObject({ height: 1920 })
  })

  it('retains the valid preview but pauses Share and Save while preparing bilingual mode', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })
    const saveButton = within(dialog).getByRole('button', { name: 'Save image' })
    const copyButton = within(dialog).getByRole('button', { name: 'Copy text' })

    await waitFor(() => expect(shareButton).toBeEnabled())
    let resolveBilingual!: (value: ReturnType<typeof makePngExport>) => void
    const bilingualRender = new Promise<ReturnType<typeof makePngExport>>(resolve => {
      resolveBilingual = resolve
    })
    mocks.exportStoryPng.mockReturnValueOnce(bilingualRender)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Meaning' }))

    expect(within(dialog).getByRole('status')).toHaveTextContent('Preparing bilingual Story…')
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
      expect(within(dialog).getByRole('status')).toHaveTextContent('Bilingual Story ready.')
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

  it('falls back to a valid Gurmukhi-only Story when a reading support overflows', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })
    const meaning = within(dialog).getByRole('button', { name: 'Meaning' })

    await waitFor(() => expect(shareButton).toBeEnabled())
    const initialExport = await mocks.exportStoryPng.mock.results.at(-1)?.value
    mocks.exportStoryPng.mockRejectedValueOnce(new mocks.ContentOverflowError())

    fireEvent.click(meaning)
    expect(shareButton).toBeDisabled()

    const fitNote = await within(dialog).findByRole('note')
    expect(fitNote).toHaveTextContent('Meaning is too long to fit readably')
    expect(fitNote).toHaveTextContent('Showing Gurmukhi only')
    expect(fitNote).toHaveTextContent('Copy text')
    expect(meaning).toHaveAttribute('aria-pressed', 'false')

    await waitFor(() => {
      const attemptedInput = mocks.exportStoryPng.mock.calls.find(call => (
        call[0].content.lines.some((line: { meaning?: string }) => Boolean(line.meaning))
      ))?.[0]
      expect(attemptedInput).toBeDefined()
      const restoredInput = mocks.exportStoryPng.mock.calls.at(-1)?.[0]
      expect(restoredInput.content.lines.every((line: { transliteration: null; meaning: null }) => (
        line.transliteration === null && line.meaning === null
      ))).toBe(true)
      expect(shareButton).toBeEnabled()
    })

    const restoredExport = await mocks.exportStoryPng.mock.results.at(-1)?.value
    expect(restoredExport.file).not.toBe(initialExport.file)
    fireEvent.click(shareButton)
    await waitFor(() => {
      expect(mocks.shareFile).toHaveBeenCalledWith(
        restoredExport.file,
        expect.objectContaining({ title: 'Hukamnama from NaamRas' })
      )
    })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy text' }))
    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('The Merciful Lord saves the Saints.')
      )
    })
    expect(within(dialog).getByRole('note')).toBe(fitNote)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Transliteration' }))
    await waitFor(() => {
      expect(within(dialog).queryByRole('note')).not.toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Transliteration' })).toHaveAttribute('aria-pressed', 'true')
      expect(shareButton).toBeEnabled()
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

    const artworkGroup = within(dialog).getByRole('radiogroup', { name: 'Artwork' })
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
        expect.objectContaining({ text: content.caption })
      )
      expect(within(dialog).getByRole('status')).toHaveTextContent('Share sheet opened.')
    })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save image' }))
    expect(mocks.downloadFile).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/png' }))
    expect(within(dialog).getByRole('status')).toHaveTextContent('Image saved.')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy text' }))
    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining(content.gurmukhi))
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('naamras.xyz'))
      expect(onNotice).toHaveBeenCalledWith('Text copied.')
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
