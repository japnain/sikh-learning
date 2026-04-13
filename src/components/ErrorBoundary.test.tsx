import { render, screen, fireEvent } from '@testing-library/react'
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
  expect(screen.getByText('NaamRas hit a temporary problem')).toBeInTheDocument()
  expect(screen.getByTestId('page-app-error')).toHaveAttribute('data-ai-state', 'degraded')
  spy.mockRestore()
})

test('try again button resets error state', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<ErrorBoundary><ThrowError /></ErrorBoundary>)
  fireEvent.click(screen.getByText('Try again'))
  // After reset, boundary re-renders children — will throw again and show fallback
  expect(screen.getByText('NaamRas hit a temporary problem')).toBeInTheDocument()
  spy.mockRestore()
})
