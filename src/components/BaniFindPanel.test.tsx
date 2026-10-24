import { fireEvent, render, screen } from '@testing-library/react'
import { useLocaleStore } from '../store/locale'
import { useLanguageStore } from '../store/language'
import type { ScriptureEntry } from '../types'
import BaniFindPanel from './BaniFindPanel'

const entries: ScriptureEntry[] = [{
  id: 'bani-21-8', source: 'G', scripture: 'SGGS', ang: 8,
  gurmukhi: 'ਸਤਿ ਨਾਮੁ ॥', transliteration: 'Sat nām', translation_en: '', translation_hi: '', translation_pa: '', words: [],
  lines: [{ verseId: 5, shabadId: 1, ang: 8, gurmukhi: 'ਸਤਿ ਨਾਮੁ ॥', transliteration: 'Sat nām', translation_en: '', translations_en: {}, translation_pa: '', translation_hi: '' }],
}]

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useLanguageStore.setState({ scriptMode: 'gurmukhi' })
})

test('finds source-aware lines and deliberately jumps only from a result or Enter', () => {
  const onJump = vi.fn()
  render(<BaniFindPanel entries={entries} onJump={onJump} currentEntryIndex={0} />)
  const input = screen.getByRole('searchbox', { name: 'Find within this bani' })
  fireEvent.change(input, { target: { value: 'absent' } })
  expect(screen.getByRole('status')).toHaveTextContent('No matching lines')
  fireEvent.change(input, { target: { value: 'nam' } })
  expect(screen.getByRole('status')).toHaveTextContent('1 matching line')
  expect(onJump).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /ਸਤਿ ਨਾਮੁ.*Current section/ }))
  expect(onJump).toHaveBeenLastCalledWith(0, 0)
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onJump).toHaveBeenCalledTimes(2)
})

test('does not activate the first hit while an IME composition is being confirmed', () => {
  const onJump = vi.fn()
  render(<BaniFindPanel entries={entries} onJump={onJump} />)
  const input = screen.getByRole('searchbox')
  fireEvent.change(input, { target: { value: 'ਨਾਮੁ' } })
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(onJump).not.toHaveBeenCalled()
})

test('updates results when the loaded exact version changes, without retaining stale line destinations', () => {
  const onJump = vi.fn()
  const { rerender } = render(<BaniFindPanel entries={entries} onJump={onJump} />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ਨਾਮੁ' } })
  expect(screen.getByRole('button')).toBeInTheDocument()
  rerender(<BaniFindPanel entries={[]} onJump={onJump} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('No matching lines')
})

test('uses unique field/status IDs when more than one controlled panel is mounted', () => {
  render(<><BaniFindPanel entries={entries} onJump={() => {}} /><BaniFindPanel entries={entries} onJump={() => {}} /></>)
  const inputs = screen.getAllByRole('searchbox')
  expect(inputs[0].id).not.toBe(inputs[1].id)
  expect(inputs[0].getAttribute('aria-describedby')).not.toBe(inputs[1].getAttribute('aria-describedby'))
})

test.each(['pa', 'hi'] as const)('localizes search and result feedback in %s', locale => {
  useLocaleStore.setState({ locale })
  render(<BaniFindPanel entries={entries} onJump={() => {}} />)
  const input = screen.getByRole('searchbox')
  expect(input).toHaveAccessibleName(locale === 'pa' ? 'ਇਸ ਬਾਣੀ ਵਿੱਚ ਲੱਭੋ' : 'इस बाणी में खोजें')
  fireEvent.change(input, { target: { value: 'ਨਾਮੁ' } })
  expect(screen.getByRole('status')).not.toHaveTextContent('matching')
})

test('a controlled query survives panel remount and follows its parent reading state', () => {
  const onQueryChange = vi.fn()
  const view = render(<BaniFindPanel entries={entries} onJump={() => {}} query="nam" onQueryChange={onQueryChange} />)
  expect(screen.getByRole('searchbox')).toHaveValue('nam')
  expect(screen.getByRole('button')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ਨਾਮੁ' } })
  expect(onQueryChange).toHaveBeenCalledWith('ਨਾਮੁ')
  view.rerender(<BaniFindPanel entries={entries} onJump={() => {}} query="ਨਾਮੁ" onQueryChange={onQueryChange} />)
  expect(screen.getByRole('button').querySelector('mark')).toHaveTextContent('ਨਾਮੁ')
  view.unmount()
  render(<BaniFindPanel entries={entries} onJump={() => {}} query="ਨਾਮੁ" onQueryChange={onQueryChange} />)
  expect(screen.getByRole('searchbox')).toHaveValue('ਨਾਮੁ')
  expect(screen.getByRole('status')).toHaveTextContent('1 matching line')
})

test('Roman match emphasis preserves accents and the result’s accessible text', () => {
  render(<BaniFindPanel entries={entries} onJump={() => {}} query="nam" />)
  const result = screen.getByRole('button')
  expect(result.querySelector('mark')).toHaveTextContent('nām')
  expect(result).toHaveAccessibleName(/ਸਤਿ ਨਾਮੁ.*Sat nām/)
})

test('Devanagari find highlights the displayed script and jumps to its original line', () => {
  useLanguageStore.setState({ scriptMode: 'devanagari' })
  const onJump = vi.fn()
  render(<BaniFindPanel entries={entries} onJump={onJump} query="नामु" />)
  const result = screen.getByRole('button')
  expect(result.querySelector('mark')).toHaveTextContent('नामु')
  fireEvent.click(result)
  expect(onJump).toHaveBeenCalledWith(0, 0)
})
