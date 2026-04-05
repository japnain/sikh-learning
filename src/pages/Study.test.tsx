import { describe, it, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Study from './Study'
import { useBookmarksStore } from '../store/bookmarks'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { useLanguageStore } from '../store/language'

beforeEach(() => {
  useScriptureCacheStore.getState().clearAll()
  useLanguageStore.setState({ hindiMode: false, fontSize: 22, englishSource: 'bdb' })
})

describe('Study bookmark button', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
  })

  test('bookmark button not rendered when not in API mode', () => {
    render(<MemoryRouter><Study /></MemoryRouter>)
    // In non-API mode (scripture picker), bookmark button should not appear
    expect(screen.queryByLabelText('Bookmark')).not.toBeInTheDocument()
  })

  test('bookmark button rendered in API mode after entries load', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.queryByLabelText('Bookmark')).toBeInTheDocument())
  })

  test('bookmark form appears on clicking unactive bookmark button', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.queryByLabelText('Bookmark')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Bookmark'))
    expect(screen.getByPlaceholderText('Add a note...')).toBeInTheDocument()
    expect(screen.getByText('Save Bookmark')).toBeInTheDocument()
  })

  test('clicking save bookmark adds to store', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.queryByLabelText('Bookmark')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Bookmark'))
    fireEvent.click(screen.getByText('Save Bookmark'))
    expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(true)
  })
})

describe('Study renders all shabads on an ang', () => {
  it('renders multiple study cards for all shabads on a page', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    // Mock data has 2 shabads (shabadId 1 and 2), so we should see 2 study cards
    await waitFor(() => {
      const cards = screen.getAllByTestId('study-card')
      expect(cards.length).toBe(2)
    })
  })

  it('shows content from all shabads, not just the first', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    // Shabad 1 text (from mock): ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ + ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ
    // Shabad 2 text (from mock): ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ
    await waitFor(() => {
      expect(screen.getByText('ੴ')).toBeInTheDocument()
      expect(screen.getByText('ਸੋਚੈ')).toBeInTheDocument()
    })
  })

  it('renders separate verse blocks inside the reader', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      const lines = screen.getAllByTestId('study-line')
      expect(lines.length).toBeGreaterThan(2)
    })
  })

  it('uses the selected English translation source', async () => {
    useLanguageStore.setState({ englishSource: 'ms' })
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/There is but One God/i)).toBeInTheDocument()
    })
  })
})

describe('Study exact shabad mode', () => {
  it('renders a focused exact search result view', async () => {
    render(
      <MemoryRouter initialEntries={['/study?shabadId=50&verseId=100']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Exact Search Result')).toBeInTheDocument()
      expect(screen.getByText(/SGGS · Ang 1 · Verse 100/i)).toBeInTheDocument()
      const cards = screen.getAllByTestId('study-card')
      expect(cards.length).toBe(1)
      expect(screen.getByText('ੴ')).toBeInTheDocument()
      expect(screen.getByText(/open full shabad/i)).toBeInTheDocument()
    })
  })
})

describe('Study hukamnama mode', () => {
  it('renders the normalized hukamnama reader view', async () => {
    render(
      <MemoryRouter initialEntries={['/study?hukamnamaDate=2026-04-05']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Hukamnama · 2026-04-05/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Raag Dhanaasree/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Go to source shabad/i)).toBeInTheDocument()
      expect(screen.getAllByTestId('study-line').length).toBeGreaterThan(1)
    })
  })
})
