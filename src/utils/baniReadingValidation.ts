import type { BaniFetchResult } from '../api/banidb'
import { BANIS } from '../data/banis'
import type { ScriptureEntry, SundarGutkaLength } from '../types'
import { SUNDAR_GUTKA_LENGTH_ORDER } from './sundarGutkaLength'

const sourceScriptures = { G: 'SGGS', D: 'DG', B: 'BGV', A: 'AK' } as const
const expectedSources = new Map(BANIS.flatMap(bani => bani.baniDbId ? [[bani.baniDbId, bani.source] as const] : []))

function isLength(value: unknown): value is SundarGutkaLength {
  return SUNDAR_GUTKA_LENGTH_ORDER.some(length => length === value)
}

function isExactEntry(value: unknown, baniDbId: number): value is ScriptureEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<ScriptureEntry>
  const source = entry.source
  const sourceUnavailable = entry.sourceAttribution === 'unavailable'
  const sourceIsConsistent = sourceUnavailable
    ? source === expectedSources.get(baniDbId)
      && entry.scripture === 'Sundar Gutka'
      && entry.sourceName === 'Sundar Gutka'
      && entry.sourceMeta === null
      && (entry.shabadId == null || entry.shabadId === 0)
      && (entry.lines === undefined || (Array.isArray(entry.lines)
        && entry.lines.every(line => line && (line.shabadId == null || line.shabadId === 0))))
    : entry.sourceAttribution === undefined
      && source !== undefined && Object.hasOwn(sourceScriptures, source)
      && entry.scripture === sourceScriptures[source]
      && (!entry.sourceMeta?.sourceId || entry.sourceMeta.sourceId === source)
  return typeof entry.id === 'string'
    && entry.id.startsWith(`bani-${baniDbId}-`)
    && source !== undefined && Object.hasOwn(sourceScriptures, source)
    && sourceIsConsistent
    && typeof entry.ang === 'number' && Number.isFinite(entry.ang) && entry.ang > 0
    && typeof entry.gurmukhi === 'string' && entry.gurmukhi.trim().length > 0
    && typeof entry.transliteration === 'string'
    && typeof entry.translation_en === 'string'
    && typeof entry.translation_hi === 'string'
    && typeof entry.translation_pa === 'string'
    && Array.isArray(entry.words)
    && (entry.lines === undefined || (
      Array.isArray(entry.lines)
      && entry.lines.every(line => line !== null && typeof line === 'object' && typeof line.gurmukhi === 'string')
    ))
}

/** Correct only the old, identifiable metadata fallback; scripture text and route keys stay intact. */
export function normalizeCachedBaniReading(
  value: unknown,
  baniDbId: number,
  sgLength?: SundarGutkaLength | null,
): BaniFetchResult | null {
  if (!isExactBaniReading(value, baniDbId, sgLength)) return null
  // Old global grouping reordered these real Rehras bands. Keep their bytes, but require a fresh sequence.
  if (baniDbId === 21 && (value.resolvedLength === 'long' || value.resolvedLength === 'extralong')
    && value.normalizationRevision !== 2
    && value.entries.some(entry => entry.id === `bani-${baniDbId}-${entry.ang}-0`
      && (entry.shabadId == null || entry.shabadId === 0))) return null
  const expectedSource = expectedSources.get(baniDbId)
  if (!expectedSource) return value
  let changed = false
  const entries = value.entries.map(entry => {
    if (entry.sourceAttribution !== undefined || entry.source !== expectedSource
      || entry.scripture !== sourceScriptures[expectedSource] || entry.sourceName !== entry.scripture
      || entry.sourceMeta !== null || (entry.shabadId != null && entry.shabadId !== 0)
      || entry.id !== `bani-${baniDbId}-${entry.ang}-0`
      || !entry.lines?.length || entry.lines.some(line => line.shabadId != null && line.shabadId !== 0)) return entry
    changed = true
    return { ...entry, scripture: 'Sundar Gutka', sourceName: 'Sundar Gutka', sourceMeta: null, sourceAttribution: 'unavailable' as const }
  })
  return changed ? { ...value, entries } : value
}

/** Verify content identity as well as its cache key before showing or saving an exact reading. */
export function isExactBaniReading(
  value: unknown,
  baniDbId: number,
  sgLength?: SundarGutkaLength | null,
): value is BaniFetchResult {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<BaniFetchResult>
  if (!Array.isArray(data.entries) || data.entries.length === 0
    || !data.entries.every(entry => isExactEntry(entry, baniDbId))
    || !Array.isArray(data.availableLengths) || !data.availableLengths.every(isLength)
    || (data.resolvedLength !== null && !isLength(data.resolvedLength))) return false

  if (data.resolvedLength === null ? data.availableLengths.length > 0 : !data.availableLengths.includes(data.resolvedLength)) return false

  // Composite banis legitimately include more than one scripture. Their canonical source must still occur.
  const expectedSource = expectedSources.get(baniDbId)
  if (expectedSource && !data.entries.some(entry => entry.source === expectedSource)) return false

  if (!sgLength || data.resolvedLength === sgLength) return true

  // BaniDB folds identical raw extra-long/long content into three ordered bands for these two banis.
  return (baniDbId === 9 || baniDbId === 22)
    && sgLength === 'extralong' && data.resolvedLength === 'long'
    && data.availableLengths.join(',') === 'short,medium,long'
}
