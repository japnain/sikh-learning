import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import MusicControllerBridge from './components/MusicControllerBridge'
import OnboardingSheet from './components/OnboardingSheet'
import SplashScreen from './components/SplashScreen'
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
import { useNitemOfflineCache } from './hooks/useNitemOfflineCache'

export default function App() {
  const dark = useThemeStore(s => s.dark)
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const setScriptMode = useLanguageStore(s => s.setScriptMode)
  const showTransliteration = useLanguageStore(s => s.showTransliteration)
  const setShowTransliteration = useLanguageStore(s => s.setShowTransliteration)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const setMeaningLanguage = useLanguageStore(s => s.setMeaningLanguage)
  const englishSource = useLanguageStore(s => s.englishSource)
  const setEnglishSource = useLanguageStore(s => s.setEnglishSource)
  const hasCompletedOnboarding = useOnboardingStore(s => s.hasCompletedOnboarding)
  const learningLevel = useOnboardingStore(s => s.learningLevel)
  const audience = useOnboardingStore(s => s.audience)
  const learningGoal = useOnboardingStore(s => s.learningGoal)
  const setLearningLevel = useOnboardingStore(s => s.setLearningLevel)
  const setAudience = useOnboardingStore(s => s.setAudience)
  const setLearningGoal = useOnboardingStore(s => s.setLearningGoal)
  const completeOnboarding = useOnboardingStore(s => s.completeOnboarding)
  const locale = useLocaleStore(s => s.locale)
  useNitemOfflineCache()

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [dark])

  return (
    <BrowserRouter>
      <SplashScreen />
      <MusicControllerBridge />
      <div className="min-h-screen bg-parchment dark:bg-dark-bg pb-20 transition-colors duration-300">
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
        {!hasCompletedOnboarding && (
          <OnboardingSheet
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
            onComplete={() => completeOnboarding(learningLevel)}
          />
        )}
        {hasCompletedOnboarding && <NavBar />}
      </div>
    </BrowserRouter>
  )
}
