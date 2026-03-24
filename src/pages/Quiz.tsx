import { useState, useMemo } from 'react'
import { useProgressStore } from '../store/progress'
import { useVocabStore } from '../store/vocab'
import { ALL_ENTRIES } from '../data'
import { useScriptureCacheStore } from '../store/scriptureCache'
import { generateQuiz } from '../utils/quiz'
import type { Question } from '../utils/quiz'
import type { ScriptureEntry } from '../types'

export default function Quiz() {
  const { studied } = useProgressStore()
  const { vocab } = useVocabStore()
  const { getEntryById } = useScriptureCacheStore()

  const studiedIds = studied.map(s => s.id)
  const studiedEntries = studiedIds
    .map(id => ALL_ENTRIES.find(e => e.id === id) ?? getEntryById(id))
    .filter((e): e is ScriptureEntry => e !== undefined)
  const questions = useMemo(() => generateQuiz(studiedEntries, vocab), [studied.length, vocab.length])

  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (questions.length === 0) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20">
        <p className="text-2xl mb-3">📖</p>
        <p className="text-white font-medium mb-2">Study first</p>
        <p className="text-gray-400 text-sm">Complete at least 4 passages in Study to unlock Quiz.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="p-4 max-w-md mx-auto text-center mt-20">
        <p className="text-4xl mb-4">{score >= 7 ? '🏆' : score >= 5 ? '⭐' : '📚'}</p>
        <p className="text-white font-semibold text-xl mb-2">{score} / {questions.length}</p>
        <p className="text-gray-400 text-sm mb-6">{score >= 7 ? 'Excellent!' : score >= 5 ? 'Good work!' : 'Keep studying!'}</p>
        <button
          onClick={() => { setQIndex(0); setSelected(null); setRevealed(false); setScore(0); setDone(false) }}
          className="bg-[#C9A84C] text-black font-semibold px-6 py-3 rounded-2xl min-h-[44px]"
        >Try Again</button>
      </div>
    )
  }

  const q: Question = questions[qIndex]

  const handleAnswer = (answer: string) => {
    if (revealed) return
    setSelected(answer)
    setRevealed(true)
    if (answer === q.correctAnswer) setScore(s => s + 1)
  }

  const handleNext = () => {
    if (qIndex + 1 >= questions.length) {
      setDone(true)
    } else {
      setQIndex(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto mt-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-500 text-xs">{qIndex + 1} / {questions.length}</p>
        <p className="text-[#C9A84C] text-xs font-medium">{score} correct</p>
      </div>
      <div className="w-full bg-[#2a2a2a] rounded-full h-1 mb-6">
        <div className="bg-[#C9A84C] h-1 rounded-full transition-all" style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-xs mb-3 uppercase tracking-wider">
          {q.type === 'gurmukhi-to-english' ? 'What does this mean?' :
           q.type === 'english-to-gurmukhi' ? 'Which Gurmukhi word?' : 'Flashcard'}
        </p>
        <p lang="pa-Guru" className="font-gurmukhi text-white text-3xl leading-relaxed" style={{ fontSize: '28px' }}>
          {q.prompt}
        </p>
      </div>

      {q.type === 'flashcard' ? (
        <div>
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-4 bg-[#1A1A1A] border border-[#2a2a2a] rounded-2xl text-white font-medium min-h-[44px]"
            >Tap to Reveal</button>
          ) : (
            <div>
              <div className="bg-[#1A1A1A] border border-[#C9A84C] rounded-2xl p-4 mb-4 text-center">
                <p className="text-white font-medium">{q.correctAnswer}</p>
              </div>
              <button onClick={handleNext} className="w-full py-3 bg-[#C9A84C] text-black font-semibold rounded-2xl min-h-[44px]">Next →</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {q.options.map(option => {
            let style = 'bg-[#1A1A1A] border-[#2a2a2a] text-white'
            if (revealed) {
              if (option === q.correctAnswer) style = 'bg-green-900 border-green-500 text-white'
              else if (option === selected) style = 'bg-red-900 border-red-500 text-white'
            }
            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                className={`border rounded-2xl p-4 text-left text-sm font-medium min-h-[44px] transition-colors ${style}`}
              >
                <span
                  lang={q.type === 'english-to-gurmukhi' ? 'pa-Guru' : undefined}
                  className={q.type === 'english-to-gurmukhi' ? 'font-gurmukhi text-xl' : ''}
                  style={q.type === 'english-to-gurmukhi' ? { fontSize: '20px' } : undefined}
                >{option}</span>
              </button>
            )
          })}
          {revealed && (
            <button onClick={handleNext} className="w-full py-3 bg-[#C9A84C] text-black font-semibold rounded-2xl mt-2 min-h-[44px]">
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
