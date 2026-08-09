import { describe, expect, it, vi } from 'vitest'
import {
  ShareHighlightContentOverflowError,
  computeShareHighlightObjectCover,
  exportShareHighlightPng,
  exportShareHighlightStoryPng,
  layoutShareHighlightCardText,
  layoutShareHighlightStory,
  mapShareHighlightArtworkSafeZone,
  renderShareHighlightCard,
  renderShareHighlightStory,
  resolveShareHighlightOverlayPalette,
  resolveShareHighlightTextPanel,
  wrapShareHighlightText,
  type ShareHighlightRendererOptions,
} from './renderer'
import { SHARE_HIGHLIGHT_QR_RENDER_SIZE } from './qrCode'
import {
  SHARE_HIGHLIGHT_CARD_HEIGHT,
  SHARE_HIGHLIGHT_CARD_WIDTH,
  SHARE_HIGHLIGHT_STORY_HEIGHT,
  SHARE_HIGHLIGHT_STORY_WIDTH,
  type ShareHighlightArtwork,
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

// Mirrors the browser fixture used by the canvas tests and the measured width
// of the loaded Story fonts more closely than the conservative generic helper.
const measureStoryByCharacter = (text: string, style: ShareHighlightTextStyle) => (
  Array.from(text).length * style.fontSize * 0.52
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
  ...Array.from({ length: 6 }, (_, index) => ({
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
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `pauree-${index + 1}`,
    gurmukhi: `ਚਰਨ ਕਮਲ ਕੀ ਓਟ ਉਧਰੇ ਸਗਲ ਜਨ ॥ ${index + 1}`,
    transliteration: `charan kamal kee ott udhare sagal jan ${index + 1}`,
    meaning: `All are saved in the shelter of the Lord's lotus feet, held in remembrance. ${index + 1}`,
  })),
]

const passageInput: ShareHighlightPassageInput = {
  artwork: input.artwork,
  content: {
    lines: passageLines.map(line => ({
      ...line,
      transliteration: null,
      meaning: null,
    })),
    sourceLabel: 'Sri Guru Granth Sahib Ji · Ang 709',
    seriesLabel: "Today's Hukamnama",
    dateLabel: 'July 15, 2026',
  },
  fileNameBase: 'naamras-hukamnama-2026-07-15',
}

const fourteenLineReading: ShareHighlightPassageLine[] = Array.from({ length: 14 }, (_, index) => ({
  id: `line-${index + 1}`,
  gurmukhi: `ਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ਆਸਰੰ ਗੋਪਾਲ ਕੀਰਤਨਹ ਨਿਰਮਲ ਸੰਤ ਸੰਗੇਣ ਓਟ ਨਾਨਕ ਪਰਮੇਸੁਰਹ ॥ ${index + 1} ॥`,
  meaning: `The Merciful Lord is the Savior and support of the Saints; in their immaculate company, O Nanak, one takes the protection of the Transcendent Lord. ${index + 1}`,
}))

const fourteenLineGurmukhiOnly = fourteenLineReading.map(line => ({
  ...line,
  meaning: null,
}))

const july18Ang683Reading: ShareHighlightPassageLine[] = [
  {
    id: 'ang-683-1',
    gurmukhi: 'ਧਨਾਸਰੀ ਮਹਲਾ ੫ ਘਰੁ ੧੨',
    meaning: 'Dhanaasaree, Fifth Mehl, Twelfth House:',
    isHeader: true,
  },
  {
    id: 'ang-683-2',
    gurmukhi: 'ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
    meaning: 'One Universal Creator God. By The Grace Of The True Guru:',
  },
  {
    id: 'ang-683-3',
    gurmukhi: 'ਬੰਦਨਾ ਹਰਿ ਬੰਦਨਾ ਗੁਣ ਗਾਵਹੁ ਗੋਪਾਲ ਰਾਇ ॥ ਰਹਾਉ ॥',
    meaning: 'I bow in reverence to the Lord, I bow in reverence. I sing the Glorious Praises of the Lord, my King. ||Pause||',
  },
  {
    id: 'ang-683-4',
    gurmukhi: 'ਵਡੈ ਭਾਗਿ ਭੇਟੇ ਗੁਰਦੇਵਾ ॥',
    meaning: 'By great good fortune, one meets the Divine Guru.',
  },
  {
    id: 'ang-683-5',
    gurmukhi: 'ਕੋਟਿ ਪਰਾਧ ਮਿਟੇ ਹਰਿ ਸੇਵਾ ॥੧॥',
    meaning: 'Millions of sins are erased by serving the Lord. ||1||',
  },
  {
    id: 'ang-683-6',
    gurmukhi: 'ਚਰਨ ਕਮਲ ਜਾ ਕਾ ਮਨੁ ਰਾਪੈ ॥',
    meaning: "One whose mind is imbued with the Lord's lotus feet",
  },
  {
    id: 'ang-683-7',
    gurmukhi: 'ਸੋਗ ਅਗਨਿ ਤਿਸੁ ਜਨ ਨ ਬਿਆਪੈ ॥੨॥',
    meaning: 'is not afflicted by the fire of sorrow. ||2||',
  },
  {
    id: 'ang-683-8',
    gurmukhi: 'ਸਾਗਰੁ ਤਰਿਆ ਸਾਧੂ ਸੰਗੇ ॥',
    meaning: 'He crosses over the world-ocean in the Saadh Sangat, the Company of the Holy.',
  },
  {
    id: 'ang-683-9',
    gurmukhi: 'ਨਿਰਭਉ ਨਾਮੁ ਜਪਹੁ ਹਰਿ ਰੰਗੇ ॥੩॥',
    meaning: "He chants the Name of the Fearless Lord, and is imbued with the Lord's Love. ||3||",
  },
  {
    id: 'ang-683-10',
    gurmukhi: 'ਪਰ ਧਨ ਦੋਖ ਕਿਛੁ ਪਾਪ ਨ ਫੇੜੇ ॥',
    meaning: 'One who does not steal the wealth of others, who does not commit evil deeds or sinful acts',
  },
  {
    id: 'ang-683-11',
    gurmukhi: 'ਜਮ ਜੰਦਾਰੁ ਨ ਆਵੈ ਨੇੜੇ ॥੪॥',
    meaning: '- the Messenger of Death does not even approach him. ||4||',
  },
  {
    id: 'ang-683-12',
    gurmukhi: 'ਤ੍ਰਿਸਨਾ ਅਗਨਿ ਪ੍ਰਭਿ ਆਪਿ ਬੁਝਾਈ ॥',
    meaning: 'God Himself quenches the fires of desire.',
  },
  {
    id: 'ang-683-13',
    gurmukhi: 'ਨਾਨਕ ਉਧਰੇ ਪ੍ਰਭ ਸਰਣਾਈ ॥੫॥੧॥੫੫॥',
    meaning: "O Nanak, in God's Sanctuary, one is saved. ||5||1||55||",
  },
]

// Exact BaniDB line pairs shown in the July 24 screenshot from the report.
const july24Ang555Reading: ShareHighlightPassageLine[] = [
  { id: 'jul24-24439', gurmukhi: 'ਸਲੋਕ ਮਃ ੩ ॥', meaning: 'Shalok, Third Mehla:' },
  { id: 'jul24-24440', gurmukhi: 'ਹਉਮੈ ਵਿਚਿ ਜਗਤੁ ਮੁਆ ਮਰਦੋ ਮਰਦਾ ਜਾਇ ॥', meaning: 'In egotism, the world is dead; it dies and dies, again and again.' },
  { id: 'jul24-24441', gurmukhi: 'ਜਿਚਰੁ ਵਿਚਿ ਦੰਮੁ ਹੈ ਤਿਚਰੁ ਨ ਚੇਤਈ ਕਿ ਕਰੇਗੁ ਅਗੈ ਜਾਇ ॥', meaning: 'As long as there is breath in the body, he does not remember the Lord; what will he do in the world hereafter?' },
  { id: 'jul24-24442', gurmukhi: 'ਗਿਆਨੀ ਹੋਇ ਸੁ ਚੇਤੰਨੁ ਹੋਇ ਅਗਿਆਨੀ ਅੰਧੁ ਕਮਾਇ ॥', meaning: 'One who remembers the Lord is a spiritual teacher; the ignorant one acts blindly.' },
  { id: 'jul24-24443', gurmukhi: 'ਨਾਨਕ ਏਥੈ ਕਮਾਵੈ ਸੋ ਮਿਲੈ ਅਗੈ ਪਾਏ ਜਾਇ ॥੧॥', meaning: 'O Nanak, whatever one does in this world, determines what he shall receive in the world hereafter. ||1||' },
  { id: 'jul24-24444', gurmukhi: 'ਮਃ ੩ ॥', meaning: 'Third Mehla:' },
  { id: 'jul24-24445', gurmukhi: 'ਧੁਰਿ ਖਸਮੈ ਕਾ ਹੁਕਮੁ ਪਇਆ ਵਿਣੁ ਸਤਿਗੁਰ ਚੇਤਿਆ ਨ ਜਾਇ ॥', meaning: 'From the very beginning, it has been the Will of the Lord Master, that He cannot be remembered without the True Guru.' },
  { id: 'jul24-24446', gurmukhi: 'ਸਤਿਗੁਰਿ ਮਿਲਿਐ ਅੰਤਰਿ ਰਵਿ ਰਹਿਆ ਸਦਾ ਰਹਿਆ ਲਿਵ ਲਾਇ ॥', meaning: "Meeting the True Guru, he realizes that the Lord is permeating and pervading deep within him; he remains forever absorbed in the Lord's Love." },
  { id: 'jul24-24447', gurmukhi: 'ਦਮਿ ਦਮਿ ਸਦਾ ਸਮਾਲਦਾ ਦੰਮੁ ਨ ਬਿਰਥਾ ਜਾਇ ॥', meaning: 'With each and every breath, he constantly remembers the Lord in meditation; not a single breath passes in vain.' },
  { id: 'jul24-24448', gurmukhi: 'ਜਨਮ ਮਰਨ ਕਾ ਭਉ ਗਇਆ ਜੀਵਨ ਪਦਵੀ ਪਾਇ ॥', meaning: 'His fears of birth and death depart, and he obtains the honored state of eternal life.' },
  { id: 'jul24-24449', gurmukhi: 'ਨਾਨਕ ਇਹੁ ਮਰਤਬਾ ਤਿਸ ਨੋ ਦੇਇ ਜਿਸ ਨੋ ਕਿਰਪਾ ਕਰੇ ਰਜਾਇ ॥੨॥', meaning: 'O Nanak, He bestows this rank upon that mortal, upon whom He showers His Mercy. ||2||' },
  { id: 'jul24-24450', gurmukhi: 'ਪਉੜੀ ॥', meaning: 'Pauree:' },
  { id: 'jul24-24451', gurmukhi: 'ਆਪੇ ਦਾਨਾਂ ਬੀਨਿਆ ਆਪੇ ਪਰਧਾਨਾਂ ॥', meaning: 'He Himself is all-wise and all-knowing; He Himself is supreme.' },
  { id: 'jul24-24452', gurmukhi: 'ਆਪੇ ਰੂਪ ਦਿਖਾਲਦਾ ਆਪੇ ਲਾਇ ਧਿਆਨਾਂ ॥', meaning: 'He Himself reveals His form, and He Himself enjoins us to His meditation.' },
  { id: 'jul24-24453', gurmukhi: 'ਆਪੇ ਮੋਨੀ ਵਰਤਦਾ ਆਪੇ ਕਥੈ ਗਿਆਨਾਂ ॥', meaning: 'He Himself poses as a silent sage, and He Himself speaks spiritual wisdom.' },
  { id: 'jul24-24454', gurmukhi: 'ਕਉੜਾ ਕਿਸੈ ਨ ਲਗਈ ਸਭਨਾ ਹੀ ਭਾਨਾ ॥', meaning: 'He does not seem bitter to anyone; He is pleasing to all.' },
  { id: 'jul24-24455', gurmukhi: 'ਉਸਤਤਿ ਬਰਨਿ ਨ ਸਕੀਐ ਸਦ ਸਦ ਕੁਰਬਾਨਾ ॥੧੯॥', meaning: 'His Praises cannot be described; forever and ever, I am a sacrifice to Him. ||19||' },
]

const twentyLineBilingualReading: ShareHighlightPassageLine[] = Array.from(
  { length: 20 },
  (_, index) => ({
    id: `stress-${index + 1}`,
    gurmukhi: 'ਸਤਿ ਨਾਮੁ ਵਾਹਿਗੁਰੂ ॥',
    meaning: 'Remember the True Name.',
  })
)

const fortyTwoLineBilingualReading: ShareHighlightPassageLine[] = Array.from(
  { length: 42 },
  (_, index) => ({
    id: `overflow-${index + 1}`,
    gurmukhi: 'ਸਤਿ ਨਾਮੁ ਵਾਹਿਗੁਰੂ ॥',
    meaning: 'Remember the True Name.',
  })
)

function makeFakeRendererEnvironment() {
  const drawnText: string[] = []
  const drawnTextCalls: Array<{
    text: string
    x: number
    y: number
    shadowBlur: number
    fontSize: number
    fontWeight: number
    textAlign: string
    textBaseline: string
    maxWidth?: number
  }> = []
  const imageDrawStates: Array<{ filter: string; globalAlpha: number }> = []
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
    filter: 'none',
    globalAlpha: 1,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(() => {
      imageDrawStates.push({
        filter: context.filter,
        globalAlpha: context.globalAlpha,
      })
    }),
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
    fillText: vi.fn((text: string, x: number, y: number, maxWidth?: number) => {
      drawnText.push(text)
      drawnTextCalls.push({
        text,
        x,
        y,
        shadowBlur: context.shadowBlur,
        fontSize: Number(context.font.match(/(\d+)px/)?.[1] ?? 16),
        fontWeight: Number(context.font.match(/\s(\d{3})\s+\d+px/)?.[1] ?? 400),
        textAlign: context.textAlign,
        textBaseline: context.textBaseline,
        ...(maxWidth === undefined ? {} : { maxWidth }),
      })
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

  return {
    canvas,
    context,
    drawnText,
    drawnTextCalls,
    imageDrawStates,
    encodedBlob,
    fontSet,
    gradients,
    options,
  }
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

describe('single-frame full-passage Story layout', () => {
  it('reserves link-footer space only when that footer will be rendered', () => {
    const shortReading = [{ id: 'short', gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ' }]
    const plainExpressive = layoutShareHighlightStory(shortReading, measureByCharacter, 'light')
    const linkedExpressive = layoutShareHighlightStory(
      shortReading,
      measureByCharacter,
      'light',
      undefined,
      undefined,
      'linked'
    )
    const plainManuscript = layoutShareHighlightStory(
      fortyTwoLineBilingualReading,
      measureByCharacter,
      'light'
    )
    const linkedManuscript = layoutShareHighlightStory(
      fortyTwoLineBilingualReading,
      measureByCharacter,
      'light',
      undefined,
      undefined,
      'linked'
    )

    expect(plainExpressive).toMatchObject({
      composition: 'expressive',
      body: { height: 1192 },
    })
    expect(linkedExpressive).toMatchObject({
      composition: 'expressive',
      body: { height: 1160 },
    })
    expect(plainManuscript).toMatchObject({
      composition: 'manuscript',
      body: { height: 1362 },
    })
    expect(linkedManuscript).toMatchObject({
      composition: 'manuscript',
      body: { height: 1238 },
    })
    expect(plainManuscript.selection.includedLineCount)
      .toBeGreaterThanOrEqual(linkedManuscript.selection.includedLineCount)
  })

  it('keeps a fourteen-line Gurmukhi reading at the raised floor via a truthful excerpt', () => {
    const layout = layoutShareHighlightStory(fourteenLineGurmukhiOnly, measureByCharacter, 'light')

    expect(layout.width).toBe(1080)
    expect(layout.height).toBe(1920)
    expect(layout.composition).toBe('manuscript')
    expect(layout.selection.mode).toBe('excerpt')
    expect(layout.selection.totalLineCount).toBe(14)
    expect(layout.fit.fontSizes.gurmukhi).toBeGreaterThanOrEqual(42)
    expect(layout.sourceLineIds).toEqual(
      fourteenLineGurmukhiOnly.slice(0, layout.selection.includedLineCount).map(line => line.id)
    )
    expect(layout.sourceLineIds.length).toBeLessThan(14)
    expect(layout.sections.every(section => (
      section.y >= layout.body.y
      && section.y + section.height <= layout.body.y + layout.body.height
    ))).toBe(true)
  })

  it('preserves every included source line without ellipsis or reordering', () => {
    const layout = layoutShareHighlightStory([
      { id: 'blank', gurmukhi: '   ' },
      ...fourteenLineGurmukhiOnly,
    ], measureByCharacter)

    const includedLines = fourteenLineGurmukhiOnly.slice(0, layout.selection.includedLineCount)
    expect(layout.sourceLineIds).toEqual(includedLines.map(line => line.id))
    for (const line of includedLines) {
      const sections = layout.sections.filter(section => section.sourceLineId === line.id)
      expect(sections.map(section => section.role)).toEqual(['gurmukhi'])
      expect(sections.find(section => section.role === 'gurmukhi')?.lines.join(' ')).toBe(line.gurmukhi)
      expect(sections.flatMap(section => section.lines).join(' ')).not.toContain('…')
      expect(sections.flatMap(section => section.lines).join(' ')).not.toContain('...')
    }
  })

  it('creates a readable bilingual excerpt instead of dropping an overflowing support', () => {
    const layout = layoutShareHighlightStory(fourteenLineReading, measureByCharacter, 'light')

    expect(layout.selection).toMatchObject({
      mode: 'excerpt',
      totalLineCount: fourteenLineReading.length,
      previousSourceLineId: null,
    })
    expect(layout.selection.includedLineCount).toBeGreaterThan(0)
    expect(layout.selection.includedLineCount).toBeLessThan(fourteenLineReading.length)
    expect(layout.fit.supportRoles).toEqual(['meaning'])
    expect(layout.sourceLineIds).toEqual(
      fourteenLineReading.slice(0, layout.selection.includedLineCount).map(line => line.id)
    )
    for (const sourceLineId of layout.sourceLineIds) {
      expect(layout.sections.filter(section => section.sourceLineId === sourceLineId).map(section => section.role))
        .toEqual(['gurmukhi', 'meaning'])
    }
  })

  it('keeps the exact July 18 Ang 683 excerpt interleaved at true phone-readable floors', () => {
    const layout = layoutShareHighlightStory(july18Ang683Reading, measureStoryByCharacter, 'light')

    expect(layout).toMatchObject({
      width: 1080,
      height: 1920,
      composition: 'manuscript',
      selection: {
        mode: 'excerpt',
        totalLineCount: july18Ang683Reading.length,
      },
      fit: {
        supportRoles: ['meaning'],
      },
    })
    expect(layout.readingSurface).toEqual({ x: 18, y: 72, width: 1044, height: 1776 })
    expect(layout.body).toEqual({ x: 64, y: 282, width: 952, height: 1362 })
    expect(layout.fit.fontSizes.gurmukhi).toBeGreaterThanOrEqual(42)
    expect(layout.fit.fontSizes.meaning).toBeGreaterThanOrEqual(32)
    const includedLines = july18Ang683Reading.slice(0, layout.selection.includedLineCount)
    expect(layout.sourceLineIds).toEqual(includedLines.map(line => line.id))
    expect(layout.sections.map(section => section.role)).toEqual(
      includedLines.flatMap(() => ['gurmukhi', 'meaning'])
    )
    for (const line of includedLines) {
      const gurmukhi = layout.sections.find(section => (
        section.sourceLineId === line.id && section.role === 'gurmukhi'
      ))
      const meaning = layout.sections.find(section => (
        section.sourceLineId === line.id && section.role === 'meaning'
      ))
      expect(gurmukhi?.lines.join(' ')).toBe(line.gurmukhi)
      expect(meaning?.lines.join(' ')).toBe(line.meaning)
      expect(gurmukhi).toMatchObject({ x: layout.body.x, width: layout.body.width })
      expect(meaning).toMatchObject({ x: layout.body.x, width: layout.body.width })
      expect(meaning!.y).toBeGreaterThanOrEqual(gurmukhi!.y + gurmukhi!.height)
      expect([...gurmukhi!.lines, ...meaning!.lines].join(' ')).not.toMatch(/…|\.\.\./)
    }
    expect(layout.sections.every(section => (
      section.y >= layout.body.y
      && section.y + section.height <= layout.body.y + layout.body.height
    ))).toBe(true)
    const usedTop = layout.sections[0]!.y
    const usedBottom = layout.sections.at(-1)!.y + layout.sections.at(-1)!.height
    expect((usedBottom - usedTop) / layout.body.height).toBeGreaterThan(0.8)
  })

  it('keeps the July 24 Ang 555 opening excerpt paired and in screenshot order', () => {
    const layout = layoutShareHighlightStory(
      july24Ang555Reading,
      measureStoryByCharacter,
      'light'
    )

    expect(layout.composition).toBe('manuscript')
    expect(layout.selection.mode).toBe('excerpt')
    expect(layout.selection.totalLineCount).toBe(july24Ang555Reading.length)
    const includedLines = july24Ang555Reading.slice(0, layout.selection.includedLineCount)
    expect(layout.sourceLineIds).toEqual(includedLines.map(line => line.id))
    expect(layout.sections.map(section => section.role)).toEqual(
      includedLines.flatMap(() => ['gurmukhi', 'meaning'])
    )
    expect(layout.fit.fontSizes.gurmukhi).toBeGreaterThanOrEqual(42)
    expect(layout.fit.fontSizes.meaning).toBeGreaterThanOrEqual(32)

    for (const [index, line] of includedLines.entries()) {
      const gurmukhi = layout.sections[index * 2]!
      const meaning = layout.sections[(index * 2) + 1]!
      expect(gurmukhi).toMatchObject({
        role: 'gurmukhi',
        sourceLineId: line.id,
        x: layout.body.x,
        width: layout.body.width,
      })
      expect(meaning).toMatchObject({
        role: 'meaning',
        sourceLineId: line.id,
        x: layout.body.x,
        width: layout.body.width,
      })
      expect(gurmukhi.lines.join(' ')).toBe(line.gurmukhi)
      expect(meaning.lines.join(' ')).toBe(line.meaning)
      expect(meaning.y).toBeGreaterThanOrEqual(gurmukhi.y + gurmukhi.height)
    }
  })

  it('keeps a twenty-line bilingual excerpt interleaved at the raised readability floor', () => {
    const layout = layoutShareHighlightStory(
      twentyLineBilingualReading,
      measureByCharacter,
      'light'
    )

    expect(layout.composition).toBe('manuscript')
    expect(layout.selection.mode).toBe('excerpt')
    const includedLines = twentyLineBilingualReading.slice(0, layout.selection.includedLineCount)
    expect(layout.sourceLineIds).toEqual(includedLines.map(line => line.id))
    expect(layout.fit.fontSizes.gurmukhi).toBeGreaterThanOrEqual(42)
    expect(layout.fit.fontSizes.meaning).toBeGreaterThanOrEqual(32)
    expect(layout.sections).toHaveLength(includedLines.length * 2)
    expect(layout.sections.map(section => section.role)).toEqual(
      includedLines.flatMap(() => ['gurmukhi', 'meaning'])
    )
  })

  it('uses exact fit rather than a line-count threshold for a compact nine-line reading', () => {
    const nineLineReading = Array.from({ length: 9 }, (_, index) => ({
      id: `interleaved-preference-${index + 1}`,
      gurmukhi: `ਸਤਿ ਨਾਮੁ ਵਾਹਿਗੁਰੂ ॥${index + 1}॥`,
      meaning: `Remember the True Name. ||${index + 1}||`,
    }))

    const layout = layoutShareHighlightStory(
      nineLineReading,
      measureByCharacter,
      'light'
    )

    expect(layout.composition).toBe('expressive')
    expect(layout.selection.mode).toBe('complete')
    expect(layout.sections.filter(section => section.role === 'gurmukhi')).toHaveLength(9)
    expect(layout.sections.filter(section => section.role === 'meaning')).toHaveLength(9)
    expect(layout.sections.map(section => section.sourceLineId)).toEqual(
      nineLineReading.flatMap(line => [line.id, line.id])
    )
  })

  it('turns forty-two bilingual lines into an unabridged, ordered opening excerpt', () => {
    const layout = layoutShareHighlightStory(
      fortyTwoLineBilingualReading,
      measureByCharacter,
      'light'
    )

    expect(layout.selection.mode).toBe('excerpt')
    expect(layout.selection.totalLineCount).toBe(42)
    expect(layout.selection.includedLineCount).toBeGreaterThan(0)
    expect(layout.selection.includedLineCount).toBeLessThan(42)
    expect(layout.selection.previousSourceLineId).toBeNull()
    expect(layout.selection.nextSourceLineId).toBe(
      fortyTwoLineBilingualReading[layout.selection.includedLineCount]!.id
    )
    expect(layout.sourceLineIds).toEqual(
      fortyTwoLineBilingualReading
        .slice(0, layout.selection.includedLineCount)
        .map(line => line.id)
    )
    expect(layout.sections.map(section => section.role)).toEqual(
      layout.sourceLineIds.flatMap(() => ['gurmukhi', 'meaning'])
    )

    const includedSourceLines = fortyTwoLineBilingualReading.slice(
      0,
      layout.selection.includedLineCount
    )
    expect(layoutShareHighlightStory(includedSourceLines, measureByCharacter).selection.mode)
      .toBe('complete')
    expect(layoutShareHighlightStory(
      fortyTwoLineBilingualReading.slice(0, layout.selection.includedLineCount + 1),
      measureByCharacter
    ).selection.mode).toBe('excerpt')
  })

  it('moves between non-overlapping bilingual pages and returns to the exact prior page', () => {
    const opening = layoutShareHighlightStory(
      fortyTwoLineBilingualReading,
      measureByCharacter,
      'light'
    )
    const nextAnchor = opening.selection.nextSourceLineId
    expect(nextAnchor).not.toBeNull()

    const next = layoutShareHighlightStory(
      fortyTwoLineBilingualReading,
      measureByCharacter,
      'light',
      undefined,
      nextAnchor
    )
    const nextAnchorIndex = fortyTwoLineBilingualReading.findIndex(line => line.id === nextAnchor)
    const expectedIds = fortyTwoLineBilingualReading
      .slice(nextAnchorIndex, nextAnchorIndex + next.selection.includedLineCount)
      .map(line => line.id)

    expect(next.selection).toMatchObject({
      mode: 'excerpt',
      anchorSourceLineId: nextAnchor,
      firstSourceLineId: nextAnchor,
      previousSourceLineId: opening.selection.firstSourceLineId,
      totalLineCount: 42,
    })
    expect(next.selection.includedSourceLineIds).toEqual(expectedIds)
    expect(next.sourceLineIds).toEqual(expectedIds)
    expect(next.selection.includedSourceLineIds.some(sourceLineId => (
      opening.selection.includedSourceLineIds.includes(sourceLineId)
    ))).toBe(false)
    expect(nextAnchorIndex).toBe(opening.selection.includedLineCount)

    for (const sourceLineId of next.sourceLineIds) {
      const source = fortyTwoLineBilingualReading.find(line => line.id === sourceLineId)!
      const sections = next.sections.filter(section => section.sourceLineId === sourceLineId)
      expect(sections.map(section => section.role)).toEqual(['gurmukhi', 'meaning'])
      expect(sections[0]!.lines.join(' ')).toBe(source.gurmukhi)
      expect(sections[1]!.lines.join(' ')).toBe(source.meaning)
    }

    const previous = layoutShareHighlightStory(
      fortyTwoLineBilingualReading,
      measureByCharacter,
      'light',
      undefined,
      next.selection.previousSourceLineId
    )
    expect(previous.selection.includedSourceLineIds).toEqual(
      opening.selection.includedSourceLineIds
    )
    expect(previous.selection.nextSourceLineId).toBe(nextAnchor)
    expect(previous.sourceLineIds).toEqual(opening.sourceLineIds)
  })

  it('keeps consecutive structural headers atomic with their following supported line', () => {
    const headerBlocks: ShareHighlightPassageLine[] = Array.from(
      { length: 80 },
      (_, index) => [
        {
          id: `header-a-${index}`,
          gurmukhi: 'ਸਲੋਕ ॥',
          isHeader: true,
        },
        {
          id: `header-b-${index}`,
          gurmukhi: 'ਮਃ ੫ ॥',
          isHeader: true,
        },
        {
          id: `header-verse-${index}`,
          gurmukhi: `ਸਤਿ ਨਾਮੁ ਵਾਹਿਗੁਰੂ ॥ ${index + 1}`,
          meaning: `Remember the True Name. ${index + 1}`,
        },
      ]
    ).flat()
    const anchorLineId = 'header-verse-31'
    const layout = layoutShareHighlightStory(
      headerBlocks,
      measureByCharacter,
      'light',
      undefined,
      anchorLineId
    )

    expect(layout.selection.mode).toBe('excerpt')
    expect(layout.selection.anchorSourceLineId).toBe(anchorLineId)
    expect(layout.selection.includedSourceLineIds.slice(0, 3)).toEqual([
      'header-a-31',
      'header-b-31',
      'header-verse-31',
    ])
    expect(layout.selection.includedLineCount % 3).toBe(0)
    for (let index = 0; index < layout.selection.includedSourceLineIds.length; index += 3) {
      expect(layout.selection.includedSourceLineIds.slice(index, index + 3)).toEqual([
        `header-a-${31 + (index / 3)}`,
        `header-b-${31 + (index / 3)}`,
        `header-verse-${31 + (index / 3)}`,
      ])
    }

    const opening = layoutShareHighlightStory(headerBlocks, measureByCharacter, 'light')
    const next = layoutShareHighlightStory(
      headerBlocks,
      measureByCharacter,
      'light',
      undefined,
      opening.selection.nextSourceLineId
    )
    expect(next.selection.includedSourceLineIds.slice(0, 3)).toEqual([
      opening.selection.nextSourceLineId,
      `header-b-${opening.selection.includedLineCount / 3}`,
      `header-verse-${opening.selection.includedLineCount / 3}`,
    ])
    expect(next.selection.includedSourceLineIds.length % 3).toBe(0)
    expect(next.selection.includedSourceLineIds.some(sourceLineId => (
      opening.selection.includedSourceLineIds.includes(sourceLineId)
    ))).toBe(false)

    const previous = layoutShareHighlightStory(
      headerBlocks,
      measureByCharacter,
      'light',
      undefined,
      next.selection.previousSourceLineId
    )
    expect(previous.selection.includedSourceLineIds).toEqual(
      opening.selection.includedSourceLineIds
    )
  })

  it('preserves a selected transliteration on every line of an adaptive excerpt', () => {
    const transliterated = fortyTwoLineBilingualReading.map(({ id, gurmukhi }, index) => ({
      id,
      gurmukhi,
      transliteration: `sat naam vaahiguroo ${index + 1}`,
    }))
    const layout = layoutShareHighlightStory(transliterated, measureByCharacter, 'light')

    expect(layout.selection.mode).toBe('excerpt')
    expect(layout.fit.supportRoles).toEqual(['transliteration'])
    for (const [index, sourceLineId] of layout.sourceLineIds.entries()) {
      const source = transliterated[index]!
      const sections = layout.sections.filter(section => section.sourceLineId === sourceLineId)
      expect(sections.map(section => section.role)).toEqual(['gurmukhi', 'transliteration'])
      expect(sections[0]!.lines.join(' ')).toBe(source.gurmukhi)
      expect(sections[1]!.lines.join(' ')).toBe(source.transliteration)
    }
  })

  it('handles 399 Gurmukhi lines as a maximal ordered excerpt without truncation', () => {
    const enormousReading: ShareHighlightPassageLine[] = Array.from(
      { length: 399 },
      (_, index) => ({
        id: `enormous-${index + 1}`,
        gurmukhi: `ਸਤਿ ਨਾਮੁ ਵਾਹਿਗੁਰੂ ॥ ${index + 1}`,
      })
    )
    const layout = layoutShareHighlightStory(enormousReading, measureByCharacter, 'light')
    const includedLines = enormousReading.slice(0, layout.selection.includedLineCount)

    expect(layout.selection).toMatchObject({
      mode: 'excerpt',
      totalLineCount: 399,
      previousSourceLineId: null,
      firstSourceLineId: 'enormous-1',
    })
    expect(layout.selection.includedLineCount).toBeGreaterThan(0)
    expect(layout.selection.includedLineCount).toBeLessThan(399)
    expect(layout.selection.includedSourceLineIds).toEqual(includedLines.map(line => line.id))
    expect(layout.sourceLineIds).toEqual(includedLines.map(line => line.id))
    expect(layout.sections).toHaveLength(includedLines.length)
    for (const [index, section] of layout.sections.entries()) {
      expect(section.sourceLineId).toBe(includedLines[index]!.id)
      expect(section.role).toBe('gurmukhi')
      expect(section.lines.join(' ')).toBe(includedLines[index]!.gurmukhi)
      expect(section.lines.join(' ')).not.toMatch(/…|\.\.\./)
    }

    let currentPage = layout
    for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
      const nextAnchor = currentPage.selection.nextSourceLineId
      expect(nextAnchor).not.toBeNull()
      const nextPage = layoutShareHighlightStory(
        enormousReading,
        measureByCharacter,
        'light',
        undefined,
        nextAnchor
      )
      expect(nextPage.selection.firstSourceLineId).toBe(nextAnchor)
      expect(nextPage.selection.previousSourceLineId).toBe(
        currentPage.selection.firstSourceLineId
      )
      expect(nextPage.selection.includedSourceLineIds.some(sourceLineId => (
        currentPage.selection.includedSourceLineIds.includes(sourceLineId)
      ))).toBe(false)

      const previousPage = layoutShareHighlightStory(
        enormousReading,
        measureByCharacter,
        'light',
        undefined,
        nextPage.selection.previousSourceLineId
      )
      expect(previousPage.selection.includedSourceLineIds).toEqual(
        currentPage.selection.includedSourceLineIds
      )
      currentPage = nextPage
    }
  })

  it('throws only when one indivisible atomic block cannot fit at the readability floor', () => {
    const enormousGurmukhi = 'ਗੁਰਬਾਣੀ '.repeat(1_000).trim()
    let gurmukhiError: unknown
    try {
      layoutShareHighlightStory([{ id: 'atomic-gurmukhi', gurmukhi: enormousGurmukhi }], measureByCharacter)
    } catch (error) {
      gurmukhiError = error
    }
    expect(gurmukhiError).toBeInstanceOf(ShareHighlightContentOverflowError)
    expect(gurmukhiError).toMatchObject({ reason: 'gurmukhi-overflow', supportRoles: [] })

    let supportError: unknown
    try {
      layoutShareHighlightStory([{
        id: 'atomic-meaning',
        gurmukhi: 'ਸਤਿ ਨਾਮੁ ॥',
        meaning: 'Complete translation '.repeat(1_000).trim(),
      }], measureByCharacter)
    } catch (error) {
      supportError = error
    }
    expect(supportError).toBeInstanceOf(ShareHighlightContentOverflowError)
    expect(supportError).toMatchObject({ reason: 'support-overflow', supportRoles: ['meaning'] })
  })

  it('uses expressive art for a short reading and a manuscript for a long reading', () => {
    const short = layoutShareHighlightStory([
      { id: 1, gurmukhi: 'ਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ਆਸਰੰ ਗੋਪਾਲ ਕੀਰਤਨਹ ॥', meaning: 'The Merciful Lord is the Savior of the Saints.' },
      { id: 2, gurmukhi: 'ਚਰਨ ਕਮਲ ਕੀ ਓਟ ਉਧਰੇ ਸਗਲ ਜਨ ॥', meaning: 'All are saved in the shelter of the Lord.' },
    ], measureByCharacter, 'warm-dark', { mode: 'portrait-bleed' })
    const long = layoutShareHighlightStory(
      fourteenLineGurmukhiOnly,
      measureByCharacter,
      'light',
      { mode: 'pattern-frame' }
    )

    expect(short.composition).toBe('expressive')
    expect(short.sections.map(section => section.role)).toEqual([
      'gurmukhi', 'meaning', 'gurmukhi', 'meaning',
    ])
    expect(short.fit.fontSizes.gurmukhi).toBeGreaterThanOrEqual(42)
    expect(short.fit.fontSizes.meaning).toBeGreaterThanOrEqual(32)
    expect(short.artworkMode).toBe('portrait-bleed')
    expect(short.readingSurface.height).toBeLessThan(SHARE_HIGHLIGHT_STORY_HEIGHT * 0.35)
    expect(short.readingSurface.y).toBeGreaterThanOrEqual(318)
    expect(long.composition).toBe('manuscript')
    expect(long.artworkMode).toBe('pattern-frame')
  })

  it('centers a short reading beneath a landscape hero instead of crowding its artwork', () => {
    const lines = [{ id: 1, gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ' }]
    const portrait = layoutShareHighlightStory(lines, measureByCharacter, 'warm-dark', {
      mode: 'portrait-bleed',
    })
    const landscape = layoutShareHighlightStory(lines, measureByCharacter, 'warm-dark', {
      mode: 'landscape-hero',
      heroHeightFraction: 0.34,
    })

    expect(landscape.composition).toBe('expressive')
    expect(landscape.sections[0]!.y).toBeGreaterThan(portrait.sections[0]!.y + 250)
  })

  it('fills the canvas with parchment while keeping all text Story-safe', () => {
    const layout = layoutShareHighlightStory(
      fourteenLineGurmukhiOnly,
      measureByCharacter,
      'light'
    )

    const surfaceArea = layout.readingSurface.width * layout.readingSurface.height
    expect(layout.readingSurface.y).toBeLessThanOrEqual(72)
    expect(layout.readingSurface.y + layout.readingSurface.height).toBeGreaterThanOrEqual(1848)
    expect(surfaceArea / (SHARE_HIGHLIGHT_STORY_WIDTH * SHARE_HIGHLIGHT_STORY_HEIGHT))
      .toBeGreaterThan(0.88)
    expect(layout.sections.every(section => section.y >= layout.body.y)).toBe(true)
    expect(layout.sections.every(section => (
      section.y + section.height <= layout.body.y + layout.body.height
    ))).toBe(true)
    expect(layout.body.y).toBeGreaterThanOrEqual(204)
    expect(layout.body.y + layout.body.height).toBeLessThanOrEqual(1712)
  })

  it('uses the proportional full-height sheet when measured copy needs it', () => {
    const compactLongReading = fourteenLineGurmukhiOnly
    const layout = layoutShareHighlightStory(compactLongReading, measureByCharacter, 'light', {
      mode: 'portrait-bleed',
    })

    expect(layout.composition).toBe('manuscript')
    expect(layout.readingSurface).toEqual({ x: 18, y: 72, width: 1044, height: 1776 })
    const first = layout.sections[0]!
    const last = layout.sections.at(-1)!
    const leadingSpace = first.y - layout.body.y
    const trailingSpace = layout.body.y + layout.body.height - (last.y + last.height)
    expect(Math.abs(leadingSpace - trailingSpace)).toBeLessThanOrEqual(2)
  })

  it('places a short expressive reading away from a protected portrait subject', () => {
    const lines = [{ id: 1, gurmukhi: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ', meaning: 'One Creator. Truth is the Name.' }]
    const protectedTop = layoutShareHighlightStory(lines, measureByCharacter, 'warm-dark', {
      mode: 'portrait-bleed',
      protectedSubject: {
        bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.3 },
        intent: 'keep-clear-of-text',
      },
    })
    const protectedBottom = layoutShareHighlightStory(lines, measureByCharacter, 'warm-dark', {
      mode: 'portrait-bleed',
      protectedSubject: {
        bounds: { x: 0.1, y: 0.62, width: 0.8, height: 0.3 },
        intent: 'keep-clear-of-text',
      },
    })

    expect(protectedTop.sections[0]!.y).toBeGreaterThan(protectedBottom.sections[0]!.y)
    expect(protectedTop.readingSurface.y).toBeGreaterThan(protectedBottom.readingSurface.y)
  })

  it('keeps a structural header visually attached to its following verse', () => {
    const layout = layoutShareHighlightStory([
      { id: 'before', gurmukhi: 'ਪਹਿਲੀ ਪੰਕਤੀ', meaning: 'First meaning.' },
      { id: 'header', gurmukhi: 'ਸਲੋਕ ॥', isHeader: true },
      { id: 'verse', gurmukhi: 'ਦੂਜੀ ਪੰਕਤੀ', meaning: 'Second meaning.' },
    ], measureByCharacter)
    const before = layout.sections.filter(section => section.sourceLineId === 'before').at(-1)!
    const header = layout.sections.filter(section => section.sourceLineId === 'header').at(-1)!
    const verse = layout.sections.find(section => section.sourceLineId === 'verse')!
    const beforeHeaderGap = header.y - (before.y + before.height)
    const headerVerseGap = verse.y - (header.y + header.height)

    expect(layout.sourceLineIds).toEqual(['before', 'header', 'verse'])
    expect(headerVerseGap).toBeLessThan(beforeHeaderGap)
  })

  it('rejects an ambiguous request for two reading supports instead of dropping either one', () => {
    expect(() => layoutShareHighlightStory([
      { id: 1, gurmukhi: 'ਪਹਿਲੀ ਪੰਕਤੀ', transliteration: 'first line', meaning: 'First meaning.' },
      { id: 2, gurmukhi: 'ਦੂਜੀ ਪੰਕਤੀ', transliteration: 'second line', meaning: 'Second meaning.' },
    ], measureByCharacter)).toThrow(/either transliteration or meaning, but not both/i)
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
    expect(environment.fontSet.load).toHaveBeenCalledTimes(5)
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

  it('exports the entire reading as one stable 1080x1920 PNG', async () => {
    const environment = makeFakeRendererEnvironment()
    const result = await exportShareHighlightStoryPng(passageInput, environment.options)

    expect(result.canvas).toBe(environment.canvas)
    expect(result.blob).toBe(environment.encodedBlob)
    expect(result.file.name).toBe('naamras-hukamnama-2026-07-15.png')
    expect(result.file.type).toBe('image/png')
    expect(result.width).toBe(SHARE_HIGHLIGHT_STORY_WIDTH)
    expect(result.height).toBe(SHARE_HIGHLIGHT_STORY_HEIGHT)
    expect(result.layout.body.height).toBe(1192)
    expect(result.layout.selection.mode).toBe('complete')
    expect(result.selection).toBe(result.layout.selection)
    expect(result.selection.includedLineCount).toBe(passageInput.content.lines.length)
    expect(result.selection.totalLineCount).toBe(passageInput.content.lines.length)
    expect(result.selection.includedSourceLineIds).toEqual(
      passageInput.content.lines.map(line => line.id)
    )
    expect(environment.canvas.width).toBe(1080)
    expect(environment.canvas.height).toBe(1920)
    expect(environment.options.loadImage).toHaveBeenCalledWith('/test-art.png')
    expect(environment.fontSet.load).toHaveBeenCalledTimes(5)
    expect(environment.context.drawImage).toHaveBeenCalled()
    expect(environment.drawnText).toContain("Today's Hukamnama")
    expect(environment.drawnText).toContain('July 15, 2026')
    expect(environment.drawnText).toContain(passageInput.content.sourceLabel)
    expect(environment.drawnText).toContain('naamras.xyz')
    expect(environment.drawnText.join(' ')).not.toContain(' / ')
    const safeMetadata = environment.drawnTextCalls.filter(call => (
      call.text === "Today's Hukamnama"
      || call.text === 'July 15, 2026'
      || call.text === passageInput.content.sourceLabel
      || call.text === 'naamras.xyz'
    ))
    expect(safeMetadata).toHaveLength(4)
    expect(safeMetadata.every(call => call.y >= 204 && call.y <= 1712)).toBe(true)
    expect(safeMetadata.every(call => call.fontSize >= 23)).toBe(true)
  })

  it('exports adaptive excerpt coverage and anchor metadata with the PNG', async () => {
    const environment = makeFakeRendererEnvironment()
    const anchorLineId = 'overflow-11'
    const anchoredLines = fortyTwoLineBilingualReading.map((line, index) => ({
      ...line,
      gurmukhi: `${line.gurmukhi} ${index + 1}`,
      meaning: `${line.meaning} ${index + 1}`,
    }))
    const result = await exportShareHighlightStoryPng({
      ...passageInput,
      artwork: null,
      content: {
        ...passageInput.content,
        lines: anchoredLines,
        anchorLineId,
      },
    }, environment.options)

    expect(result.selection).toBe(result.layout.selection)
    expect(result.selection).toMatchObject({
      mode: 'excerpt',
      anchorSourceLineId: anchorLineId,
      firstSourceLineId: anchorLineId,
      totalLineCount: 42,
    })
    expect(result.selection.includedLineCount).toBeGreaterThan(0)
    expect(result.selection.includedLineCount).toBeLessThan(32)
    expect(result.layout.sourceLineIds).toEqual(result.selection.includedSourceLineIds)
    expect(result.selection.includedSourceLineIds[0]).toBe(anchorLineId)
    expect(environment.options.loadImage).not.toHaveBeenCalled()

    const firstIncluded = anchoredLines[10]!
    expect(environment.drawnText).toContain(firstIncluded.gurmukhi)
    expect(environment.drawnText).toContain(firstIncluded.meaning)
    if (result.selection.nextSourceLineId) {
      const firstExcluded = anchoredLines.find(
        line => line.id === result.selection.nextSourceLineId
      )!
      expect(environment.drawnText).not.toContain(firstExcluded.gurmukhi)
      expect(environment.drawnText).not.toContain(firstExcluded.meaning)
    }
  })

  it('prints truthful excerpt scope, support credit, and a scannable exact-reading QR footer', async () => {
    const environment = makeFakeRendererEnvironment()
    const result = await exportShareHighlightStoryPng({
      ...passageInput,
      artwork: null,
      content: {
        ...passageInput.content,
        lines: fortyTwoLineBilingualReading,
        shareUrl: 'https://naamras.xyz/h/2026-07-15',
        supportLabel: 'English · Standard',
        scopeCopy: {
          complete: 'Complete Hukamnama',
          excerpt: 'Opening excerpt',
          coverageTemplate: '{included} of {total} lines',
          readComplete: 'Read the complete Hukamnama',
          openInNaamras: 'Open in NaamRas',
        },
      },
    }, environment.options)

    expect(result.selection.mode).toBe('excerpt')
    expect(result.layout.body.height).toBe(1238)
    expect(environment.drawnText).toContain(
      `Opening excerpt · ${result.selection.includedLineCount} of 42 lines`
    )
    expect(environment.drawnText).toContain('English · Standard')
    expect(environment.drawnText).toContain('Read the complete Hukamnama')
    expect(environment.drawnText).toContain('naamras.xyz/h/2026-07-15')
    expect(environment.context.fillRect).toHaveBeenCalledWith(64, 1532, 952, 2)

    const qrModuleCalls = environment.context.fillRect.mock.calls.filter(([, , width, height]) => (
      width === height && width >= 3 && width <= 4
    ))
    expect(qrModuleCalls.length).toBeGreaterThan(100)
    const qrRectLeft = SHARE_HIGHLIGHT_STORY_WIDTH
      - 72
      - SHARE_HIGHLIGHT_QR_RENDER_SIZE
    const qrRectTop = 1712 - SHARE_HIGHLIGHT_QR_RENDER_SIZE
    expect(qrModuleCalls.every(([x, y, width, height]) => (
      x >= qrRectLeft
      && y >= qrRectTop
      && x + width <= SHARE_HIGHLIGHT_STORY_WIDTH - 72
      && y + height <= 1712
    ))).toBe(true)
  })

  it('prints every search parameter when a linked footer receives a query URL', async () => {
    const environment = makeFakeRendererEnvironment()
    const shareUrl = 'https://naamras.xyz/study?shabadId=50&flow=ardaas-hukamnama'
    const result = await exportShareHighlightStoryPng({
      ...passageInput,
      content: {
        ...passageInput.content,
        shareUrl,
      },
    }, environment.options)

    expect(result.layout).toMatchObject({
      composition: 'expressive',
      body: { height: 1160 },
    })
    expect(environment.drawnText).toContain(
      'naamras.xyz/study?shabadId=50&flow=ardaas-hukamnama'
    )
  })

  it('renders the readable Ang 683 excerpt as full-width paired lines on one canvas', async () => {
    const environment = makeFakeRendererEnvironment()
    const expectedLayout = layoutShareHighlightStory(
      july18Ang683Reading,
      measureStoryByCharacter,
      'light'
    )
    const canvas = await renderShareHighlightStory({
      ...passageInput,
      content: {
        ...passageInput.content,
        lines: july18Ang683Reading,
        sourceLabel: 'Sri Guru Granth Sahib Ji · Ang 683',
        dateLabel: 'July 18, 2026',
      },
    }, environment.options)

    expect(canvas).toBe(environment.canvas)
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1920)
    expect(environment.context.stroke).toHaveBeenCalledTimes(3)
    expect(environment.context.fillRect).toHaveBeenCalledWith(64, 258, 952, 2)
    expect(environment.context.fillRect).toHaveBeenCalledWith(64, 1658, 952, 2)
    const includedLines = july18Ang683Reading.slice(
      0,
      expectedLayout.selection.includedLineCount
    )
    expect(expectedLayout.selection.mode).toBe('excerpt')
    expect(expectedLayout.sections.map(section => section.role)).toEqual(
      includedLines.flatMap(() => ['gurmukhi', 'meaning'])
    )

    const title = environment.drawnTextCalls.find(call => call.text === "Today's Hukamnama")
    const date = environment.drawnTextCalls.find(call => call.text === 'July 18, 2026')
    const meaning = environment.drawnTextCalls.find(call => call.text.includes('Dhanaasaree'))
    expect(title).toMatchObject({
      x: 64,
      y: 220,
      fontSize: 32,
      fontWeight: 650,
      textAlign: 'left',
      textBaseline: 'middle',
    })
    expect(date).toMatchObject({
      x: 1016,
      y: 220,
      fontSize: 25,
      fontWeight: 600,
      textAlign: 'right',
      textBaseline: 'middle',
    })
    expect(meaning).toMatchObject({ fontWeight: 400 })

    const renderedText = environment.drawnText.join(' ')
    for (const line of includedLines) {
      expect(renderedText).toContain(line.gurmukhi)
      expect(renderedText).toContain(line.meaning)
    }
    const firstExcluded = july18Ang683Reading[expectedLayout.selection.includedLineCount]
    expect(firstExcluded).toBeDefined()
    expect(renderedText).not.toContain(firstExcluded!.gurmukhi)
    expect(renderedText).not.toContain(firstExcluded!.meaning)
    expect(renderedText).not.toMatch(/…|\.\.\./)
  })

  it('auto-fits long manuscript metadata without horizontally squeezing it', async () => {
    const environment = makeFakeRendererEnvironment()
    const seriesLabel = 'Daily Hukamnama from Sri Harmandir Sahib'
    const dateLabel = 'Saturday, July 18, 2026'

    await renderShareHighlightStory({
      ...passageInput,
      content: {
        ...passageInput.content,
        lines: july18Ang683Reading,
        seriesLabel,
        dateLabel,
      },
    }, environment.options)

    const title = environment.drawnTextCalls.find(call => call.text === seriesLabel)
    const date = environment.drawnTextCalls.find(call => call.text === dateLabel)
    expect(title?.fontSize).toBeGreaterThanOrEqual(23)
    expect(title?.fontSize).toBeLessThan(32)
    expect(title?.maxWidth).toBeUndefined()
    expect(date?.fontSize).toBeGreaterThanOrEqual(19)
    expect(date?.fontSize).toBeLessThan(25)
    expect(date?.maxWidth).toBeUndefined()
  })

  it('keeps the ambient artwork luminous for a short landscape Story', async () => {
    const environment = makeFakeRendererEnvironment()
    await renderShareHighlightStory({
      ...passageInput,
      artwork: {
        ...passageInput.artwork!,
        storyProfile: {
          mode: 'landscape-hero',
          focalPosition: { x: 0.5, y: 0.5 },
          heroHeightFraction: 0.35,
        },
      },
      content: {
        ...passageInput.content,
        lines: [
          { id: 1, gurmukhi: 'ਸਲੋਕ ॥', isHeader: true },
          { id: 2, gurmukhi: 'ਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ਆਸਰੰ ਗੋਪਾਲ ਕੀਰਤਨਹ ॥' },
          { id: 3, gurmukhi: 'ਨਿਰਮਲ ਸੰਤ ਸੰਗੇਣ ਓਟ ਨਾਨਕ ਪਰਮੇਸੁਰਹ ॥੧॥' },
        ],
      },
    }, environment.options)

    expect(environment.context.drawImage).toHaveBeenCalledTimes(2)
    expect(environment.imageDrawStates[0]).toEqual({
      filter: 'blur(22px) saturate(0.88) brightness(0.72)',
      globalAlpha: 0.84,
    })
  })

  it('keeps long Stories quiet across all fourteen configured artwork choices', async () => {
    const artworks: ShareHighlightArtwork[] = Array.from({ length: 14 }, (_, index) => ({
      id: `art-${index + 1}`,
      src: `/share/art-${index + 1}.jpg`,
      focalPosition: { x: (index % 3) / 2, y: (index % 5) / 4 },
      textSafeZone: { x: 0.05, y: 0.1, width: 0.2, height: 0.18 },
      overlayTone: index % 2 === 0 ? 'light' : 'warm-dark',
      storyProfile: {
        mode: index % 3 === 0
          ? 'portrait-bleed'
          : index % 3 === 1 ? 'landscape-hero' : 'pattern-frame',
        focalPosition: { x: (index % 4) / 3, y: (index % 5) / 4 },
        heroHeightFraction: 0.3 + ((index % 3) * 0.05),
        protectedSubject: {
          bounds: { x: 0.2, y: 0.15, width: 0.35, height: 0.45 },
          intent: index % 2 === 0 ? 'keep-visible' : 'keep-clear-of-text',
        },
      },
    }))
    const expectedLayout = layoutShareHighlightStory(
      july18Ang683Reading,
      measureStoryByCharacter,
      'light'
    )
    const includedLines = july18Ang683Reading.slice(
      0,
      expectedLayout.selection.includedLineCount
    )
    const firstExcluded = july18Ang683Reading[expectedLayout.selection.includedLineCount]

    for (const artwork of artworks) {
      const environment = makeFakeRendererEnvironment()
      const canvas = await renderShareHighlightStory({
        ...passageInput,
        artwork,
        content: {
          ...passageInput.content,
          lines: july18Ang683Reading,
        },
      }, environment.options)

      expect(canvas.width).toBe(1080)
      expect(canvas.height).toBe(1920)
      expect(environment.options.loadImage).not.toHaveBeenCalled()
      expect(environment.context.drawImage).not.toHaveBeenCalled()
      const renderedText = environment.drawnText.join(' ')
      expect(renderedText).toContain(includedLines[0]!.gurmukhi)
      expect(renderedText).toContain(includedLines[0]!.meaning)
      expect(renderedText).toContain(includedLines.at(-1)!.gurmukhi)
      expect(renderedText).toContain(includedLines.at(-1)!.meaning)
      if (firstExcluded) {
        expect(renderedText).not.toContain(firstExcluded.gurmukhi)
        expect(renderedText).not.toContain(firstExcluded.meaning)
      }
    }
  })

  it('uses a protected subject as the crop focus when a Story profile omits a focal point', async () => {
    const environment = makeFakeRendererEnvironment()
    await renderShareHighlightStory({
      ...passageInput,
      artwork: {
        ...passageInput.artwork!,
        focalPosition: { x: 0.1, y: 0.5 },
        storyProfile: {
          mode: 'portrait-bleed',
          protectedSubject: {
            bounds: { x: 0.8, y: 0.2, width: 0.18, height: 0.5 },
            intent: 'keep-visible',
          },
        },
      },
      content: {
        ...passageInput.content,
        lines: [
          { id: 1, gurmukhi: 'ਸਲੋਕ ॥', isHeader: true },
          { id: 2, gurmukhi: 'ਸੰਤ ਉਧਰਣ ਦਇਆਲੰ ਆਸਰੰ ਗੋਪਾਲ ਕੀਰਤਨਹ ॥' },
          { id: 3, gurmukhi: 'ਨਿਰਮਲ ਸੰਤ ਸੰਗੇਣ ਓਟ ਨਾਨਕ ਪਰਮੇਸੁਰਹ ॥੧॥' },
        ],
      },
    }, environment.options)

    const drawCall = environment.context.drawImage.mock.calls[0]!
    expect(Number(drawCall[1])).toBeGreaterThan(900)
    expect(Number(drawCall[7])).toBe(1080)
    expect(Number(drawCall[8])).toBe(1920)
  })

  it('rejects when the one Story PNG cannot be encoded', async () => {
    const environment = makeFakeRendererEnvironment()
    vi.mocked(environment.canvas.toBlob).mockImplementation(callback => callback(null))

    await expect(exportShareHighlightStoryPng(passageInput, environment.options)).rejects.toThrow(
      'could not be encoded'
    )
    expect(environment.canvas.toBlob).toHaveBeenCalledTimes(1)
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
