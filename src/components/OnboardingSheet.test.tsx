import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import type {
  EnglishSource,
  LearningGoal,
  MeaningLanguage,
  ScriptMode,
  UiLocale,
} from '../types'
import { useCloudSyncStore } from '../store/cloudSync'
import { mockDocumentScroll } from '../test/documentScroll'
import OnboardingSheet from './OnboardingSheet'

const { sendMagicLinkMock, signInWithProviderMock } = vi.hoisted(() => ({
  sendMagicLinkMock: vi.fn(),
  signInWithProviderMock: vi.fn(),
}))

vi.mock('../supabase/runtime', () => ({
  sendMagicLink: sendMagicLinkMock,
  signInWithProvider: signInWithProviderMock,
}))

function Harness({
  presentation = 'first-run' as const,
  locale = 'en',
  onComplete = vi.fn(),
}: {
  presentation?: 'first-run' | 'overlay'
  locale?: UiLocale
  onComplete?: () => void | Promise<void>
}) {
  const [scriptMode, setScriptMode] = useState<ScriptMode>('gurmukhi')
  const [showTransliteration, setShowTransliteration] = useState(false)
  const [meaningLanguage, setMeaningLanguage] = useState<MeaningLanguage>('en')
  const [englishSource, setEnglishSource] = useState<EnglishSource>('bdb')
  const [learningGoal, setLearningGoal] = useState<LearningGoal>('read')

  return (
    <>
      <OnboardingSheet
        presentation={presentation}
        locale={locale}
        scriptMode={scriptMode}
        setScriptMode={setScriptMode}
        showTransliteration={showTransliteration}
        setShowTransliteration={setShowTransliteration}
        meaningLanguage={meaningLanguage}
        setMeaningLanguage={setMeaningLanguage}
        englishSource={englishSource}
        setEnglishSource={setEnglishSource}
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
          learningGoal,
        })}
      </pre>
    </>
  )
}

beforeEach(() => {
  sendMagicLinkMock.mockReset()
  signInWithProviderMock.mockReset()
  useCloudSyncStore.getState().reset()
})

function advanceToPreview() {
  for (let step = 0; step < 3; step += 1) {
    fireEvent.click(screen.getByTestId('onboarding-setup-primary-action'))
  }
}

test('setup step presents visual intent choices that curate the reader and sticky action shelf', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /i want to build habit/i }))

  const helper = screen.getByTestId('onboarding-setup-helper')
  const actionBar = screen.getByTestId('onboarding-setup-action-bar')

  expect(screen.getByRole('heading', { name: /naamras/i })).toBeInTheDocument()
  expect(screen.getByText(/how do you want to begin/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /i want to read/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /i want to understand/i })).toBeInTheDocument()
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

  fireEvent.click(screen.getByRole('button', { name: /i want to understand/i }))
  advanceToPreview()

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
  expect(actionBar).toHaveTextContent(/open the lower-level choices only if you want to refine script or support details now/i)
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":true')
  expect(screen.getByTestId('state').textContent).toContain('"learningGoal":"understand"')

  fireEvent.click(within(screen.getByTestId('onboarding-preview-tune-row')).getByRole('button', { name: /fine tune reader/i }))

  expect(actionBar).toHaveTextContent(/backup later if you want it/i)
  expect(actionBar).toHaveTextContent(/guest reading stays open on this device/i)

  expect(screen.queryByRole('button', { name: /daily reader/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /teen/i })).not.toBeInTheDocument()
})

test('intent buttons apply distinct, real reader defaults', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /i want to build habit/i }))

  expect(screen.getByTestId('state').textContent).toContain('"learningGoal":"habit"')
  expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"en"')
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":true')

  fireEvent.click(screen.getByRole('button', { name: /i want to read/i }))

  expect(screen.getByTestId('state').textContent).toContain('"learningGoal":"read"')
  expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"none"')
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":false')
})

test('quiet preset keeps the preview text-first', () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /i want to read/i }))
  advanceToPreview()

  const previewHero = screen.getByTestId('onboarding-preview-hero')

  expect(previewHero).toHaveTextContent(/text-first reading stays active here/i)
  expect(previewHero).not.toHaveTextContent(/One Universal Creator/i)
  expect(screen.getByTestId('state').textContent).toContain('"meaningLanguage":"none"')
  expect(screen.getByTestId('state').textContent).toContain('"showTransliteration":false')
})

test('turning meaning off updates the preview summary and action copy for understand mode', async () => {
  render(<Harness />)

  fireEvent.click(screen.getByRole('button', { name: /i want to understand/i }))
  advanceToPreview()

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

test('localizes the script setup step in Punjabi', () => {
  render(<Harness locale="pa" />)

  fireEvent.click(screen.getByTestId('onboarding-setup-primary-action'))

  expect(screen.getByRole('heading', { name: 'ਉਹ ਲਿਪੀ ਚੁਣੋ ਜਿਸ ਨਾਲ ਤੁਹਾਡਾ ਪਾਠਕ ਖੁੱਲੇ।' })).toBeInTheDocument()
  expect(screen.getByText('ਇਹ ਚੋਣ ਪੜ੍ਹੋ, ਹੁਕਮਨਾਮਾ ਅਤੇ ਸੰਭਾਲੇ ਪਾਠਾਂ ਦੀ ਮੂਲ ਲਿਪੀ ਬਦਲਦੀ ਹੈ।')).toBeInTheDocument()
})

test('overlay onboarding locks the document root and restores it on unmount', () => {
  const documentScroll = mockDocumentScroll({ top: 280 })
  const root = document.documentElement
  const { unmount } = render(<Harness presentation="overlay" />)

  expect(root.style.overflow).toBe('hidden')
  expect(root.style.overflowY).toBe('hidden')
  expect(root.style.overscrollBehavior).toBe('none')
  expect(document.body.style.overflow).toBe('')

  unmount()

  expect(root.style.overflow).toBe('')
  expect(root.style.overflowY).toBe('')
  expect(root.style.overscrollBehavior).toBe('')

  documentScroll.restore()
  root.removeAttribute('style')
})

test('preview step offers configured sign-in providers only after backup drawer is expanded', async () => {
  const onComplete = vi.fn()

  useCloudSyncStore.setState({
    configured: true,
    status: 'signed-out',
    currentUser: null,
    availableProviders: ['apple', 'email'],
    lastSyncedAt: null,
    lastError: null,
    syncQueued: false,
  })

  render(<Harness onComplete={onComplete} />)

  fireEvent.click(screen.getByRole('button', { name: /i want to understand/i }))
  advanceToPreview()

  expect(screen.queryByRole('button', { name: /continue as guest/i })).not.toBeInTheDocument()
  fireEvent.click(screen.getByTestId('onboarding-backup-toggle'))

  expect(screen.queryByRole('button', { name: /continue as guest/i })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /send magic link/i })).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: /continue with apple/i }))

  await waitFor(() => {
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(signInWithProviderMock).toHaveBeenCalledWith('apple')
  })

  fireEvent.change(screen.getByPlaceholderText(/email for magic link/i), {
    target: { value: 'simran@example.com' },
  })
  fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

  await waitFor(() => {
    expect(sendMagicLinkMock).toHaveBeenCalledWith('simran@example.com')
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

  fireEvent.click(screen.getByRole('button', { name: /i want to read/i }))
  advanceToPreview()
  fireEvent.click(screen.getByTestId('onboarding-backup-toggle'))

  const authSurface = document.querySelector('[data-ai-surface="onboarding-auth"]')

  expect(authSurface).not.toBeNull()
  expect(authSurface).toHaveAttribute('data-ai-state', 'empty')
  expect(authSurface).not.toHaveAttribute('data-ai-error')
  expect(screen.getByText(/backup is unavailable right now/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /continue as guest/i })).not.toBeInTheDocument()
  expect(screen.getByTestId('onboarding-preview-primary-action')).toBeEnabled()
})

test('keeps onboarding local-first when the lazy sign-in runtime fails', async () => {
  const onComplete = vi.fn()
  signInWithProviderMock.mockRejectedValueOnce(new Error('chunk unavailable'))
  useCloudSyncStore.setState({
    configured: true,
    status: 'signed-out',
    currentUser: null,
    availableProviders: ['apple'],
    lastSyncedAt: null,
    lastError: null,
    syncQueued: false,
  })

  render(<Harness onComplete={onComplete} />)
  advanceToPreview()
  fireEvent.click(screen.getByTestId('onboarding-backup-toggle'))
  fireEvent.click(screen.getByRole('button', { name: /continue with apple/i }))

  await waitFor(() => {
    expect(useCloudSyncStore.getState()).toMatchObject({
      status: 'error',
      lastError: expect.stringMatching(/keep reading locally/i),
    })
  })
})
