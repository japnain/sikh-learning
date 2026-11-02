import type { ScriptureEntry } from '../../../src/types'
import type { BaniSectionProfile } from '../../../src/content/baniSections/profileTypes'
import { SGGS_BANI_SECTION_PROFILES } from '../../../src/content/baniSections/sggsProfiles'
import { fingerprintBaniReading, resolveBaniSectionProfile } from '../../../src/utils/baniSectionProfiles'
import { ARDAAS_LANDMARKS, COMPOSITION_FINE_REVIEWED_FINGERPRINTS, RAAG_MAALA_LANDMARKS, SUKHMANI_STANZA_STARTS } from './compositionFineAnchors'

/** Offline only. Source boundaries are reviewed constants, never runtime parsing. */
export function generateCompositionFineProfile(baniDbId: number, entries: readonly ScriptureEntry[]): BaniSectionProfile {
  const fingerprint = fingerprintBaniReading(entries)
  if (fingerprint !== COMPOSITION_FINE_REVIEWED_FINGERPRINTS[baniDbId]) {
    throw new Error(`Unreviewed complete reading for ${baniDbId}`)
  }
  const previousSukhmani = SGGS_BANI_SECTION_PROFILES.find(profile => profile.baniDbId === 31)!
  const sections = baniDbId === 31
    ? previousSukhmani.sections.map((parent, index) => ({
      ...parent,
      children: SUKHMANI_STANZA_STARTS[index].map((startVerseId, stanza) => ({
        id: `${parent.id}-stanza-${stanza + 1}`, kind: 'stanza', number: stanza + 1,
        startVerseId, excerptVerseId: startVerseId,
      })),
    }))
    : baniDbId === 38 ? RAAG_MAALA_LANDMARKS
      : baniDbId === 24 ? ARDAAS_LANDMARKS : null
  if (!sections) throw new Error(`No reviewed composition landmarks for ${baniDbId}`)
  const profile = { baniDbId, fingerprint, sections }
  if (resolveBaniSectionProfile(entries, profile).length !== sections.length) {
    throw new Error(`Invalid reviewed composition landmarks for ${baniDbId}`)
  }
  return profile
}

export function renderCompositionFineProfiles(profiles: readonly BaniSectionProfile[]): string {
  return `import type { BaniSectionProfile } from './profileTypes'\n\n/** Reviewed fine Contents for the complete 2026-11-01 captured readings.\n * Generated offline through production fetchBani; original scripture is untouched.\n * See docs/qa/bani-composition-fine-structure-20261102.md.\n */\nexport const COMPOSITION_FINE_SECTION_PROFILES = ${JSON.stringify(profiles, null, 2)} as const satisfies readonly BaniSectionProfile[]\n`
}
