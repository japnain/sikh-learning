import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { BaniDiscoveryEntry } from '../../content/baniDiscoveryTypes'
import { useLocaleStore } from '../../store/locale'
import ReadBaniRow from './ReadBaniRow'

const entry: BaniDiscoveryEntry = {
  name: 'Japji Sahib',
  summary: 'Guru Nanak Sahib Ji’s opening composition on truthful living, hukam and naam.',
  detail: 'Japji Sahib opens Sri Guru Granth Sahib Ji and is part of morning Nitnem.',
  references: [{ label: 'Encyclopaedia of Sikhism: Japu', url: 'https://eos.learnpunjabi.org/JAPU.html' }],
}

beforeEach(() => { useLocaleStore.setState({ locale: 'en' }) })

it('keeps an English name, script title and readable context together without coupling them to a reader display toggle', async () => {
  const onOpen = vi.fn()
  const user = userEvent.setup()
  const view = render(<ReadBaniRow identity="bani:2" entry={entry} scriptTitle="ਜਪੁਜੀ ਸਾਹਿਬ" scriptLang="pa-Guru" scriptClassName="font-gurmukhi" onOpen={onOpen} />)
  const launch = screen.getByRole('button', { name: 'Japji Sahib ਜਪੁਜੀ ਸਾਹਿਬ' })
  expect(launch).toHaveAttribute('data-read-launch', 'true')
  expect(launch).toHaveAccessibleDescription(entry.summary)
  expect(screen.getByText('Japji Sahib')).toHaveAttribute('lang', 'en')
  expect(screen.getByText('ਜਪੁਜੀ ਸਾਹਿਬ')).toHaveAttribute('lang', 'pa-Guru')
  expect(screen.getByText(entry.summary)).toHaveAttribute('lang', 'en')
  expect(view.container.querySelector('button button, button a, button summary')).toBeNull()
  await user.click(launch)
  expect(onOpen).toHaveBeenCalledTimes(1)
})

it('opens references in a sibling native disclosure and returns focus when details close', async () => {
  const user = userEvent.setup()
  const onOpen = vi.fn()
  const { container } = render(<ReadBaniRow identity="bani:2" entry={entry} onOpen={onOpen} />)
  const summary = screen.getByText('About this bani').closest('summary')!
  const details = summary.closest('details')!
  expect(details.open).toBe(false)
  await user.click(summary)
  expect(details.open).toBe(true)
  expect(screen.getByText(entry.detail!)).toHaveAttribute('lang', 'en')
  const reference = screen.getByRole('link', { name: entry.references[0].label })
  expect(reference).toHaveAttribute('href', entry.references[0].url)
  expect(reference).toHaveAttribute('target', '_blank')
  expect(reference).toHaveAttribute('rel', 'noopener noreferrer')
  expect(reference).toHaveAttribute('lang', 'en')
  expect(reference.closest('button')).toBeNull()
  expect(container.querySelector('[role="dialog"]')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Close details' }))
  expect(details.open).toBe(false)
  expect(summary).toHaveFocus()
  expect(onOpen).not.toHaveBeenCalled()
})

it('closes expanded details from the keyboard without launching the bani', async () => {
  const user = userEvent.setup()
  const onOpen = vi.fn()
  render(<ReadBaniRow identity="bani:2" entry={entry} onOpen={onOpen} />)
  const summary = screen.getByText('About this bani').closest('summary')!
  await user.click(summary)
  expect(summary.closest('details')!.open).toBe(true)
  // user-event does not model the native summary tab stop. Start inside the
  // expanded panel and exercise the custom close/focus behavior here.
  screen.getByRole('link', { name: entry.references[0].label }).focus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(summary).toHaveFocus()
  expect(summary.closest('details')!.open).toBe(false)
  expect(onOpen).not.toHaveBeenCalled()
})

it.each([
  ['pa', 'ਇਸ ਬਾਣੀ ਬਾਰੇ', 'ਹਵਾਲੇ', 'ਵੇਰਵੇ ਬੰਦ ਕਰੋ'],
  ['hi', 'इस बाणी के बारे में', 'संदर्भ', 'विवरण बंद करें'],
] as const)('localizes disclosure controls for %s while identifying English editorial text', async (locale, about, references, close) => {
  useLocaleStore.setState({ locale })
  const user = userEvent.setup()
  render(<ReadBaniRow identity="bani:2" entry={entry} onOpen={() => {}} />)
  expect(screen.getByRole('button', { name: 'Japji Sahib' })).toBeInTheDocument()
  expect(screen.getByText(entry.summary)).toHaveAttribute('lang', 'en')
  await user.click(screen.getByText(about))
  expect(screen.getByText(references)).toBeInTheDocument()
  expect(screen.getByText(entry.detail!)).toHaveAttribute('lang', 'en')
  expect(screen.getByRole('button', { name: close })).toBeInTheDocument()
})

it('keeps the launch focus anchor stable when editorial wording changes', () => {
  const view = render(<ReadBaniRow identity="bani:2" entry={entry} onOpen={() => {}} />)
  const id = screen.getByRole('button', { name: 'Japji Sahib' }).id
  view.rerender(<ReadBaniRow identity="bani:2" entry={{ ...entry, name: 'Jap Ji Sahib', summary: 'A revised short description.' }} onOpen={() => {}} />)
  expect(screen.getByRole('button', { name: 'Jap Ji Sahib' })).toHaveAttribute('id', id)
  view.rerender(<ReadBaniRow identity="bani:2" focusId="read-existing-bani" entry={entry} onOpen={() => {}} />)
  expect(screen.getByRole('button', { name: 'Japji Sahib' })).toHaveAttribute('id', 'read-existing-bani')
})

it('omits duplicate romanized labels and empty disclosures without inventing script text', () => {
  const { container } = render(<ReadBaniRow identity="bani:2" entry={{ ...entry, detail: undefined, references: [] }} scriptTitle="  japji sahib  " onOpen={() => {}} />)
  expect(screen.getAllByText('Japji Sahib')).toHaveLength(1)
  expect(container.querySelector('.read-bani-row__script')).toBeNull()
  expect(container.querySelector('details')).toBeNull()
  expect(screen.getByText(entry.summary)).toBeInTheDocument()
})
