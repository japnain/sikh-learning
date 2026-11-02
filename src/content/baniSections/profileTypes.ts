import type { ScriptureEntry, UiLocale } from '../../types'

export type BaniSectionLabels = Readonly<Record<UiLocale, string>>

/** Navigation metadata reviewed against one complete normalized provider reading. */
export interface BaniProfileSectionSpec {
  id: string
  kind: string
  number?: number
  /** Explicit labels are displayed verbatim, without appending number. */
  label?: BaniSectionLabels
  /** Positive /banis selection-row ID, scoped to this bani and fingerprint. */
  startVerseId: number
  /** May point past a heading/mangal to the original body opening. */
  excerptVerseId?: number
  /** One reviewed child level; targets/excerpts stay inside this parent's range. */
  children?: readonly BaniProfileSectionSpec[]
}

export interface BaniSectionProfile {
  baniDbId: number
  fingerprint: string
  sections: readonly BaniProfileSectionSpec[]
}

/** Loaded coordinates are the navigation target; verseId is not a global link. */
export interface ResolvedBaniProfileSection {
  id: string
  kind: string
  number?: number
  label: string
  entryIndex: number
  lineIndex: number
  source: NonNullable<ScriptureEntry['source']> | null
  verseId: number
  /** Original provider page only; inherited display pages are not evidence. */
  ang: number | null
  excerpt: string
  children?: readonly ResolvedBaniProfileSection[]
}
