import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import type {
  EnglishSource,
  LearningGoal,
  LearningLevel,
  MeaningLanguage,
  OnboardingAudience,
  ScriptMode,
} from '../types'
import OnboardingSheet from './OnboardingSheet'

function Harness({ presentation = 'first-run' as const }: { presentation?: 'first-run' | 'overlay' }) {
  const [scriptMode, setScriptMode] = useState<ScriptMode>('gurmukhi')
  const [showTransliteration, setShowTransliteration] = useState(false)
  const [meaningLanguage, setMeaningLanguage] = useState<MeaningLanguage>('en')
  const [englishSource, setEnglishSource] = useState<EnglishSource>('bdb')
  const [learningLevel, setLearningLevel] = useState<LearningLevel>('beginner')
  const [audience, setAudience] = useState<OnboardingAudience>('adult')
  const [learningGoal, setLearningGoal] = useState<LearningGoal>('read')
  const onComplete = vi.fn()

  return (
    <>
      <OnboardingSheet
        presentation={presentation}
        locale="en"
        scriptMode={scriptMode}
        setScriptMode={setScriptMode}
        showTransliteration={showTransliteration}
        setShowTransliteration={setShowTransliteration}
        meaningLanguage={meaningLanguage}
        setMeaningLanguage={setMeaningLanguage}
        englishSource={englishSource}
        setEnglishSource={setEnglishSource}
        learningLevel={learningLevel}
        setLearningLevel={setLearningLevel}
        audience={audience}
        setAudience={setAudience}
        learningGoal={learningGoal}
        setLearningGoal={setLearningGoal}
        onComplete={onComplete}
        onDismiss={presentation === 'overlay' ? vi.fn() : undefined}
      />
      <pre data-testid="state">
        {JSON.stringify({
          scriptMode,
          showTransliteration,
          meaningLanguage,
          englishSource,
          learningLevel,
          audience,
          learningGoal,
        })}
      </pre>
    </>
  )
}

test('guided flow applies a supportive preset and keeps fine tuning available', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /i want to understand/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

  expect(screen.getByText(/this is how your reader will open/i)).toBeInTheDocument()
  expect(screen.getByText(/ik oankaar sat naam kartaa purakh/i)).toBeInTheDocument()
  expect(screen.getByText(/One Universal Creator/i)).toBeInTheDocument()
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":true')
  expect(screen.getByTestId('state').textContent).toContain('"learningGoal":"understand"')

  fireEvent.click(screen.getByRole('button', { name: /fine tune reader/i }))
  fireEvent.click(screen.getByRole('button', { name: /daily reader/i }))
  fireEvent.click(screen.getByRole('button', { name: /teen/i }))

  expect(screen.getByTestId('state').textContent).toContain('"learningLevel":"daily-reader"')
  expect(screen.getByTestId('state').textContent).toContain('"audience":"teen"')
})

test('quiet preset keeps the preview text-first', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /i want to read/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

  expect(screen.getByText(/text-first reading stays active here/i)).toBeInTheDocument()
  expect(screen.queryByText(/One Universal Creator/i)).not.toBeInTheDocument()
  expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"none"')
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":false')
})

test('first-run onboarding does not lock document scrolling', () => {
  render(<Harness presentation="first-run" />)

  expect(document.body.style.overflow).toBe('')
  expect(document.body.style.overscrollBehavior).toBe('')
  expect(document.documentElement.style.overflow).toBe('')
})

test('overlay onboarding still locks document scrolling and restores it on unmount', () => {
  const { unmount } = render(<Harness presentation="overlay" />)

  expect(document.body.style.overflow).toBe('hidden')
  expect(document.body.style.overscrollBehavior).toBe('none')
  expect(document.documentElement.style.overflow).toBe('hidden')

  unmount()

  expect(document.body.style.overflow).toBe('')
  expect(document.body.style.overscrollBehavior).toBe('')
  expect(document.documentElement.style.overflow).toBe('')
})
