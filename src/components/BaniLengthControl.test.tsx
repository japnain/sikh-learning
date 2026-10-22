import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import BaniLengthControl from './BaniLengthControl'
import { useLocaleStore } from '../store/locale'

beforeEach(() => { useLocaleStore.setState({ locale: 'en' }) })

test('exposes the selected length as a labelled dialog trigger without changing it', () => {
  const onClick = vi.fn()
  render(<BaniLengthControl value="long" onClick={onClick} />)
  const control = screen.getByRole('button', { name: 'Change bani length: Long' })
  expect(control).toHaveAttribute('aria-haspopup', 'dialog')
  expect(control).toHaveTextContent('Bani length')
  fireEvent.click(control)
  expect(onClick).toHaveBeenCalledOnce()
})

test('supports a reading-specific accessible name and prevents disabled activation', () => {
  const onClick = vi.fn()
  render(<BaniLengthControl value="short" onClick={onClick} disabled ariaLabel="Rehras Sahib length: Short" />)
  fireEvent.click(screen.getByRole('button', { name: 'Rehras Sahib length: Short' }))
  expect(onClick).not.toHaveBeenCalled()
})

test('uses the app locale and allows the embedding surface to provide its locale', () => {
  useLocaleStore.setState({ locale: 'pa' })
  const view = render(<BaniLengthControl value="long" onClick={() => {}} />)
  expect(screen.getByRole('button', { name: 'ਬਾਣੀ ਦੀ ਲੰਬਾਈ ਬਦਲੋ: ਲੰਮੀ' })).toHaveAttribute('lang', 'pa')
  view.rerender(<BaniLengthControl value="long" onClick={() => {}} locale="hi" />)
  expect(screen.getByRole('button', { name: 'बानी की लंबाई बदलें: लंबी' })).toHaveAttribute('lang', 'hi')
})
