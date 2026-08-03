import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, type ReactNode, type RefObject } from 'react'
import { lockAppScroll } from '../utils/appScroll'

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
  useEffect(() => {
    if (!open) return
    return lockAppScroll()
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={nextOpen => {
      if (!nextOpen) onClose()
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/35 dark:bg-black/60 popover-overlay" />
        <Dialog.Content
          className={`fixed inset-x-3 z-[71] mx-auto w-auto max-w-md overflow-hidden border border-sand/15 bg-parchment-card shadow-gold-strong outline-none dark:border-dark-text/10 dark:bg-dark-card ${className}`}
          style={{
            position: 'fixed',
            bottom: 'calc(var(--nav-stack-height, 0px) + 0.75rem + var(--fixed-ui-safe-bottom))',
          }}
          data-testid={testId}
          onOpenAutoFocus={event => {
            if (!initialFocusRef?.current) return
            event.preventDefault()
            initialFocusRef.current.focus()
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
