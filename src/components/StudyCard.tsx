import { useState, useEffect } from 'react'
import type { ScriptureEntry, Word } from '../types'
import { useLanguageStore } from '../store/language'
import { gurmukhiToHindi } from '../utils/gurmukhiToHindi'
import WordPopover from './WordPopover'

interface Props {
  entry: ScriptureEntry
  wordData?: Word[] | null
}

export default function StudyCard({ entry, wordData }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [activeWord, setActiveWord] = useState<Word | null>(null)
  const hindiMode = useLanguageStore(s => s.hindiMode)
  const fontSize = useLanguageStore(s => s.fontSize)
  const [lang, setLang] = useState<'en' | 'alt'>(hindiMode ? 'alt' : 'en')

  useEffect(() => {
    setLang(hindiMode ? 'alt' : 'en')
  }, [hindiMode])

  // Strip Gurmukhi vishram marks and punctuation for matching
  const cleanGurmukhi = (s: string) =>
    s.replace(/[;,।॥.\s]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '')

  const handleWordTap = (originalGurmukhi: string) => {
    const wordsToSearch = wordData ?? entry.words ?? []
    const cleaned = cleanGurmukhi(originalGurmukhi)
    if (!cleaned) return

    if (wordsToSearch.length > 0) {
      // Try exact match first
      const exact = wordsToSearch.find(w => cleanGurmukhi(w.gurmukhi) === cleaned)
      if (exact) { setActiveWord(exact); return }
      // Try contains in both directions
      const partial = wordsToSearch.find(w =>
        cleaned.includes(cleanGurmukhi(w.gurmukhi)) || cleanGurmukhi(w.gurmukhi).includes(cleaned)
      )
      if (partial) { setActiveWord(partial); return }
    }

    // Fallback: show a basic word popup even without API data
    setActiveWord({
      gurmukhi: originalGurmukhi,
      transliteration: '',
      meaning_en: '',
      meaning_hi: '',
      meaning_pa: '',
    })
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
              {entry.scripture} · {entry.scripture === 'SGGS' || entry.scripture === 'DG' ? 'Ang' : 'Page'} {entry.ang}
            </p>
            <div className="flex flex-wrap gap-2">
              {entry.gurmukhi.split(' ').filter(Boolean).map((word, i) => (
                <span
                  key={i}
                  lang={hindiMode ? 'hi' : 'pa-Guru'}
                  className={`${hindiMode ? 'font-sans' : 'font-gurmukhi'} text-2xl text-ink dark:text-dark-text leading-relaxed cursor-pointer active:text-saffron dark:active:text-saffron-light hover:text-saffron dark:hover:text-saffron-light transition-colors duration-300`}
                  style={{ fontSize: `${fontSize}px`, minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  onClick={(e) => { e.stopPropagation(); handleWordTap(word) }}
                >
                  {hindiMode ? gurmukhiToHindi(word) : word}
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
                onClick={e => { e.stopPropagation(); setLang('alt') }}
                className={`font-sans text-xs px-3 py-1 rounded-full transition-colors duration-300 ${lang === 'alt' ? 'bg-saffron text-white' : 'bg-parchment-low dark:bg-dark-surface text-ink/60 dark:text-dark-text/60'}`}
              >{hindiMode ? 'HI' : 'PA'}</button>
            </div>
            {lang === 'en' && <p className="font-sans text-base text-ink/80 dark:text-dark-text/80 leading-relaxed">{entry.translation_en}</p>}
            {lang === 'alt' && (hindiMode
              ? <p className="font-sans text-base text-ink/80 dark:text-dark-text/80 leading-relaxed">{entry.translation_hi}</p>
              : <p lang="pa-Guru" className="font-gurmukhi text-base text-ink/80 dark:text-dark-text/80 leading-relaxed">{entry.translation_pa}</p>
            )}
          </div>
        )}
      </div>

      {activeWord && (
        <WordPopover
          word={activeWord}
          onClose={() => setActiveWord(null)}
          scripture={entry.scripture}
          sourceId={entry.id.split('-')[0]}
        />
      )}
    </>
  )
}
