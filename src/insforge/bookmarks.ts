import type { Bookmark } from '../store/bookmarks'
import { useCloudSyncStore } from '../store/cloudSync'
import { getNaamrasDeviceId } from './device'
import { buildBookmarkNaturalKey } from './savedItemKeys'
import { getNaamrasInsforgeClient } from './client'
import { getNaamrasInsforgeConfig } from './config'

type SavedItemLookupRow = {
  id: string
}

function getCloudBookmarkContext() {
  const client = getNaamrasInsforgeClient()
  const config = getNaamrasInsforgeConfig()
  const userId = useCloudSyncStore.getState().currentUser?.id ?? null

  if (!client || !config.enabled || !userId) {
    return null
  }

  return {
    client,
    userId,
    deviceId: getNaamrasDeviceId(),
  }
}

async function findBookmarkRow(id: string, naturalKey: string) {
  const context = getCloudBookmarkContext()
  if (!context) return { context: null, row: null }

  const { client } = context
  const { data, error } = await client.database
    .from('saved_items')
    .select('id')
    .eq('id', id)
    .limit(1)
    .maybeSingle()

  if (!error && data) {
    return {
      context,
      row: data as SavedItemLookupRow,
    }
  }

  const { data: fallbackData, error: fallbackError } = await client.database
    .from('saved_items')
    .select('id')
    .eq('kind', 'bookmark')
    .eq('natural_key', naturalKey)
    .limit(1)
    .maybeSingle()

  if (fallbackError) {
    return { context, row: null, error: fallbackError }
  }

  return {
    context,
    row: (fallbackData as SavedItemLookupRow | null) ?? null,
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return ''
}

function looksLikeUniqueConflict(error: unknown) {
  const message = getErrorMessage(error).toLowerCase()
  return message.includes('unique') || message.includes('duplicate')
}

async function insertOrUpdateBookmarkRow(
  bookmark: Bookmark,
  deletedAt: string | null,
  clientUpdatedAt: string
) {
  const naturalKey = buildBookmarkNaturalKey(bookmark)
  const lookup = await findBookmarkRow(bookmark.id, naturalKey)
  if (!lookup.context) {
    return { ok: false as const, skipped: true as const }
  }

  if (lookup.error) {
    return { ok: false as const, error: lookup.error }
  }

  const {
    context: { client, userId, deviceId },
  } = lookup

  const row = {
    id: lookup.row?.id ?? bookmark.id,
    user_id: userId,
    device_id: deviceId,
    kind: 'bookmark',
    natural_key: naturalKey,
    payload: bookmark,
    client_updated_at: clientUpdatedAt,
    deleted_at: deletedAt,
  }

  if (lookup.row) {
    const { error } = await client.database
      .from('saved_items')
      .update(row)
      .eq('id', lookup.row.id)

    if (error) {
      return { ok: false as const, error }
    }

    return { ok: true as const }
  }

  const { error } = await client.database
    .from('saved_items')
    .insert(row)

  if (!error) {
    return { ok: true as const }
  }

  if (!looksLikeUniqueConflict(error)) {
    return { ok: false as const, error }
  }

  const retryLookup = await findBookmarkRow(bookmark.id, naturalKey)
  if (!retryLookup.context) {
    return { ok: false as const, skipped: true as const }
  }

  if (retryLookup.error || !retryLookup.row) {
    return { ok: false as const, error: retryLookup.error ?? error }
  }

  const { error: retryError } = await retryLookup.context.client.database
    .from('saved_items')
    .update({
      ...row,
      id: retryLookup.row.id,
    })
    .eq('id', retryLookup.row.id)

  if (retryError) {
    return { ok: false as const, error: retryError }
  }

  return { ok: true as const }
}

export async function persistBookmarkToCloud(bookmark: Bookmark) {
  return insertOrUpdateBookmarkRow(bookmark, null, bookmark.savedAt)
}

export async function removeBookmarkFromCloud(bookmark: Bookmark) {
  const deletedAt = new Date().toISOString()
  return insertOrUpdateBookmarkRow(bookmark, deletedAt, deletedAt)
}
