import { expect, test } from 'vitest'
import { canUseLegacySavedLocationFallback, getSavedReturnIdentity } from './savedRouteIdentity'
import { buildSavedStudyPath } from './savedStudyPath'

test('Shabad OS saves ignore live location and title while keeping provider and exact line identity', () => {
  const route = '/study?shabadosBani=ALHN&source=G&ang=578&bani=Alahnia&resumeVerseId=7000000001234'
  expect(getSavedReturnIdentity(route)).toBe('/study?shabadosBani=ALHN')
  expect(getSavedReturnIdentity(`${route}&resumeSource=G`)).toBe(getSavedReturnIdentity(route))
  expect(getSavedReturnIdentity(`${route}&verseId=7000000001234`)).toBe('/study?shabadosBani=ALHN&verseId=7000000001234')
  expect(getSavedReturnIdentity(route)).not.toBe(getSavedReturnIdentity(route.replace('ALHN', 'ANN6')))
  expect(canUseLegacySavedLocationFallback(route)).toBe(false)
  expect(buildSavedStudyPath({ id: 'saved-shabados', type: 'verse', title: 'Alahnia', source: 'G', ang: 578,
    verseId: 7_000_000_001_234, returnPath: route, savedAt: '2026-11-12T12:00:00Z' })).toBe(route)
})
