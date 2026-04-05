import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSun, IconMoon, IconChevronUp, IconChevronDown, IconCheck, IconArrowRight, IconSearch } from '../components/icons'
import { useProgressStore } from '../store/progress'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { getDailyPickAng } from '../utils/dailyPick'
import { useAng } from '../hooks/useAng'
import { useThemeStore } from '../store/theme'
import { useLanguageStore } from '../store/language'
import { gurmukhiToHindi } from '../utils/gurmukhiToHindi'
import { useNitemStore, NITNEM_BANIS } from '../store/nitnem'
import { useReadingProgressStore } from '../store/readingProgress'
import { BANIS } from '../data/banis'
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
  const { dark, toggle: toggleTheme } = useThemeStore()
  const hindiMode = useLanguageStore(s => s.hindiMode)
  const { markComplete, unmarkComplete, isComplete, resetIfNewDay } = useNitemStore()
  resetIfNewDay()
  const nitnemDone = NITNEM_BANIS.filter(b => isComplete(b.id)).length
  const { source, ang } = getDailyPickAng()
  const { entries: pickEntries, loading: pickLoading } = useAng(ang, source)
  const todaysPick = pickEntries[0] ?? null

  const [pressedBtn, setPressedBtn] = useState<string | null>(null)
  const [nitnemOpen, setNitnemOpen] = useState(false)
  const { getProgress } = useReadingProgressStore()

  // Top banis to show reading progress for
  const PROGRESS_BANIS = BANIS.filter(b => ['japji-sahib', 'sukhmani-sahib', 'anand-sahib', 'rehras-sahib', 'jaap-sahib'].includes(b.id))
  const progressItems = PROGRESS_BANIS.map(b => ({ ...b, ...getProgress(b.id) })).filter(p => p.done > 0)

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

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300 animate-fade-in">
      <div className="flex justify-between items-center mb-2 mt-4">
        <span className="font-sans font-bold text-saffron dark:text-saffron-light text-base">Nitnem</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xl active:scale-95 transition-transform duration-150"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <IconSun size={20} /> : <IconMoon size={20} />}
          </button>
          <StreakBadge streak={streak} />
        </div>
      </div>

      <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mb-3">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Quick Search */}
      <button
        onClick={() => navigate('/banis')}
        className="w-full flex items-center gap-2 bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 mb-6 transition-colors duration-300 active:scale-[0.98] transition-transform duration-150"
      >
        <IconSearch size={16} className="text-ink/30 dark:text-dark-text/30" />
        <span className="font-sans text-sm text-ink/40 dark:text-dark-text/40">Search Gurbani...</span>
      </button>
      <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text mb-6">{greeting()}</h1>

      {/* Take a Hukamnama */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300 shadow-card dark:shadow-gold animate-slide-up stagger-1">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-3">Take a Hukamnama</p>
        <div className="bg-parchment-card dark:bg-dark-card rounded-2xl p-6 flex flex-col items-center transition-colors duration-300">
          <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70 text-center mb-4">
            Open Sri Guru Granth Sahib Ji to a random ang and receive the Guru's guidance.
          </p>
          <button
            onClick={() => navigate(`/study?source=G&ang=${Math.floor(Math.random() * 1430) + 1}`)}
            className="w-full font-sans text-sm font-semibold bg-gradient-to-r from-saffron to-saffron-light text-white px-4 py-3 rounded-full min-h-[44px] active:scale-95 transition-transform duration-150"
          >
            Take Hukamnama
          </button>
        </div>
      </div>

      {/* Nitnem Daily Tracker — collapsible */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl mb-6 transition-colors duration-300 overflow-hidden shadow-card dark:shadow-gold animate-slide-up stagger-2">
        <button
          onClick={() => setNitnemOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 min-h-[44px] active:scale-95 transition-transform duration-150"
        >
          <div className="flex items-center gap-2">
            <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide">Nitnem · Daily Prayers</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{nitnemDone}/{NITNEM_BANIS.length}</p>
            <span className="font-sans text-xs text-gold dark:text-gold-light">{nitnemOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
          </div>
        </button>
        {/* Progress bar always visible */}
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 mx-4 mb-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full transition-all duration-500"
            style={{ width: `${(nitnemDone / NITNEM_BANIS.length) * 100}%` }}
          />
        </div>
        {nitnemOpen && (
          <div className="px-4 pb-4">
            {nitnemDone === NITNEM_BANIS.length && (
              <p className="font-sans text-xs text-gold dark:text-gold-light text-center mb-3">ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ · All Nitnem complete</p>
            )}
            <div className="space-y-1.5">
              {NITNEM_BANIS.map(bani => {
                const done = isComplete(bani.id)
                return (
                  <div key={bani.id} className="flex items-center gap-2 bg-parchment-card dark:bg-dark-card rounded-xl px-3 py-2 min-h-[44px] transition-colors duration-300">
                    <button
                      onClick={() => done ? unmarkComplete(bani.id) : markComplete(bani.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform duration-150 ${done ? 'bg-saffron border-saffron text-white' : 'border-sand/40 dark:border-dark-text/20'}`}
                    >
                      {done && <IconCheck size={14} />}
                    </button>
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({ source: bani.source, ang: String(bani.startAng), bani: bani.name, baniId: String(bani.baniDbId) })
                        navigate(`/study?${params}`)
                      }}
                      className="flex-1 text-left"
                    >
                      <p className={`font-sans text-sm transition-colors duration-300 ${done ? 'text-ink/40 dark:text-dark-text/40 line-through' : 'text-ink dark:text-dark-text'}`}>
                        {bani.name}
                      </p>
                    </button>
                    <span className={`font-sans text-[10px] px-2 py-0.5 rounded-full ${
                      bani.time === 'Morning' ? 'bg-gold/15 text-gold dark:text-gold-light' :
                      bani.time === 'Evening' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-purple-500/15 text-purple-400'
                    }`}>{bani.time}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Today's Pick */}
      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-6 transition-colors duration-300 shadow-card dark:shadow-gold animate-slide-up stagger-3">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-3">Today's Pick</p>
        {pickLoading ? (
          <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-6 min-h-[120px] animate-pulse" />
        ) : todaysPick ? (
          <div
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="bg-parchment-card dark:bg-dark-card rounded-2xl p-6 cursor-pointer transition-shadow duration-300 ornate-top"
          >
            <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-2">
              {todaysPick.scripture} · Ang {todaysPick.ang}
            </p>
            <p lang={hindiMode ? 'hi' : 'pa-Guru'} className={`${hindiMode ? 'font-sans' : 'font-gurmukhi'} text-2xl text-ink dark:text-dark-text leading-relaxed line-clamp-2`}>
              {hindiMode ? gurmukhiToHindi(todaysPick.gurmukhi) : todaysPick.gurmukhi}
            </p>
            <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70 mt-2 line-clamp-1">{todaysPick.translation_en}</p>
            <div className="mt-4 flex justify-end">
              <button className="font-sans text-sm font-semibold bg-gradient-to-r from-saffron to-saffron-light text-white px-5 py-2 rounded-full active:scale-95 transition-transform duration-150">
                Read
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-parchment-card dark:bg-dark-card rounded-2xl p-6 min-h-[120px] flex items-center justify-center">
            <p className="font-sans text-ink/50 dark:text-dark-text/50 text-sm">No verse available today</p>
          </div>
        )}
      </div>

      {/* Continue Reading */}
      {currentSession && (
        <div className="mb-6 animate-slide-up stagger-4">
          <div
            onClick={() => {
              const parts = currentSession.scriptureId.split('-')
              if (parts.length >= 2) {
                navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
              }
            }}
            className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 cursor-pointer flex justify-between items-center transition-colors duration-300"
          >
            <div>
              <p className="font-sans font-medium text-ink dark:text-dark-text text-sm">Pick up where you left off</p>
              <p className="font-sans text-gold dark:text-gold-light text-xs mt-0.5">{currentSession.scriptureId.toUpperCase()}</p>
            </div>
            <span className="text-gold dark:text-gold-light"><IconArrowRight size={18} /></span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col gap-3 mb-6 animate-slide-up stagger-5">
        {actions.map(({ key, label, path, primary }) => (
          <button
            key={key}
            onClick={() => navigate(path)}
            onMouseDown={() => setPressedBtn(key)}
            onMouseUp={() => setPressedBtn(null)}
            onTouchStart={() => setPressedBtn(key)}
            onTouchEnd={() => setPressedBtn(null)}
            className={`font-sans rounded-full p-4 text-sm font-semibold min-h-[44px] active:scale-95 transition-all duration-300 ${
              primary
                ? 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                : 'bg-parchment-low dark:bg-dark-surface text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10'
            } ${pressedBtn === key ? 'opacity-80' : ''}`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => navigate(`/study?source=G&ang=${Math.floor(Math.random() * 1430) + 1}`)}
          className="font-sans rounded-full p-4 text-sm font-semibold min-h-[44px] bg-parchment-low dark:bg-dark-surface text-ink dark:text-dark-text border border-sand/15 dark:border-dark-text/10 active:scale-95 transition-all duration-300"
        >
          Random Ang
        </button>
      </div>

      {/* Reading Progress */}
      {progressItems.length > 0 && (
        <div className="mb-6 animate-slide-up stagger-6">
          <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider mb-3">Reading Progress</p>
          <div className="space-y-2">
            {progressItems.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/study?source=${p.source}&ang=${p.startAng}&bani=${encodeURIComponent(p.name)}`)}
                className="w-full bg-parchment-low dark:bg-dark-surface rounded-xl p-3 text-left active:scale-95 transition-transform duration-150"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-sans text-sm text-ink dark:text-dark-text">{p.name}</p>
                  <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{p.pct}%</p>
                </div>
                <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full transition-all duration-500" style={{ width: `${p.pct}%` }} />
                </div>
                <p className="font-sans text-[10px] text-ink/40 dark:text-dark-text/40 mt-1">{p.done} of {p.total} angs read</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recently Studied */}
      {recentlyStudied.length > 0 && (
        <div className="animate-slide-up stagger-7">
          <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider mb-3">Recently Studied</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyStudied.map((entry) => (
              <div
                key={entry.id}
                className="flex-shrink-0 w-48 bg-parchment-card dark:bg-dark-card rounded-xl p-3 cursor-pointer transition-colors duration-300"
                onClick={() => {
                  const parts = entry.id.split('-')
                  if (parts.length >= 2) navigate(`/study?source=${parts[0]}&ang=${parts[1]}`)
                }}
              >
                <p className="font-sans text-saffron dark:text-saffron-light text-[10px] mb-1 uppercase tracking-wide">{entry.scripture}</p>
                <p lang={hindiMode ? 'hi' : 'pa-Guru'} className={`${hindiMode ? 'font-sans' : 'font-gurmukhi'} text-ink dark:text-dark-text text-sm leading-relaxed line-clamp-2`}>
                  {hindiMode ? gurmukhiToHindi(entry.gurmukhi) : entry.gurmukhi}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
