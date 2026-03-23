import type { ScriptureEntry } from '../types'

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
