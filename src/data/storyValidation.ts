import type { Story, StoryCatalog, StorySource, StorySummary } from '../types/stories.ts'

export interface StoryValidationResult<T> { data: T | null; errors: string[] }

const artwork = new Set(['river', 'bowl', 'doorway', 'journey', 'thread', 'light'])
const reservedIds = new Set(['constructor', 'prototype', '__proto__'])
const roles = new Set(['narrative', 'context', 'textual-anchor', 'comparison'])
const locatorKinds = new Set(['chapter', 'page', 'folio', 'ang', 'vaar-pauri', 'section'])
const materials = new Set(['source-text', 'retelling', 'translation', 'artwork'])
const rightsBases = new Set(['public-domain', 'original', 'permission', 'open-license'])
const summaryFields = ['id', 'title', 'subtitle', 'description', 'collectionId', 'themes', 'people', 'artwork', 'wordCount', 'readingMinutes', 'revision', 'metadataRevision', 'series'] as const
const sourceFields = ['title', 'author', 'year', 'reference', 'url', 'id', 'role', 'workDate', 'edition', 'translator', 'editor', 'locator'] as const
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 40_000
export const isStoryId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100 && !reservedIds.has(value)
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const textList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.length <= 50 && value.every(text)
const idList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.length <= 50 && value.every(isStoryId) && new Set(value).size === value.length
const plainText = (value: unknown): value is string => text(value) && !/<\/?[a-z][^>]*>/iu.test(value)

function https(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password }
  catch { return false }
}

function known(value: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  return structuredClone(Object.fromEntries(fields.filter(field => value[field] !== undefined).map(field => [field, value[field]])))
}

function summaryErrors(value: unknown): string[] {
  if (!record(value)) return ['summary must be an object']
  const errors: string[] = []
  for (const field of ['id', 'collectionId']) if (!isStoryId(value[field])) errors.push(`${field} must be a safe slug`)
  for (const field of ['title', 'subtitle', 'description']) if (!text(value[field])) errors.push(`${field} must be nonempty text`)
  for (const field of ['themes', 'people']) if (!textList(value[field])) errors.push(`${field} must contain nonempty labels`)
  if (!artwork.has(value.artwork as string)) errors.push('unknown artwork')
  for (const field of ['wordCount', 'readingMinutes', 'revision']) if (!positive(value[field])) errors.push(`${field} must be a positive integer`)
  if (value.metadataRevision !== undefined && !positive(value.metadataRevision)) errors.push('metadataRevision must be a positive integer')
  if (value.series !== undefined && (!record(value.series) || !isStoryId(value.series.id) || !text(value.series.title) || !positive(value.series.order))) errors.push('series requires a safe id, title and positive order')
  return errors
}

export function validateStorySummary(value: unknown): StoryValidationResult<StorySummary> {
  const errors = summaryErrors(value)
  if (errors.length || !record(value)) return { data: null, errors }
  const summary = known(value, summaryFields) as unknown as StorySummary
  // JSON property order is not part of a reading's identity. Normalize the
  // nested series fields as well as the top-level summary before comparison.
  if (summary.series) summary.series = { id: summary.series.id, title: summary.series.title, order: summary.series.order }
  return { data: summary, errors }
}

export function validateStoryCatalog(value: unknown): StoryValidationResult<StoryCatalog> {
  const errors: string[] = []
  if (!record(value) || !positive(value.version) || !Array.isArray(value.collections) || !Array.isArray(value.stories)) {
    return { data: null, errors: ['catalog requires a positive version, collections and stories arrays'] }
  }
  if (value.collections.length > 100 || value.stories.length > 500) errors.push('catalog is too large')
  const collections: StoryCatalog['collections'] = []
  for (const [index, item] of value.collections.entries()) {
    if (!record(item) || !isStoryId(item.id) || !text(item.title) || !text(item.description) || !artwork.has(item.artwork as string)) errors.push(`collections[${index}] is invalid`)
    else collections.push(known(item, ['id', 'title', 'description', 'artwork']) as unknown as StoryCatalog['collections'][number])
  }
  if (new Set(collections.map(item => item.id)).size !== collections.length) errors.push('duplicate collection id')
  const stories: StorySummary[] = []
  for (const [index, item] of value.stories.entries()) {
    const parsed = validateStorySummary(item)
    errors.push(...parsed.errors.map(error => `stories[${index}]: ${error}`))
    if (parsed.data) {
      if (!collections.some(collection => collection.id === parsed.data!.collectionId)) errors.push(`stories[${index}]: collection is absent from catalog`)
      stories.push(parsed.data)
    }
  }
  if (new Set(stories.map(item => item.id)).size !== stories.length) errors.push('duplicate story id')
  const seriesEntries = new Map<string, { title: string; orders: Set<number> }>()
  for (const story of stories) if (story.series) {
    const previous = seriesEntries.get(story.series.id)
    if (previous && (previous.title !== story.series.title || previous.orders.has(story.series.order))) errors.push(`series ${story.series.id} has inconsistent title or duplicate order`)
    if (previous) previous.orders.add(story.series.order)
    else seriesEntries.set(story.series.id, { title: story.series.title, orders: new Set([story.series.order]) })
  }
  if (value.featuredStoryId !== undefined && (!isStoryId(value.featuredStoryId) || !stories.some(story => story.id === value.featuredStoryId))) errors.push('featuredStoryId must reference a catalog story')
  return {
    data: errors.length ? null : { version: value.version, collections, stories, ...(value.featuredStoryId === undefined ? {} : { featuredStoryId: value.featuredStoryId as string }) },
    errors,
  }
}

function sourceErrors(value: unknown): string[] {
  if (!record(value)) return ['source must be an object']
  const errors: string[] = []
  for (const field of ['title', 'author']) if (!text(value[field])) errors.push(`${field} is required`)
  if (value.year !== undefined && (!positive(value.year) || value.year > new Date().getFullYear())) errors.push('year must be a valid edition/publication year')
  const validLocator = record(value.locator) && locatorKinds.has(value.locator.kind as string) && text(value.locator.value)
  if (!text(value.reference) || (!validLocator && (value.reference.length < 12 || !/(?:chapter|page|pp\.|section|episode|volume|book|ang|vaar|pauri|canto|entry|paragraph|manuscript)/iu.test(value.reference)))) errors.push('reference needs a specific chapter/page/section/verse/entry locator')
  if (!https(value.url)) errors.push('url must be HTTPS without credentials')
  if (value.id !== undefined && !isStoryId(value.id)) errors.push('id must be a safe slug')
  if (value.role !== undefined && !roles.has(value.role as string)) errors.push('unknown source role')
  for (const field of ['workDate', 'edition', 'translator', 'editor']) if (value[field] !== undefined && !text(value[field])) errors.push(`${field} must be nonempty text`)
  if (value.locator !== undefined && !validLocator) errors.push('locator requires a known kind and nonempty value')
  return errors
}

function reviewErrors(value: unknown): string[] {
  if (!record(value)) return ['review must be an object']
  if (value.status === 'pending') return ['reviewer', 'date', 'evidence'].some(field => value[field] !== undefined) ? ['pending review cannot claim a reviewer, date or evidence'] : []
  if (value.status !== 'completed') return ['review status must be pending or completed']
  const errors: string[] = []
  for (const field of ['reviewer', 'evidence']) if (!text(value[field])) errors.push(`completed review requires ${field}`)
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isFinite(Date.parse(`${value.date}T00:00:00Z`)) || new Date(`${value.date}T00:00:00Z`).toISOString().slice(0, 10) !== value.date || value.date > new Date().toISOString().slice(0, 10)) errors.push('completed review requires a valid non-future ISO date')
  return errors
}

function rightsErrors(value: unknown, sources: StorySource[]): string[] {
  if (!record(value)) return ['rights must be an object']
  const errors: string[] = []
  if (!['original-retelling', 'licensed-text'].includes(value.status as string) || !['public-domain-source', 'permission', 'open-license'].includes(value.basis as string) || !text(value.note)) errors.push('rights require known status, basis and an explanatory note')
  if (value.status === 'licensed-text' && value.basis === 'public-domain-source') errors.push('licensed-text requires permission or an open licence')
  if (value.records === undefined) {
    if (value.status !== 'original-retelling' || value.basis !== 'public-domain-source') errors.push('licensed material requires rights records')
    return errors
  }
  if (!Array.isArray(value.records) || !value.records.length || value.records.length > 50) return [...errors, 'rights.records must be a nonempty bounded list']
  const ids = new Set<string>()
  for (const [index, item] of value.records.entries()) {
    const prefix = `rights.records[${index}]`
    if (!record(item)) { errors.push(`${prefix} must be an object`); continue }
    if (!isStoryId(item.id) || ids.has(item.id)) errors.push(`${prefix} needs a unique safe id`)
    if (isStoryId(item.id)) ids.add(item.id)
    if (!materials.has(item.material as string) || !rightsBases.has(item.basis as string) || !text(item.evidence)) errors.push(`${prefix} requires material, basis and evidence`)
    if (item.sourceIds !== undefined && (!idList(item.sourceIds) || item.sourceIds.some(sourceId => !sources.some(source => source.id === sourceId)))) errors.push(`${prefix} sourceIds must reference named sources`)
    if (['source-text', 'translation'].includes(item.material as string) && !idList(item.sourceIds)) errors.push(`${prefix} source text or translation must identify its sources`)
    if (item.url !== undefined && !https(item.url)) errors.push(`${prefix} url must be HTTPS without credentials`)
    for (const field of ['license', 'attribution']) if (item[field] !== undefined && !text(item[field])) errors.push(`${prefix} ${field} must be nonempty text`)
    if (['permission', 'open-license'].includes(item.basis as string) && !https(item.url)) errors.push(`${prefix} permission or licence requires an evidence URL`)
    if (item.basis === 'open-license' && (!text(item.license) || !text(item.attribution))) errors.push(`${prefix} open licence requires license and attribution`)
  }
  const records = value.records.filter(record)
  if (value.status === 'original-retelling' && !records.some(item => item.material === 'retelling' && item.basis === 'original')) errors.push('original retelling needs an original retelling rights record')
  if (value.basis === 'public-domain-source' && !records.some(item => item.material === 'source-text' && item.basis === 'public-domain')) errors.push('public-domain-source requires a source-text public-domain evidence record')
  if (['permission', 'open-license'].includes(value.basis as string) && !records.some(item => ['source-text', 'translation', 'retelling'].includes(item.material as string) && item.basis === value.basis)) errors.push('rights basis requires a matching text permission/licence record')
  return errors
}

export function validateStory(value: unknown): StoryValidationResult<Story> {
  const parsedSummary = validateStorySummary(value)
  if (!record(value)) return { data: null, errors: parsedSummary.errors }
  const errors = [...parsedSummary.errors]
  if (value.language !== 'en') errors.push('only English stories are supported')
  if (!['Traditional sakhi', 'Historical profile'].includes(value.accountType as string)) errors.push('accountType must distinguish traditional sakhi from historical profile')
  for (const field of ['accountNote', 'editorialNote']) if (!text(value[field])) errors.push(`${field} is required`)
  for (const field of ['scholarApproved', 'historicallyVerified', 'reviewedBy', 'reviewedAt']) if (value[field] !== undefined) errors.push(`${field} cannot be claimed by the automated publishing workflow`)
  const paragraphs: Story['paragraphs'] = []
  if (!Array.isArray(value.paragraphs) || !value.paragraphs.length || value.paragraphs.length > 200) errors.push('paragraphs must be a nonempty bounded list')
  else for (const [index, item] of value.paragraphs.entries()) {
    if (!record(item) || !isStoryId(item.id) || !plainText(item.text)) errors.push(`paragraphs[${index}] requires a safe id and plain text without HTML`)
    else paragraphs.push({ id: item.id, text: item.text })
  }
  if (new Set(paragraphs.map(item => item.id)).size !== paragraphs.length) errors.push('duplicate paragraph id')
  const wordCount = paragraphs.reduce((sum, item) => sum + item.text.trim().split(/\s+/u).length, 0)
  if (value.wordCount !== wordCount) errors.push(`wordCount differs from actual ${wordCount}`)
  if (value.readingMinutes !== Math.max(1, Math.ceil(wordCount / 200))) errors.push('readingMinutes must use actual words at 200 words/minute')
  const sources: StorySource[] = []
  if (!Array.isArray(value.sources) || !value.sources.length || value.sources.length > 30) errors.push('sources must be a nonempty bounded list')
  else for (const [index, item] of value.sources.entries()) {
    const issues = sourceErrors(item)
    errors.push(...issues.map(issue => `sources[${index}]: ${issue}`))
    if (!issues.length && record(item)) sources.push(known(item, sourceFields) as unknown as StorySource)
  }
  const namedSources = sources.flatMap(source => source.id ? [source.id] : [])
  if (new Set(namedSources).size !== namedSources.length) errors.push('duplicate source id')
  errors.push(...rightsErrors(value.rights, sources))
  if (value.sections !== undefined) {
    if (!Array.isArray(value.sections) || !value.sections.length || value.sections.length > 50) errors.push('sections must be a nonempty bounded list')
    else {
      const ids = new Set<string>()
      let previous = -1
      for (const [index, section] of value.sections.entries()) {
        if (!record(section) || !isStoryId(section.id) || !text(section.title) || !isStoryId(section.startParagraphId)) { errors.push(`sections[${index}] requires id, title and startParagraphId`); continue }
        if (ids.has(section.id) || paragraphs.some(paragraph => paragraph.id === section.id)) errors.push(`sections[${index}] id must be unique and distinct from paragraph ids`)
        ids.add(section.id)
        const start = paragraphs.findIndex(paragraph => paragraph.id === section.startParagraphId)
        if (start < 0 || start <= previous) errors.push(`sections[${index}] must start at an existing paragraph in increasing order`)
        previous = start
      }
    }
  }
  if (value.relatedStoryIds !== undefined && (!idList(value.relatedStoryIds) || value.relatedStoryIds.includes(value.id as string))) errors.push('relatedStoryIds must contain unique safe ids other than this story')
  if (value.glossary !== undefined && (!Array.isArray(value.glossary) || value.glossary.length > 100 || !value.glossary.every(item => record(item) && text(item.term) && text(item.meaning)))) errors.push('glossary must contain valid terms and meanings')
  if (value.editorial !== undefined) {
    if (!record(value.editorial) || !text(value.editorial.credit)) errors.push('editorial requires credit and review statuses')
    else for (const field of ['historyReview', 'englishReview']) errors.push(...reviewErrors(value.editorial[field]).map(issue => `editorial.${field}: ${issue}`))
  }
  if (errors.length || !parsedSummary.data) return { data: null, errors }
  return {
    data: {
      ...parsedSummary.data,
      ...known(value, ['language', 'accountType', 'accountNote', 'editorialNote', 'rights', 'sections', 'relatedStoryIds', 'glossary', 'editorial']),
      paragraphs, sources,
    } as Story,
    errors,
  }
}

/** Reading identity stays on revision; metadataRevision only refreshes downloaded content. */
export function sameStorySummary(story: StorySummary, summary: StorySummary): boolean {
  const parsedStory = validateStorySummary(story).data
  const parsedSummary = validateStorySummary(summary).data
  return !!parsedStory && !!parsedSummary && JSON.stringify(parsedStory) === JSON.stringify(parsedSummary)
}

export function storyCatalogReferenceErrors(catalog: StoryCatalog, stories: Story[]): string[] {
  const errors: string[] = []
  for (const story of stories) {
    const summary = catalog.stories.find(item => item.id === story.id)
    if (!summary || !sameStorySummary(story, summary)) errors.push(`${story.id}: summary differs from catalog`)
    for (const relatedId of story.relatedStoryIds ?? []) if (!catalog.stories.some(item => item.id === relatedId)) errors.push(`${story.id}: related story ${relatedId} is absent from catalog`)
  }
  return errors
}

/** A replacement must never reuse reading identity for changed text or anchors. */
export function storyReplacementErrors(published: Story, replacement: Story): string[] {
  const errors: string[] = []
  if (replacement.id !== published.id) errors.push('replacement must keep the published story id')
  if (replacement.revision < published.revision) errors.push('replacement cannot decrease the reading revision')
  const sameParagraphs = published.paragraphs.length === replacement.paragraphs.length
    && published.paragraphs.every((paragraph, index) => paragraph.id === replacement.paragraphs[index].id && paragraph.text === replacement.paragraphs[index].text)
  if (!sameParagraphs && replacement.revision <= published.revision) errors.push('changed text or paragraph anchors must advance the reading revision')
  if (replacement.revision === published.revision && (replacement.metadataRevision ?? 0) <= (published.metadataRevision ?? 0)) errors.push('replacement draft must advance the reading or metadata revision')
  return errors
}

/** New packages need explicit evidence; legacy offline editions remain readable. */
export function storyPublicationErrors(story: Story): string[] {
  const errors: string[] = []
  if (!story.editorial) errors.push('package must explicitly record editorial credit and review status')
  if (!story.rights.records?.length) errors.push('package must include explicit source and retelling rights evidence')
  if (story.sources.some(source => !source.id || !source.role || !source.edition)) errors.push('sources must identify their id, role and edition')
  return errors
}

export const parseSummary = (value: unknown): StorySummary | null => validateStorySummary(value).data
export const parseCatalog = (value: unknown): StoryCatalog | null => validateStoryCatalog(value).data
export const parseStory = (value: unknown): Story | null => validateStory(value).data
