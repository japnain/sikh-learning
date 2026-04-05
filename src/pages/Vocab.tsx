import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVocabStore } from '../store/vocab'
import { useLanguageStore } from '../store/language'
import { renderScriptText } from '../utils/readerDisplay'
import type { VocabEntry } from '../types'

type Mode = 'list' | 'flashcard' | 'review'

function timeLabel(entry: VocabEntry): string {
  const dueAt = entry.review?.dueAt ?? entry.savedAt
  const diff = new Date(dueAt).getTime() - Date.now()
  if (diff <= 0) return 'Due now'
  const days = Math.ceil(diff / 86400000)
  return `Due in ${days} day${days === 1 ? '' : 's'}`
}

export default function Vocab() {
  const navigate = useNavigate()
  const { vocab, removeWord, reviewWord } = useVocabStore()
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const [mode, setMode] = useState<Mode>('list')
  const [cardIdx, setCardIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const dueWords = useMemo(
    () => vocab.filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= Date.now()),
    [vocab]
  )

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

  const reviewPool = mode === 'review' ? dueWords : vocab
  const safeIdx = reviewPool.length > 0 ? cardIdx % reviewPool.length : 0
  const activeCard = reviewPool[safeIdx]

  const handleReview = (rating: 'again' | 'good' | 'easy') => {
    if (!activeCard) return
    reviewWord(activeCard.word, rating)
    setCardIdx(index => index + 1)
    setRevealed(false)
  }

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300">
      <div className="flex items-center justify-between mb-4 mt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px]">
            &#8592; Back
          </button>
          <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text">My Vocabulary</h1>
        </div>
        <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{dueWords.length} due</span>
      </div>

      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-4 border border-sand/15 dark:border-dark-text/10">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-2">Review Loop</p>
        <p className="font-sans text-sm text-ink dark:text-dark-text">
          {dueWords.length > 0
            ? `${dueWords.length} words are ready for spaced review.`
            : 'No words are due right now. Keep saving words while reading.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {([
          ['list', 'Word List'],
          ['flashcard', 'Flashcards'],
          ['review', 'Review'],
        ] as const).map(([nextMode, label]) => (
          <button
            key={nextMode}
            onClick={() => { setMode(nextMode); setCardIdx(0); setRevealed(false) }}
            className={`py-2 rounded-xl font-sans text-xs font-medium transition-colors duration-300 ${
              mode === nextMode ? 'bg-saffron text-white' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(mode === 'flashcard' || mode === 'review') ? (
        reviewPool.length === 0 ? (
          <div className="bg-parchment-card dark:bg-dark-card rounded-2xl p-6 border border-sand/15 dark:border-dark-text/10 text-center">
            <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">
              No review cards are due yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 mt-4">
            <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wide">
              {safeIdx + 1} of {reviewPool.length}
            </p>
            <div
              onClick={() => setRevealed(r => !r)}
              className="w-full bg-parchment-card dark:bg-dark-card rounded-2xl p-8 flex flex-col items-center cursor-pointer border border-sand/15 dark:border-dark-text/10 min-h-[240px] justify-center gap-4 transition-colors duration-300"
            >
              <p lang={scriptMode === 'devanagari' ? 'hi' : 'pa-Guru'} className={`${scriptMode === 'devanagari' ? 'font-sans' : 'font-gurmukhi'} text-5xl text-ink dark:text-dark-text text-center`}>
                {renderScriptText(activeCard.word, scriptMode)}
              </p>
              <p className="font-sans text-sm text-ink/50 dark:text-dark-text/50">{activeCard.transliteration}</p>
              {revealed ? (
                <div className="text-center">
                  <p className="font-sans font-medium text-ink dark:text-dark-text">{activeCard.meaning_en}</p>
                  {meaningLanguage === 'hi' && activeCard.meaning_hi && (
                    <p className="font-sans text-sm text-ink/70 dark:text-dark-text/70 mt-1">{activeCard.meaning_hi}</p>
                  )}
                  {meaningLanguage === 'pa' && activeCard.meaning_pa && (
                    <p lang="pa-Guru" className="font-gurmukhi text-sm text-ink/70 dark:text-dark-text/70 mt-1">{activeCard.meaning_pa}</p>
                  )}
                  <p className="font-sans text-xs text-gold dark:text-gold-light mt-3">
                    {activeCard.context?.scripture ?? activeCard.scripture}
                    {activeCard.context?.ang ? ` · Ang ${activeCard.context.ang}` : ''}
                  </p>
                </div>
              ) : (
                <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40">Tap to reveal meaning</p>
              )}
            </div>

            {mode === 'review' ? (
              <div className="grid grid-cols-3 gap-3 w-full">
                <button
                  onClick={() => handleReview('again')}
                  className="py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface font-sans text-sm text-ink/70 dark:text-dark-text/70 min-h-[44px]"
                >
                  Again
                </button>
                <button
                  onClick={() => handleReview('good')}
                  className="py-3 rounded-2xl bg-gold/15 text-gold dark:text-gold-light font-sans text-sm font-semibold min-h-[44px]"
                >
                  Good
                </button>
                <button
                  onClick={() => handleReview('easy')}
                  className="py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px]"
                >
                  Easy
                </button>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setRevealed(false) }}
                  disabled={safeIdx === 0}
                  className="flex-1 py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface font-sans text-sm text-ink/70 dark:text-dark-text/70 disabled:opacity-30 min-h-[44px]"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => { setCardIdx(i => i + 1); setRevealed(false) }}
                  disabled={safeIdx === reviewPool.length - 1}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )
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
                <p className="font-sans text-[10px] text-saffron dark:text-saffron-light mt-1">
                  {(entry.context?.scripture ?? entry.scripture)}
                  {entry.context?.ang ? ` · Ang ${entry.context.ang}` : ''}
                  {entry.context?.line ? ' · Saved from verse' : ''}
                </p>
                <p className="font-sans text-[10px] text-ink/45 dark:text-dark-text/45 mt-1">
                  {timeLabel(entry)}
                </p>
              </div>
              <button
                onClick={() => removeWord(entry.word)}
                className="text-ink/30 dark:text-dark-text/30 font-sans text-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Remove word"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
