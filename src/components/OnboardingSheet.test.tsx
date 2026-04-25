import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import type {
  EnglishSource,
  LearningGoal,
  LearningLevel,
  MeaningLanguage,
  OnboardingAudience,
  ScriptMode,
} from '../types'
import { useCloudSyncStore } from '../store/cloudSync'
import OnboardingSheet from './OnboardingSheet'

const { signInWithProviderMock } = vi.hoisted(() => ({
  signInWithProviderMock: vi.fn(),
}))

vi.mock('../insforge/runtime', () => ({
  signInWithProvider: signInWithProviderMock,
}))

function Harness({
  presentation = 'first-run' as const,
  onComplete = vi.fn(),
}: {
  presentation?: 'first-run' | 'overlay'
  onComplete?: () => void | Promise<void>
}) {
  const [scriptMode, setScriptMode] = useState<ScriptMode>('gurmukhi')
  const [showTransliteration, setShowTransliteration] = useState(false)
  const [meaningLanguage, setMeaningLanguage] = useState<MeaningLanguage>('en')
  const [englishSource, setEnglishSource] = useState<EnglishSource>('bdb')
  const [learningLevel, setLearningLevel] = useState<LearningLevel>('beginner')
  const [audience, setAudience] = useState<OnboardingAudience>('adult')
  const [learningGoal, setLearningGoal] = useState<LearningGoal>('read')

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

beforeEach(() => {
  signInWithProviderMock.mockReset()
  useCloudSyncStore.getState().reset()
})

test('setup step presents visual intent choices that curate the reader and sticky action shelf', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /build a daily reading habit/i }))

  const helper = screen.getByTestId('onboarding-setup-helper')
  const actionBar = screen.getByTestId('onboarding-setup-action-bar')

  expect(screen.getByText(/welcome to naamras/i)).toBeInTheDocument()
  expect(screen.getByText(/i'm here to/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /find peace and clarity/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /grow spiritually/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /just exploring/i })).toBeInTheDocument()
  expect(helper).toHaveTextContent(/curated setup/i)
  expect(helper).toHaveTextContent(/keep the next step simple/i)
  expect(helper).toHaveTextContent(/reading \+ meaning/i)
  expect(actionBar).toHaveTextContent(/selected/i)
  expect(actionBar).toHaveTextContent(/reading \+ meaning/i)
  expect(screen.getByTestId('state').textContent).toContain('"learningGoal":"habit"')
  expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"en"')
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":true')
  expect(screen.getByTestId('onboarding-setup-primary-action')).toBeInTheDocument()
})

test('guided flow keeps the hero dominant while secondary setup stays collapsed until requested', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /understand scripture/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

  const previewHero = screen.getByTestId('onboarding-preview-hero')
  const actionBar = screen.getByTestId('onboarding-preview-action-bar')

  expect(screen.getByText(/this is how your reader will open/i)).toBeInTheDocument()
  expect(previewHero).toHaveTextContent(/open with meaning/i)
  expect(previewHero).toHaveTextContent(/reading \+ meaning · gurmukhi · transliteration on/i)
  expect(previewHero).toHaveTextContent(/ik oankaar sat naam kartaa purakh/i)
  expect(previewHero).toHaveTextContent(/One Universal Creator/i)
  expect(previewHero).not.toHaveTextContent(/you will open with meaning close/i)
  expect(previewHero).not.toHaveTextContent(/continue as guest/i)
  expect(previewHero).not.toHaveTextContent(/recommended/i)
  expect(actionBar).toHaveTextContent(/refine setup later/i)
  expect(actionBar).toHaveTextContent(/you will open with meaning close/i)
  expect(within(actionBar).getByTestId('onboarding-preview-primary-action')).toHaveTextContent(/^open with meaning$/i)
  expect(actionBar).toHaveTextContent(/backup later if you want it/i)
  expect(actionBar).toHaveTextContent(/guest reading stays open on this device/i)
  expect(within(actionBar).queryByRole('button', { name: /^continue as guest$/i })).not.toBeInTheDocument()
  expect(document.querySelector('[data-ai-surface="onboarding-auth"]')).toBeNull()
  expect(actionBar).toHaveTextContent(/fine tune reader/i)
  expect(actionBar).toHaveTextContent(/open the lower-level choices only if you want to refine script, support, or profile details now/i)
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":true')
  expect(screen.getByTestId('state').textContent).toContain('"learningGoal":"understand"')

  fireEvent.click(within(screen.getByTestId('onboarding-preview-tune-row')).getByRole('button', { name: /fine tune reader/i }))

  expect(actionBar).toHaveTextContent(/backup later if you want it/i)
  expect(actionBar).toHaveTextContent(/guest reading stays open on this device/i)

  fireEvent.click(screen.getByRole('button', { name: /daily reader/i }))
  fireEvent.click(screen.getByRole('button', { name: /teen/i }))

  expect(screen.getByTestId('state').textContent).toContain('"learningLevel":"daily-reader"')
  expect(screen.getByTestId('state').textContent).toContain('"audience":"teen"')
})

test('intent buttons apply distinct reader and profile curation', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /grow spiritually/i }))

  expect(screen.getByTestId('state').textContent).toContain('"learningGoal":"habit"')
  expect(screen.getByTestId('state').textContent).toContain('"learningLevel":"daily-reader"')
  expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"en"')
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":false')

  fireEvent.click(screen.getByRole('button', { name: /just exploring/i }))

  expect(screen.getByTestId('state').textContent).toContain('"learningGoal":"read"')
  expect(screen.getByTestId('state').textContent).toContain('"learningLevel":"beginner"')
  expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"en"')
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":true')
})

test('quiet preset keeps the preview text-first', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /find peace and clarity/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

  const previewHero = screen.getByTestId('onboarding-preview-hero')

  expect(previewHero).toHaveTextContent(/text-first reading stays active here/i)
  expect(previewHero).not.toHaveTextContent(/One Universal Creator/i)
  expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"none"')
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":false')
})

test('turning meaning off updates the preview summary and action copy for understand mode', async () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /understand scripture/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

  expect(await within(screen.getByTestId('onboarding-preview-action-bar')).findByTestId('onboarding-preview-primary-action')).toHaveTextContent(/^open with meaning$/i)
  expect(screen.getAllByText(/You will open with meaning close/i)).toHaveLength(1)

  fireEvent.click(within(screen.getByTestId('onboarding-preview-tune-row')).getByRole('button', { name: /fine tune reader/i }))
  fireEvent.click(screen.getByRole('button', { name: /^Off$/i }))

  await waitFor(() => {
    expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"none"')
    expect(within(screen.getByTestId('onboarding-preview-action-bar')).getByTestId('onboarding-preview-primary-action')).toHaveTextContent(/^open my reader$/i)
    expect(screen.getAllByText(/You will land in a cleaner reader/i)).toHaveLength(1)
  })
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

test('preview step offers guest plus configured sign-in providers only after backup drawer is expanded', async () => {
  const onComplete = vi.fn()

  useCloudSyncStore.setState({
    configured: true,
    status: 'signed-out',
    currentUser: null,
    availableProviders: ['google', 'github'],
    lastSyncedAt: null,
    lastError: null,
    syncQueued: false,
  })

  render(<Harness onComplete={onComplete} />)

  fireEvent.click(screen.getByRole('button', { name: /understand scripture/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

  expect(screen.queryByRole('button', { name: /continue as guest/i })).not.toBeInTheDocument()
  fireEvent.click(screen.getByTestId('onboarding-backup-toggle'))

  expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

  await waitFor(() => {
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(signInWithProviderMock).toHaveBeenCalledWith('google')
  })
})

test('guest bootstrap issues stay in the optional backup state during onboarding', () => {
  useCloudSyncStore.setState({
    configured: true,
    status: 'error',
    currentUser: null,
    availableProviders: [],
    lastSyncedAt: null,
    lastError: 'Backup is unavailable right now. You can keep reading on this device and sign in later.',
    syncQueued: false,
  })

  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /find peace and clarity/i }))
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))
  fireEvent.click(screen.getByTestId('onboarding-backup-toggle'))

  const authSurface = document.querySelector('[data-ai-surface="onboarding-auth"]')

  expect(authSurface).not.toBeNull()
  expect(authSurface).toHaveAttribute('data-ai-state', 'empty')
  expect(authSurface).not.toHaveAttribute('data-ai-error')
  expect(screen.getByText(/backup is unavailable right now/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument()
})
