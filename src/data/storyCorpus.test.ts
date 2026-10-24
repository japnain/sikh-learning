import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseStoryDraftModules } from './storyDraftRepository'
import { configureStoryRepositoryLoader, downloadStoryCollection, getOfflineStoryIds, loadStory, loadStoryCatalog, STORY_CACHE_KEY } from './storyRepository'
import { parseCatalog, parseStory, storyCatalogReferenceErrors, storyReplacementErrors } from './storyValidation'

const publishedDirectory = resolve(process.cwd(), 'public/data/stories')
const draftDirectory = resolve(process.cwd(), 'content/stories/drafts')
const researchDirectory = resolve(process.cwd(), 'content/stories/research')
const json = (directory: string, filename: string): unknown => JSON.parse(readFileSync(`${directory}/${filename}`, 'utf8'))
const catalog = parseCatalog(json(publishedDirectory, 'catalog.json'))!
const published = catalog.stories.map(summary => parseStory(json(publishedDirectory, `${summary.id}.json`))!)
const drafts = readdirSync(draftDirectory).filter(filename => filename.endsWith('.json')).map(filename => ({ filename, raw: json(draftDirectory, filename) }))

function liveLoader(resourcePath: string): Promise<unknown> {
  const filename = resourcePath.split('/').at(-1)!
  return Promise.resolve(json(publishedDirectory, filename))
}

beforeEach(() => {
  localStorage.clear()
  configureStoryRepositoryLoader(liveLoader)
})
afterEach(() => {
  configureStoryRepositoryLoader(null)
  vi.restoreAllMocks()
})

describe('actual story corpus and editorial editions', () => {
  it('ships complete source packages and dossiers for every published reading', () => {
    expect(catalog).not.toBeNull()
    expect(published.length).toBeGreaterThanOrEqual(8)
    expect(published.every(Boolean)).toBe(true)
    expect(storyCatalogReferenceErrors(catalog, published)).toEqual([])
    expect(readdirSync(publishedDirectory).filter(filename => filename.endsWith('.json') && filename !== 'catalog.json').sort())
      .toEqual(catalog.stories.map(summary => `${summary.id}.json`).sort())
    for (const story of published) {
      expect(story.editorial, story.id).toBeDefined()
      expect(story.rights.records?.length, story.id).toBeGreaterThan(0)
      expect(story.sources.every(source => source.id && source.role && source.edition), story.id).toBe(true)
      expect(existsSync(`${researchDirectory}/${story.id}.md`), story.id).toBe(true)
    }
  })

  it('downloads and reloads the actual published text and complete provenance offline', async () => {
    await expect(downloadStoryCollection()).resolves.toEqual({ downloaded: published.length, total: published.length })
    expect(getOfflineStoryIds().sort()).toEqual(published.map(story => story.id).sort())
    configureStoryRepositoryLoader(async () => { throw new Error('Offline') })
    await expect(loadStoryCatalog()).resolves.toEqual(catalog)
    for (const story of published) await expect(loadStory(story.id)).resolves.toEqual(story)
  })

  it('refreshes migrated provenance while preserving the real first-edition paragraph identity', async () => {
    const migrated = published.find(story => story.id === 'bhai-lalo')!
    expect(migrated.metadataRevision).toBeGreaterThan(0)
    expect(migrated.revision).toBe(1)
    const legacy = structuredClone(migrated)
    delete legacy.metadataRevision
    delete legacy.editorial
    delete legacy.rights.records
    const legacyCatalog = { ...catalog, stories: catalog.stories.map(summary => {
      const item = { ...summary }
      delete item.metadataRevision
      return item
    }) }
    const anchor = migrated.paragraphs[Math.min(3, migrated.paragraphs.length - 1)].id
    const readingState = JSON.stringify({ version: 1, saved: {}, positions: { [migrated.id]: { paragraphId: anchor, revision: 1, progress: 0.4 } } })
    localStorage.setItem('naamras-story-state-v1', readingState)
    localStorage.setItem(STORY_CACHE_KEY, JSON.stringify({ version: 1, catalog: legacyCatalog, stories: { [migrated.id]: legacy } }))
    const loader = vi.fn(liveLoader)
    configureStoryRepositoryLoader(loader)
    await expect(loadStory(migrated.id)).resolves.toEqual(legacy)
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem(STORY_CACHE_KEY)!).stories[migrated.id]).toEqual(migrated))
    await expect(loadStory(migrated.id)).resolves.toEqual(migrated)
    expect(loader.mock.calls.map(([path]) => path)).toContain(`/data/stories/${migrated.id}.json`)
    expect(localStorage.getItem('naamras-story-state-v1')).toBe(readingState)
    expect(migrated.paragraphs.some(paragraph => paragraph.id === anchor)).toBe(true)
  })

  it('keeps substantial pilots outside public text while validating real source, section and replacement references', async () => {
    expect(drafts.length).toBeGreaterThanOrEqual(3)
    const modules = Object.fromEntries(drafts.map(({ filename, raw }) => [`/drafts/${filename}`, async () => raw]))
    const before = localStorage.length
    const preview = await parseStoryDraftModules(modules)
    expect(localStorage.length).toBe(before)
    expect(preview.stories).toHaveLength(drafts.length)
    for (const draft of preview.stories) {
      expect(draft.sections?.length, draft.id).toBeGreaterThan(1)
      expect(draft.editorial, draft.id).toBeDefined()
      expect(draft.rights.records?.length, draft.id).toBeGreaterThan(0)
      expect(existsSync(`${researchDirectory}/${draft.id}.md`), draft.id).toBe(true)
      for (const relatedId of draft.relatedStoryIds ?? []) expect(catalog.stories.some(story => story.id === relatedId), relatedId).toBe(true)
      const existing = published.find(story => story.id === draft.id)
      if (existing) {
        expect(storyReplacementErrors(existing, draft)).toEqual([])
        expect(draft.paragraphs).not.toEqual(existing.paragraphs)
      } else {
        expect(existsSync(`${publishedDirectory}/${draft.id}.json`), draft.id).toBe(false)
        await expect(loadStory(draft.id)).resolves.toBeNull()
      }
    }
  })
})
