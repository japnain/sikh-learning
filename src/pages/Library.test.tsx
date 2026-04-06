import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Library from './Library'
import { useBookmarksStore } from '../store/bookmarks'
import { useProgressStore } from '../store/progress'

describe('Library bookmarks section', () => {
  beforeEach(() => {
    useBookmarksStore.setState({ bookmarks: [] })
  })

  test('bookmarks section hidden when no bookmarks', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /saved passage/i })).not.toBeInTheDocument()
  })

  test('bookmarks section visible when bookmarks exist', () => {
    useBookmarksStore.setState({
      bookmarks: [{
        id: 'bookmark-1', type: 'bani', title: 'Japji Sahib',
        source: 'G', ang: 1, savedAt: new Date().toISOString()
      }]
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /1 saved passage/i })).toBeInTheDocument()
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
    useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
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

  it('shows the remaining scripture sections without Amrit Keertan', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /source browsing/i }))
    expect(screen.getByText('Sri Guru Granth Sahib Ji')).toBeInTheDocument()
    expect(screen.getByText('Dasam Granth')).toBeInTheDocument()
    expect(screen.getByText('Bhai Gurdas Ji Vaaran')).toBeInTheDocument()
    expect(screen.queryByText('Amrit Keertan')).not.toBeInTheDocument()
  })

  it('does not show Panthic Sources or BNL', () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.queryByText(/Panthic Sources/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Bhai Nand Lal/i)).not.toBeInTheDocument()
  })

  it('shows a readable resume reference instead of the raw internal session id', () => {
    useProgressStore.setState({
      currentSession: { scriptureId: 'G-256', lastCardIndex: 0 },
    })
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(screen.getByText(/Sri Guru Granth Sahib Ji · Ang 256/i)).toBeInTheDocument()
    expect(screen.queryByText(/^G-256$/i)).not.toBeInTheDocument()
  })
})
