import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PanthPrakashLibraryHome from './PanthPrakashLibraryHome'
import { useProgressStore } from '../../store/progress'

describe('PanthPrakashLibraryHome', () => {
  beforeEach(() => {
    useProgressStore.setState({
      streak: 0,
      currentSession: null,
      studied: [],
      reviewQueue: [],
      lastStudied: null,
    })
  })

  test('renders the EPUB chapter overview without page or episode routes', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english']}>
        <Routes>
          <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panth-library-home')).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /Sri Gur Panth Prakash/i })).toBeInTheDocument()
    expect(screen.getByTestId('panth-epub-coverage')).toHaveTextContent(/171 chapters/i)
    expect(screen.getByTestId('panth-epub-coverage')).toHaveTextContent(/Source: EPUB/i)
    expect(screen.getByRole('link', { name: /start volume i/i })).toHaveAttribute('href', '/library/panth-prakash-english/chapters/vol-1-front-matter')
    expect(screen.getByRole('link', { name: /start volume ii/i })).toHaveAttribute('href', '/library/panth-prakash-english/chapters/vol-2-front-matter')
    expect(screen.queryByLabelText(/jump to page/i)).not.toBeInTheDocument()
  })

  test('filters chapters and links results to chapter routes', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english']}>
        <Routes>
          <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panth-library-home')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/search chapters/i), 'Bunga S. Sham Singh')
    expect(screen.getByText(/Showing 1 of 1 chapters/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Episode 169/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-169-episode-about-bunga-s-sham-singh'
    )
  })

  test('searches EPUB-derived book text and opens matching chapters', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english']}>
        <Routes>
          <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panth-library-home')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/search within Panth Prakash chapters/i), 'origin of the Khalsa')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      expect(screen.getByTestId('panth-full-text-results')).toHaveTextContent(/Origin of the Khalsa/i)
    })
    expect(screen.getByRole('link', { name: /The Episode About the Origin of the Khalsa/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-001-the-episode-about-the-origin-of-the-khalsa'
    )
  })

  test('ignores retired page resume sessions and shows chapter resume sessions', async () => {
    useProgressStore.setState({
      currentSession: {
        scriptureId: 'panth-prakash-english-565',
        resumePath: '/library/panth-prakash-english/page/565',
        updatedAt: '2026-04-19T12:00:00.000Z',
      },
    })

    const { rerender } = render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english']}>
        <Routes>
          <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panth-library-home')).toBeInTheDocument()
    })

    expect(screen.queryByRole('link', { name: /continue reading/i })).not.toBeInTheDocument()

    useProgressStore.setState({
      currentSession: {
        scriptureId: 'panth-prakash-english-episode-001',
        resumePath: '/library/panth-prakash-english/chapters/episode-001-the-episode-about-the-origin-of-the-khalsa',
        updatedAt: '2026-04-19T12:00:00.000Z',
      },
    })

    rerender(
      <MemoryRouter initialEntries={['/library/panth-prakash-english']}>
        <Routes>
          <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('link', { name: /continue reading/i })).toHaveAttribute(
      'href',
      '/library/panth-prakash-english/chapters/episode-001-the-episode-about-the-origin-of-the-khalsa'
    )
  })
})
