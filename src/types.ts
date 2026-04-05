export interface Word {
  gurmukhi: string
  transliteration: string
  meaning_en: string
  meaning_hi: string
  meaning_pa: string
}

export interface ScriptureEntry {
  id: string
  scripture: string
  ang: number
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
