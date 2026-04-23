import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from './NavBar'

test('renders the new 5-tab product nav', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>)
  expect(screen.getByTestId('primary-nav')).toHaveAttribute('aria-label', 'Primary navigation')
  expect(screen.getByTestId('nav-tab-home')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-read')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-learn')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-saved')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-more')).toBeInTheDocument()
  expect(screen.getByLabelText('Home tab')).toBeInTheDocument()
  expect(screen.getByLabelText('Read tab')).toBeInTheDocument()
  expect(screen.getByLabelText('Learn tab')).toBeInTheDocument()
  expect(screen.getByLabelText('Saved tab')).toBeInTheDocument()
  expect(screen.getByLabelText('More tab and settings')).toBeInTheDocument()
})

test('keeps the Learn route limited to the shared product nav', () => {
  render(
    <MemoryRouter initialEntries={['/learn?tab=topics']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('primary-nav')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-learn')).toBeInTheDocument()
  expect(screen.queryByTestId('learn-surface-rail')).not.toBeInTheDocument()
  expect(screen.queryByTestId('learn-subsection-rail')).not.toBeInTheDocument()
  expect(screen.queryByTestId('learn-detail-rail')).not.toBeInTheDocument()
})

test('keeps the Learn nav tab active on nested learn routes', () => {
  render(
    <MemoryRouter initialEntries={['/learn/topics/topic-anxiety']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-learn')).toHaveAttribute('aria-current', 'page')
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
