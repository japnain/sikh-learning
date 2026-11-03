import { describe, expect, test } from 'vitest'
import { planEnglishSearchIntent } from './englishSearchIntent'

describe('English retrieval intent', () => {
  test.each([
    ['Gurbani about overcoming anxiety', 'anxiety', 'Worry and anxiety'],
    ['What does Gurbani say about anger?', 'anger', 'Anger'],
    ['Please show me verses from Sri Guru Granth Sahib Ji about compassion', 'compassion', 'Compassion'],
    ['Find Gurbani passages related to humility', 'humility', 'Humility'],
    ['How can I deal with worry through Gurbani?', 'worry', 'Worry and anxiety'],
    ['How to develop patience', 'patience', 'Patience'],
    ['Help me with grief', 'grief', 'Grief and sorrow'],
  ])('extracts a transparent retrieval topic from %s', (query, literalQuery, topicLabel) => {
    const plan = planEnglishSearchIntent(query)
    expect(plan).toMatchObject({ literalQuery, topicLabel, isNaturalLanguage: true })
    expect(plan.terms[0]).toBe(literalQuery)
    expect(plan.terms.length).toBeLessThanOrEqual(3)
  })

  test('keeps a plain lexical query first and discloses alternatives', () => {
    expect(planEnglishSearchIntent('mercy')).toEqual({
      literalQuery: 'mercy', terms: ['mercy', 'compassion', 'kindness'],
      topicLabel: 'Compassion', isNaturalLanguage: false,
    })
    expect(planEnglishSearchIntent('Peace').terms).toEqual(['Peace', 'tranquility', 'calm'])
  })

  test.each(['worry', 'anger', 'grief', 'compassion', 'humility', 'gratitude', 'courage', 'equality',
    'service', 'ego', 'attachment', 'forgiveness', 'truth', 'peace', 'death', 'trust',
    'joy', 'contentment', 'love', 'hope', 'greed', 'patience', 'wisdom', 'loneliness'])('offers bounded distinct lexical alternatives for %s', word => {
    const plan = planEnglishSearchIntent(word)
    expect(plan.topicLabel).toBeTruthy()
    expect(plan.terms[0]).toBe(word)
    expect(plan.terms.length).toBeLessThanOrEqual(3)
    expect(new Set(plan.terms.map(term => term.toLowerCase())).size).toBe(plan.terms.length)
  })

  test.each(['without fear', 'no faith', 'do not fear', 'without anger', 'never angry',
    "don't worry", 'don’t worry', 'cannot forgive', 'stop anger', 'avoid greed', '-anger', 'not anxity'])('preserves negation and does not expand %s', query => {
    expect(planEnglishSearchIntent(query)).toEqual({ literalQuery: query, terms: [query], isNaturalLanguage: false })
  })

  test('removes only a neutral question wrapper around a negative phrase', () => {
    expect(planEnglishSearchIntent('What does Gurbani say about no faith?')).toEqual({
      literalQuery: 'no faith', terms: ['no faith'], isNaturalLanguage: true,
    })
    expect(planEnglishSearchIntent('Gurbani about not overcoming anger')).toEqual({
      literalQuery: 'not overcoming anger', terms: ['not overcoming anger'], isNaturalLanguage: true,
    })
  })

  test.each(['"compassion"', '“without fear”', "'peace'", '"  peace   and joy  "', '"anxity"', '"unclosed phrase'])('preserves quote syntax exactly in %s', query => {
    expect(planEnglishSearchIntent(query)).toEqual({ literalQuery: query, terms: [query], isNaturalLanguage: false })
  })

  test('preserves an explicitly quoted phrase inside a question', () => {
    expect(planEnglishSearchIntent('What does Gurbani say about "without fear"?')).toEqual({
      literalQuery: '"without fear"', terms: ['"without fear"'], isNaturalLanguage: true,
    })
  })

  test.each([
    ['anxity', 'anxiety'], ['compasion', 'compassion'], ['paitence', 'patience'],
    ['forgivness', 'forgiveness'], ['eqaulity', 'equality'], ['lonliness', 'loneliness'],
  ])('discloses a known misspelling %s', (query, correction) => {
    const plan = planEnglishSearchIntent(query)
    expect(plan).toMatchObject({ literalQuery: correction, correctedFrom: query, isNaturalLanguage: false })
    expect(plan.terms[0]).toBe(correction)
  })

  test('corrects a known theme typo inside a conversational question', () => {
    expect(planEnglishSearchIntent('Gurbani about overcoming anxity')).toMatchObject({
      literalQuery: 'anxiety', correctedFrom: 'anxity', isNaturalLanguage: true,
    })
  })

  test.each(['piece', 'price', 'live', 'grave', 'thrust', 'hukam', 'sat naam', 'God\'s love',
    'fear of death', 'anger and grief', 'overcoming anger and grief', '__proto__', 'constructor', 'toString'])('does not invent intent or autocorrect %s', query => {
    expect(planEnglishSearchIntent(query)).toEqual({ literalQuery: query, terms: [query], isNaturalLanguage: false })
  })

  test('preserves an unfamiliar phrase after an explicit topic wrapper', () => {
    expect(planEnglishSearchIntent('Gurbani about the meaning of life')).toEqual({
      literalQuery: 'the meaning of life', terms: ['the meaning of life'], isNaturalLanguage: true,
    })
  })

  test('does not lose text or infer an English topic in empty, long or mixed-script input', () => {
    expect(planEnglishSearchIntent('  ')).toEqual({ literalQuery: '', terms: [], isNaturalLanguage: false })
    for (const query of ['Gurbani about ਨਾਮ', 'ਨਾਮ', `${'anger '.repeat(42)}not anger`, 'anger 👋']) {
      expect(planEnglishSearchIntent(query)).toEqual({ literalQuery: query, terms: [query], isNaturalLanguage: false })
    }
  })
})
