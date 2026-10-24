import { useState } from 'react'
import { useLocaleStore } from '../store/locale'
import { STORY_UI, storyUiLang } from '../utils/storyUi'
import { Link } from 'react-router-dom'
import { useStoryStore, type SavedStory } from '../store/stories'
import { buildLibraryReaderNavigationState } from '../utils/libraryReaderNavigation'
import { IconClose } from './icons'
import '../styles/stories.css'

export default function SavedStories({ stories }: { stories: SavedStory[] }) {
  const locale = useLocaleStore(state => state.locale)
  const copy = STORY_UI[locale]
  const removeStory = useStoryStore(state => state.removeStory)
  const saveStory = useStoryStore(state => state.saveStory)
  const positions = useStoryStore(state => state.positions)
  const [removed, setRemoved] = useState<SavedStory | null>(null)
  const [notice, setNotice] = useState('')
  if (stories.length === 0 && !notice) return null
  return <section className="story-saved-section" aria-label={copy.savedStories} lang={storyUiLang(locale)}>
    {stories.length > 0 && <><div className="story-list-heading"><h2>{copy.stories}</h2><span>{copy.savedCount(stories.length)}</span></div>
      {stories.map(story => <article className="story-saved-row" key={story.id}><Link to={`/stories/${story.id}`} state={buildLibraryReaderNavigationState('/saved')}><h3 lang="en">{story.title}</h3><p><span lang="en">{story.subtitle}</span> · {copy.minutes(story.readingMinutes)}{positions[story.id]?.revision === story.revision && positions[story.id]?.finishedAt ? ` · ${copy.finished}` : positions[story.id]?.revision === story.revision && positions[story.id]?.progress > 0 ? ` · ${copy.inProgress}` : ''}</p></Link><button className="story-icon-button" aria-label={copy.remove(story.title)} onClick={() => { const persisted = removeStory(story.id); setRemoved(story); setNotice(persisted ? copy.removed(story.title) : copy.storage) }}><IconClose size={17} /></button></article>)}</>}
    <div role="status" aria-live="polite" className={notice ? 'story-saved-notice' : ''}>{notice}{removed && <button className="story-text-button" onClick={() => { const persisted = saveStory(removed); setNotice(persisted ? copy.restored(removed.title) : copy.storage); setRemoved(null) }}>{copy.undo}</button>}</div>
  </section>
}
