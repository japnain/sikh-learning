import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import Support from './Support'

beforeEach(() => {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

test('offers a privacy-safe report template without inventing a support email', async () => {
  render(<MemoryRouter><Support /></MemoryRouter>)

  expect(screen.getByTestId('page-support')).toHaveAttribute('lang', 'en')
  expect(screen.getByTestId('support-report-problem')).toHaveAttribute('href', expect.stringContaining('github.com'))
  expect(screen.queryByTestId('support-email')).not.toBeInTheDocument()
  expect(screen.getByTestId('support-email-unavailable')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Copy report template' }))
  await waitFor(() => expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
    expect.stringContaining('Steps to reproduce:'),
  ))
  expect(screen.getByRole('button', { name: 'Report template copied' })).toBeInTheDocument()
})

test('shows a configured public support inbox as the primary non-GitHub contact path', () => {
  vi.stubEnv('VITE_SUPPORT_EMAIL', 'help+reader@naamras.example')

  render(<MemoryRouter><Support /></MemoryRouter>)

  expect(screen.getByTestId('support-email')).toHaveAttribute(
    'href',
    'mailto:help%2Breader@naamras.example?subject=NaamRas%20support',
  )
  expect(screen.queryByTestId('support-email-unavailable')).not.toBeInTheDocument()
})
