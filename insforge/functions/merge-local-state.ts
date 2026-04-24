import { createClient } from 'npm:@insforge/sdk'

declare const Deno:
  | {
      env?: {
        get: (name: string) => string | undefined
      }
    }
  | undefined

type JsonObject = Record<string, unknown>

type CloudSyncMetadata = {
  id: string
  userId?: string | null
  deviceId: string
  clientUpdatedAt: string
  deletedAt: string | null
}

type CloudProfileRecord = CloudSyncMetadata & {
  locale: string
  darkMode: boolean
  reader: JsonObject
  onboarding: JsonObject
}

type CloudSavedItemRecord = CloudSyncMetadata & {
  kind: 'bookmark' | 'favorite' | 'learn-item'
  naturalKey: string
  payload: JsonObject
}

type CloudVocabRecord = CloudSyncMetadata & {
  naturalKey: string
  payload: JsonObject
}

type CloudLearningProgressRecord = CloudSyncMetadata & {
  scope: 'learning-state' | 'study-progress' | 'reading-progress' | 'nitnem-state'
  payload: JsonObject
}

type CloudActivityEvent = {
  id: string
  userId?: string | null
  deviceId: string
  eventType: string
  occurredAt: string
  clientUpdatedAt: string
  deletedAt: string | null
  payload: JsonObject
}

type CloudLocalSnapshot = {
  version: number
  deviceId: string
  profile?: CloudProfileRecord | null
  savedItems?: CloudSavedItemRecord[]
  vocabEntries?: CloudVocabRecord[]
  learningProgress?: CloudLearningProgressRecord[]
  activityEvents?: CloudActivityEvent[]
}

type MergeLocalStateRequest = {
  reason?: string
  snapshot?: CloudLocalSnapshot
}

type DbProfileRow = {
  id: string
  user_id: string
  device_id: string
  locale: string
  dark_mode: boolean
  reader: JsonObject
  onboarding: JsonObject
  client_updated_at: string
  deleted_at: string | null
}

type DbSavedItemRow = {
  id: string
  user_id: string
  device_id: string
  kind: CloudSavedItemRecord['kind']
  natural_key: string
  payload: JsonObject
  client_updated_at: string
  deleted_at: string | null
}

type DbVocabRow = {
  id: string
  user_id: string
  device_id: string
  natural_key: string
  payload: JsonObject
  review_due_at: string | null
  client_updated_at: string
  deleted_at: string | null
}

type DbLearningProgressRow = {
  id: string
  user_id: string
  device_id: string
  scope: CloudLearningProgressRecord['scope']
  payload: JsonObject
  client_updated_at: string
  deleted_at: string | null
}

type DbActivityEventRow = {
  id: string
  user_id: string
  device_id: string
  event_type: string
  occurred_at: string
  client_updated_at: string
  deleted_at: string | null
  payload: JsonObject
}

type DatabaseError = {
  message: string
}

type DatabaseResponse<T = unknown> = {
  data?: T | null
  error?: DatabaseError | null
}

type DatabaseQuery<T = unknown> = PromiseLike<DatabaseResponse<T>> & {
  select: (columns: string) => DatabaseQuery<T>
  eq: (column: string, value: unknown) => DatabaseQuery<T>
  in: (column: string, values: unknown[]) => DatabaseQuery<T>
  is: (column: string, value: unknown) => DatabaseQuery<T>
  order: (column: string, options?: { ascending?: boolean }) => DatabaseQuery<T>
  limit: (count: number) => DatabaseQuery<T>
  maybeSingle: () => Promise<DatabaseResponse<T>>
  insert: (row: Record<string, unknown>) => Promise<DatabaseResponse>
  update: (row: Record<string, unknown>) => {
    eq: (column: string, value: unknown) => Promise<DatabaseResponse>
  }
}

type InsForgeClient = {
  database: {
    from: <T = unknown>(table: string) => DatabaseQuery<T>
  }
}

type AuthenticatedClient = InsForgeClient & {
  auth: {
    getCurrentUser: () => Promise<DatabaseResponse<{ user?: { id: string } | null }>>
  }
}

type MergeLocalStateResponse = {
  acknowledgedEventIds: string[]
  mergedAt: string
  snapshot: {
    profile: CloudProfileRecord | null
    savedItems: CloudSavedItemRecord[]
    vocabEntries: CloudVocabRecord[]
    learningProgress: CloudLearningProgressRecord[]
    activityEvents: CloudActivityEvent[]
  }
}

function readEnv(name: string) {
  if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
    return Deno.env.get(name) ?? undefined
  }

  if (typeof process !== 'undefined') {
    return process.env[name]
  }

  return undefined
}

function normalizeOptionalString(value: string | undefined | null) {
  const next = value?.trim()
  return next ? next : undefined
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization')
  if (!header) return null

  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

function resolveInsForgeBaseUrl(request: Request) {
  return (
    normalizeOptionalString(readEnv('INSFORGE_BASE_URL'))
    ?? normalizeOptionalString(readEnv('INSFORGE_URL'))
    ?? normalizeOptionalString(readEnv('VITE_INSFORGE_URL'))
    ?? new URL(request.url).origin
  )
}

async function requireAuthenticatedClient(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return {
      client: null,
      user: null,
      error: jsonResponse({ error: 'Missing bearer token.' }, 401),
    }
  }

  const client = createClient({
    baseUrl: resolveInsForgeBaseUrl(request),
    edgeFunctionToken: token,
    isServerMode: true,
  }) as AuthenticatedClient

  const { data, error } = await client.auth.getCurrentUser()
  const user = data?.user ?? null

  if (error || !user) {
    return {
      client: null,
      user: null,
      error: jsonResponse({ error: error?.message ?? 'Unable to authenticate user.' }, 401),
    }
  }

  return { client, user, error: null }
}

function compareIsoTimestamps(left: string | null | undefined, right: string | null | undefined) {
  const leftValue = left ? Date.parse(left) : 0
  const rightValue = right ? Date.parse(right) : 0
  return leftValue - rightValue
}

function createStableHash(value: string) {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index)
  }

  return Math.abs(hash >>> 0).toString(36)
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : {}
}

function isSnapshot(value: unknown): value is CloudLocalSnapshot {
  return Boolean(
    value
      && typeof value === 'object'
      && !Array.isArray(value)
      && typeof (value as CloudLocalSnapshot).deviceId === 'string'
      && typeof (value as CloudLocalSnapshot).version === 'number'
  )
}

function buildBookmarkNaturalKey(payload: JsonObject) {
  const source = String(payload.source ?? '')
  const ang = String(payload.ang ?? '')
  const verseId = payload.verseId
  const shabadId = payload.shabadId

  return verseId
    ? `bookmark:${source}:${ang}:verse:${verseId}`
    : `bookmark:${source}:${ang}:shabad:${shabadId ?? 'ang'}`
}

function buildFavoriteNaturalKey(payload: JsonObject) {
  return `favorite:${payload.source}:${payload.ang}:shabad:${payload.shabadId ?? 'ang'}`
}

function buildLearnNaturalKey(itemId: string) {
  return `learn:${itemId}`
}

function normalizeVocabWord(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function buildVocabNaturalKey(payload: JsonObject) {
  const kind = typeof payload.kind === 'string' ? payload.kind : 'word'
  const word = typeof payload.word === 'string' ? payload.word : ''
  return `${kind}:${normalizeVocabWord(word)}`
}

function toProfileDbRow(userId: string, record: CloudProfileRecord): DbProfileRow {
  return {
    id: `profile:${userId}`,
    user_id: userId,
    device_id: record.deviceId,
    locale: record.locale,
    dark_mode: record.darkMode,
    reader: asObject(record.reader),
    onboarding: asObject(record.onboarding),
    client_updated_at: record.clientUpdatedAt,
    deleted_at: record.deletedAt,
  }
}

function toSavedItemDbRow(userId: string, record: CloudSavedItemRecord): DbSavedItemRow {
  return {
    id: record.id,
    user_id: userId,
    device_id: record.deviceId,
    kind: record.kind,
    natural_key: record.naturalKey,
    payload: asObject(record.payload),
    client_updated_at: record.clientUpdatedAt,
    deleted_at: record.deletedAt,
  }
}

function toVocabDbRow(userId: string, record: CloudVocabRecord): DbVocabRow {
  const review = asObject(record.payload.review)
  const reviewDueAt = typeof review.dueAt === 'string' ? review.dueAt : null

  return {
    id: record.id,
    user_id: userId,
    device_id: record.deviceId,
    natural_key: record.naturalKey,
    payload: asObject(record.payload),
    review_due_at: reviewDueAt,
    client_updated_at: record.clientUpdatedAt,
    deleted_at: record.deletedAt,
  }
}

function toLearningProgressDbRow(userId: string, record: CloudLearningProgressRecord): DbLearningProgressRow {
  return {
    id: record.id,
    user_id: userId,
    device_id: record.deviceId,
    scope: record.scope,
    payload: asObject(record.payload),
    client_updated_at: record.clientUpdatedAt,
    deleted_at: record.deletedAt,
  }
}

function toActivityEventDbRow(userId: string, event: CloudActivityEvent): DbActivityEventRow {
  return {
    id: event.id,
    user_id: userId,
    device_id: event.deviceId,
    event_type: event.eventType,
    occurred_at: event.occurredAt,
    client_updated_at: event.clientUpdatedAt,
    deleted_at: event.deletedAt,
    payload: asObject(event.payload),
  }
}

function toProfileRecord(row: DbProfileRow | null): CloudProfileRecord | null {
  if (!row || row.deleted_at) return null

  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    locale: row.locale,
    darkMode: row.dark_mode,
    reader: row.reader,
    onboarding: row.onboarding,
    clientUpdatedAt: row.client_updated_at,
    deletedAt: row.deleted_at,
  }
}

function toSavedItemRecord(row: DbSavedItemRow): CloudSavedItemRecord {
  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    kind: row.kind,
    naturalKey: row.natural_key,
    payload: row.payload,
    clientUpdatedAt: row.client_updated_at,
    deletedAt: row.deleted_at,
  }
}

function toVocabRecord(row: DbVocabRow): CloudVocabRecord {
  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    naturalKey: row.natural_key,
    payload: row.payload,
    clientUpdatedAt: row.client_updated_at,
    deletedAt: row.deleted_at,
  }
}

function toLearningProgressRecord(row: DbLearningProgressRow): CloudLearningProgressRecord {
  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    scope: row.scope,
    payload: row.payload,
    clientUpdatedAt: row.client_updated_at,
    deletedAt: row.deleted_at,
  }
}

function toActivityEventRecord(row: DbActivityEventRow): CloudActivityEvent {
  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    clientUpdatedAt: row.client_updated_at,
    deletedAt: row.deleted_at,
    payload: row.payload,
  }
}

function createTombstoneId(userId: string, namespace: string, naturalKey: string) {
  return `${namespace}:${createStableHash(`${userId}:${naturalKey}`)}`
}

function mapSavedItemDeletionEvent(userId: string, event: CloudActivityEvent): DbSavedItemRow | null {
  const payload = asObject(event.payload)

  switch (event.eventType) {
    case 'saved-item.bookmark.removed':
      return {
        id: createTombstoneId(userId, 'saved-bookmark-deleted', buildBookmarkNaturalKey(payload)),
        user_id: userId,
        device_id: event.deviceId,
        kind: 'bookmark',
        natural_key: buildBookmarkNaturalKey(payload),
        payload,
        client_updated_at: event.occurredAt,
        deleted_at: event.occurredAt,
      }
    case 'saved-item.favorite.removed':
      return {
        id: createTombstoneId(userId, 'saved-favorite-deleted', buildFavoriteNaturalKey(payload)),
        user_id: userId,
        device_id: event.deviceId,
        kind: 'favorite',
        natural_key: buildFavoriteNaturalKey(payload),
        payload,
        client_updated_at: event.occurredAt,
        deleted_at: event.occurredAt,
      }
    case 'saved-item.learn.removed': {
      const itemId = typeof payload.itemId === 'string' ? payload.itemId : ''
      return {
        id: createTombstoneId(userId, 'saved-learn-deleted', buildLearnNaturalKey(itemId)),
        user_id: userId,
        device_id: event.deviceId,
        kind: 'learn-item',
        natural_key: buildLearnNaturalKey(itemId),
        payload,
        client_updated_at: event.occurredAt,
        deleted_at: event.occurredAt,
      }
    }
    default:
      return null
  }
}

function mapVocabDeletionEvent(userId: string, event: CloudActivityEvent): DbVocabRow | null {
  if (event.eventType !== 'vocab.entry.removed') return null

  const payload = asObject(event.payload)
  return {
    id: createTombstoneId(userId, 'vocab-deleted', buildVocabNaturalKey(payload)),
    user_id: userId,
    device_id: event.deviceId,
    natural_key: buildVocabNaturalKey(payload),
    payload,
    review_due_at: null,
    client_updated_at: event.occurredAt,
    deleted_at: event.occurredAt,
  }
}

function buildDayCalendar(dayStamps: string[]) {
  return dayStamps.reduce<Record<string, boolean>>((calendar, dayStamp) => {
    calendar[dayStamp] = true
    return calendar
  }, {})
}

function sortDayStamps(dayStamps: string[]) {
  return [...dayStamps].sort((left, right) => left.localeCompare(right))
}

function computeStreakStats(dayStamps: string[]) {
  const sorted = sortDayStamps(Array.from(new Set(dayStamps.filter(Boolean))))

  if (sorted.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastDay: null as string | null,
      calendar: {} as Record<string, boolean>,
    }
  }

  let current = 1
  let longest = 1
  let running = 1

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T00:00:00`)
    const next = new Date(`${sorted[index]}T00:00:00`)
    const diff = Math.round((next.getTime() - previous.getTime()) / 86400000)

    if (diff === 1) {
      running += 1
      longest = Math.max(longest, running)
    } else {
      running = 1
    }
  }

  current = 1

  for (let index = sorted.length - 1; index > 0; index -= 1) {
    const currentDay = new Date(`${sorted[index]}T00:00:00`)
    const previousDay = new Date(`${sorted[index - 1]}T00:00:00`)
    const diff = Math.round((currentDay.getTime() - previousDay.getTime()) / 86400000)

    if (diff !== 1) {
      break
    }

    current += 1
  }

  return {
    current,
    longest,
    lastDay: sorted[sorted.length - 1] ?? null,
    calendar: buildDayCalendar(sorted),
  }
}

function getDayStampFromEvent(event: DbActivityEventRow, preferredKey: string) {
  const payload = asObject(event.payload)
  const explicitDay = payload[preferredKey]

  if (typeof explicitDay === 'string' && explicitDay) {
    return explicitDay
  }

  if (typeof payload.lastStudied === 'string' && preferredKey === 'practicedOn') {
    return payload.lastStudied
  }

  return event.occurred_at.slice(0, 10)
}

async function readProfile(client: InsForgeClient, userId: string) {
  const { data } = await client.database
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('client_updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data ?? null) as DbProfileRow | null
}

async function readSavedItems(client: InsForgeClient, userId: string, activeOnly = false) {
  let query = client.database
    .from('saved_items')
    .select('*')
    .eq('user_id', userId)
    .order('client_updated_at', { ascending: false })

  if (activeOnly) {
    query = query.is('deleted_at', null)
  }

  const { data } = await query
  return asArray(data as DbSavedItemRow[] | null)
}

async function readVocabEntries(client: InsForgeClient, userId: string, activeOnly = false) {
  let query = client.database
    .from('vocab_entries')
    .select('*')
    .eq('user_id', userId)
    .order('client_updated_at', { ascending: false })

  if (activeOnly) {
    query = query.is('deleted_at', null)
  }

  const { data } = await query
  return asArray(data as DbVocabRow[] | null)
}

async function readLearningProgress(client: InsForgeClient, userId: string, activeOnly = false) {
  let query = client.database
    .from('learning_progress')
    .select('*')
    .eq('user_id', userId)
    .order('client_updated_at', { ascending: false })

  if (activeOnly) {
    query = query.is('deleted_at', null)
  }

  const { data } = await query
  return asArray(data as DbLearningProgressRow[] | null)
}

async function readActivityEvents(client: InsForgeClient, userId: string, limit = 500) {
  const { data } = await client.database
    .from('activity_events')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  return asArray(data as DbActivityEventRow[] | null)
}

async function insertRow(client: InsForgeClient, table: string, row: Record<string, unknown>) {
  const { error } = await client.database.from(table).insert(row)
  if (error) {
    throw new Error(`${table} insert failed: ${error.message}`)
  }
}

async function updateRow(client: InsForgeClient, table: string, id: string, row: Record<string, unknown>) {
  const { error } = await client.database.from(table).update(row).eq('id', id)
  if (error) {
    throw new Error(`${table} update failed: ${error.message}`)
  }
}

async function mergeProfileRow(client: InsForgeClient, userId: string, profile: CloudProfileRecord | null | undefined) {
  if (!profile) return

  const existing = await readProfile(client, userId)
  const incoming = toProfileDbRow(userId, profile)

  if (!existing) {
    await insertRow(client, 'user_profiles', incoming)
    return
  }

  if (compareIsoTimestamps(incoming.client_updated_at, existing.client_updated_at) > 0) {
    await updateRow(client, 'user_profiles', existing.id, incoming)
  }
}

async function mergeSavedItems(client: InsForgeClient, userId: string, incomingRecords: CloudSavedItemRecord[]) {
  const existingRows = await readSavedItems(client, userId)
  const rowByNaturalKey = new Map(existingRows.map(row => [row.natural_key, row] as const))

  for (const record of incomingRecords) {
    const nextRow = toSavedItemDbRow(userId, record)
    const existing = rowByNaturalKey.get(nextRow.natural_key)

    if (!existing) {
      await insertRow(client, 'saved_items', nextRow)
      rowByNaturalKey.set(nextRow.natural_key, nextRow)
      continue
    }

    if (compareIsoTimestamps(nextRow.client_updated_at, existing.client_updated_at) > 0) {
      await updateRow(client, 'saved_items', existing.id, {
        ...nextRow,
        id: existing.id,
      })
      rowByNaturalKey.set(nextRow.natural_key, { ...nextRow, id: existing.id })
    }
  }

  return rowByNaturalKey
}

async function mergeVocabEntries(client: InsForgeClient, userId: string, incomingRecords: CloudVocabRecord[]) {
  const existingRows = await readVocabEntries(client, userId)
  const rowByNaturalKey = new Map(existingRows.map(row => [row.natural_key, row] as const))

  for (const record of incomingRecords) {
    const nextRow = toVocabDbRow(userId, record)
    const existing = rowByNaturalKey.get(nextRow.natural_key)

    if (!existing) {
      await insertRow(client, 'vocab_entries', nextRow)
      rowByNaturalKey.set(nextRow.natural_key, nextRow)
      continue
    }

    if (compareIsoTimestamps(nextRow.client_updated_at, existing.client_updated_at) > 0) {
      await updateRow(client, 'vocab_entries', existing.id, {
        ...nextRow,
        id: existing.id,
      })
      rowByNaturalKey.set(nextRow.natural_key, { ...nextRow, id: existing.id })
    }
  }

  return rowByNaturalKey
}

async function mergeLearningProgress(client: InsForgeClient, userId: string, incomingRecords: CloudLearningProgressRecord[]) {
  const existingRows = await readLearningProgress(client, userId)
  const rowByScope = new Map(existingRows.map(row => [row.scope, row] as const))

  for (const record of incomingRecords) {
    const nextRow = toLearningProgressDbRow(userId, record)
    const existing = rowByScope.get(nextRow.scope)

    if (!existing) {
      await insertRow(client, 'learning_progress', nextRow)
      rowByScope.set(nextRow.scope, nextRow)
      continue
    }

    if (compareIsoTimestamps(nextRow.client_updated_at, existing.client_updated_at) > 0) {
      await updateRow(client, 'learning_progress', existing.id, {
        ...nextRow,
        id: existing.id,
      })
      rowByScope.set(nextRow.scope, { ...nextRow, id: existing.id })
    }
  }

  return rowByScope
}

async function insertMissingActivityEvents(client: InsForgeClient, userId: string, events: CloudActivityEvent[]) {
  if (events.length === 0) return []

  const eventIds = events.map(event => event.id)
  const { data } = await client.database
    .from('activity_events')
    .select('id')
    .eq('user_id', userId)
    .in('id', eventIds)

  const existingIds = new Set(asArray(data as Array<{ id: string }> | null).map(row => row.id))
  const missingEvents = events.filter(event => !existingIds.has(event.id))

  for (const event of missingEvents) {
    await insertRow(client, 'activity_events', toActivityEventDbRow(userId, event))
  }

  return eventIds
}

async function applySavedItemDeletionEvents(client: InsForgeClient, tombstones: DbSavedItemRow[], existingRows: Map<string, DbSavedItemRow>) {
  for (const tombstone of tombstones) {
    const existing = existingRows.get(tombstone.natural_key)

    if (!existing) {
      await insertRow(client, 'saved_items', tombstone)
      existingRows.set(tombstone.natural_key, tombstone)
      continue
    }

    if (compareIsoTimestamps(tombstone.client_updated_at, existing.client_updated_at) > 0) {
      await updateRow(client, 'saved_items', existing.id, {
        ...tombstone,
        id: existing.id,
        payload: Object.keys(existing.payload ?? {}).length > 0 ? existing.payload : tombstone.payload,
      })
      existingRows.set(tombstone.natural_key, {
        ...tombstone,
        id: existing.id,
        payload: Object.keys(existing.payload ?? {}).length > 0 ? existing.payload : tombstone.payload,
      })
    }
  }
}

async function applyVocabDeletionEvents(client: InsForgeClient, tombstones: DbVocabRow[], existingRows: Map<string, DbVocabRow>) {
  for (const tombstone of tombstones) {
    const existing = existingRows.get(tombstone.natural_key)

    if (!existing) {
      await insertRow(client, 'vocab_entries', tombstone)
      existingRows.set(tombstone.natural_key, tombstone)
      continue
    }

    if (compareIsoTimestamps(tombstone.client_updated_at, existing.client_updated_at) > 0) {
      await updateRow(client, 'vocab_entries', existing.id, {
        ...tombstone,
        id: existing.id,
        payload: Object.keys(existing.payload ?? {}).length > 0 ? existing.payload : tombstone.payload,
      })
      existingRows.set(tombstone.natural_key, {
        ...tombstone,
        id: existing.id,
        payload: Object.keys(existing.payload ?? {}).length > 0 ? existing.payload : tombstone.payload,
      })
    }
  }
}

async function applyDerivedProgressState(client: InsForgeClient, userId: string, mergedAt: string) {
  const [learningProgressRows, activityEvents] = await Promise.all([
    readLearningProgress(client, userId),
    readActivityEvents(client, userId, 2000),
  ])

  const learningByScope = new Map(learningProgressRows.map(row => [row.scope, row] as const))
  const practiceEvents = activityEvents.filter(event => event.event_type === 'learn.practice-recorded')
  const studyEvents = activityEvents.filter(event => event.event_type === 'study.swipe-recorded')

  const practiceStats = computeStreakStats(practiceEvents.map(event => getDayStampFromEvent(event, 'practicedOn')))
  const studyStats = computeStreakStats(studyEvents.map(event => getDayStampFromEvent(event, 'lastStudied')))

  const learningStateRow = learningByScope.get('learning-state')
  const nextLearningPayload = {
    ...asObject(learningStateRow?.payload),
    practiceStreak: practiceStats.current,
    lastPracticedOn: practiceStats.lastDay,
    totalPracticeSessions: practiceEvents.length,
    streakCalendar: practiceStats.calendar,
    longestStreak: practiceStats.longest,
  }

  if (learningStateRow) {
    await updateRow(client, 'learning_progress', learningStateRow.id, {
      ...learningStateRow,
      payload: nextLearningPayload,
      client_updated_at: mergedAt,
    })
  } else if (practiceEvents.length > 0) {
    await insertRow(client, 'learning_progress', {
      id: `learning-state:${userId}`,
      user_id: userId,
      device_id: 'server-derived',
      scope: 'learning-state',
      payload: nextLearningPayload,
      client_updated_at: mergedAt,
      deleted_at: null,
    })
  }

  const studyProgressRow = learningByScope.get('study-progress')
  const nextStudyPayload = {
    ...asObject(studyProgressRow?.payload),
    lastStudied: studyStats.lastDay,
    streak: studyStats.current,
  }

  if (studyProgressRow) {
    await updateRow(client, 'learning_progress', studyProgressRow.id, {
      ...studyProgressRow,
      payload: nextStudyPayload,
      client_updated_at: mergedAt,
    })
  } else if (studyEvents.length > 0) {
    await insertRow(client, 'learning_progress', {
      id: `study-progress:${userId}`,
      user_id: userId,
      device_id: 'server-derived',
      scope: 'study-progress',
      payload: nextStudyPayload,
      client_updated_at: mergedAt,
      deleted_at: null,
    })
  }
}

async function readMergedSnapshot(client: InsForgeClient, userId: string) {
  const [profileRow, savedRows, vocabRows, learningRows, eventRows] = await Promise.all([
    readProfile(client, userId),
    readSavedItems(client, userId, true),
    readVocabEntries(client, userId, true),
    readLearningProgress(client, userId, true),
    readActivityEvents(client, userId, 250),
  ])

  return {
    profile: toProfileRecord(profileRow),
    savedItems: savedRows.map(toSavedItemRecord),
    vocabEntries: vocabRows.map(toVocabRecord),
    learningProgress: learningRows.map(toLearningProgressRecord),
    activityEvents: eventRows.map(toActivityEventRecord),
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const auth = await requireAuthenticatedClient(request)
  if (auth.error || !auth.client || !auth.user) {
    return auth.error ?? jsonResponse({ error: 'Authentication failed.' }, 401)
  }

  let body: MergeLocalStateRequest

  try {
    body = await request.json() as MergeLocalStateRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400)
  }

  if (!isSnapshot(body.snapshot)) {
    return jsonResponse({ error: 'Missing snapshot payload.' }, 400)
  }

  const client = auth.client
  const userId = auth.user.id
  const snapshot = body.snapshot
  const mergedAt = new Date().toISOString()

  await mergeProfileRow(client, userId, snapshot.profile)
  const savedItemsByNaturalKey = await mergeSavedItems(client, userId, asArray(snapshot.savedItems))
  const vocabByNaturalKey = await mergeVocabEntries(client, userId, asArray(snapshot.vocabEntries))
  await mergeLearningProgress(client, userId, asArray(snapshot.learningProgress))

  const acknowledgedEventIds = await insertMissingActivityEvents(client, userId, asArray(snapshot.activityEvents))

  const savedItemDeletionRows = asArray(snapshot.activityEvents)
    .map(event => mapSavedItemDeletionEvent(userId, event))
    .filter((row): row is DbSavedItemRow => Boolean(row))
  const vocabDeletionRows = asArray(snapshot.activityEvents)
    .map(event => mapVocabDeletionEvent(userId, event))
    .filter((row): row is DbVocabRow => Boolean(row))

  await applySavedItemDeletionEvents(client, savedItemDeletionRows, savedItemsByNaturalKey)
  await applyVocabDeletionEvents(client, vocabDeletionRows, vocabByNaturalKey)
  await applyDerivedProgressState(client, userId, mergedAt)

  const response: MergeLocalStateResponse = {
    acknowledgedEventIds,
    mergedAt,
    snapshot: await readMergedSnapshot(client, userId),
  }

  return jsonResponse(response)
}
