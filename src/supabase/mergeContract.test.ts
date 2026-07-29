import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  SnapshotValidationError,
  buildRemoteSnapshot,
  normalizeActivityEvents,
  parseMergeSnapshot,
  toDatabaseSyncRecords,
} from '../../supabase/functions/merge-local-state/contract'

const UPDATED_AT = '2026-04-17T12:00:00.000Z'

function metadata(id: string) {
  return {
    id,
    userId: null,
    deviceId: 'device-a',
    clientUpdatedAt: UPDATED_AT,
    baseUpdatedAt: null,
    deletedAt: null,
  }
}

function buildSnapshot() {
  return {
    version: 2,
    deviceId: 'device-a',
    profile: {
      ...metadata('profile'),
      locale: 'en',
      darkMode: false,
      reader: {
        scriptMode: 'gurmukhi',
        showTransliteration: false,
        meaningLanguage: 'en',
        larivaar: false,
        showVishraam: true,
        lineSpacing: 'relaxed',
        textAlign: 'left',
        fontSize: 22,
        englishSource: 'bdb',
        punjabiSource: 'ss',
        hindiSource: 'ss',
        visraamSource: 'sttm',
        sundarGutkaLengths: {},
      },
      onboarding: {
        hasCompletedOnboarding: true,
        learningLevel: 'beginner',
        audience: 'adult',
        learningGoal: 'read',
        presentationMode: 'overlay',
      },
    },
    savedItems: [
      {
        ...metadata('favorite-100'),
        kind: 'favorite',
        naturalKey: 'favorite:G:1:verse:100',
        payload: {
          id: 'favorite-100',
          title: 'Verse 100',
          source: 'G',
          ang: 1,
          shabadId: 10,
          verseId: 100,
          type: 'shabad',
          routeMode: 'verse',
          savedAt: UPDATED_AT,
        },
      },
      {
        ...metadata('favorite-101'),
        kind: 'favorite',
        naturalKey: 'favorite:G:1:verse:101',
        payload: {
          id: 'favorite-101',
          title: 'Verse 101',
          source: 'G',
          ang: 1,
          shabadId: 10,
          verseId: 101,
          type: 'shabad',
          routeMode: 'verse',
          savedAt: UPDATED_AT,
        },
      },
    ],
    vocabEntries: [{
      ...metadata('phrase:sat naam'),
      naturalKey: 'phrase:sat naam',
      payload: {
        kind: 'phrase',
        word: 'ਸਤਿ ਨਾਮੁ',
        transliteration: 'sat naam',
        meaning_en: 'True Name',
        meaning_hi: '',
        meaning_pa: '',
        scripture: 'SGGS',
        sourceId: 'G-1',
        savedAt: UPDATED_AT,
        review: {
          dueAt: '2026-04-20T12:00:00.000Z',
          nextReviewAt: '2030-01-01T00:00:00.000Z',
          intervalDays: 3,
          reviewCount: 1,
        },
      },
    }],
    learningProgress: [
      {
        ...metadata('study-progress'),
        scope: 'study-progress',
        payload: {
          studied: [],
          reviewQueue: [],
          lastStudied: null,
          currentSession: null,
        },
      },
      {
        ...metadata('reading-progress'),
        scope: 'reading-progress',
        payload: {
          progress: {
            'japji-sahib': [1, 2, 3],
          },
        },
      },
      {
        ...metadata('nitnem-state'),
        scope: 'nitnem-state',
        payload: {
          completedDate: '2026-04-17',
          completedIds: ['japji-sahib'],
          selectedIds: ['japji-sahib'],
        },
      },
    ],
    activityEvents: [{
      id: 'event-1',
      userId: null,
      deviceId: 'device-a',
      eventType: 'vocab.entry.reviewed',
      occurredAt: UPDATED_AT,
      clientUpdatedAt: UPDATED_AT,
      deletedAt: null,
      payload: { kind: 'phrase' },
    }],
  }
}

describe('merge-local-state v2 contract', () => {
  test('normalizes every sync domain and maps phrase review from dueAt', () => {
    const snapshot = parseMergeSnapshot(buildSnapshot())
    const records = toDatabaseSyncRecords(snapshot, 'user-1')
    const events = normalizeActivityEvents(snapshot, 'user-1')

    expect(records).toHaveLength(7)
    expect(records.filter(record => record.record_type === 'saved-item')).toHaveLength(2)
    expect(records.find(record => record.natural_key === 'favorite:G:1:verse:100')).toBeTruthy()
    expect(records.find(record => record.natural_key === 'favorite:G:1:verse:101')).toBeTruthy()
    expect(records.find(record => record.record_type === 'vocab-entry')?.review_due_at)
      .toBe('2026-04-20T12:00:00.000Z')
    expect(records.find(record => record.natural_key === 'reading-progress')?.record)
      .toMatchObject({
        payload: {
          progress: {
            'japji-sahib': [1, 2, 3],
          },
        },
      })
    expect(events).toEqual([
      expect.objectContaining({
        id: 'event-1',
        userId: 'user-1',
      }),
    ])
  })

  test('rejects the legacy scalar reading-progress shape', () => {
    const snapshot = buildSnapshot()
    snapshot.learningProgress[1]!.payload = {
      progress: {
        'japji-sahib': 0.5,
      },
    }

    expect(() => parseMergeSnapshot(snapshot)).toThrow(SnapshotValidationError)
    expect(() => parseMergeSnapshot(snapshot)).toThrow(/array of positive Ang integers/i)
  })

  test('rebuilds a complete remote snapshot from persisted account records', () => {
    const snapshot = parseMergeSnapshot(buildSnapshot())
    const records = toDatabaseSyncRecords(snapshot, 'user-1')
    const persistedRecords = records.map(record => ({
      ...record.record,
      recordType: record.record_type,
      userId: 'user-1',
      clientUpdatedAt: record.client_updated_at,
      baseUpdatedAt: record.client_updated_at,
      deletedAt: record.deleted_at,
    }))

    const remote = buildRemoteSnapshot(
      persistedRecords,
      '2026-04-17T12:05:00.000Z'
    )

    expect(remote).toMatchObject({
      version: 2,
      generatedAt: '2026-04-17T12:05:00.000Z',
      profile: {
        userId: 'user-1',
        baseUpdatedAt: UPDATED_AT,
      },
    })
    expect(remote.savedItems).toHaveLength(2)
    expect(remote.vocabEntries).toHaveLength(1)
    expect(remote.learningProgress).toHaveLength(3)
  })

  test('migration guards conflicts and stores progress records in JSONB', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/schema/002_naamras_cloud_sync_v2.sql'),
      'utf8'
    )

    expect(migration).toMatch(/record_payload jsonb not null/i)
    expect(migration).toMatch(/excluded\.base_updated_at is not null/i)
    expect(migration).toMatch(/excluded\.client_updated_at > existing\.client_updated_at/i)
    expect(migration).toMatch(/merge_naamras_cloud_snapshot_v2/i)
    expect(migration).toMatch(/payload #>> '\{review,dueAt\}'/i)
  })
})
