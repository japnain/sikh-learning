import { describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../api/banidb'
import japji from '../test/fixtures/bani-sections/japji-banidb-2026-10-31.json'
import { JAPJI_REVIEWED_READING_FINGERPRINT } from '../content/japjiSections'
import { fingerprintBaniReading } from './baniSectionProfiles'
import { getBaniSections } from './baniSections'

const options = { baniId: 'japji-sahib', baniDbId: 2, exactBani: true } as const

// Verse IDs independently recorded from the captured provider response at the
// reviewed opening of the first salok, each pauri, and the final salok. Keep this
// independent of JAPJI_PAURI_ANCHORS so changing that map cannot rewrite the test.
const expectedSectionVerseIds = [
  14,
  16, 22, 28, 42, 49, 60, 65, 72, 78, 84, 90, 96, 102, 108, 114, 120, 144, 156, 168,
  183, 193, 211, 216, 220, 236, 253, 279, 301, 306, 311, 317, 323, 328, 336, 347, 357,
  365, 383,
  391,
]

async function normalizeCapturedPayload(payload = japji) {
  // Replay only the transport response: fetchBani's production normalization is
  // exercised unchanged. This test makes no external request or socket listener.
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }))
  try {
    const reading = await fetchBani(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ path: '/v2/banis/2' })
    return reading
  } finally {
    fetchMock.mockRestore()
  }
}

describe('captured live Japji through production fetchBani normalization', () => {
  it('preserves all 385 provider rows and resolves all 40 sections to their actual lines', async () => {
    const originalFixture = JSON.stringify(japji)
    const reading = await normalizeCapturedPayload()
    const { entries } = reading
    const lines = entries.flatMap(entry => entry.lines ?? [])
    expect(lines).toHaveLength(385)
    expect(fingerprintBaniReading(entries)).toBe(JAPJI_REVIEWED_READING_FINGERPRINT)
    expect(lines.map(line => [line.verseId, line.gurmukhi, line.ang, Boolean(line.isHeader)])).toEqual(
      japji.verses.map(row => [row.verse.verseId, row.verse.verse.unicode, row.verse.pageNo, row.header > 0]),
    )
    // The actual provider omits shabadId and per-verse source; normalization must
    // keep those IDs absent/zero and use its authoritative baniInfo.source.
    expect(lines.every(line => line.shabadId === 0)).toBe(true)
    expect(entries.every(entry => entry.source === 'G' && entry.sourceAttribution === undefined)).toBe(true)
    expect(lines.filter(line => line.isHeader).map(line => line.verseId)).toEqual([12, 13, 390])

    const beforeIndexing = JSON.stringify(entries)
    const sections = getBaniSections(entries, options)
    expect(sections).toHaveLength(40)
    expect(sections.map(section => section.verseId)).toEqual(expectedSectionVerseIds)
    expect(sections.map(section => section.label)).toEqual([
      'Opening salok', ...Array.from({ length: 38 }, (_, index) => `Pauri ${index + 1}`), 'Closing salok',
    ])
    for (const section of sections) {
      const target = entries[section.entryIndex]?.lines?.[section.lineIndex]
      const raw = japji.verses.find(row => row.verse.verseId === section.verseId)!
      expect(target).toMatchObject({
        verseId: section.verseId, ang: raw.verse.pageNo, gurmukhi: raw.verse.verse.unicode, isHeader: false,
      })
      expect(section).toMatchObject({ source: 'G', ang: raw.verse.pageNo, excerpt: raw.verse.verse.unicode })
    }
    // This pauri starts on Ang 7 and continues on Ang 8: page starts are not its
    // semantic boundary. Preserve the checked opening as the jump destination.
    expect(sections[36]).toMatchObject({ number: 36, verseId: 357, ang: 7 })
    expect(sections[36].excerpt).toBe('ਗਿਆਨ ਖੰਡ ਮਹਿ ਗਿਆਨੁ ਪਰਚੰਡੁ ॥')
    expect(JSON.stringify(entries)).toBe(beforeIndexing)
    expect(JSON.stringify(japji)).toBe(originalFixture)
  })

  it('keeps source-page fallback when the real response is truncated inside its closing salok', async () => {
    const reading = await normalizeCapturedPayload({ ...japji, verses: japji.verses.slice(0, -1) })
    expect(reading.entries.flatMap(entry => entry.lines ?? [])).toHaveLength(384)
    expect(getBaniSections(reading.entries, options)).toEqual([])
  })

  it.each(['interior-deletion', 'interior-reorder', 'interior-text-change', 'positive-header-deletion'] as const)(
    'falls back for %s even when every salok/pauri opening and ending survives', async change => {
      const payload = structuredClone(japji)
      const firstInterior = payload.verses.findIndex(row => row.verse.verseId === 17)
      const secondInterior = payload.verses.findIndex(row => row.verse.verseId === 18)
      expect(payload.verses[firstInterior].header).toBe(0)
      expect(payload.verses[firstInterior].verse.verse.unicode).not.toMatch(/[੦-੯]/u)
      if (change === 'interior-deletion') payload.verses.splice(firstInterior, 1)
      if (change === 'interior-reorder') [payload.verses[firstInterior], payload.verses[secondInterior]] = [payload.verses[secondInterior], payload.verses[firstInterior]]
      if (change === 'interior-text-change') payload.verses[firstInterior].verse.verse.unicode += ' ਬਦਲੀ ਲਿਖਤ'
      if (change === 'positive-header-deletion') payload.verses = payload.verses.filter(row => row.verse.verseId !== 12)
      const reading = await normalizeCapturedPayload(payload)
      const original = JSON.stringify(reading.entries)
      const ids = new Set(reading.entries.flatMap(entry => entry.lines ?? []).map(line => line.verseId))
      expect(expectedSectionVerseIds.every(id => ids.has(id))).toBe(true)
      expect(fingerprintBaniReading(reading.entries)).not.toBe(JAPJI_REVIEWED_READING_FINGERPRINT)
      expect(getBaniSections(reading.entries, options)).toEqual([])
      expect(JSON.stringify(reading.entries)).toBe(original)
    },
  )

  it('retains an additional zero-ID synthetic heading and its actual normalized line offsets', async () => {
    const payload = structuredClone(japji)
    const template = payload.verses.find(row => row.verse.verseId === 13)!
    payload.verses.splice(4, 0, {
      ...template,
      verse: { ...template.verse, verseId: 0, verse: { ...template.verse.verse, unicode: 'ਪਉੜੀਆਂ' } },
    })
    const reading = await normalizeCapturedPayload(payload)
    const original = JSON.stringify(reading.entries)
    expect(reading.entries.flatMap(entry => entry.lines ?? [])).toHaveLength(386)
    const sections = getBaniSections(reading.entries, options)
    expect(sections).toHaveLength(40)
    expect(sections.map(section => section.verseId)).toEqual(expectedSectionVerseIds)
    expect(sections[1]).toMatchObject({ verseId: 16, entryIndex: 0, lineIndex: 5 })
    expect(reading.entries[0].lines![4]).toMatchObject({ verseId: 0, isHeader: true, gurmukhi: 'ਪਉੜੀਆਂ' })
    expect(JSON.stringify(reading.entries)).toBe(original)
  })
})
