import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import type { MeaningLanguage, OnboardingPresentationMode, ScriptMode, UiLocale } from '../types'
import { SAMPLE_ONBOARDING_LINE } from '../content/onboardingCopy'
import { renderScriptText } from '../utils/readerDisplay'
import { mockDocumentScroll } from '../test/documentScroll'
import OnboardingSheet from './OnboardingSheet'

function Harness({
  presentation = 'first-run', locale = 'en', onComplete = vi.fn(), onDismiss = vi.fn(), isCompleting = false,
}: {
  presentation?: OnboardingPresentationMode
  locale?: UiLocale
  onComplete?: () => void | Promise<void>
  onDismiss?: () => void
  isCompleting?: boolean
}) {
  const [scriptMode, setScriptMode] = useState<ScriptMode>('gurmukhi')
  const [showTransliteration, setShowTransliteration] = useState(false)
  const [meaningLanguage, setMeaningLanguage] = useState<MeaningLanguage>('en')
  return <>
    <OnboardingSheet {...{
      presentation, locale, scriptMode, setScriptMode, showTransliteration,
      setShowTransliteration, meaningLanguage, setMeaningLanguage, onComplete, onDismiss, isCompleting,
    }} />
    <output data-testid="preferences">{JSON.stringify({ scriptMode, showTransliteration, meaningLanguage })}</output>
  </>
}

function next() { fireEvent.click(screen.getByTestId('onboarding-setup-primary-action')) }
function preferences() { return JSON.parse(screen.getByTestId('preferences').textContent ?? '{}') }

test('finishes in two pages with one Continue and one completion action', async () => {
  const onComplete = vi.fn()
  render(<Harness onComplete={onComplete} />)
  expect(screen.getByRole('heading', { name: 'Choose your script.' })).toBeInTheDocument()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2')
  expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  expect(screen.queryByTestId('onboarding-preview-hero')).not.toBeInTheDocument()
  expect(screen.queryByTestId('onboarding-intent-step')).not.toBeInTheDocument()
  expect(screen.queryByText(/your intention|daily practice|explore the meaning|choose a bani/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()

  next()

  expect(onComplete).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { name: 'Choose your meanings.' })).toHaveFocus()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  expect(screen.getByTestId('onboarding-support-step')).toContainElement(screen.getByTestId('onboarding-preview-hero'))
  expect(screen.queryByTestId('onboarding-preview-step')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Open NaamRas' })) })
  expect(onComplete).toHaveBeenCalledOnce()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  expect(preferences()).toEqual({ scriptMode: 'gurmukhi', showTransliteration: false, meaningLanguage: 'en' })
})

test.each(['gurmukhi', 'devanagari'] as const)('shows the selected %s script and lets pronunciation help be turned on and off', script => {
  render(<Harness />)
  fireEvent.click(screen.getByTestId(`onboarding-script-${script}`))
  const pronunciation = screen.getByRole('switch', { name: 'Pronunciation help' })
  expect(pronunciation).not.toBeChecked()
  fireEvent.click(pronunciation)
  expect(screen.getByTestId('onboarding-pronunciation-example')).toHaveTextContent(SAMPLE_ONBOARDING_LINE.transliteration)
  next()
  const reader = within(screen.getByTestId('onboarding-preview-hero'))
  expect(reader.getByText(renderScriptText(SAMPLE_ONBOARDING_LINE.gurmukhi, script))).toHaveAttribute('lang', script === 'gurmukhi' ? 'pa-Guru' : 'hi')
  expect(reader.getByTestId('onboarding-preview-pronunciation')).toHaveTextContent(SAMPLE_ONBOARDING_LINE.transliteration)
  expect(preferences()).toMatchObject({ scriptMode: script, showTransliteration: true })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('switch', { name: 'Pronunciation help' }))
  next()
  expect(screen.queryByTestId('onboarding-preview-pronunciation')).not.toBeInTheDocument()
  expect(preferences()).toMatchObject({ scriptMode: script, showTransliteration: false })
})

const meaningCases = (['gurmukhi', 'devanagari'] as const).flatMap(script =>
  (['none', 'en', 'pa', 'hi'] as const).map(language => ({ script, language }))
)

test.each(meaningCases)('updates $language meanings immediately in the $script preview', ({ script, language }) => {
  render(<Harness />)
  fireEvent.click(screen.getByTestId(`onboarding-script-${script}`))
  next()
  fireEvent.click(screen.getByTestId(`onboarding-meaning-${language}`))
  for (const value of ['none', 'en', 'pa', 'hi']) {
    expect(screen.getByTestId(`onboarding-meaning-${value}`)).toHaveAttribute('aria-pressed', String(value === language))
  }
  const reader = screen.getByTestId('onboarding-preview-hero')
  const meaning = reader.querySelector('.onboarding-preview-meaning')
  if (language === 'none') {
    expect(meaning).not.toBeInTheDocument()
  } else {
    const expected = language === 'pa'
      ? renderScriptText(SAMPLE_ONBOARDING_LINE.meaning.pa, script)
      : SAMPLE_ONBOARDING_LINE.meaning[language]
    expect(meaning).toHaveTextContent(expected)
    expect(meaning).toHaveAttribute('lang', language === 'pa' ? script === 'gurmukhi' ? 'pa-Guru' : 'hi' : language)
  }
  expect(reader).toHaveTextContent(renderScriptText(SAMPLE_ONBOARDING_LINE.gurmukhi, script))
  expect(screen.queryByTestId('onboarding-preview-pronunciation')).not.toBeInTheDocument()
  expect(preferences()).toEqual({ scriptMode: script, showTransliteration: false, meaningLanguage: language })
})

test('Back preserves every reading choice and focuses the question being edited', () => {
  render(<Harness />)
  fireEvent.click(screen.getByTestId('onboarding-script-devanagari'))
  fireEvent.click(screen.getByRole('switch', { name: 'Pronunciation help' }))
  next()
  fireEvent.click(screen.getByTestId('onboarding-meaning-pa'))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('heading', { name: 'Choose your script.' })).toHaveFocus()
  expect(screen.getByTestId('onboarding-script-devanagari')).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('switch', { name: 'Pronunciation help' })).toBeChecked()
  expect(preferences()).toEqual({ scriptMode: 'devanagari', showTransliteration: true, meaningLanguage: 'pa' })
  next()
  expect(screen.getByRole('heading', { name: 'Choose your meanings.' })).toHaveFocus()
  expect(screen.getByTestId('onboarding-meaning-pa')).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByTestId('onboarding-preview-hero')).toHaveTextContent(renderScriptText(SAMPLE_ONBOARDING_LINE.meaning.pa, 'devanagari'))
  expect(screen.getByTestId('onboarding-preview-pronunciation')).toBeInTheDocument()
})

test('protects an asynchronous save against repeated submits, Back, and dismissal', async () => {
  let finish: () => void = () => {}
  const onComplete = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  const onDismiss = vi.fn()
  const view = render(<Harness presentation="overlay" onComplete={onComplete} onDismiss={onDismiss} />)
  next()
  const action = screen.getByRole('button', { name: 'Save changes' })
  fireEvent.click(action)
  fireEvent.click(action)
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onComplete).toHaveBeenCalledOnce()
  expect(onDismiss).not.toHaveBeenCalled()
  expect(action).toBeDisabled()
  expect(action).toHaveTextContent('Saving…')
  expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
  expect(screen.getByTestId('onboarding-support-step')).toBeInTheDocument()
  await act(async () => { finish() })
  await waitFor(() => expect(action).toBeEnabled())
  expect(action).toHaveTextContent('Save changes')
  view.unmount()
})

test('respects an externally pending completion before navigation or dismissal', () => {
  const onDismiss = vi.fn()
  const view = render(<Harness presentation="overlay" isCompleting onDismiss={onDismiss} />)
  expect(screen.getByTestId('onboarding-setup-primary-action')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
  next()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.getByTestId('onboarding-script-step')).toBeInTheDocument()
  expect(onDismiss).not.toHaveBeenCalled()
  view.unmount()
})

test('keeps the selected preferences after a completion failure and allows retry', async () => {
  const onComplete = vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(undefined)
  render(<Harness onComplete={onComplete} />)
  fireEvent.click(screen.getByTestId('onboarding-script-devanagari'))
  next()
  fireEvent.click(screen.getByTestId('onboarding-meaning-hi'))
  fireEvent.click(screen.getByTestId('onboarding-preview-primary-action'))
  expect(await screen.findByRole('alert')).toHaveTextContent(/try again/i)
  expect(screen.getByTestId('onboarding-preview-primary-action')).toBeEnabled()
  expect(preferences()).toEqual({ scriptMode: 'devanagari', showTransliteration: false, meaningLanguage: 'hi' })
  expect(screen.getByTestId('onboarding-meaning-hi')).toHaveAttribute('aria-pressed', 'true')
  await act(async () => { fireEvent.click(screen.getByTestId('onboarding-preview-primary-action')) })
  expect(onComplete).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test.each([
  { locale: 'en', scriptTitle: 'Choose your script.', meaningTitle: 'Choose your meanings.', continueLabel: 'Continue', startLabel: 'Open NaamRas' },
  { locale: 'pa', scriptTitle: 'ਆਪਣੀ ਲਿਪੀ ਚੁਣੋ।', meaningTitle: 'ਅਰਥਾਂ ਦੀ ਭਾਸ਼ਾ ਚੁਣੋ।', continueLabel: 'ਅੱਗੇ', startLabel: 'ਨਾਮਰਸ ਖੋਲ੍ਹੋ' },
  { locale: 'hi', scriptTitle: 'अपनी लिपि चुनें।', meaningTitle: 'अर्थों की भाषा चुनें।', continueLabel: 'आगे', startLabel: 'नामरस खोलें' },
] as const)('localizes both pages and the final action in $locale', ({ locale, scriptTitle, meaningTitle, continueLabel, startLabel }) => {
  render(<Harness locale={locale} />)
  expect(screen.getByRole('heading', { name: scriptTitle })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: continueLabel }))
  expect(screen.getByRole('heading', { name: meaningTitle })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: startLabel })).toBeEnabled()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2')
})

test('first run leaves document scrolling available', () => {
  const overflow = document.documentElement.style.overflow
  const view = render(<Harness />)
  expect(document.documentElement.style.overflow).toBe(overflow)
  next()
  expect(document.documentElement.style.overflow).toBe(overflow)
  view.unmount()
})

test('overlay dismissal restores document scrolling and returns focus to its opener', async () => {
  const documentScroll = mockDocumentScroll({ top: 280 })
  const overflow = document.documentElement.style.overflow
  const opener = document.createElement('button')
  opener.textContent = 'Reading preferences'
  document.body.append(opener)
  opener.focus()
  const onDismiss = vi.fn()
  const view = render(<Harness presentation="overlay" onDismiss={onDismiss} />)
  try {
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/naamras/i)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledOnce()
    view.unmount()
    expect(document.documentElement.style.overflow).toBe(overflow)
    await waitFor(() => expect(opener).toHaveFocus())
    expect(documentScroll.getTop()).toBe(280)
  } finally {
    view.unmount()
    opener.remove()
    documentScroll.restore()
  }
})

test('Escape dismisses an idle overlay', async () => {
  const onDismiss = vi.fn()
  const view = render(<Harness presentation="overlay" onDismiss={onDismiss} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(onDismiss).toHaveBeenCalledOnce())
  view.unmount()
})
