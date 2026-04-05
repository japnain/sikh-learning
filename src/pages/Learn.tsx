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
      className={`flex flex-col items-center justify-center rounded-xl p-2 min-h-[68px] border transition-colors duration-300 ${
        selected
          ? 'bg-saffron text-white border-saffron'
          : mastered
            ? 'bg-gold/10 dark:bg-gold/10 border-gold/20 text-ink dark:text-dark-text'
            : 'bg-parchment-card dark:bg-dark-card border-sand/15 dark:border-dark-text/10 text-ink dark:text-dark-text'
      }`}
    >
      <span lang="pa-Guru" className="font-gurmukhi text-2xl leading-none">{letter.gurmukhi}</span>
      <span className="font-sans text-[9px] mt-1 opacity-70">{letter.name}</span>
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
    if (mastered) {
      toggleMasteredSymbol(activePractice.gurmukhi)
    }
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
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300">
      <div className="flex items-center gap-3 mb-4 mt-4">
        <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px]">
          &#8592; Back
        </button>
        <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text">ਪੈਂਤੀ · Learn Gurmukhi</h1>
      </div>

      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-4 border border-sand/15 dark:border-dark-text/10">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-2">Progress</p>
        <p className="font-sans text-sm text-ink dark:text-dark-text">
          {masteredCount} symbols mastered · {completedLessons.length} lessons complete · {practiceStreak} day practice streak
        </p>
        <div className="h-1.5 bg-sand/20 dark:bg-dark-text/10 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-saffron to-saffron-light rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="font-sans text-[10px] text-ink/45 dark:text-dark-text/45 mt-2">
          {totalPracticeSessions} total practice sessions
        </p>
      </div>

      <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 mb-4 border border-sand/15 dark:border-dark-text/10">
        <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-wide mb-2">Current Track</p>
        <p className="font-sans text-sm text-ink dark:text-dark-text">
          {LEARNING_LEVEL_LABELS[learningLevel]}
        </p>
        <p className="font-sans text-xs text-ink/55 dark:text-dark-text/55 mt-1">
          {learningLevel === 'beginner'
            ? 'Start with letters and vowels, then move into guided recognition drills.'
            : learningLevel === 'familiar'
              ? 'Use practice mode to tighten recognition speed before moving into live pankti.'
              : 'Work mainly from Gurbani bridge items and use letters only when you hit weak spots.'}
        </p>
        {tab !== recommendedTab && (
          <button
            onClick={() => setTab(recommendedTab)}
            className="mt-3 font-sans text-xs text-saffron dark:text-saffron-light underline underline-offset-2"
          >
            Jump to recommended track
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {(['letters', 'vowels', 'practice', 'bridge'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected(null); setRevealed(false); setPracticeIdx(0) }}
            className={`py-2 rounded-xl font-sans text-xs font-medium capitalize transition-colors duration-300 ${
              tab === t ? 'bg-saffron text-white' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60'
            }`}
          >
            {t === 'bridge' ? 'Gurbani' : t}
          </button>
        ))}
      </div>

      {tab === 'practice' ? (
        <div className="flex flex-col items-center gap-6 mt-8">
          <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50 uppercase tracking-wide">
            Card {(practiceIdx % practiceList.length) + 1} of {practiceList.length}
          </p>
          <div
            onClick={() => setRevealed(r => !r)}
            className="w-full bg-parchment-card dark:bg-dark-card rounded-2xl p-8 flex flex-col items-center cursor-pointer border border-sand/15 dark:border-dark-text/10 min-h-[220px] justify-center gap-4 transition-colors duration-300"
          >
            <span lang="pa-Guru" className="font-gurmukhi text-7xl text-ink dark:text-dark-text">
              {activePractice.gurmukhi}
            </span>
            {revealed ? (
              <div className="text-center">
                <p className="font-sans font-semibold text-ink dark:text-dark-text">{activePractice.name}</p>
                <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">{activePractice.pronunciation}</p>
                <p lang="pa-Guru" className="font-gurmukhi text-saffron dark:text-saffron-light mt-2">
                  {activePractice.example}
                </p>
                <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50">
                  {activePractice.exampleMeaning}
                </p>
              </div>
            ) : (
              <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40">Tap to reveal</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => handlePracticeResult(false)}
              className="py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface font-sans text-sm text-ink/70 dark:text-dark-text/70 min-h-[44px] transition-colors duration-300"
            >
              Review Again
            </button>
            <button
              onClick={() => handlePracticeResult(true)}
              className="py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] transition-colors duration-300"
            >
              I Know This
            </button>
          </div>
        </div>
      ) : tab === 'bridge' ? (
        <div className="space-y-3">
          <div className="bg-parchment-low dark:bg-dark-surface rounded-2xl p-4 border border-sand/15 dark:border-dark-text/10">
            <p className="font-sans text-sm text-ink dark:text-dark-text">
              Read short real pankti with translation support, then jump straight into Study.
            </p>
          </div>
          {LEARNING_BRIDGE_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                completeLesson('bridge')
                navigate(`/study?source=${item.source}&ang=${item.ang}&bani=${encodeURIComponent(item.title)}`)
              }}
              className="w-full text-left bg-parchment-card dark:bg-dark-card rounded-2xl p-4 border border-sand/15 dark:border-dark-text/10"
            >
              <p className="font-sans text-xs text-gold dark:text-gold-light uppercase tracking-[0.18em]">
                {item.title} · {item.scripture} · Ang {item.ang}
              </p>
              <p lang="pa-Guru" className="font-gurmukhi text-xl text-ink dark:text-dark-text leading-relaxed mt-2">
                {item.gurmukhi}
              </p>
              <p className="font-sans text-sm italic text-ink/55 dark:text-dark-text/55 mt-2">
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
        <>
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
            <div className="bg-parchment-card dark:bg-dark-card rounded-2xl p-5 border border-sand/15 dark:border-dark-text/10 transition-colors duration-300">
              <div className="flex items-start gap-4 mb-3">
                <span lang="pa-Guru" className="font-gurmukhi text-5xl text-saffron dark:text-saffron-light leading-none">{selected.gurmukhi}</span>
                <div>
                  <p className="font-sans font-semibold text-ink dark:text-dark-text">{selected.name}</p>
                  <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">{selected.pronunciation}</p>
                </div>
              </div>
              <div className="bg-parchment-low dark:bg-dark-surface rounded-xl p-3">
                <p className="font-sans text-xs text-saffron dark:text-saffron-light uppercase tracking-wide mb-1">Example from Gurbani</p>
                <p lang="pa-Guru" className="font-gurmukhi text-xl text-ink dark:text-dark-text">{selected.example}</p>
                <p className="font-sans text-xs text-ink/60 dark:text-dark-text/60 mt-1">{selected.exampleMeaning}</p>
              </div>
              <button
                onClick={() => toggleMasteredSymbol(selected.gurmukhi)}
                className={`w-full mt-4 py-3 rounded-2xl font-sans text-sm font-semibold min-h-[44px] transition-colors duration-300 ${
                  masteredSymbols.includes(selected.gurmukhi)
                    ? 'bg-gold/15 text-gold dark:text-gold-light'
                    : 'bg-gradient-to-r from-saffron to-saffron-light text-white'
                }`}
              >
                {masteredSymbols.includes(selected.gurmukhi) ? 'Marked as Mastered' : 'Mark as Mastered'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
