import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import MilestoneCelebration from './MilestoneCelebration'
import type { Milestone } from '../types'

const milestone: Milestone = {
  id: 'first-grammar-note-seen',
  title: 'First Grammar Note',
  description: 'You opened your first grammar note.',
  earnedMessage: 'Now the language can start making sense instead of only being memorized.',
  gurmukhi: 'ਬੂਝ',
}

test('renders in a nav-safe portal and dismisses from the CTA', () => {
  const onDismiss = vi.fn()

  render(<MilestoneCelebration milestone={milestone} onDismiss={onDismiss} />)

  const dialog = screen.getByRole('dialog', { name: /first grammar note earned/i })
  expect(document.body.contains(dialog)).toBe(true)

  const overlay = dialog.parentElement
  expect(overlay).not.toBeNull()
  expect(overlay).toHaveStyle({ zIndex: '120' })
  expect(overlay?.getAttribute('style')).toContain('padding-bottom')

  fireEvent.click(screen.getByRole('button', { name: /Waheguru/i }))

  expect(onDismiss).toHaveBeenCalledTimes(1)
})
