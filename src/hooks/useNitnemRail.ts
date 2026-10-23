import { useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

/** Presentation only: moving around the rail never changes an intentional paath. */
export function useNitnemRail(ids: readonly string[], activeId: string | undefined, initialId?: string | null) {
  const [browsed, setBrowsed] = useState<{ id: string; index: number } | null>(() => {
    const index = initialId ? ids.indexOf(initialId) : -1
    return index >= 0 ? { id: initialId!, index } : null
  })
  const [announcement, setAnnouncement] = useState('')
  const railRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef(new Map<string, HTMLElement>())
  const lastPositionRef = useRef('')
  const measuredWidthRef = useRef(0)
  const navigationTargetRef = useRef<string | null>(null)
  const pointerFocusRef = useRef(false)
  const order = ids.join('|')
  const preferredId = browsed?.id ?? activeId
  const index = Math.max(0, ids.includes(preferredId ?? '') ? ids.indexOf(preferredId!) : Math.min(browsed?.index ?? 0, ids.length - 1))
  const id = ids[index]
  if (browsed && id && (browsed.id !== id || browsed.index !== index)) {
    setBrowsed({ id, index })
  }

  const positionCard = (optionId: string, behavior: ScrollBehavior) => {
    const rail = railRef.current
    const card = cardsRef.current.get(optionId)
    const first = ids[0] ? cardsRef.current.get(ids[0]) : undefined
    if (!rail || !card || !first) return
    const left = card.offsetLeft - first.offsetLeft
    if (typeof rail.scrollTo === 'function') rail.scrollTo({ left, behavior })
    else rail.scrollLeft = left
  }

  useLayoutEffect(() => {
    const key = `${order}:${id ?? ''}`
    if (!id || lastPositionRef.current === key) return
    lastPositionRef.current = key
    measuredWidthRef.current = railRef.current?.clientWidth ?? 0
    positionCard(id, 'instant')
    // Only identity/order changes reposition the rail. Scroll events own their movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, order])

  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail || !id) return
    measuredWidthRef.current = rail.clientWidth
    const resize = () => {
      if (rail.clientWidth === measuredWidthRef.current) return
      measuredWidthRef.current = rail.clientWidth
      navigationTargetRef.current = null
      positionCard(id, 'instant')
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(rail)
    window.addEventListener('resize', resize)
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize) }
    // The callback only repositions when inline size changes, never while swiping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, order])

  const browse = (optionId: string, options?: { animate?: boolean; announce?: string }) => {
    const nextIndex = ids.indexOf(optionId)
    if (nextIndex < 0) return
    lastPositionRef.current = `${order}:${optionId}`
    setBrowsed({ id: optionId, index: nextIndex })
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const animate = options?.animate && !reduced
    navigationTargetRef.current = animate ? optionId : null
    positionCard(optionId, animate ? 'smooth' : 'instant')
    if (options?.announce) setAnnouncement(options.announce)
  }

  const onScroll = () => {
    const rail = railRef.current
    const first = ids[0] ? cardsRef.current.get(ids[0]) : undefined
    if (!rail || !first || rail.clientWidth === 0) return
    if (rail.clientWidth !== measuredWidthRef.current) {
      measuredWidthRef.current = rail.clientWidth
      navigationTargetRef.current = null
      if (id) positionCard(id, 'instant')
      return
    }
    const target = navigationTargetRef.current ? cardsRef.current.get(navigationTargetRef.current) : null
    if (target && Math.abs(target.offsetLeft - first.offsetLeft - rail.scrollLeft) > 2) return
    navigationTargetRef.current = null
    // Use actual card positions so resizing, zoom and translated titles remain safe.
    let nearest = id
    let distance = Infinity
    for (const optionId of ids) {
      const card = cardsRef.current.get(optionId)
      if (!card) continue
      const delta = Math.abs(card.offsetLeft - first.offsetLeft - rail.scrollLeft)
      if (delta < distance) { distance = delta; nearest = optionId }
    }
    if (nearest && nearest !== id) {
      lastPositionRef.current = `${order}:${nearest}`
      setBrowsed({ id: nearest, index: ids.indexOf(nearest) })
    }
  }

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-nitnem-card]')
    const optionId = card?.dataset.nitnemCard
    const pointerFocus = pointerFocusRef.current
    pointerFocusRef.current = false
    if (optionId && optionId !== id) {
      if (pointerFocus) {
        // A peeked link must stay under the pointer until its click has fired.
        lastPositionRef.current = `${order}:${optionId}`
        setBrowsed({ id: optionId, index: ids.indexOf(optionId) })
      } else browse(optionId)
    }
  }
  const onPointerDown = () => { navigationTargetRef.current = null; pointerFocusRef.current = true }
  const onPointerEnd = () => { pointerFocusRef.current = false }
  const onWheel = () => { navigationTargetRef.current = null }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, describe: (index: number, total: number) => string) => {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : -1
    if (target < 0 || target >= ids.length || !ids[target]) return
    event.preventDefault()
    browse(ids[target], { animate: true, announce: describe(target + 1, ids.length) })
  }

  return { id, index, announcement, railRef, cardsRef, browse, onScroll, onFocus, onKeyDown, onPointerDown, onPointerEnd, onWheel }
}
