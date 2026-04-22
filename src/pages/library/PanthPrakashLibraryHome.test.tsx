import { render, screen, waitFor } from '@testing-library/react'
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

    expect(screen.getByText(/Panth Prakash/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/jump to page/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to page/i })).toBeInTheDocument()
    expect(screen.getByText(/1417 total pages/i)).toBeInTheDocument()
    expect(screen.getByText(/Volume 1 · 575 pages/i)).toBeInTheDocument()
    expect(screen.getByText(/Volume 2 · 842 pages/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Episode 1/i).length).toBeGreaterThan(0)
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
