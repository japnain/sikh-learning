import type { StorySummary } from '../types/stories'

/** Metadata search shares one spelling and token contract everywhere stories appear. */
export function normalizeStorySearch(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
    .replace(/[’']/g, '').replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim()
}

export function matchesStorySearch(story: StorySummary, query: string) {
  const text = normalizeStorySearch([
    story.title, story.subtitle, story.description, story.series?.title,
    ...story.people, ...story.themes,
  ].filter(Boolean).join(' '))
  return normalizeStorySearch(query).split(' ').filter(Boolean).every(token => text.includes(token))
}
