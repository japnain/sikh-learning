import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVocabStore } from '../store/vocab'
import { useLanguageStore } from '../store/language'
import { renderScriptText } from '../utils/readerDisplay'
import type { VocabEntry } from '../types'

export default function Vocab() {
  const navigate = useNavigate()
  const { vocab, removeWord } = useVocabStore()
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const [mode, setMode] = useState<'list' | 'flashcard'>('list')
  const [cardIdx, setCardIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)

  if (vocab.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300">
        <div className="flex items-center gap-3 mb-6 mt-4">
          <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px]">
            &#8592; Back
          </button>
          <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text">My Vocabulary</h1>
        </div>
        <div className="flex flex-col items-center mt-20 gap-3">
          <p lang="pa-Guru" className="font-gurmukhi text-4xl text-ink/20 dark:text-dark-text/20">ਸ਼ਬਦ</p>
          <p className="font-sans text-ink/50 dark:text-dark-text/50 text-sm text-center">
            No words saved yet.<br />Tap any word while studying to save it here.
          </p>
        </div>
      </div>
    )
  }

  const safeIdx = cardIdx % vocab.length

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300">
      <div className="flex items-center justify-between mb-4 mt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px]">
            &#8592; Back
          </button>
          <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text">My Vocabulary</h1>
        </div>
        <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{vocab.length} words</span>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        {(['list', 'flashcard'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setCardIdx(0); setRevealed(false) }}
            className={`flex-1 py-2 rounded-xl font-sans text-xs font-medium transition-colors duration-300 ${
              mode === m ? 'bg-saffron text-white' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60'
            }`}
          >
            {m === 'list' ? 'Word List' : 'Flashcards'}
          </button>
        ))}
      </div>

      {mode === 'flashcard' ? (
        <div className="flex flex-col items-center gap-6 mt-4">
          <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wide">
            {safeIdx + 1} of {vocab.length}
          </p>
          <div
            onClick={() => setRevealed(r => !r)}
            className="w-full bg-parchment-card dark:bg-dark-card rounded-2xl p-8 flex flex-col items-center cursor-pointer border border-sand/15 dark:border-dark-text/10 min-h-[220px] justify-center gap-4 transition-colors duration-300"
          >
            <p lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'} className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-5xl text-ink dark:text-dark-text`}>
              {renderScriptText(vocab[safeIdx].word, scriptMode)}
            </p>
            <p className="font-sans text-sm text-ink/50 dark:text-dark-text/50">{vocab[safeIdx].transliteration}</p>
            {revealed ? (
              <div className="text-center">
                <p className="font-sans font-medium text-ink dark:text-dark-text">{vocab[safeIdx].meaning_en}</p>
                {meaningLanguage === 'hi' && vocab[safeIdx].meaning_hi && (
                  <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70 mt-1">{vocab[safeIdx].meaning_hi}</p>
                )}
                {meaningLanguage === 'pa' && (
                  <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink/70 dark:text-dark-text/70 mt-1">{vocab[safeIdx].meaning_pa}</p>
                )}
              </div>
            ) : (
              <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40">Tap to reveal meaning</p>
            )}
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setRevealed(false) }}
              disabled={safeIdx === 0}
              className="flex-1 py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface font-sans text-sm text-ink/70 dark:text-dark-text/70 disabled:opacity-30 min-h-[44px] transition-colors duration-300"
            >← Prev</button>
            <button
              onClick={() => { setCardIdx(i => i + 1); setRevealed(false) }}
              disabled={safeIdx === vocab.length - 1}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30 transition-colors duration-300"
            >Next →</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {vocab.map((entry: VocabEntry) => (
            <div
              key={entry.word}
              className="bg-parchment-card dark:bg-dark-card rounded-xl p-4 border border-sand/15 dark:border-dark-text/10 flex items-start justify-between gap-3 transition-colors duration-300"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'} className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-xl text-ink dark:text-dark-text`}>
                    {renderScriptText(entry.word, scriptMode)}
                  </span>
                  <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{entry.transliteration}</span>
                </div>
                <p className="font-sans text-sm text-ink/80 dark:text-dark-text/80">{entry.meaning_en}</p>
                {meaningLanguage === 'hi' && entry.meaning_hi && (
                  <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60">{entry.meaning_hi}</p>
                )}
                {meaningLanguage === 'pa' && (
                  <p lang="pa-Guru" className="font-gurmukhi text-xs text-ink/60 dark:text-dark-text/60">{entry.meaning_pa}</p>
                )}
                <p className="font-sans text-[10px] text-saffron dark:text-saffron-light mt-1">{entry.scripture}</p>
              </div>
              <button
                onClick={() => removeWord(entry.word)}
                className="text-ink/30 dark:text-dark-text/30 font-sans text-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Remove word"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
