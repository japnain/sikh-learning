import type { BaniProfileSectionSpec, BaniSectionProfile } from '../../src/content/baniSections/profileTypes'
import { CATALOG_BANI_SECTION_PROFILES } from '../../src/content/baniSections/catalogProfiles'

/** Reviewed selection-local IDs, not a punctuation parser or canonical verse IDs.
 * Evidence: docs/qa/raag-fine-a-structure-review-20261102.md.
 * Each pair is [body opening, printed unit ending], inclusive.
 */
export const RAAG_FINE_A_IDS = [55, 56, 57, 58, 59, 60, 64, 65] as const
export const SHABAD_UNITS_A: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  19129: [[19130, 19141], [19142, 19149], [19150, 19167], [19168, 19175]],
  19465: [[19466, 19480], [19481, 19485]],
  19791: [[19793, 19800], [19801, 19814]],
  20355: [[20356, 20363], [20364, 20371]],
  20533: [[20536, 20545], [20546, 20555], [20556, 20565]],
  20566: [[20567, 20584], [20585, 20602], [20603, 20619], [20620, 20633], [20634, 20641]],
  20642: [[20644, 20651], [20652, 20661]],
  20725: [[20727, 20736], [20737, 20746], [20747, 20754], [20755, 20762], [20763, 20774], [20775, 20786], [20787, 20794]],
  20795: [[20797, 20804], [26338, 26343]],
  20805: [[20808, 20812], [20813, 20820], [20821, 20826], [20827, 20836], [20837, 20846]],
  20847: [[20849, 20858], [20859, 20868], [20869, 20879], [20880, 20896], [20897, 20902]],
  20903: [[20905, 20910], [20911, 20916], [20917, 20926]],
}

// Exact body matches to independently reviewed standalone banis 39, 47 and 50.
// The refrain stays in the complete reader; it is never counted as a new stanza.
export const BAVAN_STARTS_A = [19508, 19510, 19514, 19516, 19518, 19520, 19524, 19528, 19532, 19536,
  19540, 19542, 19546, 19550, 19554, 19558, 19560, 19564, 19568, 19572, 19576, 19580, 19584, 19588,
  19592, 19596, 19600, 19604, 19608, 19612, 19616, 19620, 19622, 19626, 19628, 19632, 19636, 19640,
  19642, 19646, 19649, 19653, 19657, 19661, 19665] as const
export const THITI_STARTS_A = [19676, 19681, 19687, 19691, 19695, 19699, 19703, 19707, 19711,
  19715, 19719, 19723, 19727, 19731, 19735, 19739, 19743] as const
export const WEEKDAY_STARTS_A = [19751, 19755, 19759, 19763, 19767, 19771, 19775, 19778] as const

// These literal printed headings have header:0 in the captured provider response.
// Parent labels retain their exact spelling; no new author attribution is inferred.
export const PROMOTED_HEADINGS_A: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  59: [[20662, 20663], [20698, 20699], [20710, 20711]],
  64: [[21036, 21037], [21047, 21048], [21065, 21066], [21076, 21077], [21103, 21104], [21118, 21119]],
}

export interface RaagFineARow {
  header: number
  verse: { verseId: number; pageNo: number | null; verse: { unicode: string } }
}
export interface RaagFineACapture {
  baniDbId: number
  payload: { baniInfo: { unicode: string }; verses: RaagFineARow[] }
}

const childrenFor = (baniDbId: number, parent: BaniProfileSectionSpec): BaniProfileSectionSpec[] | undefined => {
  const pairs = SHABAD_UNITS_A[parent.startVerseId]
  if (pairs) return pairs.map(([startVerseId], index) => ({
    id: `raag-fine-a-${baniDbId}-${parent.startVerseId}-shabad-${index + 1}`,
    kind: 'shabad', number: index + 1, startVerseId, excerptVerseId: startVerseId,
  }))
  const starts = parent.startVerseId === 19506 ? BAVAN_STARTS_A
    : parent.startVerseId === 19674 ? THITI_STARTS_A
      : parent.startVerseId === 19748 ? WEEKDAY_STARTS_A : undefined
  if (!starts) return undefined
  return starts.map((startVerseId, index) => ({
    id: `raag-fine-a-${baniDbId}-${parent.startVerseId}-unit-${index + 1}`,
    kind: parent.startVerseId === 19674 && index === 0 ? 'opening-salok' : 'stanza',
    ...(parent.startVerseId === 19674 && index === 0 ? {} : {
      number: parent.startVerseId === 19674 ? index : index + 1,
    }),
    startVerseId, excerptVerseId: startVerseId,
  }))
}

/** Build-time only: every boundary is an explicit reviewed ID above. */
export const buildRaagFineProfilesA = (captures: readonly RaagFineACapture[]): BaniSectionProfile[] =>
  RAAG_FINE_A_IDS.map(baniDbId => {
    const baseline = CATALOG_BANI_SECTION_PROFILES.find(profile => profile.baniDbId === baniDbId)!
    const rows = captures.find(capture => capture.baniDbId === baniDbId)!.payload.verses
    const positions = new Map(rows.map((row, index) => [row.verse.verseId, index]))
    const sections: BaniProfileSectionSpec[] = baseline.sections.map(parent => {
      const children = childrenFor(baniDbId, parent)
      return { ...parent, kind: children ? parent.kind : 'shabad', ...(children ? { children } : {}) }
    })
    for (const [startVerseId, excerptVerseId] of PROMOTED_HEADINGS_A[baniDbId] ?? []) {
      const text = rows[positions.get(startVerseId)!].verse.verse.unicode
      sections.push({ id: `raag-fine-a-${baniDbId}-heading-${startVerseId}`, kind: 'shabad',
        label: { en: text, pa: text, hi: text }, startVerseId, excerptVerseId })
    }
    if (baniDbId === 57) {
      // The M5 hymn ends at 20394. The next hymn names Dhanna in its ending,
      // but has no printed author heading: keep its navigation label neutral.
      sections.push({ id: 'raag-fine-a-57-shabad-20395', kind: 'shabad',
        startVerseId: 20395, excerptVerseId: 20395 })
    }
    sections.sort((a, b) => positions.get(a.startVerseId)! - positions.get(b.startVerseId)!)
    return { ...baseline, sections }
  })
