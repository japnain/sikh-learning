import { JAPJI_PAURI_ANCHORS, JAPJI_REVIEWED_READING_FINGERPRINT } from '../content/japjiSections'
import { getReviewedBaniProfiles } from '../content/baniSections'
import type { ResolvedBaniProfileSection } from '../content/baniSections/profileTypes'
import type { ScriptureEntry, ScriptureLine, UiLocale } from '../types'
import { fingerprintBaniReading, resolveBaniSectionProfiles } from './baniSectionProfiles'

export type BaniSection = ResolvedBaniProfileSection

export interface BaniSectionsOptions {
  baniId?: string | null
  baniDbId?: number | null
  exactBani: boolean
  locale?: UiLocale
}

interface LocatedLine {
  entryIndex: number
  lineIndex: number
  line: ScriptureLine
  text: string
}

const comparisonText = (text: string) => text.normalize('NFC').replace(/\s+/gu, ' ').trim()
const beginsWith = (text: string, prefix: string) => text === prefix || text.startsWith(`${prefix} `) || text.startsWith(`${prefix}॥`)
const gurmukhiNumber = (number: number) => String(number).replace(/\d/g, digit => '੦੧੨੩੪੫੬੭੮੯'[Number(digit)])

/**
 * All-or-nothing Contents for complete reviewed BaniDB readings.
 *
 * Every bani requires a complete ordered reading fingerprint. Japji additionally
 * retains its independently checked opening/conclusion contract below.
 * This is not a generic punctuation parser. Every Japji pauri has an independently
 * checked opening and Ang; its numbered conclusion must occur exactly once
 * before the next checked opening. Missing, duplicated, reordered or unfamiliar
 * readings retain the ordinary source-page index. No scripture is rewritten.
 */
export function getBaniSections(entries: readonly ScriptureEntry[], options: BaniSectionsOptions): BaniSection[] {
  if (!options.exactBani || options.baniDbId == null || entries.length === 0) return []
  if (options.baniDbId !== 2) {
    return resolveBaniSectionProfiles(entries, getReviewedBaniProfiles(options.baniDbId, options.baniId), options.locale)
  }
  if (options.baniId != null && options.baniId !== 'japji-sahib') return []
  if (entries.some(entry => {
    if (!entry.lines?.length || (entry.source !== undefined && entry.source !== 'G')) return true
    // BaniDB may place a synthetic title in its own zero-ID group without
    // source metadata. Its neighbouring scripture must still be attributed.
    // These display-only rows remain in the index offsets but cannot be anchors.
    const syntheticHeadingOnly = entry.lines.every(line => line.isHeader === true && line.verseId === 0)
    return !syntheticHeadingOnly && (entry.source !== 'G' || entry.sourceAttribution === 'unavailable')
  })) return []

  const lines: LocatedLine[] = entries.flatMap((entry, entryIndex) => entry.lines!.map((line, lineIndex) => ({
    entryIndex, lineIndex, line, text: comparisonText(line.gurmukhi),
  })))
  if (lines.some(({ line }) => !Number.isInteger(line.ang) || line.ang < 1 || line.ang > 8)) return []
  if (lines[0].line.ang !== 1 || lines.at(-1)!.line.ang !== 8) return []
  // Synthetic provider headings may have zero IDs. Actual scripture anchors
  // need positive, unambiguous IDs within this reading; jumps use entry/line
  // coordinates rather than treating bani-local IDs as global verse links.
  const positiveIds = lines.filter(({ line }) => line.verseId > 0).map(({ line }) => line.verseId)
  if (new Set(positiveIds).size !== positiveIds.length) return []

  // Attribution and displayed-page validity have already been checked above.
  // Exclude only zero-ID display headings; every positive scripture/header row
  // remains in the full ordered fingerprint, including unnumbered interior text.
  // Keep the original entries/indices for jumps and never rewrite source text.
  const fingerprintEntries = entries.map(entry => ({
    ...entry,
    lines: entry.lines!.filter(line => !(line.isHeader === true && line.verseId === 0)),
  })).filter(entry => entry.lines.length > 0)
  if (fingerprintBaniReading(fingerprintEntries) !== JAPJI_REVIEWED_READING_FINGERPRINT) return []

  const checked = [
    { kind: 'opening-salok' as const, number: undefined, ang: 1, prefix: 'ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ' },
    ...JAPJI_PAURI_ANCHORS.map(anchor => ({ ...anchor, kind: 'pauri' as const })),
    { kind: 'closing-salok' as const, number: undefined, ang: 8, prefix: 'ਪਵਣੁ ਗੁਰੂ ਪਾਣੀ ਪਿਤਾ' },
  ]
  const positions: number[] = []
  for (const anchor of checked) {
    const matches = lines.map((item, index) => beginsWith(item.text, anchor.prefix) ? index : -1).filter(index => index >= 0)
    if (matches.length !== 1) return []
    const position = matches[0]
    const { line } = lines[position]
    // The live /banis response omits shabadId. Contents jumps use the loaded
    // entry/line position; a shabad lookup is neither supplied nor required.
    if (line.ang !== anchor.ang || !Number.isInteger(line.verseId) || line.verseId <= 0
      || position <= (positions.at(-1) ?? -1)) return []
    positions.push(position)
  }

  for (let index = 0; index < checked.length; index += 1) {
    const anchor = checked[index]
    const start = positions[index]
    const end = positions[index + 1] ?? lines.length
    const numberedLines = lines.slice(start, end).filter(item => /॥\s*[੦-੯]+\s*॥/u.test(item.text))
    // Each salok is numbered 1; the 38 pauris have their own complete sequence.
    const expected = gurmukhiNumber(anchor.number ?? 1)
    if (numberedLines.length !== 1) return []
    const numbers = [...numberedLines[0].text.matchAll(/॥\s*([੦-੯]+)\s*॥/gu)]
    if (numbers.length !== 1 || numbers[0][1] !== expected || !numberedLines[0].text.endsWith('॥')) return []
    // A combined/partial verse must not conceal text after a section marker.
    if (!new RegExp(`॥\\s*${expected}\\s*॥$`, 'u').test(numberedLines[0].text)) return []
    const tail = lines.slice(lines.indexOf(numberedLines[0]) + 1, end)
    if (tail.some(item => !item.line.isHeader && item.text !== 'ਸਲੋਕੁ ॥')) return []
  }

  const locale = options.locale ?? 'en'
  const labels = {
    en: { opening: 'Opening salok', closing: 'Closing salok', pauri: 'Pauri' },
    pa: { opening: 'ਆਰੰਭਕ ਸਲੋਕ', closing: 'ਅੰਤਿਮ ਸਲੋਕ', pauri: 'ਪਉੜੀ' },
    hi: { opening: 'आरंभिक सलोक', closing: 'अंतिम सलोक', pauri: 'पउड़ी' },
  }[locale]
  return checked.map((anchor, index) => {
    const { line, entryIndex, lineIndex } = lines[positions[index]]
    return {
      id: `japji-${anchor.kind}-${anchor.number ?? ''}`,
      kind: anchor.kind,
      number: anchor.number,
      label: anchor.kind === 'pauri' ? `${labels.pauri} ${anchor.number}`
        : anchor.kind === 'opening-salok' ? labels.opening : labels.closing,
      entryIndex, lineIndex, source: 'G', verseId: line.verseId, ang: line.ang, excerpt: line.gurmukhi,
    }
  })
}
