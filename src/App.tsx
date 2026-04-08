import { startTransition, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import MusicControllerBridge from './components/MusicControllerBridge'
import OnboardingSheet from './components/OnboardingSheet'
import SplashScreen from './components/SplashScreen'
import { useDisplayMode } from './hooks/useDisplayMode'
import { useNitemOfflineCache } from './hooks/useNitemOfflineCache'
import Home from './pages/Home'
import Study from './pages/Study'
import Library from './pages/Library'
import Banis from './pages/Banis'
import More from './pages/More'
import Learn from './pages/Learn'
import Vocab from './pages/Vocab'
import { useLanguageStore } from './store/language'
import { useLocaleStore } from './store/locale'
import { useOnboardingStore } from './store/onboarding'
import { useThemeStore } from './store/theme'

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/study" element={<Study />} />
            <Route path="/study/:scriptureId" element={<Study />} />
            <Route path="/library" element={<Library />} />
            <Route path="/banis" element={<Banis />} />
            <Route path="/more" element={<More />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/vocab" element={<Vocab />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

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
