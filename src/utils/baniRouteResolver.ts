import { BANIS, type Bani } from '../data/banis'

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
}: {
  source: BaniSource
  startAng: number
  endAng: number
  bani: string
  baniDbId?: number | null
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

  return params
}

export function buildCanonicalBaniStudyPath(
  bani: Pick<Bani, 'source' | 'startAng' | 'endAng' | 'name' | 'baniDbId'>,
  overrides?: {
    baniDbId?: number | null
    baniName?: string
  }
): string {
  const baniDbId =
    overrides?.baniDbId
    ?? bani.baniDbId
    ?? findBoundedBaniDbId(bani.source, bani.startAng, bani.endAng)

  const params = buildStudyRouteSearchParams({
    source: bani.source,
    startAng: bani.startAng,
    endAng: bani.endAng,
    bani: overrides?.baniName ?? bani.name,
    baniDbId,
  })

  return `/study?${params.toString()}`
}
