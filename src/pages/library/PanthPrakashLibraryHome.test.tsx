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
    expect(screen.getByLabelText(/jump to page/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to page/i })).toBeInTheDocument()
    expect(screen.getByText(/1417 total pages/i)).toBeInTheDocument()
    expect(screen.getByText(/Volume 1 · 575 pages/i)).toBeInTheDocument()
    expect(screen.getByText(/Volume 2 · 842 pages/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Episode 1/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /^Start episode 1:/i })).toHaveAttribute('href', '/library/panth-prakash-english/episode/1')
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

  test('surfaces edition trust debt on the Panth Prakash overview', async () => {
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

    const trustDebt = screen.getByTestId('panth-edition-debt')
    expect(trustDebt).toHaveTextContent(/0 pages missing source mapping/i)
    expect(trustDebt).toHaveTextContent(/672 editorial reconstruction pages with raw source retained/i)
    expect(trustDebt).toHaveTextContent(/745 source-backed reading pages/i)
    expect(trustDebt).toHaveTextContent(/Review reconstruction pages episode-by-episode/i)
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
