import { lazy, Suspense, startTransition, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import MusicControllerBridge from './components/MusicControllerBridge'
import OnboardingSheet from './components/OnboardingSheet'
import SplashScreen from './components/SplashScreen'
import { useDisplayMode } from './hooks/useDisplayMode'
import { useSupabaseBootstrap } from './hooks/useSupabaseBootstrap'
import { useNitemOfflineCache } from './hooks/useNitemOfflineCache'
import { useLanguageStore } from './store/language'
import { useLocaleStore } from './store/locale'
import { useOnboardingStore } from './store/onboarding'
import { applyThemeToDocument, useThemeStore } from './store/theme'
import { getRouterBasename } from './utils/basePath'

const HomePage = lazy(() => import('./pages/Home'))
const StudyPage = lazy(() => import('./pages/Study'))
const LibraryPage = lazy(() => import('./pages/Library'))
const BanisPage = lazy(() => import('./pages/Banis'))
const AmritKeertanPage = lazy(() => import('./pages/AmritKeertan'))
const RehatPage = lazy(() => import('./pages/Rehat'))
const NitnemCustomizePage = lazy(() => import('./pages/NitnemCustomize'))
const MorePage = lazy(() => import('./pages/More'))
const VocabPage = lazy(() => import('./pages/Vocab'))
const PrivacyPage = lazy(() => import('./pages/Privacy'))
const LibraryPageReader = lazy(() => import('./pages/library/LibraryPageReader'))
const LibraryEpisodeReader = lazy(() => import('./pages/library/LibraryEpisodeReader'))
const PanthPrakashLibraryHome = lazy(() => import('./pages/library/PanthPrakashLibraryHome'))

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`rounded-full bg-parchment-card/72 dark:bg-dark-text/10 ${className}`}
      aria-hidden="true"
    />
  )
}

function RouteFallback() {
  return (
    <div
      className="page-shell"
      data-testid="route-fallback"
      data-ai-surface="route-fallback"
      data-ai-state="loading"
      data-ai-flow="route-transition"
      aria-busy="true"
      aria-label="Loading page content"
    >
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center justify-between px-1">
          <SkeletonBlock className="h-3 w-20 bg-gold/15 dark:bg-gold/10" />
          <div
            className="h-10 w-10 rounded-full border border-sand/15 bg-parchment-card/80 dark:border-dark-text/10 dark:bg-dark-surface/75"
            aria-hidden="true"
          />
        </div>

        <section className="hero-surface overflow-hidden px-5 py-6">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-14 bg-gold/15 dark:bg-gold/10" />
            <SkeletonBlock className="h-10 w-[76%] rounded-[24px]" />
            <SkeletonBlock className="h-4 w-[48%] bg-parchment-card/60 dark:bg-dark-text/8" />
          </div>
        </section>

        <section className="section-shell-quiet p-4">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-24 bg-gold/12 dark:bg-gold/8" />
            <SkeletonBlock className="h-4 w-[88%] bg-parchment-card/62 dark:bg-dark-text/8" />
            <SkeletonBlock className="h-4 w-[68%] bg-parchment-card/58 dark:bg-dark-text/7" />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <section className="section-shell px-4 py-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-16 bg-gold/12 dark:bg-gold/8" />
              <SkeletonBlock className="h-9 w-12 rounded-[20px]" />
              <SkeletonBlock className="h-3 w-20 bg-parchment-card/58 dark:bg-dark-text/7" />
            </div>
          </section>

          <section className="section-shell px-4 py-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-20 bg-gold/12 dark:bg-gold/8" />
              <SkeletonBlock className="h-9 w-12 rounded-[20px]" />
              <SkeletonBlock className="h-3 w-16 bg-parchment-card/58 dark:bg-dark-text/7" />
            </div>
          </section>
        </div>

        <section className="section-shell p-4">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-20 bg-gold/12 dark:bg-gold/8" />
            <div className="space-y-2">
              <SkeletonBlock className="h-12 w-full rounded-[22px] bg-parchment-low/85 dark:bg-dark-surface/90" />
              <SkeletonBlock className="h-12 w-full rounded-[22px] bg-parchment-low/80 dark:bg-dark-surface/85" />
              <SkeletonBlock className="h-12 w-full rounded-[22px] bg-parchment-low/75 dark:bg-dark-surface/80" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const mainContentRef = useRef<HTMLElement | null>(null)
  const dark = useThemeStore(s => s.dark)
  const displayMode = useDisplayMode()
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const setScriptMode = useLanguageStore(s => s.setScriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const setShowTransliteration = useLanguageStore(s => s.setShowTransliteration)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const setMeaningLanguage = useLanguageStore(s => s.setMeaningLanguage)
  const englishSource = useLanguageStore(s => s.englishSource)
  const setEnglishSource = useLanguageStore(s => s.setEnglishSource)
  const hasCompletedOnboarding = useOnboardingStore(s => s.hasCompletedOnboarding)
  const isOnboardingOpen = useOnboardingStore(s => s.isOnboardingOpen)
  const presentationMode = useOnboardingStore(s => s.presentationMode)
  const learningLevel = useOnboardingStore(s => s.learningLevel)
  const audience = useOnboardingStore(s => s.audience)
  const learningGoal = useOnboardingStore(s => s.learningGoal)
  const setLearningLevel = useOnboardingStore(s => s.setLearningLevel)
  const setAudience = useOnboardingStore(s => s.setAudience)
  const setLearningGoal = useOnboardingStore(s => s.setLearningGoal)
  const completeOnboarding = useOnboardingStore(s => s.completeOnboarding)
  const closeOnboarding = useOnboardingStore(s => s.closeOnboarding)
  const locale = useLocaleStore(s => s.locale)
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)
  const [pendingOnboardingViewportReset, setPendingOnboardingViewportReset] = useState(false)
  const showFirstRun = !hasCompletedOnboarding && presentationMode === 'first-run'
  const showOverlay = hasCompletedOnboarding && isOnboardingOpen && presentationMode === 'overlay'

  useNitemOfflineCache()
  useSupabaseBootstrap()

  useEffect(() => {
    applyThemeToDocument(dark)
    document.documentElement.dataset.displayMode = displayMode
  }, [dark, displayMode])

  useEffect(() => {
    if (typeof window === 'undefined' || location.hash) return

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      mainContentRef.current?.focus({ preventScroll: true })
    })
  }, [location.hash, location.pathname])

  const resetViewportAfterOnboarding = useCallback(() => {
    if (typeof window === 'undefined') return

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        mainContentRef.current?.focus({ preventScroll: true })
      })
    })
  }, [])

  useEffect(() => {
    if (!pendingOnboardingViewportReset || showFirstRun) return

    resetViewportAfterOnboarding()
    setPendingOnboardingViewportReset(false)
  }, [pendingOnboardingViewportReset, resetViewportAfterOnboarding, showFirstRun])

  async function handleOnboardingComplete() {
    if (isCompletingOnboarding) return

    setIsCompletingOnboarding(true)

    try {
      const returningFromOverlay = hasCompletedOnboarding && presentationMode === 'overlay'

      completeOnboarding(learningLevel)

      if (returningFromOverlay) {
        return
      }

      startTransition(() => {
        navigate('/', {
          replace: true,
          state: learningGoal === 'habit' ? { highlightTodayPath: true } : null,
        })
      })
      setPendingOnboardingViewportReset(true)
    } finally {
      setIsCompletingOnboarding(false)
    }
  }

  const skipToContentHref = `${location.pathname}${location.search}#main-content`

  function handleSkipToContent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()

    if (typeof window === 'undefined') return

    window.history.replaceState(window.history.state, '', skipToContentHref)
    mainContentRef.current?.focus()
    window.requestAnimationFrame(() => {
      mainContentRef.current?.focus()
    })
  }

  return (
    <>
      <a
        key={skipToContentHref}
        href={skipToContentHref}
        onClick={handleSkipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-parchment-card focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:font-medium focus:text-ink dark:focus:bg-dark-card dark:focus:text-dark-text"
        data-testid="skip-to-content"
      >
        Skip to main content
      </a>
      <SplashScreen />
      <MusicControllerBridge />

      {showFirstRun ? (
        <OnboardingSheet
          presentation="first-run"
          locale={locale}
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
          onComplete={handleOnboardingComplete}
          isCompleting={isCompletingOnboarding}
        />
      ) : (
        <div
          className="app-shell bg-parchment transition-colors duration-300 dark:bg-dark-bg"
          data-display-mode={displayMode}
          data-testid="app-shell"
          data-ai-surface="app-shell"
          data-ai-state="ready"
        >
          <main
            ref={mainContentRef}
            id="main-content"
            tabIndex={-1}
            className="min-h-screen"
            data-testid="main-content"
            data-ai-surface="main-content"
            data-ai-state="ready"
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/study" element={<StudyPage />} />
                <Route path="/study/:scriptureId" element={<StudyPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
                <Route path="/library/:workId/episode/:episodeNumber" element={<LibraryEpisodeReader />} />
                <Route path="/library/:workId/page/:pageNumber" element={<LibraryPageReader />} />
                <Route path="/nitnem/customize" element={<NitnemCustomizePage />} />
                <Route path="/banis/amrit-keertan" element={<AmritKeertanPage />} />
                <Route path="/banis/amrit-keertan/:headerId" element={<AmritKeertanPage />} />
                <Route path="/banis/rehat" element={<RehatPage />} />
                <Route path="/banis/rehat/:rehatId" element={<RehatPage />} />
                <Route path="/banis/rehat/:rehatId/chapters/:chapterId" element={<RehatPage />} />
                <Route path="/banis" element={<BanisPage />} />
                <Route path="/more" element={<MorePage />} />
                <Route path="/learn/*" element={<Navigate to="/" replace />} />
                <Route path="/vocab" element={<VocabPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          {showOverlay && (
            <OnboardingSheet
              presentation="overlay"
              locale={locale}
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
              onComplete={handleOnboardingComplete}
              onDismiss={closeOnboarding}
              isCompleting={isCompletingOnboarding}
            />
          )}

          <NavBar />
        </div>
      )}
    </>
  )
}

export default function App() {
  const routerBasename = getRouterBasename(import.meta.env.BASE_URL)

  return (
    <BrowserRouter basename={routerBasename}>
      <AppShell />
    </BrowserRouter>
  )
}
