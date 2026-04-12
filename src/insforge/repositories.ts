import type { InsForgeClient } from '@insforge/sdk'
import type {
  CloudActivityEvent,
  CloudLearningProgressRecord,
  CloudProfileRecord,
  CloudRemoteSnapshot,
  CloudSavedItemRecord,
  CloudVocabRecord,
} from './types'

export interface ProfileRepository {
  load: () => Promise<CloudProfileRecord | null>
}

export interface SavedItemsRepository {
  list: () => Promise<CloudSavedItemRecord[]>
}

export interface VocabRepository {
  list: () => Promise<CloudVocabRecord[]>
}

export interface LearningProgressRepository {
  list: () => Promise<CloudLearningProgressRecord[]>
}

export interface ActivityEventsRepository {
  listRecent: (limit?: number) => Promise<CloudRemoteSnapshot['activityEvents']>
}

type ProfileRow = {
  id: string
  user_id: string
  device_id: string
  locale: CloudProfileRecord['locale']
  dark_mode: boolean
  reader: CloudProfileRecord['reader']
  onboarding: CloudProfileRecord['onboarding']
  client_updated_at: string
  deleted_at: string | null
}

type SavedItemRow = {
  id: string
  user_id: string
  device_id: string
  kind: CloudSavedItemRecord['kind']
  natural_key: string
  payload: CloudSavedItemRecord['payload']
  client_updated_at: string
  deleted_at: string | null
}

type VocabRow = {
  id: string
  user_id: string
  device_id: string
  natural_key: string
  payload: CloudVocabRecord['payload']
  client_updated_at: string
  deleted_at: string | null
}

type LearningProgressRow = {
  id: string
  user_id: string
  device_id: string
  scope: CloudLearningProgressRecord['scope']
  payload: CloudLearningProgressRecord['payload']
  client_updated_at: string
  deleted_at: string | null
}

type ActivityEventRow = {
  id: string
  user_id: string
  device_id: string
  event_type: string
  occurred_at: string
  client_updated_at: string
  deleted_at: string | null
  payload: Record<string, unknown>
}

async function safelyReadRows<T>(promise: PromiseLike<{ data: T[] | null; error: unknown }>) {
  try {
    const { data, error } = await promise
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

async function safelyReadSingle<T>(promise: PromiseLike<{ data: T | null; error: unknown }>) {
  try {
    const { data, error } = await promise
    if (error) return null
    return data ?? null
  } catch {
    return null
  }
}

function mapProfileRow(row: ProfileRow): CloudProfileRecord {
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

function mapSavedItemRow(row: SavedItemRow): CloudSavedItemRecord {
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

function mapVocabRow(row: VocabRow): CloudVocabRecord {
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

function mapLearningProgressRow(row: LearningProgressRow): CloudLearningProgressRecord {
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

function mapActivityEventRow(row: ActivityEventRow): CloudActivityEvent {
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

export function createNaamrasRepositories(client: InsForgeClient) {
  const profile: ProfileRepository = {
    load: async () => {
      const row = await safelyReadSingle(
        client.database
          .from('user_profiles')
          .select('*')
          .limit(1)
          .maybeSingle()
      ) as ProfileRow | null

      return row ? mapProfileRow(row) : null
    },
  }

  const savedItems: SavedItemsRepository = {
    list: async () => {
      const rows = await safelyReadRows(
        client.database
          .from('saved_items')
          .select('*')
          .is('deleted_at', null)
          .order('client_updated_at', { ascending: false })
      ) as SavedItemRow[]

      return rows.map(mapSavedItemRow)
    },
  }

  const vocab: VocabRepository = {
    list: async () => {
      const rows = await safelyReadRows(
        client.database
          .from('vocab_entries')
          .select('*')
          .is('deleted_at', null)
          .order('client_updated_at', { ascending: false })
      ) as VocabRow[]

      return rows.map(mapVocabRow)
    },
  }

  const learningProgress: LearningProgressRepository = {
    list: async () => {
      const rows = await safelyReadRows(
        client.database
          .from('learning_progress')
          .select('*')
          .is('deleted_at', null)
          .order('client_updated_at', { ascending: false })
      ) as LearningProgressRow[]

      return rows.map(mapLearningProgressRow)
    },
  }

  const activityEvents: ActivityEventsRepository = {
    listRecent: async (limit = 250) => {
      const rows = await safelyReadRows(
        client.database
          .from('activity_events')
          .select('*')
          .order('occurred_at', { ascending: false })
          .limit(limit)
      ) as ActivityEventRow[]

      return rows.map(mapActivityEventRow)
    },
  }

  return {
    profile,
    savedItems,
    vocab,
    learningProgress,
    activityEvents,
  }
}

export async function loadRemoteSnapshotFromRepositories(client: InsForgeClient): Promise<CloudRemoteSnapshot | null> {
  const repositories = createNaamrasRepositories(client)
  const [profile, savedItems, vocabEntries, learningProgress, activityEvents] = await Promise.all([
    repositories.profile.load(),
    repositories.savedItems.list(),
    repositories.vocab.list(),
    repositories.learningProgress.list(),
    repositories.activityEvents.listRecent(),
  ])

  if (!profile && savedItems.length === 0 && vocabEntries.length === 0 && learningProgress.length === 0) {
    return null
  }

  return {
    profile,
    savedItems,
    vocabEntries,
    learningProgress,
    activityEvents: activityEvents ?? [],
  }
}
