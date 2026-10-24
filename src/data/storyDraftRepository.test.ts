import { describe, expect, it } from 'vitest'
import { parseStoryDraftModules } from './storyDraftRepository'

const draft = {
  id: 'shared-table', title: 'A Shared Table', subtitle: 'A profile', description: 'An unpublished working reading.',
  collectionId: 'seva-and-dignity', themes: ['Service'], people: ['Mata Khivi'], artwork: 'bowl',
  wordCount: 5, readingMinutes: 1, revision: 1, language: 'en', accountType: 'Historical profile',
  paragraphs: [{ id: 'p1', text: 'People gathered around a table.' }],
  sources: [{ title: 'The Sikh Religion', author: 'Macauliffe', year: 1909, reference: 'Volume II, chapter IV.', url: 'https://en.wikisource.org/' }],
  accountNote: 'A working account based on a cited edition.', editorialNote: 'Independent review is pending.',
  editorial: { credit: 'Naamras editorial draft', historyReview: { status: 'pending' }, englishReview: { status: 'pending' } },
  rights: { status: 'original-retelling', basis: 'public-domain-source', note: 'Original draft prose based on the 1909 edition.' },
}

describe('unpublished story previews', () => {
  it('builds a separate catalog without writing to the published collection or local state', async () => {
    const before = localStorage.length
    const library = await parseStoryDraftModules({ '/drafts/shared-table.json': async () => draft })
    expect(library.stories[0].id).toBe(draft.id)
    expect(library.catalog.stories.map(story => story.id)).toEqual([draft.id])
    expect(library.catalog.collections.map(collection => collection.id)).toEqual(['seva-and-dignity'])
    expect(localStorage.length).toBe(before)
  })

  it('rejects invalid, mismatched and duplicate draft identities', async () => {
    await expect(parseStoryDraftModules({ '/drafts/wrong.json': async () => draft })).rejects.toThrow('could not be read')
    await expect(parseStoryDraftModules({ '/drafts/shared-table.json': async () => ({ ...draft, wordCount: 99 }) })).rejects.toThrow('could not be read')
    await expect(parseStoryDraftModules({
      '/one/shared-table.json': async () => draft,
      '/two/shared-table.json': async () => draft,
    })).rejects.toThrow('must be unique')
  })

  it('validates collection and series membership before displaying a preview shelf', async () => {
    await expect(parseStoryDraftModules({ '/drafts/shared-table.json': async () => ({ ...draft, collectionId: 'missing' }) })).rejects.toThrow('unknown collection')
    await expect(parseStoryDraftModules({
      '/drafts/shared-table.json': async () => ({ ...draft, series: { id: 'service', title: 'Service', order: 1 } }),
      '/drafts/another-table.json': async () => ({ ...draft, id: 'another-table', series: { id: 'service', title: 'Service', order: 1 } }),
    })).rejects.toThrow('inconsistent reading metadata')
  })
})
