import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { focusElementWithoutAppScroll, lockAppScroll } from '../utils/appScroll'

export default function ModalSheet({
  open,
  onClose,
  title,
  description,
  children,
  className = '',
  testId,
  initialFocusRef,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  children: ReactNode
  className?: string
  testId?: string
  initialFocusRef?: RefObject<HTMLElement | null>
}) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const focusWasRestoredRef = useRef(false)
  const openEffectGenerationRef = useRef(0)
  // Radix may move focus to a guard before `onOpenAutoFocus` runs in Chromium.
  // Capture the opener from this render, while a conditionally mounted sheet is
  // still being created in response to the originating click/key press.
  const activeElementAtRender = open && typeof document !== 'undefined'
    ? document.activeElement
    : null
  const returnFocusCandidate = typeof document !== 'undefined'
    && activeElementAtRender instanceof HTMLElement
    && activeElementAtRender !== document.body
    ? activeElementAtRender
    : null

  const restoreReturnFocus = useCallback(() => {
    if (focusWasRestoredRef.current) return
    const returnTarget = returnFocusRef.current
    if (!returnTarget?.isConnected) return

    focusElementWithoutAppScroll(returnTarget)
    focusWasRestoredRef.current = true
  }, [])

  const hasLiveOpenSheet = useCallback((generation: number) => (
    generation !== openEffectGenerationRef.current || contentRef.current?.isConnected === true
  ), [])

  useEffect(() => {
    if (!open) return
    const generation = ++openEffectGenerationRef.current
    const contentElement = contentRef.current
    const unlockScroll = lockAppScroll()

    return () => {
      unlockScroll()
      if (typeof window === 'undefined' || focusWasRestoredRef.current) return
      window.requestAnimationFrame(() => {
        // React Strict Mode replays effects without removing the open sheet.
        // The first setup can precede portal mounting, so a null captured ref
        // cannot identify a dismissal. A newer setup owns the open sheet.
        if (contentElement?.isConnected || hasLiveOpenSheet(generation)) return
        restoreReturnFocus()
      })
    }
  }, [open, restoreReturnFocus, hasLiveOpenSheet])

  return (
    <Dialog.Root open={open} onOpenChange={nextOpen => {
      if (!nextOpen) onClose()
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/35 dark:bg-black/60 popover-overlay" />
        <Dialog.Content
          ref={contentRef}
          className={`fixed inset-x-3 z-[71] mx-auto w-auto max-w-md overflow-hidden border border-sand/15 bg-parchment-card shadow-gold-strong outline-none dark:border-dark-text/10 dark:bg-dark-card ${className}`}
          style={{
            position: 'fixed',
            bottom: 'var(--modal-sheet-bottom, calc(var(--nav-stack-height, 0px) + 0.75rem + var(--fixed-ui-safe-bottom)))',
          }}
          data-testid={testId}
          onOpenAutoFocus={event => {
            const activeElement = returnFocusCandidate ?? document.activeElement
            // Strict Mode replays the mount after focus has entered the sheet.
            // Preserve the external opener instead of replacing it with a
            // soon-to-be-removed dialog control or a Radix focus guard.
            if (activeElement instanceof HTMLElement
              && activeElement !== document.body
              && activeElement.isConnected
              && !contentRef.current?.contains(activeElement)
              && !activeElement.hasAttribute('data-radix-focus-guard')) {
              returnFocusRef.current = activeElement
              focusWasRestoredRef.current = false
            }

            if (!initialFocusRef?.current) return
            event.preventDefault()
            initialFocusRef.current.focus()
          }}
          onCloseAutoFocus={event => {
            if (!returnFocusRef.current) return
            event.preventDefault()
            restoreReturnFocus()
          }}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
