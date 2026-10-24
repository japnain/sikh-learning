import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { loadStoryDraftLibrary, type StoryDraftLibrary } from '../../data/storyDraftRepository'
import { StoryReadingView } from './StoryReader'
import '../../styles/story-drafts.css'

type DraftState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; library: StoryDraftLibrary }

export default function StoryDraftPreview() {
  const { storyId } = useParams<{ storyId: string }>()
  const location = useLocation()
  const [state, setState] = useState<DraftState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadStoryDraftLibrary().then(library => {
      if (active) setState({ status: 'ready', library })
    }).catch(error => {
      if (active) setState({ status: 'error', message: error instanceof Error ? error.message : 'The editorial drafts could not open.' })
    })
    return () => { active = false }
  }, [])

  if (state.status === 'loading') return <p className="story-status" role="status">Opening editorial previews…</p>
  if (state.status === 'error') return <div className="story-status" role="alert"><p>{state.message}</p><Link to="/banis?collection=stories">Return to stories</Link></div>

  const story = state.library.stories.find(candidate => candidate.id === storyId)
  if (storyId && !story) return <div className="story-status"><h1>Draft not found</h1><Link to="/stories/drafts">Browse editorial previews</Link></div>

  return <div data-page="story-draft-preview" lang="en">
    <aside className="story-draft-banner" aria-label="Editorial preview">
      <strong>Editorial preview</strong>
      <span>Unpublished reading · independent reviews pending</span>
    </aside>
    {story ? <StoryReadingView key={story.id} story={story} catalog={state.library.catalog} backTo="/stories/drafts" hash={location.hash} preview /> : (
      <section className="story-draft-shelf">
        <Link className="story-reader-back" to="/banis?collection=stories">← Stories</Link>
        <h1>Read the next editions</h1>
        <p>These working readings use the same Naamras reader. They are kept outside the published collection while their editorial work continues.</p>
        <ul>
          {state.library.stories.map(draft => <li key={draft.id}>
            <Link to={`/stories/drafts/${draft.id}`}>
              <span>{draft.readingMinutes} min · {draft.accountType}</span>
              <h2>{draft.title}</h2>
              <p>{draft.description}</p>
            </Link>
          </li>)}
        </ul>
        {state.library.stories.length === 0 && <p>No editorial drafts are available.</p>}
      </section>
    )}
  </div>
}
