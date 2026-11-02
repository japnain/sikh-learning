import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchBani, type BaniFetchResult } from '../../api/banidb'
import { fingerprintBaniReading, flattenBaniSections, getCurrentBaniSectionPath, resolveBaniSectionProfile } from '../../utils/baniSectionProfiles'
import { CATALOG_BANI_SECTION_PROFILES } from './catalogProfiles'
import { RAAG_FINE_SECTION_PROFILES_B } from './raagFineProfilesB'
import type { BaniSectionProfile } from './profileTypes'

interface CapturedRow {
  header: number
  verse: { verseId: number; pageNo: number | null; verse: { unicode: string } }
}
interface ReviewedUnit {
  startVerseId: number
  endVerseId: number
  kind: string
  opening: string
  closing: string
}
interface ReviewedReading {
  baniDbId: number
  fingerprint: string
  groups: { startVerseId: number; excerptVerseId: number; units: ReviewedUnit[] }[]
  nonBodyVerseIds: number[]
}

const manifest = JSON.parse(readFileSync('scripts/qa/fixtures/raag-fine-boundaries-b-20261102.json', 'utf8')) as {
  readings: ReviewedReading[]
}
const corpus = JSON.parse(gunzipSync(readFileSync('scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz')).toString('utf8')) as {
  readings: { baniDbId: number; payload: { verses: CapturedRow[] } }[]
}
const profiles: readonly BaniSectionProfile[] = RAAG_FINE_SECTION_PROFILES_B
const expectedCounts: Record<number, [roots: number, children: number, units: number]> = {
  66: [20, 0, 20], 67: [8, 29, 32], 69: [9, 11, 17], 70: [2, 6, 7],
  71: [9, 29, 33], 72: [6, 9, 13], 73: [5, 7, 9], 74: [5, 0, 5], 76: [9, 0, 9],
}
const normalized = new Map<number, BaniFetchResult>()

beforeAll(async () => {
  for (const profile of profiles) {
    const capture = corpus.readings.find(reading => reading.baniDbId === profile.baniDbId)!
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(capture.payload), { status: 200 }))
    try {
      normalized.set(profile.baniDbId, await fetchBani(profile.baniDbId))
    } finally {
      fetchMock.mockRestore()
    }
  }
})

describe('reviewed individual units in the nine B raag collections', () => {
  it('covers precisely the assigned collections with independently reviewed totals', () => {
    expect(profiles.map(profile => profile.baniDbId)).toEqual([66, 67, 69, 70, 71, 72, 73, 74, 76])
    expect(manifest.readings.map(reading => reading.baniDbId)).toEqual(profiles.map(profile => profile.baniDbId))
    expect(manifest.readings.flatMap(reading => reading.groups.flatMap(group => group.units))).toHaveLength(145)
  })

  it.each(profiles)('$baniDbId resolves every original body opening and ending without altering the reading', profile => {
    const reading = normalized.get(profile.baniDbId)!
    const reviewed = manifest.readings.find(item => item.baniDbId === profile.baniDbId)!
    const capture = corpus.readings.find(item => item.baniDbId === profile.baniDbId)!
    const lines = reading.entries.flatMap(entry => entry.lines ?? [])
    const positions = new Map(lines.map((line, index) => [line.verseId, index]))
    const coordinates = new Map(reading.entries.flatMap((entry, entryIndex) => (entry.lines ?? [])
      .map((line, lineIndex) => [line.verseId, { entryIndex, lineIndex }] as const)))
    const before = JSON.stringify(reading.entries)
    const baseline = CATALOG_BANI_SECTION_PROFILES.find(item => item.baniDbId === profile.baniDbId)!
    expect(profile.fingerprint).toBe(baseline.fingerprint)
    expect(fingerprintBaniReading(reading.entries)).toBe(profile.fingerprint)
    expect(profile.fingerprint).toBe(reviewed.fingerprint)
    expect(lines.map(line => [line.verseId, line.gurmukhi, line.originalAng, Boolean(line.isHeader)])).toEqual(
      capture.payload.verses.map(row => [row.verse.verseId, row.verse.verse.unicode.trim(), row.verse.pageNo, row.header > 0]),
    )

    const sections = resolveBaniSectionProfile(reading.entries, profile)
    const flat = flattenBaniSections(sections)
    const [roots, children, units] = expectedCounts[profile.baniDbId]
    expect(sections).toHaveLength(roots)
    expect(flat).toHaveLength(roots + children)
    expect(flat.filter(section => !section.children?.length)).toHaveLength(units)
    expect(new Set(flat.map(section => section.id)).size).toBe(flat.length)
    for (const old of baseline.sections) {
      const preserved = profile.sections.find(section => section.id === old.id)!
      expect(preserved).toMatchObject({ label: old.label, startVerseId: old.startVerseId, excerptVerseId: old.excerptVerseId })
    }

    const covered = new Set<number>()
    for (const [groupIndex, group] of reviewed.groups.entries()) {
      const parent = sections[groupIndex]
      expect(parent.verseId).toBe(group.startVerseId)
      const leaves = parent.children?.length ? parent.children : [parent]
      expect(leaves).toHaveLength(group.units.length)
      // One-shabad headings remain directly selectable, with no duplicate child.
      expect(Boolean(parent.children?.length)).toBe(group.units.length > 1)
      for (const [unitIndex, unit] of group.units.entries()) {
        const leaf = leaves[unitIndex]
        expect(leaf.kind).toBe(unit.kind)
        expect(leaf.excerpt).toBe(unit.opening)
        const start = positions.get(unit.startVerseId)!
        const end = positions.get(unit.endVerseId)!
        expect(lines[start].gurmukhi).toBe(unit.opening)
        expect(lines[end].gurmukhi).toBe(unit.closing)
        expect(start).toBeLessThanOrEqual(end)
        for (let index = start; index <= end; index += 1) {
          expect(covered.has(index)).toBe(false)
          expect(lines[index].isHeader).not.toBe(true)
          covered.add(index)
        }
        for (const verseId of [unit.startVerseId, unit.endVerseId]) {
          expect(getCurrentBaniSectionPath(sections, coordinates.get(verseId)!).at(-1)?.id).toBe(leaf.id)
        }
      }
    }
    expect(lines.filter((_, index) => !covered.has(index)).map(line => line.verseId)).toEqual(reviewed.nonBodyVerseIds)
    expect(JSON.stringify(reading.entries)).toBe(before)
    for (const locale of ['pa', 'hi'] as const) {
      const localized = flattenBaniSections(resolveBaniSectionProfile(reading.entries, profile, locale))
      expect(localized.map(section => section.verseId)).toEqual(flat.map(section => section.verseId))
      expect(localized.every(section => section.label.trim().length > 0)).toBe(true)
    }
  })

  it('preserves six Sadd stanzas, eight Vaar pauris, two Maru saloks and two Bhairao ashtpadis', () => {
    const groups = (id: number) => manifest.readings.find(reading => reading.baniDbId === id)!.groups
    expect(groups(67)[0].units.map(unit => [unit.startVerseId, unit.endVerseId, unit.kind])).toEqual([
      [21625, 21630, 'stanza'], [21631, 21636, 'stanza'], [21637, 21642, 'stanza'],
      [21643, 21648, 'stanza'], [21649, 21654, 'stanza'], [21655, 21660, 'stanza'],
    ])
    expect(groups(67)[1].units.map(unit => [unit.endVerseId, unit.kind])).toEqual(
      [21670, 21683, 21695, 21704, 21713, 21732, 21741, 21750].map(id => [id, 'pauri']),
    )
    expect(groups(69).find(group => group.startVerseId === 22103)!.units.map(unit => [unit.startVerseId, unit.endVerseId, unit.kind])).toEqual([
      [22104, 22105, 'salok'], [22106, 22107, 'salok'],
    ])
    expect(groups(71).find(group => group.startVerseId === 22475)!.units.map(unit => [unit.startVerseId, unit.endVerseId, unit.kind])).toEqual([
      [22477, 22510, 'ashtpadi'], [22511, 22543, 'ashtpadi'],
    ])
    // The 28-stanza Namdev hymn is a single shabad, as is Beni's nine-stanza hymn.
    expect(groups(71).flatMap(group => group.units).filter(unit => unit.startVerseId === 22653)).toEqual([
      expect.objectContaining({ endVerseId: 22710, kind: 'shabad' }),
    ])
    expect(groups(67).flatMap(group => group.units).filter(unit => unit.startVerseId === 21953)).toEqual([
      expect.objectContaining({ endVerseId: 21991, kind: 'shabad' }),
    ])
  })

  it('handles unflagged printed headings, mixed-author boundaries and the actual one-line Sarang unit', () => {
    for (const [id, heading, body] of [[66, 21334, 21336], [67, 21930, 21931], [69, 22139, 22140], [73, 23091, 23093], [73, 23099, 23101]]) {
      const profile = profiles.find(item => item.baniDbId === id)!
      expect(profile.sections.find(section => section.startVerseId === heading)).toMatchObject({ kind: 'shabad', excerptVerseId: body })
      const source = corpus.readings.find(item => item.baniDbId === id)!.payload.verses.find(row => row.verse.verseId === heading)!
      expect(source.header).toBe(0)
    }
    const bhairao = profiles.find(profile => profile.baniDbId === 71)!
    expect(bhairao.sections.find(section => section.startVerseId === 22370)?.children).toBeUndefined()
    expect(bhairao.sections.find(section => section.startVerseId === 22389)).toMatchObject({ kind: 'section', label: { en: 'Following shabads' } })
    const sarang = manifest.readings.find(reading => reading.baniDbId === 73)!
    expect(sarang.groups.flatMap(group => group.units).find(unit => unit.startVerseId === 23090)).toMatchObject({
      endVerseId: 23090, kind: 'shabad', opening: 'ਛਾਡਿ ਮਨ ਹਰਿ ਬਿਮੁਖਨ ਕੋ ਸੰਗੁ ॥',
    })
    const gond = manifest.readings.find(reading => reading.baniDbId === 66)!
    expect(gond.groups.at(-1)!.units[0].closing).toContain('॥੪॥੨॥੧੧॥੭॥੨॥੪੯॥ ਜੋੜੁ ॥')
  })

  it.each(profiles)('$baniDbId fails closed if any original body row changes or disappears', profile => {
    const changed = structuredClone(normalized.get(profile.baniDbId)!.entries)
    changed.at(-1)!.lines!.at(-1)!.gurmukhi += ' '
    expect(resolveBaniSectionProfile(changed, profile)).toEqual([])
    const truncated = structuredClone(normalized.get(profile.baniDbId)!.entries)
    truncated.at(-1)!.lines!.pop()
    expect(resolveBaniSectionProfile(truncated, profile)).toEqual([])
  })
})
