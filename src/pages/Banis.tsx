import { useState, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BANIS, SGGS_CATEGORY_ORDER, DG_CATEGORY_ORDER, type Bani } from '../data/banis'
import { useBookmarksStore } from '../store/bookmarks'
import { fetchSearch, type SearchResult } from '../api/banidb'
import { NITNEM_BANIS } from '../store/nitnem'
import { IconSearch, IconBookmark, IconBookmarkFilled, IconChevronUp, IconChevronDown, IconLibrary, IconSword } from '../components/icons'

type Scripture = 'SGGS' | 'DG'

const SCRIPTURE_META: Record<Scripture, { label: string; icon: ReactNode }> = {
  SGGS: { label: 'Sri Guru Granth Sahib Ji', icon: <IconLibrary size={18} /> },
  DG: { label: 'Dasam Granth', icon: <IconSword size={18} /> },
}

const CATEGORY_ORDER: Record<Scripture, readonly string[]> = {
  SGGS: SGGS_CATEGORY_ORDER,
  DG: DG_CATEGORY_ORDER,
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

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <span key={i} className="bg-saffron/30 text-saffron dark:text-saffron-light font-semibold rounded-sm px-0.5">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

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
        onClick={() => navigate(`/study?source=${bani.source}&ang=${bani.startAng}&bani=${encodeURIComponent(bani.name)}`)}
        className="flex-1 text-left px-3 py-3 min-h-[52px] active:scale-95 transition-transform duration-150"
      >
        <p className="font-sans text-ink dark:text-dark-text text-sm">{bani.name}</p>
        <p className="font-sans text-gold dark:text-gold-light text-xs mt-0.5">{bani.scripture === 'SGGS' || bani.scripture === 'DG' ? 'Ang' : 'Page'} {bani.startAng}–{bani.endAng}</p>
      </button>
      <button
        onClick={() => {
          if (!isBookmarked) addBookmark({ type: 'bani', title: bani.name, source: bani.source, ang: bani.startAng })
        }}
        className={`pr-4 pl-2 min-h-[52px] flex items-center justify-center font-sans text-base transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isBookmarked ? 'text-saffron dark:text-saffron-light' : 'text-ink/25 dark:text-dark-text/25'}`}
        aria-label={isBookmarked ? 'Bookmarked' : 'Bookmark'}
      >
        {isBookmarked ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
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
      const trimmed = query.trim()
      const isEnglish = /^[a-zA-Z\s.,!?'-]+$/.test(trimmed)
      const results = await fetchSearch(trimmed, isEnglish ? 3 : 1)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const rowProps = { navigate, addBookmark, hasBookmark }

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300 animate-fade-in">
      <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text mb-6 mt-4">Banis</h1>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 dark:text-dark-text/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search Gurbani..."
            className="w-full bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl pl-9 pr-4 py-3 font-sans text-sm text-ink dark:text-dark-text placeholder:text-ink/30 dark:placeholder:text-dark-text/30 outline-none focus:border-saffron/40 transition-colors duration-300"
          />
        </div>
        {searching && <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">Searching...</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1">
            {searchResults.map(r => (
              <button
                key={`${r.shabadId}-${r.verseId}`}
                onClick={() => navigate(`/study?source=${r.source}&ang=${r.pageNo}`)}
                className="w-full text-left bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl px-3 py-3 transition-colors duration-300"
              >
                <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink dark:text-dark-text"><Highlight text={r.gurmukhi} query={searchQuery} /></p>
                <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-0.5"><Highlight text={r.transliteration} query={searchQuery} /></p>
                <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-0.5"><Highlight text={r.translation_en} query={searchQuery} /></p>
                <p className="font-sans text-[10px] text-gold dark:text-gold-light mt-1">Ang {r.pageNo}</p>
              </button>
            ))}
          </div>
        )}
        {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 mt-2 ml-1">No results found</p>
        )}
      </div>

      {/* Sundar Gutka */}
      <div className="mb-4">
        <button
          onClick={() => toggle('sundar-gutka')}
          className="w-full flex justify-between items-center bg-gradient-to-r from-saffron/10 to-saffron-light/10 dark:from-saffron/15 dark:to-saffron-light/15 border border-saffron/20 dark:border-saffron/20 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150"
        >
          <div className="text-left">
            <p className="font-sans font-semibold text-base text-saffron dark:text-saffron-light">ਸੁੰਦਰ ਗੁਟਕਾ · Sundar Gutka</p>
            <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs mt-0.5">Daily Nitnem prayers in prescribed order</p>
          </div>
          <span className="text-saffron dark:text-saffron-light font-sans text-sm">{expanded['sundar-gutka'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
        </button>

        {expanded['sundar-gutka'] && (
          <div className="mt-2 ml-2">
            {NITNEM_BANIS.map(bani => {
              const isBookmarked = hasBookmark(bani.source as Bani['source'], bani.startAng)
              return (
                <div key={bani.id} className="flex items-center bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl mb-1 overflow-hidden transition-colors duration-300">
                  <button
                    onClick={() => navigate(`/study?source=${bani.source}&ang=${bani.startAng}&bani=${encodeURIComponent(bani.name)}`)}
                    className="flex-1 text-left px-3 py-3 min-h-[52px] active:scale-95 transition-transform duration-150"
                  >
                    <p className="font-sans text-ink dark:text-dark-text text-sm">{bani.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-sans text-gold dark:text-gold-light text-xs">Ang {bani.startAng}</p>
                      <span className={`font-sans text-[10px] px-1.5 py-0.5 rounded-full ${
                        bani.time === 'Morning' ? 'bg-saffron/15 text-saffron dark:text-saffron-light' :
                        bani.time === 'Evening' ? 'bg-blue-500/15 text-blue-400' :
                        'bg-purple-500/15 text-purple-400'
                      }`}>{bani.time}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (!isBookmarked) addBookmark({ type: 'bani', title: bani.name, source: bani.source as Bani['source'], ang: bani.startAng })
                    }}
                    className={`pr-4 pl-2 min-h-[52px] flex items-center justify-center font-sans text-base transition-colors duration-300 active:scale-95 transition-transform duration-150 ${isBookmarked ? 'text-saffron dark:text-saffron-light' : 'text-ink/25 dark:text-dark-text/25'}`}
                    aria-label={isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  >
                    {isBookmarked ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SGGS + DG */}
      {(['SGGS', 'DG'] as Scripture[]).map(scripture => {
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
              className={`w-full flex justify-between items-center ${isSSGS ? 'bg-parchment-card dark:bg-dark-card' : 'bg-parchment-low dark:bg-dark-surface'} border border-sand/15 dark:border-dark-text/10 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150`}
            >
              <div className="text-left">
                <p className={`font-sans font-semibold text-base flex items-center gap-1.5 ${isSSGS ? 'text-saffron dark:text-saffron-light' : 'text-ink dark:text-dark-text'}`}>{meta.icon} {meta.label}</p>
                <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs mt-0.5">{baniCount} banis</p>
              </div>
              <span className="text-saffron dark:text-saffron-light font-sans text-sm">{isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
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
                        className="w-full flex justify-between items-center bg-parchment-card dark:bg-dark-card border border-sand/15 dark:border-dark-text/10 rounded-xl p-3 min-h-[44px] transition-colors duration-300 active:scale-95 transition-transform duration-150"
                      >
                        <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wider">{category}</p>
                        <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{isCatOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
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
          className="w-full flex justify-between items-center bg-parchment-low dark:bg-dark-surface border border-sand/15 dark:border-dark-text/10 rounded-2xl p-4 min-h-[44px] transition-colors duration-300 shadow-card active:scale-95 transition-transform duration-150"
        >
          <div className="text-left">
            <p className="font-sans font-semibold text-base text-ink dark:text-dark-text">Amrit Keertan</p>
            <p className="font-sans text-ink/50 dark:text-dark-text/50 text-xs mt-0.5">Popular keertan compositions</p>
          </div>
          <span className="text-saffron dark:text-saffron-light font-sans text-sm">{expanded['ak'] ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
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
