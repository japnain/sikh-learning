import { BANIS, type Bani } from '../data/banis'
import type { ScriptureEntry, ScriptureLine } from '../types'

function normalizeBaniName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`()]/g, '')
    .replace(/[^a-z0-9\u0A00-\u0A7F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findFirstRenderableLine(entries: ScriptureEntry[]): ScriptureLine | null {
  for (const entry of entries) {
    for (const line of entry.lines ?? []) {
      if (!line.isHeader && line.gurmukhi.trim()) {
        return line
      }
    }
  }

  return null
}

function hasVerse(entries: ScriptureEntry[], verseId: number): boolean {
  return entries.some(entry => (entry.lines ?? []).some(line => line.verseId === verseId))
}

export function findRouteBani(
  baniName: string | null,
  source: Bani['source'] | null,
  startAng: number | null
): Bani | null {
  if (!baniName || !source || startAng === null) return null

  const normalizedName = normalizeBaniName(baniName)

  return BANIS.find(bani =>
    bani.source === source
    && bani.startAng === startAng
    && normalizeBaniName(bani.name) === normalizedName
  ) ?? null
}

export function resolveBaniStartMarker({
  baniName,
  source,
  startAng,
  currentAng,
  entries,
}: {
  baniName: string | null
  source: Bani['source'] | null
  startAng: number | null
  currentAng: number | null
  entries: ScriptureEntry[]
}): { verseId: number; label: string; bani: Bani } | null {
  const matchedBani = findRouteBani(baniName, source, startAng)
  if (!matchedBani || currentAng !== matchedBani.startAng) return null

  const fallbackLine = findFirstRenderableLine(entries)
  if (!fallbackLine) return null

  const verseId =
    matchedBani.startVerseId && hasVerse(entries, matchedBani.startVerseId)
      ? matchedBani.startVerseId
      : fallbackLine.verseId

  return {
    verseId,
    label: `${matchedBani.name} starts here`,
    bani: matchedBani,
  }
}
