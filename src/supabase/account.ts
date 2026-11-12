import { getNaamrasSupabaseClient } from './client'
import { getAuthRedirectUrl } from './authRedirect'
import { useCloudSyncStore } from '../store/cloudSync'

export type AccountError = 'unavailable' | 'credentials' | 'unconfirmed' | 'weak' | 'rate' | 'email' | 'expired' | 'samePassword'
export type AccountResult = { ok: true; confirmationRequired?: boolean } | { ok: false; reason: AccountError }

function errorReason(error: unknown): AccountError {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null
  if (code === 'invalid_credentials') return 'credentials'
  if (code === 'email_not_confirmed') return 'unconfirmed'
  if (code === 'weak_password') return 'weak'
  if (code === 'same_password') return 'samePassword'
  if (code === 'email_address_invalid') return 'email'
  if (['over_request_rate_limit', 'over_email_send_rate_limit', 'over_sms_send_rate_limit'].includes(String(code))) return 'rate'
  if (['session_not_found', 'reauthentication_needed', 'current_password_required', 'otp_expired'].includes(String(code))) return 'expired'
  return 'unavailable'
}

// Client signup requirements; Supabase also validates. Sign-in accepts older passwords.
export function meetsPasswordPolicy(password: string) {
  return password.length >= 12 && password.length <= 128 && /[a-z]/.test(password)
    && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*()_+\-=[\]{};'":|<>?,./`~\\]/.test(password)
}

export async function submitEmailAccount(mode: 'signin' | 'signup' | 'reset' | 'magic', email: string, password = ''): Promise<AccountResult> {
  const client = getNaamrasSupabaseClient()
  if (!client || !useCloudSyncStore.getState().availableProviders.includes('email')) return { ok: false, reason: 'unavailable' }
  const address = email.trim()
  if (!address || address.length > 254) return { ok: false, reason: 'email' }
  if (mode === 'signup' && !meetsPasswordPolicy(password)) return { ok: false, reason: 'weak' }
  try {
    if (mode === 'signup') {
      const { data, error } = await client.auth.signUp({ email: address, password, options: { emailRedirectTo: getAuthRedirectUrl() } })
      if (error) return { ok: false, reason: errorReason(error) }
      return { ok: true, confirmationRequired: !data.session }
    }
    const { error } = mode === 'signin'
      ? await client.auth.signInWithPassword({ email: address, password })
      : mode === 'reset'
        ? await client.auth.resetPasswordForEmail(address, { redirectTo: getAuthRedirectUrl(true) })
        : await client.auth.signInWithOtp({ email: address, options: { emailRedirectTo: getAuthRedirectUrl(), shouldCreateUser: false } })
    // A magic-link request must not disclose whether the account exists.
    if (mode === 'magic' && error?.code === 'otp_disabled') return { ok: true }
    return error ? { ok: false, reason: errorReason(error) } : { ok: true }
  } catch { return { ok: false, reason: 'unavailable' } }
}

export async function updateRecoveredPassword(password: string): Promise<AccountResult> {
  const client = getNaamrasSupabaseClient()
  if (!client) return { ok: false, reason: 'unavailable' }
  if (!meetsPasswordPolicy(password)) return { ok: false, reason: 'weak' }
  try {
    const { data, error: sessionError } = await client.auth.getSession()
    if (sessionError || !data.session) return { ok: false, reason: 'expired' }
    const { error } = await client.auth.updateUser({ password })
    return error ? { ok: false, reason: errorReason(error) } : { ok: true }
  } catch { return { ok: false, reason: 'unavailable' } }
}
