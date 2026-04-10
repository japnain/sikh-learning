import { lazy, Suspense, startTransition, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import MusicControllerBridge from './components/MusicControllerBridge'
import OnboardingSheet from './components/OnboardingSheet'
import SplashScreen from './components/SplashScreen'
import { useDisplayMode } from './hooks/useDisplayMode'
import { useNitemOfflineCache } from './hooks/useNitemOfflineCache'
import { useLanguageStore } from './store/language'
import { useLocaleStore } from './store/locale'
import { useOnboardingStore } from './store/onboarding'
import { useThemeStore } from './store/theme'

const HomePage = lazy(() => import('./pages/Home'))
const StudyPage = lazy(() => import('./pages/Study'))
const LibraryPage = lazy(() => import('./pages/Library'))
const BanisPage = lazy(() => import('./pages/Banis'))
const MorePage = lazy(() => import('./pages/More'))
const LearnPage = lazy(() => import('./pages/Learn'))
const VocabPage = lazy(() => import('./pages/Vocab'))

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`rounded-full bg-white/60 dark:bg-dark-text/10 ${className}`}
      aria-hidden="true"
    />
  )
}

function RouteFallback() {
  return (
    <div className="page-shell">
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center justify-between px-1">
          <SkeletonBlock className="h-3 w-20 bg-gold/15 dark:bg-gold/10" />
          <div
            className="h-10 w-10 rounded-full border border-sand/15 bg-white/55 dark:border-dark-text/10 dark:bg-dark-surface/75"
            aria-hidden="true"
          />
        </div>

        <section className="hero-surface overflow-hidden px-5 py-6">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-14 bg-gold/15 dark:bg-gold/10" />
            <SkeletonBlock className="h-10 w-[76%] rounded-[24px]" />
            <SkeletonBlock className="h-4 w-[48%] bg-white/45 dark:bg-dark-text/8" />
          </div>
        </section>

        <section className="section-shell-quiet p-4">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-24 bg-gold/12 dark:bg-gold/8" />
            <SkeletonBlock className="h-4 w-[88%] bg-white/48 dark:bg-dark-text/8" />
            <SkeletonBlock className="h-4 w-[68%] bg-white/42 dark:bg-dark-text/7" />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <section className="section-shell px-4 py-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-16 bg-gold/12 dark:bg-gold/8" />
              <SkeletonBlock className="h-9 w-12 rounded-[20px]" />
              <SkeletonBlock className="h-3 w-20 bg-white/42 dark:bg-dark-text/7" />
            </div>
          </section>

          <section className="section-shell px-4 py-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-20 bg-gold/12 dark:bg-gold/8" />
              <SkeletonBlock className="h-9 w-12 rounded-[20px]" />
              <SkeletonBlock className="h-3 w-16 bg-white/42 dark:bg-dark-text/7" />
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
  const navigate = useNavigate()
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

  useNitemOfflineCache()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.displayMode = displayMode
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'

    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    themeColorMeta?.setAttribute('content', dark ? '#0f0a1e' : '#fbf3e4')
  }, [dark, displayMode])

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
    } finally {
      setIsCompletingOnboarding(false)
    }
  }

  const showFirstRun = !hasCompletedOnboarding && presentationMode === 'first-run'
  const showOverlay = hasCompletedOnboarding && isOnboardingOpen && presentationMode === 'overlay'

  return (
    <>
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
        >
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/study" element={<StudyPage />} />
              <Route path="/study/:scriptureId" element={<StudyPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/banis" element={<BanisPage />} />
              <Route path="/more" element={<MorePage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/vocab" element={<VocabPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

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

          {hasCompletedOnboarding && <NavBar />}
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
