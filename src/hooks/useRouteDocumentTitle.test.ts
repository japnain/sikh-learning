import { expect, test } from 'vitest'
import { getRouteDocumentTitle } from './useRouteDocumentTitle'

test.each([
  ['/', 'NaamRas'],
  ['/banis', 'Read · NaamRas'],
  ['/study', 'Reader · NaamRas'],
  ['/study/G', 'Reader · NaamRas'],
  ['/saved', 'Saved · NaamRas'],
  ['/library/panth-prakash-english', 'Book · NaamRas'],
  ['/library/panth-prakash-english/chapters/episode-001', 'Book Reader · NaamRas'],
  ['/banis/amrit-keertan/1', 'Amrit Keertan · NaamRas'],
  ['/banis/rehat/1/chapters/2', 'Rehat Maryada · NaamRas'],
  ['/privacy', 'Privacy · NaamRas'],
  ['/missing', 'Page not found · NaamRas'],
])('maps %s to an informative document title', (pathname, expected) => {
  expect(getRouteDocumentTitle(pathname)).toBe(expected)
})
