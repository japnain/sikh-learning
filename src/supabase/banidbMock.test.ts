import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fetchBani } from '../api/banidb'
import { server } from '../test/msw-server'
import { isExactBaniReading } from '../utils/baniReadingValidation'
import { getMockBanidbResponse } from './banidbMock'

describe('BaniDB Hukamnama QA mock', () => {
  it('preserves the date encoded in an exact Hukamnama route', () => {
    const response = getMockBanidbResponse('/v2/hukamnamas/2026/04/05') as {
      date: { gregorian: { year: number; month: number; date: number } }
    }

    expect(response.date.gregorian).toEqual({ year: 2026, month: 4, date: 5 })
  })

  it('keeps the stable default date for the undated QA reading', () => {
    const response = getMockBanidbResponse('/v2/hukamnamas') as {
      date: { gregorian: { year: number; month: number; date: number } }
    }

    expect(response.date.gregorian).toEqual({ year: 2026, month: 4, date: 23 })
  })
})

describe('BaniDB browser QA length fixtures', () => {
  it('loads exact distinct Rehras bands and returns from medium to short without retaining extra lines', async () => {
    // Use the browser corpus, rather than the richer default unit-test responses.
    server.use(http.post('https://naamras-qa.supabase.co/functions/v1/banidb-proxy', async ({ request }) => {
      const body = await request.json() as { path: string }
      expect(body.path).toBe('/v2/banis/21')
      return HttpResponse.json(getMockBanidbResponse(body.path))
    }))

    const medium = await fetchBani(21, 'medium')
    expect(isExactBaniReading(medium, 21, 'medium')).toBe(true)

    const lengths = ['short', 'medium', 'long', 'extralong'] as const
    const readings = []
    for (const [index, length] of lengths.entries()) {
      const reading = await fetchBani(21, length)
      expect(isExactBaniReading(reading, 21, length)).toBe(true)
      expect(reading.resolvedLength).toBe(length)
      expect(reading.availableLengths).toEqual(lengths)
      expect(reading.entries.flatMap(entry => entry.lines ?? [])).toHaveLength(index + 2)
      readings.push(reading)
    }

    const short = await fetchBani(21, 'short')
    expect(isExactBaniReading(short, 21, 'short')).toBe(true)
    expect(short.entries).toEqual(readings[0].entries)
    expect(short.entries.flatMap(entry => entry.lines ?? []).map(line => line.verseId)).toEqual([2101, 2102])
    expect(readings[1].entries.flatMap(entry => entry.lines ?? []).map(line => line.verseId)).toEqual([2101, 2102, 2103])
    // A real requested/resolved mismatch must still fail the production identity guard.
    expect(isExactBaniReading(short, 21, 'medium')).toBe(false)
  })
})
