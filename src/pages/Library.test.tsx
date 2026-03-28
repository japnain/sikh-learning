import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Library from './Library'
import { useBookmarksStore } from '../store/bookmarks'

describe('Library bookmarks section', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
  })

  test('bookmarks section hidden when no bookmarks', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/Bookmarks/)).not.toBeInTheDocument()
  })

  test('bookmarks section visible when bookmarks exist', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1', type: 'bani', title: 'Japji Sahib',
        source: 'G', ang: 1, savedAt: new Date().toISOString()
      }]
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByText(/Bookmarks/)).toBeInTheDocument()
    expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  })

  test('bookmark card shows scripture reference', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1', type: 'bani', title: 'Japji Sahib',
        source: 'G', ang: 1, savedAt: new Date().toISOString()
      }]
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByText(/SGGS · Ang 1/)).toBeInTheDocument()
  })

  test('delete button removes bookmark', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1', type: 'bani', title: 'Japji Sahib',
        source: 'G', ang: 1, savedAt: new Date().toISOString()
      }]
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('Remove bookmark'))
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(0)
  })
})
