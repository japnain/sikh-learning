import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../api/banidb'
import type { ScriptureEntry } from '../types'
import type { BaniSectionProfile } from '../content/baniSections/profileTypes'
import { CATALOG_BANI_SECTION_PROFILES } from '../content/baniSections/catalogProfiles'
import { buildCatalogBaniProfile, CATALOG_PROFILE_IDS } from '../../scripts/qa/catalog-bani-profile-generator'
import { fingerprintBaniReading, resolveBaniSectionProfile } from './baniSectionProfiles'

interface CapturedRow {
  header: number
  verse: { verseId: number; pageNo?: number | null; verse: { unicode: string } }
}
interface CapturedPayload {
  baniInfo: { unicode: string }
  verses: CapturedRow[]
}
const snapshot = JSON.parse(gunzipSync(fs.readFileSync(
  'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz',
)).toString('utf8')) as { readings: { baniDbId: number; payload: CapturedPayload }[] }
const captures = new Map(snapshot.readings.map(reading => [reading.baniDbId, reading.payload]))
const readings = new Map<number, ScriptureEntry[]>()
const generated: BaniSectionProfile[] = []
const updating = process.env.UPDATE_BANI_CATALOG_PROFILES === '1'

// Independent reviewed unit counts. Heading groups are intentionally NOT hymn
// counts: e.g. Sorath 59 has six navigation groups spanning many shabads.
const expectedCounts: Record<number, number> = {
  1:1,3:7,14:1,15:1,16:1,17:23,18:11,32:24,36:34,38:1,40:4,41:10,42:3,
  43:35,44:18,45:8,46:6,47:17,48:20,49:17,50:8,51:10,52:6,55:5,56:78,
  57:51,58:8,59:6,60:7,61:1,62:3,63:3,64:4,65:16,66:19,67:7,68:3,
  69:8,70:2,71:8,72:6,73:3,74:5,75:1,76:9,79:9,80:11,81:10,82:10,
  83:22,84:60,85:21,
}

beforeAll(async () => {
  for (const id of CATALOG_PROFILE_IDS) {
    const payload = captures.get(id)!
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    try {
      const reading = await fetchBani(id)
      readings.set(id, reading.entries)
      generated.push(buildCatalogBaniProfile(id, reading.entries, payload.baniInfo.unicode))
    } finally {
      fetchMock.mockRestore()
    }
  }
  if (updating) {
    const body = generated.map(profile => `  ${JSON.stringify(profile)},`).join('\n')
    fs.writeFileSync('src/content/baniSections/catalogProfiles.ts', [
      "import type { BaniSectionProfile } from './profileTypes'", '',
      '// Generated from reviewed 2026-11-01 captures through production fetchBani.',
      '// Regenerate: UPDATE_BANI_CATALOG_PROFILES=1 npx vitest run src/utils/catalogBaniProfiles.live.test.ts --configLoader runner',
      '// Source evidence: docs/qa/bani-catalog-structure-research-20261101.md',
      '// Runtime matching requires the complete ordered reading fingerprint.',
      'export const CATALOG_BANI_SECTION_PROFILES: readonly BaniSectionProfile[] = [', body, ']', '',
    ].join('\n'))
    fs.writeFileSync('scripts/qa/fixtures/bani-sections-catalog-coverage-20261101.json', JSON.stringify({
      schemaVersion: 1,
      family: 'catalog',
      evidence: 'docs/qa/bani-catalog-structure-research-20261101.md',
      source: 'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz',
      readings: generated.map(profile => ({
        baniDbId: profile.baniDbId,
        fingerprint: profile.fingerprint,
        normalizedRowCount: readings.get(profile.baniDbId)!.reduce((count, entry) => count + (entry.lines?.length ?? 0), 0),
        expectedSectionCount: expectedCounts[profile.baniDbId],
        reviewStatus: profile.sections.length === 1 ? 'reviewed-indivisible'
          : profile.sections.some(section => section.kind === 'provider-heading') ? 'reviewed-heading-groups' : 'reviewed-numbered-units',
        startVerseIds: profile.sections.map(section => section.startVerseId),
        excerptVerseIds: profile.sections.map(section => section.excerptVerseId ?? section.startVerseId),
        kinds: [...new Set(profile.sections.map(section => section.kind))],
      })),
    }, null, 2) + '\n')
  }
})

describe('reviewed catalog profiles through production fetchBani', () => {
  it('reproduces all 52 shipped profiles from the durable captured response', () => {
    expect(generated.map(profile => profile.baniDbId)).toEqual(CATALOG_PROFILE_IDS)
    expect(Object.keys(expectedCounts).map(Number)).toEqual([...CATALOG_PROFILE_IDS])
    if (!updating) expect(generated).toEqual(CATALOG_BANI_SECTION_PROFILES)
  })

  it.each(CATALOG_PROFILE_IDS)('preserves the complete reading and resolves reviewed boundaries for %i', id => {
    const entries = readings.get(id)!
    const before = JSON.stringify(entries)
    const lines = entries.flatMap(entry => entry.lines ?? [])
    const raw = captures.get(id)!.verses
    expect(lines.map(line => [line.verseId, line.gurmukhi, line.originalAng ?? null, line.headerLevel ?? null])).toEqual(
      raw.map(row => [row.verse.verseId, row.verse.verse.unicode, row.verse.pageNo ?? null, row.header > 0 ? row.header : null]),
    )
    const profile = generated.find(candidate => candidate.baniDbId === id)!
    const sections = resolveBaniSectionProfile(entries, profile)
    expect(sections).toHaveLength(expectedCounts[id])
    expect(profile.fingerprint).toBe(fingerprintBaniReading(entries))
    expect(sections[0].verseId).toBe(lines[0].verseId)
    for (const [index, section] of sections.entries()) {
      expect(entries[section.entryIndex].lines![section.lineIndex].verseId).toBe(profile.sections[index].startVerseId)
      expect(section.excerpt).toBe(lines.find(line => line.verseId === profile.sections[index].excerptVerseId)!.gurmukhi)
      expect(section.label.trim()).not.toBe('')
    }
    expect(resolveBaniSectionProfile(entries, profile, 'pa')).toHaveLength(sections.length)
    expect(resolveBaniSectionProfile(entries, profile, 'hi')).toHaveLength(sections.length)
    expect(JSON.stringify(entries)).toBe(before)
  })

  it('preserves unsorted opening IDs and does not label Sorathe as Savaiye', () => {
    const fourth = generated.find(profile => profile.baniDbId === 84)!
    expect(fourth.sections[0]).toMatchObject({ startVerseId:24781, excerptVerseId:24460 })
    expect(fourth.sections[1].startVerseId).toBe(24472)
    const fifth = generated.find(profile => profile.baniDbId === 85)!
    expect(fifth.sections[0]).toMatchObject({ startVerseId:24887, excerptVerseId:24784 })
    expect(fifth.sections.slice(9,12).map(section => [section.kind, section.number, section.startVerseId])).toEqual([
      ['soratha',1,24834], ['soratha',2,24837], ['soratha',3,24839],
    ])
  })

  it('keeps source headings, paired units and repeated rahao in their reviewed groups', () => {
    const get = (id: number) => generated.find(profile => profile.baniDbId === id)!
    expect(get(42).sections.map(section => section.excerptVerseId)).toEqual([9501,9509,9517])
    expect([0,6,12,18].map(index => get(32).sections[index].label?.en)).toEqual([
      'Bilaval · Ashtpadi 1', 'Nat · Ashtpadi 1', 'Kanara · Ashtpadi 1', 'Kalyan · Ashtpadi 1',
    ])
    expect(get(45).sections.map(section => section.excerptVerseId)).toEqual([9649,9661,9673,9685,9697,9709,9721,9733])
    expect(get(49).sections.at(-1)).toMatchObject({ startVerseId:18198, excerptVerseId:18202, kind:'pauri', number:17 })
    expect(get(52).sections.at(-1)?.excerptVerseId).toBe(18345)
    expect(get(52).sections.some(section => section.startVerseId === 18353)).toBe(false)
    expect([50,51].flatMap(id => get(id).sections).some(section => section.kind === 'pauri')).toBe(false)
    expect(get(64).sections.slice(-2).map(section => section.startVerseId)).toEqual([21129,21148])
    expect(get(55).sections.some(section => section.startVerseId === 18702)).toBe(false)
    expect(get(56).sections.some(section => section.startVerseId === 19099)).toBe(false)
  })

  it('fails closed after body changes, missing rows or a reading-order change', () => {
    for (const id of [1,32,56,84]) {
      const original = readings.get(id)!
      const profile = generated.find(candidate => candidate.baniDbId === id)!
      const changed = structuredClone(original)
      changed[0].lines![0].gurmukhi += ' changed'
      expect(resolveBaniSectionProfile(changed, profile)).toEqual([])
      const missing = structuredClone(original)
      missing.at(-1)!.lines!.pop()
      expect(resolveBaniSectionProfile(missing, profile)).toEqual([])
      const reordered = structuredClone(original)
      reordered.find(entry => entry.lines!.length > 1)!.lines!.reverse()
      expect(resolveBaniSectionProfile(reordered, profile)).toEqual([])
    }
  })

  it('does not manufacture scripture attribution for mixed selections', () => {
    for (const id of [1,3,36]) {
      const sections = resolveBaniSectionProfile(readings.get(id)!, generated.find(profile => profile.baniDbId === id)!)
      expect(sections.every(section => section.source === null)).toBe(true)
    }
  })
})
