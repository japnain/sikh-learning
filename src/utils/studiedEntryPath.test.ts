import { expect, test } from 'vitest'
import { shabadosReadingFixture } from '../test/shabadosFixture'
import { getStudiedEntryPath } from './studiedEntryPath'

test('recent study reopens the exact provider reading and rejects external return paths', () => {
  const entry = shabadosReadingFixture().entries[0]
  const path = '/study?shabadosBani=ALHN&source=G&ang=578&resumeVerseId=7000000001234'
  expect(getStudiedEntryPath({ ...entry, readerReturnPath: path })).toBe(path)
  expect(getStudiedEntryPath({ ...entry, readerReturnPath: 'https://example.com' })).toBe('/study?source=G&ang=578')
  expect(getStudiedEntryPath({ ...entry, id: 'G-578-300' })).toBe('/study?source=G&ang=578')
})
