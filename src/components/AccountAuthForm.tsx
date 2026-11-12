import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ACCOUNT_COPY } from '../content/accountCopy'
import { useCloudSyncStore } from '../store/cloudSync'
import { submitEmailAccount, updateRecoveredPassword, type AccountResult } from '../supabase/account'
import { refreshAvailableProviders, signInWithProvider } from '../supabase/runtime'
import { getNaamrasSupabaseConfig } from '../supabase/config'
import type { UiLocale } from '../types'
import '../styles/account.css'

export type AccountMode = 'signin' | 'signup' | 'reset' | 'magic' | 'recovery'

export default function AccountAuthForm({ locale, initialMode = 'signin', onPasswordSaved }: {
  locale: UiLocale; initialMode?: AccountMode; onPasswordSaved?: () => void
}) {
  const copy = ACCOUNT_COPY[locale]
  const providers = useCloudSyncStore(state => state.availableProviders)
  const status = useCloudSyncStore(state => state.status)
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const navigatedRef = useRef(false)
  const id = useId()
  const loading = status === 'booting' || (status === 'idle' && getNaamrasSupabaseConfig().enabled)
  const offline = status === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine)
  const disabled = pending || loading || offline
  const emailEnabled = providers.includes('email')
  const socialMode = mode === 'signin' || mode === 'signup'
  const passwordMode = socialMode || mode === 'recovery'
  const newPassword = mode === 'signup' || mode === 'recovery'
  const social = (['google', 'apple'] as const).filter(provider => providers.includes(provider))

  useEffect(() => { if (navigatedRef.current) headingRef.current?.focus() }, [mode])

  function changeMode(next: AccountMode) {
    if (pendingRef.current) return
    navigatedRef.current = true
    setMode(next)
    setPassword('')
    setConfirmation('')
    setShowPassword(false)
    setError(null)
    setNotice(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pendingRef.current || disabled) return
    if (mode === 'recovery' && password !== confirmation) { setError(copy.mismatch); return }
    pendingRef.current = true
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      const result: AccountResult = mode === 'recovery'
        ? await updateRecoveredPassword(password)
        : await submitEmailAccount(mode, email, password)
      if (!result.ok) { setError(copy.errors[result.reason]); return }
      setPassword('')
      setConfirmation('')
      if (mode === 'signup' && result.confirmationRequired) setNotice(copy.confirmation)
      if (mode === 'reset') setNotice(copy.resetSent)
      if (mode === 'magic') setNotice(copy.magicSent)
      if (mode === 'recovery') { setNotice(copy.passwordSaved); onPasswordSaved?.() }
    } catch { setError(copy.errors.unavailable) }
    finally { pendingRef.current = false; setPending(false) }
  }

  async function socialSignIn(provider: 'apple' | 'google') {
    if (pendingRef.current || disabled) return
    pendingRef.current = true
    setPending(true)
    setError(null)
    setNotice(copy.opening)
    try {
      const result = await signInWithProvider(provider)
      if (!result.ok) { setError(copy.errors.unavailable); setNotice(null) }
    } catch { setError(copy.errors.unavailable); setNotice(null) }
    finally { pendingRef.current = false; setPending(false) }
  }

  return <section className="account-auth" aria-labelledby={`${id}-title`} lang={locale}>
    <h2 id={`${id}-title`} className="account-auth-title" tabIndex={-1} ref={headingRef}>{copy[mode]}</h2>
    {loading ? <p role="status" className="account-note">{copy.checking}</p> : null}
    {offline ? <p role="status" className="account-note">{copy.offline}</p> : null}
    {socialMode && social.length > 0 ? <div className="account-social">
      {social.map(provider => <button type="button" key={provider} className={provider === 'apple' ? 'account-provider account-provider-apple' : 'account-provider'} onClick={() => void socialSignIn(provider)} disabled={disabled} data-ai-action={`cloud-sign-in-${provider}`}>
        <span aria-hidden="true" className="account-provider-symbol">{provider === 'google' ? <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.36z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.59C7.19 7.72 9.4 5.96 12 5.96z"/></svg> : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.05 12.54c.03 3.13 2.75 4.17 2.78 4.19-.02.07-.44 1.49-1.44 2.96-.87 1.27-1.77 2.54-3.19 2.57-1.4.03-1.85-.83-3.45-.83-1.59 0-2.09.8-3.41.86-1.37.05-2.42-1.38-3.3-2.65-1.8-2.6-3.18-7.34-1.33-10.54.92-1.59 2.56-2.6 4.34-2.63 1.35-.02 2.64.92 3.47.92.82 0 2.37-1.13 4-0.96.68.03 2.6.28 3.83 2.08-.1.06-2.29 1.34-2.27 4.03zM14.42 4.7c.73-.89 1.22-2.12 1.09-3.35-1.05.04-2.32.7-3.08 1.59-.68.79-1.28 2.06-1.12 3.27 1.17.09 2.37-.6 3.11-1.51z" /></svg>}</span>
        {copy[provider]}
      </button>)}
      {emailEnabled ? <p className="account-divider">{copy.divider}</p> : null}
    </div> : null}
    {!loading && !emailEnabled && !social.length ? <div><p role="status" className="account-note">{copy.errors.unavailable}</p><button type="button" className="account-guest" disabled={pending || offline} onClick={() => { setPending(true); void refreshAvailableProviders().finally(() => setPending(false)) }}>{copy.retry}</button></div> : null}
    {emailEnabled || mode === 'recovery' ? <form onSubmit={event => void submit(event)} className="account-form" aria-busy={pending}>
      {mode !== 'recovery' ? <div className="account-field">
        <label htmlFor={`${id}-email`}>{copy.email}</label>
        <input id={`${id}-email`} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} inputMode="email" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setNotice(null) }} disabled={pending} />
      </div> : null}
      {passwordMode ? <div className="account-field">
        <label htmlFor={`${id}-password`}>{mode === 'recovery' ? copy.newPassword : copy.password}</label>
        <div className="account-password-field"><input id={`${id}-password`} type={showPassword ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} required minLength={newPassword ? 12 : undefined} maxLength={newPassword ? 128 : undefined} value={password} onChange={event => setPassword(event.target.value)} disabled={pending} aria-describedby={newPassword ? `${id}-password-hint` : undefined} />
          <button type="button" aria-label={showPassword ? copy.hide : copy.show} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} disabled={pending}>{showPassword ? copy.hide : copy.show}</button></div>
        {newPassword ? <p id={`${id}-password-hint`} className="account-note">{copy.passwordHint}</p> : null}
      </div> : null}
      {mode === 'recovery' ? <div className="account-field"><label htmlFor={`${id}-confirmation`}>{copy.confirmPassword}</label><input id={`${id}-confirmation`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" required maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={pending} /></div> : null}
      {error ? <p role="alert" className="account-error">{error}</p> : null}
      {notice ? <p role="status" className="account-notice">{notice}</p> : null}
      <button type="submit" className="account-primary" disabled={disabled} data-ai-action={`account-${mode}`}>{pending ? copy.busy : copy[`${mode}Action`]}</button>
    </form> : <>{error ? <p role="alert" className="account-error">{error}</p> : null}{notice ? <p role="status" className="account-notice">{notice}</p> : null}</>}
    {emailEnabled ? <div className="account-mode-links">
      {mode === 'signin' ? <><button type="button" onClick={() => changeMode('reset')} disabled={pending}>{copy.forgot}</button><button type="button" onClick={() => changeMode('magic')} disabled={pending}>{copy.useLink}</button></> : null}
      <button type="button" onClick={() => changeMode(mode === 'signin' ? 'signup' : 'signin')} disabled={pending}>{mode === 'signin' ? copy.create : mode === 'signup' ? copy.existing : copy.back}</button>
    </div> : null}
  </section>
}
