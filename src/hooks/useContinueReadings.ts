import { useEffect, useMemo, useState } from 'react'
import { READ_EXACT_BANIS } from '../data/banis'
import { loadLibraryChapterIndex, loadLibraryWorkCatalog } from '../data/libraryRepository'
import { loadStoryCatalog } from '../data/storyRepository'
import { useLocaleStore } from '../store/locale'
import { buildSessionResumePath, useProgressStore } from '../store/progress'
import { buildBookReadingResumePath, getReadingPlaces, useReadingPlacesStore } from '../store/readingPlaces'
import { useStoryStore } from '../store/stories'
import { formatSourceReaderReference, isSourceReaderId, SOURCE_READER_META } from '../utils/sourceReaderMeta'
import type { LibraryChapterIndexEntry, LibraryWork } from '../types'
import type { StorySummary } from '../types/stories'

export interface ContinueReading {
  id: string
  title: string
  detail: string
  path: string
  updatedAt: string
  kind: 'bani' | 'source' | 'book' | 'story'
}

const COPY = {
  en: { book: 'Book', story: 'Story', contents: 'Open contents', chapterStart: 'Chapter start', savedPassage: 'Saved passage', length: { short: 'Short', medium: 'Medium', long: 'Long', extralong: 'Extra long' } },
  pa: { book: 'ਕਿਤਾਬ', story: 'ਸਾਖੀ', contents: 'ਤਤਕਰਾ ਖੋਲ੍ਹੋ', chapterStart: 'ਅਧਿਆਇ ਦੀ ਸ਼ੁਰੂਆਤ', savedPassage: 'ਸੰਭਾਲਿਆ ਪਾਠ', length: { short: 'ਛੋਟਾ', medium: 'ਦਰਮਿਆਨਾ', long: 'ਲੰਮਾ', extralong: 'ਵਾਧੂ ਲੰਮਾ' } },
  hi: { book: 'पुस्तक', story: 'साखी', contents: 'विषय-सूची खोलें', chapterStart: 'अध्याय की शुरुआत', savedPassage: 'सहेजा हुआ पाठ', length: { short: 'छोटा', medium: 'मध्यम', long: 'लंबा', extralong: 'बहुत लंबा' } },
}

/** Real saved locations, never inferred from overlapping scripture coverage. */
export function useContinueReadings() {
  const locale = useLocaleStore(state => state.locale)
  const places = useReadingPlacesStore(state => state.places)
  const currentSession = useProgressStore(state => state.currentSession)
  const positions = useStoryStore(state => state.positions)
  const savedStories = useStoryStore(state => state.saved)
  const sessions = useMemo(() => getReadingPlaces(places, currentSession), [places, currentSession])
  const bookIds = Object.keys(sessions).filter(key => key.startsWith('book:')).map(key => key.slice(5)).sort().join(',')
  const hasStories = Object.keys(positions).length > 0
  const [books, setBooks] = useState<Record<string, { work: LibraryWork; chapters: LibraryChapterIndexEntry[] }>>({})
  const [stories, setStories] = useState<StorySummary[]>([])

  useEffect(() => {
    if (!bookIds) return
    let active = true
    void loadLibraryWorkCatalog().then(async catalog => {
      const loaded = await Promise.all(bookIds.split(',').map(async id => {
        const work = catalog.workById[id]
        if (!work) return null
        try { return [id, { work, chapters: await loadLibraryChapterIndex(id) }] as const } catch { return null }
      }))
      if (active) setBooks(Object.fromEntries(loaded.filter(item => item !== null)))
    }).catch(() => { /* Missing catalog leaves the saved location intact for a later visit. */ })
    return () => { active = false }
  }, [bookIds])

  useEffect(() => {
    if (!hasStories) return
    let active = true
    void loadStoryCatalog().then(catalog => { if (active) setStories(catalog.stories) }).catch(() => {})
    return () => { active = false }
  }, [hasStories])

  return useMemo(() => {
    const copy = COPY[locale]
    const items: ContinueReading[] = []
    for (const [id, session] of Object.entries(sessions)) {
      if (id.startsWith('book:')) {
        const book = books[id.slice(5)]
        if (!book) {
          items.push({ id, title: session.readerLocator?.title || copy.book, detail: copy.contents,
            path: `/library/${id.slice(5)}`, updatedAt: session.updatedAt, kind: 'book' })
          continue
        }
        const path = buildBookReadingResumePath(session, book.work, book.chapters)
        if (!path) continue
        const chapter = book.chapters.find(item => session.resumePath.endsWith(`/${item.id}`))
        const exact = path.includes('#')
        items.push({ id, title: book.work.shortTitle || book.work.title, detail: [copy.book, chapter?.title, exact ? copy.savedPassage : copy.chapterStart].filter(Boolean).join(' · '), path, updatedAt: session.updatedAt, kind: 'book' })
        continue
      }
      const params = new URLSearchParams(session.resumePath.split('?')[1])
      const source = params.get('source')
      if (!isSourceReaderId(source)) continue
      const path = buildSessionResumePath(session)
      if (!path) continue
      const bani = READ_EXACT_BANIS.find(item => (item.variantOf ?? item.id) === params.get('baniId')
        && item.baniDbId === Number(params.get('baniDbId')) && item.source === source
        && item.startAng === Number(params.get('startAng')) && item.endAng === Number(params.get('endAng')))
      if (!id.startsWith('source:') && !bani) continue
      const length = params.get('sgLength') as keyof typeof copy.length | null
      const reference = formatSourceReaderReference({ source, value: params.get('ang') ?? params.get('startAng') ?? 1, locale })
      items.push({ id, title: bani?.name ?? SOURCE_READER_META[source].name,
        detail: [reference, length ? copy.length[length] : null, session.resumeVerseId ? copy.savedPassage : null].filter(Boolean).join(' · '),
        path, updatedAt: session.updatedAt, kind: bani ? 'bani' : 'source' })
    }
    const storySummaries = stories.length ? stories : Object.values(savedStories)
    for (const [storyId, position] of Object.entries(positions)) {
      if (position.finishedAt || position.progress <= 0 || position.progress >= 1) continue
      const story = storySummaries.find(summary => summary.id === storyId)
      // A local place remains available while its catalog is offline or still opening.
      // The story reader restores the saved paragraph only when its revision still matches.
      items.push({ id: `story:${storyId}`, title: story?.title ?? copy.story, detail: copy.story,
        path: `/stories/${storyId}`, updatedAt: position.updatedAt, kind: 'story' })
    }
    return items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  }, [books, locale, positions, savedStories, sessions, stories])
}
