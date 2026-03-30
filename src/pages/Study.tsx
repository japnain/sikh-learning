import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SCRIPTURES } from '../data'
import { useProgressStore } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useWordData } from '../hooks/useWordData'
import StudyCard from '../components/StudyCard'
import type { ScriptureEntry } from '../types'
import { useBookmarksStore } from '../store/bookmarks'

function parseShabadId(entryId: string): number | null {
  const parts = entryId.split('-')
  if (parts.length === 3 && (parts[0] === 'G' || parts[0] === 'D')) {
    return Number(parts[2])
  }
  // Note: word popover not supported for sources B, N, A, S, R (deferred)
  return null
}

export default function Study() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const source = (searchParams.get('source') as 'G' | 'D' | 'B' | 'N' | 'A' | 'S' | 'R' | null) ?? null
  const angParam = Number(searchParams.get('ang')) || null

  const { studied, reviewQueue, markStudied, addToReview, updateSession, clearSession, recordSwipeToday } = useProgressStore()

  const { entries: angEntries, loading: angLoading } = useAng(
    angParam ?? 1,
    source ?? 'G'
  )
  const isApiMode = source !== null && angParam !== null

  const entries: ScriptureEntry[] = isApiMode ? angEntries : []

  const studiedIds = new Set(studied.map(s => s.id))
  const unseenEntries = entries.filter(e => !studiedIds.has(e.id) && !reviewQueue.includes(e.id))
  const allUnseen = unseenEntries.length === 0

  const [index, setIndex] = useState(0)

  const { addBookmark, hasBookmark } = useBookmarksStore()
  const [showBookmarkForm, setShowBookmarkForm] = useState(false)
  const [bookmarkText, setBookmarkText] = useState('')

  const isBookmarked = isApiMode && source !== null && angParam !== null
    ? hasBookmark(source, angParam)
    : false

  const handleSaveBookmark = () => {
    if (!source || !angParam || !currentEntry) return
    addBookmark({
      type: 'shabad',
      title: `${currentEntry.scripture} · Ang ${angParam}`,
      source,
      ang: angParam,
      description: bookmarkText || undefined,
    })
    setShowBookmarkForm(false)
    setBookmarkText('')
  }

  const displayEntries = allUnseen ? entries : unseenEntries
  const total = displayEntries.length
  const currentEntry = displayEntries[index % Math.max(total, 1)]

  const currentShabadId = currentEntry ? parseShabadId(currentEntry.id) : null
  const { words: wordData } = useWordData(isApiMode ? currentShabadId : null)

  useEffect(() => {
    if (currentEntry && isApiMode) {
      updateSession({ scriptureId: `${source}-${angParam}`, lastCardIndex: index })
    }
  }, [index, isApiMode, currentEntry])

  const handleSwipeRight = () => {
    markStudied(currentEntry.id)
    recordSwipeToday()
    if (index + 1 >= total) {
      clearSession()
      setIndex(0)
    } else {
      setIndex(i => i + 1)
    }
  }

  const handleSwipeLeft = () => {
    addToReview(currentEntry.id)
    recordSwipeToday()
    const nextIndex = index + 1
    if (nextIndex >= total) {
      setIndex(0)
    } else {
      setIndex(nextIndex)
    }
  }

  // Loading state
  if (isApiMode && angLoading) {
    return (
      <div className="p-4 max-w-md mx-auto mt-4 bg-parchment min-h-screen">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-saffron font-sans text-sm min-h-[44px] min-w-[44px]">← Back</button>
        </div>
        <div className="bg-parchment-low rounded-2xl p-6 min-h-[300px] animate-pulse">
          <div className="h-3 bg-sand/30 rounded w-1/4 mb-4" />
          <div className="h-8 bg-sand/30 rounded w-full mb-3" />
          <div className="h-8 bg-sand/30 rounded w-4/5 mb-3" />
          <div className="h-4 bg-sand/30 rounded w-2/3" />
        </div>
      </div>
    )
  }

  // Scripture picker (no params)
  if (!isApiMode) {
    return (
      <div className="p-4 max-w-md mx-auto mt-4 bg-parchment min-h-screen">
        <h1 className="font-sans font-semibold text-lg text-ink mb-4">Choose a Scripture</h1>
        {SCRIPTURES.map(s => (
          <button
            key={s.id}
            onClick={() => navigate(`/study?source=${s.sourceId}&ang=1`)}
            className="w-full bg-parchment-card rounded-2xl p-4 mb-3 text-left min-h-[44px] border border-sand/15 transition-colors duration-300"
          >
            <p className="font-sans text-ink font-medium">{s.name}</p>
            <p className="font-sans text-ink/50 text-xs mt-0.5">{s.shortName}</p>
          </button>
        ))}
      </div>
    )
  }

  if (isApiMode && entries.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20 bg-parchment min-h-screen">
        <p className="font-sans text-ink/60">No verses found for this ang.</p>
        <button onClick={() => navigate(-1)} className="font-sans text-saffron mt-4 block">← Back</button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto mt-4 bg-parchment min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="font-sans text-saffron text-sm min-h-[44px] min-w-[44px]">← Back</button>
        <p className="font-sans text-ink/50 text-xs">{index + 1} / {total}</p>
        {isApiMode && entries.length > 0 && (
          <button
            onClick={() => { if (!isBookmarked) setShowBookmarkForm(v => !v) }}
            className={`text-xl min-h-[44px] min-w-[44px] transition-colors duration-300 ${isBookmarked ? 'text-saffron' : 'text-ink/30'}`}
          >
            🔖
          </button>
        )}
      </div>

      {isApiMode && entries.length > 0 && showBookmarkForm && (
        <div className="mb-4 bg-parchment-low rounded-xl p-4">
          <input
            type="text"
            value={bookmarkText}
            onChange={e => setBookmarkText(e.target.value)}
            placeholder="Add a note..."
            className="w-full bg-parchment-card border border-sand/15 rounded-xl px-3 py-2 font-sans text-ink text-sm mb-2 outline-none focus:border-saffron/30 transition-colors duration-300"
          />
          <button
            onClick={handleSaveBookmark}
            className="w-full bg-gradient-to-r from-saffron to-saffron-light rounded-xl py-2 text-white font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300"
          >
            Save Bookmark
          </button>
        </div>
      )}

      <div className="w-full bg-sand/30 rounded-full h-1 mb-6">
        <div className="bg-saffron h-1 rounded-full transition-all duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      {allUnseen && (
        <p className="font-sans text-ink/50 text-xs text-center mb-3">All caught up! Reviewing from the beginning.</p>
      )}

      <StudyCard
        key={currentEntry.id}
        entry={currentEntry}
        wordData={wordData}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
      />
    </div>
  )
}
