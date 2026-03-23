import { useState } from 'react'
import type { ScriptureEntry, Word } from '../types'
import WordPopover from './WordPopover'
import { useVocabStore } from '../store/vocab'

interface Props {
  entry: ScriptureEntry
  onSwipeRight: () => void
  onSwipeLeft: () => void
}

export default function StudyCard({ entry, onSwipeRight, onSwipeLeft }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [activeWord, setActiveWord] = useState<Word | null>(null)
  const [lang, setLang] = useState<'en' | 'pa'>('en')
  const addWord = useVocabStore(s => s.addWord)

  const handleWordTap = (wordText: string) => {
    if (!entry.words?.length) return
    const found = entry.words.find(w => wordText.includes(w.gurmukhi))
    if (found) setActiveWord(found)
  }

  const handleSaveVocab = (word: Word) => {
    addWord({
      word: word.gurmukhi,
      transliteration: word.transliteration,
      meaning_en: word.meaning_en,
      meaning_pa: word.meaning_pa,
      scripture: entry.scripture,
      sourceId: entry.id,
      savedAt: new Date().toISOString().split('T')[0],
    })
  }

  return (
    <>
      <div
        data-testid="study-card"
        onClick={() => setFlipped(f => !f)}
        className="bg-[#1A1A1A] rounded-2xl p-6 min-h-[300px] flex flex-col justify-between cursor-pointer select-none border border-[#2a2a2a] active:border-[#C9A84C] transition-colors"
      >
        {!flipped ? (
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
              {entry.scripture} · Ang {entry.ang}
            </p>
            <div className="flex flex-wrap gap-2">
              {entry.gurmukhi.split(' ').map((word, i) => (
                <span
                  key={i}
                  lang="pa-Guru"
                  className="font-gurmukhi text-2xl text-white leading-relaxed cursor-pointer hover:text-[#C9A84C] transition-colors"
                  style={{ fontSize: '22px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  onClick={(e) => { e.stopPropagation(); handleWordTap(word) }}
                >
                  {word}
                </span>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-4">Tap card to see translation · Tap word for meaning</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-3">
            <p className="text-gray-400 text-sm">{entry.transliteration}</p>
            <div className="flex gap-2 mb-2">
              <button
                onClick={e => { e.stopPropagation(); setLang('en') }}
                className={`text-xs px-3 py-1 rounded-full ${lang === 'en' ? 'bg-[#C9A84C] text-black' : 'bg-[#2a2a2a] text-gray-400'}`}
              >EN</button>
              <button
                onClick={e => { e.stopPropagation(); setLang('pa') }}
                className={`text-xs px-3 py-1 rounded-full ${lang === 'pa' ? 'bg-[#C9A84C] text-black' : 'bg-[#2a2a2a] text-gray-400'}`}
              >PA</button>
            </div>
            {lang === 'en'
              ? <p className="text-white text-base leading-relaxed">{entry.translation_en}</p>
              : <p lang="pa-Guru" className="font-gurmukhi text-white text-base leading-relaxed">{entry.translation_pa}</p>
            }
          </div>
        )}

        <div className="flex justify-between mt-4 pt-4 border-t border-[#2a2a2a]">
          <button
            onClick={e => { e.stopPropagation(); onSwipeLeft() }}
            className="flex-1 mr-2 py-2 rounded-xl bg-[#2a2a2a] text-gray-400 text-sm font-medium min-h-[44px]"
          >← Review Later</button>
          <button
            onClick={e => { e.stopPropagation(); onSwipeRight() }}
            className="flex-1 ml-2 py-2 rounded-xl bg-[#C9A84C] text-black text-sm font-semibold min-h-[44px]"
          >Got It →</button>
        </div>
      </div>

      {activeWord && (
        <WordPopover
          word={activeWord}
          onSave={handleSaveVocab}
          onClose={() => setActiveWord(null)}
        />
      )}
    </>
  )
}
