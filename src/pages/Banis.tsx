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

export default function Banis() {
  const navigate = useNavigate()
  const { addBookmark, hasBookmark } = useBookmarksStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [bookmarkForm, setBookmarkForm] = useState<{ id: string; text: string } | null>(null)

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const handleSaveBookmark = (bani: Bani) => {
    addBookmark({
      type: 'bani',
      title: bani.name,
      source: bani.source,
      ang: bani.startAng,
      description: bookmarkForm?.text || undefined,
    })
    setBookmarkForm(null)
  }

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment">
      <h1 className="font-sans font-semibold text-lg text-ink mb-6 mt-4">Banis</h1>

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
              className={`w-full flex justify-between items-center ${isSSGS ? 'bg-parchment-card' : 'bg-parchment-low'} border border-sand/15 rounded-2xl p-4 min-h-[44px]`}
            >
              <div className="text-left">
                <p className={`font-sans font-semibold text-base ${isSSGS ? 'text-saffron' : 'text-ink'}`}>{meta.emoji} {meta.label}</p>
                <p className="font-sans text-ink/50 text-xs mt-0.5">{baniCount} banis</p>
              </div>
              <span className="text-saffron font-sans text-sm">{isOpen ? '▲' : '▼'}</span>
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
                        className="w-full flex justify-between items-center bg-parchment-card border border-sand/15 rounded-xl p-3 min-h-[44px]"
                      >
                        <p className="font-sans text-xs text-ink/50 uppercase tracking-wider">{category}</p>
                        <span className="font-sans text-xs text-ink/50">{isCatOpen ? '▲' : '▼'}</span>
                      </button>

                      {isCatOpen && (
                        <div className="mt-1 ml-2">
                          {banis.map(bani => {
                            const isInfoOpen = expanded[bani.id]
                            const isBookmarked = hasBookmark(bani.source, bani.startAng)
                            const showForm = bookmarkForm?.id === bani.id

                            return (
                              <div key={bani.id} className="mb-1">
                                <button
                                  onClick={() => toggle(bani.id)}
                                  className="w-full flex justify-between items-center bg-parchment-card border border-sand/15 rounded-xl p-3 min-h-[44px] text-left"
                                >
                                  <p className="font-sans text-ink text-xs">{bani.name}</p>
                                  <span className="font-sans text-xs text-ink/50">{isInfoOpen ? '▲' : '▼'}</span>
                                </button>

                                {isInfoOpen && (
                                  <div className="bg-parchment-card rounded-2xl shadow-sm border border-sand/15 p-4 mt-1 ml-2">
                                    <p className="font-gurmukhi text-ink text-sm mb-1">{bani.name}</p>
                                    <p className="font-sans text-xs text-saffron mb-2">
                                      {bani.scripture} · Ang {bani.startAng}–{bani.endAng}
                                    </p>
                                    <p className="font-sans text-sm text-ink/70 mb-4">{bani.description}</p>

                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => navigate(`/study?source=${bani.source}&ang=${bani.startAng}`)}
                                        className="flex-1 bg-gradient-to-r from-saffron to-saffron-light text-white rounded-full py-2 font-sans text-xs min-h-[44px]"
                                      >
                                        Begin Study →
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (!isBookmarked) setBookmarkForm({ id: bani.id, text: '' })
                                        }}
                                        className={`px-3 rounded-xl border min-h-[44px] font-sans text-xs ${
                                          isBookmarked
                                            ? 'border-saffron/30 text-saffron'
                                            : 'border-sand/15 text-ink/50'
                                        }`}
                                      >
                                        🔖 Bookmark
                                      </button>
                                    </div>

                                    {showForm && (
                                      <div className="mt-3">
                                        <input
                                          type="text"
                                          value={bookmarkForm!.text}
                                          onChange={e => setBookmarkForm({ id: bani.id, text: e.target.value })}
                                          placeholder="Add a note..."
                                          className="w-full bg-parchment border border-sand/15 rounded-xl px-3 py-2 font-sans text-xs text-ink mb-2 outline-none"
                                        />
                                        <button
                                          onClick={() => handleSaveBookmark(bani)}
                                          className="w-full bg-parchment-card border border-sand/15 rounded-xl py-2 font-sans text-xs text-saffron min-h-[44px]"
                                        >
                                          Save Bookmark
                                        </button>
                                      </div>
                                    )}
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
              </div>
            )}
          </div>
        )
      })}

      {/* New Sources */}
      {BANIS.filter(b => b.type === 'browse-only').map(source => (
        <div key={source.id} className="mb-4">
          <div className="bg-parchment-low rounded-xl p-4">
            <p className="font-sans font-semibold text-sm text-ink mb-1">{source.name}</p>
            <p className="font-sans text-xs text-ink/50 mb-3">{source.description}</p>
            <button
              onClick={() => navigate(`/study?source=${source.source}&ang=1`)}
              className="w-full bg-parchment-card border border-sand/15 rounded-xl font-sans text-sm text-saffron py-3 min-h-[44px] transition-colors duration-300"
            >
              Browse by Ang →
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
