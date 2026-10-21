import { useCallback, useEffect, useId, useState } from 'react'
import { getHomeArtworkId, useHomeArtworkStore } from '../store/homeArtwork'
import { ECLIPSE_ARTWORK, getHomeArtworkImageStyle, type HomeArtworkAsset } from '../utils/homeArtwork'

export function useHomeArtwork() {
  const preference = useHomeArtworkStore()
  const visitToken = useId()
  const [date, setDate] = useState(() => new Date())
  const [catalog, setCatalog] = useState<HomeArtworkAsset[]>([])
  const [failedAttempt, setFailedAttempt] = useState<string | null>(null)
  const chosenId = getHomeArtworkId(preference, date)
  const chosenAttempt = `${chosenId}:${preference.applyRevision}`
  const { beginVisit, endVisit } = preference

  useEffect(() => {
    beginVisit(visitToken)
    return () => endVisit(visitToken)
  }, [beginVisit, endVisit, visitToken])

  useEffect(() => {
    if (chosenId === 'eclipse' || catalog.length) return
    let cancelled = false
    void import('../data/homeArtworkCatalog').then(module => {
      if (!cancelled) setCatalog(module.homeArtworkCatalog)
    }).catch(() => { /* Keep the reliable Eclipse fallback available. */ })
    return () => { cancelled = true }
  }, [catalog.length, chosenId])

  useEffect(() => {
    if (preference.mode !== 'daily') return
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      const now = new Date()
      setDate(now)
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      window.clearTimeout(timer)
      timer = window.setTimeout(refresh, next.getTime() - now.getTime() + 50)
    }
    const handleVisibility = () => { if (!document.hidden) refresh() }
    refresh()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [preference.mode])

  const asset = failedAttempt !== chosenAttempt && chosenId !== 'eclipse'
    ? catalog.find(entry => entry.id === chosenId) ?? ECLIPSE_ARTWORK
    : ECLIPSE_ARTWORK
  const onImageError = useCallback(() => setFailedAttempt(chosenAttempt), [chosenAttempt])
  return { asset, imageStyle: getHomeArtworkImageStyle(asset), onImageError, imageKey: `${asset.id}:${preference.applyRevision}` }
}
