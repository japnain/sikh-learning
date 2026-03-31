import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useProgressStore } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useMultiShabadWordData } from '../hooks/useMultiShabadWordData'
import StudyCard from '../components/StudyCard'
import { useBookmarksStore } from '../store/bookmarks'

type BaniSource = 'G' | 'D' | 'B' | 'N' | 'A' | 'R'

const MAX_ANG: Record<string, number> = {
  G: 1430, D: 1428, B: 628, N: 128, A: 1430, R: 1,
}

function parseShabadId(entryId: string): number | null {
  const parts = entryId.split('-')
  if (parts.length === 3) {
    const id = Number(parts[2])
    return Number.isFinite(id) ? id : null
  }
  return null
}

export default function Study() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { scriptureId } = useParams<{ scriptureId: string }>()

  let source = searchParams.get('source') as BaniSource | null
  let angParam = Number(searchParams.get('ang')) || null

  if ((!source || !angParam) && scriptureId) {
    const parts = scriptureId.split('-')
    if (parts.length >= 2) {
      source = parts[0] as BaniSource
      angParam = Number(parts[1]) || null
    }
  }

  const isApiMode = source !== null && angParam !== null

  useEffect(() => {
    if (!isApiMode) navigate('/library', { replace: true })
  }, [isApiMode, navigate])

  const { entries, loading, error } = useAng(
    isApiMode ? angParam! : 1,
    isApiMode ? source! : 'G'
  )

  const { updateSession } = useProgressStore()

  useEffect(() => {
    if (isApiMode && source && angParam) {
      updateSession({ scriptureId: `${source}-${angParam}`, lastCardIndex: 0 })
    }
  }, [source, angParam, isApiMode, updateSession])

  const { addBookmark, hasBookmark } = useBookmarksStore()
  const [showBookmarkForm, setShowBookmarkForm] = useState(false)
  const [bookmarkText, setBookmarkText] = useState('')

  const currentEntry = entries[0] ?? null
  const shabadIds = useMemo(
    () => entries.map(e => parseShabadId(e.id)),
    [entries]
  )
  const { wordDataMap } = useMultiShabadWordData(isApiMode ? shabadIds : [])

  const isBookmarked = isApiMode && source && angParam
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

  const maxAng = source ? (MAX_ANG[source] ?? 1) : 1

  if (!isApiMode) return null

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto mt-4 bg-parchment dark:bg-dark-bg min-h-screen transition-colors duration-300">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px]">&#8592; Back</button>
        </div>
        <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-6 min-h-[300px] animate-pulse">
          <div className="h-3 bg-sand/30 dark:bg-dark-text/10 rounded w-1/4 mb-4" />
          <div className="h-8 bg-sand/30 dark:bg-dark-text/10 rounded w-full mb-3" />
          <div className="h-8 bg-sand/30 dark:bg-dark-text/10 rounded w-4/5 mb-3" />
          <div className="h-4 bg-sand/30 dark:bg-dark-text/10 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (source === 'R' || error || entries.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20 bg-parchment dark:bg-dark-bg min-h-screen transition-colors duration-300">
        <p className="font-sans text-ink/60 dark:text-dark-text/60 mb-2">
          {source === 'R'
            ? 'Panthic Sources are not organised by ang in this app.'
            : 'No verses found for this ang.'}
        </p>
        <button onClick={() => navigate(-1)} className="font-sans text-saffron dark:text-saffron-light mt-4 block mx-auto">&#8592; Back</button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto mt-4 bg-parchment dark:bg-dark-bg min-h-screen transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="font-sans text-saffron dark:text-saffron-light text-sm min-h-[44px] min-w-[44px]">&#8592; Back</button>
        <button
          onClick={() => { if (!isBookmarked) setShowBookmarkForm(v => !v) }}
          className={`text-xl min-h-[44px] min-w-[44px] transition-colors duration-300 ${isBookmarked ? 'text-saffron dark:text-saffron-light' : 'text-ink/30 dark:text-dark-text/30'}`}
        >
          &#128278;
        </button>
      </div>

      {showBookmarkForm && (
        <div className="mb-4 bg-parchment-low dark:bg-dark-surface rounded-xl p-4 transition-colors duration-300">
          <input
            type="text"
            value={bookmarkText}
            onChange={e => setBookmarkText(e.target.value)}
            placeholder="Add a note..."
            className="w-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-2 font-sans text-ink dark:text-dark-text text-sm mb-2 outline-none focus:border-saffron/30 transition-colors duration-300"
          />
          <button
            onClick={handleSaveBookmark}
            className="w-full bg-gradient-to-r from-saffron to-saffron-light rounded-xl py-2 text-white font-sans font-semibold text-sm min-h-[44px] transition-colors duration-300"
          >
            Save Bookmark
          </button>
        </div>
      )}

      <div className="space-y-4">
        {entries.map(entry => {
          const shabadId = parseShabadId(entry.id)
          return (
            <StudyCard
              key={entry.id}
              entry={entry}
              wordData={shabadId ? wordDataMap[shabadId] ?? null : null}
            />
          )
        })}
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-sand/15 dark:border-dark-text/10">
        <button
          onClick={() => setSearchParams({ source: source!, ang: String(angParam! - 1) })}
          disabled={angParam! <= 1}
          className="flex-1 py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface text-ink/70 dark:text-dark-text/70 font-sans text-sm font-medium min-h-[44px] disabled:opacity-30 transition-colors duration-300"
        >&#8592; Ang {angParam! - 1}</button>
        <button
          onClick={() => setSearchParams({ source: source!, ang: String(angParam! + 1) })}
          disabled={angParam! >= maxAng}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30 transition-colors duration-300"
        >Ang {angParam! + 1} &#8594;</button>
      </div>
    </div>
  )
}
