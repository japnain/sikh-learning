import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from './NavBar'

test('renders the 4-tab product nav', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>)
  expect(screen.getByTestId('primary-nav')).toHaveAttribute('aria-label', 'Primary navigation')
  expect(screen.getByTestId('nav-tab-home')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-read')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-saved')).toBeInTheDocument()
  expect(screen.getByTestId('nav-tab-more')).toBeInTheDocument()
  expect(screen.getByLabelText('Home tab')).toBeInTheDocument()
  expect(screen.getByLabelText('Read tab')).toBeInTheDocument()
  expect(screen.getByLabelText('Saved tab')).toBeInTheDocument()
  expect(screen.getByLabelText('More tab and settings')).toBeInTheDocument()
})

test('keeps the Saved nav tab active on nested library routes', () => {
  render(
    <MemoryRouter initialEntries={['/library/panth-prakash-english/chapters/episode-001-the-episode-about-the-origin-of-the-khalsa']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-saved')).toHaveAttribute('aria-current', 'page')
})
