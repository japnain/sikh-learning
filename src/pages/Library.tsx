import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { SGGS_ANG_COUNT, DG_ANG_COUNT } from '../utils/dailyPick'

const SOURCE_SHORT_NAME: Record<string, string> = {
  G: 'SGGS', D: 'DG', B: 'BGV', N: 'BNL', A: 'AK', S: 'BGSV', R: 'PS',
}

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
            className="bg-parchment-card rounded-lg py-2 font-sans text-sm text-ink hover:text-saffron border border-sand/15 transition-colors duration-300 min-h-[44px]"
          >
            {ang}
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="font-sans text-saffron text-sm disabled:opacity-30 min-h-[44px] px-3"
        >← Prev</button>
        <span className="font-sans text-ink/50 text-xs">Ang {start}–{end} of {totalAngs}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={end >= totalAngs}
          className="font-sans text-saffron text-sm disabled:opacity-30 min-h-[44px] px-3"
        >Next →</button>
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
  { id: 'bhai-nand-lal-vaaran', name: 'Bhai Nand Lal Ji Vaaran', source: 'N', totalAngs: 128 },
  { id: 'amrit-keertan', name: 'Amrit Keertan', source: 'A', totalAngs: 1430 },
  { id: 'panthic-sources', name: 'Panthic Sources & Codes of Conduct', source: 'R', totalAngs: 0, browseOnly: true },
]

export default function Library() {
  const navigate = useNavigate()
  const { bookmarks, removeBookmark } = useBookmarksStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    bookmarks: bookmarks.length > 0,
  }))

  const toggle = (id: string) => setExpanded(c => ({ ...c, [id]: !c[id] }))

  return (
    <div className="p-4 max-w-md mx-auto mt-4 bg-parchment min-h-screen">
      <h1 className="font-sans font-semibold text-lg text-ink mb-6">Library</h1>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => toggle('bookmarks')}
            className="w-full flex justify-between items-center bg-parchment-card rounded-2xl p-4 min-h-[44px] border border-sand/15"
          >
            <div className="text-left">
              <p className="font-sans font-semibold text-ink">🔖 Bookmarks</p>
              <p className="font-sans text-ink/50 text-xs">{bookmarks.length} saved</p>
            </div>
            <span className="font-sans text-saffron text-sm">{expanded['bookmarks'] ? '▲' : '▼'}</span>
          </button>
          {expanded['bookmarks'] && (
            <div className="mt-2 ml-2 flex flex-col gap-2">
              {bookmarks.map((bookmark: Bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-parchment-low rounded-xl p-3 relative"
                >
                  <button
                    onClick={() => removeBookmark(bookmark.id)}
                    className="absolute top-2 right-2 font-sans text-ink/40 text-xs min-h-[24px] min-w-[24px] flex items-center justify-center"
                    aria-label="Remove bookmark"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => navigate(`/study?source=${bookmark.source}&ang=${bookmark.ang}`)}
                    className="text-left w-full pr-6"
                  >
                    <p className="font-sans font-semibold text-sm text-ink">{bookmark.title}</p>
                    {bookmark.description && (
                      <p className="font-sans text-xs text-ink/60 italic mt-0.5">{bookmark.description}</p>
                    )}
                    <p className="font-sans text-[10px] text-saffron mt-1">
                      {SOURCE_SHORT_NAME[bookmark.source] ?? bookmark.source} · Ang {bookmark.ang}
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
        const isLarge = i === 0 // SGGS gets largest heading

        return (
          <div key={section.id} className="mb-4">
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex justify-between items-center bg-parchment-low rounded-2xl p-4 min-h-[44px]"
            >
              <p className={`font-sans font-semibold text-ink uppercase tracking-wider ${isLarge ? 'text-base' : 'text-xs'}`}>
                {section.name}
              </p>
              <span className="font-sans text-saffron text-sm">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="mt-2 ml-2 p-3 bg-parchment-low rounded-2xl">
                {section.browseOnly ? (
                  <button
                    onClick={() => navigate(`/study?source=${section.source}&ang=1`)}
                    className="w-full bg-parchment-card rounded-lg font-sans text-sm text-saffron py-3 min-h-[44px] border border-sand/15 transition-colors duration-300"
                  >
                    Browse →
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
