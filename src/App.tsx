import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Study from './pages/Study'
import Library from './pages/Library'
import Banis from './pages/Banis'
import Vocab from './pages/Vocab'
import AddText from './pages/AddText'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0D0D0D] pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/study" element={<Study />} />
          <Route path="/study/:scriptureId" element={<Study />} />
          <Route path="/library" element={<Library />} />
          <Route path="/banis" element={<Banis />} />
          <Route path="/vocab" element={<Vocab />} />
          <Route path="/add" element={<AddText />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <NavBar />
      </div>
    </BrowserRouter>
  )
}
