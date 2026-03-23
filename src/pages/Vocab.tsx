import { useState } from 'react'
import { useVocabStore } from '../store/vocab'
import { SCRIPTURES } from '../data'

export default function Vocab() {
  const { vocab, removeWord } = useVocabStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [detail, setDetail] = useState<string | null>(null)

  const filtered = vocab.filter(v => {
    const matchSearch = !search ||
      v.word.toLowerCase().includes(search.toLowerCase()) ||
      v.transliteration.toLowerCase().includes(search.toLowerCase()) ||
      v.meaning_en.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || v.scripture.toLowerCase() === filter.toLowerCase()
    return matchSearch && matchFilter
  })

  const detailWord = vocab.find(v => v.word === detail)

  return (
    <div className="p-4 max-w-md mx-auto mt-4">
      <h1 className="text-white font-semibold text-lg mb-4">Vocab</h1>

      <input
        type="text"
        placeholder="Search words..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm mb-3 focus:outline-none focus:border-[#C9A84C] min-h-[44px]"
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full min-h-[44px] ${filter === 'all' ? 'bg-[#C9A84C] text-black' : 'bg-[#1A1A1A] text-gray-400 border border-[#2a2a2a]'}`}
        >All</button>
        {SCRIPTURES.map(s => (
          <button
            key={s.id}
            onClick={() => setFilter(s.shortName)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full min-h-[44px] ${filter === s.shortName ? 'bg-[#C9A84C] text-black' : 'bg-[#1A1A1A] text-gray-400 border border-[#2a2a2a]'}`}
          >{s.shortName}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm text-center mt-10">
          {vocab.length === 0 ? 'No words saved yet. Tap words while studying to save them.' : 'No results.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map(v => (
          <div
            key={v.word}
            onClick={() => setDetail(v.word)}
            className="bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl p-3 flex justify-between items-center cursor-pointer min-h-[44px]"
          >
            <div>
              <span lang="pa-Guru" className="font-gurmukhi text-white mr-2" style={{ fontSize: '18px' }}>{v.word}</span>
              <span className="text-gray-400 text-xs">{v.transliteration}</span>
              <p className="text-gray-500 text-xs mt-0.5">{v.meaning_en}</p>
            </div>
            <span className="text-gray-600 text-xs ml-2">{v.scripture}</span>
          </div>
        ))}
      </div>

      {detailWord && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setDetail(null)}>
          <div className="bg-[#1A1A1A] border border-[#2a2a2a] rounded-t-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <p lang="pa-Guru" className="font-gurmukhi text-white text-3xl mb-1" style={{ fontSize: '30px' }}>{detailWord.word}</p>
            <p className="text-gray-400 text-sm mb-1">{detailWord.transliteration}</p>
            <p className="text-white font-medium mb-1">{detailWord.meaning_en}</p>
            <p lang="pa-Guru" className="font-gurmukhi text-gray-300 text-sm mb-2">{detailWord.meaning_pa}</p>
            <p className="text-gray-600 text-xs mb-4">From {detailWord.scripture} · Saved {detailWord.savedAt}</p>
            <button
              onClick={() => { removeWord(detailWord.word); setDetail(null) }}
              className="w-full py-3 border border-red-900 text-red-400 rounded-xl text-sm min-h-[44px]"
            >Remove from Vocab</button>
          </div>
        </div>
      )}
    </div>
  )
}
