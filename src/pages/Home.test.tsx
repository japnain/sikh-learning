import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

beforeEach(() => {
  useScriptureCacheStore.getState().clearAll()
  useProgressStore.setState({ streak: 0, currentSession: null, studied: [], reviewQueue: [], lastStudied: null })
})

test('renders greeting', () => {
  renderHome()
  // greeting function returns one of three strings depending on time of day
  const greeting = screen.getByRole('heading', { level: 1 })
  expect(greeting).toBeInTheDocument()
})

test('shows loading skeleton initially', () => {
  renderHome()
  // Loading skeleton has animate-pulse class; Today's Pick section is present
  expect(screen.getByText(/today'?s pick/i)).toBeInTheDocument()
})

test('shows today\'s pick after load', async () => {
  renderHome()
  await waitFor(() => {
    expect(screen.queryByText(/no verse available today/i)).not.toBeInTheDocument()
    // MSW returns verses; at least one Gurmukhi element should be present
    const gurmukhi = document.querySelector('[lang="pa-Guru"]')
    expect(gurmukhi).toBeInTheDocument()
  })
})

test('shows quick action buttons', () => {
  renderHome()
  expect(screen.getByText(/study/i)).toBeInTheDocument()
  expect(screen.getByText(/library/i)).toBeInTheDocument()
  expect(screen.queryByText(/add text/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument()
})

it('shows Study, Library, and Banis quick action buttons', async () => {
  render(<Home />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> })
  expect(screen.getByText(/study/i)).toBeInTheDocument()
  expect(screen.getByText(/library/i)).toBeInTheDocument()
  expect(screen.getByText(/banis/i)).toBeInTheDocument()
  expect(screen.queryByText(/add text/i)).not.toBeInTheDocument()
})

test('does not show recently studied section when empty', () => {
  renderHome()
  expect(screen.queryByText(/recently studied/i)).not.toBeInTheDocument()
})

test('does not show continue reading when no session', () => {
  renderHome()
  expect(screen.queryByText(/continue reading/i)).not.toBeInTheDocument()
})

test('shows continue reading when session exists', () => {
  useProgressStore.setState({
    currentSession: { scriptureId: 'sggs', lastCardIndex: 0 }
  })
  renderHome()
  expect(screen.getByText(/pick up where you left off/i)).toBeInTheDocument()
})
