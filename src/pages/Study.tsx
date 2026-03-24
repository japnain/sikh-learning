import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ALL_ENTRIES, SCRIPTURES } from '../data'
import { useProgressStore } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useWordData } from '../hooks/useWordData'
import StudyCard from '../components/StudyCard'
import type { ScriptureEntry } from '../types'

function parseShabadId(entryId: string): number | null {
  const parts = entryId.split('-')
  if (parts.length === 3 && (parts[0] === 'G' || parts[0] === 'D')) {
    return Number(parts[2])
  }
  return null
}

export default function Study() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const source = (searchParams.get('source') as 'G' | 'D' | null) ?? null
  const angParam = Number(searchParams.get('ang')) || null

  const { studied, reviewQueue, markStudied, addToReview, updateSession, clearSession, recordSwipeToday } = useProgressStore()

  // API mode: source+ang URL params present
  const { entries: angEntries, loading: angLoading } = useAng(
    angParam ?? 1,
    source ?? 'G'
  )
  const isApiMode = source !== null && angParam !== null

  // Static mode: Sarbloh + custom texts
  const staticEntries: ScriptureEntry[] = ALL_ENTRIES

  const entries: ScriptureEntry[] = isApiMode ? angEntries : staticEntries

  const studiedIds = new Set(studied.map(s => s.id))
  const unseenEntries = entries.filter(e => !studiedIds.has(e.id) && !reviewQueue.includes(e.id))
  const allUnseen = unseenEntries.length === 0

  const [index, setIndex] = useState(0)

  const displayEntries = allUnseen ? entries : unseenEntries
  const total = displayEntries.length
  const currentEntry = displayEntries[index % Math.max(total, 1)]

  // Lazy word data for API entries
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

  // Loading state for API mode
  if (isApiMode && angLoading) {
    return (
      <div className="p-4 max-w-md mx-auto mt-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-sm min-h-[44px] min-w-[44px]">← Back</button>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl p-6 min-h-[300px] animate-pulse border border-[#2a2a2a]">
          <div className="h-3 bg-[#2a2a2a] rounded w-1/4 mb-4" />
          <div className="h-8 bg-[#2a2a2a] rounded w-full mb-3" />
          <div className="h-8 bg-[#2a2a2a] rounded w-4/5 mb-3" />
          <div className="h-4 bg-[#2a2a2a] rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (!isApiMode && entries.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20">
        <p className="text-gray-400">No entries found. <button onClick={() => navigate('/library')} className="text-[#C9A84C]">Browse Library</button></p>
      </div>
    )
  }

  // No source/ang params — show scripture picker
  if (!isApiMode) {
    return (
      <div className="p-4 max-w-md mx-auto mt-4">
        <h1 className="text-white font-semibold text-lg mb-4">Choose a Scripture</h1>
        {SCRIPTURES.map(s => (
          <button
            key={s.id}
            onClick={() => {
              if (s.shortName === 'SGGS') navigate('/study?source=G&ang=1')
              else if (s.shortName === 'DG') navigate('/study?source=D&ang=1')
              else navigate('/library')
            }}
            className="w-full bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-4 mb-3 text-left min-h-[44px]"
          >
            <p className="text-white font-medium">{s.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.shortName}</p>
          </button>
        ))}
      </div>
    )
  }

  if (isApiMode && entries.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20">
        <p className="text-gray-400">No verses found for this ang.</p>
        <button onClick={() => navigate(-1)} className="text-[#C9A84C] mt-4 block">← Back</button>
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
        wordData={wordData}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
      />
    </div>
  )
}
