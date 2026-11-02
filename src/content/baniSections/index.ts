import { READ_EXACT_BANIS } from '../../data/banis'
import { CATALOG_BANI_SECTION_PROFILES } from './catalogProfiles'
import { DASAM_COMPOSITE_SECTION_PROFILES } from './dasamCompositeProfiles'
import { SGGS_BANI_SECTION_PROFILES } from './sggsProfiles'
import { COMPOSITION_FINE_SECTION_PROFILES } from './compositionFineProfiles'
import { RAAG_FINE_SECTION_PROFILES_B } from './raagFineProfilesB'
import { RAAG_FINE_PROFILES_A } from './raagFineProfilesA'
import type { BaniSectionProfile } from './profileTypes'

/** Complete reviewed readings; the original scripture stays in the provider payload. */
export const BASE_BANI_SECTION_PROFILES: readonly BaniSectionProfile[] = [
  ...CATALOG_BANI_SECTION_PROFILES,
  ...DASAM_COMPOSITE_SECTION_PROFILES,
  ...SGGS_BANI_SECTION_PROFILES,
]

export const FINE_BANI_SECTION_PROFILES: readonly BaniSectionProfile[] = [
  ...COMPOSITION_FINE_SECTION_PROFILES,
  ...RAAG_FINE_PROFILES_A,
  ...RAAG_FINE_SECTION_PROFILES_B,
]

const profileKey = (profile: BaniSectionProfile) => `${profile.baniDbId}:${profile.fingerprint}`
const overridesByKey = new Map<string, BaniSectionProfile[]>()
for (const profile of FINE_BANI_SECTION_PROFILES) {
  const key = profileKey(profile)
  const matches = overridesByKey.get(key) ?? []
  matches.push(profile)
  overridesByKey.set(key, matches)
}

/** Only an exact reviewed reading can replace its historical navigation profile. */
export const BANI_SECTION_PROFILES: readonly BaniSectionProfile[] = BASE_BANI_SECTION_PROFILES.flatMap(profile => {
  const overrides = overridesByKey.get(profileKey(profile))
  // Conflicting overrides fall back to source pages, never whichever was last.
  return overrides ? overrides.length === 1 ? overrides : [] : [profile]
})

const profilesByBani = new Map<number, BaniSectionProfile[]>()
for (const profile of BANI_SECTION_PROFILES) {
  const profiles = profilesByBani.get(profile.baniDbId) ?? []
  profiles.push(profile)
  profilesByBani.set(profile.baniDbId, profiles)
}

const routeNamesByBani = new Map<number, Set<string>>()
for (const bani of READ_EXACT_BANIS) {
  if (bani.baniDbId == null) continue
  const names = routeNamesByBani.get(bani.baniDbId) ?? new Set<string>()
  names.add(bani.id)
  if (bani.variantOf) names.add(bani.variantOf)
  routeNamesByBani.set(bani.baniDbId, names)
}

export function getReviewedBaniProfiles(baniDbId: number, baniId?: string | null): readonly BaniSectionProfile[] {
  if (baniId != null && !routeNamesByBani.get(baniDbId)?.has(baniId)) return []
  return profilesByBani.get(baniDbId) ?? []
}
