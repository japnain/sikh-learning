import type { VocabSense } from '../types'
import { vocabSenseKey } from './vocabReview'
import { normalizeStoredBookmarks, isSafeSavedReturnPath, type Bookmark } from '../store/bookmarks'
import { normalizeStoredFavorites, type FavoriteItem } from '../store/favorites'
import { buildBookmarkNaturalKey, buildFavoriteNaturalKey } from '../supabase/savedItemKeys'
import { parseSummary } from '../data/storyValidation'
import { normalizeNitnemCompletionEvents, getNitnemCompletedIds } from '../store/nitnemHistory'
import { getNitnemOption, DEFAULT_NITNEM_OPTION_IDS } from '../store/nitnem'
import { normalizeNitnemPractice } from './nitnemPractice'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS } from '../store/sundarGutkaLength'
import { toLocalDayStamp } from './localDates'
import { READER_PRESENTATION_CHANGED_EVENT } from './readerPresentation'
import { normalizeReaderTextSize } from './readerTextSize'
import '../store/stories'
import '../store/vocab'
import { getLocalCollectionSnapshotKeys, readResolvedLocalCollection, replaceLocalCollectionsFromLegacy } from './localCollection'
import { resetReaderPresentationSessionPreference } from './readerPresentation'

export const PERSONAL_BACKUP_MAX_BYTES = 16 * 1024 * 1024
const FORMAT = 'naamras-personal-data'
const READING_VISIBILITY_KEY = 'naamras-reading-visibility'
type RecordValue = Record<string, unknown>
type Check = (value: unknown) => boolean
const record = (value: unknown): value is RecordValue => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const text: Check = value => typeof value === 'string' && value.length <= 40_000
const nonempty: Check = value => text(value) && (value as string).trim().length > 0
const bool: Check = value => typeof value === 'boolean'
const number = (min = 0, max = Number.MAX_SAFE_INTEGER): Check => value => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const integer: Check = value => number()(value) && Number.isSafeInteger(value)
const date: Check = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const day: Check = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && date(`${value}T12:00:00Z`)
const oneOf = (...values: unknown[]): Check => value => values.includes(value)
const nullable = (check: Check): Check => value => value === null || check(value)
const list = (check: Check, max = 50_000): Check => value => Array.isArray(value) && value.length <= max && value.every(check)
const map = (check: Check): Check => value => record(value) && Object.values(value).every(check)
function shape(fields: Record<string, Check>): Check {
  return value => record(value)
    && Object.keys(value).every(key => key in fields || `${key}?` in fields)
    && Object.entries(fields).every(([key, check]) => key.endsWith('?')
      ? value[key.slice(0, -1)] === undefined || check(value[key.slice(0, -1)])
      : check(value[key]))
}
const safeRoute: Check = value => typeof value === 'string' && value.length < 4000
  && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && [...value].every(char => char.charCodeAt(0) >= 32)
  && /^\/(?:study|library|stories|banis)(?:[/?#]|$)/.test(value)
const context = shape({ scripture: text, sourceId: text, 'ang?': integer, 'shabadId?': integer, 'verseId?': integer, 'line?': text })
const definition = shape({ name: nonempty, 'entryId?': text, 'url?': value => {
  try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
} })
const sense = shape({ meaning_en: text, meaning_hi: text, meaning_pa: text, 'context?': context, 'definitionSource?': definition })
const vocab = shape({ word: nonempty, 'kind?': oneOf('word', 'phrase'), transliteration: text,
  meaning_en: text, meaning_hi: text, meaning_pa: text, scripture: text, sourceId: text, savedAt: date,
  'context?': context, 'definitionSource?': definition, 'senses?': list(sense, 200),
  'review?': shape({ dueAt: date, intervalDays: number(), reviewCount: integer, 'lastReviewedAt?': date }),
})
const locator = shape({ 'revision?': text, href: nonempty, type: oneOf('application/xhtml+xml', 'text/html'), 'title?': text,
  locations: shape({ progression: number(0, 1), totalProgression: number(0, 1), position: integer, 'blockId?': text }),
  'text?': shape({ 'before?': text, 'highlight?': text, 'after?': text }),
})
const session = shape({ scriptureId: nonempty, resumePath: safeRoute, 'resumeVerseId?': integer, 'readerLocator?': locator, updatedAt: date })
const storyPosition = shape({ paragraphId: nonempty, progress: number(0, 1), revision: integer, updatedAt: date, 'finishedAt?': date })
const nitnemId: Check = value => typeof value === 'string' && Boolean(getNitnemOption(value))
const bookmarks: Check = value => list(record)(value) && normalizeStoredBookmarks(value).length === (value as unknown[]).length
  && (value as RecordValue[]).every(item => item.returnPath === undefined || isSafeSavedReturnPath(item.returnPath))
const favorites: Check = value => list(record)(value) && normalizeStoredFavorites(value).length === (value as unknown[]).length
  && (value as RecordValue[]).every(item => item.returnPath === undefined || isSafeSavedReturnPath(item.returnPath))

interface Domain { version: number; defaults: RecordValue; check: Check }
const domains = {
  'sikh-language': { version: 0, defaults: { scriptMode: 'gurmukhi', showTransliteration: false, meaningLanguage: 'en', larivaar: false, showVishraam: true, lineSpacing: 'relaxed', textAlign: 'left', fontSize: 22, supportTextSize: 'standard', englishSource: 'bdb', punjabiSource: 'ss', hindiSource: 'ss', visraamSource: 'sttm' }, check: shape({ scriptMode: oneOf('gurmukhi', 'devanagari'), showTransliteration: bool, meaningLanguage: oneOf('none', 'en', 'pa', 'hi'), larivaar: bool, showVishraam: bool, lineSpacing: oneOf('compact', 'relaxed'), textAlign: oneOf('left', 'center'), fontSize: number(16, 34), supportTextSize: oneOf('standard', 'large', 'extra-large'), englishSource: oneOf('bdb', 'ms', 'ssk'), punjabiSource: nonempty, hindiSource: nonempty, visraamSource: oneOf('sttm', 'igurbani', 'sttm2') }) },
  'sikh-ui-locale': { version: 0, defaults: { locale: 'en' }, check: shape({ locale: oneOf('en', 'pa', 'hi') }) },
  'sikh-theme': { version: 1, defaults: { mode: 'system', dark: false }, check: shape({ mode: oneOf('system', 'light', 'dark'), dark: bool }) },
  'sikh-onboarding': { version: 0, defaults: { hasCompletedOnboarding: false, isOnboardingOpen: false, presentationMode: 'overlay', learningLevel: 'beginner', audience: 'adult', learningGoal: 'read' }, check: shape({ hasCompletedOnboarding: bool, isOnboardingOpen: bool, presentationMode: oneOf('first-run', 'overlay'), learningLevel: oneOf('beginner', 'familiar', 'daily-reader'), audience: oneOf('child', 'teen', 'adult'), learningGoal: oneOf('read', 'understand', 'habit') }) },
  'sikh-sundar-gutka-lengths': { version: 2, defaults: { lengths: DEFAULT_SUNDAR_GUTKA_LENGTHS }, check: shape({ lengths: value => map(oneOf('short', 'medium', 'long', 'extralong'))(value) && Object.keys(value as RecordValue).every(key => key in DEFAULT_SUNDAR_GUTKA_LENGTHS) }) },
  'sikh-epub-reader-preferences': { version: 1, defaults: { fontScale: 1, lineHeight: 'comfortable', measure: 'standard', palette: 'paper' }, check: shape({ fontScale: number(0.85, 2), lineHeight: oneOf('compact', 'comfortable', 'spacious'), measure: oneOf('narrow', 'standard', 'wide'), palette: oneOf('paper', 'sepia', 'night') }) },
  'naamras-home-artwork': { version: 1, defaults: { mode: 'fixed', selectedId: 'eclipse', visitIndex: -1, pendingVisit: false }, check: shape({ mode: oneOf('fixed', 'daily', 'visit'), selectedId: nonempty, visitIndex: number(-1, 100), pendingVisit: bool }) },
  'sikh-music': { version: 2, defaults: { selectedSoundId: null, selectedPresetId: null, volume: 0.6 }, check: shape({ selectedSoundId: nullable(text), selectedPresetId: nullable(oneOf('settle', 'focus', 'night')), volume: number(0, 1) }) },
  'sikh-recitation': { version: 0, defaults: { currentShabadId: null, currentTime: 0, playbackRate: 1 }, check: shape({ currentShabadId: nullable(integer), currentTime: number(), playbackRate: number(0.25, 4) }) },
  'sikh-vocab': { version: 0, defaults: { vocab: [] }, check: shape({ vocab: list(vocab) }) },
  'sikh-progress': { version: 3, defaults: { studied: [], reviewQueue: [], lastStudied: null, streak: 0, currentSession: null }, check: shape({ studied: list(shape({ id: nonempty, swipedAt: date })), reviewQueue: list(nonempty), lastStudied: nullable(day), streak: integer, currentSession: nullable(session) }) },
  'sikh-reading-progress': { version: 0, defaults: { progress: {} }, check: shape({ progress: map(list(integer)) }) },
  'naamras-reading-places': { version: 1, defaults: { places: {} }, check: shape({ places: map(session) }) },
  'naamras-nitnem-history': { version: 1, defaults: { events: [], remoteDays: {} }, check: shape({ events: value => list(record)(value) && normalizeNitnemCompletionEvents(value).length === (value as unknown[]).length, remoteDays: map(shape({ revision: text, updatedAt: date })) }) },
  'naamras-nitnem-practice': { version: 1, defaults: { active: null }, check: shape({ active: value => value === null || normalizeNitnemPractice(value) !== null }) },
  'sikh-nitnem': { version: 5, defaults: { completedDate: toLocalDayStamp(new Date()), completedIds: [], selectedIds: [...DEFAULT_NITNEM_OPTION_IDS], completionTrackingEnabled: true, weeklyDayGoal: 7 }, check: shape({ completedDate: day, completedIds: list(nitnemId, 50), selectedIds: value => list(nitnemId, 50)(value) && (value as unknown[]).length > 0, completionTrackingEnabled: bool, weeklyDayGoal: number(1, 7) }) },
  'sikh-recent-search': { version: 2, defaults: { recent: [] }, check: shape({ recent: list(shape({ query: nonempty, mode: oneOf('first-letters', 'first-letters-anywhere', 'gurmukhi', 'english', 'transliteration', 'ang', 'auto-detect'), source: oneOf('all', 'G', 'D', 'B', 'A'), scope: oneOf('all', 'gurbani', 'books', 'stories'), pinned: bool, savedAt: date }), 200) }) },
} satisfies Record<string, Domain>
export const PERSONAL_DATA_KEYS = [...Object.keys(domains), 'sikh-bookmarks', 'sikh-favorites', 'naamras-story-state-v1', 'naamras-reader-presentation', 'naamras-ui-disclosure'] as const
export interface PersonalDataBackup { format: typeof FORMAT; version: 1; createdAt: string; data: Record<string, unknown> }
export type RestoreMode = 'merge' | 'replace'

function checkTree(value: unknown, depth = 0, budget = { nodes: 0 }): void {
  if (++budget.nodes > 300_000 || depth > 14) throw new Error('bounds')
  if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return
  if (typeof value === 'string' && value.length <= 40_000) return
  if (Array.isArray(value) && value.length <= 50_000) { value.forEach(item => checkTree(item, depth + 1, budget)); return }
  if (record(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype' || key.length > 4000) throw new Error('unsafe-key')
      checkTree(item, depth + 1, budget)
    }
    return
  }
  throw new Error('invalid-value')
}
function normalizeData(data: unknown): Record<string, unknown> {
  if (!record(data) || Object.keys(data).length !== PERSONAL_DATA_KEYS.length || Object.keys(data).some(key => !PERSONAL_DATA_KEYS.includes(key))) throw new Error('domains')
  const result: Record<string, unknown> = {}
  for (const [key, domain] of Object.entries(domains)) {
    const value = data[key]
    const legacySearches = key === 'sikh-recent-search' && record(value) && value.version === 1
    if (!record(value) || (!legacySearches && value.version !== domain.version) || !record(value.state) || Object.keys(value).some(key => key !== 'version' && key !== 'state')) throw new Error('version')
    const state: RecordValue = { ...domain.defaults, ...value.state }
    if (legacySearches && Array.isArray(state.recent)) state.recent = state.recent.map(item => record(item) ? { ...item, scope: 'all' } : item)
    if (!domain.check(state)) throw new Error('state')
    result[key] = { version: domain.version, state }
  }
  if (!bookmarks(data['sikh-bookmarks'])) throw new Error('bookmarks')
  result['sikh-bookmarks'] = normalizeStoredBookmarks(data['sikh-bookmarks'])
  const favoriteData = data['sikh-favorites']
  if (!record(favoriteData) || !record(favoriteData.state) || !favorites(favoriteData.state.favorites)) throw new Error('favorites')
  result['sikh-favorites'] = { version: 0, state: { favorites: normalizeStoredFavorites(favoriteData) } }
  const stories = data['naamras-story-state-v1']
  if (!shape({ version: oneOf(1), saved: map(value => record(value) && Boolean(parseSummary(value)) && date(value.savedAt)), positions: map(storyPosition) })(stories)) throw new Error('stories')
  result['naamras-story-state-v1'] = stories
  if (!oneOf('read', 'study', null)(data['naamras-reader-presentation']) || !map(bool)(data['naamras-ui-disclosure'])) throw new Error('preferences')
  result['naamras-reader-presentation'] = data['naamras-reader-presentation']
  result['naamras-ui-disclosure'] = data['naamras-ui-disclosure']
  return result
}
export function parsePersonalDataBackup(raw: string): PersonalDataBackup {
  if (new Blob([raw]).size > PERSONAL_BACKUP_MAX_BYTES) throw new Error('backup-too-large')
  const value: unknown = JSON.parse(raw)
  checkTree(value)
  if (!record(value) || value.format !== FORMAT || value.version !== 1 || !date(value.createdAt)
    || Object.keys(value).some(key => !['format', 'version', 'createdAt', 'data'].includes(key))) throw new Error('backup-format')
  return { format: FORMAT, version: 1, createdAt: value.createdAt as string, data: normalizeData(value.data) }
}
/** Only presentation preferences can be recovered with defaults. Reading data stays strict. */
const OPTIONAL_PREFERENCE_KEYS = new Set([
  'sikh-language', 'sikh-ui-locale', 'sikh-theme', 'sikh-onboarding',
  'sikh-sundar-gutka-lengths', 'sikh-epub-reader-preferences', 'naamras-home-artwork',
  'sikh-music', 'sikh-recitation', 'naamras-reader-presentation', 'naamras-ui-disclosure',
])
export interface PersonalDataBackupResult { backup: PersonalDataBackup; omittedPreferences: string[] }

export function createPersonalDataBackupResult(storage: Storage = localStorage): PersonalDataBackupResult {
  const data: Record<string, unknown> = {}
  const omittedPreferences: string[] = []
  const recoverPreference = (key: string, read: () => unknown, fallback: unknown) => {
    try { return read() } catch (error) {
      if (!OPTIONAL_PREFERENCE_KEYS.has(key)) throw error
      omittedPreferences.push(key)
      return structuredClone(fallback)
    }
  }
  for (const [key, domain] of Object.entries(domains)) {
    // Storage failures are not corrupt preferences: keep them visible to the caller.
    const raw = readResolvedLocalCollection(key, storage)
    const fallback = { version: domain.version, state: domain.defaults }
    data[key] = recoverPreference(key, () => {
      const value = raw === null ? structuredClone(fallback) : JSON.parse(raw)
      checkTree(value)
      if (!OPTIONAL_PREFERENCE_KEYS.has(key)) return value
      if (!record(value) || value.version !== domain.version || !record(value.state)
        || Object.keys(value).some(field => field !== 'state' && field !== 'version')) throw new Error('preference-version')
      const state: RecordValue = { ...domain.defaults, ...value.state }
      // Older readers allowed 36–38px; preserve their supported migration.
      if (key === 'sikh-language' && number(16, 38)(state.fontSize)) state.fontSize = normalizeReaderTextSize(state.fontSize)
      if (!domain.check(state)) throw new Error('preference-state')
      return { version: domain.version, state }
    }, fallback)
  }
  const bookmarkData = JSON.parse(readResolvedLocalCollection('sikh-bookmarks', storage) ?? '[]')
  const bookmarkRows = Array.isArray(bookmarkData) ? bookmarkData : bookmarkData?.state?.bookmarks
  if (!bookmarks(bookmarkRows)) throw new Error('bookmarks')
  data['sikh-bookmarks'] = normalizeStoredBookmarks(bookmarkRows)
  const favoriteData = JSON.parse(readResolvedLocalCollection('sikh-favorites', storage) ?? '[]')
  const favoriteRows = Array.isArray(favoriteData) ? favoriteData : favoriteData?.state?.favorites
  if (!favorites(favoriteRows)) throw new Error('favorites')
  data['sikh-favorites'] = { version: 0, state: { favorites: normalizeStoredFavorites(favoriteRows) } }
  data['naamras-story-state-v1'] = JSON.parse(readResolvedLocalCollection('naamras-story-state-v1', storage) ?? '{"version":1,"saved":{},"positions":{}}')
  const presentation = storage.getItem('naamras-reader-presentation')
  data['naamras-reader-presentation'] = recoverPreference('naamras-reader-presentation', () => {
    if (!oneOf('read', 'study', null)(presentation)) throw new Error('presentation')
    return presentation
  }, null)
  const disclosure = storage.getItem('naamras-ui-disclosure')
  data['naamras-ui-disclosure'] = recoverPreference('naamras-ui-disclosure', () => {
    const value = JSON.parse(disclosure ?? '{}')
    checkTree(value)
    if (!map(bool)(value)) throw new Error('disclosure')
    return value
  }, {})
  return { backup: parsePersonalDataBackup(JSON.stringify({ format: FORMAT, version: 1, createdAt: new Date().toISOString(), data })), omittedPreferences }
}

export function createPersonalDataBackup(storage: Storage = localStorage): PersonalDataBackup {
  return createPersonalDataBackupResult(storage).backup
}

const stateOf = (backup: PersonalDataBackup, key: string): RecordValue => (backup.data[key] as { state: RecordValue }).state
const rows = (value: unknown) => value as RecordValue[]
function latest(left: unknown, right: unknown, clock = 'updatedAt') {
  if (!left) return right
  if (!right) return left
  return String((right as RecordValue)[clock] ?? '') > String((left as RecordValue)[clock] ?? '') ? right : left
}
function union(left: unknown[], right: unknown[], key: (item: unknown) => string, clock = 'savedAt') {
  const items = new Map(left.map(item => [key(item), item]))
  for (const item of right) items.set(key(item), latest(items.get(key(item)), item, clock))
  return [...items.values()]
}
function mergeMap(left: RecordValue, right: RecordValue, clock = 'updatedAt') {
  return Object.fromEntries([...new Set([...Object.keys(left), ...Object.keys(right)])].map(key => [key, latest(left[key], right[key], clock)]))
}
/** Merge keeps this device's preferences and combines saved work by stable identity. */
export function mergePersonalDataBackups(current: PersonalDataBackup, imported: PersonalDataBackup, storage: Storage = localStorage): PersonalDataBackup {
  const merged = structuredClone(current)
  for (const key of PERSONAL_DATA_KEYS) if (storage.getItem(key) === null) merged.data[key] = structuredClone(imported.data[key])
  merged.data['sikh-bookmarks'] = union(current.data['sikh-bookmarks'] as Bookmark[], imported.data['sikh-bookmarks'] as Bookmark[], value => buildBookmarkNaturalKey(value as Bookmark))
  const favs = union(stateOf(current, 'sikh-favorites').favorites as FavoriteItem[], stateOf(imported, 'sikh-favorites').favorites as FavoriteItem[], value => buildFavoriteNaturalKey(value as FavoriteItem))
  stateOf(merged, 'sikh-favorites').favorites = favs
  const vocabByKey = new Map(rows(stateOf(current, 'sikh-vocab').vocab).map(item => [`${item.kind ?? 'word'}:${item.word}`, item]))
  for (const item of rows(stateOf(imported, 'sikh-vocab').vocab)) {
    const key = `${item.kind ?? 'word'}:${item.word}`, local = vocabByKey.get(key)
    if (!local) { vocabByKey.set(key, item); continue }
    const toSense = (entry: RecordValue) => Object.fromEntries(['meaning_en', 'meaning_hi', 'meaning_pa', 'context', 'definitionSource'].filter(key => entry[key] !== undefined).map(key => [key, entry[key]]))
    const senses = [...(local.senses as unknown[] ?? []), toSense(item), ...(item.senses as unknown[] ?? [])]
    const distinct = [...new Map(senses.map(sense => [vocabSenseKey(sense as VocabSense), sense])).values()].filter(sense => vocabSenseKey(sense as VocabSense) !== vocabSenseKey(toSense(local) as unknown as VocabSense))
    vocabByKey.set(key, { ...local, ...(distinct.length ? { senses: distinct } : {}), review: latest(local.review, item.review, 'lastReviewedAt') })
  }
  stateOf(merged, 'sikh-vocab').vocab = [...vocabByKey.values()]
  for (const [domain, field, clock] of [['naamras-reading-places', 'places', 'updatedAt'], ['naamras-nitnem-history', 'remoteDays', 'updatedAt']] as const) {
    stateOf(merged, domain)[field] = mergeMap(stateOf(current, domain)[field] as RecordValue, stateOf(imported, domain)[field] as RecordValue, clock)
  }
  const history = union(rows(stateOf(current, 'naamras-nitnem-history').events), rows(stateOf(imported, 'naamras-nitnem-history').events), value => String((value as RecordValue).id), 'occurredAt')
  stateOf(merged, 'naamras-nitnem-history').events = history
  const routine = stateOf(merged, 'sikh-nitnem')
  routine.completedDate = toLocalDayStamp(new Date())
  routine.completedIds = getNitnemCompletedIds(normalizeNitnemCompletionEvents(history), String(routine.completedDate))
  routine.selectedIds = [...new Set([...(stateOf(current, 'sikh-nitnem').selectedIds as string[]), ...(stateOf(imported, 'sikh-nitnem').selectedIds as string[])])]
  stateOf(merged, 'naamras-nitnem-practice').active = latest(stateOf(current, 'naamras-nitnem-practice').active, stateOf(imported, 'naamras-nitnem-practice').active)
  const progress = stateOf(merged, 'sikh-progress'), a = stateOf(current, 'sikh-progress'), b = stateOf(imported, 'sikh-progress')
  progress.studied = union(rows(a.studied), rows(b.studied), value => String((value as RecordValue).id), 'swipedAt')
  progress.reviewQueue = [...new Set([...(a.reviewQueue as string[]), ...(b.reviewQueue as string[])])]
  progress.currentSession = latest(a.currentSession, b.currentSession)
  if (String(b.lastStudied ?? '') > String(a.lastStudied ?? '')) { progress.lastStudied = b.lastStudied; progress.streak = b.streak }
  const readingA = stateOf(current, 'sikh-reading-progress').progress as RecordValue, readingB = stateOf(imported, 'sikh-reading-progress').progress as RecordValue
  stateOf(merged, 'sikh-reading-progress').progress = Object.fromEntries([...new Set([...Object.keys(readingA), ...Object.keys(readingB)])].map(key => [key, [...new Set([...(readingA[key] as number[] ?? []), ...(readingB[key] as number[] ?? [])])]]))
  const storiesA = current.data['naamras-story-state-v1'] as RecordValue, storiesB = imported.data['naamras-story-state-v1'] as RecordValue
  merged.data['naamras-story-state-v1'] = { version: 1, saved: mergeMap(storiesA.saved as RecordValue, storiesB.saved as RecordValue, 'savedAt'), positions: mergeMap(storiesA.positions as RecordValue, storiesB.positions as RecordValue) }
  stateOf(merged, 'sikh-recent-search').recent = union(rows(stateOf(current, 'sikh-recent-search').recent), rows(stateOf(imported, 'sikh-recent-search').recent), item => { const value = item as RecordValue; return `${value.mode}:${value.source}:${value.scope}:${value.query}` }).sort((a, b) => String((b as RecordValue).savedAt).localeCompare(String((a as RecordValue).savedAt))).slice(0, 200)
  return parsePersonalDataBackup(JSON.stringify(merged))
}
export function summarizePersonalDataBackup(backup: PersonalDataBackup) {
  const stories = backup.data['naamras-story-state-v1'] as RecordValue
  return { bookmarks: (backup.data['sikh-bookmarks'] as unknown[]).length, favorites: (stateOf(backup, 'sikh-favorites').favorites as unknown[]).length,
    words: (stateOf(backup, 'sikh-vocab').vocab as unknown[]).length, stories: Object.keys(stories.saved as RecordValue).length,
    readingPlaces: Object.keys(stateOf(backup, 'naamras-reading-places').places as RecordValue).length + Object.keys(stories.positions as RecordValue).length,
    nitnemEvents: (stateOf(backup, 'naamras-nitnem-history').events as unknown[]).length }
}

async function preparePersonalStores() {
  const modules = await Promise.all([
    import('../store/language'), import('../store/locale'), import('../store/theme'), import('../store/onboarding'),
    import('../store/sundarGutkaLength'), import('../store/epubReader'), import('../store/homeArtwork'), import('../store/music'),
    import('../store/recitation'), import('../store/vocab'),
    // Progress hydration migrates its current session into readingPlaces.
    // Hydrate the restored places first so that migration cannot write stale
    // mounted state over the backup's independent book and scripture places.
    import('../store/readingPlaces'), import('../store/progress'), import('../store/readingProgress'),
    import('../store/nitnemHistory'), import('../store/nitnemPractice'), import('../store/nitnem'), import('../store/recentSearch'),
    import('../store/readingVisibility'),
  ])
  const [{ useBookmarksStore }, { useFavoritesStore }, { useStoryStore }] = await Promise.all([import('../store/bookmarks'), import('../store/favorites'), import('../store/stories')])
  type Store = { getState: () => unknown; setState: (value: unknown, replace: true) => void; persist?: { rehydrate: () => Promise<void> | void; captureRollback?: () => (() => void) } }
  const persisted = modules.flatMap(module => Object.values(module)).filter(value => typeof value === 'function' && 'persist' in value) as unknown as Store[]
  const stores = [...persisted, useBookmarksStore, useFavoritesStore, useStoryStore] as unknown as Store[]
  return {
    apply: async () => {
      for (const store of persisted) await store.persist!.rehydrate()
      useBookmarksStore.getState().hydrateCachedBookmarks()
      useFavoritesStore.getState().hydrateCachedFavorites()
      useStoryStore.getState().hydrateCachedStories()
      const presentation = localStorage.getItem('naamras-reader-presentation')
      resetReaderPresentationSessionPreference()
      window.dispatchEvent(new CustomEvent(READER_PRESENTATION_CHANGED_EVENT, { detail: presentation }))
    },
    captureRollback: () => {
      const originals = stores.map(store => store.getState())
      const restoreSessionState = stores.map(store => store.persist?.captureRollback?.())
      return () => {
        // Zustand updates memory before its persistence write; continue restoring
        // every mounted store even if disk writes remain blocked.
        stores.forEach((store, index) => { try { store.setState(originals[index], true) } catch { /* Raw storage is restored separately below. */ } })
        restoreSessionState.forEach(restore => restore?.())
        modules[2].applyThemeToDocument(modules[2].useThemeStore.getState().dark)
      }
    },
  }
}

type RestoreOptions = { storage?: Storage; rehydrate?: () => Promise<void>; pauseSync?: () => ((safeToResume?: boolean) => void) }

/** Writes are verified before mounted stores change; any failure rolls back every touched key. */
export async function restorePersonalDataBackupResult(input: PersonalDataBackup, mode: RestoreMode, options: RestoreOptions = {}): Promise<PersonalDataBackupResult> {
  const storage = options.storage ?? localStorage
  const validated = parsePersonalDataBackup(JSON.stringify(input))
  const pauseSync = options.pauseSync ?? (await import('../supabase/runtime')).pauseCloudSyncForRestore
  const resume = pauseSync()
  const touched: string[] = []
  let previous = new Map<string, string | null>()
  let storesStarted = false
  let rollbackFailed = false
  let prepared: Awaited<ReturnType<typeof preparePersonalStores>> | null = null
  let rollbackStores: (() => void) | undefined
  try {
    if (!options.rehydrate) prepared = await preparePersonalStores()
    // Imports may yield to an in-flight cloud response or another local action.
    // Pause first, then capture the rollback baseline with no await before writes.
    rollbackStores = prepared?.captureRollback()
    const snapshotKeys = getLocalCollectionSnapshotKeys()
    const writeKeys = [...PERSONAL_DATA_KEYS, ...snapshotKeys, ...(mode === 'replace' ? [READING_VISIBILITY_KEY] : [])]
    previous = new Map(writeKeys.map(key => [key, storage.getItem(key)]))
    const current = mode === 'merge' ? createPersonalDataBackupResult(storage) : null
    const result = current ? mergePersonalDataBackups(current.backup, validated, storage) : validated
    stateOf(result, 'sikh-onboarding').isOnboardingOpen = false
    stateOf(result, 'sikh-onboarding').presentationMode = 'overlay'
    for (const key of PERSONAL_DATA_KEYS) {
      touched.push(key)
      const value = result.data[key]
      if (key === 'naamras-reader-presentation' && value === null) {
        storage.removeItem(key)
        if (storage.getItem(key) !== null) throw new Error('delete-not-persisted')
      }
      else {
        const encoded = key === 'naamras-reader-presentation' ? String(value) : JSON.stringify(value)
        storage.setItem(key, encoded)
        if (storage.getItem(key) !== encoded) throw new Error('write-not-persisted')
      }
    }
    if (mode === 'replace') {
      // Shelf dismissal is device-local. Restored reading places should be
      // visible, while a failed restore must retain the previous preferences.
      touched.push(READING_VISIBILITY_KEY)
      const visibleShelf = JSON.stringify({ version: 1, state: { hidden: {} } })
      storage.setItem(READING_VISIBILITY_KEY, visibleShelf)
      if (storage.getItem(READING_VISIBILITY_KEY) !== visibleShelf) throw new Error('write-not-persisted')
    }
    touched.push(...snapshotKeys)
    replaceLocalCollectionsFromLegacy(storage)
    storesStarted = true
    await (options.rehydrate ?? prepared!.apply)()
    return { backup: result, omittedPreferences: current?.omittedPreferences ?? [] }
  } catch (error) {
    if (storesStarted) {
      try { rollbackStores?.() } catch { rollbackFailed = true }
    }
    for (const key of touched.reverse()) {
      try {
        const old = previous.get(key) ?? null
        if (storage.getItem(key) === old) continue
        if (old === null) storage.removeItem(key)
        else storage.setItem(key, old)
        if (storage.getItem(key) !== old) rollbackFailed = true
      } catch { rollbackFailed = true }
    }
    if (storesStarted && options.rehydrate) { try { await options.rehydrate() } catch { rollbackFailed = true } }
    if (storesStarted && typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent(READER_PRESENTATION_CHANGED_EVENT, { detail: storage.getItem('naamras-reader-presentation') })) }
      catch { rollbackFailed = true }
    }
    if (rollbackFailed) throw new Error('restore-rollback-failed', { cause: error })
    throw new Error('restore-failed', { cause: error })
  } finally { resume(!rollbackFailed) }
}


/** Compatibility API for callers that only need the restored personal data. */
export async function restorePersonalDataBackup(input: PersonalDataBackup, mode: RestoreMode, options: RestoreOptions = {}): Promise<PersonalDataBackup> {
  return (await restorePersonalDataBackupResult(input, mode, options)).backup
}
