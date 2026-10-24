import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { downloadStoryCollection, getOfflineStoryIds, getStoredStoryIds, loadStoryCatalog, removeOfflineStories } from '../data/storyRepository'
import { useStoryStore } from '../store/stories'
import { useLocaleStore } from '../store/locale'
import { STORY_UI, storyUiLang } from '../utils/storyUi'
import type { StoryCatalog, StorySummary } from '../types/stories'
import { buildCurrentAppPath, buildLibraryReaderNavigationState } from '../utils/libraryReaderNavigation'
import StoryArtwork from './StoryArtwork'
import { IconArrowRight, IconBookmark, IconBookmarkFilled, IconSearch } from './icons'
import '../styles/stories.css'

const matchesStorySearch = (story: StorySummary, query: string) => (
  [story.title, story.subtitle, story.description, story.series?.title ?? '', ...story.people, ...story.themes]
    .join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())
)

export default function StoryBrowser() {
  const locale = useLocaleStore(state => state.locale)
  const copy = STORY_UI[locale]
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [catalog, setCatalog] = useState<StoryCatalog | null>(null)
  const [error, setError] = useState(false)
  const [request, setRequest] = useState(0)
  const query = searchParams.get('storyQuery') ?? ''
  const collection = searchParams.get('storyCollection') ?? 'all'
  const updateDiscovery = (nextQuery: string, nextCollection: string) => {
    const next = new URLSearchParams(searchParams)
    if (nextQuery) next.set('storyQuery', nextQuery)
    else next.delete('storyQuery')
    if (nextCollection !== 'all') next.set('storyCollection', nextCollection)
    else next.delete('storyCollection')
    setSearchParams(next, { replace: true })
  }
  const setQuery = (value: string) => updateDiscovery(value, collection)
  const setCollection = (value: string) => updateDiscovery(query, value)
  const [offlineIds, setOfflineIds] = useState(getOfflineStoryIds)
  const [storedIds, setStoredIds] = useState(getStoredStoryIds)
  const [download, setDownload] = useState<{ loaded: number; total: number } | null>(null)
  const [notice, setNotice] = useState('')
  const saved = useStoryStore(state => state.saved)
  const positions = useStoryStore(state => state.positions)
  const saveStory = useStoryStore(state => state.saveStory)
  const removeStory = useStoryStore(state => state.removeStory)
  const navigationState = buildLibraryReaderNavigationState(buildCurrentAppPath(location))

  useEffect(() => {
    let active = true
    loadStoryCatalog().then(value => {
      if (active) { setCatalog(value); setOfflineIds(getOfflineStoryIds()); setStoredIds(getStoredStoryIds()); setError(false) }
    }).catch(() => {
      if (active) setError(true)
    })
    return () => { active = false }
  }, [request])

  const stories = useMemo(() => catalog?.stories.filter(story => (
    (collection === 'all' || story.collectionId === collection) && matchesStorySearch(story, query)
  )) ?? [], [catalog, collection, query])
  const continueStory = catalog?.stories.filter(story => {
    const position = positions[story.id]
    return position && position.revision === story.revision && position.progress > 0 && position.progress < 1 && !position.finishedAt
  }).sort((a, b) => Date.parse(positions[b.id].updatedAt) - Date.parse(positions[a.id].updatedAt))[0]
  const featured = catalog?.stories.find(story => story.id === catalog.featuredStoryId) ?? catalog?.stories[0]
  const isBrowsing = collection === 'all' && !query.trim()
  const allOffline = Boolean(catalog?.stories.length && catalog.stories.every(story => offlineIds.includes(story.id)))

  const toggleSave = (story: StorySummary) => {
    const wasSaved = Boolean(saved[story.id])
    const persisted = wasSaved ? removeStory(story.id) : saveStory(story)
    setNotice(persisted
      ? wasSaved ? copy.removed(story.title) : copy.added(story.title)
      : copy.storage)
  }
  const downloadStories = async () => {
    setNotice('')
    setDownload({ loaded: 0, total: catalog?.stories.length ?? 0 })
    try {
      const result = await downloadStoryCollection(undefined, (loaded, total) => setDownload({ loaded, total }))
      setNotice(copy.downloadDone(result.downloaded))
    } catch {
      setNotice(copy.downloadError)
    } finally {
      setOfflineIds(getOfflineStoryIds())
      setStoredIds(getStoredStoryIds())
      setDownload(null)
    }
  }

  if (error) return <div className="story-status" role="alert"><p>{copy.loadError}</p><button className="story-text-button" onClick={() => { setError(false); setRequest(value => value + 1) }}>{copy.retry}</button></div>
  if (!catalog) return <div className="story-status" role="status">{copy.openingCollection}</div>

  return (
    <div className="story-browser" lang={storyUiLang(locale)} data-testid="story-browser">
      <header className="story-browser-heading">
        <div><p className="eyebrow">{copy.collection}</p><h2>{copy.title}</h2><p>{copy.description}</p></div>
        <span className="story-count">{copy.count(catalog.stories.length)}</span>
      </header>

      {continueStory && isBrowsing && <Link to={`/stories/${continueStory.id}`} state={navigationState} className="story-continue">
        <span><span className="eyebrow">{copy.continue}</span><strong lang="en">{continueStory.title}</strong><span>{copy.percent(Math.round(positions[continueStory.id].progress * 100))}</span></span><IconArrowRight size={19} />
      </Link>}

      {featured && isBrowsing && <article className="story-feature">
        <StoryArtwork kind={featured.artwork} />
        <div className="story-feature-copy"><p className="eyebrow">{copy.begin}</p><h3 lang="en"><Link to={`/stories/${featured.id}`} state={navigationState}>{featured.title}</Link></h3><p lang="en">{featured.description}</p><Link to={`/stories/${featured.id}`} state={navigationState} className="story-read-link">{copy.read} <IconArrowRight size={16} /><span className="story-reading-time">{copy.minutes(featured.readingMinutes)}</span></Link></div>
      </article>}

      {isBrowsing && <details className="story-beginner-path">
        <summary>{copy.newReader}</summary>
        <p>{copy.newReaderBody}</p>
        <ol>{[
          { id: 'bhai-lalo', label: copy.pathWork },
          { id: 'mata-khivi', label: copy.pathCommunity },
          { id: 'guru-amar-das-service', label: copy.pathService },
        ].filter(step => catalog.stories.some(story => story.id === step.id)).map(step => <li key={step.id}><Link to={`/stories/${step.id}`} state={navigationState}>{step.label}</Link></li>)}</ol>
      </details>}

      <div className="story-discovery">
        <label className="story-search"><IconSearch size={18} /><span className="sr-only">{copy.search}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} /></label>
        <div className="story-collections" role="group" aria-label={copy.collections}>
          <button type="button" aria-pressed={collection === 'all'} onClick={() => setCollection('all')}>{copy.all}</button>
          {catalog.collections.map(item => <button type="button" key={item.id} lang="en" aria-pressed={collection === item.id} onClick={() => setCollection(item.id)}>{item.title}</button>)}
        </div>
      </div>
      {collection !== 'all' && <p className="story-collection-description" lang="en">{catalog.collections.find(item => item.id === collection)?.description}</p>}
      <div className="story-list-heading"><h3 lang={collection === 'all' ? storyUiLang(locale) : 'en'}>{collection === 'all' ? copy.explore : catalog.collections.find(item => item.id === collection)?.title}</h3><span role="status">{copy.count(stories.length)}</span></div>
      <div className="story-list">
        {stories.map(story => <article className="story-card" key={story.id}>
          <Link className="story-card-link" to={`/stories/${story.id}`} state={navigationState}>
            <StoryArtwork kind={story.artwork} />
            <div className="story-card-copy"><p className="story-meta"><span lang="en">{story.people[0]}</span> <span aria-hidden="true">·</span> {copy.minutes(story.readingMinutes)}</p><h4 lang="en">{story.title}</h4><p className="story-card-description" lang="en">{story.description}</p>{story.series ? <span className="story-card-series"><span lang="en">{story.series.title}</span> · {copy.part(story.series.order)}</span> : null}<span className="story-card-theme"><span lang="en">{story.themes[0]}</span>{offlineIds.includes(story.id) && <span> · {copy.offline}</span>}{positions[story.id]?.revision === story.revision && positions[story.id]?.finishedAt && <span> · {copy.finished}</span>}</span></div>
          </Link>
          <button className="story-icon-button story-card-save" type="button" aria-label={saved[story.id] ? copy.remove(story.title) : copy.save(story.title)} aria-pressed={Boolean(saved[story.id])} onClick={() => toggleSave(story)}>{saved[story.id] ? <IconBookmarkFilled size={19} /> : <IconBookmark size={19} />}</button>
        </article>)}
      </div>
      {stories.length === 0 && <div className="story-status"><p>{copy.noMatches}</p><button className="story-text-button" onClick={() => updateDiscovery('', 'all')}>{copy.showAll}</button></div>}
      <div className="story-offline-panel">
        <div><h3>{copy.offlineTitle}</h3><p>{allOffline ? copy.offlineReady : copy.offlineBody}</p></div>
        <button className="story-action-button" disabled={Boolean(download) || allOffline} onClick={() => { void downloadStories() }}>{download ? copy.downloading(download.loaded, download.total) : allOffline ? copy.availableOffline : copy.download}</button>
        {storedIds.length > 0 && !download && <button className="story-text-button" onClick={() => { try { removeOfflineStories(); setOfflineIds(getOfflineStoryIds()); setStoredIds(getStoredStoryIds()); setNotice(copy.downloadsRemoved) } catch { setNotice(copy.removeError) } }}>{copy.removeDownloads}</button>}
      </div>
      <p className="story-feedback" role="status" aria-live="polite">{notice}</p>
      <p className="story-editorial-footnote">{copy.editorial}</p>
    </div>
  )
}
