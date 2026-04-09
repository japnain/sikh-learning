import type { SundarGutkaLength } from '../types'

export const SUNDAR_GUTKA_LENGTH_ORDER = ['short', 'medium', 'long', 'extralong'] as const satisfies readonly SundarGutkaLength[]

export const SUNDAR_GUTKA_LENGTH_LABELS: Record<SundarGutkaLength, string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  extralong: 'Extra Long',
}

export const SUNDAR_GUTKA_LENGTH_EXISTS_KEY: Record<SundarGutkaLength, 'existsSGPC' | 'existsMedium' | 'existsTaksal' | 'existsBuddhaDal'> = {
  short: 'existsSGPC',
  medium: 'existsMedium',
  long: 'existsTaksal',
  extralong: 'existsBuddhaDal',
}

export const SUNDAR_GUTKA_SUPPORTED_BANI_IDS = [
  'chaupai-sahib',
  'rehras-sahib',
  'aarti',
  'kirtan-sohila',
] as const

export type SupportedSundarGutkaBaniId = (typeof SUNDAR_GUTKA_SUPPORTED_BANI_IDS)[number]

export const SUNDAR_GUTKA_SUPPORTED_BANIS: Record<SupportedSundarGutkaBaniId, {
  baniDbId: number
  name: string
  defaultLength: SundarGutkaLength
}> = {
  'chaupai-sahib': {
    baniDbId: 9,
    name: 'Benati Chaupai Sahib',
    defaultLength: 'short',
  },
  'rehras-sahib': {
    baniDbId: 21,
    name: 'Rehras Sahib',
    defaultLength: 'short',
  },
  aarti: {
    baniDbId: 22,
    name: 'Aarti',
    defaultLength: 'short',
  },
  'kirtan-sohila': {
    baniDbId: 23,
    name: 'Kirtan Sohila',
    defaultLength: 'short',
  },
}

const SUNDAR_GUTKA_SUPPORTED_BANI_ID_SET = new Set<string>(SUNDAR_GUTKA_SUPPORTED_BANI_IDS)

const SUNDAR_GUTKA_SUPPORTED_BANI_ID_BY_BANIDB_ID = new Map<number, SupportedSundarGutkaBaniId>(
  SUNDAR_GUTKA_SUPPORTED_BANI_IDS.map(baniId => [SUNDAR_GUTKA_SUPPORTED_BANIS[baniId].baniDbId, baniId])
)

export function asSupportedSundarGutkaBaniId(value: string | null | undefined): SupportedSundarGutkaBaniId | null {
  if (!value || !SUNDAR_GUTKA_SUPPORTED_BANI_ID_SET.has(value)) return null
  return value as SupportedSundarGutkaBaniId
}

export function getSupportedSundarGutkaBaniIdByBaniDbId(
  baniDbId: number | null | undefined
): SupportedSundarGutkaBaniId | null {
  if (!baniDbId) return null
  return SUNDAR_GUTKA_SUPPORTED_BANI_ID_BY_BANIDB_ID.get(baniDbId) ?? null
}

export function isSundarGutkaLengthSupportedBaniId(value: string | null | undefined): value is SupportedSundarGutkaBaniId {
  return asSupportedSundarGutkaBaniId(value) !== null
}

export function isSundarGutkaLengthSupportedBaniDbId(baniDbId: number | null | undefined): boolean {
  return getSupportedSundarGutkaBaniIdByBaniDbId(baniDbId) !== null
}

export function normalizeSundarGutkaLength(value: string | null | undefined): SundarGutkaLength | null {
  if (!value) return null
  return SUNDAR_GUTKA_LENGTH_ORDER.find(length => length === value) ?? null
}

function normalizeLegacyLabel(value: string | null | undefined) {
  return value
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`()]/g, '')
    .replace(/[^a-z0-9\u0A00-\u0A7F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? ''
}

export function inferLegacySundarGutkaLength({
  baniId,
  baniName,
}: {
  baniId?: string | null
  baniName?: string | null
}): SundarGutkaLength | null {
  const supportedBaniId = asSupportedSundarGutkaBaniId(baniId)
  const normalizedName = normalizeLegacyLabel(baniName)

  if (!normalizedName.includes('focused') && !normalizedName.includes('puraatan')) {
    return null
  }

  if (supportedBaniId === 'rehras-sahib') {
    if (normalizedName.includes('focused')) return 'long'
    if (normalizedName.includes('puraatan')) return 'extralong'
  }

  if (supportedBaniId === 'chaupai-sahib') {
    if (normalizedName.includes('focused')) return 'long'
    if (normalizedName.includes('puraatan')) return 'short'
  }

  return null
}

export function getSundarGutkaLengthLabel(length: SundarGutkaLength): string {
  return SUNDAR_GUTKA_LENGTH_LABELS[length]
}

export function getSundarGutkaLengthDetail(length: SundarGutkaLength): string {
  return `Adjustable length · currently ${getSundarGutkaLengthLabel(length)}`
}
