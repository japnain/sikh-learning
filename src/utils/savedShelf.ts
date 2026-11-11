import type { Bookmark } from '../store/bookmarks'
import type { FavoriteItem } from '../store/favorites'
import type { MeaningLanguage, ScriptMode, UiLocale, VocabEntry } from '../types'
import { renderScriptText } from './readerDisplay'
import { formatSourceReaderReference, isSourceReaderId, SOURCE_READER_META } from './sourceReaderMeta'

export function normalizeSavedSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim()
}

export function matchesSavedSearch(fields: Array<string | number | null | undefined>, query: string): boolean {
  const document = normalizeSavedSearch(fields.filter(value => value != null).join(' '))
  return normalizeSavedSearch(query).split(' ').filter(Boolean).every(token => document.includes(token))
}

export function savedSourceSearchFields(source: string, value?: number): string[] {
  if (!isSourceReaderId(source)) return [source]
  const metadata = SOURCE_READER_META[source]
  return [metadata.name, metadata.shortName, ...(['en', 'pa', 'hi'] as const).map(locale =>
    value == null ? '' : formatSourceReaderReference({ source, value, locale }))]
}

export function savedPassageMatches(item: Bookmark | FavoriteItem, query: string, script: ScriptMode): boolean {
  const book = item.type === 'book'
  return matchesSavedSearch([
    item.title, renderScriptText(item.title, script), item.excerpt,
    book ? item.excerpt : renderScriptText(item.excerpt ?? '', script),
    'description' in item ? item.description : '', item.transliteration,
    item.translation_en, item.translation_pa, item.translation_hi,
    ...(book ? [item.workId, item.chapterLabel, 'Book ਕਿਤਾਬ ਪੁਸਤਕ'] : savedSourceSearchFields(item.source, item.ang)),
  ], query)
}

export function savedVocabMatches(entry: VocabEntry, query: string, script: ScriptMode): boolean {
  return matchesSavedSearch([
    entry.word, renderScriptText(entry.word, script), entry.transliteration,
    entry.meaning_en, entry.meaning_pa, entry.meaning_hi, entry.scripture,
    ...savedSourceSearchFields(entry.context?.sourceId ?? entry.sourceId, entry.context?.ang),
    ...(entry.senses ?? []).flatMap(sense => [sense.meaning_en, sense.meaning_hi, sense.meaning_pa]),
  ], query)
}

export interface SavedMeaning { text: string; lang: UiLocale }

/** A fallback must retain the language of the text actually displayed. */
export function selectSavedMeaning(
  values: { en?: string; pa?: string; hi?: string }, preference: MeaningLanguage,
): SavedMeaning | null {
  if (preference === 'none') return null
  const languages = [...new Set<UiLocale>([preference, 'en', 'pa', 'hi'])]
  for (const lang of languages) {
    const text = values[lang]?.trim()
    if (text) return { text, lang }
  }
  return null
}

export function savedPassageMeaning(item: Bookmark | FavoriteItem, preference: MeaningLanguage): SavedMeaning | null {
  return selectSavedMeaning({ en: item.translation_en, pa: item.translation_pa, hi: item.translation_hi }, preference)
}

export function savedVocabMeaning(entry: VocabEntry, preference: MeaningLanguage): SavedMeaning | null {
  return selectSavedMeaning({ en: entry.meaning_en, pa: entry.meaning_pa, hi: entry.meaning_hi }, preference)
}

export function savedReviewPath(entry: VocabEntry): string {
  const params = new URLSearchParams({ kind: entry.kind ?? 'word', q: entry.word })
  return `/vocab?${params}`
}
