import type { ScriptureEntry, ScriptureLine } from '../types'
import { findBaniLines, normalizeBaniFindText } from './baniFind'

function line(gurmukhi: string, transliteration = '', verseId = 1): ScriptureLine {
  return { gurmukhi, transliteration, verseId, shabadId: 1, ang: 8, translation_en: '', translations_en: {}, translation_hi: '', translation_pa: '' }
}
function entry(id: string, source: ScriptureEntry['source'], lines: ScriptureLine[]): ScriptureEntry {
  return { id, source, scripture: source === 'G' ? 'SGGS' : 'DG', ang: 8, lines, gurmukhi: lines.map(item => item.gurmukhi).join('\n'), transliteration: '', translation_en: '', translation_hi: '', translation_pa: '', words: [] }
}

test('returns source-aware line positions in canonical order without merging repeated verse IDs', () => {
  const entries = [entry('bani-21-0', 'G', [line('ਸਤਿ ਨਾਮੁ ॥', '', 20), line('ਹਰਿ ਨਾਮੁ ॥', '', 22)]), entry('bani-21-1', 'D', [line('ਨਾਮੁ ॥', '', 20)])]
  const before = JSON.stringify(entries)
  expect(findBaniLines(entries, 'ਨਾਮੁ').map(hit => [hit.entryIndex, hit.lineIndex, hit.source, hit.verseId])).toEqual([[0, 0, 'G', 20], [0, 1, 'G', 22], [1, 0, 'D', 20]])
  expect(JSON.stringify(entries)).toBe(before)
})

test('folds Roman diacritics/case and punctuation while returning the original line', () => {
  const original = line('ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ ॥', 'Socẖai socẖ na hovaī.  ||')
  const hits = findBaniLines([entry('one', 'G', [original])], 'SOCHAI, SOCH')
  expect(hits).toHaveLength(1)
  expect(hits[0]).toMatchObject({ transliteration: original.transliteration, matchedField: 'transliteration', gurmukhi: original.gurmukhi })
})

test('retains distinct Gurmukhi vowel signs and accepts canonically equivalent characters', () => {
  const entries = [entry('one', 'G', [line('ਨਾਮੁ ਨਾਮਿ ॥'), line('ਖ਼ਾਲਸਾ ॥')])]
  expect(findBaniLines(entries, 'ਨਾਮੀ')).toEqual([])
  expect(findBaniLines(entries, 'ਨਾਮੁ')).toHaveLength(1)
  expect(findBaniLines(entries, 'ਖ਼ਾਲਸਾ')).toHaveLength(1)
  expect(normalizeBaniFindText('ਨਾਮੁ')).not.toBe(normalizeBaniFindText('ਨਾਮਿ'))
})

test('optional whole-word matching uses Unicode letters/marks rather than ASCII word boundaries', () => {
  const entries = [entry('one', 'G', [line('ਹਰਿ ॥', 'har'), line('ਹਰਿ ਨਾਮੁ ॥', 'har naam'), line('ਹਰਿ ॥', 'charan')])]
  expect(findBaniLines(entries, 'har', { wholeWords: true })).toHaveLength(2)
  expect(findBaniLines(entries, 'ਨਾਮ', { wholeWords: true })).toHaveLength(0)
  expect(findBaniLines(entries, 'ਨਾਮੁ', { wholeWords: true })).toHaveLength(1)
})

test('empty/punctuation-only searches return no lines and limits preserve reading order', () => {
  const entries = [entry('one', 'G', Array.from({ length: 250 }, (_, index) => line('ਹਰਿ ਨਾਮੁ ॥', '', index)))]
  expect(findBaniLines(entries, '   ॥ ')).toEqual([])
  expect(findBaniLines(entries, 'ਨਾਮੁ', { limit: 2 }).map(hit => hit.verseId)).toEqual([0, 1])
  expect(findBaniLines(entries, 'ਨਾਮੁ', { limit: 1000 })).toHaveLength(200)
})

test('entries without line arrays use the reader’s single fallback-line position', () => {
  const reading = { ...entry('one', 'G', [line('ਸਤਿ ਨਾਮੁ ॥')]), lines: undefined, verseIds: [75], transliteration: 'sat naam' }
  expect(findBaniLines([reading], 'naam')[0]).toMatchObject({ entryIndex: 0, lineIndex: 0, verseId: 75, source: 'G' })
})

test('matches only loaded scripture/transliteration, never unrelated meanings or another entry’s text', () => {
  const first = entry('one', 'G', [line('ਸਤਿ ਨਾਮੁ ॥')])
  first.lines![0].translation_en = 'Creator'
  expect(findBaniLines([first], 'Creator')).toEqual([])
  expect(findBaniLines([first, entry('two', 'D', [line('ਕਰਤਾ ਪੁਰਖੁ ॥')])], 'ਨਾਮੁ ਕਰਤਾ')).toEqual([])
})

test('missing optional Roman support does not prevent searching scripture', () => {
  const incomplete = { ...line('ਸਤਿ ਨਾਮੁ ॥'), transliteration: undefined } as unknown as ScriptureLine
  const entries = [entry('one', 'G', [incomplete])]
  expect(findBaniLines(entries, 'ਨਾਮੁ')[0]).toMatchObject({ lineIndex: 0, transliteration: '' })
  expect(findBaniLines(entries, 'nam')).toEqual([])
})
