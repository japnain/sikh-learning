import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

export default function ModalSheet({
  open,
  onClose,
  title,
  description,
  children,
  className = '',
  testId,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  children: ReactNode
  className?: string
  testId?: string
}) {
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
            bottom: 'calc(var(--nav-stack-height, 0px) + 0.75rem + env(safe-area-inset-bottom))',
          }}
          data-testid={testId}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
