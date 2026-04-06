import { useState, useEffect } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (sessionStorage.getItem('splash-shown')) return false
    return true
  })
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!visible) return
    sessionStorage.setItem('splash-shown', '1')
    const timer = setTimeout(() => setExiting(true), 1500)
    return () => clearTimeout(timer)
  }, [visible])

  useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => setVisible(false), 500)
    return () => clearTimeout(timer)
  }, [exiting])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f0a1e] ${exiting ? 'splash-fade-out' : ''}`}
      onClick={() => setExiting(true)}
    >
      <div className="animate-glow-pulse rounded-full p-8">
        <p className="font-gurmukhi text-7xl text-gold splash-glow select-none">ੴ</p>
      </div>
      <p className="font-sans font-semibold text-xl text-gold-light mt-6 tracking-widest uppercase animate-fade-in">
        Nitnem
      </p>
      <p className="font-sans text-xs text-gold/50 mt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        Read &middot; Understand &middot; Grow
      </p>
    </div>
  )
}
