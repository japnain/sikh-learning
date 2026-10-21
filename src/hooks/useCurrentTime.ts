import { useEffect, useState } from 'react'

export function useCurrentTime(resolutionMs: number = 60000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let timer: number
    const resolution = Math.max(100, resolutionMs)
    const schedule = () => {
      timer = window.setTimeout(() => {
        setNow(Date.now())
        schedule()
      }, resolution - Date.now() % resolution)
    }
    const refresh = () => {
      if (document.hidden) return
      window.clearTimeout(timer)
      setNow(Date.now())
      schedule()
    }
    schedule()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [resolutionMs])

  return now
}
