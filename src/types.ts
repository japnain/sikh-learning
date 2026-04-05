export interface Word {
  gurmukhi: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
}

export type EnglishSource = 'bdb' | 'ms' | 'ssk'
export type ScriptMode = 'gurmukhi' | 'devanagari'
export type MeaningLanguage = 'none' | 'en' | 'pa' | 'hi'

export interface EnglishTranslations {
  bdb?: string
  ms?: string
  ssk?: string
}

export interface ScriptureLine {
  verseId: number
  shabadId: number
  ang: number
  originalAng?: number | null
  isHeader?: boolean
  gurmukhi: string
  transliteration: string
  translation_en: string
  translations_en: EnglishTranslations
  translation_hi: string
  translation_pa: string
}

export interface ScriptureEntry {
  id: string
  scripture: string
  ang: number
  source?: 'G' | 'D' | 'B' | 'A'
  shabadId?: number
  verseIds?: number[]
  sourceName?: string
  raag?: string
  writer?: string
  hukamnamaDate?: string
  lines?: ScriptureLine[]
  gurmukhi: string
  transliteration: string
  translation_en: string
  translation_hi: string
  translation_pa: string
  words: Word[]
}

export interface VocabEntry {
  word: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
  scripture: string
  sourceId: string
  savedAt: string
}

export interface StudiedEntry {
  id: string
  swipedAt: string
}

export interface Scripture {
  id: string
  name: string
  shortName: string
  sourceId: 'G' | 'D' | 'B' | 'A'
}
