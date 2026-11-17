/** One versioned appearance contract for device storage and portable backups. */
export const EPUB_READER_PREFERENCES_VERSION = 2
export const EPUB_READER_PREFERENCES_KEY = 'sikh-epub-reader-preferences'

export type EpubReaderLineHeight = 'compact' | 'comfortable' | 'spacious'
export type EpubReaderMeasure = 'narrow' | 'standard' | 'wide'
export type EpubReaderPalette = 'app' | 'paper' | 'sepia' | 'night'
export type EpubReaderFontFamily = 'literary' | 'classic' | 'sans'
export type EpubReaderParagraphSpacing = 'compact' | 'comfortable'
export type EpubReaderMode = 'paged' | 'scroll'
export type EpubReaderPageTurn = 'curl' | 'fade'

export const EPUB_FONT_SCALE_MIN = 0.85
export const EPUB_FONT_SCALE_MAX = 2
export const EPUB_FONT_SCALE_STEP = 0.05

export interface EpubReaderPreferences {
  fontScale: number
  lineHeight: EpubReaderLineHeight
  measure: EpubReaderMeasure
  palette: EpubReaderPalette
  fontFamily: EpubReaderFontFamily
  paragraphSpacing: EpubReaderParagraphSpacing
  readingMode: EpubReaderMode
  pageTurn: EpubReaderPageTurn
}

export const DEFAULT_EPUB_READER_PREFERENCES: EpubReaderPreferences = {
  fontScale: 1,
  lineHeight: 'comfortable',
  measure: 'standard',
  palette: 'app',
  fontFamily: 'literary',
  paragraphSpacing: 'comfortable',
  readingMode: 'paged',
  pageTurn: 'curl',
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const oneOf = (...values: string[]) => (value: unknown) => values.includes(value as string)
const validators = {
  fontScale: (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= EPUB_FONT_SCALE_MIN && value <= EPUB_FONT_SCALE_MAX,
  lineHeight: oneOf('compact', 'comfortable', 'spacious'),
  measure: oneOf('narrow', 'standard', 'wide'),
  palette: oneOf('app', 'paper', 'sepia', 'night'),
  fontFamily: oneOf('literary', 'classic', 'sans'),
  paragraphSpacing: oneOf('compact', 'comfortable'),
  readingMode: oneOf('paged', 'scroll'),
  pageTurn: oneOf('curl', 'fade'),
} satisfies Record<keyof EpubReaderPreferences, (value: unknown) => boolean>
const preferenceKeys = Object.keys(validators) as (keyof EpubReaderPreferences)[]
const versionOneKeys = new Set(['fontScale', 'lineHeight', 'measure', 'palette'])

export function clampEpubFontScale(fontScale: number): number {
  if (!Number.isFinite(fontScale)) return DEFAULT_EPUB_READER_PREFERENCES.fontScale
  return Math.min(EPUB_FONT_SCALE_MAX, Math.max(EPUB_FONT_SCALE_MIN, Math.round(fontScale * 20) / 20))
}

/** Mounted stores recover malformed fields independently; backups remain strict. */
export function normalizeEpubReaderPreferences(value: unknown): EpubReaderPreferences {
  const data = record(value) ? value : {}
  const preferences = Object.fromEntries(preferenceKeys.map(key => [key, validators[key](data[key]) ? data[key] : DEFAULT_EPUB_READER_PREFERENCES[key]])) as unknown as EpubReaderPreferences
  if (typeof data.fontScale === 'number') preferences.fontScale = clampEpubFontScale(data.fontScale)
  return preferences
}

export function isEpubReaderPreferences(value: unknown): value is EpubReaderPreferences {
  return record(value) && Object.keys(value).length === preferenceKeys.length
    && Object.keys(value).every(key => Object.hasOwn(validators, key))
    && preferenceKeys.every(key => validators[key](value[key]))
}

/** Strictly accept supported envelopes, defaulting only fields absent in older saves. */
export function parseEpubReaderPreferences(value: unknown): { version: typeof EPUB_READER_PREFERENCES_VERSION; state: EpubReaderPreferences } {
  if (!record(value) || ![1, EPUB_READER_PREFERENCES_VERSION].includes(value.version as number)
    || !record(value.state) || Object.keys(value).some(key => key !== 'version' && key !== 'state')) throw new Error('preference-version')
  const state = value.state
  if (Object.keys(state).some(key => !Object.hasOwn(validators, key) || (value.version === 1 && !versionOneKeys.has(key)))) throw new Error('preference-state')
  const migrated = { ...DEFAULT_EPUB_READER_PREFERENCES, ...state }
  if (!isEpubReaderPreferences(migrated)) throw new Error('preference-state')
  return { version: EPUB_READER_PREFERENCES_VERSION, state: migrated }
}

export function migrateEpubReaderPreferences(value: unknown, version: number): EpubReaderPreferences {
  // A newer app's data must not be rewritten as an older schema during hydration.
  if (version !== 1 && version !== EPUB_READER_PREFERENCES_VERSION) throw new Error('unsupported-reader-preferences-version')
  return normalizeEpubReaderPreferences(value)
}
