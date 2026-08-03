import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

const ThrowError = () => { throw new Error('test error') }
const Fine = () => <p>all good</p>

test('renders children when no error', () => {
  render(<ErrorBoundary><Fine /></ErrorBoundary>)
  expect(screen.getByText('all good')).toBeInTheDocument()
})

test('renders fallback UI when child throws', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<ErrorBoundary><ThrowError /></ErrorBoundary>)
  expect(screen.getByText('This view needs a clean reset.')).toBeInTheDocument()
  expect(screen.getByText(/Your reading state is still on this device/i)).toBeInTheDocument()
  expect(screen.getByTestId('page-app-error')).toHaveAttribute('data-ai-state', 'degraded')
  expect(document.querySelector('.app-scroll-viewport')).toBeNull()
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  spy.mockRestore()
})

test('offers a full reload instead of retrying a rejected render tree in place', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<ErrorBoundary><ThrowError /></ErrorBoundary>)
  expect(screen.getByRole('button', { name: /Reload app/i })).toHaveAttribute('data-ai-action', 'reload-app')
  expect(screen.queryByRole('button', { name: /Try again/i })).not.toBeInTheDocument()
  spy.mockRestore()
})
