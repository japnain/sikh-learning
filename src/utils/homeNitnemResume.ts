import { buildSessionResumePath, type Session } from '../store/progress'
import { buildNitnemStudyPath, type NitnemRouteOption } from '../store/nitnem'
import { getExactReadingKey, type ReadingPlaces } from '../store/readingPlaces'
import { isExactNitnemReading } from './nitnemReadingIdentity'

export function getHomeNitnemResume(option: NitnemRouteOption, session: Session | null, places: ReadingPlaces = {}): string | null {
  const expectedPath = buildNitnemStudyPath(option)
  const expectedKey = getExactReadingKey(expectedPath)
  if (!expectedKey) return null
  const saved = places[expectedKey]
  const currentMatches = session && Number.isSafeInteger(session.resumeVerseId) && (session.resumeVerseId ?? 0) > 0
    && getExactReadingKey(session.resumePath) === expectedKey
  const candidate = currentMatches && (!saved || Date.parse(session.updatedAt) >= Date.parse(saved.updatedAt)) ? session : saved
  const path = buildSessionResumePath(candidate)
  if (!path?.startsWith('/study?')) return null
  return isExactNitnemReading(path, option) ? path : null
}
