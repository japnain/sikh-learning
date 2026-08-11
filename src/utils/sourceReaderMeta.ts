import type { UiLocale } from '../types'

export type SourceReaderId = 'G' | 'D' | 'B' | 'A'
export type SourceReaderUnit = 'Ang' | 'Vaar' | 'Page'

export const SOURCE_READER_META = {
  G: {
    name: 'Sri Guru Granth Sahib Ji',
    shortName: 'SGGS',
    scripture: 'SGGS',
    max: 1430,
    unit: 'Ang',
  },
  D: {
    name: 'Sri Dasam Granth Sahib Ji',
    shortName: 'DG',
    scripture: 'DG',
    max: 1428,
    unit: 'Ang',
  },
  B: {
    name: 'Bhai Gurdas Ji Vaaran',
    shortName: 'BGV',
    scripture: 'BGV',
    max: 40,
    unit: 'Vaar',
  },
  A: {
    name: 'Amrit Keertan',
    shortName: 'AK',
    scripture: 'AK',
    max: 1430,
    unit: 'Page',
  },
} as const satisfies Record<SourceReaderId, {
  name: string
  shortName: string
  scripture: string
  max: number
  unit: SourceReaderUnit
}>

export function isSourceReaderId(source: string | null | undefined): source is SourceReaderId {
  return Boolean(source && Object.prototype.hasOwnProperty.call(SOURCE_READER_META, source))
}

export function getSourceReaderUnit(
  source: string | null | undefined,
  scripture?: string | null
): SourceReaderUnit {
  if (isSourceReaderId(source)) return SOURCE_READER_META[source].unit
  if (scripture === 'SGGS' || scripture === 'DG') return 'Ang'
  if (scripture === 'BGV') return 'Vaar'
  return 'Page'
}

const SOURCE_READER_UNIT_LABELS: Record<UiLocale, Record<SourceReaderUnit, string>> = {
  en: { Ang: 'Ang', Vaar: 'Vaar', Page: 'Page' },
  pa: { Ang: 'ਅੰਗ', Vaar: 'ਵਾਰ', Page: 'ਸਫ਼ਾ' },
  hi: { Ang: 'अंग', Vaar: 'वार', Page: 'पृष्ठ' },
}

const SOURCE_READER_VERSE_LABELS: Record<UiLocale, string> = {
  en: 'Verse',
  pa: 'ਪੰਕਤੀ',
  hi: 'पंक्ति',
}

export function getSourceReaderUnitLabel(
  source: string | null | undefined,
  locale: UiLocale,
  scripture?: string | null
) {
  return SOURCE_READER_UNIT_LABELS[locale][getSourceReaderUnit(source, scripture)]
}

export function formatSourceReaderReference({
  source,
  value,
  locale,
  scripture,
  sourceLabel,
  verseId,
}: {
  source: string
  value: number | string
  locale: UiLocale
  scripture?: string | null
  sourceLabel?: string
  verseId?: number
}) {
  const resolvedSourceLabel = sourceLabel
    ?? (isSourceReaderId(source) ? SOURCE_READER_META[source].shortName : source.toUpperCase())
  const location = `${getSourceReaderUnitLabel(source, locale, scripture)} ${value}`
  return [
    resolvedSourceLabel,
    location,
    verseId ? `${SOURCE_READER_VERSE_LABELS[locale]} ${verseId}` : null,
  ].filter(Boolean).join(' · ')
}
