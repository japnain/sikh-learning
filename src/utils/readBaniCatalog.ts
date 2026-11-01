import type { BaniIndexItem } from '../api/banidb'
import { BANI_SCRIPT_NAMES } from '../content/baniScriptNames'
import {
  READ_DIRECTORY_DG_BANIS,
  READ_DIRECTORY_SGGS_BANIS,
  type Bani,
} from '../data/banis'

export type ReadBaniGroup = 'nitnem' | 'popular' | 'other'
export interface ReadBaniCatalogItem {
  identity: string
  baniDbId?: number
  bani?: Bani
  scriptTitle?: string
}

// Every exact reading has one discovery home. Related recensions retain their
// distinct provider IDs; reader length choices remain inside the same route.
export const READ_SUNDAR_GUTKA_GROUP_IDS: Record<ReadBaniGroup, readonly number[]> = {
  nitnem: [2, 4, 6, 7, 9, 10, 21, 23],
  popular: [90, 30, 31, 22],
  other: [24, 11, 1, 3, 32, 36],
}
export const READ_SUNDAR_GUTKA_IDS = new Set(Object.values(READ_SUNDAR_GUTKA_GROUP_IDS).flat())

const canonicalByProviderId = new Map(
  [...READ_DIRECTORY_SGGS_BANIS, ...READ_DIRECTORY_DG_BANIS]
    .flatMap(bani => typeof bani.baniDbId === 'number' ? [[bani.baniDbId, bani] as const] : [])
)

export function buildReadBaniCatalog(providerIndex: readonly BaniIndexItem[] = []) {
  const scriptByProviderId = new Map<number, string>()
  for (const item of providerIndex) {
    if (!Number.isSafeInteger(item.id) || scriptByProviderId.has(item.id)) continue
    const title = typeof item.gurmukhi === 'string' ? item.gurmukhi.trim() : ''
    if (title) scriptByProviderId.set(item.id, title)
  }
  const exactItem = (baniDbId: number): ReadBaniCatalogItem => ({
    identity: `bani:${baniDbId}`,
    baniDbId,
    bani: canonicalByProviderId.get(baniDbId),
    scriptTitle: scriptByProviderId.get(baniDbId) ?? BANI_SCRIPT_NAMES[baniDbId]?.gurmukhi,
  })
  const sourceItems = (banis: readonly Bani[]) => {
    const seen = new Set<string>()
    return banis.flatMap((bani): ReadBaniCatalogItem[] => {
      if (typeof bani.baniDbId === 'number' && READ_SUNDAR_GUTKA_IDS.has(bani.baniDbId)) return []
      const item = typeof bani.baniDbId === 'number'
        ? exactItem(bani.baniDbId)
        : { identity: `browse:${bani.id}`, bani }
      if (seen.has(item.identity)) return []
      seen.add(item.identity)
      return [item]
    })
  }
  return {
    sundarGutka: (Object.entries(READ_SUNDAR_GUTKA_GROUP_IDS) as [ReadBaniGroup, readonly number[]][])
      .map(([key, ids]) => ({ key, items: ids.map(exactItem) })),
    scriptures: {
      SGGS: sourceItems(READ_DIRECTORY_SGGS_BANIS),
      DG: sourceItems(READ_DIRECTORY_DG_BANIS),
    },
  }
}
