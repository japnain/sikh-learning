import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import Support from './Support'
import { clearDiagnosticHistory, reportProviderFailure } from '../utils/diagnostics'

beforeEach(() => {
  clearDiagnosticHistory()
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

test('offers a reviewable privacy-safe report without inventing a support email or sending it', async () => {
  vi.stubEnv('VITE_DIAGNOSTICS_ENDPOINT', '')
  reportProviderFailure('banidb', new Error('secret search terms'))
  render(<MemoryRouter><Support /></MemoryRouter>)

  expect(screen.getByTestId('page-support')).toHaveAttribute('lang', 'en')
  expect(screen.getByTestId('support-report-problem')).toHaveAttribute('href', expect.stringContaining('github.com'))
  expect(screen.queryByTestId('support-email')).not.toBeInTheDocument()
  expect(screen.getByTestId('support-email-unavailable')).toBeInTheDocument()

  const report = screen.getByRole('textbox', { name: 'Report to review' }) as HTMLTextAreaElement
  expect(report.value).toContain('provider_request_failed')
  expect(report.value).not.toContain('secret search terms')
  fireEvent.click(screen.getByRole('button', { name: 'Copy report' }))
  await waitFor(() => expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
    expect.stringContaining('Steps to reproduce:'),
  ))
  expect(screen.getByRole('button', { name: 'Report copied' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Download report' })).toBeInTheDocument()
})

test('copies user-reviewed edits and retains a manual fallback when clipboard is denied', async () => {
  vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Denied'))
  render(<MemoryRouter><Support /></MemoryRouter>)
  fireEvent.change(screen.getByRole('textbox', { name: 'Report to review' }), { target: { value: 'My reviewed report' } })
  fireEvent.click(screen.getByRole('button', { name: 'Copy report' }))
  await screen.findByText(/Select the report text to copy it manually/)
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('My reviewed report')
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
