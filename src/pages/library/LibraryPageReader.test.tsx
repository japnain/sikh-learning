import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

    const compass = screen.getByTestId('library-reading-compass')
    expect(within(compass).getByText('Page')).toBeInTheDocument()
    expect(within(compass).getByText('1')).toBeInTheDocument()
    expect(within(compass).getByText(/of 1417/i)).toBeInTheDocument()
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

  test('shows calmer reading controls with page jump, honest source context, and source details drawer', async () => {
    const user = userEvent.setup()

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
    expect(screen.getByTestId('library-page-meta')).toHaveTextContent(/Source scan page 12/i)
    expect(screen.getByTestId('library-page-meta')).not.toHaveTextContent(/Source page 0/i)
    expect(screen.getByTestId('library-page-provenance')).toHaveTextContent(/OCR-derived/i)
    expect(screen.getByTestId('library-page-provenance')).toHaveTextContent(/machine-cleaned/i)
    expect(screen.getByTestId('library-page-provenance')).toHaveTextContent(/needs human review/i)

    await user.click(screen.getByRole('button', { name: /source details/i }))
    const drawer = screen.getByTestId('library-source-details')
    expect(drawer).toHaveTextContent(/Source file/i)
    expect(drawer).toHaveTextContent(/Cleaned reading text/i)
    expect(drawer).toHaveTextContent(/Raw OCR retained/i)
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

  test('adds episode-first navigation, mini contents, and context cards to narrative pages', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/955']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
    })

    expect(screen.getByTestId('library-breadcrumb')).toHaveTextContent(/Panth Prakash/i)
    expect(screen.getByTestId('library-episode-progress')).toHaveTextContent(/Page 1 of 12 in episode 115/i)
    expect(screen.getByRole('link', { name: /previous episode/i })).toHaveAttribute('href', '/library/panth-prakash-english/page/951')
    expect(screen.getByRole('link', { name: /next episode/i })).toHaveAttribute('href', '/library/panth-prakash-english/page/967')
    expect(screen.getByTestId('library-mini-contents')).toHaveTextContent(/Episode 115/i)
    expect(screen.getByTestId('library-context-cards')).toHaveTextContent(/Why it matters/i)
    expect(screen.getByTestId('library-context-cards')).toHaveTextContent(/Bhai Taru Singh/i)
    expect(screen.getByTestId('library-context-cards')).toHaveTextContent(/Lahore/i)
    expect(screen.getByTestId('library-context-cards')).toHaveTextContent(/Related episodes/i)
  })

  test('labels source state honestly, including editorial reconstruction pages', async () => {
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

    const trustPanel = screen.getByTestId('library-trust-layer')
    expect(trustPanel).toHaveTextContent(/Text state/i)
    expect(trustPanel).toHaveTextContent(/Editorial reconstruction/i)
    expect(trustPanel).toHaveTextContent(/Source scan page 348/i)
    expect(trustPanel).toHaveTextContent(/Review: machine cleaned/i)
    expect(screen.getByTestId('library-page-provenance')).toHaveTextContent(/reconstructed from OCR-derived evidence/i)
  })

  test('offers raw OCR versus cleaned text and renders verse or note markers as source apparatus', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/page/955']}>
        <Routes>
          <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-page-reader')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /show raw ocr/i })).toBeInTheDocument()
    expect(screen.getByTestId('library-text-blocks')).toHaveTextContent(/Dohra/i)
    expect(screen.getByTestId('library-text-blocks')).toHaveTextContent(/Verse 16/i)
    expect(screen.getByTestId('library-source-apparatus')).toHaveTextContent(/Verse meter: Dohra/i)
    expect(screen.getByTestId('library-source-apparatus')).toHaveTextContent(/Verse marker: 16/i)

    await user.click(screen.getByRole('button', { name: /show raw ocr/i }))
    expect(screen.getByRole('button', { name: /show cleaned text/i })).toBeInTheDocument()
    expect(screen.getByTestId('library-source-mode-note')).toHaveTextContent(/Raw OCR/i)
  })
})
