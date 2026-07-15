import { describe, expect, it, vi } from 'vitest'
import {
  ShareHighlightContentOverflowError,
  computeShareHighlightObjectCover,
  exportShareHighlightPng,
  exportShareHighlightPngSet,
  layoutShareHighlightCardText,
  layoutShareHighlightPassagePage,
  mapShareHighlightArtworkSafeZone,
  paginateShareHighlightPassage,
  renderShareHighlightCard,
  resolveShareHighlightOverlayPalette,
  resolveShareHighlightTextPanel,
  wrapShareHighlightText,
  type ShareHighlightRendererOptions,
} from './renderer'
import {
  SHARE_HIGHLIGHT_CARD_HEIGHT,
  SHARE_HIGHLIGHT_CARD_WIDTH,
  type ShareHighlightCardInput,
  type ShareHighlightPassageInput,
  type ShareHighlightPassageLine,
  type ShareHighlightTextStyle,
} from './types'

const baseStyle: ShareHighlightTextStyle = {
  fontFamily: 'sans-serif',
  fontSize: 10,
  fontStyle: 'normal',
  fontWeight: 400,
  lineHeight: 14,
  color: '#fff',
}

const measureByCharacter = (text: string, style: ShareHighlightTextStyle) => (
  Array.from(text).length * style.fontSize * 0.56
)

const input: ShareHighlightCardInput = {
  artwork: {
    id: 'test-art',
    src: '/test-art.png',
    focalPosition: { x: 0.75, y: 0.25 },
    textSafeZone: { x: 0.06, y: 0.2, width: 0.88, height: 0.66 },
    overlayTone: 'light',
  },
  content: {
    gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
    transliteration: 'Ik Oankaar Sat Naam Kartaa Purakh',
    meaning: 'One Universal Creator God. Truth is the Name.',
    sourceLabel: 'Sri Guru Granth Sahib Ji · Ang 1',
  },
}

const passageLines: ShareHighlightPassageLine[] = [
  {
    id: 'salok',
    gurmukhi: 'ਸਲੋਕ ॥',
    transliteration: 'salok',
    meaning: 'Salok.',
    isHeader: true,
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `salok-${index + 1}`,
    gurmukhi: `ਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ਆਸਰੰ ਗੋਪਾਲ ਕੀਰਤਨਹ ॥ ${index + 1}`,
    transliteration: `sant udharan dayaalan aasaran gopaal keeratanah ${index + 1}`,
    meaning: `The Merciful Lord is the Savior of the Saints; their support is to sing the Lord's praises. ${index + 1}`,
  })),
  {
    id: 'pauree',
    gurmukhi: 'ਪਉੜੀ ॥',
    transliteration: 'pauree',
    meaning: 'Pauree.',
    isHeader: true,
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `pauree-${index + 1}`,
    gurmukhi: `ਚਰਨ ਕਮਲ ਕੀ ਓਟ ਉਧਰੇ ਸਗਲ ਜਨ ॥ ${index + 1}`,
    transliteration: `charan kamal kee ott udhare sagal jan ${index + 1}`,
    meaning: `All are saved in the shelter of the Lord's lotus feet, held in remembrance. ${index + 1}`,
  })),
]

const passageInput: ShareHighlightPassageInput = {
  artwork: input.artwork,
  content: {
    lines: passageLines,
    sourceLabel: 'Sri Guru Granth Sahib Ji · Ang 709',
    seriesLabel: "Today's Hukamnama",
    dateLabel: 'July 15, 2026',
  },
  fileNameBase: 'naamras-hukamnama-2026-07-15',
}

function makeFakeRendererEnvironment() {
  const drawnText: string[] = []
  const drawnTextCalls: Array<{ text: string; x: number; y: number; shadowBlur: number }> = []
  const gradients: Array<{ addColorStop: ReturnType<typeof vi.fn> }> = []
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => {
      const gradient = { addColorStop: vi.fn() }
      gradients.push(gradient)
      return gradient
    }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn((text: string) => {
      const size = Number(context.font.match(/(\d+)px/)?.[1] ?? 16)
      return { width: Array.from(text).length * size * 0.52 }
    }),
    fillText: vi.fn((text: string, x: number, y: number) => {
      drawnText.push(text)
      drawnTextCalls.push({ text, x, y, shadowBlur: context.shadowBlur })
    }),
  }
  const encodedBlob = new Blob(['png'], { type: 'image/png' })
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback) => callback(encodedBlob)),
  } as unknown as HTMLCanvasElement
  const fontSet = {
    ready: Promise.resolve(),
    load: vi.fn().mockResolvedValue([]),
  }
  const options: ShareHighlightRendererOptions = {
    canvas,
    fontSet,
    loadImage: vi.fn().mockResolvedValue({
      source: {} as CanvasImageSource,
      width: 1600,
      height: 900,
    }),
  }

  return { canvas, context, drawnText, drawnTextCalls, encodedBlob, fontSet, gradients, options }
}

function makeFakePassageRendererEnvironment() {
  const first = makeFakeRendererEnvironment()
  const renders = [first]
  const createCanvas = vi.fn(() => {
    const next = makeFakeRendererEnvironment()
    renders.push(next)
    return next.canvas
  })
  const options: ShareHighlightRendererOptions = {
    canvas: first.canvas,
    createCanvas,
    fontSet: first.fontSet,
    loadImage: first.options.loadImage,
  }

  return { first, renders, createCanvas, options }
}

describe('computeShareHighlightObjectCover', () => {
  it('crops a landscape image and honors the focal position', () => {
    const placement = computeShareHighlightObjectCover(2000, 1000, 1080, 1350, { x: 1, y: 0.5 })

    expect(placement.sourceWidth).toBeCloseTo(800)
    expect(placement.sourceHeight).toBeCloseTo(1000)
    expect(placement.sourceX).toBeCloseTo(1200)
    expect(placement.sourceY).toBeCloseTo(0)
    expect(placement.destinationWidth).toBe(1080)
    expect(placement.destinationHeight).toBe(1350)
  })

  it('rejects zero-sized artwork instead of producing an invalid crop', () => {
    expect(() => computeShareHighlightObjectCover(0, 1000)).toThrow(RangeError)
  })
})

describe('wrapShareHighlightText', () => {
  it('wraps regular words without dropping any text', () => {
    const lines = wrapShareHighlightText('alpha beta gamma', 62, baseStyle, measureByCharacter)

    expect(lines).toEqual(['alpha beta', 'gamma'])
    expect(lines.join(' ')).toBe('alpha beta gamma')
  })

  it('grapheme-wraps an oversized token instead of truncating it', () => {
    const text = 'ਸਤਿਨਾਮੁਵਾਹਿਗੁਰੂਸਤਿਨਾਮੁਵਾਹਿਗੁਰੂ'
    const lines = wrapShareHighlightText(text, 50, baseStyle, measureByCharacter)

    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join('')).toBe(text)
    expect(lines.every(line => measureByCharacter(line, baseStyle) <= 50)).toBe(true)
  })

  it('preserves explicit paragraph breaks', () => {
    expect(wrapShareHighlightText('first\n\nsecond', 100, baseStyle, measureByCharacter)).toEqual([
      'first',
      '',
      'second',
    ])
  })
})

describe('layoutShareHighlightCardText', () => {
  it('lays out every optional layer inside the protected panel', () => {
    const layout = layoutShareHighlightCardText(input.content, measureByCharacter, input.artwork?.textSafeZone)

    expect(layout.width).toBe(SHARE_HIGHLIGHT_CARD_WIDTH)
    expect(layout.height).toBe(SHARE_HIGHLIGHT_CARD_HEIGHT)
    expect(layout.sections.map(section => section.role)).toEqual([
      'gurmukhi',
      'transliteration',
      'meaning',
    ])
    expect(layout.sections.every(section => (
      section.y >= layout.panel.y
      && section.y + section.height <= layout.panel.y + layout.panel.height
    ))).toBe(true)
  })

  it('reduces type size for a long highlight before giving up', () => {
    const layout = layoutShareHighlightCardText({
      gurmukhi: Array.from({ length: 62 }, () => 'ਗੁਰਬਾਣੀ').join(' '),
      transliteration: null,
      meaning: null,
      sourceLabel: 'Ang 1',
    }, measureByCharacter)

    expect(layout.contentScale).toBeLessThan(1)
    expect(layout.sections.find(section => section.role === 'gurmukhi')?.lines.join(' ')).toBe(
      Array.from({ length: 62 }, () => 'ਗੁਰਬਾਣੀ').join(' ')
    )
  })

  it('uses authored safe-zone width instead of a fixed oversized panel', () => {
    const narrow = layoutShareHighlightCardText(input.content, measureByCharacter, {
      x: 0.72,
      y: 0.14,
      width: 0.08,
      height: 0.12,
    })
    const wide = layoutShareHighlightCardText(input.content, measureByCharacter, {
      x: 0.06,
      y: 0.14,
      width: 0.88,
      height: 0.12,
    })

    expect(narrow.panel.width).toBeLessThan(wide.panel.width)
    expect(narrow.panel.width).toBeLessThan(600)
    expect(narrow.panel.y).toBeGreaterThanOrEqual(78)
    expect(narrow.panel.y + narrow.panel.height).toBeLessThanOrEqual(1180)
  })

  it('uses both safe-zone y and height to anchor auto placement', () => {
    const shallow = layoutShareHighlightCardText(input.content, measureByCharacter, {
      x: 0.2,
      y: 0.28,
      width: 0.55,
      height: 0.12,
    })
    const tall = layoutShareHighlightCardText(input.content, measureByCharacter, {
      x: 0.2,
      y: 0.28,
      width: 0.55,
      height: 0.42,
    })

    expect(tall.panel.y).toBeGreaterThan(shallow.panel.y)
  })

  it('places the same content using intuitive top, middle, and bottom presets', () => {
    const zone = { x: 0.2, y: 0.26, width: 0.55, height: 0.24 }
    const top = layoutShareHighlightCardText(input.content, measureByCharacter, zone, 'top')
    const middle = layoutShareHighlightCardText(input.content, measureByCharacter, zone, 'middle')
    const bottom = layoutShareHighlightCardText(input.content, measureByCharacter, zone, 'bottom')

    expect(top.textPosition).toBe('top')
    expect(top.panel.y).toBe(78)
    expect(top.panel.y).toBeLessThan(middle.panel.y)
    expect(middle.panel.y).toBeLessThan(bottom.panel.y)
    expect(bottom.panel.y + bottom.panel.height).toBe(1180)
  })

  it('sizes the wash from its actual text instead of reserving the full safe-zone height', () => {
    const short = layoutShareHighlightCardText({
      gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ',
      sourceLabel: 'Ang 1',
    }, measureByCharacter, { x: 0.08, y: 0.1, width: 0.84, height: 0.78 })
    const detailed = layoutShareHighlightCardText(input.content, measureByCharacter, {
      x: 0.08,
      y: 0.1,
      width: 0.84,
      height: 0.78,
    })

    expect(short.panel.height).toBe(210)
    expect(detailed.panel.height).toBeGreaterThan(short.panel.height)
    expect(detailed.panel.height).toBeLessThan(0.78 * SHARE_HIGHLIGHT_CARD_HEIGHT)
  })

  it('selects artwork-aware text colors and a stronger density for long copy', () => {
    const light = layoutShareHighlightCardText(input.content, measureByCharacter, undefined, 'auto', 'light')
    const dark = layoutShareHighlightCardText(input.content, measureByCharacter, undefined, 'auto', 'cool-dark')
    const dense = layoutShareHighlightCardText({
      gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ',
      transliteration: 'Ik Oankaar\nSat Naam\nKartaa Purakh',
      meaning: 'One Creator\nTruth is the Name\nWithout fear\nWithout hate',
      sourceLabel: 'Ang 1',
    }, measureByCharacter, undefined, 'auto', 'warm-dark')

    expect(light.sections[0]?.style.color).toBe('#251d16')
    expect(dark.sections[0]?.style.color).toBe('#f9fbf7')
    expect(dense.density).toBe('dense')
  })

  it('maps source-art placement cues through the object-cover crop', () => {
    const placement = computeShareHighlightObjectCover(2000, 1000, 1080, 1350, { x: 1, y: 0.5 })
    const mapped = mapShareHighlightArtworkSafeZone(
      { x: 0.75, y: 0.2, width: 0.1, height: 0.2 },
      2000,
      1000,
      placement
    )

    expect(mapped.x).toBeCloseTo(0.375)
    expect(mapped.width).toBeCloseTo(0.25)
    expect(mapped.y).toBeCloseTo(0.2)
  })

  it('throws an explicit overflow error rather than silently truncating', () => {
    expect(() => layoutShareHighlightCardText({
      gurmukhi: Array.from({ length: 500 }, () => 'ਗੁਰਬਾਣੀ').join(' '),
      sourceLabel: 'Ang 1',
    }, measureByCharacter)).toThrow(ShareHighlightContentOverflowError)
  })
})

describe('full-passage pagination', () => {
  it('keeps every source line intact, ordered, and present exactly once', () => {
    const pages = paginateShareHighlightPassage(passageLines, measureByCharacter)

    expect(pages.length).toBeGreaterThan(1)
    expect(pages.flatMap(page => page.lines.map(line => line.id))).toEqual(
      passageLines.map(line => line.id)
    )
    expect(pages.every((page, index) => (
      page.pageNumber === index + 1
      && page.pageCount === pages.length
      && page.contentScale >= 0.72
    ))).toBe(true)
  })

  it('keeps structural headers with their following verse when the pair can fit', () => {
    const pages = paginateShareHighlightPassage(passageLines, measureByCharacter)

    for (const headerId of ['salok', 'pauree']) {
      const sourceIndex = passageLines.findIndex(line => line.id === headerId)
      const page = pages.find(candidate => candidate.lines.some(line => line.id === headerId))
      expect(page?.lines.map(line => line.id)).toContain(passageLines[sourceIndex + 1]?.id)
    }
  })

  it('uses additional pages for reading supports instead of shrinking below the readable floor', () => {
    const full = paginateShareHighlightPassage(passageLines, measureByCharacter)
    const gurmukhiOnly = paginateShareHighlightPassage(
      passageLines.map(line => ({ ...line, transliteration: null, meaning: null })),
      measureByCharacter
    )

    expect(full.length).toBeGreaterThan(gurmukhiOnly.length)
    expect(full.every(page => page.contentScale >= 0.72)).toBe(true)
  })

  it('lays out each line as its own Gurmukhi and optional support sequence', () => {
    const layout = layoutShareHighlightPassagePage([
      { id: 1, gurmukhi: 'ਪਹਿਲੀ ਪੰਕਤੀ', transliteration: 'first line', meaning: 'First meaning.' },
      { id: 2, gurmukhi: 'ਦੂਜੀ ਪੰਕਤੀ', transliteration: 'second line', meaning: 'Second meaning.' },
    ], measureByCharacter, 0.8)

    expect(layout.sections.map(section => section.role)).toEqual([
      'gurmukhi', 'transliteration', 'meaning',
      'gurmukhi', 'transliteration', 'meaning',
    ])
    expect(layout.sections.every((section, index) => (
      index === 0 || section.y > layout.sections[index - 1]!.y
    ))).toBe(true)
  })
})

describe('overlay composition helpers', () => {
  it('maps manifest tones to parchment, warm ink, cool ink, and neutral ink palettes', () => {
    expect(resolveShareHighlightOverlayPalette('light').kind).toBe('parchment')
    expect(resolveShareHighlightOverlayPalette('warm-dark').kind).toBe('warm-ink')
    expect(resolveShareHighlightOverlayPalette('cool-dark').kind).toBe('cool-ink')
    expect(resolveShareHighlightOverlayPalette('dark').kind).toBe('neutral-ink')
  })

  it('keeps manual presets in the content region even with an out-of-bounds cue', () => {
    const top = resolveShareHighlightTextPanel(
      { x: -1, y: -1, width: 4, height: 4 },
      'top',
      { width: 600, height: 320 }
    )
    const bottom = resolveShareHighlightTextPanel(
      { x: 2, y: 2, width: 1, height: 1 },
      'bottom',
      { width: 600, height: 320 }
    )

    expect(top.y).toBe(78)
    expect(bottom.y + bottom.height).toBe(1180)
    expect(top.x).toBeGreaterThanOrEqual(62)
    expect(bottom.x + bottom.width).toBeLessThanOrEqual(1018)
  })
})

describe('Canvas rendering and export', () => {
  it('awaits fonts and artwork, renders at 1080x1350, and stamps the lowercase domain', async () => {
    const environment = makeFakeRendererEnvironment()
    const canvas = await renderShareHighlightCard(input, environment.options)

    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1350)
    expect(environment.fontSet.load).toHaveBeenCalledTimes(3)
    expect(environment.options.loadImage).toHaveBeenCalledWith('/test-art.png')
    expect(environment.context.drawImage).toHaveBeenCalledTimes(1)
    expect(environment.drawnText).toContain('naamras.xyz')
    expect(environment.drawnText).toContain(input.content.sourceLabel)
    expect(environment.drawnText.join(' ')).toContain('ੴ')
  })

  it('keeps artwork undimmed outside localized text and footer washes', async () => {
    const environment = makeFakeRendererEnvironment()
    await renderShareHighlightCard(input, environment.options)

    expect(environment.context.fillRect).not.toHaveBeenCalledWith(0, 0, 1080, 1350)
    expect(environment.context.fillRect).toHaveBeenCalledWith(0, 1160, 1080, 190)
    expect(environment.context.stroke).not.toHaveBeenCalled()
  })

  it('uses a feathered parchment wash for light artwork and shadows scripture subtly', async () => {
    const environment = makeFakeRendererEnvironment()
    await renderShareHighlightCard(input, environment.options)

    const colorStops = environment.gradients.flatMap(gradient => gradient.addColorStop.mock.calls)
    expect(colorStops.some(([, color]) => color === 'rgba(249, 242, 224, 0.7)')).toBe(true)
    expect(colorStops.some(([, color]) => color === 'rgba(249, 242, 224, 0)')).toBe(true)
    expect(environment.drawnTextCalls.find(call => call.text.includes('ੴ'))?.shadowBlur).toBe(8)
  })

  it('draws citation bottom-left and branding bottom-right, separate from the text wash', async () => {
    const environment = makeFakeRendererEnvironment()
    await renderShareHighlightCard(input, environment.options)

    const citation = environment.drawnTextCalls.find(call => call.text === input.content.sourceLabel)
    const brand = environment.drawnTextCalls.find(call => call.text === 'naamras.xyz')
    const scripture = environment.drawnTextCalls.find(call => call.text.includes('ੴ'))

    expect(citation).toMatchObject({ x: 62, y: 1294 })
    expect(brand).toMatchObject({ x: 1018, y: 1294 })
    expect(scripture?.y).toBeLessThan(1180)
  })

  it('uses a stronger soft band when the content layout is dense', async () => {
    const environment = makeFakeRendererEnvironment()
    await renderShareHighlightCard({
      ...input,
      artwork: { ...input.artwork!, overlayTone: 'warm-dark' },
      content: {
        ...input.content,
        transliteration: 'Ik Oankaar\nSat Naam\nKartaa Purakh',
        meaning: 'One Creator\nTruth is the Name\nWithout fear\nWithout hate',
      },
    }, environment.options)

    const colorStops = environment.gradients.flatMap(gradient => gradient.addColorStop.mock.calls)
    expect(colorStops.some(([, color]) => color === 'rgba(43, 23, 15, 0.78)')).toBe(true)
  })

  it('exports a deterministic PNG Blob and File', async () => {
    const environment = makeFakeRendererEnvironment()
    const result = await exportShareHighlightPng({
      ...input,
      fileName: 'My Highlight',
    }, environment.options)

    expect(result.blob).toBe(environment.encodedBlob)
    expect(result.file.name).toBe('My-Highlight.png')
    expect(result.file.type).toBe('image/png')
    expect(result.width).toBe(1080)
    expect(result.height).toBe(1350)
  })

  it('exports a complete ordered folio with shared artwork, page footers, and stable filenames', async () => {
    const environment = makeFakePassageRendererEnvironment()
    const result = await exportShareHighlightPngSet(passageInput, environment.options)

    expect(result.totalPages).toBeGreaterThan(1)
    expect(result.pages).toHaveLength(result.totalPages)
    expect(result.files).toEqual(result.pages.map(page => page.file))
    expect(result.pages.map(page => page.pageNumber)).toEqual(
      Array.from({ length: result.totalPages }, (_, index) => index + 1)
    )
    expect(result.files.map(file => file.name)).toEqual(
      Array.from({ length: result.totalPages }, (_, index) => (
        `naamras-hukamnama-2026-07-15-${String(index + 1).padStart(2, '0')}-of-${String(result.totalPages).padStart(2, '0')}.png`
      ))
    )
    expect(environment.first.options.loadImage).toHaveBeenCalledTimes(1)
    expect(environment.first.fontSet.load).toHaveBeenCalledTimes(3)
    expect(environment.renders).toHaveLength(result.totalPages)
    expect(environment.renders.every(render => render.context.drawImage.mock.calls.length === 1)).toBe(true)

    const drawnText = environment.renders.flatMap(render => render.drawnText)
    expect(drawnText).toContain("Today's Hukamnama")
    expect(drawnText).toContain('July 15, 2026')
    expect(drawnText).toContain(passageInput.content.sourceLabel)
    expect(drawnText).toContain('naamras.xyz')
    expect(drawnText).toContain(`1 / ${result.totalPages}`)
    expect(drawnText).toContain(`${result.totalPages} / ${result.totalPages}`)
  })

  it('rejects the full folio when any sequential page fails to encode', async () => {
    const first = makeFakeRendererEnvironment()
    const failed = makeFakeRendererEnvironment()
    vi.mocked(failed.canvas.toBlob).mockImplementation(callback => callback(null))

    await expect(exportShareHighlightPngSet(passageInput, {
      canvas: first.canvas,
      createCanvas: vi.fn(() => failed.canvas),
      fontSet: first.fontSet,
      loadImage: first.options.loadImage,
    })).rejects.toThrow('could not be encoded')

    expect(first.canvas.toBlob).toHaveBeenCalledTimes(1)
    expect(failed.canvas.toBlob).toHaveBeenCalledTimes(1)
  })

  it('renders the no-artwork option as a solid card without loading an image', async () => {
    const environment = makeFakeRendererEnvironment()
    await renderShareHighlightCard({ ...input, artwork: null }, environment.options)

    expect(environment.options.loadImage).not.toHaveBeenCalled()
    expect(environment.context.drawImage).not.toHaveBeenCalled()
    expect(environment.drawnText).toContain('naamras.xyz')
    expect(environment.context.stroke).toHaveBeenCalledTimes(1)
  })
})
