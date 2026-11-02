import { describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../api/banidb'
import captures from '../test/fixtures/bani-sections/unattributed-banidb-2026-11-01.json'
import { isExactBaniReading, normalizeCachedBaniReading } from './baniReadingValidation'

describe('live catalog readings without provider source attribution', () => {
  it.each(captures)('loads and accepts bani $baniDbId with neutral attribution', async ({ baniDbId, routeSource, payload }) => {
    const before = JSON.stringify(payload)
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(before, {
      status: 200, headers: { 'content-type': 'application/json' },
    }))
    try {
      const reading = await fetchBani(baniDbId)
      expect(request).toHaveBeenCalledTimes(1)
      expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toMatchObject({ path: `/v2/banis/${baniDbId}` })
      expect(reading.entries.flatMap(entry => entry.lines ?? []).map(line => [line.verseId, line.gurmukhi])).toEqual(
        payload.verses.map(row => [row.verse.verseId, row.verse.verse.unicode.trim()]),
      )
      expect(reading.entries.length).toBeGreaterThan(0)
      for (const entry of reading.entries) {
        expect(entry).toMatchObject({
          source: routeSource, sourceAttribution: 'unavailable',
          scripture: 'Sundar Gutka', sourceName: 'Sundar Gutka', sourceMeta: null,
        })
      }
      // This is the same acceptance gate used by useBani before displaying a
      // fresh response, a prepared reading, or a saved offline reading.
      expect(isExactBaniReading(reading, baniDbId)).toBe(true)
      const persisted = JSON.parse(JSON.stringify(reading))
      expect(normalizeCachedBaniReading(persisted, baniDbId)).toEqual(reading)
      expect(isExactBaniReading(reading, baniDbId + 1000)).toBe(false)
      expect(JSON.stringify(payload)).toBe(before)
    } finally {
      request.mockRestore()
    }
  })
})
