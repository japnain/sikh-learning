import type { BaniFetchResult } from './banidb'
import { getShabadosBani, SHABADOS_PACK_FORMAT, SHABADOS_SOURCE_REVISION } from '../data/shabadosBanis'
import { fetchScripturePack } from './scripturePacks'
import type { ScriptureEntry, ScriptureLine } from '../types'
import type { BaniDownloadSource } from '../utils/baniDownloads'

/** Numeric IDs are local reader anchors only; never BaniDB verse/shabad identifiers. */
export const SHABADOS_LINE_ID_BASE = 7_000_000_000_000
const MAX_READING_LINES = 50_000

export interface ShabadosReadingProvenance {
  provider: 'shabados'
  readingId: string
  sourceRevision: string
  formatVersion: number
  assets: string[]
}

export interface ShabadosBaniReading extends BaniFetchResult {
  provenance: ShabadosReadingProvenance
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isTextMap(value: unknown) {
  return isRecord(value) && Object.values(value).every(item => typeof item === 'string')
}

function isLine(value: unknown): value is ScriptureLine {
  if (!isRecord(value)) return false
  return typeof value.providerLineId === 'string' && /^[A-Z0-9]{4}$/.test(value.providerLineId)
    && value.verseId === SHABADOS_LINE_ID_BASE + parseInt(value.providerLineId, 36)
    && value.shabadId === 0
    && Number.isInteger(value.ang) && Number(value.ang) >= 1 && Number(value.ang) <= 1430
    && typeof value.gurmukhi === 'string' && value.gurmukhi.trim().length > 0
    && typeof value.transliteration === 'string'
    && typeof value.translation_en === 'string' && typeof value.translation_hi === 'string' && typeof value.translation_pa === 'string'
    && isTextMap(value.translations_en)
    && (value.translations_pa === undefined || isTextMap(value.translations_pa))
    && (value.translations_hi === undefined || isTextMap(value.translations_hi))
    && (value.isHeader === undefined || typeof value.isHeader === 'boolean')
}

export function isShabadosBaniReading(value: unknown, id: string): value is ShabadosBaniReading {
  if (!getShabadosBani(id) || !isRecord(value) || !isRecord(value.provenance)) return false
  const provenance = value.provenance
  if (provenance.provider !== 'shabados' || provenance.readingId !== id
    || provenance.sourceRevision !== SHABADOS_SOURCE_REVISION || provenance.formatVersion !== SHABADOS_PACK_FORMAT
    || !Array.isArray(provenance.assets) || !provenance.assets.every(asset => typeof asset === 'string')
    || !Array.isArray(value.availableLengths) || value.availableLengths.length !== 0
    || value.resolvedLength !== null || value.normalizationRevision !== 2
    || !Array.isArray(value.entries) || value.entries.length === 0) return false
  const ids = new Set<string>()
  let lineCount = 0
  return value.entries.every((entry: unknown): entry is ScriptureEntry => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id.startsWith(`shabados-${id}-`) || ids.has(entry.id)
      || entry.source !== 'G' || entry.scripture !== 'SGGS' || entry.shabadId !== 0
      || !Number.isInteger(entry.ang) || Number(entry.ang) < 1 || Number(entry.ang) > 1430
      || typeof entry.gurmukhi !== 'string' || !entry.gurmukhi.trim()
      || typeof entry.transliteration !== 'string' || typeof entry.translation_en !== 'string'
      || typeof entry.translation_hi !== 'string' || typeof entry.translation_pa !== 'string'
      || !Array.isArray(entry.words) || entry.words.length !== 0
      || !Array.isArray(entry.lines) || entry.lines.length === 0 || !entry.lines.every(isLine)) return false
    ids.add(entry.id)
    lineCount += entry.lines.length
    return lineCount <= MAX_READING_LINES
  })
}

/** Reads the pinned, verified Shabad OS pack hosted by Naamras. */
export async function fetchShabadosBani(id: string, signal?: AbortSignal): Promise<ShabadosBaniReading> {
  if (!getShabadosBani(id)) throw new Error('This reading is not in the catalogue.')
  const reading = await fetchScripturePack({ key: `shabados:${id}`, revision: SHABADOS_SOURCE_REVISION }, signal)
  if (!isShabadosBaniReading(reading, id)) throw new Error('The downloaded reading did not match the requested bani.')
  return reading
}

export function createShabadosDownloadSource(id: string): BaniDownloadSource {
  const bani = getShabadosBani(id)
  if (!bani) throw new Error('Unknown Shabad OS reading.')
  return {
    key: `shabados:${id}`, title: bani.name, provider: 'shabados', sourceRevision: SHABADOS_SOURCE_REVISION,
    load: (length, signal) => {
      if (length) return Promise.reject(new Error('This reading has no length variants.'))
      return fetchShabadosBani(id, signal)
    },
    validate: (reading, length) => !length && isShabadosBaniReading(reading, id),
  }
}
