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

describe('Library removed sections', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
  })

  it('does not show Sarbloh Granth section', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/sarbloh/i)).not.toBeInTheDocument()
  })

  it('does not show Custom Texts section', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/custom texts/i)).not.toBeInTheDocument()
  })

  it('does not show Add New Book button', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/add new/i)).not.toBeInTheDocument()
  })

  it('shows all 4 source sections', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByText('Sri Guru Granth Sahib Ji')).toBeInTheDocument()
    expect(screen.getByText('Dasam Granth')).toBeInTheDocument()
    expect(screen.getByText('Bhai Gurdas Ji Vaaran')).toBeInTheDocument()
    expect(screen.getByText('Amrit Keertan')).toBeInTheDocument()
  })

  it('does not show Panthic Sources or BNL', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/Panthic Sources/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Bhai Nand Lal/i)).not.toBeInTheDocument()
  })
})
