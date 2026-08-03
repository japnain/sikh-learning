import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { mockDocumentScroll } from '../test/documentScroll'
import ModalSheet from './ModalSheet'

function TestModal({ open }: { open: boolean }) {
  return (
    <ModalSheet
      open={open}
      onClose={() => {}}
      title="Reading settings"
      description="Change reading settings."
    >
      <button type="button">Close</button>
    </ModalSheet>
  )
}

function ConditionalTestModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open share sheet</button>
      {open ? (
        <ModalSheet
          open
          onClose={() => setOpen(false)}
          title="Share highlight"
          description="Prepare a share image."
        >
          <button type="button" onClick={() => setOpen(false)}>Close share sheet</button>
          <button type="button">Share image</button>
        </ModalSheet>
      ) : null}
    </>
  )
}

test('locks the document root while a modal sheet is open and restores it on close', () => {
  const documentScroll = mockDocumentScroll({ top: 320 })
  const root = document.documentElement
  root.style.overflowY = 'auto'
  root.style.overscrollBehavior = 'contain'
  const view = render(<TestModal open />)

  expect(root.style.overflow).toBe('hidden')
  expect(root.style.overflowY).toBe('hidden')
  expect(root.style.overscrollBehavior).toBe('none')

  view.rerender(<TestModal open={false} />)

  expect(root.style.overflow).toBe('')
  expect(root.style.overflowY).toBe('auto')
  expect(root.style.overscrollBehavior).toBe('contain')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  documentScroll.restore()
  root.removeAttribute('style')
})

test('returns focus to the exact opener without moving document scroll after every dismissal path', async () => {
  const user = userEvent.setup()
  const documentScroll = mockDocumentScroll({ top: 320 })
  const view = render(<ConditionalTestModal />)
  const opener = screen.getByRole('button', { name: 'Open share sheet' })

  await user.click(opener)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Close share sheet' })).toHaveFocus()
  })

  await user.keyboard('{Escape}')
  await waitFor(() => expect(opener).toHaveFocus())
  expect(documentScroll.getTop()).toBe(320)

  await user.click(opener)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Close share sheet' })).toHaveFocus()
  })
  await user.click(screen.getByRole('button', { name: 'Close share sheet' }))

  await waitFor(() => expect(opener).toHaveFocus())
  expect(documentScroll.getTop()).toBe(320)

  view.unmount()
  documentScroll.restore()
  document.documentElement.removeAttribute('style')
})
