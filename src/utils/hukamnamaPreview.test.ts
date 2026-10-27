import { expect, test } from 'vitest'
import type { ScriptureEntry, ScriptureLine } from '../types'
import { getHukamnamaPreviewLine } from './hukamnamaPreview'

const line = (gurmukhi: string): ScriptureLine => ({
  verseId: 1, shabadId: 1, ang: 1, gurmukhi, transliteration: '',
  translation_en: '', translations_en: {}, translation_hi: '', translation_pa: '',
})
const entry = (lines: ScriptureLine[]) => ({ lines }) as ScriptureEntry

test('skips the full named-Bhagat heading only for the SGGS preview and preserves source lines', () => {
  const heading = line('ਧਨਾਸਰੀ ਭਗਤ ਰਵਿਦਾਸ ਜੀ ਕੀ ॥')
  const verse = line('ਨਾਮੁ ਤੇਰੋ ਆਰਤੀ ਮਜਨੁ ਮੁਰਾਰੇ ॥')
  const source = entry([heading, verse])
  const original = structuredClone(source)
  expect(getHukamnamaPreviewLine(source, 'G')).toBe(verse)
  expect(getHukamnamaPreviewLine(source, 'D')).toBe(heading)
  expect(source).toEqual(original)
})

test.each(['ਭਗਤ ਜਨਾ ਕੀ ਵਰਤਣਿ ਨਾਮੁ ॥', 'ਧਨਾਸਰੀ ਭਗਤ ਰਵਿਦਾਸ ਜੀ ਕੀ ਸਤਿ ਨਾਮੁ ॥', 'ਸਤਿ ਨਾਮੁ'])('retains substantive or ambiguous text: %s', text => {
  const verse = line(text)
  expect(getHukamnamaPreviewLine(entry([verse]), 'G')).toBe(verse)
})

test('does not select an invocation or structural title when no body is available', () => {
  expect(getHukamnamaPreviewLine(entry([line('ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥'), line('ਪਉੜੀ ॥')]), 'G')).toBeUndefined()
})
