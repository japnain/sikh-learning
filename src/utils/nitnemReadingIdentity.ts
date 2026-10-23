import { buildNitnemStudyPath, getNitnemOption, getNitnemReadingProvenance, type NitnemRouteOption } from '../store/nitnem'
import { getExactReadingKey } from '../store/readingPlaces'

/** Source, exact variant, range and selected length all belong to a daily reading. */
export function isExactNitnemReading(readingPath: string, option: NitnemRouteOption): boolean {
  const params = new URLSearchParams(readingPath.split('?')[1] ?? '')
  // These routes have their own content precedence in the reader. Extra exact
  // bani metadata must never turn a Hukamnama or individual shabad into Nitnem.
  if (params.has('shabadId') || params.has('hukamnamaDate') || params.get('flow') === 'ardaas-hukamnama') return false
  const expected = getExactReadingKey(buildNitnemStudyPath(option))
  return expected !== null && getExactReadingKey(readingPath) === expected
}

export function getSelectedNitnemReading(readingPath: string, selectedIds: readonly string[]): NitnemRouteOption | null {
  return selectedIds.map(getNitnemOption).find(option => option && getNitnemReadingProvenance(option, readingPath)) ?? null
}

/** Without tracking, continue through the saved order and stop at its end. */
export function getNextNitnemReading(currentId: string, selectedIds: readonly string[]): NitnemRouteOption | null {
  const index = selectedIds.indexOf(currentId)
  if (index < 0) return null
  for (const id of selectedIds.slice(index + 1)) {
    const option = getNitnemOption(id)
    if (option) return option
  }
  return null
}

/** Continue once through the user's order; never auto-open the next reading. */
export function getNextIncompleteNitnemReading(
  currentId: string,
  selectedIds: readonly string[],
  completedIds: readonly string[],
): NitnemRouteOption | null {
  const index = selectedIds.indexOf(currentId)
  if (index < 0) return null
  for (let offset = 1; offset < selectedIds.length; offset += 1) {
    const id = selectedIds[(index + offset) % selectedIds.length]
    const option = getNitnemOption(id)
    if (option && !completedIds.includes(id)) return option
  }
  return null
}
