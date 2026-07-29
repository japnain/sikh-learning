import { render, screen } from '@testing-library/react'
import { APP_SCROLL_VIEWPORT_ID } from '../utils/appScroll'
import ModalSheet from './ModalSheet'

function TestModal({ open }: { open: boolean }) {
  return (
    <>
      <div
        id={APP_SCROLL_VIEWPORT_ID}
        data-testid="app-scroll-viewport"
        style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}
      />
      <ModalSheet
        open={open}
        onClose={() => {}}
        title="Reading settings"
        description="Change reading settings."
      >
        <button type="button">Close</button>
      </ModalSheet>
    </>
  )
}

test('locks the explicit app viewport while a modal sheet is open and restores it on close', () => {
  const view = render(<TestModal open />)
  const viewport = screen.getByTestId('app-scroll-viewport')

  expect(viewport.style.overflow).toBe('hidden')
  expect(viewport.style.overflowY).toBe('hidden')
  expect(viewport.style.overscrollBehavior).toBe('none')

  view.rerender(<TestModal open={false} />)

  expect(viewport.style.overflow).toBe('')
  expect(viewport.style.overflowY).toBe('auto')
  expect(viewport.style.overscrollBehavior).toBe('contain')
})
