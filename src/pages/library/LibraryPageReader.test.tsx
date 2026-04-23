import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LibraryPageReader from './LibraryPageReader'

describe('LibraryPageReader', () => {
  test('renders Panth Prakash page content for a browsed page route', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/1']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Panth Prakash/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Page 1/i)).toBeInTheDocument()
    expect(screen.getByText(/KULWANT SINGH/i)).toBeInTheDocument()
  })

  test('shows episode context when the page belongs to an extracted episode', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/348']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
    })

    expect(screen.getByTestId('library-page-meta')).toHaveTextContent(/Episode/i)
  })

  test('shows calmer reading controls with page jump, source context, and quality note', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/12']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/jump to page/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go to page/i })).toBeInTheDocument()
    expect(screen.getByTestId('library-page-meta')).toHaveTextContent(/Volume/i)
    expect(screen.getByTestId('library-page-meta')).toHaveTextContent(/Source page/i)
    expect(screen.getByTestId('library-page-provenance')).toHaveTextContent(/OCR draft|complete coverage/i)
  })

  test('premium contents pages render cleaned titles and curated contents layouts', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/5']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
    })

    expect(screen.getByText('Contents (Volume I)')).toBeInTheDocument()
    expect(screen.getByTestId('library-page-contents-layout')).toBeInTheDocument()
    expect(screen.getByTestId('library-page-presentation-note')).toHaveTextContent(/contents page/i)
    expect(within(screen.getByTestId('library-page-contents-layout')).getByText(/Dialogue Between Baba Nanak and Kaliyuga/i)).toBeInTheDocument()
  })

  test('premium contents pages keep the continued volume-two contents readable in the reader', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/582']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
    })

    expect(screen.getByText('Contents (Volume II, continued)')).toBeInTheDocument()
    expect(screen.getByTestId('library-page-meta')).not.toHaveTextContent(/Episode/i)
    expect(screen.getByTestId('library-page-contents-layout')).toBeInTheDocument()
    expect(within(screen.getByTestId('library-page-contents-layout')).getByText(/occupation and handing over of Sirhind/i)).toBeInTheDocument()
  })

  test('premium contents pages expose curated navigation links for browsing from the reader', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/581']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
    })

    const navigation = screen.getByTestId('library-page-curated-navigation')
    expect(within(navigation).getByRole('link', { name: /Opening essays and the first cycle of warrior episodes/i })).toHaveAttribute('href', '/library/panth-prakash-english/page/584')
    expect(within(navigation).getByRole('link', { name: /Nadar Shah, Zakaria Khan, Mehtab Singh, and Sukha Singh/i })).toHaveAttribute('href', '/library/panth-prakash-english/page/759')
    expect(within(navigation).getByText(/Browse these sections/i)).toBeInTheDocument()
  })

  test('premium front-matter destinations avoid stale episode metadata in the reader', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/584']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
    })

    expect(screen.getAllByText('PREFACE').length).toBeGreaterThan(0)
    expect(screen.getByTestId('library-page-meta')).not.toHaveTextContent(/Episode/i)
    expect(screen.getByTestId('library-page-presentation-note')).toHaveTextContent(/front or back matter page/i)
  })
})
