import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ShareHighlightSheet, { type ShareHighlightContent } from './ShareHighlightSheet'

const mocks = vi.hoisted(() => ({
  exportPng: vi.fn(),
  shareFile: vi.fn(),
  downloadFile: vi.fn(),
}))

vi.mock('./renderer', () => ({
  exportShareHighlightPng: mocks.exportPng,
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

function makePngExport(canvas?: HTMLCanvasElement) {
  const resolvedCanvas = canvas ?? document.createElement('canvas')
  const blob = new Blob(['png'], { type: 'image/png' })
  const file = new File([blob], 'naamras-highlight-101.png', { type: 'image/png' })
  return {
    canvas: resolvedCanvas,
    blob,
    file,
    width: 1080 as const,
    height: 1350 as const,
  }
}

beforeEach(() => {
  mocks.exportPng.mockReset()
  mocks.exportPng.mockImplementation(async (_input, options) => makePngExport(options?.canvas))
  mocks.shareFile.mockReset()
  mocks.shareFile.mockResolvedValue({ status: 'shared', method: 'web-share' })
  mocks.downloadFile.mockReset()
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
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
