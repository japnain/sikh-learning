import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import Support from './Support'
import Privacy from './Privacy'

test('offers troubleshooting without sending users to a personal repository or inventing a contact', () => {
  render(<MemoryRouter><Support /></MemoryRouter>)

  expect(screen.getByTestId('support-contact-unavailable')).toHaveTextContent('Support delivery is not available')
  expect(screen.getByTestId('support-contact-unavailable')).toHaveTextContent('does not send it')
  expect(screen.queryByTestId('support-report-problem')).not.toBeInTheDocument()
  expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/more', '/privacy'])
  expect(screen.getByRole('heading', { name: 'Try these first' })).toBeInTheDocument()
  expect(screen.getByText(/Do not post account identifiers/)).toBeInTheDocument()
})

test('privacy accurately describes the unavailable report delivery path', () => {
  render(<MemoryRouter><Privacy /></MemoryRouter>)

  expect(screen.getByText(/Support lists troubleshooting steps/)).toHaveTextContent('does not offer report delivery')
  expect(screen.getByRole('link', { name: 'Open Support' })).toHaveAttribute('href', '/support')
})
