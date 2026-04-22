import { render, screen, waitFor } from '@testing-library/react'
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
})
