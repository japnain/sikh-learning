import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from './NavBar'

test('renders the new 5-tab product nav', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>)
  expect(screen.getByText('Home')).toBeInTheDocument()
  expect(screen.getByText('Read')).toBeInTheDocument()
  expect(screen.getByText('Learn')).toBeInTheDocument()
  expect(screen.getByText('Saved')).toBeInTheDocument()
  expect(screen.getByText('More')).toBeInTheDocument()
})
