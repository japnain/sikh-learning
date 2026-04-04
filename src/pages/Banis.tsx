import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BANIS, SGGS_CATEGORY_ORDER, DG_CATEGORY_ORDER, BNL_CATEGORY_ORDER, type Bani } from '../data/banis'
import { useBookmarksStore } from '../store/bookmarks'
import { fetchSearch, type SearchResult } from '../api/banidb'

type Scripture = 'SGGS' | 'DG' | 'BNL'

const SCRIPTURE_META: Record<Scripture, { label: string; emoji: string }> = {
  SGGS: { label: 'Sri Guru Granth Sahib Ji', emoji: '📖' },
  DG: { label: 'Dasam Granth', emoji: '⚔️' },
  BNL: { label: 'Bhai Nand Lal Ji', emoji: '🪶' },
}

const CATEGORY_ORDER: Record<Scripture, readonly string[]> = {
  SGGS: SGGS_CATEGORY_ORDER,
  DG: DG_CATEGORY_ORDER,
  BNL: BNL_CATEGORY_ORDER,
}

const AK_BANI_IDS = [
  'japji-sahib', 'anand-sahib', 'rehras-sahib', 'kirtan-sohila',
  'asa-di-var', 'sukhmani-sahib', 'sidh-gosht', 'barah-maha-majh',
  'laavan', 'jaap-sahib', 'tav-prasad-savaiye', 'chaupai-sahib',
  'onkar', 'aarti', 'salok-mahalla-9', 'shabad-hazare',
  'dukh-bhanjani', 'shabad-hazare-10', 'chandi-di-var', 'var-majh',
  'salok-farid', 'salok-kabir', 'patti', 'mundavani', 'ragmala',
  'barah-maha-tukhari', 'ghorian', 'ramkali-sadd',
]
const AK_BANIS = BANIS.filter(b => AK_BANI_IDS.includes(b.id))

function BaniRow({ bani, navigate, addBookmark, hasBookmark }: {
  bani: Bani
  navigate: (path: string) => void
  addBookmark: (b: { type: 'bani'; title: string; source: Bani['source']; ang: number }) => void
  hasBookmark: (source: Bani['source'], ang: number) => boolean
}) {
  const isBookmarked = hasBookmark(bani.source, bani.startAng)
  return (
    <div className="flex items-center bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl mb-1 overflow-hidden transition-colors duration-300">
      <button
        onClick={() => navigate(`/study?source=${bani.source}&ang=${bani.startAng}`)}
        className="flex-1 text-left px-3 py-3 min-h-[52px]"
      >
        <p className="font-sans text-ink dark:text-dark-text text-sm">{bani.name}</p>
        <p className="font-sans text-saffron dark:text-saffron-light text-xs mt-0.5">{bani.scripture === 'SGGS' || bani.scripture === 'DG' ? 'Ang' : 'Page'} {bani.startAng}–{bani.endAng}</p>
      </button>
      <button
        onClick={() => {
          if (!isBookmarked) addBookmark({ type: 'bani', title: bani.name, source: bani.source, ang: bani.startAng })
        }}
        className={`pr-4 pl-2 min-h-[52px] flex items-center justify-center font-sans text-base transition-colors duration-300 ${isBookmarked ? 'text-saffron dark:text-saffron-light' : 'text-ink/25 dark:text-dark-text/25'}`}
        aria-label={isBookmarked ? 'Bookmarked' : 'Bookmark'}
      >
        🔖
      </button>
    </div>
  )
}

export default function Banis() {
  const navigate = useNavigate()
  const { addBookmark, hasBookmark } = useBookmarksStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const results = await fetchSearch(query.trim())
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const rowProps = { navigate, addBookmark, hasBookmark }

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300">
      <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text mb-6 mt-4">Banis</h1>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search Gurbani..."
          className="w-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-4 py-3 font-sans text-sm text-ink dark:text-dark-text placeholder:text-ink/30 dark:placeholder:text-dark-text/30 outline-none focus:border-saffron/40 transition-colors duration-300"
        />
        {searching && <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">Searching...</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1">
            {searchResults.map(r => (
              <button
                key={`${r.shabadId}-${r.verseId}`}
                onClick={() => navigate(`/study?source=${r.source}&ang=${r.pageNo}`)}
                className="w-full text-left bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 transition-colors duration-300"
              >
                <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink dark:text-dark-text">{r.gurmukhi}</p>
                <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5">{r.transliteration}</p>
                <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-0.5">{r.translation_en}</p>
                <p className="font-sans text-[10px] text-saffron dark:text-saffron-light mt-1">Ang {r.pageNo}</p>
              </button>
            ))}
          </div>
        )}
        {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">No results found</p>
        )}
      </div>

      {/* SGGS + DG + BNL */}
      {(['SGGS', 'DG', 'BNL'] as Scripture[]).map(scripture => {
        const meta = SCRIPTURE_META[scripture]
        const sectionKey = scripture.toLowerCase()
        const isOpen = expanded[sectionKey]
        const categories = CATEGORY_ORDER[scripture]
        const baniCount = BANIS.filter(b => b.scripture === scripture).length
        const isSSGS = scripture === 'SGGS'

        return (
          <div key={scripture} className="mb-4">
            <button
              onClick={() => toggle(sectionKey)}
              className={`w-full flex justify-between items-center ${isSSGS ? 'bg-parchment-card dark:bg-dark-card' : 'bg-parchment-low dark:bg-dark-surface'} border border-sand/15 dark:border-dark-text/10 rounded-2xl p-4 min-h-[44px] transition-colors duration-300`}
            >
              <div className="text-left">
                <p className={`font-sans font-semibold text-base ${isSSGS ? 'text-saffron dark:text-saffron-light' : 'text-ink dark:text-dark-text'}`}>{meta.emoji} {meta.label}</p>
                <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs mt-0.5">{baniCount} banis</p>
              </div>
              <span className="text-saffron dark:text-saffron-light font-sans text-sm">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="mt-2 ml-2">
                {categories.map(category => {
                  const categoryKey = `${sectionKey}-${category}`
                  const isCatOpen = expanded[categoryKey]
                  const banis = BANIS.filter(b => b.scripture === scripture && b.category === category)
                  if (banis.length === 0) return null

                  return (
                    <div key={category} className="mb-2">
                      <button
                        onClick={() => toggle(categoryKey)}
                        className="w-full flex justify-between items-center bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl p-3 min-h-[44px] transition-colors duration-300"
                      >
                        <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider">{category}</p>
                        <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{isCatOpen ? '▲' : '▼'}</span>
                      </button>

                      {isCatOpen && (
                        <div className="mt-1 ml-2">
                          {banis.map(bani => (
                            <BaniRow key={bani.id} bani={bani} {...rowProps} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Amrit Keertan */}
      <div className="mb-4">
        <button
          onClick={() => toggle('ak')}
          className="w-full flex justify-between items-center bg-parchment-low dark:bg-dark-surface border border-sand/15 dark:border-dark-text/10 rounded-2xl p-4 min-h-[44px] transition-colors duration-300"
        >
          <div className="text-left">
            <p className="font-sans font-semibold text-base text-ink dark:text-dark-text">Amrit Keertan</p>
            <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs mt-0.5">Popular keertan compositions</p>
          </div>
          <span className="text-saffron dark:text-saffron-light font-sans text-sm">{expanded['ak'] ? '▲' : '▼'}</span>
        </button>

        {expanded['ak'] && (
          <div className="mt-2 ml-2">
            {AK_BANIS.map(bani => (
              <BaniRow key={bani.id} bani={bani} {...rowProps} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
