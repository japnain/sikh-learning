import { useState, useEffect } from 'react'
import { getEditorialCopy } from '../content/editorialCopy'
import NaamRasLogoMark from './NaamRasLogoMark'

const editorial = getEditorialCopy('en')

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (sessionStorage.getItem('splash-shown')) return false
    return true
  })
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!visible) return
    sessionStorage.setItem('splash-shown', '1')
    const timer = setTimeout(() => setExiting(true), 450)
    return () => clearTimeout(timer)
  }, [visible])

  useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => setVisible(false), 180)
    return () => clearTimeout(timer)
  }, [exiting])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070c0e] ${exiting ? 'splash-fade-out' : ''}`}
      onClick={() => setExiting(true)}
      role="status"
      aria-live="polite"
      aria-label="Loading NaamRas"
      data-testid="splash-screen"
    >
      <div className="animate-glow-pulse p-8" aria-hidden="true">
        <NaamRasLogoMark className="splash-glow" size={84} testId="splash-wordmark" />
      </div>
      <p className="font-sans font-semibold text-xl text-gold-light mt-6 tracking-widest uppercase animate-fade-in">
        {editorial?.brand.name ?? 'NaamRas'}
      </p>
      <p className="font-sans text-xs text-gold/50 mt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        {editorial?.brand.domain ?? 'Naamras.xyz'}
      </p>
      <p className="font-sans text-[11px] text-gold/45 mt-1 animate-fade-in" style={{ animationDelay: '0.45s' }}>
        {editorial?.brand.splashTagline ?? 'Read. Reflect. Return.'}
      </p>
    </div>
  )
}
