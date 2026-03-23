import type { ScriptureEntry, VocabEntry } from '../types'

export interface Question {
  type: 'gurmukhi-to-english' | 'english-to-gurmukhi' | 'flashcard'
  prompt: string
  correctAnswer: string
  options: string[]
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function getDistractors(
  allEntries: ScriptureEntry[],
  excludeWord: string,
  field: 'meaning_en' | 'gurmukhi',
  count: number
): string[] {
  const pool = allEntries
    .flatMap(e => e.words)
    .map(w => w[field])
    .filter(v => v !== excludeWord)
  return shuffle([...new Set(pool)]).slice(0, count)
}

export function generateQuiz(
  studiedEntries: ScriptureEntry[],
  vocabEntries: VocabEntry[]
): Question[] {
  if (studiedEntries.length < 4) return []

  const questions: Question[] = []
  const allWords = studiedEntries.flatMap(e => e.words)
  const shuffledWords = shuffle(allWords)

  for (let i = 0; i < 10; i++) {
    const word = shuffledWords[i % shuffledWords.length]
    const qType = i % 3

    if (qType === 0) {
      const distractors = getDistractors(studiedEntries, word.meaning_en, 'meaning_en', 3)
      questions.push({
        type: 'gurmukhi-to-english',
        prompt: word.gurmukhi,
        correctAnswer: word.meaning_en,
        options: shuffle([word.meaning_en, ...distractors]),
      })
    } else if (qType === 1) {
      const distractors = getDistractors(studiedEntries, word.gurmukhi, 'gurmukhi', 3)
      questions.push({
        type: 'english-to-gurmukhi',
        prompt: word.meaning_en,
        correctAnswer: word.gurmukhi,
        options: shuffle([word.gurmukhi, ...distractors]),
      })
    } else {
      const vocabWord = vocabEntries[i % Math.max(vocabEntries.length, 1)]
      const fw = vocabWord ?? word
      questions.push({
        type: 'flashcard',
        prompt: (fw as any).gurmukhi ?? (fw as any).word,
        correctAnswer: fw.meaning_en,
        options: [],
      })
    }
  }

  return questions
}
