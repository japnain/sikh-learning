import type { ScriptureEntry, ScriptureLine } from '../types'
import { isStructuralGurbaniHeadingLine } from './readerDisplay'

/** Preview-only filtering: canonical reader lines and provider metadata are untouched. */
export function getHukamnamaPreviewLine(entry: ScriptureEntry, source: string): ScriptureLine | undefined {
  return entry.lines?.find(line => {
    if (line.isHeader || !line.gurmukhi.trim()) return false
    if (isStructuralGurbaniHeadingLine(line.gurmukhi)) return false
    const text = line.gurmukhi.normalize('NFC').replace(/[।॥|]+/gu, ' ').replace(/\s+/gu, ' ').trim()
    if (/^ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ$/u.test(text)) return false
    // BaniDB occasionally omits header metadata for SGGS named-Bhagat titles.
    // Match the complete raag/author/title form, never a word within a verse.
    if (source === 'G' && /^(?:ਰਾਗੁ?\s+)?[\u0A00-\u0A7F]+(?:\s+[\u0A00-\u0A7F]+)?\s+ਭਗਤ\s+[\u0A00-\u0A7F]+(?:\s+[\u0A00-\u0A7F]+){0,2}\s+ਜੀ\s+ਕੀ$/u.test(text)) return false
    return true
  })
}
