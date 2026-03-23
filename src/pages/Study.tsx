import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ALL_ENTRIES, getEntriesByScripture, SCRIPTURES } from '../data'
import { useProgressStore } from '../store/progress'
import StudyCard from '../components/StudyCard'
import type { ScriptureEntry } from '../types'

export default function Study() {
  const { scriptureId } = useParams()
  const navigate = useNavigate()
  const { studied, reviewQueue, markStudied, addToReview, updateSession, clearSession, recordSwipeToday } = useProgressStore()

  const entries: ScriptureEntry[] = scriptureId
    ? getEntriesByScripture(scriptureId)
    : ALL_ENTRIES

  const studiedIds = new Set(studied.map(s => s.id))
  const unseenEntries = entries.filter(e => !studiedIds.has(e.id) && !reviewQueue.includes(e.id))
  const allUnseen = unseenEntries.length === 0

  const [index, setIndex] = useState(0)

  const displayEntries = allUnseen ? entries : unseenEntries
  const total = displayEntries.length
  const currentEntry = displayEntries[index % Math.max(total, 1)]

  useEffect(() => {
    if (currentEntry && scriptureId) {
      updateSession({ scriptureId, lastCardIndex: index })
    }
  }, [index, scriptureId, currentEntry])

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

  if (entries.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20">
        <p className="text-gray-400">No entries found. <button onClick={() => navigate('/library')} className="text-[#C9A84C]">Browse Library</button></p>
      </div>
    )
  }

  if (!scriptureId) {
    return (
      <div className="p-4 max-w-md mx-auto mt-4">
        <h1 className="text-white font-semibold text-lg mb-4">Choose a Scripture</h1>
        {SCRIPTURES.map(s => (
          <button
            key={s.id}
            onClick={() => navigate(`/study/${s.id}`)}
            className="w-full bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-4 mb-3 text-left min-h-[44px]"
          >
            <p className="text-white font-medium">{s.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">{getEntriesByScripture(s.id).length} passages</p>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto mt-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-sm min-h-[44px] min-w-[44px]">← Back</button>
        <p className="text-gray-500 text-xs">{index + 1} / {total}</p>
      </div>
      <div className="w-full bg-[#2a2a2a] rounded-full h-1 mb-6">
        <div className="bg-[#C9A84C] h-1 rounded-full transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      {allUnseen && (
        <p className="text-gray-500 text-xs text-center mb-3">All caught up! Reviewing from the beginning.</p>
      )}
      <StudyCard
        key={currentEntry.id}
        entry={currentEntry}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
      />
    </div>
  )
}
