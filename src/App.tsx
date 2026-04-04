import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Study from './pages/Study'
import Library from './pages/Library'
import Banis from './pages/Banis'
import More from './pages/More'
import Learn from './pages/Learn'
import Vocab from './pages/Vocab'
import { useThemeStore } from './store/theme'
import { useNitemOfflineCache } from './hooks/useNitemOfflineCache'

export default function App() {
  const dark = useThemeStore(s => s.dark)
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
        <NavBar />
      </div>
    </BrowserRouter>
  )
}
