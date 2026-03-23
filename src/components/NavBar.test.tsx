import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from './NavBar'

test('renders all 5 nav tabs', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>)
  expect(screen.getByText('Home')).toBeInTheDocument()
  expect(screen.getByText('Library')).toBeInTheDocument()
  expect(screen.getByText('Study')).toBeInTheDocument()
  expect(screen.getByText('Quiz')).toBeInTheDocument()
  expect(screen.getByText('Vocab')).toBeInTheDocument()
})
