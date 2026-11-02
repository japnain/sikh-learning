import type { ScriptureEntry } from '../../../src/types'
import type { BaniSectionProfile } from '../../../src/content/baniSections/profileTypes'
import { fingerprintBaniReading, resolveBaniSectionProfile } from '../../../src/utils/baniSectionProfiles'
import { DASAM_COMPOSITE_REVIEWED_ANCHORS } from './dasamCompositeAnchors'

/** Offline generation from the reviewed capture after production fetchBani normalization.
 * No punctuation/number recognition happens here or in the generated runtime data.
 */
export function generateDasamCompositeProfile(baniDbId: number, entries: readonly ScriptureEntry[]): BaniSectionProfile {
  const reviewed = DASAM_COMPOSITE_REVIEWED_ANCHORS[baniDbId]
  if (!reviewed) throw new Error(`No reviewed Dasam/composite anchors for ${baniDbId}`)
  const lines = entries.flatMap(entry => entry.lines ?? [])
  const positions = new Map(lines.map((line, index) => [line.verseId, index]))
  const selected = reviewed.filter(section => positions.has(section.startVerseId))
    .sort((a, b) => positions.get(a.startVerseId)! - positions.get(b.startVerseId)!)
  const sections = selected.map((section, index) => {
    const start = positions.get(section.startVerseId)!
    const end = index + 1 < selected.length ? positions.get(selected[index + 1].startVerseId)! : lines.length
    const body = lines.slice(start, end).find(line => !line.isHeader)
    if (!body) throw new Error(`Missing body for ${baniDbId}/${section.startVerseId}`)
    return { ...section, excerptVerseId: section.excerptVerseId ?? body.verseId }
  })
  const profile = { baniDbId, fingerprint: fingerprintBaniReading(entries), sections }
  if (!sections.length || resolveBaniSectionProfile(entries, profile).length !== sections.length) {
    throw new Error(`Invalid reviewed boundaries for ${baniDbId}`)
  }
  return profile
}

export function renderDasamCompositeProfiles(profiles: readonly BaniSectionProfile[]): string {
  return `import type { BaniSectionProfile } from './profileTypes'\n\n/** Reviewed static anchors for exact whole-reading fingerprints.\n * Generated offline from the 2026-11-01 captured provider archive using production fetchBani.\n * See scripts/qa/bani-sections and docs/qa/bani-{variant,other}-structure-research-*.md.\n * No runtime registry activation is implied by this data file.\n */\nexport const DASAM_COMPOSITE_SECTION_PROFILES = ${JSON.stringify(profiles, null, 2)} as const satisfies readonly BaniSectionProfile[]\n`
}
