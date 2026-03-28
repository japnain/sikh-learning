import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Banis from './Banis'
import { useBookmarksStore } from '../store/bookmarks'

function renderBanis() {
  return render(<MemoryRouter><Banis /></MemoryRouter>)
}

beforeEach(() => {
  useBookmarksStore.setState({ bookmarks: [] })
})

test('renders page heading', () => {
  renderBanis()
  expect(screen.getByText('Banis')).toBeInTheDocument()
})

test('renders SGGS scripture section button', () => {
  renderBanis()
  expect(screen.getByText(/Sri Guru Granth Sahib Ji/i)).toBeInTheDocument()
})

test('renders DG scripture section button', () => {
  renderBanis()
  expect(screen.getByText(/Dasam Granth/i)).toBeInTheDocument()
})

test('SGGS categories visible after expanding SGGS section', () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sri Guru Granth Sahib Ji/i))
  expect(screen.getByText('Daily Prayers')).toBeInTheDocument()
  expect(screen.getByText('Long Compositions')).toBeInTheDocument()
})

test('bani rows visible after expanding a category', () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sri Guru Granth Sahib Ji/i))
  fireEvent.click(screen.getByText('Daily Prayers'))
  expect(screen.getByText('Japji Sahib')).toBeInTheDocument()
  expect(screen.getByText('Anand Sahib')).toBeInTheDocument()
})

test('info card visible after tapping a bani row', () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sri Guru Granth Sahib Ji/i))
  fireEvent.click(screen.getByText('Daily Prayers'))
  // click the bani row button (not the already-visible text — find the row button)
  const japjiButtons = screen.getAllByText('Japji Sahib')
  fireEvent.click(japjiButtons[0])
  expect(screen.getByText('Begin Study →')).toBeInTheDocument()
  expect(screen.getByText(/SGGS · Ang 1/)).toBeInTheDocument()
})

test('DG bir ras category visible after expanding DG section', () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Dasam Granth/i))
  expect(screen.getByText('Bir Ras')).toBeInTheDocument()
})

test('bookmark saved when save button clicked from info card', () => {
  renderBanis()
  fireEvent.click(screen.getByText(/Sri Guru Granth Sahib Ji/i))
  fireEvent.click(screen.getByText('Daily Prayers'))
  const japjiButtons = screen.getAllByText('Japji Sahib')
  fireEvent.click(japjiButtons[0])
  fireEvent.click(screen.getByText(/🔖 Bookmark/))
  fireEvent.click(screen.getByText('Save Bookmark'))
  expect(useBookmarksStore.getState().hasBookmark('G', 1)).toBe(true)
})
