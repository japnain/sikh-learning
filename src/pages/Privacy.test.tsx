import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import Privacy from './Privacy'

test('discloses both word providers and the user-controlled support report', () => {
  render(<MemoryRouter><Privacy /></MemoryRouter>)
  expect(screen.getByText(/Opening a word sends/)).toHaveTextContent('backend.searchgurbani.com')
  expect(screen.getByText(/Opening a word sends/)).toHaveTextContent('requesting IP address')
  expect(screen.getByText(/Up to 20 recent technical failures/)).toHaveTextContent('Reloading clears this history')
  expect(screen.getByText(/BaniDB-backed services provide scripture/)).toHaveTextContent('posting one to GitHub makes it public')
})
