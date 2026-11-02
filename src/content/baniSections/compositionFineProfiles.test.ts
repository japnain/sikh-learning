import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../../api/banidb'
import type { ScriptureEntry, UiLocale } from '../../types'
import { fingerprintBaniReading, resolveBaniSectionProfile } from '../../utils/baniSectionProfiles'
import type { BaniProfileSectionSpec, BaniSectionProfile, ResolvedBaniProfileSection } from './profileTypes'
import { COMPOSITION_FINE_SECTION_PROFILES } from './compositionFineProfiles'
import { SGGS_BANI_SECTION_PROFILES } from './sggsProfiles'
import { COMPOSITION_FINE_REVIEWED_FINGERPRINTS, SUKHMANI_STANZA_ENDS } from '../../../scripts/qa/bani-sections/compositionFineAnchors'
import { generateCompositionFineProfile, renderCompositionFineProfiles } from '../../../scripts/qa/bani-sections/generateCompositionFineProfiles'

interface Row {
  header: number
  paragraph: number
  verse: { verseId: number; pageNo: number | null; verse: { unicode: string } }
}
interface Payload { verses: Row[] }
const archive = JSON.parse(gunzipSync(readFileSync('scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz')).toString('utf8')) as {
  readings: { baniDbId: number; payload: Payload }[]
}
const ids = [24, 31, 38]
const counts: Record<number, { rows: number; roots: number; children: number }> = {
  24: { rows: 29, roots: 14, children: 0 },
  31: { rows: 2019, roots: 24, children: 192 },
  38: { rows: 62, roots: 7, children: 0 },
}
const payloadFor = (id: number) => archive.readings.find(capture => capture.baniDbId === id)!.payload
const captures = new Map<number, ScriptureEntry[]>()
let profiles: readonly BaniSectionProfile[] = COMPOSITION_FINE_SECTION_PROFILES
const profileFor = (id: number) => profiles.find(profile => profile.baniDbId === id)!
const flatten = <T extends { children?: readonly T[] }>(sections: readonly T[]): T[] => sections.flatMap(section => [section, ...(section.children ?? [])])
const digits = (number: number) => String(number).replace(/\d/g, value => '੦੧੨੩੪੫੬੭੮੯'[Number(value)])

async function normalize(id: number, payload: Payload): Promise<ScriptureEntry[]> {
  const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
  try {
    const reading = await fetchBani(id)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(transport.mock.calls[0]?.[1]?.body))).toMatchObject({ path: `/v2/banis/${id}` })
    return reading.entries
  } finally { transport.mockRestore() }
}

beforeAll(async () => {
  const generated: BaniSectionProfile[] = []
  for (const id of ids) {
    const entries = await normalize(id, payloadFor(id))
    captures.set(id, entries)
    generated.push(generateCompositionFineProfile(id, entries))
  }
  if (process.env.UPDATE_COMPOSITION_FINE_PROFILES === '1') {
    profiles = generated
    writeFileSync('src/content/baniSections/compositionFineProfiles.ts', renderCompositionFineProfiles(generated))
    writeFileSync('scripts/qa/fixtures/bani-sections-composition-fine-coverage-20261102.json', JSON.stringify({
      generatedFrom: 'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz',
      activation: 'Replacement data only; registry and UI integration owned separately.',
      evidence: 'docs/qa/bani-composition-fine-structure-20261102.md',
      profiles: generated.map(profile => ({ baniDbId: profile.baniDbId, fingerprint: profile.fingerprint,
        normalizedRows: counts[profile.baniDbId].rows, rootSections: profile.sections.length,
        childSections: flatten(profile.sections).length - profile.sections.length,
        totalTargets: flatten(profile.sections).length })),
    }, null, 2) + '\n')
  }
  expect(profiles).toEqual(generated)
})

describe('reviewed fine composition profiles through production normalization', () => {
  it.each(ids)('resolves every bani %s target and excerpt without changing the complete source stream', id => {
    const entries = captures.get(id)!
    const before = JSON.stringify(entries)
    const lines = entries.flatMap(entry => entry.lines ?? [])
    expect(lines).toHaveLength(counts[id].rows)
    expect(lines.map(line => [line.verseId, line.gurmukhi, line.originalAng ?? null, Boolean(line.isHeader)]))
      .toEqual(payloadFor(id).verses.map(row => [row.verse.verseId, row.verse.verse.unicode.trim(), row.verse.pageNo ?? null, row.header > 0]))
    expect(fingerprintBaniReading(entries)).toBe(COMPOSITION_FINE_REVIEWED_FINGERPRINTS[id])
    const specs = flatten<BaniProfileSectionSpec>(profileFor(id).sections)
    for (const locale of ['en', 'pa', 'hi'] as UiLocale[]) {
      const roots = resolveBaniSectionProfile(entries, profileFor(id), locale)
      const resolved = flatten<ResolvedBaniProfileSection>(roots)
      expect(roots).toHaveLength(counts[id].roots)
      expect(resolved).toHaveLength(counts[id].roots + counts[id].children)
      expect(new Set(resolved.map(section => section.id)).size).toBe(resolved.length)
      for (const [index, section] of resolved.entries()) {
        expect(entries[section.entryIndex].lines![section.lineIndex].verseId).toBe(specs[index].startVerseId)
        expect(section.excerpt).toBe(lines.find(line => line.verseId === (specs[index].excerptVerseId ?? specs[index].startVerseId))!.gurmukhi)
      }
    }
    expect(JSON.stringify(entries)).toBe(before)
  })

  it('preserves all 24 Sukhmani parent salok targets and body excerpts while adding eight printed stanzas each', () => {
    const parents = profileFor(31).sections
    expect(parents.map(parent => { const original = { ...parent }; delete original.children; return original }))
      .toEqual(SGGS_BANI_SECTION_PROFILES.find(profile => profile.baniDbId === 31)!.sections)
    const lines = captures.get(31)!.flatMap(entry => entry.lines ?? [])
    const positions = new Map(lines.map((line, index) => [line.verseId, index]))
    for (const [parentIndex, parent] of parents.entries()) {
      expect(parent.children).toHaveLength(8)
      expect(positions.get(parent.startVerseId)).toBeLessThan(positions.get(parent.children![0].startVerseId)!)
      for (const [stanza, child] of parent.children!.entries()) {
        const start = positions.get(child.startVerseId)!
        const next = stanza < 7 ? positions.get(parent.children![stanza + 1].startVerseId)!
          : parentIndex < 23 ? positions.get(parents[parentIndex + 1].startVerseId)! : lines.length
        const stanzaLines = lines.slice(start, next)
        const endings = stanzaLines.filter(line => /॥[੦-੯]+॥(?:[੦-੯]+॥)?$/u.test(line.gurmukhi))
        expect(endings).toHaveLength(1)
        expect(endings[0].verseId).toBe(SUKHMANI_STANZA_ENDS[parentIndex][stanza])
        expect(endings[0].gurmukhi.endsWith(`॥${digits(stanza + 1)}॥${stanza === 7 ? `${digits(parentIndex + 1)}॥` : ''}`)).toBe(true)
        expect(child).toMatchObject({ kind: 'stanza', number: stanza + 1, excerptVerseId: child.startVerseId })
        const raw = payloadFor(31).verses.find(row => row.verse.verseId === child.startVerseId)!
        // Paragraph metadata is corroborating evidence only; it includes the rahau with stanza2.
        expect(raw.paragraph).toBe(7 + parentIndex * 11 + stanza)
        const firstInParagraph = payloadFor(31).verses.find(row => row.paragraph === raw.paragraph && row.header === 0)!
        expect(child.startVerseId).toBe(parentIndex === 0 && stanza === 1 ? 5251 : firstInParagraph.verse.verseId)
      }
    }
  })

  it('keeps the sole rahau inside stanza 1 and skips it when jumping to stanza 2', () => {
    const first = profileFor(31).sections[0].children!
    expect(first.map(section => section.startVerseId)).toEqual([5239, 5251, 5261, 5271, 5281, 5291, 5301, 5311])
    expect(captures.get(31)!.flatMap(entry => entry.lines ?? []).filter(line => line.gurmukhi.includes('ਰਹਾਉ'))
      .map(line => line.verseId)).toEqual([5250])
    expect(profileFor(31).sections[15].children![7].startVerseId).toBe(6570)
    expect(profileFor(31).sections[23].children![7].startVerseId).toBe(7239)
  })

  it('uses six named Raag Maala transitions with separate opening context, without inventing pauris', () => {
    const resolved = resolveBaniSectionProfile(captures.get(38)!, profileFor(38))
    expect(resolved.map(section => section.verseId)).toEqual([9216, 9220, 9230, 9240, 9251, 9258, 9266])
    expect(resolved.map(section => section.excerpt)).toEqual([
      'ਰਾਗ ਏਕ ਸੰਗਿ ਪੰਚ ਬਰੰਗਨ ॥', 'ਪ੍ਰਥਮ ਰਾਗ ਭੈਰਉ ਵੈ ਕਰਹੀ ॥', 'ਦੁਤੀਆ ਮਾਲਕਉਸਕ ਆਲਾਪਹਿ ॥',
      'ਪੁਨਿ ਆਇਅਉ ਹਿੰਡੋਲੁ ਪੰਚ ਨਾਰਿ ਸੰਗਿ ਅਸਟ ਸੁਤ ॥', 'ਪੁਨਿ ਆਈ ਦੀਪਕ ਕੀ ਬਾਰੀ ॥੧॥',
      'ਸਭ ਮਿਲਿ ਸਿਰੀਰਾਗ ਵੈ ਗਾਵਹਿ ॥', 'ਖਸਟਮ ਮੇਘ ਰਾਗ ਵੈ ਗਾਵਹਿ ॥',
    ])
    expect(resolved.every(section => section.kind === 'composition' && section.number == null)).toBe(true)
    expect(resolved.map(section => section.ang)).toEqual([1429, 1429, 1430, 1430, 1430, 1430, 1430])
  })

  it('uses Ardaas source incipits, groups continuous petitions and keeps missing attribution/pages neutral', () => {
    const entries = captures.get(24)!
    const resolved = resolveBaniSectionProfile(entries, profileFor(24))
    expect(resolved.map(section => section.verseId)).toEqual([3708, 3714, 3720, 3721, 3722, 3723, 3724, 3725, 3727, 3728, 3729, 3731, 3735, 3736])
    for (const section of resolved) {
      expect(section.excerpt.startsWith(section.label)).toBe(true)
      expect(section.source).toBeNull()
      expect(section.number).toBeUndefined()
      expect(section.ang).toBe(section.verseId <= 3719 && section.verseId !== 3708 ? 119 : null)
    }
    expect(resolved[0].excerpt).toBe('ੴ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹ ॥')
  })

  it.each(ids.flatMap(id => ['delete', 'reorder', 'change-text'].map(kind => ({ id, kind }))))('rejects a $kind inside bani $id through the production normalizer', async ({ id, kind }) => {
      const payload = structuredClone(payloadFor(id))
      const index = id === 31 ? 13 : id === 38 ? 6 : 7
      if (kind === 'delete') payload.verses.splice(index, 1)
      else if (kind === 'reorder') [payload.verses[index], payload.verses[index + 1]] = [payload.verses[index + 1], payload.verses[index]]
      else payload.verses[index].verse.verse.unicode += ' ਬਦਲਾਅ'
      const entries = await normalize(id, payload)
      expect(resolveBaniSectionProfile(entries, profileFor(id))).toEqual([])
      expect(() => generateCompositionFineProfile(id, entries)).toThrow('Unreviewed complete reading')
    })
})
