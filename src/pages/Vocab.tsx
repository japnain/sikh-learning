import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { useVocabStore } from '../store/vocab'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import type { UiLocale, VocabEntry } from '../types'

type Mode = 'list' | 'flashcard' | 'review'

const VOCAB_COPY: Record<UiLocale, {
  title: string
  back: string
  emptyTitle: string
  emptyBody: string
  reviewEyebrow: string
  reviewReady: (count: number) => string
  reviewEmpty: string
  totalSaved: string
  dueNow: string
  phrases: string
  dueBadge: (count: number) => string
  modes: Record<Mode, string>
  noCards: string
  tapToReveal: string
  phraseReview: string
  wordReview: string
  again: string
  good: string
  easy: string
  prev: string
  next: string
  removeWord: string
  verseSavedFrom: string
  dueNowLabel: string
  dueInDays: (days: number) => string
  savedShelfEyebrow: string
}> = {
  en: {
    title: 'Vocabulary & Review',
    back: 'Back',
    emptyTitle: 'No saved words yet.',
    emptyBody: 'Tap any word while studying and NaamRas will keep it here for steady review.',
    reviewEyebrow: 'Review Loop',
    reviewReady: count => `${count} saved item${count === 1 ? '' : 's'} are ready for spaced review.`,
    reviewEmpty: 'Nothing is due right now. Keep saving words and phrases while reading.',
    totalSaved: 'Saved terms',
    dueNow: 'Due now',
    phrases: 'Phrases',
    dueBadge: count => `${count} due`,
    modes: {
      list: 'Word List',
      flashcard: 'Flashcards',
      review: 'Review',
    },
    noCards: 'No review cards are due yet.',
    tapToReveal: 'Tap to reveal meaning',
    phraseReview: 'Phrase Review',
    wordReview: 'Word Review',
    again: 'Again',
    good: 'Good',
    easy: 'Easy',
    prev: 'Prev',
    next: 'Next',
    removeWord: 'Remove word',
    verseSavedFrom: 'Saved from verse',
    dueNowLabel: 'Due now',
    dueInDays: days => `Due in ${days} day${days === 1 ? '' : 's'}`,
    savedShelfEyebrow: 'Saved Meanings',
  },
  pa: {
    title: 'ਸ਼ਬਦ ਭੰਡਾਰ ਅਤੇ ਦੁਹਰਾਈ',
    back: 'ਵਾਪਸ',
    emptyTitle: 'ਹਾਲੇ ਕੋਈ ਸੰਭਾਲੇ ਸ਼ਬਦ ਨਹੀਂ ਹਨ।',
    emptyBody: 'ਅਧਿਐਨ ਵੇਲੇ ਕਿਸੇ ਵੀ ਸ਼ਬਦ ਤੇ ਟੈਪ ਕਰੋ, ਨਾਮਰਸ ਉਸਨੂੰ ਇੱਥੇ ਦੁਹਰਾਈ ਲਈ ਸੰਭਾਲ ਲਵੇਗਾ।',
    reviewEyebrow: 'ਦੁਹਰਾਈ ਚੱਕਰ',
    reviewReady: count => `${count} ਸੰਭਾਲੇ ਆਇਟਮ ਹੁਣ ਦੁਹਰਾਈ ਲਈ ਤਿਆਰ ਹਨ।`,
    reviewEmpty: 'ਇਸ ਵੇਲੇ ਕੁਝ ਵੀ ਬਾਕੀ ਨਹੀਂ। ਪੜ੍ਹਦੇ ਸਮੇਂ ਸ਼ਬਦ ਅਤੇ ਵਾਕ ਸੰਭਾਲਦੇ ਰਹੋ।',
    totalSaved: 'ਸੰਭਾਲੇ ਸ਼ਬਦ',
    dueNow: 'ਹੁਣ ਬਾਕੀ',
    phrases: 'ਵਾਕ',
    dueBadge: count => `${count} ਬਾਕੀ`,
    modes: {
      list: 'ਸੂਚੀ',
      flashcard: 'ਫਲੈਸ਼ਕਾਰਡ',
      review: 'ਦੁਹਰਾਈ',
    },
    noCards: 'ਹਾਲੇ ਕੋਈ ਦੁਹਰਾਈ ਕਾਰਡ ਤਿਆਰ ਨਹੀਂ ਹੈ।',
    tapToReveal: 'ਅਰਥ ਵੇਖਣ ਲਈ ਟੈਪ ਕਰੋ',
    phraseReview: 'ਵਾਕ ਦੁਹਰਾਈ',
    wordReview: 'ਸ਼ਬਦ ਦੁਹਰਾਈ',
    again: 'ਫਿਰ',
    good: 'ਠੀਕ',
    easy: 'ਸੌਖਾ',
    prev: 'ਪਿਛਲਾ',
    next: 'ਅਗਲਾ',
    removeWord: 'ਸ਼ਬਦ ਹਟਾਓ',
    verseSavedFrom: 'ਪੰਕਤੀ ਤੋਂ ਸੰਭਾਲਿਆ',
    dueNowLabel: 'ਹੁਣ ਬਾਕੀ',
    dueInDays: days => `${days} ਦਿਨਾਂ ਵਿੱਚ ਬਾਕੀ`,
    savedShelfEyebrow: 'ਸੰਭਾਲੇ ਅਰਥ',
  },
  hi: {
    title: 'शब्द भंडार और रिव्यू',
    back: 'वापस',
    emptyTitle: 'अभी कोई शब्द सेव नहीं है।',
    emptyBody: 'अध्ययन के समय किसी भी शब्द पर टैप करें, NaamRas उसे यहाँ स्थिर रिव्यू के लिए रख देगा।',
    reviewEyebrow: 'रिव्यू लूप',
    reviewReady: count => `${count} सेव आइटम अब स्पेस्ड रिव्यू के लिए तैयार हैं।`,
    reviewEmpty: 'अभी कुछ भी ड्यू नहीं है। पढ़ते समय शब्द और वाक्यांश सेव करते रहें।',
    totalSaved: 'सेव शब्द',
    dueNow: 'अभी ड्यू',
    phrases: 'वाक्यांश',
    dueBadge: count => `${count} ड्यू`,
    modes: {
      list: 'सूची',
      flashcard: 'फ्लैशकार्ड',
      review: 'रिव्यू',
    },
    noCards: 'अभी कोई रिव्यू कार्ड ड्यू नहीं है।',
    tapToReveal: 'अर्थ देखने के लिए टैप करें',
    phraseReview: 'वाक्यांश रिव्यू',
    wordReview: 'शब्द रिव्यू',
    again: 'फिर',
    good: 'अच्छा',
    easy: 'आसान',
    prev: 'पिछला',
    next: 'अगला',
    removeWord: 'शब्द हटाएँ',
    verseSavedFrom: 'पंक्ति से सेव',
    dueNowLabel: 'अभी ड्यू',
    dueInDays: days => `${days} दिन में ड्यू`,
    savedShelfEyebrow: 'सेव अर्थ',
  },
}

function timeLabel(entry: VocabEntry, now: number, copy: typeof VOCAB_COPY.en): string {
  const dueAt = entry.review?.dueAt ?? entry.savedAt
  const diff = new Date(dueAt).getTime() - now
  if (diff <= 0) return copy.dueNowLabel
  const days = Math.ceil(diff / 86400000)
  return copy.dueInDays(days)
}

export default function Vocab() {
  const navigate = useNavigate()
  const locale = useLocaleStore(state => state.locale)
  const copy = VOCAB_COPY[locale]
  const { vocab, removeWord, reviewWord } = useVocabStore()
  const scriptMode = useLanguageStore(s => s.scriptMode)
  const meaningLanguage = useLanguageStore(s => s.meaningLanguage)
  const [mode, setMode] = useState<Mode>('list')
  const [cardIdx, setCardIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const now = useCurrentTime()

  const dueWords = useMemo(
    () => vocab.filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= now),
    [now, vocab]
  )
  const phraseCount = vocab.filter(entry => (entry.kind ?? 'word') === 'phrase').length

  if (vocab.length === 0) {
    return (
      <div className="page-shell animate-fade-in" data-testid="page-vocab" data-page="vocab" data-ai-surface="vocab" data-ai-state="empty">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px]">
            &#8592; {copy.back}
          </button>
        </div>

        <section className="hero-surface p-6 text-center" aria-labelledby="vocab-empty-title" data-testid="vocab-empty-state">
          <p className="eyebrow">{copy.savedShelfEyebrow}</p>
          <h1 id="vocab-empty-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">{copy.title}</h1>
          <p lang={getScriptTextLang(scriptMode)} className={`mt-6 ${getScriptTextFontClass(scriptMode)} text-5xl text-ink/20 dark:text-dark-text/20`}>{renderScriptText('ਸ਼ਬਦ', scriptMode)}</p>
          <p className="mt-4 font-sans text-base font-semibold text-ink dark:text-dark-text">{copy.emptyTitle}</p>
          <p className="mt-3 font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">{copy.emptyBody}</p>
        </section>
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
    <div className="page-shell animate-fade-in" data-testid="page-vocab" data-page="vocab" data-ai-surface="vocab" data-ai-state="ready">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px]">
            &#8592; {copy.back}
          </button>
          <div>
            <p className="eyebrow">{copy.savedShelfEyebrow}</p>
            <h1 className="mt-1 font-display text-3xl leading-none text-ink dark:text-dark-text">{copy.title}</h1>
          </div>
        </div>
        <span className="font-sans text-xs text-ink/58 dark:text-dark-text/60">{copy.dueBadge(dueWords.length)}</span>
      </div>

      <section className="hero-surface p-5 mb-4" aria-labelledby="vocab-summary-title" data-testid="vocab-summary">
        <div className="grid grid-cols-3 gap-3">
          <div className="section-shell-quiet rounded-[24px] px-4 py-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/45 dark:text-dark-text/45">{copy.totalSaved}</p>
            <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{vocab.length}</p>
          </div>
          <div className="section-shell-quiet rounded-[24px] px-4 py-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/45 dark:text-dark-text/45">{copy.dueNow}</p>
            <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{dueWords.length}</p>
          </div>
          <div className="section-shell-quiet rounded-[24px] px-4 py-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/45 dark:text-dark-text/45">{copy.phrases}</p>
            <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{phraseCount}</p>
          </div>
        </div>

        <div className="section-shell mt-4 p-4">
          <p id="vocab-summary-title" className="eyebrow">{copy.reviewEyebrow}</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76">
            {dueWords.length > 0 ? copy.reviewReady(dueWords.length) : copy.reviewEmpty}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {(Object.entries(copy.modes) as Array<[Mode, string]>).map(([nextMode, label]) => (
          <button
            key={nextMode}
            onClick={() => { setMode(nextMode); setCardIdx(0); setRevealed(false) }}
            className={`py-2 rounded-xl font-sans text-xs font-medium transition-colors duration-300 ${
              mode === nextMode ? 'bg-saffron text-white' : 'bg-parchment-card dark:bg-dark-card text-ink/68 dark:text-dark-text/68'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(mode === 'flashcard' || mode === 'review') ? (
        reviewPool.length === 0 ? (
          <div className="section-shell p-6 text-center">
            <p className="font-sans text-sm text-ink/68 dark:text-dark-text/70">
              {copy.noCards}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 mt-4" data-testid="vocab-review-card">
            <p className="font-sans text-xs text-ink/54 dark:text-dark-text/56 uppercase tracking-wide">
              {safeIdx + 1} of {reviewPool.length}
            </p>
            <div
              onClick={() => setRevealed(r => !r)}
              className="w-full section-shell rounded-[28px] p-8 flex flex-col items-center cursor-pointer min-h-[260px] justify-center gap-4 transition-colors duration-300"
            >
              <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-5xl text-ink dark:text-dark-text text-center`}>
                {renderScriptText(activeCard.word, scriptMode)}
              </p>
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-gold dark:text-gold-light">
                {(activeCard.kind ?? 'word') === 'phrase' ? copy.phraseReview : copy.wordReview}
              </p>
              <p className="font-sans text-sm text-ink/56 dark:text-dark-text/58">{activeCard.transliteration}</p>
              {revealed ? (
                <div className="text-center">
                  <p className="font-sans font-medium text-ink dark:text-dark-text">{activeCard.meaning_en}</p>
                  {meaningLanguage === 'hi' && activeCard.meaning_hi && (
                    <p className="font-sans text-sm text-ink/72 dark:text-dark-text/74 mt-1">{activeCard.meaning_hi}</p>
                  )}
                  {meaningLanguage === 'pa' && activeCard.meaning_pa && (
                    <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-sm text-ink/72 dark:text-dark-text/74 mt-1`}>{renderScriptText(activeCard.meaning_pa, scriptMode)}</p>
                  )}
                  <p className="font-sans text-xs text-gold dark:text-gold-light mt-3">
                    {activeCard.context?.scripture ?? activeCard.scripture}
                    {activeCard.context?.ang ? ` · Ang ${activeCard.context.ang}` : ''}
                  </p>
                </div>
              ) : (
                <p className="font-sans text-xs text-ink/46 dark:text-dark-text/48">{copy.tapToReveal}</p>
              )}
            </div>

            {mode === 'review' ? (
              <div className="grid grid-cols-3 gap-3 w-full">
                <button
                  onClick={() => handleReview('again')}
                  className="py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface font-sans text-sm text-ink/70 dark:text-dark-text/70 min-h-[44px]"
                >
                  {copy.again}
                </button>
                <button
                  onClick={() => handleReview('good')}
                  className="py-3 rounded-2xl bg-gold/15 text-gold dark:text-gold-light font-sans text-sm font-semibold min-h-[44px]"
                >
                  {copy.good}
                </button>
                <button
                  onClick={() => handleReview('easy')}
                  className="py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px]"
                >
                  {copy.easy}
                </button>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setRevealed(false) }}
                  disabled={safeIdx === 0}
                  className="flex-1 py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface font-sans text-sm text-ink/70 dark:text-dark-text/70 disabled:opacity-30 min-h-[44px]"
                >
                  &#8592; {copy.prev}
                </button>
                <button
                  onClick={() => { setCardIdx(i => i + 1); setRevealed(false) }}
                  disabled={safeIdx === reviewPool.length - 1}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] disabled:opacity-30"
                >
                  {copy.next} &#8594;
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <section className="section-shell-quiet p-4" aria-labelledby="vocab-saved-list-title" data-testid="vocab-saved-list">
          <p id="vocab-saved-list-title" className="eyebrow mb-3">{copy.savedShelfEyebrow}</p>
          <div className="space-y-2">
            {vocab.map((entry: VocabEntry) => (
              <div
                key={`${entry.kind ?? 'word'}-${entry.word}`}
                className="section-shell px-4 py-4 flex items-start justify-between gap-3 transition-colors duration-300"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-xl text-ink dark:text-dark-text`}>
                      {renderScriptText(entry.word, scriptMode)}
                    </span>
                    <span className="font-sans text-xs text-ink/50 dark:text-dark-text/50">{entry.transliteration}</span>
                  </div>
                  <p className="font-sans text-sm text-ink/82 dark:text-dark-text/84">{entry.meaning_en}</p>
                  {meaningLanguage === 'hi' && entry.meaning_hi && (
                    <p className="font-sans text-xs text-ink/66 dark:text-dark-text/68">{entry.meaning_hi}</p>
                  )}
                  {meaningLanguage === 'pa' && entry.meaning_pa && (
                    <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-xs text-ink/66 dark:text-dark-text/68`}>{renderScriptText(entry.meaning_pa, scriptMode)}</p>
                  )}
                  <p className="font-sans text-[10px] text-saffron dark:text-saffron-light mt-1">
                    {(entry.kind ?? 'word') === 'phrase' ? copy.phraseReview : copy.wordReview}
                    {' · '}
                    {(entry.context?.scripture ?? entry.scripture)}
                    {entry.context?.ang ? ` · Ang ${entry.context.ang}` : ''}
                    {entry.context?.line ? ` · ${copy.verseSavedFrom}` : ''}
                  </p>
                  <p className="font-sans text-[10px] text-ink/48 dark:text-dark-text/50 mt-1">
                    {timeLabel(entry, now, copy)}
                  </p>
                </div>
                <button
                  onClick={() => removeWord(entry.word, entry.kind ?? 'word')}
                  className="text-ink/30 dark:text-dark-text/30 font-sans text-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={copy.removeWord}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
