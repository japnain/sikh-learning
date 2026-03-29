import { describe, it, expect } from 'vitest'
import { SCRIPTURES } from './index'

describe('SCRIPTURES', () => {
  it('has exactly 7 BaniDB sources', () => {
    expect(SCRIPTURES).toHaveLength(7)
  })

  it('does not contain Sarbloh Granth', () => {
    expect(SCRIPTURES.find(s => s.shortName === 'SG')).toBeUndefined()
  })

  it('every entry has a sourceId', () => {
    const ids = SCRIPTURES.map(s => s.sourceId)
    expect(ids).toEqual(['G', 'D', 'B', 'N', 'A', 'S', 'R'])
  })

  it('SGGS is first, DG is second', () => {
    expect(SCRIPTURES[0].shortName).toBe('SGGS')
    expect(SCRIPTURES[1].shortName).toBe('DG')
  })
})
