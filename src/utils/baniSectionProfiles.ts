import type { BaniProfileSectionSpec, BaniSectionProfile, ResolvedBaniProfileSection } from '../content/baniSections/profileTypes'
import type { ScriptureEntry, ScriptureLine, UiLocale } from '../types'

interface LocatedLine {
  entry: ScriptureEntry
  line: ScriptureLine
  entryIndex: number
  lineIndex: number
}

const locateLines = (entries: readonly ScriptureEntry[]): LocatedLine[] => entries.flatMap((entry, entryIndex) =>
  (entry.lines ?? []).map((line, lineIndex) => ({ entry, line, entryIndex, lineIndex })),
)

/**
 * Version 1 canonical serialization is JSON.stringify of ordered row tuples:
 * [verseId, originalAng ?? null, gurmukhi, isHeader === true ? 1 : 0,
 *  headerLevel ?? null, entry.source ?? null, entry.sourceAttribution ?? null].
 *
 * Preserve the exact normalized reader text (including Unicode ordering). Do not
 * include entry IDs, shabad IDs, translations, display pages, or appearance.
 * Both FNV-1a accumulators consume UTF-16 code units, modulo 2^32, with seeds
 * 0x811c9dc5 and 0x9e3779b9 and prime 0x01000193. This is a deterministic content
 * identity guard, NOT a cryptographic integrity or authenticity guarantee.
 */
function fingerprintLocatedLines(lines: readonly LocatedLine[]): string {
  const serialized = JSON.stringify(lines.map(({ entry, line }) => [
    line.verseId, line.originalAng ?? null, line.gurmukhi, line.isHeader === true ? 1 : 0,
    line.headerLevel ?? null, entry.source ?? null, entry.sourceAttribution ?? null,
  ]))
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < serialized.length; index += 1) {
    const codeUnit = serialized.charCodeAt(index)
    first = Math.imul(first ^ codeUnit, 0x01000193)
    second = Math.imul(second ^ codeUnit, 0x01000193)
  }
  const hex = (value: number) => (value >>> 0).toString(16).padStart(8, '0')
  return `bani-v1:${lines.length}:${hex(first)}${hex(second)}`
}

/** Shared by offline profile generators and the runtime resolver. No DOM work. */
export function fingerprintBaniReading(entries: readonly ScriptureEntry[]): string {
  return fingerprintLocatedLines(locateLines(entries))
}

const kindLabels: Record<string, Readonly<Record<UiLocale, string>>> = {
  'opening-salok': { en: 'Opening salok', pa: 'ਆਰੰਭਕ ਸਲੋਕ', hi: 'आरंभिक सलोक' },
  'closing-salok': { en: 'Closing salok', pa: 'ਅੰਤਿਮ ਸਲੋਕ', hi: 'अंतिम सलोक' },
  salok: { en: 'Salok', pa: 'ਸਲੋਕ', hi: 'सलोक' },
  pauri: { en: 'Pauri', pa: 'ਪਉੜੀ', hi: 'पउड़ी' },
  ashtpadi: { en: 'Ashtpadi', pa: 'ਅਸ਼ਟਪਦੀ', hi: 'अष्टपदी' },
  stanza: { en: 'Stanza', pa: 'ਪਦ', hi: 'पद' },
  shabad: { en: 'Shabad', pa: 'ਸ਼ਬਦ', hi: 'शबद' },
  chhand: { en: 'Chhand', pa: 'ਛੰਦ', hi: 'छंद' },
  savaiyya: { en: 'Savaiyya', pa: 'ਸਵੈਯਾ', hi: 'सवैया' },
  composition: { en: 'Composition', pa: 'ਰਚਨਾ', hi: 'रचना' },
  month: { en: 'Month', pa: 'ਮਹੀਨਾ', hi: 'महीना' },
  letter: { en: 'Letter', pa: 'ਅੱਖਰ', hi: 'अक्षर' },
  'provider-heading': { en: 'Heading', pa: 'ਸਿਰਲੇਖ', hi: 'शीर्षक' },
  section: { en: 'Section', pa: 'ਭਾਗ', hi: 'भाग' },
}

/**
 * Select one exact reviewed profile and resolve only loaded targets. Call once
 * from the reader's payload/variant memo; this performs one fingerprint pass,
 * never a scroll-driven scan. The caller scopes profiles to the route's bani ID.
 * Supports roots plus one child level; any invalid descendant rejects the profile.
 */
export function resolveBaniSectionProfiles(
  entries: readonly ScriptureEntry[],
  profiles: readonly BaniSectionProfile[],
  locale: UiLocale = 'en',
): ResolvedBaniProfileSection[] {
  if (entries.length === 0 || profiles.length === 0 || entries.some(entry => !entry.lines?.length)) return []
  const lines = locateLines(entries)
  const fingerprint = fingerprintLocatedLines(lines)
  const matches = profiles.filter(profile => profile.fingerprint === fingerprint)
  if (matches.length !== 1) return []
  const profile = matches[0]
  if (!Number.isInteger(profile.baniDbId) || profile.baniDbId <= 0 || profile.sections.length === 0) return []

  const positions = new Map<number, number>()
  for (let index = 0; index < lines.length; index += 1) {
    const verseId = lines[index].line.verseId
    if (!Number.isInteger(verseId) || verseId < 0) return []
    // Zero-ID display headings may remain in the reading, but never be anchors.
    if (verseId === 0) continue
    if (positions.has(verseId)) return []
    positions.set(verseId, index)
  }

  const ids = new Set<string>()
  const resolveLevel = (
    sections: readonly BaniProfileSectionSpec[], lower: number, upper: number, depth: number,
  ): ResolvedBaniProfileSection[] | null => {
    if (depth > 2) return null
    const starts: number[] = []
    for (const section of sections) {
      if (!section.id.trim() || ids.has(section.id) || !section.kind.trim()
        || (section.number !== undefined && (!Number.isInteger(section.number) || section.number < 1))) return null
      if (section.label && (['en', 'pa', 'hi'] as const).some(locale => !section.label?.[locale]?.trim())) return null
      if (section.children !== undefined && !Array.isArray(section.children)) return null
      const start = positions.get(section.startVerseId)
      // Equality is valid across parent/child levels, never between siblings.
      if (start === undefined || start < lower || start >= upper || start <= (starts.at(-1) ?? lower - 1)) return null
      ids.add(section.id)
      starts.push(start)
    }

    const resolved: ResolvedBaniProfileSection[] = []
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index]
      const start = starts[index]
      const end = starts[index + 1] ?? upper
      const excerptPosition = positions.get(section.excerptVerseId ?? section.startVerseId)
      // A parent's excerpt uses its full interval, independently of its children.
      if (excerptPosition === undefined || excerptPosition < start || excerptPosition >= end) return null
      const target = lines[start]
      const excerpt = lines[excerptPosition].line.gurmukhi
      if (!excerpt.trim()) return null
      const children = section.children?.length ? resolveLevel(section.children, start, end, depth + 1) : []
      if (children === null) return null
      const baseLabel = (Object.hasOwn(kindLabels, section.kind) ? kindLabels[section.kind] : kindLabels.section)[locale]
      const label = section.label?.[locale] ?? `${baseLabel}${section.number === undefined ? '' : ` ${section.number}`}`
      const originalAng = target.line.originalAng
      resolved.push({
        id: `bani-${profile.baniDbId}:${profile.fingerprint}:${section.id}`,
        kind: section.kind,
        number: section.number,
        label,
        entryIndex: target.entryIndex,
        lineIndex: target.lineIndex,
        source: target.entry.sourceAttribution === 'unavailable' ? null : target.entry.source ?? null,
        verseId: target.line.verseId,
        ang: typeof originalAng === 'number' && Number.isFinite(originalAng) && originalAng > 0 ? originalAng : null,
        excerpt,
        ...(children.length > 0 ? { children } : {}),
      })
    }
    return resolved
  }
  return resolveLevel(profile.sections, 0, lines.length, 1) ?? []
}

export function resolveBaniSectionProfile(
  entries: readonly ScriptureEntry[],
  profile: BaniSectionProfile,
  locale: UiLocale = 'en',
): ResolvedBaniProfileSection[] {
  return resolveBaniSectionProfiles(entries, [profile], locale)
}

/** Preorder targets, retaining parents and original node identities. Memoize per tree. */
export function flattenBaniSections(sections: readonly ResolvedBaniProfileSection[]): ResolvedBaniProfileSection[] {
  const flattened: ResolvedBaniProfileSection[] = []
  for (const section of sections) {
    flattened.push(section)
    if (section.children?.length) flattened.push(...flattenBaniSections(section.children))
  }
  return flattened
}

/**
 * Ancestors followed by the deepest current section, using loaded coordinates.
 * A parent remains current before its first child; tied starts select the child.
 * This is an explicit Contents calculation, not a scroll listener or DOM scan.
 */
export function getCurrentBaniSectionPath(
  sections: readonly ResolvedBaniProfileSection[],
  position: Pick<ResolvedBaniProfileSection, 'entryIndex' | 'lineIndex'>,
): ResolvedBaniProfileSection[] {
  if (!Number.isInteger(position.entryIndex) || position.entryIndex < 0
    || !Number.isInteger(position.lineIndex) || position.lineIndex < 0) return []
  const current = sections.findLast(section => section.entryIndex < position.entryIndex
    || (section.entryIndex === position.entryIndex && section.lineIndex <= position.lineIndex))
  if (!current) return []
  return [current, ...getCurrentBaniSectionPath(current.children ?? [], position)]
}
