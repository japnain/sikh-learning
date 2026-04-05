import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { useVocabStore } from '../store/vocab'
import { SGGS_ANG_COUNT, DG_ANG_COUNT } from '../utils/dailyPick'
import { IconLibrary, IconBookmarkFilled, IconChevronUp, IconChevronDown, IconClose, IconArrowRight, IconArrowLeft } from '../components/icons'

const SOURCE_SHORT_NAME: Record<string, string> = {
  G: 'SGGS', D: 'DG', B: 'BGV', A: 'AK',
}

const angLabel = (source: string) => source === 'G' || source === 'D' ? 'Ang' : 'Page'

function AngBrowser({ source, totalAngs }: { source: string; totalAngs: number }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50
  const start = page * PAGE_SIZE + 1
  const end = Math.min(start + PAGE_SIZE - 1, totalAngs)

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(ang => (
          <button
            key={ang}
            onClick={() => navigate(`/study?source=${source}&ang=${ang}`)}
            className="bg-parchment-card dark:bg-dark-card rounded-lg py-2 font-sans text-sm text-ink dark:text-dark-text hover:text-gold dark:hover:text-gold-light border border-sand/15 dark:border-dark-text/10 transition-all duration-300 min-h-[44px] active:scale-95"
          >
            {ang}
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="font-sans text-gold dark:text-gold-light text-sm disabled:opacity-30 min-h-[44px] px-3 flex items-center gap-1 active:scale-95 transition-transform duration-150"
        ><IconArrowLeft size={14} /> Prev</button>
        <span className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">{angLabel(source)} {start}–{end} of {totalAngs}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={end >= totalAngs}
          className="font-sans text-gold dark:text-gold-light text-sm disabled:opacity-30 min-h-[44px] px-3 flex items-center gap-1 active:scale-95 transition-transform duration-150"
        >Next <IconArrowRight size={14} /></button>
      </div>
    </div>
  )
}

interface Section {
  id: string
  name: string
  source: string
  totalAngs: number
  browseOnly?: boolean
}

const SECTIONS: Section[] = [
  { id: 'sggs', name: 'Sri Guru Granth Sahib Ji', source: 'G', totalAngs: SGGS_ANG_COUNT },
  { id: 'dasam-granth', name: 'Dasam Granth', source: 'D', totalAngs: DG_ANG_COUNT },
  { id: 'bhai-gurdas-vaaran', name: 'Bhai Gurdas Ji Vaaran', source: 'B', totalAngs: 628 },
  { id: 'amrit-keertan', name: 'Amrit Keertan', source: 'A', totalAngs: 1430 },
]

export default function Library() {
  const navigate = useNavigate()
  const { bookmarks, removeBookmark } = useBookmarksStore()
  const { vocab } = useVocabStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    bookmarks: bookmarks.length > 0,
  }))

  const toggle = (id: string) => setExpanded(c => ({ ...c, [id]: !c[id] }))

  return (
    <div className="p-4 max-w-md mx-auto mt-4 bg-parchment dark:bg-dark-bg min-h-screen transition-colors duration-300 animate-fade-in">
      <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text mb-6">Library</h1>

      {/* My Vocabulary */}
      <div className="mb-4 animate-slide-up stagger-1">
        <button
          onClick={() => navigate('/vocab')}
          className="w-full flex justify-between items-center bg-parchment-card dark:bg-dark-card rounded-2xl p-4 min-h-[44px] border border-sand/15 dark:border-gold/10 shadow-card dark:shadow-gold transition-all duration-300 active:scale-[0.98]"
        >
          <div className="text-left flex items-center gap-3">
            <IconLibrary size={20} className="text-gold dark:text-gold-light" />
            <div>
              <p className="font-sans font-semibold text-ink dark:text-dark-text">My Vocabulary</p>
              <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">
                {vocab.length === 0 ? 'No words saved yet' : `${vocab.length} word${vocab.length === 1 ? '' : 's'} saved`}
              </p>
            </div>
          </div>
          <IconArrowRight size={16} className="text-gold dark:text-gold-light" />
        </button>
      </div>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div className="mb-4 animate-slide-up stagger-2">
          <button
            onClick={() => toggle('bookmarks')}
            className="w-full flex justify-between items-center bg-parchment-card dark:bg-dark-card rounded-2xl p-4 min-h-[44px] border border-sand/15 dark:border-gold/10 shadow-card transition-colors duration-300 active:scale-[0.98]"
          >
            <div className="text-left flex items-center gap-3">
              <IconBookmarkFilled size={20} className="text-gold dark:text-gold-light" />
              <div>
                <p className="font-sans font-semibold text-ink dark:text-dark-text">Bookmarks</p>
                <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs">{bookmarks.length} saved</p>
              </div>
            </div>
            <span className="text-gold dark:text-gold-light">{expanded['bookmarks'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
          </button>
          {expanded['bookmarks'] && (
            <div className="mt-2 ml-2 flex flex-col gap-2">
              {bookmarks.map((bookmark: Bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-parchment-low dark:bg-dark-surface rounded-xl p-3 relative transition-colors duration-300 animate-scale-in"
                >
                  <button
                    onClick={() => removeBookmark(bookmark.id)}
                    className="absolute top-2 right-2 text-ink/40 dark:text-dark-text/40 min-h-[24px] min-w-[24px] flex items-center justify-center active:scale-90 transition-transform duration-150"
                    aria-label="Remove bookmark"
                  >
                    <IconClose size={14} />
                  </button>
                  <button
                    onClick={() => navigate(`/study?source=${bookmark.source}&ang=${bookmark.ang}`)}
                    className="text-left w-full pr-6"
                  >
                    <p className="font-sans font-semibold text-sm text-ink dark:text-dark-text">{bookmark.title}</p>
                    {bookmark.description && (
                      <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60 italic mt-0.5">{bookmark.description}</p>
                    )}
                    <p className="font-sans text-[10px] text-gold dark:text-gold-light mt-1">
                      {SOURCE_SHORT_NAME[bookmark.source] ?? bookmark.source} · {angLabel(bookmark.source)} {bookmark.ang}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scripture Sections */}
      {SECTIONS.map((section, i) => {
        const isOpen = expanded[section.id]
        const isLarge = i === 0

        return (
          <div key={section.id} className={`mb-4 animate-slide-up stagger-${Math.min(i + 3, 8)}`}>
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex justify-between items-center bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-[0.98]"
            >
              <p className={`font-sans font-semibold text-ink dark:text-dark-text uppercase tracking-wider ${isLarge ? 'text-base' : 'text-xs'}`}>
                {section.name}
              </p>
              <span className="text-gold dark:text-gold-light">{isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
            </button>
            {isOpen && (
              <div className="mt-2 ml-2 p-3 bg-parchment-low dark:bg-dark-surface rounded-2xl transition-colors duration-300 animate-scale-in">
                {section.browseOnly ? (
                  <button
                    onClick={() => navigate(`/study?source=${section.source}&ang=1`)}
                    className="w-full bg-parchment-card dark:bg-dark-card rounded-lg font-sans text-sm text-gold dark:text-gold-light py-3 min-h-[44px] border border-sand/15 dark:border-dark-text/10 transition-colors duration-300 active:scale-95"
                  >
                    Browse
                  </button>
                ) : (
                  <AngBrowser source={section.source} totalAngs={section.totalAngs} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
