import { lazy, Suspense, startTransition, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import MusicControllerBridge from './components/MusicControllerBridge'
import OnboardingSheet from './components/OnboardingSheet'
import SplashScreen from './components/SplashScreen'
import SurfaceStateCard from './components/SurfaceStateCard'
import { useAppScrollRestoration } from './hooks/useAppScrollRestoration'
import { useDisplayMode } from './hooks/useDisplayMode'
import { useIosStandaloneViewportMetrics } from './hooks/useIosStandaloneViewportMetrics'
import { useSupabaseBootstrap } from './hooks/useSupabaseBootstrap'
import { useNitemOfflineCache } from './hooks/useNitemOfflineCache'
import { useRouteDocumentTitle } from './hooks/useRouteDocumentTitle'
import { useLanguageStore } from './store/language'
import { useLocaleStore } from './store/locale'
import { useOnboardingStore } from './store/onboarding'
import { applyThemeToDocument, useThemeStore } from './store/theme'
import { scrollAppTo } from './utils/appScroll'
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
const SupportPage = lazy(() => import('./pages/Support'))
const LibraryChapterReader = lazy(() => import('./pages/library/LibraryChapterReader'))
const PanthPrakashLibraryHome = lazy(() => import('./pages/library/PanthPrakashLibraryHome'))

const PUBLIC_DOCUMENT_PATHS = new Set(['/privacy', '/support'])

function isPublicDocumentPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  return PUBLIC_DOCUMENT_PATHS.has(normalizedPath)
}

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

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <SurfaceStateCard
      surface="route-not-found"
      state="empty"
      eyebrow="Page not found"
      title="This path does not exist"
      body="The link may be outdated, or the address may have been mistyped."
      page="not-found"
      testId="page-not-found"
      actions={[
        {
          label: 'Go home',
          onClick: () => navigate('/'),
          aiAction: 'go-home',
        },
        {
          label: 'Browse Read',
          onClick: () => navigate('/banis'),
          aiAction: 'browse-read',
          emphasis: 'secondary',
        },
      ]}
    />
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
  const learningGoal = useOnboardingStore(s => s.learningGoal)
  const setLearningGoal = useOnboardingStore(s => s.setLearningGoal)
  const completeOnboarding = useOnboardingStore(s => s.completeOnboarding)
  const closeOnboarding = useOnboardingStore(s => s.closeOnboarding)
  const locale = useLocaleStore(s => s.locale)
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)
  const [pendingOnboardingViewportReset, setPendingOnboardingViewportReset] = useState(false)
  const firstRunDestinationRef = useRef(`${location.pathname}${location.search}${location.hash}`)
  const isPublicDocument = isPublicDocumentPath(location.pathname)
  const isLibraryChapterReader = /^\/library\/[^/]+\/chapters\/[^/]+\/?$/.test(location.pathname)
  const isFocusedReader = location.pathname === '/study'
    || location.pathname.startsWith('/study/')
    || isLibraryChapterReader
  const showPrimaryNavigation = !isPublicDocument && !isFocusedReader
  const showFirstRun = !isPublicDocument && !hasCompletedOnboarding && presentationMode === 'first-run'
  const showOverlay = !isPublicDocument && hasCompletedOnboarding && isOnboardingOpen && presentationMode === 'overlay'

  useIosStandaloneViewportMetrics()
  useAppScrollRestoration({
    mainContentRef,
    enabled: !showFirstRun,
    routeHandlesOwnHash: isLibraryChapterReader,
  })
  useRouteDocumentTitle(location.pathname)
  useNitemOfflineCache()
  useSupabaseBootstrap()

  useEffect(() => {
    applyThemeToDocument(dark)
    document.documentElement.dataset.displayMode = displayMode
  }, [dark, displayMode])

  useEffect(() => {
    document.documentElement.lang = locale === 'pa' ? 'pa-Guru' : locale === 'hi' ? 'hi' : 'en'
    document.documentElement.dir = 'ltr'
  }, [locale])

  const resetViewportAfterOnboarding = useCallback(() => {
    if (typeof window === 'undefined') return

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollAppTo({ top: 0, left: 0, behavior: 'auto' })
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
        navigate(firstRunDestinationRef.current, {
          replace: true,
          state: null,
        })
      })
      setPendingOnboardingViewportReset(!firstRunDestinationRef.current.includes('#'))
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
          data-reader-focus={isFocusedReader ? 'true' : undefined}
          data-navigation={showPrimaryNavigation ? 'primary' : undefined}
        >
          <main
            ref={mainContentRef}
            id="main-content"
            tabIndex={-1}
            className="min-h-full"
            data-testid="main-content"
            data-ai-surface="main-content"
            data-ai-state="ready"
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/study" element={<StudyPage />} />
                <Route path="/study/:scriptureId" element={<StudyPage />} />
                <Route path="/saved" element={<LibraryPage />} />
                <Route path="/library" element={<Navigate to="/saved" replace />} />
                <Route path="/library/:workId" element={<PanthPrakashLibraryHome />} />
                <Route path="/library/:workId/chapters/:chapterId" element={<LibraryChapterReader />} />
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
                <Route path="/support" element={<SupportPage />} />
                <Route path="*" element={<NotFoundPage />} />
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
              learningGoal={learningGoal}
              setLearningGoal={setLearningGoal}
              onComplete={handleOnboardingComplete}
              onDismiss={closeOnboarding}
              isCompleting={isCompletingOnboarding}
            />
          )}
        </div>
      )}
      {!showFirstRun && showPrimaryNavigation ? <NavBar /> : null}
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
