import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from './NavBar'
import { useLearnRailStore } from '../store/learnRail'

beforeEach(() => {
  useLearnRailStore.getState().reset()
})

test('renders the new 5-tab product nav', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>)
  expect(screen.getByTestId('primary-nav')).toHaveAttribute('aria-label', 'Primary navigation')
  expect(screen.getByTestId('nav-tab-home')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-read')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-learn')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-saved')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-more')).toBeInTheDocument()
  expect(screen.getByText('Home')).toBeInTheDocument()
  expect(screen.getByText('Read')).toBeInTheDocument()
  expect(screen.getByText('Learn')).toBeInTheDocument()
  expect(screen.getByText('Saved')).toBeInTheDocument()
  expect(screen.getByText('More')).toBeInTheDocument()
})

test('shows stacked learn rails only on the learn route', () => {
  render(
    <MemoryRouter initialEntries={['/learn?tab=topics']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('learn-surface-rail')).toBeInTheDocument()
  expect(screen.getByTestId('learn-subsection-rail')).toBeInTheDocument()
  expect(screen.getByTestId('topics-search')).toBeInTheDocument()
  expect(screen.getByTestId('topics-current-guide')).toBeInTheDocument()
  expect(screen.queryByTestId('learn-detail-rail')).not.toBeInTheDocument()
})

test('shows the conditional learn detail rail for deep learn views', () => {
  render(
    <MemoryRouter initialEntries={['/learn?tab=topics&topic=topic-anxiety&detail=topic']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('learn-detail-rail')).toBeInTheDocument()
  expect(screen.getByTestId('topics-topic-insight')).toBeInTheDocument()
  expect(screen.getByTestId('topics-topic-action')).toBeInTheDocument()
})

test('renders the published shabad detail rail for the default shabads surface', () => {
  useLearnRailStore.setState({ visibleDetailRailKey: 'shabads-shabad' })

  render(
    <MemoryRouter initialEntries={['/learn?tab=shabads']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('learn-detail-rail')).toBeInTheDocument()
  expect(screen.getByTestId('shabads-shabad-summary')).toBeInTheDocument()
  expect(screen.getByTestId('shabads-shabad-lines')).toBeInTheDocument()
})

test('does not render learn rails outside the learn route', () => {
  render(
    <MemoryRouter initialEntries={['/banis']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.queryByTestId('learn-surface-rail')).not.toBeInTheDocument()
  expect(screen.queryByTestId('learn-subsection-rail')).not.toBeInTheDocument()
  expect(screen.queryByTestId('learn-detail-rail')).not.toBeInTheDocument()
})
