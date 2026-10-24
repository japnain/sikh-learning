import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { storyCatalogReferenceErrors, storyPublicationErrors, validateStory, validateStoryCatalog } from '../../src/data/storyValidation.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const source = path.join(root, 'public/data/stories')
const built = path.join(root, 'dist/data/stories')
const assets = path.join(root, 'dist/assets')

try {
  const catalog = json(path.join(source, 'catalog.json'))
  const validatedCatalog = validateStoryCatalog(catalog)
  assert(validatedCatalog.data, `Published catalog is invalid: ${validatedCatalog.errors.join('; ')}`)
  assert.deepEqual(json(path.join(built, 'catalog.json')), catalog, 'Built story catalog is stale.')
  assert.deepEqual(fs.readdirSync(built).filter(file => file.endsWith('.json')).sort(),
    ['catalog.json', ...catalog.stories.map(story => `${story.id}.json`)].sort(), 'Only cataloged readings may ship.')
  const publishedStories = []
  for (const story of catalog.stories) {
    const reading = json(path.join(built, `${story.id}.json`))
    assert.deepEqual(reading, json(path.join(source, `${story.id}.json`)), `Built reading ${story.id} is stale.`)
    const validated = validateStory(reading)
    assert(validated.data, `Built reading ${story.id} is invalid: ${validated.errors.join('; ')}`)
    const publicationErrors = storyPublicationErrors(validated.data)
    assert(!publicationErrors.length, `Built reading ${story.id} lacks evidence: ${publicationErrors.join('; ')}`)
    publishedStories.push(validated.data)
  }
  const referenceErrors = storyCatalogReferenceErrors(validatedCatalog.data, publishedStories)
  assert(!referenceErrors.length, `Built story references are invalid: ${referenceErrors.join('; ')}`)

  const bundles = fs.readdirSync(assets).filter(file => /\.(?:js|css)$/u.test(file))
    .map(file => ({ file, text: fs.readFileSync(path.join(assets, file), 'utf8') }))
  const previewMarkers = ['/stories/drafts', 'Read the next editions', 'Editorial previews are available only in development.']
  for (const bundle of bundles) for (const marker of previewMarkers) {
    assert(!bundle.text.includes(marker), `${bundle.file} includes the editorial preview module.`)
  }
  const drafts = path.join(root, 'content/stories/drafts')
  const files = fs.existsSync(drafts) ? fs.readdirSync(drafts).filter(file => file.endsWith('.json')) : []
  for (const file of files) {
    const draft = json(path.join(drafts, file))
    // A revised edition can share its title/ID with a published reading. Check
    // distinctive prose as well as new IDs so replacement drafts stay private.
    const published = catalog.stories.some(story => story.id === draft.id)
    const opening = draft.paragraphs[0]?.text.slice(0, 80)
    for (const bundle of bundles) {
      assert(published || !bundle.text.includes(draft.id), `${bundle.file} includes unpublished ${draft.id}.`)
      assert(!opening || !bundle.text.includes(opening), `${bundle.file} includes draft prose from ${draft.id}.`)
    }
  }
  assert(!fs.existsSync(path.join(root, 'dist/content/stories/drafts')), 'Editorial draft files must remain outside the production build.')
  console.log(`Story build verified: ${catalog.stories.length} published readings; ${files.length} editorial drafts excluded.`)
} catch (error) {
  console.error(`Story build verification failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
