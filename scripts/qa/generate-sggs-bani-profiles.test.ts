/**
 * Offline, opt-in generator. Runtime never parses headings or verse counters.
 * GENERATE_SGGS_BANI_PROFILES=1 npx vitest run --config scripts/qa/sggs-profiles.vitest.config.ts --configLoader runner --no-cache
 */
import fs from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it, vi } from 'vitest'
import { fetchBani } from '../../src/api/banidb'
import type { BaniProfileSectionSpec, BaniSectionLabels, BaniSectionProfile } from '../../src/content/baniSections/profileTypes'
import { fingerprintBaniReading, resolveBaniSectionProfile } from '../../src/utils/baniSectionProfiles'

interface Row {
  header: number
  paragraph: number
  verse: { verseId: number; pageNo: number | null; verse: { unicode: string } }
}
interface Payload { verses: Row[] }
interface Capture { baniDbId: number; payload: Payload }
interface Body { start: number; end: number; context: number; number: number }

const expectedCounts: Record<number, number> = {
  10: 40, 11: 4, 27: 14, 30: 57, 31: 24, 33: 57, 34: 73, 35: 54, 39: 45, 77: 243, 78: 130,
  86: 21, 87: 28, 88: 33, 89: 21, 90: 24, 91: 22, 92: 21, 93: 21, 94: 21, 95: 29, 96: 20,
  97: 20, 98: 13, 99: 21, 100: 22, 101: 8, 102: 22, 103: 23, 104: 3, 105: 36, 106: 28, 107: 15,
}
const text = (row: Row) => row.verse.verse.unicode
const rowId = (row: Row) => row.verse.verseId
const pauriHeading = (row: Row) => /^(ਪਉੜੀ|ਪਵੜੀ)(?:\s|॥|$)/u.test(text(row))
const salokHeading = (row: Row) => /^(ਸਲੋਕੁ?|ਡਖਣੇ)(?:\s|॥|$)/u.test(text(row))
const numbers = (value: string) => [...value.matchAll(/(?<=॥)\s*([੦-੯]+)\s*(?=॥)/gu)]
  .map(match => Number([...match[1]].map(digit => '੦੧੨੩੪੫੬੭੮੯'.indexOf(digit)).join('')))
const label = (en: string, pa: string, hi: string): BaniSectionLabels => ({ en, pa, hi })

function section(
  rows: Row[], id: string, kind: string, target: number, body: number,
  number?: number, explicitLabel?: BaniSectionLabels,
): BaniProfileSectionSpec {
  expect(target).toBeGreaterThanOrEqual(0)
  expect(body).toBeGreaterThanOrEqual(target)
  return {
    id, kind, ...(number === undefined ? {} : { number }),
    ...(explicitLabel ? { label: explicitLabel } : {}),
    startVerseId: rowId(rows[target]),
    ...(target === body ? {} : { excerptVerseId: rowId(rows[body]) }),
  }
}

/** Only the explicitly enumerated serial compositions use this offline rule. */
function numberedBodies(rows: Row[], expected: number, hasRahau = false): Body[] {
  const bodies: Body[] = []
  let cursor = 0
  for (let end = 0; end < rows.length; end += 1) {
    const ending = numbers(text(rows[end]))
    if (ending.length === 0 || text(rows[end]).includes('ਰਹਾਉ')) continue
    expect(ending[0]).toBe(bodies.length + 1)
    // Onkar and Sidh Gosht have one separately paragraphed refrain after stanza 1.
    if (hasRahau && bodies.length === 1) {
      const refrainEnd = rows.findIndex((row, index) => index >= cursor && index < end && text(row).includes('ਰਹਾਉ'))
      expect(refrainEnd).toBeGreaterThanOrEqual(cursor)
      cursor = refrainEnd + 1
    }
    let start = cursor
    while (start < end && rows[start].header > 0) start += 1
    // Retain interspersed author/Dohra headings with their following numbered unit.
    const context = bodies.length === 0 ? start : cursor
    bodies.push({ start, end, context, number: ending[0] })
    cursor = end + 1
  }
  expect(bodies).toHaveLength(expected)
  expect(bodies.at(-1)?.end).toBe(rows.length - 1)
  return bodies
}

function serialSections(id: number, rows: Row[]): BaniProfileSectionSpec[] {
  const kind = id === 10 ? 'pauri' : [30, 77, 78].includes(id) ? 'salok' : 'stanza'
  return numberedBodies(rows, expectedCounts[id], id === 34 || id === 35).map(body =>
    section(rows, `${kind}-${body.number}`, kind, body.context, body.start, body.number),
  )
}

function laavan(rows: Row[]): BaniProfileSectionSpec[] {
  return numberedBodies(rows, 4).map(body => section(rows, `laav-${body.number}`, 'laav', body.start, body.start,
    body.number, label(`Laav ${body.number}`, `ਲਾਵ ${body.number}`, `लाव ${body.number}`)))
}

function barahMaha(rows: Row[]): BaniProfileSectionSpec[] {
  const labels = [
    label('Opening', 'ਆਰੰਭ', 'आरंभ'), label('Chet', 'ਚੇਤ', 'चेत'), label('Vaisakh', 'ਵੈਸਾਖ', 'वैसाख'),
    label('Jeth', 'ਜੇਠ', 'जेठ'), label('Asarh', 'ਆਸਾੜ', 'आसाढ़'), label('Sawan', 'ਸਾਵਣ', 'सावन'),
    label('Bhadon', 'ਭਾਦੋਂ', 'भादों'), label('Assu', 'ਅੱਸੂ', 'अस्सू'), label('Kattak', 'ਕੱਤਕ', 'कत्तक'),
    label('Maghar', 'ਮੱਘਰ', 'मघ्घर'), label('Poh', 'ਪੋਹ', 'पोह'), label('Magh', 'ਮਾਘ', 'माघ'),
    label('Phagun', 'ਫੱਗਣ', 'फग्गण'), label('Closing', 'ਸਮਾਪਤੀ', 'समाप्ति'),
  ]
  return numberedBodies(rows, 14).map((body, index) => section(rows, `stanza-${body.number}`,
    index === 0 || index === 13 ? 'stanza' : 'month', body.start, body.start, body.number, labels[index]))
}

function sukhmani(rows: Row[]): BaniProfileSectionSpec[] {
  const headings = rows.flatMap((row, index) => /^ਅਸਟਪਦੀ\s*॥/u.test(text(row)) ? [index] : [])
  expect(headings).toHaveLength(24)
  return headings.map((heading, index) => {
    const preceding = rows.slice(0, heading).findLastIndex(salokHeading)
    const nextSalok = rows.findIndex((row, position) => position > heading && salokHeading(row))
    const end = nextSalok === -1 ? rows.length - 1 : nextSalok - 1
    expect(numbers(text(rows[end]))).toEqual([8, index + 1])
    expect(new Set(rows.slice(heading + 1, end + 1).map(row => row.paragraph)).size).toBe(8)
    return section(rows, `ashtpadi-${index + 1}`, 'ashtpadi', preceding, heading + 1, index + 1)
  })
}

function checkedPauris(rows: Row[], expected: number): Array<Body & { heading: number }> {
  const headings = rows.flatMap((row, index) => pauriHeading(row) ? [index] : [])
  expect(headings).toHaveLength(expected)
  return headings.map((heading, index) => {
    const end = rows.findIndex((row, position) => position > heading && numbers(text(row)).length > 0)
    expect(end).toBeGreaterThan(heading)
    expect(numbers(text(rows[end]))[0]).toBe(index + 1)
    return { heading, start: heading + 1, end, context: heading, number: index + 1 }
  })
}

function bavanM5(rows: Row[]): BaniProfileSectionSpec[] {
  const bodies = checkedPauris(rows, 55)
  const opening = rows.findIndex(salokHeading)
  const sections = [section(rows, 'opening-salok', 'opening-salok', opening, opening + 1)]
  for (const body of bodies) {
    const prelude = rows.slice(0, body.heading).findLastIndex(salokHeading)
    sections.push(section(rows, `pauri-${body.number}`, 'pauri', prelude, body.start, body.number))
  }
  const closing = rows.findIndex((row, index) => index > bodies.at(-1)!.end && salokHeading(row))
  expect(text(rows[closing + 1])).toBe(text(rows[opening + 1]))
  expect(text(rows.at(-1)!)).toBe('ਏਹੁ ਸਲੋਕੁ ਆਦਿ ਅੰਤਿ ਪੜਣਾ ॥')
  sections.push(section(rows, 'closing-salok', 'closing-salok', closing, closing + 1))
  return sections
}

function vaar(id: number, rows: Row[]): BaniProfileSectionSpec[] {
  if (id === 101 || id === 104) {
    return numberedBodies(rows, expectedCounts[id]).map(body =>
      section(rows, `pauri-${body.number}`, 'pauri', body.start, body.start, body.number),
    )
  }
  const bodies = checkedPauris(rows, expectedCounts[id] - (id === 87 ? 1 : 0))
  const sections = bodies.map((body, index) => {
    let prelude = index === 0 ? 0 : bodies[index - 1].end + 1
    if (id === 90) {
      // The supplied liturgical sequence interleaves chhants, saloks, and pauris.
      // Decorative separators stay in the reading but are not jump destinations.
      while (text(rows[prelude]) === '❁') prelude += 1
    } else if (index === 0) {
      const salok = rows.slice(0, body.heading).findIndex(salokHeading)
      prelude = salok >= 0 ? salok : rows.findIndex(row => row.header === 0)
    }
    return section(rows, `pauri-${body.number}`, 'pauri', prelude, body.start, body.number)
  })
  if (id === 87) {
    // Preserve and explicitly index the provider's separate post-var Gauri shabad.
    const tail = bodies.at(-1)!.end + 1
    expect(rows.length - tail).toBe(17)
    const heading = rows.findIndex((row, index) => index >= tail && text(row) === 'ਰਾਗੁ ਗਉੜੀ ਗੁਆਰੇਰੀ ਮਹਲਾ ੧ ਚਉਪਦੇ ਦੁਪਦੇ')
    const body = rows.findIndex((row, index) => index > heading && row.header === 0)
    expect(rowId(rows[body])).toBe(10997)
    const originalHeading = text(rows[heading])
    sections.push(section(rows, 'following-gauri-shabad', 'provider-heading', tail, body,
      undefined, label(originalHeading, originalHeading, originalHeading)))
  }
  return sections
}

function buildSections(id: number, rows: Row[]): BaniProfileSectionSpec[] {
  if (id === 11) return laavan(rows)
  if (id === 27) return barahMaha(rows)
  if (id === 31) return sukhmani(rows)
  if (id === 33) return bavanM5(rows)
  if (id >= 86 && id <= 107) return vaar(id, rows)
  return serialSections(id, rows)
}

describe.skipIf(process.env.GENERATE_SGGS_BANI_PROFILES !== '1')('generate reviewed SGGS profiles', () => {
  it('replays all 33 captures through production normalization and writes navigation metadata only', async () => {
    const fixture = JSON.parse(gunzipSync(fs.readFileSync(path.resolve(
      'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz',
    ))).toString('utf8')) as { readings: Capture[] }
    const profiles: BaniSectionProfile[] = []
    const coverage: Array<{ baniDbId: number; fingerprint: string; normalizedRowCount: number; sectionCount: number; evidence: string[]; reference: string }> = []
    for (const id of Object.keys(expectedCounts).map(Number)) {
      const payload = fixture.readings.find(capture => capture.baniDbId === id)!.payload
      const before = JSON.stringify(payload)
      const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(before, { status: 200 }))
      try {
        const reading = await fetchBani(id)
        expect(transport).toHaveBeenCalledTimes(1)
        const lines = reading.entries.flatMap(entry => entry.lines ?? [])
        expect(lines.map(line => [line.verseId, line.gurmukhi])).toEqual(
          payload.verses.map(row => [rowId(row), text(row).trim()]),
        )
        const profile = { baniDbId: id, fingerprint: fingerprintBaniReading(reading.entries), sections: buildSections(id, payload.verses) }
        expect(profile.sections).toHaveLength(expectedCounts[id])
        expect(resolveBaniSectionProfile(reading.entries, profile)).toHaveLength(expectedCounts[id])
        expect(JSON.stringify(payload)).toBe(before)
        profiles.push(profile)
        coverage.push({
          baniDbId: id, fingerprint: profile.fingerprint, normalizedRowCount: lines.length, sectionCount: profile.sections.length,
          evidence: [`https://api.banidb.com/v2/banis/${id}`, 'scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz',
            [10, 30, 31].includes(id) ? 'docs/qa/bani-structure-research-20261031.md' : 'docs/qa/bani-sggs-structure-research-20261101.md'],
          reference: 'Complete captured stream replayed through production fetchBani; ordered checked section targets and excerpts resolved without scripture mutation.',
        })
      } finally {
        transport.mockRestore()
      }
    }
    expect(profiles).toHaveLength(33)
    expect(profiles.reduce((total, profile) => total + profile.sections.length, 0)).toBe(1213)
    const destination = path.resolve('src/content/baniSections/sggsProfiles.ts')
    const contents = "// Generated from reviewed complete provider captures; navigation metadata only.\n"
      + "// Regenerate: GENERATE_SGGS_BANI_PROFILES=1 npx vitest run --config scripts/qa/sggs-profiles.vitest.config.ts --configLoader runner --no-cache\n"
      + "// Research: docs/qa/bani-sggs-structure-research-20261101.md and bani-structure-research-20261031.md\n"
      + "import type { BaniSectionProfile } from './profileTypes'\n\n"
      + 'export const SGGS_BANI_SECTION_PROFILES: readonly BaniSectionProfile[] = '
      + JSON.stringify(profiles, null, 2) + '\n'
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.writeFileSync(destination, contents)
    fs.writeFileSync(path.resolve('scripts/qa/fixtures/bani-sections-sggs-coverage-20261101.json'), JSON.stringify(coverage, null, 2) + '\n')
  })
})
