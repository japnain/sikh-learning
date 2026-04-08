import { BANIS, READ_EXACT_BANIS, type Bani } from '../data/banis'
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

function findFirstRenderableLineForAng(entries: ScriptureEntry[], ang: number): ScriptureLine | null {
  for (const entry of entries) {
    for (const line of entry.lines ?? []) {
      if (!line.isHeader && line.gurmukhi.trim() && line.ang === ang) {
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
  baniId: string | null,
  baniName: string | null,
  source: Bani['source'] | null,
  startAng: number | null
): Bani | null {
  if (!source || startAng === null) return null

  if (baniId) {
    const byId = READ_EXACT_BANIS.find(bani => bani.id === baniId)
      ?? BANIS.find(bani => bani.id === baniId)

    if (byId && byId.source === source && byId.startAng === startAng) {
      return byId
    }
  }

  if (!baniName) return null

  const normalizedName = normalizeBaniName(baniName)

  return READ_EXACT_BANIS.find(bani =>
    bani.source === source
    && bani.startAng === startAng
    && normalizeBaniName(bani.name) === normalizedName
  ) ?? null
}

export function resolveBaniStartMarker({
  baniId,
  baniName,
  source,
  startAng,
  entries,
}: {
  baniId: string | null
  baniName: string | null
  source: Bani['source'] | null
  startAng: number | null
  entries: ScriptureEntry[]
}): { verseId: number; label: string; bani: Bani } | null {
  const matchedBani = findRouteBani(baniId, baniName, source, startAng)
  if (!matchedBani) return null

  const fallbackLine = findFirstRenderableLineForAng(entries, matchedBani.startAng)

  const verseId =
    matchedBani.startVerseId && hasVerse(entries, matchedBani.startVerseId)
      ? matchedBani.startVerseId
      : fallbackLine?.verseId

  if (!verseId) return null

  return {
    verseId,
    label: `${matchedBani.name} starts here`,
    bani: matchedBani,
  }
}
