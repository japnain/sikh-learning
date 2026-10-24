import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isStoryId, storyCatalogReferenceErrors, storyPublicationErrors, storyReplacementErrors, validateStory, validateStoryCatalog } from '../../src/data/storyValidation.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const directory = path.join(root, 'public/data/stories')
const draftDirectory = path.join(root, 'content/stories/drafts')
const errors = []
const verifyDrafts = process.argv.includes('--drafts')
for (const argument of process.argv.slice(2)) if (argument !== '--drafts') errors.push(`Unknown option ${argument}; use --drafts to include unpublished pilots.`)
const fail = (where, message) => errors.push(`${where}: ${message}`)

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) }
  catch (error) { fail(path.relative(root, filePath), `cannot read JSON (${error.message})`); return null }
}

function checkStory(filePath) {
  const parsed = validateStory(readJson(filePath))
  for (const error of parsed.errors) fail(path.relative(root, filePath), error)
  if (parsed.data) for (const error of storyPublicationErrors(parsed.data)) fail(path.relative(root, filePath), error)
  if (parsed.data && path.basename(filePath, '.json') !== parsed.data.id) fail(path.relative(root, filePath), 'filename must match the story id')
  return parsed.data
}

const parsedCatalog = validateStoryCatalog(readJson(path.join(directory, 'catalog.json')))
for (const error of parsedCatalog.errors) fail('catalog.json', error)
const catalog = parsedCatalog.data
let totalWords = 0
let draftCount = 0
if (catalog) {
  if (!catalog.stories.length) fail('catalog.json', 'must contain at least one story')
  const storyIds = new Set(catalog.stories.map(story => story.id))
  const stories = []
  for (const summary of catalog.stories) {
    const story = checkStory(path.join(directory, `${summary.id}.json`))
    if (story) { stories.push(story); totalWords += story.wordCount }
  }
  for (const error of storyCatalogReferenceErrors(catalog, stories)) fail('catalog.json', error)
  for (const collection of catalog.collections) if (!catalog.stories.some(story => story.collectionId === collection.id)) fail('catalog.json', `collection ${collection.id} is empty`)
  if (fs.existsSync(directory)) for (const filename of fs.readdirSync(directory)) {
    if (filename.endsWith('.json') && filename !== 'catalog.json' && !storyIds.has(filename.slice(0, -5))) fail(filename, 'story is not linked from catalog; keep unpublished work in content/stories/drafts')
  }
  if (verifyDrafts && fs.existsSync(draftDirectory)) {
    const draftIds = new Set()
    for (const filename of fs.readdirSync(draftDirectory).sort()) {
      if (!filename.endsWith('.json')) continue
      const story = checkStory(path.join(draftDirectory, filename))
      if (!story) continue
      draftCount += 1
      if (!isStoryId(story.id) || draftIds.has(story.id)) fail(filename, 'draft must have a unique safe id')
      draftIds.add(story.id)
      const published = catalog.stories.find(item => item.id === story.id)
      if (published) {
        const publishedStory = stories.find(item => item.id === story.id)
        if (publishedStory) for (const error of storyReplacementErrors(publishedStory, story)) fail(filename, error)
      }
      for (const relatedId of story.relatedStoryIds ?? []) if (!catalog.stories.some(published => published.id === relatedId)) fail(filename, `related story ${relatedId} is absent from the published catalog`)
      if (!catalog.collections.some(collection => collection.id === story.collectionId)) fail(filename, 'draft collection is absent from catalog')
    }
  }
}

if (errors.length) {
  console.error(`Story verification failed:\n${errors.map(error => `- ${error}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Verified ${catalog.stories.length} English stories, ${catalog.collections.length} collections and ${totalWords.toLocaleString('en')} words.${verifyDrafts ? ` Also checked ${draftCount} unpublished pilots.` : ''} Sources and retelling notes are present; human review is not implied.`)
}
