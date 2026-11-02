import { describe, expect, it } from 'vitest'
import type { BaniProfileSectionSpec, BaniSectionProfile } from '../content/baniSections/profileTypes'
import type { ScriptureEntry, ScriptureLine } from '../types'
import { fingerprintBaniReading, flattenBaniSections, getCurrentBaniSectionPath, resolveBaniSectionProfile, resolveBaniSectionProfiles } from './baniSectionProfiles'

function reading(): ScriptureEntry[] {
  const line = (verseId: number, gurmukhi: string, originalAng: number | null, headerLevel?: number): ScriptureLine => ({
    verseId, gurmukhi, originalAng, ang: originalAng ?? 2, isHeader: headerLevel !== undefined, headerLevel,
    shabadId: 0, transliteration: '', translation_en: '', translations_en: {}, translation_hi: '', translation_pa: '',
  })
  const entry = (id: string, lines: ScriptureLine[], unknown = false): ScriptureEntry => ({
    id, source: 'G', sourceAttribution: unknown ? 'unavailable' : undefined,
    scripture: unknown ? 'Sundar Gutka' : 'SGGS', ang: lines[0].ang, lines,
    gurmukhi: '', transliteration: '', translation_en: '', translation_hi: '', translation_pa: '', words: [],
  })
  return [
    entry('bani-31-1-0', [line(11, 'ਸਲੋਕੁ ॥', 1, 2), line(12, 'ਆਦਿ ਸਚੁ ॥', 1), line(13, 'ਜੁਗਾਦਿ ਸਚੁ ॥੧॥', 1)]),
    entry('bani-31-2-0', [line(21, 'ਸਲੋਕੁ ॥', null, 2), line(22, 'ਪਵਣੁ ਗੁਰੂ ॥', 2), line(23, 'ਪਾਣੀ ਪਿਤਾ ॥੧॥', 2)], true),
  ]
}

const profileFor = (entries: ScriptureEntry[]): BaniSectionProfile => ({
  baniDbId: 31,
  fingerprint: fingerprintBaniReading(entries),
  sections: [
    { id: 'unit-1', kind: 'ashtpadi', number: 1, startVerseId: 11, excerptVerseId: 12 },
    { id: 'unit-2', kind: 'ashtpadi', number: 2, startVerseId: 21, excerptVerseId: 22 },
  ],
})

const hierarchicalProfileFor = (entries: ScriptureEntry[]): BaniSectionProfile => ({
  ...profileFor(entries),
  sections: [
    { id: 'unit-1', kind: 'ashtpadi', number: 1, startVerseId: 11, excerptVerseId: 13, children: [
      { id: 'unit-1-stanza-1', kind: 'stanza', number: 1, startVerseId: 11, excerptVerseId: 12 },
      { id: 'unit-1-stanza-2', kind: 'stanza', number: 2, startVerseId: 13 },
    ] },
    { id: 'unit-2', kind: 'ashtpadi', number: 2, startVerseId: 21, excerptVerseId: 22, children: [
      { id: 'unit-2-stanza-1', kind: 'stanza', number: 1, startVerseId: 22 },
      { id: 'unit-2-stanza-2', kind: 'stanza', number: 2, startVerseId: 23 },
    ] },
  ],
})

describe('reviewed bani profile resolver', () => {
  it('keeps version 1 serialization stable for independently generated profiles', () => {
    expect(fingerprintBaniReading(reading())).toBe('bani-v1:6:85a5279063e778e4')
  })

  it('keeps heading targets and body excerpts separate, including unknown source and original page', () => {
    const entries = reading()
    const snapshot = JSON.stringify(entries)
    const profile = profileFor(entries)
    const sections = resolveBaniSectionProfile(entries, profile)
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({
      kind: 'ashtpadi', number: 1, label: 'Ashtpadi 1', source: 'G', ang: 1,
      verseId: 11, entryIndex: 0, lineIndex: 0, excerpt: 'ਆਦਿ ਸਚੁ ॥',
    })
    expect(sections[1]).toMatchObject({
      label: 'Ashtpadi 2', source: null, ang: null,
      verseId: 21, entryIndex: 1, lineIndex: 0, excerpt: 'ਪਵਣੁ ਗੁਰੂ ॥',
    })
    for (const section of sections) {
      expect(entries[section.entryIndex].lines![section.lineIndex].verseId).toBe(section.verseId)
      expect(section.id).toContain(`bani-31:${profile.fingerprint}:`)
    }
    expect(JSON.stringify(entries)).toBe(snapshot)
  })

  it('selects only the exact reading variant and rejects ambiguous registry matches', () => {
    const entries = reading()
    const profile = profileFor(entries)
    const unfamiliar = { ...profile, fingerprint: 'bani-v1:6:unreviewed' }
    expect(resolveBaniSectionProfiles(entries, [unfamiliar, profile])).toHaveLength(2)
    expect(resolveBaniSectionProfiles(entries, [unfamiliar])).toEqual([])
    expect(resolveBaniSectionProfiles(entries, [profile, profile])).toEqual([])
    expect(resolveBaniSectionProfiles(entries, [])).toEqual([])
    expect(resolveBaniSectionProfile([], profile)).toEqual([])
  })

  it.each(['truncated', 'text', 'order', 'original-page', 'header-kind', 'header-level', 'source', 'attribution'])(
    'falls back for an unreviewed %s change instead of returning partial sections', change => {
      const entries = reading()
      const profile = profileFor(entries)
      const first = entries[0].lines!
      if (change === 'truncated') entries[1].lines!.pop()
      if (change === 'text') first[1].gurmukhi += ' '
      if (change === 'order') [first[1], first[2]] = [first[2], first[1]]
      if (change === 'original-page') first[1].originalAng = 2
      if (change === 'header-kind') first[0].isHeader = false
      if (change === 'header-level') first[0].headerLevel = 1
      if (change === 'source') entries[0].source = 'D'
      if (change === 'attribution') entries[0].sourceAttribution = 'unavailable'
      expect(resolveBaniSectionProfile(entries, profile)).toEqual([])
    },
  )

  it.each(['missing-target', 'zero-target', 'missing-excerpt', 'excerpt-before', 'excerpt-next-section', 'reordered-starts', 'duplicate-start', 'duplicate-section-id', 'empty-kind', 'invalid-number'])(
    'rejects a malformed reviewed profile: %s', fault => {
      const entries = reading()
      const profile = profileFor(entries)
      const sections = profile.sections.map(section => ({ ...section }))
      if (fault === 'missing-target') sections[0].startVerseId = 999
      if (fault === 'zero-target') sections[0].startVerseId = 0
      if (fault === 'missing-excerpt') sections[0].excerptVerseId = 999
      if (fault === 'excerpt-before') sections[1].excerptVerseId = 13
      if (fault === 'excerpt-next-section') sections[0].excerptVerseId = 21
      if (fault === 'reordered-starts') sections.reverse()
      if (fault === 'duplicate-start') sections[1].startVerseId = 11
      if (fault === 'duplicate-section-id') sections[1].id = sections[0].id
      if (fault === 'empty-kind') sections[0].kind = ' '
      if (fault === 'invalid-number') sections[0].number = 0
      expect(resolveBaniSectionProfile(entries, { ...profile, sections })).toEqual([])
    },
  )

  it('rejects duplicate local IDs even when a profile fingerprint was generated from that malformed reading', () => {
    const entries = reading()
    entries[0].lines![2].verseId = 12
    expect(resolveBaniSectionProfile(entries, profileFor(entries))).toEqual([])
  })

  it('retains zero-ID synthetic display rows without allowing them to become navigation targets', () => {
    const entries = reading()
    entries[0].lines!.unshift({ ...entries[0].lines![0], verseId: 0, gurmukhi: 'ਸਿਰਲੇਖ' })
    const profile = profileFor(entries)
    const sections = resolveBaniSectionProfile(entries, profile)
    expect(sections).toHaveLength(2)
    expect(sections[0].lineIndex).toBe(1)
    expect(entries[0].lines![0].verseId).toBe(0)
  })

  it('uses explicit translated labels verbatim and localizes only generated navigation labels', () => {
    const entries = reading()
    const profile = profileFor(entries)
    const sections = profile.sections.map(section => ({ ...section }))
    sections[0].label = { en: 'First unit · 1–8', pa: 'ਪਹਿਲਾ ਭਾਗ', hi: 'पहला भाग' }
    expect(resolveBaniSectionProfile(entries, { ...profile, sections })[0].label).toBe('First unit · 1–8')
    expect(resolveBaniSectionProfile(entries, { ...profile, sections }, 'pa')[0].label).toBe('ਪਹਿਲਾ ਭਾਗ')
    expect(resolveBaniSectionProfile(entries, profile, 'hi')[1].label).toBe('अष्टपदी 2')
    expect(resolveBaniSectionProfile(entries, profile, 'pa')[1].excerpt).toBe('ਪਵਣੁ ਗੁਰੂ ॥')
  })

  it('ignores translation, display-page, shabad, and entry-ID changes but resolves the current coordinates', () => {
    const entries = reading()
    const profile = profileFor(entries)
    entries[0].id = 'regrouped-entry'
    entries[0].lines!.forEach(line => {
      line.translation_en = 'A different translation'
      line.shabadId = 99
      line.ang = 999
    })
    expect(fingerprintBaniReading(entries)).toBe(profile.fingerprint)
    expect(resolveBaniSectionProfile(entries, profile)[0]).toMatchObject({ entryIndex: 0, lineIndex: 0, ang: 1 })
  })

  it('resolves child targets and excerpts without narrowing the parent excerpt range or mutating source', () => {
    const entries = reading()
    const profile = hierarchicalProfileFor(entries)
    const snapshot = JSON.stringify({ entries, profile })
    const sections = resolveBaniSectionProfile(entries, profile, 'hi')
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({ verseId: 11, excerpt: 'ਜੁਗਾਦਿ ਸਚੁ ॥੧॥' })
    expect(sections[0].children).toHaveLength(2)
    expect(sections[0].children![0]).toMatchObject({ verseId: 11, entryIndex: 0, lineIndex: 0, label: 'पद 1', excerpt: 'ਆਦਿ ਸਚੁ ॥' })
    expect(sections[0].children![1]).toMatchObject({ verseId: 13, entryIndex: 0, lineIndex: 2, label: 'पद 2' })
    expect(sections[1].children![0]).toMatchObject({ verseId: 22, source: null, ang: 2, entryIndex: 1, lineIndex: 1 })
    const flattened = flattenBaniSections(sections)
    expect(flattened.map(section => section.verseId)).toEqual([11, 11, 13, 21, 22, 23])
    expect(new Set(flattened.map(section => section.id)).size).toBe(6)
    for (const section of flattened) {
      expect(entries[section.entryIndex].lines![section.lineIndex].verseId).toBe(section.verseId)
      expect(section.id).toContain(`bani-31:${profile.fingerprint}:`)
    }
    expect(JSON.stringify({ entries, profile })).toBe(snapshot)
  })

  it('omits children on existing flat profiles and empty child lists', () => {
    const entries = reading()
    const profile = profileFor(entries)
    const flat = resolveBaniSectionProfile(entries, profile)
    expect(flat.every(section => !Object.hasOwn(section, 'children'))).toBe(true)
    expect(resolveBaniSectionProfile(entries, {
      ...profile, sections: profile.sections.map(section => ({ ...section, children: [] })),
    })).toEqual(flat)
    const nested = resolveBaniSectionProfile(entries, hierarchicalProfileFor(entries))
    expect(nested.flatMap(section => section.children ?? []).every(section => !Object.hasOwn(section, 'children'))).toBe(true)
  })

  it.each([
    'before-parent', 'at-next-parent', 'beyond-parent', 'missing-start', 'zero-start',
    'duplicate-sibling-start', 'reordered-siblings', 'excerpt-before-child', 'excerpt-at-next-child',
    'excerpt-at-next-parent', 'missing-excerpt', 'duplicate-parent-id', 'duplicate-other-parent-id',
    'duplicate-across-branches', 'empty-id', 'empty-kind', 'invalid-number', 'incomplete-label',
    'grandchild', 'non-array-children', 'parent-excerpt-next-parent',
  ])('rejects the entire hierarchy for an invalid descendant or parent: %s', fault => {
    const entries = reading()
    const profile = hierarchicalProfileFor(entries)
    const sections = profile.sections as BaniProfileSectionSpec[]
    const first = sections[0].children as BaniProfileSectionSpec[]
    const second = sections[1].children as BaniProfileSectionSpec[]
    if (fault === 'before-parent') second[0].startVerseId = 13
    if (fault === 'at-next-parent') first[1].startVerseId = 21
    if (fault === 'beyond-parent') first[1].startVerseId = 22
    if (fault === 'missing-start') first[0].startVerseId = 999
    if (fault === 'zero-start') first[0].startVerseId = 0
    if (fault === 'duplicate-sibling-start') first[1].startVerseId = 11
    if (fault === 'reordered-siblings') first.reverse()
    if (fault === 'excerpt-before-child') first[1].excerptVerseId = 12
    if (fault === 'excerpt-at-next-child') first[0].excerptVerseId = 13
    if (fault === 'excerpt-at-next-parent') first[1].excerptVerseId = 21
    if (fault === 'missing-excerpt') first[1].excerptVerseId = 999
    if (fault === 'duplicate-parent-id') first[0].id = sections[0].id
    if (fault === 'duplicate-other-parent-id') first[0].id = sections[1].id
    if (fault === 'duplicate-across-branches') second[0].id = first[0].id
    if (fault === 'empty-id') first[0].id = ' '
    if (fault === 'empty-kind') first[0].kind = ' '
    if (fault === 'invalid-number') first[0].number = 0
    if (fault === 'incomplete-label') first[0].label = { en: 'Stanza', pa: '', hi: 'पद' }
    if (fault === 'grandchild') first[0].children = [{ id: 'too-deep', kind: 'section', startVerseId: 11 }]
    if (fault === 'non-array-children') first[0].children = {} as BaniProfileSectionSpec[]
    if (fault === 'parent-excerpt-next-parent') sections[0].excerptVerseId = 21
    expect(resolveBaniSectionProfile(entries, profile)).toEqual([])
  })

  it('retains the full reading fingerprint guard when child metadata is present', () => {
    const entries = reading()
    const profile = hierarchicalProfileFor(entries)
    entries[1].lines!.pop()
    expect(resolveBaniSectionProfile(entries, profile)).toEqual([])
  })

  it('flattens in preorder without cloning nodes or changing the tree', () => {
    const entries = reading()
    const sections = resolveBaniSectionProfile(entries, hierarchicalProfileFor(entries))
    const snapshot = JSON.stringify(sections)
    const flattened = flattenBaniSections(sections)
    expect(flattened).toEqual([sections[0], ...sections[0].children!, sections[1], ...sections[1].children!])
    expect(flattened[1]).toBe(sections[0].children![0])
    expect(JSON.stringify(sections)).toBe(snapshot)
    expect(flattenBaniSections([])).toEqual([])
  })

  it('finds the deepest current path within its parent bounds and handles tied starts', () => {
    const entries = reading()
    const sections = resolveBaniSectionProfile(entries, hierarchicalProfileFor(entries))
    const pathAt = (entryIndex: number, lineIndex: number) => getCurrentBaniSectionPath(sections, { entryIndex, lineIndex })
    expect(pathAt(0, 0)).toEqual([sections[0], sections[0].children![0]])
    expect(pathAt(0, 1)).toEqual([sections[0], sections[0].children![0]])
    expect(pathAt(0, 2)).toEqual([sections[0], sections[0].children![1]])
    // The first child's start is later than its parent: its opening stays a parent-only path.
    expect(pathAt(1, 0)).toEqual([sections[1]])
    expect(pathAt(1, 1)).toEqual([sections[1], sections[1].children![0]])
    expect(pathAt(1, 2)).toEqual([sections[1], sections[1].children![1]])
    expect(pathAt(1, 1)[0]).toBe(sections[1])
    expect(getCurrentBaniSectionPath(sections.slice(1), { entryIndex: 0, lineIndex: 2 })).toEqual([])
    expect(getCurrentBaniSectionPath([], { entryIndex: 0, lineIndex: 0 })).toEqual([])
    expect(getCurrentBaniSectionPath(resolveBaniSectionProfile(entries, profileFor(entries)), {
      entryIndex: 1, lineIndex: 1,
    })).toHaveLength(1)
  })

  it.each([
    { entryIndex: -1, lineIndex: 0 }, { entryIndex: 0, lineIndex: -1 },
    { entryIndex: .5, lineIndex: 0 }, { entryIndex: 0, lineIndex: .5 },
    { entryIndex: NaN, lineIndex: 0 }, { entryIndex: 0, lineIndex: Infinity },
  ])('rejects invalid current coordinates: %j', position => {
    const entries = reading()
    expect(getCurrentBaniSectionPath(resolveBaniSectionProfile(entries, hierarchicalProfileFor(entries)), position)).toEqual([])
  })
})
