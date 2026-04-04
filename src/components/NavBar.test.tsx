import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from './NavBar'

test('renders all 4 nav tabs', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>)
  expect(screen.getByText('Home')).toBeInTheDocument()
  expect(screen.getByText('Library')).toBeInTheDocument()
  expect(screen.getByText('Banis')).toBeInTheDocument()
  expect(screen.getByText('More')).toBeInTheDocument()
})
