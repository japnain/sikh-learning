import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BANIS, SGGS_CATEGORY_ORDER, DG_CATEGORY_ORDER, type Bani } from '../data/banis'
import { useBookmarksStore } from '../store/bookmarks'

type Scripture = 'SGGS' | 'DG'

const SCRIPTURE_META: Record<Scripture, { label: string; emoji: string }> = {
  SGGS: { label: 'Sri Guru Granth Sahib Ji', emoji: '📖' },
  DG: { label: 'Dasam Granth', emoji: '⚔️' },
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
        <p className="font-sans text-saffron dark:text-saffron-light text-xs mt-0.5">Ang {bani.startAng}–{bani.endAng}</p>
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

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const rowProps = { navigate, addBookmark, hasBookmark }

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300">
      <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text mb-6 mt-4">Banis</h1>

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
