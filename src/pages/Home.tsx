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

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6 mt-4">
        <div>
          <p className="text-gray-500 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-white font-semibold text-lg font-ui">{greeting()}</h1>
        </div>
        <StreakBadge streak={streak} />
      </div>

      {/* Today's Pick */}
      <div className="mb-6">
        <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Today's Pick</h2>
        {pickLoading ? (
          <div className="bg-[#1A1A1A] rounded-2xl p-6 min-h-[120px] animate-pulse border border-[#2a2a2a]">
            <div className="h-4 bg-[#2a2a2a] rounded w-1/3 mb-3" />
            <div className="h-6 bg-[#2a2a2a] rounded w-full mb-2" />
            <div className="h-4 bg-[#2a2a2a] rounded w-2/3" />
          </div>
        ) : todaysPick ? (
          <div
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-5 cursor-pointer active:border-[#C9A84C] transition-colors"
          >
            <p className="text-gray-500 text-xs mb-2">{todaysPick.scripture} · Ang {todaysPick.ang}</p>
            <p lang="pa-Guru" className="font-gurmukhi text-white text-xl leading-relaxed line-clamp-2" style={{ fontSize: '22px' }}>
              {todaysPick.gurmukhi}
            </p>
            <p className="text-gray-400 text-sm mt-2 line-clamp-1">{todaysPick.translation_en}</p>
          </div>
        ) : null}
      </div>

      {/* Continue Reading */}
      {currentSession && (
        <div className="mb-6">
          <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Continue Reading</h2>
          <div
            onClick={() => navigate(`/study/${currentSession.scriptureId}`)}
            className="bg-[#1A1A1A] border border-[#C9A84C] rounded-2xl p-4 cursor-pointer flex justify-between items-center"
          >
            <div>
              <p className="text-white font-medium text-sm">Pick up where you left off</p>
              <p className="text-gray-500 text-xs mt-0.5">{currentSession.scriptureId.toUpperCase()}</p>
            </div>
            <span className="text-[#C9A84C] text-lg">→</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate('/study')}
          className="bg-[#C9A84C] text-black font-semibold rounded-2xl p-4 text-sm min-h-[44px]"
        >📖 Study</button>
        <button
          onClick={() => navigate('/quiz')}
          className="bg-[#1A1A1A] border border-[#2a2a2a] text-white rounded-2xl p-4 text-sm min-h-[44px]"
        >✏️ Quiz</button>
        <button
          onClick={() => navigate('/library')}
          className="bg-[#1A1A1A] border border-[#2a2a2a] text-white rounded-2xl p-4 text-sm min-h-[44px]"
        >📚 Library</button>
        <button
          onClick={() => navigate('/add')}
          className="bg-[#1A1A1A] border border-[#2a2a2a] text-white rounded-2xl p-4 text-sm min-h-[44px]"
        >+ Add Text</button>
      </div>

      {/* Recently Studied */}
      {recentlyStudied.length > 0 && (
        <div>
          <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Recently Studied</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyStudied.map((entry: any) => (
              <div
                key={entry.id}
                className="flex-shrink-0 w-48 bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl p-3 cursor-pointer"
                onClick={() => navigate('/study')}
              >
                <p className="text-gray-500 text-[10px] mb-1">{entry.scripture}</p>
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
