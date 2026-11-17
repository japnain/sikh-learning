import type { BaniFetchResult } from './banidb'
import { READ_BANIDB_CATALOG_IDS } from '../data/banis'
import type { SundarGutkaLength } from '../types'
import { isExactBaniReading } from '../utils/baniReadingValidation'
import { fetchScripturePack } from './scripturePacks'

export const HOSTED_BANI_REVISION = 'banidb-2026-11-12-normalization-2'

/** Existing editions are hosted unchanged; unverified Shabad OS matches never substitute for them. */
export async function fetchHostedBaniReading(
  baniDbId: number,
  length?: SundarGutkaLength | null,
  signal?: AbortSignal,
): Promise<BaniFetchResult> {
  if (!READ_BANIDB_CATALOG_IDS.includes(baniDbId)) throw new Error('Unknown bani download.')
  const reading = await fetchScripturePack({ key: `banidb:${baniDbId}`, revision: HOSTED_BANI_REVISION, variant: length ?? 'default' }, signal)
  if (!isExactBaniReading(reading, baniDbId, length)) throw new Error('The downloaded reading did not match this bani and length.')
  return reading
}
