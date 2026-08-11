import type { VocabEntry } from '../types'
import { useBookmarksStore } from '../store/bookmarks'
import { useFavoritesStore } from '../store/favorites'
import { useLanguageStore } from '../store/language'
import { useLocaleStore } from '../store/locale'
import { useNitemStore } from '../store/nitnem'
import { useOnboardingStore } from '../store/onboarding'
import { useProgressStore } from '../store/progress'
import { useReadingProgressStore } from '../store/readingProgress'
import { useActivityEventsStore } from '../store/activityEvents'
import { DEFAULT_SUNDAR_GUTKA_LENGTHS, useSundarGutkaLengthStore } from '../store/sundarGutkaLength'
import { useThemeStore } from '../store/theme'
import { useVocabStore } from '../store/vocab'
import { getNaamrasDeviceId } from './device'
import { buildBookmarkNaturalKey, buildFavoriteNaturalKey } from './savedItemKeys'
import type {
  CloudActivityEvent,
  CloudBookmarkPayload,
  CloudFavoritePayload,
  CloudLearningProgressRecord,
  CloudLocalSnapshot,
  CloudProfileRecord,
  CloudRemoteSnapshot,
  CloudSavedItemKind,
  CloudSavedItemRecord,
  CloudVocabRecord,
} from './types'

export const CLOUD_SNAPSHOT_VERSION = 3 as const

const SNAPSHOT_METADATA_STORAGE_KEY = 'naamras-cloud-sync-export-metadata'

type SnapshotRecordType = 'profile' | 'saved-item' | 'vocab-entry' | 'learning-progress'
type SnapshotBackedRecord =
  | CloudProfileRecord
  | CloudSavedItemRecord
  | CloudVocabRecord
  | CloudLearningProgressRecord

type SnapshotMetadataRecord = {
  hash: string
  clientUpdatedAt: string
  baseUpdatedAt: string | null
  recordType: SnapshotRecordType
  naturalKey: string
  record: SnapshotBackedRecord
}

type SnapshotMetadataMap = Record<string, SnapshotMetadataRecord | {
  hash?: unknown
  clientUpdatedAt?: unknown
}>

type RecordClock = {
  hash: string
  clientUpdatedAt: string
  baseUpdatedAt: string | null
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isSnapshotMetadataRecord(value: unknown): value is SnapshotMetadataRecord {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SnapshotMetadataRecord>
  return typeof candidate.hash === 'string'
    && isIsoTimestamp(candidate.clientUpdatedAt)
    && (candidate.baseUpdatedAt === null || isIsoTimestamp(candidate.baseUpdatedAt))
    && (
      candidate.recordType === 'profile'
      || candidate.recordType === 'saved-item'
      || candidate.recordType === 'vocab-entry'
      || candidate.recordType === 'learning-progress'
    )
    && typeof candidate.naturalKey === 'string'
    && Boolean(candidate.record && typeof candidate.record === 'object')
}

function metadataKey(recordType: SnapshotRecordType, naturalKey: string) {
  return `${recordType}:${naturalKey}`
}

function createMetadata(
  id: string,
  clock: Pick<RecordClock, 'clientUpdatedAt' | 'baseUpdatedAt'>,
  deletedAt: string | null = null
) {
  return {
    id,
    userId: null,
    deviceId: getNaamrasDeviceId(),
    clientUpdatedAt: clock.clientUpdatedAt,
    baseUpdatedAt: clock.baseUpdatedAt,
    deletedAt,
  }
}

function canUseStorage() {
  try {
    return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function readSnapshotMetadata(): SnapshotMetadataMap {
  if (!canUseStorage()) return {}

  try {
    const raw = globalThis.localStorage.getItem(SNAPSHOT_METADATA_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as SnapshotMetadataMap : {}
  } catch {
    return {}
  }
}

function writeSnapshotMetadata(metadata: SnapshotMetadataMap) {
  if (!canUseStorage()) return false

  try {
    globalThis.localStorage.setItem(SNAPSHOT_METADATA_STORAGE_KEY, JSON.stringify(metadata))
    return true
  } catch {
    // Local reading remains usable when browser storage is under pressure.
    return false
  }
}

function serializeMetadataPayload(payload: unknown) {
  return JSON.stringify(payload)
}

function resolveRecordClock(
  metadata: SnapshotMetadataMap,
  key: string,
  semanticPayload: unknown,
  now: string,
  initialTimestamp?: string | null
): RecordClock {
  const hash = serializeMetadataPayload(semanticPayload)
  const previous = metadata[key]

  if (isSnapshotMetadataRecord(previous) && previous.hash === hash && !previous.record.deletedAt) {
    return {
      hash,
      clientUpdatedAt: previous.clientUpdatedAt,
      baseUpdatedAt: previous.baseUpdatedAt,
    }
  }

  return {
    hash,
    clientUpdatedAt: isSnapshotMetadataRecord(previous)
      ? now
      : (isIsoTimestamp(initialTimestamp) ? initialTimestamp : now),
    baseUpdatedAt: isSnapshotMetadataRecord(previous)
      ? previous.baseUpdatedAt
      : null,
  }
}

function rememberRecord(
  metadata: SnapshotMetadataMap,
  key: string,
  recordType: SnapshotRecordType,
  naturalKey: string,
  hash: string,
  record: SnapshotBackedRecord
) {
  metadata[key] = {
    hash,
    clientUpdatedAt: record.clientUpdatedAt,
    baseUpdatedAt: record.baseUpdatedAt,
    recordType,
    naturalKey,
    record,
  }
}

function normalizeVocabWord(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function buildVocabNaturalKey(record: Pick<VocabEntry, 'kind' | 'word'>) {
  return `${record.kind ?? 'word'}:${normalizeVocabWord(record.word)}`
}

function extractProfileRecord(
  metadata: SnapshotMetadataMap,
  now: string
): CloudProfileRecord {
  const locale = useLocaleStore.getState().locale
  const darkMode = useThemeStore.getState().dark
  const language = useLanguageStore.getState()
  const onboarding = useOnboardingStore.getState()
  const sundarGutkaLengths = useSundarGutkaLengthStore.getState().lengths

  const reader = {
    scriptMode: language.scriptMode,
    showTransliteration: language.showTransliteration,
    meaningLanguage: language.meaningLanguage,
    larivaar: language.larivaar,
    showVishraam: language.showVishraam,
    lineSpacing: language.lineSpacing,
    textAlign: language.textAlign,
    fontSize: language.fontSize,
    englishSource: language.englishSource,
    punjabiSource: language.punjabiSource,
    hindiSource: language.hindiSource,
    visraamSource: language.visraamSource,
    sundarGutkaLengths,
  }
  const onboardingState = {
    hasCompletedOnboarding: onboarding.hasCompletedOnboarding,
    learningLevel: onboarding.learningLevel,
    audience: onboarding.audience,
    learningGoal: onboarding.learningGoal,
    presentationMode: onboarding.presentationMode,
  }
  const semanticPayload = {
    locale,
    darkMode,
    reader,
    onboarding: onboardingState,
  }
  const key = metadataKey('profile', 'profile')
  const clock = resolveRecordClock(metadata, key, semanticPayload, now)
  const record: CloudProfileRecord = {
    ...createMetadata('profile', clock),
    ...semanticPayload,
  }

  rememberRecord(metadata, key, 'profile', 'profile', clock.hash, record)
  return record
}

function createSavedItemTombstone(
  metadata: SnapshotMetadataMap,
  kind: CloudSavedItemKind,
  naturalKey: string,
  id: string,
  deletedAt: string,
  baseUpdatedAt: string | null
): CloudSavedItemRecord {
  const key = metadataKey('saved-item', naturalKey)
  const hash = serializeMetadataPayload({ deletedAt })
  const record: CloudSavedItemRecord = {
    ...createMetadata(id, {
      clientUpdatedAt: deletedAt,
      baseUpdatedAt,
    }, deletedAt),
    kind,
    naturalKey,
    payload: null,
  }

  rememberRecord(metadata, key, 'saved-item', naturalKey, hash, record)
  return record
}

function asSavedSource(value: unknown): 'G' | 'D' | 'B' | 'A' | null {
  return value === 'G' || value === 'D' || value === 'B' || value === 'A'
    ? value
    : null
}

function asPositiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function getRemovalSavedItemTombstones(
  metadata: SnapshotMetadataMap,
  events: CloudActivityEvent[],
  occupiedNaturalKeys: Set<string>
) {
  const tombstones: CloudSavedItemRecord[] = []

  for (const event of events) {
    if (
      event.eventType === 'saved-item.bookmark.removed'
      && event.payload.bookmarkType === 'book'
      && typeof event.payload.workId === 'string'
      && typeof event.payload.chapterId === 'string'
    ) {
      const naturalKey = buildBookmarkNaturalKey({
        type: 'book',
        workId: event.payload.workId,
        chapterId: event.payload.chapterId,
      })
      if (occupiedNaturalKeys.has(naturalKey)) continue

      const id = typeof event.payload.bookmarkId === 'string'
        ? event.payload.bookmarkId
        : event.id
      const legacyMetadata = metadata[id]
      tombstones.push(createSavedItemTombstone(
        metadata,
        'bookmark',
        naturalKey,
        id,
        event.occurredAt,
        isIsoTimestamp(legacyMetadata?.clientUpdatedAt) ? legacyMetadata.clientUpdatedAt : null
      ))
      occupiedNaturalKeys.add(naturalKey)
      continue
    }

    const source = asSavedSource(event.payload.source)
    const ang = asPositiveNumber(event.payload.ang)
    if (!source || !ang) continue

    if (event.eventType === 'saved-item.bookmark.removed') {
      const verseId = asPositiveNumber(event.payload.verseId)
      const shabadId = asPositiveNumber(event.payload.shabadId)
      const naturalKey = buildBookmarkNaturalKey({
        source,
        ang,
        verseId,
        shabadId,
        returnPath: typeof event.payload.returnPath === 'string' ? event.payload.returnPath : undefined,
      })
      if (occupiedNaturalKeys.has(naturalKey)) continue

      const id = typeof event.payload.bookmarkId === 'string'
        ? event.payload.bookmarkId
        : event.id
      const legacyMetadata = metadata[id]
      tombstones.push(createSavedItemTombstone(
        metadata,
        'bookmark',
        naturalKey,
        id,
        event.occurredAt,
        isIsoTimestamp(legacyMetadata?.clientUpdatedAt) ? legacyMetadata.clientUpdatedAt : null
      ))
      occupiedNaturalKeys.add(naturalKey)
    }

    if (event.eventType === 'saved-item.favorite.removed') {
      const verseId = asPositiveNumber(event.payload.verseId)
      const shabadId = asPositiveNumber(event.payload.shabadId)
      const routeMode = event.payload.routeMode === 'verse'
        || event.payload.routeMode === 'shabad'
        || event.payload.routeMode === 'canonical'
        ? event.payload.routeMode
        : undefined
      const naturalKey = buildFavoriteNaturalKey({
        source,
        ang,
        shabadId,
        verseId,
        routeMode,
        returnPath: typeof event.payload.returnPath === 'string' ? event.payload.returnPath : undefined,
      })
      if (occupiedNaturalKeys.has(naturalKey)) continue

      const id = typeof event.payload.favoriteId === 'string'
        ? event.payload.favoriteId
        : event.id
      const legacyMetadata = metadata[id]
      tombstones.push(createSavedItemTombstone(
        metadata,
        'favorite',
        naturalKey,
        id,
        event.occurredAt,
        isIsoTimestamp(legacyMetadata?.clientUpdatedAt) ? legacyMetadata.clientUpdatedAt : null
      ))
      occupiedNaturalKeys.add(naturalKey)
    }
  }

  return tombstones
}

function extractSavedItems(
  metadata: SnapshotMetadataMap,
  events: CloudActivityEvent[],
  now: string
): CloudSavedItemRecord[] {
  const activeRecords = new Map<string, CloudSavedItemRecord>()

  for (const bookmark of useBookmarksStore.getState().bookmarks) {
    const payload: CloudBookmarkPayload = { ...bookmark }
    const naturalKey = buildBookmarkNaturalKey(payload)
    const key = metadataKey('saved-item', naturalKey)
    const clock = resolveRecordClock(metadata, key, payload, now, bookmark.savedAt)
    const record: CloudSavedItemRecord = {
      ...createMetadata(bookmark.id, clock),
      kind: 'bookmark',
      naturalKey,
      payload,
    }
    activeRecords.set(naturalKey, record)
    rememberRecord(metadata, key, 'saved-item', naturalKey, clock.hash, record)
  }

  for (const favorite of useFavoritesStore.getState().favorites) {
    const payload: CloudFavoritePayload = { ...favorite }
    const naturalKey = buildFavoriteNaturalKey(payload)
    const key = metadataKey('saved-item', naturalKey)
    const clock = resolveRecordClock(metadata, key, payload, now, favorite.savedAt)
    const record: CloudSavedItemRecord = {
      ...createMetadata(favorite.id, clock),
      kind: 'favorite',
      naturalKey,
      payload,
    }
    activeRecords.set(naturalKey, record)
    rememberRecord(metadata, key, 'saved-item', naturalKey, clock.hash, record)
  }

  const records = [...activeRecords.values()]
  const occupiedNaturalKeys = new Set(activeRecords.keys())

  for (const previous of Object.values(metadata)) {
    if (!isSnapshotMetadataRecord(previous) || previous.recordType !== 'saved-item') continue
    if (occupiedNaturalKeys.has(previous.naturalKey)) continue

    const previousRecord = previous.record as CloudSavedItemRecord
    if (previousRecord.deletedAt) {
      records.push(previousRecord)
    } else {
      records.push(createSavedItemTombstone(
        metadata,
        previousRecord.kind,
        previous.naturalKey,
        previousRecord.id,
        now,
        previous.baseUpdatedAt
      ))
    }
    occupiedNaturalKeys.add(previous.naturalKey)
  }

  records.push(...getRemovalSavedItemTombstones(metadata, events, occupiedNaturalKeys))
  return records
}

function createVocabTombstone(
  metadata: SnapshotMetadataMap,
  naturalKey: string,
  id: string,
  deletedAt: string,
  baseUpdatedAt: string | null
): CloudVocabRecord {
  const key = metadataKey('vocab-entry', naturalKey)
  const hash = serializeMetadataPayload({ deletedAt })
  const record: CloudVocabRecord = {
    ...createMetadata(id, {
      clientUpdatedAt: deletedAt,
      baseUpdatedAt,
    }, deletedAt),
    naturalKey,
    payload: null,
  }

  rememberRecord(metadata, key, 'vocab-entry', naturalKey, hash, record)
  return record
}

function extractVocabEntries(
  metadata: SnapshotMetadataMap,
  events: CloudActivityEvent[],
  now: string
): CloudVocabRecord[] {
  const activeRecords = new Map<string, CloudVocabRecord>()

  for (const entry of useVocabStore.getState().vocab) {
    const naturalKey = buildVocabNaturalKey(entry)
    const key = metadataKey('vocab-entry', naturalKey)
    const clock = resolveRecordClock(
      metadata,
      key,
      entry,
      now,
      entry.review?.lastReviewedAt ?? entry.savedAt
    )
    const record: CloudVocabRecord = {
      ...createMetadata(naturalKey, clock),
      naturalKey,
      payload: entry,
    }
    activeRecords.set(naturalKey, record)
    rememberRecord(metadata, key, 'vocab-entry', naturalKey, clock.hash, record)
  }

  const records = [...activeRecords.values()]
  const occupiedNaturalKeys = new Set(activeRecords.keys())

  for (const previous of Object.values(metadata)) {
    if (!isSnapshotMetadataRecord(previous) || previous.recordType !== 'vocab-entry') continue
    if (occupiedNaturalKeys.has(previous.naturalKey)) continue

    const previousRecord = previous.record as CloudVocabRecord
    if (previousRecord.deletedAt) {
      records.push(previousRecord)
    } else {
      records.push(createVocabTombstone(
        metadata,
        previous.naturalKey,
        previousRecord.id,
        now,
        previous.baseUpdatedAt
      ))
    }
    occupiedNaturalKeys.add(previous.naturalKey)
  }

  for (const event of events) {
    if (event.eventType !== 'vocab.entry.removed') continue
    if (typeof event.payload.word !== 'string') continue

    const kind = event.payload.kind === 'phrase' ? 'phrase' : 'word'
    const naturalKey = buildVocabNaturalKey({ kind, word: event.payload.word })
    if (occupiedNaturalKeys.has(naturalKey)) continue

    const legacyMetadata = metadata[naturalKey]
    records.push(createVocabTombstone(
      metadata,
      naturalKey,
      naturalKey,
      event.occurredAt,
      isIsoTimestamp(legacyMetadata?.clientUpdatedAt) ? legacyMetadata.clientUpdatedAt : null
    ))
    occupiedNaturalKeys.add(naturalKey)
  }

  return records
}

function createLearningProgressRecord(
  metadata: SnapshotMetadataMap,
  scope: CloudLearningProgressRecord['scope'],
  payload: Record<string, unknown>,
  now: string
): CloudLearningProgressRecord {
  const key = metadataKey('learning-progress', scope)
  const clock = resolveRecordClock(metadata, key, payload, now)
  const record: CloudLearningProgressRecord = {
    ...createMetadata(scope, clock),
    scope,
    payload,
  }

  rememberRecord(metadata, key, 'learning-progress', scope, clock.hash, record)
  return record
}

function extractLearningProgress(
  metadata: SnapshotMetadataMap,
  now: string
): CloudLearningProgressRecord[] {
  const progress = useProgressStore.getState()
  const readingProgress = useReadingProgressStore.getState()
  const nitnem = useNitemStore.getState()

  return [
    createLearningProgressRecord(metadata, 'study-progress', {
      studied: progress.studied,
      reviewQueue: progress.reviewQueue,
      lastStudied: progress.lastStudied,
      currentSession: progress.currentSession,
    }, now),
    createLearningProgressRecord(metadata, 'reading-progress', {
      // Completed Angs are arrays by design and stay in JSONB end to end.
      progress: readingProgress.progress,
    }, now),
    createLearningProgressRecord(metadata, 'nitnem-state', {
      completedDate: nitnem.completedDate,
      completedIds: nitnem.completedIds,
      selectedIds: nitnem.selectedIds,
    }, now),
  ]
}

export function exportLocalSnapshot(): CloudLocalSnapshot {
  const metadata = readSnapshotMetadata()
  const now = new Date().toISOString()
  const activityEvents = useActivityEventsStore.getState().pendingEvents
  const snapshot: CloudLocalSnapshot = {
    version: CLOUD_SNAPSHOT_VERSION,
    deviceId: getNaamrasDeviceId(),
    profile: extractProfileRecord(metadata, now),
    savedItems: extractSavedItems(metadata, activityEvents, now),
    vocabEntries: extractVocabEntries(metadata, activityEvents, now),
    learningProgress: extractLearningProgress(metadata, now),
    activityEvents,
  }
  writeSnapshotMetadata(metadata)
  return snapshot
}

function semanticRecordPayload(record: SnapshotBackedRecord) {
  if ('locale' in record) {
    return {
      locale: record.locale,
      darkMode: record.darkMode,
      reader: record.reader,
      onboarding: record.onboarding,
    }
  }

  if ('scope' in record) return record.payload
  return record.deletedAt ? { deletedAt: record.deletedAt } : record.payload
}

function syncRemoteSnapshotMetadata(snapshot: CloudRemoteSnapshot) {
  const metadata = readSnapshotMetadata()

  for (const [key, value] of Object.entries(metadata)) {
    if (isSnapshotMetadataRecord(value)) delete metadata[key]
  }

  const storeRemoteRecord = (
    recordType: SnapshotRecordType,
    naturalKey: string,
    incomingRecord: SnapshotBackedRecord
  ) => {
    const record = {
      ...incomingRecord,
      baseUpdatedAt: incomingRecord.clientUpdatedAt,
    } as SnapshotBackedRecord
    const key = metadataKey(recordType, naturalKey)
    rememberRecord(
      metadata,
      key,
      recordType,
      naturalKey,
      serializeMetadataPayload(semanticRecordPayload(record)),
      record
    )
  }

  if (snapshot.profile) {
    storeRemoteRecord('profile', 'profile', snapshot.profile)
  }

  for (const record of snapshot.savedItems ?? []) {
    storeRemoteRecord('saved-item', record.naturalKey, record)
  }

  for (const record of snapshot.vocabEntries ?? []) {
    storeRemoteRecord('vocab-entry', record.naturalKey, record)
  }

  for (const record of snapshot.learningProgress ?? []) {
    storeRemoteRecord('learning-progress', record.scope, record)
  }

  return writeSnapshotMetadata(metadata)
}

function applyProfileRecord(profile: CloudProfileRecord | null | undefined) {
  if (!profile || profile.deletedAt) return

  useLocaleStore.setState({ locale: profile.locale })
  useThemeStore.getState().setDark(profile.darkMode)
  useLanguageStore.setState({
    scriptMode: profile.reader.scriptMode,
    showTransliteration: profile.reader.showTransliteration,
    meaningLanguage: profile.reader.meaningLanguage,
    larivaar: profile.reader.larivaar,
    showVishraam: profile.reader.showVishraam,
    lineSpacing: profile.reader.lineSpacing,
    textAlign: profile.reader.textAlign,
    fontSize: profile.reader.fontSize,
    englishSource: profile.reader.englishSource,
    punjabiSource: profile.reader.punjabiSource ?? 'ss',
    hindiSource: profile.reader.hindiSource ?? 'ss',
    visraamSource: profile.reader.visraamSource ?? 'sttm',
  })
  useSundarGutkaLengthStore.setState({
    lengths: {
      ...DEFAULT_SUNDAR_GUTKA_LENGTHS,
      ...profile.reader.sundarGutkaLengths,
    },
  })
  useOnboardingStore.setState({
    hasCompletedOnboarding: profile.onboarding.hasCompletedOnboarding,
    learningLevel: profile.onboarding.learningLevel,
    audience: profile.onboarding.audience,
    learningGoal: profile.onboarding.learningGoal,
    presentationMode: profile.onboarding.presentationMode,
    isOnboardingOpen: !profile.onboarding.hasCompletedOnboarding,
  })
}

function applySavedItems(savedItems: CloudSavedItemRecord[] | undefined) {
  if (!savedItems) return

  const bookmarks = savedItems
    .filter((record): record is CloudSavedItemRecord & { payload: CloudBookmarkPayload } => (
      record.kind === 'bookmark' && !record.deletedAt && record.payload !== null
    ))
    .map(record => record.payload)
  const favorites = savedItems
    .filter((record): record is CloudSavedItemRecord & { payload: CloudFavoritePayload } => (
      record.kind === 'favorite' && !record.deletedAt && record.payload !== null
    ))
    .map(record => record.payload)

  const bookmarkStore = useBookmarksStore.getState()
  const favoriteStore = useFavoritesStore.getState()
  const previousBookmarks = bookmarkStore.bookmarks
  const previousFavorites = favoriteStore.favorites
  const bookmarksPersisted = bookmarkStore.replaceBookmarks(bookmarks)
  const favoritesPersisted = favoriteStore.replaceFavorites(favorites)

  if (bookmarksPersisted && favoritesPersisted) return

  // Keep a partially applied snapshot from becoming the new local truth. A
  // later retry can safely merge the same server result again.
  if (bookmarksPersisted) bookmarkStore.replaceBookmarks(previousBookmarks)
  if (favoritesPersisted) favoriteStore.replaceFavorites(previousFavorites)
  throw new Error('Remote saved items could not be persisted on this device.')
}

function applyVocabEntries(vocabEntries: CloudVocabRecord[] | undefined) {
  if (!vocabEntries) return

  useVocabStore.setState({
    vocab: vocabEntries
      .filter((record): record is CloudVocabRecord & { payload: VocabEntry } => (
        !record.deletedAt && record.payload !== null
      ))
      .map(record => record.payload),
  })
}

function applyLearningProgress(records: CloudLearningProgressRecord[] | undefined) {
  if (!records) return

  for (const record of records) {
    if (record.deletedAt) continue

    switch (record.scope) {
      case 'study-progress':
        useProgressStore.setState(record.payload as Partial<ReturnType<typeof useProgressStore.getState>>)
        break
      case 'reading-progress':
        useReadingProgressStore.setState(record.payload as Partial<ReturnType<typeof useReadingProgressStore.getState>>)
        break
      case 'nitnem-state':
        useNitemStore.setState(record.payload as Partial<ReturnType<typeof useNitemStore.getState>>)
        break
    }
  }
}

export function applyRemoteSnapshot(snapshot: CloudRemoteSnapshot | null | undefined) {
  if (!snapshot) return
  if (snapshot.version !== CLOUD_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported cloud snapshot version: ${String(snapshot.version)}`)
  }

  applyProfileRecord(snapshot.profile)
  applySavedItems(snapshot.savedItems)
  applyVocabEntries(snapshot.vocabEntries)
  applyLearningProgress(snapshot.learningProgress)
  if (!syncRemoteSnapshotMetadata(snapshot)) {
    throw new Error('Cloud snapshot metadata could not be persisted on this device.')
  }
}
