import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { getDailyPickAng } from '../utils/dailyPick'
import { useAng } from '../hooks/useAng'
import { useHukamnama } from '../hooks/useHukamnama'
import { useBookmarksStore } from '../store/bookmarks'
import StreakBadge from '../components/StreakBadge'
import type { StudiedEntry } from '../types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Sat Sri Akaal'
  if (h < 17) return 'Waheguru Ji'
  return 'Waheguru Ji Ka Khalsa'
}

export default function Home() {
  const navigate = useNavigate()
  const { streak, currentSession, studied } = useProgressStore()
  const { getEntryById } = useScriptureCacheStore()
  const { addBookmark, hasBookmark } = useBookmarksStore()
  const { source, ang } = getDailyPickAng()
  const { entries: pickEntries, loading: pickLoading } = useAng(ang, source)
  const todaysPick = pickEntries[0] ?? null

  const { data: hukamnama, loading: hukamnamaLoading } = useHukamnama()

  const [pressedBtn, setPressedBtn] = useState<string | null>(null)

  const recentlyStudied = [...studied]
    .sort((a: StudiedEntry, b: StudiedEntry) =>
      new Date(b.swipedAt).getTime() - new Date(a.swipedAt).getTime()
    )
    .slice(0, 6)
    .map((s: StudiedEntry) => {
      const entry = getEntryById(s.id)
      return entry ? { ...entry, swipedAt: s.swipedAt } : null
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)

  const actions = [
    { key: 'library', label: 'Library', path: '/library', primary: true },
    { key: 'banis', label: 'Banis', path: '/banis', primary: false },
  ]

  const hukamAng = hukamnama?.ang ?? null
  const hukamSource = (hukamnama?.source ?? 'G') as 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R'
  const hukamBookmarked = hukamAng ? hasBookmark(hukamSource, hukamAng) : false

  const handleSaveHukamnama = () => {
    if (!hukamAng) return
    addBookmark({
      type: 'shabad',
      title: `Hukamnama - Ang ${hukamAng}`,
      source: hukamSource,
      ang: hukamAng,
    })
  }

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment">
      <div className="flex justify-between items-center mb-2 mt-4">
        <span className="font-sans font-bold text-saffron text-base">Nitnem</span>
        <StreakBadge streak={streak} />
      </div>

      <p className="font-sans text-xs text-ink/50 mb-1">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <h1 className="font-sans font-semibold text-lg text-ink mb-6">{greeting()}</h1>

      {/* Hukamnama */}
      <div className="bg-parchment-low rounded-2xl p-4 mb-6">
        <p className="font-sans text-xs text-saffron uppercase tracking-wide mb-3">Today's Hukamnama</p>
        {hukamnamaLoading ? (
          <div className="bg-parchment-low rounded-2xl p-6 min-h-[120px] animate-pulse" />
        ) : hukamnama ? (
          <div className="bg-parchment-card rounded-2xl p-4">
            <p className="font-sans text-xs text-saffron uppercase tracking-wide mb-2">
              SGGS · Ang {hukamnama.ang}
            </p>
            <p lang="pa-Guru" className="font-gurmukhi text-2xl text-ink leading-relaxed line-clamp-2 mb-2">
              {hukamnama.gurmukhi}
            </p>
            <p className="font-sans text-sm text-ink/70 line-clamp-2 mb-4">{hukamnama.translation_en}</p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/study?source=${hukamSource}&ang=${hukamnama.ang}`)}
                className="flex-1 font-sans text-sm font-semibold bg-gradient-to-r from-saffron to-saffron-light text-white px-4 py-2 rounded-full min-h-[44px] transition-colors duration-300"
              >
                Read
              </button>
              <button
                onClick={handleSaveHukamnama}
                disabled={hukamBookmarked}
                className={`px-4 py-2 rounded-full font-sans text-sm min-h-[44px] border transition-colors duration-300 ${
                  hukamBookmarked ? 'border-saffron/30 text-saffron' : 'border-sand/15 text-ink/50'
                }`}
              >
                {hukamBookmarked ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-parchment-card rounded-2xl p-6 min-h-[80px] flex items-center justify-center">
            <p className="font-sans text-ink/50 text-sm">Hukamnama unavailable</p>
          </div>
        )}
      </div>

      {/* Today's Pick */}
      <div className="bg-parchment-low rounded-2xl p-4 mb-6">
        <p className="font-sans text-xs text-saffron uppercase tracking-wide mb-3">Today's Pick</p>
        {pickLoading ? (
          <div className="bg-parchment-low rounded-2xl p-6 min-h-[120px] animate-pulse" />
        ) : todaysPick ? (
          <div
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="bg-parchment-card rounded-2xl p-6 cursor-pointer transition-shadow duration-300"
          >
            <p className="font-sans text-xs text-saffron uppercase tracking-wide mb-2">
              {todaysPick.scripture} · Ang {todaysPick.ang}
            </p>
            <p lang="pa-Guru" className="font-gurmukhi text-2xl text-ink leading-relaxed line-clamp-2">
              {todaysPick.gurmukhi}
            </p>
            <p className="font-sans text-sm text-ink/70 mt-2 line-clamp-1">{todaysPick.translation_en}</p>
            <div className="mt-4 flex justify-end">
              <button className="font-sans text-sm font-semibold bg-gradient-to-r from-saffron to-saffron-light text-white px-5 py-2 rounded-full transition-colors duration-300">
                Read
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-parchment-card rounded-2xl p-6 min-h-[120px] flex items-center justify-center">
            <p className="font-sans text-ink/50 text-sm">No verse available today</p>
          </div>
        )}
      </div>

      {/* Continue Reading */}
      {currentSession && (
        <div className="mb-6">
          <div
            onClick={() => {
              const parts = currentSession.scriptureId.split('-')
              if (parts.length >= 2) {
                navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
              }
            }}
            className="bg-parchment-low rounded-2xl p-4 cursor-pointer flex justify-between items-center transition-colors duration-300"
          >
            <div>
              <p className="font-sans font-medium text-ink text-sm">Pick up where you left off</p>
              <p className="font-sans text-saffron text-xs mt-0.5">{currentSession.scriptureId.toUpperCase()}</p>
            </div>
            <span className="text-saffron text-lg">&#8594;</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col gap-3 mb-6">
        {actions.map(({ key, label, path, primary }) => (
          <button
            key={key}
            onClick={() => navigate(path)}
            onMouseDown={() => setPressedBtn(key)}
            onMouseUp={() => setPressedBtn(null)}
            onTouchStart={() => setPressedBtn(key)}
            onTouchEnd={() => setPressedBtn(null)}
            className={`font-sans rounded-full p-4 text-sm font-semibold min-h-[44px] transition-all duration-300 ${
              primary
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-parchment-low text-ink border border-sand/15'
            } ${pressedBtn === key ? 'opacity-80' : ''}`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => navigate(`/study?source=G&ang=${Math.floor(Math.random() * 1430) + 1}`)}
          className="font-sans rounded-full p-4 text-sm font-semibold min-h-[44px] bg-parchment-low text-ink border border-sand/15 transition-all duration-300"
        >
          Random Ang
        </button>
      </div>

      {/* Recently Studied */}
      {recentlyStudied.length > 0 && (
        <div>
          <p className="font-sans text-xs text-ink/50 uppercase tracking-wider mb-3">Recently Studied</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyStudied.map((entry) => (
              <div
                key={entry.id}
                className="flex-shrink-0 w-48 bg-parchment-card rounded-xl p-3 cursor-pointer"
                onClick={() => {
                  const parts = entry.id.split('-')
                  if (parts.length >= 2) navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
                }}
              >
                <p className="font-sans text-saffron text-[10px] mb-1 uppercase tracking-wide">{entry.scripture}</p>
                <p lang="pa-Guru" className="font-gurmukhi text-ink text-sm leading-relaxed line-clamp-2">
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
