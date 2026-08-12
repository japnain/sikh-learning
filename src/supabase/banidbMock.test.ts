import { describe, expect, it } from 'vitest'
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
