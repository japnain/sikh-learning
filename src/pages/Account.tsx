import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AccountAuthForm from '../components/AccountAuthForm'
import NaamRasLogoMark from '../components/NaamRasLogoMark'
import { ACCOUNT_COPY } from '../content/accountCopy'
import { useCloudSyncStore } from '../store/cloudSync'
import { useLocaleStore } from '../store/locale'
import { getNaamrasSupabaseClient } from '../supabase/client'
import { hasAuthReturnError } from '../supabase/authRedirect'
import { DEFAULT_HOME_ARTWORK } from '../utils/homeArtwork'
import '../styles/account.css'

export default function AccountPage() {
  const location = useLocation()
  const locale = useLocaleStore(state => state.locale)
  const currentUser = useCloudSyncStore(state => state.currentUser)
  const copy = ACCOUNT_COPY[locale]
  const recovery = location.pathname === '/auth/recovery'
  const callback = location.pathname === '/auth/callback'
  const [returnError] = useState(() => hasAuthReturnError(location.search, location.hash))
  const [verified, setVerified] = useState(!recovery && !callback)
  const [sessionValid, setSessionValid] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    if (!recovery && !callback) return
    let active = true
    const client = getNaamrasSupabaseClient()
    // getSession waits for the SDK to finish consuming a verified email/OAuth return.
    void (async () => {
      try {
        const result = await client?.auth.getSession()
        if (active) setSessionValid(Boolean(result?.data.session) && !result?.error && !returnError)
      } finally {
        if (active) {
          setVerified(true)
          // Never leave auth fragments or provider errors in browser history.
          window.history.replaceState(window.history.state, '', window.location.pathname)
        }
      }
    })().catch(() => { /* The visible expired-link state covers failed initialization. */ })
    return () => { active = false }
  }, [callback, recovery, returnError])

  const connected = Boolean(currentUser || sessionValid) && !returnError && (!recovery || passwordSaved)
  const invalidReturn = (callback || recovery) && verified && !sessionValid
  const initialMode = recovery && sessionValid && !passwordSaved ? 'recovery'
    : new URLSearchParams(location.search).get('mode') === 'signup' ? 'signup' : invalidReturn && recovery ? 'reset' : 'signin'

  return <div className="court-account" data-page="account" lang={locale}>
    <div className="court-account-art"><img src={DEFAULT_HOME_ARTWORK.src} alt={DEFAULT_HOME_ARTWORK.localizedDescription[locale]} width={1199} height={1476} /><span>{DEFAULT_HOME_ARTWORK.displayName[locale]}</span></div>
    <div className="court-account-panel">
      <Link to="/" className="court-account-brand" aria-label="NaamRas"><NaamRasLogoMark size={32} /><span>NaamRas</span></Link>
      <h1 className="court-account-heading">{connected ? copy.connected : 'NaamRas'}</h1>
      <p className="account-note">{connected ? passwordSaved ? copy.passwordSaved : copy.connectedBody : copy.body}</p>
      {!verified ? <p role="status" className="account-notice">{copy.checking}</p> : connected ? <Link to="/" className="account-primary">{copy.continue}</Link> : <>
        {invalidReturn || returnError ? <p role="alert" className="account-error">{copy.errors.expired}</p> : null}
        <AccountAuthForm key={initialMode} locale={locale} initialMode={initialMode} onPasswordSaved={() => setPasswordSaved(true)} />
        <Link to="/" className="account-guest">{copy.guest}</Link>
      </>}
      <p className="account-coverage">{copy.coverage}</p>
      <footer className="account-footer"><Link to="/privacy">{copy.privacy}</Link><Link to="/support">{copy.help}</Link></footer>
    </div>
  </div>
}
