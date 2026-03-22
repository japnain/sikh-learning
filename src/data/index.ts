import sggsData from './sggs.json'
import dasamData from './dasam-granth.json'
import sarblohData from './sarbloh-granth.json'
import type { ScriptureEntry, Scripture } from '../types'

export const SCRIPTURES: Scripture[] = [
  { id: 'sggs', name: 'Sri Guru Granth Sahib Ji', shortName: 'SGGS' },
  { id: 'dasam-granth', name: 'Dasam Granth', shortName: 'DG' },
  { id: 'sarbloh-granth', name: 'Sarbloh Granth', shortName: 'SG' },
]

export const ALL_ENTRIES: ScriptureEntry[] = [
  ...(sggsData as ScriptureEntry[]),
  ...(dasamData as ScriptureEntry[]),
  ...(sarblohData as ScriptureEntry[]),
]

export function getEntriesByScripture(scriptureId: string): ScriptureEntry[] {
  const scripture = SCRIPTURES.find(s => s.id === scriptureId)
  if (!scripture) return []
  return ALL_ENTRIES.filter(
    e => e.scripture.toUpperCase().trim() === scripture.shortName.toUpperCase().trim()
  )
}
