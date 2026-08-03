import { BANIS, READ_EXACT_BANIS, type Bani } from '../data/banis'
import type { UiLocale } from '../types'
import {
  getReaderEditorialResearchForBani,
  type ReaderEditorialResearch,
} from './readerEditorialResearch'

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
  'Exact BaniDB',
  'served as one exact',
  'served as its own exact',
  'adjustable STTM',
  'existing catalog premise',
  'cataloged source range',
  'used by the app',
  'source doorway',
  'generic inspirational copy',
  'opened here as a complete vaar',
  'manual editorial review',
]

export const READER_EDITORIAL_REVIEWED_AT = '2026-07-15'

const SGPC_REHAT_URL = 'https://sgpc.net/storage/2026/06/Sikh_Rehat_Maryada_English.pdf'

const SCRIPTURE_LABELS: Record<Bani['scripture'], string> = {
  SGGS: 'Sri Guru Granth Sahib Ji',
  DG: 'Sri Dasam Granth Sahib Ji',
  BGV: 'Bhai Gurdas Ji Vaaran',
  AK: 'Amrit Keertan',
}

const SOURCE_LABELS: Record<Bani['source'], string> = {
  G: 'Sri Guru Granth Sahib Ji',
  D: 'Dasam Bani',
  B: 'Bhai Gurdas Ji Vaaran',
  A: 'Amrit Keertan',
}

function describeRange(bani: Pick<Bani, 'scripture' | 'startAng' | 'endAng'>) {
  const singular = bani.scripture === 'BGV' ? 'Vaar' : bani.scripture === 'AK' ? 'page' : 'Ang'
  const plural = singular === 'Vaar' ? 'Vaaran' : singular === 'page' ? 'pages' : 'Angs'
  return bani.startAng === bani.endAng
    ? `${singular} ${bani.startAng}`
    : `${plural} ${bani.startAng}–${bani.endAng}`
}

function sourceLineForBani(bani: Bani, research: ReaderEditorialResearch) {
  return research.sourceLine ?? `${SCRIPTURE_LABELS[bani.scripture]} · ${describeRange(bani)}`
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function clampDek(value: string) {
  const trimmed = normalizeSpaces(value)
  if (trimmed.length <= 280) return trimmed

  const shortened = trimmed.slice(0, 277)
  const lastSentence = shortened.lastIndexOf('.')
  if (lastSentence > 120) return shortened.slice(0, lastSentence + 1)

  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 277).trim()}…`
}

function sourceReaderUrl(source: Bani['source'], position: number) {
  if (source === 'A') return 'https://api.banidb.com/v2/amritkeertan'
  return `https://www.sikhitothemax.org/ang?ang=${position}&source=${source}`
}

function primarySourceRefForBani(bani: Bani): ReaderEditorialSourceRef {
  if (bani.id === 'gur-mantar') {
    return {
      label: 'Bhai Gurdas Ji Vaar 13 source passage',
      url: sourceReaderUrl('B', 13),
      note: 'Opens the Vaar 13 source associated with the Waheguru gurmantar line; the reader set also identifies its Sarbloh-attributed passage.',
    }
  }

  if (bani.source === 'A') {
    return {
      label: 'BaniDB Amrit Keertan index',
      url: sourceReaderUrl('A', 1),
      note: 'Provides the ordered hymnbook sections and their links back to the complete source shabads.',
    }
  }

  return {
    label: `${SOURCE_LABELS[bani.source]} source`,
    url: sourceReaderUrl(bani.source, bani.startAng),
    note: `Opens ${describeRange(bani)} in the named source so the heading and neighbouring text can be checked directly.`,
  }
}

function sourceRefsForBani(bani: Bani, research: ReaderEditorialResearch): ReaderEditorialSourceRef[] {
  const refs: ReaderEditorialSourceRef[] = [primarySourceRefForBani(bani)]

  if (typeof bani.baniDbId === 'number') {
    refs.push({
      label: `BaniDB Bani ${bani.baniDbId}`,
      url: `https://api.banidb.com/v2/banis/${bani.baniDbId}`,
      note: 'Provides the exact reader record, line sequence, source markers, and translations used by this route.',
    })
  }

  for (const source of research.extraSources ?? []) {
    if (!refs.some(ref => ref.url === source.url)) refs.push(source)
  }

  return refs
}

function fallbackResearchForBani(bani: Bani): ReaderEditorialResearch {
  return {
    premise: `${bani.name} opens ${SCRIPTURE_LABELS[bani.scripture]} at ${describeRange(bani)}. Its heading and complete source passage remain the safest frame for reading.`,
    context: 'This catalog entry still needs an individual editorial review. The current note limits itself to source and location so no unsupported authorship or practice claim reaches the reader.',
    usage: 'Begin with the source heading and keep neighbouring lines visible when studying, saving, or sharing a passage.',
  }
}

function buildEditorialCopyForBani(bani: Bani): ReaderEditorialCopy {
  const researched = getReaderEditorialResearchForBani(bani)
  const resolved = researched ?? fallbackResearchForBani(bani)

  return {
    id: bani.id,
    title: bani.name,
    dek: clampDek(resolved.premise),
    historicalNote: normalizeSpaces(resolved.context),
    practiceNote: normalizeSpaces(resolved.usage),
    sourceLine: sourceLineForBani(bani, resolved),
    sourceRefs: sourceRefsForBani(bani, resolved),
    reviewed: Boolean(researched),
    reviewedAt: researched ? READER_EDITORIAL_REVIEWED_AT : undefined,
  }
}

const ARDAAS_SOURCE_REFS: ReaderEditorialSourceRef[] = [
  {
    label: 'SGPC Sikh Rehat Maryada',
    url: SGPC_REHAT_URL,
    note: 'Used for the prescribed form, congregational practice, Hukamnama procedure, and Sarbat da bhala closing.',
  },
  {
    label: 'SGPC Ardas',
    url: 'https://sgpc.net/ardas/',
    note: 'Provides the official published Gurmukhi text of Ardaas for direct reference.',
  },
  {
    label: 'BaniDB Ardaas record',
    url: 'https://api.banidb.com/v2/banis/24',
    note: 'Provides the exact line sequence and translations used by the standalone reader route.',
  },
  {
    label: 'Punjabi University Encyclopedia: Ardas',
    url: 'https://eos.learnpunjabi.org/ARDAS.html',
    note: 'Used for the prayer’s history, structure, and place in Sikh collective memory.',
  },
]

export const ARDAAS_EDITORIAL_COPY: ReaderEditorialCopy = {
  id: 'ardaas',
  title: 'Ardaas',
  dek: 'Ardaas gathers Sikh memory, gratitude, petition, and responsibility into a shared supplication before the Guru.',
  historicalNote: 'Its opening draws from Vaar Sri Bhagauti Ji Ki. The prayer then remembers the Gurus, Panj Pyare, four Sahibzade, martyrs, gurdwaras, and the Panth before asking for naam, discernment, courage, and the welfare of all.',
  practiceNote: 'Stand respectfully with folded hands and attend to the full prayer. Personal requests belong within its wider discipline of humility, collective remembrance, and Sarbat da bhala.',
  sourceLine: 'Sikh congregational prayer · Form described in the Sikh Rehat Maryada',
  sourceRefs: ARDAAS_SOURCE_REFS,
  reviewed: true,
  reviewedAt: READER_EDITORIAL_REVIEWED_AT,
}

export const ARDAAS_HUKAMNAMA_EDITORIAL_COPY: ReaderEditorialCopy = {
  id: 'ardaas-hukamnama',
  title: 'Ardaas + Hukamnama',
  dek: 'Complete Ardaas, then receive a Hukamnama from Sri Guru Granth Sahib Ji and read the selected shabad in full.',
  historicalNote: 'Ardaas holds the memory and needs of the Panth before the sangat turns toward the Guru’s hukam. The Sikh Rehat Maryada describes both practices within congregational life and closes the prayer with Sarbat da bhala.',
  practiceNote: 'Give the prayer and shabad their own complete attention. Read the Hukamnama through its raag, writer, Ang, and surrounding lines so guidance remains grounded in Gurbani rather than prediction.',
  sourceLine: 'Ardaas · Hukamnama from Sri Guru Granth Sahib Ji',
  sourceRefs: [
    ...ARDAAS_SOURCE_REFS,
    {
      label: 'SikhiToTheMax: Sri Guru Granth Sahib Ji',
      url: sourceReaderUrl('G', 1),
      note: 'Provides direct access to the scripture source used when the selected Hukamnama shabad is opened.',
    },
  ],
  reviewed: true,
  reviewedAt: READER_EDITORIAL_REVIEWED_AT,
}

export const DAILY_HUKAMNAMA_EDITORIAL_COPY: ReaderEditorialCopy = {
  id: 'daily-hukamnama',
  title: 'Daily Hukamnama',
  dek: 'Receive today’s Hukamnama from Sri Harmandir Sahib, Amritsar, then read its complete shabad with the displayed date and source details.',
  historicalNote: 'A Hukamnama is the Guru’s command received through a shabad of Sri Guru Granth Sahib Ji. The dated Harmandir Sahib reading belongs to a living daily practice, with meaning carried by the whole shabad rather than one detached line.',
  practiceNote: 'Begin with the date, raag, writer, and Ang. Read the visible passage slowly, then open the full source shabad before carrying its guidance into reflection or action.',
  sourceLine: 'Sri Harmandir Sahib, Amritsar · Sri Guru Granth Sahib Ji',
  sourceRefs: [
    {
      label: 'BaniDB daily Hukamnama record',
      url: 'https://api.banidb.com/v2/hukamnamas',
      note: 'Provides the dated daily selection and the source-shabad identifiers displayed by the reader.',
    },
    ARDAAS_SOURCE_REFS[0]!,
  ],
  reviewed: true,
  reviewedAt: READER_EDITORIAL_REVIEWED_AT,
}

export const PERSONAL_HUKAMNAMA_EDITORIAL_COPY: ReaderEditorialCopy = {
  id: 'personal-hukamnama',
  title: 'Personal Hukamnama',
  dek: 'Read the shabad selected after Ardaas in its complete source context, with Ang, raag, writer, and surrounding lines visible.',
  historicalNote: 'This route follows the personal Ardaas flow and remains distinct from the dated Hukamnama received at Sri Harmandir Sahib. In both settings, hukam is received through Gurbani rather than reduced to a prediction.',
  practiceNote: 'Approach the selection with humility and read the complete shabad. Let its own vocabulary and movement guide reflection before applying one line to a private concern.',
  sourceLine: 'Hukamnama after Ardaas · Sri Guru Granth Sahib Ji',
  sourceRefs: [
    ARDAAS_SOURCE_REFS[0]!,
    {
      label: 'SikhiToTheMax: Sri Guru Granth Sahib Ji',
      url: sourceReaderUrl('G', 1),
      note: 'Provides the full source context for the shabad selected after Ardaas.',
    },
  ],
  reviewed: true,
  reviewedAt: READER_EDITORIAL_REVIEWED_AT,
}

export const READER_EDITORIAL_BANIS: Bani[] = Array.from(
  new Map([...READ_EXACT_BANIS, ...BANIS].map(bani => [bani.id, bani])).values()
)

export const READER_EDITORIAL_COPY_BY_BANI_ID: Record<string, ReaderEditorialCopy> = Object.fromEntries(
  READER_EDITORIAL_BANIS.map(bani => [bani.id, buildEditorialCopyForBani(bani)])
)

const COPY_BY_BANIDB_AND_SOURCE = new Map<string, ReaderEditorialCopy>()
const COPY_BY_BANIDB = new Map<number, ReaderEditorialCopy>()

for (const bani of READER_EDITORIAL_BANIS) {
  if (typeof bani.baniDbId !== 'number') continue
  const copy = READER_EDITORIAL_COPY_BY_BANI_ID[bani.id]
  COPY_BY_BANIDB_AND_SOURCE.set(`${bani.source}:${bani.baniDbId}`, copy)
  if (!COPY_BY_BANIDB.has(bani.baniDbId)) COPY_BY_BANIDB.set(bani.baniDbId, copy)
}

COPY_BY_BANIDB.set(24, ARDAAS_EDITORIAL_COPY)

const EDITORIAL_ID_ALIASES: Record<string, string> = {
  'tav-prasad-savaiye-dheenan-ki': 'tav-prasad-savaiye-dinan-ki',
  'rehras-sahib-focused': 'rehras-sahib',
  'chaupai-sahib-focused': 'chaupai-sahib',
}

export function getReaderEditorialCopyForBani(id?: string | null) {
  if (!id) return null
  const canonicalId = EDITORIAL_ID_ALIASES[id] ?? id
  return READER_EDITORIAL_COPY_BY_BANI_ID[canonicalId] ?? null
}

export function getReaderEditorialCopyForBaniDbId(baniDbId?: number | null, source?: Bani['source'] | null) {
  if (typeof baniDbId !== 'number') return null
  if (source) {
    const sourceScoped = COPY_BY_BANIDB_AND_SOURCE.get(`${source}:${baniDbId}`)
    if (sourceScoped) return sourceScoped
  }
  return COPY_BY_BANIDB.get(baniDbId) ?? null
}

type SourceEditorialOptions = {
  exactShabad?: boolean
}

export function getReaderEditorialCopyForSource(
  source: Bani['source'],
  position?: number | null,
  options: SourceEditorialOptions = {}
): ReaderEditorialCopy {
  const numericPosition = typeof position === 'number' && position > 0 ? position : 1
  const collection = SOURCE_LABELS[source]
  const unit = source === 'B' ? 'Vaar' : source === 'A' ? 'page' : 'Ang'
  const sourceLocation = `${unit} ${numericPosition}`
  const isExactShabad = Boolean(options.exactShabad)
  const shabadLead = isExactShabad
    ? 'This route opens one complete shabad with its original heading, writer, and source location.'
    : `This route opens ${collection} at ${sourceLocation}, preserving the source order and internal headings.`

  return {
    id: `source-${source}-${numericPosition}${isExactShabad ? '-shabad' : ''}`,
    title: isExactShabad ? 'Source Shabad' : sourceLocation,
    dek: shabadLead,
    historicalNote: source === 'A'
      ? 'Amrit Keertan supplies an ordered hymnbook index. The scripture named inside each result remains the source of the shabad, together with its raag, writer, and Ang.'
      : `The route begins at ${sourceLocation} in ${collection}. Writer, raag, and structural headings can change within the page, so those internal markers govern attribution.`,
    practiceNote: isExactShabad
      ? 'Read from the heading through the complete shabad and retain the rahao line when present. Keep source metadata with any passage saved or shared.'
      : `Follow the text in source order from ${sourceLocation}. Read enough surrounding lines to understand each heading before isolating a verse for study.`,
    sourceLine: `${collection} · ${sourceLocation}`,
    sourceRefs: [
      {
        label: `${collection} source`,
        url: sourceReaderUrl(source, numericPosition),
        note: `Opens ${sourceLocation} in the named source or index.`,
      },
      source === 'A'
        ? {
            label: 'Amrit Keertan table of contents',
            url: 'https://amritkirtan.com/shabad-TOC.html',
            note: 'Provides a readable book-order reference alongside the structured BaniDB index used by the app.',
          }
        : {
            label: 'BaniDB source record',
            url: `https://api.banidb.com/v2/angs/${numericPosition}/${source}`,
            note: 'Provides the line order, headings, source metadata, and translations used by this reader route.',
          },
    ],
    reviewed: true,
    reviewedAt: READER_EDITORIAL_REVIEWED_AT,
  }
}

export function formatReaderEditorialDate(date?: string | null, locale: UiLocale = 'en') {
  if (!date) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00`)
    : new Date(date)

  if (Number.isNaN(parsed.getTime())) return date

  const dateLocale: Record<UiLocale, string> = {
    en: 'en-US',
    pa: 'pa-IN',
    hi: 'hi-IN',
  }

  return new Intl.DateTimeFormat(dateLocale[locale], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}
