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

  test('renders a landing view with page jump, volume summary, and episode list', async () => {
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

    expect(screen.getByRole('heading', { name: /Panth Prakash/i })).toBeInTheDocument()
    expect(screen.getByTestId('panth-library-home')).not.toHaveClass('pb-10')
    expect(screen.getByTestId('panth-library-home')).not.toHaveClass('pb-12')
    expect(screen.getByTestId('panth-library-home')).toHaveStyle({
      paddingBottom: 'calc(var(--nav-stack-height, 7rem) + var(--safe-area-bottom) + 10rem)',
    })
    expect(screen.getByLabelText(/jump to page/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to page/i })).toBeInTheDocument()
    expect(screen.getByText(/1417 total pages/i)).toBeInTheDocument()
    expect(screen.getByText(/Volume 1 · 575 pages/i)).toBeInTheDocument()
    expect(screen.getByText(/Volume 2 · 842 pages/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Episode 1/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /^Start episode 1:/i })).toHaveAttribute('href', '/library/panth-prakash-english/episode/1')
  })

  test('keeps overview secondary metadata readable in dark mode', async () => {
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

    expect(screen.getByText('Jump to page')).toHaveClass('dark:text-dark-text/74')
    expect(screen.getByText('Search within Panth Prakash pages')).toHaveClass('dark:text-dark-text/74')
    expect(screen.getByText('Search episodes')).toHaveClass('dark:text-dark-text/74')
    expect(screen.getByTestId('panth-episode-count-meta')).toHaveClass('dark:text-dark-text/74')
    expect(screen.getByTestId('panth-native-coverage').querySelector('ul')).toHaveClass('dark:text-dark-text/74')
  })

  test('exposes the full 169-episode browser with volume tabs, search, filters, and load more', async () => {
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

    expect(screen.getByText(/169 extracted episodes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volume 1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volume 2/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/search episodes/i)).toBeInTheDocument()
    expect(screen.getByText(/Showing 24 of 169 episodes/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /load more episodes/i }))
    expect(screen.getByText(/Showing 48 of 169 episodes/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/search episodes/i), 'Bunga S. Sham Singh')
    expect(screen.getByText(/Showing 1 of 1 episodes/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Episode 169/i })).toHaveAttribute('href', '/library/panth-prakash-english/episode/169')
  })

  test('adds editorial arcs and cleaned display titles without changing the source episode index', async () => {
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

    expect(screen.getByRole('button', { name: /Guru period/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Afghan and Lahore conflicts/i })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/search episodes/i), 'Machhiwara')
    expect(screen.getByText(/Guru Gobind Singh at Machhiwara/i)).toBeInTheDocument()
    expect(screen.queryByText(/Machhiwara Nea/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Guru period/i).length).toBeGreaterThan(0)
  })

  test('searches full Panth Prakash page text with episode-aware result links', async () => {
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

    await user.type(screen.getByLabelText(/search within Panth Prakash pages/i), 'Sahibzada Jujhar Singh')
    await user.click(screen.getByRole('button', { name: /search pages/i }))

    await waitFor(() => {
      expect(screen.getByTestId('panth-full-text-results')).toHaveTextContent(/Sahibzada Jujhar Singh/i)
    })
    expect(screen.getByTestId('panth-full-text-results')).toHaveTextContent(/Page 169/i)
    expect(screen.getByRole('link', { name: /Open episode 19/i })).toHaveAttribute('href', '/library/panth-prakash-english/episode/19')
    expect(screen.getByRole('link', { name: /Open page 169/i })).toHaveAttribute('href', '/library/panth-prakash-english/page/169')
  })

  test('surfaces complete native reading coverage on the Panth Prakash overview', async () => {
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

    const nativeCoverage = screen.getByTestId('panth-native-coverage')
    expect(nativeCoverage).toHaveTextContent(/Complete native reader/i)
    expect(nativeCoverage).toHaveTextContent(/1,417 pages bundled/i)
    expect(nativeCoverage).toHaveTextContent(/169 episodes/i)
    expect(nativeCoverage).toHaveTextContent(/Volumes 1 and 2/i)
    expect(nativeCoverage).toHaveTextContent(/0 pages missing source mapping/i)
    expect(nativeCoverage).not.toHaveTextContent(/OCR|machine-cleaned|raw source|trust debt|editorial reconstruction/i)
  })

  test('shows a continue reading card when the current session belongs to Panth Prakash', async () => {
    useProgressStore.setState({
      currentSession: {
        scriptureId: 'panth-prakash-english-565',
        resumePath: '/library/panth-prakash-english/page/565',
        updatedAt: '2026-04-19T12:00:00.000Z',
      },
    })

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

    expect(screen.getAllByText(/Continue reading/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /resume page 565/i })[0]).toHaveAttribute('href', '/library/panth-prakash-english/page/565')
  })
})
