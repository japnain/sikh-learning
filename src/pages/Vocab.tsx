import '../styles/library.css'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { useVocabStore } from '../store/vocab'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { getScriptTextFontClass, getScriptTextLang, renderScriptText } from '../utils/readerDisplay'
import { canReviewVocab, getVocabMeaning, vocabContextPath, vocabEntryKey, vocabSenseKey } from '../utils/vocabReview'
import type { ScriptMode, UiLocale, VocabContext, VocabEntry, VocabSense } from '../types'

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
  browseRead: string
  tapToReveal: string
  hideMeaning: string
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
  missingAnswer: string
  missingAnswers: (count: number) => string
  readInContext: string
  otherSenses: string
  languageFallback: (language: string) => string
  languages: { en: string; pa: string; hi: string }
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
    browseRead: 'Browse readings',
    tapToReveal: 'Tap to reveal meaning',
    hideMeaning: 'Hide meaning',
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
    missingAnswer: 'No meaning saved yet. Open the original verse to choose a definition.',
    missingAnswers: count => `${count} saved item${count === 1 ? '' : 's'} need a definition before review. They remain in your Word List.`,
    readInContext: 'Read in context', otherSenses: 'Other saved meanings & contexts',
    languageFallback: language => `Available answer in ${language}`,
    languages: { en: 'English', pa: 'Punjabi', hi: 'Hindi' },
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
    browseRead: 'ਪਾਠ ਵੇਖੋ',
    tapToReveal: 'ਅਰਥ ਵੇਖਣ ਲਈ ਟੈਪ ਕਰੋ',
    hideMeaning: 'ਅਰਥ ਲੁਕਾਓ',
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
    missingAnswer: 'ਹਾਲੇ ਅਰਥ ਨਹੀਂ ਸੰਭਾਲਿਆ। ਅਰਥ ਚੁਣਨ ਲਈ ਮੂਲ ਪੰਕਤੀ ਖੋਲ੍ਹੋ।',
    missingAnswers: count => `${count} ਸੰਭਾਲੇ ਸ਼ਬਦਾਂ ਨੂੰ ਦੁਹਰਾਈ ਤੋਂ ਪਹਿਲਾਂ ਅਰਥ ਦੀ ਲੋੜ ਹੈ। ਇਹ ਸ਼ਬਦ ਸੂਚੀ ਵਿੱਚ ਹਨ।`,
    readInContext: 'ਪੰਕਤੀ ਵਿੱਚ ਪੜ੍ਹੋ', otherSenses: 'ਹੋਰ ਸੰਭਾਲੇ ਅਰਥ ਅਤੇ ਪੰਕਤੀਆਂ',
    languageFallback: language => `ਉਪਲਬਧ ਉੱਤਰ: ${language}`,
    languages: { en: 'ਅੰਗਰੇਜ਼ੀ', pa: 'ਪੰਜਾਬੀ', hi: 'ਹਿੰਦੀ' },
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
    browseRead: 'पाठ देखें',
    tapToReveal: 'अर्थ देखने के लिए टैप करें',
    hideMeaning: 'अर्थ छिपाएँ',
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
    missingAnswer: 'अभी अर्थ सहेजा नहीं गया। अर्थ चुनने के लिए मूल पंक्ति खोलें।',
    missingAnswers: count => `${count} सहेजे शब्दों को रिव्यू से पहले अर्थ चाहिए। वे शब्द सूची में मौजूद हैं।`,
    readInContext: 'पंक्ति में पढ़ें', otherSenses: 'अन्य सहेजे अर्थ और संदर्भ',
    languageFallback: language => `उपलब्ध उत्तर: ${language}`,
    languages: { en: 'अंग्रेज़ी', pa: 'पंजाबी', hi: 'हिंदी' },
  },
}

function timeLabel(entry: VocabEntry, now: number, copy: typeof VOCAB_COPY.en): string {
  const dueAt = entry.review?.dueAt ?? entry.savedAt
  const diff = new Date(dueAt).getTime() - now
  if (diff <= 0) return copy.dueNowLabel
  const days = Math.ceil(diff / 86400000)
  return copy.dueInDays(days)
}

function SavedMeaning({ entry, language, scriptMode, copy }: { entry: VocabEntry | VocabSense; language: string; scriptMode: ScriptMode; copy: typeof VOCAB_COPY.en }) {
  const meaning = getVocabMeaning(entry, language)
  if (!meaning) return <p className="font-sans text-sm leading-6 text-ink/68 dark:text-dark-text/74">{copy.missingAnswer}</p>
  return <div>
    {language !== 'none' && meaning.language !== language ? <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64">{copy.languageFallback(copy.languages[meaning.language])}</p> : null}
    <p lang={meaning.language === 'pa' ? getScriptTextLang(scriptMode) : meaning.language} className={`${meaning.language === 'pa' ? getScriptTextFontClass(scriptMode) : meaning.language === 'hi' ? 'font-devanagari' : 'font-sans'} font-medium leading-relaxed text-ink dark:text-dark-text`}>
      {meaning.language === 'pa' ? renderScriptText(meaning.text, scriptMode) : meaning.text}
    </p>
    {meaning.source ? <p className="mt-1 font-sans text-xs text-ink/68 dark:text-dark-text/64">{meaning.source.name}{meaning.source.entryId ? ` · ${meaning.source.entryId}` : ''}</p> : null}
  </div>
}

function SavedContext({ context, scriptMode, copy }: { context?: VocabContext; scriptMode: ScriptMode; copy: typeof VOCAB_COPY.en }) {
  const path = vocabContextPath(context)
  if (!context?.line && !path) return null
  return <div className="mt-3 space-y-2 border-t border-sand/15 pt-3 dark:border-dark-text/15">
    {context?.line ? <blockquote lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-base leading-relaxed text-ink/80 dark:text-dark-text/85`}>{renderScriptText(context.line, scriptMode)}</blockquote> : null}
    {path ? <Link className="interactive-focus inline-flex min-h-[44px] items-center rounded-lg px-2 font-sans text-sm font-semibold text-gold-dark dark:text-gold-light" to={path}>{copy.readInContext}<span aria-hidden="true"> →</span></Link> : null}
  </div>
}

function OtherSenses({ entry, language, scriptMode, copy }: { entry: VocabEntry; language: string; scriptMode: ScriptMode; copy: typeof VOCAB_COPY.en }) {
  if (!entry.senses?.length) return null
  return <details className="mt-3">
    <summary className="interactive-focus min-h-[44px] cursor-pointer py-3 font-sans text-sm text-gold-dark dark:text-gold-light">{copy.otherSenses} ({entry.senses.length})</summary>
    <div className="space-y-4">{entry.senses.map(sense => <div key={vocabSenseKey(sense)} className="border-t border-sand/15 pt-3 dark:border-dark-text/15">
      <SavedMeaning entry={sense} language={language} scriptMode={scriptMode} copy={copy} />
      <SavedContext context={sense.context} scriptMode={scriptMode} copy={copy} />
    </div>)}</div>
  </details>
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
  const clock = useCurrentTime()
  const [reviewedAt, setReviewedAt] = useState(0)
  const [reviewQueue, setReviewQueue] = useState<string[]>([])
  const now = Math.max(clock, reviewedAt)
  const reviewableWords = useMemo(() => vocab.filter(canReviewVocab), [vocab])

  const dueWords = useMemo(
    () => reviewableWords.filter(entry => new Date(entry.review?.dueAt ?? entry.savedAt).getTime() <= now),
    [now, reviewableWords]
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

        <section className="vocab-empty-layout" aria-labelledby="vocab-empty-title" data-testid="vocab-empty-state">
          <div className="vocab-empty-intro">
            <p className="eyebrow">{copy.savedShelfEyebrow}</p>
            <h1 id="vocab-empty-title" className="mt-2 font-display text-4xl leading-none text-ink dark:text-dark-text">{copy.title}</h1>
            <p lang={getScriptTextLang(scriptMode)} className={`vocab-empty-word ${getScriptTextFontClass(scriptMode)}`} aria-hidden="true">
              {renderScriptText('ਸ਼ਬਦ', scriptMode)}
            </p>
          </div>
          <div className="vocab-empty-action">
            <p className="font-sans text-base font-semibold text-ink dark:text-dark-text">{copy.emptyTitle}</p>
            <p className="mt-3 font-sans text-sm leading-6 text-ink/72 dark:text-dark-text/74">{copy.emptyBody}</p>
            <button
              type="button"
              onClick={() => navigate('/banis')}
              className="interactive-focus mt-5 min-h-[48px] w-full rounded-lg bg-saffron px-4 font-sans text-sm font-semibold text-white"
            >
              {copy.browseRead}
            </button>
          </div>
        </section>
      </div>
    )
  }

  const entriesByKey = new Map(reviewableWords.map(entry => [vocabEntryKey(entry), entry]))
  const reviewPool = mode === 'review'
    ? reviewQueue.flatMap(key => entriesByKey.has(key) ? [entriesByKey.get(key)!] : [])
    : reviewableWords
  const safeIdx = mode === 'review' ? 0 : reviewPool.length > 0 ? cardIdx % reviewPool.length : 0
  const activeCard = reviewPool[safeIdx]

  const handleReview = (rating: 'again' | 'good' | 'easy') => {
    if (!activeCard || !revealed) return
    reviewWord(activeCard.word, rating, activeCard.kind ?? 'word')
    setReviewedAt(Date.now())
    const key = vocabEntryKey(activeCard)
    setReviewQueue(queue => {
      const remaining = queue.filter(item => item !== key && entriesByKey.has(item))
      return rating === 'again' ? [...remaining, key] : remaining
    })
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
        <span className="font-sans text-xs text-ink/68 dark:text-dark-text/64">{copy.dueBadge(dueWords.length)}</span>
      </div>

      <section className="section-shell p-5 mb-4" aria-labelledby="vocab-summary-title" data-testid="vocab-summary">
        <div className="grid grid-cols-3 divide-x divide-sand/15 dark:divide-dark-text/10">
          <div className="px-3 py-2">
            <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/68 dark:text-dark-text/64">{copy.totalSaved}</p>
            <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{vocab.length}</p>
          </div>
          <div className="px-3 py-2">
            <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/68 dark:text-dark-text/64">{copy.dueNow}</p>
            <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{dueWords.length}</p>
          </div>
          <div className="px-3 py-2">
            <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink/68 dark:text-dark-text/64">{copy.phrases}</p>
            <p className="mt-2 font-display text-[2rem] leading-none text-ink dark:text-dark-text">{phraseCount}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-sand/15 pt-4 dark:border-dark-text/10">
          <p id="vocab-summary-title" className="eyebrow">{copy.reviewEyebrow}</p>
          <p className="mt-2 font-sans text-sm leading-6 text-ink/74 dark:text-dark-text/76">
            {dueWords.length > 0 ? copy.reviewReady(dueWords.length) : copy.reviewEmpty}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-parchment-low p-1 dark:bg-dark-surface mb-4">
        {(Object.entries(copy.modes) as Array<[Mode, string]>).map(([nextMode, label]) => (
          <button
            key={nextMode}
            onClick={() => {
              setMode(nextMode); setCardIdx(0); setRevealed(false)
              if (nextMode === 'review') setReviewQueue(useVocabStore.getState().getDueWords().map(vocabEntryKey))
            }}
            aria-pressed={mode === nextMode}
            className={`min-h-[44px] rounded-md px-2 py-2 font-sans text-xs font-medium transition-colors duration-200 ${
              mode === nextMode ? 'bg-saffron text-white' : 'text-ink/68 dark:text-dark-text/68'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {vocab.length > reviewableWords.length ? <p role="status" className="mb-4 font-sans text-sm leading-6 text-ink/75 dark:text-dark-text/75">{copy.missingAnswers(vocab.length - reviewableWords.length)}</p> : null}

      {(mode === 'flashcard' || mode === 'review') ? (
        reviewPool.length === 0 ? (
          <div className="section-shell p-6 text-center">
            <p className="font-sans text-sm text-ink/68 dark:text-dark-text/70">
              {copy.noCards}
            </p>
            <button
              type="button"
              onClick={() => navigate('/banis')}
              className="interactive-focus mt-4 min-h-[44px] rounded-lg border border-sand/20 px-4 font-sans text-sm font-semibold text-ink dark:border-dark-text/15 dark:text-dark-text"
            >
              {copy.browseRead}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 mt-4" data-testid="vocab-review-card">
            <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64 uppercase tracking-wide">
              {safeIdx + 1} of {reviewPool.length}
            </p>
            <button
              type="button"
              onClick={() => setRevealed(r => !r)}
              aria-label={revealed ? copy.hideMeaning : copy.tapToReveal}
              aria-pressed={revealed}
              className="interactive-focus vocab-flashcard w-full section-shell rounded-lg p-5 sm:p-8 flex flex-col items-center min-h-[260px] justify-center gap-4 transition-colors duration-200"
            >
              <p lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} ${(activeCard.kind ?? 'word') === 'phrase' ? 'vocab-review-phrase' : 'vocab-review-word'} text-ink dark:text-dark-text text-center`}>
                {renderScriptText(activeCard.word, scriptMode)}
              </p>
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-gold-dark dark:text-gold-light">
                {(activeCard.kind ?? 'word') === 'phrase' ? copy.phraseReview : copy.wordReview}
              </p>
              <p className="font-sans text-sm text-ink/68 dark:text-dark-text/64">{activeCard.transliteration}</p>
              {revealed ? (
                <div className="text-center">
                  <SavedMeaning entry={activeCard} language={meaningLanguage} scriptMode={scriptMode} copy={copy} />
                  <p className="font-sans text-xs text-gold-dark dark:text-gold-light mt-3">
                    {activeCard.context?.scripture ?? activeCard.scripture}
                    {activeCard.context?.ang ? ` · Ang ${activeCard.context.ang}` : ''}
                  </p>
                </div>
              ) : (
                <p className="font-sans text-xs text-ink/68 dark:text-dark-text/64">{copy.tapToReveal}</p>
              )}
            </button>

            {revealed ? <div className="w-full"><SavedContext context={activeCard.context} scriptMode={scriptMode} copy={copy} /><OtherSenses entry={activeCard} language={meaningLanguage} scriptMode={scriptMode} copy={copy} /></div> : null}

            {mode === 'review' ? (
              <div className="vocab-review-actions grid grid-cols-3 gap-3 w-full">
                <button
                  onClick={() => handleReview('again')}
                  disabled={!revealed}
                  className="disabled:opacity-40 py-3 rounded-lg bg-parchment-low dark:bg-dark-surface font-sans text-sm text-ink/70 dark:text-dark-text/70 min-h-[44px]"
                >
                  {copy.again}
                </button>
                <button
                  onClick={() => handleReview('good')}
                  disabled={!revealed}
                  className="disabled:opacity-40 py-3 rounded-lg bg-gold/15 text-gold-dark dark:text-gold-light font-sans text-sm font-semibold min-h-[44px]"
                >
                  {copy.good}
                </button>
                <button
                  onClick={() => handleReview('easy')}
                  disabled={!revealed}
                  className="disabled:opacity-40 py-3 rounded-lg bg-saffron text-white font-sans text-sm font-semibold min-h-[44px]"
                >
                  {copy.easy}
                </button>
              </div>
            ) : (
              <div className="vocab-review-actions flex gap-3 w-full">
                <button
                  onClick={() => { setCardIdx(i => Math.max(0, i - 1)); setRevealed(false) }}
                  disabled={safeIdx === 0}
                  className="min-h-[44px] flex-1 rounded-lg bg-parchment-low py-3 font-sans text-sm text-ink/70 disabled:opacity-30 dark:bg-dark-surface dark:text-dark-text/70"
                >
                  &#8592; {copy.prev}
                </button>
                <button
                  onClick={() => { setCardIdx(i => i + 1); setRevealed(false) }}
                  disabled={safeIdx === reviewPool.length - 1}
                  className="min-h-[44px] flex-1 rounded-lg bg-saffron py-3 font-sans text-sm font-semibold text-white disabled:opacity-30"
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
                  <div className="flex flex-col items-start gap-2 mb-0.5">
                    <span lang={getScriptTextLang(scriptMode)} className={`${getScriptTextFontClass(scriptMode)} text-xl text-ink dark:text-dark-text`}>
                      {renderScriptText(entry.word, scriptMode)}
                    </span>
                    <span className="font-sans text-xs text-ink/68 dark:text-dark-text/64">{entry.transliteration}</span>
                  </div>
                  <SavedMeaning entry={entry} language={meaningLanguage} scriptMode={scriptMode} copy={copy} />
                  <p className="font-sans text-[10px] text-saffron dark:text-saffron-light mt-1">
                    {(entry.kind ?? 'word') === 'phrase' ? copy.phraseReview : copy.wordReview}
                    {' · '}
                    {(entry.context?.scripture ?? entry.scripture)}
                    {entry.context?.ang ? ` · Ang ${entry.context.ang}` : ''}
                    {entry.context?.line ? ` · ${copy.verseSavedFrom}` : ''}
                  </p>
                  <p className="font-sans text-[10px] text-ink/68 dark:text-dark-text/64 mt-1">
                    {canReviewVocab(entry) ? timeLabel(entry, now, copy) : ''}
                  </p>
                  <SavedContext context={entry.context} scriptMode={scriptMode} copy={copy} />
                  <OtherSenses entry={entry} language={meaningLanguage} scriptMode={scriptMode} copy={copy} />
                </div>
                <button
                  onClick={() => removeWord(entry.word, entry.kind ?? 'word')}
                  className="text-ink/75 dark:text-dark-text/80 font-sans text-xs min-h-[44px] min-w-[44px] flex items-center justify-center"
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
