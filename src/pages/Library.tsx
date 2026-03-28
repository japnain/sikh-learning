import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomTextsStore } from '../store/customTexts'
import { useBookmarksStore, type Bookmark } from '../store/bookmarks'
import { SGGS_ANG_COUNT, DG_ANG_COUNT } from '../utils/dailyPick'
import type { CustomText } from '../types'

function AngBrowser({ source, totalAngs }: { source: 'G' | 'D'; totalAngs: number }) {
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
            className="bg-[#1A1A1A] rounded-lg py-2 text-sm text-gray-300 hover:text-[#C9A84C] hover:border-[#C9A84C] border border-[#2a2a2a] transition-colors min-h-[44px]"
          >
            {ang}
          </button>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="text-[#C9A84C] text-sm disabled:opacity-30 min-h-[44px] px-3"
        >← Prev</button>
        <span className="text-gray-500 text-xs">Ang {start}–{end} of {totalAngs}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={end >= totalAngs}
          className="text-[#C9A84C] text-sm disabled:opacity-30 min-h-[44px] px-3"
        >Next →</button>
      </div>
    </div>
  )
}

export default function Library() {
  const navigate = useNavigate()
  const { customTexts } = useCustomTextsStore()
  const { bookmarks, removeBookmark } = useBookmarksStore()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => ({
    bookmarks: bookmarks.length > 0,
  }))

  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }))

  const sarblohCustom: CustomText[] = customTexts.filter(
    t => t.scripture.toUpperCase().trim() === 'SG'
  )
  const otherCustom: CustomText[] = customTexts.filter(
    t => !['SGGS', 'DG', 'SG'].includes(t.scripture.toUpperCase().trim())
  )

  const sections = [
    { id: 'sggs', name: 'Sri Guru Granth Sahib Ji', source: 'G' as const, totalAngs: SGGS_ANG_COUNT },
    { id: 'dasam-granth', name: 'Dasam Granth', source: 'D' as const, totalAngs: DG_ANG_COUNT },
  ]

  return (
    <div className="p-4 max-w-md mx-auto mt-4">
      <h1 className="text-white font-semibold text-lg mb-6">Library</h1>

      {bookmarks.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => toggle('bookmarks')}
            className="w-full flex justify-between items-center bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-4 min-h-[44px]"
          >
            <div className="text-left">
              <p className="text-white font-medium">🔖 Bookmarks</p>
              <p className="text-gray-500 text-xs">{bookmarks.length} saved</p>
            </div>
            <span className="text-gray-400">{collapsed['bookmarks'] ? '▲' : '▼'}</span>
          </button>
          {collapsed['bookmarks'] && (
            <div className="mt-2 ml-2 flex flex-col gap-2">
              {bookmarks.map((bookmark: Bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-[#0D0D0D] border border-[#1a1a1a] rounded-xl p-3 relative"
                >
                  <button
                    onClick={() => removeBookmark(bookmark.id)}
                    className="absolute top-2 right-2 text-gray-600 text-xs min-h-[24px] min-w-[24px] flex items-center justify-center"
                    aria-label="Remove bookmark"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => navigate(`/study?source=${bookmark.source}&ang=${bookmark.ang}`)}
                    className="text-left w-full pr-6"
                  >
                    <p className="text-white font-pixel text-sm">{bookmark.title}</p>
                    {bookmark.description && (
                      <p className="text-gray-400 text-xs italic mt-0.5">{bookmark.description}</p>
                    )}
                    <p className="text-[#C9A84C] text-[10px] mt-1 font-pixel">
                      {bookmark.source === 'G' ? 'SGGS' : 'DG'} · Ang {bookmark.ang}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SGGS + DG — ang browser */}
      {sections.map(s => (
        <div key={s.id} className="mb-4">
          <button
            onClick={() => toggle(s.id)}
            className="w-full flex justify-between items-center bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-4 min-h-[44px]"
          >
            <div className="text-left">
              <p className="text-white font-medium">{s.name}</p>
              <p className="text-gray-500 text-xs">{s.totalAngs} angs · Browse by ang</p>
            </div>
            <span className="text-gray-400">{collapsed[s.id] ? '▲' : '▼'}</span>
          </button>
          {collapsed[s.id] && (
            <div className="mt-2 ml-2">
              <AngBrowser source={s.source} totalAngs={s.totalAngs} />
            </div>
          )}
        </div>
      ))}

      {/* Sarbloh Granth */}
      <div className="mb-4">
        <button
          onClick={() => toggle('sarbloh-granth')}
          className="w-full flex justify-between items-center bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-4 min-h-[44px]"
        >
          <div className="text-left">
            <p className="text-white font-medium">Sarbloh Granth</p>
            <p className="text-gray-500 text-xs">{sarblohCustom.length} passages</p>
          </div>
          <span className="text-gray-400">{collapsed['sarbloh-granth'] ? '▲' : '▼'}</span>
        </button>
        {collapsed['sarbloh-granth'] && sarblohCustom.length > 0 && (
          <div className="mt-2 ml-2 flex flex-col gap-2">
            {sarblohCustom
              .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime())
              .map(entry => (
                <button
                  key={entry.id}
                  onClick={() => navigate('/study')}
                  className="text-left bg-[#0D0D0D] border border-[#1a1a1a] rounded-xl p-3 min-h-[44px]"
                >
                  <p className="text-gray-400 text-xs mb-1">Custom</p>
                  <p lang="pa-Guru" className="font-gurmukhi text-white text-sm line-clamp-1" style={{ fontSize: '14px' }}>
                    {entry.gurmukhi}
                  </p>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Other custom texts */}
      {otherCustom.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => toggle('custom')}
            className="w-full flex justify-between items-center bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-4 min-h-[44px]"
          >
            <div className="text-left">
              <p className="text-white font-medium">Custom Texts</p>
              <p className="text-gray-500 text-xs">{otherCustom.length} passages</p>
            </div>
            <span className="text-gray-400">{collapsed['custom'] ? '▲' : '▼'}</span>
          </button>
          {collapsed['custom'] && (
            <div className="mt-2 ml-2 flex flex-col gap-2">
              {otherCustom
                .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime())
                .map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => navigate('/study')}
                    className="text-left bg-[#0D0D0D] border border-[#1a1a1a] rounded-xl p-3 min-h-[44px]"
                  >
                    <p className="text-gray-400 text-xs mb-1">{entry.scripture}</p>
                    <p lang="pa-Guru" className="font-gurmukhi text-white text-sm line-clamp-1" style={{ fontSize: '14px' }}>
                      {entry.gurmukhi}
                    </p>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/add')}
        className="w-full mt-2 border border-dashed border-[#2a2a2a] rounded-2xl p-4 text-gray-500 text-sm min-h-[44px]"
      >
        + Add New Book / Text
      </button>
    </div>
  )
}
