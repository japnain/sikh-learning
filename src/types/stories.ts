export type StoryArtwork = 'river' | 'bowl' | 'doorway' | 'journey' | 'thread' | 'light'

export interface StoryCollection {
  id: string
  title: string
  description: string
  artwork: StoryArtwork
}

export interface StorySource {
  title: string
  author: string
  /** Edition/publication year; omit for genuinely undated editions. */
  year?: number
  reference: string
  url: string
  id?: string
  role?: 'narrative' | 'context' | 'textual-anchor' | 'comparison'
  workDate?: string
  edition?: string
  translator?: string
  editor?: string
  locator?: {
    kind: 'chapter' | 'page' | 'folio' | 'ang' | 'vaar-pauri' | 'section'
    value: string
  }
}

export interface StorySection {
  id: string
  title: string
  startParagraphId: string
}

export type StoryReview =
  | { status: 'pending' }
  | { status: 'completed'; reviewer: string; date: string; evidence: string }

export interface StoryRightsRecord {
  id: string
  material: 'source-text' | 'retelling' | 'translation' | 'artwork'
  basis: 'public-domain' | 'original' | 'permission' | 'open-license'
  sourceIds?: string[]
  evidence: string
  url?: string
  license?: string
  attribution?: string
}

export interface StorySummary {
  id: string
  title: string
  subtitle: string
  description: string
  collectionId: string
  themes: string[]
  people: string[]
  artwork: StoryArtwork
  wordCount: number
  readingMinutes: number
  revision: number
  /** Refresh source/editorial metadata without discarding a paragraph reading position. */
  metadataRevision?: number
  series?: { id: string; title: string; order: number }
}

export interface Story extends StorySummary {
  language: 'en'
  accountType: 'Traditional sakhi' | 'Historical profile'
  paragraphs: Array<{ id: string; text: string }>
  sources: StorySource[]
  accountNote: string
  editorialNote: string
  rights: {
    status: 'original-retelling' | 'licensed-text'
    basis: 'public-domain-source' | 'permission' | 'open-license'
    note: string
    records?: StoryRightsRecord[]
  }
  sections?: StorySection[]
  relatedStoryIds?: string[]
  editorial?: {
    credit: string
    historyReview: StoryReview
    englishReview: StoryReview
  }
  glossary?: Array<{ term: string; meaning: string }>
}

export interface StoryCatalog {
  version: number
  collections: StoryCollection[]
  stories: StorySummary[]
  featuredStoryId?: string
}
