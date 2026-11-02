import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../../api/banidb'
import type { ScriptureEntry } from '../../types'
import { fingerprintBaniReading, resolveBaniSectionProfile } from '../../utils/baniSectionProfiles'
import { CATALOG_BANI_SECTION_PROFILES } from './catalogProfiles'
import { SGGS_BANI_SECTION_PROFILES } from './sggsProfiles'
import { RAAG_FINE_PROFILES_A } from './raagFineProfilesA'
import { buildRaagFineProfilesA, PROMOTED_HEADINGS_A, SHABAD_UNITS_A,
  type RaagFineACapture } from '../../../scripts/qa/raag-fine-a-profile-generator'

const captures = (JSON.parse(gunzipSync(fs.readFileSync(
  'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz',
)).toString('utf8')) as { readings: RaagFineACapture[] }).readings
const counts: Record<number, readonly [number, number, number, number]> = {
  // Complete rows, roots, children, leaves; independently reviewed source inventory.
  55: [74, 5, 0, 5], 56: [1130, 78, 78, 150], 57: [584, 52, 2, 53], 58: [104, 8, 0, 8],
  59: [282, 9, 19, 23], 60: [169, 7, 13, 17], 64: [133, 10, 0, 10], 65: [150, 16, 0, 16],
}
const readings = new Map<number, ScriptureEntry[]>()
const profileFor = (id: number) => RAAG_FINE_PROFILES_A.find(profile => profile.baniDbId === id)!
const rowsFor = (id: number) => captures.find(capture => capture.baniDbId === id)!.payload.verses

beforeAll(async () => {
  for (const id of Object.keys(counts).map(Number)) {
    const payload = captures.find(capture => capture.baniDbId === id)!.payload
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    try { readings.set(id, (await fetchBani(id)).entries) } finally { request.mockRestore() }
  }
})

describe('reviewed finer navigation in eight raag collections, family A', () => {
  it('reproduces only the eight assigned static profiles without writing files', () => {
    expect(RAAG_FINE_PROFILES_A.map(profile => profile.baniDbId)).toEqual(Object.keys(counts).map(Number))
    expect(buildRaagFineProfilesA(captures)).toEqual(RAAG_FINE_PROFILES_A)
    expect(RAAG_FINE_PROFILES_A.reduce((n, profile) => n + profile.sections.length, 0)).toBe(185)
    expect(RAAG_FINE_PROFILES_A.flatMap(profile => profile.sections).flatMap(section => section.children ?? [])).toHaveLength(112)
  })

  it.each(Object.keys(counts).map(Number))('resolves every reviewed root and child for bani %i without altering any source row', id => {
    const entries = readings.get(id)!
    const before = JSON.stringify(entries)
    const lines = entries.flatMap(entry => entry.lines ?? [])
    const profile = profileFor(id)
    const baseline = CATALOG_BANI_SECTION_PROFILES.find(candidate => candidate.baniDbId === id)!
    expect(lines).toHaveLength(counts[id][0])
    expect(lines.map(line => [line.verseId, line.gurmukhi, line.originalAng, line.headerLevel ?? 0])).toEqual(
      rowsFor(id).map(row => [row.verse.verseId, row.verse.verse.unicode, row.verse.pageNo, row.header]),
    )
    expect(profile.fingerprint).toBe(baseline.fingerprint)
    expect(fingerprintBaniReading(entries)).toBe(profile.fingerprint)
    for (const locale of ['en', 'pa', 'hi'] as const) {
      const resolved = resolveBaniSectionProfile(entries, profile, locale)
      expect(resolved).toHaveLength(counts[id][1])
      expect(resolved.flatMap(section => section.children ?? [])).toHaveLength(counts[id][2])
      expect(resolved.flatMap(section => section.children ?? [section])).toHaveLength(counts[id][3])
      for (const [i, section] of resolved.entries()) {
        const targets = [section, ...(section.children ?? [])]
        const specs = [profile.sections[i], ...(profile.sections[i].children ?? [])]
        targets.forEach((target, index) => {
          expect(entries[target.entryIndex].lines![target.lineIndex].verseId).toBe(specs[index].startVerseId)
          expect(target.excerpt).toBe(lines.find(line => line.verseId === (specs[index].excerptVerseId ?? specs[index].startVerseId))!.gurmukhi)
          expect(target.source).toBe('G')
          expect(target.label.trim()).not.toBe('')
        })
      }
    }
    for (const parent of baseline.sections) {
      const retained = profile.sections.find(section => section.id === parent.id)!
      expect(retained).toMatchObject({ startVerseId: parent.startVerseId, excerptVerseId: parent.excerptVerseId, label: parent.label })
    }
    expect(JSON.stringify(entries)).toBe(before)
  })

  it('preserves complete Bavan, Thiti and weekday Vaar body streams with the same stanza openings as their standalone readings', () => {
    const gauri = rowsFor(56)
    for (const [sourceId, parentId, endId, count] of [[39, 19506, 19674, 45], [47, 19674, 19748, 17], [50, 19748, 19782, 8]]) {
      const start = gauri.findIndex(row => row.verse.verseId === parentId)
      const end = gauri.findIndex(row => row.verse.verseId === endId)
      const embedded = gauri.slice(start, end)
      expect(embedded.filter(row => row.header === 0).map(row => row.verse.verse.unicode)).toEqual(
        rowsFor(sourceId).filter(row => row.header === 0).map(row => row.verse.verse.unicode),
      )
      const standalone = [...SGGS_BANI_SECTION_PROFILES, ...CATALOG_BANI_SECTION_PROFILES]
        .find(profile => profile.baniDbId === sourceId)!
      const children = profileFor(56).sections.find(section => section.startVerseId === parentId)!.children!
      expect(children).toHaveLength(count)
      expect(children.map(child => child.kind)).toEqual(standalone.sections.map(section => section.kind))
      expect(children.map(child => child.number)).toEqual(standalone.sections.map(section => section.number))
      expect(children.map(child => gauri.find(row => row.verse.verseId === child.excerptVerseId)!.verse.verse.unicode)).toEqual(
        standalone.sections.map(section => rowsFor(sourceId).find(row => row.verse.verseId === (section.excerptVerseId ?? section.startVerseId))!.verse.verse.unicode),
      )
    }
    const children = profileFor(56).sections.find(section => section.startVerseId === 19748)!.children!
    expect(children[0].startVerseId).toBe(19751)
    expect(gauri.find(row => row.verse.verseId === 19749)!.verse.verse.unicode).toBe('ਬਾਰ ਬਾਰ ਹਰਿ ਕੇ ਗੁਨ ਗਾਵਉ ॥')
    expect(children.some(child => child.startVerseId === 19749)).toBe(false)
  })

  it('recognizes rahau-first and unheaded hymns without using paragraph boundaries', () => {
    const children = profileFor(56).sections.find(section => section.startVerseId === 19465)!.children!
    expect(children.map(child => child.startVerseId)).toEqual([19466, 19481])
    expect(rowsFor(56).find(row => row.verse.verseId === 19481)!.verse.verse.unicode).toContain('॥੧॥ ਰਹਾਉ ॥')
    expect(profileFor(56).sections.find(section => section.startVerseId === 19129)!.children!.map(child => child.startVerseId))
      .toEqual([19130, 19142, 19150, 19168])
    expect(profileFor(56).sections.find(section => section.startVerseId === 19791)!.children!.map(child => child.startVerseId))
      .toEqual([19793, 19801])
    expect(profileFor(56).sections.find(section => section.startVerseId === 19835)!.children).toBeUndefined()
  })

  it('promotes all nine verified printed headings even though the provider marks them as body text', () => {
    let promoted = 0
    for (const [id, pairs] of Object.entries(PROMOTED_HEADINGS_A)) for (const [heading, body] of pairs) {
      const source = rowsFor(Number(id)).find(row => row.verse.verseId === heading)!
      const section = profileFor(Number(id)).sections.find(section => section.startVerseId === heading)!
      expect(source.header).toBe(0)
      expect(section).toMatchObject({ kind: 'shabad', excerptVerseId: body,
        label: { en: source.verse.verse.unicode, pa: source.verse.verse.unicode, hi: source.verse.verse.unicode } })
      expect(section.children).toBeUndefined()
      promoted += 1
    }
    expect(promoted).toBe(9)
  })

  it('does not subordinate the following Dhanna hymn to the preceding M5 heading', () => {
    const resolved = resolveBaniSectionProfile(readings.get(57)!, profileFor(57))
    const index = resolved.findIndex(section => section.verseId === 20384)
    expect(resolved[index]).toMatchObject({ label: 'ਮਹਲਾ ੫ ॥', kind: 'shabad' })
    expect(resolved[index].children).toBeUndefined()
    expect(resolved[index + 1]).toMatchObject({ verseId: 20395, label: 'Shabad', kind: 'shabad' })
    expect(rowsFor(57).find(row => row.verse.verseId === 20402)!.verse.verse.unicode).toContain('ਕਹੈ ਧੰਨਾ')
  })

  it('retains Bhikhan’s nonmonotonic local IDs and checks all explicit hymn endings within their own parent', () => {
    const bhikhan = profileFor(59).sections.find(section => section.startVerseId === 20795)!
    expect(bhikhan.children!.map(child => child.startVerseId)).toEqual([20797, 26338])
    for (const profile of RAAG_FINE_PROFILES_A) {
      const rows = rowsFor(profile.baniDbId)
      const position = (id: number) => rows.findIndex(row => row.verse.verseId === id)
      profile.sections.forEach((parent, index) => {
        const end = index + 1 < profile.sections.length ? position(profile.sections[index + 1].startVerseId) : rows.length
        for (const [startId, endId] of SHABAD_UNITS_A[parent.startVerseId] ?? []) {
          expect(position(startId)).toBeGreaterThan(position(parent.startVerseId))
          expect(position(endId)).toBeLessThan(end)
          expect(position(endId)).toBeGreaterThanOrEqual(position(startId))
          expect(rows[position(endId)].verse.verse.unicode).toMatch(/(?:॥[੦-੯]+){2,}॥$/u)
        }
      })
    }
  })

  it('rejects the complete hierarchy if any source body text changes', () => {
    const changed = JSON.parse(JSON.stringify(readings.get(56))) as ScriptureEntry[]
    changed.flatMap(entry => entry.lines ?? []).find(line => line.verseId === 19481)!.gurmukhi += ' ਅ'
    expect(resolveBaniSectionProfile(changed, profileFor(56))).toEqual([])
  })
})
