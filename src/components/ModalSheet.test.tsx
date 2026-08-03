import { render, screen } from '@testing-library/react'
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
