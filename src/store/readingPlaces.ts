import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from './progress'

const PLACE_LIMIT = 50
export type ReadingPlaces = Record<string, Session>

/** Location within a reading is deliberately excluded from its identity. */
export function getExactReadingKey(path: string): string | null {
  const [pathname, search = ''] = path.split('?')
  if (pathname !== '/study' || path.includes('#')) return null
  const params = new URLSearchParams(search)
  const source = params.get('source')
  const baniId = params.get('baniId')
  const dbId = Number(params.get('baniDbId'))
  const start = Number(params.get('startAng'))
  const end = Number(params.get('endAng'))
  const length = params.get('sgLength')
  if (params.get('exactBani') !== '1' || !['G', 'D'].includes(source ?? '')
    || !baniId || !/^[a-z][a-z0-9-]*$/.test(baniId)
    || !Number.isSafeInteger(dbId) || dbId <= 0
    || !Number.isSafeInteger(start) || start <= 0
    || !Number.isSafeInteger(end) || end < start
    || (length !== null && !['short', 'medium', 'long', 'extralong'].includes(length))) return null
  return [source, baniId, dbId, start, end, length ?? 'default'].join(':')
}

function normalizePlace(value: unknown): Session | null {
  if (!value || typeof value !== 'object') return null
  const session = value as Partial<Session>
  if (typeof session.resumePath !== 'string' || !getExactReadingKey(session.resumePath)
    || typeof session.scriptureId !== 'string' || !session.scriptureId
    || typeof session.updatedAt !== 'string' || !Number.isFinite(Date.parse(session.updatedAt))
    || !Number.isSafeInteger(session.resumeVerseId) || (session.resumeVerseId ?? 0) <= 0) return null
  return {
    scriptureId: session.scriptureId, resumePath: session.resumePath,
    resumeVerseId: session.resumeVerseId, updatedAt: session.updatedAt,
  }
}

function boundedPlaces(places: ReadingPlaces): ReadingPlaces {
  return Object.fromEntries(Object.entries(places)
    .sort(([, a], [, b]) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, PLACE_LIMIT))
}

interface ReadingPlacesState {
  places: ReadingPlaces
  remember: (session: Session) => boolean
}

/** Local exact-bani continuity is independent of the one global cloud session. */
export const useReadingPlacesStore = create<ReadingPlacesState>()(persist<ReadingPlacesState, [], [], { places: ReadingPlaces }>(
  (set, get) => ({
    places: {},
    remember: (input): boolean => {
      const session = normalizePlace(input)
      if (!session) return true
      const key = getExactReadingKey(session.resumePath)!
      const previous = get().places[key]
      const keepNewer = previous && Date.parse(previous.updatedAt) > Date.parse(session.updatedAt)
      try {
        // Even an older incoming place may retry a newer session-only place.
        // Never replace the newer verse while retrying its complete snapshot.
        set(state => ({ places: keepNewer ? state.places : boundedPlaces({ ...state.places, [key]: session }) }))
        return Boolean(useReadingPlacesStore.persist?.getOptions().storage)
      } catch {
        return false
      }
    },
  }),
  {
    name: 'naamras-reading-places', version: 1,
    partialize: state => ({ places: state.places }),
    merge: (persisted, current) => {
      const input = (persisted as Partial<ReadingPlacesState> | undefined)?.places
      const places: ReadingPlaces = {}
      for (const value of Object.values(input && typeof input === 'object' ? input : {})) {
        const session = normalizePlace(value)
        if (!session) continue
        const key = getExactReadingKey(session.resumePath)!
        if (!places[key] || Date.parse(session.updatedAt) >= Date.parse(places[key].updatedAt)) places[key] = session
      }
      return { ...current, places: boundedPlaces(places) }
    },
  },
))
