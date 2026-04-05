import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useProgressStore } from '../store/progress'
import { useAng } from '../hooks/useAng'
import { useBani } from '../hooks/useBani'
import { useMultiShabadWordData } from '../hooks/useMultiShabadWordData'
import StudyCard from '../components/StudyCard'
import { useBookmarksStore } from '../store/bookmarks'
import { useReadingProgressStore } from '../store/readingProgress'
import { IconArrowLeft, IconShare, IconBookmark, IconBookmarkFilled } from '../components/icons'

type BaniSource = 'G' | 'D' | 'B' | 'A'

const MAX_ANG: Record<string, number> = {
  G: 1430, D: 1428, B: 628, A: 1430,
}

function parseShabadId(entryId: string): number | null {
  // Supports both "G-8-123" and "bani-1-8" formats
  const parts = entryId.split('-')
  if (parts.length === 3 && parts[0] !== 'bani') {
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
  const baniName = searchParams.get('bani')
  const baniDbId = Number(searchParams.get('baniId')) || null

  if ((!source || !angParam) && scriptureId) {
    const parts = scriptureId.split('-')
    if (parts.length >= 2) {
      source = parts[0] as BaniSource
      angParam = Number(parts[1]) || null
    }
  }

  // Bani mode: fetch specific bani content from /banis/{id}
  const isBaniMode = baniDbId !== null
  const isAngMode = source !== null && angParam !== null
  const isApiMode = isBaniMode || isAngMode

  useEffect(() => {
    if (!isApiMode) navigate('/library', { replace: true })
  }, [isApiMode, navigate])

  // Ang-based fetching (fallback)
  const angResult = useAng(
    isAngMode && !isBaniMode ? angParam! : 1,
    isAngMode ? source! : 'G'
  )

  // Bani-based fetching
  const baniResult = useBani(isBaniMode ? baniDbId : null)

  const entries = isBaniMode ? baniResult.entries : angResult.entries
  const loading = isBaniMode ? baniResult.loading : angResult.loading
  const error = isBaniMode ? baniResult.error : angResult.error

  // For bani mode, track which ang page we're viewing
  const [baniPageIndex, setBaniPageIndex] = useState(0)
  useEffect(() => { setBaniPageIndex(0) }, [baniDbId])

  // In bani mode, show one ang at a time; in ang mode show all entries
  const visibleEntries = isBaniMode && entries.length > 0
    ? [entries[Math.min(baniPageIndex, entries.length - 1)]]
    : entries

  const { updateSession } = useProgressStore()

  useEffect(() => {
    if (isAngMode && source && angParam) {
      updateSession({ scriptureId: `${source}-${angParam}`, lastCardIndex: 0 })
    }
  }, [source, angParam, isAngMode, updateSession])

  const { addBookmark, hasBookmark } = useBookmarksStore()
  const { recordAng } = useReadingProgressStore()
  const [showBookmarkForm, setShowBookmarkForm] = useState(false)
  const [bookmarkText, setBookmarkText] = useState('')
  const [showCopied, setShowCopied] = useState(false)

  useEffect(() => {
    if (isAngMode && source && angParam) {
      recordAng(source, angParam)
    }
  }, [source, angParam, isAngMode, recordAng])

  // Record progress for bani mode too
  useEffect(() => {
    if (isBaniMode && visibleEntries.length > 0) {
      const entry = visibleEntries[0]
      const srcMap: Record<string, BaniSource> = { SGGS: 'G', DG: 'D', BGV: 'B', AK: 'A' }
      const src = srcMap[entry.scripture] ?? 'G'
      recordAng(src, entry.ang)
    }
  }, [isBaniMode, baniPageIndex, visibleEntries])

  const handleShare = async () => {
    if (!currentEntry) return
    const text = [
      currentEntry.gurmukhi,
      currentEntry.transliteration,
      currentEntry.translation_en,
      baniName ? `— ${baniName} · Ang ${currentEntry.ang}` : `— ${currentEntry.scripture} · Ang ${currentEntry.ang}`,
      'via Nitnem App',
    ].join('\n')
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* user dismissed */ }
    } else {
      await navigator.clipboard.writeText(text)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const currentEntry = visibleEntries[0] ?? null
  const shabadIds = useMemo(
    () => visibleEntries.map(e => parseShabadId(e.id)),
    [visibleEntries]
  )
  const { wordDataMap } = useMultiShabadWordData(isApiMode ? shabadIds : [])

  const currentAng = currentEntry?.ang ?? angParam
  const currentSource = source ?? (currentEntry ? (
    currentEntry.scripture === 'SGGS' ? 'G' : currentEntry.scripture === 'DG' ? 'D' : 'G'
  ) as BaniSource : 'G')

  const isBookmarked = currentAng
    ? hasBookmark(currentSource, currentAng)
    : false

  const handleSaveBookmark = () => {
    if (!currentEntry || !currentAng) return
    addBookmark({
      type: 'shabad',
      title: baniName
        ? `${baniName} · Ang ${currentAng}`
        : `${currentEntry.scripture} · Ang ${currentAng}`,
      source: currentSource,
      ang: currentAng,
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
          <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px] flex items-center gap-1 active:scale-95 transition-transform duration-150"><IconArrowLeft size={18} /> Back</button>
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

  if (error || entries.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20 bg-parchment dark:bg-dark-bg min-h-screen transition-colors duration-300">
        <p className="font-sans text-ink/60 dark:text-dark-text/60 mb-2">
          No verses found{baniName ? ` for ${baniName}` : ''}.
        </p>
        <button onClick={() => navigate(-1)} className="font-sans text-saffron dark:text-saffron-light mt-4 flex items-center gap-1 mx-auto active:scale-95 transition-transform duration-150"><IconArrowLeft size={18} /> Back</button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-md mx-auto mt-4 bg-parchment dark:bg-dark-bg min-h-screen transition-colors duration-300 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="font-sans text-saffron dark:text-saffron-light text-sm min-h-[44px] min-w-[44px] flex items-center gap-1 active:scale-95 transition-transform duration-150"><IconArrowLeft size={18} /> Back</button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="text-xl min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/30 dark:text-dark-text/30 transition-colors duration-300 active:scale-95 transition-transform duration-150"
            aria-label="Share"
          >
            {showCopied ? <span className="font-sans text-xs text-saffron dark:text-saffron-light">Copied!</span> : <IconShare size={20} />}
          </button>
          <button
            onClick={() => { if (!isBookmarked) setShowBookmarkForm(v => !v) }}
            aria-label="Bookmark"
            className={`text-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isBookmarked ? 'text-saffron dark:text-saffron-light' : 'text-ink/30 dark:text-dark-text/30'}`}
          >
            {isBookmarked ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
          </button>
        </div>
      </div>

      {showBookmarkForm && (
        <div className="mb-4 bg-parchment-low dark:bg-dark-surface rounded-xl p-4 transition-colors duration-300 shadow-card dark:shadow-gold">
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

      {baniName && (
        <div className="bg-gradient-to-r from-saffron/10 to-saffron-light/10 dark:from-gold/10 dark:to-gold-light/10 rounded-xl p-3 mb-4 border border-saffron/20 dark:border-gold/20">
          <p className="font-sans font-semibold text-saffron dark:text-gold-light text-sm">{baniName}</p>
          {isBaniMode && entries.length > 1 && (
            <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">Page {baniPageIndex + 1} of {entries.length}</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {visibleEntries.map(entry => {
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

      {/* Navigation */}
      {isBaniMode ? (
        <div className="flex gap-3 mt-4 pt-4 border-t border-sand/15 dark:border-dark-text/10">
          <button
            onClick={() => setBaniPageIndex(i => i - 1)}
            disabled={baniPageIndex <= 0}
            className="flex-1 py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface text-ink/70 dark:text-dark-text/70 font-sans text-sm font-medium min-h-[44px] disabled:opacity-30 transition-colors duration-300 border border-gold/20 dark:border-gold/15"
          >&#8592; Previous</button>
          <button
            onClick={() => setBaniPageIndex(i => i + 1)}
            disabled={baniPageIndex >= entries.length - 1}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30 transition-colors duration-300 border border-gold/20 dark:border-gold/15"
          >Next &#8594;</button>
        </div>
      ) : (
        <div className="flex gap-3 mt-4 pt-4 border-t border-sand/15 dark:border-dark-text/10">
          <button
            onClick={() => setSearchParams({ source: source!, ang: String(angParam! - 1) })}
            disabled={angParam! <= 1}
            className="flex-1 py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface text-ink/70 dark:text-dark-text/70 font-sans text-sm font-medium min-h-[44px] disabled:opacity-30 transition-colors duration-300 border border-gold/20 dark:border-gold/15"
          >&#8592; Ang {angParam! - 1}</button>
          <button
            onClick={() => setSearchParams({ source: source!, ang: String(angParam! + 1) })}
            disabled={angParam! >= maxAng}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30 transition-colors duration-300 border border-gold/20 dark:border-gold/15"
          >Ang {angParam! + 1} &#8594;</button>
        </div>
      )}
    </div>
  )
}
