import { describe, it, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Study from './Study'
import { useBookmarksStore } from '../store/bookmarks'
import { useScriptureCacheStore } from '../store/scriptureCache'

beforeEach(() => {
  useScriptureCacheStore.getState().clearAll()
})

describe('Study bookmark button', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
  })

  test('bookmark button not rendered when not in API mode', () => {
    render(<MemoryRouter><Study /></MemoryRouter>)
    // In non-API mode (scripture picker), bookmark button should not appear
    expect(screen.queryByText('🔖')).not.toBeInTheDocument()
  })

  test('bookmark button rendered in API mode after entries load', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.queryByText('🔖')).toBeInTheDocument())
  })

  test('bookmark form appears on clicking unactive bookmark button', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.queryByText('🔖')).toBeInTheDocument())
    fireEvent.click(screen.getByText('🔖'))
    expect(screen.getByPlaceholderText('Add a note...')).toBeInTheDocument()
    expect(screen.getByText('Save Bookmark')).toBeInTheDocument()
  })

  test('clicking save bookmark adds to store', async () => {
    render(
      <MemoryRouter initialEntries={['/study?source=G&ang=1']}>
        <Routes><Route path="/study" element={<Study />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.queryByText('🔖')).toBeInTheDocument())
    fireEvent.click(screen.getByText('🔖'))
    fireEvent.click(screen.getByText('Save Bookmark'))
    expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(true)
  })
})

describe('Study scripture picker', () => {
  it('scripture picker shows 7 sources', async () => {
    render(<MemoryRouter><Study /></MemoryRouter>)
    expect(screen.getByText('Sri Guru Granth Sahib Ji')).toBeInTheDocument()
    expect(screen.getByText('Dasam Granth')).toBeInTheDocument()
    expect(screen.getByText('Bhai Gurdas Ji Vaaran')).toBeInTheDocument()
    expect(screen.queryByText('Sarbloh Granth')).not.toBeInTheDocument()
  })
})
