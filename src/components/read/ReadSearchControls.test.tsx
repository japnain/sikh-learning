import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import ReadSearchControls from './ReadSearchControls'
import { READ_PAGE_COPY } from '../../content/readPageCopy'
import { SEARCH_INTENT_COPY } from '../../content/searchIntentCopy'
import type { SearchScope } from '../../content/readSearchCopy'
import type { SearchMode, UiLocale } from '../../types'

function Controls({ initialMode = 'auto-detect', scope = 'gurbani', locale = 'en', onSubmit = () => {} }: {
  initialMode?: SearchMode
  scope?: SearchScope
  locale?: UiLocale
  onSubmit?: () => void
}) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState(initialMode)
  const [optionsOpen, setOptionsOpen] = useState(false)
  return <ReadSearchControls copy={READ_PAGE_COPY[locale]} locale={locale} inputRef={null}
    query={query} mode={mode} source="all" scope={scope} optionsOpen={optionsOpen}
    active={false} status="" previousQuery="" onQuery={setQuery} onMode={setMode} onSubmit={onSubmit}
    onSource={() => {}} onScope={() => {}} onToggleOptions={() => setOptionsOpen(value => !value)}
    onExit={() => {}} onRecover={() => {}} />
}

describe('Read search intent controls', () => {
  test('makes meaning and transliteration available before refinement and changes guidance with the mode', () => {
    render(<Controls />)
    expect(screen.getByRole('button', { name: 'Auto detect' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'English meaning' }))
    expect(screen.getByRole('button', { name: 'English meaning' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('searchbox')).toHaveAccessibleDescription(SEARCH_INTENT_COPY.en.modes.english.hint)
    fireEvent.click(screen.getByRole('button', { name: 'Transliteration' }))
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Try hukam or sat naam')
    expect(screen.getByRole('searchbox')).toHaveAccessibleDescription('Type Gurbani as it sounds in English letters.')
  })

  test('retains the selected search intent when trying an example', () => {
    render(<Controls initialMode="english" />)
    fireEvent.click(screen.getByRole('button', { name: 'without fear' }))
    expect(screen.getByRole('searchbox')).toHaveValue('without fear')
    expect(screen.getByRole('button', { name: 'English meaning' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('group', { name: 'Search ideas' })).not.toBeInTheDocument()
  })

  test('submits from the visible control and the keyboard, and clears while returning focus to the field', async () => {
    const onSubmit = vi.fn()
    render(<Controls onSubmit={onSubmit} />)
    const input = screen.getByRole('searchbox')
    await userEvent.type(input, 'hukam{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }))
    expect(onSubmit).toHaveBeenCalledTimes(2)
    await userEvent.click(screen.getByRole('button', { name: 'Clear search text' }))
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Clear search text' })).not.toBeInTheDocument()
  })

  test('keeps advanced modes and source selection in refinement without duplicating the main choices', () => {
    render(<Controls />)
    fireEvent.click(screen.getByRole('button', { name: READ_PAGE_COPY.en.refine }))
    for (const name of ['Auto detect', 'English meaning', 'Transliteration', 'Gurmukhi']) {
      expect(screen.getAllByRole('button', { name, exact: true })).toHaveLength(1)
    }
    expect(screen.getByRole('button', { name: 'First Letters' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ang / Vaar' }))
    expect(screen.getByRole('searchbox')).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByRole('button', { name: 'Ang / Vaar' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('group', { name: 'Search within' })).getAllByRole('button').length).toBeGreaterThan(1)
  })

  test.each(['books', 'stories'] as const)('keeps %s searches free of Gurbani intent choices', scope => {
    render(<Controls scope={scope} />)
    expect(screen.queryByRole('group', { name: 'How to search Gurbani' })).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox')).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('button', { name: 'Search', exact: true })).toBeInTheDocument()
  })

  test.each(['pa', 'hi'] as const)('localizes controls and guidance in %s', locale => {
    render(<Controls locale={locale} />)
    const copy = SEARCH_INTENT_COPY[locale]
    expect(screen.getByRole('group', { name: copy.groupLabel })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.modes.english.label }))
    expect(screen.getByRole('searchbox')).toHaveAccessibleDescription(copy.modes.english.hint)
    expect(screen.getByRole('button', { name: copy.submit, exact: true })).toBeInTheDocument()
  })
})
