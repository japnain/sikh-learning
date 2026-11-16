import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import Support from './Support'

beforeEach(() => {
  vi.stubEnv('VITE_SUPPORT_EMAIL', '')
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
  expect(screen.queryByTestId('support-report-problem')).not.toBeInTheDocument()
  expect(screen.getAllByRole('link').every(link => !link.getAttribute('href')?.includes('github.com'))).toBe(true)
  expect(screen.queryByTestId('support-email')).not.toBeInTheDocument()
  expect(screen.getByTestId('support-email-unavailable')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Copy report template' }))
  await waitFor(() => expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
    expect.stringContaining('Steps to reproduce:'),
  ))
  expect(screen.getByRole('button', { name: 'Report template copied' })).toBeInTheDocument()
})

test('shows only the configured project support inbox as a contact path', () => {
  vi.stubEnv('VITE_SUPPORT_EMAIL', 'help+reader@naamras.example')

  render(<MemoryRouter><Support /></MemoryRouter>)

  expect(screen.getByTestId('support-email')).toHaveAttribute(
    'href',
    'mailto:help%2Breader@naamras.example?subject=NaamRas%20support',
  )
  expect(screen.queryByTestId('support-email-unavailable')).not.toBeInTheDocument()
  expect(screen.queryByTestId('support-report-problem')).not.toBeInTheDocument()
})
