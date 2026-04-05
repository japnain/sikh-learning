import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import More from './More'
import { useLanguageStore } from '../store/language'

beforeEach(() => {
  useLanguageStore.setState({
    hindiMode: false,
    fontSize: 22,
    englishSource: 'bdb',
  })
})

test('renders English translation source controls', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  expect(screen.getByText(/^English translation$/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /BaniDB/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Manmohan Singh/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Sant Singh Khalsa/i })).toBeInTheDocument()
})

test('persists selected English source', () => {
  render(<MemoryRouter><More /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: /Manmohan Singh/i }))
  expect(useLanguageStore.getState().englishSource).toBe('ms')
})
