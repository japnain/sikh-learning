import type { ScriptureEntry } from '../types'
import { SOURCE_READER_META } from './sourceReaderMeta'

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getDailyPick(entries: ScriptureEntry[], date: Date = new Date()): ScriptureEntry {
  if (entries.length === 0) throw new Error('No entries provided')
  const index = dayOfYear(date) % entries.length
  return entries[index]
}

export const SGGS_ANG_COUNT = SOURCE_READER_META.G.max
export const DG_ANG_COUNT = SOURCE_READER_META.D.max

type BaniSource = 'G' | 'D'

export function getDailyPickAng(date: Date = new Date()): { source: BaniSource; ang: number } {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const dayOfYearVal = Math.floor(diff / 86400000)
  if (dayOfYearVal % 2 === 0) {
    return { source: 'G', ang: (dayOfYearVal % SGGS_ANG_COUNT) + 1 }
  }
  return { source: 'D', ang: (dayOfYearVal % DG_ANG_COUNT) + 1 }
}
