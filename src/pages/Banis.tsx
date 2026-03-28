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
    <div
      className="p-4 max-w-md mx-auto min-h-screen"
      style={{ background: 'radial-gradient(ellipse at 50% 45%, #7B2D00 0%, #3D1200 25%, #1A0800 50%, #0D0D0D 75%)' }}
    >
      <h1 className="text-white font-pixel text-lg mb-6 mt-4">Banis</h1>

      {(['SGGS', 'DG'] as Scripture[]).map(scripture => {
        const meta = SCRIPTURE_META[scripture]
        const sectionKey = scripture.toLowerCase()
        const isOpen = expanded[sectionKey]
        const categories = CATEGORY_ORDER[scripture]
        const baniCount = BANIS.filter(b => b.scripture === scripture).length

        return (
          <div key={scripture} className="mb-4">
            <button
              onClick={() => toggle(sectionKey)}
              className="w-full flex justify-between items-center bg-coal border border-[#C9A84C44] rounded-2xl p-4 min-h-[44px]"
              style={isOpen ? { boxShadow: '0 0 12px #C9A84C44' } : undefined}
            >
              <div className="text-left">
                <p className="text-white font-pixel text-sm">{meta.emoji} {meta.label}</p>
                <p className="text-[#8B6914] font-pixel text-[10px] mt-0.5">{baniCount} banis</p>
              </div>
              <span className="text-[#C9A84C] font-pixel text-sm">{isOpen ? '▲' : '▼'}</span>
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
                        className="w-full flex justify-between items-center bg-coal border border-[#C9A84C33] rounded-xl p-3 min-h-[44px]"
                      >
                        <p className="text-[#8B6914] font-pixel text-xs uppercase tracking-wider">{category}</p>
                        <span className="text-[#8B6914] font-pixel text-xs">{isCatOpen ? '▲' : '▼'}</span>
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
                                  className="w-full flex justify-between items-center bg-coal border border-[#C9A84C22] rounded-xl p-3 min-h-[44px] text-left"
                                >
                                  <p className="text-white font-pixel text-xs">{bani.name}</p>
                                  <span className="text-[#8B6914] font-pixel text-xs">{isInfoOpen ? '▲' : '▼'}</span>
                                </button>

                                {isInfoOpen && (
                                  <div
                                    className="bg-coal border border-[#C9A84C] rounded-xl p-4 mt-1 ml-2"
                                    style={{ boxShadow: '0 0 20px #7B2D0088, 0 0 40px #3D120044' }}
                                  >
                                    <p className="text-white font-pixel text-sm mb-1">{bani.name}</p>
                                    <p className="text-[#C9A84C] font-pixel text-xs mb-2">
                                      {bani.scripture} · Ang {bani.startAng}–{bani.endAng}
                                    </p>
                                    <p className="text-[#A07850] text-xs mb-4">{bani.description}</p>

                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => navigate(`/study?source=${bani.source}&ang=${bani.startAng}`)}
                                        className="flex-1 border border-[#C9A84C] rounded-xl py-2 text-white font-pixel text-xs min-h-[44px]"
                                        style={{ background: 'linear-gradient(135deg, #7B2D00, #C9A84C22)' }}
                                      >
                                        Begin Study →
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (!isBookmarked) setBookmarkForm({ id: bani.id, text: '' })
                                        }}
                                        className={`px-3 rounded-xl border min-h-[44px] font-pixel text-xs ${
                                          isBookmarked
                                            ? 'border-[#C9A84C] text-[#C9A84C] bg-coal'
                                            : 'border-[#C9A84C44] text-[#8B6914] bg-coal'
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
                                          className="w-full bg-[#0D0D0D] border border-[#C9A84C44] rounded-xl px-3 py-2 text-white font-pixel text-xs mb-2 outline-none"
                                        />
                                        <button
                                          onClick={() => handleSaveBookmark(bani)}
                                          className="w-full bg-coal border border-[#C9A84C] rounded-xl py-2 text-[#C9A84C] font-pixel text-xs min-h-[44px]"
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
    </div>
  )
}
