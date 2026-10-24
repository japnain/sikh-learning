import type { VocabContext, VocabEntry, VocabSense } from '../types'

type MeaningLanguage = 'en' | 'pa' | 'hi'

export function hasVocabMeaning(sense: VocabSense): boolean {
  return [sense.meaning_en, sense.meaning_pa, sense.meaning_hi].some(value => typeof value === 'string' && value.trim().length > 0)
}

export function vocabSenseKey(sense: VocabSense): string {
  const context = sense.context
  return JSON.stringify([
    sense.meaning_en?.trim() ?? '', sense.meaning_hi?.trim() ?? '', sense.meaning_pa?.trim() ?? '',
    sense.definitionSource?.name ?? 'BaniDB', sense.definitionSource?.entryId ?? '',
    context?.sourceId ?? '', context?.scripture ?? '', context?.ang ?? null,
    context?.shabadId ?? null, context?.verseId ?? null, context?.line ?? '',
  ])
}

export function hasVocabSense(entry: VocabEntry, sense: VocabSense): boolean {
  const key = vocabSenseKey(sense)
  return [entry, ...(entry.senses ?? [])].some(item => vocabSenseKey(item) === key)
}

export function getVocabMeaning(entry: VocabEntry | VocabSense, preferred: string) {
  const sense = hasVocabMeaning(entry) ? entry : ('senses' in entry ? entry.senses?.find(hasVocabMeaning) : undefined)
  if (!sense) return null
  const languages: MeaningLanguage[] = [preferred === 'pa' || preferred === 'hi' ? preferred : 'en', 'en', 'pa', 'hi']
  const language = languages.find(value => sense[`meaning_${value}`]?.trim())
  return language ? { text: sense[`meaning_${language}`].trim(), language, source: sense.definitionSource } : null
}

export function canReviewVocab(entry: VocabEntry): boolean {
  return Boolean(getVocabMeaning(entry, 'en'))
}

export function vocabEntryKey(entry: Pick<VocabEntry, 'word' | 'kind'>): string {
  return JSON.stringify([entry.kind ?? 'word', entry.word])
}

export function vocabContextPath(context: VocabContext | undefined): string | null {
  if (!context) return null
  const positiveId = (value: number | undefined) => Number.isSafeInteger(value) && Number(value) > 0
  if (positiveId(context.shabadId)) {
    const query = new URLSearchParams({ shabadId: String(context.shabadId) })
    if (positiveId(context.verseId)) query.set('verseId', String(context.verseId))
    return `/study?${query}`
  }
  if (['G', 'D', 'B', 'A'].includes(context.sourceId) && positiveId(context.ang)) {
    return `/study?source=${context.sourceId}&ang=${context.ang}`
  }
  return null
}
