import type { Bani } from '../data/banis'
import { BHAGAT_BANI_DISCOVERY } from './baniDiscoveryBhagats'
import { DASAM_BANI_DISCOVERY, ZAFARNAMA_DISCOVERY } from './baniDiscoveryDasam'
import { SGGS_BANI_DISCOVERY } from './baniDiscoverySggs'
import { VAAR_BANI_DISCOVERY } from './baniDiscoveryVaars'
import type { BaniDiscoveryEntries, BaniDiscoveryEntry } from './baniDiscoveryTypes'

export const BANI_DISCOVERY: BaniDiscoveryEntries = {
  ...SGGS_BANI_DISCOVERY,
  ...DASAM_BANI_DISCOVERY,
  ...BHAGAT_BANI_DISCOVERY,
  ...VAAR_BANI_DISCOVERY,
}

export function getBaniDiscovery(baniDbId: number): BaniDiscoveryEntry | undefined {
  return BANI_DISCOVERY[baniDbId]
}

export function getBrowseBaniDiscovery(bani: Bani): BaniDiscoveryEntry | undefined {
  if (bani.id === 'zafarnama') return ZAFARNAMA_DISCOVERY
  return typeof bani.baniDbId === 'number' ? getBaniDiscovery(bani.baniDbId) : undefined
}
