import type { Scripture, ScriptureEntry } from '../types'
import sarblohData from './sarbloh-granth.json'

// Sarbloh Granth is not in BaniDB — bundled statically
export const SARBLOH_ENTRIES: ScriptureEntry[] = sarblohData as ScriptureEntry[]

// Legacy ALL_ENTRIES — only Sarbloh now. SGGS/DG come from BaniDB.
export const ALL_ENTRIES: ScriptureEntry[] = SARBLOH_ENTRIES

export const SCRIPTURES: Scripture[] = [
  { id: 'sggs', name: 'Sri Guru Granth Sahib Ji', shortName: 'SGGS' },
  { id: 'dasam-granth', name: 'Dasam Granth', shortName: 'DG' },
  { id: 'sarbloh-granth', name: 'Sarbloh Granth', shortName: 'SG' },
]

export function getEntriesByScripture(scriptureId: string): ScriptureEntry[] {
  return ALL_ENTRIES.filter(e => e.scripture.toLowerCase() === scriptureId.toLowerCase())
}
