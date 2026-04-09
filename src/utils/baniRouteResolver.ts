import { BANIS, type Bani } from '../data/banis'
import { getStoredSundarGutkaLength } from '../store/sundarGutkaLength'
import type { SundarGutkaLength } from '../types'
import {
  asSupportedSundarGutkaBaniId,
  getSupportedSundarGutkaBaniIdByBaniDbId,
} from './sundarGutkaLength'

type BaniSource = 'G' | 'D' | 'B' | 'A'

function buildRangeKey(source: BaniSource, startAng: number, endAng: number) {
  return `${source}:${startAng}:${endAng}`
}

const CANONICAL_BANIDB_ID_BY_RANGE = new Map<string, number>(
  BANIS
    .filter((bani): bani is Bani & { baniDbId: number } =>
      (bani.source === 'G' || bani.source === 'D') && typeof bani.baniDbId === 'number'
    )
    .map(bani => [buildRangeKey(bani.source, bani.startAng, bani.endAng), bani.baniDbId])
)

export function findBoundedBaniDbId(
  source: BaniSource,
  startAng: number,
  endAng: number
): number | null {
  return CANONICAL_BANIDB_ID_BY_RANGE.get(buildRangeKey(source, startAng, endAng)) ?? null
}

export function findCanonicalBaniById(baniId: string): Bani | null {
  return BANIS.find(bani => bani.id === baniId) ?? null
}

export function buildStudyRouteSearchParams({
  source,
  startAng,
  endAng,
  bani,
  baniDbId,
  baniId,
  sgLength,
}: {
  source: BaniSource
  startAng: number
  endAng: number
  bani: string
  baniDbId?: number | null
  baniId?: string | null
  sgLength?: SundarGutkaLength | null
}): URLSearchParams {
  const params = new URLSearchParams({
    source,
    ang: String(startAng),
    startAng: String(startAng),
    endAng: String(endAng),
    bani,
  })

  if (baniDbId) {
    params.set('baniDbId', String(baniDbId))
    params.set('exactBani', '1')
  }

  if (baniId) {
    params.set('baniId', baniId)
  }

  if (sgLength) {
    params.set('sgLength', sgLength)
  }

  return params
}

export function resolveStudyRouteSgLength({
  baniId,
  baniDbId,
  sgLength,
}: {
  baniId?: string | null
  baniDbId?: number | null
  sgLength?: SundarGutkaLength | null
}): SundarGutkaLength | null {
  if (sgLength) return sgLength

  const supportedBaniId =
    asSupportedSundarGutkaBaniId(baniId)
    ?? getSupportedSundarGutkaBaniIdByBaniDbId(baniDbId)

  if (!supportedBaniId) return null

  return getStoredSundarGutkaLength(supportedBaniId)
}

export function buildCanonicalBaniStudyPath(
  bani: Pick<Bani, 'id' | 'source' | 'startAng' | 'endAng' | 'name' | 'baniDbId' | 'variantOf'>,
  overrides?: {
    baniDbId?: number | null
    baniName?: string
    baniId?: string | null
    sgLength?: SundarGutkaLength | null
  }
): string {
  const baniDbId =
    overrides?.baniDbId
    ?? bani.baniDbId
    ?? findBoundedBaniDbId(bani.source, bani.startAng, bani.endAng)
  const baniId = overrides?.baniId ?? bani.variantOf ?? bani.id

  const params = buildStudyRouteSearchParams({
    source: bani.source,
    startAng: bani.startAng,
    endAng: bani.endAng,
    bani: overrides?.baniName ?? bani.name,
    baniDbId,
    baniId,
    sgLength: resolveStudyRouteSgLength({
      baniId,
      baniDbId,
      sgLength: overrides?.sgLength,
    }),
  })

  return `/study?${params.toString()}`
}
