import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALL_ENTRIES } from '../data'
import { useProgressStore } from '../store/progress'
import { useCustomTextsStore } from '../store/customTexts'
import { getDailyPickAng } from '../utils/dailyPick'
import { useAng } from '../hooks/useAng'
import StreakBadge from '../components/StreakBadge'
import type { StudiedEntry } from '../types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Sat Sri Akaal 🙏'
  if (h < 17) return 'Waheguru Ji 🙏'
  return 'Waheguru Ji Ka Khalsa 🙏'
}

export default function Home() {
  const navigate = useNavigate()
  const { streak, currentSession, studied } = useProgressStore()
  const { customTexts } = useCustomTextsStore()
  const { source, ang } = getDailyPickAng()
  const { entries: pickEntries, loading: pickLoading } = useAng(ang, source)
  const todaysPick = pickEntries[0] ?? null

  const [pressedBtn, setPressedBtn] = useState<string | null>(null)

  const recentlyStudied = [...studied]
    .sort((a: StudiedEntry, b: StudiedEntry) =>
      new Date(b.swipedAt).getTime() - new Date(a.swipedAt).getTime()
    )
    .slice(0, 6)
    .map((s: StudiedEntry) => {
      const entry = ALL_ENTRIES.find(e => e.id === s.id)
        || customTexts.find(e => e.id === s.id)
      return entry ? { ...entry, swipedAt: s.swipedAt } : null
    })
    .filter(Boolean)

  const btnGlow = { boxShadow: '0 0 12px #C9A84C88' }
  const heroGlow = { boxShadow: '0 0 20px #7B2D0088, 0 0 40px #3D120044' }
  const heroActiveGlow = { boxShadow: '0 0 30px #C9A84C66' }

  return (
    <div
      className="p-4 max-w-md mx-auto min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #7B2D00 0%, #3D1200 25%, #1A0800 50%, #0D0D0D 75%)'
      }}
    >
      {/* Greeting */}
      <div className="flex justify-between items-center mb-6 mt-4">
        <div>
          <p className="text-[#8B6914] text-xs font-pixel">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-white font-semibold text-lg font-pixel">{greeting()}</h1>
        </div>
        <StreakBadge streak={streak} />
      </div>

      {/* Today's Pick */}
      <div className="mb-6">
        <h2 className="text-[#8B6914] text-xs font-pixel uppercase tracking-wider mb-3">Today's Pick</h2>
        {pickLoading ? (
          <div className="bg-coal rounded-2xl p-6 min-h-[120px] animate-pulse border border-[#C9A84C]" />
        ) : todaysPick ? (
          <div
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="bg-coal border border-[#C9A84C] rounded-2xl p-6 cursor-pointer transition-shadow"
            style={heroGlow}
            onMouseDown={(e) => { e.currentTarget.style.boxShadow = heroActiveGlow.boxShadow }}
            onMouseUp={(e) => { e.currentTarget.style.boxShadow = heroGlow.boxShadow }}
            onTouchStart={(e) => { e.currentTarget.style.boxShadow = heroActiveGlow.boxShadow }}
            onTouchEnd={(e) => { e.currentTarget.style.boxShadow = heroGlow.boxShadow }}
          >
            <p className="text-[#C9A84C] text-xs font-pixel mb-2">
              {todaysPick.scripture} · Ang {todaysPick.ang}
            </p>
            <p lang="pa-Guru" className="font-gurmukhi text-white text-2xl leading-relaxed line-clamp-2">
              {todaysPick.gurmukhi}
            </p>
            <p className="text-[#A07850] text-sm mt-2 line-clamp-1">{todaysPick.translation_en}</p>
          </div>
        ) : (
          <div
            className="bg-coal border border-[#C9A84C] rounded-2xl p-6 min-h-[120px] flex items-center justify-center"
            style={heroGlow}
          >
            <p className="text-[#8B6914] text-sm font-pixel">No verse available today</p>
          </div>
        )}
      </div>

      {/* Continue Reading */}
      {currentSession && (
        <div className="mb-6">
          <h2 className="text-[#8B6914] text-xs font-pixel uppercase tracking-wider mb-3">Continue Reading</h2>
          <div
            onClick={() => navigate(`/study/${currentSession.scriptureId}`)}
            className="bg-coal border border-[#C9A84C66] rounded-2xl p-4 cursor-pointer flex justify-between items-center"
            style={{ boxShadow: '0 0 8px #C9A84C44' }}
          >
            <div>
              <p className="text-white font-medium text-sm font-pixel">Pick up where you left off</p>
              <p className="text-[#8B6914] text-xs mt-0.5 font-pixel">{currentSession.scriptureId.toUpperCase()}</p>
            </div>
            <span className="text-[#C9A84C] text-lg">→</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { key: 'study', label: '📖 Study', path: '/study', primary: true },
          { key: 'quiz', label: '✏️ Quiz', path: '/quiz', primary: false },
          { key: 'library', label: '📚 Library', path: '/library', primary: false },
          { key: 'add', label: '+ Add Text', path: '/add', primary: false },
        ].map(({ key, label, path, primary }) => (
          <button
            key={key}
            onClick={() => navigate(path)}
            onMouseDown={() => setPressedBtn(key)}
            onMouseUp={() => setPressedBtn(null)}
            onTouchStart={() => setPressedBtn(key)}
            onTouchEnd={() => setPressedBtn(null)}
            className={`font-pixel rounded-2xl p-4 text-sm min-h-[44px] border ${
              primary
                ? 'text-white border-[#C9A84C]'
                : 'bg-coal text-white border-[#C9A84C66]'
            }`}
            style={{
              ...(primary ? { background: 'linear-gradient(135deg, #7B2D00, #C9A84C22)' } : {}),
              ...(pressedBtn === key ? btnGlow : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Recently Studied */}
      {recentlyStudied.length > 0 && (
        <div>
          <h2 className="text-[#8B6914] text-xs font-pixel uppercase tracking-wider mb-3">Recently Studied</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyStudied.map((entry: any) => (
              <div
                key={entry.id}
                className="flex-shrink-0 w-48 bg-coal border border-[#C9A84C44] rounded-xl p-3 cursor-pointer"
                onClick={() => navigate('/study')}
              >
                <p className="text-[#8B6914] font-pixel text-[10px] mb-1">{entry.scripture}</p>
                <p lang="pa-Guru" className="font-gurmukhi text-white text-sm line-clamp-2" style={{ fontSize: '14px' }}>
                  {entry.gurmukhi}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
