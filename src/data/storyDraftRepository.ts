import type { Story, StoryCatalog, StoryCollection } from '../types/stories'
import { parseCatalog, parseStory, parseSummary } from './storyValidation'

type DraftModule = () => Promise<unknown>

// This module is reachable only through the development-only route in App.
// Editorial JSON stays outside public/ and is excluded from production builds.
const draftModules = import.meta.glob<unknown>('../../content/stories/drafts/*.json', { import: 'default' })

const COLLECTIONS: StoryCollection[] = [
  { id: 'seva-and-dignity', title: 'Seva & dignity', description: 'Service, hospitality and the dignity of a shared life.', artwork: 'bowl' },
  { id: 'courage-and-conscience', title: 'Courage & conscience', description: 'Conviction, responsibility and collective life.', artwork: 'thread' },
  { id: 'lives-transformed', title: 'Lives transformed', description: 'Lives shaped by encounter and devotion.', artwork: 'journey' },
]

export interface StoryDraftLibrary {
  catalog: StoryCatalog
  stories: Story[]
}

export async function parseStoryDraftModules(modules: Record<string, DraftModule>): Promise<StoryDraftLibrary> {
  const stories = await Promise.all(Object.entries(modules).map(async ([path, load]) => {
    const story = parseStory(await load())
    if (!story || !path.endsWith(`/${story.id}.json`)) throw new Error(`The editorial draft ${path.split('/').at(-1)} could not be read.`)
    return story
  }))
  if (new Set(stories.map(story => story.id)).size !== stories.length) throw new Error('Editorial draft IDs must be unique.')
  const catalog: StoryCatalog = {
    version: 1,
    collections: COLLECTIONS.filter(collection => stories.some(story => story.collectionId === collection.id)),
    stories: stories.map(story => parseSummary(story)!),
  }
  if (stories.some(story => !catalog.collections.some(collection => collection.id === story.collectionId))) {
    throw new Error('An editorial draft references an unknown collection.')
  }
  // A draft may reference published readings; those references are deliberately
  // absent from this private preview catalog and are not offered as preview links.
  const parsedCatalog = parseCatalog(catalog)
  if (!parsedCatalog) throw new Error('The editorial draft catalog has inconsistent reading metadata.')
  return { catalog: parsedCatalog, stories }
}

export function loadStoryDraftLibrary(): Promise<StoryDraftLibrary> {
  if (!import.meta.env.DEV) return Promise.reject(new Error('Editorial previews are available only in development.'))
  return parseStoryDraftModules(draftModules)
}
