import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLocaleStore } from '../store/locale'
import { STORY_STATE_STORAGE_KEY, useStoryStore } from '../store/stories'
import type { StorySummary } from '../types/stories'
import SavedStories from './SavedStories'

const summary: StorySummary = {
  id: 'bhai-lalo', title: 'The Bread at Lalo’s Table', subtitle: 'A meal and the work behind it',
  description: 'A carpenter welcomes Guru Nanak.', collectionId: 'seva-and-dignity',
  themes: ['Honest work'], people: ['Guru Nanak', 'Bhai Lalo'], artwork: 'bowl',
  wordCount: 458, readingMinutes: 3, revision: 1,
}

function SavedShelf() {
  const saved = useStoryStore(state => state.saved)
  return <SavedStories stories={Object.values(saved)} />
}

function Destination() {
  const location = useLocation()
  return <output data-testid="saved-story-destination">{location.pathname}|{JSON.stringify(location.state)}</output>
}

function open() {
  return render(<MemoryRouter initialEntries={['/saved']}>
    <Routes>
      <Route path="/saved" element={<SavedShelf />} />
      <Route path="/stories/:storyId" element={<Destination />} />
    </Routes>
  </MemoryRouter>)
}

beforeEach(() => {
  localStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
  useStoryStore.setState({ saved: {}, positions: {} })
  useStoryStore.getState().saveStory(summary)
  useStoryStore.getState().savePosition(summary.id, { paragraphId: 'p3', progress: 0.4, revision: 1 })
})

describe('SavedStories', () => {
  it('removes and restores a story without losing its reading position', async () => {
    const user = userEvent.setup()
    open()
    expect(screen.getByRole('link', { name: /The Bread at Lalo’s Table/ })).toHaveTextContent('In progress')
    await user.click(screen.getByRole('button', { name: `Remove ${summary.title} from Saved` }))
    expect(screen.queryByRole('link', { name: /The Bread at Lalo’s Table/ })).not.toBeInTheDocument()
    expect(useStoryStore.getState().saved[summary.id]).toBeUndefined()
    expect(useStoryStore.getState().positions[summary.id].paragraphId).toBe('p3')
    expect(screen.getByRole('status')).toHaveTextContent(`${summary.title} removed from Saved.`)

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('link', { name: /The Bread at Lalo’s Table/ })).toBeInTheDocument()
    expect(useStoryStore.getState().saved[summary.id]).toMatchObject(summary)
    expect(JSON.parse(localStorage.getItem(STORY_STATE_STORAGE_KEY)!)).toMatchObject({
      saved: { [summary.id]: { title: summary.title } },
      positions: { [summary.id]: { paragraphId: 'p3', progress: 0.4 } },
    })
    expect(screen.getByRole('status')).toHaveTextContent(`${summary.title} restored.`)
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('opens a saved story with an explicit route back to Saved', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('link', { name: /The Bread at Lalo’s Table/ }))
    expect(screen.getByTestId('saved-story-destination')).toHaveTextContent('/stories/bhai-lalo|{"libraryReaderOrigin":"/saved"}')
  })
})

it('does not carry a completed badge onto a newer saved reading revision', () => {
  useStoryStore.getState().savePosition(summary.id, { paragraphId: 'p3', progress: 1, revision: 1, finishedAt: '2026-10-24T00:00:00Z' })
  useStoryStore.getState().saveStory({ ...summary, revision: 2 })
  open()
  const link = screen.getByRole('link', { name: /The Bread at Lalo’s Table/ })
  expect(link).not.toHaveTextContent(' · Read')
  expect(link).not.toHaveTextContent('In progress')
})
