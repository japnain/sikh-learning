import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import AccountPage from './Account'
import { useCloudSyncStore } from '../store/cloudSync'
import { useLocaleStore } from '../store/locale'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('../supabase/client', () => ({ getNaamrasSupabaseClient: () => ({ auth: { getSession } }) }))
vi.mock('../supabase/runtime', () => ({ signInWithProvider: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  useLocaleStore.setState({ locale: 'en' })
  useCloudSyncStore.getState().reset()
  useCloudSyncStore.setState({ status: 'signed-out', availableProviders: ['email'] })
})

test('an expired recovery link offers a fresh reset and never exposes the password-update form', async () => {
  getSession.mockResolvedValue({ data: { session: null }, error: null })
  render(<MemoryRouter initialEntries={['/auth/recovery#context=unused&error_code=otp_expired']}><AccountPage /></MemoryRouter>)
  expect(await screen.findByRole('alert')).toHaveTextContent('expired')
  expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument()
  expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument()
})

test('a cancelled provider return does not treat a pre-existing session as a successful new sign-in', async () => {
  getSession.mockResolvedValue({ data: { session: { user: { id: 'old' } } }, error: null })
  render(<MemoryRouter initialEntries={['/auth/callback?error=access_denied&error_description=private-provider-detail']}><AccountPage /></MemoryRouter>)
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified')
  expect(screen.queryByText('private-provider-detail')).not.toBeInTheDocument()
  expect(screen.queryByText('You’re signed in.')).not.toBeInTheDocument()
})

test('a verified recovery session opens a new-password form', async () => {
  getSession.mockResolvedValue({ data: { session: { user: { id: 'reader' } } }, error: null })
  render(<MemoryRouter initialEntries={['/auth/recovery']}><AccountPage /></MemoryRouter>)
  expect(await screen.findByLabelText('New password', { exact: true })).toBeInTheDocument()
  expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument()
})

test('a verified email or OAuth return offers a route back into reading', async () => {
  getSession.mockResolvedValue({ data: { session: { user: { id: 'reader' } } }, error: null })
  render(<MemoryRouter initialEntries={['/auth/callback']}><AccountPage /></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: 'You’re signed in.' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Continue to NaamRas' })).toHaveAttribute('href', '/')
})
