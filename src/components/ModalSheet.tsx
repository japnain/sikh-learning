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

  useEffect(() => {
    if (!open) return
    const contentElement = contentRef.current
    const unlockScroll = lockAppScroll()

    return () => {
      unlockScroll()
      if (typeof window === 'undefined' || focusWasRestoredRef.current) return
      window.requestAnimationFrame(() => {
        // React Strict Mode replays effects without removing the open sheet.
        // Only treat cleanup as dismissal once the dialog content is gone.
        if (contentElement?.isConnected) return
        restoreReturnFocus()
      })
    }
  }, [open, restoreReturnFocus])

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
            if (activeElement instanceof HTMLElement && activeElement !== document.body) {
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
