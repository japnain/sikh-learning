import { beforeEach, expect, test, vi } from 'vitest'
import { useCloudSyncStore } from '../store/cloudSync'
import { meetsPasswordPolicy, submitEmailAccount, updateRecoveredPassword } from './account'

const { auth, getClient } = vi.hoisted(() => ({ auth: {
  signUp: vi.fn(), signInWithPassword: vi.fn(), resetPasswordForEmail: vi.fn(), signInWithOtp: vi.fn(), getSession: vi.fn(), updateUser: vi.fn(),
}, getClient: vi.fn() }))
vi.mock('./client', () => ({ getNaamrasSupabaseClient: getClient }))

beforeEach(() => {
  vi.resetAllMocks()
  getClient.mockReturnValue({ auth })
  useCloudSyncStore.setState({ availableProviders: ['email'], status: 'signed-out' })
  window.history.replaceState({}, '', '/account?next=https://untrusted.example')
})

test('creates an email/password account and reports required confirmation without exposing session details', async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
  expect(await submitEmailAccount('signup', ' reader@example.com ', 'Practice-2026!')).toEqual({ ok: true, confirmationRequired: true })
  expect(auth.signUp).toHaveBeenCalledWith({ email: 'reader@example.com', password: 'Practice-2026!', options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
})

test('accepts an immediately verified signup session', async () => {
  auth.signUp.mockResolvedValue({ data: { session: { user: { id: 'reader' } } }, error: null })
  expect(await submitEmailAccount('signup', 'reader@example.com', 'Practice-2026!')).toEqual({ ok: true, confirmationRequired: false })
})

test('lets existing users sign in with passwords that predate the new signup policy', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: null })
  expect(await submitEmailAccount('signin', 'reader@example.com', 'older-pass')).toEqual({ ok: true })
  expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'reader@example.com', password: 'older-pass' })
})

test.each([
  ['invalid_credentials', 'credentials'], ['email_not_confirmed', 'unconfirmed'], ['weak_password', 'weak'],
  ['over_email_send_rate_limit', 'rate'], ['unrecognized_code', 'unavailable'],
])('maps %s without returning raw provider errors', async (code, reason) => {
  auth.signInWithPassword.mockResolvedValue({ error: { code, message: 'Private provider detail' } })
  expect(await submitEmailAccount('signin', 'reader@example.com', 'anything')).toEqual({ ok: false, reason })
})

test('handles rejected transports and missing configuration', async () => {
  auth.signInWithPassword.mockRejectedValue(new Error('Network detail'))
  expect(await submitEmailAccount('signin', 'reader@example.com', 'anything')).toEqual({ ok: false, reason: 'unavailable' })
  getClient.mockReturnValue(null)
  expect(await submitEmailAccount('signup', 'reader@example.com', 'Practice-2026!')).toEqual({ ok: false, reason: 'unavailable' })
})

test('does not submit weak signup passwords or disabled email methods', async () => {
  expect(await submitEmailAccount('signup', 'reader@example.com', 'weak')).toEqual({ ok: false, reason: 'weak' })
  useCloudSyncStore.setState({ availableProviders: ['google'] })
  expect(await submitEmailAccount('signin', 'reader@example.com', 'anything')).toEqual({ ok: false, reason: 'unavailable' })
  expect(auth.signUp).not.toHaveBeenCalled()
  expect(auth.signInWithPassword).not.toHaveBeenCalled()
})

test('password recovery uses a fixed, public recovery page', async () => {
  auth.resetPasswordForEmail.mockResolvedValue({ error: null })
  expect(await submitEmailAccount('reset', 'reader@example.com')).toEqual({ ok: true })
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('reader@example.com', { redirectTo: `${window.location.origin}/auth/recovery` })
})

test('magic links do not silently create passwordless accounts or enumerate unknown addresses', async () => {
  auth.signInWithOtp.mockResolvedValue({ error: { code: 'otp_disabled' } })
  expect(await submitEmailAccount('magic', 'reader@example.com')).toEqual({ ok: true })
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'reader@example.com', options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: false } })
})

test('password update refuses an expired session and preserves retryable backend failures', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  expect(await updateRecoveredPassword('Practice-2026!')).toEqual({ ok: false, reason: 'expired' })
  expect(auth.updateUser).not.toHaveBeenCalled()
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'reader' } } }, error: null })
  auth.updateUser.mockResolvedValueOnce({ error: { code: 'same_password' } }).mockResolvedValueOnce({ error: null })
  expect(await updateRecoveredPassword('Practice-2026!')).toEqual({ ok: false, reason: 'samePassword' })
  expect(await updateRecoveredPassword('New-practice-2026!')).toEqual({ ok: true })
  expect(auth.updateUser).toHaveBeenLastCalledWith({ password: 'New-practice-2026!' })
})

test.each(['short-A1!', 'lowercase-2026!', 'UPPERCASE-2026!', 'NoDigits-Here!', 'NoSymbolsHere2026', 'A1!' + 'a'.repeat(126)])('rejects a password missing a policy requirement: %s', password => {
  expect(meetsPasswordPolicy(password)).toBe(false)
})
