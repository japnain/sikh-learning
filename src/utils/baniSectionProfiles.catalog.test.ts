import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fetchBani, type BaniFetchResult } from '../api/banidb'
import { getBaniRouteSource, READ_BANIDB_CATALOG_IDS, READ_EXACT_BANIS } from '../data/banis'
import { BASE_BANI_SECTION_PROFILES, BANI_SECTION_PROFILES, FINE_BANI_SECTION_PROFILES } from '../content/baniSections'
import type { BaniProfileSectionSpec, ResolvedBaniProfileSection } from '../content/baniSections/profileTypes'
import type { ScriptureEntry, SundarGutkaLength } from '../types'
import { getBaniSections } from './baniSections'
import { fingerprintBaniReading, flattenBaniSections, getCurrentBaniSectionPath, resolveBaniSectionProfiles } from './baniSectionProfiles'
import { isExactBaniReading } from './baniReadingValidation'

interface CapturedRow {
  header?: number
  mangalPosition?: string | null
  existsSGPC?: number
  existsMedium?: number
  existsTaksal?: number
  existsBuddhaDal?: number
  verse: {
    verseId: number
    pageNo: number | null
    verse: { unicode: string }
  }
}

interface CapturedReading {
  baniDbId: number
  payload: { baniInfo: { unicode?: string; english?: string }; verses: CapturedRow[] }
}

const corpus = JSON.parse(gunzipSync(readFileSync('scripts/qa/fixtures/bani-structure-snapshots-20261101.json.gz')).toString('utf8')) as {
  readings: CapturedReading[]
}
const expectedVariants: Record<number, readonly { length: SundarGutkaLength; rawFlag: keyof Pick<CapturedRow, 'existsSGPC' | 'existsMedium' | 'existsTaksal' | 'existsBuddhaDal'>; rows: number }[]> = {
  9: [{ length: 'short', rawFlag: 'existsSGPC', rows: 104 }, { length: 'medium', rawFlag: 'existsTaksal', rows: 130 }, { length: 'long', rawFlag: 'existsBuddhaDal', rows: 173 }],
  21: [{ length: 'short', rawFlag: 'existsSGPC', rows: 306 }, { length: 'medium', rawFlag: 'existsMedium', rows: 337 }, { length: 'long', rawFlag: 'existsTaksal', rows: 439 }, { length: 'extralong', rawFlag: 'existsBuddhaDal', rows: 521 }],
  22: [{ length: 'short', rawFlag: 'existsTaksal', rows: 61 }, { length: 'medium', rawFlag: 'existsSGPC', rows: 82 }, { length: 'long', rawFlag: 'existsBuddhaDal', rows: 230 }],
  23: [{ length: 'short', rawFlag: 'existsSGPC', rows: 54 }, { length: 'medium', rawFlag: 'existsMedium', rows: 61 }, { length: 'long', rawFlag: 'existsTaksal', rows: 86 }, { length: 'extralong', rawFlag: 'existsBuddhaDal', rows: 145 }],
}
const cases = corpus.readings.flatMap(capture => {
  const variants = expectedVariants[capture.baniDbId]
  return variants ? variants.map(variant => ({
    key: `${capture.baniDbId}:${variant.length}`, capture, requestedLength: variant.length as SundarGutkaLength | null,
    expectedRows: capture.payload.verses.filter(row => row.mangalPosition !== 'above' && Boolean(row[variant.rawFlag])),
    expectedCount: variant.rows,
  })) : [{
    key: `${capture.baniDbId}:full`, capture, requestedLength: null as SundarGutkaLength | null,
    expectedRows: capture.payload.verses, expectedCount: capture.payload.verses.length,
  }]
})
const normalized = new Map<string, BaniFetchResult>()
const historicalCases = JSON.parse(readFileSync('scripts/qa/fixtures/bani-sections-browser-cases-20261101.json', 'utf8')) as Array<{
  id: number; requestedlength: SundarGutkaLength | null; sections: number; fingerprint: string
}>
// Reviewed expansion counts are independent of the historical root inventory.
const expectedFineCounts: Record<number, { roots: number; children: number }> = {
  24: { roots: 14, children: 0 },
  31: { roots: 24, children: 192 },
  38: { roots: 7, children: 0 },
  55: { roots: 5, children: 0 },
  56: { roots: 78, children: 78 },
  57: { roots: 52, children: 2 },
  58: { roots: 8, children: 0 },
  59: { roots: 9, children: 19 },
  60: { roots: 7, children: 13 },
  64: { roots: 10, children: 0 },
  65: { roots: 16, children: 0 },
  66: { roots: 20, children: 0 },
  67: { roots: 8, children: 29 },
  69: { roots: 9, children: 11 },
  70: { roots: 2, children: 6 },
  71: { roots: 9, children: 29 },
  72: { roots: 6, children: 9 },
  73: { roots: 5, children: 7 },
  74: { roots: 5, children: 0 },
  76: { roots: 9, children: 0 },
}

async function replay(capture: CapturedReading, length: SundarGutkaLength | null) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(capture.payload), { status: 200 }))
  try {
    const reading = await fetchBani(capture.baniDbId, length)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ path: `/v2/banis/${capture.baniDbId}` })
    return reading
  } finally {
    fetchMock.mockRestore()
  }
}

function sectionsFor(entries: ScriptureEntry[], id: number) {
  return getBaniSections(entries, { baniDbId: id, exactBani: true })
}

beforeAll(async () => {
  for (const item of cases) normalized.set(item.key, await replay(item.capture, item.requestedLength))
})

describe('reviewed profile integration across the captured exact catalog', () => {
  it('covers every catalog ID and all fourteen distinct configurable lengths', () => {
    expect(corpus.readings.map(reading => reading.baniDbId).sort((a, b) => a - b)).toEqual(READ_BANIDB_CATALOG_IDS)
    expect(cases).toHaveLength(114)
    expect(cases.filter(item => item.requestedLength !== null)).toHaveLength(14)
    expect(new Set(cases.map(item => item.key)).size).toBe(114)
  })

  it('replaces only exact baseline profile keys without ambiguous or unused fine profiles', () => {
    const key = (profile: { baniDbId: number; fingerprint: string }) => `${profile.baniDbId}:${profile.fingerprint}`
    const baseline = new Map(BASE_BANI_SECTION_PROFILES.map(profile => [key(profile), profile]))
    const overrides = new Map(FINE_BANI_SECTION_PROFILES.map(profile => [key(profile), profile]))
    expect(baseline.size).toBe(BASE_BANI_SECTION_PROFILES.length)
    expect(overrides.size).toBe(FINE_BANI_SECTION_PROFILES.length)
    expect(BANI_SECTION_PROFILES).toHaveLength(BASE_BANI_SECTION_PROFILES.length)
    expect(new Set(BANI_SECTION_PROFILES.map(key)).size).toBe(BANI_SECTION_PROFILES.length)
    for (const profile of FINE_BANI_SECTION_PROFILES) expect(baseline.has(key(profile))).toBe(true)
    for (const profile of BANI_SECTION_PROFILES) expect(profile).toBe(overrides.get(key(profile)) ?? baseline.get(key(profile)))
    expect([...new Set(FINE_BANI_SECTION_PROFILES.map(profile => profile.baniDbId))].sort((a, b) => a - b))
      .toEqual(Object.keys(expectedFineCounts).map(Number).sort((a, b) => a - b))
  })

  it('retains the historical 2411-root baseline and separately verifies each reviewed expansion', () => {
    expect(historicalCases).toHaveLength(114)
    expect(historicalCases.reduce((total, item) => total + item.sections, 0)).toBe(2411)
    let baselineRoots = 0
    for (const item of cases) {
      const id = item.capture.baniDbId
      const entries = normalized.get(item.key)!.entries
      const historical = historicalCases.find(record => record.id === id && record.requestedlength === item.requestedLength)!
      const baseline = id === 2 ? sectionsFor(entries, id)
        : resolveBaniSectionProfiles(entries, BASE_BANI_SECTION_PROFILES.filter(profile => profile.baniDbId === id))
      expect(fingerprintBaniReading(entries)).toBe(historical.fingerprint)
      expect(baseline).toHaveLength(historical.sections)
      baselineRoots += baseline.length
      const current = sectionsFor(entries, id)
      const expected = expectedFineCounts[id]
      if (expected) {
        expect(current).toHaveLength(expected.roots)
        expect(flattenBaniSections(current)).toHaveLength(expected.roots + expected.children)
      } else expect(current).toEqual(baseline)
    }
    expect(baselineRoots).toBe(2411)
  })

  it.each(cases)('$key preserves its selected original row stream and resolves every reviewed section', item => {
    const reading = normalized.get(item.key)!
    expect(isExactBaniReading(reading, item.capture.baniDbId, item.requestedLength)).toBe(true)
    expect(reading.resolvedLength).toBe(item.requestedLength)
    const lines = reading.entries.flatMap(entry => entry.lines ?? [])
    expect(lines).toHaveLength(item.expectedCount)
    // The existing provider normalizer trims edge whitespace. The corpus has
    // one trailing space in Aarti row 3510 and Ardaas row 3731; no text is added.
    expect(lines.map(line => [line.verseId, line.gurmukhi, line.originalAng, Boolean(line.isHeader)])).toEqual(
      item.expectedRows.map(row => [row.verse.verseId, row.verse.verse.unicode.trim(), row.verse.pageNo, (row.header ?? 0) > 0]),
    )
    const before = JSON.stringify(reading.entries)
    const sections = sectionsFor(reading.entries, item.capture.baniDbId)
    expect(sections.length).toBeGreaterThan(0)
    const flattened = flattenBaniSections(sections)
    expect(new Set(flattened.map(section => section.id)).size).toBe(flattened.length)
    const rowPositions = new Map(lines.map((line, index) => [line.verseId, index]))
    const fingerprint = fingerprintBaniReading(reading.entries)
    const profile = BANI_SECTION_PROFILES.find(profile => profile.baniDbId === item.capture.baniDbId && profile.fingerprint === fingerprint)
    const validate = (siblings: readonly ResolvedBaniProfileSection[], lower: number, upper: number, depth: number,
      specs?: readonly BaniProfileSectionSpec[]) => {
      expect(depth).toBeLessThanOrEqual(2)
      if (specs) expect(siblings).toHaveLength(specs.length)
      let previousStart = lower - 1
      for (let index = 0; index < siblings.length; index += 1) {
        const section = siblings[index]
        const spec = specs?.[index]
        const entry = reading.entries[section.entryIndex]
        const target = entry?.lines?.[section.lineIndex]
        expect(target?.verseId).toBe(section.verseId)
        expect(section.verseId).toBeGreaterThan(0)
        expect(section.label.trim()).not.toBe('')
        expect(section.source).toBe(entry.sourceAttribution === 'unavailable' ? null : entry.source ?? null)
        expect(section.ang).toBe(target?.originalAng ?? null)
        const start = rowPositions.get(section.verseId)!
        const end = index + 1 < siblings.length ? rowPositions.get(siblings[index + 1].verseId)! : upper
        expect(start).toBeGreaterThan(previousStart)
        expect(start).toBeGreaterThanOrEqual(lower)
        expect(start).toBeLessThan(upper)
        expect(lines.slice(start, end).some(line => line.gurmukhi === section.excerpt)).toBe(true)
        if (spec) {
          expect(section.verseId).toBe(spec.startVerseId)
          const excerptPosition = rowPositions.get(spec.excerptVerseId ?? spec.startVerseId)!
          expect(excerptPosition).toBeGreaterThanOrEqual(start)
          expect(excerptPosition).toBeLessThan(end)
          expect(section.excerpt).toBe(lines[excerptPosition].gurmukhi)
          expect(section.children?.length ?? 0).toBe(spec.children?.length ?? 0)
        }
        expect(getCurrentBaniSectionPath(sections, section)).toContain(section)
        if (section.children?.length) validate(section.children, start, end, depth + 1, spec?.children)
        previousStart = start
      }
    }
    validate(sections, 0, lines.length, 1, profile?.sections)
    expect(JSON.stringify(reading.entries)).toBe(before)
  })

  it.each(cases)('$key falls back when its complete reading is truncated or attribution changes', item => {
    const id = item.capture.baniDbId
    const truncated = structuredClone(normalized.get(item.key)!.entries)
    truncated.at(-1)!.lines!.pop()
    expect(sectionsFor(truncated, id)).toEqual([])
    const changedSource = structuredClone(normalized.get(item.key)!.entries)
    changedSource[0].source = changedSource[0].source === 'G' ? 'D' : 'G'
    expect(sectionsFor(changedSource, id)).toEqual([])
    expect(getBaniSections(normalized.get(item.key)!.entries, { baniDbId: id, exactBani: false })).toEqual([])
  })

  it.each([9, 22])('resolves the extra-long alias to the verified long reading for bani %s', async id => {
    const capture = corpus.readings.find(reading => reading.baniDbId === id)!
    const alias = await replay(capture, 'extralong')
    const long = normalized.get(`${id}:long`)!
    expect(alias.resolvedLength).toBe('long')
    expect(isExactBaniReading(alias, id, 'extralong')).toBe(true)
    expect(fingerprintBaniReading(alias.entries)).toBe(fingerprintBaniReading(long.entries))
    expect(sectionsFor(alias.entries, id)).toEqual(sectionsFor(long.entries, id))
  })

  it('exports a new hierarchical browser manifest only when explicitly requested', () => {
    const manifest = cases.map(item => {
      const reading = normalized.get(item.key)!
      const catalogEntry = READ_EXACT_BANIS.find(bani => bani.baniDbId === item.capture.baniDbId)
      const sections = sectionsFor(reading.entries, item.capture.baniDbId)
      expect(sections.length).toBeGreaterThan(0)
      const baniName = catalogEntry?.name ?? (item.capture.baniDbId === 24 ? 'Ardaas' : item.capture.payload.baniInfo.english ?? item.capture.payload.baniInfo.unicode ?? '')
      const source = getBaniRouteSource(item.capture.baniDbId)
      const startAng = reading.entries[0].ang
      const endAng = reading.entries.at(-1)!.ang
      const params = new URLSearchParams({ baniDbId: String(item.capture.baniDbId), bani: baniName, startAng: String(startAng), endAng: String(endAng) })
      if (catalogEntry) params.set('baniId', catalogEntry.id)
      if (source) params.set('source', source)
      if (item.requestedLength) params.set('sgLength', item.requestedLength)
      const targets: Array<{
        targetIndex: number; path: number[]; sectionId: string; parentId: string | null
        targetId: number; startVerseId: number; kind: string; number?: number; label: string
        source: ResolvedBaniProfileSection['source']; ang: number | null
        targetText: string; excerpt: string; entryIndex: number; lineIndex: number
        expectedDeepestCurrentId: string; expectedCurrentPathIds: string[]
      }> = []
      type TreeNode = typeof targets[number] & { children?: TreeNode[] }
      const walk = (siblings: readonly ResolvedBaniProfileSection[], parentPath: number[], parentId: string | null): TreeNode[] => siblings.map((section, index) => {
        const path = [...parentPath, index]
        const currentPath = getCurrentBaniSectionPath(sections, section)
        const target = {
          targetIndex: targets.length,
          path,
          sectionId: section.id,
          parentId,
          targetId: section.verseId,
          startVerseId: section.verseId,
          kind: section.kind,
          ...(section.number === undefined ? {} : { number: section.number }),
          label: section.label,
          source: section.source,
          ang: section.ang,
          targetText: reading.entries[section.entryIndex].lines![section.lineIndex].gurmukhi,
          excerpt: section.excerpt,
          entryIndex: section.entryIndex,
          lineIndex: section.lineIndex,
          expectedDeepestCurrentId: currentPath.at(-1)!.id,
          expectedCurrentPathIds: currentPath.map(current => current.id),
        }
        expect(currentPath).toContain(section)
        targets.push(target)
        return {
          ...target,
          ...(section.children?.length ? { children: walk(section.children, path, section.id) } : {}),
        }
      })
      const tree = walk(sections, [], null)
      expect(targets.map(target => target.sectionId)).toEqual(flattenBaniSections(sections).map(section => section.id))
      expect(targets.map(target => target.targetIndex)).toEqual(Array.from({ length: targets.length }, (_, index) => index))
      expect(tree).toHaveLength(sections.length)
      for (const target of targets) {
        expect(target.path.length).toBeLessThanOrEqual(2)
        expect(target.parentId).toBe(target.path.length === 1 ? null : tree[target.path[0]].sectionId)
      }
      return {
        id: item.capture.baniDbId,
        baniName,
        ...(catalogEntry ? { baniId: catalogEntry.id } : {}),
        source,
        startAng,
        endAng,
        requestedlength: item.requestedLength,
        rows: reading.entries.reduce((count, entry) => count + (entry.lines?.length ?? 0), 0),
        rootSections: sections.length,
        childSections: targets.length - sections.length,
        sections: targets.length,
        fingerprint: fingerprintBaniReading(reading.entries),
        routeUrl: `/study?${params.toString()}`,
        tree,
        targets,
      }
    })
    expect(manifest).toHaveLength(114)
    const roots = manifest.reduce((count, item) => count + item.rootSections, 0)
    const children = manifest.reduce((count, item) => count + item.childSections, 0)
    const replacedBaselineRoots = historicalCases.filter(item => expectedFineCounts[item.id])
      .reduce((count, item) => count + item.sections, 0)
    expect(roots).toBe(2411 - replacedBaselineRoots + Object.values(expectedFineCounts).reduce((count, item) => count + item.roots, 0))
    expect(children).toBe(Object.values(expectedFineCounts).reduce((count, item) => count + item.children, 0))
    expect([roots, children, roots + children]).toEqual([2446, 395, 2841])
    expect(manifest.reduce((count, item) => count + item.targets.length, 0)).toBe(roots + children)
    if (process.env.GENERATE_BANI_FINE_BROWSER === '1') {
      writeFileSync('scripts/qa/fixtures/bani-fine-sections-browser-20261102.json', `${JSON.stringify(manifest, null, 2)}\n`)
    }
  })
})
