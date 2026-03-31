import { useState } from 'react'
import type { ScriptureEntry, Word } from '../types'
import WordPopover from './WordPopover'

interface Props {
  entry: ScriptureEntry
  wordData?: Word[] | null
}

export default function StudyCard({ entry, wordData }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [activeWord, setActiveWord] = useState<Word | null>(null)
  const [lang, setLang] = useState<'en' | 'pa'>('en')

  const handleWordTap = (wordText: string) => {
    const wordsToSearch = wordData ?? entry.words ?? []
    if (!wordsToSearch.length) return
    const found = wordsToSearch.find(w => wordText.includes(w.gurmukhi))
    if (found) setActiveWord(found)
  }

  return (
    <>
      <div
        data-testid="study-card"
        onClick={() => setFlipped(f => !f)}
        className="bg-parchment-card dark:bg-dark-card rounded-2xl p-6 min-h-[300px] flex flex-col justify-between cursor-pointer select-none border border-sand/15 dark:border-dark-text/10 active:border-saffron/30 transition-colors duration-300 ease-in-out"
      >
        {!flipped ? (
          <div className="flex-1 flex flex-col justify-center">
            <p className="font-sans text-xs text-saffron dark:text-saffron-light uppercase tracking-wide mb-3">
              {entry.scripture} · Ang {entry.ang}
            </p>
            <div className="flex flex-wrap gap-2">
              {entry.gurmukhi.split(' ').map((word, i) => (
                <span
                  key={i}
                  lang="pa-Guru"
                  className="font-gurmukhi text-2xl text-ink dark:text-dark-text leading-relaxed cursor-pointer hover:text-saffron dark:hover:text-saffron-light transition-colors duration-300"
                  style={{ fontSize: '22px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  onClick={(e) => { e.stopPropagation(); handleWordTap(word) }}
                >
                  {word}
                </span>
              ))}
            </div>
            <p className="font-sans text-ink/40 dark:text-dark-text/40 text-xs mt-4">Tap card to see translation · Tap word for meaning</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-3">
            <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60 italic">{entry.transliteration}</p>
            <div className="flex gap-2 mb-2">
              <button
                onClick={e => { e.stopPropagation(); setLang('en') }}
                className={`font-sans text-xs px-3 py-1 rounded-full transition-colors duration-300 ${lang === 'en' ? 'bg-saffron text-white' : 'bg-parchment-low dark:bg-dark-surface text-ink/60 dark:text-dark-text/60'}`}
              >EN</button>
              <button
                onClick={e => { e.stopPropagation(); setLang('pa') }}
                className={`font-sans text-xs px-3 py-1 rounded-full transition-colors duration-300 ${lang === 'pa' ? 'bg-saffron text-white' : 'bg-parchment-low dark:bg-dark-surface text-ink/60 dark:text-dark-text/60'}`}
              >PA</button>
            </div>
            {lang === 'en'
              ? <p className="font-sans text-base text-ink/80 dark:text-dark-text/80 leading-relaxed">{entry.translation_en}</p>
              : <p lang="pa-Guru" className="font-gurmukhi text-base text-ink/80 dark:text-dark-text/80 leading-relaxed">{entry.translation_pa}</p>
            }
          </div>
        )}
      </div>

      {activeWord && (
        <WordPopover
          word={activeWord}
          onClose={() => setActiveWord(null)}
        />
      )}
    </>
  )
}
