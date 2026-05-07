import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LibraryEpisodeReader from './LibraryEpisodeReader'

describe('LibraryEpisodeReader', () => {
  test('renders a native continuous Panth Prakash episode reader with source pages secondary', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/episode/52']}>
        <Routes>
          <Route path="/library/:workId/episode/:episodeNumber" element={<LibraryEpisodeReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panth-episode-reader')).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /The Chamba miracle and Banda Singh Bahadur/i })).toBeInTheDocument()
    expect(screen.getByTestId('panth-episode-reader')).not.toHaveClass('pb-10')
    expect(screen.getByTestId('panth-episode-reader')).not.toHaveClass('pb-12')
    expect(screen.getByTestId('panth-episode-reader')).toHaveStyle({
      paddingBottom: 'calc(var(--nav-stack-height, 7rem) + var(--safe-area-bottom) + 10rem)',
    })
    expect(screen.getByTestId('panth-episode-reader')).toHaveTextContent(/Episode 52/i)
    expect(screen.getByTestId('panth-episode-reader')).toHaveTextContent(/Volume 1/i)
    expect(screen.getByTestId('panth-episode-summary')).toHaveTextContent(/Chamba/i)
    expect(screen.getByTestId('panth-episode-text')).toHaveTextContent(/stone horse in the stream/i)
    expect(screen.getByTestId('panth-episode-source-strip')).toHaveTextContent(/Source pages 347–348/i)
    expect(within(screen.getByTestId('panth-episode-source-strip')).getByRole('link', { name: /view source page 348/i })).toHaveAttribute('href', '/library/panth-prakash-english/page/348')
    expect(screen.getByRole('link', { name: /previous episode/i })).toHaveAttribute('href', '/library/panth-prakash-english/episode/51')
    expect(screen.getByRole('link', { name: /next episode/i })).toHaveAttribute('href', '/library/panth-prakash-english/episode/53')
    expect(screen.getByTestId('panth-episode-reader')).not.toHaveTextContent(/Rehat|Sikh Rehat Maryada|OCR|machine-cleaned|raw source|editorial reconstruction/i)
  })

  test('keeps source evidence behind an explicit provenance drawer without making OCR the reader surface', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/episode/115']}>
        <Routes>
          <Route path="/library/:workId/episode/:episodeNumber" element={<LibraryEpisodeReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panth-episode-reader')).toBeInTheDocument()
    })

    expect(screen.getByTestId('panth-episode-text')).toHaveTextContent(/Dohra/i)
    expect(screen.getByTestId('panth-episode-apparatus')).toHaveTextContent(/Verse meter: Dohra/i)
    expect(screen.getByTestId('panth-episode-apparatus')).toHaveTextContent(/Verse marker: 16/i)
    expect(screen.queryByTestId('panth-episode-raw-source')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show source evidence/i }))
    expect(screen.getByTestId('panth-episode-raw-source')).toHaveTextContent(/Source text retained/i)
    expect(screen.getByTestId('panth-episode-raw-source')).toHaveTextContent(/Source page 380/i)
    expect(screen.getByTestId('panth-episode-raw-source')).not.toHaveTextContent(/OCR|machine-cleaned|raw OCR/i)
  })

  test('keeps remediation labels out of the default native reader flow', async () => {
    render(
      <MemoryRouter initialEntries={['/library/panth-prakash-english/episode/52']}>
        <Routes>
          <Route path="/library/:workId/episode/:episodeNumber" element={<LibraryEpisodeReader />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panth-episode-reader')).toBeInTheDocument()
    })

    const trustLayer = screen.getByTestId('panth-episode-trust-layer')
    expect(trustLayer).toHaveTextContent(/Native reading coverage/i)
    expect(trustLayer).toHaveTextContent(/2 pages in this episode/i)
    expect(trustLayer).toHaveTextContent(/source pages retained/i)
    expect(trustLayer).not.toHaveTextContent(/OCR|raw source|editorial reconstruction|machine-cleaned/i)
    expect(screen.getByTestId('panth-episode-text')).not.toHaveTextContent(/gl oct aft asst/i)
  })
})
