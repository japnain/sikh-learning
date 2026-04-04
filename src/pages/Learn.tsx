import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GURMUKHI_LETTERS, GURMUKHI_VOWELS, type GurmukhiLetter } from '../data/gurmukhi'

type Tab = 'letters' | 'vowels' | 'practice'

function LetterCard({ letter, onSelect, selected }: {
  letter: GurmukhiLetter
  onSelect: (l: GurmukhiLetter) => void
  selected: boolean
}) {
  return (
    <button
      onClick={() => onSelect(letter)}
      className={`flex flex-col items-center justify-center rounded-xl p-2 min-h-[64px] border transition-colors duration-300 ${
        selected
          ? 'bg-saffron text-white border-saffron'
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

  // Practice mode state
  const [practiceIdx, setPracticeIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const practiceList = [...GURMUKHI_LETTERS, ...GURMUKHI_VOWELS]
    .sort(() => Math.random() - 0.5)

  const letters = tab === 'vowels' ? GURMUKHI_VOWELS : GURMUKHI_LETTERS

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-parchment dark:bg-dark-bg transition-colors duration-300">
      <div className="flex items-center gap-3 mb-4 mt-4">
        <button onClick={() => navigate(-1)} className="text-saffron dark:text-saffron-light font-sans text-sm min-h-[44px] min-w-[44px]">
          &#8592; Back
        </button>
        <h1 className="font-sans font-semibold text-lg text-ink dark:text-dark-text">ਪੈਂਤੀ · Learn Gurmukhi</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['letters', 'vowels', 'practice'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected(null); setRevealed(false); setPracticeIdx(0) }}
            className={`flex-1 py-2 rounded-xl font-sans text-xs font-medium capitalize transition-colors duration-300 ${
              tab === t ? 'bg-saffron text-white' : 'bg-parchment-card dark:bg-dark-card text-ink/60 dark:text-dark-text/60'
            }`}
          >
            {t === 'letters' ? 'Letters' : t === 'vowels' ? 'Vowels' : 'Practice'}
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
            className="w-full bg-parchment-card dark:bg-dark-card rounded-2xl p-8 flex flex-col items-center cursor-pointer border border-sand/15 dark:border-dark-text/10 min-h-[200px] justify-center gap-4 transition-colors duration-300"
          >
            <span lang="pa-Guru" className="font-gurmukhi text-7xl text-ink dark:text-dark-text">
              {practiceList[practiceIdx % practiceList.length].gurmukhi}
            </span>
            {revealed ? (
              <div className="text-center">
                <p className="font-sans font-semibold text-ink dark:text-dark-text">{practiceList[practiceIdx % practiceList.length].name}</p>
                <p className="font-sans text-sm text-ink/60 dark:text-dark-text/60">{practiceList[practiceIdx % practiceList.length].pronunciation}</p>
                <p lang="pa-Guru" className="font-gurmukhi text-saffron dark:text-saffron-light mt-2">
                  {practiceList[practiceIdx % practiceList.length].example}
                </p>
                <p className="font-sans text-xs text-ink/50 dark:text-dark-text/50">
                  {practiceList[practiceIdx % practiceList.length].exampleMeaning}
                </p>
              </div>
            ) : (
              <p className="font-sans text-xs text-ink/40 dark:text-dark-text/40">Tap to reveal</p>
            )}
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setPracticeIdx(i => Math.max(0, i - 1)); setRevealed(false) }}
              disabled={practiceIdx === 0}
              className="flex-1 py-3 rounded-2xl bg-parchment-low dark:bg-dark-surface font-sans text-sm text-ink/70 dark:text-dark-text/70 disabled:opacity-30 min-h-[44px] transition-colors duration-300"
            >← Prev</button>
            <button
              onClick={() => { setPracticeIdx(i => i + 1); setRevealed(false) }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-saffron to-saffron-light text-white font-sans text-sm font-semibold min-h-[44px] transition-colors duration-300"
            >Next →</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {letters.map(l => (
              <LetterCard
                key={l.gurmukhi}
                letter={l}
                onSelect={setSelected}
                selected={selected?.gurmukhi === l.gurmukhi}
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
            </div>
          )}
        </>
      )}
    </div>
  )
}
