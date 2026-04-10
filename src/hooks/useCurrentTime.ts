import { useEffect, useState } from 'react'

export function useCurrentTime(resolutionMs: number = 60000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, resolutionMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [resolutionMs])

  return now
}
