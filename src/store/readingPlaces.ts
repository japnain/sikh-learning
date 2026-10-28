import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from './progress'
import type { LibraryChapterIndexEntry, LibraryWork } from '../types'
import { isSourceReaderId, SOURCE_READER_META } from '../utils/sourceReaderMeta'

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

/** Work and source identities survive switching readings; exact bani keys stay unchanged. */
export function getReadingPlaceKey(path: string): string | null {
  if (path.length > 2000) return null
  const routeParams = new URLSearchParams(path.split('?')[1] ?? '')
  if (routeParams.has('shabadId') || routeParams.has('hukamnamaDate') || routeParams.get('flow') === 'ardaas-hukamnama') return null
  const exactKey = getExactReadingKey(path)
  if (exactKey) return exactKey
  const book = /^\/library\/([a-z][a-z0-9-]{0,119})\/chapters\/([a-z][a-z0-9-]{0,119})$/.exec(path)
  if (book) return `book:${book[1]}`
  const [pathname, search = ''] = path.split('?')
  if (pathname !== '/study' || path.includes('#')) return null
  const params = new URLSearchParams(search)
  if ([...params.keys()].some(key => !['source', 'ang', 'resumeVerseId'].includes(key))) return null
  const source = params.get('source')
  const ang = Number(params.get('ang'))
  return isSourceReaderId(source) && Number.isSafeInteger(ang) && ang > 0 && ang <= SOURCE_READER_META[source].max
    ? `source:${source}` : null
}

export function normalizeReadingPlace(value: unknown): Session | null {
  if (!value || typeof value !== 'object') return null
  const session = value as Partial<Session>
  if (typeof session.resumePath !== 'string'
    || typeof session.scriptureId !== 'string' || !session.scriptureId || session.scriptureId.length > 250
    || typeof session.updatedAt !== 'string' || !Number.isFinite(Date.parse(session.updatedAt))) return null
  const key = getReadingPlaceKey(session.resumePath)
  if (!key) return null
  const base = { scriptureId: session.scriptureId, resumePath: session.resumePath, updatedAt: session.updatedAt }
  if (key.startsWith('book:')) {
    const locator = session.readerLocator
    if (!locator) return base // Older sessions can safely resume at the chapter start.
    const locations = locator.locations
    if (locator.href !== session.resumePath || !['application/xhtml+xml', 'text/html'].includes(locator.type)
      || !locations || !Number.isFinite(locations.progression) || locations.progression < 0 || locations.progression > 1
      || !Number.isFinite(locations.totalProgression) || locations.totalProgression < 0 || locations.totalProgression > 1
      || !Number.isSafeInteger(locations.position) || locations.position < 1
      || (locations.blockId !== undefined && (typeof locations.blockId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(locations.blockId)))
      || (locator.revision !== undefined && (typeof locator.revision !== 'string' || locator.revision.length > 200))) return null
    return { ...base, readerLocator: {
      href: locator.href, type: locator.type,
      ...(locator.revision ? { revision: locator.revision } : {}),
      ...(typeof locator.title === 'string' ? { title: locator.title.slice(0, 300) } : {}),
      locations: { progression: locations.progression, totalProgression: locations.totalProgression,
        position: locations.position, ...(locations.blockId ? { blockId: locations.blockId } : {}) },
      ...(typeof locator.text?.highlight === 'string' ? { text: { highlight: locator.text.highlight.slice(0, 300) } } : {}),
    } }
  }
  if (session.resumeVerseId === undefined && key.startsWith('source:')) return base
  if (!Number.isSafeInteger(session.resumeVerseId) || (session.resumeVerseId ?? 0) <= 0) return null
  return { ...base, resumeVerseId: session.resumeVerseId }
}

function shouldKeepPlace(previous: Session | undefined, incoming: Session): boolean {
  return Boolean(previous && (Date.parse(previous.updatedAt) > Date.parse(incoming.updatedAt)
    || (previous.resumePath === incoming.resumePath
      && ((!incoming.resumeVerseId && previous.resumeVerseId) || (!incoming.readerLocator && previous.readerLocator)))))
}

/** Revalidate older global sessions before considering them alongside durable places. */
export function getReadingPlaces(places: ReadingPlaces, currentSession: Session | null): ReadingPlaces {
  const result: ReadingPlaces = {}
  for (const value of [...Object.values(places), currentSession]) {
    const session = normalizeReadingPlace(value)
    if (!session) continue
    const key = getReadingPlaceKey(session.resumePath)!
    if (!shouldKeepPlace(result[key], session)) result[key] = session
  }
  return boundedPlaces(result)
}

/** A changed edition may move block IDs: resume safely at its chapter, never a stale block. */
export function buildBookReadingResumePath(session: Session | undefined, work: LibraryWork,
  chapters?: readonly LibraryChapterIndexEntry[]): string | null {
  const saved = normalizeReadingPlace(session)
  if (!saved || getReadingPlaceKey(saved.resumePath) !== `book:${work.id}`) return null
  const chapterId = saved.resumePath.split('/').at(-1)
  if (chapters && !chapters.some(chapter => chapter.id === chapterId)) return `/library/${work.id}`
  const locator = saved.readerLocator
  return locator?.revision && locator.revision === work.revision && locator.locations.blockId
    ? `${saved.resumePath}#${encodeURIComponent(locator.locations.blockId)}` : saved.resumePath
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

/** Local reading continuity is independent of the one global cloud session. */
export const useReadingPlacesStore = create<ReadingPlacesState>()(persist<ReadingPlacesState, [], [], { places: ReadingPlaces }>(
  (set, get) => ({
    places: {},
    remember: (input): boolean => {
      const session = normalizeReadingPlace(input)
      if (!session) return true
      const key = getReadingPlaceKey(session.resumePath)!
      const previous = get().places[key]
      const keepNewer = shouldKeepPlace(previous, session)
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
        const session = normalizeReadingPlace(value)
        if (!session) continue
        const key = getReadingPlaceKey(session.resumePath)!
        if (!shouldKeepPlace(places[key], session)) places[key] = session
      }
      return { ...current, places: boundedPlaces(places) }
    },
  },
))
