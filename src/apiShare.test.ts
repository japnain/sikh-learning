import { describe, expect, it, vi } from 'vitest'
import handler, { buildShareLanding, renderShareLanding } from '../api/share'

describe('share-link metadata endpoint', () => {
  it('renders route-specific social metadata and an exact reading destination', () => {
    const landing = buildShareLanding({ kind: 'hukamnama', date: '2026-08-03' })
    expect(landing).not.toBeNull()
    expect(landing?.canonicalUrl).toBe('https://naamras.xyz/h/2026-08-03')
    expect(landing?.destination).toBe('/study?hukamnamaDate=2026-08-03')

    const html = renderShareLanding(landing!)
    expect(html).toContain('property="og:title"')
    expect(html).toContain('name="twitter:card" content="summary"')
    expect(html).toContain('data-share-destination="/study?hukamnamaDate=2026-08-03"')
  })

  it('preserves personal Hukamnama identifiers while rejecting malformed values', () => {
    expect(buildShareLanding({
      kind: 'personal',
      shabadId: '2591',
      ang: '680',
      resumeVerseId: '10101',
    })?.destination).toBe(
      '/study?shabadId=2591&flow=ardaas-hukamnama&randomHukamnamaAng=680&resumeVerseId=10101',
    )
    expect(buildShareLanding({ kind: 'personal', shabadId: '1e3', ang: '680' })).toBeNull()
    expect(buildShareLanding({ kind: 'hukamnama', date: '2026-02-29' })).toBeNull()
  })

  it('returns a cacheable HTML preview for valid links and a safe redirect for invalid links', () => {
    const headers = new Map<string, string>()
    const response = {
      statusCode: 0,
      setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
      end: vi.fn(),
    }

    handler({ query: { kind: 'personal', shabadId: '2591', ang: '680' } }, response)
    expect(response.statusCode).toBe(200)
    expect(headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(headers.get('Cache-Control')).toContain('s-maxage=86400')
    expect(response.end).toHaveBeenCalledWith(expect.stringContaining('Personal Hukamnama'))

    response.end.mockClear()
    handler({ query: { kind: 'personal', shabadId: 'bad', ang: '680' } }, response)
    expect(response.statusCode).toBe(302)
    expect(headers.get('Location')).toBe('/')
  })
})
