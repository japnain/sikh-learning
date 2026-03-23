import { describe, it, expect } from 'vitest'
import { generateQuiz } from './quiz'
import type { ScriptureEntry } from '../types'

const makeEntry = (id: string, wordCount = 3): ScriptureEntry => ({
  id, scripture: 'SGGS', ang: 1,
  gurmukhi: 'test', transliteration: 'test',
  translation_en: 'test', translation_pa: 'test',
  words: Array.from({ length: wordCount }, (_, i) => ({
    gurmukhi: `word-${id}-${i}`,
    transliteration: `trans-${id}-${i}`,
    meaning_en: `meaning-${id}-${i}`,
    meaning_pa: `meaning-pa-${id}-${i}`,
  }))
})

describe('generateQuiz', () => {
  it('returns empty array when fewer than 4 studied entries', () => {
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')]
    expect(generateQuiz(entries, [])).toHaveLength(0)
  })

  it('returns 10 questions with 4+ studied entries', () => {
    const entries = Array.from({ length: 6 }, (_, i) => makeEntry(`e${i}`))
    const questions = generateQuiz(entries, [])
    expect(questions).toHaveLength(10)
  })

  it('each MC question has exactly 4 options', () => {
    const entries = Array.from({ length: 6 }, (_, i) => makeEntry(`e${i}`))
    const questions = generateQuiz(entries, [])
    const mcQuestions = questions.filter(q => q.type !== 'flashcard')
    mcQuestions.forEach(q => {
      expect(q.options).toHaveLength(4)
    })
  })

  it('correct answer is always in options', () => {
    const entries = Array.from({ length: 6 }, (_, i) => makeEntry(`e${i}`))
    const questions = generateQuiz(entries, [])
    questions.filter(q => q.type !== 'flashcard').forEach(q => {
      expect(q.options).toContain(q.correctAnswer)
    })
  })
})
