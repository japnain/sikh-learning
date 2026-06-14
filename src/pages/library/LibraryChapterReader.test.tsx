import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LibraryChapterReader from './LibraryChapterReader'
import { useProgressStore } from '../../store/progress'

describe('LibraryChapterReader', () => {
  beforeEach(() => {
    useProgressStore.setState({
      streak: 0,
      currentSession: null,
      studied: [],
      reviewQueue: [],
      lastStudied: null,
    })
  })

  test('renders an EPUB-derived Panth Prakash chapter', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/chapters/episode-001-the-episode-about-the-origin-of-the-khalsa']}>
        <Routes>
          <Route path="/library/:workId/chapters/:chapterId" element={<LibraryChapterReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panth-chapter-reader')).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /The Episode About the Origin of the Khalsa/i })).toBeInTheDocument()
    expect(screen.getByTestId('panth-chapter-reader')).toHaveTextContent(/Episode 1/i)
    expect(screen.getByTestId('panth-chapter-reader')).toHaveTextContent(/EPUB page 47/i)
    expect(screen.getByTestId('panth-chapter-text')).toHaveTextContent(/I bow my head in reverence at the lotus feet of Guru Nanak/i)
    expect(screen.getByTestId('panth-chapter-provenance')).toHaveTextContent(/sri gur vol 1.epub/i)
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-002-the-second-episode'
    )
  })

  test('stores chapter resume paths instead of retired page paths', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/chapters/vol-2-front-matter']}>
        <Routes>
          <Route path="/library/:workId/chapters/:chapterId" element={<LibraryChapterReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(useProgressStore.getState().currentSession).toEqual(expect.objectContaining({
        scriptureId: 'panth-prakash-english-vol-2-front-matter',
        resumePath: '/library/panth-prakash-english/chapters/vol-2-front-matter',
      }))
    })
  })
})
