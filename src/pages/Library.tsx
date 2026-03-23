import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SCRIPTURES, getEntriesByScripture } from '../data'
import { useCustomTextsStore } from '../store/customTexts'
import type { ScriptureEntry, CustomText } from '../types'

export default function Library() {
  const navigate = useNavigate()
  const { customTexts } = useCustomTextsStore()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const allScriptures = [
    ...SCRIPTURES,
    ...Array.from(new Set(customTexts.map(t => t.scripture.toUpperCase().trim())))
      .filter(name => !SCRIPTURES.some(s => s.shortName === name))
      .map(name => ({ id: name.toLowerCase(), name, shortName: name }))
  ]

  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }))

  return (
    <div className="p-4 max-w-md mx-auto mt-4">
      <h1 className="text-white font-semibold text-lg mb-6">Library</h1>

      {allScriptures.map(scripture => {
        const hardcoded: ScriptureEntry[] = getEntriesByScripture(scripture.id)
        const custom: CustomText[] = customTexts.filter(
          t => t.scripture.toUpperCase().trim() === scripture.shortName.toUpperCase().trim()
        )
        const total = hardcoded.length + custom.length
        const isCollapsed = collapsed[scripture.id]

        return (
          <div key={scripture.id} className="mb-4">
            <button
              onClick={() => toggle(scripture.id)}
              className="w-full flex justify-between items-center bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-4 min-h-[44px]"
            >
              <div className="text-left">
                <p className="text-white font-medium">{scripture.name}</p>
                <p className="text-gray-500 text-xs">{total} passages</p>
              </div>
              <span className="text-gray-400">{isCollapsed ? '▼' : '▲'}</span>
            </button>

            {!isCollapsed && (
              <div className="mt-2 ml-2 flex flex-col gap-2">
                {hardcoded
                  .sort((a, b) => a.ang - b.ang)
                  .map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => navigate(`/study/${scripture.id}`)}
                      className="text-left bg-[#0D0D0D] border border-[#1a1a1a] rounded-xl p-3 min-h-[44px]"
                    >
                      <p className="text-gray-400 text-xs mb-1">Ang {entry.ang}</p>
                      <p lang="pa-Guru" className="font-gurmukhi text-white text-sm line-clamp-1" style={{ fontSize: '14px' }}>
                        {entry.gurmukhi}
                      </p>
                    </button>
                  ))}
                {custom
                  .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime())
                  .map(entry => (
                    // Custom texts navigate to /study (scripture picker) — not deep-linkable
                    // because custom texts have no words[] and can't be loaded into Study's card stack directly
                    <button
                      key={entry.id}
                      onClick={() => navigate('/study')}
                      className="text-left bg-[#0D0D0D] border border-[#1a1a1a] rounded-xl p-3 min-h-[44px]"
                    >
                      <p className="text-gray-400 text-xs mb-1">Custom · {entry.addedAt}</p>
                      <p lang="pa-Guru" className="font-gurmukhi text-white text-sm line-clamp-1" style={{ fontSize: '14px' }}>
                        {entry.gurmukhi}
                      </p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )
      })}

      <button
        onClick={() => navigate('/add')}
        className="w-full mt-2 border border-dashed border-[#2a2a2a] rounded-2xl p-4 text-gray-500 text-sm min-h-[44px]"
      >
        + Add New Book / Text
      </button>
    </div>
  )
}
