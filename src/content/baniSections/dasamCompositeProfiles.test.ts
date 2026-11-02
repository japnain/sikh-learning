import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../../api/banidb'
import type { ScriptureEntry } from '../../types'
import { fingerprintBaniReading, resolveBaniSectionProfiles } from '../../utils/baniSectionProfiles'
import type { BaniSectionProfile } from './profileTypes'
import { DASAM_COMPOSITE_SECTION_PROFILES } from './dasamCompositeProfiles'
import { DASAM_COMPOSITE_CAPTURE_CASES } from '../../../scripts/qa/bani-sections/dasamCompositeAnchors'
import { generateDasamCompositeProfile, renderDasamCompositeProfiles } from '../../../scripts/qa/bani-sections/generateDasamCompositeProfiles'

const archive = JSON.parse(gunzipSync(readFileSync('scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz')).toString('utf8')) as {
  readings: { baniDbId: number; payload: unknown }[]
}
const update = process.env.UPDATE_DASAM_COMPOSITE_PROFILES === '1'
const generated: BaniSectionProfile[] = []
const captures: { baniDbId: number; length: string | null; entries: ScriptureEntry[]; rows: number; profile: BaniSectionProfile }[] = []
let profiles: readonly BaniSectionProfile[] = DASAM_COMPOSITE_SECTION_PROFILES

beforeAll(async () => {
  for (const captured of DASAM_COMPOSITE_CAPTURE_CASES) {
    const payload = archive.readings.find(row => row.baniDbId === captured.baniDbId)!.payload
    const length = 'length' in captured ? captured.length : null
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    try {
      const reading = await fetchBani(captured.baniDbId, length)
      expect(transport).toHaveBeenCalledTimes(1)
      expect(reading.resolvedLength ?? null).toBe(length)
      const rows = reading.entries.flatMap(entry => entry.lines ?? []).length
      expect(rows).toBe(captured.rows)
      const profile = generateDasamCompositeProfile(captured.baniDbId, reading.entries)
      generated.push(profile)
      captures.push({ baniDbId: captured.baniDbId, length, entries: reading.entries, rows, profile })
    } finally {
      transport.mockRestore()
    }
  }
  if (update) {
    writeFileSync('src/content/baniSections/dasamCompositeProfiles.ts', renderDasamCompositeProfiles(generated))
    writeFileSync('scripts/qa/fixtures/bani-sections-dasam-composite-coverage-20261101.json', JSON.stringify({
      schemaVersion: 1,
      generatedFrom: 'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz',
      activation: 'Data only; registry activation remains a separate root-owned visual gate.',
      profiles: captures.map(capture => ({
        baniDbId: capture.baniDbId,
        fingerprint: capture.profile.fingerprint,
        normalizedRowCount: capture.rows,
        sectionCount: capture.profile.sections.length,
        resolvedLength: capture.length,
        evidence: ['docs/qa/bani-variant-structure-research-20261031.md', 'docs/qa/bani-other-structure-research-20261101.md'],
        sourceUrl: `https://api.banidb.com/v2/banis/${capture.baniDbId}`,
        indivisible: capture.profile.sections.length === 1,
      })),
    }, null, 2) + '\n')
    profiles = generated
  }
})

function captured(id: number, length: string | null = null) {
  return captures.find(row => row.baniDbId === id && row.length === length)!
}
function sections(id: number, length: string | null = null, locale: 'en' | 'pa' | 'hi' = 'en') {
  return resolveBaniSectionProfiles(captured(id, length).entries, profiles.filter(profile => profile.baniDbId === id), locale)
}

describe('reviewed Dasam and composite profiles through production normalization', () => {
  it('matches all 28 selected readings, including all 14 distinct adjustable versions', () => {
    expect(generated).toHaveLength(28)
    expect(profiles).toEqual(generated)
    expect(captures.filter(row => row.length !== null)).toHaveLength(14)
    expect(new Set(profiles.map(profile => `${profile.baniDbId}:${profile.fingerprint}`)).size).toBe(28)
    for (const capture of captures) {
      const before = JSON.stringify(capture.entries)
      const resolved = sections(capture.baniDbId, capture.length)
      expect(resolved).toHaveLength(capture.profile.sections.length)
      for (const [index, section] of resolved.entries()) {
        const target = capture.entries[section.entryIndex].lines![section.lineIndex]
        expect(target.verseId).toBe(capture.profile.sections[index].startVerseId)
        expect(section.excerpt).toBe(capture.entries.flatMap(entry => entry.lines ?? []).find(line => line.verseId === capture.profile.sections[index].excerptVerseId)!.gurmukhi)
      }
      expect(JSON.stringify(capture.entries)).toBe(before)
      expect(sections(capture.baniDbId, capture.length, 'pa')).toHaveLength(resolved.length)
      expect(sections(capture.baniDbId, capture.length, 'hi')).toHaveLength(resolved.length)
    }
  })

  it('keeps 22 Jaap metre occurrences and the Tera Jor context', () => {
    const result = sections(4)
    expect(result).toHaveLength(22)
    expect(result.map(section => section.verseId)).toEqual([508, 515, 624, 685, 742, 752, 792, 813, 846, 875, 884, 897, 914, 1035, 1072, 1085, 1106, 1151, 1192, 1249, 1266, 1299])
    expect(result[4]).toMatchObject({ label: 'Chachri · 62–63', excerpt: 'ਜਲੇ ਹੈਂ ॥' })
    expect(result[21].label).toBe('Bhujang Prayaat · 197–199')
  })

  it('preserves numbered forms and excludes chapter colophons from stanza counts', () => {
    expect(sections(6).map(section => section.number)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1))
    expect(sections(7)).toHaveLength(10)
    expect(sections(5)).toHaveLength(10)
    expect(sections(13)).toHaveLength(55)
    expect(sections(13)[5]).toMatchObject({ kind: 'dohra', label: 'Dohra 6', verseId: 2087 })
    expect(sections(13).filter(section => section.kind === 'pauri')).toHaveLength(54)
    expect(sections(19).map(section => section.number)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1))
    expect(sections(12).map(section => section.verseId)).toEqual([2021, 2042])
    expect(sections(28).map(section => section.number)).toEqual(Array.from({ length: 13 }, (_, i) => 867 + i))
    expect(sections(28).some(section => section.kind === 'month')).toBe(false)
  })

  it('resolves exact Chaupai versions without duplicating the colophon number 405', () => {
    expect(sections(9, 'short').map(section => section.number)).toEqual(Array.from({ length: 25 }, (_, i) => 377 + i))
    expect(sections(9, 'medium').map(section => section.number)).toEqual([...Array.from({ length: 29 }, (_, i) => 377 + i), 863, 864])
    expect(sections(9, 'long').map(section => section.number)).toEqual([...Array.from({ length: 40 }, (_, i) => 366 + i), 863, 864])
    expect(sections(9, 'long').filter(section => section.number === 405)).toHaveLength(1)
    expect(sections(9, 'long').some(section => section.verseId === 1745)).toBe(false)
  })

  it('places numbered units around their original source conclusions', () => {
    const digit = (text: string) => text.replace(/[੦-੯]/gu, value => String(value.charCodeAt(0) - 0x0a66))
    for (const [id, length] of [[9, 'short'], [9, 'medium'], [9, 'long'], [13, null], [19, null], [28, null]] as const) {
      const capture = captured(id, length)
      const lines = capture.entries.flatMap(entry => entry.lines ?? [])
      const resolved = sections(id, length)
      for (const [index, section] of resolved.entries()) {
        const start = lines.findIndex(line => line.verseId === section.verseId)
        const next = resolved[index + 1]
        const end = next ? lines.findIndex(line => line.verseId === next.verseId) : lines.length
        // Independently identified source colophons repeat a chapter/stanza
        // number but are not poetic units. They remain in the loaded text.
        const body = lines.slice(start, end).filter(line => !line.isHeader && ![1745, 2627].includes(line.verseId))
        const endings = body.flatMap(line => {
          const match = digit(line.gurmukhi).match(/॥(\d+)॥\s*$/u)
          return match ? [Number(match[1])] : []
        })
        expect(endings, `${id}/${length}/${section.verseId}`).toEqual([section.number])
      }
    }
  })

  it('keeps composite excerpts and version-specific identities honest', () => {
    expect(sections(21, 'short')).toHaveLength(15)
    expect(sections(21, 'medium')).toHaveLength(19)
    expect(sections(21, 'short').find(section => section.verseId === 3214)?.label).toBe('Anand · Pauris 1–5, 40')
    expect(sections(21, 'long').some(section => section.verseId === 2635)).toBe(true)
    expect(sections(21, 'long').some(section => section.verseId === 3156)).toBe(true)
    expect(sections(21, 'extralong').some(section => section.verseId === 3156)).toBe(false)
    expect(sections(22, 'short').some(section => section.verseId === 3404)).toBe(true)
    expect(sections(22, 'medium').find(section => section.verseId === 3546)?.label).toBe('Jaap excerpt · 199')
    expect(sections(22, 'long').some(section => section.verseId === 3457)).toBe(false)
    expect(sections(22, 'long').some(section => section.verseId === 3381)).toBe(true)
    expect(sections(23, 'short').map(section => section.verseId)).toEqual([3594, 3606, 3614, 3627, 3638])
    expect(sections(23, 'extralong').filter(section => section.label.startsWith('Jaap excerpt')).map(section => section.verseId)).toEqual([3660, 3669, 3686, 3695])
    for (const id of [5, 21, 22, 23, 24, 28]) expect(sections(id, [21, 22, 23].includes(id) ? 'short' : null).every(section => section.source === null)).toBe(true)
  })

  it('handles unflagged metre headings and meaningful indivisible readings', () => {
    expect(sections(29)).toHaveLength(18)
    expect(sections(29).find(section => section.verseId === 4515)?.label).toBe('Padhri · 121–140')
    expect(sections(29).find(section => section.verseId === 4758)?.label).toBe('Rual · 181–200')
    expect(sections(29).some(section => section.number === 272)).toBe(false)
    expect(sections(53)).toHaveLength(7)
    expect(sections(53).filter(section => section.kind === 'chhand')).toHaveLength(6)
    expect(sections(25).map(section => section.verseId)).toEqual([3743, 3788])
    expect(sections(26)).toHaveLength(1)
    expect(sections(24)).toHaveLength(1)
    expect(sections(24)[0]).toMatchObject({ label: 'Ardaas', kind: 'composition', verseId: 3708 })
  })

  it('rejects changed, truncated, reordered and foreign selected readings', () => {
    for (const capture of captures) {
      const scoped = profiles.filter(profile => profile.baniDbId === capture.baniDbId)
      const changed = structuredClone(capture.entries)
      changed[0].lines![0].gurmukhi += ' '
      expect(resolveBaniSectionProfiles(changed, scoped)).toEqual([])
      expect(fingerprintBaniReading(changed)).not.toBe(capture.profile.fingerprint)
      const truncated = structuredClone(capture.entries)
      truncated.at(-1)!.lines!.pop()
      expect(resolveBaniSectionProfiles(truncated, scoped)).toEqual([])
    }
    const swapped = structuredClone(captured(4).entries)
    const lines = swapped[0].lines!
    ;[lines[0], lines[1]] = [lines[1], lines[0]]
    expect(resolveBaniSectionProfiles(swapped, profiles.filter(profile => profile.baniDbId === 4))).toEqual([])
    expect(resolveBaniSectionProfiles(captured(23, 'short').entries, profiles.filter(profile => profile.baniDbId === 21))).toEqual([])
  })
})
