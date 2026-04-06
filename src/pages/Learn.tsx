import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GURMUKHI_LETTERS, GURMUKHI_VOWELS, type GurmukhiLetter } from '../data/gurmukhi'
import { LEARNING_BRIDGE_ITEMS } from '../data/learningBridge'
import { useLearningStore } from '../store/learning'
import { useOnboardingStore } from '../store/onboarding'
import { LEARNING_LEVEL_LABELS } from '../utils/translations'

type Tab = 'letters' | 'vowels' | 'practice' | 'bridge'

function LetterCard({ letter, onSelect, selected, mastered }: {
  letter: GurmukhiLetter
  onSelect: (l: GurmukhiLetter) => void
  selected: boolean
  mastered: boolean
}) {
  return (
    <button
      onClick={() => onSelect(letter)}
      className={`flex flex-col items-center justify-center rounded-2xl p-3 min-h-[78px] border transition-colors duration-300 ${
        selected
          ? 'bg-saffron text-white border-saffron'
          : mastered
            ? 'bg-gold/10 dark:bg-gold/10 border-gold/20 text-ink dark:text-dark-text'
            : 'bg-white/70 dark:bg-dark-card/75 border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
      }`}
    >
      <span lang="pa-Guru" className="font-gurmukhi text-2xl leading-none">{letter.gurmukhi}</span>
      <span className="font-sans text-[9px] mt-1 opacity-70 uppercase tracking-[0.14em]">{letter.name}</span>
    </button>
  )
}

export default function Learn() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('letters')
  const [selected, setSelected] = useState<GurmukhiLetter | null>(null)
  const [practiceIdx, setPracticeIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const {
    masteredSymbols,
    completedLessons,
    practiceStreak,
    totalPracticeSessions,
    toggleMasteredSymbol,
    completeLesson,
    recordPracticeSession,
  } = useLearningStore()
  const learningLevel = useOnboardingStore(s => s.learningLevel)

  const practiceList = useMemo(
    () => [...GURMUKHI_LETTERS, ...GURMUKHI_VOWELS].sort(() => Math.random() - 0.5),
    []
  )

  const letters = tab === 'vowels' ? GURMUKHI_VOWELS : GURMUKHI_LETTERS
  const activePractice = practiceList[practiceIdx % practiceList.length]

  const handleSelect = (letter: GurmukhiLetter) => {
    setSelected(letter)
    completeLesson(tab === 'vowels' ? 'vowels' : 'letters')
  }

  const handlePracticeResult = (mastered: boolean) => {
    recordPracticeSession()
    completeLesson('practice')
    if (mastered) toggleMasteredSymbol(activePractice.gurmukhi)
    setPracticeIdx(index => index + 1)
    setRevealed(false)
  }

  const masteredCount = masteredSymbols.length
  const completionPct = Math.round((masteredCount / (GURMUKHI_LETTERS.length + GURMUKHI_VOWELS.length)) * 100)
  const recommendedTab: Tab =
    learningLevel === 'beginner' ? 'letters' :
    learningLevel === 'familiar' ? 'practice' :
    'bridge'

  return (
    <div className="page-shell">
      <div className="mb-5">
        <button onClick={() => navigate(-1)} className="font-sans text-sm text-gold dark:text-gold-light min-h-[44px]">
          &#8592; Back
        </button>
        <p className="eyebrow mt-3">Grow</p>
        <h1 className="font-display text-4xl leading-none text-ink dark:text-dark-text mt-2">Learn your way into Gurbani.</h1>
        <p className="font-sans text-sm leading-6 text-ink/65 dark:text-dark-text/65 mt-3">
          The goal is not memorizing isolated letters. It is moving from recognition into real reading with confidence.
        </p>
      </div>

      <section className="hero-surface p-5 mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Current Track</p>
            <p className="font-sans text-lg font-semibold text-ink dark:text-dark-text mt-2">
              {LEARNING_LEVEL_LABELS[learningLevel]}
            </p>
            <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2 max-w-[30ch]">
              {learningLevel === 'beginner'
                ? 'Start with letters and vowels, then move into guided recognition drills.'
                : learningLevel === 'familiar'
                  ? 'Tighten recognition speed, then move into real Gurbani lines with less scaffolding.'
                  : 'Use Gurbani bridge work as your main lane and return to symbols only when you hit weak spots.'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl text-ink dark:text-dark-text">{completionPct}%</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45">Mastery</p>
          </div>
        </div>
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{masteredCount}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Symbols</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{completedLessons.length}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Lessons</p>
          </div>
          <div className="section-shell-quiet px-3 py-3">
            <p className="font-sans text-2xl text-ink dark:text-dark-text">{practiceStreak}</p>
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-ink/45 dark:text-dark-text/45 mt-1">Streak</p>
          </div>
        </div>
        {tab !== recommendedTab && (
          <button
            onClick={() => setTab(recommendedTab)}
            className="mt-4 font-sans text-sm text-gold dark:text-gold-light underline underline-offset-2"
          >
            Jump to the recommended next step
          </button>
        )}
      </section>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {(['letters', 'vowels', 'practice', 'bridge'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected(null); setRevealed(false); setPracticeIdx(0) }}
            className={`py-3 rounded-2xl font-sans text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-300 ${
              tab === t ? 'bg-saffron text-white' : 'section-shell text-ink/60 dark:text-dark-text/60'
            }`}
          >
            {t === 'bridge' ? 'Gurbani' : t}
          </button>
        ))}
      </div>

      {tab === 'practice' ? (
        <div className="animate-slide-up">
          <div className="section-shell p-5 text-center">
            <p className="eyebrow">Recognition Drill</p>
            <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-2 uppercase tracking-[0.18em]">
              Card {(practiceIdx % practiceList.length) + 1} of {practiceList.length}
            </p>
            <button
              onClick={() => setRevealed(r => !r)}
              className="w-full section-shell-quiet rounded-[28px] p-8 min-h-[260px] flex flex-col items-center justify-center gap-4 mt-4"
            >
              <span lang="pa-Guru" className="font-gurmukhi text-7xl text-ink dark:text-dark-text">
                {activePractice.gurmukhi}
              </span>
              {revealed ? (
                <div className="text-center">
                  <p className="font-sans font-semibold text-ink dark:text-dark-text">{activePractice.name}</p>
                  <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">{activePractice.pronunciation}</p>
                  <p lang="pa-Guru" className="font-gurmukhi text-saffron dark:text-saffron-light mt-3 text-2xl">
                    {activePractice.example}
                  </p>
                  <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 mt-2">
                    {activePractice.exampleMeaning}
                  </p>
                </div>
              ) : (
                <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40 uppercase tracking-[0.18em]">
                  Tap to reveal
                </p>
              )}
            </button>
            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <button
                onClick={() => handlePracticeResult(false)}
                className="py-3 rounded-2xl section-shell-quiet font-sans text-sm text-ink/70 dark:text-dark-text/70 min-h-[44px]"
              >
                Review Again
              </button>
              <button
                onClick={() => handlePracticeResult(true)}
                className="py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px]"
              >
                I Know This
              </button>
            </div>
            <p className="font-sans text-[11px] text-ink/40 dark:text-dark-text/40 mt-4">
              {totalPracticeSessions} total practice sessions completed
            </p>
          </div>
        </div>
      ) : tab === 'bridge' ? (
        <div className="space-y-3 animate-slide-up">
          <div className="section-shell p-4">
            <p className="eyebrow">Gurbani Bridge</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-2">
              Move from drills into short real pankti, then open the full reader with one tap.
            </p>
          </div>
          {LEARNING_BRIDGE_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                completeLesson('bridge')
                navigate(`/study?source=${item.source}&ang=${item.ang}&bani=${encodeURIComponent(item.title)}`)
              }}
              className="w-full text-left section-shell p-5"
            >
              <p className="eyebrow">
                {item.title} · {item.scripture} · Ang {item.ang}
              </p>
              <p lang="pa-Guru" className="font-gurmukhi text-2xl text-ink dark:text-dark-text leading-relaxed mt-3">
                {item.gurmukhi}
              </p>
              <p className="font-sans text-sm italic text-ink/55 dark:text-dark-text/55 mt-3">
                {item.transliteration}
              </p>
              <p className="font-sans text-sm text-ink/80 dark:text-dark-text/80 mt-2">
                {item.meaning}
              </p>
              <p className="font-sans text-xs text-ink/45 dark:text-dark-text/45 mt-3">
                {item.focus}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="animate-slide-up">
          <div className="section-shell p-4 mb-4">
            <p className="eyebrow">{tab === 'letters' ? 'Letters' : 'Vowels'}</p>
            <p className="font-sans text-sm text-ink dark:text-dark-text mt-2">
              Tap one symbol to study pronunciation, example usage, and mark mastery when it feels stable.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-4">
            {letters.map(l => (
              <LetterCard
                key={l.gurmukhi}
                letter={l}
                onSelect={handleSelect}
                selected={selected?.gurmukhi === l.gurmukhi}
                mastered={masteredSymbols.includes(l.gurmukhi)}
              />
            ))}
          </div>

          {selected && (
            <div className="section-shell p-5">
              <div className="flex items-start gap-4 mb-4">
                <span lang="pa-Guru" className="font-gurmukhi text-6xl text-saffron dark:text-saffron-light leading-none">{selected.gurmukhi}</span>
                <div>
                  <p className="font-sans font-semibold text-ink dark:text-dark-text">{selected.name}</p>
                  <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">{selected.pronunciation}</p>
                </div>
              </div>
              <div className="section-shell-quiet p-4">
                <p className="eyebrow mb-2">Example from Gurbani</p>
                <p lang="pa-Guru" className="font-gurmukhi text-2xl text-ink dark:text-dark-text">{selected.example}</p>
                <p className="font-sans text-sm text-ink/65 dark:text-dark-text/65 mt-2">{selected.exampleMeaning}</p>
              </div>
              <button
                onClick={() => toggleMasteredSymbol(selected.gurmukhi)}
                className={`w-full mt-4 py-3 rounded-2xl font-sans text-sm font-semibold min-h-[44px] ${
                  masteredSymbols.includes(selected.gurmukhi)
                    ? 'bg-gold/15 text-gold dark:text-gold-light'
                    : 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                }`}
              >
                {masteredSymbols.includes(selected.gurmukhi) ? 'Marked as Mastered' : 'Mark as Mastered'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
