import { buildNitnemStudyPath, getNitnemOption, type NitnemRouteOption } from '../store/nitnem'
import type { Session } from '../store/progress'
import { getExactReadingKey, type ReadingPlaces } from '../store/readingPlaces'
import type { NitnemPracticeSession } from '../store/nitnemPractice'
import { normalizeSundarGutkaLength } from './sundarGutkaLength'

/** Match the actual chosen version, independently of the usual Nitnem length. */
export function isNitnemPracticeReading(path: string, option: NitnemRouteOption): boolean {
  if (typeof path !== 'string' || path.length > 4096) return false
  const key = getExactReadingKey(path)
  if (!key) return false
  const params = new URLSearchParams(path.split('?')[1] ?? '')
  if (params.has('shabadId') || params.has('hukamnamaDate') || params.get('flow') === 'ardaas-hukamnama') return false
  const expected = new URLSearchParams(buildNitnemStudyPath(option).split('?')[1])
  if (option.supportsLengthAdjustment) {
    const length = normalizeSundarGutkaLength(params.get('sgLength'))
    // An intentional practice stores a resolved version, never a mutable default.
    if (!length) return false
    expected.set('sgLength', length)
  }
  return key === getExactReadingKey(`/study?${expected}`)
}

/** Persist only the bounded, validated intentional reading context. */
export function normalizeNitnemPractice(value: unknown): NitnemPracticeSession | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Partial<NitnemPracticeSession>
  const option = typeof input.optionId === 'string' ? getNitnemOption(input.optionId) : null
  if (!option || typeof input.readingPath !== 'string' || !isNitnemPracticeReading(input.readingPath, option)
    || typeof input.startedAt !== 'string' || !Number.isFinite(Date.parse(input.startedAt))
    || typeof input.updatedAt !== 'string' || !Number.isFinite(Date.parse(input.updatedAt))
    || Date.parse(input.updatedAt) < Date.parse(input.startedAt)
    || new URLSearchParams(input.readingPath.split('?')[1]).get('nitnemPractice') !== input.startedAt
    || (input.completed !== undefined && typeof input.completed !== 'boolean')) return null
  return {
    optionId: option.id,
    readingPath: input.readingPath,
    startedAt: input.startedAt,
    updatedAt: input.updatedAt,
    completed: input.completed === true,
  }
}

/** A midnight boundary never moves an unfinished, intentionally started paath. */
export function getActiveNitnemPractice(
  options: readonly NitnemRouteOption[],
  active: NitnemPracticeSession | null,
  _currentDay?: string,
): NitnemPracticeSession | null {
  // Accepted by callers observing local-day changes; an open practice does not expire.
  void _currentDay
  const session = normalizeNitnemPractice(active)
  return session && !session.completed && options.some(option => option.id === session.optionId
    && isNitnemPracticeReading(session.readingPath, option)) ? session : null
}

export function isActiveNitnemPracticeReading(path: string, active: NitnemPracticeSession | null): boolean {
  const session = normalizeNitnemPractice(active)
  if (!session || session.completed) return false
  const option = getNitnemOption(session.optionId)
  return Boolean(option && isNitnemPracticeReading(path, option)
    && new URLSearchParams(path.split('?')[1]).get('nitnemPractice') === session.startedAt
    && getExactReadingKey(path) === getExactReadingKey(session.readingPath))
}

/**
 * Only explicitly tagged practice updates own this position. Neither yesterday's
 * Study place nor later Study of the very same version can take over the session.
 * The optional general-place arguments remain compatible with Home integration;
 * those records deliberately never supply the active practice's anchor.
 */
export function getNitnemPracticeResume(
  option: NitnemRouteOption,
  active: NitnemPracticeSession | null,
  _places: ReadingPlaces = {},
  _currentSession: Session | null = null,
): string | null {
  void _places
  void _currentSession
  const practice = getActiveNitnemPractice([option], active)
  return practice?.readingPath ?? null
}
