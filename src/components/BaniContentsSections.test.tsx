import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ResolvedBaniProfileSection } from '../content/baniSections/profileTypes'
import BaniContentsSections from './BaniContentsSections'

const first: ResolvedBaniProfileSection = { id: 'stanza-1', kind: 'stanza', label: 'Stanza 1', entryIndex: 0, lineIndex: 2, verseId: 12, ang: 262, source: 'G', excerpt: 'ਸਿਮਰਉ ਸਿਮਰਿ ਸਿਮਰਿ ਸੁਖੁ ਪਾਵਉ ॥' }
const second: ResolvedBaniProfileSection = { ...first, id: 'stanza-2', label: 'Stanza 2', lineIndex: 8, verseId: 18, excerpt: 'ਪ੍ਰਭ ਕੈ ਸਿਮਰਨਿ ਗਰਭਿ ਨ ਬਸੈ ॥' }
const parent: ResolvedBaniProfileSection = { ...first, id: 'ashtpadi-1', kind: 'ashtpadi', label: 'Ashtpadi 1', lineIndex: 0, verseId: 10, children: [first, second] }
const next: ResolvedBaniProfileSection = { ...parent, id: 'ashtpadi-2', label: 'Ashtpadi 2', entryIndex: 1, verseId: 30, children: [{ ...first, id: 'next-stanza', entryIndex: 1, lineIndex: 2, verseId: 32 }] }

test('keeps groups compact and makes expansion distinct from a reading jump', async () => {
  const onJump = vi.fn()
  const user = userEvent.setup()
  render(<BaniContentsSections sections={[parent]} currentPath={[parent]} locale="en" scriptMode="gurmukhi" onJump={onJump} />)
  const toggle = screen.getByRole('button', { name: 'Show 2 stanzas Ashtpadi 1' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveAttribute('hidden')
  expect(screen.queryByRole('button', { name: /Stanza 1/ })).not.toBeInTheDocument()
  toggle.focus()
  await user.keyboard('{Enter}')
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(onJump).not.toHaveBeenCalled()
  await user.tab()
  const child = screen.getByRole('button', { name: /Stanza 1/ })
  expect(child).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(onJump).toHaveBeenCalledExactlyOnceWith(0, 2)
})

test('reveals the current child on opening and keeps one visible location marker when collapsed', () => {
  render(<BaniContentsSections sections={[parent, next]} currentPath={[parent, second]} locale="en" scriptMode="gurmukhi" onJump={() => {}} />)
  const list = screen.getByTestId('bani-composition-sections')
  expect(within(list).getByRole('button', { name: /Stanza 2/ })).toHaveAttribute('aria-current', 'location')
  expect(list.querySelectorAll('[aria-current]')).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Show 1 stanza Ashtpadi 2' })).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(screen.getByRole('button', { name: 'Hide 2 stanzas Ashtpadi 1' }))
  expect(within(list).getByRole('button', { name: /^Ashtpadi 1/ })).toHaveAttribute('aria-current', 'location')
  expect(list.querySelectorAll('[aria-current]')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Show 2 stanzas Ashtpadi 1' }))
  expect(within(list).getByRole('button', { name: /Stanza 2/ })).toHaveAttribute('aria-current', 'location')
})

test('can inspect another group without collapsing or changing the current section', () => {
  const onJump = vi.fn()
  render(<BaniContentsSections sections={[parent, next]} currentPath={[parent, second]} locale="en" scriptMode="gurmukhi" onJump={onJump} />)
  fireEvent.click(screen.getByRole('button', { name: 'Show 1 stanza Ashtpadi 2' }))
  expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(2)
  expect(screen.getByRole('button', { name: /Stanza 2/ })).toHaveAttribute('aria-current', 'location')
  expect(onJump).not.toHaveBeenCalled()
})

test('keeps an ordinary flat section as a direct link without an empty disclosure', () => {
  render(<BaniContentsSections sections={[first]} currentPath={[first]} locale="en" scriptMode="gurmukhi" onJump={() => {}} />)
  expect(screen.getAllByRole('button')).toHaveLength(1)
  expect(screen.getByRole('button')).toHaveAttribute('data-section-verse-id', '12')
  expect(screen.getByRole('button')).not.toHaveAttribute('aria-expanded')
})

test.each(['pa', 'hi'] as const)('preserves source-script labels and localizes units and expansion in %s', locale => {
  const literal = { ...parent, label: 'ਗਉੜੀ ਕਬੀਰ ਜੀ ॥', source: null, children: [{ ...first, source: null }] }
  render(<BaniContentsSections sections={[literal]} currentPath={[literal]} locale={locale} scriptMode="devanagari" onJump={() => {}} />)
  expect(screen.getByText('ਗਉੜੀ ਕਬੀਰ ਜੀ ॥')).toHaveAttribute('lang', 'pa-Guru')
  expect(screen.getByText(locale === 'pa' ? 'ਪੰਨਾ 262' : 'पृष्ठ 262')).toBeInTheDocument()
  expect(screen.getByRole('button', { expanded: false })).toHaveAccessibleName(new RegExp(locale === 'pa' ? 'ਖੋਲ੍ਹੋ' : 'खोलें'))
  expect(screen.getByTestId('bani-composition-sections').querySelector('.font-devanagari')).toHaveAttribute('lang', 'hi')
})
