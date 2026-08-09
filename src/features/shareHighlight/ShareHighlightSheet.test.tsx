import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ShareHighlightSheet, { type ShareHighlightContent } from './ShareHighlightSheet'
import { getCanonicalSourceUrl, getHukamnamaShareUrl } from './sourceUrl'
import type { ShareHighlightStorySelection } from './types'

const mocks = vi.hoisted(() => {
  return {
    exportPng: vi.fn(),
    exportStoryPng: vi.fn(),
    shareFile: vi.fn(),
    downloadFile: vi.fn(),
    copyText: vi.fn(),
  }
})

vi.mock('./renderer', () => ({
  exportShareHighlightPng: mocks.exportPng,
  exportShareHighlightStoryPng: mocks.exportStoryPng,
}))

vi.mock('./share', () => ({
  shareHighlightFile: mocks.shareFile,
  downloadShareHighlightFile: mocks.downloadFile,
  copyShareHighlightText: mocks.copyText,
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
  mocks.downloadFile.mockReset()
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
  it('presents immutable scripture, a live preview, and every artwork choice accessibly', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={content} />)

    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })
    expect(within(dialog).getByText('Share a line for remembrance')).toBeInTheDocument()
    expect(within(dialog).getByRole('img', { name: 'Share image preview' })).toHaveAttribute('width', '1080')
    expect(within(dialog).getAllByText(content.sourceLabel).length).toBeGreaterThanOrEqual(1)
    expect(within(dialog).getByText('naamras.xyz')).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Text shown in the image' }))
      .toHaveTextContent(content.gurmukhi)
    expect(within(dialog).getByRole('radio', { name: /Court Mural.*procession/i })).toBeInTheDocument()
    const note = within(dialog).getByRole('textbox', { name: /Social note/i })
    const describedByIds = note.getAttribute('aria-describedby')?.split(' ') ?? []
    expect(describedByIds).toHaveLength(2)
    describedByIds.forEach(id => expect(document.getElementById(id)).toBeInTheDocument())

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
    expect(within(dialog).getByRole('button', { name: 'Download image' })).toBeEnabled()
  })

  it('builds the full Hukamnama as one ordered, story-ready image with every artwork choice', async () => {
    render(<ShareHighlightSheet open onClose={vi.fn()} content={passageContent} />)
    const dialog = screen.getByRole('dialog', { name: 'Share highlight' })

    expect(within(dialog).getByText("Share today's Hukamnama")).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Create a Story image' })).toBeInTheDocument()
    expect(within(dialog).getByText(/Meaning places each complete selected translation directly below its matching Gurbani line/i)).toBeInTheDocument()
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
    expect(within(dialog).getByRole('button', { name: 'Meaning' })).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => expect(mocks.exportStoryPng).toHaveBeenCalled())
    expect(await within(dialog).findByText('Complete Hukamnama')).toBeInTheDocument()
    expect(within(dialog).getByText('3 of 3 lines in this image')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', {
      name: /Read this exact passage on NaamRas.*https:\/\/naamras\.xyz\/h\/2026-07-15/i,
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
    expect(initialInput.fileNameBase).toBe('naamras-hukamnama-2026-07-15')
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[1]).toBeUndefined()
    expect(mocks.exportPng).not.toHaveBeenCalled()
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

  it('hides artwork controls after renderer preflight chooses the quiet manuscript', async () => {
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

    await waitFor(() => {
      expect(within(dialog).queryByRole('radiogroup', { name: 'Artwork' })).not.toBeInTheDocument()
      expect(within(dialog).getByText(/quiet manuscript background/i)).toBeInTheDocument()
    })
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].artwork).not.toBeNull()
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
      expect(within(dialog).getByRole('status')).toHaveTextContent('Bilingual Story ready.')
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
      expect(within(dialog).getByRole('status')).toHaveTextContent('Bilingual Story ready.')
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

  it('keeps Meaning selected, labels a long Story as an excerpt, and changes passage accessibly', async () => {
    const longPassageLines = [
      passageContent.passageLines![0],
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `verse-${index + 1}`,
        gurmukhi: `ਗੁਰਬਾਣੀ ਪੰਕਤੀ ${index + 1} ॥`,
        transliteration: `gurbani line ${index + 1}`,
        meaning: `Meaning line ${index + 1}.`,
      })),
    ]
    mocks.exportStoryPng.mockImplementation(async (input: {
      content: {
        anchorLineId?: string | number | null
        lines: Array<{ id: string | number; meaning?: string | null }>
      }
    }) => {
      const changedPassage = input.content.anchorLineId === 'verse-3'
      const includedIds = changedPassage
        ? ['verse-3', 'verse-4', 'verse-5']
        : ['header', 'verse-1', 'verse-2']
      return makePngExport(
        undefined,
        'naamras-hukamnama-2026-07-15.png',
        1920,
        makeStorySelection(includedIds, {
          mode: 'excerpt',
          anchorSourceLineId: changedPassage ? 'verse-3' : 'header',
          includedLineCount: includedIds.length,
          totalLineCount: longPassageLines.length,
          previousSourceLineId: changedPassage ? 'header' : null,
          nextSourceLineId: changedPassage ? 'verse-6' : 'verse-3',
        }),
      )
    })

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
    const shareButton = within(dialog).getByRole('button', { name: 'Share image' })

    await waitFor(() => expect(shareButton).toBeEnabled())
    expect(meaning).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).getByText("Excerpt from today's Hukamnama")).toBeInTheDocument()
    expect(within(dialog).getByText('3 of 7 lines in this image')).toBeInTheDocument()
    expect(within(dialog).queryByText('Complete Hukamnama')).not.toBeInTheDocument()
    expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].content.lines.every(
      (line: { meaning?: string | null }) => Boolean(line.meaning)
    )).toBe(true)

    const previousButton = within(dialog).getByRole('button', { name: 'Previous passage' })
    const nextButton = within(dialog).getByRole('button', { name: 'Next passage' })
    expect(previousButton).toBeDisabled()
    expect(nextButton).toBeEnabled()
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(mocks.exportStoryPng.mock.calls.at(-1)?.[0].content.anchorLineId).toBe('verse-3')
      expect(previousButton).toBeEnabled()
      expect(meaning).toHaveAttribute('aria-pressed', 'true')
    })
    const imageText = within(dialog).getByRole('region', { name: 'Text shown in the image' })
    expect(imageText).toHaveTextContent('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 3 ॥')
    expect(imageText).not.toHaveTextContent('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 1 ॥')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy full text' }))
    await waitFor(() => {
      const copiedText = vi.mocked(window.navigator.clipboard.writeText).mock.calls.at(-1)?.[0]
      expect(copiedText).toContain("Excerpt from today's Hukamnama · 3 of 7 lines in this image")
      expect(copiedText).toContain('The complete Hukamnama text follows.')
      expect(copiedText).toContain('Meaning line 6.')
      expect(copiedText).toContain('https://naamras.xyz/h/2026-07-15')
    })

    fireEvent.click(shareButton)
    await waitFor(() => {
      const shareData = mocks.shareFile.mock.calls.at(-1)?.[1]
      expect(shareData.text).toContain("Excerpt from today's Hukamnama · 3 of 7 lines in this image")
      expect(shareData.text).toContain('ਗੁਰਬਾਣੀ ਪੰਕਤੀ 3 ॥')
      expect(shareData.text).not.toContain('The attached image contains the complete Hukamnama')
      expect(shareData.text).toContain("The attached image contains an excerpt from today's Hukamnama")
      expect(shareData.url).toBe('https://naamras.xyz/h/2026-07-15')
    })
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
    const artworkGroup = within(dialog).getByRole('radiogroup', { name: 'Artwork' })
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
    await waitFor(() => expect(mocks.exportPng).toHaveBeenCalledTimes(3))

    const latestExport = makePngExport(undefined, 'latest-share.png')
    const staleExport = makePngExport(undefined, 'stale-share.png')
    await act(async () => {
      resolveLatest(latestExport)
      await latestRender
      resolveStale(staleExport)
      await staleRender
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
