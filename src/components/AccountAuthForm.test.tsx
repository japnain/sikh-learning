import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import AccountAuthForm from './AccountAuthForm'
import { useCloudSyncStore } from '../store/cloudSync'
import { submitEmailAccount, updateRecoveredPassword } from '../supabase/account'
import { signInWithProvider } from '../supabase/runtime'

vi.mock('../supabase/account', () => ({ submitEmailAccount: vi.fn(), updateRecoveredPassword: vi.fn() }))
vi.mock('../supabase/runtime', () => ({ signInWithProvider: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  useCloudSyncStore.getState().reset()
  useCloudSyncStore.setState({ configured: true, status: 'signed-out', availableProviders: ['email'] })
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
})

function fillEmail() { fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'reader@example.com' } }) }
function fillPassword(label = 'Password', value = 'Practice-2026!') { fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } }) }

test('supports password managers and prevents repeated signup submissions', async () => {
  let resolve!: (result: { ok: true; confirmationRequired: true }) => void
  vi.mocked(submitEmailAccount).mockReturnValue(new Promise(done => { resolve = done }))
  render(<AccountAuthForm locale="en" initialMode="signup" />)
  fillEmail(); fillPassword()
  expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('autocomplete', 'new-password')
  fireEvent.submit(screen.getByRole('button', { name: 'Create account', exact: true }).closest('form')!)
  fireEvent.submit(screen.getByRole('button', { name: 'Please wait…' }).closest('form')!)
  expect(submitEmailAccount).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled()
  await act(async () => resolve({ ok: true, confirmationRequired: true }))
  expect(screen.getByRole('status')).toHaveTextContent('If confirmation is needed')
  expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('')
  expect(screen.getByLabelText('Email address')).toHaveValue('reader@example.com')
})

test('shows only verified providers and wires both social flows', async () => {
  useCloudSyncStore.setState({ availableProviders: ['google', 'apple', 'email'] })
  vi.mocked(signInWithProvider).mockResolvedValue({ ok: false })
  render(<AccountAuthForm locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
  await waitFor(() => expect(signInWithProvider).toHaveBeenCalledWith('google'))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Apple' }))
  await waitFor(() => expect(signInWithProvider).toHaveBeenCalledWith('apple'))
})

test('failed password sign-in stays retryable and offers recovery', async () => {
  vi.mocked(submitEmailAccount).mockResolvedValue({ ok: false, reason: 'credentials' })
  render(<AccountAuthForm locale="en" />)
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument()
  fillEmail(); fillPassword()
  fireEvent.submit(screen.getByRole('button', { name: 'Sign in', exact: true }).closest('form')!)
  expect(await screen.findByRole('alert')).toHaveTextContent('email or password is incorrect')
  expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }))
  expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toHaveFocus()
  expect(screen.getByLabelText('Email address')).toHaveValue('reader@example.com')
  expect(screen.queryByLabelText('Password', { exact: true })).not.toBeInTheDocument()
})

test('recovery validates confirmation before changing the password', async () => {
  const onPasswordSaved = vi.fn()
  vi.mocked(updateRecoveredPassword).mockResolvedValue({ ok: true })
  render(<AccountAuthForm locale="en" initialMode="recovery" onPasswordSaved={onPasswordSaved} />)
  fillPassword('New password'); fillPassword('Confirm new password', 'Different-2026!')
  fireEvent.submit(screen.getByRole('button', { name: 'Save new password' }).closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('don’t match')
  expect(updateRecoveredPassword).not.toHaveBeenCalled()
  fillPassword('Confirm new password')
  fireEvent.submit(screen.getByRole('button', { name: 'Save new password' }).closest('form')!)
  await waitFor(() => expect(onPasswordSaved).toHaveBeenCalledOnce())
})

test('reset confirmation does not disclose whether an account exists', async () => {
  vi.mocked(submitEmailAccount).mockResolvedValue({ ok: true })
  render(<AccountAuthForm locale="en" initialMode="reset" />)
  fillEmail()
  fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!)
  expect(await screen.findByRole('status')).toHaveTextContent('If an account exists')
  expect(submitEmailAccount).toHaveBeenCalledWith('reset', 'reader@example.com', '')
})

test('offline sign-in keeps its values and disables sending', () => {
  useCloudSyncStore.setState({ status: 'offline' })
  render(<AccountAuthForm locale="en" />)
  fillEmail()
  expect(screen.getByRole('status')).toHaveTextContent('offline')
  expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled()
})

test.each(['pa', 'hi'] as const)('localizes account actions in %s', locale => {
  render(<AccountAuthForm locale={locale} initialMode="signup" />)
  expect(screen.queryByText('Create account')).not.toBeInTheDocument()
  expect(screen.getByRole('region')).toHaveAttribute('lang', locale)
  expect(screen.getByRole('textbox')).toHaveAccessibleName()
})
