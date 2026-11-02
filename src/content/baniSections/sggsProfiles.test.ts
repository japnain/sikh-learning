import fs from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../../api/banidb'
import type { ScriptureEntry } from '../../types'
import { fingerprintBaniReading, resolveBaniSectionProfile } from '../../utils/baniSectionProfiles'
import { SGGS_BANI_SECTION_PROFILES } from './sggsProfiles'

interface ProviderRow {
  header: number
  verse: { verseId: number; pageNo: number | null; verse: { unicode: string } }
}
interface Capture { baniDbId: number; payload: { verses: ProviderRow[] } }
const fixture = JSON.parse(gunzipSync(fs.readFileSync(path.resolve(
  'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz',
))).toString('utf8')) as { readings: Capture[] }

// Independently recorded research counts, not inferred from generated profiles.
const counts: Record<number, number> = {
  10: 40, 11: 4, 27: 14, 30: 57, 31: 24, 33: 57, 34: 73, 35: 54, 39: 45, 77: 243, 78: 130,
  86: 21, 87: 28, 88: 33, 89: 21, 90: 24, 91: 22, 92: 21, 93: 21, 94: 21, 95: 29, 96: 20,
  97: 20, 98: 13, 99: 21, 100: 22, 101: 8, 102: 22, 103: 23, 104: 3, 105: 36, 106: 28, 107: 15,
}
const ids = Object.keys(counts).map(Number)
const readings = new Map<number, Awaited<ReturnType<typeof fetchBani>>>()
const profileFor = (id: number) => SGGS_BANI_SECTION_PROFILES.find(profile => profile.baniDbId === id)!
const entriesFor = (id: number) => readings.get(id)!.entries
const resolve = (id: number, locale: 'en' | 'pa' | 'hi' = 'en') =>
  resolveBaniSectionProfile(entriesFor(id), profileFor(id), locale)

beforeAll(async () => {
  for (const id of ids) {
    const payload = fixture.readings.find(capture => capture.baniDbId === id)!.payload
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
    try {
      readings.set(id, await fetchBani(id))
      expect(request).toHaveBeenCalledTimes(1)
      expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toMatchObject({ path: `/v2/banis/${id}` })
    } finally {
      request.mockRestore()
    }
  }
})

describe('reviewed SGGS profiles through production normalization', () => {
  it('covers the 33 assigned readings and 1,213 meaningful sections exactly once', () => {
    expect(SGGS_BANI_SECTION_PROFILES.map(profile => profile.baniDbId)).toEqual(ids)
    expect(new Set(SGGS_BANI_SECTION_PROFILES.map(profile => profile.fingerprint)).size).toBe(33)
    expect(SGGS_BANI_SECTION_PROFILES.reduce((total, profile) => total + profile.sections.length, 0)).toBe(1213)
  })

  it.each(ids)('resolves bani %s without changing its complete provider stream', id => {
    const entries = entriesFor(id)
    const before = JSON.stringify(entries)
    const raw = fixture.readings.find(capture => capture.baniDbId === id)!.payload.verses
    const lines = entries.flatMap(entry => entry.lines ?? [])
    expect(lines.map(line => [line.verseId, line.gurmukhi, line.originalAng ?? null, Boolean(line.isHeader)])).toEqual(
      raw.map(row => [row.verse.verseId, row.verse.verse.unicode.trim(), row.verse.pageNo ?? null, row.header > 0]),
    )
    const sections = resolve(id)
    expect(sections).toHaveLength(counts[id])
    expect(fingerprintBaniReading(entries)).toBe(profileFor(id).fingerprint)
    for (const [index, section] of sections.entries()) {
      const spec = profileFor(id).sections[index]
      const target = entries[section.entryIndex].lines![section.lineIndex]
      expect(target.verseId).toBe(spec.startVerseId)
      expect(section.excerpt).toBe(lines.find(line => line.verseId === (spec.excerptVerseId ?? spec.startVerseId))!.gurmukhi)
    }
    expect(JSON.stringify(entries)).toBe(before)
  })

  it('uses all 24 Sukhmani salok headings as targets and ashtpadi bodies as excerpts', () => {
    const targets = [5232, 5321, 5405, 5489, 5572, 5655, 5739, 5824, 5909, 5995, 6079, 6163,
      6247, 6331, 6415, 6497, 6580, 6664, 6746, 6830, 6914, 6998, 7082, 7166]
    const bodyIds = [5239, 5325, 5409, 5493, 5576, 5659, 5744, 5829, 5915, 5999, 6083, 6167,
      6251, 6335, 6419, 6501, 6584, 6668, 6750, 6834, 6918, 7002, 7086, 7170]
    const sections = resolve(31)
    expect(sections.map(section => section.verseId)).toEqual(targets)
    expect(profileFor(31).sections.map(section => section.excerptVerseId)).toEqual(bodyIds)
    expect(sections.map(section => section.label)).toEqual(Array.from({ length: 24 }, (_, index) => `Ashtpadi ${index + 1}`))
    expect(sections[1]).toMatchObject({ ang: 263, excerpt: 'ਜਹ ਮਾਤ ਪਿਤਾ ਸੁਤ ਮੀਤ ਨ ਭਾਈ ॥' })
    expect(entriesFor(31).flatMap(entry => entry.lines ?? []).find(line => line.verseId === 5325)?.originalAng).toBe(264)
  })

  it('keeps all 471 var pauris, including the two vars without salok preludes', () => {
    const vars = ids.filter(id => id >= 86)
    expect(vars.flatMap(id => resolve(id)).filter(section => section.kind === 'pauri')).toHaveLength(471)
    expect(resolve(101).map(section => section.label)).toEqual(Array.from({ length: 8 }, (_, i) => `Pauri ${i + 1}`))
    expect(resolve(104).map(section => section.verseId)).toEqual([16473, 16478, 16483])
    // Checked heading spellings/flags must not cause the missing pauris seen in a generic parser.
    expect(resolve(87)[3].excerpt).toBe('ਕਾਇਆ ਹੰਸਿ ਸੰਜੋਗੁ ਮੇਲਿ ਮਿਲਾਇਆ ॥')
    expect(resolve(103)[9].excerpt).toBe('ਹਰਿ ਜੀਉ ਜਾ ਤੂ ਮੇਰਾ ਮਿਤ੍ਰੁ ਹੈ ਤਾ ਕਿਆ ਮੈ ਕਾੜਾ ॥')
    expect(resolve(86)[2].number).toBe(3)
    expect(resolve(92)[5].number).toBe(6)
    expect(resolve(95)[14].number).toBe(15)
  })

  it('preserves Asa chhants and noncontiguous Angs within 24 pauri units', () => {
    const sections = resolve(90)
    expect(sections[0]).toMatchObject({ verseId: 24888, ang: 448, excerpt: 'ਆਪੀਨੑੈ ਆਪੁ ਸਾਜਿਓ ਆਪੀਨੑੈ ਰਚਿਓ ਨਾਉ ॥' })
    expect(sections[1]).toMatchObject({ verseId: 24933, ang: 449 })
    const lines = entriesFor(90).flatMap(entry => entry.lines ?? [])
    expect(lines.filter(line => line.gurmukhi === '❁' && line.originalAng === null)).toHaveLength(24)
    expect(sections.every(section => section.excerpt !== '❁')).toBe(true)
  })

  it('shows Majh’s following Gauri shabad under its printed heading instead of dropping it', () => {
    const sections = resolve(87)
    expect(sections.slice(0, 27).map(section => section.number)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1))
    expect(sections[27]).toMatchObject({
      kind: 'provider-heading', verseId: 26089, ang: 151,
      label: 'ਰਾਗੁ ਗਉੜੀ ਗੁਆਰੇਰੀ ਮਹਲਾ ੧ ਚਉਪਦੇ ਦੁਪਦੇ', excerpt: 'ਭਉ ਮੁਚੁ ਭਾਰਾ ਵਡਾ ਤੋਲੁ ॥',
    })
    const lines = entriesFor(87).flatMap(entry => entry.lines ?? [])
    expect(lines.slice(lines.findIndex(line => line.verseId === sections[27].verseId))).toHaveLength(17)
    expect(lines.at(-1)?.verseId).toBe(11010)
  })

  it('keeps Bavan M5’s opening and repeated closing saloks separate from 55 pauris', () => {
    const sections = resolve(33)
    expect(sections[0]).toMatchObject({ kind: 'opening-salok', verseId: 7737 })
    expect(sections[1]).toMatchObject({ kind: 'pauri', number: 1, verseId: 7747, excerpt: 'ਓਅੰ ਸਾਧ ਸਤਿਗੁਰ ਨਮਸਕਾਰੰ ॥' })
    expect(sections.filter(section => section.kind === 'pauri')).toHaveLength(55)
    expect(sections.at(-1)).toMatchObject({ kind: 'closing-salok', verseId: 8398 })
    expect(sections[0].excerpt).toBe(sections.at(-1)?.excerpt)
    expect(entriesFor(33).flatMap(entry => entry.lines ?? []).at(-1)?.gurmukhi).toBe('ਏਹੁ ਸਲੋਕੁ ਆਦਿ ਅੰਤਿ ਪੜਣਾ ॥')
  })

  it('keeps refrains outside numbered counts and preserves original long-work ordinals', () => {
    expect(resolve(34)[1]).toMatchObject({ number: 2, verseId: 8419 })
    expect(resolve(35)[1]).toMatchObject({ number: 2, verseId: 8829 })
    expect(resolve(34).at(-1)).toMatchObject({ number: 73, verseId: 8810 })
    expect(resolve(35).at(-1)).toMatchObject({ number: 54, verseId: 9212 })
    expect(resolve(39).at(-1)).toMatchObject({ number: 45, verseId: 9438 })
    expect(resolve(10).at(-1)).toMatchObject({ number: 40, verseId: 1988 })
  })

  it('retains author and Dohra context without restarting the numbered salok collections', () => {
    expect(resolve(30)[52]).toMatchObject({ number: 53, verseId: 5217, excerpt: 'ਬਲੁ ਛੁਟਕਿਓ ਬੰਧਨ ਪਰੇ ਕਛੂ ਨ ਹੋਤ ਉਪਾਇ ॥' })
    expect(resolve(77).at(-1)).toMatchObject({ number: 243, verseId: 23801 })
    expect(resolve(78).at(-1)).toMatchObject({ number: 130, verseId: 26316 })
    expect(resolve(77).some(section => section.verseId === 23727)).toBe(true)
    expect(resolve(78).some(section => section.verseId === 23836)).toBe(true)
    expect(resolve(77).map(section => section.number)).toEqual(Array.from({ length: 243 }, (_, i) => i + 1))
  })

  it('labels Laavan and all twelve months without dropping the opening or closing', () => {
    expect(resolve(11).map(section => section.verseId)).toEqual([1996, 2002, 2008, 2014])
    expect(resolve(11, 'pa').map(section => section.label)).toEqual(['ਲਾਵ 1', 'ਲਾਵ 2', 'ਲਾਵ 3', 'ਲਾਵ 4'])
    expect(resolve(27).map(section => section.label)).toEqual([
      'Opening', 'Chet', 'Vaisakh', 'Jeth', 'Asarh', 'Sawan', 'Bhadon', 'Assu', 'Kattak', 'Maghar', 'Poh', 'Magh', 'Phagun', 'Closing',
    ])
    expect(resolve(27)[3]).toMatchObject({ number: 4, verseId: 3864, excerpt: 'ਹਰਿ ਜੇਠਿ ਜੁੜੰਦਾ ਲੋੜੀਐ ਜਿਸੁ ਅਗੈ ਸਭਿ ਨਿਵੰਨਿ ॥' })
    expect(resolve(27, 'hi')[13].label).toBe('समाप्ति')
  })

  it.each([31, 87, 90, 77])('rejects a changed body line anywhere in the complete bani %s fingerprint', id => {
    const entries = JSON.parse(JSON.stringify(entriesFor(id))) as ScriptureEntry[]
    const lines = entries.flatMap(entry => entry.lines ?? [])
    lines[Math.floor(lines.length / 2)].gurmukhi += ' ਅ'
    expect(resolveBaniSectionProfile(entries, profileFor(id))).toEqual([])
  })

  it('rejects a truncated Majh tail instead of accepting only its pauri anchors', () => {
    const entries = JSON.parse(JSON.stringify(entriesFor(87))) as ScriptureEntry[]
    entries.at(-1)!.lines!.pop()
    expect(resolveBaniSectionProfile(entries, profileFor(87))).toEqual([])
  })
})
