import './styles/support-surfaces.css'
import { lazy, Suspense, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { setReaderPresentationPreference } from './utils/readerPresentation'
import {
  buildHukamnamaStudyPath,
  buildPersonalHukamnamaStudyPath,
} from './utils/hukamnamaShareRoute'

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
const StoryReader = lazy(() => import('./pages/stories/StoryReader'))
const StoryDraftPreview = import.meta.env.DEV ? lazy(() => import('./pages/stories/StoryDraftPreview')) : null
const PanthPrakashLibraryHome = lazy(() => import('./pages/library/PanthPrakashLibraryHome'))

const PUBLIC_DOCUMENT_PATHS = new Set(['/privacy', '/support'])

function isPublicDocumentPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  return PUBLIC_DOCUMENT_PATHS.has(normalizedPath)
}

function HukamnamaShareRedirect() {
  const { date } = useParams<{ date: string }>()
  return <Navigate to={buildHukamnamaStudyPath(date)} replace />
}

function PersonalHukamnamaShareRedirect() {
  const { shabadId, ang, resumeVerseId } = useParams<{
    shabadId: string
    ang: string
    resumeVerseId?: string
  }>()
  return (
    <Navigate
      to={buildPersonalHukamnamaStudyPath(shabadId, ang, resumeVerseId)}
      replace
    />
  )
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`route-skeleton__block ${className}`} aria-hidden="true" />
}

function RouteFallback() {
  const { pathname } = useLocation()
  const reader = /^\/(?:study(?:\/|$)|stories\/[^/]+|library\/[^/]+\/chapters\/)/.test(pathname)
    || /^\/banis\/rehat\/[^/]+\/chapters\//.test(pathname)
  const family = reader ? 'reader' : pathname === '/' ? 'home' : /^\/(?:banis|library)/.test(pathname) ? 'catalog' : 'page'
  const lines = <div className="route-skeleton__lines">{[0, 1, 2, 3, 4].map(line => <SkeletonBlock key={line} />)}</div>

  return (
    <div
      lang="en"
      className={`page-shell route-skeleton route-skeleton--${family}`}
      data-testid="route-fallback"
      data-ai-surface="route-fallback"
      data-ai-state="loading"
      data-ai-flow="route-transition"
      data-layout={family}
      aria-busy="true"
      aria-label={reader ? 'Loading reading' : 'Loading page content'}
    >
      <div className="route-skeleton__header" aria-hidden="true">
        <SkeletonBlock className="route-skeleton__control" />
        <SkeletonBlock className="route-skeleton__title" />
        <SkeletonBlock className="route-skeleton__control" />
      </div>
      {reader ? (
        <div className="route-skeleton__reading" aria-hidden="true">
          <SkeletonBlock className="route-skeleton__reading-title" />
          {lines}{lines}{lines}
        </div>
      ) : family === 'home' ? (
        <div className="route-skeleton__home" aria-hidden="true">
          <SkeletonBlock className="route-skeleton__home-art" />
          <div className="route-skeleton__ritual">
            <SkeletonBlock className="route-skeleton__title" />
            <SkeletonBlock className="route-skeleton__reading-title" />
            {lines}
            <SkeletonBlock className="route-skeleton__action" />
          </div>
        </div>
      ) : (
        <div aria-hidden="true">
          {family === 'catalog' ? <SkeletonBlock className="route-skeleton__catalog-art" /> : null}
          <SkeletonBlock className="route-skeleton__search" />
          {lines}{lines}
        </div>
      )}
    </div>
  )
}

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <SurfaceStateCard
      lang="en"
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
  const hasCompletedOnboarding = useOnboardingStore(s => s.hasCompletedOnboarding)
  const isOnboardingOpen = useOnboardingStore(s => s.isOnboardingOpen)
  const presentationMode = useOnboardingStore(s => s.presentationMode)
  const learningLevel = useOnboardingStore(s => s.learningLevel)
  const completeOnboarding = useOnboardingStore(s => s.completeOnboarding)
  const closeOnboarding = useOnboardingStore(s => s.closeOnboarding)
  const locale = useLocaleStore(s => s.locale)
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)
  const [pendingOnboardingViewportReset, setPendingOnboardingViewportReset] = useState(false)
  const firstRunDestinationRef = useRef(`${location.pathname}${location.search}${location.hash}`)
  const isPublicDocument = isPublicDocumentPath(location.pathname)
  const isLibraryChapterReader = /^\/library\/[^/]+\/chapters\/[^/]+\/?$/.test(location.pathname)
  const isStoryReader = /^\/stories\/[^/]+\/?$/.test(location.pathname)
    || (import.meta.env.DEV && /^\/stories\/drafts\/[^/]+\/?$/.test(location.pathname))
  const isFocusedReader = location.pathname === '/study'
    || location.pathname.startsWith('/study/')
    || isLibraryChapterReader
    || isStoryReader
  const isFocusedEditor = /^\/nitnem\/customize\/?$/.test(location.pathname)
  const showPrimaryNavigation = !isPublicDocument && !isFocusedReader && !isFocusedEditor
  const showFirstRun = !isPublicDocument && !hasCompletedOnboarding && presentationMode === 'first-run'
  const showOverlay = !isPublicDocument && hasCompletedOnboarding && isOnboardingOpen && presentationMode === 'overlay'
  const requestedResumeVerseId = Number(new URLSearchParams(location.search).get('resumeVerseId'))
  const scriptureOwnsResumePosition = location.pathname === '/study'
    && Number.isSafeInteger(requestedResumeVerseId) && requestedResumeVerseId > 0

  useIosStandaloneViewportMetrics()
  useAppScrollRestoration({
    mainContentRef,
    enabled: !showFirstRun,
    routeHandlesOwnHash: isLibraryChapterReader || isStoryReader,
    routeHandlesOwnPosition: scriptureOwnsResumePosition || isStoryReader,
  })
  useRouteDocumentTitle(location.pathname)
  useNitemOfflineCache()
  useSupabaseBootstrap()

  useLayoutEffect(() => {
    applyThemeToDocument(showFirstRun || showOverlay || dark)
    document.documentElement.dataset.displayMode = displayMode
  }, [dark, displayMode, showFirstRun, showOverlay])

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

      setReaderPresentationPreference(meaningLanguage !== 'none' || showTransliteration ? 'study' : 'read')
      completeOnboarding(learningLevel)

      if (returningFromOverlay) return

      const destination = firstRunDestinationRef.current
      startTransition(() => {
        navigate(destination, {
          replace: true,
          state: null,
        })
      })
      setPendingOnboardingViewportReset(!destination.includes('#'))
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
                <Route path="/stories" element={<Navigate to="/banis?collection=stories" replace />} />
                <Route path="/stories/:storyId" element={<StoryReader />} />
                {StoryDraftPreview && <Route path="/stories/drafts" element={<StoryDraftPreview />} />}
                {StoryDraftPreview && <Route path="/stories/drafts/:storyId" element={<StoryDraftPreview />} />}
                <Route path="/study" element={<StudyPage />} />
                <Route path="/study/:scriptureId" element={<StudyPage />} />
                <Route path="/h/:date" element={<HukamnamaShareRedirect />} />
                <Route path="/p/:shabadId/:ang" element={<PersonalHukamnamaShareRedirect />} />
                <Route path="/p/:shabadId/:ang/:resumeVerseId" element={<PersonalHukamnamaShareRedirect />} />
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
