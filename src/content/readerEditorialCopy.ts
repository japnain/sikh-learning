import { READ_EXACT_BANIS, type Bani } from '../data/banis'

export type ReaderEditorialSourceRef = {
  label: string
  url?: string
  note: string
}

export type ReaderEditorialCopy = {
  id: string
  title: string
  dek: string
  historicalNote?: string
  practiceNote?: string
  sourceLine: string
  sourceRefs: ReaderEditorialSourceRef[]
  reviewed: boolean
  reviewedAt?: string
}

export const BANNED_READER_EDITORIAL_PHRASES = [
  'Comfortable reading first',
  'source layers',
  'text stays primary',
  'controls stay close',
]

const REVIEWED_AT = '2026-05-06'

const SCRIPTURE_LABELS: Record<Bani['scripture'], string> = {
  SGGS: 'Sri Guru Granth Sahib Ji',
  DG: 'Dasam Granth',
  BGV: 'Bhai Gurdas Ji Vaaran',
  AK: 'Amrit Keertan',
}

const SPECIAL_COPY_BY_ID: Record<string, Partial<Pick<ReaderEditorialCopy, 'dek' | 'historicalNote' | 'practiceNote'>>> = {
  'japji-sahib': {
    dek: 'Japji Sahib opens Sri Guru Granth Sahib Ji on Ang 1 and is attributed to Guru Nanak Sahib Ji. It frames Sikh reflection through Ik Oankar, hukam, naam, gurprasad, and truthful living.',
    practiceNote: 'Traditionally recited in the morning as part of Nitnem.',
  },
  sodar: {
    dek: 'Sodar is the So Dar section on Ang 8 of Sri Guru Granth Sahib Ji, the opening movement used in Rehras Sahib. It turns the evening reader toward the Divine court and the vastness of praise.',
    practiceNote: 'Read within the evening Nitnem tradition.',
  },
  'rehras-sahib': {
    dek: 'Rehras Sahib gathers evening bani from Sri Guru Granth Sahib Ji and the wider Nitnem tradition. It is read at day’s close, centering gratitude, strength, and remembrance after worldly work.',
    practiceNote: 'Traditionally recited in the evening as part of Nitnem.',
  },
  'kirtan-sohila': {
    dek: 'Kirtan Sohila is the night prayer on Angs 12–13 of Sri Guru Granth Sahib Ji. Its shabads hold rest, protection, and the soul’s return to the One at the edge of sleep.',
    practiceNote: 'Traditionally recited before sleep.',
  },
  'anand-sahib': {
    dek: 'Anand Sahib, by Guru Amar Das Ji, appears on Angs 917–922 of Sri Guru Granth Sahib Ji. It names spiritual bliss as the fruit of Guru-oriented living and hearing the Shabad.',
    practiceNote: 'Read in Nitnem and in many Sikh ceremonies.',
  },
  'sukhmani-sahib': {
    dek: 'Sukhmani Sahib, the “Pearl of Peace” by Guru Arjan Sahib Ji, spans Angs 262–296 of Sri Guru Granth Sahib Ji. Its ashtpadis dwell on naam, sant-sangat, humility, and inner steadiness.',
  },
  'asa-di-var': {
    dek: 'Asa Di Var is the morning vaar in Raag Asa on Angs 462–475 of Sri Guru Granth Sahib Ji. Sung with saloks and pauris, it presses ethical clarity, humility, and truthful conduct.',
    practiceNote: 'Traditionally sung in the early morning in sangat.',
  },
  aarti: {
    dek: 'Aarti on Ang 663 of Sri Guru Granth Sahib Ji includes Guru Nanak Sahib Ji’s cosmic vision of worship: sky as platter, sun and moon as lamps, and creation itself in praise.',
  },
  laavan: {
    dek: 'Laavan, by Guru Ram Das Ji on Angs 773–774 of Sri Guru Granth Sahib Ji, gives the four spiritual rounds of Anand Karaj, moving from discipline toward union in the Shabad.',
    practiceNote: 'Central to the Sikh Anand Karaj marriage ceremony.',
  },
  'salok-mahalla-9': {
    dek: 'Salok Mahalla 9 closes the main body of Sri Guru Granth Sahib Ji on Angs 1426–1429. Guru Tegh Bahadur Ji’s saloks reflect on impermanence, fearlessness, and liberation from attachment.',
  },
  'jaap-sahib': {
    dek: 'Jaap Sahib opens the Dasam Granth and is attributed in Sikh tradition to Guru Gobind Singh Ji. Its many names praise the Timeless One beyond form, lineage, boundary, and measure.',
    practiceNote: 'Traditionally recited in the morning as part of Nitnem.',
  },
  'tav-prasad-savaiye': {
    dek: 'Tav Prasad Savaiye is a Nitnem set from the Dasam Granth tradition. In the Sraavag Suddh section, it rejects empty ritual and points devotion toward the One beyond display.',
    practiceNote: 'Traditionally recited in the morning as part of Nitnem.',
  },
  'tav-prasad-savaiye-dinan-ki': {
    dek: 'This Dheenan Ki BaniDB variant preserves a Tav Prasad Savaiye sequence from the Dasam Granth tradition. Read it as a distinct exact-bani witness, not as a replacement for the Nitnem set.',
  },
  'chaupai-sahib': {
    dek: 'Benati Chaupai Sahib comes from the Dasam Granth tradition and is attributed to Guru Gobind Singh Ji. Its supplication asks the Divine protector for shelter, courage, and clarity.',
    practiceNote: 'Read in Nitnem and in many Sikh ardaas contexts.',
  },
  'akal-ustat': {
    dek: 'Akal Ustat praises the Timeless One in the Dasam Granth tradition. Its language repeatedly refuses narrow boundaries, honoring the Divine beyond caste, creed, geography, and form.',
  },
  zafarnama: {
    dek: 'Zafarnama is the Persian letter traditionally attributed to Guru Gobind Singh Ji and addressed to Aurangzeb. It is remembered for moral courage, truth before power, and trust in the Divine.',
  },
  'vaar-sri-bhagauti-ji-ki': {
    dek: 'Vaar Sri Bhagauti Ji Ki, widely known as Chandi Di Vaar, is a bir-ras composition in the Dasam Granth tradition. It invokes Divine power through martial and mythic imagery.',
  },
}

function formatAngRange(bani: Pick<Bani, 'startAng' | 'endAng'>) {
  return bani.startAng === bani.endAng ? `Ang ${bani.startAng}` : `Angs ${bani.startAng}–${bani.endAng}`
}

function sourceLineForBani(bani: Bani) {
  return `${SCRIPTURE_LABELS[bani.scripture]} · ${formatAngRange(bani)}`
}

function ensureSentence(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function stripAppImplementationLanguage(value: string) {
  return value
    .replace(/ with adjustable STTM length support/gi, '')
    .replace(/ served as one exact BaniDB bani/gi, '')
    .replace(/ served as its own exact bani/gi, '')
    .replace(/Exact BaniDB /g, '')
    .replace(/exact BaniDB /g, '')
    .replace(/BaniDB /g, '')
}

function buildCategoryDek(bani: Bani) {
  const sourceLabel = SCRIPTURE_LABELS[bani.scripture]
  const location = formatAngRange(bani)
  const description = ensureSentence(stripAppImplementationLanguage(bani.description))

  if (bani.category === 'Raag Sections') {
    return `${bani.name} opens a raag-section passage preserved in ${sourceLabel} on ${location}. ${description}`
  }

  if (bani.category === 'Vars') {
    return `${bani.name} is a vaar preserved in ${sourceLabel} on ${location}. ${description}`
  }

  if (bani.category === 'Swaiye') {
    return `${bani.name} belongs to the Savaiye cluster near the close of ${sourceLabel}, on ${location}. ${description}`
  }

  if (bani.scripture === 'DG') {
    return `${bani.name} is read from the Dasam Granth tradition on ${location}. ${description}`
  }

  return `${bani.name} is preserved in ${sourceLabel} on ${location}. ${description}`
}

function clampDek(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= 280) return trimmed

  const shortened = trimmed.slice(0, 277)
  const lastSentence = shortened.lastIndexOf('.')
  if (lastSentence > 120) return shortened.slice(0, lastSentence + 1)

  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 277).trim()}…`
}

function sourceRefsForBani(bani: Bani): ReaderEditorialSourceRef[] {
  return [
    {
      label: 'NaamRas bani directory metadata',
      note: `${bani.name} is cataloged as ${bani.scripture} ${formatAngRange(bani)} with source ${bani.source}${typeof bani.baniDbId === 'number' ? ` and BaniDB exact-bani id ${bani.baniDbId}` : ''}.`,
    },
    {
      label: SCRIPTURE_LABELS[bani.scripture],
      note: `Reader copy is limited to source location, category, and established tradition reflected in the app metadata; disputed or unsupported authorship claims are avoided.`,
    },
  ]
}

function buildEditorialCopyForBani(bani: Bani): ReaderEditorialCopy {
  const special = SPECIAL_COPY_BY_ID[bani.id]
  return {
    id: bani.id,
    title: bani.name,
    dek: clampDek(special?.dek ?? buildCategoryDek(bani)),
    historicalNote: special?.historicalNote ?? ensureSentence(stripAppImplementationLanguage(bani.description)),
    practiceNote: special?.practiceNote,
    sourceLine: sourceLineForBani(bani),
    sourceRefs: sourceRefsForBani(bani),
    reviewed: true,
    reviewedAt: REVIEWED_AT,
  }
}

export const READER_EDITORIAL_COPY_BY_BANI_ID: Record<string, ReaderEditorialCopy> = Object.fromEntries(
  READ_EXACT_BANIS.map(bani => [bani.id, buildEditorialCopyForBani(bani)])
)

const COPY_BY_BANIDB_AND_SOURCE = new Map<string, ReaderEditorialCopy>()
const COPY_BY_BANIDB = new Map<number, ReaderEditorialCopy>()

for (const bani of READ_EXACT_BANIS) {
  if (typeof bani.baniDbId !== 'number') continue
  const copy = READER_EDITORIAL_COPY_BY_BANI_ID[bani.id]
  COPY_BY_BANIDB_AND_SOURCE.set(`${bani.source}:${bani.baniDbId}`, copy)
  if (!COPY_BY_BANIDB.has(bani.baniDbId)) COPY_BY_BANIDB.set(bani.baniDbId, copy)
}

export function getReaderEditorialCopyForBani(id?: string | null) {
  if (!id) return null
  return READER_EDITORIAL_COPY_BY_BANI_ID[id] ?? null
}

export function getReaderEditorialCopyForBaniDbId(baniDbId?: number | null, source?: Bani['source'] | null) {
  if (typeof baniDbId !== 'number') return null
  if (source) {
    const sourceScoped = COPY_BY_BANIDB_AND_SOURCE.get(`${source}:${baniDbId}`)
    if (sourceScoped) return sourceScoped
  }
  return COPY_BY_BANIDB.get(baniDbId) ?? null
}

export function formatReaderEditorialDate(date?: string | null) {
  if (!date) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00`)
    : new Date(date)

  if (Number.isNaN(parsed.getTime())) return date

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}
