import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

/** The index previews a reading. Only the reading action starts a paath. */
export function useNitnemIndex(ids: readonly string[], activeId: string | undefined, initialId?: string | null) {
  const [browsed, setBrowsed] = useState<{ id: string; index: number } | null>(() => {
    const index = initialId ? ids.indexOf(initialId) : -1
    return index >= 0 ? { id: initialId!, index } : null
  })
  const [vertical, setVertical] = useState(false)
  const indexRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef(new Map<string, HTMLButtonElement>())
  const order = ids.join('|')
  const preferred = browsed?.id ?? activeId
  const index = Math.max(0, ids.includes(preferred ?? '') ? ids.indexOf(preferred!) : Math.min(browsed?.index ?? 0, ids.length - 1))
  const id = ids[index]
  if (browsed && id && (browsed.id !== id || browsed.index !== index)) setBrowsed({ id, index })

  const reveal = useCallback(() => {
    const rail = indexRef.current
    const tab = id ? tabsRef.current.get(id) : null
    if (!rail || !tab) return
    setVertical(getComputedStyle(rail).flexDirection === 'column')
    // Only scroll the named index. Never move Home or steal focus on resize,
    // font loading, completion, or an arriving offline badge.
    const bounds = rail.getBoundingClientRect()
    const item = tab.getBoundingClientRect()
    const inset = 4
    if (rail.scrollWidth <= rail.clientWidth) return
    if (item.left < bounds.left + inset) rail.scrollLeft -= bounds.left + inset - item.left
    else if (item.right > bounds.right - inset) rail.scrollLeft += item.right - bounds.right + inset
  }, [id])

  // Keep an intentional selection visible, while preserving exploratory index
  // scrolling across unrelated cache, clock, and completion updates.
  useLayoutEffect(() => { reveal() }, [order, reveal])
  useLayoutEffect(() => {
    const rail = indexRef.current
    if (!rail) return
    let alive = true
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reveal)
    observer?.observe(rail)
    for (const tab of tabsRef.current.values()) observer?.observe(tab)
    window.addEventListener('resize', reveal)
    void document.fonts?.ready.then(() => { if (alive) reveal() })
    return () => { alive = false; observer?.disconnect(); window.removeEventListener('resize', reveal) }
  }, [order, reveal])

  const browse = (optionId: string, focus = false) => {
    const nextIndex = ids.indexOf(optionId)
    if (nextIndex < 0) return
    setBrowsed({ id: optionId, index: nextIndex })
    if (focus) tabsRef.current.get(optionId)?.focus({ preventScroll: true })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, optionId: string) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const current = ids.indexOf(optionId)
    const previous = vertical ? 'ArrowUp' : 'ArrowLeft'
    const next = vertical ? 'ArrowDown' : 'ArrowRight'
    const target = event.key === next ? Math.min(current + 1, ids.length - 1)
      : event.key === previous ? Math.max(current - 1, 0)
      : event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : -1
    if (target < 0 || !ids[target]) return
    event.preventDefault()
    browse(ids[target], true)
  }
  return { id, index, indexRef, tabsRef, browse, onKeyDown, vertical }
}
