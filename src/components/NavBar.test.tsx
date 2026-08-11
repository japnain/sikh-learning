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
  expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Read' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Saved' })).toBeInTheDocument()
  const moreLink = screen.getByRole('link', { name: 'More settings and information' })
  expect(moreLink).toBeInTheDocument()
  expect(moreLink).toHaveTextContent('More — More settings and information')
})

test('keeps curated book routes inside the Read navigation flow', () => {
  render(
    <MemoryRouter initialEntries={['/library/panth-prakash-english/chapters/episode-001-the-episode-about-the-origin-of-the-khalsa']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-read')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByTestId('nav-tab-saved')).not.toHaveAttribute('aria-current')
})

test('uses Saved as the canonical shelf destination', () => {
  render(
    <MemoryRouter initialEntries={['/saved']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-saved')).toHaveAttribute('href', '/saved')
  expect(screen.getByTestId('nav-tab-saved')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByTestId('nav-tab-read')).not.toHaveAttribute('aria-current')
})

test('keeps vocabulary review inside the Saved navigation flow', () => {
  render(
    <MemoryRouter initialEntries={['/vocab']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-saved')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByTestId('nav-tab-home')).not.toHaveAttribute('aria-current')
})

test('keeps Nitnem customization inside the Home navigation flow', () => {
  render(
    <MemoryRouter initialEntries={['/nitnem/customize']}>
      <NavBar />
    </MemoryRouter>
  )

  expect(screen.getByTestId('nav-tab-home')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByTestId('nav-tab-more')).not.toHaveAttribute('aria-current')
})
